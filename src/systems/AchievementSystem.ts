import { ACHIEVEMENT_DEFS } from '@/core/Constants';
import type { AchievementDef } from '@/types/game';
import type { GameState } from '@/types/game';
import { BigNumber } from '@/core/BigNumber';

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
        return BigNumber.from(state.number).gte(BigNumber.from(def.conditionValue));

      case 'total_number_reach':
        return BigNumber.from(state.totalNumber).gte(BigNumber.from(def.conditionValue));

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
