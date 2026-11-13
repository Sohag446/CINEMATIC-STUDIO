# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## CINEMATIC STUDIO: Desktop-Centered AI Video Production Platform

---

## 1. Executive Summary & Objective

**CINEMATIC STUDIO** is an open, desktop-centered, local-first production suite designed to enable solo creators, animation studios, and digital storytellers to produce long-form cinematic films (from 5-minute shorts to 60-minute featurettes and multi-hour episodic narratives) using existing consumer AI web interfaces. 

Rather than requiring costly per-token commercial APIs or multi-thousand-dollar GPU server hardware, CINEMATIC STUDIO harnesses the user's existing, authenticated browser sessions across multiple Google Chrome Profiles. It acts as the central production brain, managing story structure, scene decomposition, multi-modal character vaults, visual continuity tracking, intelligent prompt compilation, task queuing, and automated media assembly.

---

## 2. Target Workflows & Scale Benchmarks

### 2.1 Supported Narrative Scales
- **Micro-Shorts (1 – 5 Minutes)**: 10 – 30 distinct video clips. Fast iteration, single-environment narrative focus.
- **Short Films (10 – 20 Minutes)**: 60 – 120 video clips. Multi-scene breakdowns, character arc progression, secondary locations.
- **Featurette / Mid-Length (30 – 60 Minutes)**: 180 – 360+ video clips. Complex multi-character dynamics, parallel plotlines, deep continuity constraints.
- **Episodic Series (Multi-Hour)**: Multi-episode project bundles with shared character vaults, reusable location libraries, and persistent asset registries.

### 2.2 Operational Assumptions
- Average raw generated clip duration: **5 to 10 seconds** (dictated by generative AI model constraints such as Google Veo, Runway, Luma, Pika, Kling, etc.).
- 60-minute target timeline: Approximately **360 to 450 discrete video generations**, accounting for cutaways, reaction shots, and pacing transitions.
- Storage budget per 60-minute project: **15 GB to 40 GB** (encompassing multiple generated takes, high-resolution source clips, reference image banks, intermediate audio stems, and final export passes).
- Host memory envelope: Standard workstation or creative laptop with **16 GB to 32 GB RAM** (nominal baseline target: **20 GB RAM**).

---

## 3. High-Level Functional Requirements

### 3.1 Project Management & Storage (Local-First)
- **PR-001: Sovereign Local Database**: All project metadata, relationships, scripts, prompts, and task histories must reside in a local SQLite database using Write-Ahead Logging (WAL).
- **PR-002: Off-Database Media Vault**: Large video binaries, audio stems, and high-resolution images must never be stored inside database BLOBs. They must be stored in structured project directory folders with relative URI indexing.
- **PR-003: Atomic Project Checkpoints**: System must execute atomic transactions and auto-checkpoints every 5 minutes and immediately after any state-changing task completion.
- **PR-004: Lossless Portability**: Support one-click Project Export to `.csproj.zip` bundle with checksum verification (`SHA-256`), allowing seamless migration across machines without browser session baggage.
- **PR-005: Missing-Asset Healing**: Automatic scan on project open to detect missing, moved, or corrupted media files, offering an interactive relinking wizard.

### 3.2 Multi-Chrome Profile Orchestration
- **PR-010: Zero Account Coupling**: The desktop app must maintain zero dependency on Google Sign-In or proprietary cloud auth. Identity is bound purely to local Chrome Profile identifiers (`Default`, `Profile 1`, `Profile 2`, etc.).
- **PR-011: Profile-to-Provider Matrix**: User must be able to assign specific AI web providers to designated Chrome Profiles (e.g., Profile 1 -> ChatGPT Plus; Profile 2 -> Google Gemini Advanced; Profile 3 -> Google Flow / Veo).
- **PR-012: Inactive Profile Preservation**: Profiles must remain registered in the application without requiring all Chrome windows to stay open concurrently, preventing out-of-memory crashes.
- **PR-013: Bounded Concurrency Launcher**: Configurable limit of simultaneously active browser profiles (default: 1 active generation profile at a time; configurable up to host RAM capacity).
- **PR-014: Connection Status Heartbeat**: Live visual indicator in the UI displaying WebSocket/Native Bridge health (`CONNECTED`, `CONNECTING`, `OFFLINE`, `AGENT_BUSY`).

### 3.3 AI Model Workspace (Left Panel)
- **PR-020: Text & Reasoning Provider Selection**: Support provider dispatching to web LLMs (ChatGPT, Claude, Gemini, DeepSeek, etc.).
- **PR-021: Narrative Task Types**: Pre-configured task templates for:
  - Macro Story Expansion & Three-Act Structuring
  - Character Psychological & Visual Profiling
  - Location Atmosphere & Architecture Breakdown
  - Script-to-Scene Decomposition
  - Storyboard Beats & Action Beats
  - Continuity Verification Auditing
- **PR-022: Human-in-the-Loop Review**: All AI-generated story structures and scene breakdowns must be staged in an "Under Review" state. The user can Accept, Modify, Rerun, or Discard before database persistence.

### 3.4 Video Generation Workspace (Right Panel)
- **PR-030: Video Provider Dispatch**: Support provider dispatching to web video tools (Google Flow / Veo, Kling, Luma Dream Machine, Runway Gen-3, Pika, etc.).
- **PR-031: Asset Preparation & Pre-Flight**: Automatic packaging of prompt text, start-frame references, end-frame references, and character consistency seeds into the task payload.
- **PR-032: Automated Ingestion**: When the browser extension detects generation completion and clip readiness, it initiates local download directly into the project's incoming clips cache, triggering automated SHA-256 verification and database registration.

### 3.5 Story & Clip Planning Engines
- **PR-040: Hierarchical Narrative Breakdown**: Project -> Acts -> Sequences -> Scenes -> Shots / Clips.
- **PR-041: Granular Clip Descriptor**: Every clip entity must track:
  - Sequence & Scene parentage
  - Expected duration (seconds)
  - Camera setup: Framing (Close-up, Wide, OTS), Lens angle (Low, High, Dutch), Movement (Dolly, Pan, Orbit, Static)
  - Subject state: Positioning, Action vector, Gaze direction, Emotional valence, Wardrobe variation
  - Environmental state: Lighting key, Weather, Time-of-day, Atmospheric haze, Key props
  - Continuity dependencies: Required start-frame source, Expected exit-frame vector
- **PR-042: Non-Destructive Plan Reordering**: Drag-and-drop shot reordering with automatic timeline recalculation.

### 3.6 Character & Location Reference Vaults
- **PR-050: Persistent Character Profiles**: Centralized records storing:
  - Full body turnaround references (Front, 3/4, Profile, Back)
  - Facial expression sheets (Neutral, Anger, Joy, Fear, Surprise)
  - Standard wardrobe and costume variations
  - Canonical physical descriptors (age, ethnicity, hair texture/color, scars, eye shape)
  - Approved seed images locked against accidental overwrite
- **PR-051: Environmental Location Vault**: Master profiles for recurring sets (Interior/Exterior, Daytime/Nighttime lighting references, architectural keywords).
- **PR-052: Automatic Injector**: The prompt engine must automatically resolve character and environment tokens (e.g. `[Char:Marcus]` -> canonical physical descriptor + style tags).

### 3.7 Visual Continuity Engine
- **PR-060: Edge-Frame Extraction**: Automatically extract the exact final frame (`T_end`) of Clip $N$ as an uncompressed PNG reference for Clip $N+1$.
- **PR-061: Continuity Constraint Checklist**: Before dispatching Clip $N+1$, verify matching parameters against Clip $N$:
  - Lighting continuity check (e.g. sunlight angle, color temperature)
  - Prop presence check (e.g. item held in left hand must not vanish)
  - Motion momentum continuity (e.g. running left-to-right cannot instantaneously reverse without a cut)
- **PR-062: Visual Anomaly Flagging**: User interface mechanism allowing the creator to flag visual discontinuities and mark a clip for an immediate "Reroll / Alternate Take" without losing shot metadata.

### 3.8 Production Manager & Task Queue
- **PR-070: Deterministic Finite State Machine (FSM)**: Strict states: `CREATED`, `QUEUED`, `PREPARING`, `WAITING_FOR_PROFILE`, `WAITING_FOR_USER`, `RUNNING`, `GENERATING`, `COLLECTING`, `COMPLETED`, `FAILED`, `PAUSED`, `CANCELLED`, `NEEDS_ATTENTION`.
- **PR-071: Crash & Interruption Recovery**: Upon desktop application reboot, the queue manager parses in-flight tasks:
  - Tasks in `GENERATING` state ping the designated browser extension to check if the remote job finished while the desktop was restarting.
  - No generation is re-triggered automatically if ambiguity exists, preventing duplicate resource consumption.
- **PR-072: Concurrency & Throttling Limits**: Strict queue limits preventing browser freezing and account rate-limit bans.

### 3.9 Media Manager & FFmpeg Assembly
- **PR-080: Multi-Track Timeline Preview**: Visual preview of all sequenced clips with audio accompaniment tracks (Dialogue, Foley, Score).
- **PR-081: Low-Memory Assembly Pipeline**: Assembly of 360+ clips performed using FFmpeg's concat demuxer or chunked stream processing, never loading video frames into desktop application RAM.
- **PR-082: Proxy Generation**: Background generation of ultra-compact 360p web-friendly proxies for fluid timeline scrubbing, while keeping 1080p/4K master clips untouched for final render.
- **PR-083: Export Profiles**: Output presets for YouTube Cinematic (4K UHD H.264/H.265), Social Vertical (9:16), and Archive Master (ProRes 422).

---

## 4. Non-Functional Requirements & Performance Budgets

| Metric | Target Specification | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Idle Desktop RAM** | $215 – 260\text{ MB}$ (Total process tree) | Tauri 2 native Rust runtime + Edge WebView2 shared processes. |
| **Active Editing RAM** | $290 – 380\text{ MB}$ | React list virtualization (DOM recycling for 500+ clips). |
| **Extension RAM** | $\le 45\text{ MB}$ per profile | MV3 Service Worker event-driven hibernation; lazy DOM parsers. |
| **FFmpeg Concat (Copy)** | $35 – 80\text{ MB}$ | Stream-copy concat demuxer without frame decoding. |
| **FFmpeg Transcode Peak** | $450 – 850\text{ MB}$ | Bounded thread pool (`-threads 4`) & muxing queue limits. |
| **Active Production Set** | $1.7 – 2.4\text{ GB}$ (Desktop + 1 Active Chrome) | Bounded single-profile concurrency policy. |
| **Crash Recovery Time** | $\le 3\text{ seconds}$ to full state | SQLite WAL replay and atomic state reconstruction. |
| **Database Performance** | $\le 15\text{ ms}$ for 1000-clip query | Indexed foreign keys, WAL mode, `temp_store = FILE`. |

---

## 5. Ethical, Security & Policy Boundaries

1. **Anti-Bot & CAPTCHA Policy**: The application **strictly forbids** any automated CAPTCHA solving, headless puppeteering, bot evasion tricks, or Cloudflare circumvention. When an AI provider demands verification, the system transitions to `WAITING_FOR_USER`, notifies the operator, and pauses until human resolution.
2. **Credential Sovereignty**: The desktop application and extensions **never** read, extract, log, or transmit account passwords, cookies, or session tokens. All sessions exist natively within the user's standard Chrome Profile environment.
3. **Provider Terms of Service Compliance**: Automation is restricted to assistive DOM filling and response scraping within visible, user-initiated tabs. If a provider explicitly outlaws DOM assistance, the application switches to a "Semi-Automated Clipboard Mode" where prompts are copied to the clipboard and user manually pastes them.

---

## 6. User Personas

### Persona A: Independent AI Filmmaker (Solo Creator)
- **Goal**: Direct a 15-minute sci-fi animated film using Veo and ChatGPT.
- **Pain Points**: Keeping track of 90 separate prompts, losing track of which seed image belonged to which scene, character faces morphing between cuts, running out of RAM when editing in heavy software.
- **Studio Solution**: Centralized character vault, automatic continuity prompt injection, lightweight timeline assembly without crashes.

### Persona B: Episodic Web Series Producer
- **Goal**: Produce a weekly 8-minute episodic fantasy series.
- **Pain Points**: Switching between 3 different Google accounts for different tool subscriptions, losing past prompts when chat histories get buried, manual copy-pasting of hundreds of clips.
- **Studio Solution**: Multi-Chrome Profile routing, automated clip downloading into structured project directories, one-click FFmpeg render.

