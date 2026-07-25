import { describe, it, expect } from 'vitest';
import Decimal from 'break_eternity.js';
import { GameState, type DimensionState, type DimensionId } from '@/types/game';
import { dimensionSystem } from '@/systems/DimensionSystem';
import { TranscendSystem } from '@/systems/TranscendSystem';
import { ExpansionSystem } from '@/systems/ExpansionSystem';

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

// 信任-验证独立复核发现的真阻断回归：
// executeTranscend / executeExpansion 基于 new GameState() 重建，曾漏拷 dimensionStates，
// 导致跨重置后维度精通度全清 → Sprint 6 精通奖励 + 跨维度协同每次超越/膨胀后全废。
describe('Sprint 6 阻断修复 — 跨重置维度精通保留', () => {
  it('executeTranscend 完整保留维度 master（activeMasteryEffects 含 transcend 前已激活 key）', () => {
    const s = stateWithMastery({ 0: 100, 1: 60, 3: 60 }); // dim0_l5 / dim1_l3 已激活，S1 点亮
    dimensionSystem.refreshDimensionBuilds(s);
    const beforeMastery = new Set(s.activeMasteryEffects);
    const beforeSyn = new Set(s.activeSynergies);
    expect(beforeSyn.has('S1')).toBe(true);

    const after = new TranscendSystem().executeTranscend(s);

    // master 完整保留（GDD §4.1 未列 transcend 重置 master；transcend 不走 S5）
    expect(after.dimensionStates.get(0)!.master).toBe(100);
    expect(after.dimensionStates.get(1)!.master).toBe(60);
    expect(after.dimensionStates.get(3)!.master).toBe(60);
    // resource / crystals / maxNumber 重置为新轮起点
    expect(after.dimensionStates.get(0)!.resource.toNumber()).toBe(0);
    expect(after.dimensionStates.get(0)!.crystals).toBe(0);
    expect(after.dimensionStates.get(0)!.maxNumber.toNumber()).toBe(0);

    // 重算后缓存与 transcend 前一致——不再因 dimensionStates 丢失而清空
    dimensionSystem.refreshDimensionBuilds(after);
    expect([...after.activeMasteryEffects].sort()).toEqual([...beforeMastery].sort());
    expect([...after.activeSynergies].sort()).toEqual([...beforeSyn].sort());
    expect(after.activeSynergies.has('S1')).toBe(true);
  });

  it('executeExpansion 按 GDD §4.1 重置 master 为 0 但保留 unlocked（不重新锁死）', () => {
    const s = stateWithMastery({ 0: 100, 1: 60, 3: 60 });
    dimensionSystem.refreshDimensionBuilds(s);
    expect(s.activeMasteryEffects.size).toBeGreaterThan(0);

    const after = new ExpansionSystem().executeExpansion(s);

    // master 清零（GDD：expansion 重置 master 回退）
    expect(after.dimensionStates.get(0)!.master).toBe(0);
    expect(after.dimensionStates.get(1)!.master).toBe(0);
    expect(after.dimensionStates.get(3)!.master).toBe(0);
    // unlocked 保留（避免维度重新锁死）
    expect(after.dimensionStates.get(1)!.unlocked).toBe(true);
    expect(after.dimensionStates.get(3)!.unlocked).toBe(true);
    // 重算后缓存为空（master=0 → 无奖励/协同）
    dimensionSystem.refreshDimensionBuilds(after);
    expect(after.activeMasteryEffects.size).toBe(0);
    expect(after.activeSynergies.size).toBe(0);
  });
});
