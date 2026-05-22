import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'break_eternity.js';
import { ProducerSystem } from '@/systems/ProducerSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { GameState } from '@/types/game';
import { PRODUCER_CONFIGS } from '@/core/Constants';

function createTestState(): GameState {
  const state = new GameState();
  for (const config of PRODUCER_CONFIGS) {
    state.producers.set(config.id, { id: config.id, level: 0 });
  }
  state.unlockedProducers.add('producer1'); // 初始解锁量数
  return state;
}

describe('ProducerSystem', () => {
  let producerSystem: ProducerSystem;

  beforeEach(() => {
    producerSystem = new ProducerSystem();
  });

  describe('calculateCost', () => {
    it('level=0 时成本=baseCost', () => {
      const config = PRODUCER_CONFIGS[0]; // 量数: baseCost=15
      const cost = producerSystem.calculateCost(config, 0);
      expect(parseFloat(cost.toString())).toBeCloseTo(15, 2);
    });

    it('level=1 时成本=baseCost × costMultiplier', () => {
      const config = PRODUCER_CONFIGS[0]; // baseCost=15, ×1.12
      const cost = producerSystem.calculateCost(config, 1);
      expect(parseFloat(cost.toString())).toBeCloseTo(15 * 1.12, 2);
    });

    it('折扣减少成本', () => {
      const config = PRODUCER_CONFIGS[0]; // baseCost=15
      const costFull = producerSystem.calculateCost(config, 0, 0);
      const cost10pct = producerSystem.calculateCost(config, 0, 0.1);
      expect(parseFloat(cost10pct.toString())).toBeLessThan(parseFloat(costFull.toString()));
    });
  });

  describe('buyProducer', () => {
    it('余额充足时购买成功', () => {
      const state = createTestState();
      state.number = new Decimal(100);
      const result = producerSystem.buyProducer('producer1', state);
      expect(result.success).toBe(true);
      expect(state.producers.get('producer1')!.level).toBe(1);
    });

    it('余额不足时购买失败', () => {
      const state = createTestState();
      state.number = new Decimal(1);
      const result = producerSystem.buyProducer('producer1', state);
      expect(result.success).toBe(false);
    });

    it('购买后扣除金额', () => {
      const state = createTestState();
      state.number = new Decimal(100);
      producerSystem.buyProducer('producer1', state);
      expect(parseFloat(state.number.toString())).toBeLessThan(100);
    });

    it('未解锁的生产者不可购买', () => {
      const state = createTestState();
      state.number = new Decimal(1e6);
      const result = producerSystem.buyProducer('producer2', state);
      expect(result.success).toBe(false);
    });

    it('不存在ID返回失败', () => {
      const state = createTestState();
      const result = producerSystem.buyProducer('nonexistent', state);
      expect(result.success).toBe(false);
    });
  });

  describe('calculateTotalOutput', () => {
    it('没有生产者时产出为0', () => {
      const state = createTestState();
      const ms = new MultiplierSystem();
      ms.recalculateFromState(state);
      const output = producerSystem.calculateTotalOutput(state, ms);
      expect(output.eq(0)).toBe(true);
    });

    it('1级量数产出=1/s', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1;
      const ms = new MultiplierSystem();
      ms.recalculateFromState(state);
      const output = producerSystem.calculateTotalOutput(state, ms);
      expect(parseFloat(output.toString())).toBeCloseTo(1, 2);
    });

    it('2级量数产出=2/s', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 2;
      const ms = new MultiplierSystem();
      ms.recalculateFromState(state);
      const output = producerSystem.calculateTotalOutput(state, ms);
      expect(parseFloat(output.toString())).toBeCloseTo(2, 2);
    });

    it('全局倍率影响产出', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1;

      const ms = new MultiplierSystem();
      ms.recalculateFromState(state);
      const outputBefore = producerSystem.calculateTotalOutput(state, ms);

      // 手动添加全局倍率
      ms.register({ id: 'test_global', source: 'upgrade', target: '', value: 2 });
      const outputAfter = producerSystem.calculateTotalOutput(state, ms);

      expect(parseFloat(outputAfter.toString())).toBeCloseTo(
        parseFloat(outputBefore.toString()) * 2,
        2,
      );
    });
  });

  describe('checkUnlocks', () => {
    it('初始时只解锁量数', () => {
      const state = createTestState();
      const newUnlocks = producerSystem.checkUnlocks(state);
      // producer1已解锁，producer2阈值100，number=0
      expect(newUnlocks).toEqual([]);
    });

    it('totalNumber>=100 解锁衍数', () => {
      const state = createTestState();
      state.totalNumber = new Decimal(100);
      const newUnlocks = producerSystem.checkUnlocks(state);
      expect(newUnlocks).toContain('producer2');
    });

    it('totalNumber>=10000 解锁聚数', () => {
      const state = createTestState();
      state.totalNumber = new Decimal(10000);
      const newUnlocks = producerSystem.checkUnlocks(state);
      expect(newUnlocks).toContain('producer3');
    });
  });
});
