# CINEMATIC STUDIO — MASTER AI PROVIDER CAPABILITY MATRIX

**Document Version:** 1.0.0 (Phase 3 Foundation)  
**Classification:** Engineering Specification & Operational Guidelines  
**Auditor / Architect:** Principal Systems Architect & Performance Lead  

---

## 1. Executive Summary

CINEMATIC STUDIO connects to existing, authenticated web sessions within designated Google Chrome user profiles. Unlike rigid REST API integrations that require expensive enterprise tier token fees or separate API key allocations, CINEMATIC STUDIO leverages the operator's active consumer and pro tier subscriptions (ChatGPT Plus/Pro, Claude Pro, Google Workspace / Gemini Advanced, Google Flow / Veo).

Because each provider maintains a unique, proprietary, and evolving web interface, the system enforces a strict polymorphic adapter architecture. Under no circumstances does the desktop application make uniform assumptions across heterogeneous providers.

---

## 2. Master Capability Matrix

| Provider Identifier | Primary Domain & URLs | Modality & Role | Prompt Input Method | Reference Asset Upload | Video Generation Support | Generation Progress Detection | Output Extraction Method | Human Intervention Triggers | Retry & Failure Policy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`google_flow_veo`** | `https://flow.google.com/*`<br>`https://*.google.com/veo/*` | **Video Production Engine** | Textarea / ContentEditable (`[data-test-id="prompt-input"]`, `textarea[placeholder*="Describe"]`) | **Supported** (Start frame, Keyframe drop into slot) | **YES** (5s, 10s clips, 720p/1080p, 16:9, 9:16) | Progress indicator / spinner / percentage chip (`.progress-bar`, `div[role="progressbar"]`) | Native Download button or video source URL blob extraction | Daily quota cap, Safety filter block, CAPTCHA, complex WebComponent UI change | Bounded exponential backoff (2 attempts max). Never spam video generation. |
| **`chatgpt`** | `https://chatgpt.com/*` | **Narrative Reasoning & Scripting** | ProseMirror ContentEditable (`#prompt-textarea`, `div[contenteditable="true"]`) | **Supported** (Image attach input `input[type="file"]`, clipboard paste) | **NO** (Text reasoning, JSON schemas, camera beat breakdowns) | Stop button presence (`button[data-testid="stop-button"]`), streaming response observer | DOM Markdown extraction from final `.agent-turn` or `[data-message-author-role="assistant"]` | Cloudflare Turnstile verification, Hourly message limit, Login session expiration | 3 retries on network drop. Immediate pause on CAPTCHA / rate-limit. |
| **`gemini`** | `https://gemini.google.com/*` | **Multimodal Analysis & Beat Planning** | Custom Rich Textarea (`rich-textarea`, `div[role="textbox"]`) | **Supported** (File picker dialog, image paste) | **NO** (Reasoning, Script expansion, Continuity validation) | Response generation chips (`.sparkle-icon`, `.response-streaming`, `tts-control`) | Content container markdown scraping (`.response-content`, `message-content`) | Google Workspace single-sign-on reauth, Safety filter override | 3 retries on network drop. Pause on authentication challenge. |
| **`claude`** | `https://claude.ai/*` | **Dramatic Architecture & Continuity Rules** | ProseMirror ContentEditable (`div[contenteditable="true"][data-placeholder]`) | **Supported** (File upload button, drag-and-drop into chat) | **NO** (Complex narrative structuring, screenwriting, tone continuity) | Pulsing avatar, Streaming token cursor, Copy button appearance | DOM text scraping from `[data-is-streaming="false"]` message container | Daily token exhaustion, Length limit warning modal, Cloudflare challenge | 2 retries. Pause on daily quota exhaustion. |
| **`runway`** *(Supplemental)* | `https://app.runwayml.com/*` | **Video Production** | Standard Textarea (`textarea[placeholder*="Describe"]`) | **Supported** (Keyframe 1 / 2 slots) | **YES** (5s, 10s clips, Gen-3 Alpha) | Generation queue card progress bar (`.generation-card progress`) | Direct MP4 asset card download button | Credit consumption modal, queue backpressure | Bounded 1 retry. Queue delays handled gracefully. |
| **`luma`** *(Supplemental)* | `https://lumalabs.ai/dream-machine` | **Video Production** | Native input / textarea | **Supported** (Start frame slot) | **YES** (5s clips) | Rendering status banner & progress bar | Native Download anchor link | Credit exhaustion, Queue timeout | Bounded 1 retry. |
| **`kling`** *(Supplemental)* | `https://klingai.com/*` | **Video Production** | Standard Textarea | **Supported** (Image-to-Video tab) | **YES** (5s, 10s clips, 1080p) | Progress percentage label (`div:contains("%")`) | Result list download icon click | Slider puzzle CAPTCHA on login | Requires immediate human assistance on slider puzzle. |

---

## 3. Provider Capabilities Breakdown

### 3.1 Google Flow / Veo
- **Role in Studio:** Core Video Production Engine.
- **Supported Task Types:** `TEXT_TO_VIDEO`, `IMAGE_TO_VIDEO`.
- **Maximum Duration:** 10.0 seconds per clip (default 5.0 seconds).
- **Supported Aspect Ratios:** `16:9` (horizontal cinema), `9:16` (vertical social).
- **Key Invariants:**
  - Video generations consume significant cloud GPU quotas. Tasks must execute strictly sequentially (one video generation in flight per profile).
  - Generation times range from 45 seconds to 240 seconds depending on provider load.
  - Download handling prioritizes simulating a click on the rendered video's native download button, falling back to blob fetching if the direct URL is accessible.

### 3.2 ChatGPT (OpenAI)
- **Role in Studio:** Dramatic Story Generation, Scene Beat Breakdown, Camera Direction Formulation.
- **Supported Task Types:** `TEXT_PROMPT`, `STORY_GENERATION`.
- **Supported Input Modalities:** Text, Reference Images (character sheets, storyboard sketches).
- **Key Invariants:**
  - ChatGPT is strictly a reasoning and text generation engine in this architecture. It does NOT generate production video files.
  - Streaming responses must be monitored until completion (disappearance of the "Stop generating" button and stabilization of DOM content).
  - Code and markdown blocks are parsed cleanly into structured JSON beats.

### 3.3 Google Gemini Advanced
- **Role in Studio:** Multimodal Visual Continuity Validation & Script Expansion.
- **Supported Task Types:** `TEXT_PROMPT`, `STORY_GENERATION`.
- **Key Invariants:**
  - Interfaces with Google's custom WebComponents (`rich-textarea`). Standard synthetic input events must be dispatched (`InputEvent`, `beforeinput`, `input`).
  - Output is extracted after the model completes response rendering (monitored via TTS buttons and response chips).

### 3.4 Claude (Anthropic)
- **Role in Studio:** Narrative Continuity Rules, Deep Lore Alignment, Character Voice Consistency.
- **Supported Task Types:** `TEXT_PROMPT`, `STORY_GENERATION`.
- **Key Invariants:**
  - Claude enforces strict token context boundaries. Prompts should include distilled continuity cards rather than dumping raw full-project history.
  - Completion is detected when the streaming indicator is removed and the message action bar (copy/retry buttons) renders.

---

## 4. Operational Invariants & Human-in-the-Loop Triggers

The Browser Execution Engine adheres to strict ethical and operational boundaries:

1. **Anti-Bot & Access Control Non-Interference:**
   Under NO circumstances does the system attempt to solve CAPTCHAs, bypass Cloudflare Turnstile, evade rate-limits, or spoof credentials. When any access gate is detected:
   - The task state immediately transitions to `NEEDS_HUMAN_ACTION`.
   - The reason is explicitly classified (`CAPTCHA`, `AUTH_EXPIRED`, `CONFIRMATION_REQUIRED`, etc.).
   - The desktop UI alerts the operator with an actionable modal allowing them to solve the challenge in the open browser tab and click "Resume".
2. **Sequential Concurrency Boundary:**
   To guarantee system stability on 20 GB RAM workstations and prevent account flagging:
   - A single registered Chrome Profile executes at most **ONE active generation task** at any given moment.
   - Text tasks (ChatGPT, Claude, Gemini) complete in 5–20 seconds.
   - Video tasks (Veo, Flow) occupy the profile until the download completes or times out.
3. **URL & Domain Allowlisting:**
   The extension strictly refuses execution requests targeting domains outside the explicit provider allowlist (`flow.google.com`, `google.com/veo`, `chatgpt.com`, `claude.ai`, `gemini.google.com`). Arbitrary script injection is impossible.

