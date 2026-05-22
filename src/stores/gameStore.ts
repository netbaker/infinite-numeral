import { defineStore } from 'pinia';
import { ref, markRaw, shallowRef } from 'vue';
import { BigNumber } from '@/core/BigNumber';
import { format } from '@/core/Formatter';
import { deserialize } from '@/core/Serializer';
import { GameState, type EpochConfig } from '@/types/game';
import type { SaveData } from '@/types/save';
import { ProducerSystem } from '@/systems/ProducerSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { ExpansionSystem } from '@/systems/ExpansionSystem';
import { TranscendSystem, getTranscendNarrative } from '@/systems/TranscendSystem';
import { TechTreeSystem } from '@/systems/TechTreeSystem';
import { EpochSystem } from '@/systems/EpochSystem';
import { MilestoneSystem } from '@/systems/MilestoneSystem';
import {
  PRODUCER_CONFIGS,
  UPGRADE_DEFS,
  STARDUST_UPGRADE_DEFS,
  EXPANSION_UPGRADE_DEFS,
  TECH_TREE_DEFS,
  TRANSCEND_UPGRADE_DEFS,
  EPOCH_CONFIGS,
  CRIT_CHANCE,
  CRIT_MULTIPLIER,
  BASE_CLICK_VALUE,
} from '@/core/Constants';

/**
 * 游戏核心 Store
 *
 * 管理游戏状态、逻辑tick、点击、购买、升级、重置等操作。
 * Decimal 实例使用 markRaw() 避免 Vue 响应式代理。
 * stateVersion 计数器用于触发依赖组件重渲染（因为 gameState 本身是 markRaw 的）。
 */
export const useGameStore = defineStore('game', () => {
  // ============================================================
  // 系统实例
  // ============================================================
  const producerSystem = new ProducerSystem();
  const multiplierSystem = new MultiplierSystem();
  const prestigeSystem = new PrestigeSystem();
  const expansionSystem = new ExpansionSystem();
  const transcendSystem = new TranscendSystem();
  const techTreeSystem = new TechTreeSystem();
  const epochSystem = new EpochSystem();
  const milestoneSystem = new MilestoneSystem();

  // ============================================================
  // State — Decimal 字段用 markRaw 包裹以避免 Vue proxy
  // ============================================================

  /** 核心游戏状态（markRaw 包裹，内部变更不触发响应式） */
  const gameState = shallowRef<GameState>(markRaw(new GameState()));

  /** 状态版本号 —— 每次状态变更 +1，供组件 computed 依赖以强制刷新 */
  const stateVersion = ref<number>(0);

  /** 格式化后的当前数字 */
  const displayNumber = ref<string>('0');

  /** 格式化后的累计总数字 */
  const displayTotalNumber = ref<string>('0');

  /** 格式化后的每秒产出 */
  const displayOutputPerSec = ref<string>('0');

  /** 叙事消息（Toast显示） */
  const narrationMessage = ref<string>('');

  /** 游戏是否运行中 */
  const isRunning = ref<boolean>(false);

  /** 注入状态变更信号 */
  function bumpVersion(): void {
    stateVersion.value++;
  }

  // ============================================================
  // Getters
  // ============================================================

  /** 格式化后的当前数字 */
  const formattedNumber = () => displayNumber.value;

  /** 格式化后的累计总数字 */
  const formattedTotalNumber = () => displayTotalNumber.value;

  /** 格式化后的每秒产出 */
  const formattedOutputPerSec = () => displayOutputPerSec.value;

  /** 是否可以重置 */
  const canPrestige = (): boolean => {
    return prestigeSystem.canPrestige(gameState.value);
  };

  /** 重置可获得星尘 */
  const prestigeGain = (): number => {
    return prestigeSystem.calculateStardustGain(BigNumber.from(gameState.value.number));
  };

  /** 纪元进度 */
  const epochProgress = () => {
    return epochSystem.getEpochProgress(BigNumber.from(gameState.value.totalNumber), gameState.value);
  };

  /** 已解锁的生产者ID列表 */
  const unlockedProducerIds = (): string[] => {
    return Array.from(gameState.value.unlockedProducers);
  };

  /** 可用升级ID列表（满足解锁条件且未满级） */
  const availableUpgradeIds = (): string[] => {
    const state = gameState.value;
    const totalNumber = BigNumber.from(state.totalNumber);
    const result: string[] = [];

    for (const def of UPGRADE_DEFS) {
      const upgradeState = state.upgrades.get(def.id);
      const currentLevel = upgradeState?.level ?? 0;

      // 已满级则跳过
      if (currentLevel >= def.maxLevel) {
        continue;
      }

      // 检查解锁条件（简单解析 'number>=X' 格式）
      if (checkUnlockCondition(def.unlockCondition, totalNumber)) {
        result.push(def.id);
      }
    }

    return result;
  };

  /** 可用星尘升级ID列表（有足够星尘且未满级） */
  const availableStardustUpgradeIds = (): string[] => {
    const state = gameState.value;
    const result: string[] = [];

    for (const def of STARDUST_UPGRADE_DEFS) {
      const sdState = state.stardustUpgrades.get(def.id);
      const currentLevel = sdState?.level ?? 0;

      // 已满级则跳过
      if (currentLevel >= def.maxLevel) {
        continue;
      }

      // 计算当前等级的购买成本
      const cost = def.stardustCost * Math.pow(def.costScaling, currentLevel);
      if (state.stardust >= cost) {
        result.push(def.id);
      }
    }

    return result;
  };

  // ============================================================
  // Actions
  // ============================================================

  /**
   * 初始化新游戏
   */
  function initNewGame(): void {
    const state = new GameState();

    // 初始化所有生产者
    for (const config of PRODUCER_CONFIGS) {
      state.producers.set(config.id, { id: config.id, level: 0 });
    }

    // 初始化所有升级
    for (const def of UPGRADE_DEFS) {
      state.upgrades.set(def.id, { id: def.id, level: 0 });
    }

    // 初始化所有星尘升级
    for (const def of STARDUST_UPGRADE_DEFS) {
      state.stardustUpgrades.set(def.id, { id: def.id, level: 0 });
    }

    // 初始化所有暗能量升级
    for (const def of EXPANSION_UPGRADE_DEFS) {
      state.expansionUpgrades.set(def.id, { id: def.id, level: 0 });
    }

    // 初始化所有超越升级
    for (const def of TRANSCEND_UPGRADE_DEFS) {
      state.transcendUpgrades.set(def.id, { id: def.id, level: 0 });
    }

    // 初始化所有科技树节点
    for (const def of TECH_TREE_DEFS) {
      state.techTree.set(def.id, { id: def.id, unlocked: false });
    }

    // 初始解锁第一个生产者（threshold=0）
    for (const config of PRODUCER_CONFIGS) {
      if (config.unlockThreshold === 0) {
        state.unlockedProducers.add(config.id);
      }
    }

    state.lastTickTime = Date.now();
    state.gameStartTime = Date.now();

    // 初始化倍增器
    multiplierSystem.recalculateFromState(state);

    gameState.value = markRaw(state);
    updateDisplayStrings(state);
    isRunning.value = true;
    bumpVersion();
  }

  /**
   * 从存档恢复
   *
   * @param data 存档数据
   */
  function loadFromSave(data: SaveData): void {
    const state = deserialize(data);

    // 确保所有生产者/升级/星尘升级都有状态
    for (const config of PRODUCER_CONFIGS) {
      if (!state.producers.has(config.id)) {
        state.producers.set(config.id, { id: config.id, level: 0 });
      }
    }
    for (const def of UPGRADE_DEFS) {
      if (!state.upgrades.has(def.id)) {
        state.upgrades.set(def.id, { id: def.id, level: 0 });
      }
    }
    for (const def of STARDUST_UPGRADE_DEFS) {
      if (!state.stardustUpgrades.has(def.id)) {
        state.stardustUpgrades.set(def.id, { id: def.id, level: 0 });
      }
    }
    for (const def of EXPANSION_UPGRADE_DEFS) {
      if (!state.expansionUpgrades.has(def.id)) {
        state.expansionUpgrades.set(def.id, { id: def.id, level: 0 });
      }
    }
    for (const def of TRANSCEND_UPGRADE_DEFS) {
      if (!state.transcendUpgrades.has(def.id)) {
        state.transcendUpgrades.set(def.id, { id: def.id, level: 0 });
      }
    }
    for (const def of TECH_TREE_DEFS) {
      if (!state.techTree.has(def.id)) {
        state.techTree.set(def.id, { id: def.id, unlocked: false });
      }
    }

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(state);

    gameState.value = markRaw(state);
    updateDisplayStrings(state);
    isRunning.value = true;
    bumpVersion();
  }

  /**
   * 游戏逻辑 tick
   *
   * 1. 计算总产出/秒
   * 2. number += outputPerSec × deltaTime
   * 3. totalNumber += outputPerSec × deltaTime
   * 4. 检查生产者解锁
   * 5. 检查纪元切换
   * 6. 更新显示字符串
   *
   * @param deltaTime 帧间隔时间（毫秒）
   */
  function gameTick(deltaTime: number): void {
    const state = gameState.value;

    // 1. 计算总产出/秒
    const outputPerSec = producerSystem.calculateTotalOutput(state, multiplierSystem);

    // 2. 计算增量 = outputPerSec × (deltaTime / 1000)
    const deltaSec = deltaTime / 1000;
    const increment = outputPerSec.mul(deltaSec);

    // 3. 更新 number 和 totalNumber
    state.number = BigNumber.from(state.number).add(increment).toDecimal();
    state.totalNumber = BigNumber.from(state.totalNumber).add(increment).toDecimal();

    // 4. 检查生产者解锁
    const newUnlocks = producerSystem.checkUnlocks(state);
    for (const id of newUnlocks) {
      state.unlockedProducers.add(id);
    }

    // 5. 检查纪元切换
    const newEpoch = epochSystem.checkEpochTransition(
      BigNumber.from(state.totalNumber),
      state.currentEpoch,
      state, // 传入state用于计算阈值折扣
    );
    if (newEpoch) {
      state.currentEpoch = newEpoch;
      // 纪元变更后重新计算倍增器
      multiplierSystem.recalculateFromState(state);
      // 推送叙事
      const epochCfg = EPOCH_CONFIGS.find((e: EpochConfig) => e.id === newEpoch);
      if (epochCfg) {
        narrationMessage.value = epochCfg.narrative;
        // 3秒后清除
        setTimeout(() => { narrationMessage.value = ''; }, 4000);
      }
    }

    // 6. 更新显示字符串
    updateDisplayStrings(state);

    // 更新 lastTickTime
    state.lastTickTime = Date.now();

    bumpVersion();
  }

  /**
   * 点击逻辑
   *
   * 5%暴击10×，受 click_multiplier 影响。
   *
   * @param isCrit 是否暴击（如果由调用方决定）
   * @returns 点击获得的 BigNumber
   */
  function pulseClick(isCrit?: boolean): BigNumber {
    const state = gameState.value;

    // 判断是否暴击
    const crit = isCrit ?? Math.random() < CRIT_CHANCE;

    // 基础点击值
    let clickValue = BigNumber.from(BASE_CLICK_VALUE);

    // 暴击倍率
    if (crit) {
      clickValue = clickValue.mul(CRIT_MULTIPLIER);
    }

    // click_multiplier 升级加成
    const clickUpgradeState = state.upgrades.get('click_multiplier');
    if (clickUpgradeState && clickUpgradeState.level > 0) {
      const clickUpgradeDef = UPGRADE_DEFS.find((d) => d.id === 'click_multiplier');
      if (clickUpgradeDef) {
        const multiplier = Math.pow(clickUpgradeDef.effectValue, clickUpgradeState.level);
        clickValue = clickValue.mul(multiplier);
      }
    }

    // 全局倍率
    const globalMul = multiplierSystem.getGlobalMultiplier();
    clickValue = clickValue.mul(globalMul);

    // 增加 number 和 totalNumber
    state.number = BigNumber.from(state.number).add(clickValue).toDecimal();
    state.totalNumber = BigNumber.from(state.totalNumber).add(clickValue).toDecimal();
    state.totalClicks += 1;
    state.totalManualEarnings = state.totalManualEarnings.add(clickValue.toDecimal());

    updateDisplayStrings(state);

    bumpVersion();
    return clickValue;
  }

  /**
   * 购买生产者
   *
   * @param id 生产者ID
   * @returns 是否购买成功
   */
  function buyProducer(id: string): boolean {
    const state = gameState.value;
    const discountPercent = multiplierSystem.getCostDiscountPercent(state);
    const result = producerSystem.buyProducer(id, state, discountPercent);

    if (result.success) {
      // 购买后不需要重算倍增器（生产者等级不影响倍增器）
      updateDisplayStrings(state);
      bumpVersion();
    }

    return result.success;
  }

  /**
   * 批量购买生产者
   */
  function buyProducerBulk(id: string, quantity: number): boolean {
    const state = gameState.value;
    const discountPercent = multiplierSystem.getCostDiscountPercent(state);
    const result = producerSystem.buyProducerBulk(id, state, quantity, discountPercent);

    if (result.success) {
      updateDisplayStrings(state);
      bumpVersion();
    }

    return result.success;
  }

  /**
   * 获取批量购买成本
   */
  function getProducerBulkCost(id: string, quantity: number): BigNumber {
    const state = gameState.value;
    const config = PRODUCER_CONFIGS.find((c) => c.id === id);
    if (!config) return BigNumber.zero();
    const producerState = state.producers.get(id);
    const level = producerState?.level ?? 0;
    const discountPercent = multiplierSystem.getCostDiscountPercent(state);
    return producerSystem.calculateBulkCost(config, level, quantity, discountPercent);
  }

  /**
   * 购买升级
   *
   * @param id 升级ID
   * @returns 是否购买成功
   */
  function buyUpgrade(id: string): boolean {
    const state = gameState.value;
    const def = UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) {
      return false;
    }

    const upgradeState = state.upgrades.get(id);
    if (!upgradeState) {
      return false;
    }

    // 检查是否已满级
    if (upgradeState.level >= def.maxLevel) {
      return false;
    }

    // 检查是否满足解锁条件
    const totalNumber = BigNumber.from(state.totalNumber);
    if (!checkUnlockCondition(def.unlockCondition, totalNumber)) {
      return false;
    }

    // 计算成本（简单线性：baseCost × 2^level）
    const cost = BigNumber.from(def.baseCost * Math.pow(2, upgradeState.level));
    const currentNumber = BigNumber.from(state.number);

    if (currentNumber.lt(cost)) {
      return false;
    }

    // 扣除并增加等级
    state.number = currentNumber.sub(cost).toDecimal();
    upgradeState.level += 1;

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(state);
    updateDisplayStrings(state);
    bumpVersion();

    return true;
  }

  /**
   * 购买星尘升级
   *
   * @param id 星尘升级ID
   * @returns 是否购买成功
   */
  function buyStardustUpgrade(id: string): boolean {
    const state = gameState.value;
    const def = STARDUST_UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) {
      return false;
    }

    const sdState = state.stardustUpgrades.get(id);
    if (!sdState) {
      return false;
    }

    // 检查是否已满级
    if (sdState.level >= def.maxLevel) {
      return false;
    }

    // 计算成本
    const cost = def.stardustCost * Math.pow(def.costScaling, sdState.level);
    if (state.stardust < cost) {
      return false;
    }

    // 扣除并增加等级
    state.stardust -= cost;
    sdState.level += 1;

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(state);
    updateDisplayStrings(state);
    bumpVersion();

    return true;
  }

  /**
   * 执行重置
   */
  function executePrestige(): void {
    if (!prestigeSystem.canPrestige(gameState.value)) {
      return;
    }

    const newState = prestigeSystem.executePrestige(gameState.value);

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(newState);

    gameState.value = markRaw(newState);
    updateDisplayStrings(newState);
    bumpVersion();
  }

  /**
   * 购买科技树节点
   *
   * @param id 节点ID
   * @returns 是否购买成功
   */
  function buyTechNode(id: string): boolean {
    const state = gameState.value;
    const result = techTreeSystem.buyNode(id, state);

    if (result) {
      // 解锁 producer7-9 后需要初始化其生产者状态
      const node = techTreeSystem.getNode(id);
      if (node && node.effectType === 'unlock_producers') {
        for (let i = 7; i <= 9; i++) {
          if (!state.producers.has(`producer${i}`)) {
            state.producers.set(`producer${i}`, { id: `producer${i}`, level: 0 });
          }
        }
      }

      // 重新计算倍增器（tech multiplier 可能变了）
      multiplierSystem.recalculateFromState(state);
      updateDisplayStrings(state);
      bumpVersion();
    }

    return result;
  }

  /**
   * 执行膨胀（第2层Prestige）
   */
  function executeExpansion(): void {
    if (!expansionSystem.canExpand(gameState.value)) {
      return;
    }

    const newState = expansionSystem.executeExpansion(gameState.value);

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(newState);

    gameState.value = markRaw(newState);
    updateDisplayStrings(newState);
    bumpVersion();
  }

  /**
   * 执行超越（第3层Prestige）
   */
  function executeTranscend(): void {
    if (!transcendSystem.canTranscend(gameState.value)) {
      return;
    }

    const newState = transcendSystem.executeTranscend(gameState.value);

    // 检查里程碑
    const milestoneResult = milestoneSystem.checkMilestones(newState);
    for (const m of milestoneResult.newlyUnlocked) {
      newState.unlockedMilestones.add(m.id);
    }

    // 重新计算里程碑加成后的倍增器
    multiplierSystem.recalculateFromState(newState);

    gameState.value = markRaw(newState);
    updateDisplayStrings(newState);

    // 动态叙事
    const narrative = getTranscendNarrative(newState.transcendCount);
    narrationMessage.value = narrative;
    setTimeout(() => { narrationMessage.value = ''; }, 4000);

    bumpVersion();
  }

  /**
   * 购买超越升级（元升级）
   */
  function buyTranscendUpgrade(id: string): boolean {
    const state = gameState.value;
    const def = TRANSCEND_UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) return false;

    const tcState = state.transcendUpgrades.get(id);
    if (!tcState) return false;
    if (tcState.level >= def.maxLevel) return false;

    const cost = def.singularityCost * Math.pow(def.costScaling, tcState.level);
    if (state.singularity < cost) return false;

    state.singularity -= cost;
    tcState.level += 1;

    multiplierSystem.recalculateFromState(state);
    updateDisplayStrings(state);
    bumpVersion();
    return true;
  }

  function getTranscendUpgradeCost(id: string): number {
    const state = gameState.value;
    const def = TRANSCEND_UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) return Infinity;
    const tcState = state.transcendUpgrades.get(id);
    const level = tcState?.level ?? 0;
    return def.singularityCost * Math.pow(def.costScaling, level);
  }

  /**
   * 购买暗能量升级
   *
   * @param id 升级ID
   * @returns 是否购买成功
   */
  function buyExpansionUpgrade(id: string): boolean {
    const state = gameState.value;
    const def = EXPANSION_UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) return false;

    const exState = state.expansionUpgrades.get(id);
    if (!exState) return false;

    // 检查是否已满级
    if (exState.level >= def.maxLevel) return false;

    // 计算成本
    const cost = def.deCost * Math.pow(def.costScaling, exState.level);
    if (state.darkEnergy < cost) return false;

    // 扣除并增加等级
    state.darkEnergy -= cost;
    exState.level += 1;

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(state);
    updateDisplayStrings(state);
    bumpVersion();

    return true;
  }

  /**
   * 获取暗能量升级购买成本
   *
   * @param id 升级ID
   * @returns 暗能量成本
   */
  function getExpansionUpgradeCost(id: string): number {
    const state = gameState.value;
    const def = EXPANSION_UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) return Infinity;
    const exState = state.expansionUpgrades.get(id);
    const level = exState?.level ?? 0;
    return def.deCost * Math.pow(def.costScaling, level);
  }

  /**
   * 获取当前游戏状态快照
   *
   * @returns GameState
   */
  function getSnapshot(): GameState {
    return gameState.value;
  }

  /**
   * 获取生产者购买成本
   *
   * @param id 生产者ID
   * @returns 购买成本BigNumber
   */
  function getProducerCost(id: string): BigNumber {
    const state = gameState.value;
    const config = PRODUCER_CONFIGS.find((c) => c.id === id);
    if (!config) {
      return BigNumber.zero();
    }
    const producerState = state.producers.get(id);
    const level = producerState?.level ?? 0;
    const discountPercent = multiplierSystem.getCostDiscountPercent(state);
    return producerSystem.calculateCost(config, level, discountPercent);
  }

  /**
   * 获取升级购买成本
   *
   * @param id 升级ID
   * @returns 购买成本BigNumber
   */
  function getUpgradeCost(id: string): BigNumber {
    const state = gameState.value;
    const def = UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) {
      return BigNumber.zero();
    }
    const upgradeState = state.upgrades.get(id);
    const level = upgradeState?.level ?? 0;
    return BigNumber.from(def.baseCost * Math.pow(2, level));
  }

  /**
   * 获取星尘升级购买成本
   *
   * @param id 星尘升级ID
   * @returns 星尘成本
   */
  function getStardustUpgradeCost(id: string): number {
    const state = gameState.value;
    const def = STARDUST_UPGRADE_DEFS.find((d) => d.id === id);
    if (!def) {
      return Infinity;
    }
    const sdState = state.stardustUpgrades.get(id);
    const level = sdState?.level ?? 0;
    return def.stardustCost * Math.pow(def.costScaling, level);
  }

  /**
   * 获取每秒总产出
   *
   * @returns BigNumber
   */
  function getOutputPerSec(): BigNumber {
    return producerSystem.calculateTotalOutput(gameState.value, multiplierSystem);
  }

  // ============================================================
  // 内部辅助
  // ============================================================

  /**
   * 更新显示字符串
   */
  function updateDisplayStrings(state: GameState): void {
    displayNumber.value = format(BigNumber.from(state.number));
    displayTotalNumber.value = format(BigNumber.from(state.totalNumber));
    displayOutputPerSec.value = format(
      producerSystem.calculateTotalOutput(state, multiplierSystem),
    );
  }

  /**
   * 检查解锁条件
   *
   * 支持格式: 'number>=X', 'totalNumber>=X'
   *
   * @param condition 条件表达式
   * @param totalNumber 累计总数字
   * @returns 是否满足
   */
  function checkUnlockCondition(condition: string, totalNumber: BigNumber): boolean {
    // 解析 'number>=X' 或 'totalNumber>=X'
    const match = condition.match(/^(number|totalNumber)>=(\d+)$/);
    if (!match) {
      return false;
    }

    const field = match[1];
    const threshold = parseInt(match[2], 10);

    const state = gameState.value;
    if (field === 'number') {
      return BigNumber.from(state.number).gte(threshold);
    } else if (field === 'totalNumber') {
      return totalNumber.gte(threshold);
    }

    return false;
  }

  // ============================================================
  // 返回 Store 接口
  // ============================================================

  return {
    // State
    gameState,
    stateVersion,
    displayNumber,
    displayTotalNumber,
    displayOutputPerSec,
    narrationMessage,
    isRunning,

    // Getters
    formattedNumber,
    formattedTotalNumber,
    formattedOutputPerSec,
    canPrestige,
    prestigeGain,
    epochProgress,
    unlockedProducerIds,
    availableUpgradeIds,
    availableStardustUpgradeIds,

    // Actions
    initNewGame,
    loadFromSave,
    bumpVersion,
    gameTick,
    pulseClick,
    buyProducer,
    buyProducerBulk,
    getProducerBulkCost,
    buyUpgrade,
    buyStardustUpgrade,
    executePrestige,
    executeExpansion,
    executeTranscend,
    buyTechNode,
    buyExpansionUpgrade,
    buyTranscendUpgrade,
    getSnapshot,
    getProducerCost,
    getUpgradeCost,
    getStardustUpgradeCost,
    getExpansionUpgradeCost,
    getTranscendUpgradeCost,
    getOutputPerSec,

    // 系统暴露
    techTreeSystem,
    expansionSystem,
    transcendSystem,
    milestoneSystem,
    multiplierSystem,
  };
});
