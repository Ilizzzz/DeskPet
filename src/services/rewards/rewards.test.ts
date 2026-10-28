import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { grantLevelReward, grantReward } from './rewards';

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE wallet (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL, fragments INTEGER NOT NULL DEFAULT 0);
    INSERT INTO wallet VALUES (1, 0, 0);
    CREATE TABLE inventory (item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL);
    CREATE TABLE unlocks (id TEXT PRIMARY KEY);
    CREATE TABLE granted_rewards (level INTEGER PRIMARY KEY, reward TEXT NOT NULL);`);
  return db;
}

describe('reward granting', () => {
  it('grants structured rewards inside the caller transaction', () => {
    const db = createDatabase();
    db.exec('BEGIN');
    grantReward(db, { type: 'coins', amount: 30 });
    grantReward(db, { type: 'fragments', amount: 2 });
    grantReward(db, { type: 'item', itemId: 'cap_blue', quantity: 1 });
    grantReward(db, { type: 'item', itemId: 'cap_blue', quantity: 1 });
    grantReward(db, { type: 'scene', id: 'forest_home' });
    db.exec('COMMIT');
    expect(db.prepare('SELECT balance, fragments FROM wallet').get()).toMatchObject({
      balance: 30,
      fragments: 2,
    });
    expect(
      db.prepare('SELECT quantity FROM inventory WHERE item_id = ?').get('cap_blue'),
    ).toMatchObject({ quantity: 2 });
    expect(db.prepare('SELECT id FROM unlocks').get()).toMatchObject({ id: 'forest_home' });
    db.close();
  });

  it('rejects invalid amounts and unknown reward types', () => {
    const db = createDatabase();
    expect(() => grantReward(db, { type: 'coins', amount: 0 })).toThrow();
    expect(() => grantReward(db, { type: 'item', itemId: 'x', quantity: -1 })).toThrow();
    db.close();
  });

  it('grants legacy level rewards exactly once', () => {
    const db = createDatabase();
    db.exec('BEGIN');
    grantLevelReward(db, 2, 'hat_blue');
    grantLevelReward(db, 2, 'hat_blue');
    grantLevelReward(db, 3, 'currency_50');
    grantLevelReward(db, 5, 'forest_home');
    db.exec('COMMIT');
    expect(
      db.prepare('SELECT quantity FROM inventory WHERE item_id = ?').get('hat_blue'),
    ).toMatchObject({ quantity: 1 });
    expect(db.prepare('SELECT balance FROM wallet').get()).toMatchObject({ balance: 50 });
    expect(db.prepare('SELECT id FROM unlocks').get()).toMatchObject({ id: 'forest_home' });
    db.exec('BEGIN');
    expect(() => grantLevelReward(db, 6, 'unknown')).toThrow();
    db.exec('ROLLBACK');
    expect(db.prepare('SELECT * FROM granted_rewards WHERE level = 6').get()).toBeUndefined();
    db.close();
  });
});
