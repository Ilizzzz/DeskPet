import type { DatabaseSync } from 'node:sqlite';
import type { Appearance, AppearanceChange } from '../../shared/types/appearance';
import { CHARACTERS, ITEMS, SCENES } from '../../data/catalogs/appearance';

export class AppearanceService {
  constructor(private readonly db: DatabaseSync) {}
  get(): Appearance {
    const selection = this.db
      .prepare('SELECT character, scene, head, neck FROM appearance WHERE id = 1')
      .get() as unknown as Pick<Appearance, 'character' | 'scene' | 'head' | 'neck'>;
    const inventory = this.db
      .prepare(
        'SELECT item_id AS itemId, quantity FROM inventory WHERE quantity > 0 ORDER BY item_id',
      )
      .all() as unknown as Appearance['inventory'];
    const unlocks = (
      this.db.prepare('SELECT id FROM unlocks ORDER BY id').all() as unknown as { id: string }[]
    ).map((row) => row.id);
    const wallet = this.db.prepare('SELECT balance FROM wallet WHERE id = 1').get() as {
      balance: number;
    };
    const growth = this.db.prepare('SELECT level FROM growth_state WHERE id = 1').get() as {
      level: number;
    };
    return { ...selection, inventory, unlocks, balance: wallet.balance, level: growth.level };
  }
  update(value: unknown): Appearance {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('无效外观');
    const change = value as Record<string, unknown>;
    if (
      Object.keys(change).length !== 1 ||
      !['character', 'scene', 'head', 'neck'].includes(Object.keys(change)[0])
    )
      throw new Error('无效外观字段');
    const current = this.get();
    const next = { ...current, ...change } as AppearanceChange & Appearance;
    if (
      !CHARACTERS.some((entry) => entry.id === next.character) ||
      !SCENES.some((entry) => entry.id === next.scene) ||
      (next.head !== null &&
        !ITEMS.some((entry) => entry.id === next.head && entry.slot === 'head')) ||
      (next.neck !== null &&
        !ITEMS.some((entry) => entry.id === next.neck && entry.slot === 'neck'))
    )
      throw new Error('无效外观选项');
    if (next.character === 'fox' && !current.unlocks.includes('fox'))
      throw new Error('角色尚未解锁');
    if (next.scene === 'forest_home' && !current.unlocks.includes('forest_home'))
      throw new Error('场景尚未解锁');
    for (const item of [next.head, next.neck])
      if (item && !current.inventory.some((entry) => entry.itemId === item && entry.quantity > 0))
        throw new Error('物品不存在');
    this.db
      .prepare('UPDATE appearance SET character = ?, scene = ?, head = ?, neck = ? WHERE id = 1')
      .run(next.character, next.scene, next.head, next.neck);
    return this.get();
  }
}
