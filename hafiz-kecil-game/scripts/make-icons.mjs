// Generates PWA PNG icons (Bintang star on blue) without external tools.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const SS = 3; // supersampling
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb, pa] = pixel(((x + (sx + 0.5) / SS) / size) * 120, ((y + (sy + 0.5) / SS) / size) * 120);
          r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = (a / (SS * SS)) * 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// Star polygon scaled toward the centre so it fits the maskable safe zone
const STAR = [[60, 8], [74, 42], [110, 44], [82, 67], [92, 103], [60, 83], [28, 103], [38, 67], [10, 44], [46, 42]]
  .map(([x, y]) => [60 + (x - 60) * 0.72, 62 + (y - 58) * 0.72]);
const inside = (x, y, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const ell = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

const pixel = (x, y) => {
  if (ell(x, y, 53, 60, 3, 3.8) || ell(x, y, 67, 60, 3, 3.8)) return [30, 41, 59, 1];
  // smile: ring segment below centre
  const d = Math.hypot(x - 60, y - 64);
  if (y > 66 && d > 5.5 && d < 8) return [30, 41, 59, 1];
  if (inside(x, y, STAR)) return [251, 191, 36, 1];
  return [59, 130, 246, 1];
};

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true });
for (const s of [192, 512]) writeFileSync(new URL(`../public/icons/icon-${s}.png`, import.meta.url), png(s, pixel));
console.log('icons written');
