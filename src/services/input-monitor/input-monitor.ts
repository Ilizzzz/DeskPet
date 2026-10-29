import { InputCounter, type InputCounts } from './input-counter';
import type { DailyStatistics } from '../../shared/types/statistics';

type Hook = (typeof import('uiohook-napi'))['uIOhook'];
export type InputActivity = 'keyboard' | 'mouse';

export class InputMonitor {
  private readonly counter = new InputCounter();
  private hook: Hook | undefined;
  private running = false;
  private desiredRunning = false;
  private startPromise: Promise<void> | undefined;
  private timer: NodeJS.Timeout | undefined;
  private totalKeyboard = 0;
  private totalMouse = 0;

  constructor(
    private readonly onBatch: (counts: InputCounts, days: DailyStatistics[]) => void,
    private readonly onActivity: (activity: InputActivity) => void = () => undefined,
  ) {}

  async start(): Promise<void> {
    this.desiredRunning = true;
    if (this.running) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = (async () => {
      if (!this.hook) {
        const { uIOhook } = await import('uiohook-napi');
        uIOhook.on('keydown', (event) => {
          if (this.counter.keyDown(event.keycode)) this.onActivity('keyboard');
        });
        uIOhook.on('keyup', (event) => this.counter.keyUp(event.keycode));
        uIOhook.on('mousedown', () => {
          this.counter.mouseDown();
          this.onActivity('mouse');
        });
        this.hook = uIOhook;
      }
      if (!this.desiredRunning) return;
      this.counter.resetHeldKeys();
      this.counter.flush();
      this.hook.start();
      this.running = true;
      this.timer = setInterval(() => this.flush(), 5000);
    })().finally(() => {
      this.startPromise = undefined;
    });
    return this.startPromise;
  }

  stop(): void {
    this.desiredRunning = false;
    if (!this.running) return;
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    try {
      this.hook?.stop();
    } catch (error) {
      console.error('无法正常停止键鼠监听。', error);
    } finally {
      this.running = false;
      this.counter.resetHeldKeys();
      this.flush();
    }
  }

  flush(): void {
    const { days, periodSeconds } = this.counter.flushDays();
    const batch = days.reduce(
      (sum, day) => ({
        keyboardCount: sum.keyboardCount + day.keyboardCount,
        mouseCount: sum.mouseCount + day.mouseCount,
        periodSeconds,
      }),
      { keyboardCount: 0, mouseCount: 0, periodSeconds },
    );
    if (batch.keyboardCount === 0 && batch.mouseCount === 0) return;
    this.totalKeyboard += batch.keyboardCount;
    this.totalMouse += batch.mouseCount;
    // 仅传递聚合值，不转发或记录原生事件。
    this.onBatch(batch, days);
  }

  get totals() {
    return { keyboardCount: this.totalKeyboard, mouseCount: this.totalMouse };
  }
  get isRunning() {
    return this.running;
  }
}
