#!/usr/bin/env node
/**
 * Validate the art assets referenced by the catalog data.
 *
 * Checks every `assets/...png` path in src/data/catalogs/*.ts:
 * - file exists under public/
 * - real PNG signature + IHDR
 * - 256x256, 8-bit, non-interlaced, with a real alpha channel
 * - not an empty/fully transparent image (alpha bounding box)
 * - registered in public/assets/licenses/sources.json and docs/ASSET_GUIDE.md
 *
 * Exits non-zero when any check fails. No third-party dependencies.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CATALOG_DIR = join(ROOT, 'src', 'data', 'catalogs');
const PUBLIC_DIR = join(ROOT, 'public');
const GUIDE_PATH = join(ROOT, 'docs', 'ASSET_GUIDE.md');
const SOURCES_PATH = join(ROOT, 'public', 'assets', 'licenses', 'sources.json');
const LICENSE_PATH = join(ROOT, 'public', 'assets', 'licenses', 'fluent-emoji-LICENSE.txt');
const EXPECTED_SIZE = 256;
const REQUIRED_LICENSE_MARKER = 'MIT License';
const SNAKE_CASE = /^[a-z][a-z0-9_]*\.png$/;
const REFERENCE_PATTERN = /['"`](assets\/[^'"`\s]+\.png)['"`]/g;

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readText(path) {
  return readFileSync(path, 'utf8');
}

/** Collect `assets/...png` references from the catalog sources. */
function collectReferences() {
  const files = readdirSync(CATALOG_DIR)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .sort();
  const references = new Map();
  for (const file of files) {
    const fullPath = join(CATALOG_DIR, file);
    const source = readText(fullPath);
    let match;
    while ((match = REFERENCE_PATTERN.exec(source)) !== null) {
      const asset = match[1];
      if (!references.has(asset)) references.set(asset, []);
      references.get(asset).push(file);
    }
  }
  return { files, references };
}

/** Parse PNG chunks, returning IHDR plus raw IDAT payload. */
function parsePng(buffer, asset) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length < 8 || signature.some((byte, index) => buffer[index] !== byte)) {
    throw new Error(`${asset}: missing PNG signature`);
  }
  let offset = 8;
  let header;
  const idat = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    if (length < 0 || offset + 12 + length > buffer.length) {
      throw new Error(`${asset}: truncated PNG chunk "${type}"`);
    }
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      if (length !== 13) throw new Error(`${asset}: malformed IHDR`);
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === 'IDAT') {
      idat.push(Buffer.from(data));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (!header) throw new Error(`${asset}: missing IHDR`);
  if (idat.length === 0) throw new Error(`${asset}: missing IDAT (empty image)`);
  return { header, idat: Buffer.concat(idat) };
}

/** Undo PNG scanline filters and return the alpha channel. */
function extractAlpha(idat, width, height, channels) {
  const raw = inflateSync(idat);
  const stride = width * channels;
  const expected = height * (stride + 1);
  if (raw.length !== expected) {
    throw new Error(`unexpected IDAT size ${raw.length}, expected ${expected}`);
  }
  const alpha = Buffer.alloc(width * height);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? line[index - channels] : 0;
      const up = previous[index];
      const upLeft = index >= channels ? previous[index - channels] : 0;
      switch (filter) {
        case 0:
          break;
        case 1:
          line[index] = (line[index] + left) & 0xff;
          break;
        case 2:
          line[index] = (line[index] + up) & 0xff;
          break;
        case 3:
          line[index] = (line[index] + ((left + up) >> 1)) & 0xff;
          break;
        case 4: {
          const estimate = left + up - upLeft;
          const distanceLeft = Math.abs(estimate - left);
          const distanceUp = Math.abs(estimate - up);
          const distanceUpLeft = Math.abs(estimate - upLeft);
          const predictor =
            distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft
              ? left
              : distanceUp <= distanceUpLeft
                ? up
                : upLeft;
          line[index] = (line[index] + predictor) & 0xff;
          break;
        }
        default:
          throw new Error(`unsupported PNG filter type ${filter}`);
      }
    }
    for (let x = 0; x < width; x += 1) {
      alpha[y * width + x] = line[x * channels + channels - 1];
    }
    previous = line;
  }
  return alpha;
}

function alphaStats(alpha) {
  let min = 255;
  let max = 0;
  for (const value of alpha) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function validatePng(asset) {
  const fullPath = join(PUBLIC_DIR, asset);
  let stats;
  try {
    stats = statSync(fullPath);
  } catch {
    fail(`${asset}: file missing at public/${asset}`);
    return;
  }
  if (stats.size === 0) {
    fail(`${asset}: file is empty`);
    return;
  }
  let parsed;
  try {
    parsed = parsePng(readFileSync(fullPath), asset);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
    return;
  }
  const { header, idat } = parsed;
  if (header.width !== EXPECTED_SIZE || header.height !== EXPECTED_SIZE) {
    fail(
      `${asset}: expected ${EXPECTED_SIZE}x${EXPECTED_SIZE}, got ${header.width}x${header.height}`,
    );
  }
  if (header.bitDepth !== 8) fail(`${asset}: expected 8-bit channels, got ${header.bitDepth}`);
  if (header.interlace !== 0) fail(`${asset}: interlaced PNG is not supported by the renderer`);
  const channelsByColorType = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = channelsByColorType[header.colorType];
  if (!channels) {
    fail(`${asset}: unsupported PNG color type ${header.colorType} (no alpha channel)`);
    return;
  }
  if (header.colorType === 0 || header.colorType === 2) {
    fail(`${asset}: missing alpha channel (color type ${header.colorType})`);
    return;
  }
  try {
    const alpha = extractAlpha(idat, header.width, header.height, channels);
    const { min, max } = alphaStats(alpha);
    if (max === 0) fail(`${asset}: image is fully transparent (empty artwork)`);
    else if (min === 255) warn(`${asset}: no transparent pixels (opaque rectangle may not blend)`);
  } catch (error) {
    fail(`${asset}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function loadRegistry() {
  try {
    const parsed = JSON.parse(readText(SOURCES_PATH));
    const paths = new Set((parsed.assets ?? []).map((entry) => entry.local_path));
    if (paths.size === 0) fail('sources.json: no assets registered');
    return paths;
  } catch (error) {
    fail(`sources.json: cannot read ${relative(ROOT, SOURCES_PATH)} (${error.message})`);
    return new Set();
  }
}

function validateLicense() {
  try {
    const text = readText(LICENSE_PATH);
    if (!text.includes(REQUIRED_LICENSE_MARKER)) {
      fail(
        `license: ${relative(ROOT, LICENSE_PATH)} does not contain "${REQUIRED_LICENSE_MARKER}"`,
      );
    }
  } catch {
    fail(`license: missing ${relative(ROOT, LICENSE_PATH)}`);
  }
}

function validateGuide(references, guideText) {
  for (const asset of references.keys()) {
    const localPath = `public/${asset}`;
    if (!guideText.includes(localPath)) {
      fail(`${asset}: not registered in docs/ASSET_GUIDE.md (expected "${localPath}")`);
    }
  }
}

/** Legacy hand-drawn SVGs were replaced by TASK-011; make sure they stay deleted. */
function validateNoLegacySvg() {
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const fullPath = join(dir, name);
      if (statSync(fullPath).isDirectory()) walk(fullPath);
      else if (name.toLowerCase().endsWith('.svg')) {
        fail(
          `legacy SVG should be removed: public/${relative(PUBLIC_DIR, fullPath).replaceAll('\\', '/')}`,
        );
      }
    }
  };
  try {
    walk(join(PUBLIC_DIR, 'assets'));
  } catch {
    // assets directory missing is reported by the reference checks.
  }
}

function main() {
  const { files, references } = collectReferences();
  console.log(`[validate-assets] scanned ${files.length} catalog files`);
  console.log(`[validate-assets] found ${references.size} unique asset references`);

  if (references.size === 0) fail('no asset references found in src/data/catalogs/*.ts');

  for (const asset of references.keys()) {
    validatePng(asset);
  }

  const registry = loadRegistry();
  for (const asset of references.keys()) {
    if (registry.size > 0 && !registry.has(`public/${asset}`)) {
      fail(`${asset}: not registered in public/assets/licenses/sources.json`);
    }
  }

  let guideText = '';
  try {
    guideText = readText(GUIDE_PATH);
  } catch {
    fail('missing docs/ASSET_GUIDE.md');
  }
  if (guideText) validateGuide(references, guideText);

  validateLicense();
  validateNoLegacySvg();

  for (const file of files) {
    const source = readText(join(CATALOG_DIR, file));
    let match;
    while ((match = REFERENCE_PATTERN.exec(source)) !== null) {
      if (!SNAKE_CASE.test(match[1].split('/').pop() ?? '')) {
        warn(`${match[1]}: filename should be snake_case (${file})`);
      }
    }
  }

  // Unreferenced assets are allowed (reserved for future scenes), but worth surfacing.
  const referenced = new Set([...references.keys()].map((asset) => `public/${asset}`));
  const assetsRoot = join(PUBLIC_DIR, 'assets');
  const registeredButUnused = [...registry].filter((path) => !referenced.has(path));
  if (registeredButUnused.length > 0) {
    console.log(
      `[validate-assets] ${registeredButUnused.length} registered asset(s) not referenced by catalogs: ` +
        registeredButUnused.map((path) => path.replace('public/assets/', '')).join(', '),
    );
  }

  for (const message of warnings) console.warn(`[validate-assets] WARN ${message}`);
  if (errors.length > 0) {
    console.error(`[validate-assets] FAILED with ${errors.length} error(s):`);
    for (const message of errors) console.error(`[validate-assets] ERROR ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[validate-assets] OK: ${references.size} assets exist, are 256x256 RGBA PNG with content, ` +
      `and are registered (${relative(ROOT, GUIDE_PATH)}, ${relative(ROOT, SOURCES_PATH)})`,
  );
  void assetsRoot;
}

main();
