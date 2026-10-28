import { localDate, type DailyStatistics } from '../../shared/types/statistics';
export interface InputCounts {
  keyboardCount: number;
  mouseCount: number;
  periodSeconds: number;
}
export class InputCounter {
  private heldKeys = new Set<number>();
  private lastKeyboardEventAt: number | undefined;
  private days = new Map<string, DailyStatistics>();
  private activeDates = new Set<string>();
  private lastFlushTime: number;
  constructor(now = Date.now()) {
    this.lastFlushTime = now;
  }
  private increment(kind: 'keyboardCount' | 'mouseCount', now: number): void {
    const date = localDate(new Date(now));
    const day = this.days.get(date) ?? {
      date,
      keyboardCount: 0,
      mouseCount: 0,
      activeSeconds: 0,
    };
    day[kind]++;
    this.days.set(date, day);
    this.activeDates.add(date);
  }
  keyDown(keycode: number, now = Date.now()): void {
    // 长时间无键盘事件后清除可能漏失释放事件的状态。
    if (this.lastKeyboardEventAt !== undefined && now - this.lastKeyboardEventAt > 120_000)
      this.heldKeys.clear();
    this.lastKeyboardEventAt = now;
    if (!Number.isSafeInteger(keycode) || this.heldKeys.has(keycode)) return;
    this.heldKeys.add(keycode);
    this.increment('keyboardCount', now);
  }
  keyUp(keycode: number, now = Date.now()): void {
    this.lastKeyboardEventAt = now;
    this.heldKeys.delete(keycode);
  }
  mouseDown(now = Date.now()): void {
    this.increment('mouseCount', now);
  }
  resetHeldKeys(): void {
    this.heldKeys.clear();
    this.lastKeyboardEventAt = undefined;
  }
  flushDays(now = Date.now()): { days: DailyStatistics[]; periodSeconds: number } {
    const periodSeconds = Math.max(0, (now - this.lastFlushTime) / 1000);
    const activeSeconds = Math.min(5, periodSeconds);
    const days = [...this.days.values()];
    if (this.activeDates.size > 0) {
      const secondsPerDate = activeSeconds / this.activeDates.size;
      for (const day of days)
        if (this.activeDates.has(day.date)) day.activeSeconds = secondsPerDate;
    }
    this.days.clear();
    this.activeDates.clear();
    this.lastFlushTime = now;
    return { days, periodSeconds };
  }
  flush(now = Date.now()): InputCounts {
    const { days, periodSeconds } = this.flushDays(now);
    return days.reduce(
      (sum, day) => ({
        keyboardCount: sum.keyboardCount + day.keyboardCount,
        mouseCount: sum.mouseCount + day.mouseCount,
        periodSeconds,
      }),
      { keyboardCount: 0, mouseCount: 0, periodSeconds },
    );
  }
}
