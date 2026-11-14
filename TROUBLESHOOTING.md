# CINEMATIC STUDIO — TROUBLESHOOTING & RECOVERY GUIDE

**Application:** CINEMATIC STUDIO
**Version:** 2.0.1
**Developer:** Md. Sohag Hossen ([GitHub Profile](https://github.com/Sohag446))
**Repository:** https://github.com/Sohag446/CINEMATIC-STUDIO

---

## 1. Windows Smart App Control & SmartScreen Notices

### Symptom:
When running `Cinematic Studio_2.0.1_x64-setup.exe` or `Cinematic Studio_2.0.1_x64_en-US.msi`, Windows displays:
- *"Smart App Control has blocked this app"* OR
- *"Windows protected your PC — Microsoft Defender SmartScreen prevented an unrecognized app from starting."*

### Why this happens:
- **Smart App Control (SAC)** is an AI-driven security feature in Windows 11. It evaluates files against Microsoft's cloud reputation graph.
- For new releases of open-source desktop software, Microsoft cloud intelligence has not yet accumulated a global download history for the specific binary hash.
- If an enterprise Authenticode certificate is not attached, Windows SmartScreen flags the executable as unrecognized.

### Legitimate Resolution (No Security Weakening):
> [!IMPORTANT]
> **Never disable Windows Defender or Smart App Control.** CINEMATIC STUDIO respects Windows security boundaries.

1. **Verify Integrity First:**
   - In PowerShell, run:
     ```powershell
     Get-FileHash -Path "Cinematic Studio_2.0.1_x64-setup.exe" -Algorithm SHA256
     ```
   - Compare the output against `SHA256SUMS.txt` on the official [GitHub Release page](https://github.com/Sohag446/CINEMATIC-STUDIO/releases).
2. **For SmartScreen Warning:**
   - Click **More info**.
   - Confirm the publisher is **Md. Sohag Hossen** and application is **Cinematic Studio**.
   - Click **Run anyway**.
3. **If Smart App Control strictly blocks execution:**
   - Right-click the downloaded `.exe` file $\rightarrow$ select **Properties**.
   - At the bottom of the **General** tab, check the box labeled **Unblock** $\rightarrow$ click **Apply** $\rightarrow$ click **OK**.
   - Double-click the installer again.

---

## 2. Chrome Extension: "Specified native messaging host not found"

### Symptom:
The Chrome Extension popup reports:
- *Error: Specified native messaging host not found.* OR
- *Error: Native host has exited.*

### Root Cause:
The Windows Registry key `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio` is either missing or pointing to a path that does not contain `com.cinematic.studio.json`.

### Immediate Fix:
1. Open CINEMATIC STUDIO.
2. In the top title bar menu, click **Help** $\rightarrow$ **Installation & Chrome Diagnostics...**.
3. Look at item **6 (Native Messaging Host Binary)** and **8 (Windows Registry)**.
4. Click **1-Click Auto-Repair**.
5. The application will immediately:
   - Stage `cinematic-studio-host.exe` into `%LOCALAPPDATA%\CinematicStudio\bin`.
   - Write the JSON manifest to `%LOCALAPPDATA%\CinematicStudio\NativeMessaging\com.cinematic.studio.json`.
   - Re-register the key under `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`.
6. Restart Google Chrome and open the extension popup.

---

## 3. Uninstaller Reports "Files in use" or Fails to Complete

### Symptom:
When running `Uninstall Cinematic Studio.exe`, Windows warns that files cannot be deleted because they are locked by another process.

### Root Cause:
If Google Chrome is open and had an active connection to the extension, Chrome holds `cinematic-studio-host.exe` running in the background.

### Resolution:
1. Close Google Chrome completely (or close the active Chrome tab connected to Cinematic Studio).
2. Open PowerShell or Command Prompt and run:
   ```cmd
   taskkill /F /IM cinematic-studio.exe
   taskkill /F /IM cinematic-studio-host.exe
   ```
3. Run the uninstaller again. It will now remove all files cleanly.
*(Note: v2.0.1 installer hooks now execute this process termination automatically prior to file deletion).*

---

## 4. Duplicate Entries in Windows "Installed Apps"

### Symptom:
Windows Settings shows two entries for "Cinematic Studio" (e.g. one for v1.0.0 and one for v2.0.1).

### Root Cause:
Occurs if a previous version was installed with Administrator elevation (which wrote to `HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall`) and a newer version was installed as local user (which wrote to `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall`).

### Resolution:
1. Uninstall both versions from Windows Settings $\rightarrow$ Installed Apps.
2. Install `Cinematic Studio_2.0.1_x64-setup.exe`.
3. In v2.0.1, the installation scope is locked to `currentUser` (`%LOCALAPPDATA%\Programs\Cinematic Studio`), completely eliminating future duplicate scope collisions.

---

## 5. Media Engine: FFmpeg Not Detected

### Symptom:
Video preview or master export indicates FFmpeg is unavailable.

### Resolution:
1. CINEMATIC STUDIO includes a pre-bundled, high-performance static build of FFmpeg 9.0.2 Essentials (located in `resources\media-engine\windows-x64\ffmpeg.exe`).
2. If running in portable/development mode without bundled binaries:
   - Run in the terminal:
     ```cmd
     node scripts/acquire_ffmpeg.cjs
     ```
   - Or open **Settings** (`Ctrl+,`) $\rightarrow$ under Media Engine, browse to your system `ffmpeg.exe` and `ffprobe.exe`.
