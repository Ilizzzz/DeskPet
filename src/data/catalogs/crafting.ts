import type { CraftingRecipe } from '../../shared/types/crafting';

export const CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  {
    id: 'upgrade_hat_star',
    name: '制作星星帽',
    ingredients: [{ itemId: 'hat_blue', quantity: 1 }],
    currencyCost: 20,
    output: { itemId: 'hat_star', quantity: 1 },
  },
] as const;
