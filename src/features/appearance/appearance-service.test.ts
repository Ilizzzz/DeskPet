import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { AppearanceService } from './appearance-service';

describe('appearance', () => {
  it('rejects locked choices and persists owned selections', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(`CREATE TABLE appearance(id INTEGER PRIMARY KEY, character TEXT, scene TEXT, head TEXT, neck TEXT);
      INSERT INTO appearance VALUES(1, 'cat', 'transparent', NULL, NULL);
      CREATE TABLE inventory(item_id TEXT PRIMARY KEY, quantity INTEGER); CREATE TABLE unlocks(id TEXT PRIMARY KEY);
      CREATE TABLE growth_state(id INTEGER PRIMARY KEY, level INTEGER); INSERT INTO growth_state VALUES(1, 1);
      CREATE TABLE wallet(id INTEGER PRIMARY KEY, balance INTEGER); INSERT INTO wallet VALUES(1, 0);`);
    const service = new AppearanceService(db);
    expect(() => service.update({ character: 'fox' })).toThrow();
    expect(() => service.update({ head: 'hat_blue' })).toThrow();
    expect(() => service.update({ scene: 'forest_home', head: null })).toThrow();
    expect(() => service.update({ character: 'invalid' })).toThrow();
    db.exec(
      "INSERT INTO unlocks VALUES('fox'); INSERT INTO unlocks VALUES('forest_home'); INSERT INTO inventory VALUES('hat_blue', 1)",
    );
    service.update({ character: 'fox' });
    service.update({ scene: 'forest_home' });
    service.update({ head: 'hat_blue' });
    expect(new AppearanceService(db).get()).toMatchObject({
      character: 'fox',
      scene: 'forest_home',
      head: 'hat_blue',
      balance: 0,
    });
    service.update({ head: null });
    expect(service.get().inventory[0].quantity).toBe(1);
    expect(db.prepare('SELECT level FROM growth_state').get()).toMatchObject({ level: 1 });
    db.close();
  });
});
