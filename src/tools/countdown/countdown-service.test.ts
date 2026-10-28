import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { CountdownService } from './countdown-service';

function createDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(
    'CREATE TABLE countdowns (id INTEGER PRIMARY KEY, label TEXT NOT NULL, ends_at INTEGER NOT NULL, created_at INTEGER NOT NULL, notified INTEGER NOT NULL DEFAULT 0 CHECK(notified IN (0, 1)))',
  );
  return db;
}

describe('countdown service', () => {
  it('creates countdowns and reports due items only once', () => {
    const db = createDb();
    const countdowns = new CountdownService(db);
    const now = new Date(2026, 2, 15, 10, 0).getTime();
    const created = countdowns.create(' 泡面 ', 5, now);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ label: '泡面', endsAt: now + 300_000, notified: false });

    expect(countdowns.checkDue(now + 299_999)).toEqual([]);
    const due = countdowns.checkDue(now + 300_000);
    expect(due.map((item) => item.label)).toEqual(['泡面']);
    expect(due[0].notified).toBe(true);
    expect(countdowns.checkDue(now + 400_000)).toEqual([]);
    expect(countdowns.all()[0].notified).toBe(true);

    const id = created[0].id;
    expect(countdowns.remove(id)).toEqual([]);
    expect(() => countdowns.remove(id)).toThrow('倒计时不存在');
    db.close();
  });

  it('rejects invalid labels, durations and ids', () => {
    const db = createDb();
    const countdowns = new CountdownService(db);
    expect(() => countdowns.create('', 5)).toThrow();
    expect(() => countdowns.create('   ', 5)).toThrow();
    expect(() => countdowns.create('x'.repeat(41), 5)).toThrow();
    expect(() => countdowns.create('测试', 0)).toThrow();
    expect(() => countdowns.create('测试', 1441)).toThrow();
    expect(() => countdowns.create('测试', 1.5)).toThrow();
    expect(() => countdowns.create('测试', '5')).toThrow();
    expect(() => countdowns.remove(-1)).toThrow();
    db.close();
  });

  it('orders countdowns by due time', () => {
    const db = createDb();
    const countdowns = new CountdownService(db);
    const now = Date.now();
    countdowns.create('较晚', 30, now);
    countdowns.create('较早', 10, now);
    expect(countdowns.all().map((item) => item.label)).toEqual(['较早', '较晚']);
    db.close();
  });
});
