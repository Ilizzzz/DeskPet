import { useCallback, useEffect, useState } from 'react';
import { UI_ICONS } from '../../data/catalogs/appearance';
import type { CheckinStatus } from '../../shared/types/checkin';
import { describeReward, type RewardSpec } from '../../shared/types/reward';
import { CatalogIcon } from './CatalogIcon';

const REWARD_ICONS: Record<RewardSpec['type'], string> = {
  coins: UI_ICONS.coins,
  fragments: UI_ICONS.fragments,
  item: UI_ICONS.appearance,
  character: UI_ICONS.growth,
  scene: UI_ICONS.home,
};

function RewardPills({ rewards }: { rewards: readonly RewardSpec[] }) {
  if (!rewards.length) return null;
  return (
    <div className="reward-pills" aria-label="签到奖励">
      {rewards.map((reward, index) => (
        <span className="reward-pill" key={`${reward.type}-${index}`}>
          <CatalogIcon src={REWARD_ICONS[reward.type]} fallback={UI_ICONS.coins} />
          {describeReward(reward)}
        </span>
      ))}
    </div>
  );
}

/** 每日签到卡片：首页和成长页共用，自带读取/错误/忙碌状态。 */
export function CheckinCard() {
  const [status, setStatus] = useState<CheckinStatus>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await window.desktopApi.getCheckin());
      setError('');
    } catch {
      setError('无法读取签到状态，请稍后重试。');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function checkIn() {
    setBusy(true);
    try {
      const next = await window.desktopApi.checkIn();
      setStatus(next);
      setMessage(`签到成功，已连续签到 ${next.streak} 天。`);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '签到失败，请稍后再试。');
    } finally {
      setBusy(false);
    }
  }

  const doneDays = status ? Math.min(status.streak, 7) : 0;
  return (
    <section className="content-card checkin-card" aria-label="每日签到" aria-busy={!status}>
      <div className="checkin-head">
        <div>
          <span className="eyebrow">CHECK-IN</span>
          <strong>每日签到</strong>
          <small>{status?.checkedInToday ? '今天已经签到，明天继续连签' : '签到领取星星币'}</small>
        </div>
        <CatalogIcon src={UI_ICONS.checkin} fallback={UI_ICONS.coins} alt="" />
      </div>

      {!status ? (
        error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="inline-loading">正在读取签到状态…</p>
        )
      ) : (
        <>
          <div className="checkin-streak" aria-label={`连续签到 ${status.streak} 天`}>
            <strong>{status.streak}</strong>
            <span>天连续签到</span>
          </div>
          <div className="checkin-days" aria-hidden="true">
            {Array.from({ length: 7 }, (_, index) => (
              <span className={index < doneDays ? 'checkin-day done' : 'checkin-day'} key={index} />
            ))}
          </div>
          <p className="checkin-footnote">今日奖励</p>
          <RewardPills rewards={status.todayReward} />
          {!status.checkedInToday && status.nextReward.length > 0 && (
            <p className="checkin-footnote">
              明天签到可得：{status.nextReward.map((reward) => describeReward(reward)).join('、')}
            </p>
          )}
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
          <button
            className={status.checkedInToday ? 'secondary-button' : 'primary-button'}
            disabled={busy || status.checkedInToday}
            onClick={() => void checkIn()}
          >
            {status.checkedInToday ? '今天已签到' : busy ? '正在签到…' : '立即签到'}
          </button>
          <p className="checkin-footnote">星星币随连续天数递增，每连续 7 天还有额外奖励。</p>
        </>
      )}
    </section>
  );
}
