import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { CraftingService } from './crafting-service';

function database() {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE wallet(id INTEGER PRIMARY KEY, balance INTEGER NOT NULL); INSERT INTO wallet VALUES(1, 50);
    CREATE TABLE inventory(item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity >= 0));
    CREATE TABLE appearance(id INTEGER PRIMARY KEY, head TEXT, neck TEXT); INSERT INTO appearance VALUES(1, NULL, NULL);
    CREATE TABLE crafting_transactions(id INTEGER PRIMARY KEY, recipe_id TEXT, spent_currency INTEGER, created_at INTEGER);`);
  return db;
}

describe('crafting', () => {
  it('commits material, currency and output together', () => {
    const db = database();
    db.exec("INSERT INTO inventory VALUES('hat_blue', 1)");
    new CraftingService(db).craft('upgrade_hat_star', 100);
    expect(db.prepare('SELECT balance FROM wallet').get()).toMatchObject({ balance: 30 });
    expect(
      db.prepare("SELECT quantity FROM inventory WHERE item_id = 'hat_blue'").get(),
    ).toMatchObject({ quantity: 0 });
    expect(
      db.prepare("SELECT quantity FROM inventory WHERE item_id = 'hat_star'").get(),
    ).toMatchObject({ quantity: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM crafting_transactions').get()).toMatchObject({
      count: 1,
    });
    db.close();
  });

  it('rolls back when material is missing or equipped', () => {
    const db = database();
    const crafting = new CraftingService(db);
    expect(() => crafting.craft('upgrade_hat_star')).toThrow('合成材料不足');
    expect(db.prepare('SELECT balance FROM wallet').get()).toMatchObject({ balance: 50 });
    db.exec("INSERT INTO inventory VALUES('hat_blue', 1); UPDATE appearance SET head = 'hat_blue'");
    expect(() => crafting.craft('upgrade_hat_star')).toThrow('请先卸下');
    expect(
      db.prepare("SELECT quantity FROM inventory WHERE item_id = 'hat_blue'").get(),
    ).toMatchObject({ quantity: 1 });
    db.close();
  });
});
