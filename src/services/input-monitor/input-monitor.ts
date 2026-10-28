import { InputCounter, type InputCounts } from './input-counter';

type Hook = (typeof import('uiohook-napi'))['uIOhook'];

export class InputMonitor {
  private readonly counter = new InputCounter();
  private hook: Hook | undefined;
  private running = false;
  private desiredRunning = false;
  private startPromise: Promise<void> | undefined;
  private timer: NodeJS.Timeout | undefined;
  private totalKeyboard = 0;
  private totalMouse = 0;

  constructor(private readonly onBatch: (counts: InputCounts) => void) {}

  async start(): Promise<void> {
    this.desiredRunning = true;
    if (this.running) return;
    if (this.startPromise) return this.startPromise;
    this.startPromise = (async () => {
      if (!this.hook) {
        const { uIOhook } = await import('uiohook-napi');
        uIOhook.on('keydown', (event) => this.counter.keyDown(event.keycode));
        uIOhook.on('keyup', (event) => this.counter.keyUp(event.keycode));
        uIOhook.on('mousedown', () => this.counter.mouseDown());
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
    const batch = this.counter.flush();
    if (batch.keyboardCount === 0 && batch.mouseCount === 0) return;
    this.totalKeyboard += batch.keyboardCount;
    this.totalMouse += batch.mouseCount;
    // 仅传递聚合值，不转发或记录原生事件。
    this.onBatch(batch);
  }

  get totals() {
    return { keyboardCount: this.totalKeyboard, mouseCount: this.totalMouse };
  }
  get isRunning() {
    return this.running;
  }
}
