# CINEMATIC STUDIO — WINDOWS INSTALLATION GUIDE

This guide provides complete, step-by-step instructions for installing and initializing **CINEMATIC STUDIO** on Microsoft Windows.

---

## 1. SYSTEM REQUIREMENTS

| Component | Minimum Requirement | Recommended |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit, Build 19041+) | Windows 11 (64-bit, Build 22621+) |
| **Architecture** | x86_64 / x64 | x86_64 / x64 |
| **Processor** | Dual-core 2.0 GHz Intel / AMD | Quad-core 3.0+ GHz Intel Core i5/i7 or AMD Ryzen |
| **Memory (RAM)** | 4 GB | 8 GB or higher |
| **Disk Space** | 500 MB (app + bundled media engine) | 10 GB+ (for video rendering and asset cache) |
| **Runtime** | Microsoft Edge WebView2 Runtime | Pre-installed on Windows 10/11 |
| **Browser Companion** | Google Chrome (version 120+) | Google Chrome with active user profile |

---

## 2. INSTALLATION METHODS

### Method A: Automated Windows Installer (`.exe` / `.msi`)
1. Download the latest installer package from the GitHub Releases page:
   - **Setup Executable:** `Cinematic-Studio-Setup-1.0.0.exe` (NSIS)
   - **Enterprise Package:** `Cinematic-Studio-1.0.0-x64.msi` (Windows Installer)
2. Double-click the installer. If Windows SmartScreen displays an alert (*"Unknown Publisher"*), click **More Info** followed by **Run Anyway** (the official release binary is built openly via GitHub Actions).
3. The installer automatically:
   - Installs the desktop application files to `%LOCALAPPDATA%\Programs\CinematicStudio`
   - Bundles the compliant Gyan FFmpeg 9.0.2 media engine and documentation
   - Installs the Native Messaging host binary `cinematic-studio-host.exe`
   - Registers the Chrome Native Messaging host in the Windows Registry (`HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`)
   - Creates a Start Menu shortcut and Desktop icon.
4. Launch **Cinematic Studio** from the Desktop shortcut or Start Menu.

---

### Method B: Portable / Developer Workspace Installation
If running from source or portable extracted archive:
1. Ensure **Node.js 20+** and the Rust toolchain are available.
2. Build the production frontend:
   ```powershell
   npm run build
   ```
3. Register the Chrome Native Messaging host:
   ```powershell
   node scripts/register_native_host.cjs
   ```
4. Verify bundled media engine:
   ```powershell
   node scripts/inspect_pe.cjs
   ```

---

## 3. FIRST LAUNCH & INITIALIZATION

Upon first launch, Cinematic Studio automatically performs the following initialization:
1. **Local Vault Setup:** Initializes application storage at `%LOCALAPPDATA%\CinematicStudio`:
   - `cinematic_studio.db` — SQLite database with migrations 001–005
   - `projects/` — Default project directory
   - `media_cache/` — Temporary media render cache
   - `NativeMessaging/` — Chrome Native Messaging manifest
2. **Media Engine Verification:** Locates and tests the bundled `ffmpeg.exe` and `ffprobe.exe` binaries using SHA-256 verification.
3. **Chrome Profile Scan:** Scans `%LOCALAPPDATA%\Google\Chrome\User Data\Local State` to display discovered local Chrome profiles for AI generation pairing.

---

## 4. NEXT STEP

After launching the desktop application, install and pair the companion Chrome Extension by following the [Chrome Extension Setup Guide](file:///c:/Users/Sohag%20Hossen/Documents/video%20agent/CHROME-EXTENSION-SETUP-GUIDE.md).

