/**
 * CINEMATIC STUDIO — Chrome Native Messaging Host Unregistration Script (Windows)
 * 
 * Removes the Native Messaging host manifest from Windows Registry:
 * Key: HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOST_NAME = 'com.cinematic.studio';

function unregisterNativeHost(options = {}) {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const manifestDir = path.join(localAppData, 'CinematicStudio', 'NativeMessaging');
  const manifestPath = path.join(manifestDir, `${HOST_NAME}.json`);
  const binPath = path.join(localAppData, 'CinematicStudio', 'bin', 'cinematic-studio-host.exe');

  if (process.platform === 'win32') {
    // 1. Terminate running host process to release file locks
    try {
      execSync('taskkill /F /IM cinematic-studio-host.exe /T 2>nul', { stdio: 'ignore' });
      console.log('[PASS] Stopped active native messaging host processes');
    } catch (_) {
      // Process was not running, clean continuation
    }

    // 2. Delete Chrome Registry key
    const regKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`;
    try {
      execSync(`reg delete "${regKey}" /f`, { stdio: 'ignore' });
      console.log(`[PASS] Successfully deleted Windows Registry key: ${regKey}`);
    } catch (err) {
      console.log(`[NOTICE] Registry key was already absent or removed`);
    }
  }

  // 3. Remove manifest file
  if (fs.existsSync(manifestPath)) {
    try {
      fs.unlinkSync(manifestPath);
      console.log(`[PASS] Removed manifest file: ${manifestPath}`);
    } catch (err) {
      console.warn(`[WARN] Failed to delete manifest file: ${err.message}`);
    }
  }

  // 4. Remove staged host binary
  if (fs.existsSync(binPath)) {
    try {
      fs.unlinkSync(binPath);
      console.log(`[PASS] Removed staged host binary: ${binPath}`);
    } catch (err) {
      console.warn(`[WARN] Failed to delete staged host binary: ${err.message}`);
    }
  }

  // 5. User data preservation notice
  if (options.purgeUserData) {
    const dbPath = path.join(localAppData, 'CinematicStudio', 'cinematic_studio.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('[PASS] User database purged as requested');
    }
  } else {
    console.log('[PASS] User projects and SQLite database preserved intact by default');
  }
}

if (require.main === module) {
  const purgeUserData = process.argv.includes('--purge-user-data');
  unregisterNativeHost({ purgeUserData });
}

module.exports = { unregisterNativeHost, HOST_NAME };

