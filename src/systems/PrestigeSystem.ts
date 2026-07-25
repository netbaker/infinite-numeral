import { BigNumber } from '@/core/BigNumber';
import { PRESTIGE_THRESHOLD, STARDUST_UPGRADE_DEFS } from '@/core/Constants';
import { GameState } from '@/types/game';
import Decimal from 'break_eternity.js';
import { geneSystem } from '@/systems/GeneSystem';

/**
 * 重置（星尘）系统
 *
 * 负责重置判断、星尘收益计算和重置执行。
 */
export class PrestigeSystem {
  /**
   * 判断是否可以重置
   *
   * 条件：number >= 10^12（PRESTIGE_THRESHOLD）
   *
   * @param state 当前游戏状态
   * @returns 是否可以重置
   */
  canPrestige(state: GameState): boolean {
    const currentNumber = BigNumber.from(state.number);
    return currentNumber.gte(PRESTIGE_THRESHOLD);
  }

  /**
   * 计算重置获得的星尘数量
   *
   * 公式：⌊log10(number) × 0.5⌋
   *
   * @param number 当前数字
   * @returns 获得的星尘数量
   */
  calculateStardustGain(number: BigNumber): number {
    if (number.lt(PRESTIGE_THRESHOLD)) {
      return 0;
    }
    const logVal = number.log10();
    const logNum = parseFloat(logVal.toString());
    if (isNaN(logNum) || !isFinite(logNum)) {
      return 0;
    }
    return Math.floor(logNum * 0.5);
  }

  /**
   * 执行重置，返回新的 GameState
   *
   * 保留：stardust(加上新获得), stardustUpgrades, prestigeCount(+1),
   *       unlockedProducers, gameStartTime
   * 重置：number=0, totalNumber=0, producers(全level=0),
   *       upgrades(全level=0), currentEpoch='sprout'
   *
   * 注意：起步数字加成（start_bonus星尘升级）→ number从100*level开始而非0
   *
   * @param state 当前游戏状态
   * @returns 新的 GameState
   */
  executePrestige(state: GameState): GameState {
    const currentNumber = BigNumber.from(state.number);
    const gainedStardust = this.calculateStardustGain(currentNumber);
    // dim0_l1 星尘获取 +10%（仅当已激活精通奖励）
    const stardustGain = Math.floor(gainedStardust * (state.activeMasteryEffects.has('dim0_l1') ? 1.1 : 1));

    const newState = new GameState();

    // Sprint 3：图鉴与跨系统联动追踪字段跨 Prestige 继承（否则每次坍缩都会清空图鉴收集）
    newState.codexEntries = state.codexEntries;
    newState.codexInitialized = state.codexInitialized;
    newState.collapsedDimensions = state.collapsedDimensions;
    newState._chaosStreak4x = state._chaosStreak4x;
    newState._prestigeDuringBurst = state._prestigeDuringBurst;
    newState._archiveRecordCount = state._archiveRecordCount;
    newState._rewindUsedCount = state._rewindUsedCount;
    newState._expandedInChaosDim = state._expandedInChaosDim;
    newState._singularityBurstEver = state._singularityBurstEver;
    newState._allGeneTypesEver = state._allGeneTypesEver; // 跨轮累积字段，随重置保留
    newState.numeralImprints = state.numeralImprints;
    newState.persona = state.persona;

    // 计算起步加成
    let startBonus = 0;
    const startBonusState = state.stardustUpgrades.get('start_bonus');
    if (startBonusState && startBonusState.level > 0) {
      const startBonusDef = STARDUST_UPGRADE_DEFS.find((d) => d.id === 'start_bonus');
      if (startBonusDef) {
        startBonus = startBonusDef.effectValue * startBonusState.level;
      }
    }

    // 保留+重置字段
    // 基因链跨 Prestige 继承（不被清空），对齐 GDD §2.3.1
    newState.geneChain = geneSystem.cloneChain(state.geneChain);
    // 韧性基因：Prestige 后起始数字 = 10^Lv（对齐 GDD §2.1 / Story 1.3.3）
    const resilienceStart = geneSystem.getResilienceStart(state);
    const prestigeStartNumber = startBonus + resilienceStart;
    // dim3_l2：Prestige 后保留 10% 数字；S9 稳态三和弦：保留阈值额外 +10%
    let numberRetainFrac = 0;
    if (state.activeMasteryEffects.has('dim3_l2')) numberRetainFrac += 0.10;
    if (state.activeSynergies.has('S9')) numberRetainFrac += 0.10;
    const retainNumber = state.number.mul(numberRetainFrac);
    newState.number = new Decimal(prestigeStartNumber).add(retainNumber);
    newState.totalNumber = new Decimal(prestigeStartNumber).add(retainNumber);
    newState.stardust = state.stardust + stardustGain;
    newState.cumulativeStardust = state.cumulativeStardust + stardustGain;
    newState.prestigeCount = state.prestigeCount + 1;

    // 保留Prestige后状态
    newState.darkEnergy = state.darkEnergy;
    newState.cumulativeDarkEnergy = state.cumulativeDarkEnergy;
    newState.expansionCount = state.expansionCount;
    newState.singularity = state.singularity;
    newState.transcendCount = state.transcendCount;
    newState.tutorialStep = state.tutorialStep;

    // 保留星尘升级
    newState.stardustUpgrades = new Map(state.stardustUpgrades);

    // 保留暗能量升级
    newState.expansionUpgrades = new Map(state.expansionUpgrades);

    // 保留超越升级
    newState.transcendUpgrades = new Map(state.transcendUpgrades);

    // 保留科技树
    newState.techTree = new Map(state.techTree);

    // 保留成就进度
    newState.achievements = new Map(state.achievements);

    // 保留已解锁生产者
    newState.unlockedProducers = new Set(state.unlockedProducers);

    // 重置生产者等级为0（但保留结构）
    for (const [id] of state.producers) {
      newState.producers.set(id, { id, level: 0 });
    }

    // 重置升级等级为0（但保留结构）
    for (const [id] of state.upgrades) {
      newState.upgrades.set(id, { id, level: 0 });
    }

    // 重置纪元
    newState.currentEpoch = 'sprout';

    // 保留游戏开始时间
    newState.gameStartTime = state.gameStartTime;

    // 保留全时统计
    newState.totalClicks = state.totalClicks;
    newState.totalManualEarnings = state.totalManualEarnings;

    // --- 新字段：Prestige(星尘)策略 ---
    // 因子：保留已发现因子（永久进度），但重置量级检测
    newState.lastMagnitude = -1;
    newState.factors = new Map(state.factors);

    // 挑战：每日/里程碑保留，计时挑战重置进度
    for (const [id, cs] of state.challenges) {
      const cloned = { ...cs };
      // 计时挑战重置进度
      if (cs.id.startsWith('ch_timed_')) {
        cloned.progress = 0;
        cloned.completed = false;
        cloned.remainingTime = undefined;
        cloned.startedAt = undefined;
      }
      newState.challenges.set(id, cloned);
    }
    newState.completedMilestones = new Set(state.completedMilestones);
    newState.lastTimedChallengeTime = 0;

    // 清除事件状态
    newState.activeEvent = null;
    newState.eventCooldown = 0;
    newState.ongoingEffects = [];
    newState.timeSpeedMultiplier = 1;

    // 重置 lastTickTime 为当前时间
    newState.lastTickTime = Date.now();

    // ---- 宇宙档案馆：本轮 Run 计数器跨 Prestige 保留（Prestige 不结束 Run，Story 2.1.2）----
    newState.archiveUnlocked = state.archiveUnlocked;
    newState._runStartTime = state._runStartTime;
    newState._runMaxNumber = state._runMaxNumber;
    newState._runDimensionDwell = { ...state._runDimensionDwell };
    newState._runDimensionsVisited = new Set(state._runDimensionsVisited);
    newState._runEventCount = state._runEventCount;
    newState._runMaxEntropy = state._runMaxEntropy;
    newState._runCollapses = state._runCollapses;
    newState._runSingularityBurst = state._runSingularityBurst;
    newState._runDarkEnergyEarned = state._runDarkEnergyEarned;
    // 本轮星尘累计（含本次重置获得）
    newState._runStardustEarned = state._runStardustEarned + stardustGain;

    // Sprint 6 S5 反熵留痕：Prestige 后基础维度(0) 保留 25% 精通（其余重置为 0）。
    // 同时补全 newState.dimensionStates（executePrestige 基于 new GameState()，否则维度状态会丢失）。
    // 保留 unlocked 状态（奇点核心解锁不随 Prestige 清零），重置 resource/crystals/maxNumber。
    const baseRetainFrac = state.activeSynergies.has('S5') ? 0.25 : 0;
    for (const [id, ds] of state.dimensionStates) {
      newState.dimensionStates.set(id, {
        id: ds.id,
        unlocked: ds.unlocked,
        master: id === 0 ? ds.master * baseRetainFrac : 0,
        resource: new Decimal(0),
        crystals: 0,
        maxNumber: new Decimal(0),
      });
    }

    return newState;
  }
}
