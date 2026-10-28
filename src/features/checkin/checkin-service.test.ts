import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { CheckinService } from './checkin-service';

function database(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE checkins(date TEXT PRIMARY KEY, streak INTEGER NOT NULL, reward TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE wallet(id INTEGER PRIMARY KEY, balance INTEGER NOT NULL, fragments INTEGER NOT NULL DEFAULT 0);
    INSERT INTO wallet VALUES(1, 0, 0);`);
  return db;
}

function wallet(db: DatabaseSync): { balance: number; fragments: number } {
  return db.prepare('SELECT balance, fragments FROM wallet WHERE id = 1').get() as unknown as {
    balance: number;
    fragments: number;
  };
}

describe('checkin', () => {
  it('grants the first day reward once and refuses a second check-in', () => {
    const db = database();
    const service = new CheckinService(db);
    const day = new Date(2026, 0, 1, 9, 30);
    expect(service.status(day)).toMatchObject({
      checkedInToday: false,
      streak: 0,
      nextStreak: 1,
      todayReward: [
        { type: 'coins', amount: 15 },
        { type: 'fragments', amount: 1 },
      ],
    });
    const after = service.checkIn(day);
    expect(after).toMatchObject({ checkedInToday: true, streak: 1, nextStreak: 2 });
    expect(wallet(db)).toMatchObject({ balance: 15, fragments: 1 });
    expect(() => service.checkIn(day)).toThrow('今天已经签到');
    expect(wallet(db)).toMatchObject({ balance: 15, fragments: 1 });
  });

  it('keeps the stored reward as JSON and reads it back for today status', () => {
    const db = database();
    const service = new CheckinService(db);
    service.checkIn(new Date(2026, 0, 1, 8));
    const row = db.prepare('SELECT reward FROM checkins').get() as unknown as { reward: string };
    expect(JSON.parse(row.reward)).toEqual([
      { type: 'coins', amount: 15 },
      { type: 'fragments', amount: 1 },
    ]);
    expect(service.status(new Date(2026, 0, 1, 22)).todayReward).toEqual([
      { type: 'coins', amount: 15 },
      { type: 'fragments', amount: 1 },
    ]);
  });

  it('increments the streak on consecutive days and rewards the seventh day extra', () => {
    const db = database();
    const service = new CheckinService(db);
    for (let day = 1; day <= 7; day++) {
      service.checkIn(new Date(2026, 0, day, 10));
      expect(service.status(new Date(2026, 0, day, 12)).streak).toBe(day);
    }
    // 15+20+25+30+35+40+45 = 210 星星币；前 6 天各 1 碎片，第 7 天 3 碎片。
    expect(wallet(db)).toMatchObject({ balance: 210, fragments: 9 });
  });

  it('resets the streak after a gap and starts over from 1', () => {
    const db = database();
    const service = new CheckinService(db);
    service.checkIn(new Date(2026, 0, 1, 10));
    service.checkIn(new Date(2026, 0, 2, 10));
    const missed = service.status(new Date(2026, 0, 4, 10));
    expect(missed).toMatchObject({ checkedInToday: false, streak: 0, nextStreak: 1 });
    expect(missed.todayReward).toEqual([
      { type: 'coins', amount: 15 },
      { type: 'fragments', amount: 1 },
    ]);
    expect(service.checkIn(new Date(2026, 0, 4, 10))).toMatchObject({
      checkedInToday: true,
      streak: 1,
    });
    expect(db.prepare('SELECT COUNT(*) AS count FROM checkins').get()).toMatchObject({ count: 3 });
  });
});
