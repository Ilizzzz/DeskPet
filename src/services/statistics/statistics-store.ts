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
    if (version > 1) throw new Error('统计数据库版本高于当前应用支持的版本');
    if (version === 0)
      this.db.exec(`BEGIN; CREATE TABLE daily_statistics (
      date TEXT PRIMARY KEY, keyboard_count INTEGER NOT NULL CHECK(keyboard_count >= 0),
      mouse_count INTEGER NOT NULL CHECK(mouse_count >= 0)); PRAGMA user_version = 1; COMMIT;`);
  }
  add(batch: DailyStatistics): void {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(batch.date) ||
      !Number.isSafeInteger(batch.keyboardCount) ||
      batch.keyboardCount < 0 ||
      !Number.isSafeInteger(batch.mouseCount) ||
      batch.mouseCount < 0
    )
      throw new Error('无效的统计数据');
    this.db
      .prepare(
        `INSERT INTO daily_statistics VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET
      keyboard_count = keyboard_count + excluded.keyboard_count, mouse_count = mouse_count + excluded.mouse_count`,
      )
      .run(batch.date, batch.keyboardCount, batch.mouseCount);
  }
  all(): DailyStatistics[] {
    return this.db
      .prepare(
        'SELECT date, keyboard_count AS keyboardCount, mouse_count AS mouseCount FROM daily_statistics ORDER BY date',
      )
      .all() as unknown as DailyStatistics[];
  }
  snapshot(now = new Date()): StatisticsSnapshot {
    const records = this.all();
    const byDate = new Map(records.map((row) => [row.date, row]));
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (29 - i));
      const key = localDate(date);
      return byDate.get(key) ?? { date: key, keyboardCount: 0, mouseCount: 0 };
    });
    return {
      today: days[29],
      days,
      total: records.reduce(
        (sum, row) => ({
          keyboardCount: sum.keyboardCount + row.keyboardCount,
          mouseCount: sum.mouseCount + row.mouseCount,
        }),
        { keyboardCount: 0, mouseCount: 0 },
      ),
    };
  }
  clear(): void {
    this.db.exec('DELETE FROM daily_statistics');
  }
  close(): void {
    this.db.close();
  }
}
