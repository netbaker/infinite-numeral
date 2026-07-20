import Decimal from 'break_eternity.js';
import { BigNumber } from '@/core/BigNumber';
import {
  GameState,
  type ArchiveRecord,
  type GeneSnapshot,
  type ArchiveSummary,
  type GeneType,
  type CompareResult,
} from '@/types/game';

/**
 * 宇宙档案馆系统（v2.0 — Archive）
 *
 * 所有采集/判定/对比逻辑均为纯函数，不触碰 IndexedDB / Vue，便于单测。
 * 快照的持久化（写入 `archives` Dexie 独立表）由 gameStore 编排，本系统只负责数据计算。
 *
 * 设计依据：GDD archive-system.md §2.2~2.5 + ADR-002（A1 独立表 / A2 字段集 / A3 轻量快照 / A4 runId）。
 */

/** 里程碑 Transcend 次数（首超 + 5/10/25/50/100） */
const MILESTONE_TRANSCEND_COUNTS = new Set<number>([1, 5, 10, 25, 50, 100]);

/** 里程碑 maxLog10 首次突破阈值 */
const MILESTONE_LOG10_THRESHOLDS = [50, 100, 200, 300];

/** 快照最大保留数量（超出自动删除最早非里程碑） */
export const MAX_ARCHIVE_RECORDS = 100;

/** 全部 8 种基因类型（用于 arch_gene_collector 跨轮累积判定） */
const ALL_GENE_TYPES: GeneType[] = [
  'gene_growth', 'gene_catalyst', 'gene_resilience', 'gene_resonance',
  'gene_mutation', 'gene_memory', 'gene_entangle', 'gene_exotic',
];

/** 9 个特殊成就 id（与 Constants.ACHIEVEMENT_DEFS 中新增的档案成就对应） */
export const ARCHIVE_ACHIEVEMENT_IDS = [
  'arch_prime_e100',
  'arch_chaos_survivor',
  'arch_anti_entropy_master',
  'arch_singularity_burst',
  'arch_speedrun',
  'arch_marathon',
  'arch_no_collapse',
  'arch_gene_collector',
  'arch_centurion',
];

/** 采集选项 */
export interface CaptureOptions {
  /** 已有快照（用于里程碑"首次突破"判定，不含本次） */
  existingRecords: ArchiveRecord[];
  /** 本次 Transcend 获得的奇点数（由 TranscendSystem 计算后注入） */
  singularityEarned: number;
  /** 注入时间戳（测试用，默认 Date.now()） */
  now?: number;
}

/**
 * 安全计算 log10：value <= 0 或非法时返回 0（对齐 GDD §6 边缘情况 #4：数字为 0 → maxLog10 记录为 0）
 */
function safeLog10(value: Decimal): number {
  try {
    const n = BigNumber.from(value).log10().toDecimal().toNumber();
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  } catch {
    return 0;
  }
}

/**
 * 由各维度停留时长累计计算 primaryDimension（停留最久的维度）
 */
function computePrimaryDimension(dwell: Record<number, number>): number {
  let best = 0;
  let bestTime = -1;
  for (const key of Object.keys(dwell)) {
    const dim = Number(key);
    const t = dwell[dim] ?? 0;
    if (t > bestTime) {
      bestTime = t;
      best = dim;
    }
  }
  return bestTime > 0 ? best : 0;
}

/**
 * 判定是否为里程碑快照（对齐 GDD §2.3：首超、5/10/25/50/100 次、首次突破 50/100/200/300）
 */
export function determineMilestone(
  transcendCount: number,
  maxLog10: number,
  existingRecords: ArchiveRecord[],
): boolean {
  // 第 1 次 Transcend（首超）
  if (transcendCount === 1) return true;
  // 第 5/10/25/50/100 次 Transcend
  if (MILESTONE_TRANSCEND_COUNTS.has(transcendCount)) return true;
  // maxLog10 首次突破 50/100/200/300 的 Run
  for (const threshold of MILESTONE_LOG10_THRESHOLDS) {
    if (maxLog10 >= threshold) {
      const alreadyBroken = existingRecords.some((r) => r.maxLog10 >= threshold);
      if (!alreadyBroken) return true;
    }
  }
  return false;
}

/**
 * 采集本轮运行快照。
 *
 * ⚠️ 必须在 Transcend 重置逻辑**之前**调用（读取 pre-reset state）。
 *
 * @param state 当前（pre-reset）游戏状态
 * @param opts 已有快照 + 本次 Transcend 奇点收益 + 可选时间戳
 */
export function captureRun(state: GameState, opts: CaptureOptions): ArchiveRecord {
  const now = opts.now ?? Date.now();
  const newTranscendCount = state.transcendCount + 1;
  const maxNumber = state._runMaxNumber.toString();
  const maxLog10 = safeLog10(state._runMaxNumber);
  const runDuration = Math.max(0, (now - state._runStartTime) / 1000);

  const dimensionsVisited = Array.from(state._runDimensionsVisited).sort((a, b) => a - b);
  const primaryDimension = computePrimaryDimension(state._runDimensionDwell);

  // 轻量基因链快照（仅 type+level，对齐 ADR-002 A3）
  const geneChainSnapshot: GeneSnapshot[] = state.geneChain.chain.map((g) => ({
    type: g.type,
    level: g.level,
  }));

  // 本轮 Prestige/Expansion 次数 = 当前累计值（Transcend 会清零，故 pre-reset 即本轮值）
  const prestigeCount = state.prestigeCount;
  const expansionCount = state.expansionCount;

  const isMilestone = determineMilestone(newTranscendCount, maxLog10, opts.existingRecords);

  return {
    runId: `run_${newTranscendCount}_${now}`,
    transcendCount: newTranscendCount,
    maxNumber,
    maxLog10,
    runDuration,
    dimensionsVisited,
    primaryDimension,
    prestigeCount,
    expansionCount,
    eventsTriggered: state._runEventCount,
    collapsesTriggered: state._runCollapses,
    maxEntropy: state._runMaxEntropy,
    geneChainSnapshot,
    stardustEarned: state._runStardustEarned,
    darkEnergyEarned: state._runDarkEnergyEarned,
    singularityEarned: opts.singularityEarned,
    timestamp: now,
    epochReached: state.currentEpoch,
    isMilestone,
  };
}

/**
 * 快照存储容量控制：最多保留 MAX_ARCHIVE_RECORDS 张，超出删除最早的非里程碑快照。
 *
 * - 里程碑快照不可删除（保留全部）
 * - 100 张全是里程碑时不删除，允许超过上限（GDD §6 边缘情况 #2）
 *
 * @param records 当前全部快照（任意顺序）
 * @returns 控制容量后的快照列表（按时间倒序）
 */
export function enforceCapacity(records: ArchiveRecord[]): ArchiveRecord[] {
  // 始终按时间倒序返回（与 getArchiveRecords 默认顺序一致，见文档注释）
  if (records.length <= MAX_ARCHIVE_RECORDS) {
    return [...records].sort((a, b) => b.timestamp - a.timestamp);
  }

  // 按时间升序（最旧在前）处理
  const sorted = [...records].sort((a, b) => a.timestamp - b.timestamp);
  const milestones = sorted.filter((r) => r.isMilestone);

  // 100 张全是里程碑：不删除，允许超过上限（仍按时间倒序）
  if (milestones.length >= MAX_ARCHIVE_RECORDS) {
    return sorted.sort((a, b) => b.timestamp - a.timestamp);
  }

  const nonMilestones = sorted.filter((r) => !r.isMilestone);
  const slotsForNon = MAX_ARCHIVE_RECORDS - milestones.length;
  // 保留最近的 nonMilestones（末尾 slotsForNon 张），删除最早的
  const keptNon = nonMilestones.slice(Math.max(0, nonMilestones.length - slotsForNon));

  // 保持时间倒序返回（与 getArchiveRecords 默认顺序一致）
  return [...milestones, ...keptNon].sort((a, b) => b.timestamp - a.timestamp);
}

/** 收集全部记录中出现过的基因类型集合（跨多轮累积，用于 arch_gene_collector） */
function collectGeneTypeSet(records: ArchiveRecord[]): Set<GeneType> {
  const set = new Set<GeneType>();
  for (const r of records) {
    for (const g of r.geneChainSnapshot) {
      set.add(g.type);
    }
  }
  return set;
}

/**
 * 检查特殊成就是否满足，返回本次"新解锁"的成就 id 列表（已解锁的不会重复返回）。
 *
 * 由 gameStore 在快照生成后调用，并负责发放奖励（奇点核心）+ Toast。
 * 条件依据 GDD §2.4；arch_singularity_burst 近似为"访问 Dim-4 且 maxLog10 >= 300"
 * （临界爆发触发条件即奇点维度 log10 > 300）。
 *
 * @param state 当前游戏状态（用于读取已解锁成就，避免重复发放）
 * @param record 本次快照
 * @param allRecords 包含本次的全部快照（用于跨轮累积判定 arch_gene_collector）
 */
export function evaluateSpecialAchievements(
  state: GameState,
  record: ArchiveRecord,
  allRecords: ArchiveRecord[],
): string[] {
  const result: string[] = [];
  const allGeneTypes = collectGeneTypeSet([record, ...allRecords]);

  const tryUnlock = (id: string, condition: boolean): void => {
    if (!condition) return;
    const ach = state.achievements.get(id);
    if (!ach?.unlocked) {
      result.push(id);
    }
  };

  // 质数探索者：在质数维度（Dim-1）达到 maxLog10 >= 100
  tryUnlock('arch_prime_e100', record.dimensionsVisited.includes(1) && record.maxLog10 >= 100);
  // 混沌行者：在混沌维度（Dim-2）完成 Transcend 且 maxLog10 >= 80
  tryUnlock('arch_chaos_survivor', record.dimensionsVisited.includes(2) && record.maxLog10 >= 80);
  // 逆熵者：在反熵维度（Dim-3）完成 Transcend 且本轮 0 次熵崩
  tryUnlock('arch_anti_entropy_master', record.dimensionsVisited.includes(3) && record.collapsesTriggered === 0);
  // 临界爆发者：在奇点维度（Dim-4）触发过临界爆发（近似：访问 Dim-4 且 maxLog10 >= 300）
  tryUnlock('arch_singularity_burst', record.dimensionsVisited.includes(4) && record.maxLog10 >= 300);
  // 闪电轮回：单轮 Run < 300s 且 maxLog10 >= 50
  tryUnlock('arch_speedrun', record.runDuration < 300 && record.maxLog10 >= 50);
  // 漫长旅途：单轮 Run > 86400s（24h）
  tryUnlock('arch_marathon', record.runDuration > 86400);
  // 完美轮回：单轮 0 次熵崩且 maxLog10 >= 100
  tryUnlock('arch_no_collapse', record.collapsesTriggered === 0 && record.maxLog10 >= 100);
  // 基因收藏家：跨多轮累积包含全部 8 种基因类型
  tryUnlock('arch_gene_collector', allGeneTypes.size >= ALL_GENE_TYPES.length);
  // 百次超越：Transcend 总次数 >= 100
  tryUnlock('arch_centurion', record.transcendCount >= 100);

  return result;
}

/**
 * 对比两张快照（对齐 GDD §2.5 / §5.3）
 */
export function compareRecords(a: ArchiveRecord, b: ArchiveRecord): CompareResult {
  const efficiency = (r: ArchiveRecord): number =>
    r.runDuration > 0 ? r.maxLog10 / r.runDuration : 0;
  return {
    maxLog10: {
      a: a.maxLog10,
      b: b.maxLog10,
      max: Math.max(a.maxLog10, b.maxLog10, 1),
      diff: Math.abs(a.maxLog10 - b.maxLog10),
    },
    runDuration: {
      a: a.runDuration,
      b: b.runDuration,
      efficiencyA: efficiency(a),
      efficiencyB: efficiency(b),
    },
    prestigeCount: { a: a.prestigeCount, b: b.prestigeCount },
    eventsTriggered: { a: a.eventsTriggered, b: b.eventsTriggered },
    geneChain: { a: a.geneChainSnapshot, b: b.geneChainSnapshot },
  };
}

/**
 * 计算档案馆统计摘要（对齐 GDD §3.1 ArchiveSummary）
 */
export function computeSummary(records: ArchiveRecord[]): ArchiveSummary {
  if (records.length === 0) {
    return {
      totalRuns: 0,
      allTimeMaxLog10: 0,
      totalPlayTime: 0,
      totalTranscends: 0,
      totalCollapses: 0,
      dimensionUsage: {},
      fastestRun: null,
      longestRun: null,
    };
  }

  let allTimeMaxLog10 = 0;
  let totalPlayTime = 0;
  let totalCollapses = 0;
  let totalTranscends = 0;
  const dimensionUsage: Record<number, number> = {};

  for (const r of records) {
    allTimeMaxLog10 = Math.max(allTimeMaxLog10, r.maxLog10);
    totalPlayTime += r.runDuration;
    totalCollapses += r.collapsesTriggered;
    totalTranscends = Math.max(totalTranscends, r.transcendCount);
    dimensionUsage[r.primaryDimension] = (dimensionUsage[r.primaryDimension] ?? 0) + 1;
  }

  // 最快 Run：按效率 maxLog10/runDuration 最高
  let fastestRun: ArchiveRecord | null = null;
  let bestEff = -1;
  // 最长 Run：按持续时间最长
  let longestRun: ArchiveRecord | null = null;
  let bestDur = -1;
  for (const r of records) {
    const eff = r.runDuration > 0 ? r.maxLog10 / r.runDuration : 0;
    if (eff > bestEff) {
      bestEff = eff;
      fastestRun = r;
    }
    if (r.runDuration > bestDur) {
      bestDur = r.runDuration;
      longestRun = r;
    }
  }

  return {
    totalRuns: records.length,
    allTimeMaxLog10,
    totalPlayTime,
    totalTranscends,
    totalCollapses,
    dimensionUsage,
    fastestRun,
    longestRun,
  };
}

/** 单例导出 */
export const archiveSystem = new (class ArchiveSystem {})();
