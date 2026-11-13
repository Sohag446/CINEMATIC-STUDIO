use tauri::State;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;
use crate::database::{
    DbPool, 
    run_integrity_check, 
    get_app_settings, 
    save_app_settings, 
    get_last_active_project_id, 
    set_last_active_project_id, 
    recover_interrupted_deletions,
    AppSettings
};
use crate::project_manager::{ProjectManager, ProjectMetadata};
use crate::telemetry::{TelemetryCollector, TelemetryData};

pub struct AppState {
    pub db: DbPool,
    pub telemetry: TelemetryCollector,
    pub active_project: Mutex<Option<ProjectMetadata>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectDto {
    pub name: String,
    pub synopsis: Option<String>,
    pub target_aspect_ratio: Option<String>,
    pub target_fps: Option<f64>,
    pub target_duration_seconds: Option<i64>,
    pub custom_directory: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SaveProjectDto {
    pub id: String,
    pub name: Option<String>,
    pub synopsis: Option<String>,
    pub target_aspect_ratio: Option<String>,
    pub target_fps: Option<f64>,
    pub target_duration_seconds: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SceneDto {
    pub id: String,
    pub project_id: String,
    pub sequence_number: i32,
    pub title: String,
    pub dramatic_beat: String,
    pub estimated_duration_seconds: i32,
    pub continuity_rules: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipDto {
    pub id: String,
    pub scene_id: String,
    pub project_id: String,
    pub clip_number: i32,
    pub target_duration_seconds: f64,
    pub camera_framing: String,
    pub camera_angle: String,
    pub camera_movement: String,
    pub subject_action: String,
    pub lighting_setup: Option<String>,
    pub status: String,
    pub assigned_provider: String,
    pub thumbnail_path: Option<String>,
    pub proxy_path: Option<String>,
    pub output_video_path: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[tauri::command]
pub async fn create_project(input: CreateProjectDto, state: State<'_, AppState>) -> Result<ProjectMetadata, String> {
    let clean_name = input.name.trim();
    if clean_name.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }

    let slug = clean_name.to_lowercase().replace(|c: char| !c.is_alphanumeric(), "-").trim_matches('-').to_string();
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

    // Verify project does not already exist in DB
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let slug_exists: bool = conn.query_row(
        "SELECT count(*) FROM projects WHERE slug = ?1",
        [&slug],
        |r| r.get::<_, i64>(0),
    ).map(|count| count > 0).unwrap_or(false);

    if slug_exists {
        return Err(format!("A project with slug '{}' already exists in the database", slug));
    }

    // 1. Scaffold filesystem vault and resolve canonical storage root
    let (vault_path, canonical_storage_root) = ProjectManager::create_project_vault(&base_dir, &slug)
        .map_err(|e| format!("Failed to create project filesystem vault: {}", e))?;

    let now = chrono::Utc::now().timestamp_millis();
    let project = ProjectMetadata {
        id: uuid::Uuid::new_v4().to_string(),
        name: clean_name.to_string(),
        slug: slug.clone(),
        synopsis: input.synopsis.unwrap_or_default(),
        target_aspect_ratio: input.target_aspect_ratio.unwrap_or_else(|| "16:9".to_string()),
        target_fps: input.target_fps.unwrap_or(24.0),
        target_duration_seconds: input.target_duration_seconds.unwrap_or(600),
        project_dir_path: vault_path.to_string_lossy().to_string(),
        storage_root: canonical_storage_root.to_string_lossy().to_string(),
        status: "PLANNING".to_string(),
        created_at: now,
        updated_at: now,
    };

    // 2. Save atomic manifest
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
        // Rollback filesystem changes if database transaction failed
        let _ = std::fs::remove_dir_all(&vault_path);
        return Err(format!("Database transaction failed; rolled back project: {}", e));
    }

    // Set active project in state and SQLite
    let _ = set_last_active_project_id(&conn, Some(&project.id));
    let mut active = state.active_project.lock().unwrap();
    *active = Some(project.clone());

    Ok(project)
}

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectMetadata>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, storage_root, status, created_at, updated_at
         FROM projects WHERE status != 'DELETING' ORDER BY updated_at DESC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
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
    }).map_err(|e| e.to_string())?;

    let mut projects = Vec::new();
    for p in rows {
        projects.push(p.map_err(|e| e.to_string())?);
    }
    Ok(projects)
}

#[tauri::command]
pub async fn open_project(project_id: String, state: State<'_, AppState>) -> Result<ProjectMetadata, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, storage_root, status, created_at, updated_at
         FROM projects WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let project = stmt.query_row([&project_id], |row| {
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
    }).map_err(|e| format!("Project not found: {}", e))?;

    // Explicit vault recovery error handling
    let (intact, missing) = ProjectManager::verify_vault_integrity(&project.project_dir_path);
    if !intact {
        match ProjectManager::heal_vault_directories(&project.project_dir_path) {
            Ok(_) => {},
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

    // Persist active project in memory and SQLite
    let _ = set_last_active_project_id(&conn, Some(&project.id));
    let mut active = state.active_project.lock().unwrap();
    *active = Some(project.clone());

    Ok(project)
}

#[tauri::command]
pub async fn get_active_project(state: State<'_, AppState>) -> Result<Option<ProjectMetadata>, String> {
    {
        let active = state.active_project.lock().unwrap();
        if let Some(ref p) = *active {
            return Ok(Some(p.clone()));
        }
    }

    // Restore from SQLite if available
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let last_id = get_last_active_project_id(&conn).map_err(|e| e.to_string())?;
    if let Some(id) = last_id {
        let project_res = open_project(id, state.clone()).await;
        match project_res {
            Ok(p) => return Ok(Some(p)),
            Err(_) => {
                let _ = set_last_active_project_id(&conn, None);
            }
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn rename_project(project_id: String, new_name: String, state: State<'_, AppState>) -> Result<ProjectMetadata, String> {
    let clean_name = new_name.trim();
    if clean_name.is_empty() {
        return Err("Project name cannot be empty".to_string());
    }

    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let mut current = open_project(project_id.clone(), state.clone()).await?;

    let now = chrono::Utc::now().timestamp_millis();
    let old_name = current.name.clone();
    current.name = clean_name.to_string();
    current.updated_at = now;

    // 1. Update manifest atomically first
    if let Err(e) = ProjectManager::save_metadata_atomic(&current.project_dir_path, &current) {
        return Err(format!("Failed to update project manifest on disk: {}", e));
    }

    // 2. Update database record in transaction
    let db_update = (|| -> Result<(), rusqlite::Error> {
        let tx = conn.transaction()?;
        tx.execute(
            "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
            (&current.name, now, &project_id),
        )?;
        tx.commit()?;
        Ok(())
    })();

    if let Err(e) = db_update {
        // Revert manifest change on DB failure
        current.name = old_name;
        let _ = ProjectManager::save_metadata_atomic(&current.project_dir_path, &current);
        return Err(format!("Database rename failed; reverted manifest: {}", e));
    }

    let mut active = state.active_project.lock().unwrap();
    *active = Some(current.clone());

    Ok(current)
}

#[tauri::command]
pub async fn save_project(project: SaveProjectDto, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;

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
    let root = if db_meta.storage_root.is_empty() {
        ProjectManager::default_authorized_root()
    } else {
        PathBuf::from(&db_meta.storage_root)
    };

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
        // Revert manifest back to on-disk original on DB failure
        let _ = ProjectManager::save_metadata_atomic(&db_meta.project_dir_path, &on_disk_manifest);
        return Err(format!("Database update failed; reverted manifest: {}", e));
    }

    // Update in-memory active project if active
    let mut active = state.active_project.lock().unwrap();
    if let Some(ref p) = *active {
        if p.id == db_meta.id {
            *active = Some(db_meta.clone());
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn close_project(state: State<'_, AppState>) -> Result<(), String> {
    let mut active = state.active_project.lock().unwrap();
    *active = None;
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let _ = set_last_active_project_id(&conn, None);
    Ok(())
}

#[tauri::command]
pub async fn delete_project(project_id: String, confirmation_name: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    
    // 1. Retrieve project record from trusted database
    let (name, dir_path, storage_root): (String, String, String) = conn.query_row(
        "SELECT name, project_dir_path, storage_root FROM projects WHERE id = ?1",
        [&project_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).map_err(|_| "Project not found in database".to_string())?;

    // 2. Verify exact confirmation name match
    if confirmation_name.trim() != name.trim() {
        return Err("Confirmation name does not match project name. Deletion aborted.".to_string());
    }

    // 3. Resolve authorized storage root from registered metadata
    let authorized_root = if storage_root.is_empty() {
        ProjectManager::default_authorized_root()
    } else {
        PathBuf::from(storage_root.clone())
    };

    // 4. Record deletion intent in deletion journal inside a transaction
    let now = chrono::Utc::now().timestamp_millis();
    let record_intent = (|| -> Result<(), rusqlite::Error> {
        let tx = conn.transaction()?;
        tx.execute(
            "INSERT OR REPLACE INTO project_deletion_journal (project_id, project_name, project_dir_path, storage_root, deletion_state, created_at)
             VALUES (?1, ?2, ?3, ?4, 'INTENT_RECORDED', ?5)",
            (&project_id, &name, &dir_path, &storage_root, now),
        )?;
        tx.execute("UPDATE projects SET status = 'DELETING' WHERE id = ?1", [&project_id])?;
        tx.commit()?;
        Ok(())
    })();

    if let Err(e) = record_intent {
        return Err(format!("Failed to record deletion intent in database journal: {}", e));
    }

    // 5. Safely delete physical vault directory (enforcing canonical registered root containment)
    // If filesystem deletion fails (e.g. file lock or permissions), DB records are preserved in journal!
    if let Err(e) = ProjectManager::safe_delete_vault(&dir_path, &authorized_root) {
        return Err(format!(
            "Filesystem deletion failed: {}. Database records have been preserved in deletion journal for safe recovery.",
            e
        ));
    }

    // 6. Update journal state to FILESYSTEM_DELETED
    let _ = conn.execute(
        "UPDATE project_deletion_journal SET deletion_state = 'FILESYSTEM_DELETED' WHERE project_id = ?1",
        [&project_id],
    );

    // 7. Delete database record and journal entry in a transaction (cascading to scenes, clips, and tasks)
    let db_delete_result = (|| -> Result<(), rusqlite::Error> {
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM projects WHERE id = ?1", [&project_id])?;
        tx.execute("DELETE FROM project_deletion_journal WHERE project_id = ?1", [&project_id])?;
        tx.commit()?;
        Ok(())
    })();

    if let Err(e) = db_delete_result {
        return Err(format!(
            "Critical partial state: Vault directory was deleted, but database cleanup failed: {}. Run recover_pending_deletions to purge journaled record.",
            e
        ));
    }

    // 8. Clear active project if matching
    {
        let mut active = state.active_project.lock().unwrap();
        if let Some(ref p) = *active {
            if p.id == project_id {
                *active = None;
            }
        }
    }
    let _ = set_last_active_project_id(&conn, None);

    Ok(())
}

#[tauri::command]
pub async fn recover_pending_deletions(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    recover_interrupted_deletions(&mut conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    get_app_settings(&conn).map_err(|e| format!("Failed to read settings: {}", e))
}

#[tauri::command]
pub async fn update_settings(settings: AppSettings, state: State<'_, AppState>) -> Result<(), String> {
    settings.validate().map_err(|e| format!("Settings validation error: {}", e))?;
    let conn = state.db.get().map_err(|e| e.to_string())?;
    save_app_settings(&conn, &settings).map_err(|e| format!("Failed to save settings: {}", e))
}

#[tauri::command]
pub async fn get_scenes(project_id: String, state: State<'_, AppState>) -> Result<Vec<SceneDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, project_id, sequence_number, title, dramatic_beat, estimated_duration_seconds, continuity_rules, created_at, updated_at
         FROM scenes WHERE project_id = ?1 ORDER BY sequence_number ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([&project_id], |row| {
        Ok(SceneDto {
            id: row.get(0)?,
            project_id: row.get(1)?,
            sequence_number: row.get(2)?,
            title: row.get(3)?,
            dramatic_beat: row.get(4)?,
            estimated_duration_seconds: row.get(5)?,
            continuity_rules: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut scenes = Vec::new();
    for s in rows {
        scenes.push(s.map_err(|e| e.to_string())?);
    }
    Ok(scenes)
}

#[tauri::command]
pub async fn get_clips(project_id: String, state: State<'_, AppState>) -> Result<Vec<ClipDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, scene_id, project_id, clip_number, target_duration_seconds, camera_framing, camera_angle, camera_movement, subject_action, lighting_setup, status, assigned_provider, thumbnail_path, proxy_path, output_video_path, created_at, updated_at
         FROM clips WHERE project_id = ?1 ORDER BY clip_number ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([&project_id], |row| {
        Ok(ClipDto {
            id: row.get(0)?,
            scene_id: row.get(1)?,
            project_id: row.get(2)?,
            clip_number: row.get(3)?,
            target_duration_seconds: row.get(4)?,
            camera_framing: row.get::<_, Option<String>>(5)?.unwrap_or_else(|| "MEDIUM".to_string()),
            camera_angle: row.get::<_, Option<String>>(6)?.unwrap_or_else(|| "EYE_LEVEL".to_string()),
            camera_movement: row.get::<_, Option<String>>(7)?.unwrap_or_else(|| "STATIC".to_string()),
            subject_action: row.get(8)?,
            lighting_setup: row.get(9)?,
            status: row.get::<_, Option<String>>(10)?.unwrap_or_else(|| "PLANNED".to_string()),
            assigned_provider: row.get::<_, Option<String>>(11)?.unwrap_or_else(|| "Google Veo".to_string()),
            thumbnail_path: row.get(12)?,
            proxy_path: row.get(13)?,
            output_video_path: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut clips = Vec::new();
    for c in rows {
        clips.push(c.map_err(|e| e.to_string())?);
    }
    Ok(clips)
}

#[tauri::command]
pub async fn seed_test_clips(project_id: String, count: i32, state: State<'_, AppState>) -> Result<Vec<ClipDto>, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let scenes = get_scenes(project_id.clone(), state.clone()).await?;
    let scene_id = if let Some(s) = scenes.first() {
        s.id.clone()
    } else {
        return Err("Cannot seed clips: no scene exists in this project".to_string());
    };

    let now = chrono::Utc::now().timestamp_millis();
    let providers = ["Google Veo", "Luma Dream Machine", "Runway Gen-3", "Kling AI", "Minimax Hailuo"];
    let framings = ["EXTREME_WIDE", "WIDE", "MEDIUM", "CLOSE_UP", "EXTREME_CLOSE_UP"];

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    for i in 1..=count {
        let clip_id = uuid::Uuid::new_v4().to_string();
        let provider = providers[(i as usize) % providers.len()];
        let framing = framings[(i as usize) % framings.len()];
        let action = format!("Cinematic narrative sequence beat {} with photorealistic lighting", i);

        tx.execute(
            "INSERT INTO clips (id, scene_id, project_id, clip_number, target_duration_seconds, camera_framing, camera_angle, camera_movement, subject_action, status, assigned_provider, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, 10.0, ?5, 'EYE_LEVEL', 'TRACKING', ?6, 'PLANNED', ?7, ?8, ?9)",
            (&clip_id, &scene_id, &project_id, i, framing, &action, provider, now, now),
        ).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;

    get_clips(project_id, state).await
}

#[tauri::command]
pub async fn check_database_integrity(state: State<'_, AppState>) -> Result<bool, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    run_integrity_check(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_telemetry(state: State<'_, AppState>) -> Result<TelemetryData, String> {
    Ok(state.telemetry.sample())
}
