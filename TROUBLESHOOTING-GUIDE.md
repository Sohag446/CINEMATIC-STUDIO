# CINEMATIC STUDIO — TROUBLESHOOTING GUIDE

Common issues, diagnostic procedures, and solutions for **CINEMATIC STUDIO**.

---

## 1. CHROME EXTENSION & NATIVE MESSAGING

### Symptom: Extension badge displays "DISCONNECTED" or "Native host has exited"
- **Cause 1: Desktop application is closed.**
  - *Fix:* Ensure Cinematic Studio is open and running.
- **Cause 2: Native Messaging Host is not registered in Windows Registry.**
  - *Check:* Run `reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio" /ve` in PowerShell.
  - *Fix:* If missing, run `node scripts/register_native_host.cjs` to register the host manifest.
- **Cause 3: Host manifest path mismatch.**
  - *Fix:* Open `%LOCALAPPDATA%\CinematicStudio\NativeMessaging\com.cinematic.studio.json` in a text editor and verify that the `path` property points to an existing `cinematic-studio-host.exe` binary.

### Symptom: Extension popup shows "PAIRING REQUIRED" or "INVALID SIGNATURE"
- **Cause:** Challenge expired (5-minute window) or pairing secret was revoked.
- **Fix:** In the desktop app, go to **Profiles** > select the profile > click **Revoke**, then click **Pair Profile** to generate a fresh pairing challenge. Enter the new token into the extension popup.

---

## 2. AI GENERATION WORKFLOW & TASK PAUSES

### Symptom: Task status transitions to `NEEDS_HUMAN_ACTION`
- **Cause:** The target web provider (e.g. ChatGPT, Claude, Gemini, Veo) presented a login wall, CAPTCHA, Cloudflare Turnstile verification, or content policy modal.
- **Policy:** Cinematic Studio strictly avoids automated CAPTCHA bypassing to protect user accounts and adhere to safety standards.
- **Resolution:**
  1. Open the browser tab displaying the provider.
  2. Complete the challenge or log in manually.
  3. In Cinematic Studio, click **Resume Task** on the task banner in the bottom production panel.

---

## 3. MEDIA RENDERING & FFMPEG

### Symptom: Render fails with "FFmpeg binary not found"
- **Cause:** The bundled media engine was not extracted or resource path could not be resolved.
- **Verification:** Run `node scripts/inspect_pe.cjs` to check for `src-tauri/resources/media-engine/windows-x64/ffmpeg.exe`.
- **Resolution:** Run `node scripts/acquire_ffmpeg.cjs` to download and verify the official Gyan essentials FFmpeg 9.0.2 distribution.

### Symptom: Render output file collision
- **Protection:** Cinematic Studio passes the `-n` (no overwrite) flag to FFmpeg during intermediate operations to prevent accidental media destruction.
- **Fix:** If exporting with a name that already exists, specify a unique output file name or enable "Overwrite Existing" in the Export modal.

---

## 4. DATABASE & RECOVERY

### Symptom: Application crashes or project fails to open after unexpected shutdown
- **Cause:** Incomplete transaction or SQLite journal recovery pending.
- **Recovery:**
  1. Cinematic Studio features automatic crash recovery using Write-Ahead Logging (WAL) and migration assertions.
  2. To run a database integrity check, open Cinematic Studio Settings > **Database Maintenance** > **Verify Integrity**, which executes `PRAGMA integrity_check`.
  3. Any interrupted rendering tasks are safely rolled back, and orphaned partial files in `media_cache/` are purged.

---

## 5. WINDOWS SMARTSCREEN & DEFENDER

### Symptom: Windows SmartScreen shows "Windows protected your PC"
- **Cause:** The application installer is newly released and unsigned with an enterprise EV code-signing certificate.
- **Resolution:** Click **More info**, then click **Run anyway**. All source code and build pipelines are open and verifiable in the public GitHub repository.

