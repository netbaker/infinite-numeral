import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState } from '@/types/game';
import { serialize, deserialize } from '@/core/Serializer';
import {
  CODEX_DEFS,
  CODEX_TOTAL_BY_CATEGORY,
} from '@/types/codex';
import {
  onNarrativeTriggered,
  evaluateMystery,
  checkAllMysteries,
  getCategoryCounts,
} from '@/systems/CodexSystem';
import { TranscendSystem } from '@/systems/TranscendSystem';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { PRESTIGE_NARRATIVES, PRODUCER_UNLOCK_NARRATIVES } from '@/core/Constants';

/** 全部 8 种基因类型（mystery_05 的 allTypes 判定目标） */
const ALL8_GENES = [
  'gene_growth',
  'gene_catalyst',
  'gene_resilience',
  'gene_resonance',
  'gene_mutation',
  'gene_memory',
  'gene_entangle',
  'gene_exotic',
];

/** 构造带指定基因的 GameState */
function withGenes(
  types: Array<{ type: string; level?: number }>,
): GameState {
  const s = new GameState();
  s.geneChain.chain = types.map((t, i) => ({
    instanceId: `g${i}`,
    type: t.type as any,
    level: t.level ?? 1,
    expression: 1,
    mutationSeed: 1,
    obtainedAt: 1,
  }));
  return s;
}

describe('Sprint 3 数字神话图鉴 — 词条计数', () => {
  it('CODEX_DEFS 总数为 65，分类计数对齐 GDD §2.1', () => {
    expect(CODEX_DEFS.length).toBe(65);
    expect(CODEX_TOTAL_BY_CATEGORY.origin).toBe(15);
    expect(CODEX_TOTAL_BY_CATEGORY.cosmic_event).toBe(20);
    expect(CODEX_TOTAL_BY_CATEGORY.sage_record).toBe(18);
    expect(CODEX_TOTAL_BY_CATEGORY.mystery).toBe(12);
  });

  it('每个未解之谜词条都带有解锁条件与模糊提示', () => {
    const mysteries = CODEX_DEFS.filter((d) => d.category === 'mystery');
    expect(mysteries.length).toBe(12);
    for (const m of mysteries) {
      expect(m.unlockConditions && m.unlockConditions.length).toBeGreaterThan(0);
      expect(m.hiddenHint && m.hiddenHint.length).toBeGreaterThan(0);
    }
  });
});

describe('Sprint 3 自动收录（约束 B 精确文本匹配）', () => {
  it('首次触发叙事文本收录对应词条并去重（二次不重复收录/通知）', () => {
    const state = new GameState();
    const text = PRESTIGE_NARRATIVES[0];

    const first = onNarrativeTriggered(state, text);
    expect(first.length).toBeGreaterThan(0);
    const id = first[0].id;
    expect(state.codexEntries.get(id)?.unlocked).toBe(true);

    // 二次触发相同文本 → 不再收录、不返回新词条（去重）
    const second = onNarrativeTriggered(state, text);
    expect(second.length).toBe(0);
    expect(state.codexEntries.get(id)?.unlocked).toBe(true);
  });

  it('未匹配的叙事文本不收录任何词条', () => {
    const state = new GameState();
    const collected = onNarrativeTriggered(state, '一段不存在的叙事文本xyz');
    expect(collected.length).toBe(0);
    expect(state.codexEntries.size).toBe(0);
  });

  it('不同来源文本各自收录对应词条', () => {
    const state = new GameState();
    const a = onNarrativeTriggered(state, PRESTIGE_NARRATIVES[1]);
    const b = onNarrativeTriggered(state, PRODUCER_UNLOCK_NARRATIVES['producer2']);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    expect(a[0].id).not.toBe(b[0].id);
  });
});

describe('Sprint 3 序列化往返（旧存档兼容）', () => {
  it('含 codexEntries 的状态序列化→反序列化后字段一致', () => {
    const state = new GameState();
    // 收录两条
    onNarrativeTriggered(state, PRESTIGE_NARRATIVES[0]);
    onNarrativeTriggered(state, PRODUCER_UNLOCK_NARRATIVES['producer3']);
    state.codexInitialized = true;
    state.collapsedDimensions.add(1);
    state._chaosStreak4x = 3;
    state._singularityBurstEver = true;

    const data = serialize(state);
    expect(data.version).toBe(4);
    expect(Object.keys(data.state.codexEntries).length).toBe(2);

    const restored = deserialize(data);
    expect(restored.codexEntries.size).toBe(2);
    const ids = [...restored.codexEntries.keys()].sort();
    expect(ids.length).toBe(2);
    expect(restored.codexInitialized).toBe(true);
    expect([...restored.collapsedDimensions]).toContain(1);
    expect(restored._chaosStreak4x).toBe(3);
    expect(restored._singularityBurstEver).toBe(true);
  });

  it('旧存档（无 codexEntries）反序列化不崩溃，图鉴初始化为空 Map', () => {
    // 用真实序列化结果模拟"v3 旧存档"：完整状态但缺失本次新增字段
    const full = serialize(new GameState());
    const legacy: any = {
      version: 3,
      timestamp: full.timestamp,
      state: { ...full.state },
    };
    // 删除 Sprint 3 新增字段，模拟旧版存档
    delete legacy.state.codexEntries;
    delete legacy.state.codexInitialized;
    delete legacy.state.collapsedDimensions;
    delete legacy.state._chaosStreak4x;
    delete legacy.state._prestigeDuringBurst;
    delete legacy.state._archiveRecordCount;
    delete legacy.state._rewindUsedCount;
    delete legacy.state._expandedInChaosDim;
    delete legacy.state._singularityBurstEver;

    const restored = deserialize(legacy);
    expect(restored.codexEntries).toBeInstanceOf(Map);
    expect(restored.codexEntries.size).toBe(0);
    expect(restored.codexInitialized).toBe(false);
    expect(restored.collapsedDimensions).toBeInstanceOf(Set);
    expect(restored._chaosStreak4x).toBe(0);
    expect(restored._singularityBurstEver).toBe(false);
  });
});

describe('Sprint 3 未解之谜解锁逻辑（mystery_01~05）', () => {
  it('mystery_01：质数维度熵崩 + gene_catalyst Lv3 → 解锁', () => {
    const state = withGenes([{ type: 'gene_catalyst', level: 3 }]);
    state.collapsedDimensions.add(1); // 质数维度(Dim-1)熵崩
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_01')!)).toBe(true);

    const unlocked = checkAllMysteries(state);
    expect(unlocked.some((d) => d.id === 'mystery_01')).toBe(true);
    expect(state.codexEntries.get('mystery_01')?.unlocked).toBe(true);
  });

  it('mystery_02：混沌维度连续3次≥4.0x + 完成 Transcend → 解锁', () => {
    const state = new GameState();
    state._chaosStreak4x = 3;
    state.transcendCount = 1;
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_02')!)).toBe(true);

    const unlocked = checkAllMysteries(state);
    expect(unlocked.some((d) => d.id === 'mystery_02')).toBe(true);
  });

  it('mystery_03：反熵维度 0 次熵崩 Run + prestige≥20 + gene_resilience → 解锁', () => {
    const state = withGenes([{ type: 'gene_resilience', level: 1 }]);
    state.currentDimension = 3; // 反熵维度
    state._runCollapses = 0; // 本轮 0 次熵崩
    state.prestigeCount = 20;
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_03')!)).toBe(true);

    const unlocked = checkAllMysteries(state);
    expect(unlocked.some((d) => d.id === 'mystery_03')).toBe(true);
  });

  it('mystery_04：奇点爆发 + 爆发期间坍缩 + 数字>e308 → 解锁', () => {
    const state = new GameState();
    state._singularityBurstEver = true;
    state._prestigeDuringBurst = true;
    state.number = new Decimal(10).pow(310); // e310 量级
    expect(state.number.log10().toNumber()).toBeGreaterThanOrEqual(308);
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_04')!)).toBe(true);

    const unlocked = checkAllMysteries(state);
    expect(unlocked.some((d) => d.id === 'mystery_04')).toBe(true);
  });

  it('mystery_05：全部8种基因 + 奇异 Lv3 + 档案馆解锁 → 解锁', () => {
    const all8 = [
      'gene_growth',
      'gene_catalyst',
      'gene_resilience',
      'gene_resonance',
      'gene_mutation',
      'gene_memory',
      'gene_entangle',
      'gene_exotic',
    ];
    const state = withGenes(all8.map((t) => ({ type: t, level: t === 'gene_exotic' ? 3 : 1 })));
    state.archiveUnlocked = true;
    state._archiveRecordCount = 1;
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_05')!)).toBe(true);

    const unlocked = checkAllMysteries(state);
    expect(unlocked.some((d) => d.id === 'mystery_05')).toBe(true);
  });

  it('条件不满足时 mystery 不解锁（负向校验）', () => {
    const state = new GameState(); // 全空
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_01')!)).toBe(false);
    expect(state.codexEntries.get('mystery_01')).toBeUndefined();
  });

  it('mystery_10 皮肤条件在当前 Sprint 4 皮肤系统未建时安全 guard 为 false', () => {
    const state = withGenes([
      { type: 'gene_mutation', level: 1 },
      { type: 'gene_exotic', level: 1 },
    ]);
    // 即便数字达标、基因齐备，skin_active 仍被 guard 为 false
    state.number = new Decimal(10).pow(100);
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_10')!)).toBe(false);
  });
});

describe('Sprint 3 分类计数', () => {
  it('getCategoryCounts 正确反映已收录数量', () => {
    const state = new GameState();
    const t1 = PRESTIGE_NARRATIVES[0];
    onNarrativeTriggered(state, t1); // 触发若干 origin 词条
    // 计算本次触发实际命中的 origin 词条数（与 getCategoryCounts 同源，防止硬编码）
    const expectedOrigin = CODEX_DEFS.filter(
      (d) => d.category === 'origin' && d.narrativeTriggers?.includes(t1),
    ).length;
    // 手动解锁一条 mystery 以验证
    state.codexEntries.set('mystery_01', { id: 'mystery_01', unlocked: true, unlockedAt: Date.now() });

    const counts = getCategoryCounts(state);
    expect(counts.origin.total).toBe(15);
    expect(counts.origin.unlocked).toBe(expectedOrigin);
    expect(counts.cosmic_event.total).toBe(20);
    expect(counts.sage_record.total).toBe(18);
    expect(counts.mystery.total).toBe(12);
    expect(counts.mystery.unlocked).toBe(1);
  });
});

describe('批次1 隐患修复验证', () => {
  // ---- mystery_05 跨轮累积（依赖 _allGeneTypesEver 的跨重置保留） ----
  it('mystery_05 跨轮累积 A：_allGeneTypesEver 5→8 种解锁', () => {
    const s = withGenes([{ type: 'gene_exotic', level: 3 }]); // 满足 gene_possess gene_exotic Lv3
    s.archiveUnlocked = true;
    s._archiveRecordCount = 1; // 满足 archive_count min 1
    s._allGeneTypesEver = new Set(ALL8_GENES.slice(0, 5)); // 仅 5 种类型（链上 exotic 不计入 allTypes 累积）

    // 第一轮 checkAllMysteries：基因类型不足 8，mystery_05 不应解锁
    checkAllMysteries(s);
    expect(s.codexEntries.get('mystery_05')?.unlocked).toBeFalsy();

    // 模拟跨轮累积到 8 种类型
    s._allGeneTypesEver = new Set(ALL8_GENES);
    checkAllMysteries(s);
    expect(s.codexEntries.get('mystery_05')?.unlocked).toBe(true);
  });

  it('mystery_05 跨轮累积 B：Prestige 不丢 _allGeneTypesEver（跨轮不丢）', () => {
    const ps = new PrestigeSystem();
    const s = new GameState();
    s._allGeneTypesEver = new Set(['gene_growth', 'gene_catalyst', 'gene_resilience']);

    const ns = ps.executePrestige(s);
    expect(ns._allGeneTypesEver.has('gene_growth')).toBe(true);
    expect(ns._allGeneTypesEver.has('gene_catalyst')).toBe(true);
    expect(ns._allGeneTypesEver.has('gene_resilience')).toBe(true);
    expect(ns._allGeneTypesEver.size).toBeGreaterThanOrEqual(3);
  });

  // ---- 隐患3：_runCollapses 时序正确性 ----
  it('mystery_03 时序：_runCollapses=0 时解锁（零崩塌 Run 条件成立）', () => {
    const s = withGenes([{ type: 'gene_resilience', level: 1 }]);
    s.currentDimension = 3; // 反熵维度
    s._runCollapses = 0; // 本轮 0 次熵崩
    s.prestigeCount = 20;

    const unlocked = checkAllMysteries(s);
    expect(unlocked.some((d) => d.id === 'mystery_03')).toBe(true);
    expect(s.codexEntries.get('mystery_03')?.unlocked).toBe(true);
  });

  it('mystery_08 时序：_runCollapses≥阈值(=3) 时解锁', () => {
    const s = new GameState();
    s._rewindUsedCount = 10; // item_used_count rewind min 10
    s._runCollapses = 3; // entropy_collapse inRunAtLeast 3

    const unlocked = checkAllMysteries(s);
    expect(unlocked.some((d) => d.id === 'mystery_08')).toBe(true);
    expect(s.codexEntries.get('mystery_08')?.unlocked).toBe(true);
  });

  it('Transcend 保留 _runCollapses（关键）：修复前为 0，修复后应为 3，并驱动 mystery_08 解锁', () => {
    const ts = new TranscendSystem();
    const s = new GameState();
    s._runCollapses = 3;
    s._rewindUsedCount = 10; // 满足 mystery_08 另一条件，隔离验证 _runCollapses 字段

    const ns = ts.executeTranscend(s);
    expect(ns._runCollapses).toBe(3); // 修复前此断言为 0（bug 根源）

    // 对新 newState 跑 checkAllMysteries → mystery_08 应解锁（依赖跨 Transcend 保留的 _runCollapses）
    const unlocked = checkAllMysteries(ns);
    expect(unlocked.some((d) => d.id === 'mystery_08')).toBe(true);

    // 模拟 gameStore 重置：开启新轮，从 0 起算
    ns._runCollapses = 0;
    expect(ns._runCollapses).toBe(0);
  });

  // ---- 隐患2：_chaosStreak4x 每轮清零 ----
  it('隐患2 清零：Transcend 后 _chaosStreak4x 落回 0（每轮清零）', () => {
    const ts = new TranscendSystem();
    const s = new GameState();
    s._chaosStreak4x = 3;

    const ns = ts.executeTranscend(s);
    expect(ns._chaosStreak4x).toBe(0);
  });
});
