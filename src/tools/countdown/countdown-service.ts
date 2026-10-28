import type { DatabaseSync } from 'node:sqlite';
import type { Countdown } from '../../shared/types/countdown';

const MIN_MINUTES = 1;
const MAX_MINUTES = 1440;
const MAX_LABEL_LENGTH = 40;

type Row = {
  id: number;
  label: string;
  ends_at: number;
  created_at: number;
  notified: number;
};

function toCountdown(row: Row): Countdown {
  return {
    id: row.id,
    label: row.label,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    notified: row.notified === 1,
  };
}

function validId(id: unknown): id is number {
  return typeof id === 'number' && Number.isSafeInteger(id) && id >= 1;
}

/** 倒计时：到点后由 checkDue 标记 notified，主进程据此只推送一次通知。 */
export class CountdownService {
  constructor(private readonly db: DatabaseSync) {}

  all(now = Date.now()): Countdown[] {
    if (!Number.isFinite(now)) throw new Error('无效时间');
    const rows = this.db
      .prepare(
        'SELECT id, label, ends_at, created_at, notified FROM countdowns ORDER BY ends_at ASC, id ASC',
      )
      .all() as unknown as Row[];
    return rows.map(toCountdown);
  }

  create(label: unknown, minutes: unknown, now = Date.now()): Countdown[] {
    if (typeof label !== 'string') throw new Error('无效倒计时');
    const text = label.trim();
    if (text.length < 1 || text.length > MAX_LABEL_LENGTH) throw new Error('无效倒计时名称');
    if (
      typeof minutes !== 'number' ||
      !Number.isInteger(minutes) ||
      minutes < MIN_MINUTES ||
      minutes > MAX_MINUTES
    )
      throw new Error('无效倒计时时长');
    this.db
      .prepare('INSERT INTO countdowns(label, ends_at, created_at, notified) VALUES (?, ?, ?, 0)')
      .run(text, now + minutes * 60_000, now);
    return this.all();
  }

  remove(id: unknown): Countdown[] {
    if (!validId(id)) throw new Error('无效倒计时');
    const result = this.db.prepare('DELETE FROM countdowns WHERE id = ?').run(id);
    if (result.changes !== 1) throw new Error('倒计时不存在');
    return this.all();
  }

  /** 返回刚到期且尚未提醒的倒计时，并立即标记，避免重复通知。 */
  checkDue(now = Date.now()): Countdown[] {
    const due = this.db
      .prepare(
        'SELECT id, label, ends_at, created_at, notified FROM countdowns WHERE notified = 0 AND ends_at <= ? ORDER BY ends_at ASC, id ASC',
      )
      .all(now) as unknown as Row[];
    if (due.length === 0) return [];
    const mark = this.db.prepare('UPDATE countdowns SET notified = 1 WHERE id = ?');
    for (const row of due) mark.run(row.id);
    return due.map((row) => toCountdown({ ...row, notified: 1 }));
  }
}
