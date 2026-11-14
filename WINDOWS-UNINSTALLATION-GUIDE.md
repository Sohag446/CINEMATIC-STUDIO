# CINEMATIC STUDIO — WINDOWS UNINSTALLATION GUIDE

**Application:** CINEMATIC STUDIO
**Version:** 2.0.1
**Developer:** Md. Sohag Hossen ([GitHub Profile](https://github.com/Sohag446))
**Repository:** https://github.com/Sohag446/CINEMATIC-STUDIO

---

## 1. Overview & Data Protection Guarantee

CINEMATIC STUDIO includes a dedicated, clean Windows uninstaller designed according to strict data-protection standards:

> [!IMPORTANT]
> **User Project Preservation by Default:**
> Uninstalling CINEMATIC STUDIO **never** deletes your creative work. All user projects, videos, audio tracks, script analyses, and render exports stored in `C:\CinematicStudio\Projects` and your project directories are **retained intact**. Reinstalling or upgrading CINEMATIC STUDIO will automatically detect and restore your existing projects.

---

## 2. Uninstallation Methods

You can uninstall CINEMATIC STUDIO through any of the following three standard Windows methods:

### Method A: Windows Settings (Recommended)
1. Open Windows **Settings** (`Win + I`).
2. Navigate to **Apps** $\rightarrow$ **Installed apps** (or **Apps & features** on Windows 10).
3. In the search bar, type `Cinematic Studio`.
4. Click the three dots (`...`) next to **Cinematic Studio** and select **Uninstall**.
5. Confirm by clicking **Uninstall** in the confirmation popup.

---

### Method B: Classic Windows Control Panel
1. Press `Win + R`, type `appwiz.cpl`, and press **Enter**.
2. Locate **Cinematic Studio** in the list of installed programs.
3. Select **Cinematic Studio** and click **Uninstall** on the top toolbar.

---

### Method C: Direct Application Uninstaller Executable
1. Open Windows File Explorer (`Win + E`).
2. Navigate to the application installation folder:
   ```
   %LOCALAPPDATA%\Programs\Cinematic Studio
   ```
   *(Paste this directly into the File Explorer address bar)*
3. Double-click `Uninstall Cinematic Studio.exe`.

---

## 3. What the Uninstaller Does Automatically

When executed, the uninstaller executes the following lifecycle hooks:

1. **Process Termination:**
   - Detects whether `cinematic-studio.exe` or `cinematic-studio-host.exe` (Chrome Native Messaging Host) are running in the background.
   - Gracefully terminates them to release Windows file locks.
2. **Binary & Asset Removal:**
   - Deletes all application binaries, frontend web assets, and bundled libraries in `%LOCALAPPDATA%\Programs\Cinematic Studio`.
3. **Shortcut Cleanup:**
   - Deletes the Start Menu shortcut (`%SMPROGRAMS%\Cinematic Studio.lnk`).
   - Deletes the Desktop shortcut (`%USERPROFILE%\Desktop\Cinematic Studio.lnk`).
4. **Registry Cleanup:**
   - Unregisters the Native Messaging Host key from Windows Registry:
     ```
     HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio
     ```
   - Cleans up the Windows Uninstall registry key, ensuring no leftover entry remains in Installed Apps.
5. **Temporary Files Removal:**
   - Cleans application-owned host manifests and binaries in `%LOCALAPPDATA%\CinematicStudio\NativeMessaging` and `%LOCALAPPDATA%\CinematicStudio\bin`.

---

## 4. Upgrading Without Uninstalling

You do **not** need to manually uninstall CINEMATIC STUDIO before installing a newer release (e.g. v2.0.2):
- The installer automatically detects the existing installation.
- It safely replaces binaries and updates migrations without generating duplicate entries in Windows Installed Apps.
- All your projects, scenes, clips, and timeline sequences remain safely stored and immediately available.

---

## 5. Complete Purge (Optional — If Desired)

If you explicitly wish to delete all project databases and cache after uninstalling:
1. Delete the user database directory:
   ```cmd
   rd /s /q "%LOCALAPPDATA%\CinematicStudio"
   ```
2. Delete your exported video projects directory:
   ```cmd
   rd /s /q "C:\CinematicStudio\Projects"
   ```
*(Do this only if you want to permanently discard all past film projects).*
