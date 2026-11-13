# CINEMATIC STUDIO — PHASE 2 CHROME PROFILE & EXTENSION IMPLEMENTATION

**Date:** November 13, 2026  
**Auditor:** Principal Desktop Application Engineer & Systems Architect  
**Workspace:** `c:\Users\Sohag Hossen\Documents\video agent`  
**Milestone:** Phase 2 Technical Implementation  

---

## 1. Architectural Architecture & Discovery Service

### 1.1 Read-Only Windows Discovery Scanner (`src-tauri/src/chrome_service/discovery.rs`)
- **Target Root**: `%LOCALAPPDATA%\Google\Chrome\User Data\Local State`.
- **Shared-Read File I/O**: Opens `Local State` safely without file locks, coexisting with active Chrome browser instances.
- **Parsing `profile.info_cache`**: Extracts:
  - `profile_dir_key`: e.g. `"Default"`, `"Profile 1"`, `"Profile 2"`.
  - `display_name`: User-customized profile label.
  - `google_account_label`: `gaia_name` / `user_name` for visual identification (never used as database primary keys).
  - `avatar_icon`: Pre-configured avatar metadata.
  - `is_chrome_running`: Inspects Windows process table via `sysinfo` for `chrome.exe --profile-directory=...`.
- **Filesystem Fallback**: If `Local State` is absent, automatically scans directory entries for `Default` and `Profile *` folders.

### 1.2 Security Invariant: Zero Credential Harvesting
- Profile discovery is strictly read-only.
- **No cookies** are extracted or read.
- **No passwords** or login tokens are decrypted.
- Chrome profile files are **never modified** by the discovery service.

---

## 2. Five Distinct Profile Lifecycle States & Operation Modes

```
+-------------------------------------------------------------------------------------------------+
| 1. DISCOVERED: Folder exists on disk; detected via Local State or directory scan.               |
| 2. CHROME_RUNNING: chrome.exe process actively executing with --profile-directory=...            |
| 3. EXTENSION_INSTALLED: Manifest V3 agent installed in profile Extensions directory.            |
| 4. EXTENSION_CONNECTED: Native Messaging IPC established + mutual HMAC-SHA256 handshake valid.   |
| 5. PROVIDER_READY: Content script confirms active authentication on target AI provider website. |
+-------------------------------------------------------------------------------------------------+
```
Operational States:
- `DISCONNECTED`: Extension installed or paired, but Native Messaging port is closed.
- `HIBERNATED`: Profile registered but intentionally closed to conserve system RAM.
- `PAIRING_REQUIRED`: Profile registered in database, awaiting operator pairing token exchange.
- `SESSION_EXPIRED`: Challenge expired or provider web session logged out.
- `ERROR`: IPC communication error or process launch failure.

---

## 3. Persistent Profile Registry & Forward Migration (`003_chrome_profiles_and_pairing.sql`)

Every registered profile receives a persistent application UUID v4:
```sql
CREATE TABLE IF NOT EXISTS chrome_profiles (
    id TEXT PRIMARY KEY NOT NULL,
    profile_dir_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    user_data_dir TEXT NOT NULL,
    assigned_purpose TEXT NOT NULL DEFAULT 'GENERAL',
    assigned_provider TEXT,
    extension_installed INTEGER NOT NULL DEFAULT 0,
    pairing_state TEXT NOT NULL DEFAULT 'UNPAIRED',
    connection_state TEXT NOT NULL DEFAULT 'DISCONNECTED',
    pairing_secret_hash TEXT,
    last_seen_at INTEGER,
    last_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

### Unregister Invariant:
Unregistering a profile executes `DELETE FROM chrome_profiles WHERE id = ?`. It purges the application binding and pairing tokens, but **never** deletes Chrome user data, browsing history, or browser cookies on disk.

---

## 4. Manifest V3 Chrome Extension (`chrome-extension/`)

### 4.1 Topology
- `manifest.json`: Manifest V3 specification with scoped host permissions (`chatgpt.com`, `claude.ai`, `gemini.google.com`, `flow.google.com`, `*.google.com/veo/*`).
- `background.js`: Ephemeral event-driven service worker connecting via `chrome.runtime.connectNative("com.cinematic.studio")`.
- `content.js`: Isolated world script detecting provider user interface elements (e.g. user menu buttons, profile avatars) to determine authentication readiness without reading credentials.
- `popup.html` & `popup.js`: Operator pairing interface and status display.

### 4.2 Tab Deduplication & Multi-Profile Isolation
- Before initiating any task, `background.js` executes `chrome.tabs.query({ url: targetDomainPattern })`.
- If an existing tab matching the provider domain is open, it reuses the existing tab instead of opening new tabs.
- If a message packet's `profile_id` does not match the extension's stored `profileId`, the packet is dropped immediately.

---

## 5. Chrome Native Messaging Host & Windows Registry Registration

- **Host Name**: `com.cinematic.studio`
- **Host Manifest**: Stored at `%LOCALAPPDATA%\CinematicStudio\NativeMessaging\com.cinematic.studio.json`.
- **Registry Key**: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio` pointing to the host manifest.
- **Message Framing**: Standard 32-bit little-endian uint32 length prefix followed by UTF-8 encoded JSON, with a strict **1 MB message size ceiling** to prevent RAM exhaustion.
