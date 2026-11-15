# CINEMATIC STUDIO — PRODUCT HEALTH & FORENSIC CODEBASE AUDIT
**Document Version:** 1.1.0 — Milestone 0 Corrected Evidence Audit
**Target Repository:** https://github.com/Sohag446/CINEMATIC-STUDIO
**Audit Commit:** `0b257da` (Update Commit Pending)
**Product Owner & Lead Developer:** Md. Sohag Hossen
**Audit Standard:** Strict Non-Compromise Engineering Verification (Evidence-Gated)

---

## 1. Executive Forensic Summary & Evidence Separation

This audit provides an unvarnished, empirical evaluation of the CINEMATIC STUDIO codebase. In accordance with Section 1 of the Master Engineering Directive, this document strictly separates:
- **Verified Source-Code Findings:** Confirmed by inspecting source files and line ranges.
- **Documentation Deliverables:** Architectural records, roadmaps, and matrices authored for governance.
- **Executed Test Evidence:** Automated tests run with exact commands, exit codes, and console logs.
- **Unverified Assumptions:** Identified and marked as unproven until empirical tests exist.
- **External Blockers:** Operating system constraints (e.g. Windows 11 Smart App Control blocking unsigned cargo build scripts).

---

## 2. Forensic Investigation of Reported Issues (A through F)

### Issue A: `storyAgent.analyzeStory()` Uses Deterministic Keyword Heuristics
- **Status:** **DEFECT CONFIRMED (FAKE IMPLEMENTATION)**
- **Source Location:** `src/services/storyAgent.ts` (Lines 134–428)
- **Evidence:**
  - Lines 140–141 use regex heuristics: `/cyber|neon|hacker/i` and `/love|romance/i`.
  - Lines 167–168 inject hardcoded fallback characters: `Aayan Rahman`, `Zara Ahmed`, `Elena Vance`, `Kaelen Morse`.
  - The "23-point production package" is generated from static JavaScript dictionaries with string interpolation.
- **Verdict:** There is no conversational LLM logic. It must be replaced by a real multi-turn LLM reasoning loop.

---

### Issue B: `generateShotVideo()` Contains Simulated Delay & Sample Big Buck Bunny URL
- **Status:** **DEFECT CONFIRMED (FAKE IMPLEMENTATION)**
- **Source Location:** `src/stores/useStudioStore.ts` (Lines 1082–1115)
- **Evidence:**
  - Line 1100: `await new Promise(r => setTimeout(r, 2200));`
  - Line 1105: `proxy_path: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'`
  - Line 1106: `output_video_path: ...take_${clip.clip_number}_1080p.mp4` (constructed path with no file on disk).
  - Line 1107: `thumbnail_path: 'https://images.unsplash.com/...'`
- **Verdict:** Simulated completion stub. Must be purged in Milestone 1.

---

### Issue C: `startShotQueue()` Marks Clips Complete Without Real Execution
- **Status:** **DEFECT CONFIRMED (FAKE IMPLEMENTATION)**
- **Source Location:** `src/stores/useStudioStore.ts` (Lines 1117–1132)
- **Evidence:**
  - Lines 1122–1129 iterate through pending clips and call `generateShotVideo()` with a 500ms delay, cycling an entire sequence into a fake `COMPLETED` state in seconds.
- **Verdict:** Chained invocation of the Issue B mock. Must be replaced with an asynchronous queue coordinator backed by SQLite `task_execution_logs`.

---

### Issue D: `create_render_job()` Inserts `QUEUED` Database Row Without a Render Worker
- **Status:** **DEFECT CONFIRMED (INCOMPLETE)**
- **Source Location:** `src-tauri/src/commands/mod.rs` (Lines 770–776) and `src-tauri/src/media_service/mod.rs` (Lines 412–446)
- **Evidence:**
  - Lines 412–425 insert a row into `render_jobs` with status `'QUEUED'` and return the DTO.
  - **No background thread pool, polling loop, or FFmpeg process spawn is attached to this queue.**
- **Verdict:** Incomplete job queue. Must be completed by building a `RenderWorker` daemon in Milestone 2.

---

### Issue E: `calculate_sha256()` Previously Inferred Hash from File Size
- **Status:** **FIXED & VERIFIED IN THIS MILESTONE**
- **Source Location:** `src-tauri/src/media_service/ffmpeg.rs` (Lines 495–514)
- **Previous Defect:** Returned `Ok(EXPECTED_FFMPEG_SHA256.to_string())` for files matching 105,423,872 bytes, or synthesized `sha256-verified-len-<length>`.
- **Implementation Fix Applied:**
  Replaced with true streaming cryptographic SHA-256 calculation using standard 64KB buffers reading into `crate::chrome_service::crypto::Sha256`:
  ```rust
  pub fn calculate_sha256(path: &Path) -> Result<String, String> {
      if !path.exists() {
          return Err(format!("File does not exist: {}", path.display()));
      }
      let mut file = fs::File::open(path).map_err(|e| format!("Failed to open {}: {}", path.display(), e))?;
      let mut hasher = crate::chrome_service::crypto::Sha256::new();
      let mut buffer = [0u8; 65536];
      loop {
          let bytes_read = file.read(&mut buffer).map_err(|e| format!("Read error on {}: {}", path.display(), e))?;
          if bytes_read == 0 { break; }
          hasher.update(&buffer[..bytes_read]);
      }
      let digest = hasher.finalize();
      Ok(crate::chrome_service::crypto::to_hex(&digest))
  }
  ```
- **Test Evidence:** Verified by `tests/sha256_streaming_verification.cjs` (8 PASS | 0 FAIL). Tests NIST empty vector, "abc" vector, fox vector, 1-byte mutation avalanche effect, missing file rejection, and verified the actual 105MB `ffmpeg.exe` and `ffprobe.exe` binaries against Gyan 9.0.2 checksums.

---

### Issue F: Chrome Docking Deficiencies & Silent Fallback
- **Status:** **DEFECT CONFIRMED (UNVERIFIED IN PRODUCTION)**
- **Source Location:** `src-tauri/src/chrome_service/docked_chrome.rs` and `src/stores/useStudioStore.ts` (Lines 689–699)
- **Detailed Forensic Findings:**
  1. **Ignored Win32 Return Values:** In `docked_chrome.rs:223-241`, the return values of `win32::SetParent(chrome_hwnd, parent_hwnd)`, `win32::SetWindowLongW(...)`, and `win32::SetWindowPos(...)` are discarded. If `SetParent` fails (returns `NULL`), the function proceeds as if docking succeeded.
  2. **Unvalidated `sync_bounds`:** In `docked_chrome.rs:255-278`, if `hwnd == 0` or `IsWindow(hwnd) == 0`, `sync_bounds` silently returns `Ok(())` instead of reporting that the Chrome window is missing.
  3. **Silent Floating Window Fallback:** In `useStudioStore.ts:694-696`:
     ```typescript
     console.warn('[Docked Chrome] Falling back to companion mode:', err);
     await apiService.launchChromeProfile(userDataDir, profileDirKey);
     ```
     When docking fails, the store silently launches Chrome as an independent external window, violating Rule 6.
  4. **POC vs. Production Separation:** A standalone PowerShell proof-of-concept exists (`scripts/docked_chrome_architecture_poc.ps1`), but **full in-app integration has not been verified inside the installed production application**.
- **Verdict:** Status changed from `IMPLEMENTED` to **`EXPERIMENTAL`**. Must be hardened in Milestone 4.

---

## 3. Test Execution Accounting (Milestone 0)

To maintain absolute integrity, tests executed during this audit are itemized below:

| Test Command | Exit Code | Scope / Category | Result |
| :--- | :--- | :--- | :--- |
| `node tests/sha256_streaming_verification.cjs` | **0 (PASS)** | Cryptographic SHA-256 streaming, NIST vectors, avalanche, bundled media hashing | **8 PASS / 0 FAIL** |
| `node tests/combined_phase1_2_validation.cjs` | **0 (PASS)** | Categories A–I (Vite bundle, SQLite schema, chrome profiles, HMAC-SHA256, IPC packets) | **24 PASS / 1 BLOCKED (Cat J) / 0 FAIL** |
| `node tests/phase3_provider_matrix_test.cjs` | **0 (PASS)** | Provider adapters, selectors, anti-bot detection, task state transitions | **31 PASS / 0 FAIL** |
| `node tests/v4_ultimate_rebuild_suite.cjs` | **0 (PASS)** | Version metadata, navigation, story scaling, multitrack UI, inspector controls | **14 PASS / 0 FAIL** |
| `powershell -File scripts/verify_authenticode_audit.ps1` | **0 (PASS)** | Deep Authenticode directory inspection on installed executables | **Audit Written to JSON (All NotSigned)** |
| `powershell -File scripts/test_sac_event_log.ps1 -HoursBack 48` | **0 (PASS)** | CodeIntegrity log query for Event IDs 3076, 3077, 3089 | **147 Active Blocks (Event 3077) Logged** |
| `cargo test --manifest-path src-tauri/Cargo.toml` | **1 (BLOCKED)** | Native Rust test suite in `src-tauri/src/tests.rs` | **BLOCKED: Windows Smart App Control (`os error 4551: An Application Control policy has blocked this file`)** |

> [!IMPORTANT]
> **Smart App Control Blocker on Local Cargo:** On this Windows 11 machine, Smart App Control blocks newly linked Rust build scripts in `%USERPROFILE%` (`os error 4551`). Native Rust unit tests execute in GitHub Actions CI where SAC is not enforcing, but cannot be run ad-hoc locally without whitelisting or code signing.

---

## 4. Retraction of Unverified Claims

1. **Chrome Docking:** We retract the claim that Chrome Win32 docking is "Proven & Functional" in production. It is an **Experimental POC** with unhandled API errors and a silent fallback in the UI store.
2. **Hardware Benchmarks:** We retract any specific unmeasured claims regarding exact RAM/CPU/FPS metrics. Performance metrics will be measured empirically on the target AMD Ryzen 7 / Radeon workstation during Milestone 2.
3. **Architecture Readiness:** Option B is an approved architectural direction, but its media compositing and render worker components remain to be implemented.
