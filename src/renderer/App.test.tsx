import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';
describe('App', () => {
  it('renders an accessible draggable placeholder', () => {
    expect(renderToStaticMarkup(<App />)).toContain('桌宠，拖动可移动');
  });
});
