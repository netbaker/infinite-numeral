import type {
  GameState,
  EventDef,
  EventOption,
  EventEffect,
  OngoingEffect,
} from '@/types/game';
import Decimal from 'break_eternity.js';
import { EVENT_DEFS } from '@/core/Constants';
import { geneSystem } from '@/systems/GeneSystem';

/**
 * EventSystem — 随机宇宙事件引擎
 *
 * 职责：
 * 1. 每 tick 检查是否有新事件触发（概率 + 冷却 + 量级门槛）
 * 2. 管理活跃事件（等待玩家选择的弹窗）
 * 3. 处理玩家选择 → 应用即时效果 + 注册持续效果
 * 4. 每 tick 更新持续效果（清理过期的）
 * 5. 计算 timeSpeedMultiplier 供 GameLoop 使用
 */
export class EventSystem {
  /** 本次 tick 新触发的事件定义（供外部读取） */
  private _newEvent: EventDef | null = null;

  /** 本次 tick 过期的效果 ID 列表（供 UI 更新用） */
  private _expiredEffects: string[] = [];

  // ---- 公共只读访问器 ----

  get newEvent(): EventDef | null { return this._newEvent; }
  get expiredEffects(): string[] { return this._expiredEffects; }

  /**
   * 主 tick — 由 gameStore.gameTick() 每帧调用
   *
   * @param state 当前 GameState
   * @param currentTimestamp 当前时间戳 (Date.now())
   * @returns 是否触发了需要玩家关注的新事件
   */
  tick(state: GameState, currentTimestamp: number): boolean {
    this._newEvent = null;
    this._expiredEffects = [];

    // 1. 清理过期持续效果
    this.cleanExpiredEffects(state, currentTimestamp);

    // 2. 如果已有活跃事件在等待选择，不触发新事件
    if (state.activeEvent !== null) {
      // 检查是否超时（有 deadline 的）
      if (state.activeEvent.deadline > 0 && currentTimestamp >= state.activeEvent.deadline) {
        // 超时 → 自动选第一个选项
        const def = EVENT_DEFS.find((e) => e.id === state.activeEvent!.eventId);
        if (def) {
          this.applyChoice(state, def, 0, currentTimestamp);
        }
      }
      return false;
    }

    // 3. 减少冷却时间
    if (state.eventCooldown > 0) {
      const delta = currentTimestamp - (state._lastEventTick ?? currentTimestamp);
      state.eventCooldown = Math.max(0, state.eventCooldown - delta / 1000);
    }
    state._lastEventTick = currentTimestamp;

    if (state.eventCooldown > 0) return false;

    // 4. 尝试触发事件
    const triggered = this.tryTriggerEvent(state, currentTimestamp);
    if (triggered) {
      return true; // 告诉 gameStore 有新事件需要弹窗
    }

    return false;
  }

  /**
   * 尝试触发一个事件
   *
   * 流程：
   * - 计算当前数字的量级 (log10)
   * - 筛选满足 minMagnitude 的事件
   * - 对每个事件按 baseProbability 进行概率检定
   * - 如果命中 → 设置 activeEvent + 进入冷却
   */
  tryTriggerEvent(state: GameState, currentTimestamp: number): boolean {
    const num = state.number;
    if (num.lt(1)) return false;

    const currentMag = Math.floor(num.log10().toNumber());

    // 收集候选事件（满足量级门槛）
    const candidates = EVENT_DEFS.filter(
      (def) => def.minMagnitude <= currentMag
    );

    if (candidates.length === 0) return false;

    // 对每个候选做概率检定
    // 共振基因（gene_resonance）：事件发生率 ×(1 + 0.15×Lv)，Story 1.3.3 / GDD §2.1
    const resonance = geneSystem.getResonance(state);
    for (const def of candidates) {
      // 概率随量级略微提升（对数衰减）
      const magBonus = Math.min(0.003, (currentMag - def.minMagnitude) * 0.0005);
      const probability = (def.baseProbability + magBonus) * resonance.rateMult;

      if (Math.random() < probability) {
        // 命中！设置活跃事件
        const deadline = def.isMajor ? 0 : currentTimestamp + 60_000; // 非重大事件 60s 超时

        state.activeEvent = {
          eventId: def.id,
          triggeredAt: currentTimestamp,
          deadline,
        };

        // 进入冷却
        state.eventCooldown = def.cooldown;

        this._newEvent = def;
        return true;
      }
    }

    return false;
  }

  /**
   * 玩家做出选择 — 应用效果
   *
   * @param state GameState
   * @param def 事件定义
   * @param optionIndex 选项索引（0/1/...）
   * @param currentTimestamp 当前时间戳
   */
  applyChoice(
    state: GameState,
    def: EventDef,
    optionIndex: number,
    currentTimestamp: number,
  ): void {
    if (!state.activeEvent || state.activeEvent.eventId !== def.id) return;

    const option: EventOption | undefined = def.options[optionIndex];
    if (!option) {
      // 无效选项 → 默认取第 0 个
      this.applyChoice(state, def, 0, currentTimestamp);
      return;
    }

    // 分离即时效果和持续效果
    const instantEffects: EventEffect[] = [];
    const durationEffects: EventEffect[] = [];

    for (const effect of option.effects) {
      if (effect.duration <= 0) {
        instantEffects.push(effect);
      } else {
        durationEffects.push(effect);
      }
    }

    // 1. 应用即时效果
    this.applyInstantEffects(state, instantEffects);

    // 2. 注册持续效果（如果有）
    if (durationEffects.length > 0) {
      // 共振基因（gene_resonance）：事件持续时间 ×(1 + 0.10×Lv)，Story 1.3.3 / GDD §2.1
      const resonance = geneSystem.getResonance(state);
      const ongoing: OngoingEffect = {
        id: `${def.id}_opt${optionIndex}_${currentTimestamp}`,
        sourceEventId: def.id,
        effects: durationEffects,
        startedAt: currentTimestamp,
        expiresAt: currentTimestamp + durationEffects[0].duration * 1000 * resonance.durationMult,
        summary: option.text,
      };
      state.ongoingEffects.push(ongoing);
    }

    // 3. 清除活跃事件
    state.activeEvent = null;

    // 4. 重算倍增器（持续效果可能影响产出）
    // （由调用方 gameStore 负责 recalculateFromState）
  }

  /**
   * 应用即时效果
   */
  private applyInstantEffects(state: GameState, effects: EventEffect[]): void {
    for (const effect of effects) {
      switch (effect.type) {
        case 'stardust_gain':
          state.stardust += effect.value;
          break;
        case 'stardust_loss':
          state.stardust = Math.max(0, state.stardust - effect.value);
          break;
        case 'number_drain': {
          // 扣除当前数字的一定比例
          const drainAmount = state.number.mul(effect.value);
          state.number = state.number.sub(drainAmount);
          // 不允许降到 1 以下
          if (state.number.lt(1)) state.number = new Decimal(1);
          break;
        }
        case 'global_multiplier':
        case 'producer_boost':
        case 'cost_change':
        case 'speed_change':
          // 这些都是持续效果类型，不应出现在即时效果中
          // 但以防万一，忽略（它们应该在 durationEffects 里处理）
          break;
      }
    }
  }

  /**
   * 清理过期的持续效果
   *
   * 同时更新 timeSpeedMultiplier
   */
  cleanExpiredEffects(state: GameState, currentTimestamp: number): void {
    if (state.ongoingEffects.length === 0) {
      // 没有持续效果 → 重置速度乘数
      if (state.timeSpeedMultiplier !== 1) {
        state.timeSpeedMultiplier = 1;
      }
      return;
    }

    // 过滤掉已过期的
    state.ongoingEffects = state.ongoingEffects.filter((oe) => {
      if (oe.expiresAt > 0 && currentTimestamp >= oe.expiresAt) {
        this._expiredEffects.push(oe.id);
        return false; // 移除
      }
      return true; // 保留
    });

    // 重新计算 timeSpeedMultiplier
    this.recalcSpeedMultiplier(state);
  }

  /**
   * 从所有活跃的持续效果中计算总速度乘数
   *
   * speed_change 效果叠加方式：乘法叠加（所有 speed_change 的 value 相乘）
   * 例如：加速 ×2 和减速 ×0.5 同时存在 → 总共 ×1.0（抵消）
   */
  recalcSpeedMultiplier(state: GameState): void {
    let speedMult = 1;

    for (const oe of state.ongoingEffects) {
      for (const effect of oe.effects) {
        if (effect.type === 'speed_change') {
          speedMult *= effect.value;
        }
      }
    }

    // 限制范围 [0.1, 5.0] 防止极端值
    state.timeSpeedMultiplier = Math.max(0.1, Math.min(5.0, speedMult));
  }

  /**
   * 获取所有活跃持续效果的汇总信息（供 EffectIndicator 使用）
   *
   * 返回格式：{ id, sourceEventId, summary, remainingSeconds, effects }
   */
  getActiveEffects(
    state: GameState,
    currentTimestamp: number,
  ): Array<{
    id: string;
    sourceEventId: string;
    icon: string;
    name: string;
    summary: string;
    remainingSeconds: number;
    effects: EventEffect[];
  }> {
    return state.ongoingEffects.map((oe) => {
      const def = EVENT_DEFS.find((e) => e.id === oe.sourceEventId);
      let remaining = 0;
      if (oe.expiresAt > 0) {
        remaining = Math.max(0, (oe.expiresAt - currentTimestamp) / 1000);
      }
      return {
        id: oe.id,
        sourceEventId: oe.sourceEventId,
        icon: def?.icon ?? '💫',
        name: def?.name ?? '未知事件',
        summary: oe.summary,
        remainingSeconds: remaining,
        effects: oe.effects,
      };
    });
  }

  /**
   * 获取事件定义（通过 ID）
   */
  getEventDef(eventId: string): EventDef | undefined {
    return EVENT_DEFS.find((e) => e.id === eventId);
  }
}
