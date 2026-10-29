import type { DatabaseSync } from 'node:sqlite';
import type { CheckinStatus } from '../../shared/types/checkin';
import type { RewardSpec } from '../../shared/types/reward';
import { localDate } from '../../shared/types/statistics';
import { grantReward } from '../../services/rewards/rewards';

/**
 * 签到奖励统一使用星星币；连续第 7 天额外获得 40 枚。
 */
export function checkinReward(streak: number): RewardSpec[] {
  return [{ type: 'coins', amount: 10 + 5 * Math.min(streak, 7) + (streak % 7 === 0 ? 40 : 0) }];
}

function yesterdayOf(now: Date): string {
  return localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
}

function parseReward(serialized: string): RewardSpec[] {
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) throw new Error('签到奖励数据损坏');
  return parsed as RewardSpec[];
}

type CheckinRow = { date: string; streak: number; reward: string };

export class CheckinService {
  constructor(private readonly db: DatabaseSync) {}

  status(now = new Date()): CheckinStatus {
    const today = localDate(now);
    const row = this.db
      .prepare('SELECT date, streak, reward FROM checkins ORDER BY date DESC LIMIT 1')
      .get() as unknown as CheckinRow | undefined;
    if (row && row.date === today) {
      const nextStreak = row.streak + 1;
      return {
        checkedInToday: true,
        streak: row.streak,
        todayReward: parseReward(row.reward),
        nextStreak,
        nextReward: checkinReward(nextStreak),
      };
    }
    // 只有昨天签过到，连续天数才会延续；否则今天从 1 重新开始。
    const streak = row && row.date === yesterdayOf(now) ? row.streak : 0;
    const nextStreak = streak + 1;
    return {
      checkedInToday: false,
      streak,
      // 未签到时提前展示今天签到能拿到的奖励。
      todayReward: checkinReward(nextStreak),
      nextStreak,
      nextReward: checkinReward(nextStreak),
    };
  }

  checkIn(now = new Date()): CheckinStatus {
    const current = this.status(now);
    if (current.checkedInToday) throw new Error('今天已经签到');
    const today = localDate(now);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db
        .prepare('INSERT INTO checkins(date, streak, reward, created_at) VALUES (?, ?, ?, ?)')
        .run(today, current.nextStreak, JSON.stringify(current.nextReward), now.getTime());
      for (const reward of current.nextReward) grantReward(this.db, reward);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
    return this.status(now);
  }
}
