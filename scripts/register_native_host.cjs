/**
 * CINEMATIC STUDIO — Chrome Native Messaging Host Registration Script (Windows)
 * 
 * Registers the Native Messaging host manifest in Windows Registry:
 * Key: HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cinematic.studio
 * Default Value: <Path to com.cinematic.studio.json>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOST_NAME = 'com.cinematic.studio';
const EXTENSION_ID = 'olfkacbfbgihonffpmnmnhmfmonfhmpf';

function registerNativeHost(customExePath) {
  const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
  const manifestDir = path.join(localAppData, 'CinematicStudio', 'NativeMessaging');
  const binDir = path.join(localAppData, 'CinematicStudio', 'bin');

  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  const exePath = customExePath || path.join(binDir, 'cinematic-studio-host.exe');
  const manifestPath = path.join(manifestDir, `${HOST_NAME}.json`);

  const manifest = {
    name: HOST_NAME,
    description: 'Cinematic Studio Native Messaging Host',
    path: exePath,
    type: 'stdio',
    allowed_origins: [
      `chrome-extension://${EXTENSION_ID}/`
    ]
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[PASS] Native Messaging Manifest written to: ${manifestPath}`);
  console.log(`       Target Host Binary: ${exePath}`);
  console.log(`       Allowed Origin: chrome-extension://${EXTENSION_ID}/`);

  if (process.platform === 'win32') {
    const regKey = `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_NAME}`;
    const regCmd = `reg add "${regKey}" /ve /t REG_SZ /d "${manifestPath}" /f`;
    try {
      execSync(regCmd, { stdio: 'inherit' });
      console.log(`[PASS] Successfully registered Windows Registry key: ${regKey}`);
    } catch (err) {
      console.error(`[FAIL] Registry command failed: ${err.message}`);
      process.exit(1);
    }
  }

  return manifestPath;
}

if (require.main === module) {
  const customPath = process.argv[2];
  registerNativeHost(customPath);
}

module.exports = { registerNativeHost, HOST_NAME, EXTENSION_ID };

