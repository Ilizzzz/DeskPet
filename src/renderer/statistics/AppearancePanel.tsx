import { useEffect, useState } from 'react';
import { CHARACTERS, ITEMS, SCENES, UI_ICONS } from '../../data/catalogs/appearance';
import {
  ITEM_SLOTS,
  RARITY_LABELS,
  SLOT_LABELS,
  type AppearanceChange,
} from '../../shared/types/appearance';
import { loadAppearance, publishAppearance, useAppearance } from './appearance-store';
import { CatalogIcon } from './CatalogIcon';
import { PetPreview } from './PetPreview';
import { isTransparentScene, sceneBackgroundStyle } from './scene-style';

export function AppearancePanel() {
  const appearance = useAppearance();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadAppearance().catch(() => {
      if (active) setError('无法读取外观数据，请稍后重试。');
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!appearance) return;
    const equippedIds = ITEM_SLOTS.flatMap((slot) =>
      appearance.equipped[slot] ? [appearance.equipped[slot]] : [],
    );
    setSelectedItemId((current) =>
      current && equippedIds.includes(current) ? current : (equippedIds[0] ?? null),
    );
  }, [appearance]);

  async function change(next: AppearanceChange) {
    setBusy(true);
    try {
      publishAppearance(await window.desktopApi.setAppearance(next));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '更换失败，请确认已解锁或拥有该物品。');
    } finally {
      setBusy(false);
    }
  }

  if (!appearance) {
    return (
      <section className="content-card appearance-panel" aria-busy="true">
        <div className="section-heading">
          <div>
            <span className="eyebrow">APPEARANCE</span>
            <h2>外观</h2>
          </div>
        </div>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="inline-loading">正在读取外观…</p>
        )}
      </section>
    );
  }

  const owned = new Map(
    appearance.inventory
      .filter((entry) => entry.quantity > 0)
      .map((entry) => [entry.itemId, entry.quantity]),
  );
  const equippedCount = ITEM_SLOTS.filter((slot) => appearance.equipped[slot]).length;
  const equippedItems = ITEM_SLOTS.flatMap((slot) => {
    const itemId = appearance.equipped[slot];
    const item = itemId ? ITEMS.find((entry) => entry.id === itemId) : undefined;
    return item ? [{ slot, item }] : [];
  });
  const selectedItem = equippedItems.find((entry) => entry.item.id === selectedItemId);
  const savedAdjustment = appearance.itemAdjustments.find(
    (entry) => entry.characterId === appearance.character && entry.itemId === selectedItem?.item.id,
  );
  const adjustment = savedAdjustment ?? {
    characterId: appearance.character,
    itemId: selectedItem?.item.id ?? '',
    offsetX: 0,
    offsetY: 0,
    scalePercent: 100,
  };

  function updateAdjustment(next: { offsetX?: number; offsetY?: number; scalePercent?: number }) {
    if (!selectedItem) return;
    void change({
      adjustment: {
        itemId: selectedItem.item.id,
        offsetX: Math.max(-128, Math.min(128, next.offsetX ?? adjustment.offsetX)),
        offsetY: Math.max(-128, Math.min(128, next.offsetY ?? adjustment.offsetY)),
        scalePercent: Math.max(50, Math.min(150, next.scalePercent ?? adjustment.scalePercent)),
      },
    });
  }

  return (
    <div className="appearance-panel">
      <section className="content-card" aria-label="当前外观">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CURRENT LOOK</span>
            <h2>当前外观</h2>
            <p>桌面上的伙伴会实时使用这里的选择。</p>
          </div>
          <span className="privacy-chip">已佩戴 {equippedCount} / 5</span>
        </div>
        <PetPreview appearance={appearance} />
        <div className="accessory-adjuster" aria-label="装饰位置微调">
          <div className="accessory-adjuster-head">
            <div>
              <strong>装饰位置微调</strong>
              <small>
                只影响「{CHARACTERS.find((entry) => entry.id === appearance.character)?.name}
                」上的当前装饰
              </small>
            </div>
            {selectedItem && (
              <button
                type="button"
                disabled={busy || !savedAdjustment}
                onClick={() => updateAdjustment({ offsetX: 0, offsetY: 0, scalePercent: 100 })}
              >
                恢复默认
              </button>
            )}
          </div>
          {equippedItems.length ? (
            <>
              <div className="adjustment-item-tabs" role="group" aria-label="选择要调整的装饰">
                {equippedItems.map(({ slot, item }) => (
                  <button
                    type="button"
                    key={item.id}
                    className={selectedItemId === item.id ? 'selected' : ''}
                    aria-pressed={selectedItemId === item.id}
                    disabled={busy}
                    onClick={() => setSelectedItemId(item.id)}
                  >
                    {SLOT_LABELS[slot]} · {item.name}
                  </button>
                ))}
              </div>
              {selectedItem && (
                <div className="adjustment-controls">
                  <div className="position-pad" aria-label="移动装饰">
                    <button
                      type="button"
                      aria-label="向上移动"
                      disabled={busy || adjustment.offsetY <= -128}
                      onClick={() => updateAdjustment({ offsetY: adjustment.offsetY - 4 })}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label="向左移动"
                      disabled={busy || adjustment.offsetX <= -128}
                      onClick={() => updateAdjustment({ offsetX: adjustment.offsetX - 4 })}
                    >
                      ←
                    </button>
                    <span aria-hidden="true">移动</span>
                    <button
                      type="button"
                      aria-label="向右移动"
                      disabled={busy || adjustment.offsetX >= 128}
                      onClick={() => updateAdjustment({ offsetX: adjustment.offsetX + 4 })}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      aria-label="向下移动"
                      disabled={busy || adjustment.offsetY >= 128}
                      onClick={() => updateAdjustment({ offsetY: adjustment.offsetY + 4 })}
                    >
                      ↓
                    </button>
                  </div>
                  <div className="adjustment-values">
                    <span>
                      水平 {adjustment.offsetX > 0 ? '+' : ''}
                      {adjustment.offsetX}
                    </span>
                    <span>
                      垂直 {adjustment.offsetY > 0 ? '+' : ''}
                      {adjustment.offsetY}
                    </span>
                  </div>
                  <div className="scale-control" aria-label="调整装饰大小">
                    <button
                      type="button"
                      aria-label="缩小装饰"
                      disabled={busy || adjustment.scalePercent <= 50}
                      onClick={() =>
                        updateAdjustment({ scalePercent: adjustment.scalePercent - 5 })
                      }
                    >
                      −
                    </button>
                    <span>大小 {adjustment.scalePercent}%</span>
                    <button
                      type="button"
                      aria-label="放大装饰"
                      disabled={busy || adjustment.scalePercent >= 150}
                      onClick={() =>
                        updateAdjustment({ scalePercent: adjustment.scalePercent + 5 })
                      }
                    >
                      ＋
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="adjustment-empty">先佩戴一件装饰，再在这里调整位置和大小。</p>
          )}
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="content-card" aria-label="选择伙伴">
        <div className="section-heading">
          <div>
            <span className="eyebrow">COMPANIONS</span>
            <h2>伙伴</h2>
            <p>达到等级后自动解锁，随时可以换回喜欢的伙伴。</p>
          </div>
        </div>
        <div className="character-grid">
          {CHARACTERS.map((entry) => {
            const unlocked =
              appearance.unlocks.includes(entry.id) || appearance.level >= entry.unlockLevel;
            const selected = appearance.character === entry.id;
            return (
              <button
                type="button"
                key={entry.id}
                className={`character-card ${selected ? 'selected' : ''} ${
                  unlocked ? '' : 'locked'
                }`}
                aria-pressed={selected}
                aria-label={`${entry.name}，${unlocked ? '已解锁' : `等级 ${entry.unlockLevel} 解锁`}`}
                disabled={!unlocked || busy}
                onClick={() => void change({ character: entry.id })}
              >
                <CatalogIcon src={entry.asset} fallback={UI_ICONS.app} />
                <strong>{entry.name}</strong>
                <small>
                  {unlocked ? (selected ? '使用中' : '已解锁') : `Lv.${entry.unlockLevel} 解锁`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="content-card" aria-label="选择场景">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SCENES</span>
            <h2>场景</h2>
            <p>选择宠物脚下的小地毯，也可以保持无地面装饰。</p>
          </div>
        </div>
        <div className="scene-grid">
          {SCENES.map((entry) => {
            const unlocked =
              appearance.unlocks.includes(entry.id) || appearance.level >= entry.unlockLevel;
            const selected = appearance.scene === entry.id;
            return (
              <button
                type="button"
                key={entry.id}
                className={`scene-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}`}
                aria-pressed={selected}
                aria-label={`${entry.name}，${unlocked ? '已解锁' : `等级 ${entry.unlockLevel} 解锁`}`}
                disabled={!unlocked || busy}
                onClick={() => void change({ scene: entry.id })}
              >
                <span
                  className={
                    isTransparentScene(entry) ? 'scene-swatch transparent' : 'scene-swatch'
                  }
                  style={sceneBackgroundStyle(entry)}
                />
                <strong>{entry.name}</strong>
                <small>
                  {unlocked ? (selected ? '使用中' : '已解锁') : `Lv.${entry.unlockLevel} 解锁`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="content-card" aria-label="选择饰品">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ACCESSORIES</span>
            <h2>五槽位饰品</h2>
            <p>头部、颈部、面部、手持和背部可以同时佩戴。</p>
          </div>
          <span className="privacy-chip">拥有即穿戴</span>
        </div>
        {ITEM_SLOTS.map((slot) => {
          const items = ITEMS.filter((item) => item.slot === slot);
          const equippedId = appearance.equipped[slot];
          return (
            <div className="slot-group" key={slot}>
              <header>
                <strong>{SLOT_LABELS[slot]}</strong>
                <button
                  type="button"
                  disabled={!equippedId || busy}
                  onClick={() => void change({ equipped: { slot, itemId: null } })}
                >
                  卸下
                </button>
              </header>
              <div className="item-grid">
                {items.map((item) => {
                  const quantity = owned.get(item.id) ?? 0;
                  const unlocked = quantity > 0;
                  const selected = equippedId === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`item-card ${selected ? 'selected' : ''} ${
                        unlocked ? '' : 'locked'
                      }`}
                      aria-pressed={selected}
                      aria-label={`${item.name}，${RARITY_LABELS[item.rarity]}，${
                        unlocked ? `拥有 ${quantity} 件` : '尚未拥有，可通过掉落或兑换获得'
                      }`}
                      disabled={!unlocked || busy}
                      onClick={() => void change({ equipped: { slot, itemId: item.id } })}
                    >
                      <CatalogIcon src={item.asset} fallback={UI_ICONS.app} />
                      <span className="item-card-body">
                        <span>
                          <strong>{item.name}</strong>
                        </span>
                        <span>
                          <span className={`rarity-badge rarity-${item.rarity}`}>
                            {RARITY_LABELS[item.rarity]}
                          </span>
                          <small>{unlocked ? `拥有 ${quantity}` : '尚未拥有'}</small>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
