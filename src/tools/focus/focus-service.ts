import type { DatabaseSync } from 'node:sqlite';
import type { FocusSnapshot, FocusStatus } from '../../shared/types/focus';
import { localDate } from '../../shared/types/statistics';

type Row = {
  status: FocusStatus;
  kind: 'focus' | 'break';
  duration_ms: number;
  remaining_ms: number;
  deadline: number | null;
  completed_sessions: number;
  focus_ms: number;
};
export class FocusService {
  constructor(private readonly db: DatabaseSync) {}
  private row(): Row {
    return this.db.prepare('SELECT * FROM focus_timer WHERE id = 1').get() as unknown as Row;
  }
  get(now = Date.now()): FocusSnapshot {
    const row = this.row();
    const today = localDate(new Date(now));
    const daily = this.db
      .prepare(
        'SELECT COALESCE(SUM(duration_ms), 0) AS duration FROM focus_sessions WHERE date = ?',
      )
      .get(today) as { duration: number };
    const preferences = this.db
      .prepare('SELECT sound_enabled AS soundEnabled FROM focus_preferences WHERE id = 1')
      .get() as { soundEnabled: number };
    return {
      status: row.status,
      kind: row.kind,
      durationMs: row.duration_ms,
      remainingMs: row.status === 'running' ? Math.max(0, row.deadline! - now) : row.remaining_ms,
      completedSessions: row.completed_sessions,
      focusMinutes: Math.floor(row.focus_ms / 60000),
      todayFocusMinutes: Math.floor(daily.duration / 60000),
      soundEnabled: preferences.soundEnabled === 1,
    };
  }
  setSoundEnabled(value: unknown, now = Date.now()): FocusSnapshot {
    if (typeof value !== 'boolean') throw new Error('无效声音设置');
    this.db
      .prepare('UPDATE focus_preferences SET sound_enabled = ? WHERE id = 1')
      .run(value ? 1 : 0);
    return this.get(now);
  }
  start(kind: unknown, minutes: unknown, now = Date.now()): FocusSnapshot {
    if (
      (kind !== 'focus' && kind !== 'break') ||
      typeof minutes !== 'number' ||
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 180
    )
      throw new Error('无效计时设置');
    if (this.row().status === 'running' || this.row().status === 'paused')
      throw new Error('计时进行中');
    const duration = minutes * 60000;
    this.db
      .prepare(
        "UPDATE focus_timer SET status = 'running', kind = ?, duration_ms = ?, remaining_ms = ?, deadline = ? WHERE id = 1",
      )
      .run(kind, duration, duration, now + duration);
    return this.get(now);
  }
  pause(now = Date.now()): FocusSnapshot {
    this.completeIfDue(now);
    const row = this.row();
    if (row.status !== 'running') throw new Error('计时未运行');
    this.db
      .prepare(
        "UPDATE focus_timer SET status = 'paused', remaining_ms = ?, deadline = NULL WHERE id = 1",
      )
      .run(Math.max(0, row.deadline! - now));
    return this.get(now);
  }
  resume(now = Date.now()): FocusSnapshot {
    const row = this.row();
    if (row.status !== 'paused') throw new Error('计时未暂停');
    this.db
      .prepare("UPDATE focus_timer SET status = 'running', deadline = ? WHERE id = 1")
      .run(now + row.remaining_ms);
    return this.get(now);
  }
  stop(now = Date.now()): FocusSnapshot {
    this.completeIfDue(now);
    this.db
      .prepare(
        "UPDATE focus_timer SET status = 'idle', remaining_ms = 0, deadline = NULL WHERE id = 1",
      )
      .run();
    return this.get(now);
  }
  completeIfDue(now = Date.now(), onFocusComplete?: (date: string) => void): boolean {
    const row = this.row();
    if (row.status !== 'running' || row.deadline === null || row.deadline > now) return false;
    // 状态更新和完成统计同时提交，多次检查不会重复计数。
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db
        .prepare(
          "UPDATE focus_timer SET status = 'completed', remaining_ms = 0, deadline = NULL, completed_sessions = completed_sessions + ?, focus_ms = focus_ms + ? WHERE id = 1 AND status = 'running' AND deadline <= ?",
        )
        .run(row.kind === 'focus' ? 1 : 0, row.kind === 'focus' ? row.duration_ms : 0, now);
      if (result.changes === 1 && row.kind === 'focus') {
        const date = localDate(new Date(now));
        this.db
          .prepare('INSERT INTO focus_sessions(date, duration_ms, completed_at) VALUES (?, ?, ?)')
          .run(date, row.duration_ms, now);
        onFocusComplete?.(date);
      }
      this.db.exec('COMMIT');
      return result.changes === 1;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
