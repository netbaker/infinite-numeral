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
import { TranscendSystem } from '@/systems/TranscendSystem';
import { TechTreeSystem } from '@/systems/TechTreeSystem';
import { EpochSystem } from '@/systems/EpochSystem';
import { MilestoneSystem } from '@/systems/MilestoneSystem';
import { AchievementSystem } from '@/systems/AchievementSystem';
import { FactorSystem } from '@/systems/FactorSystem';
import { EventSystem } from '@/systems/EventSystem';
import { ChallengeSystem } from '@/systems/ChallengeSystem';
import { EntropySystem } from '@/systems/EntropySystem';
import { DimensionSystem } from '@/systems/DimensionSystem';
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
  PRESTIGE_NARRATIVES,
  EXPANSION_NARRATIVES,
  TRANSCEND_NARRATIVES,
  PRODUCER_UNLOCK_NARRATIVES,
  NUMBER_MILESTONE_NARRATIVES,
  EVENT_POST_NARRATIVES,
  ENTROPY_WARNING_NARRATIVES,
  ENTROPY_RECOVERY_NARRATIVES,
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
  const achievementSystem = new AchievementSystem();
  const factorSystem = new FactorSystem();
  const eventSystem = new EventSystem();
  const challengeSystem = new ChallengeSystem();
  const entropySystem = new EntropySystem();
  const dimensionSystem = new DimensionSystem();

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

  /** 成就 Toast 队列（待显示的成就定义） */
  const achievementQueue = ref<Array<{ id: string; name: string; description: string; icon: string }>>([]);

  /** 当前正在显示的成就 Toast */
  const currentAchievement = ref<{ id: string; name: string; description: string; icon: string } | null>(null);

  /** 游戏是否运行中 */
  const isRunning = ref<boolean>(false);

  // ---- 事件系统 UI 状态 ----
  /** 当前需要弹窗显示的事件定义 */
  const activeEventDef = ref<{ def: import('@/types/game').EventDef; triggeredAt: number } | null>(null);
  /** 是否有活跃事件等待玩家选择 */
  const hasActiveEvent = () => activeEventDef.value !== null;
  /** 事件选择倒计时（非重大事件的自动超时） */
  const eventCountdown = ref<number>(0);
  /** 当前所有持续效果（供 EffectIndicator 使用） */
  const activeEffects = ref<Array<{
    id: string;
    sourceEventId: string;
    icon: string;
    name: string;
    summary: string;
    remainingSeconds: number;
    effects: import('@/types/game').EventEffect[];
  }>>([]);
  /** 事件倒计时 timer handle */
  let eventCountdownTimer: ReturnType<typeof setInterval> | null = null;

  // ---- 熵崩系统 UI 状态 ----
  /** 当前熵值 (0-100) */
  const entropyValue = ref<number>(0);
  /** 熵值崩溃等级 */
  const entropyLevel = ref<'stable' | 'unstable' | 'critical' | 'collapsed'>('stable');
  /** 熵值显示百分比整数 */
  const entropyDisplayPercent = ref<number>(0);
  /** 是否建议立即 Prestige */
  const suggestPrestige = ref<boolean>(false);

  // ---- 维度系统 UI 状态 ----
  /** 当前维度ID */
  const currentDimensionId = ref<number>(0);
  /** 维度晶体数量 */
  const dimensionCrystals = ref<number>(0);
  /** 维度面板是否打开 */
  const isDimensionPanelOpen = ref<boolean>(false);
  /** 当前维度的精通度 */
  const currentDimensionMastery = ref<number>(0);
  /** 当前维度的资源 */
  const currentDimensionResource = ref<string>('0');
  /** 混沌倍率（仅混沌维度） */
  const chaosMultiplier = ref<number>(1);
  /** 混沌倍率倒计时 */
  const chaosTimer = ref<number>(0);
  /** 是否正在临界爆发（仅奇点维度） */
  const isSingularityBursting = ref<boolean>(false);

  /** 注入状态变更信号 */
  function bumpVersion(): void {
    stateVersion.value++;
  }

  /** 随机取池中一条叙事，显示 duration ms */
  function showNarration(pool: string[], duration = 4000): void {
    const text = pool[Math.floor(Math.random() * pool.length)];
    narrationMessage.value = text;
    setTimeout(() => { narrationMessage.value = ''; }, duration);
  }

  /** 推入成就并驱动队列显示 */
  function pushAchievement(def: { id: string; name: string; description: string; icon: string }): void {
    achievementQueue.value.push(def);
    if (!currentAchievement.value) {
      drainAchievementQueue();
    }
  }

  function drainAchievementQueue(): void {
    if (achievementQueue.value.length === 0) {
      currentAchievement.value = null;
      return;
    }
    currentAchievement.value = achievementQueue.value.shift()!;
    setTimeout(() => {
      currentAchievement.value = null;
      drainAchievementQueue();
    }, 3500);
  }

  /** 已触发过的数字里程碑（防止重复弹出） */
  const triggeredNumberMilestones = new Set<string>();

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

    // 初始化成就
    achievementSystem.initAchievements(state);

    // 初始化数字分解系统
    factorSystem.initFactors(state);

    // 初始化事件系统字段
    state._lastEventTick = Date.now();
    state.eventCooldown = 0;
    state.activeEvent = null;
    state.ongoingEffects = [];
    state.timeSpeedMultiplier = 1;

    // 初始化挑战系统
    challengeSystem.initialize(state);

    // 初始化熵崩系统
    entropySystem.initialize(state);

    // 初始化维度系统
    dimensionSystem.initialize(state);

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

    // 补全成就状态（兼容旧存档）
    achievementSystem.initAchievements(state);

    // 补全因子状态（兼容旧存档）
    factorSystem.initFactors(state);

    // 补全事件系统字段（兼容旧存档）
    if (!state._lastEventTick) state._lastEventTick = Date.now();
    if (state.eventCooldown === undefined) state.eventCooldown = 0;
    if (state.activeEvent === undefined) state.activeEvent = null;
    if (!state.ongoingEffects) state.ongoingEffects = [];
    if (state.timeSpeedMultiplier === undefined) state.timeSpeedMultiplier = 1;

    // 补全挑战系统状态（兼容旧存档）
    challengeSystem.initialize(state);

    // 补全熵崩系统状态（兼容旧存档）
    entropySystem.initialize(state);

    // 补全维度系统状态（兼容旧存档）
    dimensionSystem.initialize(state);

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
    const now = Date.now();

    // 0. 事件系统 tick（清理过期效果 + 尝试触发新事件）
    const hasNewEvent = eventSystem.tick(state, now);
    if (hasNewEvent && eventSystem.newEvent) {
      // 有新事件需要弹窗 → 设置 UI 状态
      const def = eventSystem.newEvent;
      activeEventDef.value = { def, triggeredAt: now };
      // 非重大事件启动倒计时
      if (!def.isMajor) {
        eventCountdown.value = 60;
        startEventCountdown();
      } else {
        eventCountdown.value = 0;
      }
    }

    // ---- 预计算产出（用于熵值增长计算）----
    const rawOutputPerSec = producerSystem.calculateTotalOutput(state, multiplierSystem);

    // 0.25 熵崩系统 tick（熵值增长 + 崩溃检测）
    const entropyChanged = entropySystem.tick(state, deltaTime, rawOutputPerSec);
    if (entropyChanged) {
      // 熵崩触发 → 全屏叙事
      if (entropySystem.collapsedThisTick && entropySystem.collapseNarration) {
        showNarration([entropySystem.collapseNarration], 5000);
      }
      // 等级变化预警
      if (entropySystem.warningLevel) {
        const warnText = ENTROPY_WARNING_NARRATIVES[entropySystem.warningLevel];
        if (warnText) showNarration([warnText], 4000);
      }
    }

    // 0.3 维度系统 tick（精通度增长 + 混沌倍率重投 + 临界爆发检测）
    dimensionSystem.tickMastery(state, deltaTime, rawOutputPerSec.toDecimal());
    dimensionSystem.checkChaosMultiplier(state);
    dimensionSystem.checkSingularityBurst(state);

    // 0.5 挑战系统 tick（每日重置 + 限时挑战计时 + 进度检测）
    const effectiveDeltaSec = (deltaTime * (state.timeSpeedMultiplier || 1)) / 1000;
    challengeSystem.tick(state, now, effectiveDeltaSec);
    if (challengeSystem.newlyCompleted.length > 0) {
      for (const cid of challengeSystem.newlyCompleted) {
        showNarration([`⚔️ 挑战完成: ${cid}！`]);
      }
    }

    // 应用时间加速（事件系统 speed_change 效果）
    const effectiveDelta = deltaTime * (state.timeSpeedMultiplier || 1);

    // 1. 计算总产出/秒（应用熵值惩罚）
    const entropyMult = entropySystem.getProductionMultiplier(state.entropy);
    const outputPerSec = rawOutputPerSec.mul(entropyMult);

    // 2. 计算增量 = outputPerSec × (effectiveDelta / 1000)
    const deltaSec = effectiveDelta / 1000;
    const increment = outputPerSec.mul(deltaSec);

    // 3. 更新 number 和 totalNumber
    state.number = BigNumber.from(state.number).add(increment).toDecimal();
    state.totalNumber = BigNumber.from(state.totalNumber).add(increment).toDecimal();

    // 4. 检查生产者解锁
    const newUnlocks = producerSystem.checkUnlocks(state);
    for (const id of newUnlocks) {
      state.unlockedProducers.add(id);
      // 生产者首次解锁叙事
      const narrative = PRODUCER_UNLOCK_NARRATIVES[id];
      if (narrative) {
        narrationMessage.value = narrative;
        setTimeout(() => { narrationMessage.value = ''; }, 4000);
      }
    }

    // 4.5 数字分解检测（量级变化时触发）
    const triggeredFactors = factorSystem.tick(state);
    if (triggeredFactors.length > 0) {
      // 新发现的因子 → 重算倍增器
      multiplierSystem.recalculateFromState(state);
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

    // 7. 检查成就
    const newAchievements = achievementSystem.checkAchievements(state);
    for (const def of newAchievements) {
      const achState = state.achievements.get(def.id);
      if (achState) {
        achState.unlocked = true;
        achState.unlockedAt = Date.now();
      }
      pushAchievement({ id: def.id, name: def.name, description: def.description, icon: def.icon });
    }

    // 8. 数字里程碑叙事（仅在无活跃叙事时触发）
    if (!narrationMessage.value) {
      const logE = Math.floor(Math.log10(BigNumber.from(state.number).toDecimal().toNumber() || 1));
      const key = String(logE);
      if (NUMBER_MILESTONE_NARRATIVES[key] && !triggeredNumberMilestones.has(key)) {
        triggeredNumberMilestones.add(key);
        narrationMessage.value = NUMBER_MILESTONE_NARRATIVES[key];
        setTimeout(() => { narrationMessage.value = ''; }, 4000);
      }
    }

    // 更新 lastTickTime
    state.lastTickTime = Date.now();

    // 9. 刷新持续效果列表（供 EffectIndicator 实时显示）
    activeEffects.value = eventSystem.getActiveEffects(state, Date.now());

    // 9.5 刷新熵值 UI 状态
    entropyValue.value = state.entropy;
    entropyLevel.value = entropySystem.getCollapseLevel(state.entropy);
    entropyDisplayPercent.value = entropySystem.getDisplayPercent(state.entropy);
    suggestPrestige.value = entropySystem.shouldSuggestPrestige(state);

    // 9.7 刷新维度系统 UI 状态
    currentDimensionId.value = state.currentDimension;
    dimensionCrystals.value = state.dimensionCrystals;
    const dimState = state.dimensionStates.get(state.currentDimension);
    if (dimState) {
      currentDimensionMastery.value = dimState.master;
      currentDimensionResource.value = format(dimState.resource);
    }
    chaosMultiplier.value = dimensionSystem.getChaosMultiplier(state);
    chaosTimer.value = dimensionSystem.getChaosTimer(state);
    isSingularityBursting.value = dimensionSystem.isBursting(state);

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
    // 挑战：记录点击
    challengeSystem.recordClick(state);
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
      // 大倍率购买增加额外熵值
      if (quantity >= 10) {
        const penalty = entropySystem.calculateBulkPenalty(quantity);
        if (penalty > 0) {
          entropySystem.addEntropy(state, penalty);
        }
      }
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

    // 熵崩系统：Prestige 完全重置熵值
    if (newState.entropy > 0) {
      entropySystem.resetOnPrestige(newState);
      // Prestige 后显示恢复叙事
      showNarration(ENTROPY_RECOVERY_NARRATIVES, 3000);
    }

    // 挑战：记录坍缩
    challengeSystem.recordPrestige(newState);

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(newState);

    gameState.value = markRaw(newState);
    updateDisplayStrings(newState);
    // 坍缩叙事
    showNarration(PRESTIGE_NARRATIVES);
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

    // 熵崩系统：Expansion 完全重置熵值
    if (newState.entropy > 0) {
      entropySystem.resetOnExpansion(newState);
    }

    // 挑战：记录膨胀
    challengeSystem.recordExpansion(newState);

    // 重新计算倍增器
    multiplierSystem.recalculateFromState(newState);

    gameState.value = markRaw(newState);
    updateDisplayStrings(newState);
    // 膨胀叙事
    showNarration(EXPANSION_NARRATIVES);
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

    // 挑战：记录超越
    challengeSystem.recordTranscend(newState);

    // 检查里程碑
    const milestoneResult = milestoneSystem.checkMilestones(newState);
    for (const m of milestoneResult.newlyUnlocked) {
      newState.unlockedMilestones.add(m.id);
    }

    // 重新计算里程碑加成后的倍增器
    multiplierSystem.recalculateFromState(newState);

    gameState.value = markRaw(newState);
    updateDisplayStrings(newState);

    // 超越叙事（随机池）
    showNarration(TRANSCEND_NARRATIVES, 5000);

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

  // ---- 熵崩系统公开方法 ----

  /**
   * 使用熵稳定剂
   * @returns 是否成功使用
   */
  function useEntropyStabilizer(): boolean {
    const state = gameState.value;
    if (state.stardust < 50) return false;
    state.stardust -= 50;
    const ok = entropySystem.applyStabilizer(state);
    if (ok) showNarration(ENTROPY_RECOVERY_NARRATIVES, 2500);
    bumpVersion();
    return ok;
  }

  /**
   * 使用时间回溯
   * @returns 是否成功使用
   */
  function useEntropyRewind(): boolean {
    const state = gameState.value;
    if (state.stardust < 120) return false;
    state.stardust -= 120;
    const ok = entropySystem.applyRewind(state);
    if (ok) showNarration(ENTROPY_RECOVERY_NARRATIVES, 2500);
    bumpVersion();
    return ok;
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
  // 事件系统 Actions
  // ============================================================

  /**
   * 启动事件倒计时（非重大事件 60s 自动选择）
   */
  function startEventCountdown(): void {
    if (eventCountdownTimer) clearInterval(eventCountdownTimer);
    eventCountdownTimer = setInterval(() => {
      if (eventCountdown.value > 0) {
        eventCountdown.value--;
        if (eventCountdown.value <= 0) {
          // 倒计时结束 → 自动选第一个选项
          makeEventChoice(0);
        }
      }
    }, 1000);
  }

  /**
   * 停止事件倒计时
   */
  function stopEventCountdown(): void {
    if (eventCountdownTimer) {
      clearInterval(eventCountdownTimer);
      eventCountdownTimer = null;
    }
  }

  /**
   * 玩家对活跃事件做出选择
   *
   * @param optionIndex 选项索引（0 或 1）
   */
  function makeEventChoice(optionIndex: number): void {
    const ae = activeEventDef.value;
    if (!ae) return;

    const state = gameState.value;
    eventSystem.applyChoice(state, ae.def, optionIndex, Date.now());

    // 清除 UI 状态
    stopEventCountdown();
    activeEventDef.value = null;
    eventCountdown.value = 0;

    // 重算倍增器（持续效果可能影响产出）
    multiplierSystem.recalculateFromState(state);

    // 显示后选择叙事（如果有的话）
    const postNarrative = EVENT_POST_NARRATIVES[ae.def.id];
    if (postNarrative) {
      showNarration([postNarrative], 4000);
    }

    updateDisplayStrings(state);
    bumpVersion();
  }

  /**
   * 关闭事件弹窗（不做出选择，等同于超时 → 自动选选项0）
   */
  function dismissEvent(): void {
    makeEventChoice(0);
  }

  // ---- 挑战系统公开方法 ----

  /** 领取挑战奖励 */
  function claimChallengeReward(challengeId: string): { stardust: number; de: number } | null {
    const state = gameState.value;
    const result = challengeSystem.claimReward(state, challengeId);
    if (result) {
      updateDisplayStrings(state);
      bumpVersion();
    }
    return result;
  }

  /** 开始限时挑战 */
  function startTimedChallenge(challengeId: string): boolean {
    const state = gameState.value;
    const ok = challengeSystem.startTimedChallenge(state, challengeId, Date.now());
    if (ok) bumpVersion();
    return ok;
  }

  /** 获取挑战面板数据 */
  function getChallengePanelData() {
    const state = gameState.value;
    return challengeSystem.getAllChallenges(state, Date.now());
  }

  /** 获取未领取奖励数量 */
  function getChallengeUnclaimedCount(): number {
    return challengeSystem.getUnclaimedCount(gameState.value);
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
  // 维度系统 Actions
  // ============================================================

  /**
   * 切换维度
   * @param targetDim 目标维度ID
   * @returns 是否切换成功
   */
  function switchDimension(targetDim: number): boolean {
    const state = gameState.value;
    const result = dimensionSystem.switchDimension(state, targetDim);
    
    if (result) {
      // 切换成功后显示叙事
      const narratives = DIMENSION_SWITCH_NARRATIVES[targetDim];
      if (narratives && narratives.length > 0) {
        showNarration([narratives[Math.floor(Math.random() * narratives.length)]], 4000);
      }
      
      // 更新 UI 状态
      currentDimensionId.value = state.currentDimension;
      const dimState = state.dimensionStates.get(state.currentDimension);
      if (dimState) {
        currentDimensionMastery.value = dimState.mastery;
        currentDimensionResource.value = format(dimState.resource);
      }
      
      bumpVersion();
    }
    
    return result;
  }

  /**
   * 解锁维度
   * @param dimId 维度ID
   * @returns 是否解锁成功
   */
  function unlockDimension(dimId: number): boolean {
    const state = gameState.value;
    const result = dimensionSystem.unlockDimension(state, dimId);
    
    if (result) {
      showNarration([`🗺️ 维度 ${DIMENSION_DEFS[dimId]?.name || dimId} 已解锁！`], 3000);
      bumpVersion();
    }
    
    return result;
  }

  /**
   * 合成维度晶体
   * @returns 是否合成成功
   */
  function synthesizeCrystal(): boolean {
    const state = gameState.value;
    const currentDim = state.currentDimension;
    const dimState = state.dimensionStates.get(currentDim);
    
    if (!dimState || !dimState.unlocked) return false;
    
    // 检查是否有足够资源（1000 当前维度资源）
    const cost = new Decimal(1000);
    if (dimState.resource.lt(cost)) return false;
    
    // 扣除资源并合成晶体
    dimState.resource = dimState.resource.sub(cost);
    state.dimensionCrystals += 1;
    
    showNarration([`💎 合成成功！获得 1 个维度晶体`], 3000);
    
    // 更新 UI 状态
    dimensionCrystals.value = state.dimensionCrystals;
    currentDimensionResource.value = format(dimState.resource);
    
    bumpVersion();
    return true;
  }

  /**
   * 获取维度面板数据（供 DimensionPanel.vue 使用）
   */
  function getDimensionPanelData() {
    const state = gameState.value;
    return dimensionSystem.getPanelData(state);
  }

  /**
   * 获取当前维度的加成倍率
   */
  function getDimensionBoost(): Decimal {
    const state = gameState.value;
    return dimensionSystem.applyDimensionBonus(state, new Decimal(1));
  }

  return {
    // State
    gameState,
    stateVersion,
    displayNumber,
    displayTotalNumber,
    displayOutputPerSec,
    narrationMessage,
    achievementQueue,
    currentAchievement,
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
    eventSystem,

    // 事件系统 UI 状态
    activeEventDef,
    hasActiveEvent,
    eventCountdown,
    activeEffects,
    makeEventChoice,
    dismissEvent,

    // 挑战系统
    challengeSystem,
    claimChallengeReward,
    startTimedChallenge,
    getChallengePanelData,
    getChallengeUnclaimedCount,

    // 熵崩系统
    entropySystem,
    entropyValue,
    entropyLevel,
    entropyDisplayPercent,
    suggestPrestige,
    useEntropyStabilizer,
    useEntropyRewind,

    // 维度系统 State
    currentDimensionId,
    dimensionCrystals,
    isDimensionPanelOpen,
    currentDimensionMastery,
    currentDimensionResource,
    chaosMultiplier,
    chaosTimer,
    isSingularityBursting,

    // 维度系统 Actions
    switchDimension,
    unlockDimension,
    synthesizeCrystal,
    getDimensionPanelData,
    getDimensionBoost,
  };
});
