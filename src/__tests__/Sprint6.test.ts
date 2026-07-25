import { describe, it, expect, afterEach } from 'vitest';
import Decimal from 'break_eternity.js';
import {
  GameState,
  type DimensionState,
  type DimensionId,
  type MultiplierEntry,
} from '@/types/game';
import {
  DIMENSION_MASTERY_EFFECTS,
  DIMENSION_SYNERGY_DEFS,
  MASTERY_GLOBAL_MULT_CAP,
  SYNERGY_MIN_LEVEL,
} from '@/core/Constants';
import { dimensionSystem } from '@/systems/DimensionSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { serialize, deserialize } from '@/core/Serializer';

// 构造维度状态条目（全字段）
function dimState(id: number, opts: Partial<DimensionState> = {}): DimensionState {
  return {
    id: id as DimensionId,
    unlocked: opts.unlocked ?? true,
    master: opts.master ?? 0,
    resource: opts.resource ?? new Decimal(0),
    crystals: opts.crystals ?? 0,
    maxNumber: opts.maxNumber ?? new Decimal(0),
  };
}

// 构造带指定维度精通度的 GameState（所有维度默认已解锁）
function stateWithMastery(masterByDim: Record<number, number>): GameState {
  const s = new GameState();
  for (let d = 0; d <= 4; d++) {
    s.dimensionStates.set(d, dimState(d, { master: masterByDim[d] ?? 0 }));
  }
  return s;
}

// 临时篡改单条 global 型精通 magnitude（用于验证硬上限夹紧），测试后还原
let savedGlobalMag: number | null = null;
function withInflatedGlobalMagnitude(mag: number, fn: () => void) {
  const eff = DIMENSION_MASTERY_EFFECTS[0][4]; // dim0_l5，唯一 global 型
  savedGlobalMag = eff.magnitude;
  eff.magnitude = mag;
  try {
    fn();
  } finally {
    eff.magnitude = savedGlobalMag;
    savedGlobalMag = null;
  }
}

afterEach(() => {
  if (savedGlobalMag !== null) {
    DIMENSION_MASTERY_EFFECTS[0][4].magnitude = savedGlobalMag;
    savedGlobalMag = null;
  }
});

describe('Sprint 6 Must ② 精通奖励实际化 — 派生缓存', () => {
  it('getMasteryLevel 映射：mastery 20/60/100 → Lv 1/3/5，19 → Lv 0', () => {
    const s = new GameState();
    s.dimensionStates.set(0, dimState(0, { master: 19 }));
    s.dimensionStates.set(1, dimState(1, { master: 20 }));
    s.dimensionStates.set(2, dimState(2, { master: 60 }));
    s.dimensionStates.set(3, dimState(3, { master: 100 }));
    expect(dimensionSystem.getMasteryLevel(s, 0)).toBe(0);
    expect(dimensionSystem.getMasteryLevel(s, 1)).toBe(1);
    expect(dimensionSystem.getMasteryLevel(s, 2)).toBe(3);
    expect(dimensionSystem.getMasteryLevel(s, 3)).toBe(5);
  });

  it('applyMasteryRewards 幂等：连续两次调用结果一致，且 master=100 时 25 条全部激活', () => {
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    dimensionSystem.applyMasteryRewards(s);
    const first = new Set(s.activeMasteryEffects);
    dimensionSystem.applyMasteryRewards(s);
    expect(s.activeMasteryEffects).toEqual(first);
    expect(s.activeMasteryEffects.size).toBe(25);
    expect(s.activeMasteryEffects.has('dim0_l5')).toBe(true);
    expect(s.activeMasteryEffects.has('dim4_l5')).toBe(true);
  });

  it('applyMasteryRewards 仅填充已达成的等级（master=40 → Dim-0 仅 L1+L2 共 2 条）', () => {
    const s = stateWithMastery({ 0: 40 });
    dimensionSystem.applyMasteryRewards(s);
    const dim0Keys = [...s.activeMasteryEffects].filter((k) => k.startsWith('dim0_'));
    expect(dim0Keys.sort()).toEqual(['dim0_l1', 'dim0_l2']);
    expect(s.activeMasteryEffects.has('dim0_l3')).toBe(false);
  });

  it('refreshDimensionBuilds 同时重算精通奖励与协同增益（Dim-1&3=60 → S1 点亮）', () => {
    const s = stateWithMastery({ 1: 60, 3: 60 });
    dimensionSystem.refreshDimensionBuilds(s);
    expect(s.activeMasteryEffects.has('dim1_l3')).toBe(true); // Lv3 达成
    expect(s.activeSynergies.has('S1')).toBe(true); // dims[1,3] ≥ L3
    expect(s.activeSynergies.has('S2')).toBe(false); // 需 dim4，未达成
  });

  it('协同阈值：低于 SYNERGY_MIN_LEVEL（mastery=40 → Lv2）不点亮任何协同', () => {
    const s = stateWithMastery({ 1: 40, 3: 40 });
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.size).toBe(0);
    expect(SYNERGY_MIN_LEVEL).toBe(3);
  });
});

describe('Sprint 6 Must ③ 跨维度协同增益 — 10 条 perk 全布接', () => {
  it('DIMENSION_SYNERGY_DEFS 共 10 条，且 S7/S10 标记为 niche（小众）', () => {
    expect(DIMENSION_SYNERGY_DEFS.length).toBe(10);
    const niche = DIMENSION_SYNERGY_DEFS.filter((d) => d.niche).map((d) => d.id).sort();
    expect(niche).toEqual(['S10', 'S7']);
    // 全部为机制/规则型，零乘源、零印记
    for (const d of DIMENSION_SYNERGY_DEFS) {
      expect(d.minLevel).toBe(SYNERGY_MIN_LEVEL);
    }
  });

  it('S8（三维度组合 dims[1,3,4]）需三维度均 ≥ L3 才点亮', () => {
    const s = stateWithMastery({ 1: 60, 3: 60 }); // dim4 缺失
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S8')).toBe(false);
    s.dimensionStates.set(4, dimState(4, { master: 60 }));
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S8')).toBe(true);
  });

  it('满精通（全维度 master=100）点亮全部 10 条协同', () => {
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    dimensionSystem.evaluateSynergies(s);
    for (const d of DIMENSION_SYNERGY_DEFS) {
      expect(s.activeSynergies.has(d.id)).toBe(true);
    }
  });
});

describe('Sprint 6 R1 红线 — 单 dimension 源折叠，零新 source / 零印记', () => {
  it('registerDimensionMultiplier 仅写入单一 source=dimension / id=dimension_global 条目', () => {
    const s = stateWithMastery({ 0: 100 });
    s.currentDimension = 0; // 基础维度
    dimensionSystem.refreshDimensionBuilds(s);
    const ms = new MultiplierSystem();
    ms.registerDimensionMultiplier(s);
    const entries: readonly MultiplierEntry[] = ms.getEntries().filter((e) => e.id === 'dimension_global');
    expect(entries.length).toBe(1);
    expect(entries[0].source).toBe('dimension');
    // dim0_l5=+0.05 → 折叠因子 (1 + 0.05)，叠在维度基础倍率之上（零新 source）
    const baseDimMult = dimensionSystem.calculateDimensionMultiplier(s);
    expect(entries[0].value).toBeCloseTo(baseDimMult * 1.05, 6);
  });

  it('MASTERY_GLOBAL_MULT_CAP 夹紧：任意 global delta 超出 0.25 时折叠因子封顶 (1 + cap)', () => {
    expect(MASTERY_GLOBAL_MULT_CAP).toBe(0.25);
    const s = stateWithMastery({ 0: 100 });
    s.currentDimension = 0;
    dimensionSystem.refreshDimensionBuilds(s);
    const ms = new MultiplierSystem();
    const baseDimMult = dimensionSystem.calculateDimensionMultiplier(s);
    // 临时把 dim0_l5 的 magnitude 设为 0.5（> 上限），验证依然被夹到 0.25
    withInflatedGlobalMagnitude(0.5, () => {
      ms.registerDimensionMultiplier(s);
      const entry = ms.getEntries().find((e) => e.id === 'dimension_global')!;
      expect(entry.value).toBeCloseTo(baseDimMult * 1.25, 6); // 1 + cap，而非 1 + 0.5
    });
  });
});

describe('Sprint 6 序列化 — 派生缓存容错持久化 + 反序列化重算', () => {
  it('serialize 将派生缓存写为 string[]，deserialize 后由 refreshDimensionBuilds 重算一致', () => {
    const s = stateWithMastery({ 0: 100, 1: 60, 3: 60 });
    dimensionSystem.refreshDimensionBuilds(s);
    const save = serialize(s);
    expect(Array.isArray((save.state as any).activeMasteryEffects)).toBe(true);
    expect(Array.isArray((save.state as any).activeSynergies)).toBe(true);

    const restored = deserialize(save);
    // 反序列化后重算结果应与源一致
    expect(restored.activeMasteryEffects.has('dim0_l5')).toBe(true);
    expect(restored.activeSynergies.has('S1')).toBe(true);
  });

  it('旧存档缺字段（undefined）反序列化 → 空 Set，随后按 dimensionStates 正确重算', () => {
    const s = stateWithMastery({ 0: 100, 1: 60, 3: 60 });
    dimensionSystem.refreshDimensionBuilds(s);
    const save = serialize(s);
    // 模拟旧版存档：删除两个派生字段
    delete (save.state as any).activeMasteryEffects;
    delete (save.state as any).activeSynergies;
    const restored = deserialize(save as any);
    expect(restored.activeMasteryEffects.size).toBeGreaterThan(0);
    expect(restored.activeSynergies.has('S1')).toBe(true);
  });
});
