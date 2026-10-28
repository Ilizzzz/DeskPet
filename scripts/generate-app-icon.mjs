import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 应用图标：奶油底 + 橙色虎斑猫头，配色与 public/assets/characters/cat.png（Fluent Emoji）一致。
// 运行时用纯 JS 光栅化，不读取 PNG，也不引入图像依赖。
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

const CREAM = [253, 241, 227, 255];
const FUR = [240, 162, 104, 255];
const STRIPE = [139, 90, 60, 255];
const EAR_INNER = [246, 198, 176, 255];
const MUZZLE = [255, 227, 194, 255];
const EYE = [59, 42, 34, 255];
const NOSE = [226, 121, 94, 255];
const WHITE = [255, 255, 255, 255];

function circle(x, y, cx, cy, radius) {
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function triangle(x, y, ax, ay, bx, by, cx, cy) {
  const first = (x - bx) * (ay - by) - (ax - bx) * (y - by);
  const second = (x - cx) * (by - cy) - (bx - cx) * (y - cy);
  const third = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
  return (first >= 0 && second >= 0 && third >= 0) || (first <= 0 && second <= 0 && third <= 0);
}

/** 圆头胶囊，用于画虎斑短条纹。 */
function capsule(x, y, ax, ay, bx, by, radius) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / lengthSquared));
  return (x - (ax + t * dx)) ** 2 + (y - (ay + t * dy)) ** 2 <= radius * radius;
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
  if (!roundedSquare(x, y, 8, 56)) return [0, 0, 0, 0];
  let color = CREAM;

  // 耳朵：外层橙色，内层浅粉；头部圆形会盖住耳根。
  if (triangle(x, y, 48, 106, 56, 30, 118, 84) || triangle(x, y, 208, 106, 200, 30, 138, 84)) {
    color = FUR;
  }
  if (triangle(x, y, 64, 94, 70, 46, 106, 84) || triangle(x, y, 192, 94, 186, 46, 150, 84)) {
    color = EAR_INNER;
  }

  // 头部
  if (circle(x, y, 128, 130, 82)) color = FUR;

  // 额头虎斑
  if (
    capsule(x, y, 104, 92, 104, 116, 6) ||
    capsule(x, y, 128, 86, 128, 114, 6) ||
    capsule(x, y, 152, 92, 152, 116, 6)
  ) {
    color = STRIPE;
  }

  // 眼睛与高光
  if (circle(x, y, 98, 136, 11) || circle(x, y, 158, 136, 11)) color = EYE;
  if (circle(x, y, 94, 131, 3.4) || circle(x, y, 154, 131, 3.4)) color = WHITE;

  // 鼻子与奶油色嘴部
  if (triangle(x, y, 128, 146, 119, 158, 137, 158)) color = NOSE;
  if (circle(x, y, 111, 168, 14) || circle(x, y, 145, 168, 14)) color = MUZZLE;
  if (triangle(x, y, 128, 152, 120, 160, 136, 160)) color = NOSE;

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
