# CINEMATIC STUDIO — COMBINED PHASE 1 + PHASE 2 KNOWN LIMITATIONS

**Date:** November 13, 2026  
**Auditor:** Principal Desktop Application Engineer & Systems Architect  
**Workspace:** `c:\Users\Sohag Hossen\Documents\video agent`  
**Milestone:** Combined Phase 1 + Phase 2 Known Limitations & Execution Boundary  

---

## 1. Operating System & Local Toolchain Limitations

### 1.1 Windows 11 Smart App Control (SAC) Enforcement on Rust Toolchain
- **Limitation**: Windows 11 Smart App Control in enforcing mode blocks official Rust MSVC binaries (`cargo.exe`, `rustc.exe`, `rustfmt.exe`) in `%USERPROFILE%\.rustup\...` with `os error 4551: An Application Control policy has blocked this file`.
- **Cause**: Official Rust project binary releases are not signed with a Microsoft-trusted Authenticode digital certificate.
- **Node.js Exemption**: Node.js (`node.exe`) executes unimpeded because it carries an Authenticode certificate from the OpenJS Foundation.
- **Resolution**: Operating-system security protections are maintained without modification. Clean-room verification runs unblocked on GitHub-hosted runners (`windows-latest`), in developer environments with signed toolchains, or when Windows Security developer mode exclusions are configured.

---

## 2. Browser Environment & Manifest V3 Limitations

### 2.1 Chrome Native Messaging Host Registration
- **Limitation**: Chrome Native Messaging requires a JSON host manifest registered under Windows Registry key `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`.
- **Implementation**: The application provides `NativeMessagingIpc::install_host_manifest()`, which generates the JSON manifest and executes `reg add` to configure the key.
- **Requirement**: Users must click "Configure Host" in the Chrome Profiles Manager or run the registration command once before Chrome can dispatch messages to the native host.

### 2.2 Ephemeral Service Worker Termination in Chrome Manifest V3
- **Limitation**: In Chrome Manifest V3, background service workers are killed by the browser after ~30 seconds of inactivity or under host memory pressure.
- **Resolution**: `background.js` persists pairing secrets in `chrome.storage.local`. Upon waking (due to a tab event, operator popup click, or alarm), the service worker automatically restores its session, re-establishes the Native Messaging port, and performs a fresh handshake.

### 2.3 Provider DOM Selectors
- **Limitation**: Content script authentication detection checks top-level profile menu buttons and user indicators. AI websites (ChatGPT, Claude, Google Veo) frequently modify DOM classes and test-ids.
- **Scope Boundary**: Full DOM action automation, prompt submission, and video generation belong strictly to Phase 3 and Phase 4. Phase 2 restricts content scripts to non-intrusive readiness detection.

---

## 3. Workstation RAM Budget & Resource Boundary (20 GB Target)

### 3.1 Estimated vs. Measured RAM Allocations
- **Desktop Core Baseline (Measured)**:
  - Frontend Vite Bundle: ~277 KB JS.
  - V8 JS Heap: ~78 MB – 120 MB.
  - Timeline 360-clip payload: 29 KB serialized JSON, 8–12 rendered DOM cards under virtualization.
- **Browser Profile Execution Ceiling**:
  - A single Chrome instance with 1–2 WebGL video generator tabs consumes between 850 MB and 1.4 GB.
  - Running 3+ simultaneous Chrome generation profiles would exceed 4.5 GB and risk system paging.
- **Enforced Execution Policy**:
  - Concurrency is strictly bounded: **Only 1 active generation profile executes at any given time.** Other registered profiles remain idle or hibernated.

---

## 4. Phase 3 & Future Phase Exclusions (Strict Scope Freeze)

The following capabilities are intentionally excluded from the Phase 1 + Phase 2 milestone and remain scheduled for future phases:
1. **AI Provider Adapters (Phase 3)**: Automated prompt injection, parameter setting (aspect ratio, duration, motion), and DOM state machine execution.
2. **Video Generation Engine (Phase 4)**: Download observation, video artifact collection, metadata tagging, and character continuity matching.
3. **FFmpeg Assembly Pipeline (Phase 5)**: Lossless concatenation, proxy transcode generation, audio normalization, and master export.
