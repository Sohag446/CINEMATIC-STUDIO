# TECHNOLOGY STACK DECISIONS & COMPARATIVE EVALUATION (REVISED)
## CINEMATIC STUDIO: Technical Feasibility, Protocol Selection & Subsystem Architecture

---

## 1. Desktop Application Framework Comparison

The desktop shell is the master orchestrator. We evaluated the leading desktop paradigms against strict criteria: RAM consumption, Windows 10/11 process architecture, local IPC capabilities, and ecosystem maintenance.

### 1.1 Comparative Evaluation Matrix

| Framework | Idle Process Tree RAM | Underlying Process Architecture | Language & Ecosystem | Windows Integration (Named Pipes / Registry) | Crash Containment | Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tauri 2 (Rust + WebView2)** | **180 – 260 MB** (Total tree) | **1 Rust Core + 4-5 WebView2 Processes** (Broker, GPU, Network, Renderer) | **Rust + React / TS** | **Direct Win32 API, Named Pipes, Registry via native crates** | **High** (Isolated native core & renderer processes) | **SELECTED (Optimal)** |
| **Electron 30+** | 350 – 550 MB (Total tree) | 1 Main Node.js + 4-6 Chromium Processes | Node.js + Chromium | Node native addons required for Win32 Named Pipe security | Moderate (V8 memory leaks propagate) | REJECTED (High baseline bloat) |
| **Flutter Desktop** | 220 – 380 MB | Flutter Engine + C++ Embedder | Dart | Complex C++ FFI bindings required for deep Win32 integration | High | REJECTED (Poor web interop, weak NLE UI libraries) |
| **Qt 6 / C++** | 120 – 200 MB | Single native process (or QWebEngine) | C++ / QML | First-class native Win32 | High | REJECTED (Excessive development friction for rich cinematic UI) |
| **Native WinUI 3 / C#** | 240 – 400 MB | .NET 8 Runtime + WinUI XAML | C# / .NET 8 | Native Windows runtime | High | REJECTED (Locked to Windows, poor multiplatform future) |

### 1.2 Selection Rationale: Tauri 2 + Rust
1. **Realistic Memory Analysis**: Unlike Electron, Tauri does not package a standalone 150 MB Chromium binary. It leverages the OS-managed Microsoft Edge WebView2 runtime. While WebView2 still spawns multiple processes (totaling 180–260 MB at idle), its shared operating system working set and efficient process lifecycle result in roughly half the active memory overhead of Electron.
2. **Crash-Resilient Systems Language**: Rust’s compile-time ownership model and lack of garbage collection pauses guarantee that long-running tasks (such as 60-minute video asset indexing and multi-channel IPC routing) operate without sudden memory spikes or background runtime pauses.
3. **Native Win32 IPC & Windows Security**: Rust provides first-class native access to Windows Named Pipes (`\\.\pipe\...`), Security Descriptors (DACLs), and the Windows Registry without requiring unstable native C++ Node addons.

---

## 2. Desktop-to-Extension Communication Protocol Analysis

Connecting a standalone desktop application with multiple Chrome Extensions installed in different Chrome Profiles presents strict technical constraints under Windows and Chrome's **Manifest V3 (MV3)** architecture.

### 2.1 Critical Review of Protocol Options

#### The Browser W3C WebSocket Header Restriction
A common architectural flaw is assuming that client-side JavaScript can pass custom HTTP headers during WebSocket connection setup:
```javascript
// ILLEGAL IN BROWSERS - WILL THROW AN ERROR
const ws = new WebSocket("ws://127.0.0.1:48124", {
  headers: { "X-Cinematic-Profile-Token": "secret" } // NOT SUPPORTED by W3C WebSocket API
});
```
The browser standard `WebSocket` constructor strictly disallows custom HTTP request headers to prevent Cross-Site WebSocket Hijacking (CSWSH) and header-spoofing attacks. Placing sensitive tokens in URL query strings (`ws://127.0.0.1:48124?token=secret`) is also problematic, as tokens can be logged, leaked in browser history, and exposed to local process inspection.

#### Evaluating the Four Connection Architectures

```
+---------------------------------------------------------------------------------------------------+
| Option A: Chrome Native Messaging Direct                                                          |
| Extension -> chrome.runtime.connectNative("com.cinematic.studio") -> Spawns Host.exe stdin/stdout |
| PROS: Origin strictly enforced by Chrome, zero network ports opened.                              |
| CONS: Chrome spawns a NEW child process for every extension connection; does not natively connect |
| to an ALREADY RUNNING standalone desktop application without an IPC relay.                        |
+---------------------------------------------------------------------------------------------------+
| Option B: Native Messaging with Windows Named Pipe Relay (SELECTED PRIMARY ARCHITECTURE)         |
| Desktop hosts Named Pipe (\\.\pipe\cinematic_studio_ipc) with Windows DACL.                       |
| Extension calls connectNative() -> Chrome spawns tiny Rust relay (cinematic-relay.exe) ->         |
| Relay connects to Desktop Named Pipe and forwards 32-bit framed JSON-RPC packets.                 |
| PROS: ZERO open network ports (immune to localhost port scanners, CSWSH, and firewall blocks).    |
| Native OS security verification (only processes running under current user SID can open pipe).    |
| No browser WebSocket header restrictions. Origin strictly enforced by Chrome.                     |
+---------------------------------------------------------------------------------------------------+
| Option C: Authenticated Loopback WebSocket with Challenge-Response Handshake (SECONDARY FALLBACK) |
| Desktop runs loopback WS server (127.0.0.1:48124).                                                |
| Extension opens standard WS connection. Handshake is performed at the APPLICATION layer:         |
| Desktop emits random 256-bit nonce -> Extension replies with HMAC-SHA256(nonce, pairing_token).  |
| If not completed in 1.5 seconds, connection is dropped.                                           |
| PROS: Works in developer environments where Windows Registry keys cannot be registered.           |
| CONS: Exposes an open local network port; subject to firewall prompts and local probing.         |
+---------------------------------------------------------------------------------------------------+
```

### 2.2 Selected Architecture: Native Messaging + Windows Named Pipe Relay
- **Primary Transport**: Chrome Native Messaging via a lightweight Rust companion relay (`cinematic-relay.exe`) that bridges Chrome's `stdin`/`stdout` directly into the Desktop's Windows Named Pipe (`\\.\pipe\cinematic_studio_ipc`).
- **Security Boundary**: Windows Discretionary Access Control Lists (DACL) restrict pipe access exclusively to the current logged-in Windows user security identifier (SID). Chrome's native messaging manifest strictly enforces that only the registered extension ID can invoke the relay.
- **Portless Design**: No local TCP/WebSocket ports are opened on `127.0.0.1`, completely eliminating localhost port scanning, CSWSH attacks, and third-party web tab probing.
- **Secondary Portable Fallback**: A local loopback WebSocket server utilizing application-layer HMAC challenge-response is maintained as an optional fallback for development environments where Windows Registry writing is restricted.

---

## 3. Database & Local Persistence Evaluation

The platform must maintain relational integrity across hundreds of scenes, clips, prompt revisions, character profiles, and execution logs.

### 3.1 Comparative Matrix

| Solution | Concurrency & Integrity | Memory Footprint | Large Query Performance | Portability | Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SQLite 3 (WAL mode via `rusqlite`)** | **ACID, Write-Ahead Logging, Zero-lock readers** | **12 – 28 MB** | **Extremely Fast (Indexed B-Trees)** | **Single-file (`.db`), 100% portable** | **SELECTED** |
| **DuckDB** | OLAP/Columnar optimized | 45 – 90 MB | Optimized for aggregate analytics, slower for transactional row mutations | Single-file | REJECTED (Wrong access pattern) |
| **Embedded RocksDB / Sled** | Key-Value / LSM Tree | 30 – 60 MB | Fast writes, poor relational querying for hierarchical story breakdown | Multi-file directory | REJECTED (Lacks relational joins) |
| **Plain JSON Files** | No ACID, high corruption risk during sudden shutdown | High (Must parse entire JSON into memory) | Degrades severely beyond 50 MB | Simple | REJECTED (Unsafe for large video projects) |

### 3.2 Corrected SQLite Memory Configuration
```sql
PRAGMA journal_mode = WAL;       -- Highly concurrent, non-blocking reads during active writes
PRAGMA synchronous = NORMAL;     -- Crash-safe on modern filesystems without disk thrashing
PRAGMA foreign_keys = ON;        -- Strict relational integrity enforcement
PRAGMA cache_size = -8000;       -- Explicit 8,000 KB (8.0 MB) maximum page cache
PRAGMA temp_store = FILE;        -- Spill large sorts, temp tables, and index builds to disk (PROTECTS RAM)
PRAGMA mmap_size = 0;           -- Avoid unmanaged OS memory-mapping bloat
```

---

## 4. Media Processing & Assembly Architecture

To assemble 60+ minute films without consuming gigabytes of system RAM, media processing must be strictly offloaded from the desktop application memory space.

### 4.1 Subprocess vs In-Process Bindings
We selected the **FFmpeg CLI Subprocess** architecture over embedded C bindings (`libavformat` FFI). Spawning FFmpeg as a separate operating system child process ensures that:
- Any codec crash, memory leak, or invalid bitstream panic is completely isolated to the child process and cannot crash the CINEMATIC STUDIO desktop application.
- All allocated frame buffers and decoder heaps are immediately and completely reclaimed by the operating system the moment the subprocess exits.

### 4.2 Stream Copy vs Normalizing Transcode Reality
- **Stream-Copy Concat Demuxer (`-c copy`)**: Valid **only** when all generated clips share identical codec parameters, resolution, aspect ratio, pixel format (`yuv420p`), and Constant Frame Rate (CFR). In this ideal scenario, assembly requires under 60 seconds and under 80 MB RAM.
- **Normalizing Filtergraph Transcode**: When clips have differing resolutions, Variable Frame Rates (VFR common in generative AI outputs), or when mixing multiple audio stems (Dialogue, Foley, Music), a full decode-filter-encode pass is required. Memory is constrained using `-threads 4` and `-max_muxing_queue_size 1024`, holding working memory to **400 – 850 MB**.
