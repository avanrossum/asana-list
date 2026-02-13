#!/usr/bin/env node

/**
 * Generate tray icon PNG files from SVG.
 * Run: node scripts/generate-icons.js
 *
 * macOS tray icons must be "template" images:
 * - Named *Template.png / *Template@2x.png
 * - Grayscale with alpha channel (black shapes on transparent)
 * - 16x16 (1x) and 32x32 (2x)
 */

const fs = require('fs');
const path = require('path');

// Simple list icon as an SVG path
// Three horizontal lines representing a list
function createTrayIconSvg(size) {
  const padding = Math.round(size * 0.15);
  const lineHeight = Math.round(size * 0.08);
  const lineSpacing = Math.round(size * 0.22);
  const dotRadius = Math.round(size * 0.06);
  const startY = Math.round(size * 0.25);
  const lineStart = padding + dotRadius * 2 + Math.round(size * 0.1);
  const lineEnd = size - padding;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;

  for (let i = 0; i < 3; i++) {
    const y = startY + i * lineSpacing;
    // Dot
    svg += `<circle cx="${padding + dotRadius}" cy="${y + lineHeight / 2}" r="${dotRadius}" fill="black"/>`;
    // Line
    svg += `<rect x="${lineStart}" y="${y}" width="${lineEnd - lineStart}" height="${lineHeight}" rx="${lineHeight / 2}" fill="black"/>`;
  }

  svg += '</svg>';
  return svg;
}

// Write SVG files (these can be converted to PNG with any tool)
const buildDir = path.join(__dirname, '..', 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

// Write SVG versions for reference
fs.writeFileSync(path.join(buildDir, 'trayIcon.svg'), createTrayIconSvg(16));
fs.writeFileSync(path.join(buildDir, 'trayIcon@2x.svg'), createTrayIconSvg(32));

// For the actual tray icon, we need PNG files.
// Since we can't generate PNGs in pure Node without dependencies,
// we'll create a minimal 1-bit PNG programmatically.

function createMinimalPng(size) {
  // Create a simple PNG with a list icon pattern
  // Using a raw pixel approach for the icon

  const pixels = new Uint8Array(size * size * 4); // RGBA

  const padding = Math.round(size * 0.15);
  const lineHeight = Math.max(1, Math.round(size * 0.08));
  const lineSpacing = Math.round(size * 0.22);
  const dotRadius = Math.max(1, Math.round(size * 0.06));
  const startY = Math.round(size * 0.25);
  const lineStart = padding + dotRadius * 2 + Math.round(size * 0.1);
  const lineEnd = size - padding;

  function setPixel(x, y, a) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (y * size + x) * 4;
    pixels[idx] = 0;     // R (black for template)
    pixels[idx + 1] = 0; // G
    pixels[idx + 2] = 0; // B
    pixels[idx + 3] = a; // A
  }

  function fillCircle(cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          setPixel(Math.round(cx + dx), Math.round(cy + dy), 255);
        }
      }
    }
  }

  function fillRect(x1, y1, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPixel(Math.round(x1 + dx), Math.round(y1 + dy), 255);
      }
    }
  }

  // Draw 3 list items (dot + line)
  for (let i = 0; i < 3; i++) {
    const y = startY + i * lineSpacing;
    fillCircle(padding + dotRadius, y + Math.round(lineHeight / 2), dotRadius);
    fillRect(lineStart, y, lineEnd - lineStart, lineHeight);
  }

  return encodePng(size, size, pixels);
}

// Minimal PNG encoder (no dependencies)
function encodePng(width, height, rgba) {
  function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function adler32(data) {
    let a = 1, b = 0;
    for (let i = 0; i < data.length; i++) {
      a = (a + data[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }

  function writeU32BE(buf, offset, val) {
    buf[offset] = (val >>> 24) & 0xFF;
    buf[offset + 1] = (val >>> 16) & 0xFF;
    buf[offset + 2] = (val >>> 8) & 0xFF;
    buf[offset + 3] = val & 0xFF;
  }

  function makeChunk(type, data) {
    const chunk = new Uint8Array(4 + type.length + data.length + 4);
    writeU32BE(chunk, 0, data.length);
    for (let i = 0; i < type.length; i++) chunk[4 + i] = type.charCodeAt(i);
    chunk.set(data, 4 + type.length);
    const crcData = new Uint8Array(type.length + data.length);
    for (let i = 0; i < type.length; i++) crcData[i] = type.charCodeAt(i);
    crcData.set(data, type.length);
    writeU32BE(chunk, 4 + type.length + data.length, crc32(crcData));
    return chunk;
  }

  // IHDR
  const ihdr = new Uint8Array(13);
  writeU32BE(ihdr, 0, width);
  writeU32BE(ihdr, 4, height);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT - raw image data with filter byte per row
  const rawData = new Uint8Array(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = rgba[srcIdx];
      rawData[dstIdx + 1] = rgba[srcIdx + 1];
      rawData[dstIdx + 2] = rgba[srcIdx + 2];
      rawData[dstIdx + 3] = rgba[srcIdx + 3];
    }
  }

  // Deflate (store only, no compression for simplicity)
  const blocks = [];
  let offset = 0;
  while (offset < rawData.length) {
    const remaining = rawData.length - offset;
    const blockSize = Math.min(remaining, 65535);
    const isLast = (offset + blockSize >= rawData.length) ? 1 : 0;
    const block = new Uint8Array(5 + blockSize);
    block[0] = isLast;
    block[1] = blockSize & 0xFF;
    block[2] = (blockSize >>> 8) & 0xFF;
    block[3] = (~blockSize) & 0xFF;
    block[4] = ((~blockSize) >>> 8) & 0xFF;
    block.set(rawData.slice(offset, offset + blockSize), 5);
    blocks.push(block);
    offset += blockSize;
  }

  const totalBlockSize = blocks.reduce((sum, b) => sum + b.length, 0);
  const deflated = new Uint8Array(2 + totalBlockSize + 4); // zlib header + data + adler32
  deflated[0] = 0x78; // zlib header
  deflated[1] = 0x01; // low compression
  let pos = 2;
  for (const block of blocks) {
    deflated.set(block, pos);
    pos += block.length;
  }
  const adler = adler32(rawData);
  writeU32BE(deflated, pos, adler);

  // Build PNG
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', new Uint8Array(0));

  const png = new Uint8Array(signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length);
  let p = 0;
  png.set(signature, p); p += signature.length;
  png.set(ihdrChunk, p); p += ihdrChunk.length;
  png.set(idatChunk, p); p += idatChunk.length;
  png.set(iendChunk, p);

  return Buffer.from(png);
}

// Generate icons
const icon1x = createMinimalPng(16);
const icon2x = createMinimalPng(32);

fs.writeFileSync(path.join(buildDir, 'trayIconTemplate.png'), icon1x);
fs.writeFileSync(path.join(buildDir, 'trayIconTemplate@2x.png'), icon2x);

console.log('Tray icons generated:');
console.log('  build/trayIconTemplate.png (16x16)');
console.log('  build/trayIconTemplate@2x.png (32x32)');

// Also generate a simple app icon (256x256) for the build
const appIcon = createMinimalPng(256);
fs.writeFileSync(path.join(buildDir, 'icon.png'), appIcon);
console.log('  build/icon.png (256x256)');
