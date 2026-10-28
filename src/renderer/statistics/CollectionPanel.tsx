import { useState } from 'react';
import { CHARACTERS, ITEMS, SCENES, UI_ICONS } from '../../data/catalogs/appearance';
import { RARITY_LABELS, type Appearance } from '../../shared/types/appearance';
import { CatalogIcon } from './CatalogIcon';
import { isTransparentScene, sceneBackgroundStyle } from './scene-style';

type Tab = 'item' | 'character' | 'scene';

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'item', label: '装扮 25' },
  { id: 'character', label: '伙伴 8' },
  { id: 'scene', label: '场景 8' },
];

/** 收藏图鉴：未获得的条目显示剪影与解锁等级，方便查看收集目标。 */
export function CollectionPanel({ appearance }: { appearance: Appearance }) {
  const [tab, setTab] = useState<Tab>('item');

  const ownedItems = new Map(
    appearance.inventory
      .filter((entry) => entry.quantity > 0)
      .map((entry) => [entry.itemId, entry.quantity]),
  );
  const hasUnlock = (id: string, level: number) =>
    appearance.unlocks.includes(id) || appearance.level >= level;

  const itemCount = ITEMS.filter((item) => ownedItems.has(item.id)).length;
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
          <p>未获得的收藏会显示剪影，并标注需要的等级。</p>
        </div>
        <span className="privacy-chip">已收集 {totalCount} / 41</span>
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
            return (
              <article
                className={owned > 0 ? 'collection-item' : 'collection-item locked'}
                key={item.id}
                aria-label={`${item.name}，${
                  owned > 0 ? `已收集 ${owned} 件` : `未获得，等级 ${item.unlockLevel} 解锁`
                }`}
              >
                <CatalogIcon src={item.asset} fallback={UI_ICONS.app} />
                <strong>{item.name}</strong>
                <small>
                  {owned > 0 ? RARITY_LABELS[item.rarity] : `Lv.${item.unlockLevel} 解锁`}
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
