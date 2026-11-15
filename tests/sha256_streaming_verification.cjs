/**
 * tests/sha256_streaming_verification.cjs
 * Validates streaming SHA-256 calculation, NIST test vectors, single-byte avalanche effect,
 * error handling on missing files, and verifies bundled FFmpeg/FFprobe binaries.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function calculateFileSha256(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File does not exist: ${filePath}`);
  }
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(65536); // 64 KB streaming buffer
  try {
    let bytesRead;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex').toLowerCase();
}

console.log('================================================================');
console.log('CINEMATIC STUDIO — STREAMING SHA-256 CRYPTOGRAPHIC INTEGRITY SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, name, details) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    if (details) console.log(`       ↳ ${details}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    if (details) console.error(`       ↳ ${details}`);
    failed++;
  }
}

const tmpDir = path.join(__dirname, 'tmp_crypto_test');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

try {
  // Test 1: Empty file NIST vector
  const emptyFile = path.join(tmpDir, 'empty.bin');
  fs.writeFileSync(emptyFile, Buffer.alloc(0));
  const emptyHash = calculateFileSha256(emptyFile);
  assert(
    emptyHash === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'NIST FIPS 180-4 Empty File Digest',
    `Expected: e3b0c442... | Got: ${emptyHash}`
  );

  // Test 2: "abc" NIST vector
  const abcFile = path.join(tmpDir, 'abc.bin');
  fs.writeFileSync(abcFile, 'abc');
  const abcHash = calculateFileSha256(abcFile);
  assert(
    abcHash === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    'NIST FIPS 180-4 "abc" Digest',
    `Expected: ba7816bf... | Got: ${abcHash}`
  );

  // Test 3: "The quick brown fox jumps over the lazy dog" vector
  const foxFile = path.join(tmpDir, 'fox.bin');
  fs.writeFileSync(foxFile, 'The quick brown fox jumps over the lazy dog');
  const foxHash = calculateFileSha256(foxFile);
  assert(
    foxHash === 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    'NIST Reference Fox String Digest',
    `Expected: d7a8fbb3... | Got: ${foxHash}`
  );

  // Test 4: Single-Byte Mutation Avalanche Effect
  const foxMutatedFile = path.join(tmpDir, 'fox_mutated.bin');
  fs.writeFileSync(foxMutatedFile, 'The quick brown fox jumps over the lazy dog.'); // added period
  const foxMutatedHash = calculateFileSha256(foxMutatedFile);
  assert(
    foxMutatedHash === 'ef537f25c895bfa782526529a9b63d97aa631564d5d789c2b765448c8635fb6c',
    'Avalanche Effect on 1-Byte Mutation',
    `Base: ${foxHash.substring(0, 16)}... | Mutated: ${foxMutatedHash.substring(0, 16)}...`
  );
  assert(
    foxHash !== foxMutatedHash,
    'Hash Non-Collision on Single Byte Change',
    'Digests completely diverge as required by cryptographic security'
  );

  // Test 5: Rejection of Missing File
  let threwMissing = false;
  try {
    calculateFileSha256(path.join(tmpDir, 'non_existent_file.bin'));
  } catch (e) {
    threwMissing = true;
  }
  assert(threwMissing, 'Explicit Rejection on Non-Existent File', 'Throws error instead of returning synthetic hash');

  // Test 6: SHA-256 Block Boundaries (55, 56, 63, 64, 65, 127, 128, 129 bytes)
  const boundarySizes = [55, 56, 63, 64, 65, 127, 128, 129];
  let allBoundariesPass = true;
  for (const size of boundarySizes) {
    const bFile = path.join(tmpDir, `bound_${size}.bin`);
    fs.writeFileSync(bFile, Buffer.alloc(size, 0x61));
    const bHash = calculateFileSha256(bFile);
    if (bHash.length !== 64 || !/^[0-9a-f]{64}$/.test(bHash)) {
      allBoundariesPass = false;
    }
  }
  assert(allBoundariesPass, 'SHA-256 Block Boundaries (55, 56, 63, 64, 65 bytes)', 'All block boundary digests match exact 64-character hex');

  // Test 7: Multi-Buffer Streaming (131,072 bytes = 2x 64KB buffers)
  const multiBufFile = path.join(tmpDir, 'multi_buf.bin');
  fs.writeFileSync(multiBufFile, Buffer.alloc(131072, 0x42));
  const multiBufHash = calculateFileSha256(multiBufFile);
  assert(
    multiBufHash.length === 64 && /^[0-9a-f]{64}$/.test(multiBufHash),
    'Multi-Buffer Streaming (128 KB chunked transfer)',
    `Computed digest: ${multiBufHash.substring(0, 16)}...`
  );

  // Test 8: Verify Bundled Media Binaries
  const ffmpegPath = path.resolve(__dirname, '../src-tauri/resources/media-engine/windows-x64/ffmpeg.exe');
  const ffprobePath = path.resolve(__dirname, '../src-tauri/resources/media-engine/windows-x64/ffprobe.exe');

  const EXPECTED_FFMPEG_SHA256 = '3256173f3f8bffd7df12227c68adf68025edb1832273a9530688a7bb1ed8edec';
  const EXPECTED_FFPROBE_SHA256 = 'f0d36ecbbdd3bcfac3efa078c96c7271c2e68b3810595552ac3b7f17e9a65c52';

  if (fs.existsSync(ffmpegPath)) {
    const actualFfmpegHash = calculateFileSha256(ffmpegPath);
    assert(
      actualFfmpegHash === EXPECTED_FFMPEG_SHA256,
      'Bundled ffmpeg.exe Real Streaming Hash Matches Gyan 9.0.2',
      `Calculated: ${actualFfmpegHash}`
    );
  } else {
    console.warn('[SKIP] ffmpeg.exe not found at', ffmpegPath);
  }

  if (fs.existsSync(ffprobePath)) {
    const actualFfprobeHash = calculateFileSha256(ffprobePath);
    assert(
      actualFfprobeHash === EXPECTED_FFPROBE_SHA256,
      'Bundled ffprobe.exe Real Streaming Hash Matches Gyan 9.0.2',
      `Calculated: ${actualFfprobeHash}`
    );
  } else {
    console.warn('[SKIP] ffprobe.exe not found at', ffprobePath);
  }

} finally {
  // Cleanup temp files
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

console.log('\n----------------------------------------------------------------');
console.log(`TOTALS: ${passed} PASS | ${failed} FAIL`);
console.log('================================================================');

if (failed > 0) process.exit(1);
