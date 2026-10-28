import type { StatisticsSnapshot } from '../../shared/types/statistics';

export function OverviewPanel({
  data,
  navigate,
}: {
  data: StatisticsSnapshot;
  navigate: (page: 'growth' | 'appearance' | 'tools') => void;
}) {
  const days = data.days.slice(-7);
  const max = Math.max(1, ...days.map((day) => day.keyboardCount + day.mouseCount));
  const todayTotal = data.today.keyboardCount + data.today.mouseCount;
  return (
    <>
      <section className="hero-card">
        <div>
          <span className="eyebrow">TODAY WITH DESKPET</span>
          <h2>今天也在稳稳成长</h2>
          <p>每一次有效操作都会变成陪伴和成长，所有记录只保存在这台电脑。</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('tools')}>
              开始专注
            </button>
            <button className="secondary-button" onClick={() => navigate('appearance')}>
              更换装扮
            </button>
          </div>
        </div>
        <div className="level-orbit" aria-label={`当前等级 ${data.growth.level}`}>
          <span>LV</span>
          <strong>{data.growth.level}</strong>
        </div>
      </section>

      <section className="metric-grid" aria-label="今日统计">
        <article className="metric-card accent-coral">
          <span className="metric-icon">⌨</span>
          <span>键盘输入</span>
          <strong>{data.today.keyboardCount.toLocaleString()}</strong>
          <small>今日按下次数</small>
        </article>
        <article className="metric-card accent-blue">
          <span className="metric-icon">●</span>
          <span>鼠标点击</span>
          <strong>{data.today.mouseCount.toLocaleString()}</strong>
          <small>今日点击次数</small>
        </article>
        <article className="metric-card accent-green">
          <span className="metric-icon">◷</span>
          <span>活跃时间</span>
          <strong>{Math.round(data.today.activeSeconds / 60)}</strong>
          <small>分钟 · 聚合估算</small>
        </article>
        <article className="metric-card accent-gold">
          <span className="metric-icon">✦</span>
          <span>今日经验</span>
          <strong>{data.todayExperience}</strong>
          <small>EXP · 输入与专注</small>
        </article>
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
            <span>☁</span>
            <strong>还没有活动记录</strong>
            <p>从托盘或设置页启用聚合统计后，趋势会出现在这里。</p>
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

      <section className="content-card growth-strip">
        <div>
          <span className="eyebrow">GROWTH</span>
          <h2>距离下一等级</h2>
          <p>
            {data.growth.experience} / {data.growth.nextLevelExperience} EXP · 累计{' '}
            {data.growth.totalExperience} EXP
          </p>
        </div>
        <div className="growth-progress-wrap">
          <progress value={data.growth.experience} max={data.growth.nextLevelExperience} />
          <button className="text-button" onClick={() => navigate('growth')}>
            查看成长路线 →
          </button>
        </div>
      </section>
    </>
  );
}
