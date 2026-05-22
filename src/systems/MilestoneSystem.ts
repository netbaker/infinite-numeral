import type { GameState, MilestoneDef, MilestoneState } from '@/types/game';
import { TRANSCEND_MILESTONE_DEFS } from '@/core/Constants';

/**
 * 里程碑检查结果
 */
export interface MilestoneCheckResult {
  /** 刚解锁的里程碑列表 */
  newlyUnlocked: MilestoneDef[];
  /** 所有已解锁里程碑 */
  unlockedMilestones: MilestoneDef[];
  /** 当前里程碑奖励倍率 */
  currentMultiplier: number;
  /** 是否解锁超元升级 */
  hasUnlockedMetaUpgrades: boolean;
}

/**
 * 里程碑系统
 * 管理多周目里程碑的检查和解锁
 */
export class MilestoneSystem {
  /**
   * 检查并返回里程碑解锁状态
   */
  checkMilestones(state: GameState): MilestoneCheckResult {
    const unlockedList: MilestoneDef[] = [];
    let currentMultiplier = 1;
    let hasUnlockedMetaUpgrades = false;

    for (const def of TRANSCEND_MILESTONE_DEFS) {
      if (state.transcendCount >= def.transcendCount) {
        unlockedList.push(def);
        currentMultiplier *= def.globalMultiplier;
        if (def.unlockMetaUpgrade) {
          hasUnlockedMetaUpgrades = true;
        }
      }
    }

    // 查找新解锁的里程碑（不在state.unlockedMilestones中的）
    const newlyUnlocked = unlockedList.filter(
      m => !state.unlockedMilestones.has(m.id)
    );

    return {
      newlyUnlocked,
      unlockedMilestones: unlockedList,
      currentMultiplier,
      hasUnlockedMetaUpgrades,
    };
  }

  /**
   * 获取里程碑运行时状态列表
   */
  getMilestoneStates(state: GameState): MilestoneState[] {
    return TRANSCEND_MILESTONE_DEFS.map(def => ({
      id: def.id,
      unlocked: state.transcendCount >= def.transcendCount,
      unlockedAt: state.transcendCount >= def.transcendCount ? 0 : undefined,
    }));
  }

  /**
   * 获取下一个里程碑（未解锁的）
   */
  getNextMilestone(state: GameState): MilestoneDef | null {
    for (const def of TRANSCEND_MILESTONE_DEFS) {
      if (state.transcendCount < def.transcendCount) {
        return def;
      }
    }
    return null;
  }

  /**
   * 获取当前里程碑进度（0-1）
   */
  getMilestoneProgress(state: GameState): number {
    const next = this.getNextMilestone(state);
    if (!next) return 1; // 全部解锁

    // 找到上一个已解锁的里程碑
    const prevDef = [...TRANSCEND_MILESTONE_DEFS]
      .reverse()
      .find(d => state.transcendCount >= d.transcendCount);

    const prevCount = prevDef ? prevDef.transcendCount : 0;
    const targetCount = next.transcendCount;
    const currentCount = state.transcendCount - prevCount;
    const totalNeeded = targetCount - prevCount;

    return Math.min(1, Math.max(0, currentCount / totalNeeded));
  }
}
