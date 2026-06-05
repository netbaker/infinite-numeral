import type { GameState, EntropyCollapseLevel } from '@/types/game';
import {
  ENTROPY_CONFIG,
  ENTROPY_COLLAPSE_NARRATIVES,
} from '@/core/Constants';
import { BigNumber } from '@/core/BigNumber';
import Decimal from 'break_eternity.js';

/**
 * 熵崩系统（v2.0 核心机制）
 *
 * 随着数字持续增长，宇宙"熵值"上升。
 * 超过阈值时触发惩罚，倒逼玩家策略性重置。
 */
export class EntropySystem {
  // ---- 私有状态（供 gameStore 通过 getter 读取）----
  private _collapsedThisTick: boolean = false;
  private _collapseNarration: string | null = null;
  private _warningLevel: EntropyCollapseLevel | null = null;

  // ---- 只读访问器 ----
  get collapsedThisTick(): boolean {
    return this._collapsedThisTick;
  }
  get collapseNarration(): string | null {
    return this._collapseNarration;
  }
  get warningLevel(): EntropyCollapseLevel | null {
    return this._warningLevel;
  }

  /**
   * 初始化熵系统状态
   */
  initialize(state: GameState): void {
    if (!state._lastEntropyDecayTick) {
      state._lastEntropyDecayTick = Date.now();
    }
    state.entropy = Math.max(0, Math.min(100, state.entropy));
    state.entropyStabilizers = Math.max(0, state.entropyStabilizers);
    state.entropyRewinds = Math.max(0, state.entropyRewinds);
    state.totalCollapses = Math.max(0, state.totalCollapses);
  }

  /**
   * 主 tick：每帧调用，计算熵值变化并检测崩溃
   * @param state 游戏状态
   * @param deltaTime 帧间隔(ms)
   * @param outputPerSec 当前每秒产出（BigNumber）
   * @returns 是否发生重大状态变化（崩溃或等级切换）
   */
  tick(
    state: GameState,
    deltaTime: number,
    outputPerSec: BigNumber
  ): boolean {
    this._collapsedThisTick = false;
    this._collapseNarration = null;
    this._warningLevel = null;

    const dtSeconds = deltaTime / 1000;
    const prevLevel = this.getCollapseLevel(state.entropy);

    // 1. 计算熵值增长
    const growth = this.calculateGrowth(state, outputPerSec, dtSeconds);
    // 2. 自然衰减（当产出很低时熵值缓慢下降）
    const decay = ENTROPY_CONFIG.NATURAL_DECAY_RATE * dtSeconds;
    const netChange = growth - decay;

    state.entropy = Math.max(0, Math.min(100, state.entropy + netChange));
    state._lastEntropyDecayTick = Date.now();

    // 3. 检测等级变化 → 触发预警叙事
    const newLevel = this.getCollapseLevel(state.entropy);
    if (newLevel !== prevLevel && newLevel !== 'stable') {
      this._warningLevel = newLevel;
    }

    // 4. 检测大崩塌（熵值达到 100）
    let majorEvent = false;
    if (state.entropy >= ENTROPY_CONFIG.COLLAPSE_THRESHOLD) {
      this.triggerCollapse(state);
      this._collapsedThisTick = true;
      majorEvent = true;
    }

    return majorEvent || (this._warningLevel !== null);
  }

  /**
   * 手动增加熵值（如大倍率购买时）
   */
  addEntropy(state: GameState, amount: number): void {
    state.entropy = Math.min(100, state.entropy + amount);
  }

  /**
   * 使用熵稳定剂 — 立即降低20点熵值
   * @returns 是否成功使用
   */
  applyStabilizer(state: GameState): boolean {
    if (state.entropyStabilizers <= 0) return false;
    state.entropyStabilizers--;
    state.entropy = Math.max(0, state.entropy - 20);
    return true;
  }

  /**
   * 使用时间回溯 — 回退5秒的熵值积累（估算约减少1-3点）
   * @returns 是否成功使用
   */
  applyRewind(state: GameState): boolean {
    if (state.entropyRewinds <= 0) return false;
    state.entropyRewinds--;
    const estimatedRecovery = Math.max(1, Math.min(
      15,
      state.entropy * 0.03 + 2
    ));
    state.entropy = Math.max(0, state.entropy - estimatedRecovery);
    return true;
  }

  /**
   * Prestige 时重置熵值
   */
  resetOnPrestige(state: GameState): void {
    state.entropy = ENTROPY_CONFIG.PRESTIGE_RESIDUAL;
  }

  /**
   * Expansion 时重置熵值
   */
  resetOnExpansion(state: GameState): void {
    state.entropy = ENTROPY_CONFIG.EXPANSION_RESIDUAL;
  }

  // ============================================================
  // 查询方法
  // ============================================================

  /**
   * 获取当前熵值崩溃等级
   */
  getCollapseLevel(entropy: number): EntropyCollapseLevel {
    if (entropy >= ENTROPY_CONFIG.CRITICAL_THRESHOLD) return 'critical';
    if (entropy >= ENTROPY_CONFIG.UNSTABLE_THRESHOLD) return 'unstable';
    return 'stable';
  }

  /**
   * 获取当前熵值对应的产出倍率惩罚（<1 表示减益）
   */
  getProductionMultiplier(entropy: number): number {
    const level = this.getCollapseLevel(entropy);
    switch (level) {
      case 'critical':
        return ENTROPY_CONFIG.CRITICAL_MULTIPLIER;  // 0.50
      case 'unstable':
        return ENTROPY_CONFIG.UNSTABLE_MULTIPLIER;  // 0.80
      default:
        return 1.0;
    }
  }

  /**
   * 获取熵值百分比显示值（0-100整数）
   */
  getDisplayPercent(entropy: number): number {
    return Math.round(Math.max(0, Math.min(100, entropy)));
  }

  /**
   * 计算大倍率购买的额外熵值惩罚
   * @param bulkMultiplier 倍率数值（1/5/10/100）
   * @returns 额外熵值增量
   */
  calculateBulkPenalty(bulkMultiplier: number): number {
    if (bulkMultiplier >= 1e308) return ENTROPY_CONFIG.HIGH_BULK_PENALTY + 5; // MAX
    if (bulkMultiplier >= 100) return ENTROPY_CONFIG.HIGH_BULK_PENALTY + 5; // ×100
    return ENTROPY_CONFIG.HIGH_BULK_PENALTY; // ×10
  }

  /**
   * 判断是否应该提示玩家"现在重置是最佳时机"
   * 条件：熵值 > 70% 且已解锁 Prestige
   */
  shouldSuggestPrestige(state: GameState): boolean {
    return (
      state.entropy > 70 &&
      state.prestigeCount > 0 &&
      state.number.gte(1e12)
    );
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 计算本帧熵值增长量
   */
  private calculateGrowth(
    state: GameState,
    outputPerSec: BigNumber,
    dtSeconds: number
  ): number {
    // 1. 基础增长（恒定，模拟自然无序度增加）
    let growth = ENTROPY_CONFIG.BASE_GROWTH_RATE * dtSeconds;

    // 2. 产出加速因子（产出相对于当前number的比例越大，熵增越快）
    // state.number 是 Decimal 类型，直接用 .toNumber()
    const numVal = (state.number as unknown as Decimal).toNumber();
    const outputVal = outputPerSec.toDecimal().toNumber();
    if (numVal > 0 && outputVal > 0) {
      const ratio = Math.min(outputVal / numVal, 1); // 上限1
      growth += ratio * ENTROPY_CONFIG.OUTPUT_ENTROPY_FACTOR * 100 * dtSeconds;
    }

    return growth;
  }

  /**
   * 执行大崩塌事件效果
   */
  private triggerCollapse(state: GameState): void {
    // 1. 扣除当前数字的一部分
    const drainPercent = ENTROPY_CONFIG.COLLAPSE_DRAIN_PERCENT / 100;
    const drainAmount = state.number.times(drainPercent);
    state.number = state.number.minus(drainAmount);
    // 安全兜底：Decimal 用 .lt() 比较，用 .minus() 做减法
    if ((state.number as unknown as Decimal).lt(0)) {
      state.number = new Decimal(0) as any;
    }

    // 2. 熵值回落到临界线以下（给玩家喘息空间）
    state.entropy = ENTROPY_CONFIG.CRITICAL_THRESHOLD - 10;

    // 3. 更新统计
    state.totalCollapses++;
    state.lastCollapseAt = Date.now();

    // 4. 随机选择一条崩塌叙事
    const idx = Math.floor(Math.random() * ENTROPY_COLLAPSE_NARRATIVES.length);
    this._collapseNarration = ENTROPY_COLLAPSE_NARRATIVES[idx];
  }
}

// 单例导出（与其他系统保持一致）
export const entropySystem = new EntropySystem();
