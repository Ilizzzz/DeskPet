export const GROWTH_RULES = {
  keyboardCountPerExp: 25,
  mouseCountPerExp: 8,
  dailyInputExpCap: 200,
  focusSessionExp: 10,
  dailyFocusExpCap: 50,
  maxLevel: 1000,
} as const;

// 等级奖励集中配置，结算和界面不再散落等级判断。
export const LEVEL_REWARDS: Readonly<Record<number, string>> = {
  2: 'hat_blue',
  3: 'currency_50',
  5: 'forest_home',
  7: 'scarf',
  10: 'fox',
};
