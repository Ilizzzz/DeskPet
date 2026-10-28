import { describe, expect, it } from 'vitest';
import { InputCounter } from './input-counter';

describe('InputCounter', () => {
  it('counts one physical key press and every mouse press without retaining event details', () => {
    const counter = new InputCounter(0);
    counter.keyDown(30);
    for (let i = 0; i < 20; i++) counter.keyDown(30);
    counter.mouseDown();
    counter.mouseDown();
    counter.keyUp(30);
    counter.keyDown(30);
    expect(counter.flush(5000)).toEqual({ keyboardCount: 2, mouseCount: 2, periodSeconds: 5 });
    expect(counter.flush(10000)).toEqual({ keyboardCount: 0, mouseCount: 0, periodSeconds: 5 });
  });
  it('clears stale held keys when monitoring resumes', () => {
    const counter = new InputCounter(0);
    counter.keyDown(18);
    counter.resetHeldKeys();
    counter.keyDown(18);
    expect(counter.flush(1000).keyboardCount).toBe(2);
  });
  it('recovers a missing key release after prolonged keyboard inactivity', () => {
    const counter = new InputCounter(0);
    counter.keyDown(18, 0);
    counter.keyDown(18, 119_000);
    counter.keyDown(18, 240_000);
    expect(counter.flush(240_000).keyboardCount).toBe(2);
  });
  it('handles rapid input independently', () => {
    const counter = new InputCounter(0);
    for (let i = 0; i < 100; i++) {
      counter.keyDown(i);
      counter.keyUp(i);
      counter.mouseDown();
    }
    expect(counter.flush(1000)).toMatchObject({ keyboardCount: 100, mouseCount: 100 });
  });
});
