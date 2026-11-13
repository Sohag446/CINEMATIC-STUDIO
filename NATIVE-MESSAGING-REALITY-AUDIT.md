# CINEMATIC STUDIO — NATIVE MESSAGING REALITY AUDIT
## Real-World Host Execution, Build Feasibility & Windows Code Integrity

## 1. Physical Existence & Runtime Reality Check

A filesystem and registry sweep was conducted to verify the physical presence of the Native Messaging Host on this Windows 11 workstation:

```
[MISSING] src-tauri/target/debug/cinematic-studio-host.exe
[MISSING] src-tauri/target/release/cinematic-studio-host.exe
[MISSING] src-tauri/target/debug/host.exe
[MISSING] src-tauri/target/release/host.exe
[MISSING] C:\Users\Sohag Hossen\AppData\Local\CinematicStudio\bin\cinematic-studio-host.exe
[MISSING] C:\Users\Sohag Hossen\AppData\Local\CinematicStudio\NativeMessaging\com.cinematic.studio.json
```

### Windows Registry Query:
```powershell
reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio"
# Output: ERROR: The system was unable to find the specified registry key or value.
```

### Reality Verdict:
- **Host Binary Existence**: **MISSING**
- **Native Host Registration**: **NOT CONFIGURED**
- **Real Chrome-to-Host Communication**: **`BLOCKED`**

Because the binary does not exist and the host manifest is not registered in the Windows Registry, **Google Chrome cannot launch, communicate with, or exchange Native Messaging frames with CINEMATIC STUDIO on this machine at this time**. Any claim that real Chrome-to-host execution is currently operational is factually false.

---

## 2. Source-Code Architecture Audit

While the physical binary is absent, the Rust source implementation exists and was audited in detail:

### 1. Host Binary Implementation (`src-tauri/src/bin/host.rs`)
- **Total Lines**: 230 lines of Rust.
- **Entry Point**: `fn main()` locks `io::stdin()` and `io::stdout()`.
- **Main Loop**: Continuously executes `NativeMessagingIpc::read_packet(&mut stdin)`.
- **Clean Termination**: Breaks immediately when `read_packet` encounters EOF (`UnexpectedEof`), terminating gracefully when Chrome closes `stdin`.
- **Message Dispatch**: Dispatches `INITIATE_HANDSHAKE`, `VERIFY_HANDSHAKE_RESPONSE`, `PING`, `TASK_PROGRESS`, `TASK_COMPLETED`, `TASK_FAILED`, and `NEEDS_HUMAN_ACTION`.

### 2. Stdio Framing Protocol (`src-tauri/src/chrome_service/ipc.rs`)
- **32-Bit Little-Endian Length Prefix**:
  - Serialization: `let len = (json.len() as u32).to_le_bytes(); writer.write_all(&len);`
  - Deserialization: `let len = u32::from_le_bytes(len_buf) as usize;`
- **Strict Memory Bounding (1 MB Guard)**:
  - `pub const MAX_MESSAGE_SIZE: usize = 1024 * 1024;`
  - Rejects oversized frames before allocating heap memory (`Err("Message size exceeds maximum bounded limit")`).
- **Zero-Byte Packet Handling**:
  - Rejects `len == 0` with `Err("Received 0-byte packet")`, preventing infinite empty reader spins.
- **Standard Output Channel Separation**:
  - Chrome strictly requires `stdout` to contain exclusively length-prefixed JSON frames.
  - All host logging uses `eprintln!` to `stderr` exclusively (`lines 18, 29, 40, 45, 52, 58, 67, etc.`), ensuring stdout framing is never corrupted by diagnostic output.

---

## 3. Windows Smart App Control & Local Build Feasibility

### Blocker Investigation
1. **Operating System Policy**:
   - The workstation runs **Windows 11 Pro Build 26200** with **Smart App Control (SAC)** active in enforcement mode.
   - When local ad-hoc Rust compilations or unsigned link outputs are invoked, Windows Code Integrity blocks execution with:
     `os error 4551: An Application Control policy has blocked this file.`
   - Audit logs capture Code Integrity **Event ID 3077** and **Event ID 3033** for unverified binaries.
2. **Offline Dependency Gap**:
   - The workstation environment lacks pre-vendored crate packages for `chrono`, `r2d2`, `rusqlite`, and Tauri v2 dependencies. Offline cargo invocation (`cargo check --offline`) fails with:
     `error: no matching package named chrono found in crates.io index`.
3. **Security Policy Compliance**:
   - In accordance with the prompt's explicit mandate, **Windows Smart App Control, Defender, and Code Integrity were NOT disabled or bypassed**.
   - No untrusted or unofficial third-party precompiled executables were downloaded.

---

## 4. Legitimate Supported Path to Local Host Availability

Because local unsigned compilation is blocked by SAC policies, the legitimate and supported engineering path to produce a runnable host binary consists of:

```
[Clean Local Git Repository] 
             |
             v (Push to approved CI / Cloud Builder)
[.github/workflows/windows-installer-build.yml]
             |
             +---> Runs 'cargo build --release' on Microsoft-hosted Windows 2022 runner
             |
             +---> Signs binaries with Authenticode Code Signing Certificate
             |     (signtool.exe sign /fd SHA256 /tr ... /td SHA256)
             |
             +---> Bundles NSIS Self-Contained Installer
             |
             v (Download Signed Release Package)
[Windows 11 Workstation Execution]
             |
             +---> Smart App Control verifies Authenticode signature & Cloud Reputation
             +---> Installs 'cinematic-studio-host.exe' to %LOCALAPPDATA%\CinematicStudio\bin\
             +---> Registers HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio
             |
             v
[LIVE CHROME RUNTIME UNBLOCKED]
```

---

## 5. Summary & Classification

| Component | Physical State | Audit Status | Reconciled Classification |
| :--- | :--- | :--- | :--- |
| `cinematic-studio-host.exe` | Non-Existent | Missing | **`BLOCKED`** |
| Local Native Rust Compilation | Blocked by OS Policy | SAC Error 4551 | **`BLOCKED`** |
| Real Chrome Native Port Link | Non-Existent | Unregistered | **`BLOCKED`** |
| Host Stdio Framing Source Code | Fully Implemented | Source Audited | **`LOCAL_COMPONENT_PASS`** |
| Stdio Protocol Harness Simulation | 12 Tests Passing | Verified in Node | **`SIMULATED_TEST_PASS`** |

*Report frozen as `NATIVE-MESSAGING-REALITY-AUDIT.md`.*

