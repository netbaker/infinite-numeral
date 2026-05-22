import { TICK_INTERVAL_MS } from './Constants';

/**
 * 游戏主循环
 *
 * 使用 requestAnimationFrame 驱动，累积器模式确保逻辑tick稳定。
 * deltaTime 累加到 accumulator，每次消耗 TICK_INTERVAL_MS 触发一次逻辑 tick。
 */
export class GameLoop {
  /** tick回调函数 */
  private _onTick: ((deltaTime: number) => void) | null = null;

  /** requestAnimationFrame 句柄 */
  private _rafId: number = 0;

  /** 上一帧时间戳 */
  private _lastTime: number = 0;

  /** 累积器（ms） */
  private _accumulator: number = 0;

  /** tick间隔（ms） */
  private _tickInterval: number = TICK_INTERVAL_MS;

  /** 是否正在运行 */
  private _running: boolean = false;

  /**
   * 设置tick回调
   * @param callback tick回调，参数为 deltaTime（ms）
   */
  onTick(callback: (deltaTime: number) => void): void {
    this._onTick = callback;
  }

  /**
   * 启动游戏循环
   */
  start(): void {
    if (this._running) {
      return;
    }
    this._running = true;
    this._lastTime = performance.now();
    this._accumulator = 0;
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  /**
   * 停止游戏循环
   */
  stop(): void {
    this._running = false;
    if (this._rafId !== 0) {
      cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }
  }

  /**
   * 设置tick速率
   * @param intervalMs tick间隔（毫秒）
   */
  setTickRate(intervalMs: number): void {
    this._tickInterval = Math.max(1, intervalMs);
  }

  /**
   * 主循环帧回调
   */
  private _loop(currentTime: number): void {
    if (!this._running) {
      return;
    }

    const deltaTime = currentTime - this._lastTime;
    this._lastTime = currentTime;

    // 防止极端 delta（如切换标签页后回来）
    const clampedDelta = Math.min(deltaTime, 1000);
    this._accumulator += clampedDelta;

    // 消耗累积器，触发逻辑 tick
    while (this._accumulator >= this._tickInterval) {
      this._accumulator -= this._tickInterval;
      if (this._onTick) {
        this._onTick(this._tickInterval);
      }
    }

    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }
}
