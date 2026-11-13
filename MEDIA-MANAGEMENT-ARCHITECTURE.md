# MEDIA MANAGEMENT ARCHITECTURE
## CINEMATIC STUDIO — PHASE 4 ARCHITECTURE BLUEPRINT

**Status:** APPROVED & IMPLEMENTED  
**Scope:** Local Media Storage, Asset Vaults, Relational Invariants & Non-Destructive Storage

---

## 1. OBJECTIVE & ARCHITECTURAL INVARIANTS

The Media Management Subsystem serves as the foundational data layer for all ingested and generated video clips, reference images, dialogue voiceovers, music tracks, and sound effects within **CINEMATIC STUDIO**.

### Non-Negotiable Core Invariants:
1. **Physical File Immutability**: Ingested and AI-generated source files written to the project asset vault are immutable. No timeline operation (split, trim, reorder, delete) may mutate, rename, truncate, or delete original source media files.
2. **Decoupled Relational Lifecycles**: A `timeline_clip` is a lightweight reference to a `media_asset`. Deleting a clip from a timeline track removes only the timeline placement record. The underlying `media_asset` remains safely stored in the database and on disk.
3. **Restricted Deletion Constraint**: A `media_asset` cannot be deleted from the project vault if one or more `timeline_clips` currently reference it (`FOREIGN KEY (media_asset_id) REFERENCES media_assets(id) ON DELETE RESTRICT`).
4. **Deterministic Storage Topography**: Every project maintains an isolated directory structure rooted at `C:\CinematicStudio\Projects\<ProjectSlug>\`. Raw media is never scattered outside the designated project boundaries.

---

## 2. PHYSICAL STORAGE LAYOUT

```
C:\CinematicStudio\Projects\<ProjectSlug>\
├── project.json                    -- Project manifest & version descriptor
├── cinematic.db                    -- SQLite database (WAL mode enabled)
├── cinematic.db-wal
├── cinematic.db-shm
├── assets\                         -- Immutable Source Media Vault
│   ├── video\                      -- Generated video clips (Veo, Runway, Luma)
│   │   ├── scene1_shot1_veo.mp4
│   │   └── scene1_shot2_veo.mp4
│   ├── audio\                      -- Voiceovers, music, sound effects
│   │   ├── vo_narration_scene1.wav
│   │   └── bgm_cinematic_theme.mp3
│   └── images\                     -- Character sheets, style keyframes
│       ├── keyframe_hero_001.png
│       └── character_concept.png
├── proxies\                        -- Low-resolution editing proxies (qHD 960x540)
│   └── scene1_shot1_proxy.mp4
├── thumbnails\                     -- Micro scrubbing thumbnails (160x90 JPEG)
│   └── scene1_shot1_thumb.jpg
└── renders\                        -- Exported Master Deliverables & Staging
    ├── master_1080p_v1.mp4
    └── .staging\                   -- Ephemeral rendering staging files
        └── master_1080p.tmp.job-123.mp4
```

---

## 3. RELATIONAL SCHEMA (MIGRATION 005)

```sql
CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY NOT NULL,                                       -- UUID v4
    project_id TEXT NOT NULL,                                           -- FK -> projects.id
    file_name TEXT NOT NULL,                                            -- Original file name
    file_path TEXT NOT NULL,                                            -- Canonical absolute path
    media_type TEXT NOT NULL,                                           -- 'VIDEO', 'AUDIO', 'IMAGE'
    file_size_bytes INTEGER NOT NULL,                                   -- Physical file size
    duration_seconds REAL,                                              -- Media duration in seconds
    width INTEGER,                                                      -- Pixel width (null for audio)
    height INTEGER,                                                     -- Pixel height (null for audio)
    fps REAL,                                                           -- Constant/nominal framerate
    video_codec TEXT,                                                   -- e.g. 'h264', 'hevc', 'vp9'
    audio_codec TEXT,                                                   -- e.g. 'aac', 'mp3', 'flac'
    audio_channels INTEGER,                                             -- 1 (mono), 2 (stereo)
    sample_rate INTEGER,                                                -- e.g. 44100, 48000
    checksum_sha256 TEXT,                                               -- Cryptographic deduplication
    thumbnail_path TEXT,                                                -- Path to 160x90 thumbnail
    proxy_path TEXT,                                                    -- Path to editing proxy
    source_task_id TEXT,                                                -- FK -> tasks.id (AI provenance)
    created_at INTEGER NOT NULL,                                        -- Unix epoch milliseconds
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(source_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_media_assets_project ON media_assets(project_id, media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_checksum ON media_assets(checksum_sha256);
```

---

## 4. DEDUPLICATION & INTEGRITY VERIFICATION

1. **SHA-256 Checksumming**: During ingestion, files undergo streaming SHA-256 calculation. If an identical file already exists within the project vault, duplicate physical storage is avoided by pointing to the existing asset record.
2. **Provenance Tracking**: Media generated via AI providers stores `source_task_id`, linking the asset to the exact prompt, provider, and execution session that generated it.
3. **Safe Deletion Protocol**: Attempting to delete an asset referenced by an active timeline clip raises an immediate relational constraint error, safeguarding the production timeline from missing media defects.

