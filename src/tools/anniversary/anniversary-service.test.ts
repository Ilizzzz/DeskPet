import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { AnniversaryService } from './anniversary-service';

function createDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(
    'CREATE TABLE anniversaries (id INTEGER PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, repeat_yearly INTEGER NOT NULL DEFAULT 1 CHECK(repeat_yearly IN (0, 1)), created_at INTEGER NOT NULL)',
  );
  return db;
}

describe('anniversary service', () => {
  it('computes the next date and days until it', () => {
    const db = createDb();
    const anniversaries = new AnniversaryService(db);
    const now = new Date(2026, 2, 15, 8, 0);

    anniversaries.create('生日', '2000-03-20', true);
    anniversaries.create('今天', '2026-03-15', false);
    const views = anniversaries.all(now);
    expect(views.find((entry) => entry.title === '生日')).toMatchObject({
      title: '生日',
      date: '2000-03-20',
      repeatYearly: true,
      nextDate: '2026-03-20',
      daysUntil: 5,
    });
    expect(views.find((entry) => entry.title === '今天')).toMatchObject({
      nextDate: '2026-03-15',
      daysUntil: 0,
    });
    db.close();
  });

  it('rolls repeat dates to next year and clamps leap days', () => {
    const db = createDb();
    const anniversaries = new AnniversaryService(db);
    const now = new Date(2026, 2, 15);
    anniversaries.create('周年', '2020-03-10', true);
    anniversaries.create('闰日', '2024-02-29', true);
    const views = anniversaries.all(now);
    expect(views.find((entry) => entry.title === '周年')).toMatchObject({
      nextDate: '2027-03-10',
    });
    expect(views.find((entry) => entry.title === '闰日')).toMatchObject({
      nextDate: '2027-02-28',
      daysUntil: 350,
    });
    db.close();
  });

  it('sorts upcoming dates first and past single dates last', () => {
    const db = createDb();
    const anniversaries = new AnniversaryService(db);
    const now = new Date(2026, 2, 15);
    anniversaries.create('已过去', '2026-01-01', false);
    anniversaries.create('一个月后', '2026-04-15', false);
    anniversaries.create('明天', '2026-03-16', false);
    expect(anniversaries.all(now).map((entry) => entry.title)).toEqual([
      '明天',
      '一个月后',
      '已过去',
    ]);
    db.close();
  });

  it('rejects invalid titles, dates and repeat settings', () => {
    const db = createDb();
    const anniversaries = new AnniversaryService(db);
    expect(() => anniversaries.create('', '2026-03-15', true)).toThrow();
    expect(() => anniversaries.create('x'.repeat(41), '2026-03-15', true)).toThrow();
    expect(() => anniversaries.create('测试', '2026-02-30', true)).toThrow();
    expect(() => anniversaries.create('测试', '2026-2-3', true)).toThrow();
    expect(() => anniversaries.create('测试', 'not-a-date', true)).toThrow();
    expect(() => anniversaries.create('测试', '2026-03-15', 'yes')).toThrow();
    expect(() => anniversaries.remove(0)).toThrow();
    expect(() => anniversaries.remove(999)).toThrow();
    db.close();
  });
});
