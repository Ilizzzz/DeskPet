import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { grantLevelReward } from './rewards';

describe('level rewards', () => {
  it('grants assets exactly once and rolls back an unknown reward', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE wallet (id INTEGER PRIMARY KEY, balance INTEGER NOT NULL); INSERT INTO wallet VALUES (1, 0);
      CREATE TABLE inventory (item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL);
      CREATE TABLE unlocks (id TEXT PRIMARY KEY);
      CREATE TABLE granted_rewards (level INTEGER PRIMARY KEY, reward TEXT NOT NULL);`);
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
