import Decimal from 'break_eternity.js';
import { CHALLENGE_DEFS } from '@/core/Constants';
import type {
  GameState,
  ChallengeDef,
  ChallengeState,
  ChallengeCategory,
} from '@/types/game';

/**
 * ChallengeSystem — 挑战 / 任务引擎
 *
 * 三类挑战：
 * 1. 每日任务（daily）—— 每天自动重置，完成后领取星尘奖励
 * 2. 限时挑战（timed）—— 玩家主动开始，倒计时内完成目标
 * 3. 里程碑（milestone）—— 永久性目标，完成后一次性奖励（星尘+暗能量）
 *
 * 职责：
 * - 初始化 / 重置每日任务
 * - 追踪进度（数字/点击/坍缩/膨胀/挂机/产出）
 * - 管理限时挑战的计时
 * - 检测完成 → 发放奖励
 * - 提供 UI 所需的数据查询接口
 */
export class ChallengeSystem {
  /** 本次 tick 新完成的挑战 ID 列表 */
  private _newlyCompleted: string[] = [];

  /** 本次 tick 领取了奖励的 ID 列表 */
  private _newlyClaimed: string[] = [];

  // ---- 公共只读访问器 ----

  get newlyCompleted(): string[] { return this._newlyCompleted; }
  get newlyClaimed(): string[] { return this._newlyClaimed; }

  /**
   * 初始化所有挑战状态（新游戏或迁移时调用）
   *
   * 为每个 CHALLENGE_DEFS 创建对应的 ChallengeState
   */
  initialize(state: GameState): void {
    for (const def of CHALLENGE_DEFS) {
      if (!state.challenges.has(def.id)) {
        const cs: ChallengeState = {
          id: def.id,
          progress: 0,
          completed: false,
          claimed: false,
        };
        // 每日任务记录上次重置日期
        if (def.resetSchedule === 'daily') {
          cs.lastResetDate = this.todayString();
        }
        state.challenges.set(def.id, cs);
      }
    }
  }

  /**
   * 主 tick — 由 gameStore.gameTick() 每帧调用
   *
   * @param state 当前 GameState
   * @param currentTimestamp 当前时间戳 (Date.now())
   * @param deltaTime 本帧间隔（秒），用于 idle_seconds 计时
   * @returns 是否有状态变化需要 UI 更新
   */
  tick(state: GameState, currentTimestamp: number, deltaTime: number): boolean {
    this._newlyCompleted = [];
    this._newlyClaimed = [];

    let changed = false;

    // 1. 每日重置检查
    if (this.checkDailyReset(state)) {
      changed = true;
    }

    // 2. 更新限时挑战计时 + 检测超时
    changed = this.updateTimedChallenges(state, currentTimestamp, deltaTime) || changed;

    // 3. 实时进度检测（number_reach 类型需要每帧检查）
    changed = this.updateProgressSnapshots(state) || changed;

    return changed;
  }

  // ================================================================
  //  每日重置
  // ================================================================

  /** 获取今天的 YYYYMMDD 字符串 */
  private todayString(): string {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  /**
   * 检查是否需要进行每日重置
   *
   * 如果今天日期 ≠ lastResetDate → 重置所有 daily 类别挑战
   */
  checkDailyReset(state: GameState): boolean {
    const today = this.todayString();
    let didReset = false;

    for (const def of CHALLENGE_DEFS) {
      if (def.resetSchedule !== 'daily') continue;
      const cs = state.challenges.get(def.id);
      if (!cs) continue;
      if (cs.lastResetDate !== today) {
        cs.progress = 0;
        cs.completed = false;
        cs.claimed = false;
        cs.lastResetDate = today;
        cs.remainingTime = undefined;
        cs.startedAt = undefined;
        didReset = true;
      }
    }

    return didReset;
  }

  // ================================================================
  //  限时挑战管理
  // ================================================================

  /**
   * 开始一个限时挑战
   *
   * @param state GameState
   * @param challengeId 挑战 ID
   * @param currentTimestamp 当前时间戳
   * @returns 是否成功开始
   */
  startTimedChallenge(state: GameState, challengeId: string, currentTimestamp: number): boolean {
    const def = CHALLENGE_DEFS.find(c => c.id === challengeId);
    if (!def || def.category !== 'timed') return false;

    const cs = state.challenges.get(challengeId);
    if (!cs) return false;

    // 已完成的不允许重新开始
    if (cs.completed) return false;

    // 重置进度并开始计时
    cs.progress = 0;
    cs.completed = false;
    cs.claimed = false;
    cs.startedAt = currentTimestamp;
    cs.remainingTime = def.timeLimit;

    return true;
  }

  /**
   * 更新所有进行中限时挑战的剩余时间 + 检测超时
   *
   * @returns 是否有状态变化
   */
  private updateTimedChallenges(
    state: GameState,
    _currentTimestamp: number,
    deltaTime: number,
  ): boolean {
    let changed = false;

    for (const def of CHALLENGE_DEFS) {
      if (def.category !== 'timed') continue;
      const cs = state.challenges.get(def.id);
      if (!cs || !cs.startedAt || cs.completed) continue;

      // 减少剩余时间
      cs.remainingTime = Math.max(0, (cs.remainingTime ?? def.timeLimit) - deltaTime);

      // 超时 → 标记失败（不发放奖励，但保持 completed=false 让玩家可以重新开始）
      if (cs.remainingTime <= 0 && !cs.completed) {
        cs.startedAt = undefined;
        cs.remainingTime = undefined;
        changed = true;
      }
    }

    return changed;
  }

  // ================================================================
  //  进度追踪（由 gameStore 在对应动作后调用）
  // ================================================================

  /**
   * 记录一次点击（更新 click_count 类型的挑战进度）
   */
  recordClick(state: GameState): void {
    for (const def of CHALLENGE_DEFS) {
      if (def.progressType !== 'click_count') continue;
      this.addProgress(state, def.id, 1);
    }
  }

  /**
   * 记录一次坍缩（prestige_once）
   */
  recordPrestige(state: GameState): void {
    for (const def of CHALLENGE_DEFS) {
      if (def.progressType !== 'prestige_once') continue;
      this.addProgress(state, def.id, 1);
    }
  }

  /**
   * 记录一次膨胀（expansion_once）
   */
  recordExpansion(state: GameState): void {
    for (const def of CHALLENGE_DEFS) {
      if (def.progressType !== 'expansion_once') continue;
      this.addProgress(state, def.id, 1);
    }
    // 超越之门特殊处理：也检查 expansion_once 类型的里程碑
    // （Constants 中 ch_milestone_transcend 用 expansion_once 占位）
    // 由 gameStore 在超越时直接调用 recordTranscend
  }

  /**
   * 记录一次超越（transcend 检测用）
   * 注意：Constants 中没有 transcend progressType，这里通过遍历 milestone 中 targetValue=1 的来匹配
   */
  recordTranscend(state: GameState): void {
    // 超越之门的特殊逻辑：id 包含 transcendent
    for (const def of CHALLENGE_DEFS) {
      if (def.id === 'ch_milestone_transcend') {
        this.addProgress(state, def.id, 1);
      }
    }
  }

  /**
   * 记录生产者产出（produce_amount）
   *
   * @param producerId 生产者 ID
   * @param amount 产出量
   */
  recordProduction(state: GameState, producerId: string, amount: Decimal): void {
    for (const def of CHALLENGE_DEFS) {
      if (def.progressType !== 'produce_amount') continue;
      if (def.targetRef && def.targetRef !== producerId) continue;
      this.addProgress(state, def.id, amount.toNumber());
    }
  }

  /**
   * 挂机时间累积（idle_seconds）
   *
   * 注意：实际累加在 updateTimedChallenges 的 tick 中通过 deltaTime 处理
   * 这里提供手动注入方式供 gameStore 使用
   */
  recordIdleTime(state: GameState, seconds: number): void {
    for (const def of CHALLENGE_DEFS) {
      if (def.progressType !== 'idle_seconds') continue;
      this.addProgress(state, def.id, seconds);
    }
  }

  /**
   * 为指定挑战增加进度值
   */
  private addProgress(state: GameState, challengeId: string, amount: number): void {
    const cs = state.challenges.get(challengeId);
    if (!cs || cs.completed || cs.claimed) return;

    const def = CHALLENGE_DEFS.find(c => c.id === challengeId);
    if (!def) return;

    cs.progress += amount;

    // 检查是否完成
    if (cs.progress >= def.targetValue && !cs.completed) {
      cs.completed = true;
      cs.completedAt = Date.now();
      this._newlyCompleted.push(challengeId);
    }
  }

  /**
   * 快照式进度检测 — 用于 number_reach 类型（依赖当前数字快照）
   *
   * 每帧调用，自动将当前数字填入 number_reach 类型挑战
   */
  private updateProgressSnapshots(state: GameState): boolean {
    let changed = false;

    for (const def of CHALLENGE_DEFS) {
      if (def.progressType !== 'number_reach') continue;
      const cs = state.challenges.get(def.id);
      if (!cs || cs.completed || cs.claimed) continue;

      // 将当前数字作为进度值
      const currentNum = state.number;
      if (currentNum.lt(1)) continue;
      const numVal = currentNum.toNumber();
      if (numVal > cs.progress) {
        cs.progress = Math.min(numVal, def.targetValue);
        changed = true;
      }

      // 自动检测完成
      if (currentNum.gte(def.targetValue) && !cs.completed) {
        cs.completed = true;
        cs.completedAt = Date.now();
        this._newlyCompleted.push(def.id);
        changed = true;
      }
    }

    return changed;
  }

  // ================================================================
  //  奖励领取
  // ================================================================

  /**
   * 领取已完成挑战的奖励
   *
   * @param state GameState
   * @param challengeId 挑战 ID
   * @returns 奖励信息 { stardust, de } 或 null（无法领取）
   */
  claimReward(state: GameState, challengeId: string): { stardust: number; de: number } | null {
    const cs = state.challenges.get(challengeId);
    const def = CHALLENGE_DEFS.find(c => c.id === challengeId);

    if (!cs || !def || !cs.completed || cs.claimed) return null;

    // 发放奖励（dim0_l1：星尘获取 +10%）
    state.stardust += Math.floor(def.stardustReward * (state.activeMasteryEffects.has('dim0_l1') ? 1.1 : 1));
    let deGain = 0;
    if (def.deReward) {
      state.darkEnergy += def.deReward;
      deGain = def.deReward;
    }

    cs.claimed = true;
    this._newlyClaimed.push(challengeId);

    // 里程碑永久记录
    if (def.category === 'milestone') {
      state.completedMilestones.add(challengeId);
    }

    return { stardust: def.stardustReward, de: deGain };
  }

  // ================================================================
  //  数据查询（供 UI 使用）
  // ================================================================

  /**
   * 获取所有挑战的完整信息（含定义 + 状态）
   */
  getAllChallenges(
    state: GameState,
    _currentTimestamp?: number,
  ): Array<{
    def: ChallengeDef;
    state: ChallengeState;
    progressPercent: number;
    isActive: boolean;       // 限时挑战是否正在进行
    isExpired: boolean;       // 限时挑战是否已超时失败
    canStart: boolean;        // 限时挑战是否可开始
    remainingFormatted: string; // 格式化的剩余时间
  }> {
    return CHALLENGE_DEFS.map((def) => {
      const cs = state.challenges.get(def.id) ?? this.createEmptyState(def);
      const pct = def.targetValue > 0
        ? Math.min(100, (cs.progress / def.targetValue) * 100)
        : 0;

      // 限时挑战状态计算
      const isTimedActive = def.category === 'timed'
        && cs.startedAt != null
        && (cs.remainingTime ?? 0) > 0
        && !cs.completed;

      const isTimedExpired = def.category === 'timed'
        && cs.startedAt != null
        && (cs.remainingTime ?? 0) <= 0
        && !cs.completed;

      const canStartTimed = def.category === 'timed'
        && (!cs.startedAt || isTimedExpired)
        && !cs.completed;

      let remainStr = '';
      if (isTimedActive && cs.remainingTime != null) {
        remainStr = this.formatTime(cs.remainingTime);
      } else if (def.timeLimit > 0 && def.category === 'timed' && !cs.startedAt) {
        remainStr = `${this.formatTime(def.timeLimit)}`;
      }

      return {
        def,
        state: cs,
        progressPercent: pct,
        isActive: isTimedActive,
        isExpired: isTimedExpired,
        canStart: canStartTimed,
        remainingFormatted: remainStr,
      };
    });
  }

  /** 按类别筛选挑战 */
  getChallengesByCategory(
    state: GameState,
    category: ChallengeCategory,
    currentTimestamp?: number,
  ) {
    return this.getAllChallenges(state, currentTimestamp).filter(c => c.def.category === category);
  }

  /** 获取今日每日任务的完成统计 */
  getDailyStats(state: GameState): { total: number; completed: number; claimed: number } {
    const dailies = this.getChallengesByCategory(state, 'daily');
    return {
      total: dailies.length,
      completed: dailies.filter(c => c.state.completed).length,
      claimed: dailies.filter(c => c.state.claimed).length,
    };
  }

  /** 获取未领取奖励的挑战数量 */
  getUnclaimedCount(state: GameState): number {
    let count = 0;
    for (const [, cs] of state.challenges) {
      if (cs.completed && !cs.claimed) count++;
    }
    return count;
  }

  // ================================================================
  //  工具方法
  // ================================================================

  /** 创建空的 ChallengeState */
  private createEmptyState(def: ChallengeDef): ChallengeState {
    return {
      id: def.id,
      progress: 0,
      completed: false,
      claimed: false,
      ...(def.resetSchedule === 'daily' ? { lastResetDate: this.todayString() } : {}),
    };
  }

  /** 秒数格式化为 MM:SS 或 HH:MM:SS */
  private formatTime(seconds: number): string {
    if (seconds <= 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
