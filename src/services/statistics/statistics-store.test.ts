import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { StatisticsStore } from './statistics-store';
import { InputCounter } from '../input-monitor/input-counter';

describe('statistics persistence', () => {
  it('keeps separate days across midnight and restores totals after reopening', () => {
    const directory = mkdtempSync(join(tmpdir(), 'deskpet-stats-'));
    try {
      const file = join(directory, 'stats.sqlite');
      const counter = new InputCounter();
      counter.keyDown(1, new Date(2026, 0, 1, 23, 59, 59).getTime());
      counter.mouseDown(new Date(2026, 0, 2, 0, 0, 1).getTime());
      let store = new StatisticsStore(file);
      for (const day of counter.flushDays().days) store.add(day);
      store.close();
      store = new StatisticsStore(file);
      const snapshot = store.snapshot(new Date(2026, 0, 2));
      expect(snapshot.today).toMatchObject({
        date: '2026-01-02',
        keyboardCount: 0,
        mouseCount: 1,
      });
      expect(snapshot.total).toMatchObject({ keyboardCount: 1, mouseCount: 1 });
      expect(snapshot.days).toHaveLength(30);
      store.clear();
      expect(store.all()).toEqual([]);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
  it('resets user content without rebuilding the database', () => {
    const store = new StatisticsStore(':memory:');
    store.add({
      date: '2026-01-02',
      keyboardCount: 2500,
      mouseCount: 0,
      activeSeconds: 60,
    });
    store.notes.create();
    store.preferences.update({ animationsEnabled: false });
    store.appearance.update({ equipped: { slot: 'head', itemId: 'cap_blue' } });
    store.appearance.update({
      adjustment: { itemId: 'cap_blue', offsetX: 8, offsetY: -4, scalePercent: 110 },
    });
    store.resetUserData();
    expect(store.snapshot(new Date(2026, 0, 2))).toMatchObject({
      growth: { level: 1, totalExperience: 0 },
      total: { keyboardCount: 0, mouseCount: 0 },
    });
    expect(store.notes.all()).toEqual([]);
    expect(store.appearance.get()).toMatchObject({
      character: 'cat',
      scene: 'transparent',
      balance: 0,
      fragments: 0,
      inventory: [{ itemId: 'cap_blue', quantity: 1 }],
      equipped: { head: null, neck: null, face: null, hand: null, back: null },
      itemAdjustments: [],
    });
    expect(store.preferences.get()).toEqual({
      animationsEnabled: true,
      onboardingCompleted: false,
      launchAtLogin: false,
      petScale: 100,
      edgeSnapEnabled: true,
      inputReactionsEnabled: true,
    });
    store.close();
  });

  it('keeps drop progress when only statistics are cleared', () => {
    const store = new StatisticsStore(':memory:');
    store.add({ date: '2026-01-02', keyboardCount: 1499, mouseCount: 10, activeSeconds: 4 });
    store.clear();
    expect(store.all()).toEqual([]);
    expect(store.appearance.get().dropProgress.keyboardRemainder).toBe(1499);
    store.close();
  });

  it('restores keyboard drop remainder after reopening', () => {
    const directory = mkdtempSync(join(tmpdir(), 'deskpet-drop-progress-'));
    const file = join(directory, 'stats.sqlite');
    try {
      let store = new StatisticsStore(file);
      store.add({ date: '2026-01-01', keyboardCount: 1499, mouseCount: 0, activeSeconds: 1 });
      store.close();
      store = new StatisticsStore(file);
      expect(store.appearance.get().dropProgress.keyboardRemainder).toBe(1499);
      expect(
        store.add({ date: '2026-01-02', keyboardCount: 1, mouseCount: 0, activeSeconds: 1 }),
      ).toHaveLength(1);
      expect(store.appearance.get().dropProgress.keyboardRemainder).toBe(0);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rolls back statistics and drop progress together, then retries once', () => {
    const directory = mkdtempSync(join(tmpdir(), 'deskpet-drop-transaction-'));
    const file = join(directory, 'stats.sqlite');
    try {
      let store = new StatisticsStore(file);
      store.close();
      let db = new DatabaseSync(file);
      db.exec(`CREATE TRIGGER fail_drop BEFORE INSERT ON drop_events
        BEGIN SELECT RAISE(FAIL, 'forced drop failure'); END;`);
      db.close();

      store = new StatisticsStore(file);
      const batch = {
        date: '2026-01-02',
        keyboardCount: 1500,
        mouseCount: 0,
        activeSeconds: 1,
      };
      expect(() => store.add(batch)).toThrow('forced drop failure');
      expect(store.all()).toEqual([]);
      expect(store.appearance.get().dropProgress.keyboardRemainder).toBe(0);
      store.close();

      db = new DatabaseSync(file);
      db.exec('DROP TRIGGER fail_drop');
      db.close();
      store = new StatisticsStore(file);
      expect(store.add(batch)).toHaveLength(1);
      expect(store.snapshot(new Date(2026, 0, 2)).total.keyboardCount).toBe(1500);
      expect(store.appearance.get().dropProgress.keyboardRemainder).toBe(0);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('migrates a Version 1 database without regranting old items', () => {
    const directory = mkdtempSync(join(tmpdir(), 'deskpet-v1-migration-'));
    const file = join(directory, 'stats.sqlite');
    try {
      let store = new StatisticsStore(file);
      store.close();

      const db = new DatabaseSync(file);
      db.exec(`
        UPDATE growth_state SET level = 20, experience = 42, total_experience = 5000 WHERE id = 1;
        UPDATE wallet SET balance = 333, fragments = 7 WHERE id = 1;
        DELETE FROM inventory;
        INSERT INTO inventory VALUES ('flower_crown', 2), ('hat_top', 3);
        UPDATE appearance SET head = 'hat_top' WHERE id = 1;
        INSERT OR REPLACE INTO daily_statistics VALUES ('2026-01-01', 321, 45, 12);
        INSERT OR IGNORE INTO granted_unlocks(id, granted_at) VALUES ('cap_blue', 1);
        INSERT OR IGNORE INTO achievements(id, claimed_at) VALUES ('craft_3', 1);
        INSERT INTO crafting_transactions(recipe_id, spent_currency, created_at)
          VALUES ('craft_hat_top', 25, 1);
        DROP TABLE input_drop_state;
        DROP TABLE drop_events;
        DROP TABLE item_discoveries;
        DROP TABLE item_wishlist;
        DROP TABLE economy_transactions;
        DROP TABLE item_adjustments;
        ALTER TABLE app_preferences DROP COLUMN pet_scale;
        ALTER TABLE app_preferences DROP COLUMN edge_snap_enabled;
        ALTER TABLE app_preferences DROP COLUMN input_reactions_enabled;
        PRAGMA user_version = 15;
      `);
      db.close();

      store = new StatisticsStore(file);
      const appearance = store.appearance.get();
      expect(store.snapshot(new Date(2026, 0, 1))).toMatchObject({
        growth: { level: 20, experience: 42, totalExperience: 5000 },
        total: { keyboardCount: 321, mouseCount: 45, activeSeconds: 12 },
      });
      expect(appearance).toMatchObject({
        balance: 333,
        fragments: 7,
        equipped: { head: 'hat_top' },
        dropProgress: { keyboardRemainder: 0, latestDrop: null },
      });
      expect(appearance.inventory).toEqual(
        expect.arrayContaining([
          { itemId: 'flower_crown', quantity: 2 },
          { itemId: 'hat_top', quantity: 3 },
          { itemId: 'beret_artist', quantity: 1 },
          { itemId: 'collar_starlight', quantity: 1 },
          { itemId: 'monocle_moon', quantity: 1 },
          { itemId: 'lantern_star', quantity: 1 },
        ]),
      );
      expect(appearance.inventory.some((entry) => entry.itemId === 'cap_blue')).toBe(false);
      expect(appearance.discoveredItemIds).toEqual(
        expect.arrayContaining([
          'flower_crown',
          'hat_top',
          'beret_artist',
          'collar_starlight',
          'monocle_moon',
          'lantern_star',
        ]),
      );
      expect(store.achievements.list().find((entry) => entry.id === 'craft_3')?.claimed).toBe(true);
      store.close();

      store = new StatisticsStore(file);
      expect(
        store.appearance.get().inventory.filter((entry) => entry.itemId === 'beret_artist'),
      ).toEqual([{ itemId: 'beret_artist', quantity: 1 }]);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
