import { useCallback, useEffect, useState } from 'react';
import { UI_ICONS } from '../../data/catalogs/appearance';
import type { AchievementState } from '../../shared/types/achievement';
import { describeReward } from '../../shared/types/reward';
import { CatalogIcon } from './CatalogIcon';
import { progressPercent } from './growth-utils';

/** 成就列表：进度与可领取状态全部来自 AchievementService，界面不自行计算。 */
export function AchievementsPanel() {
  const [items, setItems] = useState<AchievementState[]>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string>();

  const load = useCallback(async () => {
    try {
      setItems(await window.desktopApi.listAchievements());
      setError('');
    } catch {
      setError('无法读取成就进度，请稍后重试。');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function claim(id: string) {
    setBusyId(id);
    try {
      setItems(await window.desktopApi.claimAchievement(id));
      setMessage('成就奖励已领取。');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '领取失败，请稍后再试。');
    } finally {
      setBusyId(undefined);
    }
  }

  const claimable = items?.filter((item) => item.claimable).length ?? 0;

  return (
    <section className="content-card" aria-label="成就" aria-busy={!items}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ACHIEVEMENTS</span>
          <h2>成就</h2>
          <p>完成成长目标后领取星星币与星光碎片，奖励只会发放一次。</p>
        </div>
        <span className="privacy-chip">可领取 {claimable}</span>
      </div>
      {message && (
        <p className="inline-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {!items ? (
        error ? null : (
          <p className="inline-loading">正在读取成就进度…</p>
        )
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>还没有可展示的成就。</p>
        </div>
      ) : (
        <div className="achievement-grid">
          {items.map((item) => {
            const target = item.condition.target;
            const percent = progressPercent(item.progress, target);
            const rewards = item.rewards.map((reward) => describeReward(reward)).join(' + ');
            return (
              <article
                className={`achievement-card ${item.claimed ? 'claimed' : ''} ${
                  item.claimable ? 'claimable' : ''
                }`}
                key={item.id}
                aria-label={`${item.name}，${item.claimed ? '已领取' : item.claimable ? '可领取' : '进行中'}`}
              >
                <div className="achievement-head">
                  <CatalogIcon src={item.icon} fallback={UI_ICONS.achievement} />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </div>
                </div>
                <div className="achievement-progress">
                  <div
                    className="mini-progress"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                    aria-label={`${item.name}完成进度`}
                  >
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <small>
                    <span>
                      {Math.min(item.progress, target).toLocaleString()} / {target.toLocaleString()}
                    </span>
                    <span>{percent}%</span>
                  </small>
                </div>
                <div className="achievement-foot">
                  <span className="achievement-reward">{rewards}</span>
                  {item.claimed ? (
                    <span>已领取</span>
                  ) : item.claimable ? (
                    <button disabled={busyId === item.id} onClick={() => void claim(item.id)}>
                      {busyId === item.id ? '领取中…' : '领取奖励'}
                    </button>
                  ) : (
                    <span>进行中</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
