import type { Appearance } from '../../shared/types/appearance';
import type { PetState } from '../../shared/types/pet';

export type ItemSlot = 'head' | 'neck';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CharacterDefinition {
  id: Appearance['character'];
  name: string;
  description: string;
  unlockLevel: number;
  asset: string;
  supportedSlots: readonly ItemSlot[];
}

export interface ItemDefinition {
  id: NonNullable<Appearance['head'] | Appearance['neck']>;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  asset: string;
}

export interface SceneDefinition {
  id: Appearance['scene'];
  name: string;
  unlockLevel: number;
  background?: string;
  foreground?: string;
}

export interface ItemAnchor {
  left: number;
  top: number;
  width: number;
  rotate?: number;
}

export const CHARACTERS: readonly CharacterDefinition[] = [
  {
    id: 'cat',
    name: '小猫',
    description: 'DeskPet 的默认伙伴。',
    unlockLevel: 1,
    asset: 'assets/characters/cat.svg',
    supportedSlots: ['head', 'neck'],
  },
  {
    id: 'fox',
    name: '小狐狸',
    description: '达到 10 级后解锁。',
    unlockLevel: 10,
    asset: 'assets/characters/fox.svg',
    supportedSlots: ['head', 'neck'],
  },
] as const;

export const ITEMS: readonly ItemDefinition[] = [
  {
    id: 'hat_blue',
    name: '蓝色小帽',
    slot: 'head',
    rarity: 'common',
    asset: 'assets/items/hat-blue.svg',
  },
  {
    id: 'hat_star',
    name: '星星帽',
    slot: 'head',
    rarity: 'rare',
    asset: 'assets/items/hat-star.svg',
  },
  {
    id: 'scarf',
    name: '红围巾',
    slot: 'neck',
    rarity: 'common',
    asset: 'assets/items/scarf.svg',
  },
] as const;

export const SCENES: readonly SceneDefinition[] = [
  { id: 'transparent', name: '透明桌面', unlockLevel: 1 },
  {
    id: 'forest_home',
    name: '森林小屋',
    unlockLevel: 5,
    background: 'assets/scenes/forest-home-background.svg',
    foreground: 'assets/scenes/forest-home-foreground.svg',
  },
] as const;

const states: readonly PetState[] = [
  'idle',
  'interact',
  'focus',
  'rest',
  'sleep',
  'levelup',
  'dragging',
];

function anchors(head: ItemAnchor, neck: ItemAnchor) {
  return Object.fromEntries(states.map((state) => [state, { head, neck }])) as Record<
    PetState,
    Record<ItemSlot, ItemAnchor>
  >;
}

// 锚点属于角色而非物品，后续新增动作时可独立微调每个状态。
export const ITEM_ANCHORS: Record<
  Appearance['character'],
  Record<PetState, Record<ItemSlot, ItemAnchor>>
> = {
  cat: anchors({ left: 35, top: 4, width: 58 }, { left: 26, top: 98, width: 76 }),
  fox: anchors({ left: 34, top: 3, width: 60, rotate: -2 }, { left: 25, top: 98, width: 78 }),
};

export function appearanceAssets(): string[] {
  return [
    ...CHARACTERS.map((entry) => entry.asset),
    ...ITEMS.map((entry) => entry.asset),
    ...SCENES.flatMap((entry) => [entry.background, entry.foreground].filter(Boolean) as string[]),
  ];
}
