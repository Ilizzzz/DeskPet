import type { GrowthState } from '../../shared/types/growth';
import { GROWTH_RULES } from '../../data/catalogs/growth';
export type { GrowthState, GrowthSnapshot } from '../../shared/types/growth';
export { GROWTH_RULES, LEVEL_REWARDS } from '../../data/catalogs/growth';

export function requiredExperience(level: number): number {
  if (!Number.isSafeInteger(level) || level < 1 || level > GROWTH_RULES.maxLevel)
    throw new Error('无效等级');
  return 100 + 30 * (level - 1) + 5 * (level - 1) ** 2;
}
export function settleExperience(
  state: GrowthState,
  awarded: number,
): { state: GrowthState; awarded: number; levels: number[] } {
  if (!Number.isSafeInteger(awarded) || awarded < 0) throw new Error('无效经验数据');
  let level = state.level;
  let experience = state.experience + awarded;
  const levels: number[] = [];
  while (level < GROWTH_RULES.maxLevel && experience >= requiredExperience(level)) {
    experience -= requiredExperience(level);
    levels.push(++level);
  }
  return {
    state: { ...state, level, experience, totalExperience: state.totalExperience + awarded },
    awarded,
    levels,
  };
}
/**
 * 键鼠输入结算。
 *
 * v1.1 删除了每日经验上限：超过整单位的部分会继续换经验，只有不足 1 EXP 的
 * 余数按设备独立保留，跨批次累积，保证小批量输入不会被丢弃。
 */
export function settleInput(
  state: GrowthState,
  keyboard: number,
  mouse: number,
): { state: GrowthState; awarded: number; levels: number[] } {
  for (const n of [keyboard, mouse])
    if (!Number.isSafeInteger(n) || n < 0) throw new Error('无效成长数据');
  const keys = state.keyboardRemainder + keyboard;
  const clicks = state.mouseRemainder + mouse;
  const awarded =
    Math.floor(keys / GROWTH_RULES.keyboardCountPerExp) +
    Math.floor(clicks / GROWTH_RULES.mouseCountPerExp);
  const settled = settleExperience(state, awarded);
  return {
    state: {
      ...settled.state,
      keyboardRemainder: keys % GROWTH_RULES.keyboardCountPerExp,
      mouseRemainder: clicks % GROWTH_RULES.mouseCountPerExp,
    },
    awarded,
    levels: settled.levels,
  };
}
