import { useCallback, useEffect, useState } from 'react';
import type { DailySummary } from '../../shared/types/summary';

export function SummaryPanel() {
  const [summary, setSummary] = useState<DailySummary>();
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    void window.desktopApi
      .getDailySummary()
      .then((value) => {
        setSummary(value);
        setError('');
      })
      .catch(() => setError('无法生成今日总结。'));
  }, []);

  useEffect(refresh, [refresh]);
  return (
    <section className="content-card tool-card tool-panel" aria-label="今日总结">
      <span className="eyebrow">DAILY REVIEW</span>
      <h2>今日总结</h2>
      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}
      {summary ? (
        <div className="summary-grid">
          <span>键盘 {summary.keyboardCount} 次</span>
          <span>鼠标 {summary.mouseCount} 次</span>
          <span>活跃约 {summary.activeMinutes} 分钟</span>
          <span>获得 {summary.experience} EXP</span>
          <span>当前等级 {summary.level}</span>
          <span>专注 {summary.focusMinutes} 分钟</span>
          <span>奖励：{summary.rewards.length ? summary.rewards.join('、') : '无'}</span>
        </div>
      ) : (
        <p className="tool-empty">{error ? '暂时没有可显示的数据。' : '正在生成总结…'}</p>
      )}
      <button onClick={refresh}>刷新总结</button>
    </section>
  );
}
