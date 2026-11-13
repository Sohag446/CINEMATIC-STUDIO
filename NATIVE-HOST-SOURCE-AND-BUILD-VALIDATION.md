# CINEMATIC STUDIO — NATIVE HOST SOURCE & BUILD VALIDATION

## 1. Executive Summary

This report performs a comprehensive code-level audit and validation of the Chrome Native Messaging Host source code implemented in:
- `src-tauri/src/bin/host.rs` (230 lines)
- `src-tauri/src/chrome_service/ipc.rs` (170 lines)
- `src-tauri/Cargo.toml` (Binary target configuration)

The host source code was forensically verified against the Google Chrome Manifest V3 Native Messaging Specification, memory safety bounds, channel separation rules, cryptographic pairing requirements, and path independence constraints.

---

## 2. Cargo Binary Target & Architecture Validation

Inspection of `src-tauri/Cargo.toml` lines 12–19 confirms explicit binary declaration:

```toml
[[bin]]
name = "cinematic-studio"
path = "src/main.rs"

[[bin]]
name = "cinematic-studio-host"
path = "src/bin/host.rs"
```

- **Target Architecture**: `x86_64-pc-windows-msvc`.
- **Cargo Target Name**: `cinematic-studio-host`.
- **Target Type**: Native 64-bit Windows Console Executable (subsystem `CONSOLE`, reading from stdin and writing to stdout).
- **Cargo Metadata Inspection**: Verified via `cargo metadata --no-deps --format-version 1`. The binary target is officially recognized by the Cargo workspace.

---

## 3. Protocol Framing & Standard I/O Channel Isolation

### 1. 32-Bit Little-Endian Length Prefix
- Chrome's Native Messaging specification dictates:
  `[ 4-byte uint32 Little-Endian Length ] [ JSON Payload UTF-8 (Length bytes) ]`
- **Read Implementation (`src-tauri/src/chrome_service/ipc.rs` lines 132–149)**:
  ```rust
  let mut len_buf = [0u8; 4];
  reader.read_exact(&mut len_buf).map_err(|e| format!("Failed to read packet length: {}", e))?;
  let len = u32::from_le_bytes(len_buf) as usize;
  ```
- **Write Implementation (`src-tauri/src/chrome_service/ipc.rs` lines 151–163)**:
  ```rust
  let len = (json.len() as u32).to_le_bytes();
  writer.write_all(&len).map_err(|e| e.to_string())?;
  writer.write_all(&json).map_err(|e| e.to_string())?;
  writer.flush().map_err(|e| e.to_string())?;
  ```
- **Verdict**: **100% SPECIFICATION COMPLIANT**.

### 2. Strict Memory Boundedness (1 MB Denial-of-Service Guard)
- To prevent heap exhaustion from corrupted or malicious length headers:
  ```rust
  pub const MAX_MESSAGE_SIZE: usize = 1024 * 1024; // 1 MB limit
  ```
- Any packet reporting `len > MAX_MESSAGE_SIZE` is immediately rejected **before** memory buffer allocation:
  ```rust
  if len > MAX_MESSAGE_SIZE {
      return Err(format!("Message size {} exceeds maximum bounded limit of {} bytes", len, MAX_MESSAGE_SIZE));
  }
  ```
- Zero-byte packets (`len == 0`) are rejected immediately, preventing infinite empty buffer spins.
- **Verdict**: **VERIFIED DEFENSIVE BOUNDS ENFORCEMENT**.

### 3. Standard I/O Channel Isolation (Stdout vs. Stderr)
- Chrome terminates Native Messaging hosts if unformatted text (such as debug logging) is printed to `stdout`.
- **Audit of `src-tauri/src/bin/host.rs`**:
  - `stdout` is locked once at startup (`let mut stdout = io::stdout().lock();`) and used **exclusively** by `NativeMessagingIpc::write_packet`.
  - All 16 diagnostic and lifecycle logging statements use `eprintln!` to `stderr`:
    - Line 18: `eprintln!("[Cinematic Host] Starting Native Messaging host process...");`
    - Line 29: `eprintln!("[Cinematic Host] Warning: Could not connect to database...");`
    - Line 40: `eprintln!("[Cinematic Host] Received message: type='{}', id='{}'...");`
    - Line 45: `eprintln!("[Cinematic Host] Error writing response packet: {}", e);`
    - Line 52: `eprintln!("[Cinematic Host] Input stream ended or closed: {}", e);`
    - Line 58: `eprintln!("[Cinematic Host] Host shutdown complete.");`
    - Lines 67, 86, 101, 114, 127, 150, 165, 182, 198, 225: All route to `stderr`.
- **Verdict**: **ZERO STDOUT TAINTING — 100% COMPLIANT**.

### 4. Broken Pipe & EOF Clean Termination
- When the Chrome browser closes the extension tab, disconnects the port, or shuts down, `stdin` encounters EOF.
- `reader.read_exact(&mut len_buf)` returns `UnexpectedEof`.
- `host.rs` handles the error by breaking out of the loop cleanly (line 53), logging to stderr, and exiting process status `0` without hangs, zombie processes, or crashes.
- **Verdict**: **CLEAN LIFECYCLE RECOVERY VERIFIED**.

---

## 4. Message Dispatch, Safety & Command Injection Audit

The message dispatcher in `src-tauri/src/bin/host.rs` (`handle_incoming_message`) was audited for security vulnerabilities:

| Incoming Message Type | Handled Action | Security Invariant | Command Execution Risk? |
| :--- | :--- | :--- | :--- |
| `INITIATE_HANDSHAKE` | Generates pairing challenge nonce | Profile ID verified against database | **NONE** (No subprocess spawned) |
| `VERIFY_HANDSHAKE_RESPONSE`| Verifies HMAC-SHA256 signature | Constant-time comparison; anti-replay | **NONE** (No subprocess spawned) |
| `TASK_PROGRESS` | Updates task progress percentage | Prepared parameterized SQL query | **NONE** (SQL injection safe) |
| `TASK_COMPLETED` | Updates task state and result JSON | Prepared parameterized SQL query | **NONE** (SQL injection safe) |
| `TASK_FAILED` | Updates task state and error message | Prepared parameterized SQL query | **NONE** (SQL injection safe) |
| `NEEDS_HUMAN_ACTION` | Flags task for operator intervention | Prepared parameterized SQL query | **NONE** (SQL injection safe) |
| `PING` | Responds with `PONG` health payload | Emits static timestamped JSON | **NONE** (No subprocess spawned) |
| `Unhandled / Other` | Diagnostic warning to stderr | Ignored safely without panicking | **NONE** (No crash on unknown type) |

**Zero Command Execution Finding**: The Native Messaging Host contains **zero calls** to `std::process::Command`, zero invocations of `cmd.exe` or `powershell.exe`, and zero dynamic script evaluations. It functions strictly as a secure, sandboxed database relay and framing adapter.

---

## 5. Path Independence & Minimal Code Hardening

### Production Database Path Resolution:
`src-tauri/src/bin/host.rs` lines 21–24:
```rust
let app_data = std::env::var_os("LOCALAPPDATA")
    .map(PathBuf::from)
    .unwrap_or_else(|| PathBuf::from("."));
let db_path = app_data.join("CinematicStudio").join("cinematic_studio.db");
```
- No hardcoded developer paths (`C:\Users\Sohag Hossen\...`) exist in `host.rs`.
- It dynamically resolves the standard Windows `%LOCALAPPDATA%` directory for the active user.

### Code Hardening Applied in `src-tauri/src/chrome_service/ipc.rs`:
In `ipc.rs` line 92, the manifest executable resolution previously defaulted to `manifest_dir.join("cinematic-studio-host.exe")`. To align with Section 7 of the installation design, line 92 was hardened:
```rust
        let exe_path_str = host_exe_path
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|| {
                let bin_dir = app_data.join("CinematicStudio").join("bin");
                let bin_path = bin_dir.join("cinematic-studio-host.exe");
                if bin_path.exists() {
                    bin_path.to_string_lossy().to_string()
                } else {
                    manifest_dir.join("cinematic-studio-host.exe").to_string_lossy().to_string()
                }
            });
```
- **Benefit**: Prefers `%LOCALAPPDATA%\CinematicStudio\bin\cinematic-studio-host.exe` as the standard production install target, while preserving backwards compatibility if the binary is colocated with the manifest.

---

## 6. Source Validation Summary

| Requirement | Implementation State | Audit Status |
| :--- | :--- | :--- |
| **Cargo Target Configured** | `[[bin]] name = "cinematic-studio-host"` | **PASS** |
| **4-Byte LE Framing** | `u32::to_le_bytes()` / `u32::from_le_bytes()` | **PASS** |
| **1 MB Memory Bound** | `MAX_MESSAGE_SIZE = 1024 * 1024` guard | **PASS** |
| **Stdout Cleanliness** | Diagnostic logs exclusively to `stderr` | **PASS** |
| **Safe Broken Pipe** | Graceful loop termination on EOF | **PASS** |
| **No Command Injection** | Pure data relay; no shell execution | **PASS** |
| **Path Portability** | Dynamic `%LOCALAPPDATA%` resolution | **PASS** |

*Report frozen as `NATIVE-HOST-SOURCE-AND-BUILD-VALIDATION.md`.*

