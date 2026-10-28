import { useEffect, useState } from 'react';
import type { ToolState } from '../../shared/types/tool';
import { FocusPanel } from './FocusPanel';
import { NotesPanel } from './NotesPanel';
import { SedentaryPanel } from './SedentaryPanel';
import { SummaryPanel } from './SummaryPanel';

export function ToolboxPanel() {
  const [tools, setTools] = useState<ToolState[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void window.desktopApi
      .listTools()
      .then(setTools)
      .catch(() => setError('无法读取工具设置。'));
  }, []);
  const enabled = (id: ToolState['id']) => tools.find((tool) => tool.id === id)?.enabled;
  async function toggle(tool: ToolState) {
    try {
      setTools(await window.desktopApi.setToolEnabled(tool.id, !tool.enabled));
      setError('');
    } catch {
      setError('无法更新工具设置。');
    }
  }
  return (
    <>
      <section aria-label="工具箱设置">
        <h2>工具箱</h2>
        {error && <p role="alert">{error}</p>}
        <div className="tool-toggles">
          {tools.map((tool) => (
            <label key={tool.id}>
              <input type="checkbox" checked={tool.enabled} onChange={() => void toggle(tool)} />{' '}
              {tool.name}
            </label>
          ))}
        </div>
      </section>
      {enabled('focus') && <FocusPanel />}
      {enabled('notes') && <NotesPanel />}
      {enabled('sedentary') && <SedentaryPanel />}
      {enabled('daily_summary') && <SummaryPanel />}
    </>
  );
}
