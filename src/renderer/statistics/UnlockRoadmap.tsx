import { useState } from 'react';
import { UI_ICONS } from '../../data/catalogs/appearance';
import { UNLOCKS } from '../../data/catalogs/unlocks';
import {
  UNLOCK_CATEGORY_LABELS,
  type UnlockCategory,
  type UnlockEntry,
} from '../../shared/types/unlock';
import { CatalogIcon } from './CatalogIcon';

type Filter = 'all' | UnlockCategory;

const FILTERS: readonly { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'character', label: UNLOCK_CATEGORY_LABELS.character },
  { id: 'scene', label: UNLOCK_CATEGORY_LABELS.scene },
  { id: 'item', label: UNLOCK_CATEGORY_LABELS.item },
  { id: 'tool', label: UNLOCK_CATEGORY_LABELS.tool },
];

const CATEGORY_ICONS: Record<UnlockCategory, string> = {
  character: UI_ICONS.growth,
  scene: UI_ICONS.home,
  item: UI_ICONS.appearance,
  tool: UI_ICONS.tools,
};

const CATEGORIES: readonly UnlockCategory[] = ['character', 'scene', 'item', 'tool'];

/** 按等级解锁的内容路线，伙伴/场景/装扮/工具可筛选查看。 */
export function UnlockRoadmap({ level }: { level: number }) {
  const [filter, setFilter] = useState<Filter>('all');
  const upcomingLevel = UNLOCKS.find((entry) => entry.level > level)?.level;

  function stateOf(entry: UnlockEntry): 'unlocked' | 'current' | 'locked' {
    if (entry.level <= level) return 'unlocked';
    return entry.level === upcomingLevel ? 'current' : 'locked';
  }

  function stateText(entry: UnlockEntry, state: 'unlocked' | 'current' | 'locked'): string {
    if (state === 'unlocked') return '已解锁';
    const gap = entry.level - level;
    return state === 'current' ? `下一个 · 还差 ${gap} 级` : `还差 ${gap} 级`;
  }

  const groups = CATEGORIES.filter((category) => filter === 'all' || filter === category).map(
    (category) => ({
      category,
      entries: UNLOCKS.filter((entry) => entry.category === category),
    }),
  );
  const unlockedCount = UNLOCKS.filter((entry) => entry.level <= level).length;

  return (
    <section className="content-card" aria-label="等级解锁路线">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ROADMAP</span>
          <h2>解锁路线</h2>
          <p>达到等级后，伙伴、场景与装扮会自动进入账户，工具会直接可用。</p>
        </div>
        <span className="privacy-chip">
          已解锁 {unlockedCount} / {UNLOCKS.length}
        </span>
      </div>
      <div className="unlock-toolbar">
        <div className="filter-chips" role="group" aria-label="筛选解锁分类">
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              aria-pressed={filter === entry.id}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>
      {groups.map(({ category, entries }) => (
        <div className="unlock-group" key={category}>
          <h3>{UNLOCK_CATEGORY_LABELS[category]}</h3>
          <ul className="unlock-grid" aria-label={`${UNLOCK_CATEGORY_LABELS[category]}解锁列表`}>
            {entries.map((entry) => {
              const state = stateOf(entry);
              const text = stateText(entry, state);
              return (
                <li
                  className={`unlock-item ${state}`}
                  key={entry.id}
                  aria-label={`${entry.name}，${text}`}
                >
                  <span className="unlock-icon">
                    <CatalogIcon src={entry.icon} fallback={CATEGORY_ICONS[category]} />
                  </span>
                  <span className="unlock-info">
                    <strong>{entry.name}</strong>
                    <small>{entry.description}</small>
                  </span>
                  <span className="unlock-meta">
                    <span className="level-chip">Lv.{entry.level}</span>
                    <span className="unlock-state">{text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
