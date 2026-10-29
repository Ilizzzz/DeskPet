import { useState } from 'react';
import { CHARACTERS, ITEMS, SCENES, UI_ICONS } from '../../data/catalogs/appearance';
import { RARITY_LABELS, type Appearance } from '../../shared/types/appearance';
import { itemEconomy } from '../../data/catalogs/economy';
import { CatalogIcon } from './CatalogIcon';
import { isTransparentScene, sceneBackgroundStyle } from './scene-style';

type Tab = 'item' | 'character' | 'scene';

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'item', label: `装扮 ${ITEMS.length}` },
  { id: 'character', label: `伙伴 ${CHARACTERS.length}` },
  { id: 'scene', label: `地面 ${SCENES.length}` },
];

/** 收藏图鉴：未获得的条目显示剪影与获得方式，方便查看收集目标。 */
export function CollectionPanel({ appearance }: { appearance: Appearance }) {
  const [tab, setTab] = useState<Tab>('item');

  const ownedItems = new Map(
    appearance.inventory
      .filter((entry) => entry.quantity > 0)
      .map((entry) => [entry.itemId, entry.quantity]),
  );
  const hasUnlock = (id: string, level: number) =>
    appearance.unlocks.includes(id) || appearance.level >= level;

  const itemCount = ITEMS.filter((item) => appearance.discoveredItemIds.includes(item.id)).length;
  const characterCount = CHARACTERS.filter((entry) =>
    hasUnlock(entry.id, entry.unlockLevel),
  ).length;
  const sceneCount = SCENES.filter((entry) => hasUnlock(entry.id, entry.unlockLevel)).length;
  const totalCount = itemCount + characterCount + sceneCount;

  return (
    <section className="content-card" aria-label="收藏图鉴">
      <div className="section-heading">
        <div>
          <span className="eyebrow">COLLECTION</span>
          <h2>收藏图鉴</h2>
          <p>未获得的收藏会显示剪影，并标注掉落、兑换或成长纪念来源。</p>
        </div>
        <span className="privacy-chip">
          已收集 {totalCount} / {ITEMS.length + CHARACTERS.length + SCENES.length}
        </span>
      </div>
      <div className="unlock-toolbar">
        <div className="filter-chips" role="group" aria-label="切换图鉴分类">
          {TABS.map((entry) => (
            <button key={entry.id} aria-pressed={tab === entry.id} onClick={() => setTab(entry.id)}>
              {entry.label}
            </button>
          ))}
        </div>
        <span className="collection-counts">
          <span>
            装扮 {itemCount}/{ITEMS.length}
          </span>
          <span>
            伙伴 {characterCount}/{CHARACTERS.length}
          </span>
          <span>
            场景 {sceneCount}/{SCENES.length}
          </span>
        </span>
      </div>

      {tab === 'item' && (
        <div className="collection-grid" aria-label="装扮收藏">
          {ITEMS.map((item) => {
            const owned = ownedItems.get(item.id) ?? 0;
            const discovered = appearance.discoveredItemIds.includes(item.id);
            const economy = itemEconomy(item.id);
            return (
              <article
                className={discovered ? 'collection-item' : 'collection-item locked'}
                key={item.id}
                aria-label={`${item.name}，${
                  owned > 0 ? `当前拥有 ${owned} 件` : discovered ? '曾经获得' : '尚未获得'
                }`}
              >
                <CatalogIcon src={item.asset} fallback={UI_ICONS.app} />
                <strong>{item.name}</strong>
                <small>
                  {owned > 0
                    ? `${RARITY_LABELS[item.rarity]} · 拥有 ${owned}`
                    : discovered
                      ? '曾获得 · 可兑换取回'
                      : economy?.source === 'milestone'
                        ? `Lv.${economy.milestoneLevel} 纪念`
                        : economy?.source === 'shop'
                          ? '仅星星币兑换'
                          : '掉落或兑换'}
                </small>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'character' && (
        <div className="collection-grid" aria-label="伙伴收藏">
          {CHARACTERS.map((entry) => {
            const owned = hasUnlock(entry.id, entry.unlockLevel);
            return (
              <article
                className={owned ? 'collection-item' : 'collection-item locked'}
                key={entry.id}
                aria-label={`${entry.name}，${owned ? '已获得' : `未获得，等级 ${entry.unlockLevel} 解锁`}`}
              >
                <CatalogIcon src={entry.asset} fallback={UI_ICONS.app} />
                <strong>{entry.name}</strong>
                <small>{owned ? '已获得' : `Lv.${entry.unlockLevel} 解锁`}</small>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'scene' && (
        <div className="collection-grid" aria-label="场景收藏">
          {SCENES.map((entry) => {
            const owned = hasUnlock(entry.id, entry.unlockLevel);
            return (
              <article
                className={owned ? 'collection-item' : 'collection-item locked'}
                key={entry.id}
                aria-label={`${entry.name}，${owned ? '已获得' : `未获得，等级 ${entry.unlockLevel} 解锁`}`}
              >
                <span
                  className={
                    isTransparentScene(entry) ? 'scene-swatch transparent' : 'scene-swatch'
                  }
                  style={sceneBackgroundStyle(entry)}
                />
                <strong>{entry.name}</strong>
                <small>{owned ? '已获得' : `Lv.${entry.unlockLevel} 解锁`}</small>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
