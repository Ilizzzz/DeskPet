import type { RewardSpec } from './reward';

export interface CheckinStatus {
  checkedInToday: boolean;
  /** 连续签到天数；今天已签到时包含今天。 */
  streak: number;
  /** 今天签到可获得的奖励；已签到时为今天的实际奖励。 */
  todayReward: readonly RewardSpec[];
  nextStreak: number;
  nextReward: readonly RewardSpec[];
}
