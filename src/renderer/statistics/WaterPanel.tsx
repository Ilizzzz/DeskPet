import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { WaterSnapshot } from '../../shared/types/water';

const MIN_INTERVAL_MINUTES = 15;
const MAX_INTERVAL_MINUTES = 240;
const MIN_DAILY_GOAL = 1;
const MAX_DAILY_GOAL = 20;

function formatTime(value: number | null): string {
  if (value === null) return '暂无记录';
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/** 喝水提醒面板：显示今日杯数、目标进度，并轮询主进程的提醒状态。 */
export function WaterPanel() {
  const [water, setWater] = useState<WaterSnapshot>();
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [dailyGoal, setDailyGoal] = useState(8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async (initial: boolean) => {
    try {
      const snapshot = await window.desktopApi.getWater();
      setWater(snapshot);
      if (initial) {
        setIntervalMinutes(snapshot.intervalMinutes);
        setDailyGoal(snapshot.dailyGoal);
      }
      setError('');
    } catch {
      setError('无法读取喝水记录。');
    } finally {
      if (initial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    // 主进程每 30 秒检查提醒，这里同步刷新跨日重置和提醒时间。
    const timer = setInterval(() => void load(false), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function drink(): Promise<void> {
    try {
      const snapshot = await window.desktopApi.drinkWater();
      setWater(snapshot);
      setError('');
      setMessage(
        snapshot.cupsToday >= snapshot.dailyGoal
          ? '今日目标完成，继续保持！'
          : `已记录第 ${snapshot.cupsToday} 杯水。`,
      );
    } catch {
      setError('无法记录喝水。');
    }
  }

  async function save(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (
      !Number.isInteger(intervalMinutes) ||
      intervalMinutes < MIN_INTERVAL_MINUTES ||
      intervalMinutes > MAX_INTERVAL_MINUTES
    ) {
      setError(`提醒间隔需为 ${MIN_INTERVAL_MINUTES}–${MAX_INTERVAL_MINUTES} 分钟。`);
      return;
    }
    if (!Number.isInteger(dailyGoal) || dailyGoal < MIN_DAILY_GOAL || dailyGoal > MAX_DAILY_GOAL) {
      setError(`每日目标需为 ${MIN_DAILY_GOAL}–${MAX_DAILY_GOAL} 杯。`);
      return;
    }
    try {
      const snapshot = await window.desktopApi.configureWater({ intervalMinutes, dailyGoal });
      setWater(snapshot);
      setError('');
      setMessage('喝水设置已保存。');
    } catch {
      setError('无法保存喝水设置。');
    }
  }

  const cups = water?.cupsToday ?? 0;
  const goal = water?.dailyGoal ?? dailyGoal;
  const percent = goal > 0 ? Math.min(100, Math.round((cups / goal) * 100)) : 0;
  return (
    <section className="content-card tool-card tool-panel" aria-label="喝水提醒">
      <span className="eyebrow">WATER</span>
      <h2>喝水提醒</h2>
      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="tool-message" role="status">
          {message}
        </p>
      )}
      {loading || !water ? (
        <p className="tool-empty">正在读取喝水记录…</p>
      ) : (
        <>
          <div className="tool-water-summary">
            <div>
              <strong>
                {cups} / {goal}
              </strong>
              <span>今日杯数</span>
            </div>
            <div className="tool-progress tool-progress-large">
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>
              上次喝水：{formatTime(water.lastDrinkAt)} · 上次提醒：
              {formatTime(water.lastRemindedAt)}
            </small>
          </div>
          <div className="tool-actions">
            <button type="button" className="tool-primary" onClick={() => void drink()}>
              喝一杯水
            </button>
          </div>
          <form className="tool-form tool-form-config" onSubmit={(event) => void save(event)}>
            <label className="tool-field tool-field-narrow">
              <span>提醒间隔（分钟）</span>
              <input
                className="tool-input"
                type="number"
                min={MIN_INTERVAL_MINUTES}
                max={MAX_INTERVAL_MINUTES}
                value={intervalMinutes}
                onChange={(event) => setIntervalMinutes(Number(event.target.value))}
              />
            </label>
            <label className="tool-field tool-field-narrow">
              <span>每日目标（杯）</span>
              <input
                className="tool-input"
                type="number"
                min={MIN_DAILY_GOAL}
                max={MAX_DAILY_GOAL}
                value={dailyGoal}
                onChange={(event) => setDailyGoal(Number(event.target.value))}
              />
            </label>
            <button type="submit" className="tool-secondary">
              保存设置
            </button>
          </form>
        </>
      )}
    </section>
  );
}
