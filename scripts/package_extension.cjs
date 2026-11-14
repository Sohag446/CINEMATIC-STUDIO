/**
 * CINEMATIC STUDIO — Chrome Extension Packaging Script
 * 
 * Bundles the Manifest V3 Chrome Extension files into a production-ready ZIP archive
 * at dist/cinematic-studio-chrome-extension.zip for distribution and manual installation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const extDir = path.join(rootDir, 'chrome-extension');
const distDir = path.join(rootDir, 'dist');
const zipOutput = path.join(distDir, 'cinematic-studio-chrome-extension.zip');

function packageExtension() {
  console.log('================================================================');
  console.log('CINEMATIC STUDIO — CHROME EXTENSION PACKAGING');
  console.log('================================================================\n');

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 1. Verify Extension Manifest & Key Files
  const manifestPath = path.join(extDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('manifest.json missing in chrome-extension directory');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`[PASS] Validated manifest.json (v${manifest.version})`);
  console.log(`       Name: ${manifest.name}`);
  console.log(`       Fixed RSA Key Length: ${manifest.key?.length || 0} chars`);

  const requiredFiles = [
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'engine/executionEngine.js',
    'adapters/common.js',
    'adapters/chatgpt.js',
    'adapters/gemini.js',
    'adapters/claude.js',
    'adapters/googleFlowVeo.js',
    'icons/icon-16.png',
    'icons/icon-48.png',
    'icons/icon-128.png'
  ];

  for (const rel of requiredFiles) {
    const full = path.join(extDir, rel);
    if (!fs.existsSync(full)) {
      throw new Error(`Required extension file missing: ${rel}`);
    }
  }
  console.log(`[PASS] Verified all ${requiredFiles.length} required extension files are present`);

  // 2. Remove pre-existing zip if present
  if (fs.existsSync(zipOutput)) {
    fs.unlinkSync(zipOutput);
  }

  // 3. Compress using PowerShell Compress-Archive with ProgressPreference SilentlyContinue
  const psCmd = `powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path '${extDir}\\*' -DestinationPath '${zipOutput}' -Force"`;
  console.log(`Creating ZIP package at: ${zipOutput}...`);
  execSync(psCmd, { stdio: 'inherit' });

  if (fs.existsSync(zipOutput)) {
    const stats = fs.statSync(zipOutput);
    // Also copy to persistent extension folder so frontend rebuilds do not erase it
    const persistentZip = path.join(extDir, 'cinematic-studio-chrome-extension.zip');
    fs.copyFileSync(zipOutput, persistentZip);

    console.log(`[PASS] Successfully created Chrome Extension package!`);
    console.log(`       File: ${zipOutput}`);
    console.log(`       Backup: ${persistentZip}`);
    console.log(`       Size: ${(stats.size / 1024).toFixed(2)} KB\n`);
  } else {
    throw new Error('Failed to create extension zip archive');
  }
}

if (require.main === module) {
  packageExtension();
}

module.exports = { packageExtension };
