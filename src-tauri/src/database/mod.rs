use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::path::Path;

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn init_db<P: AsRef<Path>>(db_path: P) -> Result<DbPool, Box<dyn std::error::Error>> {
    let manager = SqliteConnectionManager::file(db_path)
        .with_init(|conn: &mut Connection| {
            // Enforce low-RAM SQLite pragmas
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

    // Run migrations
    let conn = pool.get()?;
    let migration_sql = include_str!("../../migrations/001_initial_schema.sql");
    conn.execute_batch(migration_sql)?;

    Ok(pool)
}
