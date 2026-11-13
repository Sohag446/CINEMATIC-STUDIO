-- CINEMATIC STUDIO Master Database Schema v1 (Immutable Historical Migration)
-- Low-RAM Profile: WAL mode, temp_store = FILE, cache_size = -8000 (8 MB cap)

-- 1. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    synopsis TEXT,
    target_aspect_ratio TEXT NOT NULL DEFAULT '16:9',
    target_fps REAL NOT NULL DEFAULT 24.0,
    target_duration_seconds INTEGER DEFAULT 600,
    project_dir_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PLANNING',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 2. SCENES TABLE
CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    dramatic_beat TEXT,
    estimated_duration_seconds INTEGER DEFAULT 60,
    continuity_rules TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenes_project_order ON scenes(project_id, sequence_number);

-- 3. CLIPS TABLE
CREATE TABLE IF NOT EXISTS clips (
    id TEXT PRIMARY KEY NOT NULL,
    scene_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    clip_number INTEGER NOT NULL,
    target_duration_seconds REAL NOT NULL DEFAULT 10.0,
    camera_framing TEXT DEFAULT 'MEDIUM',
    camera_angle TEXT DEFAULT 'EYE_LEVEL',
    camera_movement TEXT DEFAULT 'STATIC',
    subject_action TEXT NOT NULL,
    lighting_setup TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED',
    assigned_provider TEXT NOT NULL DEFAULT 'Google Veo',
    thumbnail_path TEXT,
    proxy_path TEXT,
    output_video_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clips_scene_order ON clips(scene_id, clip_number);
CREATE INDEX IF NOT EXISTS idx_clips_project_status ON clips(project_id, status);

-- 4. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    project_id TEXT NOT NULL,
    clip_id TEXT,
    task_type TEXT NOT NULL,
    target_provider TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'CREATED',
    priority INTEGER NOT NULL DEFAULT 50,
    progress_percentage REAL DEFAULT 0.0,
    error_message TEXT,
    payload_json TEXT NOT NULL,
    result_json TEXT,
    created_at INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_queue ON tasks(state, priority DESC, created_at ASC);

-- 5. APP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);
