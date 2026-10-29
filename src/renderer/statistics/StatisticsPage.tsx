import { useCallback, useEffect, useRef, useState } from 'react';
import { UI_ICONS } from '../../data/catalogs/appearance';
import type { AppSettingsSnapshot } from '../../shared/types/settings';
import type { StatisticsSnapshot } from '../../shared/types/statistics';
import { AppearancePanel } from './AppearancePanel';
import { loadAppearance } from './appearance-store';
import { CatalogIcon } from './CatalogIcon';
import { GrowthPanel } from './GrowthPanel';
import { InventoryPanel } from './InventoryPanel';
import { Onboarding } from './Onboarding';
import { OverviewPanel } from './OverviewPanel';
import { SettingsPanel } from './SettingsPanel';
import { ToolboxPanel } from './ToolboxPanel';

type Page = 'home' | 'growth' | 'appearance' | 'tools' | 'settings';

const pages: readonly {
  id: Page;
  label: string;
  icon: string;
  title: string;
  description: string;
}[] = [
  {
    id: 'home',
    label: '首页',
    icon: UI_ICONS.home,
    title: '今天也在慢慢长大',
    description: '今日数据、成长进度和下一个解锁都在这里。',
  },
  {
    id: 'growth',
    label: '成长',
    icon: UI_ICONS.growth,
    title: '成长与解锁',
    description: '等级经验、分类解锁路线、成就与每日签到。',
  },
  {
    id: 'appearance',
    label: '外观',
    icon: UI_ICONS.appearance,
    title: '外观与收藏',
    description: '更换伙伴、地毯和五槽位饰品，查看掉落、兑换与收藏进度。',
  },
  {
    id: 'tools',
    label: '工具',
    icon: UI_ICONS.tools,
    title: '桌面工具箱',
    description: '专注、记录和休息提醒，随等级逐步解锁。',
  },
  {
    id: 'settings',
    label: '设置',
    icon: UI_ICONS.settings,
    title: '设置与隐私',
    description: '调整宠物大小、动作、统计、开机启动和数据管理。',
  },
];

export function StatisticsPage() {
  const [page, setPage] = useState<Page>('home');
  const [data, setData] = useState<StatisticsSnapshot>();
  const [settings, setSettings] = useState<AppSettingsSnapshot>();
  const [error, setError] = useState('');
  const lastLevel = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const [statistics, appSettings] = await Promise.all([
        window.desktopApi.getStatistics(),
        window.desktopApi.getAppSettings(),
      ]);
      // 升级会解锁新的角色/场景/装扮，外观页缓存需要同步刷新。
      if (lastLevel.current !== undefined && statistics.growth.level !== lastLevel.current) {
        void loadAppearance();
      }
      lastLevel.current = statistics.growth.level;
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

  const copy = pages.find((entry) => entry.id === page) ?? pages[0];
  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <CatalogIcon className="brand-paw" src={UI_ICONS.app} fallback={UI_ICONS.app} />
          <div>
            <strong>DeskPet</strong>
            <small>DESKTOP COMPANION</small>
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
              <CatalogIcon src={entry.icon} fallback={UI_ICONS.app} />
              {entry.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-privacy">
          <CatalogIcon src={UI_ICONS.checkin} fallback={UI_ICONS.app} alt="" />
          <div>
            <strong>今日陪伴</strong>
            <small>成长、装扮与专注</small>
          </div>
        </div>
        <small className="sidebar-version">v{settings?.appVersion ?? '1.1.0'}</small>
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
              刷新数据
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
