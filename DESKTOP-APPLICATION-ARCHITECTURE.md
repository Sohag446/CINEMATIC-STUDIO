# DESKTOP APPLICATION ARCHITECTURE
## CINEMATIC STUDIO: UI Control Center & Rust Backend Subsystems

---

## 1. UI Control Center Layout & Component Tree

The CINEMATIC STUDIO interface is modeled after professional digital audio workstations (DAWs) and non-linear editing suites (NLEs), styled in a distraction-free, dark cinematic aesthetic.

```
+----------------------------------------------------------------------------------------------------+
| TOP NAVIGATION BAR                                                                                 |
| [LOGO] | Project: "NEO-TOKYO 2099" [Save] | Profiles: [Chat:OK] [Veo:OK] | RAM: 142MB | [Settings] |
+--------------------------------------------------+-------------------------------------------------+
| LEFT PANEL: AI MODEL WORKSPACE                   | RIGHT PANEL: VIDEO GENERATION WORKSPACE         |
| ------------------------------------------------ | ----------------------------------------------- |
| Provider: [ ChatGPT Plus v ] Profile: [Prof 1 v] | Provider: [ Google Veo v ] Profile: [Prof 2 v]  |
| Mode: [ Scene Decomposition Beat Analysis    v ] | Target Scene: [ Scene 04: Rooftop Chase     v ] |
|                                                  | Target Clip:  [ Clip 12: Hero jumps over gap  v ] |
| [ Context Injection Selector ]                   |                                                 |
| [x] Character: Marcus Cole  [x] Rain Alleyway    | [ Prompt Compiler Preview ]                     |
|                                                  | "Cinematic 35mm film shot of Marcus Cole in wet |
| [ Task Directive Prompt Box ]                    | dark trenchcoat leaping across 10ft rooftop gap"|
| "Break down the rooftop chase into 6 high-tension|                                                 |
| 8-second clips with dynamic camera motion."      | [ Reference Inputs ]                            |
|                                                  | [ Start Frame: Clip 11 End Frame ] [Char Ref]   |
| [ Send to Chrome Extension ]                     |                                                 |
|                                                  | [ Dispatch Generation Task to Chrome ]          |
| [ Live Response Staging & Review Box ]           |                                                 |
| [Accept Story Beats] [Edit] [Rerun] [Reject]     | [ Live Generation Progress Bar (45%) ]          |
+--------------------------------------------------+-------------------------------------------------+
| BOTTOM PRODUCTION PANEL: QUEUE & TIMELINE MONITOR                                                  |
| -------------------------------------------------------------------------------------------------- |
| [Queue: 3 Pending | 1 Running | 14 Completed | 0 Failed]  [Pause Queue] [Sequential Mode: ON]     |
| [Timeline Strip / Virtualized Clip Strip: Shot 1 [Preview] Shot 2 [Preview] Shot 3 [Preview] ... ] |
| Live Log: [10:48:12] Profile 2 received Veo generation task #42. Polling progress...              |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Frontend Subsystem Architecture (React 18 + TypeScript)

### 2.1 State Management Decomposition
To prevent React re-rendering thrash and memory leaks during large productions, UI state is split into three decoupled tiers:

1. **Transient UI State (`Zustand`)**:
   - Manages active tab selections, modal dialog visibility, timeline zoom level, and drawer expansions.
   - Extremely lightweight, zero persistent object retention.
2. **Server/Database Cache (`TanStack Query`)**:
   - Caches query responses from the SQLite database via Tauri IPC (scenes, clips, prompt histories).
   - Configured with `staleTime: 5000` and `gcTime: 60000`, automatically releasing inactive data structures from JavaScript heap.
3. **Task Queue Event Bus (`Tauri Event Listeners`)**:
   - Listens for streaming JSON-RPC task updates from Rust (`task-progress`, `profile-status`, `media-ingested`).
   - Updates visual indicators without re-rendering the entire scene tree.

### 2.2 List Virtualization for High Clip Counts
In a 60-minute film with 360+ clips, rendering 360 video players or complex DOM nodes will consume hundreds of megabytes of RAM and cause UI stutter.
- We utilize **`@tanstack/react-virtual`** for:
  - The Storyboard / Shot Breakdown list.
  - The Clip Timeline Strip.
  - The Task Execution Log viewer.
- **Result**: Exactly **8 to 12 DOM elements** exist in the DOM tree at any given moment regardless of whether the project contains 50 clips or 5,000 clips ($O(1)$ memory complexity).
- Video thumbnail images use native `loading="lazy"` and object URLs are deterministically freed using `URL.revokeObjectURL()` inside `useEffect` cleanup hooks.

---

## 3. Rust Backend Architecture (Tauri 2 Core)

### 3.1 Subsystem Actor Hierarchy

```
                         +--------------------------+
                         |      tauri::AppHandle    |
                         +------------+-------------+
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
+--------v---------+        +---------v--------+        +----------v---------+
|   ProjectActor   |        |    QueueActor    |        |    BridgeActor     |
| (SQLite + Vault) |<------>| (FSM + Scheduler)|<------>| (Named Pipe Host)  |
+--------+---------+        +---------+--------+        +----------+---------+
         |                            |                            |
         |                            v                            |
         |                  +---------+--------+                   |
         +----------------->|    MediaActor    |<------------------+
                            | (FFmpeg / Assets)|
                            +------------------+
```

### 3.2 Tauri Command Interface (`#[tauri::command]`)
All communication from the React frontend to Rust occurs via strictly typed, asynchronous Tauri commands:

```rust
// Representative Command Signatures
#[tauri::command]
async fn create_project(payload: CreateProjectDto) -> Result<ProjectSummary, CommandError>;

#[tauri::command]
async fn list_scenes(project_id: String) -> Result<Vec<SceneDto>, CommandError>;

#[tauri::command]
async fn queue_clip_generation(clip_id: String, profile_id: String) -> Result<String, CommandError>;

#[tauri::command]
async fn get_connected_profiles() -> Result<Vec<ProfileStatusDto>, CommandError>;

#[tauri::command]
async fn assemble_timeline(project_id: String, settings: ExportSettingsDto) -> Result<String, CommandError>;
```

### 3.3 Zero-Copy IPC Optimization
- Large media payloads (video streams, high-res frames) **never** travel across the Tauri IPC bridge between Rust and Webview.
- Instead, the Rust backend serves media files via a custom asset protocol (`cinematic-asset://localhost/<path>`) which streams bytes directly from the local filesystem to the WebView2 video element using Windows OS memory-mapped files (`CreateFileMapping`).
- The Webview heap remains completely free of video byte buffers.

