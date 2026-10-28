import { useEffect, useState } from 'react';
import type { SedentarySnapshot } from '../../shared/types/sedentary';

export function SedentaryPanel() {
  const [state, setState] = useState<SedentarySnapshot>();
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [resetMinutes, setResetMinutes] = useState(5);
  const [quietStart, setQuietStart] = useState('');
  const [quietEnd, setQuietEnd] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    void window.desktopApi.getSedentary().then((value) => {
      setState(value);
      setIntervalMinutes(value.intervalMinutes);
      setResetMinutes(value.inactivityResetMinutes);
      setQuietStart(value.quietStart ?? '');
      setQuietEnd(value.quietEnd ?? '');
    });
  }, []);
  async function save() {
    try {
      setState(
        await window.desktopApi.configureSedentary({
          intervalMinutes,
          inactivityResetMinutes: resetMinutes,
          quietStart: quietStart || null,
          quietEnd: quietEnd || null,
        }),
      );
      setMessage('设置已保存。');
    } catch {
      setMessage('设置无效。');
    }
  }
  return (
    <section aria-label="久坐提醒">
      <h2>久坐提醒</h2>
      <p>本轮连续活动约 {state?.continuousMinutes ?? 0} 分钟；离开后会自动重置。</p>
      <label>
        提醒间隔（分钟）{' '}
        <input
          type="number"
          min="1"
          max="240"
          value={intervalMinutes}
          onChange={(event) => setIntervalMinutes(Number(event.target.value))}
        />
      </label>{' '}
      <label>
        离开重置（分钟）{' '}
        <input
          type="number"
          min="1"
          max="60"
          value={resetMinutes}
          onChange={(event) => setResetMinutes(Number(event.target.value))}
        />
      </label>
      <p>
        <label>
          静音开始{' '}
          <input
            type="time"
            value={quietStart}
            onChange={(event) => setQuietStart(event.target.value)}
          />
        </label>{' '}
        <label>
          静音结束{' '}
          <input
            type="time"
            value={quietEnd}
            onChange={(event) => setQuietEnd(event.target.value)}
          />
        </label>
      </p>
      {message && <p role="status">{message}</p>}
      <div className="actions compact-actions">
        <button onClick={() => void save()}>保存设置</button>
        <button onClick={() => void window.desktopApi.snoozeSedentary(10).then(setState)}>
          延迟 10 分钟
        </button>
        <button onClick={() => void window.desktopApi.resetSedentary().then(setState)}>
          我已休息
        </button>
      </div>
    </section>
  );
}
