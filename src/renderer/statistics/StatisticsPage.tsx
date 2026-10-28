import { useCallback, useEffect, useState } from 'react';
import type { AppSettingsSnapshot } from '../../shared/types/settings';
import type { StatisticsSnapshot } from '../../shared/types/statistics';
import { AppearancePanel } from './AppearancePanel';
import { GrowthPanel } from './GrowthPanel';
import { InventoryPanel } from './InventoryPanel';
import { Onboarding } from './Onboarding';
import { OverviewPanel } from './OverviewPanel';
import { SettingsPanel } from './SettingsPanel';
import { ToolboxPanel } from './ToolboxPanel';

type Page = 'home' | 'growth' | 'appearance' | 'tools' | 'settings';

const pages: readonly { id: Page; label: string; icon: string }[] = [
  { id: 'home', label: '首页', icon: '⌂' },
  { id: 'growth', label: '成长', icon: '✦' },
  { id: 'appearance', label: '外观', icon: '◇' },
  { id: 'tools', label: '工具', icon: '◷' },
  { id: 'settings', label: '设置', icon: '⚙' },
];

const pageCopy: Record<Page, { title: string; description: string }> = {
  home: { title: '早上好，今天也一起加油', description: '查看今日活动与桌宠成长状态。' },
  growth: { title: '成长记录', description: '了解经验来源、等级进度和解锁奖励。' },
  appearance: { title: '外观与背包', description: '更换伙伴、场景和饰品，或合成新的收藏。' },
  tools: { title: '桌面工具箱', description: '专注、记录和休息提醒，各自独立启停。' },
  settings: { title: '设置与隐私', description: '控制统计、动画、开机启动和本地数据。' },
};

export function StatisticsPage() {
  const [page, setPage] = useState<Page>('home');
  const [data, setData] = useState<StatisticsSnapshot>();
  const [settings, setSettings] = useState<AppSettingsSnapshot>();
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [statistics, appSettings] = await Promise.all([
        window.desktopApi.getStatistics(),
        window.desktopApi.getAppSettings(),
      ]);
      setData(statistics);
      setSettings(appSettings);
      setError('');
    } catch {
      setError('无法读取本地数据。请检查用户数据目录或重新启动 DeskPet。');
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'animations-disabled',
      settings?.animationsEnabled === false,
    );
  }, [settings?.animationsEnabled]);

  const copy = pageCopy[page];
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <span className="brand-paw">●</span>
          <div>
            <strong>DeskPet</strong>
            <small>LOCAL COMPANION</small>
          </div>
        </div>
        <nav aria-label="控制中心导航">
          {pages.map((entry) => (
            <button
              key={entry.id}
              className={page === entry.id ? 'active' : ''}
              aria-current={page === entry.id ? 'page' : undefined}
              onClick={() => setPage(entry.id)}
            >
              <span>{entry.icon}</span>
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-privacy">
          <span>✓</span>
          <div>
            <strong>本地优先</strong>
            <small>数据不会自动上传</small>
          </div>
        </div>
        <small className="sidebar-version">v{settings?.appVersion ?? '1.0.0'}</small>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
          <div className="dashboard-status">
            <span className={settings?.inputTracking.running ? 'state-dot active' : 'state-dot'} />
            {settings?.inputTracking.running ? '聚合统计中' : '统计已暂停'}
            <button className="refresh-button" aria-label="刷新数据" onClick={() => void refresh()}>
              ↻
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner" role="alert">
            <strong>读取失败</strong>
            <span>{error}</span>
            <button onClick={() => void refresh()}>重试</button>
          </div>
        )}
        <div className="dashboard-content">
          {!data || !settings ? (
            <div className="loading-state" aria-live="polite">
              <span />
              <strong>正在准备控制中心…</strong>
            </div>
          ) : (
            <>
              {page === 'home' && <OverviewPanel data={data} navigate={setPage} />}
              {page === 'growth' && <GrowthPanel data={data} />}
              {page === 'appearance' && (
                <div className="appearance-layout">
                  <AppearancePanel />
                  <InventoryPanel />
                </div>
              )}
              {page === 'tools' && <ToolboxPanel />}
              {page === 'settings' && (
                <SettingsPanel
                  settings={settings}
                  onSettings={setSettings}
                  onDataChanged={() => void refresh()}
                />
              )}
            </>
          )}
        </div>
      </main>
      {settings && !settings.onboardingCompleted && <Onboarding onComplete={setSettings} />}
    </div>
  );
}
