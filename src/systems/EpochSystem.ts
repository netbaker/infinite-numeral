import { BigNumber } from '@/core/BigNumber';
import { EPOCH_CONFIGS, TRANSCEND_UPGRADE_DEFS } from '@/core/Constants';
import type { EpochConfig, GameState } from '@/types/game';

/**
 * 纪元系统
 *
 * 负责纪元切换检测、当前纪元查询和纪元进度计算。
 */
export class EpochSystem {
  /**
   * 计算纪元阈值折扣
   * 基于meta_epoch升级：-15%/级
   *
   * @param state 游戏状态
   * @returns 阈值折扣系数（0-1之间）
   */
  getEpochDiscount(state: GameState): number {
    const metaEpochState = state.transcendUpgrades.get('meta_epoch');
    if (!metaEpochState || metaEpochState.level === 0) {
      return 0;
    }
    const metaEpochDef = TRANSCEND_UPGRADE_DEFS.find(d => d.id === 'meta_epoch');
    if (!metaEpochDef) return 0;
    // -15%/级，最大3级 = -45%
    return Math.min(metaEpochDef.effectValue * metaEpochState.level, 0.45);
  }

  /**
   * 获取压缩后的纪元阈值
   * @param epochId 纪元ID
   * @param discount 折扣（0-1）
   */
  getCompressedThreshold(epochId: string, discount: number): number {
    const epoch = EPOCH_CONFIGS.find(e => e.id === epochId);
    if (!epoch) return 0;
    return Math.floor(epoch.threshold * (1 - discount));
  }

  /**
   * 检查纪元切换
   *
   * 遍历 EPOCH_CONFIGS（按 threshold 降序），找到 totalNumber >= threshold 的最新纪元。
   * 如果与 currentEpoch 不同，返回新纪元ID；否则返回 null。
   *
   * @param totalNumber 累计总数字
   * @param currentEpochId 当前纪元ID
   * @param state 游戏状态（用于计算阈值折扣）
   * @returns 新纪元ID或null
   */
  checkEpochTransition(totalNumber: BigNumber, currentEpochId: string, state?: GameState): string | null {
    const discount = state ? this.getEpochDiscount(state) : 0;
    const newEpoch = this._findEpochByThreshold(totalNumber, discount);
    if (newEpoch && newEpoch.id !== currentEpochId) {
      return newEpoch.id;
    }
    return null;
  }

  /**
   * 获取当前应处于的纪元配置
   *
   * @param totalNumber 累计总数字
   * @param state 游戏状态（用于计算阈值折扣）
   * @returns 当前纪元配置
   */
  getCurrentEpoch(totalNumber: BigNumber, state?: GameState): EpochConfig {
    const discount = state ? this.getEpochDiscount(state) : 0;
    return this._findEpochByThreshold(totalNumber, discount) ?? EPOCH_CONFIGS[0];
  }

  /**
   * 获取纪元进度
   *
   * 返回当前纪元→下一纪元的进度百分比(0-100)。
   * 如果已处于最终纪元，percent=100。
   *
   * @param totalNumber 累计总数字
   * @param state 游戏状态（用于计算阈值折扣）
   * @returns 进度信息
   */
  getEpochProgress(
    totalNumber: BigNumber,
    state?: GameState,
  ): { current: string; next: string | null; percent: number } {
    const discount = state ? this.getEpochDiscount(state) : 0;
    const currentEpoch = this.getCurrentEpoch(totalNumber, state);

    // 按 threshold 升序排列的副本（应用折扣）
    const sortedAsc = [...EPOCH_CONFIGS]
      .map(e => ({
        ...e,
        threshold: this.getCompressedThreshold(e.id, discount),
      }))
      .sort((a, b) => a.threshold - b.threshold);

    const currentIndex = sortedAsc.findIndex((e) => e.id === currentEpoch.id);

    // 是否有下一个纪元
    const nextEpoch: EpochConfig | null =
      currentIndex >= 0 && currentIndex < sortedAsc.length - 1
        ? sortedAsc[currentIndex + 1]
        : null;

    if (!nextEpoch) {
      return {
        current: currentEpoch.name,
        next: null,
        percent: 100,
      };
    }

    // 计算进度百分比
    const currentThreshold = this.getCompressedThreshold(currentEpoch.id, discount);
    const nextThreshold = nextEpoch.threshold;
    const range = nextThreshold - currentThreshold;
    const totalNum = parseFloat(totalNumber.toString());

    let percent = 0;
    if (range > 0 && !isNaN(totalNum)) {
      const progress = (totalNum - currentThreshold) / range;
      percent = Math.min(Math.max(progress * 100, 0), 100);
    }

    return {
      current: currentEpoch.name,
      next: nextEpoch.name,
      percent,
    };
  }

  /**
   * 根据 totalNumber 找到对应的纪元（threshold 降序遍历）
   *
   * @param totalNumber 累计总数字
   * @param discount 阈值折扣（0-1）
   * @returns 匹配的纪元配置或undefined
   */
  private _findEpochByThreshold(totalNumber: BigNumber, discount: number = 0): EpochConfig | undefined {
    // 按 threshold 降序排列
    const sortedDesc = [...EPOCH_CONFIGS].sort((a, b) => b.threshold - a.threshold);

    for (const epoch of sortedDesc) {
      const compressedThreshold = this.getCompressedThreshold(epoch.id, discount);
      if (totalNumber.gte(compressedThreshold)) {
        return epoch;
      }
    }

    // 默认返回第一个（最低阈值）
    return EPOCH_CONFIGS[0];
  }
}
