use std::fs;
use std::path::PathBuf;
use rusqlite::Connection;
use crate::database::{init_db, run_integrity_check};
use crate::project_manager::{ProjectManager, ProjectMetadata, VaultDeletionOutcome};

fn setup_test_db() -> (tempfile::TempDir, crate::database::DbPool) {
    let temp_dir = tempfile::tempdir().expect("Failed to create temporary directory for test DB");
    let db_path = temp_dir.path().join("test_studio.db");
    let pool = init_db(&db_path).expect("Failed to initialize test DB pool");
    (temp_dir, pool)
}

#[test]
fn test_database_init_and_migrations() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().expect("Failed to get DB connection from pool");

    // Verify _schema_migrations table has version 1 recorded
    let version: i32 = conn.query_row(
        "SELECT version FROM _schema_migrations WHERE version = 1",
        [],
        |r| r.get(0),
    ).expect("Schema migration version 1 not recorded");
    assert_eq!(version, 1);

    // Verify PRAGMA settings
    let fk: i32 = conn.query_row("PRAGMA foreign_keys", [], |r| r.get(0)).unwrap();
    assert_eq!(fk, 1, "Foreign keys must be ON");

    let cache: i32 = conn.query_row("PRAGMA cache_size", [], |r| r.get(0)).unwrap();
    assert_eq!(cache, -8000, "Cache size must be -8000 (8 MB)");
}

#[test]
fn test_foreign_key_rejection() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().expect("Failed to get DB connection");

    // Attempt inserting clip pointing to non-existent scene
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
        "INSERT INTO projects (id, name, slug, project_dir_path, created_at, updated_at)
         VALUES (?1, 'Cascade Proj', 'cascade-proj', 'C:\\dummy', 0, 0)",
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

    // Delete project
    conn.execute("DELETE FROM projects WHERE id = ?1", [proj_id]).unwrap();

    // Verify cascade deletion of scenes and clips
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
        "INSERT INTO projects (id, name, slug, project_dir_path, created_at, updated_at)
         VALUES (?1, 'Rollback Proj', 'rollback-proj', 'C:\\dummy', 0, 0)",
        [proj_id],
    ).unwrap();

    // Start transaction, insert scene, then abort
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
fn test_project_crud() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().expect("Failed to get DB connection");

    let p_id = "proj_crud_01";
    conn.execute(
        "INSERT INTO projects (id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, status, created_at, updated_at)
         VALUES (?1, 'CRUD Master', 'crud-master', 'Synopsis test', '2.39:1', 24.0, 1200, 'C:\\test', 'PLANNING', 1000, 1000)",
        [p_id],
    ).unwrap();

    let (name, aspect): (String, String) = conn.query_row(
        "SELECT name, target_aspect_ratio FROM projects WHERE id = ?1",
        [p_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();
    assert_eq!(name, "CRUD Master");
    assert_eq!(aspect, "2.39:1");

    // Update
    conn.execute("UPDATE projects SET name = 'CRUD Master Final' WHERE id = ?1", [p_id]).unwrap();
    let updated_name: String = conn.query_row("SELECT name FROM projects WHERE id = ?1", [p_id], |r| r.get(0)).unwrap();
    assert_eq!(updated_name, "CRUD Master Final");

    // Delete
    conn.execute("DELETE FROM projects WHERE id = ?1", [p_id]).unwrap();
    let count: i64 = conn.query_row("SELECT count(*) FROM projects WHERE id = ?1", [p_id], |r| r.get(0)).unwrap();
    assert_eq!(count, 0);
}

#[test]
fn test_project_vault_scaffolding_14_subdirs() {
    let temp_root = tempfile::tempdir().unwrap();
    let vault_dir = ProjectManager::create_project_vault(temp_root.path(), "blade-runner-2099").unwrap();
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
    let vault_dir = ProjectManager::create_project_vault(temp_root.path(), "solaris-chronicles").unwrap();

    let meta = ProjectMetadata {
        id: "meta_test_01".to_string(),
        name: "Solaris Chronicles".to_string(),
        slug: "solaris-chronicles".to_string(),
        synopsis: "Deep ocean consciousness".to_string(),
        target_aspect_ratio: "16:9".to_string(),
        target_fps: 24.0,
        target_duration_seconds: 900,
        project_dir_path: vault_dir.to_string_lossy().to_string(),
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
fn test_manifest_corruption_detection() {
    let temp_root = tempfile::tempdir().unwrap();
    let vault_dir = ProjectManager::create_project_vault(temp_root.path(), "corrupt-test").unwrap();
    let manifest_path = vault_dir.join("project.manifest.json");

    // Write invalid empty JSON
    fs::write(&manifest_path, "").unwrap();
    let res_empty = ProjectManager::read_manifest(&vault_dir);
    assert!(res_empty.is_err(), "Empty manifest must be detected as corrupted");

    // Write malformed JSON
    fs::write(&manifest_path, "{ broken json }").unwrap();
    let res_broken = ProjectManager::read_manifest(&vault_dir);
    assert!(res_broken.is_err(), "Malformed manifest must be rejected");
}

#[test]
fn test_vault_integrity_and_healing() {
    let temp_root = tempfile::tempdir().unwrap();
    let vault_dir = ProjectManager::create_project_vault(temp_root.path(), "healing-test").unwrap();

    // Delete a folder
    let continuity_dir = vault_dir.join("continuity_frames");
    fs::remove_dir(&continuity_dir).unwrap();

    let (is_intact, missing) = ProjectManager::verify_vault_integrity(&vault_dir);
    assert!(!is_intact);
    assert!(missing.contains(&"continuity_frames".to_string()));

    // Auto-heal
    let healed_count = ProjectManager::heal_vault_directories(&vault_dir).unwrap();
    assert_eq!(healed_count, 1);
    assert!(continuity_dir.exists());

    let (now_intact, _) = ProjectManager::verify_vault_integrity(&vault_dir);
    assert!(now_intact, "Vault must be fully intact after auto-healing");
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

#[test]
fn test_safe_deletion_valid() {
    let temp_root = tempfile::tempdir().unwrap();
    let vault_dir = ProjectManager::create_project_vault(temp_root.path(), "to-be-deleted").unwrap();

    // Write manifest to mark as authentic project vault
    let meta = ProjectMetadata {
        id: "del_01".to_string(),
        name: "To Be Deleted".to_string(),
        slug: "to-be-deleted".to_string(),
        synopsis: "".to_string(),
        target_aspect_ratio: "16:9".to_string(),
        target_fps: 24.0,
        target_duration_seconds: 600,
        project_dir_path: vault_dir.to_string_lossy().to_string(),
        status: "PLANNING".to_string(),
        created_at: 0,
        updated_at: 0,
    };
    ProjectManager::save_metadata_atomic(&vault_dir, &meta).unwrap();
    assert!(vault_dir.exists());

    let outcome = ProjectManager::safe_delete_vault(&vault_dir, temp_root.path()).unwrap();
    assert_eq!(outcome, VaultDeletionOutcome::Deleted);
    assert!(!vault_dir.exists(), "Vault folder must be deleted from disk");
}

#[test]
fn test_safe_deletion_outside_root_rejected() {
    let authorized_root = tempfile::tempdir().unwrap();
    let outside_dir = tempfile::tempdir().unwrap();

    // Try deleting outside folder passing authorized_root
    let result = ProjectManager::safe_delete_vault(outside_dir.path(), authorized_root.path());
    assert!(result.is_err(), "Deleting directory outside authorized root must be strictly rejected");
}

#[test]
fn test_safe_deletion_missing_directory_handled() {
    let authorized_root = tempfile::tempdir().unwrap();
    let non_existent = authorized_root.path().join("ghost_project");

    let outcome = ProjectManager::safe_delete_vault(&non_existent, authorized_root.path()).unwrap();
    assert_eq!(outcome, VaultDeletionOutcome::AlreadyMissing, "Non-existent directory must return AlreadyMissing without throwing fatal error");
}
