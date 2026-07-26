/**
 * Phase 6 打磨 · R2 专项冒烟测试
 * 目标：维度精通奖励实际化 + 跨维度协同增益 + 晶体商店加成，验证「加成正确生效」「单源红线不破」。
 *
 * 覆盖：晶体商店购买/幂等/永久全局加成；dim0_l5 全局折叠；S1 反熵质数×3；dim1_l2 质数×4；
 * dim0_l2 成本折扣；派生缓存幂等；S2/S4 协同点亮；dim1_l3 质核资源加成。
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState, type DimensionState, type DimensionId } from '@/types/game';
import { DIMENSION_CRYSTAL_SHOP } from '@/core/Constants';
import { dimensionSystem } from '@/systems/DimensionSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';

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

function stateWithMastery(masterByDim: Record<number, number>, currentDim = 0): GameState {
  const s = new GameState();
  for (let d = 0; d <= 4; d++) {
    s.dimensionStates.set(d, dimState(d, { master: masterByDim[d] ?? 0 }));
  }
  s.currentDimension = currentDim as DimensionId;
  return s;
}

// ---- 晶体商店 ----

describe('Phase6 打磨 R2-A — 晶体商店购买与永久全局加成', () => {
  it('buyCrystalUpgrade：扣晶体、写 Set、幂等（不重复扣费）', () => {
    const s = new GameState();
    s.dimensionCrystals = new Decimal(1000);
    const item = DIMENSION_CRYSTAL_SHOP.find((i) => i.id === 'crystal_global_1')!;
    const before = s.dimensionCrystals.toNumber();

    expect(dimensionSystem.buyCrystalUpgrade(s, 'crystal_global_1')).toBe(true);
    expect(s.dimensionCrystals.toNumber()).toBeCloseTo(before - item.cost, 6);
    expect(s.purchasedCrystalUpgrades.has('crystal_global_1')).toBe(true);

    // 幂等：重复购买同一商品应失败且不重复扣费
    expect(dimensionSystem.buyCrystalUpgrade(s, 'crystal_global_1')).toBe(false);
    expect(s.dimensionCrystals.toNumber()).toBeCloseTo(before - item.cost, 6);
  });

  it('购满 3 项后：注册 3 条 crystal 源，全局加成合计 = 0.85（冻结上限）', () => {
    const s = new GameState();
    s.dimensionCrystals = new Decimal(1000);
    for (const it of DIMENSION_CRYSTAL_SHOP) {
      expect(dimensionSystem.buyCrystalUpgrade(s, it.id)).toBe(true);
    }
    expect(s.purchasedCrystalUpgrades.size).toBe(3);

    const ms = new MultiplierSystem();
    ms.recalculateFromState(s);
    const crystalEntries = ms.getEntries().filter((e) => e.source === 'crystal');
    expect(crystalEntries.length).toBe(3);
    const sum = crystalEntries.reduce((a, e) => a + (e.value - 1), 0);
    expect(sum).toBeCloseTo(0.85, 6);
  });
});

// ---- 精通奖励实际化 ----

describe('Phase6 打磨 R2-B — 精通奖励实际化（乘区型与机制型生效）', () => {
  it('dim0_l5 全局型折叠进唯一 dimension 源：dimension_global = 基础维度倍率 × 1.05', () => {
    const s = stateWithMastery({ 0: 100 });
    dimensionSystem.refreshDimensionBuilds(s);
    expect(s.activeMasteryEffects.has('dim0_l5')).toBe(true);

    const ms = new MultiplierSystem();
    ms.registerDimensionMultiplier(s);
    const entry = ms.getEntries().find((e) => e.id === 'dimension_global')!;
    // 基础维度倍率 = 1 × (1 + 100×0.005) = 1.5；× (1 + 0.05) = 1.575
    const baseDimMult = dimensionSystem.calculateDimensionMultiplier(s);
    expect(baseDimMult).toBeCloseTo(1.5, 6);
    expect(entry.value).toBeCloseTo(1.575, 6); // 1.5 × 1.05
    expect(entry.source).toBe('dimension'); // 零新 source
  });

  it('dim1_l2 质数倍率提升至 ×4（覆盖基 ×3）', () => {
    const s = stateWithMastery({ 1: 40 }, 1); // L2：触发 dim1_l1 + dim1_l2
    dimensionSystem.refreshDimensionBuilds(s);
    expect(s.activeMasteryEffects.has('dim1_l2')).toBe(true);
    s.number = new Decimal(7); // 质数
    const m = dimensionSystem.calculateDimensionMultiplier(s);
    // 4(l2) × 1.15(l1) × (1 + 40×0.005=1.2) = 5.52
    expect(m).toBeCloseTo(4 * 1.15 * 1.2, 6);
  });

  it('dim0_l2 机制型：生产者成本折扣 +5%（计入 0.5 上限夹紧）', () => {
    const s = stateWithMastery({ 0: 40 }); // L2：dim0_l2 激活
    dimensionSystem.refreshDimensionBuilds(s);
    const ms = new MultiplierSystem();
    expect(ms.getTotalCostDiscount(s)).toBeCloseTo(0.05, 6);
  });

  it('dim1_l3 机制型：质核资源获取 +20%', () => {
    const base = stateWithMastery({ 1: 40 }, 1); // 无 dim1_l3
    dimensionSystem.refreshDimensionBuilds(base);
    const withL3 = stateWithMastery({ 1: 60 }, 1); // L3：dim1_l3 激活
    dimensionSystem.refreshDimensionBuilds(withL3);

    base.dimensionStates.get(1)!.resource = new Decimal(0);
    withL3.dimensionStates.get(1)!.resource = new Decimal(0);
    // 产出 10 个 tick 的维度资源（使用相同虚拟产出以隔离 dim1_l3 的影响）
    const dummyOutput = new Decimal(1000);
    for (let i = 0; i < 10; i++) {
      dimensionSystem.tickDimensionResources(base, 0.1, dummyOutput);
      dimensionSystem.tickDimensionResources(withL3, 0.1, dummyOutput);
    }
    const rBase = base.dimensionStates.get(1)!.resource.toNumber();
    const rL3 = withL3.dimensionStates.get(1)!.resource.toNumber();
    // master 同为 60 vs 40 的 masterBonus 差异（1.3 vs 1.2）会让比例≈1.3*(1.2/1.1)...，
    // 但 dim1_l3 额外 ×1.20 必然使 rL3 显著大于 rBase（同 master 下应为严格 1.2 倍）。
    expect(rL3).toBeGreaterThan(rBase);
    // 同 master 验证：用 master=60 但剔除 dim1_l3 的对照，验证恰好 ×1.20（机制型直接生效）
    const ctrl = stateWithMastery({ 1: 60 }, 1);
    dimensionSystem.refreshDimensionBuilds(ctrl);
    ctrl.activeMasteryEffects.delete('dim1_l3'); // 关闭机制型效果，保留 masterBonus(1.3)
    dimensionSystem.tickDimensionResources(ctrl, 1, dummyOutput);
    const rCtrl = ctrl.dimensionStates.get(1)!.resource.toNumber();
    const withL3_1 = stateWithMastery({ 1: 60 }, 1);
    dimensionSystem.refreshDimensionBuilds(withL3_1); // dim1_l3 激活
    dimensionSystem.tickDimensionResources(withL3_1, 1, dummyOutput);
    expect(withL3_1.dimensionStates.get(1)!.resource.toNumber()).toBeCloseTo(rCtrl * 1.2, 6);
  });

  it('派生缓存幂等：applyMasteryRewards / evaluateSynergies 连跑 5 次集合不变', () => {
    const s = stateWithMastery({ 0: 100, 1: 60, 3: 60 });
    dimensionSystem.refreshDimensionBuilds(s);
    const m0 = new Set(s.activeMasteryEffects);
    const syn0 = new Set(s.activeSynergies);
    for (let i = 0; i < 5; i++) dimensionSystem.refreshDimensionBuilds(s);
    expect([...s.activeMasteryEffects].sort()).toEqual([...m0].sort());
    expect([...s.activeSynergies].sort()).toEqual([...syn0].sort());
    expect(s.activeSynergies.has('S1')).toBe(true);
  });
});

// ---- 跨维度协同增益 ----

describe('Phase6 打磨 R2-C — 跨维度协同增益（set-bonus 机制层）', () => {
  it('S1 反熵质数共鸣：dim1&dim3 ≥ L3 → S1 点亮，dim3 下质数倍率 ×3', () => {
    const sOn = stateWithMastery({ 1: 60, 3: 60 }, 3);
    dimensionSystem.refreshDimensionBuilds(sOn);
    expect(sOn.activeSynergies.has('S1')).toBe(true);

    const sOff = stateWithMastery({ 1: 0, 3: 60 }, 3); // dim3 同 master，但 dim1 不达标 → S1 熄灭
    dimensionSystem.refreshDimensionBuilds(sOff);
    expect(sOff.activeSynergies.has('S1')).toBe(false);

    sOn.number = new Decimal(7); // 质数
    sOff.number = new Decimal(7);
    const mOn = dimensionSystem.calculateDimensionMultiplier(sOn);
    const mOff = dimensionSystem.calculateDimensionMultiplier(sOff);
    // S1 在 dim3 分支对质数 ×3（dim3 master 同为 60，机制型乘数一致）
    expect(mOn / mOff).toBeCloseTo(3, 6);

    // 非质数下 S1 不触发（倍率回落到与无 S1 一致）
    sOn.number = new Decimal(8);
    expect(dimensionSystem.calculateDimensionMultiplier(sOn)).toBeCloseTo(mOff, 6);
  });

  it('S2（dim3&4）/ S4（dim2&3）组合点亮', () => {
    const s = stateWithMastery({ 2: 60, 3: 60, 4: 60 });
    dimensionSystem.refreshDimensionBuilds(s);
    expect(s.activeSynergies.has('S2')).toBe(true);
    expect(s.activeSynergies.has('S4')).toBe(true);
  });

  it('协同全局乘区贡献恒为 0：10 条 perk 全激活也不向 MultiplierSystem 注入新 source', () => {
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    for (const id of ['know_resonance', 'know_trilogy', 'know_chaos_sing']) {
      s.codexEntries.set(id, { id, unlocked: true });
    }
    dimensionSystem.refreshDimensionBuilds(s);
    const ms = new MultiplierSystem();
    ms.recalculateFromState(s);
    const sources = new Set(ms.getEntries().map((e) => String(e.source)));
    expect(sources.has('synergy')).toBe(false);
    expect(sources.has('knowledge')).toBe(false);
    expect(s.activeSynergies.size).toBe(10);
  });
});
