use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::project_manager::ProjectManager;

pub type DbPool = Pool<SqliteConnectionManager>;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct AppSettings {
    pub default_project_storage_path: String,
    pub max_concurrent_tasks: u32,
    pub sequential_processing_default: bool,
    pub log_level: String,
    pub theme: String,
    pub hardware_thread_cap: u32,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_project_storage_path: ProjectManager::default_authorized_root()
                .to_string_lossy()
                .to_string(),
            max_concurrent_tasks: 1,
            sequential_processing_default: true,
            log_level: "INFO".to_string(),
            theme: "cinematic".to_string(),
            hardware_thread_cap: 4,
        }
    }
}

impl AppSettings {
    pub fn validate(&self) -> Result<(), String> {
        if self.max_concurrent_tasks < 1 || self.max_concurrent_tasks > 16 {
            return Err("max_concurrent_tasks must be between 1 and 16".to_string());
        }
        if self.hardware_thread_cap < 1 || self.hardware_thread_cap > 64 {
            return Err("hardware_thread_cap must be between 1 and 64".to_string());
        }
        let valid_levels = ["DEBUG", "INFO", "WARN", "ERROR"];
        if !valid_levels.contains(&self.log_level.as_str()) {
            return Err("log_level must be DEBUG, INFO, WARN, or ERROR".to_string());
        }
        let valid_themes = ["dark", "cinematic"];
        if !valid_themes.contains(&self.theme.as_str()) {
            return Err("theme must be dark or cinematic".to_string());
        }
        if self.default_project_storage_path.trim().is_empty() {
            return Err("default_project_storage_path cannot be empty".to_string());
        }
        Ok(())
    }
}

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<DbPool, Box<dyn std::error::Error>> {
    let manager = SqliteConnectionManager::file(db_path)
        .with_init(|conn: &mut Connection| {
            // Enforce low-RAM and data-integrity SQLite pragmas on EVERY pooled connection
            conn.execute_batch(
                "PRAGMA journal_mode = WAL;
                 PRAGMA synchronous = NORMAL;
                 PRAGMA foreign_keys = ON;
                 PRAGMA cache_size = -8000;
                 PRAGMA temp_store = FILE;
                 PRAGMA mmap_size = 0;",
            )?;
            Ok(())
        });

    let pool = Pool::builder()
        .max_size(4) // 1 write + 3 read connections max to bound RAM
        .build(manager)?;

    // Run atomic migrations and startup recovery
    let mut conn = pool.get()?;
    apply_migrations(&mut conn)?;
    let _ = recover_interrupted_deletions(&mut conn);

    // Verify integrity on startup
    let integrity_ok: String = conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))?;
    if integrity_ok != "ok" {
        return Err(format!("SQLite database integrity check failed: {}", integrity_ok).into());
    }

    Ok(pool)
}

/// Applies all pending database migrations inside explicit atomic transactions
pub fn apply_migrations(conn: &mut Connection) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Ensure migrations table exists
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _schema_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            applied_at INTEGER NOT NULL
        );"
    )?;

    // 2. Query current migration version - propagate any unexpected database error
    let current_version: i32 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM _schema_migrations",
        [],
        |r| r.get(0),
    )?;

    // 3. Migration v1: Atomic execution
    if current_version < 1 {
        let tx = conn.transaction()?;
        let migration_sql = include_str!("../../migrations/001_initial_schema.sql");
        tx.execute_batch(migration_sql)?;

        let now = chrono::Utc::now().timestamp_millis();
        tx.execute(
            "INSERT INTO _schema_migrations (version, applied_at) VALUES (?1, ?2)",
            (1, now),
        )?;
        tx.commit()?;
    }

    Ok(())
}

/// Recovers any interrupted project deletions recorded in the deletion journal
pub fn recover_interrupted_deletions(conn: &mut Connection) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    // Check if table exists
    let table_exists: bool = conn.query_row(
        "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='project_deletion_journal'",
        [],
        |r| r.get::<_, i64>(0),
    ).map(|c| c > 0).unwrap_or(false);

    if !table_exists {
        return Ok(Vec::new());
    }

    let mut stmt = conn.prepare(
        "SELECT project_id, project_name, project_dir_path, storage_root, deletion_state FROM project_deletion_journal"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
        ))
    })?;

    let mut pending = Vec::new();
    for r in rows {
        pending.push(r?);
    }
    drop(stmt);

    let mut recovered = Vec::new();
    for (project_id, name, dir_path, storage_root, _state) in pending {
        // Idempotent filesystem removal
        let _ = ProjectManager::safe_delete_vault(&dir_path, &storage_root);

        // Idempotent database deletion inside a transaction
        let tx = conn.transaction()?;
        tx.execute("DELETE FROM projects WHERE id = ?1", [&project_id])?;
        tx.execute("DELETE FROM project_deletion_journal WHERE project_id = ?1", [&project_id])?;
        tx.commit()?;

        recovered.push(format!("{}: {}", project_id, name));
    }

    Ok(recovered)
}

/// Retrieves typed application settings from SQLite app_settings table
pub fn get_app_settings(conn: &Connection) -> Result<AppSettings, rusqlite::Error> {
    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'app_settings'",
        [],
        |r| r.get(0),
    );

    match result {
        Ok(json_str) => {
            serde_json::from_str(&json_str)
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(0, rusqlite::types::Type::Text, Box::new(e)))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(AppSettings::default()),
        Err(e) => Err(e),
    }
}

/// Persists validated application settings into SQLite app_settings table
pub fn save_app_settings(conn: &Connection, settings: &AppSettings) -> Result<(), rusqlite::Error> {
    let json_str = serde_json::to_string(settings)
        .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

    conn.execute(
        "INSERT INTO app_settings (key, value) VALUES ('app_settings', ?1)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [&json_str],
    )?;

    Ok(())
}

/// Retrieves the last active project ID from app_settings
pub fn get_last_active_project_id(conn: &Connection) -> Result<Option<String>, rusqlite::Error> {
    let result: Result<String, _> = conn.query_row(
        "SELECT value FROM app_settings WHERE key = 'last_active_project_id'",
        [],
        |r| r.get(0),
    );

    match result {
        Ok(id) if !id.trim().is_empty() => Ok(Some(id)),
        Ok(_) | Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Persists the active project ID in app_settings, or clears it if None
pub fn set_last_active_project_id(conn: &Connection, project_id: Option<&str>) -> Result<(), rusqlite::Error> {
    match project_id {
        Some(id) => {
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES ('last_active_project_id', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                [id],
            )?;
        }
        None => {
            conn.execute(
                "DELETE FROM app_settings WHERE key = 'last_active_project_id'",
                [],
            )?;
        }
    }
    Ok(())
}

pub fn run_integrity_check(conn: &Connection) -> Result<bool, rusqlite::Error> {
    let result: String = conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))?;
    Ok(result == "ok")
}
