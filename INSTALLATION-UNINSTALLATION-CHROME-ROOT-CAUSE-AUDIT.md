# CINEMATIC STUDIO — MASTER INSTALLATION, UNINSTALLATION & CHROME EXTENSION ROOT-CAUSE AUDIT

**Date:** 2026-11-14
**Target Release:** v2.0.1
**Repository:** https://github.com/Sohag446/CINEMATIC-STUDIO
**Developer:** Md. Sohag Hossen

---

## 1. Executive Summary

This engineering audit inspects the Windows installation lifecycle, uninstallation integrity, digital signing / Smart App Control compatibility, version synchronization, and Chrome Extension / Native Messaging Host communication in CINEMATIC STUDIO.

The audit identifies five primary root causes:
1. **Version Divergence:** Git tags (`v2.0.0`) did not match `package.json`, `tauri.conf.json`, `Cargo.toml`, and `manifest.json` (all stuck at `1.0.0`).
2. **Smart App Control (SAC) Binary Blocking:** The GitHub Actions workflow published unsigned NSIS and MSI binaries without Authenticode certificates or Microsoft Defender SmartScreen reputation.
3. **Uninstallation Failures & Leftovers:** The default NSIS uninstaller does not terminate running background processes (`cinematic-studio-host.exe`), leaving file-locked executables, orphaned registry keys, and incomplete uninstallations.
4. **Native Messaging Host Path Mismatch:** `NativeMessagingIpc::install_host_manifest` hardcoded fallback lookups to `%LOCALAPPDATA%\CinematicStudio\bin` instead of resolving the actual installed application directory (`$INSTDIR\resources\bin\cinematic-studio-host.exe`).
5. **No Per-User Installation Isolation:** Install mode was unspecified, leading to conflicting HKLM vs. HKCU installs and duplicate entries in Windows Installed Apps.

---

## 2. Detailed Root-Cause Analysis

### Problem 1: Installer Filename & Version Still Showing 1.0.0
- **Location:** `package.json:4`, `src-tauri/tauri.conf.json:4`, `src-tauri/Cargo.toml:3`, `chrome-extension/manifest.json:4`.
- **Cause:** Tauri CLI and WiX derive the installer package names (`Cinematic Studio_1.0.0_x64-setup.exe` and `Cinematic Studio_1.0.0_x64_en-US.msi`) directly from `tauri.conf.json: "version": "1.0.0"`. When release tag `v2.0.0` was pushed, the internal project version fields were not synchronized.
- **Fix:** Update all package manifests (`package.json`, `tauri.conf.json`, `Cargo.toml`, `manifest.json`, and About dialog) to **2.0.1**.

### Problem 2: Windows Smart App Control Blocking the Installer
- **Cause:** Windows 11 Smart App Control (SAC) blocks executables and MSI installers that lack an Authenticode digital signature from a Microsoft-trusted certificate authority with established cloud reputation.
- **Current Behavior:** CI builds were generated with `tauri build` without code-signing keys configured, resulting in raw unsigned PE32+ executables.
- **Fix:**
  1. Add Authenticode signing steps to `.github/workflows/windows-installer-build.yml` supporting `WINDOWS_CSC_LINK` (PFX) and `WINDOWS_CSC_KEY_PASSWORD` via `signtool.exe` with trusted timestamping (`http://timestamp.digicert.com`).
  2. Implement signature verification step `signtool verify /pa /v` that logs the Authenticode chain.
  3. Truthfully document unsigned status and the legitimate remediation process when running community builds without bypassing Windows security.

### Problem 3: Uninstallation Failures & Broken Windows Settings Entry
- **Cause:**
  1. **File Locks:** When the Chrome Extension communicates with `com.cinematic.studio`, Chrome spawns `cinematic-studio-host.exe` as a child process. If the user runs the uninstaller while Chrome is running, `cinematic-studio-host.exe` is file-locked by the OS, causing the uninstaller to fail when deleting files.
  2. **Registry Clutter:** Standard Tauri NSIS uninstallers do not clean up custom keys created in `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`.
  3. **Duplicate App Entries:** Inconsistent installation scopes (installing once as administrator in `C:\Program Files` and once as local user in `%LOCALAPPDATA%\Programs`) create two separate uninstall registry keys in `HKLM` and `HKCU`.
- **Fix:**
  1. Configure NSIS `installMode: "currentUser"` in `tauri.conf.json` for consistent single-user isolation.
  2. Implement NSIS installer hooks (`installerHooks: "nsis/installer-hooks.nsh"`):
     - `NSIS_HOOK_PREUNINSTALL`: Safely terminates `cinematic-studio.exe` and `cinematic-studio-host.exe` before file deletion.
     - Unregisters `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio`.
     - Deletes shortcuts and native host manifests.
     - By default: **Preserves user projects in `C:\CinematicStudio\Projects` and app data.**

### Problem 4: Chrome Extension and Native Messaging Host Failure
- **Location:** `src-tauri/src/chrome_service/ipc.rs:92-105` and `scripts/register_native_host.cjs:19`.
- **Cause:** The manifest writer looked for `cinematic-studio-host.exe` in `%LOCALAPPDATA%\CinematicStudio\bin\cinematic-studio-host.exe`. However, Tauri installs bundled resources into `$INSTDIR\resources\bin\cinematic-studio-host.exe`. Because the file was not found at the hardcoded path, the manifest JSON contained an invalid path, causing Chrome to fail with `Specified native messaging host not found`.
- **Fix:** Update path resolver to check `current_exe().parent()` and `$INSTDIR\resources\bin` first, ensuring the manifest path matches the real binary on disk.

### Problem 5: Missing Installation Diagnostics
- **Cause:** The UI lacked an integrated diagnostic tool capable of inspecting the registry, host manifest, executable existence, and extension pairing status in one unified screen with actionable repair options.
- **Fix:** Build an in-app Installation & Chrome Diagnostics panel showing real PASS / FAILED statuses with one-click automated repair and "Copy Diagnostic Report" functionality.

---

## 3. Implementation Plan

| Phase | Action Item | Target Files |
| :--- | :--- | :--- |
| **Phase 2** | Bump version to 2.0.1 & configure NSIS / WiX | `package.json`, `tauri.conf.json`, `Cargo.toml`, `manifest.json` |
| **Phase 2** | Add NSIS hooks (`.nsh`) for clean lifecycle | `src-tauri/nsis/installer-hooks.nsh` |
| **Phase 2** | Authenticode signing in release workflow | `.github/workflows/windows-installer-build.yml` |
| **Phase 3** | Implement clean process termination & uninstallation | `src-tauri/nsis/installer-hooks.nsh`, `scripts/unregister_native_host.cjs` |
| **Phase 4** | Build Windows Installation Diagnostic Tool | `src/features/settings/InstallationDiagnosticsModal.tsx` |
| **Phase 5** | Fix Native Host executable path resolution | `src-tauri/src/chrome_service/ipc.rs`, `scripts/register_native_host.cjs` |
| **Phase 6** | Package Chrome Extension ZIP for distribution | `scripts/package_extension.cjs` |
| **Phase 7** | Safe application update checker & integrity check | `src/services/updateService.ts` |
| **Phase 8** | Run complete regression and validation suites | `tests/*.cjs` |
| **Phase 9** | Create beginner-friendly First-Launch Setup Screen | `src/features/setup/FirstLaunchSetupModal.tsx` |
| **Phase 10**| Write official documentation guides | `WINDOWS-INSTALLATION-GUIDE.md`, `WINDOWS-UNINSTALLATION-GUIDE.md`, `CHROME-EXTENSION-SETUP-GUIDE.md`, `TROUBLESHOOTING.md` |
| **Phase 11**| Commit, push, tag v2.0.1, trigger CI release | Git repo, GitHub Actions |
