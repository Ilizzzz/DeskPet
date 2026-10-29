import type { RewardSpec } from '../../shared/types/reward';

/**
 * 成长规则集中配置，结算与服务层不再散落常量。
 *
 * v1.1 起删除每日键鼠/专注经验上限：所有输入都会按余数累积成经验，
 * 每次专注固定发放经验和星星币。
 */
export const GROWTH_RULES = {
  keyboardCountPerExp: 25,
  mouseCountPerExp: 8,
  focusSessionExp: 10,
  starsPerFocus: 2,
  maxLevel: 1000,
} as const;

/**
 * Version 2 等级奖励统一发放星星币；装扮由里程碑、掉落或兑换获得。
 *
 * 角色、地毯和五件纪念装扮由解锁表按等级自动进入账户，其他装扮走掉落或兑换；
 * 结算时用 granted_rewards 去重，同一等级只会发放一次。
 */
export const LEVEL_REWARDS: Readonly<Record<number, readonly RewardSpec[]>> = {
  2: [{ type: 'coins', amount: 30 }],
  3: [{ type: 'coins', amount: 20 }],
  4: [{ type: 'coins', amount: 40 }],
  5: [
    { type: 'coins', amount: 50 },
    { type: 'coins', amount: 20 },
  ],
  6: [{ type: 'coins', amount: 25 }],
  8: [{ type: 'coins', amount: 40 }],
  10: [
    { type: 'coins', amount: 80 },
    { type: 'coins', amount: 40 },
  ],
  12: [{ type: 'coins', amount: 30 }],
  15: [{ type: 'coins', amount: 50 }],
  18: [
    { type: 'coins', amount: 100 },
    { type: 'coins', amount: 50 },
  ],
  20: [{ type: 'coins', amount: 75 }],
  24: [
    { type: 'coins', amount: 120 },
    { type: 'coins', amount: 50 },
  ],
  28: [{ type: 'coins', amount: 75 }],
  30: [
    { type: 'coins', amount: 150 },
    { type: 'coins', amount: 125 },
  ],
};
