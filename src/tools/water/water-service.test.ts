import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { WaterService } from './water-service';

function createDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(
    'CREATE TABLE water_state (id INTEGER PRIMARY KEY CHECK(id = 1), interval_minutes INTEGER NOT NULL, daily_goal INTEGER NOT NULL, date TEXT NOT NULL, cups_today INTEGER NOT NULL, last_drink_at INTEGER, last_reminded_at INTEGER);' +
      "INSERT INTO water_state VALUES (1, 60, 8, '', 0, NULL, NULL);",
  );
  return db;
}

describe('water service', () => {
  it('returns defaults and records drinks', () => {
    const db = createDb();
    const water = new WaterService(db);
    const day1 = new Date(2026, 2, 15, 9, 0).getTime();
    expect(water.get(day1)).toMatchObject({
      intervalMinutes: 60,
      dailyGoal: 8,
      date: '2026-03-15',
      cupsToday: 0,
      lastDrinkAt: null,
    });
    expect(water.drink(day1)).toMatchObject({ cupsToday: 1, lastDrinkAt: day1 });
    expect(water.drink(day1 + 1000)).toMatchObject({ cupsToday: 2, lastDrinkAt: day1 + 1000 });
    db.close();
  });

  it('resets the cup count on a new day', () => {
    const db = createDb();
    const water = new WaterService(db);
    const day1 = new Date(2026, 2, 15, 23, 0).getTime();
    const day2 = new Date(2026, 2, 16, 8, 0).getTime();
    water.drink(day1);
    expect(water.get(day2)).toMatchObject({
      date: '2026-03-16',
      cupsToday: 0,
      lastDrinkAt: null,
      lastRemindedAt: null,
    });
    db.close();
  });

  it('validates water settings', () => {
    const db = createDb();
    const water = new WaterService(db);
    expect(water.configure({ intervalMinutes: 30, dailyGoal: 6 })).toMatchObject({
      intervalMinutes: 30,
      dailyGoal: 6,
    });
    for (const value of [
      null,
      [],
      {},
      { intervalMinutes: 14, dailyGoal: 8 },
      { intervalMinutes: 241, dailyGoal: 8 },
      { intervalMinutes: 60, dailyGoal: 0 },
      { intervalMinutes: 60, dailyGoal: 21 },
      { intervalMinutes: 60.5, dailyGoal: 8 },
      { intervalMinutes: 60, dailyGoal: '8' },
    ])
      expect(() => water.configure(value)).toThrow();
    db.close();
  });

  it('does not remind on the first check and starts the interval from then', () => {
    const db = createDb();
    const water = new WaterService(db);
    const day = new Date(2026, 2, 15, 15, 0).getTime();
    const minute = 60_000;

    // 下午 3 点才启用工具：第一次检查只记录起点，不立即提醒。
    expect(water.checkDue(day)).toBe(false);
    expect(water.checkDue(day + 59 * minute)).toBe(false);
    expect(water.checkDue(day + 60 * minute)).toBe(true);
    // 刚提醒过，下一分钟内不会重复。
    expect(water.checkDue(day + 61 * minute)).toBe(false);
    expect(water.checkDue(day + 120 * minute)).toBe(true);
    db.close();
  });

  it('restarts the interval after drinking and resets across days', () => {
    const db = createDb();
    const water = new WaterService(db);
    const day = new Date(2026, 2, 15, 9, 0).getTime();
    const nextDay = new Date(2026, 2, 16, 15, 0).getTime();
    const minute = 60_000;

    water.checkDue(day);
    expect(water.checkDue(day + 60 * minute)).toBe(true);
    water.drink(day + 61 * minute);
    expect(water.checkDue(day + 61 * minute + 59 * minute)).toBe(false);
    expect(water.checkDue(day + 61 * minute + 60 * minute)).toBe(true);

    // 跨日后重新从第一次检查开始计时。
    expect(water.get(nextDay).cupsToday).toBe(0);
    expect(water.checkDue(nextDay)).toBe(false);
    expect(water.checkDue(nextDay + 60 * minute)).toBe(true);
    db.close();
  });

  it('stops reminding when the daily goal is reached', () => {
    const db = createDb();
    const water = new WaterService(db);
    water.configure({ intervalMinutes: 15, dailyGoal: 2 });
    const day = new Date(2026, 2, 15, 9, 0).getTime();
    water.drink(day);
    water.drink(day + 1000);
    expect(water.checkDue(day + 60 * 60_000)).toBe(false);
    db.close();
  });
});
