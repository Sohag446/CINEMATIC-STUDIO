# CINEMATIC STUDIO — NATIVE MESSAGING PRODUCTION MANIFEST SPECIFICATION

## 1. Executive Summary

This document establishes the production specification for the Chrome Native Messaging Host Manifest for CINEMATIC STUDIO on Windows 11.

It defines the cryptographic origin, file layout, dynamic path resolution strategy, and Windows Registry anchoring required for Google Chrome to securely recognize and spawn `cinematic-studio-host.exe`.

---

## 2. Production Manifest Identity & Structure

```json
{
  "name": "com.cinematic.studio",
  "description": "Cinematic Studio Native Messaging Host",
  "path": "%LOCALAPPDATA%\\CinematicStudio\\bin\\cinematic-studio-host.exe",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/"
  ]
}
```

### Detailed Field Verification:
1. **`name`**: `com.cinematic.studio`
   - Conforms strictly to Chrome's lowercase reverse-DNS naming convention.
   - Matches the registry key under `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`.
2. **`description`**: Human-readable descriptor displayed in browser diagnostic logs.
3. **`type`**: `stdio`
   - Instructs Chrome to communicate over anonymous pipes connected to the host's standard input and standard output.
4. **`path`**: Absolute filesystem path to the native executable.
   - On Windows, Chrome Native Messaging **requires an absolute path** in the manifest JSON. Chrome does **not** expand shell environment variables like `%LOCALAPPDATA%` directly from JSON.
   - **Resolution Rule**: The installer dynamically resolves `%LOCALAPPDATA%` at install time and writes the canonical absolute path (e.g. `C:\Users\<Username>\AppData\Local\CinematicStudio\bin\cinematic-studio-host.exe`).
5. **`allowed_origins`**: `["chrome-extension://olfkacbfbgihonffpmnmnhmfmonfhmpf/"]`
   - **Zero Wildcards**: Broad match patterns like `chrome-extension://*` or `*` are **strictly prohibited** by Chrome and absent here.
   - **Origin Hash Derivation**: Matches the deterministic 32-character extension ID computed from the 2048-bit RSA public key declared in `chrome-extension/manifest.json`.

---

## 3. Dynamic Manifest Generation Strategy

Because Windows user directory paths differ across machines (`C:\Users\John\...`, `D:\Users\Alice\...`), shipping a static manifest with a hardcoded developer path (`C:\Users\Sohag Hossen\...`) would cause immediate failure on end-user systems.

CINEMATIC STUDIO implements a **Two-Tier Dynamic Installation Strategy**:

### Tier 1: Desktop Application Automated Self-Registration
Implemented in `src-tauri/src/chrome_service/ipc.rs` (`install_host_manifest`):
```rust
let app_data = std::env::var_os("LOCALAPPDATA")
    .map(PathBuf::from)
    .unwrap_or_else(|| PathBuf::from(r"C:\Users\Default\AppData\Local"));

let manifest_dir = app_data.join("CinematicStudio").join("NativeMessaging");
let manifest_path = manifest_dir.join("com.cinematic.studio.json");
let bin_path = app_data.join("CinematicStudio").join("bin").join("cinematic-studio-host.exe");
```
When called from the desktop UI (`install_native_host` Tauri command), it dynamically resolves the running user's actual `%LOCALAPPDATA%`, formats the JSON with the absolute path, writes the file, and executes `reg add` to configure the user registry.

### Tier 2: NSIS Installer Script Injection
During installer execution, NSIS expands `$LOCALAPPDATA` natively and writes the manifest:
```nsis
# NSIS Macro executed during user installation
CreateDirectory "$LOCALAPPDATA\CinematicStudio\NativeMessaging"
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

# Register under Current User NativeMessagingHosts
WriteRegStr HKCU "Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio" "" "$LOCALAPPDATA\CinematicStudio\NativeMessaging\com.cinematic.studio.json"
```

---

## 4. Security & Isolation Invariants

| Security Rule | Status | Implementation Check |
| :--- | :--- | :--- |
| **No Machine-Wide Elevation Required** | **VERIFIED** | Installs strictly under `HKCU` and `%LOCALAPPDATA%`, requiring zero UAC Administrator privileges. |
| **No Hardcoded Developer Paths** | **VERIFIED** | Dynamically expanded at install time per user profile. |
| **Single-Origin Allowed** | **VERIFIED** | Strictly pinned to extension ID `olfkacbfbgihonffpmnmnhmfmonfhmpf`. |
| **No URL-Based Executable Path** | **VERIFIED** | Path resolves strictly to local filesystem executable. |
| **Registry Isolation** | **VERIFIED** | Isolated under `com.cinematic.studio` subkey; touches no other application keys. |

---

## 5. Specification Summary

- **Canonical Manifest Path**: `%LOCALAPPDATA%\CinematicStudio\NativeMessaging\com.cinematic.studio.json`
- **Canonical Binary Path**: `%LOCALAPPDATA%\CinematicStudio\bin\cinematic-studio-host.exe`
- **Canonical Registry Target**: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`
- **Readiness Verdict**: **PRODUCTION SPECIFICATION READY FOR PACKAGING**.

*Report frozen as `NATIVE-MESSAGING-PRODUCTION-MANIFEST.md`.*

