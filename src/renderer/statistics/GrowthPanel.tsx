import { LEVEL_REWARDS } from '../../data/catalogs/growth';
import type { StatisticsSnapshot } from '../../shared/types/statistics';

const rewardNames: Record<string, string> = {
  hat_blue: '蓝色小帽',
  currency_50: '50 星星币',
  forest_home: '森林小屋场景',
  scarf: '红围巾',
  fox: '小狐狸角色',
};

export function GrowthPanel({ data }: { data: StatisticsSnapshot }) {
  const progress = Math.round((data.growth.experience / data.growth.nextLevelExperience) * 100);
  return (
    <>
      <section className="growth-hero content-card">
        <div className="level-medal">
          <span>当前等级</span>
          <strong>{data.growth.level}</strong>
        </div>
        <div className="growth-main">
          <span className="eyebrow">YOUR PROGRESS</span>
          <h2>下一等级已完成 {progress}%</h2>
          <progress value={data.growth.experience} max={data.growth.nextLevelExperience} />
          <p>
            当前 {data.growth.experience} / {data.growth.nextLevelExperience} EXP · 今日获得{' '}
            {data.todayExperience} EXP
          </p>
        </div>
      </section>
      <section className="growth-rule-grid">
        <article className="content-card">
          <span>⌨</span>
          <strong>25 次键盘</strong>
          <p>兑换 1 EXP</p>
        </article>
        <article className="content-card">
          <span>●</span>
          <strong>8 次点击</strong>
          <p>兑换 1 EXP</p>
        </article>
        <article className="content-card">
          <span>◷</span>
          <strong>完成专注</strong>
          <p>获得 10 EXP</p>
        </article>
        <article className="content-card">
          <span>◇</span>
          <strong>每日上限</strong>
          <p>输入 200 + 专注 50</p>
        </article>
      </section>
      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">REWARDS</span>
            <h2>成长奖励路线</h2>
          </div>
          <span className="privacy-chip">奖励不会重复发放</span>
        </div>
        <div className="reward-roadmap">
          {Object.entries(LEVEL_REWARDS).map(([level, reward]) => {
            const unlocked = data.growth.level >= Number(level);
            return (
              <article className={unlocked ? 'reward-item unlocked' : 'reward-item'} key={level}>
                <span className="reward-level">LV {level}</span>
                <span className="reward-symbol">{unlocked ? '✓' : '○'}</span>
                <div>
                  <strong>{rewardNames[reward] ?? reward}</strong>
                  <small>{unlocked ? '已获得' : '尚未解锁'}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
