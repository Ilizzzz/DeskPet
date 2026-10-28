import { useEffect, useState, type FormEvent } from 'react';
import type { AnniversaryView } from '../../shared/types/anniversary';

const MAX_TITLE_LENGTH = 40;

function describeDaysUntil(daysUntil: number): string {
  if (daysUntil === 0) return '就是今天';
  if (daysUntil > 0) return `还有 ${daysUntil} 天`;
  return `已过去 ${Math.abs(daysUntil)} 天`;
}

/** 纪念日面板：每分钟刷新一次“还有几天”，跨天后自动更新。 */
export function AnniversaryPanel() {
  const [anniversaries, setAnniversaries] = useState<AnniversaryView[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [repeatYearly, setRepeatYearly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => {
      void window.desktopApi
        .listAnniversaries()
        .then((value) => setAnniversaries(value))
        .catch(() => setError('无法读取纪念日。'))
        .finally(() => setLoading(false));
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, []);

  async function apply(
    operation: () => Promise<AnniversaryView[]>,
    failure: string,
  ): Promise<void> {
    try {
      setAnniversaries(await operation());
      setError('');
    } catch {
      setError(failure);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = title.trim();
    if (!text) {
      setError('请输入纪念日名称。');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('请选择纪念日日期。');
      return;
    }
    await apply(
      () => window.desktopApi.createAnniversary(text, date, repeatYearly),
      '无法创建纪念日。',
    );
    setTitle('');
    setDate('');
  }

  return (
    <section className="content-card tool-card tool-panel" aria-label="纪念日">
      <span className="eyebrow">ANNIVERSARY</span>
      <h2>纪念日</h2>
      <form className="tool-form" onSubmit={(event) => void add(event)}>
        <label className="tool-field">
          <span>名称</span>
          <input
            className="tool-input"
            maxLength={MAX_TITLE_LENGTH}
            value={title}
            placeholder="例如：和 DeskPet 的相遇"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="tool-field tool-field-narrow">
          <span>日期</span>
          <input
            className="tool-input"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label className="tool-check tool-check-inline">
          <input
            type="checkbox"
            checked={repeatYearly}
            onChange={(event) => setRepeatYearly(event.target.checked)}
          />
          <span>每年重复</span>
        </label>
        <button type="submit" className="tool-primary">
          添加纪念日
        </button>
      </form>
      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="tool-empty">正在读取纪念日…</p>
      ) : anniversaries.length === 0 ? (
        <p className="tool-empty">还没有纪念日，记录一个值得记住的日子吧。</p>
      ) : (
        <ul className="tool-list">
          {anniversaries.map((entry) => (
            <li key={entry.id} className="tool-list-item">
              <div className="tool-anniversary">
                <strong>{entry.title}</strong>
                <span>{describeDaysUntil(entry.daysUntil)}</span>
                <small>
                  {entry.nextDate}
                  {entry.repeatYearly ? ' · 每年重复' : ''}
                </small>
              </div>
              <button
                type="button"
                className="tool-icon-button"
                aria-label={`删除纪念日：${entry.title}`}
                onClick={() =>
                  void apply(
                    () => window.desktopApi.deleteAnniversary(entry.id),
                    '无法删除纪念日。',
                  )
                }
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
