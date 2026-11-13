-- CINEMATIC STUDIO Master Database Migration v2
-- Forward-only migration adding storage_root tracking and safe crash-resilient deletion journal

-- 1. ADD STORAGE_ROOT TO PROJECTS
-- In SQLite, ALTER TABLE ADD COLUMN adds the column without modifying existing rows
ALTER TABLE projects ADD COLUMN storage_root TEXT NOT NULL DEFAULT '';

-- 2. CREATE DELETION JOURNAL TABLE
-- States: 'INTENT_RECORDED', 'FILESYSTEM_DELETED', 'DATABASE_CLEANUP_PENDING'
CREATE TABLE IF NOT EXISTS project_deletion_journal (
    project_id TEXT PRIMARY KEY NOT NULL,
    project_name TEXT NOT NULL,
    project_dir_path TEXT NOT NULL,
    storage_root TEXT NOT NULL,
    deletion_state TEXT NOT NULL DEFAULT 'INTENT_RECORDED',
    error_details TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_deletion_journal_state ON project_deletion_journal(deletion_state);
