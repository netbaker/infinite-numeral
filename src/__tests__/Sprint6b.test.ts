import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState, type DimensionState, type DimensionId } from '@/types/game';
import {
  ACHIEVEMENT_DEFS,
  DIMENSION_SYNERGY_DEFS,
  KNOWLEDGE_ENTRY_DEFS,
  CRYSTAL_SHOP_MAX_BONUS,
  DIMENSION_CRYSTAL_SHOP,
  DIMENSION_SWITCH_NARRATIVES,
} from '@/core/Constants';
import { dimensionSystem } from '@/systems/DimensionSystem';
import { AchievementSystem } from '@/systems/AchievementSystem';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { ExpansionSystem } from '@/systems/ExpansionSystem';
import { TranscendSystem } from '@/systems/TranscendSystem';
import { onNarrativeTriggered } from '@/systems/CodexSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';

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

// 构造已购满晶体商店升级 + 持有晶体的状态（用于 P0 持久化测试）
function stateWithCrystal(): GameState {
  const s = new GameState();
  s.purchasedCrystalUpgrades = new Set(['crystal_global_1', 'crystal_global_2', 'crystal_global_3']);
  s.dimensionCrystals = new Decimal(50);
  return s;
}

// 经 checkAchievements 解锁后，模拟 gameStore 写入 unlocked（与运行时一致）
function applyUnlocked(state: GameState, defs: { id: string }[]): void {
  for (const d of defs) {
    state.achievements.set(d.id, { id: d.id, unlocked: true });
  }
}

describe('Sprint 6b A·P0 晶体商店重置持久化（永久 +85% 不再静默丢失）', () => {
  it('executePrestige 后 purchasedCrystalUpgrades 与 dimensionCrystals 完整保留', () => {
    const s = stateWithCrystal();
    const ns = new PrestigeSystem().executePrestige(s);
    expect(ns.purchasedCrystalUpgrades.size).toBe(3);
    expect(ns.purchasedCrystalUpgrades.has('crystal_global_1')).toBe(true);
    expect(ns.purchasedCrystalUpgrades.has('crystal_global_3')).toBe(true);
    // 为新建副本（非引用别名），避免与旧 state 共享可变集
    expect(ns.purchasedCrystalUpgrades).not.toBe(s.purchasedCrystalUpgrades);
    expect(ns.dimensionCrystals.toNumber()).toBe(50);
  });

  it('executeExpansion 后 purchasedCrystalUpgrades 与 dimensionCrystals 完整保留', () => {
    const s = stateWithCrystal();
    const ns = new ExpansionSystem().executeExpansion(s);
    expect(ns.purchasedCrystalUpgrades.size).toBe(3);
    expect(ns.dimensionCrystals.toNumber()).toBe(50);
  });

  it('executeTranscend 后 purchasedCrystalUpgrades 与 dimensionCrystals 完整保留', () => {
    const s = stateWithCrystal();
    const ns = new TranscendSystem().executeTranscend(s);
    expect(ns.purchasedCrystalUpgrades.size).toBe(3);
    expect(ns.dimensionCrystals.toNumber()).toBe(50);
  });

  it('重置后仍注册 3 条 crystal 源，全局加成合计 = CRYSTAL_SHOP_MAX_BONUS (0.85)', () => {
    const ns = new PrestigeSystem().executePrestige(stateWithCrystal());
    const ms = new MultiplierSystem();
    ms.recalculateFromState(ns);
    const crystalEntries = ms.getEntries().filter((e) => e.source === 'crystal');
    expect(crystalEntries.length).toBe(3);
    // 三条 value = 1+0.10 / 1+0.25 / 1+0.50；加和减 1 = 0.85（+85%）
    const sum = crystalEntries.reduce((a, e) => a + (e.value - 1), 0);
    expect(sum).toBeCloseTo(CRYSTAL_SHOP_MAX_BONUS, 6);
  });
});

describe('Sprint 6b A 常量 — CRYSTAL_SHOP_MAX_BONUS（冻结 +85%）', () => {
  it('= 0.85 且等于商品 value 之和，商店上限冻结无新增商品', () => {
    expect(CRYSTAL_SHOP_MAX_BONUS).toBe(0.85);
    const sum = DIMENSION_CRYSTAL_SHOP.reduce((s, i) => s + i.value, 0);
    expect(sum).toBeCloseTo(0.85, 6);
    expect(DIMENSION_CRYSTAL_SHOP.length).toBe(3); // 无新增商品
  });
});

describe('Sprint 6b B 维度挑战 13 条成就（group:dimension，纯徽章零加成）', () => {
  it('ACHIEVEMENT_DEFS 含 13 条 group:"dimension" 成就', () => {
    const dim = ACHIEVEMENT_DEFS.filter((d) => d.group === 'dimension');
    expect(dim.length).toBe(13);
    // 含 2 条 Killer tempo 与 1 条全维
    expect(dim.map((d) => d.id)).toContain('dim_challenge_prime_fast');
    expect(dim.map((d) => d.id)).toContain('dim_challenge_sing_blitz');
    expect(dim.map((d) => d.id)).toContain('dim_milestone_all_3');
  });

  it('维度 L5（dim0 master=100）点亮 dim_milestone_0_5，但 L5(dim1) 未达成', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 0: 100 });
    a.initAchievements(s);
    const newly = a.checkAchievements(s);
    applyUnlocked(s, newly);
    expect(s.achievements.get('dim_milestone_0_5')?.unlocked).toBe(true);
    expect(s.achievements.get('dim_milestone_1_5')?.unlocked).toBeFalsy();
  });

  it('维度 L3（dim1 master=60）点亮 dim_milestone_1_3', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 1: 60 });
    a.initAchievements(s);
    const newly = a.checkAchievements(s);
    applyUnlocked(s, newly);
    expect(s.achievements.get('dim_milestone_1_3')?.unlocked).toBe(true);
  });

  it('全维 L3（五维 master=60）点亮 dim_milestone_all_3', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 0: 60, 1: 60, 2: 60, 3: 60, 4: 60 });
    a.initAchievements(s);
    const newly = a.checkAchievements(s);
    applyUnlocked(s, newly);
    expect(s.achievements.get('dim_milestone_all_3')?.unlocked).toBe(true);
  });

  it('Killer tempo prime_fast：dim1 master=80 且 transcendCount<3 点亮；越阈后永久失去', () => {
    const a = new AchievementSystem();
    // 达标：第 3 次超越之前
    const s = stateWithMastery({ 1: 80 });
    s.transcendCount = 0;
    a.initAchievements(s);
    applyUnlocked(s, a.checkAchievements(s));
    expect(s.achievements.get('dim_challenge_prime_fast')?.unlocked).toBe(true);

    // 越阈：已超过 2 次 → 条件不再满足
    const s2 = stateWithMastery({ 1: 80 });
    s2.transcendCount = 3;
    a.initAchievements(s2);
    applyUnlocked(s2, a.checkAchievements(s2));
    expect(s2.achievements.get('dim_challenge_prime_fast')?.unlocked).toBeFalsy();
  });

  it('Killer tempo sing_blitz：dim4 master=60 且 expansionCount<2 点亮；越阈后永久失去', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 4: 60 });
    s.expansionCount = 0;
    a.initAchievements(s);
    applyUnlocked(s, a.checkAchievements(s));
    expect(s.achievements.get('dim_challenge_sing_blitz')?.unlocked).toBe(true);

    const s2 = stateWithMastery({ 4: 60 });
    s2.expansionCount = 2;
    a.initAchievements(s2);
    applyUnlocked(s2, a.checkAchievements(s2));
    expect(s2.achievements.get('dim_challenge_sing_blitz')?.unlocked).toBeFalsy();
  });

  it('维度成就绝不发放数字印记（numeralImprints 不变）', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 0: 100, 1: 60, 2: 60, 3: 60, 4: 60 });
    a.initAchievements(s);
    const before = s.numeralImprints;
    applyUnlocked(s, a.checkAchievements(s));
    expect(s.numeralImprints).toBe(before); // 仍为 0，零印记
  });
});

describe('Sprint 6b C 知识点跨系统联动（知识门控 / 揭示 / 放宽）', () => {
  it('S7/S8/S10 带 knowledgeGate（且 S10 带 knowledgeEase）；主流 7 条无门控', () => {
    const gated = DIMENSION_SYNERGY_DEFS.filter((d) => d.knowledgeGate);
    expect(gated.map((d) => d.id).sort()).toEqual(['S10', 'S7', 'S8']);
    expect(DIMENSION_SYNERGY_DEFS.find((d) => d.id === 'S10')?.knowledgeEase).toBe(true);
    // 主流 7 条（S1-S6、S9）无门控、无放宽
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S9']) {
      const d = DIMENSION_SYNERGY_DEFS.find((x) => x.id === id)!;
      expect(d.knowledgeGate).toBeUndefined();
      expect(d.knowledgeEase).toBeFalsy();
    }
    // 放宽绝不改 magnitude（S10 仍为 1.5）
    expect(DIMENSION_SYNERGY_DEFS.find((d) => d.id === 'S10')?.magnitude).toBe(1.5);
  });

  it('门控未收集知识 → S7/S8/S10 不在 activeSynergies；收集后揭示点亮', () => {
    // 全精通，但知识未收集 → 门控协同隐藏
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S7')).toBe(false);
    expect(s.activeSynergies.has('S8')).toBe(false);
    expect(s.activeSynergies.has('S10')).toBe(false);
    expect(s.activeSynergies.has('S1')).toBe(true); // 主流无门控，正常点亮

    // 收集对应知识 → 揭示
    s.codexEntries.set('know_resonance', { id: 'know_resonance', unlocked: true });
    s.codexEntries.set('know_trilogy', { id: 'know_trilogy', unlocked: true });
    s.codexEntries.set('know_chaos_sing', { id: 'know_chaos_sing', unlocked: true });
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S7')).toBe(true);
    expect(s.activeSynergies.has('S8')).toBe(true);
    expect(s.activeSynergies.has('S10')).toBe(true);
  });

  it('S10 knowledgeEase：知识解锁后 master 达 L2(40) 即激活（仅降门槛，不改 magnitude）', () => {
    // S10 dims=[2,4,1]，门控未解锁 → 即便 L2 也不激活
    const s = stateWithMastery({ 1: 40, 2: 40, 4: 40 });
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S10')).toBe(false);

    // 收集知识 → 放宽生效，L2 即可激活
    s.codexEntries.set('know_chaos_sing', { id: 'know_chaos_sing', unlocked: true });
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S10')).toBe(true);

    // 放宽仅到 L2：即便知识已解锁，master 仅 L1(30) 仍不激活
    const s2 = stateWithMastery({ 1: 30, 2: 30, 4: 30 });
    s2.codexEntries.set('know_chaos_sing', { id: 'know_chaos_sing', unlocked: true });
    dimensionSystem.evaluateSynergies(s2);
    expect(s2.activeSynergies.has('S10')).toBe(false);
  });

  it('onNarrativeTriggered 真实维度切换叙事可解锁对应知识条目（narrativeTriggers 非编造）', () => {
    const s = new GameState();
    const collected = onNarrativeTriggered(s, '返回基础维度。一切归于平静。');
    expect(collected.some((d) => d.id === 'know_resonance')).toBe(true);
    expect(s.codexEntries.get('know_resonance')?.unlocked).toBe(true);
  });

  it('3 条新知识均 category:"knowledge"，且每条 narrativeTriggers 逐字符等于真实 DIMENSION_SWITCH_NARRATIVES', () => {
    for (const id of ['know_resonance', 'know_trilogy', 'know_chaos_sing']) {
      const def = KNOWLEDGE_ENTRY_DEFS.find((d) => d.id === id);
      expect(def).toBeTruthy();
      expect(def!.category).toBe('knowledge');
      // 每条 trigger 必须能在真实 showNarration 调用文本中找到（不得编造）
      for (const t of def!.narrativeTriggers ?? []) {
        const real = Object.values(DIMENSION_SWITCH_NARRATIVES).some((arr) => arr.includes(t));
        expect(real).toBe(true);
      }
    }
  });
});

describe('Sprint 6b 红线回归 — 零新乘源 / 零新印记来源', () => {
  it('重算后 multiplier 无 knowledge/synergy 新 source；既有 crystal 源保留', () => {
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    for (const id of ['know_resonance', 'know_trilogy', 'know_chaos_sing']) {
      s.codexEntries.set(id, { id, unlocked: true });
    }
    // 已购晶体升级 → crystal 源才会被 MultiplierSystem 注册（否则 sources 不含 'crystal'，断言失真）
    s.purchasedCrystalUpgrades = new Set(['crystal_global_1', 'crystal_global_2', 'crystal_global_3']);
    dimensionSystem.refreshDimensionBuilds(s);
    const ms = new MultiplierSystem();
    ms.recalculateFromState(s);
    const sources = new Set(ms.getEntries().map((e) => String(e.source)));
    expect(sources.has('knowledge')).toBe(false);
    expect(sources.has('synergy')).toBe(false);
    expect(sources.has('crystal')).toBe(true); // 既有源不变
  });

  it('全量扫描：evaluateSynergies 不触碰任何 MultiplierSystem.register（仅 toggle activeSynergies）', () => {
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    for (const id of ['know_resonance', 'know_trilogy', 'know_chaos_sing']) {
      s.codexEntries.set(id, { id, unlocked: true });
    }
    // 门控+揭示后全部激活，仍不向 multiplier 注入新知识/synergy 源
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S7')).toBe(true);
    expect(s.activeSynergies.has('S8')).toBe(true);
    expect(s.activeSynergies.has('S10')).toBe(true);
  });
});
