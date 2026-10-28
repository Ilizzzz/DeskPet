import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputMonitor } from './input-monitor';
const callbacks = vi.hoisted(() => new Map<string, (event: { keycode: number }) => void>());
const start = vi.hoisted(() => vi.fn());
const stop = vi.hoisted(() => vi.fn());
vi.mock('uiohook-napi', () => ({
  uIOhook: {
    on: (name: string, callback: (event: { keycode: number }) => void) => {
      callbacks.set(name, callback);
    },
    start,
    stop,
  },
}));

describe('InputMonitor', () => {
  afterEach(() => {
    vi.useRealTimers();
    callbacks.clear();
    start.mockClear();
    stop.mockClear();
  });
  it('starts and stops the native hook and flushes only aggregate counts', async () => {
    vi.useFakeTimers();
    const batches = vi.fn();
    const monitor = new InputMonitor(batches);
    await monitor.start();
    callbacks.get('keydown')?.({ keycode: 42 });
    callbacks.get('keydown')?.({ keycode: 42 });
    callbacks.get('mousedown')?.({ keycode: 0 });
    vi.advanceTimersByTime(5000);
    expect(batches).toHaveBeenCalledOnce();
    expect(batches.mock.calls[0][0]).toMatchObject({ keyboardCount: 1, mouseCount: 1 });
    expect(Object.keys(batches.mock.calls[0][0]).sort()).toEqual([
      'keyboardCount',
      'mouseCount',
      'periodSeconds',
    ]);
    monitor.stop();
    expect(start).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });
});
