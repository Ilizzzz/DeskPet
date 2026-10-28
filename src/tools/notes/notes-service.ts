import type { DatabaseSync } from 'node:sqlite';
import type { Note, NoteChange } from '../../shared/types/note';
export class NotesService {
  constructor(private readonly db: DatabaseSync) {}
  get(id: unknown): Note {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) throw new Error('无效便签');
    const note = this.all().find((entry) => entry.id === id);
    if (!note) throw new Error('便签不存在');
    return note;
  }
  all(): Note[] {
    return this.db
      .prepare(
        'SELECT id, content, color, pinned, updated_at AS updatedAt FROM notes ORDER BY updated_at DESC, id DESC',
      )
      .all()
      .map((row) => ({
        ...(row as unknown as Omit<Note, 'pinned'> & { pinned: number }),
        pinned: (row as { pinned: number }).pinned === 1,
      }));
  }
  create(): Note[] {
    this.db
      .prepare('INSERT INTO notes(content, color, pinned, updated_at) VALUES (?, ?, ?, ?)')
      .run('', 'yellow', 0, Date.now());
    return this.all();
  }
  save(id: unknown, value: unknown): Note[] {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) throw new Error('无效便签');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('无效便签');
    const change = value as NoteChange;
    const keys = Object.keys(change);
    if (
      keys.length === 0 ||
      keys.some((key) => !['content', 'color', 'pinned'].includes(key)) ||
      (change.content !== undefined &&
        (typeof change.content !== 'string' || change.content.length > 20000)) ||
      (change.color !== undefined && !['yellow', 'blue', 'green', 'pink'].includes(change.color)) ||
      (change.pinned !== undefined && typeof change.pinned !== 'boolean')
    )
      throw new Error('无效便签');
    const current = this.get(id);
    const next = { ...current, ...change };
    const result = this.db
      .prepare('UPDATE notes SET content = ?, color = ?, pinned = ?, updated_at = ? WHERE id = ?')
      .run(next.content, next.color, next.pinned ? 1 : 0, Date.now(), id);
    if (result.changes !== 1) throw new Error('便签不存在');
    return this.all();
  }
  delete(id: unknown): Note[] {
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1) throw new Error('无效便签');
    const result = this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    if (result.changes !== 1) throw new Error('便签不存在');
    return this.all();
  }
}
