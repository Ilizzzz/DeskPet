import type { DatabaseSync } from 'node:sqlite';
import type { ItemRarity } from '../../shared/types/appearance';
import { CRAFTING_RECIPES } from '../../data/catalogs/crafting';
import { ITEMS, itemById } from '../../data/catalogs/appearance';
import { grantReward } from '../../services/rewards/rewards';

/** 分解固定给 10 星星币，稀有及以上按稀有度追加星光碎片。 */
const COINS_PER_DISMANTLE = 10;
const FRAGMENTS_BY_RARITY: Readonly<Record<ItemRarity, number>> = {
  common: 0,
  rare: 1,
  epic: 1,
  legendary: 2,
};

const EQUIPPED_COLUMNS = ['head', 'neck', 'face', 'hand', 'back'] as const;

interface EquippedRow {
  head: string | null;
  neck: string | null;
  face: string | null;
  hand: string | null;
  back: string | null;
}

export class CraftingService {
  constructor(private readonly db: DatabaseSync) {}

  private equippedIds(): Set<string> {
    const row = this.db
      .prepare('SELECT head, neck, face, hand, back FROM appearance WHERE id = 1')
      .get() as unknown as EquippedRow;
    return new Set(
      EQUIPPED_COLUMNS.map((column) => row[column]).filter(
        (itemId): itemId is string => typeof itemId === 'string',
      ),
    );
  }

  /** 合成：扣材料、星星币、碎片并发放产物，任一步失败都整体回滚。 */
  craft(recipeId: unknown, now = Date.now()): void {
    if (typeof recipeId !== 'string') throw new Error('无效合成配方');
    const recipe = CRAFTING_RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe) throw new Error('合成配方不存在');
    // 产物也必须达到解锁等级，避免低等级通过合成提前拿到高级装扮。
    const output = itemById(recipe.output.itemId);
    if (!output) throw new Error('合成产物不存在');
    const growth = this.db.prepare('SELECT level FROM growth_state WHERE id = 1').get() as {
      level: number;
    };
    if (growth.level < output.unlockLevel)
      throw new Error(`该装扮尚未解锁（需要 ${output.unlockLevel} 级）`);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const wallet = this.db
        .prepare('SELECT balance, fragments FROM wallet WHERE id = 1')
        .get() as {
        balance: number;
        fragments: number;
      };
      if (wallet.balance < recipe.currencyCost) throw new Error('星星币不足');
      if (wallet.fragments < recipe.fragmentCost) throw new Error('星光碎片不足');
      const equipped = this.equippedIds();
      for (const ingredient of recipe.ingredients) {
        const row = this.db
          .prepare('SELECT quantity FROM inventory WHERE item_id = ?')
          .get(ingredient.itemId) as { quantity: number } | undefined;
        if (!row || row.quantity < ingredient.quantity) throw new Error('合成材料不足');
        // 已穿戴的物品至少保留 1 件，避免合成后外观引用不存在的背包物品。
        if (equipped.has(ingredient.itemId) && row.quantity - ingredient.quantity < 1)
          throw new Error('请先卸下要消耗的物品');
      }
      for (const ingredient of recipe.ingredients)
        this.db
          .prepare('UPDATE inventory SET quantity = quantity - ? WHERE item_id = ?')
          .run(ingredient.quantity, ingredient.itemId);
      if (recipe.currencyCost > 0)
        this.db
          .prepare('UPDATE wallet SET balance = balance - ? WHERE id = 1')
          .run(recipe.currencyCost);
      if (recipe.fragmentCost > 0)
        this.db
          .prepare('UPDATE wallet SET fragments = fragments - ? WHERE id = 1')
          .run(recipe.fragmentCost);
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

  /** 分解：每次只处理 1 件未穿戴装扮，返还星星币并按稀有度追加碎片。 */
  dismantle(itemId: unknown, now = Date.now()): void {
    if (typeof itemId !== 'string') throw new Error('无效装扮');
    if (!Number.isFinite(now)) throw new Error('无效时间');
    const item = ITEMS.find((entry) => entry.id === itemId);
    if (!item) throw new Error('物品不存在');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.equippedIds().has(itemId)) throw new Error('不能分解已穿戴的装扮');
      const row = this.db
        .prepare('SELECT quantity FROM inventory WHERE item_id = ?')
        .get(itemId) as { quantity: number } | undefined;
      if (!row || row.quantity < 1) throw new Error('没有可分解的装扮');
      this.db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE item_id = ?').run(itemId);
      grantReward(this.db, { type: 'coins', amount: COINS_PER_DISMANTLE });
      const fragments = FRAGMENTS_BY_RARITY[item.rarity];
      if (fragments > 0) grantReward(this.db, { type: 'fragments', amount: fragments });
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
