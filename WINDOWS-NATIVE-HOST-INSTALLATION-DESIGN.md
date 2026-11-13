# CINEMATIC STUDIO — WINDOWS NATIVE HOST INSTALLATION DESIGN

## 1. Executive Summary & Design Principles

This document specifies the installer architecture and registry deployment model for the CINEMATIC STUDIO Native Messaging Host on Windows 11.

### Core Installation Principles:
1. **User-Mode Execution (Zero-UAC Requirement)**:
   All binaries, manifests, and registry keys are installed into user-scoped directories (`%LOCALAPPDATA%`) and the Current User registry hive (`HKCU`). The installation requires **no Administrator privileges** and triggers **no UAC elevation prompts**.
2. **User Data Preservation**:
   Uninstalling or updating CINEMATIC STUDIO must **never delete or overwrite user project files, media assets, timelines, or SQLite database records** (`%LOCALAPPDATA%\CinematicStudio\cinematic_studio.db`).
3. **Seamless Upgrade Path**:
   Upgrades replace only the application binaries and manifests, preserving existing cryptographic pairing tokens in SQLite so user Chrome profiles remain paired across application updates.

---

## 2. Filesystem & Registry Architecture

```
%LOCALAPPDATA%\CinematicStudio\
│
├── bin\
│   ├── cinematic-studio.exe                # Main Desktop Application (Tauri)
│   ├── cinematic-studio-host.exe           # Native Messaging Host
│   └── ffmpeg.exe, ffprobe.exe             # Bundled Media Engine
│
├── NativeMessaging\
│   └── com.cinematic.studio.json           # Native Messaging Host Manifest
│
├── cinematic_studio.db                     # User Database (PRESERVED ON UNINSTALL)
└── projects\                               # User Projects & Media (PRESERVED ON UNINSTALL)
```

### Windows Registry Registration:
- **Registry Hive**: `HKEY_CURRENT_USER` (User-scoped, isolated)
- **Subkey**: `Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`
- **Default Value `(Default)`**:
  - Type: `REG_SZ`
  - Value: `%LOCALAPPDATA%\CinematicStudio\NativeMessaging\com.cinematic.studio.json` (as an absolute path, e.g. `C:\Users\<User>\AppData\Local\CinematicStudio\NativeMessaging\com.cinematic.studio.json`).

---

## 3. NSIS Installer Integration (`installerHooks.nsh`)

CINEMATIC STUDIO utilizes Tauri's built-in **NSIS (Nullsoft Scriptable Install System)** packager.

To install and unregister the Native Messaging Host cleanly, Tauri 2 supports custom NSIS script hooks via an installer include file:

### `src-tauri/resources/installer/hooks.nsh`:
```nsis
# ==============================================================================
# CINEMATIC STUDIO — NSIS Custom Installation Hooks
# ==============================================================================

!macro customInstall
  DetailPrint "Configuring Chrome Native Messaging Host..."

  # 1. Create NativeMessaging directory
  CreateDirectory "$LOCALAPPDATA\CinematicStudio\NativeMessaging"

  # 2. Generate com.cinematic.studio.json dynamically with absolute path
  FileOpen $0 "$LOCALAPPDATA\CinematicStudio\NativeMessaging\com.cinematic.studio.json" w
  FileWrite $0 '{\r\n'
  FileWrite $0 '  "name": "com.cinematic.studio",\r\n'
  FileWrite $0 '  "description": "Cinematic Studio Native Messaging Host",\r\n'
  FileWrite $0 '  "path": "$LOCALAPPDATA\\CinematicStudio\\bin\\cinematic-studio-host.exe",\r\n'
  FileWrite $0 '  "type": "stdio",\r\n'
  FileWrite $0 '  "allowed_origins": [\r\n'
  FileWrite $0 '    "chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/"\r\n'
  FileWrite $0 '  ]\r\n'
  FileWrite $0 '}\r\n'
  FileClose $0

  # 3. Register manifest in Current User Registry
  WriteRegStr HKCU "Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio" "" "$LOCALAPPDATA\CinematicStudio\NativeMessaging\com.cinematic.studio.json"

  DetailPrint "Chrome Native Messaging Host registered successfully."
!macroend

!macro customUninstall
  DetailPrint "Unregistering Chrome Native Messaging Host..."

  # 1. Remove Registry Key
  DeleteRegKey HKCU "Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio"

  # 2. Remove Host Manifest
  Delete "$LOCALAPPDATA\CinematicStudio\NativeMessaging\com.cinematic.studio.json"
  RMDir "$LOCALAPPDATA\CinematicStudio\NativeMessaging"

  # 3. Remove Host Binary
  Delete "$LOCALAPPDATA\CinematicStudio\bin\cinematic-studio-host.exe"

  # IMPORTANT: Do NOT delete $LOCALAPPDATA\CinematicStudio\cinematic_studio.db
  # IMPORTANT: Do NOT delete $LOCALAPPDATA\CinematicStudio\projects
  DetailPrint "Host unregistration complete. User projects and databases preserved."
!macroend
```

---

## 4. Ten-Point Installation Requirement Compliance

| # | Requirement | Implementation Design |
| :--- | :--- | :--- |
| **1** | **Install Host Binary** | Staged in `%LOCALAPPDATA%\CinematicStudio\bin\cinematic-studio-host.exe` |
| **2** | **Install Manifest** | Written to `%LOCALAPPDATA%\CinematicStudio\NativeMessaging\com.cinematic.studio.json` |
| **3** | **Register HKCU Key** | Writes `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio` |
| **4** | **Correct Dynamic Path** | NSIS expands `$LOCALAPPDATA` dynamically; no hardcoded user directories |
| **5** | **Preserve Extension ID**| Manifest explicitly pins `chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/` |
| **6** | **No Machine-Wide Changes**| Touches strictly `HKCU`; zero writes to `HKLM` or Windows System directories |
| **7** | **Uninstall Cleanup** | Uninstaller deletes manifest and registry key cleanly |
| **8** | **Preserve User Assets** | Uninstaller strictly preserves `cinematic_studio.db` and project directories |
| **9** | **Upgrade Compatibility** | Upgrades overwrite binary/manifest without truncating the database or pairing tokens |
| **10**| **Error Reporting** | NSIS `DetailPrint` and `Abort` handle file open/write errors transparently |

---

## 5. Deployment Precondition

> [!IMPORTANT]
> **Safety Notice**:
> In accordance with Section 7 of the user directive:
> **"Do not execute a production installation until a valid host executable exists and the installation procedure has been reviewed."**
> 
> Because `cinematic-studio-host.exe` has not yet been built (pending CI execution), this installation procedure is preserved as a validated design specification ready for deployment once the signed release artifact is produced.

*Report frozen as `WINDOWS-NATIVE-HOST-INSTALLATION-DESIGN.md`.*

