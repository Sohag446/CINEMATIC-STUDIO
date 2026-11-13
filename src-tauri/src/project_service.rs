use crate::commands::{ClipDto, CreateProjectDto, SaveProjectDto, SceneDto};
use crate::database::{
    get_app_settings, get_last_active_project_id, recover_interrupted_deletions, save_app_settings,
    set_last_active_project_id, AppSettings, RecoveryReport,
};
use crate::project_manager::{ProjectManager, ProjectMetadata};
use rusqlite::Connection;
use std::path::PathBuf;

pub struct ProjectService;

impl ProjectService {
    pub fn create_project(
        conn: &mut Connection,
        input: CreateProjectDto,
    ) -> Result<ProjectMetadata, String> {
        let clean_name = input.name.trim();
        if clean_name.is_empty() {
            return Err("Project name cannot be empty".to_string());
        }

        let slug = clean_name
            .to_lowercase()
            .replace(|c: char| !c.is_alphanumeric(), "-")
            .trim_matches('-')
            .to_string();
        if slug.is_empty() {
            return Err("Invalid project name resulting in empty slug".to_string());
        }

        let base_dir = match input.custom_directory {
            Some(custom) => {
                let p = PathBuf::from(custom);
                ProjectManager::validate_storage_root(&p)
                    .map_err(|e| format!("Invalid custom project storage directory: {}", e))?
            }
            None => ProjectManager::default_authorized_root(),
        };

        // Check duplicate slug in database
        let slug_exists: bool = conn
            .query_row(
                "SELECT count(*) FROM projects WHERE slug = ?1",
                [&slug],
                |r| r.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .map_err(|e| e.to_string())?;

        if slug_exists {
            return Err(format!(
                "A project with slug '{}' already exists in the database",
                slug
            ));
        }

        // 1. Scaffold filesystem vault and resolve canonical storage root
        let (vault_path, canonical_storage_root) =
            ProjectManager::create_project_vault(&base_dir, &slug)
                .map_err(|e| format!("Failed to create project filesystem vault: {}", e))?;

        let now = chrono::Utc::now().timestamp_millis();
        let project = ProjectMetadata {
            id: uuid::Uuid::new_v4().to_string(),
            name: clean_name.to_string(),
            slug: slug.clone(),
            synopsis: input.synopsis.unwrap_or_default(),
            target_aspect_ratio: input
                .target_aspect_ratio
                .unwrap_or_else(|| "16:9".to_string()),
            target_fps: input.target_fps.unwrap_or(24.0),
            target_duration_seconds: input.target_duration_seconds.unwrap_or(600),
            project_dir_path: vault_path.to_string_lossy().to_string(),
            storage_root: canonical_storage_root.to_string_lossy().to_string(),
            status: "PLANNING".to_string(),
            created_at: now,
            updated_at: now,
        };

        // 2. Save atomic manifest on disk
        if let Err(e) = ProjectManager::save_metadata_atomic(&vault_path, &project) {
            let _ = std::fs::remove_dir_all(&vault_path);
            return Err(format!("Failed to write manifest: {}", e));
        }

        // 3. Atomically persist in SQLite within a transaction
        let insert_result = (|| -> Result<(), rusqlite::Error> {
            let tx = conn.transaction()?;
            tx.execute(
                "INSERT INTO projects (id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, storage_root, status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                (
                    &project.id,
                    &project.name,
                    &project.slug,
                    &project.synopsis,
                    &project.target_aspect_ratio,
                    project.target_fps,
                    project.target_duration_seconds,
                    &project.project_dir_path,
                    &project.storage_root,
                    &project.status,
                    project.created_at,
                    project.updated_at,
                ),
            )?;

            let default_scene_id = uuid::Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO scenes (id, project_id, sequence_number, title, dramatic_beat, estimated_duration_seconds, created_at, updated_at)
                 VALUES (?1, ?2, 1, 'Scene 01: Opening Sequence', 'Establish world and hero motivation', 60, ?3, ?4)",
                (&default_scene_id, &project.id, now, now),
            )?;

            tx.commit()?;
            Ok(())
        })();

        if let Err(e) = insert_result {
            let _ = std::fs::remove_dir_all(&vault_path);
            return Err(format!(
                "Database transaction failed; rolled back project: {}",
                e
            ));
        }

        let _ = set_last_active_project_id(conn, Some(&project.id));
        Ok(project)
    }

    pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectMetadata>, String> {
        let mut stmt = conn.prepare(
            "SELECT id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, storage_root, status, created_at, updated_at
             FROM projects WHERE status != 'DELETING' ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(ProjectMetadata {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    slug: row.get(2)?,
                    synopsis: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                    target_aspect_ratio: row.get(4)?,
                    target_fps: row.get(5)?,
                    target_duration_seconds: row.get(6)?,
                    project_dir_path: row.get(7)?,
                    storage_root: row.get(8)?,
                    status: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            })
            .map_err(|e| e.to_string())?;

        let mut projects = Vec::new();
        for p in rows {
            projects.push(p.map_err(|e| e.to_string())?);
        }
        Ok(projects)
    }

    pub fn open_project(conn: &Connection, project_id: &str) -> Result<ProjectMetadata, String> {
        let mut stmt = conn.prepare(
            "SELECT id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, storage_root, status, created_at, updated_at
             FROM projects WHERE id = ?1 AND status != 'DELETING'"
        ).map_err(|e| e.to_string())?;

        let project = stmt
            .query_row([project_id], |row| {
                Ok(ProjectMetadata {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    slug: row.get(2)?,
                    synopsis: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                    target_aspect_ratio: row.get(4)?,
                    target_fps: row.get(5)?,
                    target_duration_seconds: row.get(6)?,
                    project_dir_path: row.get(7)?,
                    storage_root: row.get(8)?,
                    status: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            })
            .map_err(|e| format!("Project not found or marked for deletion: {}", e))?;

        // Explicit vault recovery error handling
        let (intact, missing) = ProjectManager::verify_vault_integrity(&project.project_dir_path);
        if !intact {
            match ProjectManager::heal_vault_directories(&project.project_dir_path) {
                Ok(_) => {}
                Err(e) => {
                    return Err(format!(
                        "Vault integrity recovery failed for project '{}' (missing subdirectories: {}): {}. Directory integrity could not be restored.",
                        project.name,
                        missing.join(", "),
                        e
                    ));
                }
            }
        }

        set_last_active_project_id(conn, Some(&project.id))
            .map_err(|e| format!("Failed to persist active project ID in database: {}", e))?;

        Ok(project)
    }

    pub fn get_active_project(
        conn: &Connection,
        in_memory: Option<ProjectMetadata>,
    ) -> Result<Option<ProjectMetadata>, String> {
        if let Some(p) = in_memory {
            return Ok(Some(p));
        }

        let last_id = get_last_active_project_id(conn).map_err(|e| e.to_string())?;
        if let Some(id) = last_id {
            match Self::open_project(conn, &id) {
                Ok(p) => return Ok(Some(p)),
                Err(_) => {
                    let _ = set_last_active_project_id(conn, None);
                }
            }
        }

        Ok(None)
    }

    pub fn rename_project(
        conn: &mut Connection,
        project_id: &str,
        new_name: &str,
    ) -> Result<ProjectMetadata, String> {
        let clean_name = new_name.trim();
        if clean_name.is_empty() {
            return Err("Project name cannot be empty".to_string());
        }

        let mut current = Self::open_project(conn, project_id)?;
        let now = chrono::Utc::now().timestamp_millis();
        let old_name = current.name.clone();
        current.name = clean_name.to_string();
        current.updated_at = now;

        // 1. Update manifest on disk atomically first
        if let Err(e) = ProjectManager::save_metadata_atomic(&current.project_dir_path, &current) {
            return Err(format!("Failed to update project manifest on disk: {}", e));
        }

        // 2. Update database record in transaction
        let db_update = (|| -> Result<(), rusqlite::Error> {
            let tx = conn.transaction()?;
            tx.execute(
                "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
                (&current.name, now, project_id),
            )?;
            tx.commit()?;
            Ok(())
        })();

        if let Err(e) = db_update {
            current.name = old_name;
            let _ = ProjectManager::save_metadata_atomic(&current.project_dir_path, &current);
            return Err(format!("Database rename failed; reverted manifest: {}", e));
        }

        Ok(current)
    }

    pub fn save_project(
        conn: &mut Connection,
        project: SaveProjectDto,
    ) -> Result<ProjectMetadata, String> {
        // 1. Retrieve authoritative project record from SQLite using project ID
        let mut db_meta: ProjectMetadata = conn.query_row(
            "SELECT id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, storage_root, status, created_at, updated_at
             FROM projects WHERE id = ?1",
            [&project.id],
            |row| {
                Ok(ProjectMetadata {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    slug: row.get(2)?,
                    synopsis: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                    target_aspect_ratio: row.get(4)?,
                    target_fps: row.get(5)?,
                    target_duration_seconds: row.get(6)?,
                    project_dir_path: row.get(7)?,
                    storage_root: row.get(8)?,
                    status: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                })
            },
        ).map_err(|_| format!("Project with ID '{}' not found in database", project.id))?;

        // 2. Authoritative path validation: verify containment against registered storage root
        let root = ProjectManager::resolve_trusted_storage_root(
            &db_meta.project_dir_path,
            &db_meta.storage_root,
        )
        .map_err(|e| format!("Storage containment verification failed: {}", e))?;

        ProjectManager::verify_containment(&db_meta.project_dir_path, &root)
            .map_err(|e| format!("Storage containment check failed for project path: {}", e))?;

        // 3. Validate on-disk manifest identity before writing
        let on_disk_manifest = ProjectManager::read_manifest(&db_meta.project_dir_path)
            .map_err(|e| format!("Failed to read on-disk project manifest: {}", e))?;

        if on_disk_manifest.id != db_meta.id {
            return Err(format!(
                "Security violation: on-disk manifest ID '{}' does not match database project ID '{}'",
                on_disk_manifest.id, db_meta.id
            ));
        }

        // 4. Update ONLY allowed mutable fields
        if let Some(new_name) = project.name {
            let clean = new_name.trim();
            if clean.is_empty() {
                return Err("Project name cannot be empty".to_string());
            }
            db_meta.name = clean.to_string();
        }
        if let Some(syn) = project.synopsis {
            db_meta.synopsis = syn;
        }
        if let Some(aspect) = project.target_aspect_ratio {
            let valid_aspects = ["16:9", "9:16", "2.39:1", "1:1"];
            if !valid_aspects.contains(&aspect.as_str()) {
                return Err(format!("Invalid aspect ratio: {}", aspect));
            }
            db_meta.target_aspect_ratio = aspect;
        }
        if let Some(fps) = project.target_fps {
            if fps <= 0.0 || fps > 120.0 {
                return Err("Target FPS must be between 1.0 and 120.0".to_string());
            }
            db_meta.target_fps = fps;
        }
        if let Some(dur) = project.target_duration_seconds {
            if dur <= 0 {
                return Err("Target duration must be greater than 0".to_string());
            }
            db_meta.target_duration_seconds = dur;
        }

        let now = chrono::Utc::now().timestamp_millis();
        db_meta.updated_at = now;

        // 5. Atomic manifest save on disk
        ProjectManager::save_metadata_atomic(&db_meta.project_dir_path, &db_meta)
            .map_err(|e| format!("Failed to save manifest file to disk: {}", e))?;

        // 6. Update database inside transaction
        let db_update_res = (|| -> Result<(), rusqlite::Error> {
            let tx = conn.transaction()?;
            tx.execute(
                "UPDATE projects SET name = ?1, synopsis = ?2, target_aspect_ratio = ?3, target_fps = ?4, target_duration_seconds = ?5, updated_at = ?6 WHERE id = ?7",
                (
                    &db_meta.name,
                    &db_meta.synopsis,
                    &db_meta.target_aspect_ratio,
                    db_meta.target_fps,
                    db_meta.target_duration_seconds,
                    db_meta.updated_at,
                    &db_meta.id,
                ),
            )?;
            tx.commit()?;
            Ok(())
        })();

        if let Err(e) = db_update_res {
            let _ =
                ProjectManager::save_metadata_atomic(&db_meta.project_dir_path, &on_disk_manifest);
            return Err(format!("Database update failed; reverted manifest: {}", e));
        }

        Ok(db_meta)
    }

    pub fn delete_project(
        conn: &mut Connection,
        project_id: &str,
        confirmation_name: &str,
    ) -> Result<(), String> {
        // 1. Retrieve project record from trusted database
        let (name, dir_path, storage_root): (String, String, String) = conn
            .query_row(
                "SELECT name, project_dir_path, storage_root FROM projects WHERE id = ?1",
                [project_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|_| "Project not found in database".to_string())?;

        // 2. Verify exact confirmation name match
        if confirmation_name.trim() != name.trim() {
            return Err(
                "Confirmation name does not match project name. Deletion aborted.".to_string(),
            );
        }

        // 3. Resolve trusted authorized storage root (handles legacy empty root safely)
        let authorized_root =
            ProjectManager::resolve_trusted_storage_root(&dir_path, &storage_root).map_err(
                |e| format!("Cannot resolve trusted authorized root for deletion: {}", e),
            )?;

        let now = chrono::Utc::now().timestamp_millis();

        // 4. Record deletion intent in deletion journal inside a transaction (State: INTENT_RECORDED)
        let record_intent = (|| -> Result<(), rusqlite::Error> {
            let tx = conn.transaction()?;
            tx.execute(
                "INSERT OR REPLACE INTO project_deletion_journal (project_id, project_name, project_dir_path, storage_root, deletion_state, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 'INTENT_RECORDED', ?5, ?5)",
                (project_id, &name, &dir_path, &storage_root, now),
            )?;
            tx.execute(
                "UPDATE projects SET status = 'DELETING' WHERE id = ?1",
                [project_id],
            )?;
            tx.commit()?;
            Ok(())
        })();

        if let Err(e) = record_intent {
            return Err(format!(
                "Failed to record deletion intent in database journal: {}",
                e
            ));
        }

        // 5. Safely delete physical vault directory (enforcing canonical registered root containment)
        // If filesystem deletion fails (e.g. file lock or permissions), DB records are preserved in journal!
        if let Err(e) = ProjectManager::safe_delete_vault(&dir_path, &authorized_root) {
            let err_msg = format!("Filesystem deletion failed: {}. Database records have been preserved in deletion journal for safe recovery.", e);
            let _ = conn.execute(
                "UPDATE project_deletion_journal SET error_details = ?1, updated_at = ?2 WHERE project_id = ?3",
                (&err_msg, now, project_id),
            );
            return Err(err_msg);
        }

        // 6. Transition to DATABASE_CLEANUP_PENDING
        let _ = conn.execute(
            "UPDATE project_deletion_journal SET deletion_state = 'DATABASE_CLEANUP_PENDING', updated_at = ?1 WHERE project_id = ?2",
            (now, project_id),
        );

        // 7. Delete database record and journal entry in an atomic transaction
        let db_delete_result = (|| -> Result<(), rusqlite::Error> {
            let tx = conn.transaction()?;
            tx.execute("DELETE FROM projects WHERE id = ?1", [project_id])?;
            tx.execute(
                "DELETE FROM project_deletion_journal WHERE project_id = ?1",
                [project_id],
            )?;
            tx.commit()?;
            Ok(())
        })();

        if let Err(e) = db_delete_result {
            let err_msg = format!("Critical partial state: Vault directory was deleted, but database cleanup failed: {}. Run recover_pending_deletions to purge journaled record.", e);
            let _ = conn.execute(
                "UPDATE project_deletion_journal SET error_details = ?1, updated_at = ?2 WHERE project_id = ?3",
                (&err_msg, now, project_id),
            );
            return Err(err_msg);
        }

        let _ = set_last_active_project_id(conn, None);
        Ok(())
    }

    pub fn recover_deletions(conn: &mut Connection) -> Result<RecoveryReport, String> {
        recover_interrupted_deletions(conn).map_err(|e| e.to_string())
    }

    pub fn get_settings(conn: &Connection) -> Result<AppSettings, String> {
        get_app_settings(conn).map_err(|e| format!("Failed to read settings: {}", e))
    }

    pub fn update_settings(conn: &Connection, settings: AppSettings) -> Result<(), String> {
        settings
            .validate()
            .map_err(|e| format!("Settings validation error: {}", e))?;
        save_app_settings(conn, &settings).map_err(|e| format!("Failed to save settings: {}", e))
    }
}
