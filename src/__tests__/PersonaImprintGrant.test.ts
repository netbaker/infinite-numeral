// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGameStore } from '@/stores/gameStore';
import { evaluateSpecialAchievements } from '@/systems/ArchiveSystem';

/**
 * 数字印记发放集成测试（A③ 来源 A+B，R1 红线）
 *
 * 信任-验证发现的阻断：grantNumeralImprint 此前零调用方 → 玩家永远无法获得印记。
 * 本测试在真实 gameStore.executeTranscend 中验证两源正确 mint：
 *  - 来源 A = 9 个档案成就首解（newlyUnlocked 仅含新解锁 id，每个 +1）
 *  - 来源 B = 超越里程碑 5/10/25/50/100（跨越一次性发放，幂等）
 * 并验证合计钳制 ≤14（NUMERAL_IMPRINT_CAP）。
 *
 * 时序：executeTranscend 在 `gameState.value = markRaw(newState)` 之后才调用 grant，
 * 故印记写入 newState 而非被覆盖的 preState。
 */

// 阻断对真实 IndexedDB 的依赖
vi.mock('@/db/database', () => ({
  addArchiveRecord: vi.fn(async () => {}),
  getArchiveRecords: vi.fn(async () => []),
  deleteArchiveRecord: vi.fn(async () => {}),
}));

// 仅覆盖 evaluateSpecialAchievements，以确定性控制来源 A 的产出（其余保持真实）
vi.mock('@/systems/ArchiveSystem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/systems/ArchiveSystem')>();
  return {
    ...actual,
    evaluateSpecialAchievements: vi.fn(() => [] as string[]),
  };
});

const NINE_ARCH_IDS = [
  'arch_a', 'arch_b', 'arch_c', 'arch_d', 'arch_e',
  'arch_f', 'arch_g', 'arch_h', 'arch_i',
];

describe('A③ 数字印记发放 — executeTranscend 集成（R1 红线）', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(evaluateSpecialAchievements).mockReturnValue([]);
  });

  function freshStore() {
    const store = useGameStore();
    // 满足 canTranscend 前置（cumulativeDarkEnergy >= MIN_CUMULATIVE_DE = 100）
    store.gameState.cumulativeDarkEnergy = 1000;
    return store;
  }

  it('4→5 发放 +1（来源 B）；再 5→6 发放 0（不重复发放）', async () => {
    const store = freshStore();
    store.gameState.transcendCount = 4;
    store.gameState.numeralImprints = 0;
    await store.executeTranscend();
    expect(store.gameState.numeralImprints).toBe(1);
    expect(store.gameState.transcendCount).toBe(5);

    // 第二次超越 5→6：里程碑 5 已跨过，不应再发放。
    // 注意：executeTranscend 会重置 cumulativeDarkEnergy，需重新满足 canTranscend 前置。
    store.gameState.cumulativeDarkEnergy = 1000;
    await store.executeTranscend();
    expect(store.gameState.numeralImprints).toBe(1);
    expect(store.gameState.transcendCount).toBe(6);
  });

  it('档案成就首解路径：9 个首解发放 +9（来源 A，无里程碑）', async () => {
    const store = freshStore();
    store.gameState.archiveUnlocked = true; // 强制进入采集 + 成就判定分支
    store.gameState.transcendCount = 0; // 无里程碑跨越（里程碑从 5 起）
    store.gameState.numeralImprints = 0;
    vi.mocked(evaluateSpecialAchievements).mockReturnValue([...NINE_ARCH_IDS]);
    await store.executeTranscend();
    expect(store.gameState.numeralImprints).toBe(9);
  });

  it('合计封顶 ≤14（R1 红线）：13 + (9 成就 + 1 里程碑) 钳制为 14', async () => {
    const store = freshStore();
    store.gameState.archiveUnlocked = true;
    store.gameState.transcendCount = 4; // 4→5 跨一个里程碑 (+1)
    store.gameState.numeralImprints = 13; // 接近上限
    vi.mocked(evaluateSpecialAchievements).mockReturnValue([...NINE_ARCH_IDS]); // +9
    await store.executeTranscend();
    // 预期 13 + 10 = 23，但 grantNumeralImprint 钳制为 14
    expect(store.gameState.numeralImprints).toBe(14);
  });

  it('量级里程碑路径不发放印记（grantMilestoneReward 与 imprint 解耦，R1 红线）', async () => {
    // 本测试仅作结构性保障：executeTranscend 不涉及 grantMilestoneReward，
    // 印记只来自 A/B 两源。此处确认来源 B 在 4→5 恰好 +1，且若成就也为空则总为 1。
    const store = freshStore();
    store.gameState.transcendCount = 4;
    store.gameState.numeralImprints = 0;
    vi.mocked(evaluateSpecialAchievements).mockReturnValue([]); // 无成就来源
    await store.executeTranscend();
    expect(store.gameState.numeralImprints).toBe(1); // 仅来源 B
  });
});
