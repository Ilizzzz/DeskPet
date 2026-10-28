import type { DatabaseSync } from 'node:sqlite';
import { localDate } from '../../shared/types/statistics';
import type { DailySummary } from '../../shared/types/summary';

export class SummaryService {
  constructor(private readonly db: DatabaseSync) {}

  get(now = new Date()): DailySummary {
    const date = localDate(now);
    const statistics = this.db
      .prepare(
        'SELECT keyboard_count AS keyboardCount, mouse_count AS mouseCount, active_seconds AS activeSeconds FROM daily_statistics WHERE date = ?',
      )
      .get(date) as
      { keyboardCount: number; mouseCount: number; activeSeconds: number } | undefined;
    const growth = this.db.prepare('SELECT level FROM growth_state WHERE id = 1').get() as {
      level: number;
    };
    const dailyGrowth = this.db
      .prepare(
        'SELECT experience + focus_experience AS experience FROM growth_daily WHERE date = ?',
      )
      .get(date) as { experience: number } | undefined;
    const focus = this.db
      .prepare(
        'SELECT COALESCE(SUM(duration_ms), 0) AS duration FROM focus_sessions WHERE date = ?',
      )
      .get(date) as { duration: number };
    const rewards = this.db
      .prepare('SELECT reward FROM reward_events WHERE date = ? ORDER BY level')
      .all(date) as unknown as { reward: string }[];
    return {
      date,
      keyboardCount: statistics?.keyboardCount ?? 0,
      mouseCount: statistics?.mouseCount ?? 0,
      activeMinutes: Math.round((statistics?.activeSeconds ?? 0) / 60),
      experience: dailyGrowth?.experience ?? 0,
      level: growth.level,
      focusMinutes: Math.round(focus.duration / 60_000),
      rewards: rewards.map((entry) => entry.reward),
    };
  }
}
