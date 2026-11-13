# CHROME EXTENSION ARCHITECTURE (MANIFEST V3 - REVISED)
## CINEMATIC STUDIO: Ephemeral, Stateless Browser Execution Agent

---

## 1. Extension Topology & Manifest V3 Design Principles

Under Google Chrome’s **Manifest V3 (MV3)**, background execution models have fundamentally shifted. Traditional persistent background pages no longer exist. Background Service Workers are event-driven, ephemeral, and subject to termination by the browser at any time under memory pressure or after brief idle intervals.

CINEMATIC STUDIO embraces this constraint: **The Chrome Extension is completely stateless.** It holds no project data, no narrative structures, and no persistent caches. The Desktop Application is the sole brain and source of truth.

```
+---------------------------------------------------------------------------------------+
| CHROME EXTENSION (MANIFEST V3 EPHEMERAL CONTAINER)                                    |
|                                                                                       |
|  +---------------------------------------------------------------------------------+  |
|  | BACKGROUND SERVICE WORKER (background.js)                                       |  |
|  | - Completely stateless; wake-on-event architecture                              |  |
|  | - Native Messaging Host Port (chrome.runtime.connectNative)                     |  |
|  | - Chrome Tab Manager (tab deduplication, activation, navigation)                |  |
|  | - Download Monitor (chrome.downloads observer for generated video files)       |  |
|  +--------------------------------------+------------------------------------------+  |
|                                         | chrome.tabs.sendMessage                     |
|                                         v                                             |
|  +---------------------------------------------------------------------------------+  |
|  | CONTENT SCRIPT EXECUTION ENVIRONMENT (content.js - Isolated World)              |  |
|  |                                                                                 |  |
|  |  +-------------------------+  +--------------------------+  +----------------+  |  |
|  |  | Adapter: ChatGPT        |  | Adapter: Claude / Gemini |  | Adapter: Veo   |  |  |
|  |  +-------------------------+  +--------------------------+  +----------------+  |  |
|  |               |                             |                        |          |  |
|  |               +-----------------------------+------------------------+          |  |
|  |                                             |                                   |  |
|  |                                 [ Unified DOM Engine ]                          |  |
|  |                                 - Safe Descriptor Setter (React/Vue)            |  |
|  |                                 - Direct Binary Asset Stream Fetch              |  |
|  |                                 - MutationObserver State Machine                |  |
|  +---------------------------------------------+-----------------------------------+  |
+------------------------------------------------+--------------------------------------+
                                                 | Direct DOM Interaction
                                   +-------------v-------------+
                                   | Web Page: ChatGPT / Veo   |
                                   +---------------------------+
```

---

## 2. Complete `manifest.json` Specification

```json
{
  "manifest_version": 3,
  "name": "Cinematic Studio Production Agent",
  "version": "1.1.0",
  "description": "Desktop-integrated AI video and narrative production bridge for Cinematic Studio.",
  "permissions": [
    "storage",
    "tabs",
    "activeTab",
    "downloads",
    "nativeMessaging"
  ],
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://*.chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://flow.google.com/*",
    "https://*.google.com/veo/*"
  ],
  "background": {
    "service_worker": "background.bundle.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*",
        "https://flow.google.com/*",
        "https://*.google.com/veo/*"
      ],
      "js": ["content.bundle.js"],
      "run_at": "document_idle"
    }
  ]
}
```

---

## 3. Native Messaging Port & Reconnection Architecture

The extension communicates with the desktop application via Chrome's native messaging API:

```javascript
// background.js - Native Messaging Host Client
class DesktopBridgePort {
  constructor() {
    this.port = null;
    this.isHandshakeComplete = false;
  }

  connect() {
    try {
      // Connects to native host registered under com.cinematic.studio
      this.port = chrome.runtime.connectNative("com.cinematic.studio");

      this.port.onMessage.addListener((msg) => this.handleDesktopMessage(msg));
      this.port.onDisconnect.addListener(() => {
        console.warn("[BridgePort] Disconnected from Desktop Native Host.");
        this.port = null;
        this.isHandshakeComplete = false;
        // Schedule reconnection attempt after delay
        setTimeout(() => this.connect(), 5000);
      });

      // Initiate mutual challenge-response handshake
      this.initiateHandshake();
    } catch (err) {
      console.error("[BridgePort] Connection failed:", err);
    }
  }

  async initiateHandshake() {
    const { profileId, pairingSecret } = await chrome.storage.local.get(["profileId", "pairingSecret"]);
    if (!profileId || !pairingSecret) {
      console.log("[BridgePort] Extension unpaired. Awaiting operator token.");
      return;
    }

    const clientNonce = crypto.randomUUID();
    this.port.postMessage({
      jsonrpc: "2.0",
      method: "initiate_handshake",
      params: { profileId, clientNonce }
    });
  }

  async handleDesktopMessage(packet) {
    if (packet.method === "challenge_issued") {
      // Compute HMAC-SHA256 signature and verify with Desktop
      const signature = await computeHmac(packet.params.serverNonce, pairingSecret);
      this.port.postMessage({
        jsonrpc: "2.0",
        method: "verify_handshake",
        params: { signature }
      });
      return;
    }

    if (packet.method === "handshake_success") {
      this.isHandshakeComplete = true;
      console.log("[BridgePort] Authenticated with Desktop successfully.");
      return;
    }

    if (packet.method === "execute_task" && this.isHandshakeComplete) {
      this.routeTaskToTab(packet.params);
    }
  }
}
```

---

## 4. Manifest V3 Service Worker Lifecycle Realities

### 4.1 What Chrome Actually Guarantees
- Chrome **does not guarantee** continuous background execution.
- If a browser profile is inactive, Chrome can terminate the service worker after **30 seconds** of idle time.
- Even with an open native messaging port, Chrome can terminate the service worker if the host computer enters sleep mode or under extreme system memory exhaustion.

### 4.2 Handling Service Worker Termination & Recovery
Because the service worker is ephemeral, the system handles termination cleanly:
1. **Desktop Remains Aware**: When the service worker is terminated, the desktop native relay detects `pipe_broken` and transitions the profile state to `HIBERNATED`.
2. **Tasks Do Not Fail**: If a generation task was marked `GENERATING`, it is **not** aborted. The remote AI website continues rendering in the open browser tab.
3. **Reconciliation on Wake**: When the user opens Chrome, clicks the extension, or an alarm fires:
   - The service worker spawns, reconnects to the Desktop Native Host, and completes the handshake.
   - The service worker queries active provider tabs (`chrome.tabs.query`).
   - The content script inspects the DOM, detects that the video or reasoning response finished while the worker was asleep, and immediately dispatches the completion payload to Desktop.

---

## 5. Low-RAM Asset Injection & Output Collection

### 5.1 Zero-Base64 Reference Asset Streaming
To prevent multi-megabyte Base64 strings from thrashing the JavaScript heap:
1. The Desktop exposes an ephemeral, tokenized local HTTP asset endpoint:
   `http://127.0.0.1:48125/asset/<token>/<asset_hash>`
2. The Content Script fetches the binary asset as a native `Blob`:
   ```typescript
   const res = await fetch(`http://127.0.0.1:48125/asset/${token}/${hash}`);
   const blob = await res.blob();
   const file = new File([blob], "character_reference.png", { type: "image/png" });
   ```
3. The `File` object is injected into the provider's file input or dropzone via a synthetic `DataTransfer` object, requiring zero string-encoding overhead.

### 5.2 Multi-Tier Video Output Collection
Instead of naively assuming all generated videos have exposed download URLs:
- **Tier 1 (Native Download Click)**: Content script clicks the provider's official "Download" button in the webpage DOM. Chrome's native download engine manages the transfer directly. The extension monitors `chrome.downloads.onChanged` for completion, captures the final file path, and notifies Desktop.
- **Tier 2 (In-Page Blob Streaming)**: If no download button exists, content script streams the video source buffer directly to the Desktop's local ingestion pipeline.
- **Tier 3 (User-Assist Fallback)**: If provider obfuscation blocks automated downloads, Desktop alerts the operator: *"Video ready. Click Download in Chrome, then click 'Import from Downloads'."*
