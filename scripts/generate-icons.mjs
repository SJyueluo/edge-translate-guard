import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const SIZES = [16, 32, 48, 128];
const COLORS = {
  background: [17, 37, 64, 255],
  paper: [248, 251, 255, 255],
  line: [128, 157, 190, 255],
  shield: [37, 190, 174, 255],
  check: [255, 255, 255, 255],
};

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const body = Buffer.concat([name, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function rasterize(size) {
  const supersample = 3;
  const width = size * supersample;
  const scale = width / 300;
  const pixels = new Uint8Array(width * width * 4);

  function setPixel(x, y, color) {
    const offset = (y * width + x) * 4;
    pixels.set(color, offset);
  }

  function fillRoundedRect(x, y, w, h, radius, color) {
    const left = x * scale;
    const top = y * scale;
    const right = (x + w) * scale;
    const bottom = (y + h) * scale;
    const r = radius * scale;
    const minX = Math.max(0, Math.floor(left));
    const maxX = Math.min(width, Math.ceil(right));
    const minY = Math.max(0, Math.floor(top));
    const maxY = Math.min(width, Math.ceil(bottom));
    for (let py = minY; py < maxY; py++) {
      for (let px = minX; px < maxX; px++) {
        const cx = px + 0.5 < left + r ? left + r : px + 0.5 > right - r ? right - r : px + 0.5;
        const cy = py + 0.5 < top + r ? top + r : py + 0.5 > bottom - r ? bottom - r : py + 0.5;
        const dx = px + 0.5 - cx;
        const dy = py + 0.5 - cy;
        if (dx * dx + dy * dy <= r * r) setPixel(px, py, color);
      }
    }
  }

  function fillPolygon(points, color) {
    const scaled = points.map(([x, y]) => [x * scale, y * scale]);
    const minX = Math.max(0, Math.floor(Math.min(...scaled.map(([x]) => x))));
    const maxX = Math.min(width, Math.ceil(Math.max(...scaled.map(([x]) => x))));
    const minY = Math.max(0, Math.floor(Math.min(...scaled.map(([, y]) => y))));
    const maxY = Math.min(width, Math.ceil(Math.max(...scaled.map(([, y]) => y))));
    for (let py = minY; py < maxY; py++) {
      for (let px = minX; px < maxX; px++) {
        if (pointInPolygon(px + 0.5, py + 0.5, scaled)) setPixel(px, py, color);
      }
    }
  }

  function strokeSegment(x1, y1, x2, y2, thickness, color) {
    const ax = x1 * scale;
    const ay = y1 * scale;
    const bx = x2 * scale;
    const by = y2 * scale;
    const radius = (thickness * scale) / 2;
    const minX = Math.max(0, Math.floor(Math.min(ax, bx) - radius));
    const maxX = Math.min(width, Math.ceil(Math.max(ax, bx) + radius));
    const minY = Math.max(0, Math.floor(Math.min(ay, by) - radius));
    const maxY = Math.min(width, Math.ceil(Math.max(ay, by) + radius));
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    for (let py = minY; py < maxY; py++) {
      for (let px = minX; px < maxX; px++) {
        const t = Math.max(0, Math.min(1, ((px + 0.5 - ax) * dx + (py + 0.5 - ay) * dy) / lengthSquared));
        const nearestX = ax + t * dx;
        const nearestY = ay + t * dy;
        const ex = px + 0.5 - nearestX;
        const ey = py + 0.5 - nearestY;
        if (ex * ex + ey * ey <= radius * radius) setPixel(px, py, color);
      }
    }
  }

  fillRoundedRect(12, 12, 276, 276, 52, COLORS.background);
  fillRoundedRect(61, 43, 174, 211, 21, COLORS.paper);
  fillRoundedRect(91, 91, 105, 11, 5, COLORS.line);
  fillRoundedRect(91, 123, 105, 11, 5, COLORS.line);
  fillRoundedRect(91, 155, 72, 11, 5, COLORS.line);
  fillPolygon([[163, 145], [251, 145], [251, 197], [207, 246], [163, 197]], COLORS.shield);
  strokeSegment(185, 193, 202, 210, 10, COLORS.check);
  strokeSegment(202, 210, 231, 178, 10, COLORS.check);

  const output = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const total = [0, 0, 0, 0];
      for (let oy = 0; oy < supersample; oy++) {
        for (let ox = 0; ox < supersample; ox++) {
          const source = ((y * supersample + oy) * width + x * supersample + ox) * 4;
          for (let channel = 0; channel < 4; channel++) total[channel] += pixels[source + channel];
        }
      }
      const target = (y * size + x) * 4;
      for (let channel = 0; channel < 4; channel++) output[target + channel] = Math.round(total[channel] / 9);
    }
  }
  return output;
}

function encodePng(size, rgba) {
  rgba = Buffer.from(rgba);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    rows[row] = 0;
    rgba.copy(rows, row + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(rows)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir('icons', { recursive: true });
for (const size of SIZES) {
  const image = encodePng(size, rasterize(size));
  await writeFile(`icons/icon${size}.png`, image);
}
