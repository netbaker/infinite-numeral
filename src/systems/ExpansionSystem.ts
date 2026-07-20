import { GameState } from '@/types/game';
import Decimal from 'break_eternity.js';
import { geneSystem } from '@/systems/GeneSystem';

/**
 * 膨胀系统（第2层Prestige）
 *
 * 负责膨胀判定、暗能量收益计算和膨胀执行。
 * 解锁条件：科技树节点 tech_expand 已解锁
 * 触发条件：累计星尘 >= 100
 */
export class ExpansionSystem {
  /** 膨胀最小累计星尘阈值 */
  private static readonly MIN_CUMULATIVE_STARDUST = 100;

  /**
   * 判断是否可以膨胀
   *
   * @param state 当前游戏状态
   * @returns 是否可以膨胀
   */
  canExpand(state: GameState): boolean {
    // 需要先解锁科技树节点 tech_expand
    const techNode = state.techTree.get('tech_expand');
    if (!techNode || !techNode.unlocked) {
      return false;
    }

    return state.cumulativeStardust >= ExpansionSystem.MIN_CUMULATIVE_STARDUST;
  }

  /**
   * 计算膨胀获得的暗能量
   *
   * 公式：⌊log10(累计星尘) × 0.5⌋
   *
   * @param cumulativeStardust 累计星尘
   * @returns 获得的暗能量
   */
  calculateDarkEnergy(cumulativeStardust: number): number {
    if (cumulativeStardust < ExpansionSystem.MIN_CUMULATIVE_STARDUST) {
      return 0;
    }
    const logVal = Math.log10(cumulativeStardust);
    if (isNaN(logVal) || !isFinite(logVal)) {
      return 0;
    }
    return Math.floor(logVal * 0.5);
  }

  /**
   * 执行膨胀，返回新的 GameState
   *
   * 保留：暗能量(加上新获得), 暗能量升级, 膨胀次数(+1),
   *       unlockedProducers, techTree, gameStartTime
   * 重置：number=0, totalNumber=0, stardust=0, cumulativeStardust=0,
   *       producers(全level=0), upgrades(全level=0),
   *       stardustUpgrades(全level=0), currentEpoch='sprout'
   *
   * @param state 当前游戏状态
   * @returns 新的 GameState
   */
  executeExpansion(state: GameState): GameState {
    const gainedDarkEnergy = this.calculateDarkEnergy(state.cumulativeStardust);

    const newState = new GameState();

    // Sprint 3：图鉴与跨系统联动追踪字段跨 Expansion 继承
    newState.codexEntries = state.codexEntries;
    newState.codexInitialized = state.codexInitialized;
    newState.collapsedDimensions = state.collapsedDimensions;
    newState._chaosStreak4x = state._chaosStreak4x;
    newState._prestigeDuringBurst = state._prestigeDuringBurst;
    newState._archiveRecordCount = state._archiveRecordCount;
    newState._rewindUsedCount = state._rewindUsedCount;
    newState._expandedInChaosDim = state._expandedInChaosDim;
    newState._singularityBurstEver = state._singularityBurstEver;
    newState._allGeneTypesEver = state._allGeneTypesEver;

    // 保留+重置字段
    // 基因链跨 Expansion 继承；并授予一次筛选窗口（GDD §2.3.2）
    newState.geneChain = geneSystem.cloneChain(state.geneChain);
    newState.geneChain.pendingScreen = true;
    newState.number = new Decimal(0);
    newState.totalNumber = new Decimal(0);
    newState.stardust = 0;
    newState.cumulativeStardust = 0;
    newState.darkEnergy = state.darkEnergy + gainedDarkEnergy;
    newState.cumulativeDarkEnergy = state.cumulativeDarkEnergy + gainedDarkEnergy;
    newState.prestigeCount = 0;
    newState.expansionCount = state.expansionCount + 1;

    // 保留暗能量升级
    newState.expansionUpgrades = new Map(state.expansionUpgrades);

    // 保留超越升级 + 奇点 + 新手引导进度
    newState.singularity = state.singularity;
    newState.transcendCount = state.transcendCount;
    newState.tutorialStep = state.tutorialStep;
    newState.transcendUpgrades = new Map(state.transcendUpgrades);

    // 保留科技树
    newState.techTree = new Map(state.techTree);

    // 保留成就进度
    newState.achievements = new Map(state.achievements);

    // 保留已解锁生产者
    newState.unlockedProducers = new Set(state.unlockedProducers);

    // 保留全时统计
    newState.totalClicks = state.totalClicks;
    newState.totalManualEarnings = state.totalManualEarnings;

    // 重置生产者等级为0
    for (const [id] of state.producers) {
      newState.producers.set(id, { id, level: 0 });
    }

    // 重置升级等级为0
    for (const [id] of state.upgrades) {
      newState.upgrades.set(id, { id, level: 0 });
    }

    // 重置星尘升级等级为0
    for (const [id] of state.stardustUpgrades) {
      newState.stardustUpgrades.set(id, { id, level: 0 });
    }

    // 重置纪元
    newState.currentEpoch = 'sprout';

    // 保留游戏开始时间
    newState.gameStartTime = state.gameStartTime;

    // 重置 lastTickTime
    newState.lastTickTime = Date.now();

    // --- 新字段：Expansion(暗能量)策略 ---
    newState.lastMagnitude = -1;
    newState.factors = new Map(state.factors);

    for (const [id, cs] of state.challenges) {
      const cloned = { ...cs };
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
    newState.activeEvent = null;
    newState.eventCooldown = 0;
    newState.ongoingEffects = [];
    newState.timeSpeedMultiplier = 1;

    // ---- 宇宙档案馆：本轮 Run 计数器跨 Expansion 保留（Expansion 不结束 Run，Story 2.1.2）----
    newState.archiveUnlocked = state.archiveUnlocked;
    newState._runStartTime = state._runStartTime;
    newState._runMaxNumber = state._runMaxNumber;
    newState._runDimensionDwell = { ...state._runDimensionDwell };
    newState._runDimensionsVisited = new Set(state._runDimensionsVisited);
    newState._runEventCount = state._runEventCount;
    newState._runMaxEntropy = state._runMaxEntropy;
    newState._runCollapses = state._runCollapses;
    newState._runSingularityBurst = state._runSingularityBurst;
    newState._runStardustEarned = state._runStardustEarned;
    // 本轮暗能量累计（含本次重置获得）
    newState._runDarkEnergyEarned = state._runDarkEnergyEarned + gainedDarkEnergy;

    return newState;
  }
}
