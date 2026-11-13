# PROJECT FILE STRUCTURE & ASSET VAULT ARCHITECTURE
## CINEMATIC STUDIO: On-Disk Storage & Asset Layout

---

## 1. Master Application Data Directory (Global)

On Windows, the application's global configuration, profile tokens, system logs, and shared models reside strictly in `%LOCALAPPDATA%\CinematicStudio`.

```
%LOCALAPPDATA%\CinematicStudio\
│
├── config\
│   ├── app_settings.json            -- Global UI settings, theme, hardware thread limits
│   └── profiles_registry.json       -- Chrome profile IDs, friendly names, pairing tokens
│
├── bin\
│   ├── ffmpeg.exe                   -- Bundled or auto-detected FFmpeg static binary
│   ├── ffprobe.exe                  -- Companion media probe tool
│   └── cinematic-native-relay.exe   -- Native Messaging trampoline binary
│
├── logs\
│   ├── desktop_core.log             -- Rust backend runtime logs (rolling 10 MB window)
│   ├── bridge_ipc.log               -- WebSocket connection logs & handshake errors
│   └── ffmpeg_tasks.log             -- Transcode & assembly logs
│
└── cache\
    ├── temp_downloads\              -- Incoming clip staging before checksum validation
    └── crash_dumps\                 -- Crash dump artifacts (minidumps)
```

---

## 2. Project Asset Vault Directory (Per-Project)

Each project is a completely self-contained folder located wherever the user desires (e.g., on an NVMe SSD). It contains the local SQLite database and all media assets organized into strict functional subdirectories.

```
<User-Chosen-Directory>\<Project-Slug>\
│
├── project.db                       -- SQLite 3 Database (WAL mode enabled)
├── project.db-wal                   -- SQLite Write-Ahead Log (active during session)
├── project.db-shm                   -- SQLite Shared-Memory index
├── project.manifest.json            -- Lossless recovery fallback descriptor
│
├── characters\                      -- Character reference assets & identity lock files
│   └── <character-id>\
│       ├── identity.json            -- Character metadata, descriptors, wardrobe notes
│       ├── face_front.png           -- High-res reference images
│       ├── face_profile.png
│       ├── full_body.png
│       └── wardrobe_01.png
│
├── environments\                    -- Location reference assets
│   └── <environment-id>\
│       ├── location.json            -- Atmospheric metadata, lighting notes
│       └── master_reference.png     -- Canonical visual reference
│
├── storyboards\                     -- Generated visual beat boards
│   └── scene_001_beat_01.png
│
├── references\                      -- General style boards & art direction references
│   ├── color_palette.png
│   └── lighting_moodboard.png
│
├── audio\                           -- Audio elements for timeline mixing
│   ├── dialogue\                    -- Extracted voice lines or TTS stems (.wav/.mp3)
│   ├── foley\                       -- Sound effects stems
│   └── music\                       -- Background cinematic score stems
│
├── clips\                           -- Master High-Resolution Video Generations
│   ├── raw\                         -- Original downloaded clips directly from AI providers
│   │   ├── scene_001_clip_001_v1.mp4
│   │   ├── scene_001_clip_001_v2.mp4
│   │   └── scene_001_clip_002_v1.mp4
│   └── approved\                    -- Symlinked or hardlinked active timeline clips
│       ├── sc001_cl001.mp4
│       └── sc001_cl002.mp4
│
├── proxies\                         -- Low-bitrate 360p lightweight video proxies
│   ├── sc001_cl001_proxy.mp4        -- Fast scrubbing on timeline (1.5 MB each)
│   └── sc001_cl002_proxy.mp4
│
├── thumbnails\                      -- Lightweight JPG thumbnails for list virtualization
│   ├── sc001_cl001_thumb.jpg        -- 320x180 thumbnail (approx 25 KB each)
│   └── sc001_cl002_thumb.jpg
│
├── continuity_frames\               -- Frame Extractions for AI Video Continuity
│   ├── sc001_cl001_start.png        -- Reference image injected into AI provider
│   ├── sc001_cl001_end.png          -- Extracted final frame of clip 1
│   └── sc001_cl002_start.png        -- Reference frame passed to clip 2
│
├── exports\                         -- Final assembled video outputs
│   ├── render_list.txt              -- FFmpeg concat demuxer playlist file
│   ├── 20261113_RoughCut_v01.mp4    -- Intermediate export pass
│   └── 20261113_Master_4K.mp4       -- Final high-bitrate assembly
│
└── checkpoints\                     -- Periodic database snapshots for rollback
    ├── checkpoint_sc001_complete.db
    └── checkpoint_sc002_complete.db
```

---

## 3. Storage Footprint Calculations

### 3.1 Media Sizing Assumptions
- Generated Clip Duration: **10 Seconds** at 1080p H.264 (approx. 20 Mbps bitrate $\approx$ **25 MB per raw clip**).
- 360p Timeline Scrubbing Proxy: 10 Seconds at 1.2 Mbps bitrate $\approx$ **1.5 MB per clip**.
- Thumbnail Image: 320x180 JPG $\approx$ **25 KB per clip**.
- Continuity Frame (Lossless PNG): 1920x1080 PNG $\approx$ **2.2 MB per frame**.

### 3.2 Capacity Planning Matrix

| Production Scale | Runtime | Clip Count | Raw Video Storage | Proxies + Frames | Total Estimated Storage Budget |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Short Film** | 10 Minutes | 60 Clips | 1.5 GB | 230 MB | **~ 2.5 GB** (with 2 takes/clip) |
| **Mid-Length** | 20 Minutes | 120 Clips | 3.0 GB | 460 MB | **~ 5.5 GB** (with 2 takes/clip) |
| **Featurette** | 60 Minutes | 360 Clips | 9.0 GB | 1.4 GB | **~ 18.0 GB** (with 2 takes/clip) |
| **Episodic** | 3 Hours | 1,080 Clips | 27.0 GB | 4.2 GB | **~ 55.0 GB** (with 2 takes/clip) |

---

## 4. Atomic Write & Corruption Prevention Patterns

1. **Atomic File Creation**: Media files and JSON manifests are never written directly to their target filename. Rust writes to `<filename>.tmp.<uuid>`, flushes buffers to disk (`File::sync_all()`), and executes an atomic OS rename (`std::fs::rename`).
2. **ZIP Export with Path Traversal Protection**: When exporting or importing `.csproj.zip` archives, all path entries are sanitized against directory traversal attacks (`../` sequences are rejected).
3. **Checksum Ingestion Validation**: Every clip downloaded from Chrome Extensions is validated via SHA-256 before moving from `temp_downloads/` to the project's permanent `clips/raw/` vault.

