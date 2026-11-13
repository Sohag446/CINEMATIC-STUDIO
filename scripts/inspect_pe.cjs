const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function inspectBinary(filePath) {
  console.log(`\n========================================`);
  console.log(`Inspecting: ${filePath}`);
  console.log(`========================================`);

  const buf = fs.readFileSync(filePath);
  const peOffset = buf.readInt32LE(0x3C);
  const magic = buf.readUInt16LE(peOffset + 24);
  const is64 = magic === 0x20b;
  console.log(`PE Signature Offset: 0x${peOffset.toString(16)}`);
  console.log(`Architecture: ${is64 ? 'PE32+ (64-bit)' : 'PE32 (32-bit)'}`);

  // Data directories: OptionalHeader + (is64 ? 112 : 96) is export, + 8 is import table
  const importDirOffset = peOffset + 24 + (is64 ? 120 : 104);
  const importRva = buf.readUInt32LE(importDirOffset);
  const importSize = buf.readUInt32LE(importDirOffset + 4);
  console.log(`Import Directory RVA: 0x${importRva.toString(16)}, Size: ${importSize} bytes`);

  // Section headers
  const numSections = buf.readUInt16LE(peOffset + 6);
  const optHeaderSize = buf.readUInt16LE(peOffset + 20);
  const sectionHeaderStart = peOffset + 24 + optHeaderSize;

  function rvaToOffset(rva) {
    for (let i = 0; i < numSections; i++) {
      const sOffset = sectionHeaderStart + i * 40;
      const sVirtualSize = buf.readUInt32LE(sOffset + 8);
      const sVirtualAddr = buf.readUInt32LE(sOffset + 12);
      const sRawSize = buf.readUInt32LE(sOffset + 16);
      const sRawPtr = buf.readUInt32LE(sOffset + 20);
      if (rva >= sVirtualAddr && rva < sVirtualAddr + Math.max(sVirtualSize, sRawSize)) {
        return sRawPtr + (rva - sVirtualAddr);
      }
    }
    return 0;
  }

  // Read Import Directory Table
  const importOffset = rvaToOffset(importRva);
  const importedDlls = [];
  if (importOffset > 0) {
    let curr = importOffset;
    while (true) {
      const origFirstThunk = buf.readUInt32LE(curr);
      const timeDateStamp = buf.readUInt32LE(curr + 4);
      const forwarderChain = buf.readUInt32LE(curr + 8);
      const nameRva = buf.readUInt32LE(curr + 12);
      const firstThunk = buf.readUInt32LE(curr + 16);
      if (origFirstThunk === 0 && nameRva === 0 && firstThunk === 0) break;

      const nameOffset = rvaToOffset(nameRva);
      if (nameOffset > 0) {
        let nameEnd = nameOffset;
        while (buf[nameEnd] !== 0) nameEnd++;
        const dllName = buf.toString('utf8', nameOffset, nameEnd);
        importedDlls.push(dllName);
      }
      curr += 20;
    }
  }

  console.log(`Imported DLLs count: ${importedDlls.length}`);
  console.log(`Direct DLL Dependencies:`);
  importedDlls.forEach(dll => console.log(`  - ${dll}`));
}

const ffmpegPath = path.resolve('src-tauri/resources/media-engine/windows-x64/ffmpeg.exe');
const ffprobePath = path.resolve('src-tauri/resources/media-engine/windows-x64/ffprobe.exe');

inspectBinary(ffmpegPath);
inspectBinary(ffprobePath);

// Query build configuration from ffmpeg
try {
  console.log(`\n========================================`);
  console.log(`FFmpeg -version output:`);
  console.log(`========================================`);
  const versionOut = execSync(`"${ffmpegPath}" -version`, { encoding: 'utf8' });
  console.log(versionOut);
} catch (e) {
  console.error('Failed to run ffmpeg -version:', e.message);
}

