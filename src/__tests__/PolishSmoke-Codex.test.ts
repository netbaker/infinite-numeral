/**
 * Phase 6 打磨 · R3 专项冒烟测试
 * 目标：成就 / 知识图鉴（Codex）联动 + 长时运行稳定性。
 *
 * 覆盖：13 条维度成就零印记、Codex 叙事解锁知识→协同门控联动、成就跨重置保留、
 * 长时运行（含重置续跑）数值有限、知识条目 trigger 与真实叙事一致。
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState, type DimensionState, type DimensionId } from '@/types/game';
import {
  ACHIEVEMENT_DEFS,
  KNOWLEDGE_ENTRY_DEFS,
  DIMENSION_SWITCH_NARRATIVES,
  PRODUCER_CONFIGS,
} from '@/core/Constants';
import { dimensionSystem } from '@/systems/DimensionSystem';
import { ProducerSystem } from '@/systems/ProducerSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { BigNumber } from '@/core/BigNumber';
import { AchievementSystem } from '@/systems/AchievementSystem';
import { onNarrativeTriggered } from '@/systems/CodexSystem';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { TranscendSystem } from '@/systems/TranscendSystem';

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

function applyUnlocked(state: GameState, defs: { id: string }[]): void {
  for (const d of defs) {
    state.achievements.set(d.id, { id: d.id, unlocked: true, unlockedAt: Date.now() });
  }
}

function simulateTick(state: GameState, ms: MultiplierSystem, dtMs: number): void {
  ms.registerDimensionMultiplier(state);
  const raw = new ProducerSystem().calculateTotalOutput(state, ms);
  dimensionSystem.tickMastery(state, dtMs, raw.toDecimal());
  dimensionSystem.refreshDimensionBuilds(state);
  const increment = raw.toDecimal().mul(dtMs / 1000);
  state.number = BigNumber.from(state.number).add(increment).toDecimal();
  state.totalNumber = BigNumber.from(state.totalNumber).add(increment).toDecimal();
}

function richLoopState(masterByDim: Record<number, number> = {}): GameState {
  const s = stateWithMastery(masterByDim);
  s.number = new Decimal(10);
  s.totalNumber = new Decimal(10);
  for (const cfg of PRODUCER_CONFIGS) {
    s.producers.set(cfg.id, { id: cfg.id, level: 5 });
    s.unlockedProducers.add(cfg.id);
  }
  s.currentDimension = 0;
  return s;
}

// ---- 成就 ----

describe('Phase6 打磨 R3-A — 维度成就（13 条，零数字印记）', () => {
  it('ACHIEVEMENT_DEFS 含 13 条 group:"dimension" 成就', () => {
    const dim = ACHIEVEMENT_DEFS.filter((d) => d.group === 'dimension');
    expect(dim.length).toBe(13);
  });

  it('满精通扫描成就：解锁 13 条维度成就，数字印记不变（零印记红线）', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    a.initAchievements(s);
    const before = s.numeralImprints;
    applyUnlocked(s, a.checkAchievements(s));
    const unlockedDim = ACHIEVEMENT_DEFS.filter(
      (d) => d.group === 'dimension' && s.achievements.get(d.id)?.unlocked,
    );
    expect(unlockedDim.length).toBe(13);
    expect(s.numeralImprints).toBe(before); // 仍为 0
  });

  it('dim0 精通 L5 点亮 dim_milestone_0_5，印记不变', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 0: 100 });
    a.initAchievements(s);
    applyUnlocked(s, a.checkAchievements(s));
    expect(s.achievements.get('dim_milestone_0_5')?.unlocked).toBe(true);
    expect(s.numeralImprints).toBe(0);
  });

  it('成就跨 Transcend 保留（不重复触发、不丢失）', () => {
    const a = new AchievementSystem();
    const s = stateWithMastery({ 0: 100 });
    a.initAchievements(s);
    applyUnlocked(s, a.checkAchievements(s));
    expect(s.achievements.has('dim_milestone_0_5')).toBe(true);

    const ns = new TranscendSystem().executeTranscend(s);
    expect(ns.achievements.has('dim_milestone_0_5')).toBe(true);
    expect(ns.numeralImprints).toBe(0);
  });
});

// ---- Codex / 知识联动 ----

describe('Phase6 打磨 R3-B — 知识图鉴联动（叙事解锁 → 协同门控）', () => {
  it('onNarrativeTriggered 真实维度切换叙事解锁 know_resonance', () => {
    const s = new GameState();
    const collected = onNarrativeTriggered(s, '返回基础维度。一切归于平静。');
    expect(collected.some((d) => d.id === 'know_resonance')).toBe(true);
    expect(s.codexEntries.get('know_resonance')?.unlocked).toBe(true);
  });

  it('知识门控：满精通但知识未揭示 → S7/S8/S10 隐藏；揭示后点亮', () => {
    const s = stateWithMastery({ 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 });
    dimensionSystem.refreshDimensionBuilds(s);
    expect(s.activeSynergies.has('S7')).toBe(false);
    expect(s.activeSynergies.has('S8')).toBe(false);
    expect(s.activeSynergies.has('S10')).toBe(false);
    expect(s.activeSynergies.has('S1')).toBe(true); // 主流无门控，正常点亮

    s.codexEntries.set('know_resonance', { id: 'know_resonance', unlocked: true });
    s.codexEntries.set('know_trilogy', { id: 'know_trilogy', unlocked: true });
    s.codexEntries.set('know_chaos_sing', { id: 'know_chaos_sing', unlocked: true });
    dimensionSystem.evaluateSynergies(s);
    expect(s.activeSynergies.has('S7')).toBe(true);
    expect(s.activeSynergies.has('S8')).toBe(true);
    expect(s.activeSynergies.has('S10')).toBe(true);
  });

  it('3 条维度知识条目 category="knowledge"，narrativeTriggers 逐字符等于真实 DIMENSION_SWITCH_NARRATIVES', () => {
    for (const id of ['know_resonance', 'know_trilogy', 'know_chaos_sing']) {
      const def = KNOWLEDGE_ENTRY_DEFS.find((d) => d.id === id);
      expect(def).toBeTruthy();
      expect(def!.category).toBe('knowledge');
      for (const t of def!.narrativeTriggers ?? []) {
        const real = Object.values(DIMENSION_SWITCH_NARRATIVES).some((arr) => arr.includes(t));
        expect(real).toBe(true);
      }
    }
  });
});

// ---- 长时运行 ----

describe('Phase6 打磨 R3-C — 长时运行稳定性（含重置续跑）', () => {
  it('1000 tick 主循环 + Prestige 续跑 500 tick：number 始终有限且递增', () => {
    const s = richLoopState({ 0: 100 });
    const ms = new MultiplierSystem();
    ms.recalculateFromState(s);
    const before = s.number;
    for (let i = 0; i < 1000; i++) simulateTick(s, ms, 100);
    expect(s.number.isFinite()).toBe(true);
    expect(BigNumber.from(s.number).gte(before)).toBe(true);

    const ns = new PrestigeSystem().executePrestige(s);
    const ms2 = new MultiplierSystem();
    ms2.recalculateFromState(ns);
    const before2 = ns.number;
    for (let i = 0; i < 500; i++) simulateTick(ns, ms2, 100);
    expect(ns.number.isFinite()).toBe(true);
    expect(BigNumber.from(ns.number).gte(before2)).toBe(true);
  });

  it('维度切换长时运行（dim0→dim3→dim4 各 300 tick）：派生缓存一致、number 有限', () => {
    const s = richLoopState({ 1: 60, 3: 60 });
    const ms = new MultiplierSystem();
    ms.recalculateFromState(s);
    s.currentDimension = 0;
    for (let i = 0; i < 300; i++) simulateTick(s, ms, 100);
    s.currentDimension = 3;
    for (let i = 0; i < 300; i++) simulateTick(s, ms, 100);
    s.currentDimension = 4;
    s.number = new Decimal(10).pow(500); // 进入奇点预热/爆发量级
    for (let i = 0; i < 300; i++) simulateTick(s, ms, 100);
    expect(s.number.isFinite()).toBe(true);
    expect(s.activeSynergies.has('S1')).toBe(true); // 派生缓存随精通持续有效
  });
});
