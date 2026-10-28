import type { Appearance } from './appearance';

export interface CraftingRecipe {
  id: string;
  name: string;
  ingredients: readonly { itemId: string; quantity: number }[];
  currencyCost: number;
  output: { itemId: NonNullable<Appearance['head'] | Appearance['neck']>; quantity: number };
}
