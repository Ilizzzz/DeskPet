import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { ToolRegistryService } from './tool-registry';

describe('tool registry', () => {
  it('initializes defaults and persists enabled state', () => {
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE tool_settings(tool_id TEXT PRIMARY KEY, enabled INTEGER NOT NULL)');
    const registry = new ToolRegistryService(db);
    expect(registry.list()).toHaveLength(4);
    registry.setEnabled('notes', false);
    expect(new ToolRegistryService(db).isEnabled('notes')).toBe(false);
    expect(() => registry.setEnabled('unknown', true)).toThrow();
    db.close();
  });
});
