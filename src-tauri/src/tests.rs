use crate::chrome_service::crypto::{constant_time_eq, hmac_sha256, sha256_digest, to_hex};
use crate::chrome_service::discovery::ChromeDiscoveryService;
use crate::chrome_service::ipc::{IpcMessage, NativeMessagingIpc, MAX_MESSAGE_SIZE};
use crate::chrome_service::pairing::{PairingService, VerifyPairingDto};
use crate::chrome_service::profile_manager::{ProfileManager, RegisterProfileDto};
use crate::commands::{CreateProjectDto, SaveProjectDto};
use crate::database::{
    apply_all_migrations, get_app_settings, get_last_active_project_id, init_db,
    run_integrity_check, save_app_settings, set_last_active_project_id, AppSettings,
};
use crate::project_manager::{ProjectManager, ProjectMetadata, VaultDeletionOutcome};
use crate::project_service::ProjectService;
use rusqlite::Connection;
use std::fs;
use std::path::PathBuf;

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
    assert!(
        result.is_err(),
        "Deletion must fail when safe_delete_vault cannot safely proceed"
    );

    // CRITICAL: Database record MUST STILL EXIST!
    let db_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM projects WHERE id = ?1",
            [&project.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        db_count, 1,
        "Database record must not be deleted when filesystem deletion fails"
    );

    // CRITICAL: Deletion journal entry must exist with error details!
    let (state, err_details): (String, Option<String>) = conn.query_row(
        "SELECT deletion_state, error_details FROM project_deletion_journal WHERE project_id = ?1",
        [&project.id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).unwrap();
    assert_eq!(state, "INTENT_RECORDED");
    assert!(
        err_details.is_some(),
        "Journal must contain actionable error details"
    );
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
    assert!(
        !proj_dir.exists(),
        "Filesystem directory must be cleaned up by recovery"
    );

    let count: i64 = conn
        .query_row(
            "SELECT count(*) FROM projects WHERE id = ?1",
            [&project.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 0, "Database record must be purged by recovery");

    let journal_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM project_deletion_journal WHERE project_id = ?1",
            [&project.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        journal_count, 0,
        "Journal entry must be purged after complete recovery"
    );
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

    let p_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM projects WHERE id = ?1",
            [proj_id],
            |r| r.get(0),
        )
        .unwrap();
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

    // Check version 5 is recorded
    let version: i32 = conn
        .query_row("SELECT MAX(version) FROM _schema_migrations", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(version, 5, "Database must upgrade to version 5");

    // Verify projects table has storage_root column
    let col_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM pragma_table_info('projects') WHERE name = 'storage_root'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        col_count, 1,
        "projects table must have storage_root column in v2"
    );

    // Verify project_deletion_journal exists
    let journal_exists: bool = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='project_deletion_journal'",
        [],
        |r| r.get::<_, i64>(0),
    ).map(|c| c > 0).unwrap();
    assert!(
        journal_exists,
        "project_deletion_journal table must exist in v2"
    );
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
    conn.execute("INSERT INTO _schema_migrations VALUES (1, 1000);", ())
        .unwrap();

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
    )
    .unwrap();

    conn.execute(
        "INSERT INTO clips (id, scene_id, project_id, clip_number, target_duration_seconds, subject_action, created_at, updated_at)
         VALUES ('clip_leg_01', 'scene_leg_01', 'leg_01', 1, 10.0, 'Legacy Hero Action', 1000, 1000)",
        (),
    ).unwrap();

    // 3. Now run the real forward-only migration runner
    apply_all_migrations(&mut conn).expect("Upgrade from v1 to v2 failed");

    // 4. Verify version 5 recorded
    let max_v: i32 = conn
        .query_row("SELECT MAX(version) FROM _schema_migrations", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(max_v, 5);

    // 5. CRITICAL: Verify all representative records are 100% intact!
    let (p_name, p_root): (String, String) = conn
        .query_row(
            "SELECT name, storage_root FROM projects WHERE id = 'leg_01'",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(p_name, "Legacy Noir");
    assert_eq!(
        p_root, "",
        "Legacy projects receive default empty storage_root"
    );

    let s_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM scenes WHERE project_id = 'leg_01'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(s_count, 1);

    let c_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM clips WHERE project_id = 'leg_01'",
            [],
            |r| r.get(0),
        )
        .unwrap();
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
    let (db_name, db_aspect): (String, String) = conn
        .query_row(
            "SELECT name, target_aspect_ratio FROM projects WHERE id = ?1",
            [&project.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
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
    assert!(
        result.is_err(),
        "Must reject saving when manifest ID mismatches database ID"
    );
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
    assert!(
        open_res.is_err(),
        "open_project must fail when vault healing cannot recreate directory"
    );
}

#[test]
fn test_database_integrity_check_service() {
    let (_temp_dir, pool) = setup_test_db();
    let conn = pool.get().unwrap();
    assert!(run_integrity_check(&conn).unwrap());
}

// ============================================================================
// PHASE 2: CHROME PROFILE DISCOVERY, REGISTRATION, PAIRING & IPC TESTS
// ============================================================================

#[test]
fn test_crypto_sha256_and_hmac_sha256_known_vectors() {
    // 1. SHA-256 standard vector: empty string
    let empty_digest = sha256_digest(b"");
    assert_eq!(
        to_hex(&empty_digest),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );

    // 2. SHA-256 standard vector: "abc"
    let abc_digest = sha256_digest(b"abc");
    assert_eq!(
        to_hex(&abc_digest),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );

    // 3. HMAC-SHA256 vector: "key" + "The quick brown fox jumps over the lazy dog"
    let key = b"key";
    let data = b"The quick brown fox jumps over the lazy dog";
    let hmac = hmac_sha256(key, data);
    assert_eq!(
        to_hex(&hmac),
        "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
    );

    // 4. Constant time equality check
    assert!(constant_time_eq(
        b"secret_signature_123",
        b"secret_signature_123"
    ));
    assert!(!constant_time_eq(
        b"secret_signature_123",
        b"secret_signature_124"
    ));
    assert!(!constant_time_eq(b"short", b"longer_string"));
}

#[test]
fn test_migration_v3_creates_chrome_tables() {
    let mut conn = Connection::open_in_memory().unwrap();
    apply_all_migrations(&mut conn).expect("Fresh migration execution failed");

    // Version 5 recorded
    let version: i32 = conn
        .query_row("SELECT MAX(version) FROM _schema_migrations", [], |r| {
            r.get(0)
        })
        .unwrap();
    assert_eq!(version, 5, "Database must upgrade to version 5");

    // Tables exist
    let profiles_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='chrome_profiles'",
            [],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(profiles_count, 1, "chrome_profiles table must exist in v3");

    let sessions_count: i64 = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='chrome_pairing_sessions'",
        [],
        |r| r.get(0),
    ).unwrap();
    assert_eq!(
        sessions_count, 1,
        "chrome_pairing_sessions table must exist in v3"
    );
}

#[test]
fn test_profile_registration_and_duplicate_prevention() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let input = RegisterProfileDto {
        profile_dir_key: "Profile 1".to_string(),
        display_name: "Veo Studio 1".to_string(),
        user_data_dir: None,
        assigned_purpose: Some("VIDEO_GENERATION".to_string()),
        assigned_provider: Some("Google Veo".to_string()),
    };

    let registered = ProfileManager::register_profile(&mut conn, input).unwrap();
    assert_eq!(registered.profile_dir_key, "Profile 1");
    assert_eq!(registered.display_name, "Veo Studio 1");
    assert_eq!(registered.assigned_provider.as_deref(), Some("Google Veo"));
    assert_eq!(registered.connection_state, "DISCONNECTED");

    // Attempting to register the exact same profile_dir_key must be rejected
    let duplicate_input = RegisterProfileDto {
        profile_dir_key: "Profile 1".to_string(),
        display_name: "Duplicate Veo".to_string(),
        user_data_dir: None,
        assigned_purpose: None,
        assigned_provider: None,
    };
    let duplicate_res = ProfileManager::register_profile(&mut conn, duplicate_input);
    assert!(
        duplicate_res.is_err(),
        "Duplicate profile directory key registration must be rejected"
    );
}

#[test]
fn test_profile_unregister_behavior() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let input = RegisterProfileDto {
        profile_dir_key: "Profile 2".to_string(),
        display_name: "ChatGPT Agent".to_string(),
        user_data_dir: None,
        assigned_purpose: Some("STORY_GENERATION".to_string()),
        assigned_provider: Some("ChatGPT".to_string()),
    };

    let registered = ProfileManager::register_profile(&mut conn, input).unwrap();
    let count: i64 = conn
        .query_row(
            "SELECT count(*) FROM chrome_profiles WHERE id = ?1",
            [&registered.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(count, 1);

    ProfileManager::unregister_profile(&mut conn, &registered.id).unwrap();
    let after_count: i64 = conn
        .query_row(
            "SELECT count(*) FROM chrome_profiles WHERE id = ?1",
            [&registered.id],
            |r| r.get(0),
        )
        .unwrap();
    assert_eq!(
        after_count, 0,
        "Unregistering profile must delete database record"
    );
}

#[test]
fn test_pairing_handshake_success() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let reg = ProfileManager::register_profile(
        &mut conn,
        RegisterProfileDto {
            profile_dir_key: "Profile 3".to_string(),
            display_name: "Handshake Test".to_string(),
            user_data_dir: None,
            assigned_purpose: None,
            assigned_provider: None,
        },
    )
    .unwrap();

    // 1. Initiate pairing
    let challenge = PairingService::initiate_pairing(&mut conn, &reg.id).unwrap();
    assert_eq!(challenge.profile_id, reg.id);
    assert!(!challenge.pairing_secret.is_empty());
    assert!(!challenge.server_nonce.is_empty());

    // 2. Extension computes HMAC-SHA256 signature
    let client_nonce = "client_nonce_xyz123";
    let message = format!("{}:{}", challenge.server_nonce, client_nonce);
    let hmac = hmac_sha256(challenge.pairing_secret.as_bytes(), message.as_bytes());
    let client_sig = to_hex(&hmac);

    // 3. Desktop verifies response
    let verify_dto = VerifyPairingDto {
        session_id: challenge.session_id,
        profile_id: reg.id.clone(),
        client_nonce: client_nonce.to_string(),
        client_signature_hex: client_sig,
    };

    let result = PairingService::verify_pairing(&mut conn, verify_dto).unwrap();
    assert!(result.success);

    // 4. Check profile updated to PAIRED & EXTENSION_CONNECTED
    let (pairing_state, conn_state): (String, String) = conn
        .query_row(
            "SELECT pairing_state, connection_state FROM chrome_profiles WHERE id = ?1",
            [&reg.id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .unwrap();
    assert_eq!(pairing_state, "PAIRED");
    assert_eq!(conn_state, "EXTENSION_CONNECTED");
}

#[test]
fn test_pairing_wrong_profile_identity_rejected() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let reg1 = ProfileManager::register_profile(
        &mut conn,
        RegisterProfileDto {
            profile_dir_key: "Profile A".to_string(),
            display_name: "Profile A".to_string(),
            user_data_dir: None,
            assigned_purpose: None,
            assigned_provider: None,
        },
    )
    .unwrap();

    let challenge = PairingService::initiate_pairing(&mut conn, &reg1.id).unwrap();

    // Attacker sends verify request for a different profile ID
    let verify_dto = VerifyPairingDto {
        session_id: challenge.session_id,
        profile_id: "attacker_profile_id".to_string(),
        client_nonce: "nonce".to_string(),
        client_signature_hex: "sig".to_string(),
    };

    let res = PairingService::verify_pairing(&mut conn, verify_dto);
    assert!(
        res.is_err(),
        "Mismatched profile ID in pairing must be rejected"
    );
}

#[test]
fn test_pairing_replay_attack_rejected() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let reg = ProfileManager::register_profile(
        &mut conn,
        RegisterProfileDto {
            profile_dir_key: "Profile Replay".to_string(),
            display_name: "Replay Test".to_string(),
            user_data_dir: None,
            assigned_purpose: None,
            assigned_provider: None,
        },
    )
    .unwrap();

    let challenge = PairingService::initiate_pairing(&mut conn, &reg.id).unwrap();
    let client_nonce = "client_nonce_replay";
    let message = format!("{}:{}", challenge.server_nonce, client_nonce);
    let sig = to_hex(&hmac_sha256(
        challenge.pairing_secret.as_bytes(),
        message.as_bytes(),
    ));

    let dto1 = VerifyPairingDto {
        session_id: challenge.session_id.clone(),
        profile_id: reg.id.clone(),
        client_nonce: client_nonce.to_string(),
        client_signature_hex: sig.clone(),
    };
    assert!(
        PairingService::verify_pairing(&mut conn, dto1)
            .unwrap()
            .success
    );

    // Second attempt with exact same session ID must fail as a replay attack!
    let dto2 = VerifyPairingDto {
        session_id: challenge.session_id,
        profile_id: reg.id,
        client_nonce: client_nonce.to_string(),
        client_signature_hex: sig,
    };
    let res = PairingService::verify_pairing(&mut conn, dto2);
    assert!(
        res.is_err(),
        "Replay attack using consumed pairing session must be rejected"
    );
}

#[test]
fn test_pairing_expiration_enforced() {
    let (_db_temp, pool) = setup_test_db();
    let mut conn = pool.get().unwrap();

    let reg = ProfileManager::register_profile(
        &mut conn,
        RegisterProfileDto {
            profile_dir_key: "Profile Expired".to_string(),
            display_name: "Expired Test".to_string(),
            user_data_dir: None,
            assigned_purpose: None,
            assigned_provider: None,
        },
    )
    .unwrap();

    let challenge = PairingService::initiate_pairing(&mut conn, &reg.id).unwrap();

    // Manually expire session in DB
    let past = chrono::Utc::now().timestamp_millis() - 10000;
    conn.execute(
        "UPDATE chrome_pairing_sessions SET expires_at = ?1 WHERE id = ?2",
        (past, &challenge.session_id),
    )
    .unwrap();

    let client_nonce = "nonce_expired";
    let message = format!("{}:{}", challenge.server_nonce, client_nonce);
    let sig = to_hex(&hmac_sha256(
        challenge.pairing_secret.as_bytes(),
        message.as_bytes(),
    ));

    let dto = VerifyPairingDto {
        session_id: challenge.session_id,
        profile_id: reg.id,
        client_nonce: client_nonce.to_string(),
        client_signature_hex: sig,
    };

    let res = PairingService::verify_pairing(&mut conn, dto);
    assert!(res.is_err(), "Expired pairing challenge must be rejected");
}

#[test]
fn test_ipc_packet_framing_and_size_bounds() {
    let msg = IpcMessage {
        id: "msg_123".to_string(),
        msg_type: "PING".to_string(),
        profile_id: Some("prof_456".to_string()),
        payload: serde_json::json!({ "status": "OK" }),
        timestamp: 1000,
    };

    let mut buffer = Vec::new();
    NativeMessagingIpc::write_packet(&mut buffer, &msg).unwrap();

    // Verify 4-byte length prefix
    assert!(buffer.len() > 4);
    let mut len_bytes = [0u8; 4];
    len_bytes.copy_from_slice(&buffer[..4]);
    let len = u32::from_le_bytes(len_bytes) as usize;
    assert_eq!(len, buffer.len() - 4);

    // Read back packet
    let mut cursor = std::io::Cursor::new(buffer);
    let decoded = NativeMessagingIpc::read_packet(&mut cursor).unwrap();
    assert_eq!(decoded.id, "msg_123");
    assert_eq!(decoded.msg_type, "PING");
    assert_eq!(decoded.profile_id.as_deref(), Some("prof_456"));

    // Test rejecting oversized packet (> 1 MB)
    let fake_len = (MAX_MESSAGE_SIZE as u32 + 10).to_le_bytes();
    let mut oversized = std::io::Cursor::new(fake_len);
    assert!(
        NativeMessagingIpc::read_packet(&mut oversized).is_err(),
        "Packets exceeding 1MB must be rejected"
    );
}

#[test]
fn test_chrome_discovery_local_state_parsing() {
    let temp_dir = tempfile::tempdir().unwrap();
    let local_state_content = r#"{
        "profile": {
            "info_cache": {
                "Default": {
                    "name": "Main Personal Account",
                    "gaia_name": "director@cinematic.studio",
                    "avatar_icon": "chrome://theme/IDR_PROFILE_AVATAR_0"
                },
                "Profile 1": {
                    "name": "Veo Video Account",
                    "user_name": "veo-producer@cinematic.studio",
                    "avatar_icon": "chrome://theme/IDR_PROFILE_AVATAR_1"
                }
            }
        }
    }"#;

    fs::write(temp_dir.path().join("Local State"), local_state_content).unwrap();

    let profiles = ChromeDiscoveryService::discover_profiles(Some(temp_dir.path())).unwrap();
    assert_eq!(profiles.len(), 2);

    let default_prof = profiles
        .iter()
        .find(|p| p.profile_dir_key == "Default")
        .unwrap();
    assert_eq!(default_prof.display_name, "Main Personal Account");
    assert_eq!(
        default_prof.google_account_label.as_deref(),
        Some("director@cinematic.studio")
    );

    let prof1 = profiles
        .iter()
        .find(|p| p.profile_dir_key == "Profile 1")
        .unwrap();
    assert_eq!(prof1.display_name, "Veo Video Account");
    assert_eq!(
        prof1.google_account_label.as_deref(),
        Some("veo-producer@cinematic.studio")
    );
}

#[test]
fn test_calculate_sha256_known_vectors_and_avalanche_effect() {
    use crate::media_service::ffmpeg::FFmpegManager;

    let temp_dir = tempfile::tempdir().unwrap();

    // 1. Empty file vector: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    let empty_file = temp_dir.path().join("empty.bin");
    fs::write(&empty_file, b"").unwrap();
    let empty_hash = FFmpegManager::calculate_sha256(&empty_file).unwrap();
    assert_eq!(
        empty_hash, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "Empty file SHA-256 must match FIPS vector"
    );

    // 2. "abc" vector: ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    let abc_file = temp_dir.path().join("abc.bin");
    fs::write(&abc_file, b"abc").unwrap();
    let abc_hash = FFmpegManager::calculate_sha256(&abc_file).unwrap();
    assert_eq!(
        abc_hash, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
        "'abc' SHA-256 must match standard NIST vector"
    );

    // 3. "The quick brown fox jumps over the lazy dog" vector: d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592
    let fox_file = temp_dir.path().join("fox.bin");
    fs::write(&fox_file, b"The quick brown fox jumps over the lazy dog").unwrap();
    let fox_hash = FFmpegManager::calculate_sha256(&fox_file).unwrap();
    assert_eq!(
        fox_hash, "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
        "Fox vector must match NIST reference"
    );

    // 4. Avalanche effect: single-byte mutation ("The quick brown fox jumps over the lazy dog." - added period)
    let fox_mutated = temp_dir.path().join("fox_mutated.bin");
    fs::write(
        &fox_mutated,
        b"The quick brown fox jumps over the lazy dog.",
    )
    .unwrap();
    let fox_mutated_hash = FFmpegManager::calculate_sha256(&fox_mutated).unwrap();
    assert_eq!(
        fox_mutated_hash, "ef537f25c895bfa782526529a9b63d97aa631564d5d789c2b765448c8635fb6c",
        "Single byte change must completely alter SHA-256 digest"
    );
    assert_ne!(fox_hash, fox_mutated_hash);

    // 5. Missing file error handling
    let missing_file = temp_dir.path().join("non_existent_file.bin");
    let err = FFmpegManager::calculate_sha256(&missing_file);
    assert!(err.is_err(), "Missing file must return an explicit Err");
}

#[test]
fn test_calculate_sha256_bundled_media_binaries() {
    use crate::media_service::ffmpeg::{
        FFmpegManager, EXPECTED_FFMPEG_SHA256, EXPECTED_FFPROBE_SHA256,
    };
    use std::path::PathBuf;

    let base_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let ffmpeg_path = base_dir.join("resources/media-engine/windows-x64/ffmpeg.exe");
    let ffprobe_path = base_dir.join("resources/media-engine/windows-x64/ffprobe.exe");

    if ffmpeg_path.exists() {
        let calculated = FFmpegManager::calculate_sha256(&ffmpeg_path).unwrap();
        assert_eq!(
            calculated.to_lowercase(),
            EXPECTED_FFMPEG_SHA256.to_lowercase(),
            "Bundled ffmpeg.exe real streaming hash must match expected Gyan 9.0.2 checksum"
        );
    }

    if ffprobe_path.exists() {
        let calculated = FFmpegManager::calculate_sha256(&ffprobe_path).unwrap();
        assert_eq!(
            calculated.to_lowercase(),
            EXPECTED_FFPROBE_SHA256.to_lowercase(),
            "Bundled ffprobe.exe real streaming hash must match expected Gyan 9.0.2 checksum"
        );
    }
}

#[test]
fn test_calculate_sha256_block_boundaries_and_multi_buffer() {
    use crate::media_service::ffmpeg::FFmpegManager;

    let temp_dir = tempfile::tempdir().unwrap();

    // Block boundary tests: 55, 56, 63, 64, 65 bytes
    for size in [55, 56, 63, 64, 65, 127, 128, 129] {
        let file_path = temp_dir.path().join(format!("boundary_{}.bin", size));
        let data = vec![0x61u8; size]; // 'a' repeated
        fs::write(&file_path, &data).unwrap();
        let hash = FFmpegManager::calculate_sha256(&file_path).unwrap();
        assert_eq!(
            hash.len(),
            64,
            "Hash length must always be 64 hex characters"
        );
    }

    // Multi-buffer streaming test (131,072 bytes = 2 full 64KB buffers)
    let multi_buf_path = temp_dir.path().join("multi_buffer.bin");
    let large_data = vec![0x42u8; 131_072];
    fs::write(&multi_buf_path, &large_data).unwrap();
    let multi_hash = FFmpegManager::calculate_sha256(&multi_buf_path).unwrap();
    assert_eq!(multi_hash.len(), 64);
}

#[test]
fn test_os_csprng_pairing_secret_properties() {
    use crate::chrome_service::crypto::generate_pairing_secret;
    use std::collections::HashSet;

    // 1. Valid 64-char hex format
    let secret = generate_pairing_secret().expect("OS CSPRNG must succeed");
    assert_eq!(
        secret.len(),
        64,
        "256-bit secret must be exactly 64 hex chars"
    );
    assert!(
        secret.chars().all(|c| c.is_ascii_hexdigit()),
        "All chars must be valid hex"
    );

    // 2. Uniqueness test across 500 generated secrets
    let mut generated = HashSet::new();
    for _ in 0..500 {
        let s = generate_pairing_secret().expect("OS CSPRNG must succeed");
        assert!(generated.insert(s), "Collision detected in CSPRNG output!");
    }
}

#[test]
fn test_docked_chrome_coordinate_transformation_scaling() {
    use crate::chrome_service::docked_chrome::DockedChromeManager;

    // 100% DPI (96 DPI, scale = 1.0)
    let (x100, y100, w100, h100) =
        DockedChromeManager::transform_css_to_parent_client(320, 60, 800, 600, 96, 1920, 1080);
    assert_eq!((x100, y100, w100, h100), (320, 60, 800, 600));

    // 125% DPI (120 DPI, scale = 1.25)
    let (x125, y125, w125, h125) =
        DockedChromeManager::transform_css_to_parent_client(320, 60, 800, 600, 120, 1920, 1080);
    assert_eq!((x125, y125, w125, h125), (400, 75, 1000, 750));

    // 150% DPI (144 DPI, scale = 1.50)
    let (x150, y150, w150, h150) =
        DockedChromeManager::transform_css_to_parent_client(320, 60, 800, 600, 144, 1920, 1080);
    assert_eq!((x150, y150, w150, h150), (480, 90, 1200, 900));

    // 200% DPI (192 DPI, scale = 2.00)
    let (x200, y200, w200, h200) =
        DockedChromeManager::transform_css_to_parent_client(320, 60, 800, 600, 192, 2560, 1440);
    assert_eq!((x200, y200, w200, h200), (640, 120, 1600, 1200));

    // Parent client boundary clamping:
    // At 150% DPI, 320 -> 480. If client width is 1000, max width available is 1000 - 480 = 520.
    let (xc, yc, wc, hc) =
        DockedChromeManager::transform_css_to_parent_client(320, 60, 800, 600, 144, 1000, 800);
    assert_eq!(xc, 480);
    assert_eq!(yc, 90);
    assert_eq!(wc, 520, "Width must clamp to fit within parent client area");
    assert_eq!(
        hc, 710,
        "Height must clamp to fit within parent client area"
    );
}

#[test]
fn test_docked_chrome_sync_bounds_and_visibility_validation() {
    use crate::chrome_service::docked_chrome::DockedChromeManager;

    // sync_bounds should fail when no window is active
    DockedChromeManager::init();
    let res = DockedChromeManager::sync_bounds(0, 0, 800, 600);
    assert!(res.is_err(), "sync_bounds must reject missing HWND");

    // set_visible should fail when no window is active
    let vis_res = DockedChromeManager::set_visible(true);
    assert!(
        vis_res.is_err(),
        "set_visible must reject missing or invalid HWND"
    );
}
