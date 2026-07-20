import Decimal from 'break_eternity.js';
import { GameState } from '@/types/game';
import type { AchievementState, DimensionId } from '@/types/game';
import type { SaveData, SerializedState } from '@/types/save';

/** 当前存档版本号（Sprint 3 图鉴：新增 codexEntries + codexInitialized + 8 个跨系统联动追踪字段 → 3 → 4） */
const CURRENT_VERSION = 4;

/**
 * 序列化 GameState 为可存储的 SaveData
 *
 * 转换规则：
 * - Decimal → string
 * - Map<string, T> → Record<string, T>
 * - Set<string> → string[]
 */
export function serialize(state: GameState): SaveData {
  const serializedState: SerializedState = {
    number: state.number.toString(),
    totalNumber: state.totalNumber.toString(),
    stardust: state.stardust,
    prestigeCount: state.prestigeCount,
    cumulativeStardust: state.cumulativeStardust,
    darkEnergy: state.darkEnergy,
    expansionCount: state.expansionCount,
    cumulativeDarkEnergy: state.cumulativeDarkEnergy,
    singularity: state.singularity,
    transcendCount: state.transcendCount,
    // ---- v2.0 熵崩系统字段 ----
    entropy: state.entropy,
    entropyStabilizers: state.entropyStabilizers,
    entropyRewinds: state.entropyRewinds,
    totalCollapses: state.totalCollapses,
    collapseStreak: state.collapseStreak,
    entropyBarriers: state.entropyBarriers,
    _barrierActiveUntil: state._barrierActiveUntil,
    // ---- v2.0 维度系统字段 ----
    currentDimension: state.currentDimension,
    dimensionStates: serializeDimensionStates(state.dimensionStates),
    dimensionCrystals: state.dimensionCrystals.toString(),
    _chaosMultiplier: state._chaosMultiplier,
    _singularityBurstActive: state._singularityBurstActive,
    _singularityBurstEndsAt: state._singularityBurstEndsAt,
    purchasedCrystalUpgrades: Array.from(state.purchasedCrystalUpgrades),
    // ---- 事件系统运行时字段 ----
    activeEvent: state.activeEvent,
    ongoingEffects: state.ongoingEffects,
    downedProducers: mapToRecord(state.downedProducers, (ts) => ts),
    producers: mapToRecord(state.producers, (ps) => ps.level),
    upgrades: mapToRecord(state.upgrades, (us) => us.level),
    stardustUpgrades: mapToRecord(state.stardustUpgrades, (sus) => sus.level),
    expansionUpgrades: mapToRecord(state.expansionUpgrades, (eus) => eus.level),
    transcendUpgrades: mapToRecord(state.transcendUpgrades, (tus) => tus.level),
    techTree: mapToRecord(state.techTree, (tn) => tn.unlocked),
    currentEpoch: state.currentEpoch,
    unlockedProducers: Array.from(state.unlockedProducers),
    lastTickTime: state.lastTickTime,
    gameStartTime: state.gameStartTime,
    totalClicks: state.totalClicks,
    totalManualEarnings: state.totalManualEarnings.toString(),
    achievements: serializeAchievements(state.achievements),
    lastMagnitude: state.lastMagnitude,
    factors: mapToRecord(state.factors, (fs) => ({ level: fs.level, active: fs.active })),
    challenges: mapToRecord(state.challenges, (cs) => ({
      progress: cs.progress,
      completed: cs.completed,
      claimed: cs.claimed,
    })),
    completedMilestones: Array.from(state.completedMilestones),
    lastTimedChallengeTime: state.lastTimedChallengeTime,
    eventCooldown: state.eventCooldown,
    timeSpeedMultiplier: state.timeSpeedMultiplier,
    tutorialStep: state.tutorialStep,
    // ---- v2.0 基因进化系统字段（无 Decimal） ----
    geneChain: serializeGeneChain(state.geneChain),
    // ---- v2.0 宇宙档案馆字段（对齐 ADR-002 A5 + ArchiveRecord 采集需要） ----
    archiveUnlocked: state.archiveUnlocked,
    _runStartTime: state._runStartTime,
    _runMaxNumber: state._runMaxNumber.toString(),
    _runDimensionDwell: { ...state._runDimensionDwell },
    _runDimensionsVisited: Array.from(state._runDimensionsVisited),
    _runEventCount: state._runEventCount,
    _runMaxEntropy: state._runMaxEntropy,
    _runCollapses: state._runCollapses,
    _runSingularityBurst: state._runSingularityBurst,
    _runStardustEarned: state._runStardustEarned,
    _runDarkEnergyEarned: state._runDarkEnergyEarned,
    // ---- v2.0 数字神话图鉴字段（Sprint 3） ----
    codexEntries: mapToRecord(state.codexEntries, (es) => ({
      unlocked: es.unlocked,
      unlockedAt: es.unlockedAt,
    })),
    codexInitialized: state.codexInitialized,
    // ---- 跨系统联动追踪字段（mystery_* 判定用） ----
    collapsedDimensions: Array.from(state.collapsedDimensions),
    _chaosStreak4x: state._chaosStreak4x,
    _prestigeDuringBurst: state._prestigeDuringBurst,
    _archiveRecordCount: state._archiveRecordCount,
    _rewindUsedCount: state._rewindUsedCount,
    _expandedInChaosDim: state._expandedInChaosDim,
    _singularityBurstEver: state._singularityBurstEver,
    allGeneTypesEver: Array.from(state._allGeneTypesEver),
  };

  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    state: serializedState,
  };
}

/**
 * 反序列化 SaveData 为 GameState
 *
 * 转换规则：
 * - string → Decimal
 * - Record<string, T> → Map<string, State>
 * - string[] → Set<string>
 */
export function deserialize(data: SaveData): GameState {
  const state = new GameState();
  const s = data.state;

  state.number = new Decimal(s.number);
  state.totalNumber = new Decimal(s.totalNumber);
  state.stardust = s.stardust;
  state.prestigeCount = s.prestigeCount;
  state.cumulativeStardust = s.cumulativeStardust ?? s.stardust;
  state.darkEnergy = s.darkEnergy ?? 0;
  state.expansionCount = s.expansionCount ?? 0;
  state.cumulativeDarkEnergy = s.cumulativeDarkEnergy ?? 0;
  state.singularity = s.singularity ?? 0;
  state.transcendCount = s.transcendCount ?? 0;

  // ---- v2.0 熵崩系统字段（兼容旧存档：缺失则保持默认值）----
  state.entropy = s.entropy ?? 0;
  state.entropyStabilizers = s.entropyStabilizers ?? 0;
  state.entropyRewinds = s.entropyRewinds ?? 0;
  state.totalCollapses = s.totalCollapses ?? 0;
  state.collapseStreak = s.collapseStreak ?? 0;
  state.entropyBarriers = s.entropyBarriers ?? 0;
  state._barrierActiveUntil = s._barrierActiveUntil ?? 0;

  // ---- v2.0 维度系统字段（兼容旧存档）----
  state.currentDimension = (s.currentDimension ?? 0) as GameState['currentDimension'];
  if (s.dimensionStates) {
    for (const [idStr, ds] of Object.entries(s.dimensionStates)) {
      state.dimensionStates.set(Number(idStr), {
        id: ds.id as DimensionId,
        unlocked: ds.unlocked,
        master: ds.master,
        resource: new Decimal(ds.resource ?? 0),
        crystals: ds.crystals ?? 0,
        maxNumber: new Decimal(ds.maxNumber ?? 0),
      });
    }
  }
  state.dimensionCrystals = s.dimensionCrystals ? new Decimal(s.dimensionCrystals) : new Decimal(0);
  state._chaosMultiplier = s._chaosMultiplier ?? 1.0;
  state._singularityBurstActive = s._singularityBurstActive ?? false;
  state._singularityBurstEndsAt = s._singularityBurstEndsAt ?? 0;
  state.purchasedCrystalUpgrades = new Set(s.purchasedCrystalUpgrades ?? []);

  // ---- 事件系统运行时字段 ----
  state.activeEvent = s.activeEvent ?? null;
  state.ongoingEffects = s.ongoingEffects ?? [];
  state.downedProducers = s.downedProducers
    ? new Map(Object.entries(s.downedProducers))
    : new Map();

  state.producers = recordToMap(s.producers, (id, level) => ({ id, level }));
  state.upgrades = recordToMap(s.upgrades, (id, level) => ({ id, level }));
  state.stardustUpgrades = recordToMap(s.stardustUpgrades, (id, level) => ({ id, level }));
  state.expansionUpgrades = recordToMap(s.expansionUpgrades ?? {}, (id, level) => ({ id, level }));
  state.transcendUpgrades = recordToMap(s.transcendUpgrades ?? {}, (id, level) => ({ id, level }));
  state.techTree = recordToMap(s.techTree ?? {}, (id, unlocked) => ({ id, unlocked }));

  state.currentEpoch = s.currentEpoch;
  state.unlockedProducers = new Set(s.unlockedProducers);
  state.lastTickTime = s.lastTickTime;
  state.gameStartTime = s.gameStartTime;
  state.totalClicks = s.totalClicks ?? 0;
  state.totalManualEarnings = s.totalManualEarnings ? new Decimal(s.totalManualEarnings) : new Decimal(0);

  // 成就（兼容旧存档：若无 achievements 字段则保持空 Map，由 initAchievements 补全）
  if (s.achievements) {
    for (const [id, ts] of Object.entries(s.achievements)) {
      state.achievements.set(id, { id, unlocked: true, unlockedAt: ts });
    }
  }

  // 因子系统
  if (s.factors) {
    for (const [id, data] of Object.entries(s.factors)) {
      state.factors.set(id, { id, level: data.level, active: data.active });
    }
  }
  state.lastMagnitude = s.lastMagnitude ?? -1;

  // 挑战系统
  if (s.challenges) {
    for (const [id, data] of Object.entries(s.challenges)) {
      const cs = state.challenges.get(id) ?? { id, progress: 0, completed: false, claimed: false };
      cs.progress = data.progress ?? cs.progress;
      cs.completed = data.completed ?? cs.completed;
      cs.claimed = data.claimed ?? cs.claimed;
      state.challenges.set(id, cs);
    }
  }

  // 已完成里程碑集合
  if (s.completedMilestones) {
    for (const id of s.completedMilestones) {
      state.completedMilestones.add(id);
    }
  }

  state.lastTimedChallengeTime = s.lastTimedChallengeTime ?? 0;
  state.eventCooldown = s.eventCooldown ?? 0;
  state.timeSpeedMultiplier = s.timeSpeedMultiplier ?? 1;
  state.tutorialStep = s.tutorialStep ?? -1;

  // ---- v2.0 基因进化系统字段（兼容旧存档：缺失则初始化默认空链） ----
  state.geneChain = deserializeGeneChain(s.geneChain);

  // ---- v2.0 宇宙档案馆字段（兼容旧存档：缺失则使用默认值） ----
  state.archiveUnlocked = s.archiveUnlocked ?? false;
  state._runStartTime = s._runStartTime ?? 0;
  state._runMaxNumber = s._runMaxNumber ? new Decimal(s._runMaxNumber) : new Decimal(0);
  state._runDimensionDwell = s._runDimensionDwell ?? {};
  state._runDimensionsVisited = new Set(s._runDimensionsVisited ?? []);
  state._runEventCount = s._runEventCount ?? 0;
  state._runMaxEntropy = s._runMaxEntropy ?? 0;
  state._runCollapses = s._runCollapses ?? 0;
  state._runSingularityBurst = s._runSingularityBurst ?? false;
  state._runStardustEarned = s._runStardustEarned ?? 0;
  state._runDarkEnergyEarned = s._runDarkEnergyEarned ?? 0;

  // ---- v2.0 数字神话图鉴字段（Sprint 3，兼容旧存档：缺失则默认空 Map / false / 0） ----
  state.codexEntries = s.codexEntries
    ? new Map(
        Object.entries(s.codexEntries).map(([id, es]) => [
          id,
          { id, unlocked: es.unlocked, unlockedAt: es.unlockedAt },
        ]),
      )
    : new Map();
  state.codexInitialized = s.codexInitialized ?? false;
  // ---- 跨系统联动追踪字段（8 个，缺失则默认空/0/false） ----
  state.collapsedDimensions = new Set(s.collapsedDimensions ?? []);
  state._chaosStreak4x = s._chaosStreak4x ?? 0;
  state._prestigeDuringBurst = s._prestigeDuringBurst ?? false;
  state._archiveRecordCount = s._archiveRecordCount ?? 0;
  state._rewindUsedCount = s._rewindUsedCount ?? 0;
  state._expandedInChaosDim = s._expandedInChaosDim ?? false;
  state._singularityBurstEver = s._singularityBurstEver ?? false;
  state._allGeneTypesEver = new Set(s.allGeneTypesEver ?? []);

  return state;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 序列化维度状态 Map（Decimal 字段转为 string）
 */
function serializeDimensionStates(
  dimensionStates: Map<number, import('@/types/game').DimensionState>,
): Record<number, import('@/types/save').SerializedDimensionState> {
  const record: Record<number, import('@/types/save').SerializedDimensionState> = {};
  for (const [id, ds] of dimensionStates) {
    record[id] = {
      id: ds.id,
      unlocked: ds.unlocked,
      master: ds.master,
      resource: ds.resource.toString(),
      crystals: ds.crystals,
      maxNumber: ds.maxNumber.toString(),
    };
  }
  return record;
}

/**
 * Map → Record
 * @param map 源Map
 * @param valueExtractor 从值中提取需要序列化的部分
 */
function mapToRecord<V, R>(
  map: Map<string, V>,
  valueExtractor: (value: V) => R,
): Record<string, R> {
  const record: Record<string, R> = {};
  for (const [key, value] of map) {
    record[key] = valueExtractor(value);
  }
  return record;
}

/**
 * Record → Map
 * @param record 源Record
 * @param valueFactory 从key和值创建Map中的值对象
 */
function recordToMap<R, V>(
  record: Record<string, R>,
  valueFactory: (key: string, value: R) => V,
): Map<string, V> {
  const map = new Map<string, V>();
  for (const [key, value] of Object.entries(record)) {
    map.set(key, valueFactory(key, value));
  }
  return map;
}

/**
 * 序列化成就 Map：只保存已解锁的条目（id→unlockedAt timestamp）
 */
function serializeAchievements(
  achievements: Map<string, AchievementState>,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, ach] of achievements) {
    if (ach.unlocked) {
      result[id] = ach.unlockedAt ?? Date.now();
    }
  }
  return result;
}

/**
 * 序列化基因链状态（无 Decimal，纯字段直写）
 */
function serializeGeneChain(
  chain: import('@/types/game').GeneChainState,
): import('@/types/save').SerializedGeneChainState {
  return {
    chain: chain.chain.map((g) => ({
      instanceId: g.instanceId,
      type: g.type,
      level: g.level,
      expression: g.expression,
      entangledProducers: g.entangledProducers ? [...g.entangledProducers] : undefined,
      mutationSeed: g.mutationSeed,
      memoryRecord: g.memoryRecord,
      obtainedAt: g.obtainedAt,
      lastMutatedAt: g.lastMutatedAt,
    })),
    maxSlots: chain.maxSlots,
    expansionCount: chain.expansionCount,
    totalMutations: chain.totalMutations,
    totalRecombinations: chain.totalRecombinations,
    totalPrunings: chain.totalPrunings,
    historicalMaxNumber: chain.historicalMaxNumber,
    pendingScreen: chain.pendingScreen,
    pendingStash: chain.pendingStash.map((g) => ({
      instanceId: g.instanceId,
      type: g.type,
      level: g.level,
      expression: g.expression,
      entangledProducers: g.entangledProducers ? [...g.entangledProducers] : undefined,
      mutationSeed: g.mutationSeed,
      memoryRecord: g.memoryRecord,
      obtainedAt: g.obtainedAt,
      lastMutatedAt: g.lastMutatedAt,
    })),
  };
}

/**
 * 反序列化基因链状态（兼容旧存档：缺失则初始化默认空链）
 */
function deserializeGeneChain(
  s: import('@/types/save').SerializedGeneChainState | undefined,
): import('@/types/game').GeneChainState {
  if (!s) {
    return {
      chain: [],
      maxSlots: 3,
      expansionCount: 0,
      totalMutations: 0,
      totalRecombinations: 0,
      totalPrunings: 0,
      historicalMaxNumber: '0',
      pendingScreen: false,
      pendingStash: [],
    };
  }
  return {
    chain: (s.chain ?? []).map((g) => ({
      instanceId: g.instanceId,
      type: g.type,
      level: g.level,
      expression: g.expression ?? 1.0,
      entangledProducers: g.entangledProducers ? [...g.entangledProducers] : undefined,
      mutationSeed: g.mutationSeed,
      memoryRecord: g.memoryRecord,
      obtainedAt: g.obtainedAt,
      lastMutatedAt: g.lastMutatedAt,
    })),
    maxSlots: s.maxSlots ?? 3,
    expansionCount: s.expansionCount ?? 0,
    totalMutations: s.totalMutations ?? 0,
    totalRecombinations: s.totalRecombinations ?? 0,
    totalPrunings: s.totalPrunings ?? 0,
    historicalMaxNumber: s.historicalMaxNumber ?? '0',
    pendingScreen: s.pendingScreen ?? false,
    pendingStash: (s.pendingStash ?? []).map((g) => ({
      instanceId: g.instanceId,
      type: g.type,
      level: g.level,
      expression: g.expression ?? 1.0,
      entangledProducers: g.entangledProducers ? [...g.entangledProducers] : undefined,
      mutationSeed: g.mutationSeed,
      memoryRecord: g.memoryRecord,
      obtainedAt: g.obtainedAt,
      lastMutatedAt: g.lastMutatedAt,
    })),
  };
}
