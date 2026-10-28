import { useEffect, useState, type FormEvent } from 'react';
import type { Countdown } from '../../shared/types/countdown';

const MIN_MINUTES = 1;
const MAX_MINUTES = 1440;
const MAX_LABEL_LENGTH = 40;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatRemaining(endsAt: number, now: number): string {
  const remaining = endsAt - now;
  if (remaining <= 0) return '已到时间';
  const total = Math.ceil(remaining / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function formatEnd(endsAt: number): string {
  return new Date(endsAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 倒计时面板：创建后每秒刷新剩余时间，到点由主进程推送系统通知。 */
export function CountdownPanel() {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [label, setLabel] = useState('');
  const [minutes, setMinutes] = useState(5);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.desktopApi
      .listCountdowns()
      .then((value) => setCountdowns(value))
      .catch(() => setError('无法读取倒计时。'))
      .finally(() => setLoading(false));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function apply(operation: () => Promise<Countdown[]>, failure: string): Promise<void> {
    try {
      setCountdowns(await operation());
      setError('');
    } catch {
      setError(failure);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = label.trim();
    if (!text) {
      setError('请输入倒计时名称。');
      return;
    }
    if (!Number.isInteger(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) {
      setError('倒计时时长需为 1–1440 分钟。');
      return;
    }
    await apply(() => window.desktopApi.createCountdown(text, minutes), '无法创建倒计时。');
    setLabel('');
  }

  return (
    <section className="content-card tool-card tool-panel" aria-label="倒计时">
      <span className="eyebrow">COUNTDOWN</span>
      <h2>倒计时</h2>
      <form className="tool-form" onSubmit={(event) => void add(event)}>
        <label className="tool-field">
          <span>名称</span>
          <input
            className="tool-input"
            maxLength={MAX_LABEL_LENGTH}
            value={label}
            placeholder="例如：泡面"
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>
        <label className="tool-field tool-field-narrow">
          <span>分钟</span>
          <input
            className="tool-input"
            type="number"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
          />
        </label>
        <button type="submit" className="tool-primary">
          开始倒计时
        </button>
      </form>
      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="tool-empty">正在读取倒计时…</p>
      ) : countdowns.length === 0 ? (
        <p className="tool-empty">还没有倒计时，设置一个提醒重要时刻吧。</p>
      ) : (
        <ul className="tool-list">
          {countdowns.map((countdown) => {
            const remaining = formatRemaining(countdown.endsAt, now);
            return (
              <li key={countdown.id} className="tool-list-item">
                <div className="tool-countdown">
                  <strong>{countdown.label}</strong>
                  <span className={remaining === '已到时间' ? 'tool-countdown-due' : ''}>
                    {remaining}
                  </span>
                  <small>结束于 {formatEnd(countdown.endsAt)}</small>
                </div>
                <button
                  type="button"
                  className="tool-icon-button"
                  aria-label={`删除倒计时：${countdown.label}`}
                  onClick={() =>
                    void apply(
                      () => window.desktopApi.deleteCountdown(countdown.id),
                      '无法删除倒计时。',
                    )
                  }
                >
                  删除
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
