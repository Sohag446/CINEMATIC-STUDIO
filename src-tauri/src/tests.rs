use std::fs;
use std::path::PathBuf;
use rusqlite::Connection;
use crate::database::{
    init_db, 
    run_integrity_check, 
    apply_all_migrations, 
    get_app_settings, 
    save_app_settings, 
    get_last_active_project_id, 
    set_last_active_project_id, 
    AppSettings
};
use crate::project_manager::{ProjectManager, ProjectMetadata, VaultDeletionOutcome};
use crate::project_service::ProjectService;
use crate::commands::{CreateProjectDto, SaveProjectDto};

fn setup_test_db() -> (tempfile::TempDir, crate::database::DbPool) {
    let temp_dir = tempfile::tempdir().expect("Failed to create temporary directory for test DB");
    let db_path = temp_dir.path().join("test_studio.db");
    let pool = init_db(&db_path).expect("Failed to initialize test DB pool");
    (temp_dir, pool)
}

// ============================================================================
// TASK 1: PROJECT DELETION RECOVERY & STATE MACHINE
// ============================================================================

#[test]
fn test_deletion_failure_intent_recorded_and_preserved_on_fs_failure() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let storage_root = tempfile::tempdir().unwrap();
    let input = CreateProjectDto {
        name: "Lock Test Project".to_string(),
        synopsis: Some("Testing failure preservation".to_string()),
        target_aspect_ratio: Some("16:9".to_string()),
        target_fps: Some(24.0),
        target_duration_seconds: Some(600),
        custom_directory: Some(storage_root.path().to_string_lossy().to_string()),
    };

    let project = ProjectService::create_project(&mut conn, input).unwrap();
    let proj_dir = PathBuf::from(&project.project_dir_path);
    assert!(proj_dir.exists());

    // Inject filesystem failure: create a file with read-only lock or delete manifest so safe_delete rejects it
    let manifest_path = proj_dir.join("project.manifest.json");
    fs::remove_file(&manifest_path).unwrap(); // Without manifest, safe_delete_vault rejects deletion as a safety invariant!

    // Attempt delete
    let result = ProjectService::delete_project(&mut conn, &project.id, "Lock Test Project");
    assert!(result.is_err(), "Deletion must fail when safe_delete_vault cannot safely proceed");

    // CRITICAL: Database record MUST STILL EXIST!
    let db_count: i64 = conn.query_row(
        "SELECT count(*) FROM projects WHERE id = ?1",
        [&project.id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(db_count, 1, "Database record must not be deleted when filesystem deletion fails");

    // CRITICAL: Deletion journal entry must exist with error details!
    let (state, err_details): (String, Option<String>) = conn.query_row(
        "SELECT deletion_state, error_details FROM project_deletion_journal WHERE project_id = ?1",
        [&project.id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();
    assert_eq!(state, "INTENT_RECORDED");
    assert!(err_details.is_some(), "Journal must contain actionable error details");
}

#[test]
fn test_deletion_recovery_retry_after_previous_failure() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let storage_root = tempfile::tempdir().unwrap();
    let input = CreateProjectDto {
        name: "Retry Project".to_string(),
        synopsis: None,
        target_aspect_ratio: None,
        target_fps: None,
        target_duration_seconds: None,
        custom_directory: Some(storage_root.path().to_string_lossy().to_string()),
    };

    let project = ProjectService::create_project(&mut conn, input).unwrap();
    let proj_dir = PathBuf::from(&project.project_dir_path);

    // Record failure state in journal
    let now = chrono::Utc::now().timestamp_millis();
    conn.execute(
        "INSERT INTO project_deletion_journal (project_id, project_name, project_dir_path, storage_root, deletion_state, error_details, retry_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'INTENT_RECORDED', 'Simulated lock error', 1, ?5, ?5)",
        (&project.id, &project.name, &project.project_dir_path, &project.storage_root, now),
    ).unwrap();

    // Now call recovery service
    let report = ProjectService::recover_deletions(&mut conn).unwrap();
    assert_eq!(report.successful_recoveries.len(), 1);
    assert!(report.pending_failures.is_empty());
    assert!(!proj_dir.exists(), "Filesystem directory must be cleaned up by recovery");

    let count: i64 = conn.query_row("SELECT count(*) FROM projects WHERE id = ?1", [&project.id], |r| r.get(0)).unwrap();
    assert_eq!(count, 0, "Database record must be purged by recovery");

    let journal_count: i64 = conn.query_row("SELECT count(*) FROM project_deletion_journal WHERE project_id = ?1", [&project.id], |r| r.get(0)).unwrap();
    assert_eq!(journal_count, 0, "Journal entry must be purged after complete recovery");
}

#[test]
fn test_deletion_crash_after_filesystem_deleted_recovery() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let storage_root = tempfile::tempdir().unwrap();
    let proj_id = "fs_deleted_proj_01";
    let now = chrono::Utc::now().timestamp_millis();

    // Project directory already deleted on disk
    let ghost_dir = storage_root.path().join("ghost_dir");

    // Insert database record and journal in DATABASE_CLEANUP_PENDING state
    conn.execute(
        "INSERT INTO projects (id, name, slug, project_dir_path, storage_root, status, created_at, updated_at)
         VALUES (?1, 'Ghost Proj', 'ghost-proj', ?2, ?3, 'DELETING', 0, 0)",
        (proj_id, ghost_dir.to_string_lossy().to_string(), storage_root.path().to_string_lossy().to_string()),
    ).unwrap();

    conn.execute(
        "INSERT INTO project_deletion_journal (project_id, project_name, project_dir_path, storage_root, deletion_state, created_at, updated_at)
         VALUES (?1, 'Ghost Proj', ?2, ?3, 'DATABASE_CLEANUP_PENDING', ?4, ?4)",
        (proj_id, ghost_dir.to_string_lossy().to_string(), storage_root.path().to_string_lossy().to_string(), now),
    ).unwrap();

    // Run recovery
    let report = ProjectService::recover_deletions(&mut conn).unwrap();
    assert_eq!(report.successful_recoveries.len(), 1);

    let p_count: i64 = conn.query_row("SELECT count(*) FROM projects WHERE id = ?1", [proj_id], |r| r.get(0)).unwrap();
    assert_eq!(p_count, 0);
}

// ============================================================================
// TASK 2: FORWARD-ONLY DATABASE MIGRATIONS (V1 & V2)
// ============================================================================

#[test]
fn test_fresh_database_migration_v1_and_v2() {
    let mut conn = Connection::open_in_memory().unwrap();

    // Run migrations
    apply_all_migrations(&mut conn).expect("Fresh migration execution failed");

    // Check version 2 is recorded
    let version: i32 = conn.query_row(
        "SELECT MAX(version) FROM _schema_migrations",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(version, 2, "Database must upgrade to version 2");

    // Verify projects table has storage_root column
    let col_count: i64 = conn.query_row(
        "SELECT count(*) FROM pragma_table_info('projects') WHERE name = 'storage_root'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(col_count, 1, "projects table must have storage_root column in v2");

    // Verify project_deletion_journal exists
    let journal_exists: bool = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='project_deletion_journal'",
        [],
        |r| r.get::<_, i64>(0),
    ).map(|c| c > 0).unwrap();
    assert!(journal_exists, "project_deletion_journal table must exist in v2");
}

#[test]
fn test_legacy_database_migration_upgrade_preserves_records() {
    let mut conn = Connection::open_in_memory().unwrap();

    // 1. Manually create legacy v1 database using 001_initial_schema.sql
    conn.execute_batch(
        "CREATE TABLE _schema_migrations (version INTEGER PRIMARY KEY NOT NULL, applied_at INTEGER NOT NULL);"
    ).unwrap();

    let v1_sql = include_str!("../migrations/001_initial_schema.sql");
    conn.execute_batch(v1_sql).unwrap();
    conn.execute("INSERT INTO _schema_migrations VALUES (1, 1000);", ()).unwrap();

    // 2. Insert representative records in legacy v1 database
    conn.execute(
        "INSERT INTO projects (id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, status, created_at, updated_at)
         VALUES ('leg_01', 'Legacy Noir', 'legacy-noir', 'Original v1 film', '16:9', 24.0, 600, 'C:\\legacy', 'PLANNING', 1000, 1000)",
        (),
    ).unwrap();

    conn.execute(
        "INSERT INTO scenes (id, project_id, sequence_number, title, created_at, updated_at)
         VALUES ('scene_leg_01', 'leg_01', 1, 'Legacy Scene 1', 1000, 1000)",
        (),
    ).unwrap();

    conn.execute(
        "INSERT INTO clips (id, scene_id, project_id, clip_number, target_duration_seconds, subject_action, created_at, updated_at)
         VALUES ('clip_leg_01', 'scene_leg_01', 'leg_01', 1, 10.0, 'Legacy Hero Action', 1000, 1000)",
        (),
    ).unwrap();

    // 3. Now run the real forward-only migration runner
    apply_all_migrations(&mut conn).expect("Upgrade from v1 to v2 failed");

    // 4. Verify version 2 recorded
    let max_v: i32 = conn.query_row("SELECT MAX(version) FROM _schema_migrations", [], |r| r.get(0)).unwrap();
    assert_eq!(max_v, 2);

    // 5. CRITICAL: Verify all representative records are 100% intact!
    let (p_name, p_root): (String, String) = conn.query_row(
        "SELECT name, storage_root FROM projects WHERE id = 'leg_01'",
        [],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();
    assert_eq!(p_name, "Legacy Noir");
    assert_eq!(p_root, "", "Legacy projects receive default empty storage_root");

    let s_count: i64 = conn.query_row("SELECT count(*) FROM scenes WHERE project_id = 'leg_01'", [], |r| r.get(0)).unwrap();
    assert_eq!(s_count, 1);

    let c_count: i64 = conn.query_row("SELECT count(*) FROM clips WHERE project_id = 'leg_01'", [], |r| r.get(0)).unwrap();
    assert_eq!(c_count, 1);
}

// ============================================================================
// TASK 3: STARTUP RECOVERY & SETTINGS PERSISTENCE
// ============================================================================

#[test]
fn test_settings_persistence_across_pool_restarts() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("settings_service.db");

    // Session 1: Save settings via service
    {
        let pool = init_db(&db_path).unwrap();
        let conn = pool.get().unwrap();
        let new_settings = AppSettings {
            default_project_storage_path: temp_dir.path().to_string_lossy().to_string(),
            max_concurrent_tasks: 4,
            sequential_processing_default: false,
            log_level: "WARN".to_string(),
            theme: "dark".to_string(),
            hardware_thread_cap: 8,
        };
        ProjectService::update_settings(&conn, new_settings).unwrap();
    }

    // Session 2: Read settings via service
    {
        let pool = init_db(&db_path).unwrap();
        let conn = pool.get().unwrap();
        let loaded = ProjectService::get_settings(&conn).unwrap();
        assert_eq!(loaded.max_concurrent_tasks, 4);
        assert_eq!(loaded.theme, "dark");
        assert_eq!(loaded.log_level, "WARN");
    }
}

// ============================================================================
// TASK 4: SECURE SAVE & MANIFEST IDENTITY VALIDATION
// ============================================================================

#[test]
fn test_secure_save_project_real_service() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let storage_root = tempfile::tempdir().unwrap();
    let input = CreateProjectDto {
        name: "Initial Name".to_string(),
        synopsis: Some("Initial synopsis".to_string()),
        target_aspect_ratio: Some("16:9".to_string()),
        target_fps: Some(24.0),
        target_duration_seconds: Some(600),
        custom_directory: Some(storage_root.path().to_string_lossy().to_string()),
    };

    let project = ProjectService::create_project(&mut conn, input).unwrap();

    // Call real save_project service
    let save_dto = SaveProjectDto {
        id: project.id.clone(),
        name: Some("Updated Title".to_string()),
        synopsis: Some("Updated synopsis content".to_string()),
        target_aspect_ratio: Some("2.39:1".to_string()),
        target_fps: Some(30.0),
        target_duration_seconds: Some(1200),
    };

    let updated = ProjectService::save_project(&mut conn, save_dto).unwrap();
    assert_eq!(updated.name, "Updated Title");
    assert_eq!(updated.target_aspect_ratio, "2.39:1");

    // Verify on disk manifest updated
    let on_disk = ProjectManager::read_manifest(&updated.project_dir_path).unwrap();
    assert_eq!(on_disk.name, "Updated Title");
    assert_eq!(on_disk.synopsis, "Updated synopsis content");

    // Verify in database updated
    let (db_name, db_aspect): (String, String) = conn.query_row(
        "SELECT name, target_aspect_ratio FROM projects WHERE id = ?1",
        [&project.id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();
    assert_eq!(db_name, "Updated Title");
    assert_eq!(db_aspect, "2.39:1");
}

#[test]
fn test_secure_save_manifest_identity_mismatch_rejected() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let storage_root = tempfile::tempdir().unwrap();
    let input = CreateProjectDto {
        name: "Tamper Test".to_string(),
        synopsis: None,
        target_aspect_ratio: None,
        target_fps: None,
        target_duration_seconds: None,
        custom_directory: Some(storage_root.path().to_string_lossy().to_string()),
    };

    let project = ProjectService::create_project(&mut conn, input).unwrap();

    // Tamper with on-disk manifest ID
    let mut on_disk = ProjectManager::read_manifest(&project.project_dir_path).unwrap();
    on_disk.id = "different_attacker_id".to_string();
    ProjectManager::save_metadata_atomic(&project.project_dir_path, &on_disk).unwrap();

    // Attempt save
    let save_dto = SaveProjectDto {
        id: project.id.clone(),
        name: Some("Hacked".to_string()),
        synopsis: None,
        target_aspect_ratio: None,
        target_fps: None,
        target_duration_seconds: None,
    };

    let result = ProjectService::save_project(&mut conn, save_dto);
    assert!(result.is_err(), "Must reject saving when manifest ID mismatches database ID");
}

// ============================================================================
// TASK 5: VAULT HEALING ERROR PROPAGATION & INTEGRITY
// ============================================================================

#[test]
fn test_open_project_vault_healing_error_propagation() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let storage_root = tempfile::tempdir().unwrap();
    let input = CreateProjectDto {
        name: "Healing Error Project".to_string(),
        synopsis: None,
        target_aspect_ratio: None,
        target_fps: None,
        target_duration_seconds: None,
        custom_directory: Some(storage_root.path().to_string_lossy().to_string()),
    };

    let project = ProjectService::create_project(&mut conn, input).unwrap();
    let proj_dir = PathBuf::from(&project.project_dir_path);

    // Remove a directory
    let characters_dir = proj_dir.join("characters");
    fs::remove_dir(&characters_dir).unwrap();

    // Inject unhealable condition: create a regular file named "characters" where directory should be!
    fs::write(&characters_dir, "blocking file").unwrap();

    // Open project must fail and propagate explicit recovery error!
    let open_res = ProjectService::open_project(&conn, &project.id);
    assert!(open_res.is_err(), "open_project must fail when vault healing cannot recreate directory");
}

#[test]
fn test_database_integrity_check_service() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().unwrap();
    assert!(run_integrity_check(&conn).unwrap());
}
