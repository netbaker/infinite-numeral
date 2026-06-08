import { BigNumber } from '@/core/BigNumber';
import { PRESTIGE_THRESHOLD, STARDUST_UPGRADE_DEFS } from '@/core/Constants';
import { GameState } from '@/types/game';
import Decimal from 'break_eternity.js';

/**
 * 重置（星尘）系统
 *
 * 负责重置判断、星尘收益计算和重置执行。
 */
export class PrestigeSystem {
  /**
   * 判断是否可以重置
   *
   * 条件：number >= 10^15
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

    const newState = new GameState();

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
    newState.number = new Decimal(startBonus);
    newState.totalNumber = new Decimal(startBonus);
    newState.stardust = state.stardust + gainedStardust;
    newState.cumulativeStardust = state.cumulativeStardust + gainedStardust;
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

    return newState;
  }
}
