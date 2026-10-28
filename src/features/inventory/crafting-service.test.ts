import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { CraftingService } from './crafting-service';

function database(balance = 500, fragments = 10, level = 30): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE wallet(id INTEGER PRIMARY KEY, balance INTEGER NOT NULL, fragments INTEGER NOT NULL DEFAULT 0);
    INSERT INTO wallet VALUES(1, ${balance}, ${fragments});
    CREATE TABLE inventory(item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity >= 0));
    CREATE TABLE appearance(id INTEGER PRIMARY KEY, character TEXT, scene TEXT, head TEXT, neck TEXT, face TEXT, hand TEXT, back TEXT);
    INSERT INTO appearance VALUES(1, 'cat', 'transparent', NULL, NULL, NULL, NULL, NULL);
    CREATE TABLE growth_state(id INTEGER PRIMARY KEY, level INTEGER NOT NULL);
    INSERT INTO growth_state VALUES(1, ${level});
    CREATE TABLE crafting_transactions(id INTEGER PRIMARY KEY, recipe_id TEXT, spent_currency INTEGER, created_at INTEGER);`);
  return db;
}

function wallet(db: DatabaseSync): { balance: number; fragments: number } {
  return db.prepare('SELECT balance, fragments FROM wallet WHERE id = 1').get() as unknown as {
    balance: number;
    fragments: number;
  };
}

function quantity(db: DatabaseSync, itemId: string): number | undefined {
  const row = db.prepare('SELECT quantity FROM inventory WHERE item_id = ?').get(itemId) as
    { quantity: number } | undefined;
  return row?.quantity;
}

describe('crafting', () => {
  it('consumes materials, currency and fragments and grants the output', () => {
    const db = database();
    db.exec("INSERT INTO inventory VALUES('hat_top', 2), ('hat_woman', 2)");
    new CraftingService(db).craft('craft_crown_gold', 123);
    expect(wallet(db)).toMatchObject({ balance: 440, fragments: 8 });
    expect(quantity(db, 'hat_top')).toBe(0);
    expect(quantity(db, 'hat_woman')).toBe(0);
    expect(quantity(db, 'crown_gold')).toBe(1);
    expect(
      db.prepare('SELECT recipe_id, spent_currency, created_at FROM crafting_transactions').get(),
    ).toMatchObject({ recipe_id: 'craft_crown_gold', spent_currency: 60, created_at: 123 });
    db.close();
  });

  it('turns one fragment and 15 coins into a common outfit that can stack', () => {
    const db = database();
    const crafting = new CraftingService(db);
    crafting.craft('exchange_cap_blue');
    crafting.craft('exchange_cap_blue');
    expect(wallet(db)).toMatchObject({ balance: 470, fragments: 8 });
    expect(quantity(db, 'cap_blue')).toBe(2);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM crafting_transactions WHERE recipe_id = 'exchange_cap_blue'",
        )
        .get(),
    ).toMatchObject({ count: 2 });
    db.close();
  });

  it('rolls back when materials or fragments are missing', () => {
    const db = database(500, 2);
    const crafting = new CraftingService(db);
    db.exec("INSERT INTO inventory VALUES('cap_blue', 1)");
    expect(() => crafting.craft('craft_hat_top')).toThrow('合成材料不足');
    expect(wallet(db)).toMatchObject({ balance: 500, fragments: 2 });
    expect(quantity(db, 'cap_blue')).toBe(1);
    expect(db.prepare('SELECT COUNT(*) AS count FROM crafting_transactions').get()).toMatchObject({
      count: 0,
    });
    db.exec("INSERT INTO inventory VALUES('wand_magic', 2)");
    expect(() => crafting.craft('craft_crystal_ball')).toThrow('星光碎片不足');
    expect(wallet(db)).toMatchObject({ balance: 500, fragments: 2 });
    expect(quantity(db, 'wand_magic')).toBe(2);
    db.close();
  });

  it('refuses to craft an outfit above the current level', () => {
    const db = database(500, 10, 1);
    db.exec("INSERT INTO inventory VALUES('cap_blue', 2)");
    const crafting = new CraftingService(db);
    expect(() => crafting.craft('craft_hat_top')).toThrow('该装扮尚未解锁（需要 11 级）');
    expect(() => crafting.craft('exchange_cap_blue')).toThrow('该装扮尚未解锁（需要 2 级）');
    expect(wallet(db)).toMatchObject({ balance: 500, fragments: 10 });
    expect(quantity(db, 'cap_blue')).toBe(2);
    db.close();
  });

  it('keeps at least one copy of an equipped material', () => {
    const db = database();
    const crafting = new CraftingService(db);
    db.exec("INSERT INTO inventory VALUES('cap_blue', 2); UPDATE appearance SET head = 'cap_blue'");
    expect(() => crafting.craft('craft_hat_top')).toThrow('请先卸下');
    expect(quantity(db, 'cap_blue')).toBe(2);
    db.exec("UPDATE inventory SET quantity = 3 WHERE item_id = 'cap_blue'");
    crafting.craft('craft_hat_top');
    expect(quantity(db, 'cap_blue')).toBe(1);
    expect(quantity(db, 'hat_top')).toBe(1);
    db.close();
  });

  it('dismantles one unequipped item for coins and rarity fragments', () => {
    const db = database(0, 0);
    db.exec(
      "INSERT INTO inventory VALUES('bell_collar', 2), ('ribbon_pink', 1), ('crown_gold', 1)",
    );
    const crafting = new CraftingService(db);
    crafting.dismantle('bell_collar');
    expect(wallet(db)).toMatchObject({ balance: 10, fragments: 0 });
    expect(quantity(db, 'bell_collar')).toBe(1);
    crafting.dismantle('ribbon_pink');
    expect(wallet(db)).toMatchObject({ balance: 20, fragments: 1 });
    crafting.dismantle('crown_gold');
    expect(wallet(db)).toMatchObject({ balance: 30, fragments: 3 });
    expect(quantity(db, 'crown_gold')).toBe(0);
    db.close();
  });

  it('refuses to dismantle equipped or missing items and consumes nothing', () => {
    const db = database(0, 0);
    db.exec(
      "INSERT INTO inventory VALUES('scarf_red', 1); UPDATE appearance SET neck = 'scarf_red'",
    );
    const crafting = new CraftingService(db);
    expect(() => crafting.dismantle('scarf_red')).toThrow('不能分解已穿戴的装扮');
    expect(quantity(db, 'scarf_red')).toBe(1);
    expect(() => crafting.dismantle('hat_top')).toThrow('没有可分解的装扮');
    expect(() => crafting.dismantle('forest_home')).toThrow('物品不存在');
    expect(() => crafting.dismantle(42)).toThrow('无效装扮');
    expect(wallet(db)).toMatchObject({ balance: 0, fragments: 0 });
    db.close();
  });
});
