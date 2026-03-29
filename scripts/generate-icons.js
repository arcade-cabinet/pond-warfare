/**
 * Generate PWA placeholder icons for Pond Warfare.
 *
 * Creates simple colored square PNGs at 192x192 and 512x512.
 * Uses Node.js built-in APIs only (no Canvas dependency) by writing raw PNG data.
 *
 * TODO: Replace these placeholders with proper game artwork icons.
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

function createPNG(size) {
  // Background: #0c1a1f, Accent square: teal
  const bg = [0x0c, 0x1a, 0x1f];
  const fg = [0x4a, 0xc6, 0x9a];

  // Build raw pixel data (filter byte + RGB per pixel per row)
  const rawRows = [];
  const boxStart = Math.floor(size * 0.25);
  const boxEnd = Math.floor(size * 0.75);

  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte: None
    for (let x = 0; x < size; x++) {
      const inBox =
        x >= boxStart && x < boxEnd && y >= boxStart && y < boxEnd;
      const color = inBox ? fg : bg;
      row.push(color[0], color[1], color[2]);
    }
    rawRows.push(Buffer.from(row));
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = deflateSync(rawData, { level: 6 });

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(2, 9);        // color type: RGB
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk
  const idat = createChunk('IDAT', compressed);

  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);

  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

for (const size of [192, 512]) {
  const png = createPNG(size);
  const outPath = resolve(publicDir, `icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`wrote ${outPath} (${png.length} bytes)`);
}
