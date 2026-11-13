const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('CINEMATIC STUDIO — LIVE ENVIRONMENT INITIAL AUDIT');
console.log('================================================================\n');

// 1. Git branch and commit
try {
  const commit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  console.log(`[Git] Branch: ${branch}`);
  console.log(`[Git] Latest Commit: ${commit}`);
} catch (e) {
  console.log('[Git] Error:', e.message);
}

// 2. Search for compiled executables
console.log('\n--- Searching for Compiled Executables ---');
const exeCandidates = [
  'src-tauri/target/debug/cinematic-studio.exe',
  'src-tauri/target/release/cinematic-studio.exe',
  'src-tauri/target/debug/cinematic-studio-host.exe',
  'src-tauri/target/release/cinematic-studio-host.exe',
  'src-tauri/target/debug/host.exe',
  'src-tauri/target/release/host.exe',
  path.join(process.env.LOCALAPPDATA || '', 'CinematicStudio', 'bin', 'cinematic-studio-host.exe'),
  path.join(process.env.LOCALAPPDATA || '', 'CinematicStudio', 'cinematic_studio.db')
];

exeCandidates.forEach(c => {
  if (fs.existsSync(c)) {
    console.log(`[FOUND] ${c} (${fs.statSync(c).size} bytes)`);
  } else {
    console.log(`[MISSING] ${c}`);
  }
});

// 3. Inspect Chrome NativeMessagingHosts registry
console.log('\n--- Windows Registry Chrome NativeMessagingHosts ---');
try {
  const regQuery = execSync('reg query "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts" /s', { encoding: 'utf8' });
  console.log(regQuery);
} catch (e) {
  console.log('HKCU NativeMessagingHosts: No entries found or key does not exist');
}

// 4. Chrome Local State & Profiles
console.log('\n--- Chrome User Data & Local State ---');
const chromeUserData = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data');
const localStatePath = path.join(chromeUserData, 'Local State');
if (fs.existsSync(localStatePath)) {
  console.log(`[FOUND] Chrome Local State: ${localStatePath} (${fs.statSync(localStatePath).size} bytes)`);
  try {
    const raw = fs.readFileSync(localStatePath, 'utf8');
    const parsed = JSON.parse(raw);
    const infoCache = parsed.profile?.info_cache || {};
    const profileKeys = Object.keys(infoCache);
    console.log(`Discovered ${profileKeys.length} Chrome Profiles:`);
    profileKeys.forEach(k => {
      const p = infoCache[k];
      console.log(`  - Key: "${k}", Name: "${p.name}", GaName: "${p.gaia_name || ''}"`);
    });
  } catch (e) {
    console.log('Error reading Local State:', e.message);
  }
} else {
  console.log(`[MISSING] Chrome Local State at: ${localStatePath}`);
}

// 5. Inspect Chrome Extension Manifest & ID
console.log('\n--- Chrome Extension Manifest ---');
const manifestPath = path.resolve('chrome-extension/manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`[Manifest] Name: ${manifest.name}, Version: ${manifest.version}`);
  console.log(`[Manifest] Permissions:`, manifest.permissions);
  console.log(`[Manifest] Host Permissions:`, manifest.host_permissions);
  console.log(`[Manifest] Key Declared:`, !!manifest.key);
}

// 6. Application Database in %LOCALAPPDATA%
console.log('\n--- Application Database ---');
const dbPath = path.join(process.env.LOCALAPPDATA || '', 'CinematicStudio', 'cinematic_studio.db');
if (fs.existsSync(dbPath)) {
  console.log(`[FOUND] App Database: ${dbPath} (${fs.statSync(dbPath).size} bytes)`);
} else {
  console.log(`[MISSING] App Database: ${dbPath}`);
}

