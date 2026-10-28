import type { RewardSpec } from '../../shared/types/reward';

/**
 * 成长规则集中配置，结算与服务层不再散落常量。
 *
 * v1.1 起删除每日键鼠/专注经验上限：所有输入都会按余数累积成经验，
 * 每次专注固定发放经验、星星币，并每累计若干次额外给星光碎片。
 */
export const GROWTH_RULES = {
  keyboardCountPerExp: 25,
  mouseCountPerExp: 8,
  focusSessionExp: 10,
  starsPerFocus: 2,
  focusSessionsPerFragment: 3,
  maxLevel: 1000,
} as const;

/**
 * 等级奖励只发星星币与星光碎片。
 *
 * 装扮、角色和场景改由解锁表按等级自动进入账户，避免奖励里混入物品；
 * 结算时用 granted_rewards 去重，同一等级只会发放一次。
 */
export const LEVEL_REWARDS: Readonly<Record<number, readonly RewardSpec[]>> = {
  2: [{ type: 'coins', amount: 30 }],
  3: [{ type: 'fragments', amount: 1 }],
  4: [{ type: 'coins', amount: 40 }],
  5: [
    { type: 'coins', amount: 50 },
    { type: 'fragments', amount: 1 },
  ],
  6: [{ type: 'fragments', amount: 1 }],
  8: [{ type: 'fragments', amount: 2 }],
  10: [
    { type: 'coins', amount: 80 },
    { type: 'fragments', amount: 2 },
  ],
  12: [{ type: 'fragments', amount: 1 }],
  15: [{ type: 'fragments', amount: 2 }],
  18: [
    { type: 'coins', amount: 100 },
    { type: 'fragments', amount: 2 },
  ],
  20: [{ type: 'fragments', amount: 3 }],
  24: [
    { type: 'coins', amount: 120 },
    { type: 'fragments', amount: 2 },
  ],
  28: [{ type: 'fragments', amount: 3 }],
  30: [
    { type: 'coins', amount: 150 },
    { type: 'fragments', amount: 5 },
  ],
};
