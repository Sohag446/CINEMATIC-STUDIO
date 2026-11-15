use crate::chrome_service::{
    ChromeDiscoveryService, DiscoveredChromeProfile, DockedChromeManager, NativeMessagingIpc,
    PairingChallengeDto, PairingService, PairingVerificationResult, ProfileManager,
    RegisterProfileDto, RegisteredProfile, UpdateProfileDto, VerifyPairingDto,
};
use crate::database::{run_integrity_check, AppSettings, DbPool, RecoveryReport};
use crate::media_service::{
    CreateMediaAssetDto, CreateRenderJobDto, CreateTimelineClipDto, FFmpegManager, FFmpegStatusDto,
    MediaAssetDto, MediaService, RenderJobDto, TimelineClipDto, TimelineTrackDto,
    UpdateTimelineClipDto,
};
use crate::project_manager::ProjectMetadata;
use crate::project_service::ProjectService;
use crate::telemetry::{TelemetryCollector, TelemetryData};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

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
pub async fn create_project(
    input: CreateProjectDto,
    state: State<'_, AppState>,
) -> Result<ProjectMetadata, String> {
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
pub async fn open_project(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<ProjectMetadata, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let project = ProjectService::open_project(&conn, &project_id)?;

    let mut active = state.active_project.lock().unwrap();
    *active = Some(project.clone());
    Ok(project)
}

#[tauri::command]
pub async fn get_active_project(
    state: State<'_, AppState>,
) -> Result<Option<ProjectMetadata>, String> {
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
pub async fn rename_project(
    project_id: String,
    new_name: String,
    state: State<'_, AppState>,
) -> Result<ProjectMetadata, String> {
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
pub async fn save_project(
    project: SaveProjectDto,
    state: State<'_, AppState>,
) -> Result<(), String> {
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
pub async fn delete_project(
    project_id: String,
    confirmation_name: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
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
pub async fn recover_pending_deletions(
    state: State<'_, AppState>,
) -> Result<RecoveryReport, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::recover_deletions(&mut conn)
}

#[tauri::command]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::get_settings(&conn)
}

#[tauri::command]
pub async fn update_settings(
    settings: AppSettings,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    ProjectService::update_settings(&conn, settings)
}

#[tauri::command]
pub async fn get_scenes(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<SceneDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, project_id, sequence_number, title, dramatic_beat, estimated_duration_seconds, continuity_rules, created_at, updated_at
         FROM scenes WHERE project_id = ?1 ORDER BY sequence_number ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&project_id], |row| {
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
        })
        .map_err(|e| e.to_string())?;

    let mut scenes = Vec::new();
    for s in rows {
        scenes.push(s.map_err(|e| e.to_string())?);
    }
    Ok(scenes)
}

#[tauri::command]
pub async fn get_clips(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<ClipDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, scene_id, project_id, clip_number, target_duration_seconds, camera_framing, camera_angle, camera_movement, subject_action, lighting_setup, status, assigned_provider, thumbnail_path, proxy_path, output_video_path, created_at, updated_at
         FROM clips WHERE project_id = ?1 ORDER BY clip_number ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(ClipDto {
                id: row.get(0)?,
                scene_id: row.get(1)?,
                project_id: row.get(2)?,
                clip_number: row.get(3)?,
                target_duration_seconds: row.get(4)?,
                camera_framing: row
                    .get::<_, Option<String>>(5)?
                    .unwrap_or_else(|| "MEDIUM".to_string()),
                camera_angle: row
                    .get::<_, Option<String>>(6)?
                    .unwrap_or_else(|| "EYE_LEVEL".to_string()),
                camera_movement: row
                    .get::<_, Option<String>>(7)?
                    .unwrap_or_else(|| "STATIC".to_string()),
                subject_action: row.get(8)?,
                lighting_setup: row.get(9)?,
                status: row
                    .get::<_, Option<String>>(10)?
                    .unwrap_or_else(|| "PLANNED".to_string()),
                assigned_provider: row
                    .get::<_, Option<String>>(11)?
                    .unwrap_or_else(|| "Google Veo".to_string()),
                thumbnail_path: row.get(12)?,
                proxy_path: row.get(13)?,
                output_video_path: row.get(14)?,
                created_at: row.get(15)?,
                updated_at: row.get(16)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut clips = Vec::new();
    for c in rows {
        clips.push(c.map_err(|e| e.to_string())?);
    }
    Ok(clips)
}

#[tauri::command]
pub async fn seed_test_clips(
    project_id: String,
    count: i32,
    state: State<'_, AppState>,
) -> Result<Vec<ClipDto>, String> {
    let scenes = get_scenes(project_id.clone(), state.clone()).await?;
    let scene_id = if let Some(s) = scenes.first() {
        s.id.clone()
    } else {
        return Err("Cannot seed clips: no scene exists in this project".to_string());
    };

    let now = chrono::Utc::now().timestamp_millis();
    let providers = [
        "Google Veo",
        "Luma Dream Machine",
        "Runway Gen-3",
        "Kling AI",
        "Minimax Hailuo",
    ];
    let framings = [
        "EXTREME_WIDE",
        "WIDE",
        "MEDIUM",
        "CLOSE_UP",
        "EXTREME_CLOSE_UP",
    ];

    {
        let mut conn = state.db.get().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        for i in 1..=count {
            let clip_id = uuid::Uuid::new_v4().to_string();
            let provider = providers[(i as usize) % providers.len()];
            let framing = framings[(i as usize) % framings.len()];
            let action = format!(
                "Cinematic narrative sequence beat {} with photorealistic lighting",
                i
            );

            tx.execute(
                "INSERT INTO clips (id, scene_id, project_id, clip_number, target_duration_seconds, camera_framing, camera_angle, camera_movement, subject_action, status, assigned_provider, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 10.0, ?5, 'EYE_LEVEL', 'TRACKING', ?6, 'PLANNED', ?7, ?8, ?9)",
                (&clip_id, &scene_id, &project_id, i, framing, &action, provider, now, now),
            ).map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
    }

    get_clips(project_id, state).await
}

#[tauri::command]
pub async fn check_database_integrity(state: State<'_, AppState>) -> Result<bool, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    run_integrity_check(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_telemetry(state: State<'_, AppState>) -> Result<TelemetryData, String> {
    let (project_id, project_name) = {
        let active = state.active_project.lock().unwrap();
        if let Some(ref p) = *active {
            (Some(p.id.clone()), Some(p.name.clone()))
        } else {
            (None, None)
        }
    };

    let active_tasks = if let Some(ref pid) = project_id {
        if let Ok(conn) = state.db.get() {
            conn.query_row(
                "SELECT count(*) FROM tasks WHERE project_id = ?1 AND state IN ('QUEUED', 'RUNNING')",
                [pid],
                |r| r.get::<_, i64>(0),
            )
            .unwrap_or(0) as usize
        } else {
            0
        }
    } else {
        0
    };

    Ok(state
        .telemetry
        .sample(project_id, project_name, active_tasks))
}

// ============================================================================
// PHASE 2: CHROME PROFILE MANAGEMENT & EXTENSION PAIRING COMMANDS
// ============================================================================

#[tauri::command]
pub async fn discover_chrome_profiles() -> Result<Vec<DiscoveredChromeProfile>, String> {
    ChromeDiscoveryService::discover_profiles(None)
}

#[tauri::command]
pub async fn get_registered_chrome_profiles(
    state: State<'_, AppState>,
) -> Result<Vec<RegisteredProfile>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    ProfileManager::list_registered(&conn)
}

#[tauri::command]
pub async fn register_chrome_profile(
    input: RegisterProfileDto,
    state: State<'_, AppState>,
) -> Result<RegisteredProfile, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    ProfileManager::register_profile(&mut conn, input)
}

#[tauri::command]
pub async fn update_chrome_profile(
    input: UpdateProfileDto,
    state: State<'_, AppState>,
) -> Result<RegisteredProfile, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    ProfileManager::update_profile(&mut conn, input)
}

#[tauri::command]
pub async fn unregister_chrome_profile(
    profile_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    ProfileManager::unregister_profile(&mut conn, &profile_id)
}

#[tauri::command]
pub async fn launch_chrome_profile(
    user_data_dir: String,
    profile_dir_key: String,
) -> Result<(), String> {
    ProfileManager::launch_profile(&user_data_dir, &profile_dir_key)
}

#[tauri::command]
pub async fn dock_chrome_to_window(
    window: tauri::WebviewWindow,
    url: String,
    user_data_dir: String,
    profile_dir_key: String,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<isize, String> {
    #[cfg(target_os = "windows")]
    {
        let hwnd = window.hwnd().map(|h| h.0 as isize).unwrap_or(0);
        DockedChromeManager::dock_chrome(
            hwnd,
            &url,
            &user_data_dir,
            &profile_dir_key,
            x,
            y,
            width,
            height,
        )
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (
            window,
            url,
            user_data_dir,
            profile_dir_key,
            x,
            y,
            width,
            height,
        );
        Err("Option B Docked Chrome is only supported on Windows".to_string())
    }
}

#[tauri::command]
pub async fn sync_docked_chrome_bounds(
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<(), String> {
    DockedChromeManager::sync_bounds(x, y, width, height)
}

#[tauri::command]
pub async fn set_docked_chrome_visible(visible: bool) -> Result<(), String> {
    DockedChromeManager::set_visible(visible)
}

#[tauri::command]
pub async fn close_docked_chrome() -> Result<(), String> {
    DockedChromeManager::close_docked_chrome();
    Ok(())
}

#[tauri::command]
pub async fn initiate_profile_pairing(
    profile_id: String,
    state: State<'_, AppState>,
) -> Result<PairingChallengeDto, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    PairingService::initiate_pairing(&mut conn, &profile_id)
}

#[tauri::command]
pub async fn verify_profile_pairing(
    input: VerifyPairingDto,
    state: State<'_, AppState>,
) -> Result<PairingVerificationResult, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    PairingService::verify_pairing(&mut conn, input)
}

#[tauri::command]
pub async fn revoke_profile_pairing(
    profile_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    PairingService::revoke_pairing(&mut conn, &profile_id)
}

#[tauri::command]
pub async fn install_native_host() -> Result<String, String> {
    let path = NativeMessagingIpc::install_host_manifest(None, None)?;
    Ok(path.to_string_lossy().to_string())
}

// ============================================================================
// PHASE 3: TASK QUEUE & EXECUTION ENGINE COMMANDS
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TaskDto {
    pub id: String,
    pub project_id: String,
    pub clip_id: Option<String>,
    pub profile_id: Option<String>,
    pub task_type: String,
    pub target_provider: String,
    pub state: String,
    pub priority: i32,
    pub progress_percentage: f64,
    pub error_message: Option<String>,
    pub human_action_reason: Option<String>,
    pub created_at: i64,
    pub completed_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTaskDto {
    pub project_id: String,
    pub clip_id: Option<String>,
    pub profile_id: Option<String>,
    pub task_type: String,
    pub target_provider: String,
    pub priority: Option<i32>,
    pub prompt: String,
}

#[tauri::command]
pub async fn get_project_tasks(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TaskDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, project_id, clip_id, profile_id, task_type, target_provider, state, priority, progress_percentage, error_message, human_action_reason, created_at, completed_at
         FROM tasks WHERE project_id = ?1 ORDER BY priority DESC, created_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([&project_id], |row| {
            Ok(TaskDto {
                id: row.get(0)?,
                project_id: row.get(1)?,
                clip_id: row.get(2)?,
                profile_id: row.get(3)?,
                task_type: row.get(4)?,
                target_provider: row.get(5)?,
                state: row.get(6)?,
                priority: row.get(7)?,
                progress_percentage: row.get(8)?,
                error_message: row.get(9)?,
                human_action_reason: row.get(10)?,
                created_at: row.get(11)?,
                completed_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tasks = Vec::new();
    for t in rows {
        tasks.push(t.map_err(|e| e.to_string())?);
    }
    Ok(tasks)
}

#[tauri::command]
pub async fn create_production_task(
    input: CreateTaskDto,
    state: State<'_, AppState>,
) -> Result<TaskDto, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    let now = chrono::Utc::now().timestamp_millis();
    let task_id = uuid::Uuid::new_v4().to_string();
    let priority = input.priority.unwrap_or(50);

    let payload = serde_json::json!({
        "prompt": input.prompt,
    });

    conn.execute(
        "INSERT INTO tasks (id, project_id, clip_id, profile_id, task_type, target_provider, state, priority, progress_percentage, payload_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'QUEUED', ?7, 0.0, ?8, ?9)",
        rusqlite::params![
            task_id,
            input.project_id,
            input.clip_id,
            input.profile_id,
            input.task_type,
            input.target_provider,
            priority,
            payload.to_string(),
            now
        ],
    ).map_err(|e| format!("Failed to create production task: {}", e))?;

    Ok(TaskDto {
        id: task_id,
        project_id: input.project_id,
        clip_id: input.clip_id,
        profile_id: input.profile_id,
        task_type: input.task_type,
        target_provider: input.target_provider,
        state: "QUEUED".to_string(),
        priority,
        progress_percentage: 0.0,
        error_message: None,
        human_action_reason: None,
        created_at: now,
        completed_at: None,
    })
}

#[tauri::command]
pub async fn cancel_production_task(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tasks SET state = 'CANCELLED' WHERE id = ?1",
        [&task_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn resume_human_action_task(
    task_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE tasks SET state = 'QUEUED', error_message = NULL, human_action_reason = NULL WHERE id = ?1",
        [&task_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// PHASE 4: MEDIA MANAGEMENT, MULTITRACK TIMELINE & FFMPEG RENDERING
// ============================================================================

#[tauri::command]
pub async fn list_media_assets(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<MediaAssetDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::list_media_assets(&conn, &project_id)
}

#[tauri::command]
pub async fn create_media_asset(
    input: CreateMediaAssetDto,
    state: State<'_, AppState>,
) -> Result<MediaAssetDto, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::create_media_asset(&mut conn, input)
}

#[tauri::command]
pub async fn delete_media_asset(
    asset_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::delete_media_asset(&mut conn, &asset_id)
}

#[tauri::command]
pub async fn list_timeline_tracks(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TimelineTrackDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::list_timeline_tracks(&conn, &project_id)
}

#[tauri::command]
pub async fn list_timeline_clips(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TimelineClipDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::list_timeline_clips(&conn, &project_id)
}

#[tauri::command]
pub async fn create_timeline_clip(
    input: CreateTimelineClipDto,
    state: State<'_, AppState>,
) -> Result<TimelineClipDto, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::create_timeline_clip(&mut conn, input)
}

#[tauri::command]
pub async fn update_timeline_clip(
    input: UpdateTimelineClipDto,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::update_timeline_clip(&mut conn, input)
}

#[tauri::command]
pub async fn delete_timeline_clip(
    clip_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::delete_timeline_clip(&mut conn, &clip_id)
}

#[tauri::command]
pub async fn list_render_jobs(
    project_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<RenderJobDto>, String> {
    let conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::list_render_jobs(&conn, &project_id)
}

#[tauri::command]
pub async fn create_render_job(
    input: CreateRenderJobDto,
    state: State<'_, AppState>,
) -> Result<RenderJobDto, String> {
    let mut conn = state.db.get().map_err(|e| e.to_string())?;
    MediaService::create_render_job(&mut conn, input)
}

#[tauri::command]
pub async fn detect_ffmpeg_status(
    app: tauri::AppHandle,
    custom_ffmpeg: Option<String>,
    custom_ffprobe: Option<String>,
) -> Result<FFmpegStatusDto, String> {
    Ok(FFmpegManager::detect_tools_with_app(
        Some(&app),
        custom_ffmpeg.as_deref(),
        custom_ffprobe.as_deref(),
    ))
}
