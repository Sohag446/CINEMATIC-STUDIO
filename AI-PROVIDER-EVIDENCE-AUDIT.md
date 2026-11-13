# CINEMATIC STUDIO — AI PROVIDER EVIDENCE AUDIT
## Provider Automation Boundaries, DOM Verification & Live Interaction Reality

## 1. Executive Summary & Verification Rule

In strict accordance with the verification directive:
> **"A provider can only receive `LIVE_RUNTIME_PASS` when an actual browser session completed the full request-response cycle and the desktop received the result."**

Based on this standard, this audit determines that:
- **Zero AI providers completed a live remote request-response cycle.**
- **Zero AI providers qualify for `LIVE_RUNTIME_PASS`.**
- All passing provider tests in `tests/live_ai_provider_test_suite.cjs` are classified as **`DOM_VERIFICATION_PASS`** or **`SIMULATED_TEST_PASS`**.
- Live remote paid video generation (Google Flow / Veo) was deliberately **`NOT_TESTED`** to protect user billing, quotas, and credits.
- Non-circumvention protections (Cloudflare Turnstile, reCAPTCHA, login expiry) were verified to halt automation immediately without bypass attempts.

---

## 2. Six-Segment Provider Evidence Audit

Every provider is evaluated across six discrete operational segments:
- **Segment A**: Selector & DOM fallback tree verification
- **Segment B**: Synthetic input injection & event dispatch
- **Segment C**: Real browser page interaction in live Chrome
- **Segment D**: Real provider prompt submission over the web
- **Segment E**: Real provider response scraping from remote LLM/diffusion models
- **Segment F**: Desktop result delivery via Native Messaging pipe

---

### 1. ChatGPT (`chatgpt.com`)

| Segment | Tested Operation | Execution Harness | Real Website Involved? | Reconciled Classification |
| :--- | :--- | :--- | :--- | :--- |
| **A. Selector Verification** | Query `#prompt-textarea`, `button[data-testid="send-button"]`, `div.markdown` | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **B. Input Injection** | Framework-aware `dispatchInput` on textarea | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **C. Browser Page Navigation** | Attach to live `https://chatgpt.com/` tab | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **D. Prompt Submission** | Submit user prompt to remote OpenAI backend | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **E. Response Extraction** | Capture streaming markdown tokens from remote LLM | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **F. Desktop Delivery** | Relay scraped text to Tauri desktop via Native Host | None | **NO** | **`BLOCKED`** (Host Missing) |

---

### 2. Claude (`claude.ai`)

| Segment | Tested Operation | Execution Harness | Real Website Involved? | Reconciled Classification |
| :--- | :--- | :--- | :--- | :--- |
| **A. Selector Verification** | Query `div.ProseMirror[contenteditable="true"]`, send button, prose containers | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **B. Input Injection** | `execCommand('insertText')` on ProseMirror div | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **C. Browser Page Navigation** | Attach to live `https://claude.ai/chat` tab | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **D. Prompt Submission** | Submit script scene prompt to Anthropic backend | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **E. Response Extraction** | Capture streaming assistant message turn | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **F. Desktop Delivery** | Relay beat breakdown to desktop via Native Host | None | **NO** | **`BLOCKED`** (Host Missing) |

---

### 3. Gemini (`gemini.google.com`)

| Segment | Tested Operation | Execution Harness | Real Website Involved? | Reconciled Classification |
| :--- | :--- | :--- | :--- | :--- |
| **A. Selector Verification** | Query `rich-textarea div[role="textbox"]`, send button, Google account badge | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **B. Input Injection** | Rich textarea text insertion & bubbling events | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **C. Browser Page Navigation** | Attach to live `https://gemini.google.com/app` tab | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **D. Prompt Submission** | Submit multimodal analysis prompt to Google | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **E. Response Extraction** | Scrape model response card content | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **F. Desktop Delivery** | Relay analysis payload to desktop via Native Host | None | **NO** | **`BLOCKED`** (Host Missing) |

---

### 4. Google Flow / Veo (`flow.google.com` / `labs.google.com/veo`)

| Segment | Tested Operation | Execution Harness | Real Website Involved? | Reconciled Classification |
| :--- | :--- | :--- | :--- | :--- |
| **A. Selector Verification** | Query video prompt textarea, 16:9 / 9:16 buttons, file input, generate button | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **B. Input & Aspect Injection** | Dispatch click on `button[aria-label*="9:16"]` and synthetic `DataTransfer` file drop | `tests/live_ai_provider_test_suite.cjs` | **NO** (Mock DOM) | **`DOM_VERIFICATION_PASS`** |
| **C. Browser Page Navigation** | Attach to live Google Flow / Veo canvas | None | **NO** | **`NOT_TESTED`** / **`BLOCKED`** |
| **D. Prompt Submission** | Submit generation job to Google Veo diffusion cluster | None | **NO** | **`NOT_TESTED`** (Paid Credits) |
| **E. Response Extraction** | Download rendered video MP4 from Google CDN | Synthetic `video.src` in mock DOM | **NO** | **`SIMULATED_TEST_PASS`** |
| **F. Desktop Delivery** | Ingest video asset into `media_assets` and timeline | SQLite `sql.js` in Node | **NO** | **`LOCAL_COMPONENT_PASS`** |

---

## 3. Quota & Credit Protection Policy Compliance

In strict compliance with user instructions:
- **Zero Paid Generation**: No video generation requests were dispatched to Google Veo or Google Flow.
- **Zero Credit Consumption**: Testing did not spend AI credits, token allowances, or premium generation quotas.
- **Offline Proof**: All aspect ratio, file attachment, and progress callback logic was verified through local mock harnesses without network requests to external provider APIs.

---

## 4. Safety & Non-Circumvention Audit

The non-circumvention defenses implemented in `chrome-extension/adapters/common.js` were forensically verified:
1. **Cloudflare Turnstile**: `iframe[src*="cloudflare"]` is detected immediately, returning `{ isChallenged: true, reason: 'CAPTCHA' }`.
2. **Google reCAPTCHA**: `iframe[src*="recaptcha"]` is detected immediately, returning `{ isChallenged: true, reason: 'CAPTCHA' }`.
3. **Login Walls**: Redirects to `/login`, `/auth`, or `/signin` are detected immediately, returning `{ isChallenged: true, reason: 'AUTH_EXPIRED' }`.
4. **Zero Bypass Compliance**:
   - The adapter **never** attempts automated solving, clicking, waiting out, or bypassing CAPTCHAs.
   - Automation ceases immediately upon challenge detection and escalates to the desktop via `NEEDS_HUMAN_ACTION`.

---

## 5. Summary Matrix & Classification

| Provider | Local DOM Tests | Live Browser Session | Remote Submission | Paid Credits Spent | Reconciled Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT** | **PASS** (DOM) | None | None | 0 | **`DOM_VERIFICATION_PASS`** |
| **Claude** | **PASS** (DOM) | None | None | 0 | **`DOM_VERIFICATION_PASS`** |
| **Gemini** | **PASS** (DOM) | None | None | 0 | **`DOM_VERIFICATION_PASS`** |
| **Google Flow / Veo** | **PASS** (DOM) | None | None | 0 | **`DOM_VERIFICATION_PASS`** |
| **Live Remote Providers**| — | **BLOCKED** | **NOT_TESTED** | 0 | **`PARTIALLY VERIFIED — NATIVE RUNTIME BLOCKED`** |

*Report frozen as `AI-PROVIDER-EVIDENCE-AUDIT.md`.*

