import { defineStore } from 'pinia';
import { ref, computed, markRaw, shallowRef } from 'vue';
import { BigNumber } from '@/core/BigNumber';
import { format, setActiveNumberSkin } from '@/core/Formatter';
import { deserialize } from '@/core/Serializer';
import { GameState, type EpochConfig, type DimensionId, type ArchiveRecord, type ArchiveSummary, type NumberSkinId, type UIThemeId } from '@/types/game';
import type { SaveData } from '@/types/save';
import Decimal from 'break_eternity.js';
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
import { geneSystem } from '@/systems/GeneSystem';
import type { CodexCategory, CodexEntryDef } from '@/types/codex';
import * as codexSystem from '@/systems/CodexSystem';
import * as skinSystem from '@/systems/SkinSystem';
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
  ENTROPY_ITEM_DEFS,
  ENTROPY_CONFIG,
  DIMENSION_DEFS,
  DIMENSION_SWITCH_NARRATIVES,
  ACHIEVEMENT_DEFS,
} from '@/core/Constants';
import {
  captureRun,
  enforceCapacity,
  evaluateSpecialAchievements,
  computeSummary,
} from '@/systems/ArchiveSystem';
import {
  addArchiveRecord,
  getArchiveRecords as dbGetArchiveRecords,
  deleteArchiveRecord,
  type ArchiveRecordDB,
} from '@/db/database';

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

  // ---- Sprint 3：数字神话图鉴 UI 状态 ----
  /** 图鉴面板是否显示 */
  const showCodex = ref<boolean>(false);
  /** 打开图鉴时定位的词条 ID（点击通知传入） */
  const codexHighlightId = ref<string | null>(null);
  /** 图鉴收录通知队列（右上角堆叠，最多 3 条，3s 自动消失） */
  const codexNotifications = ref<Array<{ key: number; entryId: string; title: string; category: CodexCategory }>>([]);
  let codexNotifSeq = 0;

  /** 入队一条图鉴收录通知（去重由 CodexSystem 保证，这里只负责 UI 栈管理与自动消失） */
  function enqueueCodexNotification(def: CodexEntryDef): void {
    const note = { key: ++codexNotifSeq, entryId: def.id, title: def.title, category: def.category };
    codexNotifications.value.push(note);
    if (codexNotifications.value.length > 3) codexNotifications.value.shift(); // 最多堆叠 3 条
    setTimeout(() => {
      codexNotifications.value = codexNotifications.value.filter((n) => n.key !== note.key);
    }, 3000);
  }

  /** 打开图鉴并定位到指定词条（点击通知时调用） */
  function openCodex(entryId?: string): void {
    codexHighlightId.value = entryId ?? null;
    showCodex.value = true;
  }

  /** 游戏是否运行中 */
  const isRunning = ref<boolean>(false);

  // ---- 宇宙档案馆 UI 状态（Story 2.3：loading→loaded / locked placeholder）----
  /** 快照列表（来自 `archives` 独立表，含 Dexie id） */
  const archiveRecords = ref<ArchiveRecordDB[]>([]);
  /** 异步加载中标记 */
  const archiveLoading = ref<boolean>(false);

  /** 档案馆是否已解锁（响应式，依赖 gameState 引用变化） */
  const archiveUnlocked = computed<boolean>(() => {
    void gameState.value;
    void stateVersion.value;
    return gameState.value.archiveUnlocked;
  });

  /** 统计摘要（由 ArchiveSystem.computeSummary 计算） */
  const archiveSummary = computed<ArchiveSummary>(() => {
    return computeSummary(archiveRecords.value);
  });

  /** 异步加载全部快照（打开档案馆时调用） */
  async function loadArchives(): Promise<void> {
    if (!gameState.value.archiveUnlocked) {
      archiveRecords.value = [];
      return;
    }
    archiveLoading.value = true;
    try {
      archiveRecords.value = await dbGetArchiveRecords();
    } catch (e) {
      console.error('[archive] load failed', e);
      archiveRecords.value = [];
    } finally {
      archiveLoading.value = false;
    }
  }

  /** 删除一条快照（非里程碑才能删；由 UI 在调用前校验） */
  async function removeArchive(id: number): Promise<void> {
    try {
      await deleteArchiveRecord(id);
      archiveRecords.value = archiveRecords.value.filter((r) => r.id !== id);
    } catch (e) {
      console.error('[archive] delete failed', e);
    }
  }

  /**
   * 将本次快照写入 `archives` 独立表，并在写入后执行容量控制（Story 2.2.1）。
   * 超出 MAX_ARCHIVE_RECORDS 时删除最早的非里程碑快照；里程碑永远保留。
   */
  async function persistArchiveRecord(record: ArchiveRecord): Promise<void> {
    try {
      const existing = await dbGetArchiveRecords();
      const merged = [record, ...existing];
      const trimmed = enforceCapacity(merged);
      const keepRunIds = new Set(trimmed.map((r) => r.runId));
      // 删除被容量控制淘汰的已有快照（按 runId 定位 Dexie id）
      for (const r of existing) {
        if (!keepRunIds.has(r.runId)) {
          await deleteArchiveRecord(r.id);
        }
      }
      // 写入本次快照（里程碑永远保留；非里程碑若被淘汰则不写）
      if (keepRunIds.has(record.runId)) {
        await addArchiveRecord(record);
        // Sprint 3：累计快照数（用于 mystery_06 条件 ③）
        gameState.value._archiveRecordCount++;
      }
      // 刷新内存缓存（供 UI 实时更新）
      archiveRecords.value = await dbGetArchiveRecords();
    } catch (e) {
      console.error('[archive] persist failed', e);
    }
  }

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
    // Sprint 3：图鉴自动收录钩子（约束 B：精确文本匹配，覆盖全部叙事触发路径）
    const collected = codexSystem.onNarrativeTriggered(gameState.value, text);
    for (const def of collected) {
      enqueueCodexNotification(def);
    }
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
    // 使用包装函数确保 this 绑定正确
    const hideAndNext = () => {
      currentAchievement.value = null;
      setTimeout(() => {
        drainAchievementQueue();
      }, 50);
    };
    setTimeout(hideAndNext, 3500);
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
    // Sprint 4：同步 Formatter 的当前皮肤镜像（避免与 gameStore 形成循环依赖）
    setActiveNumberSkin(state.activeNumberSkin);
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

    // 宇宙档案馆：高超越次数存档自动解锁（Story 2.1.3 兼容旧存档）
    if (state.transcendCount >= 5) {
      state.archiveUnlocked = true;
    }

    gameState.value = markRaw(state);
    updateDisplayStrings(state);
    // Sprint 4：同步 Formatter 的当前皮肤镜像
    setActiveNumberSkin(state.activeNumberSkin);
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

    // 本轮 Run 计时起点：全新游戏（_runStartTime 默认 0）首次 tick 时建立
    if (state._runStartTime === 0) {
      state._runStartTime = now;
    }

    // 0. 事件系统 tick（清理过期效果 + 尝试触发新事件）
    const hasNewEvent = eventSystem.tick(state, now);
    if (hasNewEvent && eventSystem.newEvent) {
      // 本轮事件触发计数器 +1（Story 2.1.2）
      state._runEventCount++;
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

    // 0.2 维度倍率接入产出链（方案A）：每 tick 刷新维度全局倍率，
    // 确保质数×3 / 混沌随机倍率 / 反熵叠乘 / 奇点临界爆发真正生效
    multiplierSystem.registerDimensionMultiplier(state);

    // ---- 预计算产出（用于熵值增长计算）----
    const rawOutputPerSec = producerSystem.calculateTotalOutput(state, multiplierSystem);

    // 0.25 熵崩系统 tick（熵值增长 + 崩溃检测）
    const entropyChanged = entropySystem.tick(state, deltaTime, rawOutputPerSec);
    if (entropyChanged) {
      // 熵崩触发 → 全屏叙事
      if (entropySystem.collapsedThisTick && entropySystem.collapseNarration) {
        // Sprint 3：记录发生熵崩的维度（供 mystery_01 / mystery_07 跨系统判定）
        state.collapsedDimensions.add(state.currentDimension);
        showNarration([entropySystem.collapseNarration], 5000);
        // Sprint 3：兜底全量检查未解之谜（GDD §6.3）
        const unlocked = codexSystem.checkAllMysteries(state);
        for (const def of unlocked) enqueueCodexNotification(def);
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
    // 奇点维度临界爆发标记（用于特殊成就 arch_singularity_burst，Story 2.1.2）
    if (dimensionSystem.checkSingularityBurst(state)) {
      state._runSingularityBurst = true;
      // Sprint 3：持久标记（用于 mystery_04 条件 ①）
      state._singularityBurstEver = true;
    }
    // 0.5 维度专属资源产出（依赖 Story 0.1 的维度资源序列化）
    dimensionSystem.tickDimensionResources(state, deltaTime, rawOutputPerSec.toDecimal());

    // 0.9 不稳定等级时间因子减弱：熵值处于 unstable 时，timeSpeedMultiplier 效果按 0.7 折减
    const timeFactorPenalty = entropySystem.getCollapseLevel(state.entropy) === 'unstable'
      ? ENTROPY_CONFIG.UNSTABLE_TIME_FACTOR_PENALTY
      : 1.0;

    // 0.5 挑战系统 tick（每日重置 + 限时挑战计时 + 进度检测）
    const effectiveDeltaSec = (deltaTime * (state.timeSpeedMultiplier || 1) * timeFactorPenalty) / 1000;
    challengeSystem.tick(state, now, effectiveDeltaSec);
    if (challengeSystem.newlyCompleted.length > 0) {
      for (const cid of challengeSystem.newlyCompleted) {
        showNarration([`⚔️ 挑战完成: ${cid}！`]);
      }
    }

    // 应用时间加速（事件系统 speed_change 效果），含不稳定时间因子折减
    const effectiveDelta = deltaTime * (state.timeSpeedMultiplier || 1) * timeFactorPenalty;

    // 1. 计算总产出/秒（应用熵值惩罚）
    const entropyMult = entropySystem.getProductionMultiplier(state.entropy);
    const outputPerSec = rawOutputPerSec.mul(entropyMult);

    // 2. 计算增量 = outputPerSec × (effectiveDelta / 1000)
    const deltaSec = effectiveDelta / 1000;
    const increment = outputPerSec.mul(deltaSec);

    // 3. 更新 number 和 totalNumber
    state.number = BigNumber.from(state.number).add(increment).toDecimal();
    state.totalNumber = BigNumber.from(state.totalNumber).add(increment).toDecimal();

    // 基因系统：记录历史最高数字的 log10（记忆基因真值源，GDD §2.1 / ADR-001 G4）
    geneSystem.recordMaxNumber(state);

    // ---- 宇宙档案馆：本轮 Run 数据采集（Story 2.1.2）----
    // 本轮最高数字（用于 maxNumber / maxLog10），用 Decimal.gt 比较避免超大数 toNumber 失真
    if (state.number.gt(state._runMaxNumber)) {
      state._runMaxNumber = state.number;
    }
    // 本轮访问维度 + 各维度停留时长累计（用于 primaryDimension 计算）
    state._runDimensionsVisited.add(state.currentDimension);
    state._runDimensionDwell[state.currentDimension] =
      (state._runDimensionDwell[state.currentDimension] ?? 0) + deltaSec;
    // 本轮最高熵值
    if (state.entropy > state._runMaxEntropy) {
      state._runMaxEntropy = state.entropy;
    }

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
      // 确保成就状态已初始化
      if (!state.achievements.has(def.id)) {
        state.achievements.set(def.id, { id: def.id, unlocked: false });
      }
      const achState = state.achievements.get(def.id)!;
      achState.unlocked = true;
      achState.unlockedAt = Date.now();
      pushAchievement({ id: def.id, name: def.name, description: def.description, icon: def.icon });
    }

    // 8. 数字里程碑叙事（仅在无活跃叙事时触发）
    if (!narrationMessage.value) {
      const logE = Math.floor(Math.log10(BigNumber.from(state.number).toDecimal().toNumber() || 1));
      const key = String(logE);
      if (NUMBER_MILESTONE_NARRATIVES[key] && !triggeredNumberMilestones.has(key)) {
        triggeredNumberMilestones.add(key);
        const text = NUMBER_MILESTONE_NARRATIVES[key];
        narrationMessage.value = text;
        // Sprint 5 B③：联动 Codex 知识词条——精确文本匹配 onNarrativeTriggered
        // （对齐 magnitude-milestone.md §2.2 / knowledge-entry-pool.md；
        //  text 须与 KNOWLEDGE_ENTRY_DEFS.narrativeTriggers 逐字符一致）
        const collected = codexSystem.onNarrativeTriggered(state, text);
        for (const def of collected) {
          enqueueCodexNotification(def);
        }
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
    dimensionCrystals.value = state.dimensionCrystals.toNumber();
    const dimState = state.dimensionStates.get(state.currentDimension);
    if (dimState) {
      currentDimensionMastery.value = dimState.master;
      currentDimensionResource.value = format(BigNumber.from(dimState.resource));
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

    // Sprint 3：若在奇点维度临界爆发期间完成坍缩（用于 mystery_04 条件 ②）
    if (newState._singularityBurstActive) {
      newState._prestigeDuringBurst = true;
    }

    // 基因系统：Prestige 后触发突变（Story 1.2.1，每条 30% 概率，同次最多 1 条）
    // 突变发生在倍增器重算之前，使突变后的基因倍率正确注册
    const mutationResult = geneSystem.mutate(newState);
    if (mutationResult.mutated && mutationResult.narrative) {
      showNarration([mutationResult.narrative], 3000);
    }

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

    // Sprint 3：若在混沌维度完成膨胀（用于 mystery_11 条件 ②）
    if (newState.currentDimension === 2) {
      newState._expandedInChaosDim = true;
    }

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
    // 基因系统：膨胀后授予一次筛选窗口（Story 1.2.2，GDD §2.3.2）
    if (newState.geneChain.pendingScreen) {
      showNarration(['🧬 基因筛选窗口已开启：你可选择删除 0-1 条基因（记忆基因不可删）。'], 3500);
    }
    bumpVersion();
  }

  /**
   * 执行超越（第3层Prestige）
   */
  async function executeTranscend(): Promise<void> {
    const preState = gameState.value;
    if (!transcendSystem.canTranscend(preState)) {
      return;
    }
    const wasUnlocked = preState.archiveUnlocked;

    // 1. 采集本轮快照（必须在重置前，读取 pre-reset 状态）—— Story 2.1.2 / 2.2.1 / 2.2.2
    //    仅当档案馆已解锁，或本次超越后将达到解锁阈值（transcendCount >= 5）。
    let record: ArchiveRecord | null = null;
    let newlyUnlocked: string[] = [];
    if (preState.transcendCount >= 4 || preState.archiveUnlocked) {
      try {
        const existing = await dbGetArchiveRecords();
        const singularityEarned = transcendSystem.calculateSingularity(preState.cumulativeDarkEnergy);
        record = captureRun(preState, { existingRecords: existing, singularityEarned });
        const merged = [record, ...existing];
        // 特殊成就判定（返回新解锁 id；已解锁的不会重复返回）
        newlyUnlocked = evaluateSpecialAchievements(preState, record, merged);
      } catch (e) {
        console.error('[archive] capture failed', e);
      }
    }

    // 2. 执行超越重置
    const newState = transcendSystem.executeTranscend(preState);

    // 基因系统：超越后获取新基因 / 授予重组机会（Story 1.2.3 / 1.2.4）
    // TranscendSystem 已在内部执行 generateInitialChain / acquireNewGene，
    // 此处仅根据结果播放叙事 + 检测可重组对供 UI 高亮。
    const beforeGenes = preState.geneChain.chain.length + preState.geneChain.pendingStash.length;
    const afterGenes = newState.geneChain.chain.length + newState.geneChain.pendingStash.length;
    if (afterGenes > beforeGenes) {
      showNarration(['🧬 超越留下了新的基因序列，已加入你的数字 DNA。'], 3500);
    }
    if (geneSystem.findRecombinablePairs(newState).length > 0) {
      showNarration(['🧬 检测到可重组的同类基因对：前往基因链面板可将其合并强化。'], 3500);
    }

    // 挑战：记录超越
    challengeSystem.recordTranscend(newState);

    // 检查里程碑
    const milestoneResult = milestoneSystem.checkMilestones(newState);
    for (const m of milestoneResult.newlyUnlocked) {
      newState.unlockedMilestones.add(m.id);
    }

    // 应用特殊成就奖励（奇点核心）到新状态 —— Story 2.2.2
    for (const id of newlyUnlocked) {
      const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
      if (def?.rewardSingularity) {
        newState.singularity += def.rewardSingularity;
      }
      const st = newState.achievements.get(id) ?? { id, unlocked: false };
      st.unlocked = true;
      st.unlockedAt = Date.now();
      newState.achievements.set(id, st);
      if (def) {
        pushAchievement({ id: def.id, name: def.name, description: def.description, icon: def.icon });
      }
    }

    // 重新计算里程碑加成后的倍增器
    multiplierSystem.recalculateFromState(newState);

    gameState.value = markRaw(newState);
    updateDisplayStrings(newState);

    // Sprint 3：每次 Transcend 后全量兜底检查未解之谜（GDD §6.3，主理解锁时机）
    {
      const unlocked = codexSystem.checkAllMysteries(gameState.value);
      for (const def of unlocked) enqueueCodexNotification(def);
    }

    // 隐患3 修复：检查完刚结束那轮的未解之谜后，将本轮熵崩计数归零，开启新轮。
    // 这样 mystery_03（_runCollapses===0）与 mystery_08（≥inRunAtLeast 阈值）判定的是"刚结束那轮"，
    // 下一轮从 0 重新累计；Transcend 作为最高层重置，只在此处重算 _runCollapses。
    gameState.value._runCollapses = 0;

    // 档案馆解锁叙事 —— Story 2.1.3（首次解锁展示专属叙事，否则常规超越叙事）
    if (newState.archiveUnlocked && !wasUnlocked) {
      showNarration(['🏛️ 宇宙档案馆已解锁！你的每一次超越都将被永久记录。'], 5000);
    } else {
      showNarration(TRANSCEND_NARRATIVES, 5000);
    }

    // 3. 异步持久化快照（不阻塞 UI；容量控制在内部完成）—— Story 2.2.1
    if (record) {
      void persistArchiveRecord(record);
    }

    bumpVersion();
  }

  /** R1 红线：数字印记总上限（5 次量级里程碑超越 + 9 个档案馆成就 = 14，超过不发放） */
  const NUMERAL_IMPRINT_CAP = 14;

  /**
   * 发放数字印记（A③ 数字人格 / B 量级里程碑 共享货币的地基）。
   *
   * - R1 红线：numeralImprints 总上限 = 14，超过部分不发放（硬钳制）。
   * - 走现有叙事 Toast 通道（showNarration）通知玩家。
   * - Phase 0 只累加 + 上限钳制，不含任何消费/业务逻辑。
   *
   * @param amount 拟发放数量（应为正数；非正数或超上限部分直接忽略）
   * @returns 实际发放数量（钳制后，可能 < amount 或 = 0）
   */
  function grantNumeralImprint(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const state = gameState.value;
    const before = state.numeralImprints;
    const granted = Math.min(amount, NUMERAL_IMPRINT_CAP - before);
    if (granted <= 0) return 0;
    state.numeralImprints = before + granted;
    bumpVersion();
    // 走现有叙事 Toast 通道
    showNarration([`✨ 数字印记 +${granted}`], 4000);
    return granted;
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
    // Sprint 3：累计回溯使用次数（用于 mystery_08）
    state._rewindUsedCount++;
    const ok = entropySystem.applyRewind(state);
    if (ok) showNarration(ENTROPY_RECOVERY_NARRATIVES, 2500);
    bumpVersion();
    return ok;
  }

  /**
   * 购买维度屏障（消耗星尘，加入持有数）
   * @returns 是否购买成功
   */
  function buyEntropyBarrier(): boolean {
    const state = gameState.value;
    const def = ENTROPY_ITEM_DEFS.find((d) => d.id === 'barrier');
    if (!def) return false;
    if (state.stardust < def.stardustCost) return false;
    if (state.entropyBarriers >= def.maxStack) return false;
    state.stardust -= def.stardustCost;
    state.entropyBarriers++;
    bumpVersion();
    return true;
  }

  /**
   * 使用维度屏障 — 激活后 60 秒内熵值不上升
   * @returns 是否成功使用
   */
  function useEntropyBarrier(): boolean {
    const state = gameState.value;
    const ok = entropySystem.applyBarrier(state);
    if (ok) showNarration(ENTROPY_RECOVERY_NARRATIVES, 2500);
    bumpVersion();
    return ok;
  }

  /**
   * 购买维度晶体商店的永久全局加成（消耗维度晶体）
   * 购买成功后通过 MultiplierSystem 重新注册倍率使其生效。
   * @returns 是否购买成功
   */
  function buyCrystalUpgrade(itemId: string): boolean {
    const state = gameState.value;
    const ok = dimensionSystem.buyCrystalUpgrade(state, itemId);
    if (ok) {
      multiplierSystem.recalculateFromState(state);
      showNarration(['💎 已购买维度增益，永久生效！'], 2500);
      bumpVersion();
    }
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
  function getChallengePanelData(): ReturnType<typeof challengeSystem.getAllChallenges> {
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
    const skin = state.activeNumberSkin;
    displayNumber.value = format(BigNumber.from(state.number), skin);
    displayTotalNumber.value = format(BigNumber.from(state.totalNumber), skin);
    displayOutputPerSec.value = format(
      producerSystem.calculateTotalOutput(state, multiplierSystem),
      skin,
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
  function switchDimension(targetDim: DimensionId): boolean {
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
        currentDimensionMastery.value = dimState.master;
        currentDimensionResource.value = format(BigNumber.from(dimState.resource));
      }

      // Sprint 3：维度切换后兜底检查未解之谜（GDD §4.1）
      const unlocked = codexSystem.checkAllMysteries(state);
      for (const def of unlocked) enqueueCodexNotification(def);

      bumpVersion();
    }

    return result;
  }

  /**
   * 解锁维度
   * @param dimId 维度ID
   * @returns 是否解锁成功
   */
  function unlockDimension(dimId: DimensionId): boolean {
    const state = gameState.value;
    const result = dimensionSystem.unlockDimension(state, dimId);
    
    if (result) {
      showNarration([`🗺️ 维度 ${DIMENSION_DEFS[dimId]?.name || dimId} 已解锁！`], 3000);
      bumpVersion();
    }
    
    return result;
  }

  /**
   * 合成维度晶体（委托 DimensionSystem 实现，避免重复逻辑）
   * @returns 是否合成成功
   */
  function synthesizeCrystal(): boolean {
    const state = gameState.value;
    const ok = dimensionSystem.synthesizeCrystal(state);
    if (ok) {
      showNarration([`💎 合成成功！获得 1 个维度晶体`], 3000);

      // 更新 UI 状态
      dimensionCrystals.value = state.dimensionCrystals.toNumber();
      const dimState = state.dimensionStates.get(state.currentDimension);
      if (dimState) {
        currentDimensionResource.value = format(BigNumber.from(dimState.resource));
      }

      bumpVersion();
    }
    return ok;
  }

  /**
   * 获取维度面板数据（供 DimensionPanel.vue 使用）
   */
  function getDimensionPanelData() {
    const state = gameState.value;
    return dimensionSystem.getDimensionPanelData(state);
  }

  /**
   * 获取当前维度的加成倍率
   */
  function getDimensionBoost(): Decimal {
    const state = gameState.value;
    return dimensionSystem.applyDimensionBonus(state, new Decimal(1));
  }

  // ============================================================
  // 基因系统 Actions（Story 1.2.x / 1.3.2）
  // ============================================================

  /** 筛选删除一条基因（仅 pendingScreen 窗口内、非 gene_memory 可删，Story 1.2.2） */
  function pruneGene(instanceId: string): boolean {
    const state = gameState.value;
    const ok = geneSystem.prune(state, instanceId);
    if (ok) {
      multiplierSystem.recalculateFromState(state);
      bumpVersion();
    }
    return ok;
  }

  /** 放弃本次筛选窗口（Story 1.2.2） */
  function skipScreen(): void {
    geneSystem.skipScreen(gameState.value);
    bumpVersion();
  }

  /** 重组两条同类基因（Story 1.2.3） */
  function recombineGenes(instanceIdA: string, instanceIdB: string): boolean {
    const state = gameState.value;
    const ok = geneSystem.recombine(state, instanceIdA, instanceIdB);
    if (ok) {
      multiplierSystem.recalculateFromState(state);
      bumpVersion();
    }
    return ok;
  }

  /** 扩容基因槽（Story 1.3.2） */
  function expandGeneSlot(): boolean {
    const state = gameState.value;
    const ok = geneSystem.expandSlot(state);
    if (ok) {
      multiplierSystem.recalculateFromState(state);
      bumpVersion();
    }
    return ok;
  }

  /** 将暂存区基因移入链（槽位有空时，Story 1.2.4） */
  function stashToChain(instanceId: string): boolean {
    const state = gameState.value;
    const ok = geneSystem.stashToChain(state, instanceId);
    if (ok) bumpVersion();
    return ok;
  }

  /** 当前可重组的同类基因对（供 UI 高亮，Story 1.2.3） */
  function getRecombinablePairs() {
    return geneSystem.findRecombinablePairs(gameState.value);
  }

  /** 槽位扩容可行性信息（Story 1.3.2） */
  function getGeneExpandInfo() {
    return geneSystem.canExpandSlot(gameState.value);
  }

  // ============================================================
  // 皮肤系统（Sprint 4）— 响应式访问器 + Actions
  // ============================================================

  /** 当前激活的数字皮肤（响应式，依赖 stateVersion） */
  const activeNumberSkin = computed<NumberSkinId>(() => {
    void stateVersion.value;
    return gameState.value.activeNumberSkin;
  });

  /** 当前激活的 UI 主题（响应式；App.vue watch 据此修改 <html data-theme>） */
  const activeTheme = computed<UIThemeId>(() => {
    void stateVersion.value;
    return gameState.value.activeTheme;
  });

  /** 已解锁的数字皮肤集合（响应式） */
  const unlockedNumberSkins = computed<Set<NumberSkinId>>(() => {
    void stateVersion.value;
    return gameState.value.unlockedNumberSkins;
  });

  /** 已解锁的 UI 主题集合（响应式） */
  const unlockedThemes = computed<Set<UIThemeId>>(() => {
    void stateVersion.value;
    return gameState.value.unlockedThemes;
  });

  /** 切换当前激活的数字皮肤（须已解锁） */
  function setNumberSkin(id: NumberSkinId): boolean {
    const state = gameState.value;
    const ok = skinSystem.setNumberSkin(state, id);
    if (ok) {
      setActiveNumberSkin(id); // 同步 Formatter 镜像，避免与 gameStore 循环依赖
      bumpVersion();
      // 联动：皮肤切换后兜底检查未解之谜（mystery_10 等）
      const newly = codexSystem.checkAllMysteries(state);
      for (const def of newly) enqueueCodexNotification(def);
    }
    return ok;
  }

  /** 解锁数字皮肤（条件 + 资源校验，扣减资源） */
  function unlockNumberSkin(id: NumberSkinId): skinSystem.UnlockResult {
    const state = gameState.value;
    const result = skinSystem.unlockNumberSkin(state, id);
    if (result.ok) {
      bumpVersion();
      const def = skinSystem.getNumberSkinDef(id);
      showNarration([`🎨 已解锁数字皮肤：${def.name}！`], 2500);
      const newly = codexSystem.checkAllMysteries(state);
      for (const def2 of newly) enqueueCodexNotification(def2);
    }
    return result;
  }

  /** 切换当前激活的 UI 主题（须已解锁；App.vue watch 负责修改 DOM data-theme） */
  function setTheme(id: UIThemeId): boolean {
    const state = gameState.value;
    const ok = skinSystem.setTheme(state, id);
    if (ok) {
      bumpVersion();
      const newly = codexSystem.checkAllMysteries(state);
      for (const def of newly) enqueueCodexNotification(def);
    }
    return ok;
  }

  /** 解锁 UI 主题（条件 + 资源校验，扣减资源） */
  function unlockTheme(id: UIThemeId): skinSystem.UnlockResult {
    const state = gameState.value;
    const result = skinSystem.unlockTheme(state, id);
    if (result.ok) {
      bumpVersion();
      const def = skinSystem.getThemeDef(id);
      showNarration([`🎨 已解锁主题：${def.name}！`], 2500);
      const newly = codexSystem.checkAllMysteries(state);
      for (const def2 of newly) enqueueCodexNotification(def2);
    }
    return result;
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

    // Sprint 3：数字神话图鉴
    showCodex,
    codexHighlightId,
    codexNotifications,
    openCodex,

    // 宇宙档案馆（Story 2.3）
    archiveRecords,
    archiveLoading,
    archiveUnlocked,
    archiveSummary,
    loadArchives,
    removeArchive,

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
    grantNumeralImprint,
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
    buyEntropyBarrier,
    useEntropyBarrier,
    buyCrystalUpgrade,

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

    // 基因系统 Actions（Story 1.2.x / 1.3.2）
    pruneGene,
    skipScreen,
    recombineGenes,
    expandGeneSlot,
    stashToChain,
    getRecombinablePairs,
    getGeneExpandInfo,

    // 基因系统暴露（供 GeneChain.vue 直接查询）
    geneSystem,

    // Sprint 4：皮肤系统（响应式访问器 + Actions）
    activeNumberSkin,
    activeTheme,
    unlockedNumberSkins,
    unlockedThemes,
    setNumberSkin,
    unlockNumberSkin,
    setTheme,
    unlockTheme,
  };
});
