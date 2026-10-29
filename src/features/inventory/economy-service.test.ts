import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { EconomyService } from './economy-service';

function database(balance = 1000, fragments = 5): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE wallet(id INTEGER PRIMARY KEY, balance INTEGER NOT NULL, fragments INTEGER NOT NULL);
    INSERT INTO wallet VALUES(1, ${balance}, ${fragments});
    CREATE TABLE inventory(item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity >= 0));
    CREATE TABLE appearance(id INTEGER PRIMARY KEY, head TEXT, neck TEXT, face TEXT, hand TEXT, back TEXT);
    INSERT INTO appearance VALUES(1, NULL, NULL, NULL, NULL, NULL);
    CREATE TABLE item_discoveries(item_id TEXT PRIMARY KEY, first_acquired_at INTEGER NOT NULL);
    CREATE TABLE item_wishlist(id INTEGER PRIMARY KEY, item_id TEXT);
    INSERT INTO item_wishlist VALUES(1, NULL);
    CREATE TABLE economy_transactions(id INTEGER PRIMARY KEY, kind TEXT, item_id TEXT, amount INTEGER, created_at INTEGER);`);
  return db;
}

function wallet(db: DatabaseSync) {
  return db.prepare('SELECT balance, fragments FROM wallet WHERE id = 1').get();
}

describe('Version 2 inventory economy', () => {
  it('purchases an unowned outfit without a level gate', () => {
    const db = database();
    new EconomyService(db).purchase('cap_graduate', 100);
    expect(wallet(db)).toMatchObject({ balance: 550, fragments: 5 });
    expect(
      db.prepare("SELECT quantity FROM inventory WHERE item_id = 'cap_graduate'").get(),
    ).toMatchObject({ quantity: 1 });
    expect(db.prepare('SELECT kind, amount FROM economy_transactions').get()).toMatchObject({
      kind: 'purchase',
      amount: -450,
    });
    db.close();
  });

  it('rolls back a purchase when the balance is insufficient', () => {
    const db = database(79, 0);
    expect(() => new EconomyService(db).purchase('cap_blue', 100)).toThrow('星星币不足');
    expect(wallet(db)).toMatchObject({ balance: 79, fragments: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM inventory').get()).toMatchObject({ count: 0 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM economy_transactions').get()).toMatchObject({
      count: 0,
    });
    db.close();
  });

  it('protects the last copy unless the user explicitly allows it', () => {
    const db = database(0, 0);
    db.exec("INSERT INTO inventory VALUES('cap_blue', 1)");
    const service = new EconomyService(db);
    expect(() => service.dismantle('cap_blue')).toThrow('保护最后一件');
    service.dismantle('cap_blue', true, 200);
    expect(wallet(db)).toMatchObject({ balance: 10, fragments: 0 });
    expect(
      db.prepare("SELECT quantity FROM inventory WHERE item_id = 'cap_blue'").get(),
    ).toMatchObject({ quantity: 0 });
    db.close();
  });

  it('keeps an equipped last copy but can dismantle an extra copy', () => {
    const db = database(0, 0);
    db.exec("INSERT INTO inventory VALUES('cap_blue', 2); UPDATE appearance SET head = 'cap_blue'");
    const service = new EconomyService(db);
    service.dismantle('cap_blue');
    expect(
      db.prepare("SELECT quantity FROM inventory WHERE item_id = 'cap_blue'").get(),
    ).toMatchObject({ quantity: 1 });
    expect(() => service.dismantle('cap_blue', true)).toThrow('请先卸下');
    db.close();
  });

  it('converts legacy fragments to coins in one transaction', () => {
    const db = database(10, 3);
    new EconomyService(db).convertFragments(2, 300);
    expect(wallet(db)).toMatchObject({ balance: 50, fragments: 1 });
    expect(() => new EconomyService(db).convertFragments(2)).toThrow('碎片不足');
    expect(wallet(db)).toMatchObject({ balance: 50, fragments: 1 });
    db.close();
  });

  it('requires a milestone item to have been discovered before repurchase', () => {
    const db = database();
    const service = new EconomyService(db);
    expect(() => service.purchase('beret_artist')).toThrow('Lv.5');
    db.exec("INSERT INTO item_discoveries VALUES('beret_artist', 1)");
    service.purchase('beret_artist');
    expect(
      db.prepare("SELECT quantity FROM inventory WHERE item_id = 'beret_artist'").get(),
    ).toMatchObject({ quantity: 1 });
    db.close();
  });
});
