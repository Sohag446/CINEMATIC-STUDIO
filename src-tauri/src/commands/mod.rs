use tauri::State;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::path::PathBuf;
use crate::database::{DbPool, run_integrity_check};
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

    // 1. Scaffold filesystem vault
    let vault_path = ProjectManager::create_project_vault(&base_dir, &slug)
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
            "INSERT INTO projects (id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            (
                &project.id,
                &project.name,
                &project.slug,
                &project.synopsis,
                &project.target_aspect_ratio,
                project.target_fps,
                project.target_duration_seconds,
                &project.project_dir_path,
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

    // Set active project in state
    let mut active = state.active_project.lock().unwrap();
    *active = Some(project.clone());

    Ok(project)
}

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectMetadata>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, status, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

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
            status: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
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
    let mut stmt = conn.prepare("SELECT id, name, slug, synopsis, target_aspect_ratio, target_fps, target_duration_seconds, project_dir_path, status, created_at, updated_at FROM projects WHERE id = ?1")
        .map_err(|e| e.to_string())?;

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
            status: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    }).map_err(|e| format!("Project not found: {}", e))?;

    // Auto-heal vault directories if missing
    let _ = ProjectManager::heal_vault_directories(&project.project_dir_path);

    let mut active = state.active_project.lock().unwrap();
    *active = Some(project.clone());

    Ok(project)
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
pub async fn save_project(project: ProjectMetadata, state: State<'_, AppState>) -> Result<(), String> {
    // 1. Save manifest on disk atomically first
    ProjectManager::save_metadata_atomic(&project.project_dir_path, &project)
        .map_err(|e| format!("Failed to save manifest file to disk: {}", e))?;

    // 2. Persist in database within a transaction
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();

    let tx = conn.transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE projects SET name = ?1, synopsis = ?2, target_aspect_ratio = ?3, target_fps = ?4, updated_at = ?5 WHERE id = ?6",
        (&project.name, &project.synopsis, &project.target_aspect_ratio, project.target_fps, now, &project.id),
    ).map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn close_project(state: State<'_, AppState>) -> Result<(), String> {
    let mut active = state.active_project.lock().unwrap();
    *active = None;
    Ok(())
}

#[tauri::command]
pub async fn delete_project(project_id: String, confirmation_name: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    
    // 1. Retrieve project record
    let (name, dir_path): (String, String) = conn.query_row(
        "SELECT name, project_dir_path FROM projects WHERE id = ?1",
        [&project_id],
        |r| Ok((r.get(0)?, r.get(1)?)),
    ).map_err(|_| "Project not found in database".to_string())?;

    // 2. Verify exact confirmation name match
    if confirmation_name.trim() != name.trim() {
        return Err("Confirmation name does not match project name. Deletion aborted.".to_string());
    }

    // 3. Resolve authorized storage root
    let authorized_root = ProjectManager::default_authorized_root();

    // 4. Safely delete physical vault directory FIRST (enforcing canonical root containment)
    // If filesystem deletion fails (e.g. file lock or permissions), DB records are preserved!
    ProjectManager::safe_delete_vault(&dir_path, &authorized_root)
        .map_err(|e| format!("Filesystem deletion failed: {}. Database records have been preserved.", e))?;

    // 5. Delete database record in a transaction (cascading to scenes, clips, and tasks)
    let db_delete_result = (|| -> Result<(), rusqlite::Error> {
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM projects WHERE id = ?1", [&project_id])?;
        tx.commit()?;
        Ok(())
    })();

    if let Err(e) = db_delete_result {
        return Err(format!(
            "Critical partial state: Vault directory was deleted, but database cleanup failed: {}. Run database integrity check to purge orphaned records.",
            e
        ));
    }

    // 6. Clear active project if matching
    {
        let mut active = state.active_project.lock().unwrap();
        if let Some(ref p) = *active {
            if p.id == project_id {
                *active = None;
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_scenes(project_id: String, state: State<'_, AppState>) -> Result<Vec<SceneDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, project_id, sequence_number, title, dramatic_beat, estimated_duration_seconds, continuity_rules, created_at, updated_at FROM scenes WHERE project_id = ?1 ORDER BY sequence_number ASC")
        .map_err(|e| e.to_string())?;

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
    let mut stmt = conn.prepare("SELECT id, scene_id, project_id, clip_number, target_duration_seconds, camera_framing, camera_angle, camera_movement, subject_action, lighting_setup, status, assigned_provider, thumbnail_path, proxy_path, output_video_path, created_at, updated_at FROM clips WHERE project_id = ?1 ORDER BY clip_number ASC")
        .map_err(|e| e.to_string())?;

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
