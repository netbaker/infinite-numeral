import Decimal from 'break_eternity.js';
import type { DimensionId, GameState } from '@/types/game';
import {
  DIMENSION_DEFS,
  DIMENSION_SWITCH_NARRATIVES,
  DIMENSION_MASTERY_EFFECTS,
  DIMENSION_SYNERGY_DEFS,
  DIMENSION_CRYSTAL_SHOP,
} from '@/core/Constants';
import * as personaSystem from '@/systems/PersonaSystem';

/**
 * 维度系统核心引擎
 * 管理5个平行维度的切换、精通度、资源产出
 */
export class DimensionSystem {
  // ---- 初始化 ----
  /**
   * 初始化维度系统状态
   */
  initialize(state: GameState): void {
    // 初始化各维度状态（如果存档没有）
    for (const def of DIMENSION_DEFS) {
      if (!state.dimensionStates.has(def.id)) {
        state.dimensionStates.set(def.id, {
          id: def.id,
          unlocked: def.unlockCost === 0,  // Dim-0 默认解锁
          master: 0,
          resource: new Decimal(0),
          crystals: 0,
          maxNumber: new Decimal(0),
        });
      }
    }
    // 确保当前维度合法
    if (state.currentDimension < 0 || state.currentDimension > 4) {
      state.currentDimension = 0;
    }
  }

  // ---- 维度切换 ----
  /**
   * 切换当前维度
   * @returns 是否切换成功
   */
  switchDimension(state: GameState, targetDim: DimensionId): boolean {
    const now = Date.now();
    // 冷却检查（5秒防误触）；维度行者 L2：本轮首次进入新维度免冷却（GDD §2.4 / §6.4）。
    // 「新维度」= 本轮 _runDimensionsVisited 尚未收录者（首访即免，之后恢复冷却）。
    const walkerL2NewDim =
      personaSystem.isActiveL2(state, 'persona_walker') &&
      !state._runDimensionsVisited.has(targetDim);
    if (!walkerL2NewDim && now - state._lastDimensionSwitch < 5000) {
      return false;
    }
    const def = DIMENSION_DEFS.find(d => d.id === targetDim);
    if (!def) return false;

    const dimState = state.dimensionStates.get(targetDim);
    if (!dimState || !dimState.unlocked) return false;

    // 记录当前维度的数字记录
    this.updateMaxNumber(state);

    // 切换
    state.currentDimension = targetDim;
    state._lastDimensionSwitch = now;

    // 播报叙事
    const narratives = DIMENSION_SWITCH_NARRATIVES[targetDim];
    if (narratives && narratives.length > 0) {
      // 调用方负责展示叙事（通过 gameStore）
      return true;
    }
    return true;
  }

  /**
   * 解锁维度（消耗奇点核心）
   * @returns 是否解锁成功
   */
  unlockDimension(state: GameState, dimId: DimensionId): boolean {
    const def = DIMENSION_DEFS.find(d => d.id === dimId);
    if (!def || def.unlockCost === 0) return false;

    const dimState = state.dimensionStates.get(dimId);
    if (!dimState || dimState.unlocked) return false;

    if (state.singularity < def.unlockCost) return false;

    state.singularity -= def.unlockCost;
    dimState.unlocked = true;
    return true;
  }

  // ---- 精通度 ----
  /**
   * 更新维度精通度（每 tick 调用）
   * 精通度增长规则：产出越高、在线越久，精通增长越快
   */
  tickMastery(state: GameState, deltaTime: number, outputPerSec: Decimal): void {
    const dimId = state.currentDimension;
    const dimState = state.dimensionStates.get(dimId);
    if (!dimState || !dimState.unlocked) return;

    // 精通度增长速度：与产出对数（log10）相关。
    // 使用 log10 而非原始 toNumber()，避免 outputPerSec 超过 Number.MAX_VALUE
    // 时 toNumber() 返回 Infinity 导致精通度瞬间拉满。
    // 增长因子 = log10(outputPerSec + 1) × deltaTime × 系数，对任意量级均有限、单调递增。
    const logOutput = outputPerSec.add(1).log(10).toNumber();
    const growthRate = logOutput * deltaTime * 0.0005;
    const newMastery = Math.min(
      dimState.master + growthRate,
      DIMENSION_DEFS[dimId].maxMastery
    );
    dimState.master = newMastery;
  }

  /**
   * 获取当前维度精通度（0-100）
   */
  getMastery(state: GameState, dimId: DimensionId): number {
    const dimState = state.dimensionStates.get(dimId);
    return dimState ? dimState.master : 0;
  }

  /**
   * 获取精通度等级（每20点一个等级，共5级）
   */
  getMasteryLevel(state: GameState, dimId: DimensionId): number {
    const master = this.getMastery(state, dimId);
    return Math.floor(master / 20);
  }

  /**
   * 获取当前维度精通奖励描述（读单权威表 DIMENSION_MASTERY_EFFECTS 的 label）
   */
  getMasteryReward(state: GameState, dimId: DimensionId): string | null {
    const level = this.getMasteryLevel(state, dimId);
    const effects = DIMENSION_MASTERY_EFFECTS[dimId];
    if (effects && level > 0 && level <= effects.length) {
      return effects[level - 1].label;
    }
    return null;
  }

  // ============================================================
  // Sprint 6 Must ②③：精通奖励实际化 + 跨维度协同增益
  // 唯一重算入口 = refreshDimensionBuilds（先 applyMasteryRewards 再 evaluateSynergies）。
  // 两个集合均为派生缓存，幂等重算（clear + 重填）。
  // ============================================================

  /**
   * 重算 `state.activeMasteryEffects`：清除后按各维已达成的精通等级填充奖励标志位。
   * 幂等：等级 L 解锁前 L 条奖励，达成即激活；精通回退时自动移除。
   */
  applyMasteryRewards(state: GameState): void {
    state.activeMasteryEffects.clear();
    for (let dimId = 0; dimId <= 4; dimId++) {
      const effects = DIMENSION_MASTERY_EFFECTS[dimId];
      if (!effects) continue;
      const lv = this.getMasteryLevel(state, dimId as DimensionId);
      for (let i = 0; i < lv && i < effects.length; i++) {
        state.activeMasteryEffects.add(effects[i].key);
      }
    }
  }

  /**
   * 重算 `state.activeSynergies`：遍历固定 10 条协同定义，组合内每维精通均达阈值则点亮。
   * 幂等，每 tick 仅 10 次 O(1) 判定，不扫全组合。
   */
  evaluateSynergies(state: GameState): void {
    state.activeSynergies.clear();
    for (const def of DIMENSION_SYNERGY_DEFS) {
      const allMet = def.dims.every(
        (d) => this.getMasteryLevel(state, d as DimensionId) >= def.minLevel,
      );
      if (allMet) {
        state.activeSynergies.add(def.id);
      }
    }
  }

  /**
   * 唯一重算入口：先写 activeMasteryEffects，再写 activeSynergies。
   * 由 gameStore 每 tick（tickMastery 后）、unlockDimension 后、反序列化后统一调用。
   */
  refreshDimensionBuilds(state: GameState): void {
    this.applyMasteryRewards(state);
    this.evaluateSynergies(state);
  }

  /**
   * 全局型乘区精通奖励之总加成比例（供 MultiplierSystem 折叠进 dimension 源，受 MASTERY_GLOBAL_MULT_CAP 夹紧）。
   * 当前仅 dim0_l5 = +0.05。
   */
  getMasteryGlobalMultiplierDelta(state: GameState): number {
    let delta = 0;
    for (const effects of Object.values(DIMENSION_MASTERY_EFFECTS)) {
      for (const eff of effects) {
        if (
          eff.type === 'multiplier' &&
          eff.scope === 'global' &&
          state.activeMasteryEffects.has(eff.key)
        ) {
          delta += eff.magnitude;
        }
      }
    }
    return delta;
  }

  /**
   * 反熵叠加层数（Dim-3 分支 / S4 共用）：transcendCount 叠加 dim3_l1 的 +5 层加成。
   * 注：代码基线无独立「反熵堆栈」模型，dim3_l1「反熵叠加上限 +5层」在此解释为有效层数 +5。
   */
  private getAntiEntropyStacks(state: GameState): number {
    const base = state.transcendCount;
    return base + (state.activeMasteryEffects.has('dim3_l1') ? 5 : 0);
  }

  // ---- 维度产出倍率计算 ----
  /**
   * 计算当前维度的产出倍率
   * 各维度独特规则：
   * - Dim-0（基础）：1.0x（无修正）
   * - Dim-1（质数）：数字是质数时 ×3
   * - Dim-2（混沌）：随机倍率（每60秒重投）
   * - Dim-3（反熵）：Prestige次数越多，倍率越高
   * - Dim-4（奇点）：数字接近 e308 时触发临界爆发
   */
  calculateDimensionMultiplier(state: GameState): number {
    const dimId = state.currentDimension;
    const def = DIMENSION_DEFS[dimId];
    if (!def) return 1.0;

    let multiplier = def.baseMultiplier;

    switch (dimId) {
      case 0: // 基础维度
        break;

      case 1: { // 质数维度
        if (this.isPrimeDimensionTrigger(state.number)) {
          // dim1_l2：质数倍率提升至 ×4（覆盖基 3）；dim1_l1：质数维度倍率额外 +15%（主理人重释义）
          multiplier *= state.activeMasteryEffects.has('dim1_l2') ? 4 : 3;
          if (state.activeMasteryEffects.has('dim1_l1')) {
            multiplier *= 1.15;
          }
        }
        break;
      }

      case 2: { // 混沌维度（由 gameTick 外部管理随机倍率）
        const chaosMult = state._chaosMultiplier || 1.0;
        multiplier *= chaosMult;
        break;
      }

      case 3: { // 反熵维度
        // 每次超越（Transcend）叠加 20% — 使用 getAntiEntropyStacks（含 dim3_l1 +5 层）
        const bonus = 1 + this.getAntiEntropyStacks(state) * 0.2;
        multiplier *= bonus;
        // S1 反熵质数共鸣：反熵维度下质数 ×3 仍生效（仍属单源计算，无新乘源）
        if (state.activeSynergies.has('S1') && this.isPrimeDimensionTrigger(state.number)) {
          multiplier *= 3;
        }
        break;
      }

      case 4: { // 奇点维度
        const logNum = state.number.log(10).toNumber();
        if (logNum > 300) {
          // e300+ 触发临界爆发：基础 ×100，dim4_l1 提升至 ×200
          let burst = state.activeMasteryEffects.has('dim4_l1') ? 200 : 100;
          // S6 奇点质爆：爆发期间质数额外 ×2；S8 三位一体：质数 → ×3（均单源）
          if (state._singularityBurstActive) {
            if (state.activeSynergies.has('S6') && this.isPrimeDimensionTrigger(state.number)) burst *= 2;
            if (state.activeSynergies.has('S8') && this.isPrimeDimensionTrigger(state.number)) burst *= 3;
          }
          multiplier *= burst;
        } else if (logNum > 280) {
          // e280+ 预热：1x → 100x（dim4_l1 时 → 200x）
          const peak = state.activeMasteryEffects.has('dim4_l1') ? 200 : 100;
          const factor = (logNum - 280) / 28; // 0→1
          multiplier *= 1 + factor * (peak - 1);
          // S10 混沌奇点质数：预热期且质数 → ×1.5（仍单源，GDD 行号误标 Dim-2，实为 Dim-4 预热）
          if (state.activeSynergies.has('S10') && this.isPrimeDimensionTrigger(state.number)) {
            multiplier *= 1.5;
          }
        }
        break;
      }
    }

    // 精通度加成（每点精通 +0.5% 本维度倍率）
    const master = this.getMastery(state, dimId);
    multiplier *= 1 + master * 0.005;

    return multiplier;
  }

  /**
   * 混沌维度：重投随机倍率（每60秒调用一次）
   */
  rollChaosMultiplier(state: GameState): number {
    // dim2_l3：混沌保底（最低 1.0x）；dim2_l1：混沌上限提升至 8x
    const baseMin = state.activeMasteryEffects.has('dim2_l3') ? 1.0 : 0.5;
    const baseMax = state.activeMasteryEffects.has('dim2_l1') ? 8.0 : 5.0;
    // S4 反熵抬混沌：下限随反熵叠加层数提升
    const floor = Math.max(baseMin, this.getAntiEntropyStacks(state) * 0.2);
    const range = Math.max(0, baseMax - floor);
    let rolled = floor + Math.random() * range;
    // S3 质数混沌：重投时若数字为质数，以 magnitude 权重偏向 [3,5] 高值区间
    if (state.activeSynergies.has('S3') && this.isPrimeDimensionTrigger(state.number)) {
      const highRoll = 3 + Math.random() * 2; // [3,5]
      rolled = rolled * (1 - 0.5) + highRoll * 0.5;
    }
    state._chaosMultiplier = rolled;
    return rolled;
  }

  /**
   * 奇点维度：检查是否触发"临界爆发"效果
   * @returns 是否触发了爆发
   */
  checkSingularityBurst(state: GameState): boolean {
    if (state.currentDimension !== 4) return false;
    const logNum = state.number.log(10).toNumber();
    // dim4_l4：e300+ 自动触发爆发；激活时将自动触发阈值下探至 e280 预热期（基线已 >300 自动触发）
    const autoTrigger =
      logNum > 300 ||
      (state.activeMasteryEffects.has('dim4_l4') && logNum > 280);
    if (autoTrigger && !state._singularityBurstActive) {
      state._singularityBurstActive = true;
      // dim4_l2：爆发持续时间 +5s（基础 5s）
      const duration = 5000 + (state.activeMasteryEffects.has('dim4_l2') ? 5000 : 0);
      state._singularityBurstEndsAt = Date.now() + duration;
      return true;
    }
    // 爆发结束
    if (state._singularityBurstEndsAt && Date.now() > state._singularityBurstEndsAt) {
      state._singularityBurstActive = false;
      state._singularityBurstEndsAt = 0;
    }
    return false;
  }

  // ---- 维度资源产出 ----
  /**
   * 每 tick 产出维度专属资源
   * 产出速率：与当前维度产出正相关
   */
  tickDimensionResources(state: GameState, deltaTime: number, outputPerSec: Decimal): void {
    const dimId = state.currentDimension;
    const dimState = state.dimensionStates.get(dimId);
    if (!dimState || !dimState.unlocked) return;

    // 基础产出：每秒产出 = outputPerSec * 0.01 * deltaTime
    const baseGain = outputPerSec.mul(deltaTime * 0.01);

    // 精通度加速（每20点精通 +10% 资源获取）
    const master = this.getMastery(state, dimId);
    const masterBonus = 1 + Math.floor(master / 20) * 0.1;
    // 机制型精通奖励：质核(dim1_l3)/熵晶(dim3_l3)/碎片(dim2_l4) 额外获取加成
    let effectMult = 1;
    if (dimId === 1 && state.activeMasteryEffects.has('dim1_l3')) effectMult = 1.20;
    else if (dimId === 3 && state.activeMasteryEffects.has('dim3_l3')) effectMult = 1.30;
    else if (dimId === 2 && state.activeMasteryEffects.has('dim2_l4')) effectMult = 1.25;
    dimState.resource = dimState.resource.add(baseGain.mul(masterBonus).mul(effectMult));
  }

  // ---- 工具方法 ----
  /**
   * 更新当前维度最高数字记录
   */
  updateMaxNumber(state: GameState): void {
    const dimState = state.dimensionStates.get(state.currentDimension);
    if (dimState && state.number.gt(dimState.maxNumber)) {
      dimState.maxNumber = state.number;
    }
  }

  /**
   * 质数检测（简单版，适用于 < 1e12 的数字）
   */
  private isPrime(n: number): boolean {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    const limit = Math.sqrt(n);
    for (let i = 3; i <= limit; i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  }

  /**
   * 质数维度触发判定（确定性，覆盖大数字阶段）。
   *
   * - 数字 < 1e15：使用现有 `isPrime(number.toNumber())` 逻辑（与设计原意一致）。
   * - 数字 >= 1e15：JavaScript 的 Number 安全整数上限仅 ~9e15，
   *   `toNumber()` 会丢失精度导致质数检测失效。改用 `log10(number)` 的
   *   整数部分作为检测目标（保留「数字特征」语义，确定性强、可测试）。
   *   利用 Decimal 归一化后 `e` 字段即等于 `floor(log10(n))`，避免浮点误差。
   *
   * @param n 当前数字（Decimal）
   * @returns 是否触发质数维度 ×3 倍率
   */
  private isPrimeDimensionTrigger(n: Decimal): boolean {
    const SMALL_THRESHOLD = 1e15;
    if (n.lt(SMALL_THRESHOLD)) {
      return this.isPrime(n.toNumber());
    }
    // 大数字：取 log10 整数部分作为检测目标
    const exp = (n as unknown as { e?: number }).e;
    let target: number;
    if (typeof exp === 'number' && Number.isFinite(exp)) {
      // Decimal 归一化：n = mantissa × 10^e，mantissa ∈ [1,10)
      // → floor(log10(n)) = e（确定性，无浮点误差）
      target = exp;
    } else {
      target = Math.floor(n.log(10).toNumber());
    }
    return this.isPrime(target);
  }

  /**
   * 获取维度面板数据（给 UI 用）
   */
  getDimensionPanelData(state: GameState): DimensionPanelData[] {
    return DIMENSION_DEFS.map(def => {
      const dimState = state.dimensionStates.get(def.id);
      return {
        id: def.id,
        name: def.name,
        type: def.type,
        description: def.description,
        unlocked: dimState ? dimState.unlocked : false,
        isActive: state.currentDimension === def.id,
        master: dimState ? dimState.master : 0,
        masterLevel: this.getMasteryLevel(state, def.id),
        masterReward: this.getMasteryReward(state, def.id),
        resource: dimState ? dimState.resource : new Decimal(0),
        resourceName: def.resourceName,
        resourceIcon: def.resourceIcon,
        crystals: dimState ? dimState.crystals : 0,
        unlockCost: def.unlockCost,
        canUnlock: state.singularity >= def.unlockCost,
        multiplier: this.calculateDimensionMultiplier(state),
      };
    });
  }

  /**
   * 合成维度晶体（消耗维度资源）
   * @param state 游戏状态
   * @param dimId 维度ID（可选，默认当前维度）
   * @returns 是否合成成功
   */
  synthesizeCrystal(state: GameState, dimId?: DimensionId): boolean {
    const targetDim = dimId ?? state.currentDimension;
    const dimState = state.dimensionStates.get(targetDim);
    if (!dimState || !dimState.unlocked) return false;

    const cost = new Decimal(1000);  // 合成一个晶体需1000维度资源
    if (dimState.resource.lt(cost)) return false;

    dimState.resource = dimState.resource.sub(cost);
    dimState.crystals += 1;
    state.dimensionCrystals = state.dimensionCrystals.add(1);
    return true;
  }

  /**
   * 购买维度晶体商店的永久全局加成（消耗维度晶体）
   *
   * 购买后写入 `state.purchasedCrystalUpgrades`，由 MultiplierSystem 在
   * recalculateFromState 时注册为 'crystal' 来源的全局倍率（1 + value）。
   * 购买为一次性（不可重复购买同一商品）。
   *
   * @param state 游戏状态
   * @param itemId 商品ID
   * @returns 是否购买成功
   */
  buyCrystalUpgrade(state: GameState, itemId: string): boolean {
    const item = DIMENSION_CRYSTAL_SHOP.find((i) => i.id === itemId);
    if (!item) return false;
    if (state.purchasedCrystalUpgrades.has(itemId)) return false; // 一次性，不可重复
    if (state.dimensionCrystals.lt(item.cost)) return false;
    state.dimensionCrystals = state.dimensionCrystals.sub(item.cost);
    state.purchasedCrystalUpgrades.add(itemId);
    return true;
  }

  /**
   * 检查并更新混沌倍率（每60秒重投）
   */
  checkChaosMultiplier(state: GameState): void {
    if (state.currentDimension !== 2) return;  // Dim-2 是混沌维度

    const now = Date.now();
    // dim2_l2：混沌持续时间 +30s（重投间隔由 60s → 90s）
    const interval = 60000 + (state.activeMasteryEffects.has('dim2_l2') ? 30000 : 0);
    if (!state._chaosMultiplier || state._chaosMultiplier < 1) {
      // 首次初始化（0.5 ~ 5.0）
      state._chaosMultiplier = 0.5 + Math.random() * 4.5;
      state._lastDimensionSwitch = now;
    } else if (now - state._lastDimensionSwitch > interval) {
      // 每 interval 秒重投（0.5 ~ 5.0）
      state._chaosMultiplier = 0.5 + Math.random() * 4.5;
      state._lastDimensionSwitch = now;
    }
    // Sprint 3：混沌维度连续 ≥4.0x 倍率计数（用于 mystery_02）
    if (state.currentDimension === 2) {
      if (state._chaosMultiplier >= 4.0) {
        state._chaosStreak4x += 1;
      } else {
        state._chaosStreak4x = 0;
      }
    }
  }

  /**
   * 获取当前混沌倍率
   */
  getChaosMultiplier(state: GameState): number {
    if (state.currentDimension !== 2) return 1;
    return state._chaosMultiplier || 1;
  }

  /**
   * 获取混沌倍率剩余时间（秒）
   */
  getChaosTimer(state: GameState): number {
    if (state.currentDimension !== 2) return 0;
    // dim2_l2：混沌持续时间 +30s（与 checkChaosMultiplier 重投间隔一致）
    const interval = 60000 + (state.activeMasteryEffects.has('dim2_l2') ? 30000 : 0);
    const elapsed = (Date.now() - state._lastDimensionSwitch) / 1000;
    return Math.max(0, interval / 1000 - elapsed);
  }

  /**
   * 检查是否正在临界爆发（奇点维度）
   */
  isBursting(state: GameState): boolean {
    if (state.currentDimension !== 4) return false;
    return state._singularityBurstActive || false;
  }

  /**
   * 应用维度加成到指定数值
   * @param state 游戏状态
   * @param baseValue 基础值
   * @returns 加成后的数值
   */
  applyDimensionBonus(state: GameState, baseValue: Decimal): Decimal {
    const multiplier = this.calculateDimensionMultiplier(state);
    return baseValue.mul(multiplier);
  }
}

/**
 * 维度面板单条数据（给 UI 渲染用）
 */
export interface DimensionPanelData {
  id: DimensionId;
  name: string;
  type: string;
  description: string;
  unlocked: boolean;
  isActive: boolean;
  master: number;
  masterLevel: number;
  masterReward: string | null;
  resource: Decimal;
  resourceName: string;
  resourceIcon: string;
  crystals: number;
  unlockCost: number;
  canUnlock: boolean;
  multiplier: number;
}

/**
 * 单例导出
 */
export const dimensionSystem = new DimensionSystem();
