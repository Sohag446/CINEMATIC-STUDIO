# FIVE-PHASE IMPLEMENTATION ROADMAP
## CINEMATIC STUDIO: Sequential Engineering & Quality Gate Blueprint

---

## 1. Roadmap Overview & Gate Governance Rules

To ensure rock-solid stability, zero architectural drift, and strict memory compliance, CINEMATIC STUDIO follows a sequential, gated five-phase implementation lifecycle.

**Core Governance Rule**: No phase will commence until all deliverables of the preceding phase have passed their automated unit tests, manual integration audits, and formal operator approval gates.

```
+-------------------------------------------------------------------------------------------------+
| PHASE 1: Desktop Core & Project Foundation (Tauri 2, SQLite WAL, Reactive UI, Telemetry)        |
+------------------------------------------------+------------------------------------------------+
                                                 | (Quality Gate 1 Approved)
                                                 v
+-------------------------------------------------------------------------------------------------+
| PHASE 2: Chrome Profile & Extension Integration (MV3 Agent, Loopback WS Bridge, Multi-Profile)  |
+------------------------------------------------+------------------------------------------------+
                                                 | (Quality Gate 2 Approved)
                                                 v
+-------------------------------------------------------------------------------------------------+
| PHASE 3: AI Director & Story Engine (LLM Adapters, Story Decomposition, Character Vault, Prompts|
+------------------------------------------------+------------------------------------------------+
                                                 | (Quality Gate 3 Approved)
                                                 v
+-------------------------------------------------------------------------------------------------+
| PHASE 4: Continuity Engine & Video Production (Video Adapters, End-Frames, Task Queue, FSM)     |
+------------------------------------------------+------------------------------------------------+
                                                 | (Quality Gate 4 Approved)
                                                 v
+-------------------------------------------------------------------------------------------------+
| PHASE 5: Media Management & Final Export (FFmpeg Assembly, Timeline, Low-Memory Concat, ZIP)    |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Phase-by-Phase Technical Breakdown

### PHASE 1: Desktop Core & Project Foundation
- **Primary Objectives**: Establish the high-performance desktop shell, embedded SQLite persistence, project directory vault, and telemetry baseline.
- **Key Deliverables**:
  - Tauri 2 Rust application scaffold with Tokio async runtime.
  - React 18 + TypeScript + Tailwind CSS UI shell (Top Nav, Two-Panel container, Status drawer).
  - Embedded SQLite database engine with WAL mode and initial relational migrations.
  - Project directory manager (creation, atomic saves, directory layout scaffolding).
  - System telemetry actor (real-time sampling of desktop RAM and CPU).
- **RAM Benchmark**: Desktop idle footprint (Rust core + WebView2 process tree) $\mathbf{215 – 260\text{ MB}}$.
- **Acceptance Criteria**:
  - [ ] App launches within 1.5 seconds on Windows 10/11.
  - [ ] Can create, open, save, and close projects with 100% data persistence.
  - [ ] SQLite database passes WAL integrity verification after simulated crash.

---

### PHASE 2: Chrome Profile & Extension Integration
- **Primary Objectives**: Build the Manifest V3 browser extension, local communication bridge, and multi-profile registration manager.
- **Key Deliverables**:
  - Chrome Extension (MV3) with background service worker and content script injector.
  - Windows Named Pipe Server (`\\.\pipe\cinematic_studio_ipc`) with strict user DACL.
  - Native Messaging companion relay binary (`cinematic-relay.exe`) registered in Windows Registry.
  - Optional secondary loopback WebSocket fallback for non-registry developer mode.
  - Chrome Profile Manager UI in desktop (pair profile, test connection, track active state).
  - Dynamic tab deduplication and provider navigation runner.
- **RAM Benchmark**: Extension overhead $\le \mathbf{35\text{ MB}}$ per profile; native relay idle $\le \mathbf{8\text{ MB}}$.
- **Acceptance Criteria**:
  - [ ] Can pair 2 or more distinct Chrome profiles using individual cryptographic HMAC handshakes.
  - [ ] Extension reconnects cleanly after browser restart and service worker hibernation.
  - [ ] Extension reuses existing provider tabs without opening duplicate tabs.

---

### PHASE 3: AI Director & Story Engine
- **Primary Objectives**: Implement LLM web adapters, automated narrative decomposition, character/environment vaults, and multi-tier prompt compilation.
- **Key Deliverables**:
  - Left Panel: AI Model Workspace UI with provider selectors (ChatGPT, Claude, Gemini).
  - Resilient DOM content script adapters for major text reasoning websites.
  - Story decomposition engine (Acts -> Scenes -> Shots / Clips breakdown).
  - Character & Location Vaults with multi-angle reference image bindings.
  - Intelligent Prompt Engine with dynamic token resolution and provider dialect formatting.
- **RAM Benchmark**: Full story planning session $\le \mathbf{220\text{ MB}}$ desktop RAM.
- **Acceptance Criteria**:
  - [ ] Successfully dispatches a narrative breakdown prompt to ChatGPT/Claude and collects response.
  - [ ] Correctly parses AI response into structured Scene and Clip records in SQLite.
  - [ ] Compiles shot prompts injecting character and environmental constraints accurately.

---

### PHASE 4: Continuity Engine & Video Production
- **Primary Objectives**: Integrate AI video web providers, visual continuity tracking, start/end frame handover, and deterministic task queue FSM.
- **Key Deliverables**:
  - Right Panel: Video Generation Workspace UI with provider selectors (Veo, Flow, Runway).
  - Video provider content script adapters (prompt injection, seed upload, completion poll).
  - High-precision end-frame extractor using FFmpeg (`-sseof -0.04`).
  - Kinematic continuity vector tracker (momentum, eyeline, lighting match).
  - Production Manager & Task Queue with formal FSM states and crash reconciliation.
  - Automated clip downloader and SHA-256 ingestion validator.
- **RAM Benchmark**: Active generation with 1 browser profile $\le \mathbf{1.2\text{ GB}}$ total system RAM.
- **Acceptance Criteria**:
  - [ ] Successfully injects prompt and reference image into video provider tab.
  - [ ] Monitors generation to completion, downloads raw MP4, and extracts final end-frame.
  - [ ] Desktop recovers in-flight task state accurately after application restart.

---

### PHASE 5: Media Management & Final Export
- **Primary Objectives**: Build the virtualized timeline editor, low-memory FFmpeg assembly engine, audio mixdown pipeline, and project archive portability.
- **Key Deliverables**:
  - Virtualized Timeline Strip supporting 360+ clips with instant scrubbing proxies.
  - Stream-copy FFmpeg Concat Demuxer assembly pipeline for compatible clips.
  - Normalizing transcode and multi-track audio mixer (Dialogue, Foley, Score).
  - Complete Project ZIP export and import with path traversal protection.
  - Full-system stress testing (simulating a 60-minute, 360-clip film project).
  - Final documentation and release package.
- **RAM Benchmark**: Concat Demuxer assembly $\mathbf{35 – 80\text{ MB}}$; Normalizing Transcode $\mathbf{450 – 850\text{ MB}}$.
- **Acceptance Criteria**:
  - [ ] Assembles 360 identical 10-second clips in under 60 seconds using lossless stream copy.
  - [ ] Successfully normalizes and mixes mixed-format clips with multi-track audio without crashing.
  - [ ] Timeline scrubs smoothly using lightweight 360p proxies with memory under 400 MB.
  - [ ] Full `.csproj.zip` archive exports and re-imports on a clean machine with 100% fidelity.

