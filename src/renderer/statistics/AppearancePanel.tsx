import { useEffect, useState } from 'react';
import type { Appearance, AppearanceChange } from '../../shared/types/appearance';
import { CHARACTERS, ITEMS, SCENES } from '../../data/catalogs/appearance';

const rarityNames = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' } as const;

export function AppearancePanel() {
  const [appearance, setAppearance] = useState<Appearance>();
  const [error, setError] = useState('');
  useEffect(() => {
    void window.desktopApi
      .getAppearance()
      .then(setAppearance)
      .catch(() => setError('无法读取外观。'));
  }, []);
  async function change(value: AppearanceChange) {
    try {
      setAppearance(await window.desktopApi.setAppearance(value));
      setError('');
    } catch {
      setError('无法更换外观，请确认已解锁或拥有该物品。');
    }
  }
  if (!appearance) return <p>{error || '正在读取外观…'}</p>;
  const owned = new Set(
    appearance.inventory.filter((entry) => entry.quantity > 0).map((entry) => entry.itemId),
  );
  return (
    <section className="content-card" aria-label="桌宠外观">
      <span className="eyebrow">COMPANION</span>
      <h2>桌宠外观</h2>
      {error && <p role="alert">{error}</p>}
      <p>星星币：{appearance.balance}</p>
      <label>
        角色{' '}
        <select
          value={appearance.character}
          onChange={(event) =>
            void change({ character: event.target.value as Appearance['character'] })
          }
        >
          {CHARACTERS.map((entry) => (
            <option
              key={entry.id}
              value={entry.id}
              disabled={entry.id !== 'cat' && !appearance.unlocks.includes(entry.id)}
            >
              {entry.name}（{entry.unlockLevel} 级）
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        场景{' '}
        <select
          value={appearance.scene}
          onChange={(event) => void change({ scene: event.target.value as Appearance['scene'] })}
        >
          {SCENES.map((entry) => (
            <option
              key={entry.id}
              value={entry.id}
              disabled={entry.id !== 'transparent' && !appearance.unlocks.includes(entry.id)}
            >
              {entry.name}（{entry.unlockLevel} 级）
            </option>
          ))}
        </select>
      </label>{' '}
      {(['head', 'neck'] as const).map((slot) => (
        <label key={slot}>
          {slot === 'head' ? '头部' : '颈部'}{' '}
          <select
            value={appearance[slot] ?? ''}
            onChange={(event) =>
              void change({ [slot]: event.target.value || null } as AppearanceChange)
            }
          >
            <option value="">无</option>
            {ITEMS.filter((item) => item.slot === slot).map((item) => (
              <option key={item.id} value={item.id} disabled={!owned.has(item.id)}>
                {item.name} · {rarityNames[item.rarity]}
              </option>
            ))}
          </select>{' '}
        </label>
      ))}
    </section>
  );
}
