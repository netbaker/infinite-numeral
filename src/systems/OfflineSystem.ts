import { BigNumber } from '@/core/BigNumber';
import { OFFLINE_MAX_HOURS } from '@/core/Constants';
import type { GameState, OfflineResult } from '@/types/game';
import { ProducerSystem } from './ProducerSystem';
import { MultiplierSystem } from './MultiplierSystem';

/**
 * 离线收益系统
 *
 * 负责计算玩家离线期间的收益，支持效率递减机制。
 */
export class OfflineSystem {
  /** 100%效率的最大时长（秒） */
  private static readonly FULL_EFFICIENCY_SECONDS = 8 * 3600;

  /** 50%效率的时长范围（秒） */
  private static readonly HALF_EFFICIENCY_SECONDS = 8 * 3600;

  /** 25%效率的时长范围（秒） */
  private static readonly QUARTER_EFFICIENCY_SECONDS = 8 * 3600;

  /**
   * 计算离线期间总产出
   *
   * 总产出 = totalOutputPerSec × min(offlineMs/1000, OFFLINE_MAX_HOURS*3600)
   * 效率递减：0-8h=100%, 8-16h=50%, 16-24h=25%
   *
   * @param state 当前游戏状态
   * @param offlineMs 离线毫秒数
   * @returns 离线期间获得的数字
   */
  calculateOfflineGain(state: GameState, offlineMs: number): BigNumber {
    const producerSystem = new ProducerSystem();
    const multiplierSystem = new MultiplierSystem();
    multiplierSystem.recalculateFromState(state);

    const totalOutputPerSec = producerSystem.calculateTotalOutput(state, multiplierSystem);
    const maxOfflineSec = OFFLINE_MAX_HOURS * 3600;
    const offlineSec = Math.min(offlineMs / 1000, maxOfflineSec);

    if (offlineSec <= 0 || totalOutputPerSec.eq(0)) {
      return BigNumber.zero();
    }

    // 效率递减计算
    const efficiency = this._calculateEfficiency(offlineSec);
    const effectiveSec = offlineSec * efficiency;

    return totalOutputPerSec.mul(effectiveSec);
  }

  /**
   * 获取离线收益详情
   *
   * @param state 当前游戏状态
   * @param offlineMs 离线毫秒数
   * @returns 离线收益结果
   */
  getOfflineEarnings(state: GameState, offlineMs: number): OfflineResult {
    const maxOfflineSec = OFFLINE_MAX_HOURS * 3600;
    const offlineSec = Math.min(offlineMs / 1000, maxOfflineSec);
    const efficiency = this._calculateEfficiency(offlineSec);

    return {
      gainedNumber: this.calculateOfflineGain(state, offlineMs),
      offlineDuration: offlineSec,
      efficiency,
    };
  }

  /**
   * 根据离线时长计算效率
   *
   * 0-8h = 100%, 8-16h = 50%, 16-24h = 25%
   * 综合效率 = 加权平均
   *
   * @param offlineSec 离线秒数
   * @returns 效率值（0-1）
   */
  private _calculateEfficiency(offlineSec: number): number {
    if (offlineSec <= 0) {
      return 0;
    }

    const full = OfflineSystem.FULL_EFFICIENCY_SECONDS;
    const half = OfflineSystem.HALF_EFFICIENCY_SECONDS;
    const quarter = OfflineSystem.QUARTER_EFFICIENCY_SECONDS;

    let effectiveTime = 0;

    // 0-8h: 100%
    const tier1 = Math.min(offlineSec, full);
    effectiveTime += tier1 * 1.0;

    // 8-16h: 50%
    if (offlineSec > full) {
      const tier2 = Math.min(offlineSec - full, half);
      effectiveTime += tier2 * 0.5;
    }

    // 16-24h: 25%
    if (offlineSec > full + half) {
      const tier3 = Math.min(offlineSec - full - half, quarter);
      effectiveTime += tier3 * 0.25;
    }

    return effectiveTime / offlineSec;
  }
}
