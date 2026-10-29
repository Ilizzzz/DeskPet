// 外观槽位与外观状态。
// 角色、场景和饰品都以字符串 ID 与目录文件解耦，便于持续新增内容。
export const ITEM_SLOTS = ['head', 'neck', 'face', 'hand', 'back'] as const;
export type ItemSlot = (typeof ITEM_SLOTS)[number];

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface EquippedItems {
  head: string | null;
  neck: string | null;
  face: string | null;
  hand: string | null;
  back: string | null;
}

/** 用户对单个伙伴上的单件饰品所做的微调；坐标使用 256×256 角色画布单位。 */
export interface ItemAdjustment {
  characterId: string;
  itemId: string;
  offsetX: number;
  offsetY: number;
  scalePercent: number;
}

export interface Appearance {
  level: number;
  character: string;
  scene: string;
  equipped: EquippedItems;
  inventory: { itemId: string; quantity: number }[];
  unlocks: string[];
  balance: number;
  fragments: number;
  discoveredItemIds: string[];
  wishlistItemId: string | null;
  dropProgress: import('./economy').DropProgress;
  itemAdjustments: ItemAdjustment[];
}

export interface AppearanceChange {
  character?: string;
  scene?: string;
  /** 一次只修改一个槽位，避免多个槽位出现互相矛盾的写入。 */
  equipped?: { slot: ItemSlot; itemId: string | null };
  /** 只允许调整当前伙伴正在佩戴的饰品；默认值会删除对应覆盖配置。 */
  adjustment?: Pick<ItemAdjustment, 'itemId' | 'offsetX' | 'offsetY' | 'scalePercent'>;
}

export const RARITY_LABELS: Readonly<Record<ItemRarity, string>> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export const SLOT_LABELS: Readonly<Record<ItemSlot, string>> = {
  head: '头部',
  neck: '颈部',
  face: '面部',
  hand: '手持',
  back: '背部',
};
