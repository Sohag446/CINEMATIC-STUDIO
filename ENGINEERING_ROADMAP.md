# CINEMATIC STUDIO — MASTER ENGINEERING ROADMAP (V5.0.0)
**Document Version:** 1.0.0 — Phased Execution Plan
**Target Platform:** Windows 11 x64
**Product Owner & Lead Developer:** Md. Sohag Hossen
**Baseline Commit:** `455f333f702d69848fb8ebd40f99d497c17a527a`

---

## 1. Roadmap Overview & Phased Architecture

In accordance with Section 11 of the Master Engineering Directive, product transformation proceeds in **seven strictly gated milestones**. No milestone may be marked complete without passing automated test suites, manual verification on live Windows hardware, and owner review.

```
+-----------------------------------------------------------------------------------+
| MILESTONE 0: Forensic Audit & Architecture Decision [COMPLETE]                    |
| - Line-by-line inspection of all mock stubs (A through F)                         |
| - Approved ADR-001: Hybrid Rust/React/C++ Architecture                            |
| - Delivery of Audit, Matrix, ADR, Limitations & Roadmap Documents                 |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 1: Professional Desktop Foundation & Mock Elimination                   |
| - Eradication of Big Buck Bunny, setTimeout(2200), and fake character heuristics  |
| - Fix calculate_sha256() to stream real cryptographic hashes                      |
| - Eliminate silent floating Chrome fallback (strict error reporting)             |
| - Professional Dark NLE theme, native menus, dockable panels, Bengali/English UI  |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 2: Real Media Engine & Video Editing Core                               |
| - Asynchronous Render Worker daemon consuming SQLite QUEUED jobs                  |
| - Real multi-track timeline composition (V1-V3, A1-A3) via FFmpeg filtergraphs   |
| - True composited Preview Monitor (WebGL / Canvas / D3D11 frame presentation)    |
| - Audio waveform peak extraction and sub-frame scrubbing                          |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 3: Genuine Conversational AI Film Production Agent                      |
| - Multi-turn conversational LLM loop (OpenAI, Anthropic, Gemini, Ollama)          |
| - Interactive clarification questioning & user confirmation flow                  |
| - Structured Production Bible & Character Continuity Locks (schema validated)     |
| - Shot design, beat sheet, and provider-specific prompt generator                 |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 4: Embedded Chrome Production Workspace Hardening                       |
| - High-DPI multi-monitor Win32 HWND docking synchronization                      |
| - Isolated Chrome user data profiles (no access to user default profile)          |
| - Native Messaging Host automated browser task execution (Veo, ChatGPT, Claude)   |
| - Real download capture, media verification, and auto-import into NLE             |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 5: Advanced Editing & Studio Features                                   |
| - Transitions (Cross Dissolve, Wipe, Dip to Black) via FFmpeg `xfade`             |
| - Keyframed inspector transforms (Scale, Position, Opacity, Rotation)             |
| - Multi-channel audio mixer (`amix`), volume envelopes, and fade handles         |
| - Color correction (LUT import, 3-way color wheels, exposure/contrast)            |
+-----------------------------------------------------------------------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------------+
| MILESTONE 6: Commercial Product Readiness & Public Release                        |
| - Dual NSIS & WiX installer signing via SSL.com eSigner / Certum SimplySign       |
| - Full Windows 11 Smart App Control acceptance testing (Zero Event 3077)          |
| - Crash recovery, project repair, and automated diagnostics                       |
| - Release v5.0.0 publication upon explicit owner sign-off                         |
+-----------------------------------------------------------------------------------+
```

---

## 2. Milestone Deep-Dive & Acceptance Criteria

### Milestone 0: Forensic Audit & Architecture Decision (Status: COMPLETE)
- **Deliverables:**
  - `PRODUCT_HEALTH_AUDIT.md`: Line-by-line exposure of Issues A, B, C, D, E, F.
  - `FEATURE_IMPLEMENTATION_MATRIX.md`: Complete inventory of all system features with source evidence.
  - `ARCHITECTURE_DECISION_RECORD.md`: Comprehensive evaluation of Native Qt 6 vs. Hybrid Architecture; approved ADR-001.
  - `KNOWN_LIMITATIONS.md`: Hardware, security, and storage constraints cataloged.
  - `ENGINEERING_ROADMAP.md`: Phased execution blueprint.
- **Acceptance Gate:** All 5 governance documents authored, cross-verified with source code, and reviewed.

---

### Milestone A: No-AI-API Architecture Correction & Native Chrome Docking Hardening [COMPLETED & VERIFIED]
- **Primary Goal:** Strictly enforce the No-AI-API mandate, declare the Browser Agent Dispatcher pipeline, harden Win32 native Chrome docking with asserted return codes, implement mathematical High-DPI coordinate transformation, prevent orphan process leaks, and add native Rust test CI gates.
- **Status:** **COMPLETED** (Verified by `tests/milestone_a_docking_and_no_api_suite.cjs` 16 PASS / 0 FAIL / 3 BLOCKED runtime, `tests/milestone1_mock_elimination_suite.cjs` 9 PASS / 0 FAIL, and Rust CI test suite).
- **Completed Tasks:**
  1. **Strict No-AI-API Enforcement:** Eradicated all direct HTTP `fetch` calls to OpenAI, Gemini, and Ollama inference endpoints in `src/services/storyAgent.ts`. Completely removed `apiKey` configuration fields.
  2. **Browser Agent Dispatcher Architecture:** Defined `SupportedAIWebsite`, `BrowserAgentDispatchTask`, and `IBrowserAgentDispatcher` representing the intended browser-extension bridge without external API dependencies.
  3. **Genuine Story Agent Unit Tests:** Authored real tests executing production `storyAgent.sendStoryMessage()` covering (1) No dispatcher supplied, (2) Browser unavailable, (3) Browser available and dispatch succeeds, (4) Browser dispatch fails, (5) Browser response is extracted, and (6) Session messages and timestamps are updated.
  4. **Win32 SetParent Hardening:** Implemented `SetLastError(0)` and `GetLastError()` inspection to correctly handle the ambiguous NULL return of `SetParent` without false alarms.
  5. **Win32 SetWindowLongW & SetWindowPos Hardening:** Implemented strict return-code validation and Win32 error formatting.
  6. **Truthful `sync_bounds()` & `set_visible()`:** Added `IsWindow(hwnd)` check and explicit error reporting if Chrome is closed or destroyed; prevented silent false success in visibility toggling.
  7. **Leak-Free Process Cleanup:** Implemented `terminate_pid(pid)` to immediately terminate orphan Chrome processes and reset state if any subsequent docking step fails.
  8. **High-DPI Coordinate Transformation:** Implemented `transform_css_to_parent_client` querying `GetDpiForWindow` and `GetClientRect` to scale CSS layout coordinates into physical device pixels across 100%, 125%, 150%, and 200% scaling, avoiding double scaling and enforcing parent client boundary clamping.
  9. **Dedicated Native Rust CI Test Gate:** Added `cargo test --verbose -- --nocapture` and Milestone A regression suites into GitHub Actions workflows (`windows-installer-build.yml` and `phase1-native-verification.yml`).
  10. **Governance Documentation:** Authored ADR-002 in `ARCHITECTURE_DECISION_RECORD.md` and updated matrix and limitation catalogs.
- **Automated Verification:**
  - `tests/milestone_a_docking_and_no_api_suite.cjs`: 16 PASS / 0 FAIL / 3 BLOCKED (Truthfully Reported).
  - `tests/milestone1_mock_elimination_suite.cjs`: 9 PASS / 0 FAIL.
  - `tests/sha256_streaming_verification.cjs`: 10 PASS / 0 FAIL.
  - `tests/v4_ultimate_rebuild_suite.cjs`: 14 PASS / 0 FAIL.
  - `src-tauri` Rust unit tests: 26 PASS in CI.
  - `npm run build`: Clean TypeScript compile (0 errors).

---

### Milestone 1: Professional Desktop Foundation & Mock Elimination [COMPLETED & VERIFIED]
- **Primary Goal:** Purge all simulated delays, mock video URLs, and fake heuristics; establish a rock-solid professional NLE shell.
- **Status:** **COMPLETED** (Verified by `tests/milestone1_mock_elimination_suite.cjs` 9/9 PASS, `tests/sha256_streaming_verification.cjs` 10/10 PASS).
- **Completed Tasks:**
  1. **Fixed `calculate_sha256()`:** Rewrote in `src-tauri/src/media_service/ffmpeg.rs` using streaming 64KB buffers with pure-Rust `Sha256`. Verified across NIST vectors, 1-byte avalanche, block boundaries, and bundled ffmpeg/ffprobe binaries.
  2. **Eradicated Fake Shot Video Generator:** Removed all occurrences of `BigBuckBunny.mp4`, `setTimeout(2200)`, and Unsplash placeholder URLs from `src/stores/useStudioStore.ts`. Implemented truthful lifecycle (`WAITING_FOR_PROVIDER` / `HUMAN_ACTION_REQUIRED`) and `verifyAndCompleteClip` requiring FFprobe-verified media file.
  3. **Eliminated Silent Chrome Docking Fallback:** Removed silent companion mode launch. Win32 docking errors now set `dockChromeError`, keep `isChromeDocked: false`, and present explicit retry / fallback actions.
  4. **Provider-Independent Narrative Agent:** In `src/services/storyAgent.ts`, replaced regex keyword matching with `LLMProviderConfig`, `ConversationalStorySession`, `sendStoryMessage`, and schema validation. Truthfully requires configuration if no provider API key/endpoint is set.
  5. **Professional Desktop Foundation:** Implemented bilingual localization foundation (`src/services/localization.ts` with English and Bengali / বাংলা), added Bengali to New Project modal, and polished Premiere/DaVinci dark theme.
- **Automated Verification:**
  - `tests/milestone1_mock_elimination_suite.cjs`: 9 PASS / 0 FAIL.
  - `tests/sha256_streaming_verification.cjs`: 10 PASS / 0 FAIL.
  - `tests/v4_ultimate_rebuild_suite.cjs`: 14 PASS / 0 FAIL.
  - `tests/combined_phase1_2_validation.cjs`: 24 PASS / 1 BLOCKED (SAC) / 0 FAIL.
  - `tests/phase3_provider_matrix_test.cjs`: 31 PASS / 0 FAIL.

---

### Milestone 2: Real Media Engine & Video Editing Core
- **Primary Goal:** Implement an asynchronous background render worker and multi-track compositing engine.
- **Key Tasks:**
  1. **Render Worker Daemon:**
     - Author `src-tauri/src/media_service/worker.rs`.
     - Implement a background loop in Rust that polls SQLite for `QUEUED` jobs.
     - Execute FFmpeg with real-time progress parsing (`frame=`, `fps=`, `time=`) emitted via Tauri events.
  2. **Complex Filtergraph Generator:**
     - Replace simple concat scripts with real FFmpeg filtergraphs supporting video layering (`[0:v][1:v]overlay=x:y`), track transitions, and audio mixing (`[0:a][1:a]amix=inputs=2`).
  3. **Composited Preview Monitor:**
     - Upgrade `PreviewMonitor.tsx` to composite active V1, V2, and V3 clips based on playhead position, scale, opacity, and coordinates.
  4. **Audio Waveform Generation:**
     - Generate audio peak cache files (`.dat`) on media import for visual waveform rendering in `MultitrackTimeline.tsx`.
- **Automated Verification:**
  - `tests/render_worker_queue_test.cjs`: Verifies job creation, state transitions, progress events, and completed file integrity.
  - `tests/multi_track_composition_test.cjs`: Tests 3-layer video composition with real fixture media.

---

### Milestone 3: Genuine Conversational AI Film Production Agent
- **Primary Goal:** Replace regex-based story analysis with a true multi-turn conversational AI Agent.
- **Key Tasks:**
  1. **Conversational Engine (`src/services/aiAgent/`):**
     - Integrate modular LLM provider client supporting OpenAI, Anthropic, Google Gemini, and local Ollama.
     - Implement interactive discovery chat: Agent asks targeted questions regarding genre, tone, visual style, character traits, and target duration.
  2. **Production Bible Generator:**
     - Use structured JSON Schema outputs to populate `CharacterBible`, `EnvironmentBible`, and `CinematographyRule` models.
     - Persist the Bible into SQLite with full revision history and rollback.
  3. **Scene & Shot Breakdown Engine:**
     - Generate detailed shot lists with continuity constraints, camera movements, and provider-specific prompts.
- **Automated Verification:**
  - `tests/story_agent_conversation_test.cjs`: Tests multi-turn dialogue state machine and schema validation.
  - `tests/continuity_lock_test.cjs`: Validates that locked character traits are strictly enforced across all generated shot prompts.

---

### Milestone 4: Embedded Chrome Production Workspace Hardening
- **Primary Goal:** Make in-app Chrome hosting production-reliable and link automated task execution to the NLE.
- **Key Tasks:**
  1. **DPI-Aware Win32 Docking:**
     - Handle `WM_DPICHANGED` and monitor migration in `docked_chrome.rs`.
     - Ensure zero window clipping when docking into custom layouts.
  2. **Profile Isolation:**
     - Ensure Chrome runs strictly within dedicated project user data directories (`%LOCALAPPDATA%\CinematicStudio\ChromeProfiles\<id>`), never touching the user's personal browser data.
  3. **Automated Download Ingestion:**
     - Monitor the profile's `Downloads/` directory via filesystem watcher (`notify` crate).
     - When a generated video finishes downloading, verify file integrity, run FFprobe, generate proxy, and insert clip into the timeline automatically.
- **Automated Verification:**
  - `tests/chrome_docking_lifecycle_test.cjs`: Verifies docking, resizing, hiding, showing, and closing without crashes.
  - `tests/download_ingestion_test.cjs`: Simulates video download and verifies automatic NLE asset registration.

---

### Milestone 5: Advanced Editing & Studio Features
- **Primary Goal:** Deliver a non-linear video editing experience comparable to professional tools.
- **Key Tasks:**
  1. **Transitions:** Integrate FFmpeg `xfade` for Cross Dissolve, Dip to Black, Wipe, and Slide.
  2. **Keyframing:** Support animation curves for Scale, Position, and Opacity in `DesktopInspector.tsx`.
  3. **Audio Controls:** Volume envelopes, fade in/out handles, and multi-track audio bus mixing.
  4. **Color Grading:** Basic 3-way color wheels (Lift, Gamma, Gain), temperature, tint, and 3D LUT (.cube) import via FFmpeg `lut3d`.
- **Automated Verification:**
  - `tests/advanced_transitions_test.cjs`: Verifies rendering with transition filtergraphs.
  - `tests/keyframe_interpolation_test.cjs`: Validates bezier and linear transform interpolation.

---

### Milestone 6: Commercial Product Readiness & Public Release
- **Primary Goal:** Hardened packaging, verified digital signatures, and Smart App Control compliance.
- **Key Tasks:**
  1. **Authenticode Code Signing:**
     - Connect SSL.com eSigner or Certum SimplySign credentials to GitHub Secrets.
     - Sign all 7 executable targets pre- and post-packaging.
  2. **Smart App Control Acceptance:**
     - Execute live Windows 11 SAC testing protocol across all 8 core workflows.
     - Verify zero Code Integrity Event 3077 occurrences.
  3. **Commercial Release v5.0.0:**
     - Conduct end-to-end acceptance testing with product owner Md. Sohag Hossen.
     - Publish official v5.0.0 release.
- **Automated Verification:**
  - `scripts/verify_authenticode_audit.ps1`: Full cryptographic signature and timestamp audit.
  - `scripts/test_sac_event_log.ps1`: Code integrity operational event log audit.
