import { useEffect, useState, type ComponentType } from 'react';
import type { StatisticsSnapshot } from '../../shared/types/statistics';
import type { ToolId, ToolState } from '../../shared/types/tool';
import { AnniversaryPanel } from './AnniversaryPanel';
import { CountdownPanel } from './CountdownPanel';
import { FocusPanel } from './FocusPanel';
import { NotesPanel } from './NotesPanel';
import { SedentaryPanel } from './SedentaryPanel';
import { SummaryPanel } from './SummaryPanel';
import { TodoPanel } from './TodoPanel';
import { WaterPanel } from './WaterPanel';
import '../tools.css';

const PANELS: Record<ToolId, ComponentType> = {
  daily_summary: SummaryPanel,
  focus: FocusPanel,
  notes: NotesPanel,
  sedentary: SedentaryPanel,
  todo: TodoPanel,
  water: WaterPanel,
  countdown: CountdownPanel,
  anniversary: AnniversaryPanel,
};

/** 锁图标用内联 SVG，避免再引入字符图标或额外素材。 */
function LockIcon() {
  return (
    <svg className="tool-lock-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" fill="currentColor" />
    </svg>
  );
}

/** 工具箱：8 个工具按成长等级解锁，已解锁工具保留独立启停。 */
export function ToolboxPanel() {
  const [tools, setTools] = useState<ToolState[]>([]);
  const [level, setLevel] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<ToolId>();

  useEffect(() => {
    let active = true;
    void Promise.all([window.desktopApi.listTools(), window.desktopApi.getStatistics()])
      .then(([toolStates, statistics]: [ToolState[], StatisticsSnapshot]) => {
        if (!active) return;
        setTools(toolStates);
        setLevel(statistics.growth.level);
        setError('');
      })
      .catch(() => {
        if (active) setError('无法读取工具与等级信息。');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function retry(): Promise<void> {
    setLoading(true);
    try {
      const [toolStates, statistics] = await Promise.all([
        window.desktopApi.listTools(),
        window.desktopApi.getStatistics(),
      ]);
      setTools(toolStates);
      setLevel(statistics.growth.level);
      setError('');
    } catch {
      setError('无法读取工具与等级信息。');
    } finally {
      setLoading(false);
    }
  }

  async function toggle(tool: ToolState): Promise<void> {
    setPendingId(tool.id);
    try {
      setTools(await window.desktopApi.setToolEnabled(tool.id, !tool.enabled));
      setError('');
    } catch {
      setError(tool.unlocked ? `无法更新「${tool.name}」的开关。` : `「${tool.name}」尚未解锁。`);
    } finally {
      setPendingId(undefined);
    }
  }

  if (loading) {
    return (
      <section className="content-card tool-loading" aria-live="polite">
        <span className="tool-spinner" aria-hidden="true" />
        <strong>正在读取工具与等级…</strong>
      </section>
    );
  }

  const currentLevel = level ?? 1;
  const unlockedCount = tools.filter((tool) => tool.unlocked).length;
  const activePanels = tools.filter((tool) => tool.unlocked && tool.enabled);
  return (
    <>
      <section className="content-card tool-intro" aria-label="工具箱概览">
        <div>
          <span className="eyebrow">TOOLBOX</span>
          <h2>桌面工具箱</h2>
          <p>工具随成长等级解锁，达到等级后可以自行启停，面板会显示在下方。</p>
        </div>
        <div className="tool-level-badge">
          <span>当前等级</span>
          <strong>Lv.{currentLevel}</strong>
          <small>
            已解锁 {unlockedCount} / {tools.length} 个工具
          </small>
        </div>
      </section>

      {error && (
        <div className="tool-error-banner" role="alert">
          <strong>读取失败</strong>
          <span>{error}</span>
          <button type="button" onClick={() => void retry()}>
            重试
          </button>
        </div>
      )}

      <section className="tool-section" aria-label="工具列表">
        {tools.length === 0 ? (
          <p className="tool-empty">暂未读取到工具，请稍后重试。</p>
        ) : (
          <div className="tool-grid">
            {tools.map((tool) => {
              const remaining = Math.max(0, tool.minimumLevel - currentLevel);
              const percent =
                tool.minimumLevel > 0
                  ? Math.min(100, Math.round((currentLevel / tool.minimumLevel) * 100))
                  : 100;
              return (
                <article
                  key={tool.id}
                  className={tool.unlocked ? 'tool-tile' : 'tool-tile tool-tile-locked'}
                  aria-label={`${tool.name}${tool.unlocked ? '，已解锁' : `，需要等级 ${tool.minimumLevel}`}`}
                >
                  <div className="tool-tile-head">
                    <img className="tool-tile-icon" src={tool.icon} alt="" width={44} height={44} />
                    <div>
                      <h3>{tool.name}</h3>
                      <p>{tool.description}</p>
                    </div>
                  </div>
                  {tool.unlocked ? (
                    <div className="tool-tile-foot">
                      <span className="tool-state tool-state-ready">
                        Lv.{tool.minimumLevel} 已解锁
                      </span>
                      <label className="tool-switch">
                        <input
                          type="checkbox"
                          checked={tool.enabled}
                          disabled={pendingId === tool.id}
                          onChange={() => void toggle(tool)}
                        />
                        <span className="tool-switch-track" aria-hidden="true" />
                        <span className="tool-switch-text">
                          {tool.enabled ? '已开启' : '已关闭'}
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="tool-tile-locked-info">
                      <span className="tool-state tool-state-locked">
                        <LockIcon />
                        需要 Lv.{tool.minimumLevel}
                      </span>
                      <div
                        className="tool-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={tool.minimumLevel}
                        aria-valuenow={Math.min(currentLevel, tool.minimumLevel)}
                        aria-label={`${tool.name}解锁进度`}
                      >
                        <span style={{ width: `${percent}%` }} />
                      </div>
                      <small>
                        当前 Lv.{currentLevel}
                        {remaining > 0 ? ` · 还差 ${remaining} 级` : ''}
                      </small>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {activePanels.map((tool) => {
        const Panel = PANELS[tool.id];
        return <Panel key={tool.id} />;
      })}
    </>
  );
}
