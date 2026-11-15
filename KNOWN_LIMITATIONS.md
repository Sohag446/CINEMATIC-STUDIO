# CINEMATIC STUDIO — KNOWN LIMITATIONS & TECHNICAL CONSTRAINTS
**Document Version:** 1.0.0 — Milestone 0 Constraints Catalog  
**Target Environment:** Windows 11 x64 (AMD Ryzen 7 5000 Series, AMD Radeon Graphics, 20 GB RAM)  
**Product Owner & Lead Developer:** Md. Sohag Hossen  
**Baseline Commit:** `455f333f702d69848fb8ebd40f99d497c17a527a`  

---

## 1. Workstation Hardware & Acceleration Bounds

### 1.1 Non-CUDA Environment (AMD Radeon Graphics)
- **Constraint:** The development and target workstation is powered by an **AMD Ryzen 7 5000 Series CPU and AMD Radeon Graphics (RDNA architecture)**. NVIDIA CUDA is **not available**.
- **Impact:** Any AI model or media processing algorithm relying on CUDA-specific libraries (e.g. `torch-cuda`, TensorRT, or NVENC-only FFmpeg filters) will fail immediately.
- **Architectural Solution:**
  - Hardware video encoding must target **AMD AMF (`h264_amf`, `hevc_amf`)** or **Direct3D 11 Video Acceleration (D3D11VA)** via FFmpeg.
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
- **Impact:** Unsigned executable files downloaded from the web or built in `%USERPROFILE%` trigger an immediate hard block:
  - Error: `os error 4551: An Application Control policy has blocked this file`
  - Code Integrity Event Log: **Event ID 3077 (Enforcement Block)**
- **Technical Reality:**
  - Neither unchecking "Unblock" in File Properties nor running `Unblock-File` bypasses Smart App Control.
  - Microsoft Trusted Signing Public Trust is **ineligible** for individual developers residing in Bangladesh (US & Canada only).
  - Public releases must remain gated until genuine **SSL.com eSigner** or **Certum Standard Cloud** code-signing credentials are configured in GitHub Secrets.

---

## 3. Real In-Workspace Chrome Win32 Docking Bounds

### 3.1 Win32 Child HWND Parenting Constraints
- **Constraint:** Genuine `chrome.exe` is hosted inside a designated application panel using Win32 `SetParent(chromeHwnd, appHwnd)` and `SetWindowLongW(chromeHwnd, GWL_STYLE, WS_CHILD | WS_VISIBLE)`.
- **Known Technical Edges:**
  1. **High-DPI Multi-Monitor Transitions:** Moving the application between monitors with different display scaling factors (e.g. 100% and 150%) can cause a momentary coordinate offset until `sync_docked_chrome_bounds` recalculates client rects.
  2. **Mouse Wheel Focus Routing:** Windows sends `WM_MOUSEWHEEL` messages to the window with keyboard focus rather than the window under the cursor unless `SPI_SETWHEELSCROLLING` is active. Clicking inside the Chrome panel is required to transfer keyboard focus.
  3. **Elevation Mismatch:** If CINEMATIC STUDIO is launched as Administrator while Chrome is launched as standard user (or vice-versa), Win32 `SetParent` will fail with `ERROR_ACCESS_DENIED` due to UIPI (User Interface Privilege Isolation). Both processes must run at the same elevation level.
  4. **Silent Fallback Bug (To Be Removed):** `useStudioStore.ts:694-696` currently catches docking errors and silently opens an external floating window. This must be replaced with an explicit error dialog.

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
- **Licensing:** The bundled FFmpeg distribution is licensed under **GNU General Public License (GPL) v3** or **Lesser General Public License (LGPL) v2.1/v3**.
- **Commercial Requirements:**
  - CINEMATIC STUDIO communicates with FFmpeg strictly via standard OS process execution (`std::process::Command` / CLI arguments) and named pipes.
  - Dynamic or static C-linkage into proprietary application binaries is avoided, preserving clear open-source separation and full compliance with Section 6 of the LGPL / Section 7 of the GPL.
  - Exact copies of FFmpeg licenses and build configurations are preserved in `src-tauri/resources/media-engine/windows-x64/LICENSES/`.
