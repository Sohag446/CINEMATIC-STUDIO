use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::Path;

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<DbPool, Box<dyn std::error::Error>> {
    let manager = SqliteConnectionManager::file(db_path)
        .with_init(|conn: &mut Connection| {
            // Enforce low-RAM and data-integrity SQLite pragmas on EVERY connection
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

    // Run migration if needed
    let conn = pool.get()?;
    
    // Check if _schema_migrations exists
    let has_migrations_table: bool = conn
        .query_row(
            "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='_schema_migrations'",
            [],
            |r| r.get(0),
        )
        .map(|count: i32| count > 0)
        .unwrap_or(false);

    let current_version: i32 = if has_migrations_table {
        conn.query_row(
            "SELECT COALESCE(MAX(version), 0) FROM _schema_migrations",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0)
    } else {
        0
    };

    if current_version < 1 {
        let migration_sql = include_str!("../../migrations/001_initial_schema.sql");
        conn.execute_batch(migration_sql)?;
    }

    // Verify integrity on startup
    let integrity_ok: String = conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))?;
    if integrity_ok != "ok" {
        return Err(format!("SQLite database integrity check failed: {}", integrity_ok).into());
    }

    Ok(pool)
}

pub fn run_integrity_check(conn: &Connection) -> Result<bool, rusqlite::Error> {
    let result: String = conn.query_row("PRAGMA integrity_check", [], |r| r.get(0))?;
    Ok(result == "ok")
}
