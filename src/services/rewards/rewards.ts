import type { DatabaseSync } from 'node:sqlite';

// 奖励记录与资产发放必须处于同一个事务，确保重试不会重复发奖。
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
  if (reward === 'currency_50') {
    db.prepare('UPDATE wallet SET balance = balance + 50 WHERE id = 1').run();
  } else if (reward === 'hat_blue' || reward === 'scarf') {
    db.prepare(
      'INSERT INTO inventory(item_id, quantity) VALUES (?, 1) ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1',
    ).run(reward);
  } else if (reward === 'forest_home' || reward === 'fox') {
    db.prepare('INSERT OR IGNORE INTO unlocks(id) VALUES (?)').run(reward);
  } else {
    throw new Error('未知等级奖励');
  }
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
