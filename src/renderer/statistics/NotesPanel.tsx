import { useEffect, useRef, useState } from 'react';
import type { Note, NoteChange } from '../../shared/types/note';
function NoteEditor({ note, remove }: { note: Note; remove: (id: number) => void }) {
  const [text, setText] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [pinned, setPinned] = useState(note.pinned);
  const [status, setStatus] = useState('已保存');
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef<NoteChange>({
    content: note.content,
    color: note.color,
    pinned: note.pinned,
  });
  const save = (change: NoteChange) => {
    setStatus('保存中');
    void window.desktopApi
      .saveNote(note.id, change)
      .then(() => setStatus('已保存'))
      .catch(() => setStatus('保存失败'));
  };
  useEffect(
    () => () => {
      if (pending.current) {
        clearTimeout(pending.current);
        void window.desktopApi.saveNote(note.id, latest.current);
      }
    },
    [note.id],
  );
  return (
    <article className={`note-card note-${color}`}>
      <textarea
        aria-label="便签内容"
        maxLength={20000}
        value={text}
        onChange={(event) => {
          const value = event.target.value;
          latest.current = { ...latest.current, content: value };
          setText(value);
          setStatus('等待保存');
          if (pending.current) clearTimeout(pending.current);
          pending.current = setTimeout(() => {
            pending.current = undefined;
            save(latest.current);
          }, 500);
        }}
      />
      <label>
        颜色{' '}
        <select
          value={color}
          onChange={(event) => {
            const value = event.target.value as Note['color'];
            setColor(value);
            latest.current = { ...latest.current, color: value };
            save(latest.current);
          }}
        >
          <option value="yellow">黄色</option>
          <option value="blue">蓝色</option>
          <option value="green">绿色</option>
          <option value="pink">粉色</option>
        </select>
      </label>{' '}
      <label>
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => {
            setPinned(event.target.checked);
            latest.current = { ...latest.current, pinned: event.target.checked };
            save(latest.current);
          }}
        />{' '}
        置顶
      </label>
      <p>
        {status} <button onClick={() => void window.desktopApi.openNote(note.id)}>桌面打开</button>{' '}
        <button
          onClick={() => {
            if (pending.current) clearTimeout(pending.current);
            pending.current = undefined;
            save(latest.current);
          }}
        >
          保存
        </button>{' '}
        <button
          onClick={() => {
            if (window.confirm('删除这条便签？')) {
              if (pending.current) clearTimeout(pending.current);
              pending.current = undefined;
              remove(note.id);
            }
          }}
        >
          删除
        </button>
      </p>
    </article>
  );
}
export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    void window.desktopApi
      .listNotes()
      .then(setNotes)
      .catch(() => setError('无法读取便签。'));
  }, []);
  async function add() {
    try {
      setNotes(await window.desktopApi.createNote());
      setError('');
    } catch {
      setError('无法新建便签。');
    }
  }
  async function remove(id: number) {
    try {
      setNotes(await window.desktopApi.deleteNote(id));
      setError('');
    } catch {
      setError('无法删除便签。');
    }
  }
  return (
    <section aria-label="便签">
      <h2>便签</h2>
      {error && <p role="alert">{error}</p>}
      <button onClick={() => void add()}>新建便签</button>
      {notes.map((note) => (
        <NoteEditor key={note.id} note={note} remove={(id) => void remove(id)} />
      ))}
    </section>
  );
}
