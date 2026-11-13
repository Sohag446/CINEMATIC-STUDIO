# DATABASE SCHEMA & PERSISTENCE SPECIFICATION
## CINEMATIC STUDIO: Relational SQLite Data Architecture

---

## 1. Relational Entity-Relationship Diagram

```
+--------------------+          1:N          +-------------------------+
|      projects      +---------------------->+         scenes          |
+---------+----------+                       +------------+------------+
          |                                               |
          | 1:N                                           | 1:N
          v                                               v
+---------+----------+          1:N          +------------+------------+
|     characters     +---------------------->+          clips          |
+---------+----------+                       +---+--------+--------+---+
          |                                      |        |        |
          | 1:N                                  |        | 1:N    | 1:N
          v                                      |        v        v
+---------+----------+                           |   +----+----+ +-+-------+
|character_references|                           |   | prompts | | tasks   |
+--------------------+                           |   +---------+ +---------+
                                                 |
                                                 | 1:N
                                                 v
                                             +---+----------+
                                             | media_assets |
                                             +--------------+
```

---

## 2. Complete SQLite Data Definition Language (DDL)

```sql
-- ============================================================================
-- CINEMATIC STUDIO: Master SQLite DDL
-- Target Engine: SQLite 3.38+ with WAL and Foreign Key support enabled
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA encoding = "UTF-8";
PRAGMA cache_size = -8000;       -- Strict 8,000 KB (8.0 MB) memory ceiling
PRAGMA temp_store = FILE;        -- Spill temp tables and sorting to disk (protects host RAM)
PRAGMA mmap_size = 0;           -- Avoid unmanaged OS memory-mapping bloat

-- ----------------------------------------------------------------------------
-- 1. PROJECTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    name TEXT NOT NULL,                                 -- User-defined project title
    slug TEXT NOT NULL UNIQUE,                          -- Sanitized directory slug
    synopsis TEXT,                                      -- High-level narrative summary
    target_aspect_ratio TEXT NOT NULL DEFAULT '16:9',   -- '16:9', '9:16', '2.39:1', '1:1'
    target_fps REAL NOT NULL DEFAULT 24.0,              -- 24.0, 25.0, 30.0, 60.0
    target_duration_seconds INTEGER DEFAULT 0,          -- Target runtime in seconds
    project_dir_path TEXT NOT NULL,                     -- Absolute path to project directory
    status TEXT NOT NULL DEFAULT 'PLANNING',            -- 'PLANNING', 'IN_PRODUCTION', 'ASSEMBLY', 'COMPLETED', 'ARCHIVED'
    created_at INTEGER NOT NULL,                        -- Unix epoch millisecond timestamp
    updated_at INTEGER NOT NULL                         -- Unix epoch millisecond timestamp
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- ----------------------------------------------------------------------------
-- 2. CHROME PROFILES REGISTRY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chrome_profiles (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4 assigned during pairing
    profile_name TEXT NOT NULL,                         -- Human label e.g., 'ChatGPT Plus Account'
    chrome_profile_dir TEXT NOT NULL,                   -- e.g., 'Profile 1' or 'Default'
    pairing_token TEXT NOT NULL UNIQUE,                 -- 256-bit entropy token for WebSocket handshake
    is_active INTEGER NOT NULL DEFAULT 0,               -- 1 if connected, 0 if offline
    last_heartbeat_at INTEGER,                          -- Unix epoch millisecond timestamp
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_active ON chrome_profiles(is_active);

-- ----------------------------------------------------------------------------
-- 3. PROFILE PROVIDER BINDINGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_provider_bindings (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    profile_id TEXT NOT NULL,                           -- FK -> chrome_profiles.id
    provider_id TEXT NOT NULL,                         -- 'chatgpt', 'claude', 'gemini', 'veo', 'flow', etc.
    is_enabled INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(profile_id) REFERENCES chrome_profiles(id) ON DELETE CASCADE,
    UNIQUE(profile_id, provider_id)
);

-- ----------------------------------------------------------------------------
-- 4. CHARACTERS & CHARACTER VAULT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    project_id TEXT NOT NULL,                           -- FK -> projects.id
    name TEXT NOT NULL,                                 -- Canonical character name
    role TEXT NOT NULL DEFAULT 'SUPPORTING',            -- 'PROTAGONIST', 'ANTAGONIST', 'SUPPORTING', 'EXTRA'
    age_appearance TEXT,                                -- e.g., 'Late 30s'
    physical_description TEXT NOT NULL,                 -- Detailed anatomical & facial attributes
    wardrobe_summary TEXT,                              -- Standard costume/outfit details
    voice_profile TEXT,                                 -- Audio/tone characteristics
    is_locked INTEGER NOT NULL DEFAULT 0,               -- If locked, prompt engine does not rewrite
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id);

CREATE TABLE IF NOT EXISTS character_references (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    character_id TEXT NOT NULL,                         -- FK -> characters.id
    reference_type TEXT NOT NULL,                       -- 'FACE_FRONT', 'FACE_PROFILE', 'BODY_FULL', 'WARDROBE', 'EXPRESSION'
    relative_file_path TEXT NOT NULL,                   -- Path relative to project directory
    seed_value TEXT,                                    -- Seed string/hash if generated
    is_primary INTEGER NOT NULL DEFAULT 0,              -- Primary reference for generation injections
    created_at INTEGER NOT NULL,
    FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_char_refs_character ON character_references(character_id);

-- ----------------------------------------------------------------------------
-- 5. ENVIRONMENTS & LOCATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    project_id TEXT NOT NULL,                           -- FK -> projects.id
    name TEXT NOT NULL,                                 -- e.g., 'Cyberpunk Alleyway - Sector 4'
    environment_type TEXT NOT NULL DEFAULT 'EXTERIOR',  -- 'INTERIOR', 'EXTERIOR', 'HYBRID', 'ABSTRACT'
    visual_description TEXT NOT NULL,                   -- Architecture, textures, props, spatial layout
    default_lighting TEXT,                              -- e.g., 'Moody neon backlighting, rain wet asphalt'
    weather_atmosphere TEXT,                            -- e.g., 'Dense fog, light drizzle'
    is_locked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_environments_project ON environments(project_id);

CREATE TABLE IF NOT EXISTS environment_references (
    id TEXT PRIMARY KEY NOT NULL,
    environment_id TEXT NOT NULL,
    relative_file_path TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY(environment_id) REFERENCES environments(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 6. SCENES HIERARCHY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scenes (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    project_id TEXT NOT NULL,                           -- FK -> projects.id
    environment_id TEXT,                                -- FK -> environments.id (optional)
    scene_number INTEGER NOT NULL,                      -- Sequential order (1, 2, 3...)
    title TEXT NOT NULL,                                -- e.g., 'The Confrontation in the Rain'
    dramatic_beat TEXT,                                 -- Narrative objective or emotional turning point
    estimated_duration_seconds INTEGER DEFAULT 0,
    continuity_rules TEXT,                              -- Specific scene-level constraints
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(environment_id) REFERENCES environments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_scenes_project_order ON scenes(project_id, scene_number);

-- ----------------------------------------------------------------------------
-- 7. CLIPS & SHOTS SPECIFICATION
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clips (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    scene_id TEXT NOT NULL,                             -- FK -> scenes.id
    project_id TEXT NOT NULL,                           -- FK -> projects.id
    clip_number INTEGER NOT NULL,                       -- Sequential shot index within scene
    timeline_in_seconds REAL DEFAULT 0.0,               -- Calculated global timeline start
    target_duration_seconds REAL NOT NULL DEFAULT 10.0, -- Intended clip length
    
    -- Visual & Cinematographic Attributes
    camera_framing TEXT DEFAULT 'MEDIUM',               -- 'WIDE', 'MEDIUM', 'CLOSE_UP', 'EXTREME_CLOSE_UP', 'OVER_THE_SHOULDER'
    camera_angle TEXT DEFAULT 'EYE_LEVEL',              -- 'LOW_ANGLE', 'HIGH_ANGLE', 'DUTCH', 'BIRDS_EYE'
    camera_movement TEXT DEFAULT 'STATIC',              -- 'PAN_LEFT', 'PAN_RIGHT', 'DOLLY_IN', 'DOLLY_OUT', 'ORBIT', 'TRACKING'
    subject_action TEXT NOT NULL,                       -- Micro-action taking place in the clip
    lighting_setup TEXT,                                -- Shot-specific lighting notes
    
    -- Continuity Bindings
    prev_clip_id TEXT,                                  -- FK -> clips.id (self reference)
    continuity_start_frame_path TEXT,                   -- Relative path to start frame reference
    continuity_end_frame_path TEXT,                     -- Relative path to extracted end frame
    
    -- Execution State
    assigned_provider TEXT NOT NULL,                    -- 'veo', 'flow', 'runway', etc.
    assigned_profile_id TEXT,                           -- FK -> chrome_profiles.id
    status TEXT NOT NULL DEFAULT 'PLANNED',             -- 'PLANNED', 'PROMPT_READY', 'QUEUED', 'GENERATING', 'COMPLETED', 'FAILED', 'REJECTED'
    
    -- Output Bindings
    master_asset_id TEXT,                               -- FK -> media_assets.id (when completed)
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY(scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(assigned_profile_id) REFERENCES chrome_profiles(id) ON DELETE SET NULL,
    FOREIGN KEY(prev_clip_id) REFERENCES clips(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_clips_scene_order ON clips(scene_id, clip_number);
CREATE INDEX IF NOT EXISTS idx_clips_project_status ON clips(project_id, status);

-- ----------------------------------------------------------------------------
-- 8. PROMPTS & REVISION HISTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    clip_id TEXT NOT NULL,                              -- FK -> clips.id
    version INTEGER NOT NULL DEFAULT 1,                 -- Incremental version number
    target_provider TEXT NOT NULL,                      -- Target AI provider name
    compiled_positive_prompt TEXT NOT NULL,             -- Final expanded prompt sent to provider
    compiled_negative_prompt TEXT,                      -- Unwanted attributes
    parameters_json TEXT,                               -- JSON dictionary of provider settings (aspect, seed, motion)
    is_approved INTEGER NOT NULL DEFAULT 0,             -- Operator approval flag
    created_at INTEGER NOT NULL,
    FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prompts_clip_version ON prompts(clip_id, version DESC);

-- ----------------------------------------------------------------------------
-- 9. TASK QUEUE & EXECUTION STATE MACHINE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    project_id TEXT NOT NULL,                           -- FK -> projects.id
    clip_id TEXT,                                       -- FK -> clips.id (nullable for story tasks)
    task_type TEXT NOT NULL,                            -- 'STORY_DECOMPOSE', 'PROMPT_COMPILE', 'VIDEO_GEN', 'CLIP_DOWNLOAD', 'PROXY_RENDER', 'FFMPEG_ASSEMBLE'
    target_provider TEXT NOT NULL,                      -- e.g. 'veo', 'chatgpt'
    target_profile_id TEXT,                             -- FK -> chrome_profiles.id
    state TEXT NOT NULL DEFAULT 'CREATED',              -- FSM state string
    priority INTEGER NOT NULL DEFAULT 50,               -- Higher integer = higher priority
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    progress_percentage REAL DEFAULT 0.0,
    error_message TEXT,
    payload_json TEXT NOT NULL,                         -- Inputs needed to execute task
    result_json TEXT,                                   -- Outputs returned upon completion
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE SET NULL,
    FOREIGN KEY(target_profile_id) REFERENCES chrome_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_queue ON tasks(state, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id, state);

-- ----------------------------------------------------------------------------
-- 10. MEDIA ASSETS & FILE REGISTRY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    project_id TEXT NOT NULL,                           -- FK -> projects.id
    clip_id TEXT,                                       -- FK -> clips.id
    asset_type TEXT NOT NULL,                           -- 'MASTER_VIDEO', 'PROXY_VIDEO', 'THUMBNAIL', 'END_FRAME', 'AUDIO_STEM', 'EXPORT_FINAL'
    relative_path TEXT NOT NULL,                        -- Relative path on filesystem
    file_size_bytes INTEGER NOT NULL,
    duration_seconds REAL,
    width INTEGER,
    height INTEGER,
    video_codec TEXT,
    audio_codec TEXT,
    sha256_hash TEXT NOT NULL,                          -- Integrity verification hash
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_project_type ON media_assets(project_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_media_hash ON media_assets(sha256_hash);

-- ----------------------------------------------------------------------------
-- 11. AUDIT CHECKPOINTS & RECOVERY SNAPSHOTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_checkpoints (
    id TEXT PRIMARY KEY NOT NULL,                       -- UUID v4
    project_id TEXT NOT NULL,
    checkpoint_tag TEXT NOT NULL,                       -- e.g., 'AUTO_CHECKPOINT_AFTER_SCENE_4'
    relative_db_snapshot_path TEXT NOT NULL,            -- Path to SQLite backup file
    created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

---

## 3. Migration & Versioning Strategy
- Database schema changes are managed via embedded SQL migration files (`migrations/001_initial_schema.sql`, `002_...`).
- A lightweight table `_schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER)` tracks migration history.
- Every migration executes inside an atomic SQLite transaction. If any migration step fails, the entire transaction rolls back automatically before the desktop UI mounts.

