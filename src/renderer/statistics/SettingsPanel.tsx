import { useEffect, useState } from 'react';
import { UI_ICONS } from '../../data/catalogs/appearance';
import type { AppInstallInfo } from '../../shared/types/app-install';
import type { AppPreferenceChange, AppSettingsSnapshot } from '../../shared/types/settings';
import { CatalogIcon } from './CatalogIcon';

const INSTALL_KIND_LABELS: Record<AppInstallInfo['kind'], string> = {
  installed: '安装版',
  portable: '免安装版',
  development: '开发模式',
};

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
  const [installInfo, setInstallInfo] = useState<AppInstallInfo>();
  const [uninstalling, setUninstalling] = useState(false);

  useEffect(() => {
    void window.desktopApi
      .getAppInstallInfo()
      .then(setInstallInfo)
      .catch(() => setInstallInfo(undefined));
  }, []);

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
      if (next.inputTracking.error) {
        setMessage(`键鼠统计不可用：${next.inputTracking.error}`);
      } else {
        setMessage(next.inputTracking.enabled ? '聚合统计已启用。' : '聚合统计已暂停。');
      }
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

  async function openFolder(target: 'install' | 'userData') {
    try {
      await window.desktopApi.openAppFolder(target);
    } catch {
      setMessage('无法打开目录，请手动从资源管理器访问。');
    }
  }

  async function uninstall(clearData: boolean) {
    setUninstalling(true);
    try {
      const status = await window.desktopApi.uninstallApp(clearData);
      if (status === 'started') setMessage('卸载程序已启动，DeskPet 即将退出。');
      else if (status === 'cancelled') setMessage('已取消卸载。');
      else if (status === 'portable')
        setMessage('免安装版没有系统卸载程序，请直接删除程序文件夹。');
      else if (status === 'development') setMessage('当前为开发模式，不需要卸载；关闭窗口即可。');
      else setMessage('卸载程序启动失败，请在 Windows“设置 → 应用”中卸载。');
    } catch {
      setMessage('卸载失败，请在 Windows“设置 → 应用”中卸载。');
    } finally {
      setUninstalling(false);
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
          <span
            className={
              settings.inputTracking.error
                ? 'state-chip warning'
                : settings.inputTracking.running
                  ? 'state-chip active'
                  : 'state-chip'
            }
          >
            {settings.inputTracking.error
              ? '统计不可用'
              : settings.inputTracking.running
                ? '统计中'
                : '已暂停'}
          </span>
        </div>
        {settings.inputTracking.error && (
          <div className="status-banner error" role="alert">
            <span>
              <strong>键鼠统计没有启动</strong>
              <br />
              桌宠、成长和工具箱仍可正常使用。原因：{settings.inputTracking.error}
            </span>
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void setInput(true)}
            >
              重试启用
            </button>
          </div>
        )}
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

      <section className="content-card settings-section" aria-label="安装与卸载">
        <div className="section-heading">
          <div>
            <span className="eyebrow">INSTALLATION</span>
            <h2>安装与卸载</h2>
          </div>
          <span className="privacy-chip">
            {installInfo ? INSTALL_KIND_LABELS[installInfo.kind] : '读取中'}
          </span>
        </div>
        <div className="install-summary">
          <div>
            <strong>DeskPet {installInfo?.version ?? settings.appVersion}</strong>
            <small>程序目录：{installInfo?.installPath ?? '读取中…'}</small>
            <small>数据目录：{installInfo?.userDataPath ?? '读取中…'}</small>
          </div>
          <div className="data-actions">
            <button
              className="secondary-button"
              disabled={!installInfo}
              onClick={() => void openFolder('install')}
            >
              打开程序目录
            </button>
            <button
              className="secondary-button"
              disabled={!installInfo}
              onClick={() => void openFolder('userData')}
            >
              打开数据目录
            </button>
          </div>
        </div>
        {installInfo?.kind === 'installed' && (
          <div className="uninstall-actions">
            <p>卸载程序；默认保留等级、装扮、便签和设置等本地数据，重新安装后可继续使用。</p>
            <div className="actions">
              <button
                className="secondary-button"
                disabled={uninstalling}
                onClick={() => void uninstall(false)}
              >
                卸载 DeskPet
              </button>
              <button
                className="danger-button"
                disabled={uninstalling}
                onClick={() => void uninstall(true)}
              >
                卸载并清除数据
              </button>
            </div>
          </div>
        )}
        {installInfo?.kind === 'portable' && (
          <p className="install-hint">
            当前为免安装版：直接删除解压出来的程序文件夹即可完成卸载。用户数据保存在
            “数据目录”，可在上面的“本地数据”中重置，或手动删除该目录。
          </p>
        )}
        {installInfo?.kind === 'development' && (
          <p className="install-hint">当前为开发模式，没有安装到系统，无需卸载。</p>
        )}
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
