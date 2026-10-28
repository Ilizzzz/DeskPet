import { useEffect, useRef, useState } from 'react';
import type { Note, NoteChange } from '../../shared/types/note';

export function NoteWindow({ id }: { id: number }) {
  const [note, setNote] = useState<Note>();
  const [status, setStatus] = useState('正在读取…');
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef<Note | undefined>(undefined);
  useEffect(() => {
    void window.desktopApi
      .getNote(id)
      .then((value) => {
        setNote(value);
        latest.current = value;
        setStatus('已保存');
      })
      .catch(() => setStatus('无法读取便签'));
    return () => {
      if (pending.current) {
        clearTimeout(pending.current);
        const value = latest.current;
        if (value)
          void window.desktopApi.saveNote(id, {
            content: value.content,
            color: value.color,
            pinned: value.pinned,
          });
      }
    };
  }, [id]);
  const save = (change: NoteChange) => {
    if (!note) return;
    const next = { ...(latest.current ?? note), ...change };
    latest.current = next;
    setNote(next);
    setStatus('等待保存');
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      pending.current = undefined;
      void window.desktopApi
        .saveNote(id, {
          content: latest.current?.content,
          color: latest.current?.color,
          pinned: latest.current?.pinned,
        })
        .then((notes) => {
          const saved = notes.find((entry) => entry.id === id);
          if (saved) {
            latest.current = saved;
            setNote(saved);
          }
          setStatus('已保存');
        })
        .catch(() => setStatus('保存失败'));
    }, 350);
  };
  if (!note) return <div className="note-window">{status}</div>;
  return (
    <main className={`note-window note-${note.color}`}>
      <textarea
        aria-label="便签内容"
        maxLength={20000}
        value={note.content}
        onChange={(event) => save({ content: event.target.value })}
      />
      <footer>
        <select
          aria-label="便签颜色"
          value={note.color}
          onChange={(event) => save({ color: event.target.value as Note['color'] })}
        >
          <option value="yellow">黄色</option>
          <option value="blue">蓝色</option>
          <option value="green">绿色</option>
          <option value="pink">粉色</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={note.pinned}
            onChange={(event) => save({ pinned: event.target.checked })}
          />{' '}
          置顶
        </label>
        <span>{status}</span>
      </footer>
    </main>
  );
}
