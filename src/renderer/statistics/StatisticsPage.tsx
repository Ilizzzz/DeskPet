import { AppearancePanel } from './AppearancePanel';
import { InventoryPanel } from './InventoryPanel';
import { ToolboxPanel } from './ToolboxPanel';
import { useCallback, useEffect, useState } from 'react';
import type { StatisticsSnapshot } from '../../shared/types/statistics';

export function StatisticsPage() {
  const [data, setData] = useState<StatisticsSnapshot>();
  const [error, setError] = useState('');
  const [range, setRange] = useState<7 | 30>(7);
  const refresh = useCallback(async () => {
    try {
      setData(await window.desktopApi.getStatistics());
      setError('');
    } catch {
      setError('无法读取统计数据，请检查用户数据目录。');
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function action(operation: () => Promise<boolean>) {
    try {
      await operation();
      await refresh();
    } catch {
      setError('操作失败，请检查文件权限和磁盘空间。');
    }
  }
  const visibleDays = data?.days.slice(-range) ?? [];
  const max = Math.max(1, ...visibleDays.map((day) => day.keyboardCount + day.mouseCount));
  return (
    <div className="statistics">
      <header>
        <h1>键鼠统计</h1>
        <p>仅保存每日次数，数据留在本机。</p>
      </header>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <section aria-label="成长">
            <h2>等级 {data.growth.level}</h2>
            <progress value={data.growth.experience} max={data.growth.nextLevelExperience} />
            <p>
              经验 {data.growth.experience} / {data.growth.nextLevelExperience} · 累计{' '}
              {data.growth.totalExperience} · 今日 {data.todayExperience}
            </p>
          </section>
          <section className="cards" aria-label="今日统计">
            <div>
              今日键盘<strong>{data.today.keyboardCount}</strong>
            </div>
            <div>
              今日鼠标<strong>{data.today.mouseCount}</strong>
            </div>
            <div>
              今日总计<strong>{data.today.keyboardCount + data.today.mouseCount}</strong>
            </div>
            <div>
              今日活跃<strong>{Math.round(data.today.activeSeconds / 60)} 分钟</strong>
            </div>
          </section>
          <p>
            累计：键盘 {data.total.keyboardCount} 次 · 鼠标 {data.total.mouseCount} 次 · 总计{' '}
            {data.total.keyboardCount + data.total.mouseCount} 次 · 活跃约{' '}
            {Math.round(data.total.activeSeconds / 60)} 分钟
          </p>
          <h2>最近 {range} 天</h2>
          <div className="actions">
            <button onClick={() => setRange(7)} aria-pressed={range === 7}>
              7 天
            </button>
            <button onClick={() => setRange(30)} aria-pressed={range === 30}>
              30 天
            </button>
          </div>
          <div className="trend">
            {visibleDays.map((day) => (
              <div className="trend-row" key={day.date}>
                <span>{day.date}</span>
                <div className="bar-track">
                  <div
                    className="bar"
                    style={{ width: `${((day.keyboardCount + day.mouseCount) / max) * 100}%` }}
                  />
                </div>
                <span>
                  键盘 {day.keyboardCount} / 鼠标 {day.mouseCount}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <AppearancePanel />
      <InventoryPanel />
      <ToolboxPanel />
      <div className="actions">
        <button onClick={() => void action(() => window.desktopApi.exportStatistics())}>
          导出 CSV
        </button>
        <button onClick={() => void action(() => window.desktopApi.clearStatistics())}>
          清除统计
        </button>
        <button onClick={() => void refresh()}>刷新</button>
      </div>
    </div>
  );
}
