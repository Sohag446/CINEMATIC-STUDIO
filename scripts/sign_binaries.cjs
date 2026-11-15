/**
 * scripts/sign_binaries.cjs
 * Orchestrates pre-packaging and post-packaging Authenticode signing for CINEMATIC STUDIO.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const stage = process.argv.includes('--stage') ? process.argv[process.argv.indexOf('--stage') + 1] : 'all';

console.log('================================================================');
console.log(`CINEMATIC STUDIO — BINARY SIGNING PIPELINE [STAGE: ${stage.toUpperCase()}]`);
console.log('================================================================');

function findSigntool() {
  const sdkRoots = [
    'C:\\Program Files (x86)\\Windows Kits\\10\\bin',
    'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\SDK\\Bin\\v10.0'
  ];
  for (const root of sdkRoots) {
    if (fs.existsSync(root)) {
      try {
        const out = execSync(`powershell -NoProfile -Command "Get-ChildItem -Path '${root}' -Filter 'signtool.exe' -Recurse | Select-Object -First 1 -ExpandProperty FullName"`, { encoding: 'utf8' }).trim();
        if (out && fs.existsSync(out)) return out;
      } catch (e) {}
    }
  }
  return null;
}

function getTargets(stage) {
  const root = path.resolve(__dirname, '..');
  const targets = [];

  if (stage === 'pre-package' || stage === 'all') {
    const preTargets = [
      path.join(root, 'src-tauri/target/release/cinematic-studio.exe'),
      path.join(root, 'src-tauri/target/release/cinematic-studio-host.exe'),
      path.join(root, 'src-tauri/resources/media-engine/windows-x64/ffmpeg.exe'),
      path.join(root, 'src-tauri/resources/media-engine/windows-x64/ffprobe.exe')
    ];
    for (const t of preTargets) {
      if (fs.existsSync(t)) targets.push(t);
    }
  }

  if (stage === 'post-package' || stage === 'all') {
    const relDir = path.join(root, 'release_artifacts');
    if (fs.existsSync(relDir)) {
      const files = fs.readdirSync(relDir);
      for (const f of files) {
        if (f.endsWith('.exe') || f.endsWith('.msi')) {
          targets.push(path.join(relDir, f));
        }
      }
    }
  }

  return targets;
}

function main() {
  const targets = getTargets(stage);
  console.log(`Discovered ${targets.length} target binaries for stage '${stage}':`);
  targets.forEach(t => console.log(`  - ${path.basename(t)} (${t})`));

  const hasSSLCom = process.env.ES_USERNAME && process.env.ES_PASSWORD && process.env.CREDENTIAL_ID;
  const hasPFX = process.env.WINDOWS_CSC_LINK && process.env.WINDOWS_CSC_KEY_PASSWORD;

  if (!hasSSLCom && !hasPFX) {
    console.log('\n[NOTICE] No code-signing credentials (SSL.com eSigner or Authenticode PFX) found in environment.');
    console.log('[NOTICE] Bypassing signing. Binaries will remain unsigned for internal development testing.');
    process.exit(0);
  }

  if (hasPFX) {
    console.log('\n[INFO] Authenticode PFX credentials detected. Locating signtool.exe...');
    const signtool = findSigntool();
    if (!signtool) {
      console.error('[FATAL] signtool.exe could not be located in Windows SDK!');
      process.exit(1);
    }
    console.log(`Using signtool: ${signtool}`);

    const tempPfx = path.join(process.env.TEMP || 'C:\\Windows\\Temp', `auth_cert_${Date.now()}.pfx`);
    fs.writeFileSync(tempPfx, Buffer.from(process.env.WINDOWS_CSC_LINK, 'base64'));

    try {
      for (const target of targets) {
        console.log(`\nSigning ${path.basename(target)} with RFC 3161 timestamp...`);
        const cmd = `"${signtool}" sign /f "${tempPfx}" /p "${process.env.WINDOWS_CSC_KEY_PASSWORD}" /fd SHA256 /tr "http://timestamp.digicert.com" /td SHA256 /d "Cinematic Studio" "${target}"`;
        execSync(cmd, { stdio: 'inherit' });
      }
      console.log('\n[SUCCESS] All targets signed successfully.');
    } finally {
      if (fs.existsSync(tempPfx)) fs.unlinkSync(tempPfx);
    }
  }
}

main();
