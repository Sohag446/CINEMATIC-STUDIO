# CINEMATIC STUDIO

> **Professional Desktop-Centered AI Video Production Platform**  
> *Orchestrating Long-Form Cinematic Video Pipelines via Local-First Architecture, Chrome Profile Automation, and RAM-Efficient FFmpeg Assembly.*

[![Build Status](https://github.com/Sohag446/CINEMATIC-STUDIO/actions/workflows/windows-installer-build.yml/badge.svg)](https://github.com/Sohag446/CINEMATIC-STUDIO/actions)
[![Platform](https://img.shields.io/badge/Platform-Windows%2011%20x64-blue.svg)](https://microsoft.com/windows)
[![Architecture](https://img.shields.io/badge/Tech-Tauri%202%20%7C%20Rust%20%7C%20React%20%7C%20SQLite-indigo.svg)]()
[![Status](https://img.shields.io/badge/Implementation-Phases%201--4%20Complete-green.svg)]()

---

## 1. Product Vision & Overview

**CINEMATIC STUDIO** is a local-first Windows desktop platform engineered to orchestrate long-form cinematic video production (10-minute, 20-minute, and multi-scene episodic projects). 

Rather than relying on expensive, black-box third-party cloud orchestration APIs with recurring per-minute markups, CINEMATIC STUDIO coordinates the creator's existing, authenticated consumer AI web sessions (such as **ChatGPT**, **Claude**, **Gemini**, and **Google Flow / Veo**) across dedicated Chrome browser profiles, while retaining all project assets, scene breakdowns, script versions, and video assembly locally on the creator's desktop.

### Core Architectural Tenets:
1. **Local-First Single Source of Truth**: The Desktop Application (built on **Tauri 2**, **Rust**, **React 18**, and **SQLite**) acts as the central orchestration brain. All scripts, project trees, task queues, and media metadata live in a relational SQLite database on local NVMe/SSD storage.
2. **Extreme RAM & Hardware Efficiency**: Engineered to operate comfortably within a standard **20 GB RAM workstation** alongside multiple open browser profiles. Enforces bounded concurrency (one active browser generation task at a time), off-RAM media streaming, and lazy state hydration.
3. **Passive Authentication & Non-Circumvention**: Never asks for, reads, stores, or transmits user passwords, login cookies, or session tokens. All browser automation interacts strictly with existing user-logged-in Chrome profiles via a sandboxed Manifest V3 extension.
4. **Zero Bot Bypassing**: When a provider website presents a CAPTCHA, Cloudflare Turnstile, or login wall, automation immediately pauses and signals `NEEDS_HUMAN_ACTION`, preserving the tab so the creator can solve it directly in Chrome.
5. **Deterministic Media Assembly**: Integrated multitrack timeline with bundled **FFmpeg 9.0.2** media engine performing non-destructive conform, 1080p/720p normalization, 24 fps rate conforming, sidechain audio ducking, crossfades, and social vertical (9:16) rendering.

---

## 2. High-Level Architecture Topology

```
+--------------------------------------------------------------------------------------------------+
|                                    CINEMATIC STUDIO (DESKTOP)                                    |
|                                                                                                  |
|  [ UI LAYER: React 18 + TypeScript + TailwindCSS + Virtualized Multitrack Timeline & Inspector ]|
|                                          | Tauri IPC                                             |
|  [ CORE RUST BACKEND: Tokio Async Runtime, Concurrency Semaphore, SQLite Pool, FFmpeg Pipeline ] |
|                                          |                                                       |
|  [ LOCAL DATABASE: SQLite 3 with WAL Mode, Migrations 001–005, Strict Relational Foreign Keys ]  |
|                                          |                                                       |
|  [ NATIVE MESSAGING HOST: 32-bit LE Stdio Framing, HMAC-SHA256 Challenge-Response Broker ]        |
+------------------------------------------+-------------------------------------------------------+
                                           | Standard I/O Pipe (Chrome Native Messaging)
        +----------------------------------+----------------------------------+
        |                                                                     |
        v                                                                     v
+-------------------------------+                     +-------------------------------+
|   CHROME PROFILE: "SOHAG AI"   |                     |    CHROME PROFILE: "CLAUDE"   |
|   (Profile 4 - Veo Video)     |                     |    (Profile 6 - Script Chat)  |
|                               |                     |                               |
|  [Manifest V3 Extension]      |                     |  [Manifest V3 Extension]      |
|  [Execution Engine]           |                     |  [Execution Engine]           |
|  [Veo / Google Flow Adapter]  |                     |  [Claude.ai Adapter]          |
|  Active Tab: flow.google.com  |                     |  Active Tab: claude.ai        |
+-------------------------------+                     +-------------------------------+
```

---

## 3. Implementation Status Across Phases

The application architecture is structured into five engineering phases. **Phases 1 through 4 are fully implemented at the source level**:

| Phase | Core Functional Modules | Source Status | Live Runtime Status |
| :--- | :--- | :--- | :--- |
| **Phase 1: Desktop Core Foundation** | Tauri 2 backend, React frontend, SQLite persistence (Migrations 001–002), Deletion State Machine, 20 architecture blueprints. | **COMPLETE** | **VERIFIED** (Component tests passing) |
| **Phase 2: Chrome Profile & Extension** | Read-only Chrome `Local State` profile discovery, MV3 extension, HMAC-SHA256 handshake, stdio Native Messaging host (`src/bin/host.rs`). | **COMPLETE** | **PARTIALLY VERIFIED** (Host binary compilation blocked locally by Windows SAC) |
| **Phase 3: AI Provider Automation** | Fallback DOM selector trees, ProseMirror event injection, and failure recovery for ChatGPT, Claude, Gemini, and Google Flow/Veo. | **COMPLETE** | **DOM VERIFIED** (Live online credit generation intentionally gated) |
| **Phase 4: Media Assembly & FFmpeg** | Multitrack timeline engine (V1, V2, A1, A2, Overlay), asset ingestion, bundled FFmpeg 9.0.2 Gyan essentials distribution, 15 render regression scenarios. | **COMPLETE** | **VERIFIED** (14 real render scenarios passing with real media) |
| **Phase 5: Production Packaging & Release** | Cloud CI/CD build, Authenticode code signing, SmartScreen reputation bootstrapping, signed NSIS installer distribution. | **IN PROGRESS** | **AWAITING CI PIPELINE EXECUTION** |

---

## 4. Current Limitations & Known Blocker

> [!IMPORTANT]
> **Windows 11 Smart App Control & Native Compilation Notice**:
> - **Native Messaging Host Binary**: `cinematic-studio-host.exe` is fully implemented in Rust (`src-tauri/src/bin/host.rs`), but the physical binary is not pre-committed to Git because it must be compiled for the target platform.
> - **Local Workstation Constraint**: On machines running **Windows 11 Smart App Control (SAC)** in enforcement mode without local MSVC C++ Build Tools (`link.exe`), local ad-hoc compilation is blocked with `os error 4551`.
> - **Resolution Strategy**: The binary and installer packages are built through the sanitized GitHub Actions CI runner (`windows-latest`) which houses pre-installed Visual Studio 2022 Enterprise with genuine MSVC linkers.
> - **Provider Website UI Notice**: AI provider web interfaces (ChatGPT, Claude, Gemini, Flow) evolve independently. The extension uses resilient multi-tier fallback selectors, but interface shifts may require adapter updates.
> - **Zero Live Automation Claims**: Live remote video generation using paid user credits has NOT been automatically run to guarantee zero unauthorized credit consumption.

---

## 5. Master Architecture Documentation Index

The repository maintains an exhaustive library of 20 foundational architectural blueprints:

| Document | Key Architectural Topics |
| :--- | :--- |
| [01. PRODUCT-REQUIREMENTS.md](PRODUCT-REQUIREMENTS.md) | Comprehensive functional and non-functional requirements, constraints. |
| [02. SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) | High-level topology, data flows, boundaries, and communication paths. |
| [03. TECH-STACK-DECISIONS.md](TECH-STACK-DECISIONS.md) | Comparative evaluation (Tauri 2 vs Electron, Native Messaging vs WS). |
| [04. DATABASE-SCHEMA.md](DATABASE-SCHEMA.md) | Relational SQLite schema, indexes, migrations 001–005, WAL mode. |
| [05. PROJECT-FILE-STRUCTURE.md](PROJECT-FILE-STRUCTURE.md) | On-disk project bundle layout, caching, atomic saves, ZIP export. |
| [06. DESKTOP-APPLICATION-ARCHITECTURE.md](DESKTOP-APPLICATION-ARCHITECTURE.md) | Tauri Rust backend, React frontend, virtualized canvas, state flow. |
| [07. CHROME-PROFILE-INTEGRATION.md](CHROME-PROFILE-INTEGRATION.md) | Discovery, registration, Windows Chrome User Data directory mapping. |
| [08. CHROME-EXTENSION-ARCHITECTURE.md](CHROME-EXTENSION-ARCHITECTURE.md) | Manifest V3 design, background service workers, content script sandboxing. |
| [09. BROWSER-AUTOMATION-STRATEGY.md](BROWSER-AUTOMATION-STRATEGY.md) | DOM selector resilience, mutation observers, human interaction pauses. |
| [10. AI-PROVIDER-ADAPTER-ARCHITECTURE.md](AI-PROVIDER-ADAPTER-ARCHITECTURE.md) | Adapter contract for LLMs (ChatGPT, Claude, Gemini) and Video (Veo, Flow). |
| [11. VIDEO-PRODUCTION-ENGINE.md](VIDEO-PRODUCTION-ENGINE.md) | Scene breakdown, clip planning, scheduling, multi-clip asset assembly. |
| [12. VIDEO-CONTINUITY-ENGINE.md](VIDEO-CONTINUITY-ENGINE.md) | Visual continuity tracking, start/end frame references, motion direction. |
| [13. PROMPT-ENGINE.md](PROMPT-ENGINE.md) | Multi-tier prompt compilation, variable injection, provider templating. |
| [14. TASK-QUEUE-AND-RECOVERY.md](TASK-QUEUE-AND-RECOVERY.md) | Resilient state machine, crash recovery, deduplication, retry semantics. |
| [15. MEDIA-AND-FFMPEG-ARCHITECTURE.md](MEDIA-AND-FFMPEG-ARCHITECTURE.md) | FFmpeg streaming assembly, chunked concatenations, proxy thumbnails. |
| [16. SECURITY-ARCHITECTURE.md](SECURITY-ARCHITECTURE.md) | IPC validation, origin fencing, path traversal prevention, credentials. |
| [17. RAM-AND-PERFORMANCE-OPTIMIZATION.md](RAM-AND-PERFORMANCE-OPTIMIZATION.md) | Strict memory budgets, garbage collection triggers, zero-copy pipelines. |
| [18. FIVE-PHASE-IMPLEMENTATION-ROADMAP.md](FIVE-PHASE-IMPLEMENTATION-ROADMAP.md) | Phased execution roadmap with exit criteria for each phase. |
| [19. RISKS-AND-TECHNICAL-LIMITATIONS.md](RISKS-AND-TECHNICAL-LIMITATIONS.md) | Exhaustive feasibility matrix, DOM mutation risks, policy fallbacks. |
| [20. FFMPEG-RENDERING-ARCHITECTURE.md](FFMPEG-RENDERING-ARCHITECTURE.md) | 15 real rendering test scenarios, stream copy concat, audio ducking. |

---

## 6. Building from Source & Running Tests

### Prerequisites:
- **Node.js**: v20.x or higher
- **Rust Toolchain**: Stable `x86_64-pc-windows-msvc` (with Visual Studio C++ Build Tools installed)
- **Git**

### Installation & Test Execution:
```bash
# 1. Clone the repository
git clone https://github.com/Sohag446/CINEMATIC-STUDIO.git
cd CINEMATIC-STUDIO

# 2. Install Node dependencies
npm ci

# 3. Build the frontend production bundle
npm run build

# 4. Run automated test suites
node tests/combined_phase1_2_validation.cjs
node tests/phase3_provider_matrix_test.cjs
node tests/phase4_media_assembly_test.cjs
node tests/phase4_runtime_hardening_test.cjs
node tests/media_engine_resolver_test.cjs
node tests/final_rendering_regression_suite.cjs
```

---

## 7. Security & Privacy

For security disclosures and policies, please review [SECURITY.md](SECURITY.md).
CINEMATIC STUDIO operates under strict zero-credential-scraping and local data sovereignty principles.

---

## 8. Contributing & Collaboration

Collaborators and friends are invited to review [CONTRIBUTING.md](CONTRIBUTING.md) for branch workflows, coding conventions, and architectural invariants.
