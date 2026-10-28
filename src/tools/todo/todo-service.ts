import type { DatabaseSync } from 'node:sqlite';
import type { Todo, TodoChange } from '../../shared/types/todo';

const MAX_CONTENT_LENGTH = 200;

type Row = {
  id: number;
  content: string;
  done: number;
  created_at: number;
  updated_at: number;
};

function toTodo(row: Row): Todo {
  return {
    id: row.id,
    content: row.content,
    done: row.done === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validId(id: unknown): id is number {
  return typeof id === 'number' && Number.isSafeInteger(id) && id >= 1;
}

function content(value: unknown): string {
  if (typeof value !== 'string') throw new Error('无效待办');
  const text = value.trim();
  if (text.length < 1 || text.length > MAX_CONTENT_LENGTH) throw new Error('无效待办内容');
  return text;
}

/** 待办清单：本地 SQLite 持久化，内容限制 1..200 字。 */
export class TodoService {
  constructor(private readonly db: DatabaseSync) {}

  all(): Todo[] {
    const rows = this.db
      .prepare(
        'SELECT id, content, done, created_at, updated_at FROM todos ORDER BY done ASC, created_at DESC, id DESC',
      )
      .all() as unknown as Row[];
    return rows.map(toTodo);
  }

  create(value: unknown): Todo[] {
    const text = content(value);
    const now = Date.now();
    this.db
      .prepare('INSERT INTO todos(content, done, created_at, updated_at) VALUES (?, 0, ?, ?)')
      .run(text, now, now);
    return this.all();
  }

  update(id: unknown, change: unknown): Todo[] {
    if (!validId(id)) throw new Error('无效待办');
    if (!change || typeof change !== 'object' || Array.isArray(change)) throw new Error('无效待办');
    const keys = Object.keys(change);
    if (keys.length === 0 || keys.some((key) => !['content', 'done'].includes(key)))
      throw new Error('无效待办');
    const todo = this.db
      .prepare('SELECT id, content, done, created_at, updated_at FROM todos WHERE id = ?')
      .get(id) as unknown as Row | undefined;
    if (!todo) throw new Error('待办不存在');
    const patch = change as TodoChange;
    const nextContent = patch.content === undefined ? todo.content : content(patch.content);
    if (patch.done !== undefined && typeof patch.done !== 'boolean') throw new Error('无效待办');
    const nextDone = patch.done === undefined ? todo.done === 1 : patch.done;
    this.db
      .prepare('UPDATE todos SET content = ?, done = ?, updated_at = ? WHERE id = ?')
      .run(nextContent, nextDone ? 1 : 0, Date.now(), id);
    return this.all();
  }

  remove(id: unknown): Todo[] {
    if (!validId(id)) throw new Error('无效待办');
    const result = this.db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    if (result.changes !== 1) throw new Error('待办不存在');
    return this.all();
  }
}
