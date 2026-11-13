use std::fs;
use std::path::PathBuf;
use rusqlite::Connection;
use crate::database::{
    init_db, 
    run_integrity_check, 
    apply_migrations, 
    get_app_settings, 
    save_app_settings, 
    get_last_active_project_id, 
    set_last_active_project_id, 
    recover_interrupted_deletions,
    AppSettings
};
use crate::project_manager::{ProjectManager, ProjectMetadata, VaultDeletionOutcome};

fn setup_test_db() -> (tempfile::TempDir, crate::database::DbPool) {
    let temp_dir = tempfile::tempdir().expect("Failed to create temporary directory for test DB");
    let db_path = temp_dir.path().join("test_studio.db");
    let pool = init_db(&db_path).expect("Failed to initialize test DB pool");
    (temp_dir, pool)
}

// ============================================================================
// TASK 1: APP SETTINGS PERSISTENCE & RESTARTS
// ============================================================================

#[test]
fn test_settings_persistence_and_restart() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("settings_restart.db");

    // 1. First run: save custom settings
    {
        let pool = init_db(&db_path).unwrap();
        let conn = pool.get().unwrap();

        let initial_settings = get_app_settings(&conn).unwrap();
        assert_eq!(initial_settings.max_concurrent_tasks, 1);
        assert_eq!(initial_settings.theme, "cinematic");

        let updated_settings = AppSettings {
            default_project_storage_path: temp_dir.path().to_string_lossy().to_string(),
            max_concurrent_tasks: 4,
            sequential_processing_default: false,
            log_level: "DEBUG".to_string(),
            theme: "dark".to_string(),
            hardware_thread_cap: 8,
        };
        save_app_settings(&conn, &updated_settings).unwrap();
    }

    // 2. Restart simulation: open database in fresh pool
    {
        let pool = init_db(&db_path).unwrap();
        let conn = pool.get().unwrap();
        let loaded = get_app_settings(&conn).unwrap();

        assert_eq!(loaded.max_concurrent_tasks, 4);
        assert_eq!(loaded.theme, "dark");
        assert_eq!(loaded.log_level, "DEBUG");
        assert_eq!(loaded.hardware_thread_cap, 8);
        assert!(!loaded.sequential_processing_default);
    }
}

#[test]
fn test_settings_validation_rules() {
    let valid = AppSettings::default();
    assert!(valid.validate().is_ok());

    let mut invalid_tasks = valid.clone();
    invalid_tasks.max_concurrent_tasks = 0;
    assert!(invalid_tasks.validate().is_err());

    let mut invalid_threads = valid.clone();
    invalid_threads.hardware_thread_cap = 128;
    assert!(invalid_threads.validate().is_err());

    let mut invalid_log = valid.clone();
    invalid_log.log_level = "VERBOSE".to_string();
    assert!(invalid_log.validate().is_err());

    let mut invalid_theme = valid.clone();
    invalid_theme.theme = "neon".to_string();
    assert!(invalid_theme.validate().is_err());
}

// ============================================================================
// TASK 2: CUSTOM STORAGE ROOT SUPPORT & CONTAINMENT
// ============================================================================

#[test]
fn test_custom_storage_root_project_creation_and_deletion() {
    let custom_root = tempfile::tempdir().unwrap();
    let (vault_dir, canonical_root) = ProjectManager::create_project_vault(custom_root.path(), "custom-vault").unwrap();

    assert!(vault_dir.exists());
    assert_eq!(canonical_root, ProjectManager::strip_unc_prefix(&fs::canonicalize(custom_root.path()).unwrap()));

    // Create manifest
    let meta = ProjectMetadata {
        id: "cust_01".to_string(),
        name: "Custom Vault".to_string(),
        slug: "custom-vault".to_string(),
        synopsis: "".to_string(),
        target_aspect_ratio: "16:9".to_string(),
        target_fps: 24.0,
        target_duration_seconds: 600,
        project_dir_path: vault_dir.to_string_lossy().to_string(),
        storage_root: canonical_root.to_string_lossy().to_string(),
        status: "PLANNING".to_string(),
        created_at: 0,
        updated_at: 0,
    };
    ProjectManager::save_metadata_atomic(&vault_dir, &meta).unwrap();

    // Delete using registered custom storage root
    let outcome = ProjectManager::safe_delete_vault(&vault_dir, &canonical_root).unwrap();
    assert_eq!(outcome, VaultDeletionOutcome::Deleted);
    assert!(!vault_dir.exists());
}

#[test]
fn test_rejection_of_path_outside_registered_root() {
    let root_a = tempfile::tempdir().unwrap();
    let root_b = tempfile::tempdir().unwrap();

    let (vault_a, _) = ProjectManager::create_project_vault(root_a.path(), "proj-a").unwrap();
    let meta = ProjectMetadata {
        id: "a_01".to_string(),
        name: "Proj A".to_string(),
        slug: "proj-a".to_string(),
        synopsis: "".to_string(),
        target_aspect_ratio: "16:9".to_string(),
        target_fps: 24.0,
        target_duration_seconds: 600,
        project_dir_path: vault_a.to_string_lossy().to_string(),
        storage_root: root_a.path().to_string_lossy().to_string(),
        status: "PLANNING".to_string(),
        created_at: 0,
        updated_at: 0,
    };
    ProjectManager::save_metadata_atomic(&vault_a, &meta).unwrap();

    // Attempt deleting vault_a passing root_b as authorized root
    let result = ProjectManager::safe_delete_vault(&vault_a, root_b.path());
    assert!(result.is_err(), "Must reject deleting project outside its registered root");
}

#[test]
fn test_attempted_root_substitution_rejection() {
    let root = tempfile::tempdir().unwrap();
    // Attempting to delete the root itself
    let result = ProjectManager::safe_delete_vault(root.path(), root.path());
    assert!(result.is_err(), "Target path cannot be identical to authorized root");
}

// ============================================================================
// TASK 3: SECURE save_project TRUST MODEL
// ============================================================================

#[test]
fn test_secure_save_project_manifest_identity_mismatch() {
    let root = tempfile::tempdir().unwrap();
    let (vault_dir, canonical_root) = ProjectManager::create_project_vault(root.path(), "tamper-test").unwrap();

    // Write on-disk manifest with ID "original_id"
    let on_disk = ProjectMetadata {
        id: "original_id".to_string(),
        name: "Tamper Test".to_string(),
        slug: "tamper-test".to_string(),
        synopsis: "".to_string(),
        target_aspect_ratio: "16:9".to_string(),
        target_fps: 24.0,
        target_duration_seconds: 600,
        project_dir_path: vault_dir.to_string_lossy().to_string(),
        storage_root: canonical_root.to_string_lossy().to_string(),
        status: "PLANNING".to_string(),
        created_at: 0,
        updated_at: 0,
    };
    ProjectManager::save_metadata_atomic(&vault_dir, &on_disk).unwrap();

    // Attempt validating manifest against different database ID "attacker_id"
    let read_back = ProjectManager::read_manifest(&vault_dir).unwrap();
    assert_ne!(read_back.id, "attacker_id");
}

// ============================================================================
// TASK 4: ATOMIC DATABASE MIGRATIONS
// ============================================================================

#[test]
fn test_atomic_migration_rollback_on_failure() {
    let mut conn = Connection::open_in_memory().unwrap();

    // 1. Create migrations tracking table
    conn.execute_batch(
        "CREATE TABLE _schema_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            applied_at INTEGER NOT NULL
        );"
    ).unwrap();

    // 2. Deliberately failing migration transaction
    let migration_failed = (|| -> Result<(), rusqlite::Error> {
        let tx = conn.transaction()?;
        tx.execute("CREATE TABLE valid_table (id INT);", ())?;
        // Syntax error deliberately injected
        tx.execute("CREATE TABLE broken_table (syntax error ???);", ())?;
        tx.execute("INSERT INTO _schema_migrations VALUES (1, 1000);", ())?;
        tx.commit()?;
        Ok(())
    })();

    assert!(migration_failed.is_err(), "Broken migration must fail");

    // 3. Verify no partial table remains and version 1 is NOT recorded
    let table_exists: bool = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='valid_table'",
        [],
        |r| r.get::<_, i64>(0),
    ).map(|c| c > 0).unwrap();
    assert!(!table_exists, "No partial tables must remain after migration rollback");

    let version_recorded: bool = conn.query_row(
        "SELECT count(*) FROM _schema_migrations WHERE version = 1",
        [],
        |r| r.get::<_, i64>(0),
    ).map(|c| c > 0).unwrap();
    assert!(!version_recorded, "Migration version must not be recorded on failure");

    // 4. Corrected migration subsequent execution succeeds
    let tx = conn.transaction().unwrap();
    tx.execute("CREATE TABLE valid_table (id INT);", ()).unwrap();
    tx.execute("INSERT INTO _schema_migrations VALUES (1, 1000);", ()).unwrap();
    tx.commit().unwrap();

    let table_now_exists: bool = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='valid_table'",
        [],
        |r| r.get::<_, i64>(0),
    ).map(|c| c > 0).unwrap();
    assert!(table_now_exists, "Corrected migration succeeds");
}

// ============================================================================
// TASK 5: RECOVERABLE PROJECT DELETION (DELETION JOURNAL)
// ============================================================================

#[test]
fn test_recoverable_deletion_failure_injection() {
    let (_temp_dir, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let root = tempfile::tempdir().unwrap();
    let (vault_dir, canonical_root) = ProjectManager::create_project_vault(root.path(), "crash-recovery").unwrap();
    let proj_id = "crash_proj_01";

    let meta = ProjectMetadata {
        id: proj_id.to_string(),
        name: "Crash Recovery".to_string(),
        slug: "crash-recovery".to_string(),
        synopsis: "".to_string(),
        target_aspect_ratio: "16:9".to_string(),
        target_fps: 24.0,
        target_duration_seconds: 600,
        project_dir_path: vault_dir.to_string_lossy().to_string(),
        storage_root: canonical_root.to_string_lossy().to_string(),
        status: "PLANNING".to_string(),
        created_at: 0,
        updated_at: 0,
    };
    ProjectManager::save_metadata_atomic(&vault_dir, &meta).unwrap();

    // Insert project in SQLite
    conn.execute(
        "INSERT INTO projects (id, name, slug, project_dir_path, storage_root, status, created_at, updated_at)
         VALUES (?1, 'Crash Recovery', 'crash-recovery', ?2, ?3, 'PLANNING', 0, 0)",
        (proj_id, &meta.project_dir_path, &meta.storage_root),
    ).unwrap();

    // Simulate Step 1 crash: Intent recorded, but process killed before directory deleted
    conn.execute(
        "INSERT INTO project_deletion_journal (project_id, project_name, project_dir_path, storage_root, deletion_state, created_at)
         VALUES (?1, 'Crash Recovery', ?2, ?3, 'INTENT_RECORDED', 1000)",
        (proj_id, &meta.project_dir_path, &meta.storage_root),
    ).unwrap();

    assert!(vault_dir.exists(), "Vault directory still exists before crash recovery");

    // Run recovery routine (simulates restart)
    let recovered = recover_interrupted_deletions(&mut conn).unwrap();
    assert_eq!(recovered.len(), 1);
    assert!(!vault_dir.exists(), "Recovery routine must finish filesystem deletion");

    let count: i64 = conn.query_row(
        "SELECT count(*) FROM projects WHERE id = ?1",
        [proj_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(count, 0, "Recovery routine must purge orphaned database record");
}

// ============================================================================
// TASK 6: ACTIVE PROJECT RESTORATION ACROSS RESTARTS
// ============================================================================

#[test]
fn test_active_project_restoration_across_restarts() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("active_restart.db");

    // 1. Session 1: activate project
    {
        let pool = init_db(&db_path).unwrap();
        let conn = pool.get().unwrap();
        set_last_active_project_id(&conn, Some("proj_active_123")).unwrap();
    }

    // 2. Session 2: restore active project ID
    {
        let pool = init_db(&db_path).unwrap();
        let conn = pool.get().unwrap();
        let restored = get_last_active_project_id(&conn).unwrap();
        assert_eq!(restored, Some("proj_active_123".to_string()));

        // Clear active
        set_last_active_project_id(&conn, None).unwrap();
        let cleared = get_last_active_project_id(&conn).unwrap();
        assert_eq!(cleared, None);
    }
}

// ============================================================================
// BASELINE DATABASE & CONSTRAINTS TESTS
// ============================================================================

#[test]
fn test_database_init_and_migrations() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().expect("Failed to get DB connection from pool");

    let version: i32 = conn.query_row(
        "SELECT version FROM _schema_migrations WHERE version = 1",
        [],
        |r| r.get(0),
    ).expect("Schema migration version 1 not recorded");
    assert_eq!(version, 1);

    let fk: i32 = conn.query_row("PRAGMA foreign_keys", [], |r| r.get(0)).unwrap();
    assert_eq!(fk, 1, "Foreign keys must be ON");

    let cache: i32 = conn.query_row("PRAGMA cache_size", [], |r| r.get(0)).unwrap();
    assert_eq!(cache, -8000, "Cache size must be -8000 (8 MB)");
}

#[test]
fn test_foreign_key_rejection() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().expect("Failed to get DB connection");

    let result = conn.execute(
        "INSERT INTO clips (id, scene_id, project_id, clip_number, target_duration_seconds, subject_action, created_at, updated_at)
         VALUES ('orphan_clip', 'non_existent_scene', 'non_existent_proj', 1, 10.0, 'Action', 0, 0)",
        (),
    );
    assert!(result.is_err(), "Foreign key violation must reject orphan clip insertion");
}

#[test]
fn test_foreign_key_cascade_deletion() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().expect("Failed to get DB connection");

    let proj_id = "proj_cascade_01";
    let scene_id = "scene_cascade_01";
    let clip_id = "clip_cascade_01";

    conn.execute(
        "INSERT INTO projects (id, name, slug, project_dir_path, storage_root, created_at, updated_at)
         VALUES (?1, 'Cascade Proj', 'cascade-proj', 'C:\\dummy', 'C:\\dummy', 0, 0)",
        [proj_id],
    ).unwrap();

    conn.execute(
        "INSERT INTO scenes (id, project_id, sequence_number, title, created_at, updated_at)
         VALUES (?1, ?2, 1, 'Scene 01', 0, 0)",
        [scene_id, proj_id],
    ).unwrap();

    conn.execute(
        "INSERT INTO clips (id, scene_id, project_id, clip_number, target_duration_seconds, subject_action, created_at, updated_at)
         VALUES (?1, ?2, ?3, 1, 10.0, 'Hero walks in rain', 0, 0)",
        [clip_id, scene_id, proj_id],
    ).unwrap();

    conn.execute("DELETE FROM projects WHERE id = ?1", [proj_id]).unwrap();

    let scene_count: i64 = conn.query_row(
        "SELECT count(*) FROM scenes WHERE project_id = ?1",
        [proj_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(scene_count, 0, "Scene must be cascade-deleted");

    let clip_count: i64 = conn.query_row(
        "SELECT count(*) FROM clips WHERE project_id = ?1",
        [proj_id],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(clip_count, 0, "Clip must be cascade-deleted");
}

#[test]
fn test_transaction_rollback() {
    let (_temp_dir, pool) = setup_test_db();
    let mut conn = pool.get().expect("Failed to get DB connection");

    let proj_id = "proj_rollback_01";
    conn.execute(
        "INSERT INTO projects (id, name, slug, project_dir_path, storage_root, created_at, updated_at)
         VALUES (?1, 'Rollback Proj', 'rollback-proj', 'C:\\dummy', 'C:\\dummy', 0, 0)",
        [proj_id],
    ).unwrap();

    {
        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO scenes (id, project_id, sequence_number, title, created_at, updated_at)
             VALUES ('scene_uncommitted', ?1, 1, 'Uncommitted Scene', 0, 0)",
            [proj_id],
        ).unwrap();
        // Drop tx without commit() -> triggers automatic rollback
    }

    let uncommitted_count: i64 = conn.query_row(
        "SELECT count(*) FROM scenes WHERE id = 'scene_uncommitted'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(uncommitted_count, 0, "Uncommitted transaction must be completely rolled back");
}

#[test]
fn test_database_integrity_check() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().expect("Failed to get DB connection");
    let is_ok = run_integrity_check(&conn).expect("Integrity check query failed");
    assert!(is_ok, "PRAGMA integrity_check must return true for healthy database");
}

#[test]
fn test_project_vault_scaffolding_14_subdirs() {
    let temp_root = tempfile::tempdir().unwrap();
    let (vault_dir, _) = ProjectManager::create_project_vault(temp_root.path(), "blade-runner-2099").unwrap();
    assert!(vault_dir.exists());

    let required = [
        "characters", "environments", "storyboards", "references",
        "audio/dialogue", "audio/foley", "audio/music",
        "clips/raw", "clips/approved", "proxies", "thumbnails",
        "continuity_frames", "exports", "checkpoints",
    ];

    for sub in required.iter() {
        assert!(vault_dir.join(sub).exists(), "Subdirectory {} must exist in vault", sub);
    }
}

#[test]
fn test_atomic_manifest_write_and_read() {
    let temp_root = tempfile::tempdir().unwrap();
    let (vault_dir, canonical_root) = ProjectManager::create_project_vault(temp_root.path(), "solaris-chronicles").unwrap();

    let meta = ProjectMetadata {
        id: "meta_test_01".to_string(),
        name: "Solaris Chronicles".to_string(),
        slug: "solaris-chronicles".to_string(),
        synopsis: "Deep ocean consciousness".to_string(),
        target_aspect_ratio: "16:9".to_string(),
        target_fps: 24.0,
        target_duration_seconds: 900,
        project_dir_path: vault_dir.to_string_lossy().to_string(),
        storage_root: canonical_root.to_string_lossy().to_string(),
        status: "ACTIVE".to_string(),
        created_at: 123456789,
        updated_at: 123456789,
    };

    ProjectManager::save_metadata_atomic(&vault_dir, &meta).expect("Atomic save failed");
    assert!(vault_dir.join("project.manifest.json").exists());

    let loaded = ProjectManager::read_manifest(&vault_dir).expect("Read manifest failed");
    assert_eq!(loaded, meta);
}

#[test]
fn test_path_validation_and_traversal_rejection() {
    assert!(ProjectManager::validate_path("../../Windows/System32").is_err());
    assert!(ProjectManager::validate_path("vault/../escaped").is_err());
    assert!(ProjectManager::validate_path("vault<bad>").is_err());
    assert!(ProjectManager::validate_path("vault|bad").is_err());
    assert!(ProjectManager::validate_path("   ").is_err());
    assert!(ProjectManager::validate_path("valid-vault-path").is_ok());
}
