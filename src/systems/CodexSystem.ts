/**
 * 数字神话图鉴系统（CodexSystem）
 *
 * 纯函数模块（对齐 PrestigeSystem / ArchiveSystem 形状）：所有函数接收 `state: GameState`
 * 并就地修改 `state.codexEntries`，不持有任何实例状态。
 *
 * 关键约定（来自主理人指令 + GDD）：
 * - 自动收录使用【精确文本匹配】（约束 B）：`onNarrativeTriggered(state, text)` 扫描
 *   CODEX_DEFS，凡 `narrativeTriggers.includes(text)` 且尚未收录者，标记收录并去重。
 * - 未解之谜解锁为【跨系统条件组合】，由 `evaluateMystery` 统一评估 `unlockConditions`。
 * - 皮肤相关条件（mystery_10 的 `skin_active`）已接入 Sprint 4 皮肤系统，
 *   比对 `state.activeNumberSkin`（GDD 旧命名 `binary_pulse` 对齐为 `skin_binary`）。
 */

import type { GameState } from '@/types/game';
import {
  CODEX_DEFS,
  CODEX_TOTAL_BY_CATEGORY,
  type CodexCategory,
  type CodexEntryDef,
  type CodexEntryState,
  type CodexUnlockCondition,
} from '@/types/codex';
import { ACHIEVEMENT_DEFS } from '@/core/Constants';

/** 常量：NEW 高亮窗口（24 小时，ms） */
export const CODE_NEW_BADGE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** 分类顺序（用于 UI 与计数） */
export const CODEX_CATEGORIES: CodexCategory[] = ['origin', 'cosmic_event', 'sage_record', 'mystery', 'knowledge'];

/**
 * 叙事触发时尝试自动收录。
 * @returns 本次【新收录】的词条定义数组（用于驱动 UI 通知；已收录的不重复返回，实现去重）
 */
export function onNarrativeTriggered(state: GameState, text: string): CodexEntryDef[] {
  if (!text) return [];
  const newlyCollected: CodexEntryDef[] = [];
  for (const def of CODEX_DEFS) {
    const triggers = def.narrativeTriggers;
    if (!triggers || triggers.length === 0) continue;
    if (!triggers.includes(text)) continue;
    const existing = state.codexEntries.get(def.id);
    if (existing && existing.unlocked) continue; // 去重：已收录不重复
    const entry: CodexEntryState = { id: def.id, unlocked: true, unlockedAt: Date.now() };
    state.codexEntries.set(def.id, entry);
    newlyCollected.push(def);
  }
  return newlyCollected;
}

/**
 * 评估单条未解之谜是否满足条件（全部 unlockConditions 为 AND）。
 * 纯函数，只读 state；对缺失字段做防御性降级（视为不满足条件）。
 */
export function evaluateMystery(state: GameState, def: CodexEntryDef): boolean {
  const conditions = def.unlockConditions;
  if (!conditions || conditions.length === 0) return false;
  return conditions.every((c) => evaluateCondition(state, c));
}

/** 单条条件评估 */
function evaluateCondition(state: GameState, c: CodexUnlockCondition): boolean {
  const p = c.params ?? {};
  switch (c.type) {
    case 'dimension_event': {
      const dim = Number(p.dimension);
      const event = String(p.event ?? '');
      switch (event) {
        case 'entropy_collapse':
          return state.collapsedDimensions.has(dim);
        case 'chaos_streak_4x': {
          const need = Number(p.count ?? 3);
          return dim === 2 && state._chaosStreak4x >= need;
        }
        case 'zero_collapse_run':
          // 在反熵维度（dim3）完成一轮 0 次熵崩的 Run：当前维度为 3 且本轮无崩塌
          return dim === 3 && state.currentDimension === 3 && (state._runCollapses ?? 0) === 0;
        case 'singularity_burst':
          return dim === 4 && state._singularityBurstEver === true;
        case 'prestige_during_burst':
          return dim === 4 && state._prestigeDuringBurst === true;
        case 'expansion':
          return dim === 2 && state._expandedInChaosDim === true;
        default:
          return false;
      }
    }
    case 'gene_possess': {
      if (p.allTypes) {
        // 跨多轮累积的全部 8 种基因类型（chain + 持久集合）
        const types = collectGeneTypes(state);
        return types.size >= 8;
      }
      const gene = String(p.gene ?? '');
      const needLevel = Number(p.level ?? 1);
      return state.geneChain.chain.some((g) => g.type === gene && g.level >= needLevel);
    }
    case 'transcend_count':
      return state.transcendCount >= Number(p.min ?? 0);
    case 'prestige_count':
      return state.prestigeCount >= Number(p.min ?? 0);
    case 'expansion_count':
      return state.expansionCount >= Number(p.min ?? 0);
    case 'entropy_collapse': {
      if (p.requireCollapse && (state.collapsedDimensions.size === 0 && (state.totalCollapses ?? 0) === 0))
        return false;
      if (typeof p.entropyAtLeast === 'number' && state.entropy < p.entropyAtLeast) return false;
      if (typeof p.inRunAtLeast === 'number' && (state._runCollapses ?? 0) < p.inRunAtLeast) return false;
      if (p.duringBurst && state._prestigeDuringBurst !== true) return false;
      return true;
    }
    case 'archive_count': {
      const min = Number(p.min ?? 0);
      const have = state._archiveRecordCount + (state.archiveUnlocked ? 1 : 0);
      return have >= min;
    }
    case 'achievement_all': {
      if (!ACHIEVEMENT_DEFS || ACHIEVEMENT_DEFS.length === 0) return false;
      return ACHIEVEMENT_DEFS.every((d) => {
        const st = state.achievements.get(d.id);
        return !!st && st.unlocked;
      });
    }
    case 'codex_complete': {
      // 检查"非未解之谜"词条是否 100% 收录
      const nonMystery = CODEX_DEFS.filter((d) => d.category !== 'mystery');
      return nonMystery.every((d) => {
        const st = state.codexEntries.get(d.id);
        return !!st && st.unlocked;
      });
    }
    case 'skin_active': {
      // Sprint 4 皮肤系统接入：检查当前激活数字皮肤。
      // GDD codex 旧命名为 'binary_pulse'，本作对齐为 NumberSkinId 'skin_binary'。
      const raw = String(p.skin ?? '');
      const expected = raw === 'binary_pulse' ? 'skin_binary' : raw;
      return state.activeNumberSkin === expected;
    }
    case 'number_exact': {
      if (typeof p.value === 'number' && state.number.toString() !== String(p.value)) return false;
      if (typeof p.log10AtLeast === 'number') {
        const log10 = state.number.log10().toNumber();
        if (log10 < p.log10AtLeast) return false;
      }
      if (typeof p.darkEnergyAtLeast === 'number' && state.darkEnergy < p.darkEnergyAtLeast) return false;
      return true;
    }
    case 'dimension_mastery': {
      const needLevel = Number(p.level ?? 5);
      const needMaster = needLevel * 20; // master 0-100，每 20 为 1 级
      if (p.all) {
        for (let i = 0; i < 5; i++) {
          const ds = state.dimensionStates.get(i);
          if (!ds || ds.master < needMaster) return false;
        }
        return true;
      }
      const dim = Number(p.dimension);
      const ds = state.dimensionStates.get(dim);
      return !!ds && ds.master >= needMaster;
    }
    case 'item_used_count': {
      const item = String(p.item ?? '');
      if (item === 'rewind') return state._rewindUsedCount >= Number(p.min ?? 0);
      return false;
    }
    case 'dark_energy':
      return state.darkEnergy >= Number(p.min ?? 0);
    default:
      return false;
  }
}

/** 汇总基因链 + 跨轮累积集合中的全部基因类型（用于 mystery_05 的 allTypes 判定） */
function collectGeneTypes(state: GameState): Set<string> {
  const set = new Set<string>();
  for (const g of state.geneChain.chain) set.add(g.type);
  for (const t of state._allGeneTypesEver) set.add(t);
  return set;
}

/**
 * 解锁单条未解之谜（就地修改 state.codexEntries）。
 * @returns 该词条是否已【新解锁】（用于通知去重）
 */
export function unlockMystery(state: GameState, def: CodexEntryDef): boolean {
  const existing = state.codexEntries.get(def.id);
  if (existing && existing.unlocked) return false;
  state.codexEntries.set(def.id, { id: def.id, unlocked: true, unlockedAt: Date.now() });
  return true;
}

/**
 * 全量检查所有未解之谜解锁条件（兜底，GDD §6.3）。
 * 通常在每次 Transcend / 维度切换 / 熵崩 / 基因变化 / 皮肤切换后调用。
 * @returns 本次【新解锁】的未解之谜定义数组（用于驱动 UI 通知）
 */
export function checkAllMysteries(state: GameState): CodexEntryDef[] {
  const newlyUnlocked: CodexEntryDef[] = [];
  for (const def of CODEX_DEFS) {
    if (def.category !== 'mystery') continue;
    const existing = state.codexEntries.get(def.id);
    if (existing && existing.unlocked) continue;
    if (evaluateMystery(state, def) && unlockMystery(state, def)) {
      newlyUnlocked.push(def);
    }
  }
  return newlyUnlocked;
}

/**
 * 计算各分类的已收录 / 总数（供 UI 进度展示，GDD §5）。不写入 GameState。
 */
export function getCategoryCounts(state: GameState): Record<CodexCategory, { unlocked: number; total: number }> {
  const result = {} as Record<CodexCategory, { unlocked: number; total: number }>;
  for (const cat of CODEX_CATEGORIES) {
    const total = CODEX_TOTAL_BY_CATEGORY[cat];
    let unlocked = 0;
    for (const def of CODEX_DEFS) {
      if (def.category !== cat) continue;
      const st = state.codexEntries.get(def.id);
      if (st && st.unlocked) unlocked++;
    }
    result[cat] = { unlocked, total };
  }
  return result;
}

/**
 * 判断某词条是否应显示 NEW 高亮（收录/解锁时间在 24h 内）。
 */
export function isNewlyUnlocked(entry: CodexEntryState | undefined, now: number = Date.now()): boolean {
  if (!entry || !entry.unlocked || !entry.unlockedAt) return false;
  return now - entry.unlockedAt <= CODE_NEW_BADGE_WINDOW_MS;
}
