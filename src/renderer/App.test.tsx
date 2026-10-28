import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the initial application screen', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('DeskPet');
    expect(html).toContain('桌面宠物基础工程已就绪。');
  });
});
