# SYSTEM ARCHITECTURE DOCUMENT (REVISED)
## CINEMATIC STUDIO: Desktop-Centered, Portless Hybrid Architecture

---

## 1. Architectural Philosophy & Guiding Principles

The architectural foundation of **CINEMATIC STUDIO** is strictly **Desktop-Centered and Local-First**. 

```
                                +---------------------------------------+
                                |            OPERATING SYSTEM           |
                                |       Windows 10/11 x64 / ARM64       |
                                +-------------------+-------------------+
                                                    |
         +------------------------------------------+------------------------------------------+
         |                                                                                     |
+--------v-------------------------------------------------------+             +---------------v-------------------------------+
|                      CINEMATIC STUDIO                          |             |               GOOGLE CHROME                   |
|                   (Core Desktop Process)                       |             |       (Multiple Isolated Profiles)            |
|                                                                |             |                                               |
|  +----------------------------------------------------------+  |             |  +-----------------------------------------+  |
|  |                 TAURI 2 DESKTOP SHELL                    |  |             |  | Chrome Profile: "Profile 1" (ChatGPT)   |  |
|  |  +----------------------------------------------------+  |  |             |  |  +-----------------------------------+  |  |
|  |  | Webview UI (React 18 + TS + Tailwind + Virtualized)|  |  |             |  |  | Manifest V3 Extension Agent        |  |  |
|  |  +-------------------------^--------------------------+  |  |             |  |  |  - Service Worker (connectNative)  |  |  |
|  |                            | Tauri IPC (zero-copy JSON)  |  |             |  |  |  - Content Script (DOM Adapter)    |  |  |
|  |  +-------------------------v--------------------------+  |  |             |  |  +-----------------+-----------------+  |  |
|  |  | RUST BACKEND CORE (Tokio Multi-Threaded Runtime)   |  |  |             |  |                    | DOM Injection       |  |
|  |  |                                                    |  |  |             |  |  +-----------------v-----------------+  |  |
|  |  |  - Project Manager        - Story Engine           |  |  |             |  |  | Tab: https://chatgpt.com          |  |  |
|  |  |  - Prompt Engine         - Continuity Engine       |  |  |             |  |  +-----------------------------------+  |  |
|  |  |  - Task Queue & FSM      - Resource Monitor        |  |  |             |  +-----------------------------------------+  |
|  |  |  - Media & FFmpeg Eng.   - Storage Manager         |  |  |             |                                               |
|  |  +-------------------------+--------------------------+  |  |             |  +-----------------------------------------+  |
|  +----------------------------|-----------------------------+  |             |  | Chrome Profile: "Profile 2" (Google Veo)| |
|                               |                                |             |  |  +-----------------------------------+  |  |
|  +----------------------------v-----------------------------+  |             |  |  | Manifest V3 Extension Agent        |  |  |
|  | LOCAL PERSISTENCE LAYER                                  |  |             |  |  |  - Service Worker                 |  |  |
|  |  - SQLite (WAL Mode, Embedded r2d2 Pool, temp_store=FILE)|  |             |  |  |  - Content Script (Video Adapter)  |  |  |
|  |  - Managed Project File Directory (Asset Vault)          |  |             |  |  +-----------------+-----------------+  |  |
|  +----------------------------^-----------------------------+  |             |  |                    | DOM Injection       |  |
|                               |                                |             |  |  +-----------------v-----------------+  |  |
|  +----------------------------v-----------------------------+  |             |  |  | Tab: https://flow.google.com/veo  |  |  |
|  | LOCAL COMMUNICATION BRIDGE                               |  |             |  |  +-----------------------------------+  |  |
|  |  - Windows Named Pipe Server:                            |  |             |  +-----------------------------------------+  |
|  |    \\.\pipe\cinematic_studio_ipc (Strict User DACL)      |  |             +-----------------------------------------------+
|  |  - Native Messaging Relay: cinematic-relay.exe           |  |                                     ^
|  |  - Zero TCP Network Ports Opened on Localhost             |  |                                     |
|  +----------------------------+-----------------------------+  |                                     |
|                               +--------------------------------+-------------------------------------+
|                                   Windows Named Pipe Stream (OS Security Descriptor Authenticated)
+----------------------------------------------------------------+
```

---

## 2. Portless Local Communication Bridge Architecture

```
+-------------------------------------------------------------------------------+
|                 PORTLESS NAMED PIPE COMMUNICATION TOPOLOGY                    |
|                                                                               |
|   +-----------------------+                    +--------------------------+   |
|   |   Rust BridgeActor    |                    |  Chrome Extension (MV3)  |   |
|   |  (Named Pipe Server)  |                    |  (Profile 1 / Profile 2) |   |
|   +-----------+-----------+                    +------------+-------------+   |
|               |                                             |                 |
|               |  (Chrome launches relay via connectNative)  |                 |
|               |<============================================+                 |
|               |    cinematic-relay.exe opens Named Pipe     |                 |
|               |                                             |                 |
|               | 1. JSON-RPC: "initiate_handshake"           |                 |
|               |<--------------------------------------------+                 |
|               |    Payload: { profile_id, client_nonce }    |                 |
|               |                                             |                 |
|               | 2. JSON-RPC: "challenge_issued"             |                 |
|               +-------------------------------------------->|                 |
|               |    Payload: { server_nonce, timestamp }     |                 |
|               |                                             |                 |
|               | 3. JSON-RPC: "verify_handshake"             |                 |
|               |<--------------------------------------------+                 |
|               |    Payload: { HMAC-SHA256 signature }       |                 |
|               |                                             |                 |
|               | 4. JSON-RPC: "handshake_success"            |                 |
|               +-------------------------------------------->|                 |
|               |                                             |                 |
|               | 5. JSON-RPC: "execute_task"                 |                 |
|               +-------------------------------------------->|                 |
|               |    Payload: { task_id, action, prompt, ... }|                 |
|               |                                             |                 |
|               | 6. JSON-RPC: "task_progress_update"         |                 |
|               |<--------------------------------------------+                 |
|               |                                             |                 |
|               | 7. JSON-RPC: "task_complete"                |                 |
|               |<--------------------------------------------+                 |
|               |    Payload: { task_id, output_path, hash }  |                 |
+---------------+---------------------------------------------+-----------------+
```

---

## 3. Subsystem Memory & Process Allocations

| Subsystem | Underlying Process Architecture | Typical RAM Range | Control & Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **Desktop Core** | Single Rust binary (`cinematic-studio.exe`) | 35 – 65 MB | Tokio async runtime, bounded channels (`mpsc(32)`). |
| **Desktop Webview** | Edge WebView2 (Broker, GPU, Network, Renderer) | 180 – 340 MB | Virtualized React DOM ($O(1)$ items), custom asset protocol. |
| **Local SQLite** | In-process embedded library (`rusqlite`) | 12 – 28 MB | `cache_size = -8000` (8 MB cap), `temp_store = FILE`. |
| **Active Chrome Profile** | Chrome main, GPU, Utility, 1 active tab | 850 MB – 1.8 GB | Sequential execution mode; tab deduplication. |
| **FFmpeg Subprocess** | Isolated child process (`ffmpeg.exe`) | 45 MB (Concat) / 450–850 MB (Transcode) | Process boundary; memory reclaimed immediately on exit. |

---

## 4. End-to-End Generation & Ingestion Lifecycle

```
[ User triggers "Generate Shot 14" ]
               |
               v
  (React UI -> Tauri IPC)
               |
               v
  (Rust QueueActor: Enforces concurrency semaphore & locks profile)
               |
               +---> Creates task record in SQLite with status 'QUEUED'
               |
               v
  (Rust QueueActor: Checks assigned Chrome Profile stage)
               |
               +---> Profile Stage 4 or 5 Ready?
                        YES: Transitions to 'PREPARING'
                        NO:  Transitions to 'WAITING_FOR_PROFILE' & alerts user
               |
               v
  (Rust Continuity & Prompt Engines: Compiles prompt dialect & sets end-frame)
               |
               v
  (Rust BridgeActor: Dispatches JSON-RPC task over Named Pipe to Native Relay)
               |
               v
  (Native Relay writes to Extension Service Worker via stdin/stdout)
               |
               v
  (Extension Service Worker routes task to Content Script in active tab)
               |
               v
  (Content Script: Locates DOM elements -> Injects prompt -> Injects seed)
               |
               +---> Anti-Bot/CAPTCHA detected?
                        YES: Emits 'WAITING_FOR_USER' -> Desktop alerts operator
                        NO:  Clicks "Generate" -> Emits status 'GENERATING'
               |
               v
  (Content Script: MutationObserver monitors progress bar)
               |
               v
  (Video Generation Completes: Content script clicks native Download button)
               |
               v
  (Chrome downloads file -> Extension monitors chrome.downloads.onChanged)
               |
               v
  (Extension notifies Desktop of completed file location in Downloads)
               |
               v
  (Desktop MediaActor moves file into projects/<id>/clips/raw/, verifies SHA-256)
               |
               v
  (MediaActor extracts 320x180 thumbnail and final end-frame for next clip)
               |
               v
  (QueueActor marks task 'COMPLETED' -> Notifies UI -> Timeline updates)
```
