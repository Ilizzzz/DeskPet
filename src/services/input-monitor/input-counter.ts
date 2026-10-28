export interface InputCounts {
  keyboardCount: number;
  mouseCount: number;
  periodSeconds: number;
}

export class InputCounter {
  private heldKeys = new Set<number>();
  private lastKeyboardEventAt: number | undefined;
  private keyboardCount = 0;
  private mouseCount = 0;
  private lastFlushTime: number;

  constructor(now = Date.now()) {
    this.lastFlushTime = now;
  }

  keyDown(keycode: number, now = Date.now()): void {
    // 长时间无键盘事件后清除可能漏失释放事件的状态；持续自动重复不会触发此恢复。
    if (this.lastKeyboardEventAt !== undefined && now - this.lastKeyboardEventAt > 120_000)
      this.heldKeys.clear();
    this.lastKeyboardEventAt = now;
    if (!Number.isSafeInteger(keycode) || this.heldKeys.has(keycode)) return;
    // 长按产生的重复按下只计一次；释放后才允许再次计数。
    this.heldKeys.add(keycode);
    this.keyboardCount++;
  }
  keyUp(keycode: number, now = Date.now()): void {
    this.lastKeyboardEventAt = now;
    this.heldKeys.delete(keycode);
  }
  mouseDown(): void {
    this.mouseCount++;
  }
  resetHeldKeys(): void {
    this.heldKeys.clear();
    this.lastKeyboardEventAt = undefined;
  }
  flush(now = Date.now()): InputCounts {
    const counts = {
      keyboardCount: this.keyboardCount,
      mouseCount: this.mouseCount,
      periodSeconds: Math.max(0, (now - this.lastFlushTime) / 1000),
    };
    this.keyboardCount = 0;
    this.mouseCount = 0;
    this.lastFlushTime = now;
    return counts;
  }
}
