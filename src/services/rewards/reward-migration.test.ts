import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StatisticsStore } from '../statistics/statistics-store';
describe('reward migration', () => {
  it('grants previously recorded rewards exactly once during migration', () => {
    const directory = mkdtempSync(join(tmpdir(), 'deskpet-reward-'));
    const file = join(directory, 'data.sqlite');
    try {
      let store = new StatisticsStore(file);
      store.close();
      const db = new DatabaseSync(file);
      db.exec(
        "INSERT INTO level_rewards VALUES (2, 'hat_blue'); INSERT INTO level_rewards VALUES (3, 'currency_50'); DELETE FROM granted_rewards; DELETE FROM inventory; UPDATE wallet SET balance = 0; DROP TABLE appearance; DROP TABLE focus_timer; DROP TABLE notes; DROP TABLE granted_rewards; DROP TABLE inventory; DROP TABLE wallet; DROP TABLE unlocks; DROP TABLE crafting_transactions; DROP TABLE tool_settings; DROP TABLE sedentary_state; DROP TABLE focus_sessions; DROP TABLE focus_preferences; DROP TABLE reward_events; DROP TABLE app_preferences; ALTER TABLE daily_statistics DROP COLUMN active_seconds; ALTER TABLE growth_daily DROP COLUMN focus_experience; PRAGMA user_version = 2;",
      );
      db.close();
      store = new StatisticsStore(file);
      expect(store.appearance.get()).toMatchObject({
        balance: 50,
        inventory: [{ itemId: 'hat_blue', quantity: 1 }],
      });
      store.close();
      store = new StatisticsStore(file);
      expect(store.appearance.get().balance).toBe(50);
      expect(store.appearance.get().inventory[0].quantity).toBe(1);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
