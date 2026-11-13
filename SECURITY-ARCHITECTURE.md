# SECURITY ARCHITECTURE & THREAT MODEL (REVISED)
## CINEMATIC STUDIO: Defense-in-Depth, Portless IPC & Credential Sovereignty

---

## 1. Security Architecture Principles & Threat Boundaries

CINEMATIC STUDIO implements a strict **Defense-in-Depth** security model designed to eliminate local network attack surfaces, prevent credential exfiltration, and ensure complete isolation between Chrome profiles.

```
                             [ UNTRUSTED INTERNET ]
                                        |
                 +----------------------+----------------------+
                 |                                             |
+----------------v-----------------------------+ +-------------v-------------------------------+
| Chrome Tab: chatgpt.com / veo                | | Malicious Local Website / Port Scanner      |
| (Subject to third-party web content/scripts) | | (Attacking 127.0.0.1 via browser tabs)      |
+----------------+-----------------------------+ +-------------+-------------------------------+
                 |                                             |
                 | Content Script (Isolated World)             | Attempts to connect to local port:
                 v                                             v
+----------------------------------------------+ +---------------------------------------------+
| Extension Service Worker (Manifest V3)       | | BLOCKED: NO NETWORK PORT IS OPEN!           |
| (Origin: chrome-extension://<EXTENSION_ID>)  | | CINEMATIC STUDIO OPENS ZERO TCP PORTS.      |
+----------------+-----------------------------+ +---------------------------------------------+
                 |
                 | Chrome Native Messaging (stdin/stdout framed JSON)
                 | Chrome validates extension ID against Windows Registry manifest
                 v
+----------------------------------------------------------------------------------------------+
| NATIVE MESSAGING COMPANION RELAY (cinematic-relay.exe)                                       |
| - Connects to Windows Named Pipe: \\.\pipe\cinematic_studio_ipc                              |
| - Verified by Windows OS Security Descriptors (DACL: Restricted to current user SID)         |
+----------------------------------------------------------------------------------------------+
                 |
                 | OS Named Pipe Stream (Zero-Copy Inter-Process Communication)
                 v
+----------------------------------------------------------------------------------------------+
| CINEMATIC STUDIO DESKTOP CORE (RUST)                                                         |
| - Profile Authenticator: Mutual HMAC-SHA256 challenge-response handshake                    |
| - Parameter Sanitizer: Zero shell execution; direct vector array arguments                   |
| - Filesystem Sandbox: Read/Write restricted to user's managed project vault                  |
+----------------------------------------------------------------------------------------------+
```

---

## 2. Desktop-to-Extension Communication Security

### 2.1 The Browser WebSocket Header Vulnerability & Correction
In standard browser environments, the W3C JavaScript `WebSocket` API strictly forbids passing custom HTTP headers:
```javascript
// ILLEGAL IN BROWSERS - Throws error or ignores headers
new WebSocket("ws://127.0.0.1:48124", { headers: { "X-Cinematic-Profile-Token": "secret" } });
```
Furthermore, passing authentication tokens inside URL query strings (`ws://127.0.0.1:48124?token=secret`) exposes sensitive secrets in server access logs, network inspection tools, and operating system process command lines.

### 2.2 Primary Architecture: Portless Windows Named Pipe Relay
To eliminate local network attack surfaces entirely, CINEMATIC STUDIO uses **Chrome Native Messaging paired with a Windows Named Pipe Relay**:

1. **Named Pipe Creation with OS-Level DACL**:
   - The Desktop application creates a Windows Named Pipe at `\\.\pipe\cinematic_studio_ipc`.
   - It attaches a strict Windows Security Descriptor (DACL) that grants read/write permissions **exclusively to the current user's Security Identifier (SID)** (`GetTokenInformation(TokenUser)`).
   - Any process running under a different user account, guest account, or network sandbox is rejected by the Windows kernel.
2. **Chrome Native Messaging Enforcement**:
   - The relay manifest is installed in the Windows Registry under `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`.
   - The manifest declares `allowed_origins: ["chrome-extension://<EXTENSION_ID>/"]`.
   - Chrome's native security layer enforces that **only** the extension matching that specific cryptographic ID can launch and communicate with `cinematic-relay.exe`.
3. **Zero Network Port Exposure**:
   - Because no TCP/WebSocket port is opened on `127.0.0.1`, the application is **100% immune** to:
     - Localhost port scanning from malicious websites running in browser tabs.
     - Cross-Site WebSocket Hijacking (CSWSH).
     - Local corporate firewall or antivirus port-binding blocks.

---

## 3. Profile Authentication, Token Management & Anti-Replay

To ensure that multiple Chrome profiles (e.g. Profile 1 for ChatGPT, Profile 2 for Veo) cannot impersonate each other or interfere with separate projects:

```
[ Chrome Extension in Profile X ]                 [ Desktop Named Pipe Bridge ]
                 |                                               |
                 | 1. chrome.runtime.connectNative(...)          |
                 +---------------------------------------------->|
                 |    (Relay opens Named Pipe connection)        |
                 |                                               |
                 | 2. JSON-RPC: "initiate_handshake"             |
                 +---------------------------------------------->|
                 |    Params: { profile_id, client_nonce }       |
                 |                                               |
                 | 3. JSON-RPC: "challenge_issued"               |
                 |<----------------------------------------------+
                 |    Params: { server_nonce, timestamp }        |
                 |                                               |
                 | 4. Compute: HMAC_SHA256(                      |
                 |      client_nonce + server_nonce + timestamp, |
                 |      pairing_secret_key                       |
                 |    )                                          |
                 |                                               |
                 | 5. JSON-RPC: "verify_handshake"               |
                 +---------------------------------------------->|
                 |    Params: { signature }                      |
                 |                                               |
                 | 6. Desktop verifies signature against SQLite  |
                 |    - Valid: Grants ephemeral Session UUID     |
                 |    - Invalid / Expired: Closes pipe           |
                 |                                               |
                 | 7. JSON-RPC: "handshake_success"              |
                 |<----------------------------------------------+
                 |    Params: { session_id, permissions }        |
```

### 3.1 Anti-Replay & Token Rotation Safeguards
- **Timestamp & Nonce Binding**: The challenge includes a 64-bit random server nonce and an epoch timestamp. Handshake messages older than 30 seconds are rejected, preventing recorded packet replay attacks.
- **Isolated Storage**: The `pairing_secret_key` is stored inside `chrome.storage.local`, which is strictly partition-isolated by Chrome between profiles.
- **One-Click Token Rotation**: The Desktop UI allows the user to rotate the pairing token at any time. Rotating the token invalidates existing active sessions and requires the user to click "Re-pair" in the extension popup.

---

## 4. Subprocess & Command Injection Immunity

A major security vulnerability in desktop automation software is passing user-generated strings (prompts, scene titles, filenames) into shell interpreters (`cmd.exe` or `powershell.exe`).

CINEMATIC STUDIO enforces **Zero Shell Execution**:
- The Rust backend **never** invokes shell wrappers (`Command::new("cmd")` or `Command::new("sh")`).
- Subprocesses such as FFmpeg are spawned directly via the operating system's native process creation API (`CreateProcessW` on Windows) using Rust’s strongly typed argument vectors:
  ```rust
  let mut cmd = tokio::process::Command::new(&ffmpeg_path);
  cmd.args(&[
      "-f", "concat",
      "-safe", "0",
      "-i", &playlist_path,
      "-c", "copy",
      &output_path
  ]);
  // Arguments are passed as discrete pointers; shell expansion/chaining is impossible.
  ```

---

## 5. Filesystem Sandboxing & Path Traversal Prevention

1. **Restricted Vault Boundaries**: File operations are strictly confined to the user-designated project folder and `%LOCALAPPDATA%\CinematicStudio`.
2. **ZIP Slip Immunity**: During project archive import (`.csproj.zip`), every file entry path is canonicalized. If any path contains relative directory traversal components (`../` or `..\`) that resolve outside the project root directory, the entire extraction is halted immediately, and the archive is flagged as corrupted/malicious.
3. **No Execution Permissions in Vault**: The project media directories (`clips/`, `thumbnails/`, `audio/`) are configured with standard Windows NTFS data-only permissions, preventing accidental execution of downloaded binaries.
