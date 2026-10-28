import type { DatabaseSync } from 'node:sqlite';
import { localDate } from '../../shared/types/statistics';
import type { WaterSettings, WaterSnapshot } from '../../shared/types/water';

const MIN_INTERVAL_MINUTES = 15;
const MAX_INTERVAL_MINUTES = 240;
const MIN_DAILY_GOAL = 1;
const MAX_DAILY_GOAL = 20;
const MINUTE_MS = 60_000;

type Row = {
  interval_minutes: number;
  daily_goal: number;
  date: string;
  cups_today: number;
  last_drink_at: number | null;
  last_reminded_at: number | null;
};

/** 喝水提醒：跨日自动清零，只有达到间隔且今天未达标时才提醒。 */
export class WaterService {
  constructor(private readonly db: DatabaseSync) {}

  private row(): Row {
    const row = this.db
      .prepare(
        'SELECT interval_minutes, daily_goal, date, cups_today, last_drink_at, last_reminded_at FROM water_state WHERE id = 1',
      )
      .get() as unknown as Row | undefined;
    if (!row) throw new Error('喝水数据不可用');
    return row;
  }

  /** 日期变化时清空今日杯数，避免把昨天的记录算进今天。 */
  private resetIfNewDay(now: number): Row {
    const row = this.row();
    const today = localDate(new Date(now));
    if (row.date === today) return row;
    this.db
      .prepare(
        'UPDATE water_state SET date = ?, cups_today = 0, last_drink_at = NULL, last_reminded_at = NULL WHERE id = 1',
      )
      .run(today);
    return this.row();
  }

  private snapshot(row: Row): WaterSnapshot {
    return {
      intervalMinutes: row.interval_minutes,
      dailyGoal: row.daily_goal,
      date: row.date,
      cupsToday: row.cups_today,
      lastDrinkAt: row.last_drink_at,
      lastRemindedAt: row.last_reminded_at,
    };
  }

  get(now = Date.now()): WaterSnapshot {
    return this.snapshot(this.resetIfNewDay(now));
  }

  configure(value: unknown): WaterSnapshot {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('无效喝水设置');
    const settings = value as Partial<WaterSettings>;
    if (
      typeof settings.intervalMinutes !== 'number' ||
      !Number.isInteger(settings.intervalMinutes) ||
      settings.intervalMinutes < MIN_INTERVAL_MINUTES ||
      settings.intervalMinutes > MAX_INTERVAL_MINUTES ||
      typeof settings.dailyGoal !== 'number' ||
      !Number.isInteger(settings.dailyGoal) ||
      settings.dailyGoal < MIN_DAILY_GOAL ||
      settings.dailyGoal > MAX_DAILY_GOAL
    )
      throw new Error('无效喝水设置');
    this.db
      .prepare('UPDATE water_state SET interval_minutes = ?, daily_goal = ? WHERE id = 1')
      .run(settings.intervalMinutes, settings.dailyGoal);
    return this.get();
  }

  drink(now = Date.now()): WaterSnapshot {
    const row = this.resetIfNewDay(now);
    this.db
      .prepare('UPDATE water_state SET cups_today = ?, last_drink_at = ? WHERE id = 1')
      .run(row.cups_today + 1, now);
    return this.get(now);
  }

  checkDue(now = Date.now()): boolean {
    const row = this.resetIfNewDay(now);
    if (row.cups_today >= row.daily_goal) return false;
    // 首次检查（含跨日重置后）没有喝水与提醒记录时，先记录起点再返回，
    // 避免用户下午才启用工具就立刻收到提醒；间隔从此刻开始计算。
    if (row.last_drink_at === null && row.last_reminded_at === null) {
      this.db.prepare('UPDATE water_state SET last_reminded_at = ? WHERE id = 1').run(now);
      return false;
    }
    const baseline = Math.max(row.last_drink_at ?? 0, row.last_reminded_at ?? 0);
    if (now - baseline < row.interval_minutes * MINUTE_MS) return false;
    this.db.prepare('UPDATE water_state SET last_reminded_at = ? WHERE id = 1').run(now);
    return true;
  }
}
