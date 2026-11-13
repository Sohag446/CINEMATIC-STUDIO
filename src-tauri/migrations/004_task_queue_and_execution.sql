-- ----------------------------------------------------------------------------
-- CINEMATIC STUDIO DATABASE MIGRATION 004: TASK QUEUE & EXECUTION ENGINE
-- ----------------------------------------------------------------------------
-- Forward-only migration adding profile assignment, retry policies, and persistent logs.

ALTER TABLE tasks ADD COLUMN profile_id TEXT;
ALTER TABLE tasks ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 2;
ALTER TABLE tasks ADD COLUMN human_action_reason TEXT;
ALTER TABLE tasks ADD COLUMN execution_duration_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_tasks_profile ON tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_state_priority ON tasks(state, priority DESC, created_at ASC);

-- Persistent execution logging table for auditing browser automation steps
CREATE TABLE IF NOT EXISTS task_execution_logs (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    phase TEXT NOT NULL,
    message TEXT NOT NULL,
    percentage REAL DEFAULT 0.0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_logs_task ON task_execution_logs(task_id, created_at ASC);

