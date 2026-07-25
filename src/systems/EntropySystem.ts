import type { GameState, EntropyCollapseLevel } from '@/types/game';
import {
  ENTROPY_CONFIG,
  ENTROPY_COLLAPSE_NARRATIVES,
  TAMER_LOSS_CAP_FRACTION,
} from '@/core/Constants';
import * as personaSystem from '@/systems/PersonaSystem';
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
  /** 熵值历史环形缓冲（每 tick 记录一次，供时间回溯回退 5 秒净增量） */
  private _entropyHistory: { t: number; e: number }[] = [];

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
    state.entropyBarriers = Math.max(0, state.entropyBarriers);
    state.totalCollapses = Math.max(0, state.totalCollapses);
    state.collapseStreak = Math.max(0, state.collapseStreak);
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

    const now = Date.now();
    const dtSeconds = deltaTime / 1000;
    const prevLevel = this.getCollapseLevel(state.entropy);

    // 0. 记录熵值历史（5秒滑动窗口，供时间回溯使用；不持久化）
    this._entropyHistory.push({ t: now, e: state.entropy });
    while (this._entropyHistory.length > 0 && now - this._entropyHistory[0].t > 5000) {
      this._entropyHistory.shift();
    }

    // 1. 计算熵值增长（维度屏障激活时跳过增长计算，熵值不上升）
    const barrierActive = now < state._barrierActiveUntil;
    const growth = barrierActive ? 0 : this.calculateGrowth(state, outputPerSec, dtSeconds);
    // 2. 自然衰减（当产出很低时熵值缓慢下降）
    const decay = ENTROPY_CONFIG.NATURAL_DECAY_RATE * dtSeconds;
    const netChange = growth - decay;

    state.entropy = Math.max(0, Math.min(100, state.entropy + netChange));
    state._lastEntropyDecayTick = now;

    // 3. 检测等级变化 → 触发预警叙事
    const newLevel = this.getCollapseLevel(state.entropy);
    if (newLevel !== prevLevel && newLevel !== 'stable') {
      this._warningLevel = newLevel;
    }

    // 4. 进入临界等级 → 随机令一个已拥有生产者停机 30 秒（不叠加）
    if (newLevel === 'critical' && prevLevel !== 'critical') {
      this.triggerCriticalDowntime(state, now);
    }
    // 清理已过期的停机生产者
    this.cleanupDownedProducers(state, now);

    // 5. 检测大崩塌（熵值达到 100）
    let majorEvent = false;
    if (state.entropy >= ENTROPY_CONFIG.COLLAPSE_THRESHOLD) {
      // S2 奇点免崩：奇点爆发期间跳过本次崩塌（仅免该次，不永久免熵、不消耗道具）
      if (!(state.activeSynergies.has('S2') && state._singularityBurstActive)) {
        this.triggerCollapse(state);
        this._collapsedThisTick = true;
        majorEvent = true;
      }
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
   * 使用维度屏障 — 激活后 60 秒内熵值不上升（tick 中跳过增长计算）
   * @returns 是否成功激活
   */
  applyBarrier(state: GameState): boolean {
    if (state.entropyBarriers <= 0) return false;
    state.entropyBarriers--;
    state._barrierActiveUntil = Date.now() + 60000;
    return true;
  }

  /**
   * 使用时间回溯 — 回退最近 5 秒内积累的熵值（窗口内净增量，非当前百分比）
   * @returns 是否成功使用
   */
  applyRewind(state: GameState): boolean {
    if (state.entropyRewinds <= 0) return false;
    state.entropyRewinds--;
    const now = Date.now();
    const windowStart = now - 5000;
    // 取窗口内（>= windowStart）的历史样本
    const relevant = this._entropyHistory.filter((h) => h.t >= windowStart);
    if (relevant.length >= 2) {
      const oldest = relevant[0].e;
      // 窗口内净增量（仅当熵值确实上升时回退，下降不反向加熵）
      const increment = Math.max(0, state.entropy - oldest);
      state.entropy = Math.max(0, state.entropy - increment);
    }
    // 窗口为空（刚加载/首次回溯）：回退 0，无效果
    return true;
  }

  /**
   * Prestige 时重置熵值
   */
  resetOnPrestige(state: GameState): void {
    state.entropy = ENTROPY_CONFIG.PRESTIGE_RESIDUAL;
    state.collapseStreak = 0;
  }

  /**
   * Expansion 时重置熵值
   */
  resetOnExpansion(state: GameState): void {
    state.entropy = ENTROPY_CONFIG.EXPANSION_RESIDUAL;
    state.collapseStreak = 0;
  }

  // ============================================================
  // 查询方法
  // ============================================================

  /**
   * 获取当前熵值崩溃等级
   */
  getCollapseLevel(entropy: number): EntropyCollapseLevel {
    if (entropy >= 100) return 'collapsed';
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

    // dim3_l4：熵值增长 -15%（×0.85）；S9 稳态三和弦：熵增再 ×0.9（两者顺序相乘、有界）
    const entropyGrowthMult =
      (state.activeMasteryEffects.has('dim3_l4') ? 0.85 : 1) *
      (state.activeSynergies.has('S9') ? 0.9 : 1);
    return growth * entropyGrowthMult;
  }

  /**
   * 执行大崩塌事件效果
   */
  private triggerCollapse(state: GameState): void {
    // 1. 扣除当前数字的一部分（阶梯式：连续崩塌递增，封顶 COLLAPSE_DRAIN_MAX）
    const drainPercent =
      Math.min(
        ENTROPY_CONFIG.COLLAPSE_DRAIN_PERCENT + state.collapseStreak * ENTROPY_CONFIG.COLLAPSE_DRAIN_STEP,
        ENTROPY_CONFIG.COLLAPSE_DRAIN_MAX,
      ) / 100;
    let drainAmount = state.number.times(drainPercent);
    // 熵之驯者 L2：熵崩损失上限封顶 50% 当前数字（GDD §2.4 / §6.4）。
    // 默认 ENTROPY_CONFIG 扣除 25%~40% < 50%，故默认不绑定；高扣除配置下自动生效（不堆叠、非负）。
    if (personaSystem.isActiveL2(state, 'persona_tamer')) {
      const capped = state.number.times(TAMER_LOSS_CAP_FRACTION);
      if (drainAmount.gt(capped)) drainAmount = capped;
    }
    state.number = state.number.minus(drainAmount);
    // 安全兜底：Decimal 用 .lt() 比较，用 .minus() 做减法
    if ((state.number as unknown as Decimal).lt(0)) {
      state.number = new Decimal(0) as any;
    }

    // 2. 熵值回落到临界线以下（给玩家喘息空间）
    state.entropy = ENTROPY_CONFIG.CRITICAL_THRESHOLD - 10;

    // 3. 更新统计与连续崩塌计数
    state.totalCollapses++;
    state._runCollapses++;        // ← 新增：本轮熵崩计数（隐患3 修复，原遗漏导致 _runCollapses 恒为 0）
    state.collapseStreak += 1;
    state.lastCollapseAt = Date.now();

    // 4. 随机选择一条崩塌叙事
    const idx = Math.floor(Math.random() * ENTROPY_COLLAPSE_NARRATIVES.length);
    this._collapseNarration = ENTROPY_COLLAPSE_NARRATIVES[idx];
  }

  /**
   * 进入临界等级时随机选择一个已拥有生产者停机 30 秒。
   * 同一时间最多 1 个生产者停机（不叠加）。
   */
  private triggerCriticalDowntime(state: GameState, now: number): void {
    if (state.downedProducers.size > 0) return; // 已有停机，不叠加
    const owned = Array.from(state.unlockedProducers);
    if (owned.length === 0) return;
    const pick = owned[Math.floor(Math.random() * owned.length)];
    state.downedProducers.set(pick, now + 30000);
  }

  /**
   * 清理已过期的停机生产者（停机结束时间戳 <= now 即恢复）
   */
  private cleanupDownedProducers(state: GameState, now: number): void {
    for (const [id, until] of state.downedProducers) {
      if (until <= now) {
        state.downedProducers.delete(id);
      }
    }
  }
}

// 单例导出（与其他系统保持一致）
export const entropySystem = new EntropySystem();
