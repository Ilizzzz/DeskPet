import { GROWTH_RULES } from '../../data/catalogs/growth';
import { UI_ICONS } from '../../data/catalogs/appearance';
import { nextUnlocks } from '../../data/catalogs/unlocks';
import type { StatisticsSnapshot } from '../../shared/types/statistics';
import { UNLOCK_CATEGORY_LABELS } from '../../shared/types/unlock';
import { AchievementsPanel } from './AchievementsPanel';
import { CatalogIcon } from './CatalogIcon';
import { CheckinCard } from './CheckinCard';
import { UnlockRoadmap } from './UnlockRoadmap';
import { experienceToLevel, progressPercent } from './growth-utils';

const RING_RADIUS = 56;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function GrowthPanel({ data }: { data: StatisticsSnapshot }) {
  const { growth } = data;
  const percent = progressPercent(growth.experience, growth.nextLevelExperience);
  const remainingExp = Math.max(0, growth.nextLevelExperience - growth.experience);
  const nextUnlock = nextUnlocks(growth.level, 1)[0];
  const unlockExp = nextUnlock
    ? experienceToLevel(growth.level, growth.experience, nextUnlock.level)
    : 0;

  return (
    <>
      <section className="content-card growth-hero-card" aria-label="当前等级">
        <div
          className="level-ring"
          role="img"
          aria-label={`当前等级 ${growth.level}，本级经验进度 ${percent}%`}
        >
          <svg viewBox="0 0 132 132" aria-hidden="true">
            <circle className="level-ring-track" cx="66" cy="66" r={RING_RADIUS} />
            <circle
              className="level-ring-value"
              cx="66"
              cy="66"
              r={RING_RADIUS}
              strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
              strokeDashoffset={RING_LENGTH * (1 - percent / 100)}
            />
          </svg>
          <div className="level-ring-center">
            <small>LEVEL</small>
            <strong>{growth.level}</strong>
          </div>
        </div>
        <div className="growth-main">
          <span className="eyebrow">YOUR PROGRESS</span>
          <h2>
            距离 {growth.level + 1} 级还差 {remainingExp} EXP
          </h2>
          <progress
            value={growth.experience}
            max={growth.nextLevelExperience}
            aria-label="当前等级经验进度"
          />
          <p>
            当前 {growth.experience} / {growth.nextLevelExperience} EXP · 今日获得{' '}
            {data.todayExperience} EXP
          </p>
          <div className="growth-stat-grid">
            <div className="growth-stat">
              <span>今日经验</span>
              <strong>{data.todayExperience}</strong>
              <small>EXP</small>
            </div>
            <div className="growth-stat">
              <span>累计经验</span>
              <strong>{growth.totalExperience.toLocaleString()}</strong>
              <small>EXP</small>
            </div>
            <div className="growth-stat">
              <span>今日输入</span>
              <strong>{(data.today.keyboardCount + data.today.mouseCount).toLocaleString()}</strong>
              <small>次</small>
            </div>
          </div>
        </div>
      </section>

      <div className="growth-middle">
        {nextUnlock && (
          <section className="content-card" aria-label="下一个解锁">
            <div className="section-heading">
              <div>
                <span className="eyebrow">NEXT UNLOCK</span>
                <h2>下一个解锁</h2>
                <p>升级后会自动获得，无需手动领取。</p>
              </div>
              <span className="privacy-chip">{UNLOCK_CATEGORY_LABELS[nextUnlock.category]}</span>
            </div>
            <div className="next-unlock">
              <span className="unlock-icon">
                <CatalogIcon src={nextUnlock.icon} fallback={UI_ICONS.growth} />
              </span>
              <div>
                <strong>{nextUnlock.name}</strong>
                <small>{nextUnlock.description}</small>
              </div>
              <div className="unlock-distance">
                <span>达到 Lv.{nextUnlock.level} 解锁</span>
                <span>还差 {nextUnlock.level - growth.level} 级</span>
                <span>约 {unlockExp.toLocaleString()} EXP</span>
              </div>
            </div>
          </section>
        )}
        <CheckinCard />
      </div>

      <UnlockRoadmap level={growth.level} />

      <AchievementsPanel />

      <section className="content-card" aria-label="成长规则">
        <div className="section-heading">
          <div>
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>成长规则</h2>
          </div>
          <span className="privacy-chip">经验只来自真实操作</span>
        </div>
        <div className="growth-rule-grid">
          <article>
            <CatalogIcon src={UI_ICONS.growth} fallback={UI_ICONS.app} />
            <strong>输入成长</strong>
            <p>
              键盘每 {GROWTH_RULES.keyboardCountPerExp} 次、鼠标每 {GROWTH_RULES.mouseCountPerExp}{' '}
              次各获得 1 EXP，余数跨批次累计。
            </p>
          </article>
          <article>
            <CatalogIcon src={UI_ICONS.levelup} fallback={UI_ICONS.app} />
            <strong>专注成长</strong>
            <p>
              完成一次专注获得 {GROWTH_RULES.focusSessionExp} EXP 和 {GROWTH_RULES.starsPerFocus}{' '}
              星星币。
            </p>
          </article>
          <article>
            <CatalogIcon src={UI_ICONS.fragments} fallback={UI_ICONS.app} />
            <strong>星光碎片</strong>
            <p>每完成 {GROWTH_RULES.focusSessionsPerFragment} 次专注额外获得 1 星光碎片。</p>
          </article>
          <article>
            <CatalogIcon src={UI_ICONS.achievement} fallback={UI_ICONS.app} />
            <strong>没有封顶</strong>
            <p>输入与专注的经验不再封顶，所有有效操作都会计入成长。</p>
          </article>
        </div>
      </section>
    </>
  );
}
