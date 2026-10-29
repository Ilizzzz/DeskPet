import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { DropService, rollDrop } from './drop-service';
import { DROP_POOL, itemEconomy, validateEconomyCatalog } from '../../data/catalogs/economy';

function database(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE input_drop_state(id INTEGER PRIMARY KEY, keyboard_remainder INTEGER NOT NULL);
    INSERT INTO input_drop_state VALUES(1, 0);
    CREATE TABLE inventory(item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL);
    CREATE TABLE item_discoveries(item_id TEXT PRIMARY KEY, first_acquired_at INTEGER NOT NULL);
    CREATE TABLE drop_events(id INTEGER PRIMARY KEY, item_id TEXT NOT NULL, created_at INTEGER NOT NULL);`);
  return db;
}

describe('keyboard drops', () => {
  it('keeps 1499 presses and awards exactly on the next press', () => {
    const db = database();
    const drops = new DropService(db);
    expect(drops.addKeyboard(1499, 1, () => 0)).toHaveLength(0);
    expect(drops.progress().keyboardRemainder).toBe(1499);
    expect(drops.addKeyboard(1, 2, () => 0)).toMatchObject([{ itemId: 'cap_blue' }]);
    expect(drops.progress().keyboardRemainder).toBe(0);
    db.close();
  });

  it('awards multiple thresholds and preserves the remainder', () => {
    const db = database();
    const events = new DropService(db).addKeyboard(3200, 3, () => 0.999);
    expect(events).toHaveLength(2);
    expect(events.every((event) => event.itemId === 'wing_angel')).toBe(true);
    expect(new DropService(db).progress().keyboardRemainder).toBe(200);
    db.close();
  });

  it('matches documented probability boundaries', () => {
    expect(rollDrop(0)).toBe('cap_blue');
    expect(rollDrop(0.149999)).toBe('cap_blue');
    expect(rollDrop(0.15)).toBe('flower_crown');
    expect(rollDrop(0.999999)).toBe('wing_angel');
    let cumulative = 0;
    for (const entry of DROP_POOL) {
      expect(rollDrop((cumulative + entry.weight / 2) / 100)).toBe(entry.itemId);
      cumulative += entry.weight;
    }
    expect(cumulative).toBe(100);
    expect(validateEconomyCatalog()).toBeUndefined();
    expect(itemEconomy('tie_necktie')?.source).toBe('shop');
    expect(itemEconomy('cap_blue')?.source).toBe('starter');
  });

  it('matches the public rates in a fixed-seed long-run simulation', () => {
    let seed = 0x5eed1234;
    const nextRandom = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x1_0000_0000;
    };
    const runs = 100_000;
    const counts = new Map<string, number>();
    for (let index = 0; index < runs; index += 1) {
      const itemId = rollDrop(nextRandom());
      counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
    }
    for (const entry of DROP_POOL) {
      const expected = (runs * entry.weight) / 100;
      expect(Math.abs((counts.get(entry.itemId) ?? 0) - expected)).toBeLessThan(runs * 0.004);
    }
  });
});
