import { useEffect, useState, type FormEvent } from 'react';
import type { Todo } from '../../shared/types/todo';

const MAX_CONTENT_LENGTH = 200;

/** 待办清单面板：新增、勾选完成与删除。 */
export function TodoPanel() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.desktopApi
      .listTodos()
      .then((value) => setTodos(value))
      .catch(() => setError('无法读取待办。'))
      .finally(() => setLoading(false));
  }, []);

  async function apply(operation: () => Promise<Todo[]>, failure: string): Promise<void> {
    try {
      setTodos(await operation());
      setError('');
    } catch {
      setError(failure);
    }
  }

  async function add(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const text = content.trim();
    if (!text) {
      setError('请输入待办内容。');
      return;
    }
    await apply(() => window.desktopApi.createTodo(text), '无法添加待办。');
    setContent('');
  }

  const doneCount = todos.filter((todo) => todo.done).length;
  return (
    <section className="content-card tool-card tool-panel" aria-label="待办清单">
      <span className="eyebrow">TO-DO</span>
      <h2>待办清单</h2>
      <form className="tool-form" onSubmit={(event) => void add(event)}>
        <label className="tool-field">
          <span>新待办</span>
          <input
            className="tool-input"
            maxLength={MAX_CONTENT_LENGTH}
            value={content}
            placeholder="例如：整理今天的会议记录"
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <button type="submit" className="tool-primary">
          添加
        </button>
      </form>
      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="tool-empty">正在读取待办…</p>
      ) : todos.length === 0 ? (
        <p className="tool-empty">还没有待办，先添加一件小事吧。</p>
      ) : (
        <>
          <p className="tool-meta">
            已完成 {doneCount} / {todos.length} 件
          </p>
          <ul className="tool-list">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={todo.done ? 'tool-list-item tool-list-item-done' : 'tool-list-item'}
              >
                <label className="tool-check">
                  <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() =>
                      void apply(
                        () => window.desktopApi.updateTodo(todo.id, { done: !todo.done }),
                        '无法更新待办。',
                      )
                    }
                  />
                  <span>{todo.content}</span>
                </label>
                <button
                  type="button"
                  className="tool-icon-button"
                  aria-label={`删除待办：${todo.content}`}
                  onClick={() =>
                    void apply(() => window.desktopApi.deleteTodo(todo.id), '无法删除待办。')
                  }
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
