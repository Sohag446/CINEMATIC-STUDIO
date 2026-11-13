# BROWSER AUTOMATION & DOM RESILIENCE STRATEGY (REVISED)
## CINEMATIC STUDIO: Realistic DOM Interaction, File Uploads & Download Capture

---

## 1. Ethical, Legal & Anti-Bot Boundaries

CINEMATIC STUDIO operates strictly as an **assistive human-in-the-loop productivity suite**. It is not an adversarial bot or headless web scraper.

### 1.1 Non-Negotiable Operational Boundaries
1. **Zero Automated CAPTCHA / Bot Bypass**: The system will **never** attempt to solve, bypass, or circumvent Google reCAPTCHA, Cloudflare Turnstile, Arkose Labs FunCAPTCHA, or proof-of-work challenges.
2. **Immediate Human Handoff**: When a bot challenge or 2FA prompt appears, automation halts immediately. The task transitions to `WAITING_FOR_USER`, an audio chime alerts the creator, and the system waits for human resolution.
3. **Headful User-Visible Execution**: All browser interactions execute inside standard, headful, user-visible Chrome tabs within the user's authentic browser profiles.
4. **Zero Credential Scraping**: The extension never intercepts, logs, or transmits user passwords, authentication cookies, or session tokens.

---

## 2. Realistic File Upload Architecture (Zero-Base64)

In generative video workflows, reference images (character turnarounds, start-frames) must be injected into the AI provider's interface. Previous naive implementations converted files into multi-megabyte Base64 strings, causing severe JavaScript heap bloating.

CINEMATIC STUDIO implements a **Zero-Base64 Binary Transfer Engine** paired with a multi-tier injection pipeline:

```
[ Desktop Asset Vault: "sc001_cl001_end.png" ]
                       |
                       v
  (Desktop exposes ephemeral tokenized endpoint)
  GET http://127.0.0.1:48125/asset/<token>/<hash>
                       |
                       v
  (Content script fetches binary directly as Blob)
  const res = await fetch(url);
  const blob = await res.blob();
  const file = new File([blob], "start_frame.png", { type: "image/png" });
                       |
                       v
+---------------------------------------------------------------+
| MULTI-TIER FILE INJECTION PIPELINE                            |
|                                                               |
| Tier A: Native HTML File Input Setter                         |
| - Locate <input type="file">                                  |
| - Set input.files = dataTransfer.files                        |
| - Dispatch standard 'change' event                            |
+-------------------------------+-------------------------------+
                                | (If element not found or hidden)
                                v
+---------------------------------------------------------------+
| Tier B: Synthetic Drag-and-Drop Event Simulation              |
| - Construct DragEvent('drop') with DataTransfer               |
| - Dispatch to target dropzone element                         |
+-------------------------------+-------------------------------+
                                | (If custom dropzone rejects simulated drag)
                                v
+---------------------------------------------------------------+
| Tier C: Synthetic Clipboard Paste Event                       |
| - Construct ClipboardEvent('paste') with File item            |
| - Dispatch directly to active chat container                  |
+-------------------------------+-------------------------------+
                                | (If synthetic injection fails)
                                v
+---------------------------------------------------------------+
| Tier D: SEMI-AUTOMATED USER-ASSIST UPLOAD FALLBACK            |
| - Desktop copies reference image to Windows Clipboard         |
| - Desktop flashes non-intrusive floating guide overlay:       |
|   "Image ready in clipboard. Please press Ctrl+V in Chrome."  |
| - Operator pastes image; automation resumes automatically.    |
+---------------------------------------------------------------+
```

---

## 3. Video Output Collection & Download Mechanics

Assuming that all generated videos can be downloaded automatically via `chrome.downloads.download(videoUrl)` is technically flawed. In practice:
- Many AI video providers deliver media via **blob URLs (`blob:https://...`)** created in the page's main world context, which cannot always be accessed across partitioned storage by background service workers.
- Many platforms protect video downloads behind **session cookies, dynamic referer headers, and CSRF tokens** that background fetch requests do not inherit.
- Some platforms stream video through chunked Media Source Extensions (MSE) without exposing a static MP4 URL.

To ensure 100% reliable collection without compromising account credentials, CINEMATIC STUDIO employs a **Three-Tier Collection Engine**:

```
[ Remote AI Generation Completes ]
                 |
                 v
+---------------------------------------------------------------+
| Tier 1: Native In-Page Download Button Trigger (PRIMARY)       |
| - Content script locates and clicks the provider's official   |
|   "Download" button directly within the webpage DOM.          |
| - Chrome handles the download natively using user credentials.|
| - Extension monitors chrome.downloads.onChanged for completion.|
| - Extension captures filename and notifies Desktop to ingest. |
+-------------------------------+-------------------------------+
                                | (If no download button exists)
                                v
+---------------------------------------------------------------+
| Tier 2: In-Page Blob Buffer Extraction (FALLBACK)             |
| - Content script reads <video> element src in page context.   |
| - Fetches video stream inheriting authentic session cookies.  |
| - Streams binary buffer to Desktop local ingestion endpoint.  |
+-------------------------------+-------------------------------+
                                | (If provider blocks all extraction)
                                v
+---------------------------------------------------------------+
| Tier 3: Operator-Assisted Ingestion Wizard (ULTIMATE FALLBACK)|
| - Desktop displays: "Video generation complete. Please click  |
|   Download in the browser."                                   |
| - Desktop file watcher automatically monitors user's          |
|   Downloads directory for newly created .mp4 files.           |
| - Once detected, automatically moves file to project vault.   |
+-------------------------------+-------------------------------+
```

---

## 4. Multi-Tier DOM Resilience & Synthetic Event Dispatching

Modern AI web applications (ChatGPT, Claude, Google Veo) frequently modify their DOM structures and minify class names. CINEMATIC STUDIO implements a **Five-Tier Resilient Resolution Engine**:

1. **Semantic Data Attributes**: Target `[data-testid="send-button"]`, `[data-element="generate"]`.
2. **Accessible ARIA Roles & Names**: Target `button[aria-label="Send prompt"]`, `div[role="textbox"]`.
3. **Structural SVG Signatures**: Match SVG child icons based on SVG `path` data patterns.
4. **Fuzzy Text & Proximity Scoring**: Match visible button text like *"Generate Video"*, *"Submit"*.
5. **Decoupled JSON Selectors**: Selectors are loaded from an external `%LOCALAPPDATA%\CinematicStudio\config\selectors.json`. When a provider updates its HTML, updating this file restores functionality without recompiling the application.

### Setting Values in React/Vue SPAs:
```typescript
// safeValueSetter.ts - React 18 compatible value setter
export function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  const prototype = Object.getPrototypeOf(element);
  const nativeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (nativeValueSetter) {
    nativeValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}
```
