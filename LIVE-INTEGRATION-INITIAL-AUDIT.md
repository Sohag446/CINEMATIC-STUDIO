# CINEMATIC STUDIO — LIVE INTEGRATION INITIAL AUDIT

## 1. Executive Summary

This audit establishes the baseline environment state for the **Phase 2 (Chrome Integration) and Phase 3 (AI Provider Automation)** live runtime verification of CINEMATIC STUDIO.

The audit was conducted on a live Windows 11 Pro system (AMD Ryzen 5 5600G, 20 GB RAM). All findings are derived directly from active inspection of the local filesystem, Windows Registry, Chrome User Data, and source repositories.

---

## 2. Source & Version Control State

| Metric | Measured Value | Status |
| :--- | :--- | :--- |
| **Workspace Path** | `C:\Users\Sohag Hossen\Documents\video agent` | VERIFIED |
| **Git Branch** | `master` | VERIFIED |
| **Latest Commit Hash** | `16d3d40` | VERIFIED |
| **Latest Commit Message** | `feat(phase-1-2): complete combined desktop core foundation and chrome profile extension integration` | VERIFIED |
| **Working Tree State** | Contains Phase 3 & Phase 4 source implementations, migrations, tests, and documentation (frozen and staged locally per user instructions) | VERIFIED |
| **GitHub Remote** | None configured (Local-first policy strictly maintained) | VERIFIED |

---

## 3. Binary & Executable Audit

A comprehensive search was performed across all candidate build and deployment directories for the desktop application executable and the Chrome Native Messaging host executable:

```
[MISSING] src-tauri/target/debug/cinematic-studio.exe
[MISSING] src-tauri/target/release/cinematic-studio.exe
[MISSING] src-tauri/target/debug/cinematic-studio-host.exe
[MISSING] src-tauri/target/release/cinematic-studio-host.exe
[MISSING] src-tauri/target/debug/host.exe
[MISSING] src-tauri/target/release/host.exe
[MISSING] %LOCALAPPDATA%\CinematicStudio\bin\cinematic-studio-host.exe
```

### Blocker Analysis: Windows Smart App Control (SAC)
- **Root Cause**: Windows 11 Smart App Control is active in enforcement mode on this workstation.
- **Operating System Error**: Execution of locally built unsigned Rust binaries fails with:
  `os error 4551: An Application Control policy has blocked this file.`
- **Code Integrity Events**: Audit logs record Code Integrity Event IDs 3077 and 3033 for ad-hoc unsigned binaries.
- **Security Policy Compliance**: Per explicit project rules, Windows SAC is **NOT disabled or bypassed**.
- **Impact**: While the full Rust source implementation exists (`src-tauri/src/bin/host.rs`, `src-tauri/src/chrome_service/ipc.rs`, `src-tauri/src/commands/mod.rs`), the native binaries cannot be compiled locally by `rustc`. Therefore, live process-to-process Native Messaging execution must be evaluated through verified protocol simulation, standalone stdio harness verification, and automated browser testing without false claims of native binary execution.

---

## 4. Windows Registry Audit (NativeMessagingHosts)

A query of `HKCU\Software\Google\Chrome\NativeMessagingHosts` revealed the following:

```
HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.microsoft.browsercore
    (Default)    REG_SZ    C:\Windows\BrowserCore\manifest.json

HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.soundresearch.contentclassifier
    (Default)    REG_SZ    C:\Users\Sohag Hossen\AppData\Local\SoundResearch\NativeMessaging\com.soundresearch.contentclassifier.json
```

- **Target Key**: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`
- **Current Status**: **NOT REGISTERED**
- **Resolution Path**: The manifest registration logic is fully implemented in `src-tauri/src/chrome_service/ipc.rs` (`install_host_manifest`). It generates the manifest in `%LOCALAPPDATA%\CinematicStudio\NativeMessaging\com.cinematic.studio.json` and registers the registry key via `reg add`.

---

## 5. Chrome User Data & Profile Discovery Audit

Inspection of `%LOCALAPPDATA%\Google\Chrome\User Data\Local State` (file size: 32,916 bytes) confirmed the presence of **10 real Chrome Profiles**:

| Profile Key | Profile Display Name | GAIA / Google Name | Purpose / Identity |
| :--- | :--- | :--- | :--- |
| `Default` | "Your Chrome" | Sohag Hossen | Primary default profile |
| `Profile 1` | "Sohag" | Sohag Hossen | Personal development profile |
| `Profile 3` | "Sohag" | Sohag Hossen | Secondary profile |
| `Profile 4` | "Sohag's" | Sohag's AI | Dedicated AI workflows |
| `Profile 6` | "Claude" | Claude Sohag | Dedicated Claude AI profile |
| `Profile 8` | "Genesis" | Genesis Ai | Dedicated Video/Image AI |
| `Profile 10` | "Mr" | Mr SomRat | Auxiliary profile |
| `Profile 11` | "MD" | MD Ranju | Auxiliary profile |
| `Profile 12` | "Vaanner" | Vaanner | Studio / branding profile |
| `Profile 13` | "MayaRi" | MayaRi Studio | Production studio profile |

- **Browser Executable**: `C:\Program Files\Google\Chrome\Application\chrome.exe` (Version verified, size: 4,149,912 bytes).
- **Profile Relevance**: The presence of `Profile 4` ("Sohag's AI"), `Profile 6` ("Claude"), and `Profile 8` ("Genesis Ai") confirms real-world profile segmentation is actively used on this machine.

---

## 6. Chrome Extension Manifest & Security Audit

The extension manifest at `chrome-extension/manifest.json` was parsed and cryptographically analyzed:

```json
{
  "manifest_version": 3,
  "name": "Cinematic Studio Production Agent",
  "version": "1.0.0",
  "permissions": ["storage", "tabs", "activeTab", "nativeMessaging"],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://*.chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://flow.google.com/*",
    "https://*.google.com/veo/*"
  ]
}
```

- **Manifest Version**: Manifest V3 (MV3).
- **Public Key & Extension ID**:
  - The manifest declares a static 2048-bit RSA public key (`key` field).
  - Cryptographic computation (first 128 bits of SHA-256 of DER public key mapped to `a-p`):
    `Extension ID = olfkacbfbgihonffpmnmnhmfmonfhmpf`
- **Origin Alignment**:
  - `src-tauri/src/chrome_service/ipc.rs` line 98 explicitly configures `allowed_origins` as:
    `chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/`
  - Cryptographic alignment between extension manifest and native host manifest is **100% matched**.

---

## 7. Application Database Audit

- **Path Checked**: `%LOCALAPPDATA%\CinematicStudio\cinematic_studio.db`
- **Status**: **MISSING** (Desktop application has not yet executed on this machine due to the SAC compilation block).
- **Schema Readiness**: Full migrations 001 through 005 are implemented in `src-tauri/migrations/`.

---

## 8. Baseline Audit Verdict

| Component | Status | Notes |
| :--- | :--- | :--- |
| **Source Implementation** | **PASS** | Complete across Phases 1, 2, 3, 4 |
| **Profile Discovery Source** | **PASS** | 10 real Chrome profiles detected in `Local State` |
| **Extension ID Cryptographic Alignment** | **PASS** | `olfkacbfbgihonffpmnmnhmfmonfhmpf` matches in both systems |
| **Local Rust Binary Compilation** | **BLOCKED** | Windows 11 Smart App Control (`os error 4551`) |
| **Registry Host Registration** | **NOT TESTED** | Pending installer deployment |
| **Live Native Messaging Process Execution** | **BLOCKED** | Dependent on compiled host binary |

*Report generated and frozen as `LIVE-INTEGRATION-INITIAL-AUDIT.md`.*

