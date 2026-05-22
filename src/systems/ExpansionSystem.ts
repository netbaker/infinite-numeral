import { GameState } from '@/types/game';
import Decimal from 'break_eternity.js';

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

    // 保留+重置字段
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

    // 保留超越升级 + 奇点
    newState.singularity = state.singularity;
    newState.transcendCount = state.transcendCount;
    newState.transcendUpgrades = new Map(state.transcendUpgrades);

    // 保留科技树
    newState.techTree = new Map(state.techTree);

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

    return newState;
  }
}
