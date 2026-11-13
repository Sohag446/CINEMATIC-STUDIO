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

function unregisterNativeHost() {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const manifestDir = path.join(localAppData, 'CinematicStudio', 'NativeMessaging');
  const manifestPath = path.join(manifestDir, `${HOST_NAME}.json`);

  if (process.platform === 'win32') {
    const regKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`;
    try {
      execSync(`reg delete "${regKey}" /f`, { stdio: 'inherit' });
      console.log(`[PASS] Successfully deleted Windows Registry key: ${regKey}`);
    } catch (err) {
      console.warn(`[WARN] Registry key may not exist or failed to delete: ${err.message}`);
    }
  }

  if (fs.existsSync(manifestPath)) {
    try {
      fs.unlinkSync(manifestPath);
      console.log(`[PASS] Removed manifest file: ${manifestPath}`);
    } catch (err) {
      console.warn(`[WARN] Failed to delete manifest file: ${err.message}`);
    }
  }
}

if (require.main === module) {
  unregisterNativeHost();
}

module.exports = { unregisterNativeHost, HOST_NAME };

