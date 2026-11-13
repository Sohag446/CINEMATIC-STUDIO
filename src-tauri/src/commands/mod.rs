use tauri::State;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use crate::database::{DbPool, run_integrity_check, AppSettings, RecoveryReport};
use crate::project_manager::ProjectMetadata;
use crate::telemetry::{TelemetryCollector, TelemetryData};
use crate::project_service::ProjectService;

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
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let project = ProjectService::create_project(&mut conn, input)?;

    let mut active = state.active_project.lock().unwrap();
    *active = Some(project.clone());
    Ok(project)
}

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectMetadata>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::list_projects(&conn)
}

#[tauri::command]
pub async fn open_project(project_id: String, state: State<'_, AppState>) -> Result<ProjectMetadata, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let project = ProjectService::open_project(&conn, &project_id)?;

    let mut active = state.active_project.lock().unwrap();
    *active = Some(project.clone());
    Ok(project)
}

#[tauri::command]
pub async fn get_active_project(state: State<'_, AppState>) -> Result<Option<ProjectMetadata>, String> {
    let in_memory = {
        let active = state.active_project.lock().unwrap();
        active.clone()
    };

    let conn = state.db.get().map_err(|e| e.to_string())?;
    let project_opt = ProjectService::get_active_project(&conn, in_memory)?;

    if let Some(ref p) = project_opt {
        let mut active = state.active_project.lock().unwrap();
        *active = Some(p.clone());
    }

    Ok(project_opt)
}

#[tauri::command]
pub async fn rename_project(project_id: String, new_name: String, state: State<'_, AppState>) -> Result<ProjectMetadata, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let updated = ProjectService::rename_project(&mut conn, &project_id, &new_name)?;

    let mut active = state.active_project.lock().unwrap();
    if let Some(ref p) = *active {
        if p.id == updated.id {
            *active = Some(updated.clone());
        }
    }
    Ok(updated)
}

#[tauri::command]
pub async fn save_project(project: SaveProjectDto, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let updated = ProjectService::save_project(&mut conn, project)?;

    let mut active = state.active_project.lock().unwrap();
    if let Some(ref p) = *active {
        if p.id == updated.id {
            *active = Some(updated);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn close_project(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    crate::database::set_last_active_project_id(&conn, None).map_err(|e| e.to_string())?;

    let mut active = state.active_project.lock().unwrap();
    *active = None;
    Ok(())
}

#[tauri::command]
pub async fn delete_project(project_id: String, confirmation_name: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::delete_project(&mut conn, &project_id, &confirmation_name)?;

    let mut active = state.active_project.lock().unwrap();
    if let Some(ref p) = *active {
        if p.id == project_id {
            *active = None;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn recover_pending_deletions(state: State<'_, AppState>) -> Result<RecoveryReport, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::recover_deletions(&mut conn)
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::get_settings(&conn)
}

#[tauri::command]
pub async fn update_settings(settings: AppSettings, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::update_settings(&conn, settings)
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
