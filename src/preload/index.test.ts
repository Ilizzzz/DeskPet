import { beforeEach, describe, expect, it, vi } from 'vitest';

const exposeInMainWorld = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({ contextBridge: { exposeInMainWorld } }));

describe('preload bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    exposeInMainWorld.mockClear();
  });

  it('exposes only the platform through the bridge', async () => {
    await import('./index');
    expect(exposeInMainWorld).toHaveBeenCalledExactlyOnceWith('desktopApi', {
      platform: process.platform,
    });
  });
});
