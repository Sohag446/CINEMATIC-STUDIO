# CINEMATIC STUDIO — UNINSTALLATION & DATA CLEANUP GUIDE

This guide explains how to cleanly remove **CINEMATIC STUDIO**, its companion Chrome Extension, and Native Messaging configuration from your Windows system.

---

## 1. DESKTOP APPLICATION UNINSTALLATION

### Method A: Via Windows Settings
1. Open Windows **Settings** (`Win + I`) and navigate to **Apps** > **Installed apps**.
2. Locate **Cinematic Studio** in the list.
3. Click the three dots (`...`) menu and select **Uninstall**.
4. Follow the uninstallation wizard prompts to remove the application binaries and shortcuts.

### Method B: Via Control Panel
1. Press `Win + R`, type `appwiz.cpl`, and press **Enter**.
2. Select **Cinematic Studio** and click **Uninstall**.

---

## 2. CHROME EXTENSION REMOVAL

1. In Google Chrome, navigate to:
   ```text
   chrome://extensions/
   ```
2. Locate **Cinematic Studio Production Agent**.
3. Click **Remove**.
4. Confirm removal when prompted.
5. All extension storage, pairing tokens, and cache are purged from Chrome automatically.

---

## 3. CHROME NATIVE MESSAGING HOST UNREGISTRATION

If you installed from source or wish to verify complete registry cleanliness:
1. Run the unregistration script:
   ```powershell
   node scripts/unregister_native_host.cjs
   ```
2. Or manually remove the Windows Registry key using Command Prompt or PowerShell:
   ```powershell
   reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio" /f
   ```

---

## 4. USER DATA & PROJECT VAULT PRESERVATION POLICY

### Preservation by Default:
To protect your creative work from accidental loss during updates or reinstallation, the uninstaller **preserves your project files, media assets, and SQLite database** located in:
```text
%LOCALAPPDATA%\CinematicStudio
```

### Complete Purge (Optional):
If you wish to completely remove all local projects, SQLite databases, and temporary rendering caches:
1. Ensure Cinematic Studio is closed.
2. In File Explorer, navigate to:
   `C:\Users\<YourUsername>\AppData\Local`
3. Delete the entire `CinematicStudio` folder, or run in PowerShell:
   ```powershell
   Remove-Item -Recurse -Force "$env:LOCALAPPDATA\CinematicStudio"
   ```

