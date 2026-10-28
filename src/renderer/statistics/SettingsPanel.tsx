import { useState } from 'react';
import { UI_ICONS } from '../../data/catalogs/appearance';
import type { AppPreferenceChange, AppSettingsSnapshot } from '../../shared/types/settings';
import { CatalogIcon } from './CatalogIcon';

export function SettingsPanel({
  settings,
  onSettings,
  onDataChanged,
}: {
  settings: AppSettingsSnapshot;
  onSettings: (settings: AppSettingsSnapshot) => void;
  onDataChanged: () => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function update(change: AppPreferenceChange) {
    setBusy(true);
    try {
      onSettings(await window.desktopApi.updateAppPreference(change));
      setMessage('设置已保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '设置保存失败。');
    } finally {
      setBusy(false);
    }
  }

  async function setInput(enabled: boolean) {
    setBusy(true);
    try {
      const next = await window.desktopApi.setInputTracking(enabled);
      onSettings(next);
      setMessage(next.inputTracking.enabled ? '聚合统计已启用。' : '聚合统计已暂停。');
    } catch {
      setMessage('无法更新统计开关。');
    } finally {
      setBusy(false);
    }
  }

  async function exportStatistics() {
    try {
      if (await window.desktopApi.exportStatistics()) setMessage('CSV 已导出。');
    } catch {
      setMessage('导出失败，请检查文件权限。');
    }
  }

  async function clearStatistics() {
    try {
      if (await window.desktopApi.clearStatistics()) {
        setMessage('键鼠统计已清除，成长数据保持不变。');
        onDataChanged();
      }
    } catch {
      setMessage('无法清除键鼠统计。');
    }
  }

  async function resetAllData() {
    try {
      if (await window.desktopApi.resetAllData()) window.location.reload();
    } catch {
      setMessage('本地数据重置失败。');
    }
  }

  async function replayOnboarding() {
    try {
      onSettings(await window.desktopApi.updateAppPreference({ onboardingCompleted: false }));
      window.location.reload();
    } catch {
      setMessage('无法打开使用引导。');
    }
  }

  return (
    <>
      {message && (
        <div className="status-banner" role="status">
          {message}
        </div>
      )}
      <section className="content-card settings-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPERIENCE</span>
            <h2>应用体验</h2>
          </div>
        </div>
        <div className="settings-list">
          <label className="setting-row">
            <span>
              <strong>桌宠动画</strong>
              <small>关闭待机、专注和升级动态效果</small>
            </span>
            <input
              type="checkbox"
              checked={settings.animationsEnabled}
              disabled={busy}
              onChange={(event) => void update({ animationsEnabled: event.target.checked })}
            />
          </label>
          <label className="setting-row">
            <span>
              <strong>开机启动</strong>
              <small>
                {settings.canLaunchAtLogin ? '登录 Windows 后自动启动 DeskPet' : '仅打包版本可设置'}
              </small>
            </span>
            <input
              type="checkbox"
              checked={settings.launchAtLogin}
              disabled={busy || !settings.canLaunchAtLogin}
              onChange={(event) => void update({ launchAtLogin: event.target.checked })}
            />
          </label>
        </div>
      </section>

      <section className="content-card settings-section privacy-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PRIVACY</span>
            <h2>隐私与键鼠统计</h2>
          </div>
          <span className={settings.inputTracking.running ? 'state-chip active' : 'state-chip'}>
            {settings.inputTracking.running ? '统计中' : '已暂停'}
          </span>
        </div>
        <div className="privacy-explainer">
          <span className="shield-mark">✓</span>
          <div>
            <strong>只记录聚合次数</strong>
            <p>
              DeskPet
              不保存按键内容、输入顺序、鼠标位置、轨迹、窗口标题或访问的网站。数据不会自动上传。
            </p>
          </div>
        </div>
        <div className="settings-list">
          <label className="setting-row">
            <span>
              <strong>全局键鼠次数统计</strong>
              <small>也可使用 Ctrl + Alt + Shift + P 随时切换</small>
            </span>
            <input
              type="checkbox"
              checked={settings.inputTracking.enabled}
              disabled={busy}
              onChange={(event) => void setInput(event.target.checked)}
            />
          </label>
        </div>
      </section>

      <section className="content-card settings-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LOCAL DATA</span>
            <h2>本地数据</h2>
          </div>
        </div>
        <div className="data-actions">
          <button className="secondary-button" onClick={() => void exportStatistics()}>
            导出统计 CSV
          </button>
          <button className="secondary-button" onClick={() => void clearStatistics()}>
            清除键鼠统计
          </button>
          <button className="danger-button" onClick={() => void resetAllData()}>
            重置全部本地数据
          </button>
        </div>
      </section>

      <section className="content-card settings-section" aria-label="版本与素材许可">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ABOUT &amp; LICENSES</span>
            <h2>版本与素材许可</h2>
          </div>
          <span className="privacy-chip">v{settings.appVersion}</span>
        </div>
        <div className="license-card">
          <CatalogIcon src={UI_ICONS.app} fallback={UI_ICONS.app} alt="" />
          <div>
            <strong>DeskPet {settings.appVersion} · 成长与收藏</strong>
            <p>
              v1.1
              新增等级解锁路线、每日签到、成就、合成工坊、五槽位饰品与四个新工具；输入与专注的经验不再封顶。
            </p>
            <p>
              角色、装扮、场景与界面图标来自 Microsoft Fluent Emoji（MIT 许可证），已统一处理为透明
              PNG；完整来源与许可文本见项目文档 docs/THIRD_PARTY_NOTICES.md 与
              public/assets/licenses/。
            </p>
          </div>
        </div>
      </section>

      <section className="content-card about-card">
        <div>
          <CatalogIcon className="brand-paw" src={UI_ICONS.app} fallback={UI_ICONS.app} alt="" />
          <div>
            <strong>DeskPet {settings.appVersion}</strong>
            <small>本地优先 · 离线可用 · 无账号</small>
          </div>
        </div>
        <button className="text-button" onClick={() => void replayOnboarding()}>
          重新查看使用引导
        </button>
      </section>
    </>
  );
}
