# RAM & PERFORMANCE OPTIMIZATION STRATEGY (REVISED)
## CINEMATIC STUDIO: Realistic Memory Budgets, Process Overhead & System Safeguards

---

## 1. Workstation Memory Architecture & Realistic Operating Envelope

A standard creative workstation operating on **Windows 10/11 with 20 GB of Host RAM** must run the operating system, user background processes, Microsoft Edge WebView2 processes, multiple Google Chrome profile processes, and CINEMATIC STUDIO simultaneously without memory paging, swapping, or UI freezing.

```
+--------------------------------------------------------------------------------------------------+
| 20 GB HOST SYSTEM RAM ENVELOPE: REALISTIC PRODUCTION BREAKDOWN                                   |
|                                                                                                  |
| [==================== WINDOWS OS & BACKGROUND SYSTEM SERVICES (5.0 - 6.5 GB) ==================] |
|                                                                                                  |
| [================== GOOGLE CHROME PROFILES (1 TO 2 ACTIVE) (1.8 - 4.5 GB) ====================] |
|                                                                                                  |
| [======== CINEMATIC STUDIO DESKTOP (RUST + WEBVIEW2 PROCESS TREE) (250 - 650 MB) ========]       |
|                                                                                                  |
| [==== TRANSIENT MEDIA PROCESSING (FFMPEG ASSEMBLY / TRANSCODE) (80 - 850 MB) ====]               |
|                                                                                                  |
| [========================== DYNAMIC SAFETY HEADROOM (7.5 - 12.0 GB) ===========================] |
+--------------------------------------------------------------------------------------------------+
```

---

## 2. Granular Memory Accounting & Process Taxonomy

To avoid misleading performance promises, memory allocation must be categorized by:
1. **Measured Benchmarks**: Empirically verified baselines for core runtime components.
2. **Engineering Targets**: Hard bounds enforced by code (e.g. semaphore limits, channel buffer capacities, cache limits).
3. **Theoretical Estimates**: Variable external resource demands that fluctuate based on third-party web content, video codecs, and browser DOM complexity.

### 2.1 Complete Component-Level Memory Decomposition

| Component / Subsystem | Memory Category | Estimated Range | Underlying Process & Memory Drivers |
| :--- | :--- | :--- | :--- |
| **Windows 10/11 OS Baseline** | Measured Benchmark | 4.5 – 6.0 GB | Windows kernel, DWM, Explorer, Defender, background services. |
| **Tauri Core (Rust Backend)** | Measured Benchmark | 30 – 65 MB | Tokio async runtime, IPC handlers, SQLite connection pool, channels. |
| **Microsoft Edge WebView2** | Measured Benchmark | 180 – 450 MB | Spawns multiple processes: WebView2 Runtime Broker, GPU process, Network Service, and Blink Renderer process. V8 heap, DOM nodes. |
| **React Frontend Heap** | Engineering Target | 40 – 90 MB | Zustand state, TanStack Query cache, virtualized DOM nodes (recycled). |
| **SQLite Embedded Database** | Engineering Target | 12 – 28 MB | Bounded page cache (8 MB), statement cache, in-flight transaction journals. |
| **Single Chrome Profile (Idle)** | Measured Benchmark | 450 – 850 MB | Browser main process, Chrome GPU process, Utility network process, 1 idle tab. |
| **Chrome Profile (Active Video)** | Theoretical Estimate | 1.2 – 2.4 GB | WebGL canvas, remote AI video player buffers, DOM trees, video blobs in V8. |
| **Extension MV3 Agent** | Engineering Target | 20 – 45 MB | Background service worker (when active), content script DOM parsers. |
| **FFmpeg Concat Demuxer** | Engineering Target | 35 – 80 MB | Stream-copy file IO buffers, container demux/remux queues. |
| **FFmpeg Normalizing Transcode**| Theoretical Estimate | 350 – 850 MB | Decoded raw uncompressed YUV frame buffers in flight, x264 lookahead queues. |

---

## 3. Why the Previous "2.8 GB Total Peak" Was Incomplete

The earlier draft estimated a total peak of 2.8 GB. While that figure roughly represented the *added application footprint* (Desktop + 1 modest browser profile + FFmpeg copy), it was incomplete and potentially misleading because:
1. **WebView2 Multi-Process Reality**: Tauri does not bundle Chromium, but Windows WebView2 still spawns **4 to 6 separate operating system processes** (Browser, GPU, Network, Renderer). An idle WebView2 alone consumes 150–250 MB; adding complex WebGL or media canvases can drive it to 400 MB.
2. **Third-Party Chrome Memory Volatility**: Consumer AI video websites (Google Veo, Runway, Luma) are heavy single-page web applications. A single open tab rendering 3D preview canvases, video players, and animation loops can expand from 500 MB to **1.8 GB** on its own. Two active profiles with video tabs can easily demand **3.5 GB+**.
3. **FFmpeg Frame Buffering During Transcoding**: When video clips have mismatched framerates, aspect ratios, or codecs, FFmpeg cannot perform a stream copy. Transcoding 4K or 1080p video at 24fps requires allocating uncompressed frame buffers ($1920 \times 1080 \times 1.5\text{ bytes} \approx 3.1\text{ MB per raw YUV420p frame}$). With a multi-frame lookahead queue and multithreaded filtering, FFmpeg working memory can reach **400 MB to 850 MB**.

---

## 4. Realistic Production Scenario Budgets

### Scenario A: Desktop Idle (No Project Open)
- Tauri Rust Core: ~ 35 MB
- WebView2 Runtime (Broker + GPU + Renderer): ~ 180 MB
- Total Desktop Footprint: **215 – 260 MB**
- System Impact: Negligible ($\sim 1.2\%$ of 20 GB).

### Scenario B: Small Project Open (20 Clips, Active Editing)
- Tauri Rust Core: ~ 45 MB
- WebView2 Runtime + React UI (Virtualized): ~ 260 MB
- SQLite Working Set: ~ 16 MB
- Total Desktop Footprint: **290 – 380 MB**

### Scenario C: Large Featurette Open (360 Clips / 60 Minutes)
- Tauri Rust Core: ~ 65 MB
- WebView2 Runtime + React UI: ~ 340 MB
- SQLite Working Set (Paged indices): ~ 24 MB
- Media Scrubbing Proxy Cache (Disk-streamed): ~ 50 MB
- Total Desktop Footprint: **420 – 580 MB**
- *Note: DOM virtualization ensures that clip count scaling from 20 to 360 clips increases memory by less than 150 MB!*

### Scenario D: Active Production (1 Chrome Profile Generating Video)
- Desktop App: ~ 450 MB
- Chrome Profile 1 (Main + GPU + Video Tab): ~ 1.2 – 1.8 GB
- Extension Service Worker & Content Script: ~ 35 MB
- Total Production Set: **1.7 – 2.3 GB**

### Scenario E: High-Throughput Production (2 Chrome Profiles Active)
- Desktop App: ~ 500 MB
- Chrome Profile 1 (ChatGPT / Reasoning Tab): ~ 750 MB
- Chrome Profile 2 (Veo / Video Gen Tab): ~ 1.5 GB
- Extensions: ~ 70 MB
- Total Production Set: **2.8 – 3.8 GB**

### Scenario F: Long-Form Final Film Assembly
- **Case 1: Stream Copy Concat (Compatible Clips)**:
  - Desktop App: ~ 380 MB
  - FFmpeg Concat Subprocess: ~ 45 – 75 MB
  - Total Assembly Footprint: **425 – 455 MB**
- **Case 2: Full Normalizing Transcode & Multi-Track Audio Mix**:
  - Desktop App: ~ 400 MB
  - FFmpeg Transcoding Subprocess (`-threads 4`, 1080p): ~ 450 – 800 MB
  - Total Assembly Footprint: **850 MB – 1.2 GB**

---

## 5. Architectural Memory Protection Mechanisms

### 5.1 SQLite Database Memory Configuration: Correction of `temp_store`
In the previous draft, `PRAGMA temp_store = MEMORY;` was proposed. **This has been corrected**:
- Forcing temporary storage into RAM is dangerous in low-memory environments because large sorting operations, complex joins across 360+ clips, and index rebuilds can suddenly allocate hundreds of megabytes of heap memory.
- **Corrected Configuration**:
  ```sql
  PRAGMA cache_size = -8000;      -- Exactly 8,000 KB (8.0 MB) maximum page cache
  PRAGMA temp_store = FILE;        -- Spill temporary tables, sorting, and scratch buffers to disk
  PRAGMA mmap_size = 0;           -- Avoid unmanaged OS memory-mapping bloat
  PRAGMA journal_mode = WAL;       -- Highly concurrent, low-locking write-ahead log
  PRAGMA synchronous = NORMAL;     -- Crash-safe without disk thrashing
  ```

### 5.2 Bounded Concurrency & Backpressure
- Task dispatching is constrained by a `tokio::sync::Semaphore`.
- Inter-thread communication queues are strictly bounded: `tokio::sync::mpsc::channel(32)`.
- If a downstream worker slows down, upstream producers are suspended automatically by Tokio, preventing unbounded queue memory growth.

### 5.3 Off-RAM Media Streaming via Custom Protocol
- Large video files are **never** loaded into JavaScript memory as Base64 strings or Blob arrays.
- The Rust backend registers a custom streaming URI handler:
  `cinematic-asset://localhost/<project_id>/proxies/<clip_id>.mp4`
- Bytes are streamed directly from the Windows filesystem to the HTML5 video player via chunked range requests (`206 Partial Content`), consuming less than 4 MB of memory per active video player.

### 5.4 Dynamic System Telemetry & Graceful Degradation Guardian
The `TelemetryActor` periodically polls host memory status via the `sysinfo` crate.

```
[ Telemetry Check: Host System Memory ]
                   |
     +-------------+-------------+
     |                           |
     v (< 75% Host RAM)          v (> 80% Host RAM Threshold)
[ State: NORMAL ]          [ State: MEMORY_PRESSURE_WARNING ]
- Concurrency as configured - Clamp active concurrency to 1
- Background proxies active - Suspend background proxy transcoding
- Normal UI update rate     - Trigger SQLite PRAGMA shrink_memory
                            - Free non-essential UI caches
                            - Display non-intrusive operator notice:
                              "Host RAM under pressure (>80%). Running in
                               conservative sequential mode."
```
