import { useEffect, useState } from 'react';
import { CRAFTING_RECIPES } from '../../data/catalogs/crafting';
import { ITEMS } from '../../data/catalogs/appearance';
import type { Appearance } from '../../shared/types/appearance';

function itemName(id: string): string {
  return ITEMS.find((entry) => entry.id === id)?.name ?? id;
}

export function InventoryPanel() {
  const [appearance, setAppearance] = useState<Appearance>();
  const [message, setMessage] = useState('');
  useEffect(() => {
    void window.desktopApi.getAppearance().then(setAppearance);
  }, []);
  async function craft(recipeId: string) {
    try {
      setAppearance(await window.desktopApi.craftItem(recipeId));
      setMessage('合成成功。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '合成失败，请检查材料、穿戴和星星币。');
    }
  }
  if (!appearance) return <p>正在读取背包…</p>;
  return (
    <section aria-label="背包与合成">
      <h2>背包与合成</h2>
      <p>
        星星币：{appearance.balance} ·{' '}
        {appearance.inventory.length
          ? appearance.inventory
              .map((item) => `${itemName(item.itemId)} × ${item.quantity}`)
              .join('，')
          : '背包为空'}
      </p>
      {message && <p role="status">{message}</p>}
      {CRAFTING_RECIPES.map((recipe) => (
        <article key={recipe.id} className="recipe-card">
          <strong>{recipe.name}</strong>
          <span>
            {recipe.ingredients
              .map((item) => `${itemName(item.itemId)} × ${item.quantity}`)
              .join(' + ')}{' '}
            + {recipe.currencyCost} 星星币 → {itemName(recipe.output.itemId)} ×{' '}
            {recipe.output.quantity}
          </span>
          <button onClick={() => void craft(recipe.id)}>合成</button>
        </article>
      ))}
    </section>
  );
}
