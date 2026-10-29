import { DatabaseSync } from 'node:sqlite';
import { NotesService } from '../../tools/notes/notes-service';
import { FocusService } from '../../tools/focus/focus-service';
import { AppearanceService } from '../../features/appearance/appearance-service';
import { EconomyService } from '../../features/inventory/economy-service';
import { ToolRegistryService } from '../../tools/tool-registry';
import { SedentaryService } from '../../tools/sedentary/sedentary-service';
import { SummaryService } from '../../tools/summary/summary-service';
import { AppPreferencesService } from '../settings/app-preferences-service';
import { CheckinService } from '../../features/checkin/checkin-service';
import { AchievementService } from '../../features/achievements/achievement-service';
import { TodoService } from '../../tools/todo/todo-service';
import { CountdownService } from '../../tools/countdown/countdown-service';
import { AnniversaryService } from '../../tools/anniversary/anniversary-service';
import { WaterService } from '../../tools/water/water-service';
import { grantLevelReward, grantReward } from '../rewards/rewards';
import { DropService } from '../../features/inventory/drop-service';
import type { DropEvent } from '../../shared/types/economy';
import { UNLOCKS } from '../../data/catalogs/unlocks';
import {
  LEVEL_REWARDS,
  GROWTH_RULES,
  requiredExperience,
  settleExperience,
  settleInput,
  type GrowthState,
  type GrowthSnapshot,
} from '../../features/growth/growth';
import {
  localDate,
  type DailyStatistics,
  type StatisticsSnapshot,
} from '../../shared/types/statistics';

/** 当前数据库结构版本；升级时必须追加迁移而不重建用户数据库。 */
const SCHEMA_VERSION = 16;

export class StatisticsStore {
  private readonly db: DatabaseSync;
  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    const version = (this.db.prepare('PRAGMA user_version').get() as { user_version: number })
      .user_version;
    const isNewDatabase = version === 0;
    if (version > SCHEMA_VERSION) throw new Error('统计数据库版本高于当前应用支持的版本');
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
    if (version < 15) this.migrateAppearanceAndFeatures();
    if (version < 16) this.migrateVersion2(isNewDatabase);
    this.initializeProgression();
  }

  /** Version 2：键盘掉落、发现/心愿、统一货币记录与桌宠显示偏好。 */
  private migrateVersion2(isNewDatabase: boolean): void {
    this.db.exec('BEGIN');
    try {
      this.db.exec(`
        CREATE TABLE input_drop_state (id INTEGER PRIMARY KEY CHECK(id = 1), keyboard_remainder INTEGER NOT NULL DEFAULT 0 CHECK(keyboard_remainder >= 0));
        INSERT INTO input_drop_state VALUES (1, 0);
        CREATE TABLE drop_events (id INTEGER PRIMARY KEY, item_id TEXT NOT NULL, created_at INTEGER NOT NULL);
        CREATE TABLE item_discoveries (item_id TEXT PRIMARY KEY, first_acquired_at INTEGER NOT NULL);
        INSERT OR IGNORE INTO item_discoveries(item_id, first_acquired_at)
          SELECT item_id, 0 FROM inventory WHERE quantity > 0;
        CREATE TABLE item_wishlist (id INTEGER PRIMARY KEY CHECK(id = 1), item_id TEXT);
        INSERT INTO item_wishlist VALUES (1, NULL);
        CREATE TABLE economy_transactions (id INTEGER PRIMARY KEY, kind TEXT NOT NULL, item_id TEXT, amount INTEGER NOT NULL, created_at INTEGER NOT NULL);
        ALTER TABLE app_preferences ADD COLUMN pet_scale INTEGER NOT NULL DEFAULT 100 CHECK(pet_scale IN (25, 50, 75, 100, 125));
        ALTER TABLE app_preferences ADD COLUMN edge_snap_enabled INTEGER NOT NULL DEFAULT 1 CHECK(edge_snap_enabled IN (0, 1));
        ALTER TABLE app_preferences ADD COLUMN input_reactions_enabled INTEGER NOT NULL DEFAULT 1 CHECK(input_reactions_enabled IN (0, 1));
      `);
      if (isNewDatabase)
        this.db.exec(`
          INSERT INTO inventory(item_id, quantity) VALUES ('cap_blue', 1)
            ON CONFLICT(item_id) DO UPDATE SET quantity = MAX(quantity, 1);
          INSERT OR IGNORE INTO item_discoveries(item_id, first_acquired_at) VALUES ('cap_blue', 0);
        `);
      this.db.exec('PRAGMA user_version = 16; COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 15 版：补全五槽位外观、碎片货币、签到/成就/新工具表，并把旧素材 ID 迁移到新目录。
   *
   * 旧版本只有 hat_blue/hat_star/scarf 三件装扮和 fox 角色，用户数据必须无损迁移。
   */
  private migrateAppearanceAndFeatures(): void {
    this.db.exec(`BEGIN;
      ALTER TABLE wallet ADD COLUMN fragments INTEGER NOT NULL DEFAULT 0 CHECK(fragments >= 0);
      ALTER TABLE appearance ADD COLUMN face TEXT;
      ALTER TABLE appearance ADD COLUMN hand TEXT;
      ALTER TABLE appearance ADD COLUMN back TEXT;
      CREATE TABLE granted_unlocks (id TEXT PRIMARY KEY, granted_at INTEGER NOT NULL);
      CREATE TABLE checkins (date TEXT PRIMARY KEY, streak INTEGER NOT NULL, reward TEXT NOT NULL, created_at INTEGER NOT NULL);
      CREATE TABLE achievements (id TEXT PRIMARY KEY, claimed_at INTEGER NOT NULL);
      CREATE TABLE todos (id INTEGER PRIMARY KEY, content TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0, 1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      CREATE TABLE countdowns (id INTEGER PRIMARY KEY, label TEXT NOT NULL, ends_at INTEGER NOT NULL, created_at INTEGER NOT NULL, notified INTEGER NOT NULL DEFAULT 0 CHECK(notified IN (0, 1)));
      CREATE TABLE anniversaries (id INTEGER PRIMARY KEY, title TEXT NOT NULL, date TEXT NOT NULL, repeat_yearly INTEGER NOT NULL DEFAULT 1 CHECK(repeat_yearly IN (0, 1)), created_at INTEGER NOT NULL);
      CREATE TABLE water_state (id INTEGER PRIMARY KEY CHECK(id = 1), interval_minutes INTEGER NOT NULL, daily_goal INTEGER NOT NULL, date TEXT NOT NULL, cups_today INTEGER NOT NULL, last_drink_at INTEGER, last_reminded_at INTEGER);
      INSERT INTO water_state VALUES (1, 60, 8, '', 0, NULL, NULL);
      -- 角色 fox 替换为同色系的老虎，保留已有解锁。
      INSERT OR IGNORE INTO unlocks(id) SELECT 'tiger' FROM unlocks WHERE id = 'fox';
      DELETE FROM unlocks WHERE id = 'fox';
      UPDATE appearance SET character = 'tiger' WHERE character = 'fox';
      -- 三件旧装扮改为新目录 ID，避免背包出现未知物品。
      INSERT OR IGNORE INTO inventory(item_id, quantity) VALUES ('cap_blue', 0);
      UPDATE inventory SET quantity = quantity + (SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE item_id = 'hat_blue') WHERE item_id = 'cap_blue';
      DELETE FROM inventory WHERE item_id = 'hat_blue';
      INSERT OR IGNORE INTO inventory(item_id, quantity) VALUES ('hat_top', 0);
      UPDATE inventory SET quantity = quantity + (SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE item_id = 'hat_star') WHERE item_id = 'hat_top';
      DELETE FROM inventory WHERE item_id = 'hat_star';
      INSERT OR IGNORE INTO inventory(item_id, quantity) VALUES ('scarf_red', 0);
      UPDATE inventory SET quantity = quantity + (SELECT COALESCE(SUM(quantity), 0) FROM inventory WHERE item_id = 'scarf') WHERE item_id = 'scarf_red';
      DELETE FROM inventory WHERE item_id = 'scarf';
      UPDATE appearance SET head = 'cap_blue' WHERE head = 'hat_blue';
      UPDATE appearance SET head = 'hat_top' WHERE head = 'hat_star';
      UPDATE appearance SET neck = 'scarf_red' WHERE neck = 'scarf';
      PRAGMA user_version = 15;
    COMMIT;`);
  }

  /** 老用户升级后按当前等级补发所有应解锁内容；granted_unlocks 保证只发一次。 */
  private initializeProgression(): void {
    const state = this.growth();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.grantUnlocksUpTo(state.level);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
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
  get economy(): EconomyService {
    return new EconomyService(this.db);
  }
  get drops(): DropService {
    return new DropService(this.db);
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
  get checkin(): CheckinService {
    return new CheckinService(this.db);
  }
  get achievements(): AchievementService {
    return new AchievementService(this.db);
  }
  get todos(): TodoService {
    return new TodoService(this.db);
  }
  get countdowns(): CountdownService {
    return new CountdownService(this.db);
  }
  get anniversaries(): AnniversaryService {
    return new AnniversaryService(this.db);
  }
  get water(): WaterService {
    return new WaterService(this.db);
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
  private grantLevelRewards(levels: number[], date: string): void {
    for (const level of levels) {
      const rewards = LEVEL_REWARDS[level];
      if (!rewards?.length) continue;
      const serialized = JSON.stringify(rewards);
      const inserted = this.db
        .prepare('INSERT OR IGNORE INTO granted_rewards(level, reward) VALUES (?, ?)')
        .run(level, serialized);
      if (inserted.changes === 0) continue;
      for (const reward of rewards) grantReward(this.db, reward);
      this.db
        .prepare('INSERT OR IGNORE INTO reward_events(level, reward, date) VALUES (?, ?, ?)')
        .run(level, serialized, date);
    }
  }
  /**
   * 等级到达后自动把角色、地毯和专属里程碑装扮放进用户账户。
   *
   * 工具不需要发放实物，由 ToolRegistryService 按等级实时判断是否可用。
   */
  private grantUnlocksUpTo(level: number): void {
    for (const entry of UNLOCKS) {
      if (entry.level > level) continue;
      const inserted = this.db
        .prepare('INSERT OR IGNORE INTO granted_unlocks(id, granted_at) VALUES (?, ?)')
        .run(entry.id, Date.now());
      if (inserted.changes === 0) continue;
      if (entry.category === 'item') {
        grantReward(this.db, { type: 'item', itemId: entry.id, quantity: 1 });
        this.db
          .prepare(
            'INSERT OR IGNORE INTO item_discoveries(item_id, first_acquired_at) VALUES (?, ?)',
          )
          .run(entry.id, Date.now());
      } else if (entry.category === 'character')
        grantReward(this.db, { type: 'character', id: entry.id });
      else if (entry.category === 'scene') grantReward(this.db, { type: 'scene', id: entry.id });
    }
  }
  private awardFocusExperience(date: string): void {
    const result = settleExperience(this.growth(), GROWTH_RULES.focusSessionExp);
    this.saveGrowth(result.state);
    this.db
      .prepare(
        'INSERT INTO growth_daily(date, experience, focus_experience) VALUES (?, 0, ?) ON CONFLICT(date) DO UPDATE SET focus_experience = focus_experience + excluded.focus_experience',
      )
      .run(date, GROWTH_RULES.focusSessionExp);
    this.db
      .prepare('INSERT INTO growth_transactions(date, experience) VALUES (?, ?)')
      .run(date, GROWTH_RULES.focusSessionExp);
    this.grantLevelRewards(result.levels, date);
    this.grantUnlocksUpTo(result.state.level);
    // Version 2 统一使用星星币，专注奖励不再产生新碎片。
    grantReward(this.db, { type: 'coins', amount: GROWTH_RULES.starsPerFocus });
  }
  completeFocusIfDue(now = Date.now()): boolean {
    return this.focus.completeIfDue(now, (date) => this.awardFocusExperience(date));
  }
  add(batch: DailyStatistics): DropEvent[] {
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
      const result = settleInput(this.growth(), batch.keyboardCount, batch.mouseCount);
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
      this.grantLevelRewards(result.levels, batch.date);
      this.grantUnlocksUpTo(result.state.level);
      const drops = this.drops.addKeyboard(batch.keyboardCount);
      this.db.exec('COMMIT');
      return drops;
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
        DELETE FROM granted_unlocks;
        DELETE FROM inventory;
        DELETE FROM unlocks;
        DELETE FROM crafting_transactions;
        DELETE FROM drop_events;
        DELETE FROM item_discoveries;
        DELETE FROM economy_transactions;
        DELETE FROM focus_sessions;
        DELETE FROM notes;
        DELETE FROM tool_settings;
        DELETE FROM checkins;
        DELETE FROM achievements;
        DELETE FROM todos;
        DELETE FROM countdowns;
        DELETE FROM anniversaries;
        UPDATE growth_state SET level = 1, experience = 0, total_experience = 0, keyboard_remainder = 0, mouse_remainder = 0 WHERE id = 1;
        UPDATE wallet SET balance = 0, fragments = 0 WHERE id = 1;
        UPDATE appearance SET character = 'cat', scene = 'transparent', head = NULL, neck = NULL, face = NULL, hand = NULL, back = NULL WHERE id = 1;
        UPDATE input_drop_state SET keyboard_remainder = 0 WHERE id = 1;
        UPDATE item_wishlist SET item_id = NULL WHERE id = 1;
        UPDATE focus_timer SET status = 'idle', kind = 'focus', duration_ms = 1500000, remaining_ms = 0, deadline = NULL, completed_sessions = 0, focus_ms = 0 WHERE id = 1;
        UPDATE focus_preferences SET sound_enabled = 1 WHERE id = 1;
        UPDATE sedentary_state SET interval_minutes = 60, inactivity_reset_minutes = 5, quiet_start = NULL, quiet_end = NULL, last_activity_at = NULL, active_since = NULL, last_reminded_at = NULL, snoozed_until = NULL WHERE id = 1;
        UPDATE water_state SET interval_minutes = 60, daily_goal = 8, date = '', cups_today = 0, last_drink_at = NULL, last_reminded_at = NULL WHERE id = 1;
        UPDATE app_preferences SET animations_enabled = 1, onboarding_completed = 0, launch_at_login = 0, pet_scale = 100, edge_snap_enabled = 1, input_reactions_enabled = 1 WHERE id = 1;
        INSERT INTO inventory(item_id, quantity) VALUES ('cap_blue', 1);
        INSERT INTO item_discoveries(item_id, first_acquired_at) VALUES ('cap_blue', 0);
      `);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    this.initializeProgression();
  }
  close(): void {
    this.db.close();
  }
}
