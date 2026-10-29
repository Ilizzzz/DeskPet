import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StatisticsStore } from '../statistics/statistics-store';

describe('reward migration', () => {
  it('grants previously recorded rewards exactly once and migrates old ids', () => {
    const directory = mkdtempSync(join(tmpdir(), 'deskpet-reward-'));
    const file = join(directory, 'data.sqlite');
    try {
      let store = new StatisticsStore(file);
      store.close();
      const db = new DatabaseSync(file);
      db.exec(
        "INSERT INTO level_rewards VALUES (2, 'hat_blue'); INSERT INTO level_rewards VALUES (3, 'currency_50'); DELETE FROM granted_rewards; DELETE FROM inventory; UPDATE wallet SET balance = 0; DROP TABLE appearance; DROP TABLE focus_timer; DROP TABLE notes; DROP TABLE granted_rewards; DROP TABLE inventory; DROP TABLE wallet; DROP TABLE unlocks; DROP TABLE crafting_transactions; DROP TABLE tool_settings; DROP TABLE sedentary_state; DROP TABLE focus_sessions; DROP TABLE focus_preferences; DROP TABLE reward_events; DROP TABLE app_preferences; DROP TABLE granted_unlocks; DROP TABLE checkins; DROP TABLE achievements; DROP TABLE todos; DROP TABLE countdowns; DROP TABLE anniversaries; DROP TABLE water_state; DROP TABLE input_drop_state; DROP TABLE drop_events; DROP TABLE item_discoveries; DROP TABLE item_wishlist; DROP TABLE economy_transactions; ALTER TABLE daily_statistics DROP COLUMN active_seconds; ALTER TABLE growth_daily DROP COLUMN focus_experience; PRAGMA user_version = 2;",
      );
      db.close();
      store = new StatisticsStore(file);
      expect(store.appearance.get()).toMatchObject({
        balance: 50,
        fragments: 0,
        inventory: [{ itemId: 'cap_blue', quantity: 1 }],
      });
      store.close();
      store = new StatisticsStore(file);
      expect(store.appearance.get().balance).toBe(50);
      expect(store.appearance.get().inventory).toEqual([{ itemId: 'cap_blue', quantity: 1 }]);
      store.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
