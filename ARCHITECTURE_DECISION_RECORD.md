# ARCHITECTURE DECISION RECORD (ADR)
## ADR-001: Desktop Framework, Media Engine & In-App Chrome Hosting Architecture

**Status:** APPROVED FOR MILESTONE 1 (Subject to Chrome Production Docking & Render Engine Evidence Gates)
**Date:** 2026-11-15 (Updated Milestone 0 Verification)
**Decision Maker:** Principal Software Architect & Md. Sohag Hossen (Product Owner)
**Target Environment:** Windows 11 x64 (Primary Workstation: AMD Ryzen 7 5000, AMD Radeon Graphics, 20 GB RAM)

---

## 1. Context and Problem Statement

CINEMATIC STUDIO is conceived as a high-performance, professional desktop AI film production studio and non-linear video editor (NLE). The application has three demanding architectural pillars:
1. **Real In-Workspace Chrome Browser Hosting:** Running a genuine Google Chrome instance visibly docked inside the desktop workspace for web-based AI video generators (e.g., Google Flow/Veo, Runway) and conversational assistants, with bidirectional IPC.
2. **Professional Multi-Track NLE Engine:** Providing sub-frame audio scrubbing, multi-layer video composition (V1–V3, A1–A3), smooth 60fps preview, and real-time inspector transforms without UI lag or memory blowouts.
3. **Conversational AI Film Production Agent:** Managing multi-turn creative dialogue, persisting structured Production Bibles, and orchestrating generation queues.

The existing codebase is implemented in **Tauri 2 (Rust 1.84 backend + WebView2 / React 18 / TypeScript frontend + SQLite)**. However, high-end professional desktop NLEs (such as Adobe Premiere Pro, DaVinci Resolve, and Shotcut) typically leverage **C++20/23, Qt 6, and native FFmpeg libraries (libavcodec, libavfilter, libavformat)**.

We must evaluate two viable architectural paths:
- **Option A:** Complete Native Qt 6 / C++20 desktop rewrite.
- **Option B:** Hybrid Architecture (Hardened Rust core services + Dedicated Native C++ / FFmpeg Media Engine + React/Tauri NLE shell with strict IPC boundaries).

---

## 2. Comparative Technical Evaluation (Evidence-Gated)

| Evaluation Criteria | Option A: Full Native Qt 6 / C++20 Rewrite | Option B: Hybrid Architecture (Rust Core + C++ Media Engine + Tauri) |
| :--- | :--- | :--- |
| **Maintainability** | **Moderate:** C++ memory management (RAII, smart pointers) requires extensive discipline. Qt QML/Widgets codebases can become complex over time. | **High:** Rust guarantees memory safety, race-free concurrency, and strict type safety for background jobs, SQLite, and IPC. React provides rapid UI iteration. |
| **Performance & Latency** | **Superior:** Direct GPU hardware rendering (Vulkan / Direct3D 11 / OpenGL via Qt RHI) directly in the viewport. Zero IPC overhead for preview rendering. | **High (Estimated):** Offloads heavy decoding/compositing to a dedicated C++ engine or native FFmpeg worker, streaming frames to an accelerated viewport. |
| **Memory Footprint** | **Low (~120–250 MB baseline):** Pure native compiled C++ executable without WebView2 runtime overhead. | **Moderate (~350–650 MB baseline):** WebView2 memory overhead adds ~200 MB, but remains well within the 20 GB system RAM ceiling. |
| **Stability & Crash Isolation** | **Moderate:** A segfault in C++ video decoding or an FFmpeg filter crashes the entire desktop application and UI. | **Superior:** The media engine runs out-of-process or in a sandboxed worker. A decoder crash does not kill the UI or corrupt project state. |
| **Migration Risk & Schedule** | **Extreme (High Risk):** Rewriting the entire UI, state store, SQLite migrations, Chrome extension IPC, and window management from scratch will stall feature delivery for 4–6 months. | **Low (Controlled Transition):** Preserves working, tested systems (SQLite migrations, HMAC-SHA256 IPC), focusing immediately on replacing mock stubs. |
| **Browser Docking (Win32 HWND)** | **Complex & High Risk:** Embedding external Win32 HWND via `QWidget::createWindowContainer` has documented resize flicker, focus traps, and keyboard input routing bugs. | **Experimental (POC Demonstrated; Production Integration Incomplete):** Win32 `SetParent` was proven in standalone PowerShell POC (`docked_chrome_architecture_poc.ps1`), but **the Rust implementation in `docked_chrome.rs` ignores Win32 return values, has unvalidated bounds sync, and silently falls back to floating Chrome on error in `useStudioStore.ts`. It is NOT yet proven in the installed application.** |
| **Developer Complexity** | **High:** Requires dual expertise in advanced modern C++20/Qt and deep FFmpeg C APIs. | **Manageable:** Clean division of labor: React/TypeScript for user experience, Rust for reliable system services, C++/FFmpeg for heavy media processing. |
| **Commercial Licensing Compliance** | **Complex & Costly:** Qt 6 is dual-licensed under Commercial (~$3,950/dev/year) or LGPLv3 (strictly requires dynamic linking, providing object files for relinking, and user rights to replace Qt DLLs). | **Clean:** Rust crates (MIT/Apache 2.0) and React (MIT). Standalone FFmpeg executable execution complies with LGPL/GPL arm's-length process rules. |
| **Cross-Platform (macOS / Linux)** | **Native:** Qt runs natively across Windows, macOS, and Linux out of the box. | **Supported:** Tauri 2 natively supports Windows, macOS, and Linux. |

---

## 3. Deep Architectural Analysis of Option A (Full Qt 6 Rewrite)

### Advantages of Option A
1. **Direct Render Pipeline Efficiency:** Qt's Rendering Hardware Interface (RHI) allows direct Direct3D 11 and Vulkan texture sharing with FFmpeg's hardware decoders (AMD AMF / DXVA2). Frames decoded by the GPU can be presented directly on the screen without copying memory across process boundaries.
2. **Native OS Controls:** Qt Widgets provide 100% native Windows controls, menus, and high-DPI scaling behavior without DOM emulation.
3. **Low Idle Footprint:** Eliminates the Chromium WebView2 rendering engine from the main desktop shell.

### Critical Disadvantages & Disqualifying Risks of Option A
1. **The In-Workspace Chrome Requirement:** The user's primary requirement is hosting a genuine Google Chrome instance inside the workspace for web AI workflows. In Qt, embedding an external foreign HWND via `QWidget::createWindowContainer` has severe documented bugs on Windows 11 (keyboard focus capture traps, mouse wheel routing failures, and repaint tearing when dragging dock splitters).
2. **Catastrophic Project Delay:** Rewriting the SQLite migrations, HMAC-SHA256 pairing engine, and CapCut multi-track timeline into C++ QML/Widgets would discard months of working code and delay production readiness indefinitely.
3. **Crash Vulnerability:** Video editing software that runs experimental third-party media codecs inside the main GUI process is prone to unexpected crashes that destroy user work.
4. **Licensing Constraints:** Using Qt 6 commercially without paying ~$3,950/dev/year forces the project under LGPLv3, requiring strict adherence to dynamic linking and enabling end-users to relink against modified Qt versions.

---

## 4. Deep Architectural Analysis of Option B (Hybrid Architecture)

### Advantages of Option B
1. **Process Isolation & Crash Resilience:** Heavy FFmpeg rendering and media analysis run in independent worker processes. If an invalid video stream crashes FFmpeg, the main application catches the exit code, logs the error, and leaves the user's project and timeline completely intact.
2. **Rapid UI Evolution:** The CapCut/Premiere-style multi-track timeline, inspector controls, and dark theme are rendered efficiently using React virtualized lists and Tailwind CSS.
3. **Immediate Focus on Real Functionality:** Instead of spending months rebuilding buttons in Qt, engineering effort is immediately directed to replacing the fake heuristics in `storyAgent.ts`, removing mock delays in `generateShotVideo()`, and implementing the background render worker.

### Critical Realities of Option B (Chrome Docking is NOT Yet Solved)
While Option B is the recommended path, **we explicitly reject the false claim that Chrome Win32 docking is already "proven and functional" in production**:
- The standalone POC demonstrated Win32 `SetParent` feasibility in a separate script (`docked_chrome_architecture_poc.ps1`), but the actual production code in `src-tauri/src/chrome_service/docked_chrome.rs`:
  1. Ignores the return value of `SetParent()`.
  2. Ignores the return value of `SetWindowLongW()`.
  3. Ignores the return value of `SetWindowPos()`.
  4. Returns `Ok(())` from `sync_bounds` even if the HWND is invalid.
  5. Still contains a silent fallback in `useStudioStore.ts:694-696` that launches a floating companion Chrome window upon failure!
- **Chrome in-workspace docking in Option B must be treated as EXPERIMENTAL until comprehensive acceptance tests pass inside the actual installed application.**

---

## 5. Licensing & Commercial Distribution Compliance

### 5.1 FFmpeg Compliance
- **Current Distribution:** CINEMATIC STUDIO bundles official static builds of FFmpeg (Gyan.dev 9.0.2 Essentials).
- **Licensing Reality:** Gyan static builds include GPL v3 libraries (e.g. `libx264`, `libx265`).
- **Legal Compliance:** In accordance with Free Software Foundation (FSF) guidelines, executing a GPL binary as an independent external process via standard OS command line and pipes (`std::process::Command`) constitutes arm's-length communication between separate programs. This preserves the proprietary/commercial status of CINEMATIC STUDIO.
- **Linkage Warning:** Linking FFmpeg C libraries directly into a proprietary C++ or Rust binary via static or dynamic linkage would trigger the GPL "viral" clause, requiring the entire CINEMATIC STUDIO codebase to be licensed under GPL v3.

### 5.2 Qt 6 Licensing
- **Commercial:** Requires paid commercial subscription from The Qt Company (~$3,950/developer/year).
- **LGPL v3:** Requires dynamic linking of all Qt libraries, providing object files for user relinking, and zero use of Qt modules restricted to GPL (e.g. Qt Charts, Qt Virtual Keyboard).

---

## 6. Decision & Migration Plan

**Option B (Hybrid Architecture) is approved for execution, subject to strict evidence gates:**

```
[MIGRATION ROADMAP]
├── Step 1 (Milestone 1): Purge all fake stubs (A through F), eliminate silent floating Chrome fallback,
│   and verify real streaming SHA-256 calculation.
├── Step 2 (Milestone A): Strictly enforce No-AI-API mandate, declare Browser Agent Dispatcher,
│   and harden Win32 native Chrome docking (asserted return codes and High-DPI support).
├── Step 3 (Milestone B): Complete genuine embedded Chrome lifecycle and website capability registry.
├── Step 4 (Milestone C): Implement conversational narrative agent via in-workspace browser automation.
├── Step 5 (Milestone D): Implement Google Flow / Veo video generation and FFprobe media verification.
├── Step 6 (Milestone E): Polish multitrack NLE timeline and playback monitor.
└── Step 7 (Milestone F): Implement asynchronous background FFmpeg render daemon.
```

---

# Architecture Decision Record 002 (ADR-002)

**Title:** Strict No-AI-API, In-Workspace Browser Automation Architecture
**Status:** APPROVED & ADOPTED (Milestone A)
**Date:** 2026-11-15
**Deciders:** Md. Sohag Hossen (Product Owner), Principal Architect

## 1. Context & Problem Statement
Previous drafts and prototype code attempted to integrate direct third-party LLM inference endpoints (OpenAI API, Gemini API, Anthropic API, local Ollama server). This introduced:
1. Hard dependency on external API credentials, API key configuration, and token billing accounts.
2. Fragile network dependencies on external HTTP inference endpoints.
3. Violation of the fundamental product vision: CINEMATIC STUDIO must be a professional film-production environment powered by an autonomous agent interacting with AI websites through a genuine embedded Google Chrome browser.

## 2. Decision: Absolute No-AI-API Architecture
1. **Total Prohibition of Direct AI APIs:** The software will NOT depend on, require, or make direct HTTP calls to OpenAI, Gemini, Anthropic, Groq, Ollama, or any external LLM inference API.
2. **Visible In-Workspace Chrome Integration:** Genuine `chrome.exe` is hosted as a native child window inside the application's AI Workspace container via Win32 `SetParent`.
3. **Browser Automation Bridge:** Communication with AI websites (ChatGPT, Gemini, Claude, Google Flow / Veo) is executed strictly via:
   `CINEMATIC STUDIO Agent -> Tauri IPC -> Native Messaging Host -> Chrome Extension Background -> Website Adapter -> Website DOM -> Response Extraction -> Project State`.
4. **Autonomous Production Supervisor:** The desktop application maintains the production state machine, prepares production briefs, dispatches tasks, observes web UI progress, captures downloads, probes media files with FFprobe, and assembles the NLE timeline.
5. **Human Action Gating:** When web anti-bot challenges (CAPTCHA, Cloudflare Turnstile), login expiration, or confirmation prompts occur, the application halts automation, sets status to `HUMAN_ACTION_REQUIRED`, and allows the operator to act directly in the visible embedded Chrome window.

## 3. Consequences
- **Positive:**
  - Zero user requirement for paid API keys or developer accounts.
  - Users leverage their existing browser sessions and subscription tiers on ChatGPT, Gemini, Claude, and Google Flow.
  - Complete transparency: users see the browser and can inspect or take control at any time.
- **Negative / Constraints:**
  - Automation depends on web UI stability; website adapters must declare robust selectors and fallbacks.
  - Native Chrome child-window embedding must be rigorously hardened against High-DPI scaling, resize, and window lifecycle crashes.

## 4. Mathematical Coordinate Transformation & High-DPI Specification

To embed `chrome.exe` (`Chrome_WidgetWin_1`) reliably inside the Tauri desktop window without visual distortion or clipping, coordinates are transformed from the frontend DOM to native Win32 device pixels:

1. **Native Parent Window Resolution:** The Tauri window HWND ($H_{parent}$) is queried via `window.hwnd()` in Tauri 2. Both Tauri and Google Chrome operate under Windows Per-Monitor V2 DPI awareness (`DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2`).
2. **DOM Viewport Origin:** In WebView2, `element.getBoundingClientRect()` yields coordinates in CSS logical pixels relative to the DOM viewport. Because the WebView2 control begins at client coordinate $(0, 0)$ of $H_{parent}$, the DOM viewport origin aligns with the native parent client origin.
3. **Single DPI Scaling Factor:** Monitor DPI is queried dynamically from Windows via `GetDpiForWindow(parent_hwnd)`. The scale factor is $S = \text{DPI} / 96.0$. To prevent double scaling, the frontend transmits raw CSS logical pixels, and the native Rust layer applies scaling once:
   $$\text{phys\_x} = \text{round}(x_{css} \times S)$$
   $$\text{phys\_y} = \text{round}(y_{css} \times S)$$
   $$\text{phys\_w} = \text{round}(w_{css} \times S)$$
   $$\text{phys\_h} = \text{round}(h_{css} \times S)$$
4. **Client Boundary Clamping:** Parent client dimensions are queried via `GetClientRect(parent_hwnd)`. The child window is clamped so it never renders outside the client area or with invalid negative dimensions.
5. **Concrete Example:**
   - Monitor DPI: 144 (150% scaling, $S = 1.50$).
   - Parent client size: $1920 \times 1080$ physical pixels.
   - Frontend DOM rect: $x_{css} = 320, y_{css} = 60, w_{css} = 800, h_{css} = 600$.
   - Transformation:
     $X_{phys} = \text{round}(320 \times 1.5) = 480$ px.
     $Y_{phys} = \text{round}(60 \times 1.5) = 90$ px.
     $W_{phys} = \text{round}(800 \times 1.5) = 1200$ px.
     $H_{phys} = \text{round}(600 \times 1.5) = 900$ px.
   - SetWindowPos bounds: $(480, 90, 1200, 900)$ in parent client space. Fits within $(1920, 1080)$ client area.
6. **Dynamic DPI & Window Movement:** When the window moves across monitors with different DPIs, Windows sends `WM_DPICHANGED`. The frontend `ResizeObserver` and `window.addEventListener('resize')` trigger `syncDockedBounds`, recalculating bounds dynamically with the new monitor's DPI.
