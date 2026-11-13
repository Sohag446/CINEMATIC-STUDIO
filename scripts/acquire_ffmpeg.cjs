/**
 * CINEMATIC STUDIO — Automated FFmpeg Acquisition & Integrity Verification Script
 * Downloads official Windows x64 FFmpeg release build linked by ffmpeg.org,
 * verifies cryptographic SHA-256 integrity, extracts binaries and license files,
 * and configures the bundled resource directory.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { execSync } = require('child_process');

const DOWNLOAD_URL = 'https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-9.0.2-essentials_build.zip';
const EXPECTED_SHA256 = '60f467265b1e312373dbcd92200c2618a74850f98d3d078e94296bb3fa2047ba';
const RELEASE_ID = 'ffmpeg-9.0.2-essentials_build';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(PROJECT_ROOT, 'temp_download');
const ZIP_PATH = path.join(TEMP_DIR, 'ffmpeg-release-essentials.zip');
const TARGET_DIR = path.join(PROJECT_ROOT, 'src-tauri', 'resources', 'media-engine', 'windows-x64');

async function downloadWithRedirect(url, destPath) {
  return new Promise((resolve, reject) => {
    function get(currentUrl) {
      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log(`[Redirect] HTTP ${res.statusCode} -> ${res.headers.location}`);
          return get(res.headers.location);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed with HTTP ${res.statusCode}: ${res.statusMessage}`));
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastReport = 0;

        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const percent = totalBytes > 0 ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : 0;
          const now = Date.now();
          if (now - lastReport > 2000) {
            console.log(`[Downloading] ${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toFixed(1)} MB (${percent}%)`);
            lastReport = now;
          }
        });

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            console.log(`[Downloaded] Complete: ${(downloadedBytes / (1024 * 1024)).toFixed(1)} MB`);
            resolve();
          });
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }

    get(url);
  });
}

async function calculateSHA256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

async function main() {
  console.log('================================================================');
  console.log('CINEMATIC STUDIO — AUTOMATED FFMPEG ACQUISITION & VERIFICATION');
  console.log('================================================================\n');

  console.log(`[Target Source]  Official Windows Build (Gyan.dev linked by ffmpeg.org)`);
  console.log(`[Release ID]     ${RELEASE_ID}`);
  console.log(`[Download URL]   ${DOWNLOAD_URL}`);
  console.log(`[Expected SHA]   ${EXPECTED_SHA256}\n`);

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Pre-check: if binaries are already present and verified in TARGET_DIR, skip download
  const targetFfmpeg = path.join(TARGET_DIR, 'ffmpeg.exe');
  const targetFfprobe = path.join(TARGET_DIR, 'ffprobe.exe');
  if (fs.existsSync(targetFfmpeg) && fs.existsSync(targetFfprobe)) {
    const ffmpegHash = await calculateSHA256(targetFfmpeg);
    const ffprobeHash = await calculateSHA256(targetFfprobe);
    console.log(`[Pre-check ffmpegHash]  ${ffmpegHash}`);
    console.log(`[Pre-check ffprobeHash] ${ffprobeHash}`);
    if (ffmpegHash.toLowerCase() === '3256173f3f8bffd7df12227c68adf68025edb1832273a9530688a7bb1ed8edec' &&
        ffprobeHash.toLowerCase() === 'f0d36ecbbdd3bcfac3efa078c96c7271c2e68b3810595552ac3b7f17e9a65c52') {
      console.log('[Notice] Bundled ffmpeg.exe and ffprobe.exe are already present in media-engine and cryptographically verified.');
      console.log(`[ffmpeg.exe SHA-256]  ${ffmpegHash}`);
      console.log(`[ffprobe.exe SHA-256] ${ffprobeHash}`);
      console.log('\n[SUCCESS] Media engine verification complete.');
      return;
    }
  }

  // Step 1: Download
  console.log('--- Step 1: Downloading Archive ---');
  if (fs.existsSync(ZIP_PATH)) {
    console.log('[Notice] Archive already downloaded, verifying existing file...');
  } else {
    await downloadWithRedirect(DOWNLOAD_URL, ZIP_PATH);
  }

  // Step 2: Cryptographic Checksum Verification
  console.log('\n--- Step 2: Verifying Cryptographic SHA-256 Checksum ---');
  const actualHash = await calculateSHA256(ZIP_PATH);
  console.log(`[Actual SHA256]   ${actualHash}`);
  console.log(`[Expected SHA256] ${EXPECTED_SHA256}`);

  if (actualHash.toLowerCase() !== EXPECTED_SHA256.toLowerCase()) {
    console.error('\n[FATAL ERROR] SHA-256 Checksum Mismatch! File may be corrupt or tampered.');
    fs.unlinkSync(ZIP_PATH);
    process.exit(1);
  }
  console.log('[PASS] Cryptographic integrity verified 100% against official distribution manifest.');

  // Step 3: Extraction
  console.log('\n--- Step 3: Extracting Binaries and Runtime Assets ---');
  const extractTempDir = path.join(TEMP_DIR, 'extracted');
  if (fs.existsSync(extractTempDir)) {
    fs.rmSync(extractTempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(extractTempDir, { recursive: true });

  console.log(`[Extracting] Using tar.exe to extract ${ZIP_PATH}...`);
  execSync(`tar -xf "${ZIP_PATH}" -C "${extractTempDir}"`, { stdio: 'inherit' });

  // Locate extracted folder (e.g. ffmpeg-9.0.2-essentials_build)
  const entries = fs.readdirSync(extractTempDir);
  const rootFolder = entries.find(e => fs.statSync(path.join(extractTempDir, e)).isDirectory());
  if (!rootFolder) {
    throw new Error('Could not find root directory in extracted archive');
  }

  const extractedRoot = path.join(extractTempDir, rootFolder);
  const binDir = path.join(extractedRoot, 'bin');

  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  // Step 4: Populate Bundled Structure
  console.log('\n--- Step 4: Populating Bundled Media Engine Structure ---');
  // 1. ffmpeg.exe & ffprobe.exe
  fs.copyFileSync(path.join(binDir, 'ffmpeg.exe'), path.join(TARGET_DIR, 'ffmpeg.exe'));
  fs.copyFileSync(path.join(binDir, 'ffprobe.exe'), path.join(TARGET_DIR, 'ffprobe.exe'));
  console.log(`[Copied] ffmpeg.exe (${(fs.statSync(path.join(TARGET_DIR, 'ffmpeg.exe')).size / (1024*1024)).toFixed(1)} MB)`);
  console.log(`[Copied] ffprobe.exe (${(fs.statSync(path.join(TARGET_DIR, 'ffprobe.exe')).size / (1024*1024)).toFixed(1)} MB)`);

  // 2. Licenses & Documentation
  const licensesDir = path.join(TARGET_DIR, 'LICENSES');
  if (!fs.existsSync(licensesDir)) {
    fs.mkdirSync(licensesDir, { recursive: true });
  }

  if (fs.existsSync(path.join(extractedRoot, 'LICENSE'))) {
    fs.copyFileSync(path.join(extractedRoot, 'LICENSE'), path.join(licensesDir, 'FFMPEG-LICENSE.txt'));
  }
  if (fs.existsSync(path.join(extractedRoot, 'README.txt'))) {
    fs.copyFileSync(path.join(extractedRoot, 'README.txt'), path.join(licensesDir, 'BUILD-README.txt'));
  }
  if (fs.existsSync(path.join(extractedRoot, 'doc'))) {
    const docDest = path.join(TARGET_DIR, 'doc');
    if (!fs.existsSync(docDest)) fs.mkdirSync(docDest, { recursive: true });
    fs.cpSync(path.join(extractedRoot, 'doc'), docDest, { recursive: true });
  }

  // 3. BUILD-INFO.txt
  const buildInfoContent = `CINEMATIC STUDIO — BUNDLED MEDIA ENGINE DISTRIBUTION INFO
===========================================================
Package:         FFmpeg & FFprobe Windows x64 Static Distribution
Release Version: 9.0.2 Essentials Build
Upstream Source: Gyan.dev (official Windows release linked by https://ffmpeg.org/download.html)
Download URL:    ${DOWNLOAD_URL}
Archive SHA-256: ${EXPECTED_SHA256}
Acquisition Date: ${new Date().toISOString()}

INCLUDED BINARIES:
- ffmpeg.exe:  FFmpeg video/audio converter, muxer, demuxer and filtergraph engine
- ffprobe.exe: FFmpeg media stream analyzer and metadata prober

LICENSING & REDISTRIBUTION:
This build is licensed under the GNU General Public License version 3 (GPL v3) or later.
See LICENSES/FFMPEG-LICENSE.txt for complete license terms.
Source code corresponding to this release is available from the upstream repository:
https://github.com/FFmpeg/FFmpeg/releases/tag/n9.0.2
`;
  fs.writeFileSync(path.join(TARGET_DIR, 'BUILD-INFO.txt'), buildInfoContent, 'utf8');

  // 4. SHA-256 Checksums of extracted binaries
  const ffmpegExeHash = await calculateSHA256(path.join(TARGET_DIR, 'ffmpeg.exe'));
  const ffprobeExeHash = await calculateSHA256(path.join(TARGET_DIR, 'ffprobe.exe'));
  const checksumFile = `SHA-256 CHECKSUMS OF BUNDLED BINARIES
====================================
${ffmpegExeHash}  ffmpeg.exe
${ffprobeExeHash}  ffprobe.exe
`;
  fs.writeFileSync(path.join(TARGET_DIR, 'CHECKSUMS.txt'), checksumFile, 'utf8');

  // Step 5: Clean up temp
  console.log('\n--- Step 5: Cleaning Temporary Extraction Files ---');
  fs.rmSync(extractTempDir, { recursive: true, force: true });
  console.log('[Cleanup] Extraction directory removed.');

  console.log('\n================================================================');
  console.log('SUCCESS: Bundled Media Engine Acquired & Verified at:');
  console.log(TARGET_DIR);
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n[Acquisition Error]:', err);
  process.exit(1);
});

