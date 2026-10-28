import { NotesService } from '../../tools/notes/notes-service';
import { FocusService } from '../../tools/focus/focus-service';
import { AppearanceService } from '../../features/appearance/appearance-service';
import { CraftingService } from '../../features/inventory/crafting-service';
import { ToolRegistryService } from '../../tools/tool-registry';
import { SedentaryService } from '../../tools/sedentary/sedentary-service';
import { SummaryService } from '../../tools/summary/summary-service';
import { AppPreferencesService } from '../settings/app-preferences-service';
import { grantLevelReward } from '../rewards/rewards';
import {
  LEVEL_REWARDS,
  GROWTH_RULES,
  requiredExperience,
  settleExperience,
  settleInput,
  type GrowthState,
  type GrowthSnapshot,
} from '../../features/growth/growth';
import { DatabaseSync } from 'node:sqlite';
import {
  localDate,
  type DailyStatistics,
  type StatisticsSnapshot,
} from '../../shared/types/statistics';

export class StatisticsStore {
  private readonly db: DatabaseSync;
  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const version = (this.db.prepare('PRAGMA user_version').get() as { user_version: number })
      .user_version;
    if (version > 14) throw new Error('统计数据库版本高于当前应用支持的版本');
    if (version === 0)
      this.db.exec(`BEGIN; CREATE TABLE daily_statistics (
      date TEXT PRIMARY KEY, keyboard_count INTEGER NOT NULL CHECK(keyboard_count >= 0),
      mouse_count INTEGER NOT NULL CHECK(mouse_count >= 0)); PRAGMA user_version = 1; COMMIT;`);
    if (version < 2)
      this.db.exec(`BEGIN;
      CREATE TABLE growth_state (id INTEGER PRIMARY KEY CHECK(id = 1), level INTEGER NOT NULL, experience INTEGER NOT NULL, total_experience INTEGER NOT NULL, keyboard_remainder INTEGER NOT NULL, mouse_remainder INTEGER NOT NULL);
      INSERT INTO growth_state VALUES (1, 1, 0, 0, 0, 0);
      CREATE TABLE growth_daily (date TEXT PRIMARY KEY, experience INTEGER NOT NULL);
      CREATE TABLE growth_transactions (id INTEGER PRIMARY KEY, date TEXT NOT NULL, experience INTEGER NOT NULL);
      CREATE TABLE level_rewards (level INTEGER PRIMARY KEY, reward TEXT NOT NULL);
      PRAGMA user_version = 2; COMMIT;`);
    if (version < 3) {
      this.db
        .exec(`BEGIN; CREATE TABLE wallet (id INTEGER PRIMARY KEY CHECK(id = 1), balance INTEGER NOT NULL CHECK(balance >= 0));
      INSERT INTO wallet VALUES (1, 0);
      CREATE TABLE inventory (item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity >= 0));
      CREATE TABLE unlocks (id TEXT PRIMARY KEY);
      CREATE TABLE granted_rewards (level INTEGER PRIMARY KEY, reward TEXT NOT NULL);`);
      try {
        const rewards = this.db
          .prepare('SELECT level, reward FROM level_rewards ORDER BY level')
          .all() as unknown as { level: number; reward: string }[];
        for (const reward of rewards) grantLevelReward(this.db, reward.level, reward.reward);
        this.db.exec('PRAGMA user_version = 3; COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        throw error;
      }
    }
    if (version < 4)
      this.db.exec(
        `BEGIN; CREATE TABLE appearance (id INTEGER PRIMARY KEY CHECK(id = 1), character TEXT NOT NULL, scene TEXT NOT NULL, head TEXT, neck TEXT); INSERT INTO appearance VALUES (1, 'cat', 'transparent', NULL, NULL); PRAGMA user_version = 4; COMMIT;`,
      );
    if (version < 5)
      this.db.exec(
        `BEGIN; CREATE TABLE focus_timer (id INTEGER PRIMARY KEY CHECK(id = 1), status TEXT NOT NULL, kind TEXT NOT NULL, duration_ms INTEGER NOT NULL, remaining_ms INTEGER NOT NULL, deadline INTEGER, completed_sessions INTEGER NOT NULL, focus_ms INTEGER NOT NULL); INSERT INTO focus_timer VALUES (1, 'idle', 'focus', 1500000, 0, NULL, 0, 0); PRAGMA user_version = 5; COMMIT;`,
      );
    if (version < 6)
      this.db.exec(
        `BEGIN; CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT NOT NULL, updated_at INTEGER NOT NULL); PRAGMA user_version = 6; COMMIT;`,
      );
    if (version < 7)
      this.db.exec(
        `BEGIN; ALTER TABLE daily_statistics ADD COLUMN active_seconds REAL NOT NULL DEFAULT 0 CHECK(active_seconds >= 0); PRAGMA user_version = 7; COMMIT;`,
      );
    if (version < 8)
      this.db.exec(
        `BEGIN; CREATE TABLE crafting_transactions (id INTEGER PRIMARY KEY, recipe_id TEXT NOT NULL, spent_currency INTEGER NOT NULL, created_at INTEGER NOT NULL); PRAGMA user_version = 8; COMMIT;`,
      );
    if (version < 9)
      this.db.exec(
        `BEGIN;
        CREATE TABLE tool_settings (tool_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL CHECK(enabled IN (0, 1)));
        CREATE TABLE sedentary_state (id INTEGER PRIMARY KEY CHECK(id = 1), interval_minutes INTEGER NOT NULL, inactivity_reset_minutes INTEGER NOT NULL, quiet_start TEXT, quiet_end TEXT, last_activity_at INTEGER, active_since INTEGER, last_reminded_at INTEGER, snoozed_until INTEGER);
        INSERT INTO sedentary_state VALUES (1, 60, 5, NULL, NULL, NULL, NULL, NULL, NULL);
        PRAGMA user_version = 9; COMMIT;`,
      );
    if (version < 10)
      this.db.exec(
        `BEGIN;
        CREATE TABLE focus_sessions (id INTEGER PRIMARY KEY, date TEXT NOT NULL, duration_ms INTEGER NOT NULL, completed_at INTEGER NOT NULL);
        CREATE TABLE focus_preferences (id INTEGER PRIMARY KEY CHECK(id = 1), sound_enabled INTEGER NOT NULL CHECK(sound_enabled IN (0, 1)));
        INSERT INTO focus_preferences VALUES (1, 1);
        PRAGMA user_version = 10; COMMIT;`,
      );
    if (version < 11)
      this.db.exec(
        `BEGIN;
        ALTER TABLE notes ADD COLUMN color TEXT NOT NULL DEFAULT 'yellow';
        ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0, 1));
        PRAGMA user_version = 11; COMMIT;`,
      );
    if (version < 12)
      this.db.exec(
        `BEGIN; CREATE TABLE reward_events (level INTEGER PRIMARY KEY, reward TEXT NOT NULL, date TEXT NOT NULL); PRAGMA user_version = 12; COMMIT;`,
      );
    if (version < 13)
      this.db.exec(
        `BEGIN; ALTER TABLE growth_daily ADD COLUMN focus_experience INTEGER NOT NULL DEFAULT 0 CHECK(focus_experience >= 0); PRAGMA user_version = 13; COMMIT;`,
      );
    if (version < 14)
      this.db.exec(
        `BEGIN;
        CREATE TABLE app_preferences (id INTEGER PRIMARY KEY CHECK(id = 1), animations_enabled INTEGER NOT NULL CHECK(animations_enabled IN (0, 1)), onboarding_completed INTEGER NOT NULL CHECK(onboarding_completed IN (0, 1)), launch_at_login INTEGER NOT NULL CHECK(launch_at_login IN (0, 1)));
        INSERT INTO app_preferences VALUES (1, 1, 0, 0);
        PRAGMA user_version = 14; COMMIT;`,
      );
  }
  get notes(): NotesService {
    return new NotesService(this.db);
  }
  get focus(): FocusService {
    return new FocusService(this.db);
  }
  get appearance(): AppearanceService {
    return new AppearanceService(this.db);
  }
  get crafting(): CraftingService {
    return new CraftingService(this.db);
  }
  get tools(): ToolRegistryService {
    return new ToolRegistryService(this.db);
  }
  get sedentary(): SedentaryService {
    return new SedentaryService(this.db);
  }
  get summary(): SummaryService {
    return new SummaryService(this.db);
  }
  get preferences(): AppPreferencesService {
    return new AppPreferencesService(this.db);
  }
  growth(): GrowthSnapshot {
    const state = this.db
      .prepare(
        'SELECT level, experience, total_experience AS totalExperience, keyboard_remainder AS keyboardRemainder, mouse_remainder AS mouseRemainder FROM growth_state WHERE id = 1',
      )
      .get() as unknown as GrowthState;
    return { ...state, nextLevelExperience: requiredExperience(state.level) };
  }
  private saveGrowth(state: GrowthState): void {
    this.db
      .prepare(
        'UPDATE growth_state SET level = ?, experience = ?, total_experience = ?, keyboard_remainder = ?, mouse_remainder = ? WHERE id = 1',
      )
      .run(
        state.level,
        state.experience,
        state.totalExperience,
        state.keyboardRemainder,
        state.mouseRemainder,
      );
  }
  private grantRewards(levels: number[], date: string): void {
    for (const level of levels) {
      const reward = LEVEL_REWARDS[level];
      if (!reward) continue;
      this.db
        .prepare('INSERT OR IGNORE INTO level_rewards(level, reward) VALUES (?, ?)')
        .run(level, reward);
      grantLevelReward(this.db, level, reward, date);
    }
  }
  private awardFocusExperience(date: string): void {
    const daily = this.db
      .prepare('SELECT focus_experience AS focusExperience FROM growth_daily WHERE date = ?')
      .get(date) as { focusExperience: number } | undefined;
    const awarded = Math.min(
      GROWTH_RULES.focusSessionExp,
      Math.max(0, GROWTH_RULES.dailyFocusExpCap - (daily?.focusExperience ?? 0)),
    );
    if (awarded === 0) return;
    const result = settleExperience(this.growth(), awarded);
    this.saveGrowth(result.state);
    this.db
      .prepare(
        'INSERT INTO growth_daily(date, experience, focus_experience) VALUES (?, 0, ?) ON CONFLICT(date) DO UPDATE SET focus_experience = focus_experience + excluded.focus_experience',
      )
      .run(date, awarded);
    this.db
      .prepare('INSERT INTO growth_transactions(date, experience) VALUES (?, ?)')
      .run(date, awarded);
    this.grantRewards(result.levels, date);
  }
  completeFocusIfDue(now = Date.now()): boolean {
    return this.focus.completeIfDue(now, (date) => this.awardFocusExperience(date));
  }
  add(batch: DailyStatistics): void {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(batch.date) ||
      !Number.isSafeInteger(batch.keyboardCount) ||
      batch.keyboardCount < 0 ||
      !Number.isSafeInteger(batch.mouseCount) ||
      batch.mouseCount < 0 ||
      !Number.isFinite(batch.activeSeconds) ||
      batch.activeSeconds < 0
    )
      throw new Error('无效的统计数据');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare(
          `INSERT INTO daily_statistics(date, keyboard_count, mouse_count, active_seconds) VALUES (?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET
      keyboard_count = keyboard_count + excluded.keyboard_count, mouse_count = mouse_count + excluded.mouse_count,
      active_seconds = active_seconds + excluded.active_seconds`,
        )
        .run(batch.date, batch.keyboardCount, batch.mouseCount, batch.activeSeconds);
      const daily = this.db
        .prepare('SELECT experience FROM growth_daily WHERE date = ?')
        .get(batch.date) as { experience: number } | undefined;
      const result = settleInput(
        this.growth(),
        batch.keyboardCount,
        batch.mouseCount,
        daily?.experience ?? 0,
      );
      this.saveGrowth(result.state);
      if (result.awarded) {
        this.db
          .prepare(
            'INSERT INTO growth_daily(date, experience, focus_experience) VALUES (?, ?, 0) ON CONFLICT(date) DO UPDATE SET experience = experience + excluded.experience',
          )
          .run(batch.date, result.awarded);
        this.db
          .prepare('INSERT INTO growth_transactions(date, experience) VALUES (?, ?)')
          .run(batch.date, result.awarded);
      }
      this.grantRewards(result.levels, batch.date);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  all(): DailyStatistics[] {
    return this.db
      .prepare(
        'SELECT date, keyboard_count AS keyboardCount, mouse_count AS mouseCount, active_seconds AS activeSeconds FROM daily_statistics ORDER BY date',
      )
      .all() as unknown as DailyStatistics[];
  }
  snapshot(now = new Date()): StatisticsSnapshot {
    const records = this.all();
    const byDate = new Map(records.map((row) => [row.date, row]));
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
      const key = localDate(date);
      return byDate.get(key) ?? { date: key, keyboardCount: 0, mouseCount: 0, activeSeconds: 0 };
    });
    const todayGrowth = this.db
      .prepare(
        'SELECT experience + focus_experience AS experience FROM growth_daily WHERE date = ?',
      )
      .get(days[29].date) as { experience: number } | undefined;
    return {
      growth: this.growth(),
      todayExperience: todayGrowth?.experience ?? 0,
      today: days[29],
      days,
      total: records.reduce(
        (sum, row) => ({
          keyboardCount: sum.keyboardCount + row.keyboardCount,
          mouseCount: sum.mouseCount + row.mouseCount,
          activeSeconds: sum.activeSeconds + row.activeSeconds,
        }),
        { keyboardCount: 0, mouseCount: 0, activeSeconds: 0 },
      ),
    };
  }
  clear(): void {
    this.db.exec('DELETE FROM daily_statistics');
  }
  resetUserData(): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.exec(`
        DELETE FROM daily_statistics;
        DELETE FROM growth_daily;
        DELETE FROM growth_transactions;
        DELETE FROM level_rewards;
        DELETE FROM reward_events;
        DELETE FROM granted_rewards;
        DELETE FROM inventory;
        DELETE FROM unlocks;
        DELETE FROM crafting_transactions;
        DELETE FROM focus_sessions;
        DELETE FROM notes;
        DELETE FROM tool_settings;
        UPDATE growth_state SET level = 1, experience = 0, total_experience = 0, keyboard_remainder = 0, mouse_remainder = 0 WHERE id = 1;
        UPDATE wallet SET balance = 0 WHERE id = 1;
        UPDATE appearance SET character = 'cat', scene = 'transparent', head = NULL, neck = NULL WHERE id = 1;
        UPDATE focus_timer SET status = 'idle', kind = 'focus', duration_ms = 1500000, remaining_ms = 0, deadline = NULL, completed_sessions = 0, focus_ms = 0 WHERE id = 1;
        UPDATE focus_preferences SET sound_enabled = 1 WHERE id = 1;
        UPDATE sedentary_state SET interval_minutes = 60, inactivity_reset_minutes = 5, quiet_start = NULL, quiet_end = NULL, last_activity_at = NULL, active_since = NULL, last_reminded_at = NULL, snoozed_until = NULL WHERE id = 1;
        UPDATE app_preferences SET animations_enabled = 1, onboarding_completed = 0, launch_at_login = 0 WHERE id = 1;
      `);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  close(): void {
    this.db.close();
  }
}
