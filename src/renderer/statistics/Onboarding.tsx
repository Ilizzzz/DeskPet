import { useState } from 'react';
import { CHARACTERS, UI_ICONS } from '../../data/catalogs/appearance';
import type { AppSettingsSnapshot } from '../../shared/types/settings';
import { CatalogIcon } from './CatalogIcon';

const HIGHLIGHTS: readonly { icon: string; title: string; text: string }[] = [
  {
    icon: UI_ICONS.growth,
    title: '成长解锁',
    text: '键盘、鼠标和专注都会累积经验；升级自动解锁新伙伴、场景、装扮和工具。',
  },
  {
    icon: UI_ICONS.checkin,
    title: '每日签到',
    text: '每天签到领取星星币和星光碎片，连续签到还有额外碎片奖励。',
  },
  {
    icon: UI_ICONS.coins,
    title: '合成工坊',
    text: '用碎片兑换普通装扮，再把材料合成高级装扮与传说收藏。',
  },
  {
    icon: UI_ICONS.appearance,
    title: '五槽位装扮',
    text: '头部、颈部、面部、手持和背部五个槽位可以自由搭配。',
  },
];

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
        <div className="onboarding-pet">
          <img
            src={CHARACTERS[0].asset}
            alt=""
            onError={(event) => (event.currentTarget.hidden = true)}
          />
        </div>
        <span className="eyebrow">WELCOME TO DESKPET</span>
        <h1 id="welcome-title">你好，我会安静地陪你工作</h1>
        <p className="onboarding-lead">
          DeskPet 是一只完全本地运行的 Windows 桌宠。无需账号，也不会自动上传你的数据。
        </p>
        <div className="onboarding-points">
          {HIGHLIGHTS.map((entry) => (
            <article key={entry.title}>
              <CatalogIcon src={entry.icon} fallback={UI_ICONS.app} alt="" />
              <div>
                <strong>{entry.title}</strong>
                <p>{entry.text}</p>
              </div>
            </article>
          ))}
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
        <small>统计只记录聚合次数，不读取内容；无论选择哪项，之后都可以在“设置”中更改。</small>
      </div>
    </div>
  );
}
