import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { TodoService } from './todo-service';

function createDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(
    'CREATE TABLE todos (id INTEGER PRIMARY KEY, content TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0, 1)), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)',
  );
  return db;
}

describe('todo service', () => {
  it('creates, updates and removes todos', () => {
    const db = createDb();
    const todos = new TodoService(db);
    const created = todos.create('  写周报  ');
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ content: '写周报', done: false });

    const id = created[0].id;
    const updated = todos.update(id, { done: true });
    expect(updated[0]).toMatchObject({ content: '写周报', done: true });

    const renamed = todos.update(id, { content: '写月报' });
    expect(renamed[0]).toMatchObject({ content: '写月报', done: true });

    expect(todos.remove(id)).toEqual([]);
    expect(() => todos.remove(id)).toThrow('待办不存在');
    db.close();
  });

  it('rejects invalid input', () => {
    const db = createDb();
    const todos = new TodoService(db);
    expect(() => todos.create('')).toThrow();
    expect(() => todos.create('   ')).toThrow();
    expect(() => todos.create('x'.repeat(201))).toThrow();
    expect(() => todos.create(42)).toThrow();
    const id = todos.create('有效待办')[0].id;
    expect(() => todos.update(id, {})).toThrow();
    expect(() => todos.update(id, { content: '' })).toThrow();
    expect(() => todos.update(id, { done: 'yes' })).toThrow();
    expect(() => todos.update(id, { unknown: true })).toThrow();
    expect(() => todos.update(999, { done: true })).toThrow();
    expect(() => todos.remove(0)).toThrow();
    db.close();
  });

  it('orders pending todos before completed ones', () => {
    const db = createDb();
    const todos = new TodoService(db);
    const first = todos.create('第一件')[0].id;
    const second = todos.create('第二件')[0].id;
    todos.update(first, { done: true });
    expect(todos.all().map((todo) => todo.id)).toEqual([second, first]);
    db.close();
  });
});
