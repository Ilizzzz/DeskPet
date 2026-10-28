import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StatisticsPage } from './statistics/StatisticsPage';
import { NoteWindow } from './notes/NoteWindow';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');

const parameters = new URLSearchParams(window.location.search);
const view = parameters.get('view');
const noteId = Number(parameters.get('noteId'));

createRoot(root).render(
  <StrictMode>
    {view === 'statistics' ? (
      <StatisticsPage />
    ) : view === 'note' && Number.isSafeInteger(noteId) && noteId > 0 ? (
      <NoteWindow id={noteId} />
    ) : (
      <App />
    )}
  </StrictMode>,
);
