import Decimal from 'break_eternity.js';
import { GameState } from '@/types/game';
import type { AchievementState } from '@/types/game';
import type { SaveData, SerializedState } from '@/types/save';

/** 当前存档版本号 */
const CURRENT_VERSION = 2;

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

  return state;
}

// ============================================================
// 辅助函数
// ============================================================

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
