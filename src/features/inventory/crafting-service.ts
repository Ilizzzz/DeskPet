import type { DatabaseSync } from 'node:sqlite';
import { CRAFTING_RECIPES } from '../../data/catalogs/crafting';

export class CraftingService {
  constructor(private readonly db: DatabaseSync) {}

  craft(recipeId: unknown, now = Date.now()): void {
    if (typeof recipeId !== 'string') throw new Error('无效合成配方');
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe) throw new Error('合成配方不存在');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const wallet = this.db.prepare('SELECT balance FROM wallet WHERE id = 1').get() as {
        balance: number;
      };
      if (wallet.balance < recipe.currencyCost) throw new Error('星星币不足');
      const appearance = this.db
        .prepare('SELECT head, neck FROM appearance WHERE id = 1')
        .get() as { head: string | null; neck: string | null };
      for (const ingredient of recipe.ingredients) {
        const inventory = this.db
          .prepare('SELECT quantity FROM inventory WHERE item_id = ?')
          .get(ingredient.itemId) as { quantity: number } | undefined;
        if (!inventory || inventory.quantity < ingredient.quantity) throw new Error('合成材料不足');
        if (
          inventory.quantity === ingredient.quantity &&
          (appearance.head === ingredient.itemId || appearance.neck === ingredient.itemId)
        )
          throw new Error('请先卸下要消耗的物品');
      }
      for (const ingredient of recipe.ingredients)
        this.db
          .prepare('UPDATE inventory SET quantity = quantity - ? WHERE item_id = ?')
          .run(ingredient.quantity, ingredient.itemId);
      this.db
        .prepare('UPDATE wallet SET balance = balance - ? WHERE id = 1')
        .run(recipe.currencyCost);
      this.db
        .prepare(
          'INSERT INTO inventory(item_id, quantity) VALUES (?, ?) ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity',
        )
        .run(recipe.output.itemId, recipe.output.quantity);
      this.db
        .prepare(
          'INSERT INTO crafting_transactions(recipe_id, spent_currency, created_at) VALUES (?, ?, ?)',
        )
        .run(recipe.id, recipe.currencyCost, now);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
