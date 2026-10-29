import type { DatabaseSync } from 'node:sqlite';
import type { Appearance, EquippedItems, ItemSlot } from '../../shared/types/appearance';
import { ITEM_SLOTS } from '../../shared/types/appearance';
import { SCENES, characterById, itemById } from '../../data/catalogs/appearance';
import { KEYBOARD_COUNT_PER_DROP } from '../../data/catalogs/economy';

interface AppearanceRow extends EquippedItems {
  character: string;
  scene: string;
}

type ParsedChange =
  | { kind: 'character'; id: string }
  | { kind: 'scene'; id: string }
  | { kind: 'equipped'; slot: ItemSlot; itemId: string | null };

export class AppearanceService {
  constructor(private readonly db: DatabaseSync) {}

  get(): Appearance {
    const row = this.db
      .prepare('SELECT character, scene, head, neck, face, hand, back FROM appearance WHERE id = 1')
      .get() as unknown as AppearanceRow;
    const inventory = this.db
      .prepare(
        'SELECT item_id AS itemId, quantity FROM inventory WHERE quantity > 0 ORDER BY item_id',
      )
      .all() as unknown as Appearance['inventory'];
    const unlocks = (
      this.db.prepare('SELECT id FROM unlocks ORDER BY id').all() as unknown as { id: string }[]
    ).map((entry) => entry.id);
    const wallet = this.db.prepare('SELECT balance, fragments FROM wallet WHERE id = 1').get() as {
      balance: number;
      fragments: number;
    };
    const growth = this.db.prepare('SELECT level FROM growth_state WHERE id = 1').get() as {
      level: number;
    };
    const discoveredItemIds = (
      this.db
        .prepare('SELECT item_id AS itemId FROM item_discoveries ORDER BY item_id')
        .all() as unknown as { itemId: string }[]
    ).map((entry) => entry.itemId);
    const wishlist = this.db
      .prepare('SELECT item_id AS itemId FROM item_wishlist WHERE id = 1')
      .get() as { itemId: string | null };
    const dropState = this.db
      .prepare('SELECT keyboard_remainder AS keyboardRemainder FROM input_drop_state WHERE id = 1')
      .get() as { keyboardRemainder: number };
    const latestDrop = this.db
      .prepare(
        'SELECT id, item_id AS itemId, created_at AS createdAt FROM drop_events ORDER BY id DESC LIMIT 1',
      )
      .get() as unknown as import('../../shared/types/economy').DropEvent | undefined;
    return {
      level: growth.level,
      character: row.character,
      scene: row.scene,
      equipped: {
        head: row.head,
        neck: row.neck,
        face: row.face,
        hand: row.hand,
        back: row.back,
      },
      inventory,
      unlocks,
      balance: wallet.balance,
      fragments: wallet.fragments,
      discoveredItemIds,
      wishlistItemId: wishlist.itemId,
      dropProgress: {
        keyboardRemainder: dropState.keyboardRemainder,
        keyboardPerDrop: KEYBOARD_COUNT_PER_DROP,
        latestDrop: latestDrop ?? null,
      },
    };
  }

  /**
   * 一次只接受一个变更：character / scene / equipped。
   *
   * 角色与场景要求等级达标且已在 unlocks 中；装扮只要求槽位匹配，
   * 且背包里至少有 1 件。所有校验通过后才写入，避免部分字段被修改。
   */
  update(value: unknown): Appearance {
    const change = parseChange(value);
    const current = this.get();
    switch (change.kind) {
      case 'character': {
        const character = characterById(change.id);
        if (!character) throw new Error('无效外观选项');
        assertLevel(current.level, character.unlockLevel);
        if (!current.unlocks.includes(character.id)) throw new Error('角色尚未解锁');
        this.db.prepare('UPDATE appearance SET character = ? WHERE id = 1').run(character.id);
        break;
      }
      case 'scene': {
        const scene = SCENES.find((entry) => entry.id === change.id);
        if (!scene) throw new Error('无效外观选项');
        assertLevel(current.level, scene.unlockLevel);
        if (!current.unlocks.includes(scene.id)) throw new Error('场景尚未解锁');
        this.db.prepare('UPDATE appearance SET scene = ? WHERE id = 1').run(scene.id);
        break;
      }
      case 'equipped': {
        if (change.itemId !== null) {
          const item = itemById(change.itemId);
          if (!item) throw new Error('无效外观选项');
          if (item.slot !== change.slot) throw new Error('装扮槽位不匹配');
          if (
            !current.inventory.some((entry) => entry.itemId === change.itemId && entry.quantity > 0)
          )
            throw new Error('物品不存在');
        }
        // 槽位已通过 ITEM_SLOTS 校验，列名与槽位同名，可安全拼入语句。
        this.db.prepare(`UPDATE appearance SET ${change.slot} = ? WHERE id = 1`).run(change.itemId);
        break;
      }
    }
    return this.get();
  }
}

function assertLevel(level: number, unlockLevel: number): void {
  if (level < unlockLevel) throw new Error('等级不足');
}

function parseChange(value: unknown): ParsedChange {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('无效外观');
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) throw new Error('一次只能修改一个外观字段');
  const [key, raw] = entries[0];
  if (key === 'character' || key === 'scene') {
    if (typeof raw !== 'string') throw new Error('无效外观');
    return { kind: key, id: raw };
  }
  if (key === 'equipped') {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('无效外观');
    const equipped = raw as Record<string, unknown>;
    if (Object.keys(equipped).length !== 2) throw new Error('无效外观');
    const { slot, itemId } = equipped;
    if (typeof slot !== 'string' || !ITEM_SLOTS.includes(slot as ItemSlot))
      throw new Error('无效外观字段');
    if (itemId !== null && typeof itemId !== 'string') throw new Error('无效外观');
    return { kind: 'equipped', slot: slot as ItemSlot, itemId };
  }
  throw new Error('无效外观字段');
}
