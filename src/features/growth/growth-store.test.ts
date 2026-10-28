import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StatisticsStore } from '../../services/statistics/statistics-store';

describe('growth database integration', () => {
  it('migrates existing statistics and persists growth across restarts', () => {
    const dir = mkdtempSync(join(tmpdir(), 'deskpet-growth-'));
    const path = join(dir, 'data.sqlite');
    try {
      const db = new DatabaseSync(path);
      db.exec(
        "CREATE TABLE daily_statistics (date TEXT PRIMARY KEY, keyboard_count INTEGER NOT NULL, mouse_count INTEGER NOT NULL); INSERT INTO daily_statistics VALUES ('2026-01-01', 100, 2); PRAGMA user_version = 1;",
      );
      db.close();
      let store = new StatisticsStore(path);
      store.add({
        date: '2026-01-02',
        keyboardCount: 24,
        mouseCount: 7,
        activeSeconds: 5,
      });
      store.close();
      store = new StatisticsStore(path);
      store.add({
        date: '2026-01-02',
        keyboardCount: 1,
        mouseCount: 1,
        activeSeconds: 5,
      });
      expect(store.growth()).toMatchObject({ level: 1, experience: 2, totalExperience: 2 });
      expect(store.all()).toHaveLength(2);
      store.clear();
      expect(store.growth().experience).toBe(2);
      store.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('awards every focus session without a daily cap', () => {
    const store = new StatisticsStore(':memory:');
    for (let session = 0; session < 6; session++) {
      const startedAt = session * 120_000;
      store.focus.start('focus', 1, startedAt);
      store.completeFocusIfDue(startedAt + 60_000);
    }
    // 每天 2 枚星星币；每 3 次专注额外 1 枚星光碎片，6 次共 60 EXP。
    expect(store.growth()).toMatchObject({ level: 1, experience: 60, totalExperience: 60 });
    expect(store.appearance.get()).toMatchObject({ balance: 12, fragments: 2 });
    store.close();
  });

  it('keeps input experience growing past the old daily cap', () => {
    const store = new StatisticsStore(':memory:');
    store.add({ date: '2026-01-03', keyboardCount: 25 * 1000, mouseCount: 0, activeSeconds: 60 });
    expect(store.growth().totalExperience).toBe(1000);
    expect(store.growth().level).toBe(6);
    // 等级奖励 2/4/5 给星星币，3/5/6 给碎片：120 星星币 + 3 星光碎片。
    expect(store.appearance.get()).toMatchObject({ balance: 120, fragments: 3 });
    store.close();
  });
});
