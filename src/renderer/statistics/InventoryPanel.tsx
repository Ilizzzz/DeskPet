import { useEffect, useState } from 'react';
import { ITEMS, UI_ICONS, itemById } from '../../data/catalogs/appearance';
import {
  DROP_POOL,
  FRAGMENT_TO_COINS_RATE,
  ITEM_ECONOMY,
  itemEconomy,
} from '../../data/catalogs/economy';
import { ITEM_SLOTS, RARITY_LABELS } from '../../shared/types/appearance';
import { loadAppearance, publishAppearance, useAppearance } from './appearance-store';
import { CatalogIcon } from './CatalogIcon';
import { CollectionPanel } from './CollectionPanel';

export function InventoryPanel() {
  const appearance = useAppearance();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyItem, setBusyItem] = useState<string>();
  const [busyAction, setBusyAction] = useState('');
  const [allowLastDismantle, setAllowLastDismantle] = useState(false);
  const [fragmentAmount, setFragmentAmount] = useState(1);

  useEffect(() => {
    let active = true;
    loadAppearance().catch(() => {
      if (active) setError('无法读取背包数据，请稍后重试。');
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (appearance?.fragments)
      setFragmentAmount((current) => Math.max(1, Math.min(current, appearance.fragments)));
  }, [appearance?.fragments]);

  async function purchase(itemId: string, name: string) {
    const economy = itemEconomy(itemId);
    if (
      !economy ||
      !appearance ||
      !window.confirm(
        `使用 ${economy.price} 星星币兑换「${name}」？兑换后剩余 ${appearance.balance - economy.price} 星星币。`,
      )
    )
      return;
    setBusyItem(itemId);
    try {
      publishAppearance(await window.desktopApi.purchaseItem(itemId));
      setMessage(`已获得「${name}」。`);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '兑换失败。');
    } finally {
      setBusyItem(undefined);
    }
  }

  async function dismantle(itemId: string, name: string, quantity: number) {
    const economy = itemEconomy(itemId);
    if (!economy) return;
    const allowLast = quantity === 1;
    const detail = allowLast
      ? `这是最后一件「${name}」。分解后暂时不能穿戴，可再次掉落或兑换取回。确认获得 ${economy.dismantleValue} 星星币，余额变为 ${(appearance?.balance ?? 0) + economy.dismantleValue}？`
      : `分解 1 件「${name}」，获得 ${economy.dismantleValue} 星星币，余额变为 ${(appearance?.balance ?? 0) + economy.dismantleValue}？`;
    if (!window.confirm(detail)) return;
    setBusyItem(itemId);
    try {
      publishAppearance(await window.desktopApi.dismantleItem(itemId, allowLast));
      setMessage(`已分解「${name}」，获得 ${economy.dismantleValue} 星星币。`);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '分解失败。');
    } finally {
      setBusyItem(undefined);
    }
  }

  async function convertFragments() {
    if (!appearance || appearance.fragments < 1) return;
    if (!Number.isSafeInteger(fragmentAmount) || fragmentAmount < 1) {
      setError('请输入有效的碎片数量。');
      return;
    }
    const amount = Math.max(1, Math.min(Math.floor(fragmentAmount), appearance.fragments));
    const coins = amount * FRAGMENT_TO_COINS_RATE;
    if (
      !window.confirm(
        `将 ${amount} 星光碎片转换为 ${coins} 星星币？转换后剩余 ${appearance.fragments - amount} 碎片，星星币余额为 ${appearance.balance + coins}。`,
      )
    )
      return;
    setBusyAction('fragments');
    try {
      publishAppearance(await window.desktopApi.convertFragments(amount));
      setMessage(`已转换为 ${coins} 星星币。`);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '转换失败。');
    } finally {
      setBusyAction('');
    }
  }

  async function toggleWishlist(itemId: string) {
    setBusyAction('wishlist');
    try {
      const next = appearance?.wishlistItemId === itemId ? null : itemId;
      publishAppearance(await window.desktopApi.setWishlist(next));
      setMessage(next ? '已设为心愿装扮。' : '已取消心愿装扮。');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '心愿设置失败。');
    } finally {
      setBusyAction('');
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
        <p className={error ? 'inline-error' : 'inline-loading'}>{error || '正在读取背包…'}</p>
      </section>
    );
  }

  const owned = new Map(
    appearance.inventory
      .filter((entry) => entry.quantity > 0)
      .map((entry) => [entry.itemId, entry.quantity]),
  );
  const worn = new Set(
    ITEM_SLOTS.map((slot) => appearance.equipped[slot]).filter((id): id is string => Boolean(id)),
  );
  const progress = appearance.dropProgress;
  const dropPercent = Math.floor((progress.keyboardRemainder / progress.keyboardPerDrop) * 100);
  const wishlist = appearance.wishlistItemId ? itemById(appearance.wishlistItemId) : undefined;
  const wishlistEconomy = wishlist ? itemEconomy(wishlist.id) : undefined;
  const shopItems = ITEMS.filter((item) => !owned.has(item.id));
  const inventoryItems = appearance.inventory.filter((entry) => entry.quantity > 0);

  return (
    <div className="appearance-panel">
      <section className="content-card" aria-label="掉落进度与钱包">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DISCOVERY</span>
            <h2>下一次装扮发现</h2>
            <p>
              每累计 {progress.keyboardPerDrop.toLocaleString()} 次有效键盘按下，随机获得 1 件装扮。
            </p>
          </div>
          <div className="wallet-row">
            <span className="wallet-chip">
              <CatalogIcon src={UI_ICONS.coins} fallback={UI_ICONS.app} />
              {appearance.balance.toLocaleString()} 星星币
            </span>
            {appearance.fragments > 0 && (
              <span className="wallet-chip fragments">
                <CatalogIcon src={UI_ICONS.fragments} fallback={UI_ICONS.app} />
                {appearance.fragments} 碎片
              </span>
            )}
          </div>
        </div>
        {appearance.fragments > 0 && (
          <div className="fragment-converter">
            <label>
              转换数量
              <input
                type="number"
                min={1}
                max={appearance.fragments}
                value={fragmentAmount}
                onChange={(event) => setFragmentAmount(Number(event.target.value))}
              />
            </label>
            <span>
              = {Number.isFinite(fragmentAmount) ? fragmentAmount * FRAGMENT_TO_COINS_RATE : 0}{' '}
              星星币
            </span>
            <button
              className="secondary-button"
              disabled={
                busyAction !== '' ||
                !Number.isSafeInteger(fragmentAmount) ||
                fragmentAmount < 1 ||
                fragmentAmount > appearance.fragments
              }
              onClick={() => void convertFragments()}
            >
              转换
            </button>
          </div>
        )}
        <progress value={progress.keyboardRemainder} max={progress.keyboardPerDrop} />
        <p>
          {progress.keyboardRemainder.toLocaleString()} /{' '}
          {progress.keyboardPerDrop.toLocaleString()} 次 · {dropPercent}%
        </p>
        {progress.latestDrop && (
          <p className="latest-drop">
            最近发现：
            <strong>
              {itemById(progress.latestDrop.itemId)?.name ?? progress.latestDrop.itemId}
            </strong>
          </p>
        )}
        {message && <p className="inline-success">{message}</p>}
        {error && <p className="inline-error">{error}</p>}
      </section>

      {wishlist && wishlistEconomy && (
        <section className="content-card wishlist-card" aria-label="心愿装扮">
          <div className="craft-head">
            <CatalogIcon src={wishlist.asset} fallback={UI_ICONS.appearance} />
            <div>
              <span className="eyebrow">WISH</span>
              <h2>{wishlist.name}</h2>
              <p>
                {appearance.balance >= wishlistEconomy.price
                  ? '星星币已经足够兑换。'
                  : `还差 ${(wishlistEconomy.price - appearance.balance).toLocaleString()} 星星币。`}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="content-card" aria-label="装扮商店">
        <div className="section-heading">
          <div>
            <span className="eyebrow">WARDROBE</span>
            <h2>装扮兑换</h2>
            <p>随机发现之外，也可以用星星币直接选择喜欢的装扮。</p>
          </div>
          <span className="privacy-chip">{shopItems.length} 件未拥有</span>
        </div>
        <div className="craft-grid">
          {shopItems.map((item) => {
            const economy = ITEM_ECONOMY.find((entry) => entry.itemId === item.id)!;
            const milestoneLocked =
              economy.source === 'milestone' && !appearance.discoveredItemIds.includes(item.id);
            return (
              <article className="craft-card" key={item.id}>
                <div className="craft-head">
                  <CatalogIcon src={item.asset} fallback={UI_ICONS.appearance} />
                  <div>
                    <strong>{item.name}</strong>
                    <small>{RARITY_LABELS[item.rarity]}</small>
                  </div>
                </div>
                <div className="craft-cost">
                  <span>⭐ {economy.price.toLocaleString()} 星星币</span>
                  <span>
                    {economy.source === 'milestone'
                      ? `Lv.${economy.milestoneLevel} 纪念`
                      : economy.source === 'shop'
                        ? '仅星星币兑换'
                        : '掉落或兑换'}
                  </span>
                </div>
                <div className="card-actions">
                  <button
                    className="secondary-button"
                    disabled={
                      Boolean(busyItem) || milestoneLocked || appearance.balance < economy.price
                    }
                    onClick={() => void purchase(item.id, item.name)}
                  >
                    {busyItem === item.id
                      ? '兑换中…'
                      : milestoneLocked
                        ? `Lv.${economy.milestoneLevel} 获得`
                        : '兑换'}
                  </button>
                  <button
                    className="text-button"
                    disabled={busyAction !== ''}
                    onClick={() => void toggleWishlist(item.id)}
                  >
                    {appearance.wishlistItemId === item.id ? '取消心愿' : '设为心愿'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="content-card" aria-label="背包装扮">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BAG</span>
            <h2>背包</h2>
            <p>重复装扮可以分解为星星币，最后一件会在操作前单独提醒。</p>
          </div>
          <span className="privacy-chip">{inventoryItems.length} 种</span>
        </div>
        <label className="last-copy-toggle">
          <input
            type="checkbox"
            checked={allowLastDismantle}
            onChange={(event) => setAllowLastDismantle(event.target.checked)}
          />
          <span>
            <strong>允许分解最后一件</strong>
            <small>穿戴中的最后一件仍会保留；操作前还会再次确认。</small>
          </span>
        </label>
        <div className="inventory-grid">
          {inventoryItems.map((entry) => {
            const item = itemById(entry.itemId);
            const economy = itemEconomy(entry.itemId);
            const isWorn = worn.has(entry.itemId);
            return (
              <article className="inventory-item" key={entry.itemId}>
                <CatalogIcon src={item?.asset} fallback={UI_ICONS.appearance} />
                <span className="inventory-item-body">
                  <strong>{item?.name ?? entry.itemId}</strong>
                  <small>
                    {item ? RARITY_LABELS[item.rarity] : '装扮'} · 数量 {entry.quantity} · 分解 +
                    {economy?.dismantleValue ?? 0}
                  </small>
                </span>
                <button
                  className="dismantle-button"
                  disabled={
                    Boolean(busyItem) || (entry.quantity === 1 && (isWorn || !allowLastDismantle))
                  }
                  title={
                    isWorn && entry.quantity === 1
                      ? '请先卸下最后一件'
                      : entry.quantity === 1 && !allowLastDismantle
                        ? '已开启最后一件保护'
                        : undefined
                  }
                  onClick={() =>
                    void dismantle(entry.itemId, item?.name ?? entry.itemId, entry.quantity)
                  }
                >
                  {busyItem === entry.itemId
                    ? '分解中…'
                    : isWorn && entry.quantity === 1
                      ? '穿戴中'
                      : entry.quantity === 1 && !allowLastDismantle
                        ? '已保护'
                        : '分解'}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="content-card" aria-label="掉落概率">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DROP RATE</span>
            <h2>当前掉落概率</h2>
          </div>
        </div>
        <div className="probability-list">
          {DROP_POOL.map((entry) => (
            <span key={entry.itemId}>
              {itemById(entry.itemId)?.name ?? entry.itemId} <strong>{entry.weight}%</strong>
            </span>
          ))}
        </div>
      </section>

      <CollectionPanel appearance={appearance} />
    </div>
  );
}
