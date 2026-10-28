import { useState } from 'react';
import type { AppSettingsSnapshot } from '../../shared/types/settings';

export function Onboarding({
  onComplete,
}: {
  onComplete: (settings: AppSettingsSnapshot) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function complete(enableInput: boolean) {
    setBusy(true);
    try {
      let settings = await window.desktopApi.setInputTracking(enableInput);
      settings = await window.desktopApi.updateAppPreference({ onboardingCompleted: true });
      onComplete(settings);
    } catch {
      setError('暂时无法保存设置，请稍后重试。');
      setBusy(false);
    }
  }

  return (
    <div
      className="onboarding-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="onboarding-card">
        <div className="onboarding-pet">🐱</div>
        <span className="eyebrow">WELCOME TO DESKPET</span>
        <h1 id="welcome-title">你好，我会安静地陪你工作</h1>
        <p className="onboarding-lead">
          DeskPet 是一只完全本地运行的 Windows 桌宠。无需账号，也不会自动上传你的数据。
        </p>
        <div className="onboarding-points">
          <article>
            <span>1</span>
            <div>
              <strong>聚合统计</strong>
              <p>只数键盘按下和鼠标点击次数，不读取内容。</p>
            </div>
          </article>
          <article>
            <span>2</span>
            <div>
              <strong>成长陪伴</strong>
              <p>有效活动和专注会转化为经验、装扮与场景。</p>
            </div>
          </article>
          <article>
            <span>3</span>
            <div>
              <strong>随时掌控</strong>
              <p>统计默认暂停，可从设置、托盘或快捷键切换。</p>
            </div>
          </article>
        </div>
        {error && (
          <p className="onboarding-error" role="alert">
            {error}
          </p>
        )}
        <div className="onboarding-actions">
          <button className="secondary-button" disabled={busy} onClick={() => void complete(false)}>
            保持暂停
          </button>
          <button className="primary-button" disabled={busy} onClick={() => void complete(true)}>
            启用聚合统计
          </button>
        </div>
        <small>无论选择哪项，之后都可以在“设置”中更改。</small>
      </div>
    </div>
  );
}
