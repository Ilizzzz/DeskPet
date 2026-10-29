import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { AchievementService } from './achievement-service';

function database(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE daily_statistics(date TEXT PRIMARY KEY, keyboard_count INTEGER NOT NULL, mouse_count INTEGER NOT NULL, active_seconds REAL NOT NULL DEFAULT 0);
    CREATE TABLE growth_state(id INTEGER PRIMARY KEY CHECK(id = 1), level INTEGER NOT NULL, experience INTEGER NOT NULL, total_experience INTEGER NOT NULL, keyboard_remainder INTEGER NOT NULL, mouse_remainder INTEGER NOT NULL);
    INSERT INTO growth_state VALUES(1, 1, 0, 0, 0, 0);
    CREATE TABLE inventory(item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL);
    CREATE TABLE item_discoveries(item_id TEXT PRIMARY KEY, first_acquired_at INTEGER NOT NULL);
    CREATE TABLE unlocks(id TEXT PRIMARY KEY);
    CREATE TABLE focus_sessions(id INTEGER PRIMARY KEY, date TEXT NOT NULL, duration_ms INTEGER NOT NULL, completed_at INTEGER NOT NULL);
    CREATE TABLE checkins(date TEXT PRIMARY KEY, streak INTEGER NOT NULL, reward TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE achievements(id TEXT PRIMARY KEY, claimed_at INTEGER NOT NULL);
    CREATE TABLE wallet(id INTEGER PRIMARY KEY CHECK(id = 1), balance INTEGER NOT NULL, fragments INTEGER NOT NULL DEFAULT 0);
    INSERT INTO wallet VALUES(1, 0, 0);`);
  return db;
}

function wallet(db: DatabaseSync): { balance: number; fragments: number } {
  return db.prepare('SELECT balance, fragments FROM wallet WHERE id = 1').get() as unknown as {
    balance: number;
    fragments: number;
  };
}

describe('achievements', () => {
  it('lists all achievements with zero progress for a fresh account', () => {
    const db = database();
    const list = new AchievementService(db).list();
    expect(list).toHaveLength(12);
    expect(list.every((entry) => !entry.claimed && !entry.claimable)).toBe(true);
    expect(list.find((entry) => entry.id === 'typist')).toMatchObject({
      progress: 0,
      condition: { type: 'keyboard', target: 100000 },
    });
    db.close();
  });

  it('derives progress from statistics, growth, inventory, unlocks and sessions', () => {
    const db = database();
    db.exec(`
      INSERT INTO daily_statistics VALUES('2026-01-01', 100000, 50000, 10);
      UPDATE growth_state SET level = 10 WHERE id = 1;
      INSERT INTO inventory VALUES('cap_blue', 1);
      INSERT INTO inventory VALUES('flower_crown', 1);
      INSERT INTO inventory VALUES('scarf_red', 1);
      INSERT INTO inventory VALUES('bell_collar', 1);
      INSERT INTO inventory VALUES('glasses_round', 1);
      INSERT INTO inventory VALUES('balloon_red', 1);
      INSERT INTO inventory VALUES('backpack_school', 1);
      INSERT INTO inventory VALUES('hat_top', 1);
      INSERT INTO inventory VALUES('hat_woman', 1);
      INSERT INTO inventory VALUES('ribbon_pink', 1);
      INSERT INTO item_discoveries
        SELECT item_id, 1 FROM inventory;
      INSERT INTO unlocks VALUES('cat'), ('dog'), ('rabbit'), ('transparent'), ('forest_home'), ('coffee_corner');
      INSERT INTO focus_sessions VALUES(1, '2026-01-01', 60000, 1), (2, '2026-01-01', 60000, 2), (3, '2026-01-01', 60000, 3), (4, '2026-01-01', 60000, 4), (5, '2026-01-01', 60000, 5);
      INSERT INTO checkins VALUES('2026-01-01', 7, '[]', 1);`);
    const list = new AchievementService(db).list();
    const byId = new Map(list.map((entry) => [entry.id, entry]));
    for (const id of [
      'first_steps',
      'typist',
      'clicker',
      'focus_5',
      'level_10',
      'collect_10',
      'craft_3',
      'checkin_7',
      'scene_3',
      'character_3',
    ])
      expect(byId.get(id)).toMatchObject({ claimable: true });
    // 30 次专注和 25 级尚未达成。
    expect(byId.get('focus_30')).toMatchObject({ claimable: false, progress: 5 });
    expect(byId.get('level_25')).toMatchObject({ claimable: false, progress: 10 });
    db.close();
  });

  it('keeps collection progress after the last copy is gone', () => {
    const db = database();
    db.exec(`
      INSERT INTO item_discoveries VALUES('cap_blue', 1), ('flower_crown', 2), ('scarf_red', 3);
      INSERT INTO inventory VALUES('cap_blue', 0);
    `);
    expect(new AchievementService(db).list().find((entry) => entry.id === 'craft_3')).toMatchObject(
      { progress: 3, claimable: true },
    );
    db.close();
  });

  it('claims once, grants rewards and stays idempotent', () => {
    const db = database();
    db.exec("INSERT INTO daily_statistics VALUES('2026-01-01', 500, 0, 0)");
    const service = new AchievementService(db);
    const claimed = service.claim('first_steps');
    expect(claimed.find((entry) => entry.id === 'first_steps')).toMatchObject({
      claimed: true,
      claimable: false,
    });
    expect(wallet(db)).toMatchObject({ balance: 20, fragments: 0 });
    const again = service.claim('first_steps');
    expect(wallet(db)).toMatchObject({ balance: 20, fragments: 0 });
    expect(again.find((entry) => entry.id === 'first_steps')?.claimed).toBe(true);
    expect(db.prepare('SELECT COUNT(*) AS count FROM achievements').get()).toMatchObject({
      count: 1,
    });
    db.close();
  });

  it('rejects unknown achievements and unmet conditions without writing', () => {
    const db = database();
    const service = new AchievementService(db);
    expect(() => service.claim('missing')).toThrow('成就不存在');
    expect(() => service.claim(42)).toThrow('无效成就');
    expect(() => service.claim('focus_5')).toThrow('成就条件未达成');
    expect(wallet(db)).toMatchObject({ balance: 0, fragments: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM achievements').get()).toMatchObject({
      count: 0,
    });
    db.close();
  });
});
