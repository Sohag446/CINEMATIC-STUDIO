// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod project_manager;
mod telemetry;
mod commands;

use std::fs;
use std::sync::Mutex;
use commands::AppState;
use telemetry::TelemetryCollector;

fn main() {
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
            commands::rename_project,
            commands::save_project,
            commands::close_project,
            commands::delete_project,
            commands::get_scenes,
            commands::get_clips,
            commands::seed_test_clips,
            commands::check_database_integrity,
            commands::get_telemetry,
        ])
        .run(tauri::generate_context!())
        .expect("Error while running CINEMATIC STUDIO application");
}

fn dirs_fallback() -> Option<std::path::PathBuf> {
    std::env::var_os("LOCALAPPDATA").map(std::path::PathBuf::from)
}
