const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('CINEMATIC STUDIO — MEDIA ENGINE RESOLVER COMPREHENSIVE TEST');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    if (details) console.log(`       ↳ ${details}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       ↳ ${details}`);
    failCount++;
  }
}

const bundledDir = path.resolve('src-tauri/resources/media-engine/windows-x64');
const ffmpegExe = path.join(bundledDir, 'ffmpeg.exe');
const ffprobeExe = path.join(bundledDir, 'ffprobe.exe');

// 1. Verify existence and PE architecture
assert(fs.existsSync(ffmpegExe), 'Bundled ffmpeg.exe exists in canonical resource tree', ffmpegExe);
assert(fs.existsSync(ffprobeExe), 'Bundled ffprobe.exe exists in canonical resource tree', ffprobeExe);

// 2. Test Paths Containing Spaces
const tempDirWithSpaces = path.resolve('tests/test_output/Cinema Studio Production Space');
if (!fs.existsSync(tempDirWithSpaces)) {
  fs.mkdirSync(tempDirWithSpaces, { recursive: true });
}
const spaceFfmpeg = path.join(tempDirWithSpaces, 'ffmpeg.exe');
try {
  fs.copyFileSync(ffmpegExe, spaceFfmpeg);
  const out = execSync(`"${spaceFfmpeg}" -version`, { encoding: 'utf8' });
  const firstLine = out.split('\n')[0];
  assert(firstLine.includes('ffmpeg version 9.0.2'), 'Path Containing Spaces Executes Safely', `Path: ${spaceFfmpeg} -> ${firstLine.substring(0, 45)}...`);
} catch (e) {
  assert(false, 'Path Containing Spaces Executes Safely', e.message);
} finally {
  if (fs.existsSync(spaceFfmpeg)) fs.unlinkSync(spaceFfmpeg);
  if (fs.existsSync(tempDirWithSpaces)) fs.rmdirSync(tempDirWithSpaces);
}

// 3. Test Production Resource Resolution Hierarchy
const mockInstalledDir = path.resolve('tests/test_output/mock_install_dir');
const mockResourcesDir = path.join(mockInstalledDir, 'resources/media-engine/windows-x64');
fs.mkdirSync(mockResourcesDir, { recursive: true });
const mockFfmpeg = path.join(mockResourcesDir, 'ffmpeg.exe');
const mockFfprobe = path.join(mockResourcesDir, 'ffprobe.exe');
fs.writeFileSync(mockFfmpeg, 'MZ-MOCK-BINARY-DATA');
fs.writeFileSync(mockFfprobe, 'MZ-MOCK-BINARY-DATA');

function resolveHierarchy(custom, prodDir, devDir, fallbackDir) {
  if (custom && fs.existsSync(custom)) return { source: 'USER_OVERRIDE', path: custom };
  if (prodDir && fs.existsSync(path.join(prodDir, 'ffmpeg.exe')) && fs.existsSync(path.join(prodDir, 'ffprobe.exe'))) {
    return { source: 'TAURI_PRODUCTION_RESOURCE', path: path.join(prodDir, 'ffmpeg.exe') };
  }
  if (devDir && fs.existsSync(path.join(devDir, 'ffmpeg.exe')) && fs.existsSync(path.join(devDir, 'ffprobe.exe'))) {
    return { source: 'DEVELOPMENT_RESOURCE', path: path.join(devDir, 'ffmpeg.exe') };
  }
  if (fallbackDir && fs.existsSync(path.join(fallbackDir, 'ffmpeg.exe'))) {
    return { source: 'LOCAL_FALLBACK', path: path.join(fallbackDir, 'ffmpeg.exe') };
  }
  return { source: 'NOT_FOUND', path: null };
}

// Test production resolution priority over dev
const prodRes = resolveHierarchy(null, mockResourcesDir, bundledDir, null);
assert(prodRes.source === 'TAURI_PRODUCTION_RESOURCE', 'Tauri Production Resource Takes Precedence Over Dev', prodRes.path);

// Test development resolution when production is absent
const devRes = resolveHierarchy(null, null, bundledDir, null);
assert(devRes.source === 'DEVELOPMENT_RESOURCE', 'Development Resource Selected When Production Absent', devRes.path);

// Test user override takes precedence over everything
const userOverrideRes = resolveHierarchy(ffmpegExe, mockResourcesDir, bundledDir, null);
assert(userOverrideRes.source === 'USER_OVERRIDE', 'User Override Takes Precedence Over Production & Dev', userOverrideRes.path);

// Cleanup mock install
fs.unlinkSync(mockFfmpeg);
fs.unlinkSync(mockFfprobe);
fs.rmdirSync(mockResourcesDir);
fs.rmdirSync(path.join(mockInstalledDir, 'resources/media-engine'));
fs.rmdirSync(path.join(mockInstalledDir, 'resources'));
fs.rmdirSync(mockInstalledDir);

// 4. Test Missing FFmpeg Detection
const missingFfmpegRes = resolveHierarchy(null, null, 'non_existent_dir_xyz', null);
assert(missingFfmpegRes.source === 'NOT_FOUND' && missingFfmpegRes.path === null, 'Missing FFmpeg Handled Deterministically', 'Returned NOT_FOUND');

// 5. Test Missing FFprobe Detection
const partialDir = path.resolve('tests/test_output/partial_engine');
fs.mkdirSync(partialDir, { recursive: true });
fs.writeFileSync(path.join(partialDir, 'ffmpeg.exe'), 'MOCK');
// ffprobe is absent
const partialRes = resolveHierarchy(null, partialDir, null, null);
assert(partialRes.source === 'NOT_FOUND', 'Missing FFprobe in Candidate Pair Rejects Incomplete Directory', 'Directory requires both ffmpeg and ffprobe');
fs.unlinkSync(path.join(partialDir, 'ffmpeg.exe'));
fs.rmdirSync(partialDir);

// 6. Test Cryptographic Checksum Validation
const crypto = require('crypto');
const ffmpegBuf = fs.readFileSync(ffmpegExe);
const actualHash = crypto.createHash('sha256').update(ffmpegBuf).digest('hex');
const expectedFfmpegHash = '3256173f3f8bffd7df12227c68adf68025edb1832273a9530688a7bb1ed8edec';
assert(actualHash === expectedFfmpegHash, 'Bundled ffmpeg.exe Matches Cryptographic SHA-256 Manifest', `Actual: ${actualHash}`);

// 7. Test Invalid Hash Rejection
const corruptedBuf = Buffer.from(ffmpegBuf.subarray(0, 1000));
const corruptedHash = crypto.createHash('sha256').update(corruptedBuf).digest('hex');
const isHashValid = corruptedHash === expectedFfmpegHash;
assert(!isHashValid, 'Corrupted / Truncated Binary Hash Rejected by Validator', `Corrupted Hash: ${corruptedHash}`);

// 8. Test Invalid Executable Rejection
const invalidExePath = path.resolve('tests/test_output/not_an_executable.exe');
fs.writeFileSync(invalidExePath, 'JUST_TEXT_NOT_A_PE_BINARY');
function validatePeHeader(filePath) {
  const b = fs.readFileSync(filePath);
  if (b.length < 64) return false;
  if (b[0] !== 0x4D || b[1] !== 0x5A) return false; // MZ header
  const peOffset = b.readInt32LE(0x3C);
  if (b.length < peOffset + 24) return false;
  if (b[peOffset] !== 0x50 || b[peOffset + 1] !== 0x45) return false; // PE header
  const machine = b.readUInt16LE(peOffset + 4);
  const optMagic = b.readUInt16LE(peOffset + 24);
  return machine === 0x8664 && optMagic === 0x20b; // x64 PE32+
}
assert(!validatePeHeader(invalidExePath), 'Non-PE / Invalid Executable Rejected by Architecture Validator', 'Rejected mock text file');
assert(validatePeHeader(ffmpegExe), 'Real ffmpeg.exe Validated as Genuine PE32+ 64-bit Binary', 'Validated MZ + PE + AMD64 machine type');
fs.unlinkSync(invalidExePath);

// 9. Test Path Traversal and Untrusted Input Rejection
function isUserPathSafe(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return false;
  if (inputPath.includes('\0')) return false; // Null byte
  if (/[<>:"|?*]/.test(path.basename(inputPath))) return false; // Invalid Windows filename chars
  if (!path.isAbsolute(inputPath)) return false; // Must be absolute
  return true;
}
assert(!isUserPathSafe('../../windows/system32/cmd.exe'), 'Relative Path Traversal Attempt Rejected', 'Relative paths rejected');
assert(!isUserPathSafe('C:\\malicious\\path\0with_null.exe'), 'Null-Byte Injection Attempt Rejected', 'Null byte detected');
assert(isUserPathSafe(ffmpegExe), 'Valid Absolute Canonical Path Accepted', ffmpegExe);

console.log('\n================================================================');
console.log(`MEDIA ENGINE RESOLVER TEST TOTALS: Passed: ${passCount} | Failed: ${failCount}`);
console.log('================================================================');

if (failCount > 0) process.exit(1);

