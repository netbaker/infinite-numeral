import { describe, it, expect } from 'vitest';
import { GameState } from '@/types/game';
import type { ArchiveRecord } from '@/types/game';
import type { PersonaVector } from '@/systems/PersonaSystem';
import * as personaSystem from '@/systems/PersonaSystem';
import { computeTranscendImprintGain, IMPRINT_TRANSCEND_MILESTONES } from '@/systems/PersonaSystem';
import { D_PERSONA_MAX, PERSONA_L1_COST, PERSONA_L2_COST, CHRONICLER_START_BUFFER_MAX } from '@/core/Constants';
import { serialize, deserialize } from '@/core/Serializer';

/**
 * Sprint 5 Phase 4（A③ Digital Persona）契约测试
 *
 * 覆盖 GDD §2.1~§2.4 / §6 / §7 的核心不变量：
 * - D(s) ∈ [0, 0.25] 全局有界 + 凹性（边际递减，非纯线性通胀）。
 * - s 向量由全量档案馆快照聚合，分量 ∈ [0,1]。
 * - L1/L2 升级消耗正确印记（3 / 8），不足/已满级幂等失败。
 * - 切换激活人格保留旧等级（§6.5）。
 * - 驯者 L2 损失封顶；编年史家 L2 缓冲 = floor(50·s)。
 * - Serializer 旧存档（depthAccumulated 骨架）兜底为 L0。
 */

function makeRecord(partial: Partial<ArchiveRecord>): ArchiveRecord {
  return {
    runId: 'run_1_1',
    transcendCount: 1,
    maxNumber: '10',
    maxLog10: 1,
    runDuration: 60,
    dimensionsVisited: [0],
    primaryDimension: 0,
    prestigeCount: 0,
    expansionCount: 0,
    eventsTriggered: 0,
    collapsesTriggered: 0,
    maxEntropy: 0,
    geneChainSnapshot: [],
    stardustEarned: 0,
    darkEnergyEarned: 0,
    singularityEarned: 0,
    timestamp: Date.now(),
    epochReached: 'epoch_sprout',
    isMilestone: false,
    ...partial,
  };
}

describe('A③ D(s) 有界性与凹性（GDD §2.3 / §7.5）', () => {
  it('对任意 s∈[0,1]^3，D(s) ∈ [0, D_max=0.25]', () => {
    const vectors: PersonaVector[] = [
      { walker: 0, tamer: 0, chronicler: 0 },
      { walker: 1, tamer: 1, chronicler: 1 },
      { walker: 0.5, tamer: 0.3, chronicler: 0.8 },
      { walker: 1, tamer: 0, chronicler: 0 },
      { walker: 0, tamer: 1, chronicler: 0 },
      { walker: 0.25, tamer: 0.5, chronicler: 0.75 },
      { walker: 0.99, tamer: 0.01, chronicler: 0.5 },
    ];
    for (const v of vectors) {
      const d = personaSystem.computeDPersona(v);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(D_PERSONA_MAX);
    }
  });

  it('D(s) 对 A 凹（边际递减）：A 0→0.5 增量 > 0.5→1 增量', () => {
    const d0 = personaSystem.computeDPersona({ walker: 0, tamer: 0, chronicler: 0 });
    const d05 = personaSystem.computeDPersona({ walker: 0.5, tamer: 0.5, chronicler: 0.5 });
    const d1 = personaSystem.computeDPersona({ walker: 1, tamer: 1, chronicler: 1 });
    expect(d05 - d0).toBeGreaterThan(d1 - d05);
  });

  it('s 全 1（A=1，可行域上限）→ D(s)=0.25·(1−e^−2)≈0.216，仍严格 ≤ D_max（证明不通胀）', () => {
    const d = personaSystem.computeDPersona({ walker: 1, tamer: 1, chronicler: 1 });
    expect(d).toBeCloseTo(0.25 * (1 - Math.exp(-2)), 6);
    expect(d).toBeLessThan(D_PERSONA_MAX);
  });
});

describe('A③ s 向量聚合（来自全量档案馆快照，GDD §2.1）', () => {
  it('空快照 → 全 0', () => {
    const s = personaSystem.computePersonaVector([]);
    expect(s).toEqual({ walker: 0, tamer: 0, chronicler: 0 });
  });

  it('单轮满质量快照 → walker=1, tamer=1, chronicler∈(0.3,0.4)', () => {
    const rec = makeRecord({
      dimensionsVisited: [0, 1, 2, 3, 4],
      maxEntropy: 100,
      collapsesTriggered: 0,
      runDuration: 60,
      eventsTriggered: 100,
      transcendCount: 1,
    });
    const s = personaSystem.computePersonaVector([rec]);
    expect(s.walker).toBeCloseTo(1, 5); // 5 维 / 5
    expect(s.tamer).toBeCloseTo(1, 5); // 控制度 1 + 存活熵 1
    expect(s.chronicler).toBeGreaterThan(0.3);
    expect(s.chronicler).toBeLessThan(0.4);
    // 所有分量落在 [0,1]
    for (const k of ['walker', 'tamer', 'chronicler'] as const) {
      expect(s[k]).toBeGreaterThanOrEqual(0);
      expect(s[k]).toBeLessThanOrEqual(1);
    }
  });

  it('超出参考阈值归一化 → 仍封顶于 1（不通胀）', () => {
    // 编年史家需 30 轮 + 满事件/超越才饱和；用 30 条满质量快照驱动三项均归一化到 1
    const records: ArchiveRecord[] = [];
    for (let i = 0; i < 30; i++) {
      records.push(makeRecord({
        dimensionsVisited: [0, 1, 2, 3, 4],
        maxEntropy: 500,
        collapsesTriggered: 0,
        runDuration: 10,
        eventsTriggered: 99999,
        transcendCount: 999,
      }));
    }
    const s = personaSystem.computePersonaVector(records);
    expect(s.walker).toBe(1);
    expect(s.tamer).toBe(1);
    expect(s.chronicler).toBe(1);
  });
});

describe('A③ 激活 / 升级（GDD §2.2 / §6.5 / §7.3）', () => {
  it('L0→L1 花费 3，L1→L2 花费 8，已满级幂等失败', () => {
    const state = new GameState();
    state.numeralImprints = 20;
    personaSystem.setActivePersona(state, 'persona_walker');
    expect(state.persona.active).toBe('persona_walker');

    const c1 = personaSystem.upgradeActivePersona(state);
    expect(c1).toBe(PERSONA_L1_COST);
    expect(state.numeralImprints).toBe(17);
    expect(state.persona.levels.persona_walker).toBe(1);

    const c2 = personaSystem.upgradeActivePersona(state);
    expect(c2).toBe(PERSONA_L2_COST);
    expect(state.numeralImprints).toBe(9);
    expect(state.persona.levels.persona_walker).toBe(2);

    const c3 = personaSystem.upgradeActivePersona(state);
    expect(c3).toBe(0); // 已满级
    expect(state.numeralImprints).toBe(9);
  });

  it('印记不足时升级失败且不扣减', () => {
    const state = new GameState();
    state.numeralImprints = 2; // < L1_COST(3)
    personaSystem.setActivePersona(state, 'persona_tamer');
    const c = personaSystem.upgradeActivePersona(state);
    expect(c).toBe(0);
    expect(state.numeralImprints).toBe(2);
    expect(state.persona.levels.persona_tamer).toBe(0);
  });

  it('切换激活人格保留旧等级（§6.5：无退还）', () => {
    const state = new GameState();
    state.numeralImprints = 20;
    personaSystem.setActivePersona(state, 'persona_walker');
    personaSystem.upgradeActivePersona(state); // walker → L1
    expect(state.persona.levels.persona_walker).toBe(1);

    personaSystem.setActivePersona(state, 'persona_tamer');
    expect(state.persona.active).toBe('persona_tamer');
    expect(state.persona.levels.persona_walker).toBe(1); // 旧等级保留

    personaSystem.upgradeActivePersona(state); // tamer → L1
    expect(state.persona.levels.persona_tamer).toBe(1);

    personaSystem.setActivePersona(state, 'persona_walker'); // 切回
    expect(state.persona.active).toBe('persona_walker');
    expect(state.persona.levels.persona_walker).toBe(1); // 仍是 L1
  });
});

describe('A③ effMult 末端加成（GDD §2.3 / R1 红线）', () => {
  it('未激活 → 1.0；激活且 s 全 1 → 1 + D(s)_max可行（0.216）', () => {
    const state = new GameState();
    expect(personaSystem.getPersonaBonusFromVector(state, { walker: 1, tamer: 1, chronicler: 1 })).toBe(1.0);
    state.persona.active = 'persona_walker';
    const bonus = personaSystem.getPersonaBonusFromVector(state, { walker: 1, tamer: 1, chronicler: 1 });
    expect(bonus).toBeCloseTo(1 + 0.25 * (1 - Math.exp(-2)), 6);
  });

  it('getPersonaBonusMultiplier 与 FromVector 行为一致', () => {
    const state = new GameState();
    state.persona.active = 'persona_chronicler';
    const rec = makeRecord({ dimensionsVisited: [0, 1, 2, 3, 4], maxEntropy: 100, eventsTriggered: 100 });
    const fromRec = personaSystem.getPersonaBonusMultiplier(state, [rec]);
    const fromVec = personaSystem.getPersonaBonusFromVector(state, personaSystem.computePersonaVector([rec]));
    expect(fromRec).toBeCloseTo(fromVec, 10);
  });
});

describe('A③ L2 机制（GDD §2.4 / §6.4）', () => {
  it('驯者 L2：损失封顶 50% 当前数字；非激活时不封顶', () => {
    // 非激活：原样返回
    expect(personaSystem.capTamerLoss(100, 1000, false)).toBe(100);
    // 激活且 raw < 上限：原样返回
    expect(personaSystem.capTamerLoss(100, 1000, true)).toBe(100);
    // 激活且 raw > 上限(=500)：封顶
    expect(personaSystem.capTamerLoss(800, 1000, true)).toBe(500);
    // 上限随当前数字缩放
    expect(personaSystem.capTamerLoss(800, 100, true)).toBe(50);
  });

  it('编年史家 L2 缓冲 = floor(CHRONICLER_START_BUFFER_MAX · s)', () => {
    expect(personaSystem.computeChroniclerStartBuffer(0)).toBe(0);
    expect(personaSystem.computeChroniclerStartBuffer(1)).toBe(CHRONICLER_START_BUFFER_MAX); // 50
    expect(personaSystem.computeChroniclerStartBuffer(0.5)).toBe(25);
    expect(personaSystem.computeChroniclerStartBuffer(0.999)).toBe(49);
  });
});

describe('A③ 数字印记来源 B：超越里程碑（R1 红线，GDD §2.2）', () => {
  it('IMPRINT_TRANSCEND_MILESTONES = [5,10,25,50,100]（共 5，与 R1 红线 5 次超越里程碑吻合）', () => {
    expect([...IMPRINT_TRANSCEND_MILESTONES]).toEqual([5, 10, 25, 50, 100]);
  });

  it('computeTranscendImprintGain 跨越规则（幂等、可离线大跳累计）', () => {
    expect(computeTranscendImprintGain(4, 5)).toBe(1);
    expect(computeTranscendImprintGain(4, 100)).toBe(5); // 离线大跳：一次性跨越全部 5 个
    expect(computeTranscendImprintGain(5, 5)).toBe(0); // 已跨过，不重复
    expect(computeTranscendImprintGain(99, 100)).toBe(1);
    expect(computeTranscendImprintGain(0, 0)).toBe(0);
    expect(computeTranscendImprintGain(25, 26)).toBe(0); // 25 已跨过，26 未达 50
  });
});

describe('A③ Serializer 旧存档兜底（GDD §6.3 / §6.5）', () => {
  it('旧骨架 {depthAccumulated} → 默认未激活 L0，不崩溃', () => {
    const base = serialize(new GameState());
    const legacy = { ...base, persona: { depthAccumulated: 99 } } as unknown as ReturnType<typeof serialize>;
    const restored = deserialize(legacy);
    expect(restored.persona.active).toBeNull();
    expect(restored.persona.levels).toEqual({
      persona_walker: 0,
      persona_tamer: 0,
      persona_chronicler: 0,
    });
  });

  it('新形状往返保留 active / levels / 印记', () => {
    const s = new GameState();
    s.persona.active = 'persona_tamer';
    s.persona.levels.persona_tamer = 2;
    s.numeralImprints = 11;
    const restored = deserialize(serialize(s));
    expect(restored.persona.active).toBe('persona_tamer');
    expect(restored.persona.levels.persona_tamer).toBe(2);
    expect(restored.numeralImprints).toBe(11);
  });
});
