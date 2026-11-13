# CINEMATIC STUDIO
## Master Architecture & Technical Blueprint

**CINEMATIC STUDIO** is a professional, local-first, desktop-centered AI video production management platform designed to orchestrate long-form cinematic video creation (10-minute, 20-minute, 60-minute, and multi-hour episodic projects) using existing consumer AI web interfaces through user-authenticated Chrome browser sessions.

---

### Key Architectural Pillars

1. **Desktop-Centered Hybrid Architecture**: The Desktop Application (built on Tauri 2, Rust, React, and SQLite) acts as the single source of truth and orchestration brain. Chrome Profiles host lightweight Manifest V3 execution agents that interact strictly with permitted browser tabs.
2. **Extreme RAM & Resource Optimization**: Engineered to operate comfortably within a 20 GB host RAM environment alongside multiple browser profiles. Enforces bounded concurrency, lazy state hydration, off-RAM media streaming, virtualized UI grids, and strictly scoped process lifecycles.
3. **Robust Multi-Profile Session Isolation**: Explicitly maps `Project -> Task -> Provider -> Chrome Profile -> Browser Session -> Result`. Eliminates cross-profile state bleeding and Google Account coupling.
4. **Resilient Browser-Native Automation**: Decoupled DOM adapters with visual anchor fallback, multi-stage state machines (`WAITING_FOR_USER`, `GENERATING`, `COLLECTING`), and zero attempts to bypass CAPTCHA, Cloudflare, or anti-bot protections.
5. **Deterministic Production Pipeline**: End-to-end management spanning Story Analysis, Script Decomposition, Character/Location Consistency Vaults, Continuity Graph Tracking, Multi-Model Prompt Compilation, Task Queue Recovery, and Low-Memory FFmpeg Video Assembly.

---

### Master Documentation Index

| Document | Purpose & Scope |
| :--- | :--- |
| [01. README.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/README.md) | Platform overview, engineering tenets, and document navigation. |
| [02. PRODUCT-REQUIREMENTS.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/PRODUCT-REQUIREMENTS.md) | Comprehensive functional and non-functional requirements, user stories, constraints. |
| [03. SYSTEM-ARCHITECTURE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/SYSTEM-ARCHITECTURE.md) | High-level topology, data flows, boundaries, and communication topologies. |
| [04. TECH-STACK-DECISIONS.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/TECH-STACK-DECISIONS.md) | Deep comparative evaluation (Tauri 2 vs Electron, Native Messaging vs WS, etc.). |
| [05. DATABASE-SCHEMA.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/DATABASE-SCHEMA.md) | Relational SQLite schema, indexes, migrations, WAL mode, integrity checks. |
| [06. PROJECT-FILE-STRUCTURE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/PROJECT-FILE-STRUCTURE.md) | On-disk project bundle layout, caching, atomic saves, ZIP packaging. |
| [07. DESKTOP-APPLICATION-ARCHITECTURE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/DESKTOP-APPLICATION-ARCHITECTURE.md) | Tauri Rust backend, React frontend, UI layout, virtualization, and state flow. |
| [08. CHROME-PROFILE-INTEGRATION.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/CHROME-PROFILE-INTEGRATION.md) | Discovery, registration, Windows Chrome User Data directory mapping, lifecycle. |
| [09. CHROME-EXTENSION-ARCHITECTURE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/CHROME-EXTENSION-ARCHITECTURE.md) | Manifest V3 design, background service workers, content script sandboxing. |
| [10. BROWSER-AUTOMATION-STRATEGY.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/BROWSER-AUTOMATION-STRATEGY.md) | DOM selector resilience, mutation observers, human interaction pauses, ethical policy. |
| [11. AI-PROVIDER-ADAPTER-ARCHITECTURE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/AI-PROVIDER-ADAPTER-ARCHITECTURE.md) | Adapter contract for LLMs (ChatGPT, Claude, Gemini) and Video generators (Veo, Flow). |
| [12. VIDEO-PRODUCTION-ENGINE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/VIDEO-PRODUCTION-ENGINE.md) | Scene breakdown, clip planning, scheduling, multi-clip asset assembly. |
| [13. VIDEO-CONTINUITY-ENGINE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/VIDEO-CONTINUITY-ENGINE.md) | Visual continuity tracking, start/end frame references, motion direction vectors. |
| [14. PROMPT-ENGINE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/PROMPT-ENGINE.md) | Multi-tier prompt compilation, variable injection, provider templating, versioning. |
| [15. TASK-QUEUE-AND-RECOVERY.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/TASK-QUEUE-AND-RECOVERY.md) | Resilient state machine, crash recovery, deduplication, retry semantics. |
| [16. MEDIA-AND-FFMPEG-ARCHITECTURE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/MEDIA-AND-FFMPEG-ARCHITECTURE.md) | FFmpeg streaming assembly, chunked concatenations, proxy thumbnails, audio mix. |
| [17. SECURITY-ARCHITECTURE.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/SECURITY-ARCHITECTURE.md) | IPC validation, origin fencing, path traversal prevention, credential isolation. |
| [18. RAM-AND-PERFORMANCE-OPTIMIZATION.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/RAM-AND-PERFORMANCE-OPTIMIZATION.md) | Strict memory budgets, garbage collection triggers, zero-copy pipelines, profiling. |
| [19. FIVE-PHASE-IMPLEMENTATION-ROADMAP.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/FIVE-PHASE-IMPLEMENTATION-ROADMAP.md) | Step-by-step phased execution roadmap with completion criteria for each phase. |
| [20. RISKS-AND-TECHNICAL-LIMITATIONS.md](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/RISKS-AND-TECHNICAL-LIMITATIONS.md) | Exhaustive feasibility matrix, DOM mutation risks, policy limitations, fallbacks. |

---

### High-Level Topology

```
+--------------------------------------------------------------------------------------------------+
|                                    CINEMATIC STUDIO (DESKTOP)                                    |
|                                                                                                  |
|  [ UI LAYER: React 18 + TypeScript + TailwindCSS + Virtualized Canvas / Timeline / Inspector ]   |
|                                          | Tauri IPC                                             |
|  [ CORE RUST BACKEND: Tokio Async Runtime, Concurrency Semaphore, Media Pipeline, FFmpeg Subproc] |
|                                          |                                                       |
|  [ LOCAL DATABASE: SQLite 3 with WAL Mode, Relational Schema, Strict Foreign Keys, JSON Indexing]|
|                                          |                                                       |
|  [ LOCAL COMMUNICATION BRIDGE: Windows Named Pipe Server (Strict DACL) + Native Relay]            |
+------------------------------------------+-------------------------------------------------------+
                                           | Windows Named Pipe Stream (\\.\pipe\cinematic_studio_ipc)
         +---------------------------------+---------------------------------+
         |                                 |                                 |
+--------v-----------------------+ +-------v-----------------------+ +-------v---------------------+
| Chrome Profile 1 (e.g. Chat)   | | Chrome Profile 2 (e.g. Gemini)| | Chrome Profile 3 (Video Gen)|
| +----------------------------+ | | +----------------------------+ | | +--------------------------+ |
| | Manifest V3 Extension Agent| | | | Manifest V3 Extension Agent| | | | Manifest V3 Extension Agent| |
| | - Background Service Worker| | | | - Background Service Worker| | | | - Background Service Worker| |
| | - Active Tab Content Script| | | | - Active Tab Content Script| | | | - Active Tab Content Script| |
| | - Site Adapter: ChatGPT    | | | | - Site Adapter: Claude/Gem | | | | - Site Adapter: Veo/Flow   | |
| +--------------+-------------+ | | +--------------+-------------+ | | +--------------+-----------+ |
|                | DOM Injection | |                | DOM Injection | |                | DOM Inject|
| +--------------v-------------+ | | +--------------v-------------+ | | +--------------v-----------+ |
| | chatgpt.com                | | | | gemini.google.com          | | | | video-gen.google.com /... | |
| +----------------------------+ | | +----------------------------+ | | +--------------------------+ |
+--------------------------------+ +--------------------------------+ +------------------------------+
```

---

### Project Status & Governance
- **Current Phase**: **PHASE 1 COMPLETE — Desktop Core & Project Foundation Verified**.
- **Implementation Status**:
  - [x] High-performance React 18 + TypeScript + Tailwind CSS cinematic desktop interface.
  - [x] Dual-Panel Control Center (AI Model Workspace & Video Generation Workspace).
  - [x] Bottom Production Management Panel with $O(1)$ memory virtualized timeline strip.
  - [x] 100% Local-first Project Management backed by atomic filesystem vaults and SQLite schemas.
  - [x] 360-clip benchmark suite (validating sub-second responsiveness for 60-minute featurette scale).
  - [x] Low-RAM SQLite database configuration (`WAL mode`, `temp_store = FILE`, `cache_size = -8000`).
  - [x] Phase 1 Automated Validation Suite (13 / 13 tests passing).

---

## Developer Quick Start & Phase 1 Execution

### 1. Prerequisites
- **Operating System**: Windows 10/11 x64.
- **Node.js**: v20.18.0+ LTS (installed in `%LOCALAPPDATA%\Programs\nodejs`).
- **WebView2 Runtime**: Microsoft Edge WebView2 (installed in `%ProgramFiles(x86)%\Microsoft\EdgeWebView`).
- **Git**: 2.50+ Windows x64.
- **Rust Toolchain**: Rust 1.80+ / Cargo (managed via Rustup). Note: Windows 11 Smart App Control (SAC) must be set to allow Rust toolchain execution if building native binaries.

### 2. Launching Desktop UI in Development Mode
```powershell
# Set Node in environment path if not persistent
$env:Path = "C:\Users\Sohag Hossen\AppData\Local\Programs\nodejs;$env:Path"

# Run Vite development server
npm run dev
# -> Opens http://localhost:1420
```

### 3. Compiling Production Bundle
```powershell
$env:Path = "C:\Users\Sohag Hossen\AppData\Local\Programs\nodejs;$env:Path"
npm run build
# -> Type-checks and creates production bundle in /dist
```

### 4. Running the Phase 1 Validation Test Suite
```powershell
$env:Path = "C:\Users\Sohag Hossen\AppData\Local\Programs\nodejs;$env:Path"
node tests/phase1_validation.cjs
# -> Executes 13 tests verifying vault scaffolding, atomic writes, 360-clip scale, and integrity healing.
```

---

## Phase 1 Implemented Features vs Future Roadmap

| Feature Area | Status | Implementation Details |
| :--- | :--- | :--- |
| **Top Navigation** | **Implemented** | Project identity, New/Open/Save/Rename/Close modals, 360-clip benchmark button, live telemetry pill. |
| **Left Panel (AI Model)** | **Implemented (UI & Types)** | Reasoning provider selector, task type picker, context toggles, prompt editor, review staging. |
| **Right Panel (Video Gen)** | **Implemented (UI & Types)** | Video provider selector, Scene/Shot navigation, cinematography tags, reference frame placeholders. |
| **Bottom Production Panel** | **Implemented** | Status counters (Pending, Running, Completed, Failed), Sequential mode switch, virtualized timeline. |
| **Project Directory Vault** | **Implemented** | 14 structured subdirectories (`clips/`, `proxies/`, `thumbnails/`, etc.), atomic manifest saves. |
| **Database & Persistence** | **Implemented** | Relational SQLite schema with WAL mode, `temp_store = FILE`, strict foreign keys. |
| **Chrome Extensions & Bridge**| *Scheduled: Phase 2* | Portless Windows Named Pipe Relay, MV3 Service Worker agent, Chrome Profile pairing. |
| **AI LLM Live Generation** | *Scheduled: Phase 3* | ChatGPT, Claude, Gemini DOM adapters, narrative breakdown parser. |
| **AI Video Live Generation** | *Scheduled: Phase 4* | Google Veo, Runway, Luma DOM adapters, FFmpeg end-frame handover ($T_{end}$). |
| **Final FFmpeg Video Export** | *Scheduled: Phase 5* | Concat demuxer stream copy, normalizing transcode, multi-track audio mix, ZIP export. |

