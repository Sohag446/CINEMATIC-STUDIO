# CHROME PROFILE INTEGRATION & ORCHESTRATION (REVISED)
## CINEMATIC STUDIO: Multi-Profile Discovery, Five-Stage Verification & Session Isolation

---

## 1. Five Distinct Stages of Profile Lifecycle Verification

A common failure in multi-profile browser automation is conflating *discovering a folder on disk* with *having an active, authenticated browser session*. CINEMATIC STUDIO strictly distinguishes five distinct states for every Chrome Profile:

```
+-------------------------------------------------------------------------------------------------+
| STAGE 1: PROFILE DIRECTORY DISCOVERED                                                           |
| Detected on local filesystem via %LOCALAPPDATA%\Google\Chrome\User Data\Local State.            |
| (Indicates the profile exists on the user's PC, but may be closed and unconfigured.)            |
+--------------------------------+----------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------------------------------------+
| STAGE 2: CHROME PROCESS RUNNING                                                                 |
| Detected via OS process inspection (chrome.exe --profile-directory="Profile X").                |
| (Indicates the browser is actively open on Windows, but the extension may not be active.)       |
+--------------------------------+----------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------------------------------------+
| STAGE 3: EXTENSION INSTALLED IN PROFILE                                                         |
| Detected via extension directory presence or registry manifest binding.                         |
| (Indicates the Manifest V3 agent is installed in this profile, but may not be paired yet.)      |
+--------------------------------+----------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------------------------------------+
| STAGE 4: EXTENSION CONNECTED & AUTHENTICATED                                                    |
| Active IPC established via Native Messaging Named Pipe Relay + valid HMAC handshake.           |
| (Indicates the extension can receive tasks, but user may or may not be logged into the AI site.)|
+--------------------------------+----------------------------------------------------------------+
                                 |
                                 v
+-------------------------------------------------------------------------------------------------+
| STAGE 5: PROVIDER SESSION AUTHENTICATED & READY                                                 |
| Content script verifies active login state on target website (e.g., chatgpt.com / veo).         |
| (Indicates full end-to-end readiness to execute story reasoning or video generation tasks.)     |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Windows Chrome Profile Discovery Mechanics

CINEMATIC STUDIO's Rust backend contains a non-locking profile scanner:

1. **Reading `Local State`**: Opens `%LOCALAPPDATA%\Google\Chrome\User Data\Local State` using Windows shared-read flags (`FILE_SHARE_READ | FILE_SHARE_WRITE`).
2. **Parsing `profile.info_cache`**: Extracts:
   - Profile Directory Key (e.g. `"Profile 1"`, `"Profile 2"`, `"Default"`).
   - `name`: User-defined profile label (e.g. `"Cinematic Studio - Veo Account"`).
   - `gaia_name` / `user_name`: Google Account display identifier (used solely for user UI identification, **never** used as application database keys).
   - `avatar_icon`: Pre-configured profile avatar identifier.
3. **Populating UI Manager**: Displays discovered profiles in the Desktop Chrome Profiles Manager, allowing the creator to map specific AI providers to specific profiles.

---

## 3. Cryptographic Pairing & Authentication Workflow

To ensure that one Chrome Profile cannot access another profile's project tasks, each profile undergoes a mutual cryptographic pairing:

```
[ Desktop App: Chrome Profile Manager ]
                   |
                   v
  1. Operator clicks "Pair Profile" -> Assigns: "Profile 2 (Veo Studio)"
  2. Rust Backend generates:
     - Profile ID: "prof_v71x9a" (UUID v4)
     - Pairing Secret: 256-bit cryptographically secure random string
  3. Displays Pairing Modal with One-Click Pairing Link:
     "cinematic://pair?profile=prof_v71x9a&secret=..."
                   |
                   v
[ User Opens Desired Chrome Profile ]
                   |
                   v
  4. User clicks Cinematic Studio Extension icon in toolbar
  5. Extension popup prompts: "Paste Pairing Token or Click Pairing Link"
  6. Extension stores Profile ID and Secret in isolated chrome.storage.local
  7. Extension initiates Native Messaging connectNative("com.cinematic.studio")
  8. Desktop executes mutual HMAC-SHA256 challenge-response handshake
  9. Connection marked: STAGE 4: CONNECTED & AUTHENTICATED
```

---

## 4. Multi-Profile RAM Containment Policies

Running multiple full-fledged Chrome profiles on a **20 GB RAM workstation** requires strict resource limits. Each open profile with WebGL video generation tabs can consume **1.2 GB to 2.4 GB**.

### 4.1 Sequential Execution Mode (Default - Strict RAM Protection)
- The Task Queue enforces a hard concurrency limit: **Only one browser profile is actively executing a generation task at any time.**
- If Profile 1 (ChatGPT) is generating a scene breakdown, Profile 2 (Veo) remains in an idle or background state.
- **Result**: Host RAM overhead is bounded to that of a single active browser instance (~ 850 MB – 1.4 GB).

### 4.2 Tab Deduplication & Window Management
To prevent accidental creation of dozens of duplicate tabs:
```javascript
// Tab Deduplication Engine in background.js
export async function getOrCreateProviderTab(urlMatchPattern, targetUrl) {
  // Query tabs only within THIS specific Chrome Profile window
  const matchingTabs = await chrome.tabs.query({ url: urlMatchPattern });
  
  if (matchingTabs.length > 0) {
    const existingTab = matchingTabs[0];
    // Focus existing tab without reloading or creating duplicate processes
    await chrome.tabs.update(existingTab.id, { active: true });
    return existingTab.id;
  }
  
  // Exactly one new tab created if none currently open
  const newTab = await chrome.tabs.create({ url: targetUrl, active: true });
  return newTab.id;
}
```

### 4.3 On-Demand Profile Launching via Win32
If a scheduled task requires a profile that is currently closed:
- Desktop checks running processes via `EnumProcesses` for `chrome.exe` matching `--profile-directory="Profile 2"`.
- If not running, Desktop notifies user: *"Profile 2 is currently closed. Click 'Launch Profile' to start."*
- Desktop launches `chrome.exe --profile-directory="Profile 2"`. The extension automatically reconnects to the Desktop Native Host within 2 seconds.
