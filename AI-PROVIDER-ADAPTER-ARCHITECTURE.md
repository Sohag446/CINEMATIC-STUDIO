# AI PROVIDER ADAPTER ARCHITECTURE & CAPABILITY MATRIX (REVISED)
## CINEMATIC STUDIO: Polymorphic Adapter Contracts & Provider Capabilities

---

## 1. Master AI Provider Capability Matrix

To ensure realistic production expectations, every supported AI web provider is audited against its verified browser capabilities:

| Provider Name | Prompt Input Support | Reference Image Upload | Video Generation | Generation Status Detection | Output Collection Method | Manual Intervention Triggers | Known Limitations & Restrictions | Adapter Health |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ChatGPT Plus / Pro** | Full (ProseMirror injection) | Full (Image paste / file input) | N/A (Reasoning & Prompts) | Full (Watches stop button & streaming) | Text Markdown scraping | Occasional Cloudflare Turnstile; hourly rate limits | Long generation outputs can trigger client-side pagination | Active |
| **Claude (Anthropic)** | Full (ProseMirror contenteditable) | Full (File drop / paste) | N/A (Reasoning & Scripting) | Full (Watches avatar pulse & copy button)| Text Markdown scraping | Session expiry; message length warnings | Strict daily message limits on consumer tiers | Active |
| **Google Gemini Advanced** | Full (Custom Rich-Textarea) | Full (File upload dialog) | N/A (Reasoning & Scripting) | Full (Watches TTS & complete chips) | Text Markdown scraping | Occasional Google Workspace re-auth | Formatting chips require custom text cleanup | Active |
| **Google Veo / Flow** | Full (Native input / textarea) | Moderate (Image drop into start-frame) | Full (5s & 10s clips, 1080p) | Full (Progress spinner & percentage) | Primary: Native Download click; Fallback: Blob fetch | Daily quota exhaustion; safety filter flags | Start-frame drag-and-drop can fail on custom web components | Active |
| **Runway Gen-3 Alpha** | Full (Prompt textarea) | Moderate (Keyframe 1 / Keyframe 2 slots) | Full (5s & 10s clips) | Moderate (Watches generation card queue) | Primary: Asset card download button | Credit consumption modal; queue backpressure | Complex custom UI requires fuzzy selector matching | Active |
| **Luma Dream Machine** | Full (Prompt input) | Moderate (Start frame slot) | Full (5s clips) | Full (Watches rendering status banner) | Primary: Native Download link; Fallback: Video src | Credit renewal modal; queue delays | Video downloads occasionally gated behind authenticated CDN | Active |
| **Kling AI** | Full (Textarea) | Full (Image-to-Video tab upload) | Full (5s & 10s clips) | Moderate (Watches progress percentage) | Primary: Result list download button | Frequent slider CAPTCHA during login | Strict regional IP and verification checks | Beta |

---

## 2. Polymorphic Provider Adapter Contract

```typescript
// IProviderAdapter.ts - Core Interface Contract
export interface ProviderCapabilities {
  supportsTextReasoning: boolean;
  supportsVideoGeneration: boolean;
  supportsImageToVideo: boolean;
  supportsStartEndFrames: boolean;
  supportsNegativePrompts: boolean;
  maxClipDurationSeconds: number;
  requiresManualUploadAssist: boolean;
}

export interface ProviderExecutionResult {
  success: boolean;
  textOutput?: string;
  downloadedFilePath?: string;
  errorMessage?: string;
  requiresHumanAction?: boolean;
  actionReason?: 'CAPTCHA' | 'AUTH_EXPIRED' | 'RATE_LIMITED' | 'CONTENT_FLAGGED' | 'MANUAL_UPLOAD_NEEDED';
}

export interface IProviderAdapter {
  readonly providerId: string;
  readonly capabilities: ProviderCapabilities;

  // Health & Verification
  checkSessionState(): Promise<'AUTHENTICATED' | 'LOGIN_REQUIRED' | 'BOT_CHALLENGE' | 'RATE_LIMITED'>;

  // Task Execution
  injectPrompt(prompt: string): Promise<boolean>;
  injectReferenceImage(assetUrl: string): Promise<boolean>;
  triggerGeneration(): Promise<boolean>;
  monitorProgress(onProgress: (pct: number) => void): Promise<ProviderExecutionResult>;
  abort(): Promise<void>;
}
```

---

## 3. Detailed Provider Implementation Specifications

### 3.1 ChatGPT Adapter (chatgpt.com)
- **Input Targeting**: Targets `div#prompt-textarea` or `div[contenteditable="true"]`.
- **Text Insertion**: Injects using `document.execCommand('insertText', false, text)` to trigger internal ProseMirror state recalculations.
- **Completion Detection**: Attaches `MutationObserver` to watch for the disappearance of `.result-streaming` and the appearance of the message copy action button.
- **Output Scraping**: Scrapes rendered markdown from the final assistant message container (`div[data-message-author-role="assistant"]`).

### 3.2 Google Veo / Flow Adapter (flow.google.com / labs.google/fx)
- **Input Targeting**: Targets the generation prompt input container.
- **Reference Image Handling**: 
  - Attempts Tier A injection: Setting `input[type="file"].files` using `DataTransfer`.
  - Fallback: If custom Polymer/Lit web components block synthetic injection, triggers the Semi-Automated Clipboard Assist mode, prompting the operator to paste the image into the drop area.
- **Progress Tracking**: Reads percentage progress text (`div[role="progressbar"]` or circular loader text).
- **Output Ingestion**: Clicks the provider's native "Download" button in the DOM. Monitors Chrome's `chrome.downloads` API for file completion and transfers the downloaded file to the Desktop project directory.

---

## 4. Failure & Rate-Limit Taxonomy

| Error Pattern | DOM Triggers | Adapter Classification | FSM Transition |
| :--- | :--- | :--- | :--- |
| **Quota Depletion** | *"You've reached your generation limit"*, *"0 credits remaining"* | `QUOTA_EXHAUSTED` | `PAUSED` |
| **Bot Challenge** | Cloudflare iframe, Arkose puzzle, *"Verify you are human"* | `BOT_CHALLENGE` | `WAITING_FOR_USER` |
| **Content Moderation**| *"Prompt flagged by safety system"*, *"Violates policy"* | `CONTENT_FLAGGED` | `NEEDS_ATTENTION` |
| **Server Overload** | *"Internal server error"*, *"Model is currently busy"* | `SERVER_OVERLOAD` | `QUEUED` (Backoff) |
| **Session Expired** | Redirected to `/login` or `/auth` | `AUTH_EXPIRED` | `WAITING_FOR_USER` |
