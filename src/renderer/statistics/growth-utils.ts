import { GROWTH_RULES } from '../../data/catalogs/growth';
import { requiredExperience } from '../../features/growth/growth';

/**
 * 从当前等级与当前等级内经验，计算升到目标等级还需多少经验。
 *
 * 等级经验公式在 growth 服务中维护，这里只做累加，避免界面重复实现公式。
 */
export function experienceToLevel(level: number, experience: number, targetLevel: number): number {
  if (!Number.isFinite(targetLevel) || targetLevel <= level) return 0;
  const limit = Math.min(Math.floor(targetLevel), GROWTH_RULES.maxLevel);
  let total = -experience;
  for (let current = level; current < limit; current += 1) total += requiredExperience(current);
  return Math.max(0, total);
}

/** 进度百分比，限制在 0..100，避免经验溢出时把环画满一圈。 */
export function progressPercent(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}
