# CINEMATIC STUDIO — KNOWN LIMITATIONS & TECHNICAL CONSTRAINTS
**Document Version:** 1.2.0 — Milestone A Hardened Constraints Catalog
**Target Environment:** Windows 11 x64 (AMD Ryzen 7 5000 Series, AMD Radeon Graphics, 20 GB RAM)
**Product Owner & Lead Developer:** Md. Sohag Hossen
**Baseline Commit:** `ca9f64e`

---

## 1. Workstation Hardware & Acceleration Bounds

### 1.1 Non-CUDA Environment (AMD Radeon Graphics)
- **Constraint:** The development and target workstation is powered by an **AMD Ryzen 7 5000 Series CPU and AMD Radeon Graphics (RDNA architecture)**. NVIDIA CUDA is **not available**.
- **Impact:** Any AI model or media processing algorithm relying on CUDA-specific libraries (e.g. `torch-cuda`, TensorRT, or NVENC-only FFmpeg filters) will fail immediately.
- **Architectural Solution:**
  - Hardware video encoding must target **AMD AMF (`h264_amf`, `hevc_amf`)** or **Direct3D 11 Video Acceleration (D3D11VA)** via FFmpeg. Both require valid AMD Adrenalin drivers installed on the host.
  - Software encoding fallback must use multithreaded `libx264` and `libx265`, bounded to 8–12 CPU threads to avoid starving the UI thread.
  - Local AI inference must utilize **DirectML** or CPU-optimized ONNX Runtime / Ollama backends.

### 1.2 System Memory Ceiling (20 GB RAM)
- **Constraint:** Total system memory is 20 GB. In Windows 11, the operating system, background services, and GPU shared memory take ~4.5–6.0 GB baseline.
- **Impact:** Unbounded media caching or uncompressed 4K 60fps frame buffers in memory can rapidly exhaust available RAM and trigger system thrashing.
- **Architectural Solution:**
  - **Memory Ceiling:** The entire application (Tauri backend + React UI + Chrome subprocess + FFmpeg worker) must strictly cap peak memory consumption at **under 8.0 GB**.
  - **Sequential Browser Tasks:** Max concurrency for automated Chrome generation tasks is fixed to **1 active tab/profile**.
  - **Proxy Generation:** Raw 4K 60fps imports (>100 Mbps) must automatically generate lightweight 720p 1 Mbps proxies for timeline scrubbing.

---

## 2. Windows 11 Smart App Control & Code Signing

### 2.1 Enforcement Policy on Unsigned Binaries
- **Constraint:** Windows 11 Smart App Control (SAC) operates at the kernel level via App Control for Business (WDAC).
- **Impact on Local Development:**
  - Running `cargo test` on this host machine fails with:
    `An Application Control policy has blocked this file. (os error 4551)`
  - When cargo attempts to compile and execute procedural macro build scripts in `%USERPROFILE%` (e.g. `zmij`, `serde`, `darling_macro`), Windows blocks process execution under **Event ID 3077 (Enforcement Block)**.
- **Impact on Distributed Installers:**
  - Unsigned installers downloaded from GitHub Releases are blocked with:
    `"We blocked this app because we could not verify its publisher."`
  - Neither unchecking "Unblock" in File Properties nor running `Unblock-File` bypasses Smart App Control.
  - Public releases must remain gated until genuine **SSL.com eSigner** or **Certum Standard Cloud** code-signing credentials are configured in GitHub Secrets.

---

## 3. Real In-Workspace Chrome Win32 Docking Bounds

### 3.1 Hardened Native Docking Implementation (Milestone A)
In Milestone A, the native Rust docking implementation in `src-tauri/src/chrome_service/docked_chrome.rs` and frontend synchronization in `src/features/aivideo/AIVideoWorkspace.tsx` were hardened:
1. **Asserted Win32 Return Values:**
   - `win32::SetParent(chrome_hwnd, parent_hwnd)`: Handled NULL return ambiguity using `SetLastError(0)` and `GetLastError()` inspection.
   - `win32::SetWindowLongW(chrome_hwnd, ...)`: Handled zero return ambiguity with `GetLastError()`.
   - `win32::SetWindowPos(chrome_hwnd, ...)`: Asserts BOOL return; formats explicit Win32 error on zero.
2. **Strict HWND Validation in `sync_bounds` and `set_visible`:**
   - Checks if `hwnd == 0` or `IsWindow(hwnd) == 0` and returns an explicit `Err` string when the window is destroyed or disconnected.
3. **Strict Boundary Clamping & High-DPI Scaling:**
   - `transform_css_to_parent_client` calculates physical device coordinates using `GetDpiForWindow` across 100%, 125%, 150%, and 200% brackets.
   - Strictly bounds child dimensions so $W_{phys} \le \text{client\_width} - X_{target}$ and $H_{phys} \le \text{client\_height} - Y_{target}$.
   - Never forces a minimum 100px width/height when remaining space is sub-100px, completely preventing child window clipping past the parent window border.
   - Returns explicit `Err` on zero or negative client dimensions, coordinates outside the client area, or non-positive requested sizes.
4. **Deduplicated Multi-Source Synchronization:**
   - Frontend `AIVideoWorkspace.tsx` integrates `requestAnimationFrame` debouncing, canceling pending frames so rapid concurrent triggers (`ResizeObserver`, `window.resize`, `matchMedia` resolution changes, `visibilitychange` restore) collapse into a single IPC bounds sync per frame.
5. **Silent Floating Window Fallback Eliminated:**
   - Removed silent fallback in `useStudioStore.ts` and `AIVideoWorkspace.tsx`. Docking failures now surface `dockChromeError` with explicit retry or manual fallback options.

### 3.2 Chrome Runtime Acceptance Checklist Status (Items A through J):
- **Item A (No Direct LLM API Endpoints):** PASS (Audited across `src/`, `src-tauri/`, `chrome-extension/`, `scripts/`; zero direct API endpoints).
- **Item B (Story Agent Browser Dispatch Contract):** PASS (Verified with 6 genuine unit tests in `tests/milestone_a_docking_and_no_api_suite.cjs`).
- **Item C (Win32 API Return Code Enforcement):** PASS (Verified via native code contracts and compile assertions).
- **Item D (Strict Boundary Clamping & High-DPI Math):** PASS (Verified via native Rust unit tests and JS mathematical suite across 100%–200% DPI and sub-100px edge bounds).
- **Item E (Bounds Sync Deduplication):** PASS (Verified with `requestAnimationFrame` + `cancelAnimationFrame` in `AIVideoWorkspace.tsx`).
- **Item F (Child Process Cleanup on Failure):** PASS (Verified `terminate_pid` invocation on all docking failure paths).
- **Item G (Interactive Keyboard & Mouse Wheel Input):** BLOCKED-RUNTIME (Requires interactive GUI desktop session).
- **Item H (Physical Multi-Monitor DPI Drag):** BLOCKED-RUNTIME (Requires heterogeneous physical multi-monitor hardware).
- **Item I (Dynamic Minimize/Restore Re-sync):** PASS (Verified via `visibilitychange` handler).
- **Item J (Automated CI Native Rust Verification):** PASS (Verified via GitHub Actions CI Run).

---

## 4. Web Automation & Anti-Bot Protection Limits

### 4.1 Strict Compliance with Non-Circumvention Rules
- **Constraint:** Providers such as OpenAI, Anthropic, Google Flow/Veo, and Runway protect their web endpoints using Cloudflare Turnstile, Google reCAPTCHA, and multi-factor authentication (MFA).
- **Rule:** CINEMATIC STUDIO **never** attempts to solve, click through, or bypass CAPTCHAs, bot challenges, or MFA gates.
- **Handling:**
  - The Chrome Extension observer detects challenge tokens (`cf-turnstile`, `g-recaptcha`) and transitions the task state machine to `NEEDS_HUMAN_ACTION`.
  - The UI presents an actionable modal alerting the user to solve the verification challenge in the docked browser panel.
  - Once solved, the task automatically resumes execution.

---

## 5. Storage & Database Concurrency Bounds

### 5.1 SQLite Single-Writer Lock
- **Constraint:** SQLite allows multiple concurrent readers but only **one writer** at any given moment.
- **Impact:** Heavy concurrent writes from the background render worker, Chrome task logging, and UI timeline autosave can produce `busy_timeout` errors if uncoordinated.
- **Architectural Solution:**
  - All database connections must operate in **WAL (Write-Ahead Logging)** mode.
  - A connection pool (`r2d2`) with an explicit 5,000ms busy timeout must be enforced across all service threads.

---

## 6. Commercial Licensing Constraints

### 6.1 FFmpeg Codecs & Patents
- **Constraint:** CINEMATIC STUDIO bundles official static builds of FFmpeg (Gyan.dev 9.0.2 Essentials).
- **Licensing:** The bundled FFmpeg distribution is licensed under **GNU General Public License (GPL) v3** due to bundled x264/x265 codecs.
- **Commercial Separation:**
  - CINEMATIC STUDIO communicates with FFmpeg strictly via standard OS process execution (`std::process::Command` / CLI arguments) and named pipes.
  - In-process static or dynamic C linkage is strictly avoided, preserving arm's-length separation under FSF guidelines.
