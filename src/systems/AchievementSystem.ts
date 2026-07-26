import { ACHIEVEMENT_DEFS } from '@/core/Constants';
import type { AchievementDef, GameState, DimensionId } from '@/types/game';

/**
 * 成就系统
 *
 * 负责检查游戏状态，判断哪些成就刚刚满足触发条件。
 * 不直接修改 GameState，只返回新解锁的成就定义列表，
 * 由 gameStore 负责写入状态并触发 Toast。
 */
export class AchievementSystem {
  /**
   * 检查并返回本次 tick 新解锁的成就
   *
   * @param state 当前游戏状态
   * @returns 新解锁的 AchievementDef 列表
   */
  checkAchievements(state: GameState): AchievementDef[] {
    const newlyUnlocked: AchievementDef[] = [];

    for (const def of ACHIEVEMENT_DEFS) {
      // 已解锁则跳过
      const existing = state.achievements.get(def.id);
      if (existing?.unlocked) continue;

      // 宇宙档案馆特殊成就（group: 'archive'）由 ArchiveSystem.evaluateSpecialAchievements
      // 在超越时统一判定解锁，普通逐 tick 检查不参与，避免条件被误触发
      if (def.group === 'archive') continue;

      if (this.evaluate(def, state)) {
        newlyUnlocked.push(def);
      }
    }

    return newlyUnlocked;
  }

  /**
   * 初始化成就状态 Map（每个 def 对应一个未解锁条目）
   */
  initAchievements(state: GameState): void {
    for (const def of ACHIEVEMENT_DEFS) {
      if (!state.achievements.has(def.id)) {
        state.achievements.set(def.id, { id: def.id, unlocked: false });
      }
    }
  }

  // ----------------------------------------------------------------
  // 私有评估逻辑
  // ----------------------------------------------------------------

  private evaluate(def: AchievementDef, state: GameState): boolean {
    switch (def.conditionType) {
      case 'number_reach':
        // Phase 6 打磨（性能）：state.number 已是 Decimal，无需 new Decimal 复制；
        // gte 直接接受 number 字面量，省去每条件两次 Decimal 分配。
        return state.number.gte(def.conditionValue);

      case 'total_number_reach':
        return state.totalNumber.gte(def.conditionValue);

      case 'prestige_count':
        return state.prestigeCount >= def.conditionValue;

      case 'expansion_count':
        return state.expansionCount >= def.conditionValue;

      case 'transcend_count':
        return state.transcendCount >= def.conditionValue;

      case 'click_count':
        return state.totalClicks >= def.conditionValue;

      case 'stardust_total':
        return state.cumulativeStardust >= def.conditionValue;

      case 'singularity_total':
        return state.singularity >= def.conditionValue;

      case 'producer_level': {
        if (!def.conditionTarget) return false;
        const ps = state.producers.get(def.conditionTarget);
        return (ps?.level ?? 0) >= def.conditionValue;
      }

      case 'epoch_reach': {
        if (!def.conditionTarget) return false;
        // 按 EPOCH_CONFIGS 顺序判断当前纪元是否已达到目标纪元或更高
        return this.epochAtLeast(state.currentEpoch, def.conditionTarget);
      }

      case 'dimension_mastery': {
        // 全维 L3：遍历全部维度 master 均 >= conditionValue（如 60）
        if (def.conditionParam?.allDimensions) {
          for (let d = 0; d <= 4; d++) {
            const ds = state.dimensionStates.get(d as DimensionId);
            if (!ds || ds.master < (def.conditionValue ?? 100)) return false;
          }
          return true;
        }
        const dim = Number(def.conditionTarget ?? 0);
        const ds = state.dimensionStates.get(dim as DimensionId);
        if (!ds || ds.master < (def.conditionValue ?? 100)) return false;
        // Killer tempo 限制：须在重置计数到达阈值【之前】达成（越过即永久失去此挑战）
        if (def.conditionParam?.beforeTranscend != null
            && state.transcendCount >= def.conditionParam.beforeTranscend) return false;
        if (def.conditionParam?.beforeExpansion != null
            && state.expansionCount >= def.conditionParam.beforeExpansion) return false;
        return true;
      }

      default:
        return false;
    }
  }

  /** 判断 current 纪元是否 >= target 纪元（按 EPOCH_CONFIGS 顺序） */
  private epochAtLeast(current: string, target: string): boolean {
    // 纪元顺序：sprout < expand < construct < perceive < celestial
    const ORDER = ['sprout', 'expand', 'construct', 'perceive', 'celestial'];
    const ci = ORDER.indexOf(current);
    const ti = ORDER.indexOf(target);
    if (ci === -1 || ti === -1) return false;
    return ci >= ti;
  }
}
