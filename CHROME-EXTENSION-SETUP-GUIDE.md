# CINEMATIC STUDIO — CHROME EXTENSION SETUP & RECOVERY GUIDE

**Application:** CINEMATIC STUDIO
**Extension ID:** `olfkacbfbgihonffpmnmnhmfmonfhmpf`
**Native Messaging Host:** `com.cinematic.studio`
**Manifest Version:** Manifest V3 (MV3)
**Developer:** Md. Sohag Hossen ([GitHub Profile](https://github.com/Sohag446))
**Repository:** https://github.com/Sohag446/CINEMATIC-STUDIO

---

## 1. Overview & Architecture

CINEMATIC STUDIO uses a lightweight Google Chrome extension to bridge your desktop creative suite directly to your real Chrome browser sessions.

```
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│     CINEMATIC STUDIO DESKTOP    │         │       GOOGLE CHROME BROWSER     │
│       (Tauri 2 + Rust Core)     │         │                                 │
└────────────────┬────────────────┘         └────────────────┬────────────────┘
                 │ Stdio IPC (32-bit LE)                     │ Web Navigation & State
                 ▼                                           ▼
┌─────────────────────────────────┐         ┌─────────────────────────────────┐
│   Native Messaging Host Binary  │◄───────►│    Cinematic Studio Extension   │
│   (cinematic-studio-host.exe)   │         │ (ID: olfkacbfbgihonffpmnmnh...) │
└─────────────────────────────────┘         └─────────────────────────────────┘
```

### Why Native Messaging?
- **No Fragile Scraping:** It connects directly to your active browser tabs.
- **Privacy & Security:** The desktop application never asks for, reads, or stores your passwords, cookies, or account tokens. You stay signed in to your preferred AI tools (ChatGPT, Gemini, Claude, Google Veo / Flow) in your own browser.
- **No Anti-Bot Interference:** Operates within your authenticated user session, respecting website rate limits and terms of service.

---

## 2. Step-by-Step Extension Installation

### Method 1: Loading from Source / Sideloading (Recommended)

1. **Locate or Extract the Extension:**
   - In CINEMATIC STUDIO, open the **First-Launch Setup Wizard** or click the **Chrome Pill** in the top navigation bar.
   - Click **Copy Path** to copy the extension folder path on your computer:
     ```
     <ProjectDirectory>\chrome-extension
     ```
   - Alternatively, if you downloaded `cinematic-studio-chrome-extension.zip` from the release assets, extract it into a permanent folder (e.g., `Documents\CinematicStudioExtension`).

2. **Open Chrome Extensions Manager:**
   - In Google Chrome, type `chrome://extensions` in the address bar and press **Enter**.

3. **Enable Developer Mode:**
   - Toggle the **Developer mode** switch in the top-right corner to **ON**.

4. **Load Unpacked Extension:**
   - Click the **Load unpacked** button in the top-left corner.
   - Select the `chrome-extension` directory (or extracted folder).
   - Verify that **Cinematic Studio Production Agent** appears in your extensions list with:
     - **ID:** `olfkacbfbgihonffpmnmnhmfmonfhmpf`
     - **Version:** `2.0.1`

---

## 3. Native Messaging Host Registration

The installer automatically registers the Native Messaging Host in your Windows Registry under Current User (`HKCU`).

### Verifying Windows Registry Key
Open PowerShell or Command Prompt and run:
```cmd
reg query HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio
```
The output should report:
```
(Default)    REG_SZ    C:\Users\<YourUser>\AppData\Local\CinematicStudio\NativeMessaging\com.cinematic.studio.json
```

### 1-Click Repair / Re-registration
If the registry key is ever missing or pointing to an old location:
1. Open CINEMATIC STUDIO.
2. Click **Chrome: Connect** in the top navigation bar (or press `Ctrl+3` $\rightarrow$ click the Shield icon).
3. Click **1-Click Auto-Repair**.
4. The application automatically re-writes the JSON manifest and registers the Windows Registry key.

---

## 4. Multi-Profile Support

Many creators maintain multiple Google Chrome profiles (e.g., Personal, Work, Studio).

1. In CINEMATIC STUDIO, navigate to the **AI Video** workspace.
2. In the right panel (Google Veo generator), locate the **Chrome Profile** dropdown.
3. Select the specific profile that has your active Google DeepMind / Veo account.
4. Click **Launch Session** to open that exact profile with the paired extension.

---

## 5. Bidirectional Communication & Heartbeat Verification

To test that the desktop application and Chrome extension are communicating:

1. Click the **Cinematic Studio extension icon** in your Chrome toolbar.
2. The popup will display:
   - **Host Connection:** `Connected to com.cinematic.studio ✓`
   - **Protocol:** `32-bit LE Stdio IPC`
   - **Heartbeat:** `Active (Latency < 2ms)`
   - **Pairing Status:** `Paired with Desktop Studio`
3. In CINEMATIC STUDIO, open the **Property Inspector** (`Ctrl+I`) $\rightarrow$ under Chrome Integration, the status will show **EXTENSION_CONNECTED**.
