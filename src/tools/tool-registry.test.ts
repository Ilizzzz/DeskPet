import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS } from '../data/catalogs/tools';
import { ToolRegistryService } from './tool-registry';

/** 测试用最小数据库：工具表 + 成长等级。 */
function createDb(level = 1): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(
    'CREATE TABLE tool_settings(tool_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL);' +
      'CREATE TABLE growth_state(id INTEGER PRIMARY KEY CHECK(id = 1), level INTEGER NOT NULL);' +
      `INSERT INTO growth_state VALUES (1, ${level});`,
  );
  return db;
}

describe('tool registry', () => {
  it('initializes defaults and persists enabled state', () => {
    const db = createDb(4);
    const registry = new ToolRegistryService(db);
    expect(registry.list()).toHaveLength(TOOL_DEFINITIONS.length);
    registry.setEnabled('notes', false);
    expect(new ToolRegistryService(db).isEnabled('notes')).toBe(false);
    expect(() => registry.setEnabled('unknown', true)).toThrow();
    db.close();
  });

  it('locks tools above the current growth level', () => {
    const db = createDb(1);
    const registry = new ToolRegistryService(db);
    const states = registry.list();
    const summary = states.find((tool) => tool.id === 'daily_summary');
    const focus = states.find((tool) => tool.id === 'focus');
    expect(summary).toMatchObject({ enabled: true, unlocked: true });
    expect(focus).toMatchObject({ unlocked: false });
    expect(registry.isEnabled('focus')).toBe(false);
    expect(() => registry.setEnabled('focus', true)).toThrow('工具尚未解锁');
    db.close();
  });

  it('keeps the user preference while a tool is still locked', () => {
    const db = createDb(1);
    const registry = new ToolRegistryService(db);
    db.prepare("UPDATE tool_settings SET enabled = 0 WHERE tool_id = 'notes'").run();
    db.prepare('UPDATE growth_state SET level = 4 WHERE id = 1').run();
    const notes = registry.list().find((tool) => tool.id === 'notes');
    expect(notes).toMatchObject({ enabled: false, unlocked: true });
    expect(registry.isEnabled('notes')).toBe(false);
    db.close();
  });

  it('unlocks exactly when the level reaches minimumLevel', () => {
    const db = createDb(1);
    const registry = new ToolRegistryService(db);
    db.prepare('UPDATE growth_state SET level = 2 WHERE id = 1').run();
    expect(registry.isEnabled('focus')).toBe(true);
    registry.setEnabled('focus', false);
    expect(registry.isEnabled('focus')).toBe(false);
    db.close();
  });
});
