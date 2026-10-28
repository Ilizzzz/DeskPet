import type { DatabaseSync } from 'node:sqlite';
import { TOOL_DEFINITIONS } from '../data/catalogs/tools';
import type { ToolId, ToolState } from '../shared/types/tool';

/**
 * 工具注册表。
 *
 * 工具是否可用由成长等级实时决定，用户只能开关已经解锁的工具；
 * 数据库只保存用户的启停偏好，不保存解锁状态，避免两份数据不一致。
 */
export class ToolRegistryService {
  constructor(private readonly db: DatabaseSync) {
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO tool_settings(tool_id, enabled) VALUES (?, ?)',
    );
    for (const tool of TOOL_DEFINITIONS) insert.run(tool.id, tool.defaultEnabled ? 1 : 0);
  }

  /** 当前成长等级；工具解锁只依赖等级，不依赖经验。 */
  private level(): number {
    const row = this.db.prepare('SELECT level FROM growth_state WHERE id = 1').get() as
      { level: number } | undefined;
    if (!row) throw new Error('成长数据不可用');
    return row.level;
  }

  list(): ToolState[] {
    const level = this.level();
    const rows = this.db.prepare('SELECT tool_id, enabled FROM tool_settings').all() as unknown as {
      tool_id: string;
      enabled: number;
    }[];
    const enabled = new Map(rows.map((row) => [row.tool_id, row.enabled === 1]));
    return TOOL_DEFINITIONS.map((tool) => ({
      ...tool,
      enabled: enabled.get(tool.id) ?? tool.defaultEnabled,
      unlocked: level >= tool.minimumLevel,
    }));
  }

  /** 只有解锁且用户开启的工具才算生效，主进程用它决定是否执行提醒。 */
  isEnabled(id: ToolId): boolean {
    const tool = this.list().find((entry) => entry.id === id);
    return tool?.enabled === true && tool.unlocked;
  }

  setEnabled(id: unknown, enabled: unknown): ToolState[] {
    if (typeof id !== 'string' || typeof enabled !== 'boolean') throw new Error('无效工具设置');
    const tool = TOOL_DEFINITIONS.find((entry) => entry.id === id);
    if (!tool) throw new Error('无效工具设置');
    if (this.level() < tool.minimumLevel) throw new Error('工具尚未解锁');
    this.db
      .prepare('UPDATE tool_settings SET enabled = ? WHERE tool_id = ?')
      .run(enabled ? 1 : 0, id);
    return this.list();
  }
}
