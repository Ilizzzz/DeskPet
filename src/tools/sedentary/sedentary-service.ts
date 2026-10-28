import type { DatabaseSync } from 'node:sqlite';
import type { SedentarySettings, SedentarySnapshot } from '../../shared/types/sedentary';

type Row = {
  interval_minutes: number;
  inactivity_reset_minutes: number;
  quiet_start: string | null;
  quiet_end: string | null;
  last_activity_at: number | null;
  active_since: number | null;
  last_reminded_at: number | null;
  snoozed_until: number | null;
};

function validTime(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value));
}

export class SedentaryService {
  constructor(private readonly db: DatabaseSync) {}

  private row(): Row {
    return this.db.prepare('SELECT * FROM sedentary_state WHERE id = 1').get() as unknown as Row;
  }

  private resetIfInactive(now: number): Row {
    const row = this.row();
    if (
      row.last_activity_at !== null &&
      now - row.last_activity_at >= row.inactivity_reset_minutes * 60_000
    ) {
      this.db
        .prepare(
          'UPDATE sedentary_state SET last_activity_at = NULL, active_since = NULL, last_reminded_at = NULL, snoozed_until = NULL WHERE id = 1',
        )
        .run();
      return this.row();
    }
    return row;
  }

  recordActivity(now = Date.now()): void {
    const row = this.resetIfInactive(now);
    if (row.active_since === null) {
      this.db
        .prepare(
          'UPDATE sedentary_state SET last_activity_at = ?, active_since = ?, last_reminded_at = NULL, snoozed_until = NULL WHERE id = 1',
        )
        .run(now, now);
    } else {
      this.db.prepare('UPDATE sedentary_state SET last_activity_at = ? WHERE id = 1').run(now);
    }
  }

  get(now = Date.now()): SedentarySnapshot {
    const row = this.resetIfInactive(now);
    return {
      intervalMinutes: row.interval_minutes,
      inactivityResetMinutes: row.inactivity_reset_minutes,
      quietStart: row.quiet_start,
      quietEnd: row.quiet_end,
      continuousMinutes:
        row.active_since === null ? 0 : Math.max(0, Math.floor((now - row.active_since) / 60_000)),
      nextReminderAt:
        row.active_since === null ? null : row.active_since + row.interval_minutes * 60_000,
      snoozedUntil: row.snoozed_until,
    };
  }

  configure(value: unknown): SedentarySnapshot {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('无效久坐设置');
    const settings = value as Partial<SedentarySettings>;
    if (
      !Number.isInteger(settings.intervalMinutes) ||
      settings.intervalMinutes! < 1 ||
      settings.intervalMinutes! > 240 ||
      !Number.isInteger(settings.inactivityResetMinutes) ||
      settings.inactivityResetMinutes! < 1 ||
      settings.inactivityResetMinutes! > 60 ||
      !validTime(settings.quietStart) ||
      !validTime(settings.quietEnd) ||
      (settings.quietStart === null) !== (settings.quietEnd === null)
    )
      throw new Error('无效久坐设置');
    const intervalMinutes = settings.intervalMinutes as number;
    const inactivityResetMinutes = settings.inactivityResetMinutes as number;
    const quietStart = settings.quietStart as string | null;
    const quietEnd = settings.quietEnd as string | null;
    this.db
      .prepare(
        'UPDATE sedentary_state SET interval_minutes = ?, inactivity_reset_minutes = ?, quiet_start = ?, quiet_end = ? WHERE id = 1',
      )
      .run(intervalMinutes, inactivityResetMinutes, quietStart, quietEnd);
    return this.get();
  }

  snooze(minutes: unknown, now = Date.now()): SedentarySnapshot {
    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 1 || minutes > 60)
      throw new Error('无效延迟时间');
    this.db
      .prepare('UPDATE sedentary_state SET snoozed_until = ?, last_reminded_at = NULL WHERE id = 1')
      .run(now + minutes * 60_000);
    return this.get(now);
  }

  reset(now = Date.now()): SedentarySnapshot {
    this.db
      .prepare(
        'UPDATE sedentary_state SET last_activity_at = NULL, active_since = NULL, last_reminded_at = NULL, snoozed_until = NULL WHERE id = 1',
      )
      .run();
    return this.get(now);
  }

  checkDue(now = Date.now()): boolean {
    const row = this.resetIfInactive(now);
    if (
      row.active_since === null ||
      now < row.active_since + row.interval_minutes * 60_000 ||
      (row.snoozed_until !== null && now < row.snoozed_until) ||
      (row.last_reminded_at !== null && row.last_reminded_at >= row.active_since) ||
      this.isQuiet(now, row.quiet_start, row.quiet_end)
    )
      return false;
    this.db
      .prepare('UPDATE sedentary_state SET last_reminded_at = ?, snoozed_until = NULL WHERE id = 1')
      .run(now);
    return true;
  }

  private isQuiet(now: number, start: string | null, end: string | null): boolean {
    if (!start || !end || start === end) return false;
    const date = new Date(now);
    const current = date.getHours() * 60 + date.getMinutes();
    const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    const from = toMinutes(start);
    const until = toMinutes(end);
    return from < until ? current >= from && current < until : current >= from || current < until;
  }
}
