export interface CraftingIngredient {
  itemId: string;
  quantity: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  /** material 用于补充合成材料，outfit 用于合成高级装扮。 */
  category: 'material' | 'outfit';
  ingredients: readonly CraftingIngredient[];
  currencyCost: number;
  fragmentCost: number;
  output: { itemId: string; quantity: number };
}
