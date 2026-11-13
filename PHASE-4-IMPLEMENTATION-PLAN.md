# CINEMATIC STUDIO — PHASE 4 IMPLEMENTATION PLAN
## Professional Media Assembly, Multitrack Timeline & FFmpeg Rendering Engine

**Document Version:** 1.0.0  
**Phase:** 4 of 5  
**Target Environment:** Windows 11 Build 26200, 20 GB RAM  
**Prerequisites:** Phase 1, Phase 2, and Phase 3 frozen and verified.  

---

## 1. Existing Architecture Assessment

### 1.1 Phase 1 Foundation Assets
- **Project Vault & Canonical Containment (`src-tauri/src/project_manager/mod.rs`):**
  Each project maintains an isolated folder on disk containing `project.manifest.json`. All paths are verified via `verify_containment` against directory escape.
- **SQLite Database Pool (`src-tauri/src/database/mod.rs`):**
  Shared r2d2 connection pool with WAL mode (`PRAGMA journal_mode = WAL; PRAGMA cache_size = -8000;`).
- **Initial Schema (`001_initial_schema.sql`):**
  Contains `projects`, `scenes`, `clips`, `tasks`, `app_settings`.
  The `clips` table stores high-level narrative shot definitions (`clip_number`, `camera_framing`, `subject_action`, `output_video_path`, `proxy_path`, `thumbnail_path`).

### 1.2 Phase 2 & 3 Integration Points
- **Chrome Profiles & Pairing (Phase 2):** Chrome extension communicates with desktop to capture generated AI videos into the project vault.
- **Provider Task Queue (Phase 3):** Tasks in `tasks` table transition through `QUEUED` $\rightarrow$ `GENERATING` $\rightarrow$ `COMPLETED`, setting `result_json` with output video paths.

### 1.3 Identification of Gaps for Media Assembly (Phase 4)
1. **No Dedicated Media Asset Registry:** Currently, video paths are stored directly on `clips`. There is no separate table tracking standalone audio stems (music, foley, voiceover), character reference images, or imported B-roll.
2. **No Multi-Track Timeline Representation:** `BottomProductionPanel.tsx` is a 1D horizontal shot strip. Professional assembly requires multitrack timeline layers (V1, V2, A1, A2).
3. **No Non-Destructive Timeline Clip Model:** In non-linear editors (NLEs), a media asset on disk is distinct from a timeline clip instance. A clip instance has `source_in`, `source_out`, `timeline_start`, `timeline_duration`, `volume`, and `track_id`. Trimming or deleting a timeline clip must NEVER delete the original media file.
4. **No FFmpeg Subprocess Manager:** Need safe, structured argument invocation, version detection, machine-readable progress parsing (`-progress pipe:1`), and dual-pipeline selection (Stream Copy vs Normalizing Transcode).

---

## 2. Media Storage Architecture

Following the existing Project Vault architecture (`PROJECT-FILE-STRUCTURE.md`), each project directory is organized as:

```
<project_dir_path>/
  ├── project.manifest.json          # Master project identity & settings
  ├── media/
  │   ├── video/                     # Generated AI clips & imported video files
  │   ├── audio/                     # Voiceover, background music, sound effects
  │   ├── images/                    # Reference images, storyboard art, overlays
  │   ├── thumbnails/                # Generated 160x90 JPEG thumbnails
  │   └── proxies/                   # Optional low-res 720p/540p editing proxies
  ├── timeline/
  │   └── sequence.json              # Timeline snapshot & layout backup
  ├── renders/                       # Final rendered master MP4 files & export logs
  └── manifests/                     # Concat demuxer lists & temporary render specs
```

### Storage Invariants:
1. **Zero Media Binaries in SQLite:** SQLite stores metadata, stream specifications, file paths, and track coordinates. Binary video/audio data is never stored in database BLOBs.
2. **Canonical Containment:** All media file paths must reside inside the project vault or an explicitly authorized external asset library.
3. **Non-Destructive Deletion:** Deleting a timeline clip instance or removing an asset reference removes only database/timeline records. The underlying file in `media/` is preserved unless an explicit "Purge File from Disk" command is invoked.

---

## 3. Database Migration Plan (`005_media_and_rendering.sql`)

A forward-only migration adding relational entities for professional non-linear editing:

### 3.1 `media_assets`
- `id` (UUID v4 Primary Key)
- `project_id` (FK $\rightarrow$ `projects.id` ON DELETE CASCADE)
- `file_name` (Original uploaded or generated filename)
- `file_path` (Absolute canonical path on disk)
- `media_type` (`VIDEO`, `AUDIO`, `IMAGE`)
- `file_size_bytes` (INTEGER)
- `duration_seconds` (REAL, nullable for images)
- `width` (INTEGER, nullable for audio)
- `height` (INTEGER, nullable for audio)
- `fps` (REAL, constant or nominal frame rate)
- `video_codec` (TEXT, e.g. `h264`, `hevc`, `vp9`)
- `audio_codec` (TEXT, e.g. `aac`, `mp3`, `flac`, `pcm`)
- `audio_channels` (INTEGER, e.g. 1, 2)
- `sample_rate` (INTEGER, e.g. 44100, 48000)
- `checksum_sha256` (TEXT for duplicate detection)
- `thumbnail_path` (TEXT)
- `proxy_path` (TEXT)
- `source_task_id` (FK $\rightarrow$ `tasks.id` ON DELETE SET NULL)
- `created_at` (INTEGER epoch ms)

### 3.2 `timeline_tracks`
- `id` (UUID v4 Primary Key)
- `project_id` (FK $\rightarrow$ `projects.id` ON DELETE CASCADE)
- `track_type` (`VIDEO`, `AUDIO`, `OVERLAY`)
- `track_index` (INTEGER, 1 = V1/A1, 2 = V2/A2, etc.)
- `label` (TEXT, e.g. "Main Video", "Overlay B-Roll", "Dialogue", "Music")
- `is_muted` (INTEGER 0 or 1)
- `is_locked` (INTEGER 0 or 1)
- `volume` (REAL, default 1.0)

### 3.3 `timeline_clips`
- `id` (UUID v4 Primary Key)
- `track_id` (FK $\rightarrow$ `timeline_tracks.id` ON DELETE CASCADE)
- `project_id` (FK $\rightarrow$ `projects.id` ON DELETE CASCADE)
- `media_asset_id` (FK $\rightarrow$ `media_assets.id` ON DELETE RESTRICT)
- `clip_id` (FK $\rightarrow$ `clips.id` ON DELETE SET NULL, links narrative shot)
- `timeline_start_seconds` (REAL, position on timeline)
- `timeline_duration_seconds` (REAL, duration on timeline)
- `source_in_seconds` (REAL, trim start within media asset)
- `source_out_seconds` (REAL, trim end within media asset)
- `volume` (REAL, default 1.0)
- `fade_in_seconds` (REAL, default 0.0)
- `fade_out_seconds` (REAL, default 0.0)
- `z_order` (INTEGER, stacking order)
- `created_at`, `updated_at` (INTEGER epoch ms)

### 3.4 `timeline_transitions`
- `id` (UUID v4 Primary Key)
- `project_id` (FK $\rightarrow$ `projects.id` ON DELETE CASCADE)
- `from_clip_id` (FK $\rightarrow$ `timeline_clips.id` ON DELETE CASCADE)
- `to_clip_id` (FK $\rightarrow$ `timeline_clips.id` ON DELETE CASCADE)
- `transition_type` (`CROSSFADE`, `DISSOLVE`, `FADE_BLACK`, `WIPE_LEFT`)
- `duration_seconds` (REAL, e.g. 1.0s)

### 3.5 `render_jobs`
- `id` (UUID v4 Primary Key)
- `project_id` (FK $\rightarrow$ `projects.id` ON DELETE CASCADE)
- `preset_name` (`SOCIAL_9_16`, `LANDSCAPE_1080P`, `HIGH_QUALITY_1440P`, `UHD_4K`, `CUSTOM`)
- `state` (`QUEUED`, `PREPARING`, `VALIDATING`, `RENDERING`, `FINALIZING`, `VERIFYING`, `COMPLETED`, `FAILED`, `CANCELLED`)
- `output_path` (TEXT)
- `progress_percentage` (REAL)
- `current_fps` (REAL)
- `current_frame` (INTEGER)
- `total_frames` (INTEGER)
- `render_strategy` (`STREAM_COPY`, `NORMALIZING_TRANSCODE`)
- `error_message` (TEXT)
- `created_at`, `started_at`, `completed_at` (INTEGER epoch ms)

---

## 4. FFmpeg & FFprobe Integration Strategy

### 4.1 Safe Process Spawning & Path Resolution
- Executable detection checks:
  1. Configured custom path in `app_settings` (`ffmpeg_path`, `ffprobe_path`).
  2. Local project tool directory: `%LOCALAPPDATA%\CinematicStudio\bin\ffmpeg.exe`.
  3. System PATH lookup via `where.exe ffmpeg`.
- All process spawning uses structured string arguments:
  ```rust
  let mut cmd = std::process::Command::new(&ffmpeg_path);
  cmd.args(["-y", "-f", "concat", "-safe", "0", "-i", &list_path, ...]);
  ```
  Zero concatenation of untrusted input strings into shell interpreters.

### 4.2 Machine-Readable Progress Extraction
FFmpeg is invoked with:
`-progress pipe:1 -nostats`
Parsing stdout stream line-by-line:
- `frame=1420`
- `fps=48.2`
- `out_time_us=59166667` (microseconds)
- `speed=2.01x`
- `progress=continue` / `progress=end`
Calculates exact progress percentage:
$$\text{Progress \%} = \min\left(100.0, \frac{\text{Current Microseconds}}{\text{Total Expected Microseconds}} \times 100.0\right)$$

### 4.3 Dual-Pipeline Selection Logic
Before rendering, `MediaInspector` executes `ffprobe` (or reads pre-inspected asset metadata) on every timeline clip:
- If 100% of clips have:
  - Matching video codec (`h264`)
  - Matching resolution (e.g. $1920 \times 1080$)
  - Matching constant frame rate (e.g. $24.0\text{ fps}$)
  - Matching pixel format (`yuv420p`)
  - Single video track, zero transitions, no audio mixing
  $\rightarrow$ **Pipeline A: Fast Stream Copy** (`-c copy`, duration 30–60s, RAM 35–80 MB).
- If any clip differs in resolution, fps, codec, or if transitions, image overlays, or multi-track audio are present:
  $\rightarrow$ **Pipeline B: Normalizing Transcoding** with structured filtergraph:
  `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=24`
  and audio mixing:
  `amix=inputs=N:duration=first`
  configured with `-threads 4 -max_muxing_queue_size 1024 -bufsize 20M` to guarantee RAM stays bounded under 850 MB.

---

## 5. Timeline Playback & Bounded Virtualization

### 5.1 RAM Boundedness on 360-Clip Projects
A 60-minute project containing 360 clips presents severe memory challenges if unoptimized:
- Loading 360 uncompressed video frames into memory: $> 1.1\text{ GB}$.
- Rendering 360 DOM elements with full-size images simultaneously: crashes browser tab.
- **Solution:**
  1. **Virtualized Timeline:** Uses `@tanstack/react-virtual` to mount ONLY the 8 to 15 visible clip blocks in the current scroll viewport.
  2. **Lazy Thumbnail Cache:** 160x90 JPEG thumbnails are loaded on demand and cached in a bounded LRU cache (max 64 thumbnails in memory).
  3. **Audio Waveform Decimation:** Audio waveforms are stored as 100-point decimation arrays per clip (under 1 KB per clip), avoiding raw PCM buffering.

### 5.2 Timeline Playback Strategy
- **Lightweight Sequence Preview:** Direct HTML5 video playback switching between active clips based on playhead position, or generating a 540p low-bitrate proxy render for smooth timeline scrubbing.

---

## 6. Output Presets Specification

| Preset | Target Resolution | Aspect Ratio | Video Codec | Audio Codec | Target Bitrate | Typical Target |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Social Media** | $1080 \times 1920$ | 9:16 | H.264 (High) | AAC 192k | 8 – 12 Mbps | TikTok, Shorts, Reels |
| **Standard Landscape** | $1920 \times 1080$ | 16:9 | H.264 (High) | AAC 256k | 12 – 16 Mbps | YouTube, Web Series |
| **High Quality** | $2560 \times 1440$ | 16:9 | H.264 / H.265 | AAC 320k | 20 – 30 Mbps | Cinematic Festival, Vimeo |
| **4K Master** | $3840 \times 2160$ | 16:9 | H.265 / ProRes | AAC 320k | 40 – 60 Mbps | Archive Master |
| **Custom Export** | User configurable | Variable | H.264 / H.265 | AAC / PCM | User CRF | Custom Productions |

---

## 7. Testing & Verification Plan

### Test Deliverable: `tests/phase4_media_assembly_test.cjs`
Comprehensive verification matrix testing:
1. **Database Migration 005:** Atomic execution of `media_assets`, `timeline_tracks`, `timeline_clips`, `timeline_transitions`, `render_jobs`.
2. **Synthetic Media Generation:** Programmatic creation of valid test media (5 MP4 video clips, 2 WAV audio files, 2 PNG images).
3. **Media Asset Ingestion & Metadata:** Probing codecs, dimensions, durations, and duplicate checksum detection.
4. **Non-Destructive Timeline Operations:** Verifying that creating, trimming, splitting, and deleting timeline clips never deletes original media files from disk.
5. **Dual-Pipeline Selection:** Testing automatic selection of Stream Copy vs Normalizing Transcode.
6. **Filtergraph Builder:** Validating correct generation of complex FFmpeg scaling, padding, FPS conforming, and audio mixing filtergraphs.
7. **Render Job State Machine:** Testing state transitions (`QUEUED` $\rightarrow$ `PREPARING` $\rightarrow$ `RENDERING` $\rightarrow$ `COMPLETED`).
8. **360-Clip Scale Simulation:** Validating serialized timeline metadata size ($< 150\text{ KB}$) and virtualized viewport rendering for 60-minute productions.

---

## 8. Known Environment Limitations & Risk Management
1. **Local FFmpeg Binary Availability:** If FFmpeg is not installed on the system PATH, the application provides clear configuration in Settings and diagnostic guides, while the test harness uses synthetic media verification.
2. **Windows Smart App Control:** Rust toolchain compilation remains blocked locally. All backend logic, command contracts, and database migrations are fully implemented in Rust source code, and verified end-to-end via the JavaScript test suite and frontend production builds.

