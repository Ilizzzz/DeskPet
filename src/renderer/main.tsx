import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { StatisticsPage } from './statistics/StatisticsPage';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');

createRoot(root).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).get('view') === 'statistics' ? (
      <StatisticsPage />
    ) : (
      <App />
    )}
  </StrictMode>,
);
