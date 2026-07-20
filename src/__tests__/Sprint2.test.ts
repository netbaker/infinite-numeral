import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  GameState,
  type ArchiveRecord,
  type GeneType,
  type GeneState,
} from '@/types/game';
import {
  captureRun,
  enforceCapacity,
  evaluateSpecialAchievements,
  compareRecords,
  computeSummary,
  determineMilestone,
  MAX_ARCHIVE_RECORDS,
} from '@/systems/ArchiveSystem';
import { TranscendSystem } from '@/systems/TranscendSystem';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { ExpansionSystem } from '@/systems/ExpansionSystem';

/**
 * Sprint 2 测试工厂：构造一轮"已完成"的运行状态，便于断言快照采集正确性。
 */
function gene(type: GeneType, level: number): GeneState {
  return { instanceId: `${type}_${level}`, type, level, expression: 1, mutationSeed: 1, obtainedAt: 0 };
}

function makeRunState(opts: {
  transcendCount?: number;
  maxNumber?: string;
  dimensions?: number[];
  dwell?: Record<number, number>;
  collapses?: number;
  burst?: boolean;
} = {}): GameState {
  const s = new GameState();
  s.transcendCount = opts.transcendCount ?? 4;
  // number 与 _runMaxNumber 同步（Prestige/Expansion 的奇点/暗能量收益按当前 number 计算）
  s.number = new Decimal(opts.maxNumber ?? '1e60');
  s._runMaxNumber = new Decimal(opts.maxNumber ?? '1e60');
  s._runStartTime = 1_000_000;
  s._runDimensionsVisited = new Set(opts.dimensions ?? [0, 1]);
  s._runDimensionDwell = opts.dwell ?? { 0: 10, 1: 30 };
  s._runEventCount = 7;
  s._runCollapses = opts.collapses ?? 0;
  s._runSingularityBurst = opts.burst ?? false;
  s._runMaxEntropy = 50;
  s._runStardustEarned = 12;
  s._runDarkEnergyEarned = 5;
  s.prestigeCount = 3;
  s.expansionCount = 2;
  s.currentEpoch = 'construct';
  s.geneChain.chain = [gene('gene_growth', 2), gene('gene_catalyst', 1)];
  return s;
}

/** 构造一条最小可用的 ArchiveRecord（便于对比/容量/里程碑测试） */
function baseRec(runId: string, over: Partial<ArchiveRecord> = {}): ArchiveRecord {
  return {
    runId,
    transcendCount: 5,
    maxNumber: '1e50',
    maxLog10: 50,
    runDuration: 100,
    dimensionsVisited: [0, 1],
    primaryDimension: 0,
    prestigeCount: 1,
    expansionCount: 1,
    eventsTriggered: 1,
    collapsesTriggered: 0,
    maxEntropy: 30,
    geneChainSnapshot: [],
    stardustEarned: 1,
    darkEnergyEarned: 1,
    singularityEarned: 1,
    timestamp: 1000,
    epochReached: 'sprout',
    isMilestone: false,
    ...over,
  };
}

// ============================================================
// Story 2.1.2 — 快照采集 captureRun
// ============================================================
describe('Story 2.1.2 — 快照采集 captureRun', () => {
  it('transcendCount 递增 + runId 格式 + maxLog10 计算', () => {
    const s = makeRunState({ transcendCount: 4, maxNumber: '1e120' });
    const rec = captureRun(s, { existingRecords: [], singularityEarned: 9 });
    expect(rec.transcendCount).toBe(5);
    expect(rec.runId).toMatch(/^run_5_\d+$/);
    expect(rec.maxLog10).toBeCloseTo(120, 5);
    expect(rec.maxNumber).toBe('1e120');
    expect(rec.singularityEarned).toBe(9);
  });

  it('primaryDimension 取停留最久维度', () => {
    const s = makeRunState();
    s._runDimensionDwell = { 0: 10, 1: 30, 2: 5 }; // dim 1 最久
    const rec = captureRun(s, { existingRecords: [], singularityEarned: 0 });
    expect(rec.primaryDimension).toBe(1);
  });

  it('dimensionsVisited 升序去重', () => {
    const s = makeRunState({ dimensions: [2, 0, 1, 1] });
    const rec = captureRun(s, { existingRecords: [], singularityEarned: 0 });
    expect(rec.dimensionsVisited).toEqual([0, 1, 2]);
  });

  it('geneChainSnapshot 仅含 type+level', () => {
    const s = makeRunState();
    const rec = captureRun(s, { existingRecords: [], singularityEarned: 0 });
    expect(rec.geneChainSnapshot).toEqual([
      { type: 'gene_growth', level: 2 },
      { type: 'gene_catalyst', level: 1 },
    ]);
  });

  it('runDuration 由 _runStartTime 计算（秒）', () => {
    const s = makeRunState();
    s._runStartTime = 1_000_000;
    const rec = captureRun(s, { existingRecords: [], singularityEarned: 0, now: 1_000_000 + 250_000 }); // 250s
    expect(rec.runDuration).toBeCloseTo(250, 1);
  });

  it('maxLog10 对 0 / 负值安全返回 0（GDD §6 边缘 #4）', () => {
    const s = makeRunState({ maxNumber: '0' });
    const rec = captureRun(s, { existingRecords: [], singularityEarned: 0 });
    expect(rec.maxLog10).toBe(0);
  });

  it('本轮 Prestige/Expansion 次数取 pre-reset 累计值', () => {
    const s = makeRunState();
    s.prestigeCount = 8;
    s.expansionCount = 4;
    const rec = captureRun(s, { existingRecords: [], singularityEarned: 0 });
    expect(rec.prestigeCount).toBe(8);
    expect(rec.expansionCount).toBe(4);
  });
});

// ============================================================
// Story 2.1.3 — 里程碑判定 determineMilestone
// ============================================================
describe('Story 2.1.3 — 里程碑判定 determineMilestone', () => {
  it('首超 (transcendCount=1) 为里程碑', () => {
    expect(determineMilestone(1, 10, [])).toBe(true);
  });

  it('第 5/10/25/50/100 次为里程碑', () => {
    expect(determineMilestone(5, 10, [])).toBe(true);
    expect(determineMilestone(10, 10, [])).toBe(true);
    expect(determineMilestone(25, 10, [])).toBe(true);
    expect(determineMilestone(50, 10, [])).toBe(true);
    expect(determineMilestone(100, 10, [])).toBe(true);
  });

  it('普通次数 (2/3/4/6/7) 非里程碑', () => {
    expect(determineMilestone(2, 10, [])).toBe(false);
    expect(determineMilestone(6, 10, [])).toBe(false);
    expect(determineMilestone(7, 10, [])).toBe(false);
  });

  it('maxLog10 首次突破 50/100/200/300 为里程碑', () => {
    expect(determineMilestone(6, 100, [])).toBe(true); // 首次突破 100
    const existing = [baseRec('run_5_1', { maxLog10: 150 })];
    // 已有记录突破过 100 → 不再标记
    expect(determineMilestone(6, 100, existing)).toBe(false);
  });

  it('未达阈值时不因次数外的条件误判', () => {
    // 次数 6、maxLog10 仅 40（< 50 门槛）→ 非里程碑
    expect(determineMilestone(6, 40, [])).toBe(false);
  });
});

// ============================================================
// Story 2.1.3 — 超越解锁 & 成就保留（通过 TranscendSystem 验证）
// ============================================================
describe('Story 2.1.3 — 超越解锁 & 成就保留', () => {
  const ts = new TranscendSystem();

  it('transcendCount>=5 时 archiveUnlocked 置 true', () => {
    const s = new GameState();
    s.transcendCount = 4;
    const ns = ts.executeTranscend(s);
    expect(ns.transcendCount).toBe(5);
    expect(ns.archiveUnlocked).toBe(true);
  });

  it('transcendCount<5 时不解锁', () => {
    const s = new GameState();
    s.transcendCount = 2;
    const ns = ts.executeTranscend(s);
    expect(ns.archiveUnlocked).toBe(false);
  });

  it('已解锁状态在超越后保留', () => {
    const s = new GameState();
    s.transcendCount = 10;
    s.archiveUnlocked = true;
    const ns = ts.executeTranscend(s);
    expect(ns.archiveUnlocked).toBe(true);
  });

  it('成就在超越后保留（避免档案特殊成就重复发奖，Story 2.2.2）', () => {
    const s = new GameState();
    s.transcendCount = 10;
    s.achievements.set('arch_prime_e100', { id: 'arch_prime_e100', unlocked: true, unlockedAt: 1 });
    const ns = ts.executeTranscend(s);
    expect(ns.achievements.get('arch_prime_e100')?.unlocked).toBe(true);
  });

  it('_run* 在超越后重置为新 Run（_runStartTime 更新、_runStardustEarned 归零）', () => {
    const s = new GameState();
    s.transcendCount = 4;
    s._runStartTime = 1;
    s._runMaxNumber = new Decimal('1e999');
    s._runStardustEarned = 99;
    const ns = ts.executeTranscend(s);
    expect(ns._runStartTime).toBeGreaterThan(1); // 已更新为当前时间
    expect(ns._runStardustEarned).toBe(0); // 新 Run 重置
    expect(ns._runMaxNumber.gt(0)).toBe(true); // 新 Run 起点数字
  });
});

// ============================================================
// Story 2.1.2 — Prestige / Expansion 保留 _run* 计数器
// ============================================================
describe('Story 2.1.2 — Prestige/Expansion 保留 _run* 计数器', () => {
  it('Prestige 累加 _runStardustEarned 并保留其他 _run*', () => {
    const ps = new PrestigeSystem();
    const s = makeRunState({ transcendCount: 4, maxNumber: '1e60' });
    s._runStardustEarned = 10;
    const ns = ps.executePrestige(s);
    // 1e60 → log10=60 → floor(60*0.5)=30
    expect(ns._runStardustEarned).toBe(40);
    expect(ns._runDarkEnergyEarned).toBe(s._runDarkEnergyEarned);
    expect(ns._runMaxNumber.toString()).toBe(s._runMaxNumber.toString());
    expect(ns.archiveUnlocked).toBe(s.archiveUnlocked);
  });

  it('Expansion 累加 _runDarkEnergyEarned 并保留其他 _run*', () => {
    const es = new ExpansionSystem();
    const s = makeRunState();
    s.cumulativeStardust = 1000; // 满足膨胀阈值
    s._runDarkEnergyEarned = 3;
    const ns = es.executeExpansion(s);
    // log10(1000)=3 → floor(3*0.5)=1
    expect(ns._runDarkEnergyEarned).toBe(4);
    expect(ns._runStardustEarned).toBe(s._runStardustEarned);
    expect(ns._runMaxNumber.toString()).toBe(s._runMaxNumber.toString());
  });
});

// ============================================================
// Story 2.2.1 — 容量控制 enforceCapacity
// ============================================================
describe('Story 2.2.1 — 容量控制 enforceCapacity', () => {
  it('不超过上限时不删', () => {
    const recs = Array.from({ length: 10 }, (_, i) => baseRec(`run_${i}_1`, { isMilestone: false }));
    expect(enforceCapacity(recs).length).toBe(10);
  });

  it('超上限删除最早非里程碑，保留里程碑', () => {
    const recs = Array.from({ length: MAX_ARCHIVE_RECORDS + 5 }, (_, i) =>
      baseRec(`run_${i}_1`, { isMilestone: i === 0, timestamp: i }), // 第 0 个为最旧里程碑
    );
    const trimmed = enforceCapacity(recs);
    expect(trimmed.length).toBeLessThanOrEqual(MAX_ARCHIVE_RECORDS);
    expect(trimmed.some((r) => r.runId === 'run_0_1')).toBe(true); // 里程碑保留
  });

  it('全里程碑时允许超过上限（GDD §6 边缘 #2）', () => {
    const recs = Array.from({ length: MAX_ARCHIVE_RECORDS + 3 }, (_, i) =>
      baseRec(`run_${i}_1`, { isMilestone: true, timestamp: i }),
    );
    const trimmed = enforceCapacity(recs);
    expect(trimmed.length).toBe(MAX_ARCHIVE_RECORDS + 3);
  });

  it('返回结果按时间倒序', () => {
    const recs = Array.from({ length: 20 }, (_, i) =>
      baseRec(`run_${i}_1`, { timestamp: i }),
    );
    const trimmed = enforceCapacity(recs);
    for (let i = 1; i < trimmed.length; i++) {
      expect(trimmed[i - 1].timestamp).toBeGreaterThanOrEqual(trimmed[i].timestamp);
    }
  });
});

// ============================================================
// Story 2.2.2 — 特殊成就 evaluateSpecialAchievements
// ============================================================
describe('Story 2.2.2 — 特殊成就 evaluateSpecialAchievements', () => {
  function freshState(): GameState {
    const s = makeRunState();
    s.achievements = new Map();
    return s;
  }

  it('arch_prime_e100：访问 Dim-1 且 maxLog10>=100', () => {
    const s = freshState();
    const rec = baseRec('run_5_1', { dimensionsVisited: [0, 1], maxLog10: 120 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_prime_e100');
  });

  it('arch_chaos_survivor：访问 Dim-2 且 maxLog10>=80', () => {
    const s = freshState();
    const rec = baseRec('run_5_1', { dimensionsVisited: [0, 2], maxLog10: 90 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_chaos_survivor');
  });

  it('arch_anti_entropy_master：访问 Dim-3 且 0 次熵崩', () => {
    const s = freshState();
    const rec = baseRec('run_5_1', { dimensionsVisited: [0, 3], collapsesTriggered: 0 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_anti_entropy_master');
  });

  it('arch_singularity_burst：访问 Dim-4 且 maxLog10>=300', () => {
    const s = freshState();
    const rec = baseRec('run_5_1', { dimensionsVisited: [0, 4], maxLog10: 320 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_singularity_burst');
  });

  it('arch_speedrun：单轮 <300s 且 maxLog10>=50', () => {
    const s = freshState();
    const rec = baseRec('run_5_1', { runDuration: 120, maxLog10: 60 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_speedrun');
  });

  it('arch_marathon：单轮 >86400s', () => {
    const s = freshState();
    const rec = baseRec('run_5_1', { runDuration: 90000 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_marathon');
  });

  it('arch_no_collapse：0 次熵崩 且 maxLog10>=100', () => {
    const s = freshState();
    const rec = baseRec('run_5_1', { collapsesTriggered: 0, maxLog10: 120 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_no_collapse');
  });

  it('arch_centurion：transcendCount>=100', () => {
    const s = freshState();
    const rec = baseRec('run_100_1', { transcendCount: 100 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_centurion');
  });

  it('arch_gene_collector：单轮集齐 8 种基因类型', () => {
    const s = freshState();
    const allTypes: GeneType[] = [
      'gene_growth', 'gene_catalyst', 'gene_resilience', 'gene_resonance',
      'gene_mutation', 'gene_memory', 'gene_entangle', 'gene_exotic',
    ];
    const rec = baseRec('run_5_1', { geneChainSnapshot: allTypes.map((t) => ({ type: t, level: 1 })) });
    expect(evaluateSpecialAchievements(s, rec, [rec])).toContain('arch_gene_collector');
  });

  it('已解锁成就不重复返回', () => {
    const s = freshState();
    s.achievements.set('arch_speedrun', { id: 'arch_speedrun', unlocked: true, unlockedAt: 1 });
    const rec = baseRec('run_5_1', { runDuration: 120, maxLog10: 60 });
    expect(evaluateSpecialAchievements(s, rec, [rec])).not.toContain('arch_speedrun');
  });
});

// ============================================================
// Story 2.2.3 — 数据对比 compareRecords
// ============================================================
describe('Story 2.2.3 — 数据对比 compareRecords', () => {
  it('返回 maxLog10 / runDuration / prestigeCount / eventsTriggered / geneChain', () => {
    const a = baseRec('run_5_1', {
      maxLog10: 100, runDuration: 200, prestigeCount: 3, eventsTriggered: 5,
      geneChainSnapshot: [{ type: 'gene_growth', level: 1 }],
    });
    const b = baseRec('run_6_1', {
      maxLog10: 50, runDuration: 100, prestigeCount: 1, eventsTriggered: 2,
      geneChainSnapshot: [{ type: 'gene_catalyst', level: 2 }],
    });
    const c = compareRecords(a, b);
    expect(c.maxLog10.a).toBe(100);
    expect(c.maxLog10.b).toBe(50);
    expect(c.maxLog10.max).toBe(100);
    expect(c.runDuration.a).toBe(200);
    expect(c.runDuration.b).toBe(100);
    expect(c.runDuration.efficiencyA).toBeCloseTo(0.5);
    expect(c.runDuration.efficiencyB).toBeCloseTo(0.5);
    expect(c.prestigeCount).toEqual({ a: 3, b: 1 });
    expect(c.eventsTriggered).toEqual({ a: 5, b: 2 });
    expect(c.geneChain.a[0].type).toBe('gene_growth');
    expect(c.geneChain.b[0].type).toBe('gene_catalyst');
  });
});

// ============================================================
// Story 2.3 — 统计摘要 computeSummary
// ============================================================
describe('Story 2.3 — 统计摘要 computeSummary', () => {
  it('空列表返回零值', () => {
    const s = computeSummary([]);
    expect(s.totalRuns).toBe(0);
    expect(s.allTimeMaxLog10).toBe(0);
    expect(s.fastestRun).toBeNull();
    expect(s.longestRun).toBeNull();
  });

  it('聚合 maxLog10 / playTime / collapses / dimensionUsage', () => {
    const recs = [
      baseRec('run_5_1', { maxLog10: 100, runDuration: 200, collapsesTriggered: 1, primaryDimension: 1, transcendCount: 5 }),
      baseRec('run_6_1', { maxLog10: 50, runDuration: 100, collapsesTriggered: 2, primaryDimension: 1, transcendCount: 6 }),
      baseRec('run_7_1', { maxLog10: 80, runDuration: 400, collapsesTriggered: 0, primaryDimension: 2, transcendCount: 7 }),
    ];
    const s = computeSummary(recs);
    expect(s.totalRuns).toBe(3);
    expect(s.allTimeMaxLog10).toBe(100);
    expect(s.totalPlayTime).toBe(700);
    expect(s.totalCollapses).toBe(3);
    expect(s.totalTranscends).toBe(7);
    expect(s.dimensionUsage[1]).toBe(2);
    expect(s.dimensionUsage[2]).toBe(1);
    // 最快 Run：效率 run_5_1=0.5 / run_6_1=0.5 / run_7_1=0.2，取首个最高 → run_5_1
    expect(s.fastestRun?.runId).toBe('run_5_1');
    // 最长 Run：run_7_1 (400s)
    expect(s.longestRun?.runId).toBe('run_7_1');
  });
});
