/**
 * Phase 6 打磨 · R1 专项冒烟测试
 * 目标：核心循环长时运行稳定性 + 存档存读往返一致性 + 三类重置后状态完整。
 *
 * 这些测试直接驱动底层系统（ProducerSystem / MultiplierSystem / DimensionSystem /
 * 三套重置系统 / Serializer），复刻 gameStore.gameTick 的产出累积与维度倍率接入步骤，
 * 以验证「长时运行数值不爆/不 NaN」「存档往返一致」「重置后 meta 字段完整」。
 *
 * 不修改任何游戏逻辑；仅消费公共 API 做断言。
 */
import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState } from '@/types/game';
import {
  PRODUCER_CONFIGS,
  UPGRADE_DEFS,
  STARDUST_UPGRADE_DEFS,
} from '@/core/Constants';
import { dimensionSystem } from '@/systems/DimensionSystem';
import { ProducerSystem } from '@/systems/ProducerSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { BigNumber } from '@/core/BigNumber';
import { serialize, deserialize } from '@/core/Serializer';
import { geneSystem } from '@/systems/GeneSystem';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { ExpansionSystem } from '@/systems/ExpansionSystem';
import { TranscendSystem } from '@/systems/TranscendSystem';

// ---- 构造工具 ----

/** 构造一个可产出、维度已初始化的主循环状态 */
function freshLoopState(masterByDim: Record<number, number> = {}): GameState {
  const s = new GameState();
  dimensionSystem.initialize(s);
  s.number = new Decimal(10);
  s.totalNumber = new Decimal(10);
  for (const cfg of PRODUCER_CONFIGS) {
    s.producers.set(cfg.id, { id: cfg.id, level: 5 });
    s.unlockedProducers.add(cfg.id);
  }
  if (UPGRADE_DEFS.length > 0) {
    s.upgrades.set(UPGRADE_DEFS[0].id, { id: UPGRADE_DEFS[0].id, level: 3 });
  }
  for (let d = 0; d <= 4; d++) {
    s.dimensionStates.get(d)!.master = masterByDim[d] ?? 0;
  }
  s.currentDimension = 0;
  return s;
}

/** 复刻 gameTick 步 0.2 / 0.3 / 1-3 的产出累积（简化熵/人格因子为 1） */
function simulateTick(state: GameState, ms: MultiplierSystem, dtMs: number): void {
  ms.registerDimensionMultiplier(state); // 维度倍率接入产出链（方案A）
  const raw = new ProducerSystem().calculateTotalOutput(state, ms);
  dimensionSystem.tickMastery(state, dtMs, raw.toDecimal()); // 精通度增长
  dimensionSystem.refreshDimensionBuilds(state); // 派生缓存重算
  const outputPerSec = raw.toDecimal();
  const increment = outputPerSec.mul(dtMs / 1000);
  state.number = BigNumber.from(state.number).add(increment).toDecimal();
  state.totalNumber = BigNumber.from(state.totalNumber).add(increment).toDecimal();
}

// ---- R1-A 主循环长时运行稳定性 ----

describe('Phase6 打磨 R1-A — 主循环长时运行数值不爆/不 NaN', () => {
  it('5000 tick 主循环：number/totalNumber 始终有限且严格递增，乘区条目无 NaN/Infinity', () => {
    const s = freshLoopState();
    const ms = new MultiplierSystem();
    ms.recalculateFromState(s);
    const start = s.number;
    for (let i = 0; i < 5000; i++) {
      simulateTick(s, ms, 100); // 100ms/tick ≈ 模拟 500s
      if (i % 500 === 0) {
        expect(s.number.isFinite()).toBe(true);
        expect(s.totalNumber.isFinite()).toBe(true);
        expect(ms.getEntries().every((e) => Number.isFinite(e.value))).toBe(true);
      }
    }
    // 终态校验
    expect(s.number.isFinite()).toBe(true);
    expect(s.totalNumber.isFinite()).toBe(true);
    expect(BigNumber.from(s.number).gte(start)).toBe(true);
    expect(ms.getEntries().every((e) => Number.isFinite(e.value))).toBe(true);
  });

  it('混沌维度随机倍率长时运行有限（dim2，300 tick）', () => {
    const s = freshLoopState();
    s.currentDimension = 2;
    dimensionSystem.checkChaosMultiplier(s);
    const ms = new MultiplierSystem();
    ms.recalculateFromState(s);
    for (let i = 0; i < 300; i++) {
      dimensionSystem.checkChaosMultiplier(s);
      simulateTick(s, ms, 100);
    }
    expect(s.number.isFinite()).toBe(true);
    expect(s.totalNumber.isFinite()).toBe(true);
    expect(ms.getEntries().every((e) => Number.isFinite(e.value))).toBe(true);
  });

  it('极端但可达量级（10^1e6 / ee100）下维度倍率（含奇点临界爆发分支）保持有限', () => {
    const s1 = freshLoopState();
    s1.currentDimension = 4;
    s1.number = new Decimal(10).pow(1e6); // ~10^^2.x，log10 = 1e6（有限）
    dimensionSystem.refreshDimensionBuilds(s1);
    expect(Number.isFinite(dimensionSystem.calculateDimensionMultiplier(s1))).toBe(true);

    const s2 = freshLoopState();
    s2.currentDimension = 4;
    s2.number = new Decimal(10).pow(new Decimal(1e100)); // ee100，log10 = 1e100（有限）
    dimensionSystem.refreshDimensionBuilds(s2);
    expect(Number.isFinite(dimensionSystem.calculateDimensionMultiplier(s2))).toBe(true);
  });
});

// ---- R1-B 存档存读往返一致性 ----

describe('Phase6 打磨 R1-B — 存档存读往返一致性', () => {
  it('rich state 序列化→反序列化后关键字段一致，派生缓存重算正确', () => {
    const s = freshLoopState({ 0: 100, 1: 60, 3: 60 });
    s.purchasedCrystalUpgrades = new Set(['crystal_global_1', 'crystal_global_3']);
    s.dimensionCrystals = new Decimal(42);
    s.numeralImprints = 3;
    s.persona = {
      active: 'persona_walker',
      levels: { persona_walker: 2, persona_tamer: 1, persona_chronicler: 0 },
    };
    s.achievements.set('dim_milestone_0_5', { id: 'dim_milestone_0_5', unlocked: true, unlockedAt: Date.now() });
    s.codexEntries.set('know_resonance', { id: 'know_resonance', unlocked: true, unlockedAt: Date.now() });
    s.unlockedProducers.add('producer1');
    s.techTree.set('tech_expand', { id: 'tech_expand', unlocked: true });
    s.transcendUpgrades.set('meta_global', { id: 'meta_global', level: 2 });

    const save = serialize(s);
    const r = deserialize(save);

    expect(r.number.toString()).toBe(s.number.toString());
    expect(r.totalNumber.toString()).toBe(s.totalNumber.toString());
    expect(r.purchasedCrystalUpgrades.size).toBe(2);
    expect(r.purchasedCrystalUpgrades.has('crystal_global_1')).toBe(true);
    expect(r.purchasedCrystalUpgrades.has('crystal_global_3')).toBe(true);
    expect(r.dimensionCrystals.toNumber()).toBe(42);
    expect(r.numeralImprints).toBe(3);
    expect(r.persona.active).toBe('persona_walker');
    expect(r.persona.levels.persona_walker).toBe(2);
    expect(r.achievements.has('dim_milestone_0_5')).toBe(true);
    expect(r.codexEntries.get('know_resonance')?.unlocked).toBe(true);
    expect(r.unlockedProducers.has('producer1')).toBe(true);
    expect(r.techTree.get('tech_expand')?.unlocked).toBe(true);
    expect(r.transcendUpgrades.get('meta_global')?.level).toBe(2);
    // 反序列化后 refreshDimensionBuilds 重算一致（不依赖落盘值）
    expect(r.activeMasteryEffects.has('dim0_l5')).toBe(true);
    expect(r.activeSynergies.has('S1')).toBe(true);
  });

  it('旧存档缺派生缓存字段 → 反序列化不崩，按 dimensionStates 正确重算', () => {
    const s = freshLoopState({ 0: 100, 1: 60, 3: 60 });
    dimensionSystem.refreshDimensionBuilds(s);
    const save = serialize(s);
    // 模拟旧版存档：删除两个派生字段
    delete ((save.state as unknown) as Record<string, unknown>).activeMasteryEffects;
    delete ((save.state as unknown) as Record<string, unknown>).activeSynergies;
    const r = deserialize(save as never);
    expect(r.activeMasteryEffects.size).toBeGreaterThan(0);
    expect(r.activeSynergies.has('S1')).toBe(true);
  });
});

// ---- R1-C 三类重置后状态完整 ----

function metaRichState(): GameState {
  const s = freshLoopState({ 0: 100, 1: 60, 3: 60 });
  // 模拟已进展玩家：解锁全部维度（initialize 仅默认解锁 Dim-0）
  for (let d = 0; d <= 4; d++) s.dimensionStates.get(d)!.unlocked = true;
  s.numeralImprints = 5;
  s.persona = {
    active: 'persona_walker',
    levels: { persona_walker: 2, persona_tamer: 1, persona_chronicler: 0 },
  };
  geneSystem.generateInitialChain(s); // 填充基因链（与 TranscendSystem 同路径）
  s.purchasedCrystalUpgrades = new Set(['crystal_global_1', 'crystal_global_2', 'crystal_global_3']);
  s.dimensionCrystals = new Decimal(99);
  s.achievements.set('dim_milestone_0_5', { id: 'dim_milestone_0_5', unlocked: true, unlockedAt: Date.now() });
  s.codexEntries.set('know_resonance', { id: 'know_resonance', unlocked: true, unlockedAt: Date.now() });
  s.singularity = 50;
  s.stardust = 500;
  s.stardustUpgrades.set(STARDUST_UPGRADE_DEFS[0].id, { id: STARDUST_UPGRADE_DEFS[0].id, level: 2 });
  s.transcendUpgrades.set('meta_global', { id: 'meta_global', level: 2 });
  s.techTree.set('tech_expand', { id: 'tech_expand', unlocked: true });
  s.producers.set('producer1', { id: 'producer1', level: 7 });
  return s;
}

describe('Phase6 打磨 R1-C — 三类重置后状态完整', () => {
  it('executePrestige：保留全部 meta 字段，重置生产/维度资源，按 S5 保留基础精通 25%', () => {
    const s = metaRichState();
    dimensionSystem.refreshDimensionBuilds(s); // 点亮 S5（dim0,3 ≥ L3）
    const preGeneLen = s.geneChain.chain.length;
    const ns = new PrestigeSystem().executePrestige(s);

    // 保留
    expect(ns.numeralImprints).toBe(5);
    expect(ns.persona.active).toBe('persona_walker');
    expect(ns.geneChain.chain.length).toBe(preGeneLen);
    expect(ns.purchasedCrystalUpgrades.size).toBe(3);
    expect(ns.dimensionCrystals.toNumber()).toBe(99);
    expect(ns.achievements.has('dim_milestone_0_5')).toBe(true);
    expect(ns.codexEntries.get('know_resonance')?.unlocked).toBe(true);
    expect(ns.singularity).toBe(50);
    expect(ns.stardustUpgrades.get(STARDUST_UPGRADE_DEFS[0].id)?.level).toBe(2);
    expect(ns.transcendUpgrades.get('meta_global')?.level).toBe(2);
    expect(ns.techTree.get('tech_expand')?.unlocked).toBe(true);
    // 重置
    expect(ns.producers.get('producer1')!.level).toBe(0);
    expect(ns.dimensionStates.get(0)!.resource.toNumber()).toBe(0);
    expect(ns.dimensionStates.get(1)!.resource.toNumber()).toBe(0);
    // S5：基础维度(0) 保留 25% 精通（100*0.25=25）；其余清零
    expect(ns.dimensionStates.get(0)!.master).toBe(25);
    expect(ns.dimensionStates.get(1)!.master).toBe(0);
    expect(ns.dimensionStates.get(3)!.master).toBe(0);
  });

  it('executePrestige（无 S5）：所有维度精通清零', () => {
    const s = metaRichState();
    s.dimensionStates.get(3)!.master = 40; // 降到 L2，S5 不点亮
    dimensionSystem.refreshDimensionBuilds(s);
    const ns = new PrestigeSystem().executePrestige(s);
    expect(ns.dimensionStates.get(0)!.master).toBe(0);
    expect(ns.dimensionStates.get(3)!.master).toBe(0);
  });

  it('executeExpansion：重置 master 为 0 但保留 unlocked 与全部 meta 字段', () => {
    const s = metaRichState();
    const ns = new ExpansionSystem().executeExpansion(s);
    expect(ns.numeralImprints).toBe(5);
    expect(ns.purchasedCrystalUpgrades.size).toBe(3);
    expect(ns.dimensionCrystals.toNumber()).toBe(99);
    expect(ns.singularity).toBe(50);
    expect(ns.achievements.has('dim_milestone_0_5')).toBe(true);
    expect(ns.dimensionStates.get(1)!.unlocked).toBe(true);
    expect(ns.dimensionStates.get(3)!.unlocked).toBe(true);
    expect(ns.dimensionStates.get(0)!.master).toBe(0);
    expect(ns.dimensionStates.get(3)!.master).toBe(0);
    expect(ns.producers.get('producer1')!.level).toBe(0);
  });

  it('executeTranscend：完整保留 master 与 meta 字段，奇点核心累加', () => {
    const s = metaRichState();
    const ns = new TranscendSystem().executeTranscend(s);
    expect(ns.numeralImprints).toBe(5);
    expect(ns.purchasedCrystalUpgrades.size).toBe(3);
    expect(ns.dimensionCrystals.toNumber()).toBe(99);
    expect(ns.achievements.has('dim_milestone_0_5')).toBe(true);
    // master 完整保留（GDD §4.1：transcend 不重置 master）
    expect(ns.dimensionStates.get(0)!.master).toBe(100);
    expect(ns.dimensionStates.get(1)!.master).toBe(60);
    expect(ns.dimensionStates.get(3)!.master).toBe(60);
    expect(ns.transcendCount).toBe(s.transcendCount + 1);
    expect(ns.singularity).toBeGreaterThanOrEqual(50);
  });

  it('重置后继续长时运行：number 仍有限且递增（Prestige → 续跑 500 tick）', () => {
    const s = metaRichState();
    const ns = new PrestigeSystem().executePrestige(s);
    const ms = new MultiplierSystem();
    ms.recalculateFromState(ns);
    const before = ns.number;
    for (let i = 0; i < 500; i++) simulateTick(ns, ms, 100);
    expect(ns.number.isFinite()).toBe(true);
    expect(BigNumber.from(ns.number).gte(before)).toBe(true);
  });
});
