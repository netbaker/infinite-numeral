import { BigNumber } from '@/core/BigNumber';
import { PRODUCER_CONFIGS } from '@/core/Constants';
import type { GameState, ProducerConfig } from '@/types/game';
import type { MultiplierSystem } from './MultiplierSystem';

/**
 * 生产者系统
 *
 * 负责生产者的购买、成本计算、产出计算和解锁检测。
 */
export class ProducerSystem {
  /**
   * 购买生产者
   *
   * 计算成本 = baseCost × costMultiplier^level × (1 - discountPercent)
   * 检查 number >= cost，扣除并增加 level。
   *
   * @param id 生产者ID
   * @param state 当前游戏状态
   * @param discountPercent 星尘折扣百分比（0-1）
   * @returns 购买结果
   */
  buyProducer(
    id: string,
    state: GameState,
    discountPercent: number = 0,
  ): { success: boolean; cost?: BigNumber } {
    const config = PRODUCER_CONFIGS.find((c) => c.id === id);
    if (!config) {
      return { success: false };
    }

    // 检查是否已解锁
    if (!state.unlockedProducers.has(id)) {
      return { success: false };
    }

    const producerState = state.producers.get(id);
    if (!producerState) {
      return { success: false };
    }

    const cost = this.calculateCost(config, producerState.level, discountPercent);
    const currentNumber = BigNumber.from(state.number);

    if (currentNumber.lt(cost)) {
      return { success: false, cost };
    }

    // 扣除并增加 level
    state.number = currentNumber.sub(cost).toDecimal();
    producerState.level += 1;

    return { success: true, cost };
  }

  /**
   * 批量购买 N 级生产者
   *
   * @param id 生产者ID
   * @param state 当前游戏状态
   * @param quantity 购买数量
   * @param discountPercent 折扣百分比
   */
  buyProducerBulk(
    id: string,
    state: GameState,
    quantity: number,
    discountPercent: number = 0,
  ): { success: boolean; cost?: BigNumber; purchased: number } {
    const config = PRODUCER_CONFIGS.find((c) => c.id === id);
    if (!config || !state.unlockedProducers.has(id)) return { success: false, purchased: 0 };

    const producerState = state.producers.get(id);
    if (!producerState) return { success: false, purchased: 0 };

    const totalCost = this.calculateBulkCost(config, producerState.level, quantity, discountPercent);
    const currentNumber = BigNumber.from(state.number);

    if (currentNumber.lt(totalCost)) return { success: false, cost: totalCost, purchased: 0 };

    state.number = currentNumber.sub(totalCost).toDecimal();
    producerState.level += quantity;

    return { success: true, cost: totalCost, purchased: quantity };
  }

  /**
   * 批量购买总成本（等比数列求和）
   *
   * 成本 = baseCost × costMultiplier^level × (1 - discountPercent)
   *
   * @param config 生产者配置
   * @param level 当前等级
   * @param discountPercent 折扣百分比（0-1，如0.1表示10%折扣）
   * @returns 购买成本
   */
  calculateCost(
    config: ProducerConfig,
    level: number,
    discountPercent: number = 0,
  ): BigNumber {
    const baseCost = BigNumber.from(config.baseCost);
    const growth = BigNumber.from(config.costMultiplier).pow(level);
    const discount = BigNumber.from(1 - discountPercent);
    return baseCost.mul(growth).mul(discount);
  }

  /**
   * 批量购买总成本（等比数列求和）
   */
  calculateBulkCost(
    config: ProducerConfig,
    level: number,
    quantity: number,
    discountPercent: number = 0,
  ): BigNumber {
    const baseCost = BigNumber.from(config.baseCost);
    const growth = BigNumber.from(config.costMultiplier).pow(level);
    const discount = BigNumber.from(1 - discountPercent);
    const multiplier = BigNumber.from(config.costMultiplier);
    // 防御：如果 costMultiplier === 1，等比数列退化为 N × 单级成本
    if (multiplier.eq(1)) {
      return baseCost.mul(growth).mul(quantity).mul(discount);
    }
    const numerator = multiplier.pow(quantity).sub(1);
    const denominator = multiplier.sub(1);
    const geometricSum = numerator.div(denominator);
    return baseCost.mul(growth).mul(geometricSum).mul(discount);
  }

  /**
   * 计算所有生产者的总产出（每秒）
   *
   * 产出 = level × baseOutput × producerMultiplier × globalMultiplier
   *
   * @param state 当前游戏状态
   * @param multiplierSystem 倍增器系统
   * @returns 总产出/秒
   */
  calculateTotalOutput(
    state: GameState,
    multiplierSystem: MultiplierSystem,
  ): BigNumber {
    let totalOutput = BigNumber.zero();

    for (const config of PRODUCER_CONFIGS) {
      const producerState = state.producers.get(config.id);
      if (!producerState || producerState.level === 0) {
        continue;
      }

      const level = BigNumber.from(producerState.level);
      const baseOutput = BigNumber.from(config.baseOutput);
      const producerMultiplier = multiplierSystem.getProducerMultiplier(config.id);
      const globalMultiplier = multiplierSystem.getGlobalMultiplier();

      // 产出 = level × baseOutput × producerMultiplier × globalMultiplier
      const output = level.mul(baseOutput).mul(producerMultiplier).mul(globalMultiplier);
      totalOutput = totalOutput.add(output);
    }

    return totalOutput;
  }

  /**
   * 检查哪些生产者满足解锁条件
   *
   * 条件：totalNumber >= unlockThreshold 且尚未解锁
   *
   * @param state 当前游戏状态
   * @returns 新解锁的生产者ID列表
   */
  checkUnlocks(state: GameState): string[] {
    const totalNumber = BigNumber.from(state.totalNumber);
    const newlyUnlocked: string[] = [];

    for (const config of PRODUCER_CONFIGS) {
      // 已解锁则跳过
      if (state.unlockedProducers.has(config.id)) {
        continue;
      }

      // 检查阈值
      if (totalNumber.gte(config.unlockThreshold)) {
        newlyUnlocked.push(config.id);
      }
    }

    return newlyUnlocked;
  }

  /**
   * 获取生产者配置
   *
   * @param id 生产者ID
   * @returns 配置或undefined
   */
  getConfig(id: string): ProducerConfig | undefined {
    return PRODUCER_CONFIGS.find((c) => c.id === id);
  }
}
