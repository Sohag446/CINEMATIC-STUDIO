pub mod chrome_service;
pub mod commands;
pub mod database;
pub mod media_service;
pub mod project_manager;
pub mod project_service;
pub mod telemetry;

#[cfg(test)]
pub mod tests;

use commands::AppState;
use std::fs;
use std::sync::Mutex;
use telemetry::TelemetryCollector;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    // Ensure AppData directory exists
    let app_data_dir = dirs_fallback().unwrap_or_else(|| std::path::PathBuf::from("."));
    let db_dir = app_data_dir.join("CinematicStudio");
    fs::create_dir_all(&db_dir).expect("Failed to create application data directory");

    let db_path = db_dir.join("cinematic_studio.db");
    let pool = database::init_db(&db_path).expect("Failed to initialize SQLite database pool");

    let telemetry = TelemetryCollector::new();

    let state = AppState {
        db: pool,
        telemetry,
        active_project: Mutex::new(None),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::create_project,
            commands::list_projects,
            commands::open_project,
            commands::get_active_project,
            commands::rename_project,
            commands::save_project,
            commands::close_project,
            commands::delete_project,
            commands::get_scenes,
            commands::get_clips,
            commands::seed_test_clips,
            commands::check_database_integrity,
            commands::get_telemetry,
            commands::get_settings,
            commands::update_settings,
            commands::recover_pending_deletions,
            commands::discover_chrome_profiles,
            commands::get_registered_chrome_profiles,
            commands::register_chrome_profile,
            commands::update_chrome_profile,
            commands::unregister_chrome_profile,
            commands::launch_chrome_profile,
            commands::dock_chrome_to_window,
            commands::sync_docked_chrome_bounds,
            commands::set_docked_chrome_visible,
            commands::close_docked_chrome,
            commands::initiate_profile_pairing,
            commands::verify_profile_pairing,
            commands::revoke_profile_pairing,
            commands::install_native_host,
            commands::get_project_tasks,
            commands::create_production_task,
            commands::cancel_production_task,
            commands::resume_human_action_task,
            commands::list_media_assets,
            commands::create_media_asset,
            commands::delete_media_asset,
            commands::list_timeline_tracks,
            commands::list_timeline_clips,
            commands::create_timeline_clip,
            commands::update_timeline_clip,
            commands::delete_timeline_clip,
            commands::list_render_jobs,
            commands::create_render_job,
            commands::detect_ffmpeg_status,
            commands::probe_media_file,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running CINEMATIC STUDIO application");
}

fn dirs_fallback() -> Option<std::path::PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(std::path::PathBuf::from)
}
