import { useCallback, useEffect, useState } from 'react';
import type { FocusSnapshot } from '../../shared/types/focus';
export function FocusPanel() {
  const [timer, setTimer] = useState<FocusSnapshot>();
  const [minutes, setMinutes] = useState(25);
  const [kind, setKind] = useState<'focus' | 'break'>('focus');
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    void window.desktopApi
      .getFocus()
      .then(setTimer)
      .catch(() => setError('无法读取计时器。'));
  }, []);
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [refresh]);
  async function act(operation: () => Promise<FocusSnapshot>) {
    try {
      setTimer(await operation());
      setError('');
    } catch {
      setError('计时操作失败，请检查时间或当前状态。');
    }
  }
  const seconds = Math.ceil((timer?.remainingMs ?? 0) / 1000);
  return (
    <section className="content-card tool-card" aria-label="番茄钟">
      <span className="eyebrow">FOCUS</span>
      <h2>番茄钟</h2>
      {error && <p role="alert">{error}</p>}
      <p>
        {timer?.status === 'running'
          ? '进行中'
          : timer?.status === 'paused'
            ? '已暂停'
            : timer?.status === 'completed'
              ? '已完成'
              : '未开始'}{' '}
        · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </p>
      <p>
        今日专注 {timer?.todayFocusMinutes ?? 0} 分钟 · 累计 {timer?.completedSessions ?? 0} 次 /{' '}
        {timer?.focusMinutes ?? 0} 分钟
      </p>
      <label>
        <input
          type="checkbox"
          checked={timer?.soundEnabled ?? true}
          onChange={(event) =>
            void act(() => window.desktopApi.setFocusSound(event.target.checked))
          }
        />{' '}
        到时声音
      </label>{' '}
      <label>
        模式{' '}
        <select
          value={kind}
          onChange={(event) => {
            const next = event.target.value as 'focus' | 'break';
            setKind(next);
            setMinutes(next === 'focus' ? 25 : 5);
          }}
        >
          <option value="focus">专注</option>
          <option value="break">休息</option>
        </select>
      </label>{' '}
      <label>
        分钟{' '}
        <input
          type="number"
          min="1"
          max="180"
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
        />
      </label>
      <div className="actions">
        <button
          disabled={timer?.status === 'running' || timer?.status === 'paused'}
          onClick={() => void act(() => window.desktopApi.startFocus(kind, minutes))}
        >
          开始
        </button>
        <button
          disabled={timer?.status !== 'running'}
          onClick={() => void act(() => window.desktopApi.pauseFocus())}
        >
          暂停
        </button>
        <button
          disabled={timer?.status !== 'paused'}
          onClick={() => void act(() => window.desktopApi.resumeFocus())}
        >
          继续
        </button>
        <button
          disabled={timer?.status === 'idle'}
          onClick={() => void act(() => window.desktopApi.stopFocus())}
        >
          结束
        </button>
      </div>
    </section>
  );
}
