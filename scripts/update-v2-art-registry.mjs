#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const registryPath = join(root, 'public', 'assets', 'licenses', 'sources.json');
const characterIds = ['cat', 'chipmunk', 'dog', 'hedgehog', 'penguin', 'rabbit', 'tiger', 'turtle'];
const userProvidedCharacters = ['math_master'];
const itemIds = [
  'backpack_school',
  'balloon_red',
  'bell_collar',
  'beret_artist',
  'bouquet_flower',
  'cap_blue',
  'cap_graduate',
  'cape_night',
  'collar_starlight',
  'crown_gold',
  'crystal_ball',
  'flower_crown',
  'glasses_round',
  'goggles_sky',
  'handbag_fashion',
  'hat_top',
  'hat_woman',
  'headphone_music',
  'lantern_star',
  'monocle_moon',
  'party_popper',
  'ribbon_pink',
  'ribbon_reminder',
  'rocket_jet',
  'scarf_red',
  'sunglasses_cool',
  'tie_necktie',
  'umbrella_closed',
  'wand_magic',
  'wing_angel',
];

const targets = [
  ...characterIds.map((id) => ({
    id,
    category: 'character',
    path: `characters/${id}.png`,
    origin: 'generated',
  })),
  ...userProvidedCharacters.map((id) => ({
    id,
    category: 'character',
    path: `characters/${id}.png`,
    origin: 'user-provided',
  })),
  ...itemIds.map((id) => ({
    id,
    category: 'outfit',
    path: `items/${id}.png`,
    origin: 'generated',
  })),
];
const localPaths = new Set(targets.map((target) => `public/assets/${target.path}`));
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const untouched = registry.assets.filter(
  (asset) =>
    !localPaths.has(asset.local_path) && existsSync(join(root, ...asset.local_path.split('/'))),
);
const updatedAssets = targets.map((target) => {
  const localPath = `public/assets/${target.path}`;
  const fullPath = join(root, ...localPath.split('/'));
  const buffer = readFileSync(fullPath);
  const userProvided = target.origin === 'user-provided';
  return {
    asset_id: target.id,
    category: target.category,
    emoji_name: null,
    local_path: localPath,
    source_url: null,
    author: userProvided ? 'DeskPet user' : 'DeskPet contributors using OpenAI ImageGen',
    license: userProvided
      ? 'User-provided asset authorized for use in DeskPet'
      : 'Project-generated asset; see docs/design/ART_GENERATION.md',
    download_date: '2026-10-29',
    modifications: userProvided
      ? 'Original portrait proportionally fitted onto a 256x256 RGBA canvas without cropping or generative edits'
      : target.category === 'character'
        ? 'Generated on a transparent canvas and resized to a 256x256 RGBA PNG'
        : 'Generated as a transparent sprite sheet, split by grid, proportionally fitted and exported as a 256x256 RGBA PNG',
    attribution: userProvided
      ? 'Original portrait provided by the DeskPet user'
      : 'Generated specifically for DeskPet Version 2 with OpenAI ImageGen',
    generation_prompt_group: userProvided
      ? null
      : target.category === 'character'
        ? 'v2-anime-character'
        : 'v2-anime-outfit',
    sha256: createHash('sha256').update(buffer).digest('hex'),
    bytes: statSync(fullPath).size,
    scene_backdrop_for: null,
  };
});

const next = {
  ...registry,
  source:
    'Mixed sources: Microsoft Fluent Emoji, project-generated Version 2 art, and a user-provided portrait',
  repository: 'https://github.com/microsoft/fluentui-emoji',
  license: 'Per-asset metadata; Fluent Emoji assets remain MIT licensed',
  author: 'Microsoft Corporation, DeskPet contributors, and the DeskPet user',
  download_date: '2026-10-29',
  attribution: 'See each asset entry and docs/design/ASSET_GUIDE.md',
  assets: [...untouched, ...updatedAssets].sort((left, right) =>
    left.local_path.localeCompare(right.local_path),
  ),
};

writeFileSync(registryPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`Updated ${updatedAssets.length} Version 2 art records in ${registryPath}`);
