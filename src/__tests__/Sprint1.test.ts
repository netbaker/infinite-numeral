import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState, type GeneType, type GeneState } from '@/types/game';
import { geneSystem } from '@/systems/GeneSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { FactorSystem } from '@/systems/FactorSystem';
import { EventSystem } from '@/systems/EventSystem';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { serialize, deserialize } from '@/core/Serializer';
import { GENE_DEFS } from '@/core/Constants';

/**
 * Sprint 1 测试状态工厂：解锁全部生产者，便于纠缠基因绑定真实生产者。
 */
function createTestState(): GameState {
  const state = new GameState();
  for (let i = 1; i <= 9; i++) {
    state.unlockedProducers.add(`producer${i}`);
  }
  state.lastMagnitude = -1;
  return state;
}

/** 在测试状态中创建并追加一条基因 */
function addGene(
  state: GameState,
  type: GeneType,
  opts: { level?: number; seed?: number; expression?: number } = {},
): GeneState {
  const g = geneSystem.createGene(type, {
    state,
    level: opts.level ?? 1,
    mutationSeed: opts.seed ?? 1,
    expression: opts.expression ?? 1,
  });
  state.geneChain.chain.push(g);
  return g;
}

/** 找到使指定类型基因在 Prestige(0) 时触发突变的 mutationSeed（确定性） */
function findTriggeringSeed(type: GeneType): number {
  for (let s = 1; s <= 1000; s++) {
    const st = createTestState();
    addGene(st, type, { seed: s, level: 1 });
    const r = geneSystem.mutate(st);
    if (r.mutated) return s;
  }
  throw new Error(`未找到触发种子：${type}`);
}

const ALL_TYPES: GeneType[] = [
  'gene_growth', 'gene_catalyst', 'gene_resilience', 'gene_resonance',
  'gene_mutation', 'gene_memory', 'gene_entangle', 'gene_exotic',
];

describe('Story 1.1.1 — 基因类型定义与静态数据', () => {
  it('GENE_DEFS 包含全部 8 类基因', () => {
    expect(GENE_DEFS.length).toBe(8);
    for (const t of ALL_TYPES) {
      expect(GENE_DEFS.some((d) => d.id === t)).toBe(true);
    }
  });

  it('关键数值与 GDD §2.1 / G6 一致', () => {
    const get = (id: GeneType) => GENE_DEFS.find((d) => d.id === id)!;
    expect(get('gene_growth').effectPerLevel).toBe(0.05);
    expect(get('gene_catalyst').effectPerLevel).toBe(0.10);
    expect(get('gene_resilience').effectPerLevel).toBe(0.10);
    expect(get('gene_resonance').effectPerLevel).toBe(0.15);
    expect(get('gene_memory').baseEffect).toBe(0.02);
    expect(get('gene_entangle').effectPerLevel).toBe(0.20);
    expect(get('gene_exotic').effectPerLevel).toBe(0.50);
  });

  it('gene_memory 不可被筛选删除（GDD §2.3.2）', () => {
    expect(GENE_DEFS.find((d) => d.id === 'gene_memory')!.canBePruned).toBe(false);
  });
});

describe('Story 1.1.2 — GeneChainState 序列化', () => {
  it('geneChain round-trip 后字段完整保留', () => {
    const state = createTestState();
    const g1 = addGene(state, 'gene_growth', { level: 3, seed: 42, expression: 0.8 });
    const g2 = addGene(state, 'gene_entangle', { level: 2, seed: 43 });
    g2.entangledProducers = ['producer1', 'producer2'];
    state.geneChain.maxSlots = 5;
    state.geneChain.expansionCount = 1;
    state.geneChain.totalMutations = 7;
    state.geneChain.totalRecombinations = 2;
    state.geneChain.totalPrunings = 1;
    state.geneChain.historicalMaxNumber = '123.5';
    state.geneChain.pendingScreen = true;
    const stash = geneSystem.createGene('gene_catalyst', {
      state,
      level: 1,
      mutationSeed: 44,
      expression: 1,
    });
    state.geneChain.pendingStash.push(stash);

    const restored = deserialize(serialize(state));

    expect(restored.geneChain.chain.length).toBe(2);
    const rg = restored.geneChain.chain.find((g) => g.instanceId === g1.instanceId)!;
    expect(rg.type).toBe('gene_growth');
    expect(rg.level).toBe(3);
    expect(rg.expression).toBeCloseTo(0.8);
    expect(rg.mutationSeed).toBe(42);
    const re = restored.geneChain.chain.find((g) => g.instanceId === g2.instanceId)!;
    expect(re.entangledProducers).toEqual(['producer1', 'producer2']);
    expect(restored.geneChain.maxSlots).toBe(5);
    expect(restored.geneChain.expansionCount).toBe(1);
    expect(restored.geneChain.totalMutations).toBe(7);
    expect(restored.geneChain.historicalMaxNumber).toBe('123.5');
    expect(restored.geneChain.pendingScreen).toBe(true);
    expect(restored.geneChain.pendingStash.length).toBe(1);
  });

  it('旧存档（无 geneChain）反序列化不崩溃，回退默认空链', () => {
    const state = createTestState();
    const serialized = serialize(state);
    // 模拟旧存档：删除 geneChain 字段
    const partial = JSON.parse(JSON.stringify(serialized));
    delete partial.geneChain;
    const restored = deserialize(partial);
    expect(restored.geneChain.chain.length).toBe(0);
    expect(restored.geneChain.maxSlots).toBe(3);
  });
});

describe('Story 1.1.3 — 种子随机与 GeneSystem 骨架', () => {
  it('相同基因 + 相同 prestigeCount → 突变结果确定可复现（ADR-001）', () => {
    const s1 = createTestState();
    addGene(s1, 'gene_growth', { seed: 123, level: 2 });
    const s2 = createTestState();
    addGene(s2, 'gene_growth', { seed: 123, level: 2 });
    const r1 = geneSystem.mutate(s1);
    const r2 = geneSystem.mutate(s2);
    expect(r1.mutated).toBe(r2.mutated);
    expect(r1.kind).toBe(r2.kind);
  });

  it('空链 mutate 返回未突变', () => {
    const state = createTestState();
    const r = geneSystem.mutate(state);
    expect(r.mutated).toBe(false);
    expect(r.kind).toBe('none');
  });

  it('gene_mutation 每轮必变异为其他类型（Story 1.3.3 #5）', () => {
    const seed = findTriggeringSeed('gene_mutation');
    const state = createTestState();
    const g = addGene(state, 'gene_mutation', { seed, level: 1 });
    const beforeType = g.type;
    const r = geneSystem.mutate(state);
    expect(r.mutated).toBe(true);
    expect(r.kind).toBe('mutation_reroll');
    expect(g.type).not.toBe(beforeType);
  });
});

describe('Story 1.3.1 — MultiplierSystem 基因加成注册（G6 公式）', () => {
  const ms = new MultiplierSystem();

  function geneValue(prefix: string): number {
    const entry = ms.getEntries().find((e) => e.id.startsWith(prefix) && e.source === 'gene');
    return entry ? entry.value : NaN;
  }

  it('gene_growth Lv3 → 1 + 0.05×2 = 1.10', () => {
    const state = createTestState();
    addGene(state, 'gene_growth', { level: 3, expression: 1 });
    ms.recalculateFromState(state);
    expect(geneValue('gene_growth_')).toBeCloseTo(1.1);
  });

  it('gene_memory 用 chain 级 historicalMaxNumber：记录 100 → 1 + 0.02×100 = 3.0', () => {
    const state = createTestState();
    state.geneChain.historicalMaxNumber = '100';
    addGene(state, 'gene_memory', { level: 1, expression: 1 });
    ms.recalculateFromState(state);
    expect(geneValue('gene_memory_')).toBeCloseTo(3.0);
  });

  it('gene_exotic Lv3 → 1 + 0.50×2 = 2.0；Lv2 不注册', () => {
    const state = createTestState();
    addGene(state, 'gene_exotic', { level: 3, expression: 1 });
    ms.recalculateFromState(state);
    expect(geneValue('gene_exotic_')).toBeCloseTo(2.0);

    const state2 = createTestState();
    addGene(state2, 'gene_exotic', { level: 2, expression: 1 });
    ms.recalculateFromState(state2);
    expect(Number.isNaN(geneValue('gene_exotic_'))).toBe(true);
  });
});

describe('Story 1.2.1 — 突变（Prestige 钩子）', () => {
  it('同一次 Prestige 最多 1 条基因突变，链长度不变', () => {
    const seed = findTriggeringSeed('gene_growth');
    const state = createTestState();
    addGene(state, 'gene_growth', { seed, level: 2 });
    addGene(state, 'gene_catalyst', { seed: 999, level: 1 });
    addGene(state, 'gene_resonance', { seed: 500, level: 1 });
    const beforeLen = state.geneChain.chain.length;
    const snapshot = state.geneChain.chain.map((g) => `${g.type}:${g.level}`);
    const r = geneSystem.mutate(state);
    const afterLen = state.geneChain.chain.length;
    expect(afterLen).toBe(beforeLen);
    const changed = state.geneChain.chain.filter((g, i) => `${g.type}:${g.level}` !== snapshot[i]).length;
    expect(changed).toBe(r.mutated ? 1 : 0);
    expect(r.mutated ? state.geneChain.totalMutations : 0).toBe(r.mutated ? 1 : 0);
  });
});

describe('Story 1.2.2 — 筛选（Expansion 钩子）', () => {
  it('非筛选窗口内不可删除', () => {
    const state = createTestState();
    const g = addGene(state, 'gene_growth', { level: 2 });
    state.geneChain.pendingScreen = false;
    expect(geneSystem.prune(state, g.instanceId)).toBe(false);
    expect(state.geneChain.chain.length).toBe(1);
  });

  it('gene_memory 免疫删除', () => {
    const state = createTestState();
    const g = addGene(state, 'gene_memory', { level: 1 });
    state.geneChain.pendingScreen = true;
    expect(geneSystem.prune(state, g.instanceId)).toBe(false);
    expect(state.geneChain.chain.length).toBe(1);
  });

  it('筛选窗口内可删除并消费窗口', () => {
    const state = createTestState();
    const g = addGene(state, 'gene_growth', { level: 2 });
    state.geneChain.pendingScreen = true;
    expect(geneSystem.prune(state, g.instanceId)).toBe(true);
    expect(state.geneChain.chain.length).toBe(0);
    expect(state.geneChain.pendingScreen).toBe(false);
    expect(state.geneChain.totalPrunings).toBe(1);
  });
});

describe('Story 1.2.3 — 重组（Transcend 钩子）', () => {
  it('可重组对检测与合并（min(a+b, maxLevel)）', () => {
    const state = createTestState();
    addGene(state, 'gene_growth', { level: 2, seed: 11 });
    addGene(state, 'gene_growth', { level: 3, seed: 12 });
    addGene(state, 'gene_catalyst', { level: 1, seed: 13 });
    const pairs = geneSystem.findRecombinablePairs(state);
    expect(pairs.length).toBe(1);

    const [a, b] = pairs[0];
    const ok = geneSystem.recombine(state, a.instanceId, b.instanceId);
    expect(ok).toBe(true);
    expect(state.geneChain.chain.length).toBe(2);
    const merged = state.geneChain.chain.find((g) => g.type === 'gene_growth')!;
    expect(merged.level).toBe(Math.min(2 + 3, 5)); // = 5
    expect(state.geneChain.totalRecombinations).toBe(1);
  });

  it('不同类型不可重组', () => {
    const state = createTestState();
    const a = addGene(state, 'gene_growth', { seed: 1 });
    const b = addGene(state, 'gene_catalyst', { seed: 2 });
    expect(geneSystem.recombine(state, a.instanceId, b.instanceId)).toBe(false);
  });
});

describe('Story 1.2.4 — 新基因获取与奇异基因', () => {
  it('首次 Transcend 获取 2 条初始基因（不含 exotic）', () => {
    const state = createTestState();
    state.geneChain.chain = [];
    const added = geneSystem.generateInitialChain(state, { count: 2 });
    expect(added.length).toBe(2);
    expect(state.geneChain.chain.length).toBe(2);
    expect(added.every((g) => g.type !== 'gene_exotic')).toBe(true);
  });

  it('Transcend 后获取 1 条新基因（有空槽）', () => {
    const state = createTestState();
    const before = state.geneChain.chain.length;
    const g = geneSystem.acquireNewGene(state, { type: 'gene_catalyst' });
    expect(g).not.toBeNull();
    expect(state.geneChain.chain.length).toBe(before + 1);
  });

  it('槽满时新基因进入暂存区（最多 3，超出丢弃最旧）', () => {
    const state = createTestState();
    // 填满 3 槽
    addGene(state, 'gene_growth', { seed: 1 });
    addGene(state, 'gene_catalyst', { seed: 2 });
    addGene(state, 'gene_resonance', { seed: 3 });
    state.geneChain.maxSlots = 3;
    const stashed = geneSystem.acquireNewGene(state, { type: 'gene_entangle' });
    expect(stashed).not.toBeNull();
    expect(state.geneChain.chain.length).toBe(3);
    expect(state.geneChain.pendingStash.length).toBe(1);
    expect(state.geneChain.pendingStash[0].type).toBe('gene_entangle');
  });

  it('forceExotic 强制获取奇异基因', () => {
    const state = createTestState();
    const g = geneSystem.acquireNewGene(state, { forceExotic: true });
    expect(g?.type).toBe('gene_exotic');
  });
});

describe('Story 1.3.2 — 基因槽扩容', () => {
  it('前置条件不足时不可扩容', () => {
    const state = createTestState();
    const info = geneSystem.canExpandSlot(state);
    expect(info.can).toBe(false);
    expect(info.reason).toContain('超越');
  });

  it('满足前置且奇点充足时扩容：消耗奇点、槽位+1、expansionCount+1', () => {
    const state = createTestState();
    state.transcendCount = 2;
    state.singularity = 10;
    const info = geneSystem.canExpandSlot(state);
    expect(info.can).toBe(true);
    const beforeSlots = state.geneChain.maxSlots;
    expect(geneSystem.expandSlot(state)).toBe(true);
    expect(state.geneChain.maxSlots).toBe(beforeSlots + 1);
    expect(state.geneChain.expansionCount).toBe(1);
    expect(state.singularity).toBe(10 - info.next!.cost);
  });

  it('第 5 次扩容需要奇异基因 Lv3', () => {
    const state = createTestState();
    state.transcendCount = 10;
    state.singularity = 100;
    state.geneChain.expansionCount = 4;
    const info = geneSystem.canExpandSlot(state);
    expect(info.can).toBe(false);
    expect(info.reason).toContain('奇异基因');
  });
});

describe('Story 1.3.3 — 跨系统效果接入', () => {
  it('gene_catalyst 量级门槛降低幅度随等级递增', () => {
    for (const [lv, expectRed] of [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4]] as const) {
      const state = createTestState();
      addGene(state, 'gene_catalyst', { level: lv, expression: 1 });
      expect(geneSystem.getCatalystMagnitudeReduction(state)).toBe(expectRed);
    }
  });

  it('gene_catalyst 降低因子发现门槛（FactorSystem 集成）', () => {
    const fs = new FactorSystem();
    const id = 'factor_power_of_10';

    // 无催化：number=1（mag 0）< threshold 1 → 不触发
    const s0 = createTestState();
    s0.number = new Decimal(1);
    s0.lastMagnitude = -1;
    fs.tick(s0);
    expect(s0.factors.get(id)?.active ?? false).toBe(false);

    // 有催化（Lv5 → 降低 4 量级）：mag 0 + 4 >= 1 → 触发
    const s1 = createTestState();
    s1.number = new Decimal(1);
    s1.lastMagnitude = -1;
    addGene(s1, 'gene_catalyst', { level: 5, expression: 1 });
    fs.tick(s1);
    expect(s1.factors.get(id)?.active ?? false).toBe(true);
  });

  it('gene_resilience Prestige 起点 = 10^Lv', () => {
    expect(geneSystem.getResilienceStart(createTestState())).toBe(0);
    const state = createTestState();
    addGene(state, 'gene_resilience', { level: 3 });
    expect(geneSystem.getResilienceStart(state)).toBe(1000);
  });

  it('gene_resilience 经 PrestigeSystem 落地为起始数字', () => {
    const ps = new PrestigeSystem();
    const state = createTestState();
    addGene(state, 'gene_resilience', { level: 3 });
    const newState = ps.executePrestige(state);
    expect(newState.number.toNumber()).toBe(1000);
  });

  it('gene_resonance 事件率/时长倍率（Lv2 → 1.15 / 1.10）', () => {
    const state = createTestState();
    addGene(state, 'gene_resonance', { level: 2, expression: 1 });
    const r = geneSystem.getResonance(state);
    expect(r.rateMult).toBeCloseTo(1.15);
    expect(r.durationMult).toBeCloseTo(1.10);
  });

  it('gene_resonance 延长 EventSystem 持续效果时长', () => {
    const es = new EventSystem();
    const now = 1_000_000;

    function buildState(withResonance: boolean): GameState {
      const st = createTestState();
      st.activeEvent = { eventId: 'ev_test', triggeredAt: now, deadline: 0 };
      if (withResonance) addGene(st, 'gene_resonance', { level: 2, expression: 1 });
      return st;
    }
    const def = {
      id: 'ev_test', name: 't', description: '', minMagnitude: 0, baseProbability: 0, cooldown: 0,
      isMajor: false, icon: 'x',
      options: [{ text: 'o', narrative: '', effects: [{ type: 'speed_change' as const, value: 2, duration: 30 }] }],
    };

    const s0 = buildState(false);
    es.applyChoice(s0, def, 0, now);
    expect(s0.ongoingEffects[0].expiresAt).toBeCloseTo(now + 30000);

    const s1 = buildState(true);
    es.applyChoice(s1, def, 0, now);
    expect(s1.ongoingEffects[0].expiresAt).toBeCloseTo(now + 33000);
  });

  it('gene_entangle 逐生产者协同倍率经 MultiplierSystem 生效', () => {
    const ms = new MultiplierSystem();
    const state = createTestState();
    const g = addGene(state, 'gene_entangle', { level: 3, expression: 1 });
    g.entangledProducers = ['producer1', 'producer2'];
    ms.recalculateFromState(state);
    // 1 + 0.20 × (3-1) = 1.4
    expect(ms.getProducerMultiplier('producer1').toDecimal().toNumber()).toBeCloseTo(1.4);
    expect(ms.getProducerMultiplier('producer2').toDecimal().toNumber()).toBeCloseTo(1.4);
    // 未绑定生产者不受影响（仅为自身基础产出倍率 1）
    expect(ms.getProducerMultiplier('producer3').toDecimal().toNumber()).toBeCloseTo(1.0);
  });
});
