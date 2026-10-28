import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { AppearanceService } from './appearance-service';

function database(level = 1): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE appearance(id INTEGER PRIMARY KEY, character TEXT, scene TEXT, head TEXT, neck TEXT, face TEXT, hand TEXT, back TEXT);
    INSERT INTO appearance VALUES(1, 'cat', 'transparent', NULL, NULL, NULL, NULL, NULL);
    CREATE TABLE inventory(item_id TEXT PRIMARY KEY, quantity INTEGER NOT NULL);
    CREATE TABLE unlocks(id TEXT PRIMARY KEY);
    CREATE TABLE growth_state(id INTEGER PRIMARY KEY, level INTEGER NOT NULL);
    INSERT INTO growth_state VALUES(1, ${level});
    CREATE TABLE wallet(id INTEGER PRIMARY KEY, balance INTEGER NOT NULL, fragments INTEGER NOT NULL DEFAULT 0);
    INSERT INTO wallet VALUES(1, 30, 4);`);
  return db;
}

describe('appearance', () => {
  it('returns the full five-slot state with wallet and progress', () => {
    const db = database();
    db.exec("INSERT INTO inventory VALUES('cap_blue', 1)");
    expect(new AppearanceService(db).get()).toEqual({
      level: 1,
      character: 'cat',
      scene: 'transparent',
      equipped: { head: null, neck: null, face: null, hand: null, back: null },
      inventory: [{ itemId: 'cap_blue', quantity: 1 }],
      unlocks: [],
      balance: 30,
      fragments: 4,
    });
    db.close();
  });

  it('validates level and unlock state before switching character or scene', () => {
    const db = database(10);
    const service = new AppearanceService(db);
    expect(() => service.update({ character: 'invalid' })).toThrow('无效外观选项');
    expect(() => service.update({ character: 'dog' })).toThrow('角色尚未解锁');
    expect(() => service.update({ scene: 'forest_home' })).toThrow('场景尚未解锁');
    db.exec("INSERT INTO unlocks VALUES('dog'), ('forest_home')");
    // 等级不足时即使已解锁也不能使用：rabbit 需要 8 级，这里把等级降回 3。
    db.exec("UPDATE growth_state SET level = 3 WHERE id = 1; INSERT INTO unlocks VALUES('rabbit')");
    expect(() => service.update({ character: 'rabbit' })).toThrow('等级不足');
    db.exec('UPDATE growth_state SET level = 10 WHERE id = 1');
    expect(service.update({ character: 'dog' })).toMatchObject({ character: 'dog' });
    expect(service.update({ scene: 'forest_home' })).toMatchObject({ scene: 'forest_home' });
    db.close();
  });

  it('equips owned items slot by slot and allows unequipping', () => {
    const db = database(10);
    const service = new AppearanceService(db);
    db.exec(
      "INSERT INTO inventory VALUES('cap_blue', 1), ('glasses_round', 1), ('balloon_red', 1)",
    );
    expect(service.update({ equipped: { slot: 'head', itemId: 'cap_blue' } })).toMatchObject({
      equipped: { head: 'cap_blue' },
    });
    expect(service.update({ equipped: { slot: 'face', itemId: 'glasses_round' } })).toMatchObject({
      equipped: { head: 'cap_blue', face: 'glasses_round' },
    });
    expect(service.update({ equipped: { slot: 'hand', itemId: 'balloon_red' } })).toMatchObject({
      equipped: { hand: 'balloon_red' },
    });
    expect(service.update({ equipped: { slot: 'head', itemId: null } })).toMatchObject({
      equipped: { head: null, face: 'glasses_round', hand: 'balloon_red' },
    });
    expect(db.prepare('SELECT quantity FROM inventory').all()).toHaveLength(3);
    db.close();
  });

  it('rejects wrong slots, unowned and under-leveled items', () => {
    const db = database(10);
    const service = new AppearanceService(db);
    db.exec("INSERT INTO inventory VALUES('cap_blue', 1)");
    expect(() => service.update({ equipped: { slot: 'neck', itemId: 'cap_blue' } })).toThrow(
      '装扮槽位不匹配',
    );
    expect(() => service.update({ equipped: { slot: 'head', itemId: 'hat_woman' } })).toThrow(
      '物品不存在',
    );
    db.exec(
      "INSERT INTO inventory VALUES('goggles_sky', 1); UPDATE growth_state SET level = 10 WHERE id = 1",
    );
    expect(() => service.update({ equipped: { slot: 'face', itemId: 'goggles_sky' } })).toThrow(
      '等级不足',
    );
    expect(() => service.update({ equipped: { slot: 'face', itemId: 'unknown' } })).toThrow(
      '无效外观选项',
    );
    db.close();
  });

  it('accepts exactly one change per call', () => {
    const db = database(10);
    const service = new AppearanceService(db);
    db.exec("INSERT INTO unlocks VALUES('dog')");
    expect(() => service.update({ character: 'dog', scene: 'transparent' })).toThrow(
      '一次只能修改一个外观字段',
    );
    expect(() => service.update({ head: 'cap_blue' })).toThrow('无效外观字段');
    expect(() => service.update({ equipped: { slot: 'hat', itemId: null } })).toThrow(
      '无效外观字段',
    );
    expect(() => service.update(null)).toThrow('无效外观');
    expect(() => service.update([])).toThrow('无效外观');
    expect(db.prepare('SELECT head FROM appearance').get()).toMatchObject({ head: null });
    db.close();
  });
});
