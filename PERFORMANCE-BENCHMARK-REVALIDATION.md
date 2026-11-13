# CINEMATIC STUDIO — PERFORMANCE BENCHMARK REVALIDATION
## Forensic Re-Evaluation of Microbenchmarks, Hardware Profile & Real-World Latency

## 1. Executive Summary & Audit Mandate

Previous reports presented remarkable performance metrics:
- **92,483 packets / second** (Native framing throughput)
- **101,746 operations / second** (HMAC-SHA256 verification)
- **1,886 operations / second** (SQLite telemetry ingestion)
- **0.0 MB idle RAM** (Memory footprint)

In accordance with the evidence audit rules:
> **"Document hardware, runtime, iteration count, warm-up, measurement method, and whether results include real Chrome, Rust, and desktop processes. Do not present microbenchmark throughput as end-to-end application performance. Do not claim 0 MB for the complete Chrome/Extension process footprint."**

This report re-evaluates every performance claim with scientific transparency.

---

## 2. Benchmark Environment & Methodology Audit

| Parameter | Recorded Value | Evaluation & Limitations |
| :--- | :--- | :--- |
| **Operating System** | Windows 11 Pro (64-bit, Build 26200) | Enforced Smart App Control |
| **CPU Architecture** | AMD Ryzen 5 5600G (6 Cores / 12 Threads @ 3.9 GHz) | High single-thread clock speed |
| **Physical Memory** | 20.0 GB DDR4 RAM | Dual-channel memory subsystem |
| **Runtime Engine** | Node.js v20.18.0 (V8 Engine) | Single-threaded JavaScript execution |
| **Timing Mechanism** | `process.hrtime.bigint()` | Nanosecond-resolution CPU timer |
| **Real Chrome Included?** | **NO** | Zero browser renderer/extension overhead |
| **Real Rust Binary Included?** | **NO** | Binary not compiled; tested in Node.js |
| **OS Inter-Process Pipes?** | **NO** | Buffer operations in shared heap memory |
| **Disk I/O Included?** | **NO** | Executed in RAM via WASM `sql.js` |

---

## 3. Dissection of the Four Primary Performance Claims

### Claim 1: "92,483 Packets / Second (10.81 µs Average Latency)"
- **Execution Reality**:
  - The benchmark executed 10,000 iterations of `Buffer.alloc(4)`, `writeUInt32LE`, `Buffer.concat`, and `JSON.parse` inside a single synchronous JavaScript loop.
  - There were **no OS pipe writes (`WriteFile`)**, **no OS pipe reads (`ReadFile`)**, and **no kernel context switches**.
- **Real-World Translation**:
  - In actual Chrome Native Messaging on Windows over named pipes / anonymous stdio pipes, round-trip IPC latency is governed by Windows process scheduling and Chrome's IPC broker, typically measuring **1.0 to 5.0 milliseconds per round-trip** (not 10.8 microseconds).
  - **Verdict**: The claim represents **in-memory buffer serialization speed**, not end-to-end Native Messaging throughput.

---

### Claim 2: "101,746 HMAC Operations / Second (9.83 µs Average Latency)"
- **Execution Reality**:
  - The benchmark executed 5,000 iterations of Node.js's native C++ OpenSSL binding `crypto.createHmac('sha256')` followed by `crypto.timingSafeEqual`.
- **Real-World Translation**:
  - This metric is mathematically accurate for local OpenSSL HMAC-SHA256 computations on a Ryzen 5 5600G.
  - In practice, because pairing handshakes occur only once every several minutes or on reconnection, this sub-millisecond crypto speed ensures that cryptographic pairing introduces zero detectable latency into the user experience.
  - **Verdict**: Valid local cryptographic microbenchmark.

---

### Claim 3: "1,886 SQLite Operations / Second"
- **Execution Reality**:
  - The benchmark executed 1,000 paired statements (`INSERT INTO task_execution_logs` and `UPDATE tasks`) against `sql.js`, an in-memory SQLite database compiled to WebAssembly.
  - No `fsync`, write-ahead logging (WAL) disk commits, or multi-process concurrency locks were exercised.
- **Real-World Translation**:
  - In the compiled desktop application running native SQLite (`rusqlite` / `r2d2`) on NVMe storage, disk-backed transaction throughput typically ranges from **200 to 500 writes/second** without WAL, or **2,000–5,000 writes/second** with WAL batching.
  - **Verdict**: Valid in-memory relational engine benchmark; real disk throughput will vary based on disk sync configurations.

---

### Claim 4: "0.0 MB Idle RAM Footprint"
- **Execution Reality**:
  - The "0.0 MB" figure refers strictly to the **ephemeral Chrome MV3 Service Worker when suspended by Chrome**.
  - Manifest V3 service workers are designed to terminate after ~30 seconds of inactivity, freeing their renderer thread memory.
- **Critical Correction**:
  - **The complete application footprint is NOT 0 MB.**
  - A running Chrome browser with 10 user profiles consumes **~400–1,200 MB RAM**.
  - A running Tauri 2 application (WebView2 runtime + Rust core) consumes **~60–180 MB RAM**.
  - The test process itself showed an RSS of **47.85 MB RAM**.
  - **Verdict**: Claim corrected. "0 MB" applies strictly to dormant MV3 extension background threads, not the host system or browser.

---

## 4. Reconciled Performance Matrix

| Metric Category | Claimed Value | Reconciled Reality | Context & Scope |
| :--- | :--- | :--- | :--- |
| **Packet Serialization** | 92,483 pkts/s | In-memory Buffer encode/decode | Local V8 heap only; no OS pipe I/O |
| **Real Native Messaging**| ~92k pkts/s | **200–1,000 pkts/s (1–5ms)** | Expected over Windows stdio pipes |
| **Crypto Verification** | 101,746 ops/s | Genuine OpenSSL speed | Verified on AMD Ryzen 5 5600G |
| **Database Telemetry** | 1,886 ops/s | In-memory WASM SQLite | RAM only; excludes NVMe `fsync` |
| **Extension Idle RAM** | 0.0 MB | **0.0 MB (Suspended worker only)** | Chrome browser RAM is 400–1,200 MB |
| **Desktop App RAM** | Unreported | **~60–180 MB RSS (Expected)** | WebView2 runtime + Rust core |

*Report frozen as `PERFORMANCE-BENCHMARK-REVALIDATION.md`.*

