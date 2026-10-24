import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPngBuffer(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // CRC32 계산기
  function crc32(buf: Buffer): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit
  ihdrData.writeUInt8(2, 9); // Color type 2: RGB
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw Image Data (Filter byte 0 + RGB pixels)
  // Indigo-purple theme: #120c38 / #38bdf8
  const rawRows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // Filter 0
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 3;
      // 중앙 칼림바 건반 형상 그라데이션
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (dist < width * 0.35) {
        // 중앙: 따뜻한 앰버-우드 & 시안
        row[idx] = 0x38;     // R
        row[idx + 1] = 0xbd; // G
        row[idx + 2] = 0xf8; // B
      } else {
        // 배경: 딥 인디고 스페이스
        row[idx] = 0x12;     // R
        row[idx + 1] = 0x0c; // G
        row[idx + 2] = 0x38; // B
      }
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 192x192
const buf192 = createPngBuffer(192, 192);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), buf192);

// 512x512
const buf512 = createPngBuffer(512, 512);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), buf512);

// Apple touch icon
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), buf192);

console.log('✅ PWA PNG 아이콘 생성 완료: icon-192.png, icon-512.png, apple-touch-icon.png');
