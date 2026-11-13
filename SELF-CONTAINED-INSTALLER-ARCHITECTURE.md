# SELF-CONTAINED INSTALLER ARCHITECTURE
## CINEMATIC STUDIO — WINDOWS DESKTOP PRODUCT SPECIFICATION

**Status:** IMPLEMENTED & VERIFIED  
**Target Environment:** Windows 10 / Windows 11 (x64)  
**Distribution Model:** Single-Package Self-Contained Desktop Installer  

---

## 1. PRODUCT VISION & CORE OBJECTIVE

CINEMATIC STUDIO is a self-contained desktop video production workstation. When an end-user installs the application via the standard Windows installer (`.msi` or `.exe`), **all** runtime binaries required for local media editing, timeline conforming, and video rendering are packaged and configured out-of-the-box.

### Non-Negotiable Installer Invariants:
1. **Zero External Media Downloads**: The user is **never** prompted to download or install FFmpeg, FFprobe, or other video codecs manually.
2. **Zero Startup Network Latency**: Media engine binaries are bundled directly inside the application installer package. The application never attempts to silently download multi-megabyte executables during initial boot or project creation.
3. **Decoupled User Data**: User project vaults, SQLite databases, and generated media assets reside strictly outside the application program directory (`C:\CinematicStudio\Projects\`). Upgrading or reinstalling the application never overwrites or destroys user project data.
4. **Independent Local Operations**: Media assembly, multitrack timeline playback, and rendering function 100% locally with zero network connection. Third-party web browsers and cloud AI provider accounts are only invoked when generating new generative assets.

---

## 2. APPLICATION DIRECTORY TOPOGRAPHY

```
C:\Program Files\Cinematic Studio\                   -- Application Installation Root
├── cinematic-studio.exe                             -- Native Tauri Desktop Executable
├── cinematic-studio-host.exe                        -- Native Messaging Host Executable
├── resources\                                       -- Bundled Application Resources
│   └── media-engine\
│       └── windows-x64\                             -- Self-Contained Media Engine
│           ├── ffmpeg.exe                           -- FFmpeg v9.0.2 Converter & Muxer
│           ├── ffprobe.exe                          -- FFprobe v9.0.2 Media Stream Analyzer
│           ├── BUILD-INFO.txt                       -- Distribution Metadata & Provenance
│           ├── CHECKSUMS.txt                        -- SHA-256 Binary Integrity Manifest
│           ├── LICENSES\
│           │   ├── FFMPEG-LICENSE.txt               -- GNU GPL v3 / LGPL Notices
│           │   └── BUILD-README.txt
│           └── doc\                                 -- FFmpeg Technical Documentation
└── [Tauri / WebView2 Runtime DLLs]

C:\CinematicStudio\Projects\                         -- Isolated User Project Storage (Preserved)
├── <Project_Slug_1>\
│   ├── cinematic.db
│   ├── assets\
│   └── renders\
```

---

## 3. TAURI 2 BUNDLE CONFIGURATION

In `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [
      "resources/**/*"
    ]
  }
}
```

During Windows packaging (`tauri build`), Tauri copies `src-tauri/resources/` into the application resource staging tree, resulting in an all-in-one WiX/NSIS installer that places `media-engine/windows-x64/` directly beside the main binary.

---

## 4. DUAL-MODE RESOURCE RESOLUTION ALGORITHM

The Rust media engine resolves `ffmpeg.exe` and `ffprobe.exe` using a deterministic priority hierarchy in `FFmpegManager::resolve_candidates`:

```
┌────────────────────────────────────────────────────────┐
│ 1. User-Configured Custom Path (Settings Override)     │
└──────────────────────────┬─────────────────────────────┘
                           │ (If unset / empty)
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. Production Installed Resource Directory             │
│    - current_exe().parent()/resources/media-engine/    │
│    - current_exe().parent()/media-engine/windows-x64/  │
└──────────────────────────┬─────────────────────────────┘
                           │ (If in dev mode / uninstalled)
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Development Workspace Resource Directory            │
│    - src-tauri/resources/media-engine/windows-x64/     │
│    - CARGO_MANIFEST_DIR/resources/media-engine/...     │
└──────────────────────────┬─────────────────────────────┘
                           │ (Fallback)
                           ▼
┌────────────────────────────────────────────────────────┐
│ 4. System Environment PATH (ffmpeg.exe / ffprobe.exe)  │
└────────────────────────────────────────────────────────┘
```

---

## 5. CHROME & CLOUD AI PROVIDER INDEPENDENCE

While CINEMATIC STUDIO supports automated generative workflows via registered Chrome profiles, **Chrome is not bundled** and is **not** a dependency for local editing:
1. **No Unauthorized Chrome Bundling**: Google Chrome is proprietary software. Packaging a modified or bundled Chrome executable inside the installer is prohibited.
2. **Graceful Degradation**: If Google Chrome is absent on the user's system:
   - Multitrack editing, media vault management, razor cutting, volume adjustments, and master MP4 rendering remain **100% operational**.
   - The AI generation workspace informs the operator: *"Google Chrome installation required for browser-based AI provider automation (ChatGPT, Claude, Gemini, Veo)."*

