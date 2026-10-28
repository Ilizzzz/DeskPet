import type { RewardSpec } from './reward';

export type AchievementCondition =
  | { type: 'totalInput'; target: number }
  | { type: 'keyboard'; target: number }
  | { type: 'mouse'; target: number }
  | { type: 'focusSessions'; target: number }
  | { type: 'level'; target: number }
  | { type: 'uniqueItems'; target: number }
  | { type: 'craftCount'; target: number }
  | { type: 'checkinStreak'; target: number }
  | { type: 'scenes'; target: number }
  | { type: 'characters'; target: number };

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  rewards: readonly RewardSpec[];
}

export interface AchievementState extends AchievementDefinition {
  progress: number;
  claimable: boolean;
  claimed: boolean;
}
