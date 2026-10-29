import type { ItemAdjustment, ItemSlot } from '../../shared/types/appearance';

// 饰品锚点以角色 256×256 原始画布为坐标，渲染时按显示尺寸等比缩放。
// V2 使用全角色合成预览逐个校准；基础锚点负责角色差异，ITEM_PLACEMENTS 负责单件造型差异。
// 负的 left/top 表示饰品允许超出立绘画布，渲染容器不得裁剪溢出。
export interface ItemAnchor {
  left: number;
  top: number;
  /** 饰品显示宽度（256 画布单位）。 */
  width: number;
  rotate?: number;
  flip?: boolean;
}

export type CharacterAnchors = {
  head: ItemAnchor;
  neck: ItemAnchor;
  face: ItemAnchor;
  hand: ItemAnchor;
  back: ItemAnchor;
};

export const ANCHORS: Readonly<Record<string, CharacterAnchors>> = {
  cat: {
    head: { left: 50, top: -5, width: 105 },
    neck: { left: 78, top: 105, width: 70 },
    face: { left: 50, top: 30, width: 85 },
    hand: { left: 140, top: 130, width: 75 },
    back: { left: 120, top: 80, width: 120 },
  },
  dog: {
    head: { left: 55, top: -5, width: 105 },
    neck: { left: 78, top: 105, width: 70 },
    face: { left: 58, top: 30, width: 85 },
    hand: { left: 140, top: 135, width: 75 },
    back: { left: 120, top: 80, width: 120 },
  },
  rabbit: {
    head: { left: 70, top: 65, width: 85 },
    neck: { left: 78, top: 130, width: 65 },
    face: { left: 65, top: 75, width: 75 },
    hand: { left: 135, top: 150, width: 70 },
    back: { left: 125, top: 95, width: 110 },
  },
  penguin: {
    head: { left: 65, top: -10, width: 115 },
    neck: { left: 82, top: 105, width: 85 },
    face: { left: 65, top: 30, width: 105 },
    hand: { left: 150, top: 145, width: 70 },
    back: { left: 60, top: 75, width: 135 },
  },
  tiger: {
    head: { left: 52, top: -5, width: 100 },
    neck: { left: 76, top: 105, width: 68 },
    face: { left: 52, top: 30, width: 80 },
    hand: { left: 140, top: 135, width: 75 },
    back: { left: 120, top: 80, width: 115 },
  },
  turtle: {
    head: { left: 20, top: 10, width: 100 },
    neck: { left: 60, top: 120, width: 65 },
    face: { left: 30, top: 52, width: 80 },
    hand: { left: 150, top: 145, width: 70 },
    back: { left: 120, top: 80, width: 110 },
  },
  hedgehog: {
    head: { left: 55, top: 30, width: 90 },
    neck: { left: 82, top: 125, width: 65 },
    face: { left: 58, top: 55, width: 75 },
    hand: { left: 145, top: 150, width: 65 },
    back: { left: 125, top: 85, width: 115 },
  },
  chipmunk: {
    head: { left: 45, top: -5, width: 105 },
    neck: { left: 72, top: 105, width: 65 },
    face: { left: 45, top: 30, width: 80 },
    hand: { left: 135, top: 135, width: 70 },
    back: { left: 125, top: 80, width: 115 },
  },
};

interface ItemPlacement {
  scale?: number;
  /** 相对基础锚点宽度的偏移。 */
  x?: number;
  y?: number;
}

const ITEM_PLACEMENTS: Readonly<Record<string, ItemPlacement>> = {
  flower_crown: { scale: 0.9, y: 0.16 },
  headphone_music: { scale: 1.05, y: 0.12 },
  crown_gold: { scale: 0.82, y: 0.2 },
  cap_graduate: { scale: 1.05, y: -0.04 },
  scarf_red: { scale: 1.25, y: -0.08 },
  bell_collar: { scale: 0.82, y: 0.08 },
  ribbon_pink: { scale: 0.9, y: 0.04 },
  tie_necktie: { scale: 0.86, y: 0.1 },
  ribbon_reminder: { scale: 0.9, y: 0.04 },
  collar_starlight: { scale: 0.85 },
  goggles_sky: { scale: 1.08 },
  monocle_moon: { scale: 0.66, x: 0.22 },
  balloon_red: { scale: 0.92, y: -0.1 },
  wand_magic: { scale: 0.82 },
  crystal_ball: { scale: 0.9 },
  lantern_star: { scale: 0.9 },
  handbag_fashion: { scale: 0.88 },
  umbrella_closed: { scale: 0.84, x: 0.1 },
  rocket_jet: { scale: 1.08 },
  wing_angel: { scale: 1.45, x: -0.2, y: -0.12 },
  cape_night: { scale: 1.15, x: -0.16, y: 0.08 },
};

export function anchorsFor(characterId: string): CharacterAnchors {
  return ANCHORS[characterId] ?? ANCHORS.cat;
}

/** 组合角色基础锚点与单件装扮微调，桌宠和控制中心预览共用。 */
export function resolvedAnchor(
  characterId: string,
  slot: ItemSlot,
  itemId: string,
  adjustment?: ItemAdjustment,
): ItemAnchor {
  const base = anchorsFor(characterId)[slot];
  const placement = ITEM_PLACEMENTS[itemId];
  const placedWidth = base.width * (placement?.scale ?? 1);
  const placementCenterOffset = (base.width - placedWidth) / 2;
  const placed: ItemAnchor = {
    ...base,
    left: base.left + placementCenterOffset + base.width * (placement?.x ?? 0),
    top: base.top + placementCenterOffset + base.width * (placement?.y ?? 0),
    width: placedWidth,
  };
  if (!adjustment || adjustment.characterId !== characterId || adjustment.itemId !== itemId)
    return placed;
  const width = placed.width * (adjustment.scalePercent / 100);
  const adjustmentCenterOffset = (placed.width - width) / 2;
  return {
    ...placed,
    left: placed.left + adjustment.offsetX + adjustmentCenterOffset,
    top: placed.top + adjustment.offsetY + adjustmentCenterOffset,
    width,
  };
}
