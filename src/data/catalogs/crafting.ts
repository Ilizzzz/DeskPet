import type { CraftingIngredient, CraftingRecipe } from '../../shared/types/crafting';
import { itemById } from './appearance';

/** 材料兑换的普通装扮，用于补充高级合成所需的材料。 */
const EXCHANGE_ITEM_IDS = [
  'cap_blue',
  'flower_crown',
  'scarf_red',
  'bell_collar',
  'glasses_round',
  'balloon_red',
  'backpack_school',
] as const;

function itemName(itemId: string): string {
  const item = itemById(itemId);
  if (!item) throw new Error(`未知装扮：${itemId}`);
  return item.name;
}

function exchangeRecipe(itemId: string): CraftingRecipe {
  const name = itemName(itemId);
  return {
    id: `exchange_${itemId}`,
    name: `兑换${name}`,
    description: `用 1 星光碎片和 15 星星币兑换 1 件${name}，用于补充合成材料。`,
    category: 'material',
    ingredients: [],
    currencyCost: 15,
    fragmentCost: 1,
    output: { itemId, quantity: 1 },
  };
}

function outfitRecipe(
  outputItemId: string,
  ingredients: readonly CraftingIngredient[],
  currencyCost: number,
  fragmentCost: number,
): CraftingRecipe {
  const name = itemName(outputItemId);
  const materials = ingredients.map(
    (ingredient) => `${itemName(ingredient.itemId)} ×${ingredient.quantity}`,
  );
  const cost = [
    `${currencyCost} 星星币`,
    ...(fragmentCost > 0 ? [`${fragmentCost} 星光碎片`] : []),
  ];
  return {
    id: `craft_${outputItemId}`,
    name: `合成${name}`,
    description: `消耗${[...materials, ...cost].join('、')}，合成 1 件${name}。`,
    category: 'outfit',
    ingredients,
    currencyCost,
    fragmentCost,
    output: { itemId: outputItemId, quantity: 1 },
  };
}

/**
 * 合成配方：7 条材料兑换 + 14 条高级装扮。
 *
 * 所有配方共享同一套扣料/扣货币/扣碎片逻辑；产出只是背包物品，
 * 已自动解锁的同款装扮会叠加数量（例如 2 件小书包用于合成推进器）。
 */
export const CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  ...EXCHANGE_ITEM_IDS.map((itemId) => exchangeRecipe(itemId)),
  outfitRecipe('hat_top', [{ itemId: 'cap_blue', quantity: 2 }], 25, 0),
  outfitRecipe('hat_woman', [{ itemId: 'flower_crown', quantity: 2 }], 25, 0),
  outfitRecipe('sunglasses_cool', [{ itemId: 'glasses_round', quantity: 2 }], 20, 0),
  outfitRecipe('ribbon_pink', [{ itemId: 'scarf_red', quantity: 2 }], 15, 0),
  outfitRecipe('bell_collar', [{ itemId: 'scarf_red', quantity: 2 }], 10, 0),
  outfitRecipe(
    'tie_necktie',
    [
      { itemId: 'scarf_red', quantity: 1 },
      { itemId: 'ribbon_pink', quantity: 1 },
    ],
    25,
    0,
  ),
  outfitRecipe(
    'bouquet_flower',
    [
      { itemId: 'balloon_red', quantity: 1 },
      { itemId: 'flower_crown', quantity: 1 },
    ],
    20,
    0,
  ),
  outfitRecipe(
    'crown_gold',
    [
      { itemId: 'hat_top', quantity: 2 },
      { itemId: 'hat_woman', quantity: 2 },
    ],
    60,
    2,
  ),
  outfitRecipe(
    'goggles_sky',
    [
      { itemId: 'sunglasses_cool', quantity: 1 },
      { itemId: 'glasses_round', quantity: 1 },
    ],
    35,
    1,
  ),
  outfitRecipe('handbag_fashion', [{ itemId: 'backpack_school', quantity: 1 }], 25, 0),
  outfitRecipe('party_popper', [{ itemId: 'balloon_red', quantity: 2 }], 30, 1),
  outfitRecipe('rocket_jet', [{ itemId: 'backpack_school', quantity: 2 }], 50, 2),
  outfitRecipe('crystal_ball', [{ itemId: 'wand_magic', quantity: 2 }], 40, 3),
  outfitRecipe(
    'wing_angel',
    [
      { itemId: 'backpack_school', quantity: 2 },
      { itemId: 'rocket_jet', quantity: 1 },
    ],
    80,
    4,
  ),
];
