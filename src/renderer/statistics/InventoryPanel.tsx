import { useEffect, useState } from 'react';
import { ITEMS, UI_ICONS, itemById } from '../../data/catalogs/appearance';
import { CRAFTING_RECIPES } from '../../data/catalogs/crafting';
import { ITEM_SLOTS, RARITY_LABELS } from '../../shared/types/appearance';
import type { CraftingRecipe } from '../../shared/types/crafting';
import { loadAppearance, publishAppearance, useAppearance } from './appearance-store';
import { CatalogIcon } from './CatalogIcon';
import { CollectionPanel } from './CollectionPanel';

export function InventoryPanel() {
  const appearance = useAppearance();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyRecipe, setBusyRecipe] = useState<string>();
  const [busyItem, setBusyItem] = useState<string>();

  useEffect(() => {
    let active = true;
    loadAppearance().catch(() => {
      if (active) setError('无法读取背包数据，请稍后重试。');
    });
    return () => {
      active = false;
    };
  }, []);

  async function craft(recipe: CraftingRecipe) {
    setBusyRecipe(recipe.id);
    try {
      publishAppearance(await window.desktopApi.craftItem(recipe.id));
      setMessage(`${recipe.name}完成。`);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '合成失败，请检查材料、碎片和星星币。');
    } finally {
      setBusyRecipe(undefined);
    }
  }

  async function dismantle(itemId: string, name: string) {
    if (
      !window.confirm(`分解「${name}」？将获得 10 星星币；稀有/史诗额外 1、传说额外 2 星光碎片。`)
    )
      return;
    setBusyItem(itemId);
    try {
      publishAppearance(await window.desktopApi.dismantleItem(itemId));
      setMessage(`已将「${name}」分解为星星币与星光碎片。`);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '分解失败，请先卸下该装扮。');
    } finally {
      setBusyItem(undefined);
    }
  }

  if (!appearance) {
    return (
      <section className="content-card appearance-panel" aria-busy="true">
        <div className="section-heading">
          <div>
            <span className="eyebrow">INVENTORY</span>
            <h2>背包</h2>
          </div>
        </div>
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="inline-loading">正在读取背包…</p>
        )}
      </section>
    );
  }

  const owned = new Map(
    appearance.inventory
      .filter((entry) => entry.quantity > 0)
      .map((entry) => [entry.itemId, entry.quantity]),
  );
  const materialRecipes = CRAFTING_RECIPES.filter((recipe) => recipe.category === 'material');
  const outfitRecipes = CRAFTING_RECIPES.filter((recipe) => recipe.category === 'outfit');
  const inventoryItems = appearance.inventory
    .filter((entry) => entry.quantity > 0)
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
  const worn = new Set(
    ITEM_SLOTS.map((slot) => appearance.equipped[slot]).filter((id): id is string => Boolean(id)),
  );
  const anyBusy = busyRecipe !== undefined || busyItem !== undefined;

  function canAfford(recipe: CraftingRecipe): boolean {
    if (appearance!.balance < recipe.currencyCost) return false;
    if (appearance!.fragments < recipe.fragmentCost) return false;
    // 产物本身受等级解锁限制，未解锁时不显示成可合成，避免点击后才报错。
    const output = itemById(recipe.output.itemId);
    if (output && appearance!.level < output.unlockLevel) return false;
    return recipe.ingredients.every(
      (ingredient) => (owned.get(ingredient.itemId) ?? 0) >= ingredient.quantity,
    );
  }

  return (
    <div className="appearance-panel">
      <section className="content-card" aria-label="背包概览">
        <div className="section-heading">
          <div>
            <span className="eyebrow">INVENTORY</span>
            <h2>背包与合成</h2>
            <p>用星光碎片和星星币兑换材料，再合成更稀有的装扮。</p>
          </div>
          <div className="wallet-row">
            <span className="wallet-chip">
              <CatalogIcon src={UI_ICONS.coins} fallback={UI_ICONS.app} />
              {appearance.balance.toLocaleString()} 星星币
            </span>
            <span className="wallet-chip fragments">
              <CatalogIcon src={UI_ICONS.fragments} fallback={UI_ICONS.app} />
              {appearance.fragments.toLocaleString()} 星光碎片
            </span>
          </div>
        </div>
        {message && (
          <p className="inline-success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="content-card" aria-label="材料兑换">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MATERIALS</span>
            <h2>材料兑换</h2>
            <p>普通装扮也是合成材料，缺料时可以在这里补充。</p>
          </div>
          <span className="privacy-chip">1 碎片 + 15 星星币 / 件</span>
        </div>
        <div className="craft-grid">
          {materialRecipes.map((recipe) => {
            const output = itemById(recipe.output.itemId);
            const affordable = canAfford(recipe);
            const lockedByLevel = output !== undefined && appearance.level < output.unlockLevel;
            return (
              <article className="craft-card material" key={recipe.id}>
                <div className="craft-head">
                  <CatalogIcon src={output?.asset} fallback={UI_ICONS.appearance} />
                  <div>
                    <strong>{recipe.name}</strong>
                    <small>
                      {output?.name ?? recipe.output.itemId} × {recipe.output.quantity}
                      {lockedByLevel ? ` · Lv.${output.unlockLevel} 解锁` : ''}
                    </small>
                  </div>
                </div>
                <div className="craft-cost">
                  <span>
                    <CatalogIcon src={UI_ICONS.fragments} fallback={UI_ICONS.app} />
                    {recipe.fragmentCost} 碎片
                  </span>
                  <span>
                    <CatalogIcon src={UI_ICONS.coins} fallback={UI_ICONS.app} />
                    {recipe.currencyCost} 星星币
                  </span>
                  <span>现有 {(owned.get(recipe.output.itemId) ?? 0).toLocaleString()} 件</span>
                </div>
                <button
                  className="secondary-button"
                  disabled={anyBusy || !affordable}
                  onClick={() => void craft(recipe)}
                >
                  {busyRecipe === recipe.id
                    ? '兑换中…'
                    : lockedByLevel
                      ? `Lv.${output.unlockLevel} 解锁`
                      : '兑换'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="content-card" aria-label="高级合成">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CRAFTING</span>
            <h2>高级合成</h2>
            <p>材料、星星币与碎片会在同一次操作中扣除，材料不足时不会浪费任何资源。</p>
          </div>
          <span className="privacy-chip">{outfitRecipes.length} 个配方</span>
        </div>
        <div className="craft-grid">
          {outfitRecipes.map((recipe) => {
            const output = itemById(recipe.output.itemId);
            const affordable = canAfford(recipe);
            const lockedByLevel = output !== undefined && appearance.level < output.unlockLevel;
            return (
              <article className="craft-card" key={recipe.id}>
                <div className="craft-head">
                  <CatalogIcon src={output?.asset} fallback={UI_ICONS.appearance} />
                  <div>
                    <strong>{recipe.name}</strong>
                    <small>
                      {output ? RARITY_LABELS[output.rarity] : recipe.output.itemId} 装扮
                      {lockedByLevel ? ` · Lv.${output.unlockLevel} 解锁` : ''}
                    </small>
                  </div>
                </div>
                <div className="craft-ingredients">
                  {recipe.ingredients.map((ingredient) => {
                    const have = owned.get(ingredient.itemId) ?? 0;
                    const missing = have < ingredient.quantity;
                    return (
                      <span
                        className={missing ? 'ingredient missing' : 'ingredient'}
                        key={ingredient.itemId}
                      >
                        <span>
                          {itemById(ingredient.itemId)?.name ?? ingredient.itemId} ×{' '}
                          {ingredient.quantity}
                        </span>
                        <span>
                          拥有 {have}
                          {missing ? ` · 缺 ${ingredient.quantity - have}` : ''}
                        </span>
                      </span>
                    );
                  })}
                </div>
                <div className="craft-cost">
                  <span>
                    <CatalogIcon src={UI_ICONS.coins} fallback={UI_ICONS.app} />
                    {recipe.currencyCost} 星星币
                  </span>
                  {recipe.fragmentCost > 0 && (
                    <span>
                      <CatalogIcon src={UI_ICONS.fragments} fallback={UI_ICONS.app} />
                      {recipe.fragmentCost} 碎片
                    </span>
                  )}
                  <span>现有 {(owned.get(recipe.output.itemId) ?? 0).toLocaleString()} 件</span>
                </div>
                <button
                  className="secondary-button"
                  disabled={anyBusy || !affordable}
                  onClick={() => void craft(recipe)}
                >
                  {busyRecipe === recipe.id
                    ? '合成中…'
                    : lockedByLevel
                      ? `Lv.${output.unlockLevel} 解锁`
                      : affordable
                        ? '合成'
                        : '材料不足'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="content-card" aria-label="背包物品">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BAG</span>
            <h2>背包</h2>
            <p>分解未穿戴的装扮可以获得 10 星星币，稀有/史诗额外 1、传说额外 2 星光碎片。</p>
          </div>
          <span className="privacy-chip">{inventoryItems.length} 种物品</span>
        </div>
        {inventoryItems.length === 0 ? (
          <div className="empty-state">
            <CatalogIcon src={UI_ICONS.appearance} fallback={UI_ICONS.app} />
            <strong>背包还是空的</strong>
            <p>升级解锁或合成装扮后，物品会出现在这里。</p>
          </div>
        ) : (
          <div className="inventory-grid">
            {inventoryItems.map((entry) => {
              const item = ITEMS.find((candidate) => candidate.id === entry.itemId);
              const isWorn = worn.has(entry.itemId);
              return (
                <article className="inventory-item" key={entry.itemId}>
                  <CatalogIcon src={item?.asset} fallback={UI_ICONS.appearance} />
                  <span className="inventory-item-body">
                    <strong>{item?.name ?? entry.itemId}</strong>
                    <small>
                      {item ? RARITY_LABELS[item.rarity] : '装扮'} · 数量 {entry.quantity}
                    </small>
                  </span>
                  <button
                    className="dismantle-button"
                    disabled={anyBusy || isWorn}
                    title={isWorn ? '穿戴中的装扮不能分解' : undefined}
                    onClick={() => void dismantle(entry.itemId, item?.name ?? entry.itemId)}
                  >
                    {isWorn ? '穿戴中' : busyItem === entry.itemId ? '分解中…' : '分解'}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <CollectionPanel appearance={appearance} />
    </div>
  );
}
