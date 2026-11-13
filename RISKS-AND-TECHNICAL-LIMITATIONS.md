# RISKS, TECHNICAL LIMITATIONS & FEASIBILITY REVIEW
## CINEMATIC STUDIO: Comprehensive Technical Feasibility & Risk Audit

---

## 1. Master Technical Feasibility Review Matrix

| Feature / Capability | Feasibility | Primary Technical Risk | Engineering Solution & Architectural Fallback |
| :--- | :--- | :--- | :--- |
| **Local-First Project Core** | **High** | SQLite corruption or disk out-of-space (`ENOSPC`). | SQLite WAL mode, atomic file rename pattern, disk space check before task launch. |
| **Multi-Chrome Profile Isolation**| **High** | Session cross-talk or excessive RAM consumption. | Per-profile cryptographic bearer tokens; strict single-concurrency queue policy. |
| **Desktop-to-Extension IPC** | **High** | MV3 Service Worker premature termination & portless security. | Chrome Native Messaging with Windows Named Pipe Relay (`\\.\pipe\cinematic_studio_ipc`); zero TCP ports opened. |
| **AI LLM DOM Automation** | **Moderate** | Frequent DOM updates and obfuscated CSS classes. | 5-tier resilient selector engine (ARIA, data-testid, SVG signatures); dynamic JSON selector updates. |
| **AI Video Generation Automation**| **Moderate** | Dynamic drag-and-drop file inputs, complex canvas/custom dropzones. | Synthetic `DataTransfer` injection; fallback to Semi-Automated Clipboard & Manual Drop Assist. |
| **Anti-Bot & CAPTCHA Challenges** | **Restricted by Policy** | Automated bypass is prohibited, unreliable, and risks account bans. | **Zero bypass attempted**. FSM transitions to `WAITING_FOR_USER`; desktop rings chime and pauses queue. |
| **Visual Video Continuity** | **Moderate** | AI models inherently hallucinate and drift between cuts. | Start-frame injection ($T_{end}$ of Clip $N$), momentum vector prompt tags, and B-Roll Cutaway heuristic. |
| **Long-Form (360-Clip) Assembly** | **High** | Video editing RAM exhaustion during 60-min assembly. | Stream-copy FFmpeg Concat Demuxer (`-c copy`), never loading video frames into desktop memory. |
| **Cross-Machine Project Migration**| **High** | Broken absolute file paths when moving to another PC. | Relative URI indexing in SQLite; SHA-256 missing asset healing wizard; `.csproj.zip` exporter. |

---

## 2. Dedicated RAM & System Performance Risk Matrix

| Subsystem / Operation | RAM Risk Profile | Potential Failure Mode | Concrete Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Tauri Desktop Shell** | Moderate ($215 – 380\text{ MB}$) | WebView2 multi-process overhead (Broker, GPU, Network, Renderer). | Virtualized React DOM ($O(1)$ items); unmount inactive panels; disable unused Webview hardware acceleration flags if RAM critical. |
| **Frontend React Heap** | Low ($\le 90\text{ MB}$) | Unbounded DOM nodes when displaying 360+ clips. | Virtualized lists via `@tanstack/react-virtual`; lazy-loading images; immediate object URL revocation. |
| **SQLite Page & Temp Store**| Low ($12 – 28\text{ MB}$) | Large joins or index rebuilds consuming memory. | Hard page cache cap: `PRAGMA cache_size = -8000;` (8.0 MB); `PRAGMA temp_store = FILE` (spills scratch to disk). |
| **Active Chrome Profiles** | High ($1.2\text{ GB} - 2.4\text{ GB}$ per profile) | Multiple WebGL video tabs exhausting host RAM on 20 GB machine. | Strict sequential execution mode (1 active generation profile at a time); tab deduplication engine. |
| **Media Video Playback** | Low ($\le 80\text{ MB}$) | Buffering multi-gigabyte 4K master files in Webview. | Never buffer raw master clips; stream ultra-light 360p proxies via custom OS asset protocol (`cinematic-asset://`). |
| **FFmpeg Concat (Copy)** | Low ($35 – 80\text{ MB}$) | Stream-copy file IO buffers. | Direct bitstream remuxing without decoding frames (`-c copy`). |
| **FFmpeg Video Transcode**| Moderate ($450 – 850\text{ MB}$) | Multi-threaded transcoder buffering uncompressed YUV frames. | Strict thread cap (`-threads 4`); bounded muxing queue (`-max_muxing_queue_size 1024`); rate-control buffer limits (`-bufsize 20M`). |

---

## 3. Real-World Limitations & What Cannot Be Guaranteed

To maintain engineering integrity, CINEMATIC STUDIO does not make false or unachievable claims:

### 3.1 AI Web Interfaces Are Subject to Unannounced Change
- **Reality**: OpenAI, Google, and other AI providers deploy front-end updates without notice. Selectors can change overnight.
- **Architectural Safeguard**: Provider adapters are fully decoupled from the core application. Selectors are stored in external hot-reloadable JSON files (`selectors.json`). If a provider modifies its layout, updating the JSON configuration restores functionality without requiring a desktop binary recompile.
- **Ultimate Fallback (Semi-Automated Clipboard Mode)**: If an adapter breaks completely, the application copies the compiled prompt to the clipboard and activates the tab, allowing the creator to paste and generate manually while still tracking assets and continuity in the desktop studio.

### 3.2 Visual Continuity Is Probabilistic, Not Deterministic
- **Reality**: Current generative video models do not possess true 3D spatial awareness. Even with identical seeds and reference frames, micro-variations in facial geometry or background details will occur.
- **Architectural Safeguard**: The system incorporates cinematic editing workarounds:
  - Extracting the exact final frame of Clip $N$ as the start anchor of Clip $N+1$.
  - Enforcing kinematic momentum and gaze matching in prompt compilation.
  - Providing the **"B-Roll Reaction Cutaway"** workflow to disguise unavoidable visual shifts using professional film editing conventions.

### 3.3 Provider Policies, Rate Limits & Account Tiers
- **Reality**: Consumer web accounts are subject to rate limits, rolling 3-hour quotas, and fair-use restrictions.
- **Architectural Safeguard**: The Task Queue features exponential backoff, rate-limit cooldown timers, and multi-profile routing (distributing generation across different accounts).

---

## 4. Mandatory Human Intervention Points

The following conditions are architecturally designed to **halt automation** and request explicit operator action:

1. **Authentication & Session Expiry**: When a login screen, 2FA prompt, or expired session is detected.
2. **CAPTCHA & Bot Challenges**: When Cloudflare Turnstile, Google reCAPTCHA, or puzzle verification appears.
3. **Content Moderation Warnings**: When a provider rejects a prompt for safety or copyright review.
4. **Account Quota Depletion**: When a provider displays an upgrade paywall or daily cap message.
5. **Quality Review Gate**: Before any generated video clip is accepted into the master project timeline.
6. **Destructive Project Actions**: Prior to overwriting locked character references, resetting scenes, or purging take archives.

