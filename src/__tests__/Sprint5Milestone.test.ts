import { describe, it, expect } from 'vitest';
import { GameState } from '@/types/game';
import { onNarrativeTriggered } from '@/systems/CodexSystem';
import { MAGNITUDE_MILESTONE_DEFS } from '@/core/Constants';
import { CODEX_DEFS } from '@/types/codex';

/**
 * Sprint 5 Phase 3（Magnitude Milestone · B·Must）契约测试
 *
 * 覆盖 B③ 钩子核心契约：游戏每 tick 跨越量级时，gameStore 以 MAGNITUDE_MILESTONE_DEFS
 * 驱动 codexSystem.onNarrativeTriggered(state, def.narration)，由此解锁对应 knowledge 词条。
 *
 * 本测试直接对契约本身（def.narration → knowledgeEntryId 解锁）做断言，闭合 B 层作者
 * 标注的"里程碑跨越是否真的解锁知识词条"缺口；同时验证 def 表结构与 9 条兜底条目经
 * 共享 narration 一并解锁（共 20 条 knowledge）。
 */
describe('Sprint 5 Phase 3 量级里程碑 → 知识解锁（B③ 钩子契约）', () => {
  it('MAGNITUDE_MILESTONE_DEFS 共 11 条，log10 集合对齐 GDD §2.2，且结构合法', () => {
    expect(MAGNITUDE_MILESTONE_DEFS.length).toBe(11);
    const logSet = MAGNITUDE_MILESTONE_DEFS.map((d) => d.log10).sort((a, b) => a - b);
    expect(logSet).toEqual([6, 9, 12, 18, 23, 24, 50, 63, 80, 100, 308]);
    for (const d of MAGNITUDE_MILESTONE_DEFS) {
      // 一次性非货币维度洞察奖励（不发放数字印记，R1 红线）
      expect(d.reward.kind).toBe('dimensionInsight');
      expect(d.reward.insightId).toBe(`ins_log${d.log10}`);
      // knowledgeEntryId 必须在 CODEX_DEFS 中真实存在
      expect(CODEX_DEFS.some((c) => c.id === d.knowledgeEntryId)).toBe(true);
    }
  });

  it('跨越每个量级（log10>=该档）经 onNarrativeTriggered 解锁对应 knowledge 词条', () => {
    const state = new GameState();
    for (const def of MAGNITUDE_MILESTONE_DEFS) {
      const collected = onNarrativeTriggered(state, def.narration);
      // 该 narration 应精确命中其 knowledgeEntryId（逐字符匹配）
      expect(collected.some((c) => c.id === def.knowledgeEntryId)).toBe(true);
      expect(state.codexEntries.get(def.knowledgeEntryId)?.unlocked).toBe(true);
    }
    // 11 个专门里程碑 + 9 个兜底条目（共享 narration）应全部解锁 = 20 条 knowledge
    const unlockedKnowledge = [...state.codexEntries.values()].filter(
      (e) => e.unlocked && CODEX_DEFS.find((c) => c.id === e.id)?.category === 'knowledge',
    );
    expect(unlockedKnowledge.length).toBe(20);
  });

  it('重复触发同一量级叙事幂等（不重复收录/通知）', () => {
    const state = new GameState();
    const def = MAGNITUDE_MILESTONE_DEFS[0]; // log10:6 → know_million
    const first = onNarrativeTriggered(state, def.narration);
    expect(first.some((c) => c.id === def.knowledgeEntryId)).toBe(true);
    const second = onNarrativeTriggered(state, def.narration);
    expect(second.length).toBe(0); // 二次触发返回空，不重复收录
    expect(state.codexEntries.get(def.knowledgeEntryId)?.unlocked).toBe(true);
  });

  it('未命中任何里程碑叙事时不解锁（负向校验）', () => {
    const state = new GameState();
    const collected = onNarrativeTriggered(state, '一段不存在的里程碑叙事xyz');
    expect(collected.length).toBe(0);
    expect(state.codexEntries.size).toBe(0);
  });
});
