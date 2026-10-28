import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { App } from './App';

function renderApp(): string {
  return renderToStaticMarkup(<App />);
}

describe('App', () => {
  it('renders an accessible draggable pet with click and menu hints', () => {
    const html = renderApp();
    expect(html).toContain('companion-stage');
    expect(html).toContain('role="img"');
    expect(html).toContain('拖动可移动');
    expect(html).toContain('双击打开控制中心');
    expect(html).toContain('右键打开菜单');
  });

  it('uses the 220px stage and idle state without the old touch overlay', () => {
    const html = renderApp();
    expect(html).toContain('width:220px');
    expect(html).toContain('height:220px');
    expect(html).toContain('companion-state-idle');
    expect(html).not.toContain('pet-interaction');
    expect(html).not.toContain('摸摸');
  });
});
