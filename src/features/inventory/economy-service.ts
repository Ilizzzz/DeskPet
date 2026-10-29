import type { DatabaseSync } from 'node:sqlite';
import { FRAGMENT_TO_COINS_RATE, itemEconomy } from '../../data/catalogs/economy';
import { ITEMS, itemById } from '../../data/catalogs/appearance';
import { ITEM_SLOTS } from '../../shared/types/appearance';

type EquippedRow = Record<(typeof ITEM_SLOTS)[number], string | null>;

/** Version 2 背包经济服务。 */
export class EconomyService {
  constructor(private readonly db: DatabaseSync) {}

  private equippedIds(): Set<string> {
    const row = this.db
      .prepare('SELECT head, neck, face, hand, back FROM appearance WHERE id = 1')
      .get() as unknown as EquippedRow;
    return new Set(ITEM_SLOTS.map((slot) => row[slot]).filter((id): id is string => Boolean(id)));
  }

  purchase(itemId: unknown, now = Date.now()): void {
    if (typeof itemId !== 'string' || !Number.isFinite(now)) throw new Error('无效装扮');
    const item = itemById(itemId);
    const economy = itemEconomy(itemId);
    if (!item || !economy) throw new Error('物品不存在');
    const existing = this.db
      .prepare('SELECT quantity FROM inventory WHERE item_id = ?')
      .get(itemId) as { quantity: number } | undefined;
    if ((existing?.quantity ?? 0) > 0) throw new Error('已经拥有该装扮');
    if (economy.source === 'milestone') {
      const discovered = this.db
        .prepare('SELECT 1 AS found FROM item_discoveries WHERE item_id = ?')
        .get(itemId);
      if (!discovered) throw new Error(`该装扮将在 Lv.${economy.milestoneLevel} 获得`);
    }
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const wallet = this.db.prepare('SELECT balance FROM wallet WHERE id = 1').get() as {
        balance: number;
      };
      if (wallet.balance < economy.price) throw new Error('星星币不足');
      this.db.prepare('UPDATE wallet SET balance = balance - ? WHERE id = 1').run(economy.price);
      this.db
        .prepare(
          'INSERT INTO inventory(item_id, quantity) VALUES (?, 1) ON CONFLICT(item_id) DO UPDATE SET quantity = 1',
        )
        .run(itemId);
      this.db
        .prepare('INSERT OR IGNORE INTO item_discoveries(item_id, first_acquired_at) VALUES (?, ?)')
        .run(itemId, now);
      this.db
        .prepare(
          "INSERT INTO economy_transactions(kind, item_id, amount, created_at) VALUES ('purchase', ?, ?, ?)",
        )
        .run(itemId, -economy.price, now);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  dismantle(itemId: unknown, allowLast: unknown = false, now = Date.now()): void {
    if (typeof itemId !== 'string' || typeof allowLast !== 'boolean' || !Number.isFinite(now))
      throw new Error('无效装扮');
    const item = ITEMS.find((entry) => entry.id === itemId);
    const economy = itemEconomy(itemId);
    if (!item || !economy) throw new Error('物品不存在');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db
        .prepare('SELECT quantity FROM inventory WHERE item_id = ?')
        .get(itemId) as { quantity: number } | undefined;
      if (!row || row.quantity < 1) throw new Error('没有可分解的装扮');
      if (this.equippedIds().has(itemId) && row.quantity <= 1)
        throw new Error('请先卸下要分解的装扮');
      if (row.quantity === 1 && !allowLast) throw new Error('已保护最后一件装扮');
      this.db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE item_id = ?').run(itemId);
      this.db
        .prepare('UPDATE wallet SET balance = balance + ? WHERE id = 1')
        .run(economy.dismantleValue);
      this.db
        .prepare(
          "INSERT INTO economy_transactions(kind, item_id, amount, created_at) VALUES ('dismantle', ?, ?, ?)",
        )
        .run(itemId, economy.dismantleValue, now);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  convertFragments(amount: unknown, now = Date.now()): void {
    if (!Number.isSafeInteger(amount) || (amount as number) < 1 || !Number.isFinite(now))
      throw new Error('无效碎片数量');
    const parsedAmount = amount as number;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const wallet = this.db.prepare('SELECT fragments FROM wallet WHERE id = 1').get() as {
        fragments: number;
      };
      if (wallet.fragments < parsedAmount) throw new Error('星光碎片不足');
      const coins = parsedAmount * FRAGMENT_TO_COINS_RATE;
      if (!Number.isSafeInteger(coins)) throw new Error('碎片数量超出支持范围');
      this.db
        .prepare('UPDATE wallet SET fragments = fragments - ?, balance = balance + ? WHERE id = 1')
        .run(parsedAmount, coins);
      this.db
        .prepare(
          "INSERT INTO economy_transactions(kind, item_id, amount, created_at) VALUES ('fragment_conversion', NULL, ?, ?)",
        )
        .run(coins, now);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  setWishlist(itemId: unknown): void {
    if (itemId !== null && (typeof itemId !== 'string' || !itemById(itemId)))
      throw new Error('无效心愿装扮');
    this.db.prepare('UPDATE item_wishlist SET item_id = ? WHERE id = 1').run(itemId);
  }
}
