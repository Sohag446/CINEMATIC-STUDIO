# CINEMATIC STUDIO — BROWSER EXECUTION ENGINE
## Technical Architecture & Operational Guide

**Document Version:** 1.0.0 (Phase 3 Core Architecture)  
**Classification:** Core System Architecture Specification  
**Component:** Desktop Application $\leftrightarrow$ Native Messaging $\leftrightarrow$ Chrome Extension $\leftrightarrow$ DOM Adapters  

---

## 1. Engine Overview & Architecture

The **Browser Execution Engine** is the orchestration core that executes production tasks across existing, authenticated AI provider browser sessions. It bridges the Tauri desktop application with Google Chrome without headless automation tools (Puppeteer/Selenium), without third-party web scrapers, and without requiring paid API keys.

```
+---------------------------------------------------------------------------------------------------+
|                                 TAURI DESKTOP APPLICATION                                         |
|                                                                                                   |
|  [SQLite Database: tasks & task_execution_logs]                                                   |
|  [Task Queue Scheduler]                                                                           |
|   - Concurrency controller: Bounded sequential profile dispatch (Max 1 active generation/profile) |
|   - State Machine: QUEUED -> ASSIGNED -> GENERATING -> COMPLETED / NEEDS_HUMAN_ACTION             |
|   - Reference Asset Manager: Local asset containment and bounded base64 packaging                 |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v [Native Messaging stdio / Named Pipe]
+---------------------------------------------------------------------------------------------------+
|                              NATIVE MESSAGING HOST & BRIDGE                                       |
|                                                                                                   |
|  Executable: cinematic-studio-host.exe                                                            |
|  Framing: 4-byte LE length prefix + UTF-8 JSON (< 1 MB)                                           |
|  Diagnostic logging: stderr only (zero stdout corruption)                                         |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v [chrome.runtime.connectNative]
+---------------------------------------------------------------------------------------------------+
|                           CHROME EXTENSION BACKGROUND SERVICE WORKER                              |
|                                                                                                   |
|  [ExecutionEngine.js]                                                                             |
|   - Validates profile_id binding & incoming task schema                                           |
|   - Checks provider domain allowlist (chatgpt.com, claude.ai, gemini.google.com, flow.google.com)   |
|   - Tab Manager: Finds existing matching tab or opens dedicated pinned tab                        |
|   - Timeout Supervisor: Cancels stalled requests (120s text / 300s video)                         |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v [chrome.tabs.sendMessage]
+---------------------------------------------------------------------------------------------------+
|                                  IN-PAGE CONTENT SCRIPT LAYER                                     |
|                                                                                                   |
|  [content.js & Specialized Adapters]                                                              |
|   - Google Flow / Veo Adapter: Text-to-Video, Aspect Ratio (16:9/9:16), Keyframe Drop, Download   |
|   - ChatGPT Adapter: ProseMirror injection, stop-button streaming observer, Markdown extraction   |
|   - Gemini Adapter: Rich-textarea WebComponent injection, TTS response chips observer            |
|   - Claude Adapter: ContentEditable injection, streaming token observer, Beat JSON extraction     |
|   - Common Utilities: Versioned fallback selectors, synthetic DOM events, CAPTCHA detectors       |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Safe Execution & Domain Allowlisting

To protect user security and prevent arbitrary code execution:
1. **Strict Domain Allowlist:** The extension strictly enforces an allowlist of target domains:
   - `chatgpt`: `https://chatgpt.com/`
   - `claude`: `https://claude.ai/`
   - `gemini`: `https://gemini.google.com/app`
   - `google_flow_veo`: `https://flow.google.com/` and `https://*.google.com/veo/*`
2. **Zero Arbitrary Execution Target:** The desktop application cannot command the extension to open, scrape, or inject scripts into arbitrary third-party URLs. Any unapproved provider identifier is immediately rejected with `TASK_FAILED`.
3. **No Dynamic Code Injection:** Content scripts are statically bundled and declared in `manifest.json`. No `eval()`, `new Function()`, or `chrome.scripting.executeScript({ code: ... })` dynamic code strings are ever used.

---

## 3. Tab Lifecycle & Deduplication Policy

1. **Tab Querying:** Before creating a new browser tab, the engine executes `chrome.tabs.query({ url: domainPattern })`.
2. **Existing Tab Reuse:** If a matching tab is already open in the user's active profile, the engine reuses that tab, avoiding tab proliferation and RAM waste.
3. **Dedicated Tab Creation:** If no matching tab exists, a new tab is spawned in the background (`active: false`). The engine waits for `changeInfo.status === 'complete'` before dispatching the task.
4. **Content Script Communication:** Messages are sent directly to the targeted tab via `chrome.tabs.sendMessage(tabId, { action: 'EXECUTE_PROVIDER_TASK', task })`.

---

## 4. Task State Machine & Human-in-the-Loop Protocol

Every production task transitions through a strictly validated state machine:

```
  +---------+
  | CREATED |
  +----+----+
       |
       v
  +----+----+
  | QUEUED  | <-----------------------------------------------------+
  +----+----+                                                       |
       |                                                            |
       v                                                            |
  +----+----+                                                       |
  | ASSIGNED|                                                       |
  +----+----+                                                       |
       |                                                            |
       v                                                            |
  +----+---------+                                                  |
  | SUBMITTING   |                                                  |
  +----+---------+                                                  |
       |                                                            |
       v                                                            |
  +----+---------+        Access Gate / CAPTCHA                     |
  | GENERATING   | -----------------------------> +-----------------+------+
  +----+---------+                                | NEEDS_HUMAN_ACTION      |
       |                                          | (Operator Solves Gate)  |
       | Progress: 100%                           +-----------------+------+
       v                                                            |
  +----+---------+                                                  |
  | COMPLETED    |                        Resume Action             |
  +--------------+                   +------------------------------+
                                     |
                                     v
                              [Returns to QUEUED]
```

### Human-in-the-Loop Compliance Principles:
- **No CAPTCHA Circumvention:** The engine never attempts automated CAPTCHA solving, headless click bypassing, or proxy rotation.
- **Immediate State Pause:** When Cloudflare Turnstile, reCAPTCHA, Google Account re-authentication, or credit exhaustion modals appear, the task immediately transitions to `NEEDS_HUMAN_ACTION`.
- **Operator Resumption:** The operator reviews the browser tab, solves the challenge manually, and clicks "Resume" in the desktop UI. The desktop resets the task state to `QUEUED` without losing clip context.

---

## 5. Reference Asset Upload Pipeline

1. **Local Asset Ownership:** Original high-resolution character concept art, storyboard panels, and scene keyframes are stored exclusively on the desktop local filesystem inside the project directory.
2. **Bounded Transfer:** Only the specific reference asset required for the targeted clip is loaded into memory, verified to be $\le 5\text{ MB}$, and transmitted via the `reference_assets` array in the `EXECUTE_TASK` IPC packet.
3. **Synthetic DataTransfer Injection:** The provider adapter converts the Base64 asset into a native browser `Blob` and `File`, populates a `DataTransfer` object, and assigns it to the provider's file input (`input[type="file"]`), triggering standard framework change events.

