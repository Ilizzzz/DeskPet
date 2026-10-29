import type { DatabaseSync } from 'node:sqlite';
import { DROP_POOL, KEYBOARD_COUNT_PER_DROP } from '../../data/catalogs/economy';
import type { DropEvent } from '../../shared/types/economy';

export class DropService {
  constructor(private readonly db: DatabaseSync) {}

  progress(): { keyboardRemainder: number; keyboardPerDrop: number; latestDrop: DropEvent | null } {
    const state = this.db
      .prepare('SELECT keyboard_remainder AS keyboardRemainder FROM input_drop_state WHERE id = 1')
      .get() as { keyboardRemainder: number };
    const latestDrop = this.db
      .prepare(
        'SELECT id, item_id AS itemId, created_at AS createdAt FROM drop_events ORDER BY id DESC LIMIT 1',
      )
      .get() as unknown as DropEvent | undefined;
    return {
      keyboardRemainder: state.keyboardRemainder,
      keyboardPerDrop: KEYBOARD_COUNT_PER_DROP,
      latestDrop: latestDrop ?? null,
    };
  }

  /** 调用方负责外层事务，保证进度、背包与掉落记录一起提交。 */
  addKeyboard(count: number, now = Date.now(), random: () => number = Math.random): DropEvent[] {
    if (!Number.isSafeInteger(count) || count < 0) throw new Error('无效键盘次数');
    const current = this.progress().keyboardRemainder;
    const total = current + count;
    if (!Number.isSafeInteger(total)) throw new Error('键盘次数超出支持范围');
    const awards = Math.floor(total / KEYBOARD_COUNT_PER_DROP);
    this.db
      .prepare('UPDATE input_drop_state SET keyboard_remainder = ? WHERE id = 1')
      .run(total % KEYBOARD_COUNT_PER_DROP);
    const events: DropEvent[] = [];
    for (let index = 0; index < awards; index += 1) {
      const itemId = rollDrop(random());
      this.db
        .prepare(
          'INSERT INTO inventory(item_id, quantity) VALUES (?, 1) ON CONFLICT(item_id) DO UPDATE SET quantity = quantity + 1',
        )
        .run(itemId);
      this.db
        .prepare('INSERT OR IGNORE INTO item_discoveries(item_id, first_acquired_at) VALUES (?, ?)')
        .run(itemId, now);
      const result = this.db
        .prepare('INSERT INTO drop_events(item_id, created_at) VALUES (?, ?)')
        .run(itemId, now);
      events.push({ id: Number(result.lastInsertRowid), itemId, createdAt: now });
    }
    return events;
  }
}

export function rollDrop(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('无效随机数');
  let threshold = value * 100;
  for (const entry of DROP_POOL) {
    if (threshold < entry.weight) return entry.itemId;
    threshold -= entry.weight;
  }
  return DROP_POOL[DROP_POOL.length - 1].itemId;
}
