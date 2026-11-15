# ARCHITECTURE DECISION RECORD (ADR)
## ADR-001: Desktop Framework, Media Engine & In-App Chrome Hosting Architecture

**Status:** APPROVED (Milestone 0 Technical Decision)  
**Date:** 2026-11-15  
**Decision Maker:** Principal Software Architect & Md. Sohag Hossen (Product Owner)  
**Target Environment:** Windows 11 x64 (Primary Workstation: AMD Ryzen 7 5000, AMD Radeon Graphics, 20 GB RAM)  

---

## 1. Context and Problem Statement

CINEMATIC STUDIO is conceived as a high-performance, professional desktop AI film production studio and non-linear video editor (NLE). The application has three demanding architectural pillars:
1. **Real In-Workspace Chrome Browser Hosting:** Running a genuine Google Chrome instance visibly docked inside the desktop workspace for web-based AI video generators (e.g., Google Flow/Veo, Runway) and conversational assistants, with bidirectional IPC.
2. **Professional Multi-Track NLE Engine:** Providing sub-frame audio scrubbing, multi-layer video composition (V1–V3, A1–A3), smooth 60fps preview, and real-time inspector transforms without UI lag or memory blowouts.
3. **Conversational AI Film Production Agent:** Managing multi-turn creative dialogue, persisting structured Production Bibles, and orchestrating generation queues.

The existing codebase is implemented in **Tauri 2 (Rust 1.84 backend + WebView2 / React 18 / TypeScript frontend + SQLite)**. However, high-end professional desktop NLEs (such as Adobe Premiere Pro, DaVinci Resolve, and Shotcut) typically leverage **C++20/23, Qt 6, and native FFmpeg libraries (libavcodec, libavfilter, libavformat)**.

We must evaluate two viable architectural paths and decide the optimal strategy:
- **Option A:** Complete Native Qt 6 / C++20 desktop rewrite.
- **Option B:** Hybrid Architecture (Hardened Rust core services + Dedicated Native C++ / FFmpeg Media Engine + React/Tauri NLE shell with strict IPC boundaries).

---

## 2. Comparative Technical Evaluation

| Evaluation Criteria | Option A: Full Native Qt 6 / C++20 Rewrite | Option B: Hybrid Architecture (Rust Core + C++ Media Engine + Tauri) |
| :--- | :--- | :--- |
| **Maintainability** | **Moderate:** C++ memory management (RAII, smart pointers) requires extensive discipline. Qt QML/Widgets codebases can become complex over time. | **High:** Rust guarantees memory safety, race-free concurrency, and strict type safety for background jobs, SQLite, and IPC. React provides rapid UI iteration. |
| **Performance & Latency** | **Superior:** Direct GPU hardware rendering (Vulkan / Direct3D 11 / OpenGL via Qt RHI) directly in the viewport. Zero IPC overhead for preview rendering. | **High:** Offloads heavy decoding/compositing to a dedicated C++ engine or native FFmpeg worker, streaming frames to an accelerated viewport. |
| **Memory Footprint** | **Low (~120–250 MB baseline):** Pure native compiled C++ executable without WebView2 runtime overhead. | **Moderate (~350–650 MB baseline):** WebView2 memory overhead adds ~200 MB, but remains well within the 20 GB system RAM ceiling. |
| **Stability & Crash Isolation** | **Moderate:** A segfault in C++ video decoding or an FFmpeg filter crashes the entire desktop application and UI. | **Superior:** The media engine runs out-of-process or in a sandboxed worker. A decoder crash does not kill the UI or corrupt project state. |
| **Migration Risk & Schedule** | **Extreme (High Risk):** Rewriting the entire UI, state store, SQLite migrations, Chrome extension IPC, and window management from scratch will stall feature delivery for 4–6 months. | **Low (Controlled Transition):** Preserves working, tested systems (SQLite migrations, HMAC-SHA256 IPC, Win32 Chrome docking), focusing immediately on replacing mock stubs. |
| **Browser Docking (Win32 HWND)** | **Complex:** Requires embedding external Win32 HWND inside a `QWindow::fromWinId` / `QWidget::createWindowContainer`, which suffers from known Qt resize flicker and focus issues. | **Proven & Functional:** Native Win32 `SetParent` / `SetWindowLongW(WS_CHILD)` child docking is already implemented and verified in `docked_chrome.rs`. |
| **Developer Complexity** | **High:** Requires dual expertise in advanced modern C++20/Qt and deep FFmpeg C APIs. | **Manageable:** Clean division of labor: React/TypeScript for user experience, Rust for reliable system services, C++/FFmpeg for heavy media processing. |
| **Commercial Licensing Compliance** | **Complex:** Qt 6 is dual-licensed under Commercial (~$3,950/dev/year) or LGPLv3 (requires dynamic linking and user relinking rights). | **Clean:** Rust crates (MIT/Apache 2.0), React (MIT), and FFmpeg (LGPL v2.1/v3 dynamic linking) allow commercial distribution without royalty fees. |
| **Cross-Platform (macOS / Linux)** | **Native:** Qt runs natively across Windows, macOS, and Linux out of the box. | **Supported:** Tauri 2 natively supports Windows, macOS, and Linux. |

---

## 3. Deep Architectural Analysis of Option A (Full Qt 6 Rewrite)

### Advantages of Option A
1. **Unrivaled Render Pipeline Efficiency:** Qt's Rendering Hardware Interface (RHI) allows direct Direct3D 11 and Vulkan texture sharing with FFmpeg's hardware decoders (AMD AMF / DXVA2). Frames decoded by the GPU can be presented directly on the screen without copying memory across process boundaries.
2. **Native OS Feel:** Qt Widgets provide 100% native Windows controls, menus, and high-DPI scaling behavior without DOM emulation.
3. **Low Idle Footprint:** Eliminates the Chromium WebView2 rendering engine from the main desktop shell.

### Critical Disadvantages & Disqualifying Risks of Option A
1. **The In-Workspace Chrome Requirement:** The user's primary requirement is hosting a genuine Google Chrome instance inside the workspace for web AI workflows. In Qt, embedding an external foreign HWND via `QWidget::createWindowContainer` has severe documented bugs on Windows 11 (keyboard focus capture traps, mouse wheel routing failures, and repaint tearing when dragging dock splitters).
2. **Catastrophic Project Delay:** Rewriting the 147 test cases, 4 SQLite migration schemas, HMAC-SHA256 pairing engine, and CapCut multi-track timeline into C++ QML/Widgets would discard months of working code and delay production readiness indefinitely.
3. **Crash Vulnerability:** Video editing software that runs experimental third-party media codecs inside the main GUI process is prone to unexpected crashes that destroy user work.

---

## 4. Deep Architectural Analysis of Option B (Hybrid Architecture)

### Advantages of Option B
1. **Proven Win32 Chrome Docking:** The existing Rust backend (`docked_chrome.rs`) already integrates Win32 `SetParent`, dynamic DPI-aware bounds synchronization, and tab visibility toggling without crashing.
2. **Process Isolation & Crash Resilience:** Heavy FFmpeg rendering and media analysis run in independent worker processes. If an invalid video stream crashes FFmpeg, the main application catches the exit code, logs the error, and leaves the user's project and timeline completely intact.
3. **Rapid, Pixel-Perfect UI Evolution:** The CapCut/Premiere-style multi-track timeline, inspector controls, and dark theme are already rendered efficiently using React virtualized lists and Tailwind CSS, maintaining 60fps playhead scrubbing.
4. **Immediate Focus on Real Functionality:** Instead of spending months rebuilding buttons in Qt, engineering effort is immediately directed to replacing the fake heuristics in `storyAgent.ts`, removing mock delays in `generateShotVideo()`, and implementing the background render worker.

---

## 5. Decision: Approved Hybrid Architecture with Dedicated Media Engine Boundary

**We officially adopt Option B (Hybrid Architecture) with a phased migration path:**

```
+-----------------------------------------------------------------------------------+
|                           CINEMATIC STUDIO APPLICATION                            |
+-----------------------------------------------------------------------------------+
|  [PRESENTATION LAYER]                                                             |
|  React 18 + TypeScript + Zustand + Tailwind CSS                                   |
|  - Premiere/CapCut-Style Multi-Track Timeline (V1-V3, A1-A3)                      |
|  - Real-Time Inspector & Transform Controls                                       |
|  - Conversational Story Agent UI & Production Bible Editor                        |
|  - Native Menus, Keyboard Shortcuts, Dark/Light Theme                             |
+-----------------------------------------------------------------------------------+
                                    │ (Tauri IPC / Stdio JSON-RPC)
+-----------------------------------▼-----------------------------------------------+
|  [APPLICATION CORE & ORCHESTRATION LAYER] (Rust 1.84)                             |
|  - Project Manager & SQLite Forward-Only Migrations (WAL Mode)                    |
|  - Win32 Native HWND Chrome Docking & Visibility Lifecycle Manager               |
|  - Chrome Extension Native Messaging Host & HMAC-SHA256 Handshake                 |
|  - Background Task Queue Coordinator & Asynchronous Render Worker                 |
|  - Pure Cryptographic SHA-256 / Checksum Verification Service                     |
+-----------------------------------------------------------------------------------+
                                    │ (Process Spawning / Direct Pipes / C API)
+-----------------------------------▼-----------------------------------------------+
|  [NATIVE MEDIA ENGINE LAYER] (C++ / FFmpeg 9.0.2 Static / AMD AMF)                |
|  - Hardware-Accelerated Video Decoding (Direct3D 11 / DXVA2 / AMF)                |
|  - Complex Filtergraph Generator (Concatenation, Overlay, Transitions, Audio Mix) |
|  - Fast Proxy Transcoder (720p 1Mbps fast-decode streams)                         |
|  - Audio Peak Waveform Extractor                                                  |
|  - Strict Validation Harness (FFprobe Stream Integrity & Full Decode Test)       |
+-----------------------------------------------------------------------------------+
                                    │ (Win32 HWND Parenting)
+-----------------------------------▼-----------------------------------------------+
|  [INTEGRATED BROWSER WORKSPACE]                                                   |
|  Genuine Google Chrome (Win32 Child HWND in Isolated User Data Profile)           |
+-----------------------------------------------------------------------------------+
```

---

## 6. Migration and Hardening Plan

1. **Step 1 (Immediate - Milestone 0/1):**
   - Fix the 6 critical codebase issues (A through F) within the existing Rust and React architecture.
   - Remove all fake mocks, simulated timers, and hardcoded URLs.
2. **Step 2 (Milestone 2):**
   - Implement the asynchronous Render Worker daemon in `src-tauri/src/media_service/` to consume `QUEUED` jobs from SQLite.
   - Upgrade FFmpeg command generation to build full multi-track filtergraphs (`[0:v][1:v]overlay`, `[0:a][1:a]amix`).
3. **Step 3 (Milestone 3):**
   - Build the genuine conversational AI Film Production Agent with structured schema validation and persistent memory.
4. **Step 4 (Milestone 4):**
   - Harden in-workspace Chrome docking: eliminate silent fallback, support high-DPI scaling, and manage profile isolation.
5. **Step 5 (Milestone 5 - C++ Media Engine Transition):**
   - If real-time 4K multi-layer timeline scrubbing exceeds WebView2 video canvas performance, extract the video playback pipeline into a dedicated lightweight C++/Direct3D 11 overlay window docked directly beneath the timeline playhead.

---

## 7. Consequences and Compliance Verification

- **Workstation Compatibility:** The hybrid architecture operates efficiently within the 20 GB RAM and AMD Ryzen 7 / AMD Radeon configuration, utilizing AMD AMF GPU encoding and CPU fallback.
- **Licensing Compliance:** FFmpeg static binaries remain LGPL v2.1/v3 compliant. No proprietary or GPL-incompatible libraries are linked into the commercial distribution.
- **Zero Regressions:** Preserves all 24 passing verification test cases and eliminates the risk of introducing catastrophic regressions through an unnecessary rewrite.
