import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState, DimensionId } from '@/types/game';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { DimensionSystem } from '@/systems/DimensionSystem';
import { serialize, deserialize } from '@/core/Serializer';
import { DIMENSION_DEFS } from '@/core/Constants';

/**
 * 与现有测试风格一致的测试状态工厂：
 * 初始化全部维度状态（master=0）并解锁 producer1。
 */
function createTestState(): GameState {
  const state = new GameState();
  for (const def of DIMENSION_DEFS) {
    state.dimensionStates.set(def.id, {
      id: def.id,
      unlocked: true,
      master: 0,
      resource: new Decimal(0),
      crystals: 0,
      maxNumber: new Decimal(0),
    });
  }
  state.unlockedProducers.add('producer1');
  return state;
}

describe('Story 0.1 — Serializer 序列化缺口修复', () => {
  it('v2.0 字段 round-trip 后保持一致', () => {
    const state = createTestState();
    // 填充 v2.0 字段
    state.entropy = 42;
    state.entropyStabilizers = 3;
    state.entropyRewinds = 2;
    state.entropyBarriers = 1;
    state._barrierActiveUntil = 123456;
    state.totalCollapses = 7;
    state.collapseStreak = 2;
    state.currentDimension = 2;
    state.dimensionCrystals = new Decimal(555);
    state._chaosMultiplier = 2.5;
    state._singularityBurstActive = true;
    state._singularityBurstEndsAt = 999;
    state.activeEvent = { eventId: 'e1', triggeredAt: 1, deadline: 2 };
    state.ongoingEffects = [
      { id: 'o1', sourceEventId: 'e1', effects: [], startedAt: 1, expiresAt: 0, summary: 'x' },
    ];
    state.downedProducers.set('producer1', Date.now() + 30000);
    state.purchasedCrystalUpgrades.add('crystal_global_1');
    state.dimensionStates.get(0)!.resource = new Decimal('1234.5');

    const restored = deserialize(serialize(state));

    expect(restored.entropy).toBe(42);
    expect(restored.entropyStabilizers).toBe(3);
    expect(restored.entropyRewinds).toBe(2);
    expect(restored.entropyBarriers).toBe(1);
    expect(restored._barrierActiveUntil).toBe(123456);
    expect(restored.totalCollapses).toBe(7);
    expect(restored.collapseStreak).toBe(2);
    expect(restored.currentDimension).toBe(2);
    expect(restored.dimensionCrystals.toString()).toBe('555');
    expect(restored._chaosMultiplier).toBeCloseTo(2.5);
    expect(restored._singularityBurstActive).toBe(true);
    expect(restored._singularityBurstEndsAt).toBe(999);
    expect(restored.activeEvent?.eventId).toBe('e1');
    expect(restored.ongoingEffects[0]?.id).toBe('o1');
    expect(restored.downedProducers.get('producer1')).toBeGreaterThan(0);
    expect(restored.purchasedCrystalUpgrades.has('crystal_global_1')).toBe(true);
    expect(restored.dimensionStates.get(0)!.resource.toString()).toBe('1234.5');
  });

  it('旧存档（无 v2.0 字段）加载不崩溃，缺失字段取默认值', () => {
    const legacy = {
      version: 2,
      timestamp: Date.now(),
      state: {
        number: '10',
        totalNumber: '10',
        stardust: 0,
        prestigeCount: 0,
        cumulativeStardust: 0,
        darkEnergy: 0,
        expansionCount: 0,
        cumulativeDarkEnergy: 0,
        singularity: 0,
        transcendCount: 0,
        producers: { producer1: 0 },
        upgrades: {},
        stardustUpgrades: {},
        expansionUpgrades: {},
        transcendUpgrades: {},
        techTree: {},
        currentEpoch: 'sprout',
        unlockedProducers: ['producer1'],
        lastTickTime: 0,
        gameStartTime: 0,
        totalClicks: 0,
        totalManualEarnings: '0',
        lastMagnitude: -1,
        challenges: {},
        lastTimedChallengeTime: 0,
        eventCooldown: 0,
        timeSpeedMultiplier: 1,
        // 刻意缺失所有 v2.0 字段
      },
    } as any;

    const restored = deserialize(legacy);
    expect(restored.entropy).toBe(0);
    expect(restored.entropyStabilizers).toBe(0);
    expect(restored.entropyRewinds).toBe(0);
    expect(restored.entropyBarriers).toBe(0);
    expect(restored.totalCollapses).toBe(0);
    expect(restored.collapseStreak).toBe(0);
    expect(restored.currentDimension).toBe(0);
    expect(restored.dimensionCrystals.toString()).toBe('0');
    expect(restored.downedProducers.size).toBe(0);
    expect(restored.purchasedCrystalUpgrades.size).toBe(0);
  });
});

describe('Story 0.2 — 维度倍率接入产出计算（方案A）', () => {
  it("MultiplierSource 含 'dimension' 来源且注册为全局倍率", () => {
    const ms = new MultiplierSystem();
    const state = createTestState();
    state.currentDimension = 1;
    state.number = new Decimal(7); // 质数
    ms.recalculateFromState(state);

    const dimEntry = ms.getEntries().find((e) => e.source === 'dimension');
    expect(dimEntry).toBeDefined();
    expect(dimEntry!.id).toBe('dimension_global');
    expect(dimEntry!.target).toBe('');
  });

  it('质数维度 + 数字为质数 → 全局倍率 ×3', () => {
    const ms = new MultiplierSystem();
    const state = createTestState();
    state.currentDimension = 1;
    state.number = new Decimal(7);
    ms.recalculateFromState(state);
    expect(parseFloat(ms.getGlobalMultiplier().toString())).toBeCloseTo(3, 5);
  });

  it('混沌维度 → 实际产出受 _chaosMultiplier 影响', () => {
    const ms = new MultiplierSystem();
    const state = createTestState();
    state.currentDimension = 2;
    state._chaosMultiplier = 2.0;
    ms.recalculateFromState(state);
    expect(parseFloat(ms.getGlobalMultiplier().toString())).toBeCloseTo(2.0, 5);
  });

  it('奇点维度 log10>300 → 实际产出 ×100', () => {
    const ms = new MultiplierSystem();
    const state = createTestState();
    state.currentDimension = 4;
    state.number = new Decimal('1e301');
    ms.recalculateFromState(state);
    expect(parseFloat(ms.getGlobalMultiplier().toString())).toBeCloseTo(100, 2);
  });

  it('registerDimensionMultiplier 可独立刷新维度倍率（每 tick 调用）', () => {
    const ms = new MultiplierSystem();
    const state = createTestState();
    state.currentDimension = 1;
    state.number = new Decimal(7);
    ms.registerDimensionMultiplier(state);
    expect(parseFloat(ms.getGlobalMultiplier().toString())).toBeCloseTo(3, 5);
  });

  it('维度晶体商店购买的加成通过 MultiplierSystem 注册生效', () => {
    const ms = new MultiplierSystem();
    const state = createTestState();
    state.dimensionCrystals = new Decimal(100);
    state.purchasedCrystalUpgrades.add('crystal_global_1'); // value=0.10 → ×1.10
    ms.recalculateFromState(state);
    const crystalEntry = ms.getEntries().find((e) => e.source === 'crystal');
    expect(crystalEntry).toBeDefined();
    expect(parseFloat(ms.getGlobalMultiplier().toString())).toBeCloseTo(1.1, 5);
  });
});

describe('Story 0.3 — 混沌维度 ID 映射修正（1→2）', () => {
  const ds = new DimensionSystem();

  it('Dim-2 正确触发混沌逻辑（重投 _chaosMultiplier 到 0.5~5.0）', () => {
    const state = createTestState();
    state.currentDimension = 2;
    state._chaosMultiplier = 1.0; // 默认值
    state._lastDimensionSwitch = 0; // 强制超过 60s 触发重投
    const origRandom = Math.random;
    Math.random = () => 0; // 确定性 → 0.5
    ds.checkChaosMultiplier(state);
    Math.random = origRandom;
    expect(state._chaosMultiplier).toBeGreaterThanOrEqual(0.5);
    expect(state._chaosMultiplier).toBeLessThanOrEqual(5.0);
    expect(state._chaosMultiplier).toBeCloseTo(0.5);
  });

  it('Dim-1（质数维度）不执行任何混沌逻辑', () => {
    const state = createTestState();
    state.currentDimension = 1;
    state._chaosMultiplier = 1.0;
    ds.checkChaosMultiplier(state);
    // 质数维度应直接 return，_chaosMultiplier 保持不变
    expect(state._chaosMultiplier).toBe(1.0);
  });

  it('getChaosMultiplier 仅对 Dim-2 返回倍率', () => {
    const state = createTestState();
    state.currentDimension = 1;
    state._chaosMultiplier = 2.3;
    expect(ds.getChaosMultiplier(state)).toBe(1); // 非混沌维度返回 1
    state.currentDimension = 2;
    expect(ds.getChaosMultiplier(state)).toBe(2.3);
  });
});

describe('Story 0.4 — 质数检测大数字失效修复', () => {
  const ds = new DimensionSystem();

  function dimMultiplierFor(number: Decimal, dim: DimensionId = 1): number {
    const state = createTestState();
    state.currentDimension = dim;
    state.number = number;
    return ds.calculateDimensionMultiplier(state);
  }

  it('小数质数（<1e15）仍触发 ×3', () => {
    expect(dimMultiplierFor(new Decimal(7))).toBeCloseTo(3, 5);
    expect(dimMultiplierFor(new Decimal(2))).toBeCloseTo(3, 5);
  });

  it('小数非质数不触发', () => {
    expect(dimMultiplierFor(new Decimal(4))).toBeCloseTo(1, 5);
  });

  it('大数字：log10 整数部分为质数（53）触发 ×3', () => {
    // 1e53 → floor(log10) = 53（质数）→ ×3
    expect(dimMultiplierFor(new Decimal('1e53'))).toBeCloseTo(3, 5);
  });

  it('大数字：log10 整数部分非质数（60）不误触发', () => {
    expect(dimMultiplierFor(new Decimal('1e60'))).toBeCloseTo(1, 5);
  });

  it('大数字 1e100（100 非质数）不误触发', () => {
    expect(dimMultiplierFor(new Decimal('1e100'))).toBeCloseTo(1, 5);
  });

  it('大数字 1e101（101 质数）触发 ×3', () => {
    expect(dimMultiplierFor(new Decimal('1e101'))).toBeCloseTo(3, 5);
  });
});
