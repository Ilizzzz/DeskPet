import { UI_ICONS } from '../../data/catalogs/appearance';
import { nextUnlocks } from '../../data/catalogs/unlocks';
import { TOOL_DEFINITIONS } from '../../data/catalogs/tools';
import type { StatisticsSnapshot } from '../../shared/types/statistics';
import { UNLOCK_CATEGORY_LABELS } from '../../shared/types/unlock';
import { CatalogIcon } from './CatalogIcon';
import { CheckinCard } from './CheckinCard';
import { experienceToLevel, progressPercent } from './growth-utils';

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

export function OverviewPanel({
  data,
  navigate,
}: {
  data: StatisticsSnapshot;
  navigate: (page: 'growth' | 'appearance' | 'tools') => void;
}) {
  const { growth, today } = data;
  const days = data.days.slice(-7);
  const max = Math.max(1, ...days.map((day) => day.keyboardCount + day.mouseCount));
  const todayTotal = today.keyboardCount + today.mouseCount;
  const percent = progressPercent(growth.experience, growth.nextLevelExperience);
  const remainingExp = Math.max(0, growth.nextLevelExperience - growth.experience);
  const nextUnlock = nextUnlocks(growth.level, 1)[0];
  const unlockExp = nextUnlock
    ? experienceToLevel(growth.level, growth.experience, nextUnlock.level)
    : 0;

  const focusTool = TOOL_DEFINITIONS.find((tool) => tool.id === 'focus');
  const todoTool = TOOL_DEFINITIONS.find((tool) => tool.id === 'todo');
  const toolHint = (minimumLevel: number, description: string) =>
    growth.level >= minimumLevel ? description : `Lv.${minimumLevel} 解锁`;

  return (
    <>
      <section className="hero-card">
        <div>
          <span className="eyebrow">TODAY WITH DESKPET</span>
          <h2>{greeting()}，今天也在稳稳成长</h2>
          <p>每一次有效操作都会变成经验和新的收藏，所有记录只保存在这台电脑。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('tools')}>
              开始专注
            </button>
            <button className="secondary-button" onClick={() => navigate('appearance')}>
              更换装扮
            </button>
          </div>
        </div>
        <div className="level-orbit" aria-label={`当前等级 ${growth.level}`}>
          <span>LV</span>
          <strong>{growth.level}</strong>
        </div>
      </section>

      <section className="metric-grid" aria-label="今日统计">
        <article className="metric-card accent-coral">
          <span className="metric-icon">
            <CatalogIcon src={UI_ICONS.keyboard} fallback={UI_ICONS.app} />
          </span>
          <span>键盘输入</span>
          <strong>{today.keyboardCount.toLocaleString()}</strong>
          <small>今日按下次数</small>
        </article>
        <article className="metric-card accent-blue">
          <span className="metric-icon">
            <CatalogIcon src={UI_ICONS.mouse} fallback={UI_ICONS.app} />
          </span>
          <span>鼠标点击</span>
          <strong>{today.mouseCount.toLocaleString()}</strong>
          <small>今日点击次数</small>
        </article>
        <article className="metric-card accent-green">
          <span className="metric-icon">
            <CatalogIcon src={UI_ICONS.clock} fallback={UI_ICONS.app} />
          </span>
          <span>活跃时间</span>
          <strong>{Math.round(today.activeSeconds / 60)}</strong>
          <small>分钟 · 聚合估算</small>
        </article>
        <article className="metric-card accent-gold">
          <span className="metric-icon">
            <CatalogIcon src={UI_ICONS.levelup} fallback={UI_ICONS.app} />
          </span>
          <span>今日经验</span>
          <strong>{data.todayExperience}</strong>
          <small>EXP · 输入与专注</small>
        </article>
      </section>

      <div className="home-split">
        <section className="content-card home-growth-card" aria-label="成长进度">
          <div className="home-growth-head">
            <div>
              <span className="eyebrow">LEVEL {growth.level}</span>
              <h2>
                距离 {growth.level + 1} 级还差 {remainingExp} EXP
              </h2>
              <p>
                今日已获得 {data.todayExperience} EXP，累计 {growth.totalExperience} EXP。
              </p>
            </div>
            <span className="privacy-chip">{percent}%</span>
          </div>
          <div className="home-exp-track">
            <progress
              value={growth.experience}
              max={growth.nextLevelExperience}
              aria-label="当前等级经验进度"
            />
            <small>
              <span>
                {growth.experience} / {growth.nextLevelExperience} EXP
              </span>
              <button className="text-button" onClick={() => navigate('growth')}>
                查看成长路线 →
              </button>
            </small>
          </div>
          {nextUnlock && (
            <div className="next-unlock">
              <span className="unlock-icon">
                <CatalogIcon src={nextUnlock.icon} fallback={UI_ICONS.growth} />
              </span>
              <div>
                <small>下一个解锁 · {UNLOCK_CATEGORY_LABELS[nextUnlock.category]}</small>
                <strong>{nextUnlock.name}</strong>
                <small>Lv.{nextUnlock.level} 自动获得</small>
              </div>
              <div className="unlock-distance">
                <span>还差 {nextUnlock.level - growth.level} 级</span>
                <span>约 {unlockExp.toLocaleString()} EXP</span>
              </div>
            </div>
          )}
        </section>
        <CheckinCard />
      </div>

      <section className="content-card" aria-label="快捷入口">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SHORTCUTS</span>
            <h2>快捷入口</h2>
          </div>
          <span className="privacy-chip">工具随等级解锁</span>
        </div>
        <div className="quick-grid">
          <button className="quick-card" onClick={() => navigate('tools')}>
            <CatalogIcon src={focusTool?.icon} fallback={UI_ICONS.tools} />
            <span>
              <strong>开始专注</strong>
              <small>{toolHint(focusTool?.minimumLevel ?? 2, '番茄钟陪你专注')}</small>
            </span>
          </button>
          <button className="quick-card" onClick={() => navigate('appearance')}>
            <CatalogIcon src={UI_ICONS.appearance} fallback={UI_ICONS.app} />
            <span>
              <strong>更换装扮</strong>
              <small>伙伴、场景与五槽位饰品</small>
            </span>
          </button>
          <button className="quick-card" onClick={() => navigate('tools')}>
            <CatalogIcon src={todoTool?.icon} fallback={UI_ICONS.tools} />
            <span>
              <strong>待办清单</strong>
              <small>{toolHint(todoTool?.minimumLevel ?? 9, '划掉今天的小事')}</small>
            </span>
          </button>
        </div>
      </section>

      <section className="content-card trend-card" aria-label="最近七天趋势">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ACTIVITY</span>
            <h2>最近 7 天</h2>
          </div>
          <span className="privacy-chip">仅本机保存</span>
        </div>
        {days.every((day) => day.keyboardCount + day.mouseCount === 0) ? (
          <div className="empty-state">
            <CatalogIcon src={UI_ICONS.growth} fallback={UI_ICONS.app} />
            <strong>还没有活动记录</strong>
            <p>启用聚合统计后，这里会显示最近 7 天的键鼠趋势。</p>
          </div>
        ) : (
          <div className="activity-chart">
            {days.map((day) => {
              const keyboardWidth = (day.keyboardCount / max) * 100;
              const mouseWidth = (day.mouseCount / max) * 100;
              return (
                <div className="activity-row" key={day.date}>
                  <span>{day.date.slice(5)}</span>
                  <div
                    className="activity-track"
                    title={`${day.date} · ${day.keyboardCount + day.mouseCount}`}
                  >
                    <i className="activity-keyboard" style={{ width: `${keyboardWidth}%` }} />
                    <i className="activity-mouse" style={{ width: `${mouseWidth}%` }} />
                  </div>
                  <strong>{(day.keyboardCount + day.mouseCount).toLocaleString()}</strong>
                </div>
              );
            })}
          </div>
        )}
        <div className="chart-legend">
          <span>
            <i className="legend-keyboard" />
            键盘
          </span>
          <span>
            <i className="legend-mouse" />
            鼠标
          </span>
          <span className="chart-total">今日总计 {todayTotal.toLocaleString()} 次</span>
        </div>
      </section>
    </>
  );
}
