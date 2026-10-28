import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { NotesService } from './notes-service';
describe('notes', () => {
  it('creates, updates and deletes plain text and rejects invalid input', () => {
    const db = new DatabaseSync(':memory:');
    db.exec(
      "CREATE TABLE notes (id INTEGER PRIMARY KEY, content TEXT NOT NULL, updated_at INTEGER NOT NULL, color TEXT NOT NULL DEFAULT 'yellow', pinned INTEGER NOT NULL DEFAULT 0)",
    );
    const notes = new NotesService(db);
    const id = notes.create()[0].id;
    expect(notes.save(id, { content: '测试便签', color: 'blue', pinned: true })[0]).toMatchObject({
      content: '测试便签',
      color: 'blue',
      pinned: true,
    });
    expect(() => notes.save(id, { content: 'x'.repeat(20001) })).toThrow();
    expect(() => notes.delete(-1)).toThrow();
    expect(notes.delete(id)).toEqual([]);
    expect(() => notes.save(id, { content: 'missing' })).toThrow();
    db.close();
  });
});
