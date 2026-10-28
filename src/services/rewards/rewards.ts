import type { DatabaseSync } from 'node:sqlite';
import type { RewardSpec } from '../../shared/types/reward';

// 奖励记录与资产发放必须处于同一个事务，确保重试不会重复发奖。
export function grantReward(db: DatabaseSync, reward: RewardSpec): void {
  switch (reward.type) {
    case 'coins':
      assertPositiveInteger(reward.amount, '星星币');
      db.prepare('UPDATE wallet SET balance = balance + ? WHERE id = 1').run(reward.amount);
      return;
    case 'fragments':
      assertPositiveInteger(reward.amount, '星光碎片');
      db.prepare('UPDATE wallet SET fragments = fragments + ? WHERE id = 1').run(reward.amount);
      return;
    case 'item':
      assertPositiveInteger(reward.quantity, '装扮数量');
      db.prepare(
        'INSERT INTO inventory(item_id, quantity) VALUES (?, ?) ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + excluded.quantity',
      ).run(reward.itemId, reward.quantity);
      return;
    case 'character':
    case 'scene':
      db.prepare('INSERT OR IGNORE INTO unlocks(id) VALUES (?)').run(reward.id);
      return;
    default:
      throw new Error('未知奖励类型');
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`无效的${name}数量`);
}

/**
 * 兼容旧版本 level_rewards 表中的字符串奖励。
 *
 * 只有数据库从 2 版升级到 3 版时会用到；新版本统一使用 { type, ... } 结构。
 */
export function grantLevelReward(
  db: DatabaseSync,
  level: number,
  reward: string,
  grantedDate?: string,
): void {
  const inserted = db
    .prepare('INSERT OR IGNORE INTO granted_rewards(level, reward) VALUES (?, ?)')
    .run(level, reward);
  if (inserted.changes === 0) return;
  const legacy: Record<string, RewardSpec> = {
    currency_50: { type: 'coins', amount: 50 },
    hat_blue: { type: 'item', itemId: 'hat_blue', quantity: 1 },
    scarf: { type: 'item', itemId: 'scarf', quantity: 1 },
    forest_home: { type: 'scene', id: 'forest_home' },
    fox: { type: 'character', id: 'fox' },
  };
  const spec = legacy[reward];
  if (!spec) throw new Error('未知等级奖励');
  grantReward(db, spec);
  if (
    grantedDate &&
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'reward_events'").get()
  )
    db.prepare('INSERT OR IGNORE INTO reward_events(level, reward, date) VALUES (?, ?, ?)').run(
      level,
      reward,
      grantedDate,
    );
}
