import type { ItemRarity } from '../../shared/types/appearance';
import type { DropPoolEntry, ItemEconomy } from '../../shared/types/economy';
import { ITEMS } from './appearance';

export const KEYBOARD_COUNT_PER_DROP = 1500;
export const FRAGMENT_TO_COINS_RATE = 20;

const PRICE_BY_RARITY: Readonly<Record<ItemRarity, number>> = {
  common: 80,
  rare: 180,
  epic: 450,
  legendary: 1000,
};

const DISMANTLE_BY_RARITY: Readonly<Record<ItemRarity, number>> = {
  common: 10,
  rare: 25,
  epic: 60,
  legendary: 120,
};

export const DROP_POOL: readonly DropPoolEntry[] = [
  { itemId: 'cap_blue', weight: 15 },
  { itemId: 'flower_crown', weight: 12 },
  { itemId: 'scarf_red', weight: 10 },
  { itemId: 'glasses_round', weight: 8 },
  { itemId: 'balloon_red', weight: 6 },
  { itemId: 'backpack_school', weight: 5 },
  { itemId: 'bell_collar', weight: 4 },
  { itemId: 'hat_top', weight: 6 },
  { itemId: 'hat_woman', weight: 6 },
  { itemId: 'headphone_music', weight: 5 },
  { itemId: 'ribbon_pink', weight: 4 },
  { itemId: 'sunglasses_cool', weight: 3 },
  { itemId: 'bouquet_flower', weight: 3 },
  { itemId: 'cap_graduate', weight: 3 },
  { itemId: 'wand_magic', weight: 3 },
  { itemId: 'goggles_sky', weight: 2 },
  { itemId: 'party_popper', weight: 2 },
  { itemId: 'crown_gold', weight: 2 },
  { itemId: 'wing_angel', weight: 1 },
] as const;

const MILESTONES: Readonly<Record<string, number>> = {
  beret_artist: 5,
  collar_starlight: 10,
  monocle_moon: 15,
  lantern_star: 20,
  cape_night: 30,
};

const DROP_ITEM_IDS = new Set(DROP_POOL.map((entry) => entry.itemId));

export const ITEM_ECONOMY: readonly ItemEconomy[] = ITEMS.map((item) => ({
  itemId: item.id,
  rarity: item.rarity,
  price: PRICE_BY_RARITY[item.rarity],
  dismantleValue: DISMANTLE_BY_RARITY[item.rarity],
  source:
    item.id === 'cap_blue'
      ? 'starter'
      : item.id in MILESTONES
        ? 'milestone'
        : DROP_ITEM_IDS.has(item.id)
          ? 'drop'
          : 'shop',
  ...(item.id in MILESTONES ? { milestoneLevel: MILESTONES[item.id] } : {}),
}));

export function itemEconomy(itemId: string): ItemEconomy | undefined {
  return ITEM_ECONOMY.find((entry) => entry.itemId === itemId);
}

export function validateEconomyCatalog(): void {
  const total = DROP_POOL.reduce((sum, entry) => sum + entry.weight, 0);
  if (total !== 100) throw new Error(`掉落概率总和必须为 100，当前为 ${total}`);
  const ids = new Set<string>();
  for (const entry of DROP_POOL) {
    if (!Number.isFinite(entry.weight) || entry.weight <= 0) throw new Error('掉落概率无效');
    if (ids.has(entry.itemId)) throw new Error(`掉落物品重复：${entry.itemId}`);
    ids.add(entry.itemId);
    if (!ITEMS.some((item) => item.id === entry.itemId))
      throw new Error(`掉落物品不存在：${entry.itemId}`);
  }
  for (const item of ITEMS) {
    const economy = itemEconomy(item.id);
    if (!economy || economy.dismantleValue >= economy.price)
      throw new Error(`装扮经济配置无效：${item.id}`);
  }
}

validateEconomyCatalog();
