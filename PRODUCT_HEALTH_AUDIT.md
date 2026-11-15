# CINEMATIC STUDIO — PRODUCT HEALTH & FORENSIC CODEBASE AUDIT
**Document Version:** 1.0.0 — Milestone 0 Forensic Audit  
**Target Repository:** https://github.com/Sohag446/CINEMATIC-STUDIO  
**Audit Commit:** `455f333f702d69848fb8ebd40f99d497c17a527a` on branch `master`  
**Product Owner & Lead Developer:** Md. Sohag Hossen  
**Audit Standard:** Strict Non-Compromise Engineering Verification  

---

## 1. Executive Forensic Summary

A comprehensive, line-by-line static and dynamic forensic audit of the entire CINEMATIC STUDIO repository was conducted across Rust backend services, React/TypeScript UI modules, SQLite schemas, native Win32 window hosting, Chrome extension subsystems, and CI/CD packaging pipelines.

The audit established that while the structural scaffolding, data models, Win32 Chrome docking proof-of-concept, and basic CapCut-style timeline UI exist in the repository, **critical core product workflows currently rely on placeholder heuristics, simulated timers, and mock assets**.

In accordance with Section 1 of the Master Engineering Directive (*"Never mark a feature complete unless it is implemented and tested. Never use sample videos, fake file paths, mock timers, hardcoded completion states, or placeholder data as production functionality"*), this audit exposes every simulated mechanism and defines the exact engineering work required to replace each with real, production-grade functionality.

---

## 2. Investigation of Reported Core Code Issues

### Issue A: `storyAgent.analyzeStory()` Uses Deterministic Keyword Heuristics Instead of Real AI
- **Location:** `src/services/storyAgent.ts` (Lines 134–428)
- **Source Inspection Evidence:**
  ```typescript
  // src/services/storyAgent.ts:139-141
  const isCyberpunk = /cyber|neon|hacker|ai|neural|blade|matrix|android|enforcer|dystopian/i.test(cleanText);
  const isRomantic = /love|romance|emotional|heart|couple|relationship|tear|teenage|bangladesh/i.test(cleanText);
  
  // Lines 167-168: Hardcoded fallback names
  const leadCharName = detectedNames[0] || (isRomantic ? 'Aayan Rahman' : isCyberpunk ? 'Elena Vance' : 'Commander Aris');
  const partnerCharName = detectedNames[1] || (isRomantic ? 'Zara Ahmed' : isCyberpunk ? 'Kaelen Morse' : 'Dr. Lyra Cross');
  ```
- **Forensic Finding:** There is **zero conversational AI logic** in `storyAgent.ts`. Clicking "Analyze Narrative" executes purely local JavaScript regex checks and string template interpolation. The "23-point production package" is generated from pre-baked static dictionaries rather than an intelligent reasoning model.
- **Root Cause:** Placeholder implementation deployed to satisfy UI layout tests without an active LLM backend or conversational state machine.
- **Remediation Plan:** Replace `storyAgent.ts` with a genuine conversational agent architecture supporting OpenAI, Anthropic, Gemini, and local Ollama API backends with structured schema validation (JSON Schema/Pydantic-equivalent), persistent multi-turn memory, clarification questioning, and interactive user revision.

---

### Issue B: `generateShotVideo()` Contains Simulated Delays and Big Buck Bunny URLs
- **Location:** `src/stores/useStudioStore.ts` (Lines 1082–1115)
- **Source Inspection Evidence:**
  ```typescript
  // src/stores/useStudioStore.ts:1100-1109
  await new Promise(r => setTimeout(r, 2200));

  const completedClip: Clip = {
    ...generatingClip,
    status: 'COMPLETED',
    proxy_path: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    output_video_path: `${activeProject.project_dir_path || 'C:\\CinematicStudio\\Projects'}\\takes\\take_${clip.clip_number}_1080p.mp4`,
    thumbnail_path: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=640&q=80',
    updated_at: Date.now()
  };
  ```
- **Forensic Finding:** When the user clicks to generate a shot video, the system waits 2.2 seconds via `setTimeout`, creates a fictitious local output path (`take_X_1080p.mp4`), sets the proxy to a public Google cloud sample of the animated short *Big Buck Bunny*, and marks the clip status as `COMPLETED`. No video provider API or browser task is executed.
- **Root Cause:** Mock simulation stub written during early UI demo prototyping.
- **Remediation Plan:** Completely eradicate the `BigBuckBunny.mp4` mock, `setTimeout`, and Unsplash placeholder images. Wire clip generation directly to the Chrome Automation Provider Engine (`chrome-extension/engine/executionEngine.js`) or direct provider API adapters. A clip may only transition to `COMPLETED` when a genuine media file is downloaded, cryptographically verified, probed with FFprobe, and stored in the project's local `media/` directory.

---

### Issue C: `startShotQueue()` Automatically Marks Clips Complete Without Real Execution
- **Location:** `src/stores/useStudioStore.ts` (Lines 1117–1132)
- **Source Inspection Evidence:**
  ```typescript
  // src/stores/useStudioStore.ts:1122-1129
  const pendingClips = clips.filter(c => c.status !== 'COMPLETED');
  for (const clip of pendingClips) {
    if (get().shotQueueState !== 'RUNNING') break;
    await generateShotVideo(clip.id);
    await new Promise(r => setTimeout(r, 500));
  }
  ```
- **Forensic Finding:** The shot queue runner iterates through all pending clips in a loop, invoking the simulated `generateShotVideo()` stub with a 500ms delay. Within seconds, an entire 10-shot sequence is fraudulently flagged as `COMPLETED`.
- **Root Cause:** Chained invocation of the Issue B mock.
- **Remediation Plan:** Implement a true asynchronous queue coordinator backed by SQLite `task_execution_logs`. The queue must handle sequential browser execution, monitor live generation progress (0% -> 100%), pause for human intervention (CAPTCHA/login), capture actual output downloads, and trigger localized transcoding via FFmpeg.

---

### Issue D: `create_render_job()` Inserts `QUEUED` Database Row Without a Real Render Worker
- **Location:** `src-tauri/src/commands/mod.rs` (Lines 770–776) and `src-tauri/src/media_service/mod.rs` (Lines 390–446)
- **Source Inspection Evidence:**
  ```rust
  // src-tauri/src/media_service/mod.rs:412-425
  conn.execute(
      "INSERT INTO render_jobs (
          id, project_id, preset_name, state, output_path, progress_percentage,
          current_fps, current_frame, total_frames, render_strategy, created_at
      ) VALUES (?1, ?2, ?3, 'QUEUED', ?4, 0.0, 0.0, 0, 0, ?5, ?6)",
      params![id, input.project_id, input.preset_name, input.output_path, strategy, now],
  ).map_err(|e| e.to_string())?;

  Ok(RenderJobDto { ... state: "QUEUED".to_string(), ... })
  ```
- **Forensic Finding:** Calling `create_render_job` performs a collision check, writes a database row with status `QUEUED`, and returns. **There is no background rendering loop, worker thread pool, or FFmpeg process spawn attached to this job queue.** Unless triggered through the separate UI export modal's synchronous `execute_timeline_render` command, queued jobs remain dormant indefinitely.
- **Root Cause:** Incomplete job queue implementation. The schema was prepared, but the background worker thread was never wired to poll or consume from the table.
- **Remediation Plan:** Implement an active asynchronous Render Queue Daemon in Rust/C++ (`RenderWorker`). When a job is enqueued, the worker must transition state from `QUEUED -> PREPARING -> RENDERING -> VALIDATING -> COMPLETED`, spawn FFmpeg with real-time stderr progress parsing (`frame=`, `fps=`, `time=`, `bitrate=`), emit progress events over Tauri/Qt IPC, and run post-render FFprobe verification.

---

### Issue E: `calculate_sha256()` Fails to Compute Cryptographic Hashes
- **Location:** `src-tauri/src/media_service/ffmpeg.rs` (Lines 496–506)
- **Source Inspection Evidence:**
  ```rust
  // src-tauri/src/media_service/ffmpeg.rs:496-506
  fn calculate_sha256(path: &Path) -> Result<String, String> {
      // Simple fast block-based SHA-256 calculation or return verified hash
      let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
      if file_name == "ffmpeg.exe" && path.exists() {
          return Ok(EXPECTED_FFMPEG_SHA256.to_string());
      }
      if file_name == "ffprobe.exe" && path.exists() {
          return Ok(EXPECTED_FFPROBE_SHA256.to_string());
      }
      Ok(format!("sha256-verified-len-{}", meta.len()))
  }
  ```
- **Forensic Finding:** This function **did not calculate a SHA-256 hash at all**. For `ffmpeg.exe` and `ffprobe.exe`, it blindly returned the hardcoded upstream constant. For any other file, it returned `sha256-verified-len-<file_length>`.
- **Root Cause:** A shortcut taken to avoid streaming large 100MB+ binaries through a cryptographic hasher during fast startup checks.
- **Remediation Plan:** Implement streaming chunked SHA-256 calculation using standard 64KB read buffers feeding into a verified SHA-256 hasher (`ring`, `sha2`, or native Win32 `BCryptHashData`). Never return synthetic string representations or assume hash matches based on filename or length.

---

### Issue F: Chrome Docking Errors Silently Fall Back to External Floating Companion Window
- **Location:** `src/stores/useStudioStore.ts` (Lines 689–699)
- **Source Inspection Evidence:**
  ```typescript
  // src/stores/useStudioStore.ts:689-699
  dockChrome: async (url, userDataDir, profileDirKey, x, y, width, height) => {
    try {
      const hwnd = await apiService.dockChromeToWindow(url, userDataDir, profileDirKey, x, y, width, height);
      set({ dockedChromeHwnd: hwnd, isChromeDocked: true });
      return hwnd;
    } catch (err) {
      console.warn('[Docked Chrome] Falling back to companion mode:', err);
      await apiService.launchChromeProfile(userDataDir, profileDirKey);
      set({ isChromeDocked: false, dockedChromeHwnd: null });
      return 0;
    }
  }
  ```
- **Forensic Finding:** When Win32 `SetParent` or child-window docking fails, the application catches the error, prints a console warning, launches Chrome as an independent desktop window, and leaves the user looking at an empty UI container inside the app.
- **Root Cause:** Defensive fallback mechanism designed to prevent crashes during early testing, directly violating Rule 6: *"Never silently fall back from embedded Chrome to a floating browser window."*
- **Remediation Plan:** Remove the silent fallback. If Win32 child docking fails, the UI must display a clear, actionable error banner with diagnostic details (HWND error code, permissions, process elevation mismatch), provide an explicit "Retry Docking" control, and require explicit user consent before any fallback window is launched.

---

## 3. Comprehensive Subsystem Audit

| Subsystem | Source Location | Architectural Reality & Current Status | Severity / Defect Level |
| :--- | :--- | :--- | :--- |
| **Story Agent** | `src/services/storyAgent.ts` | Uses static regex pattern matching and pre-baked string templates. No real AI conversation, no persistent memory, no LLM API calls. | **CRITICAL (Fake AI)** |
| **Clip Generation** | `src/stores/useStudioStore.ts` | Uses 2.2s `setTimeout`, mock Big Buck Bunny URL, and Unsplash images. Does not invoke browser or provider. | **CRITICAL (Simulated)** |
| **Shot Queue** | `src/stores/useStudioStore.ts` | Loops through clips marking them complete without execution. | **CRITICAL (Simulated)** |
| **Render Jobs** | `src-tauri/src/media_service/mod.rs` | Inserts `QUEUED` row into SQLite. No background worker polls or processes jobs. | **HIGH (Incomplete)** |
| **Cryptographic Hashing** | `src-tauri/src/media_service/ffmpeg.rs` | Inferred hash from file length or returned hardcoded constants. | **HIGH (Incorrect)** |
| **Chrome Docking** | `src-tauri/src/chrome_service/docked_chrome.rs` | Functional Win32 `SetParent` implementation, but store silently falls back to floating window on error. | **MEDIUM (Silent Fallback)** |
| **Native Host & Extension** | `src-tauri/src/bin/host.rs`, `chrome-extension/` | Implemented with 32-bit little-endian framing, HMAC-SHA256 handshake, and provider adapters. | **FUNCTIONAL** |
| **FFmpeg Integration** | `src-tauri/src/media_service/ffmpeg.rs` | Gyan 9.0.2 static build discovery and command assembly functional, but needs filtergraph upgrade. | **PARTIALLY COMPLETE** |
| **Timeline Engine** | `src/features/timeline/MultitrackTimeline.tsx` | Visual multitrack rendering (V1-V3, A1-A3), snapping, and trimming functional in React state. | **FUNCTIONAL (UI Only)** |
| **Preview Monitor** | `src/features/timeline/PreviewMonitor.tsx` | HTML5 video element with CSS transform/filter preview. Does not perform real multi-track compositing. | **PARTIALLY COMPLETE** |
| **Project Persistence** | `src-tauri/src/project_manager/` | SQLite database schema with forward migrations (v1 -> v4) and CRUD commands functional. | **FUNCTIONAL** |
| **CI / Release Pipeline** | `.github/workflows/windows-installer-build.yml` | Strict release gate, code integrity audit, and post-signing checksum verification implemented. | **FUNCTIONAL** |

---

## 4. Next Steps for Milestone 0
This forensic audit forms the empirical baseline for the remaining Milestone 0 deliverables:
1. `FEATURE_IMPLEMENTATION_MATRIX.md` (Mapping all product features to code evidence)
2. `ARCHITECTURE_DECISION_RECORD.md` (Evaluating Native Qt vs. Hybrid Architecture)
3. `KNOWN_LIMITATIONS.md` (Documenting hardware and software constraints)
4. `ENGINEERING_ROADMAP.md` (Structuring Milestones 1 through 6)
