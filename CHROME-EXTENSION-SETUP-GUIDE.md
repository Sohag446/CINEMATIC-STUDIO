# CINEMATIC STUDIO — CHROME EXTENSION SETUP & PAIRING GUIDE

The **Cinematic Studio Production Agent** Chrome Extension connects your desktop studio with web-based AI generation providers (ChatGPT, Claude, Gemini, Google Flow / Veo).

---

## 1. EXTENSION PACKAGE INFORMATION

- **Extension Name:** Cinematic Studio Production Agent
- **Version:** `1.0.0`
- **Manifest Version:** Manifest V3
- **Deterministic Extension ID:** `olfkacbfbgihonffpmnmnhmfmonfhmpf`
  *(Generated deterministically from the embedded RSA public key in `manifest.json`)*
- **Package Archives:**
  - **Pre-packaged ZIP:** `dist/cinematic-studio-chrome-extension.zip`
  - **Source Directory:** `chrome-extension/`

---

## 2. HOW TO INSTALL IN GOOGLE CHROME

1. Open **Google Chrome** using the specific Chrome profile you intend to use for AI generations (e.g., Profile with your ChatGPT / Claude / Gemini / Google accounts).
2. Navigate to the Extensions management page:
   ```text
   chrome://extensions/
   ```
3. Enable **Developer mode** using the toggle in the top-right corner.
4. Install the extension using either of these two methods:
   - **Option A (Unpacked Source - Recommended for development/local use):**
     Click **Load unpacked** in the top-left, browse to the Cinematic Studio workspace, and select the `chrome-extension` directory.
   - **Option B (From ZIP Package):**
     Extract `dist/cinematic-studio-chrome-extension.zip` into a local folder (e.g. `C:\Users\<User>\Documents\CinematicExtension`), then click **Load unpacked** and select that extracted folder.
5. Confirm the extension appears with ID:
   ```text
   olfkacbfbgihonffpmnmnhmfmonfhmpf
   ```
6. Pin the extension to your Chrome toolbar for easy access.

---

## 3. NATIVE MESSAGING HOST REGISTRATION

The extension communicates with the desktop application via Chrome Native Messaging:
- If you installed Cinematic Studio via the official Windows installer (`.exe` or `.msi`), the Native Messaging host is registered automatically.
- If you run from source, register it once by running:
  ```powershell
  node scripts/register_native_host.cjs
  ```
- To verify registration, run:
  ```powershell
  reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio" /ve
  ```

---

## 4. SECURE PROFILE PAIRING (STEP-BY-STEP)

Cinematic Studio uses mutual HMAC-SHA256 challenge-response authentication with anti-replay protection.

1. **Open Desktop App:** In Cinematic Studio, click the **Profiles** button in the top navigation bar to open the **Chrome Profile Manager**.
2. **Discover Profiles:** The manager automatically detects all local Chrome profiles.
3. **Initiate Pairing:**
   - Locate the target profile and click **Pair Profile**.
   - The desktop app generates a cryptographic challenge with a 5-minute validity window and displays a pairing token or URI:
     `cinematic://pair?profile=<PROFILE_UUID>&secret=<SECRET_HEX>`
   - Click **Copy Pairing Token**.
4. **Open Extension Popup:**
   - In Chrome, click the **Cinematic Studio** extension icon.
   - The popup will display status: `UNPAIRED`.
5. **Paste and Confirm:**
   - Paste the copied pairing token into the **Pairing Token / URI** input field.
   - Click **Pair with Desktop**.
6. **Verification Complete:**
   - The extension and native host perform a mutual HMAC-SHA256 handshake.
   - Status updates to **CONNECTED** (green badge).
   - The desktop app updates the profile status to **PAIRED & CONNECTED**.

---

## 5. TESTING COMMUNICATION

- In the Chrome extension popup, click **Test Connection**.
- The extension dispatches a `PING` packet across the Native Messaging bridge.
- The desktop host receives it and returns a `PONG` packet with server timestamp and `HEALTHY` status.

---

## 6. SECURITY & PRIVACY PROMISES

- **Zero Credential Scraping:** The extension never inspects, accesses, or saves cookies, passwords, or authentication tokens.
- **No CAPTCHA Circumvention:** Anti-bot challenges (Cloudflare Turnstile, reCAPTCHA) are never bypassed. When human intervention is required, the extension escalates the task to `NEEDS_HUMAN_ACTION` and prompts the user.
- **Strict Profile Isolation:** The extension drops packets intended for other Chrome profile IDs.
- **Timed Expiry:** Pairing sessions expire automatically after inactivity and can be revoked at any time from the desktop application.

