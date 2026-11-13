const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createPng(width, height, r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // deflate
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // no interlace

  const ihdrChunk = Buffer.concat([
    Buffer.from('IHDR'),
    ihdrData
  ]);
  const ihdrLen = Buffer.alloc(4);
  ihdrLen.writeUInt32BE(13, 0);
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE(crc32(ihdrChunk), 0);
  const fullIhdr = Buffer.concat([ihdrLen, ihdrChunk, ihdrCrc]);

  // Raw Scanlines
  // Filter byte 0 per row
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);
  
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.45;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Icon: Studio film disc with accent border
      if (dist <= radius) {
        if (dist > radius - 2) {
          // Gold border
          rawData[pxOffset] = 245;     // R
          rawData[pxOffset + 1] = 158; // G
          rawData[pxOffset + 2] = 11;  // B
          rawData[pxOffset + 3] = 255; // A
        } else if (dist <= radius * 0.3) {
          // Center cyan core
          rawData[pxOffset] = 6;
          rawData[pxOffset + 1] = 182;
          rawData[pxOffset + 2] = 212;
          rawData[pxOffset + 3] = 255;
        } else {
          // Dark studio background
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
          rawData[pxOffset + 3] = 255;
        }
      } else {
        // Transparent
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);
  const idatLen = Buffer.alloc(4);
  idatLen.writeUInt32BE(deflated.length, 0);
  const idatChunk = Buffer.concat([Buffer.from('IDAT'), deflated]);
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE(crc32(idatChunk), 0);
  const fullIdat = Buffer.concat([idatLen, idatChunk, idatCrc]);

  // IEND
  const iendLen = Buffer.alloc(4);
  iendLen.writeUInt32BE(0, 0);
  const iendChunk = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4);
  iendCrc.writeUInt32BE(crc32(iendChunk), 0);
  const fullIend = Buffer.concat([iendLen, iendChunk, iendCrc]);

  return Buffer.concat([signature, fullIhdr, fullIdat, fullIend]);
}

function createIco(png32, png128) {
  // ICONDIR header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(2, 4); // 2 images

  const offsetImage1 = 6 + 16 * 2;
  const offsetImage2 = offsetImage1 + png32.length;

  const entry1 = Buffer.alloc(16);
  entry1.writeUInt8(32, 0); // width
  entry1.writeUInt8(32, 1); // height
  entry1.writeUInt8(0, 2);  // color count
  entry1.writeUInt8(0, 3);  // reserved
  entry1.writeUInt16LE(1, 4); // planes
  entry1.writeUInt16LE(32, 6); // bpp
  entry1.writeUInt32LE(png32.length, 8); // size
  entry1.writeUInt32LE(offsetImage1, 12); // offset

  const entry2 = Buffer.alloc(16);
  entry2.writeUInt8(128, 0); // width
  entry2.writeUInt8(128, 1); // height
  entry2.writeUInt8(0, 2);  // color count
  entry2.writeUInt8(0, 3);  // reserved
  entry2.writeUInt16LE(1, 4); // planes
  entry2.writeUInt16LE(32, 6); // bpp
  entry2.writeUInt32LE(png128.length, 8); // size
  entry2.writeUInt32LE(offsetImage2, 12); // offset

  return Buffer.concat([header, entry1, entry2, png32, png128]);
}

function createIcns(png128, png256) {
  // Apple ICNS header: 'icns' (4 bytes) + total length (4 bytes BE)
  // Type 'ic07' for 128x128 PNG, 'ic08' for 256x256 PNG
  const type1 = Buffer.from('ic07');
  const len1 = Buffer.alloc(4);
  len1.writeUInt32BE(8 + png128.length, 0);
  const block1 = Buffer.concat([type1, len1, png128]);

  const type2 = Buffer.from('ic08');
  const len2 = Buffer.alloc(4);
  len2.writeUInt32BE(8 + png256.length, 0);
  const block2 = Buffer.concat([type2, len2, png256]);

  const magic = Buffer.from('icns');
  const totalLen = Buffer.alloc(4);
  totalLen.writeUInt32BE(8 + block1.length + block2.length, 0);

  return Buffer.concat([magic, totalLen, block1, block2]);
}

const iconsDir = path.join(__dirname, '../src-tauri/icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

const png32 = createPng(32, 32, 15, 23, 42);
const png128 = createPng(128, 128, 15, 23, 42);
const png256 = createPng(256, 256, 15, 23, 42);
const ico = createIco(png32, png128);
const icns = createIcns(png128, png256);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), icns);

console.log('Successfully generated valid icons:');
console.log('  - src-tauri/icons/32x32.png (' + png32.length + ' bytes)');
console.log('  - src-tauri/icons/128x128.png (' + png128.length + ' bytes)');
console.log('  - src-tauri/icons/128x128@2x.png (' + png256.length + ' bytes)');
console.log('  - src-tauri/icons/icon.ico (' + ico.length + ' bytes)');
console.log('  - src-tauri/icons/icon.icns (' + icns.length + ' bytes)');
