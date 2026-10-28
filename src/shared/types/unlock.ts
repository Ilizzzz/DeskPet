import type { ItemRarity, ItemSlot } from './appearance';

export type UnlockCategory = 'character' | 'scene' | 'item' | 'tool';

export interface UnlockEntry {
  /** 与角色、场景、物品或工具 ID 一致，保证解锁状态可跨模块比对。 */
  id: string;
  category: UnlockCategory;
  name: string;
  description: string;
  level: number;
  icon: string;
  slot?: ItemSlot;
  rarity?: ItemRarity;
}

export interface UnlockState extends UnlockEntry {
  unlocked: boolean;
}

export const UNLOCK_CATEGORY_LABELS: Readonly<Record<UnlockCategory, string>> = {
  character: '伙伴',
  scene: '场景',
  item: '装扮',
  tool: '工具',
};
