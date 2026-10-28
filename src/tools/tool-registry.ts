import type { DatabaseSync } from 'node:sqlite';
import { TOOL_DEFINITIONS } from '../data/catalogs/tools';
import type { ToolId, ToolState } from '../shared/types/tool';

export class ToolRegistryService {
  constructor(private readonly db: DatabaseSync) {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO tool_settings(tool_id, enabled) VALUES (?, ?)',
    );
    for (const tool of TOOL_DEFINITIONS) insert.run(tool.id, tool.defaultEnabled ? 1 : 0);
  }

  list(): ToolState[] {
    const rows = this.db.prepare('SELECT tool_id, enabled FROM tool_settings').all() as unknown as {
      tool_id: string;
      enabled: number;
    }[];
    const enabled = new Map(rows.map((row) => [row.tool_id, row.enabled === 1]));
    return TOOL_DEFINITIONS.map((tool) => ({ ...tool, enabled: enabled.get(tool.id) ?? false }));
  }

  isEnabled(id: ToolId): boolean {
    return this.list().find((tool) => tool.id === id)?.enabled ?? false;
  }

  setEnabled(id: unknown, enabled: unknown): ToolState[] {
    if (
      typeof id !== 'string' ||
      !TOOL_DEFINITIONS.some((tool) => tool.id === id) ||
      typeof enabled !== 'boolean'
    )
      throw new Error('无效工具设置');
    this.db
      .prepare('UPDATE tool_settings SET enabled = ? WHERE tool_id = ?')
      .run(enabled ? 1 : 0, id);
    return this.list();
  }
}
