import Decimal from 'break_eternity.js';
import type { DimensionId, GameState } from '@/types/game';
import {
  DIMENSION_DEFS,
  DIMENSION_SWITCH_NARRATIVES,
  DIMENSION_MASTERY_REWARDS,
} from '@/core/Constants';

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
    // 冷却检查（5秒防误触）
    if (now - state._lastDimensionSwitch < 5000) {
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

    // 精通度增长速度：与当前产出和在线时间相关
    const growthRate = outputPerSec
      .toNumber() * deltaTime * 0.0001;
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
   * 获取当前维度精通奖励描述
   */
  getMasteryReward(state: GameState, dimId: DimensionId): string | null {
    const level = this.getMasteryLevel(state, dimId);
    const rewards = DIMENSION_MASTERY_REWARDS[dimId];
    if (rewards && level > 0 && level <= rewards.length) {
      return rewards[level - 1];
    }
    return null;
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
        const num = state.number.toNumber();
        if (this.isPrime(num)) {
          multiplier *= 3;
        }
        break;
      }

      case 2: { // 混沌维度（由 gameTick 外部管理随机倍率）
        const chaosMult = state._chaosMultiplier || 1.0;
        multiplier *= chaosMult;
        break;
      }

      case 3: { // 反熵维度
        // 每次 Prestige 叠加 20%
        const bonus = 1 + state.prestigeCount * 0.2;
        multiplier *= bonus;
        break;
      }

      case 4: { // 奇点维度
        const logNum = state.number.log(10).toNumber();
        if (logNum > 300) {
          // e300+ 触发临界爆发
          multiplier *= 100;
        } else if (logNum > 280) {
          // e280+ 预热
          const factor = (logNum - 280) / 28;  // 0→1
          multiplier *= 1 + factor * 99;  // 1x → 100x
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
    const min = 0.5;
    const max = 5.0;
    const rolled = min + Math.random() * (max - min);
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
    if (logNum > 300 && !state._singularityBurstActive) {
      state._singularityBurstActive = true;
      state._singularityBurstEndsAt = Date.now() + 5000;  // 持续5秒
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
    dimState.resource = dimState.resource.add(baseGain);

    // 精通度加速（每20点精通 +10% 资源获取）
    const master = this.getMastery(state, dimId);
    const masterBonus = 1 + Math.floor(master / 20) * 0.1;
    // 应用精通加成到资源获取
    dimState.resource = dimState.resource.add(baseGain.mul(masterBonus - 1));
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
   * 检查并更新混沌倍率（每60秒重投）
   */
  checkChaosMultiplier(state: GameState): void {
    if (state.currentDimension !== 1) return;  // Dim-1 是混沌维度
    
    const now = Date.now();
    if (!state._chaosMultiplier || state._chaosMultiplier < 1) {
      // 首次初始化
      state._chaosMultiplier = 1 + Math.random() * 4;  // 1-5x
      state._lastDimensionSwitch = now;
    } else if (now - state._lastDimensionSwitch > 60000) {
      // 每60秒重投
      state._chaosMultiplier = 1 + Math.random() * 4;
      state._lastDimensionSwitch = now;
    }
  }

  /**
   * 获取当前混沌倍率
   */
  getChaosMultiplier(state: GameState): number {
    if (state.currentDimension !== 1) return 1;
    return state._chaosMultiplier || 1;
  }

  /**
   * 获取混沌倍率剩余时间（秒）
   */
  getChaosTimer(state: GameState): number {
    if (state.currentDimension !== 1) return 0;
    const elapsed = (Date.now() - state._lastDimensionSwitch) / 1000;
    return Math.max(0, 60 - elapsed);
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
