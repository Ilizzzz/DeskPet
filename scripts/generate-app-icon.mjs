import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const size = 256;
const pixelBytes = size * size * 4;
const maskRowBytes = Math.ceil(size / 32) * 4;
const maskBytes = maskRowBytes * size;
const dib = Buffer.alloc(40 + pixelBytes + maskBytes);

dib.writeUInt32LE(40, 0);
dib.writeInt32LE(size, 4);
dib.writeInt32LE(size * 2, 8);
dib.writeUInt16LE(1, 12);
dib.writeUInt16LE(32, 14);
dib.writeUInt32LE(pixelBytes, 20);

function circle(x, y, cx, cy, radius) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function triangle(x, y, ax, ay, bx, by, cx, cy) {
  const first = (x - bx) * (ay - by) - (ax - bx) * (y - by);
  const second = (x - cx) * (by - cy) - (bx - cx) * (y - cy);
  const third = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
  return (first >= 0 && second >= 0 && third >= 0) || (first <= 0 && second <= 0 && third <= 0);
}

function roundedSquare(x, y, inset, radius) {
  if (x < inset || y < inset || x >= size - inset || y >= size - inset) return false;
  const left = inset + radius;
  const right = size - inset - radius - 1;
  const top = inset + radius;
  const bottom = size - inset - radius - 1;
  if (x >= left && x <= right) return true;
  if (y >= top && y <= bottom) return true;
  const cx = x < left ? left : right;
  const cy = y < top ? top : bottom;
  return circle(x, y, cx, cy, radius);
}

function colorAt(x, y) {
  if (!roundedSquare(x, y, 8, 52)) return [0, 0, 0, 0];
  let color = [224, 125, 94, 255];
  if (triangle(x, y, 48, 112, 54, 45, 112, 88)) color = [239, 167, 125, 255];
  if (triangle(x, y, 208, 112, 202, 45, 144, 88)) color = [239, 167, 125, 255];
  if (circle(x, y, 128, 139, 82)) color = [248, 194, 153, 255];
  if (circle(x, y, 95, 132, 9) || circle(x, y, 161, 132, 9)) color = [77, 57, 49, 255];
  if (triangle(x, y, 128, 146, 120, 157, 136, 157)) color = [117, 73, 63, 255];
  if ((circle(x, y, 115, 165, 15) || circle(x, y, 141, 165, 15)) && y > 161)
    color = [117, 73, 63, 255];
  if (circle(x, y, 115, 160, 11) || circle(x, y, 141, 160, 11)) color = [248, 194, 153, 255];
  return color;
}

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const [red, green, blue, alpha] = colorAt(x, size - y - 1);
    const offset = 40 + (y * size + x) * 4;
    dib[offset] = blue;
    dib[offset + 1] = green;
    dib[offset + 2] = red;
    dib[offset + 3] = alpha;
  }
}

const icon = Buffer.alloc(22 + dib.length);
icon.writeUInt16LE(0, 0);
icon.writeUInt16LE(1, 2);
icon.writeUInt16LE(1, 4);
icon[6] = 0;
icon[7] = 0;
icon[8] = 0;
icon[9] = 0;
icon.writeUInt16LE(1, 10);
icon.writeUInt16LE(32, 12);
icon.writeUInt32LE(dib.length, 14);
icon.writeUInt32LE(22, 18);
dib.copy(icon, 22);

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'build', 'icon.ico');
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, icon);
