import { describe, it, expect, beforeEach } from 'vitest';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { GameState } from '@/types/game';
import { PRODUCER_CONFIGS, UPGRADE_DEFS, STARDUST_UPGRADE_DEFS } from '@/core/Constants';

function createTestState(): GameState {
  const state = new GameState();
  for (const config of PRODUCER_CONFIGS) {
    state.producers.set(config.id, { id: config.id, level: 0 });
  }
  for (const def of UPGRADE_DEFS) {
    state.upgrades.set(def.id, { id: def.id, level: 0 });
  }
  for (const def of STARDUST_UPGRADE_DEFS) {
    state.stardustUpgrades.set(def.id, { id: def.id, level: 0 });
  }
  return state;
}

describe('MultiplierSystem', () => {
  let ms: MultiplierSystem;

  beforeEach(() => {
    ms = new MultiplierSystem();
  });

  describe('register/unregister', () => {
    it('注册后可查询', () => {
      ms.register({ id: 'test1', source: 'upgrade', target: '', value: 2 });
      expect(ms.getGlobalMultiplier().toString()).toBe('2');
    });

    it('注销后不再有效', () => {
      ms.register({ id: 'test1', source: 'upgrade', target: '', value: 2 });
      ms.unregister('test1');
      expect(ms.getGlobalMultiplier().toString()).toBe('1');
    });

    it('重复ID覆盖旧值', () => {
      ms.register({ id: 'test1', source: 'upgrade', target: '', value: 2 });
      ms.register({ id: 'test1', source: 'upgrade', target: '', value: 3 });
      expect(ms.getGlobalMultiplier().toString()).toBe('3');
    });
  });

  describe('getGlobalMultiplier', () => {
    it('无条目时返回1', () => {
      expect(ms.getGlobalMultiplier().toString()).toBe('1');
    });

    it('多个全局倍率相乘', () => {
      ms.register({ id: 'g1', source: 'upgrade', target: '', value: 2 });
      ms.register({ id: 'g2', source: 'upgrade', target: '', value: 3 });
      expect(ms.getGlobalMultiplier().toString()).toBe('6');
    });
  });

  describe('getProducerMultiplier', () => {
    it('无条目时返回1', () => {
      expect(ms.getProducerMultiplier('producer1').toString()).toBe('1');
    });

    it('只匹配目标生产者', () => {
      ms.register({ id: 'p1', source: 'upgrade', target: 'producer1', value: 2 });
      ms.register({ id: 'p2', source: 'upgrade', target: 'producer2', value: 3 });
      expect(ms.getProducerMultiplier('producer1').toString()).toBe('2');
      expect(ms.getProducerMultiplier('producer2').toString()).toBe('3');
    });
  });

  describe('getTotalMultiplier', () => {
    it('全局×生产者', () => {
      ms.register({ id: 'g1', source: 'upgrade', target: '', value: 2 });
      ms.register({ id: 'p1', source: 'upgrade', target: 'producer1', value: 3 });
      expect(ms.getTotalMultiplier('producer1').toString()).toBe('6');
    });
  });

  describe('recalculateFromState', () => {
    it('升级 level=0 不产生倍率', () => {
      const state = createTestState();
      ms.recalculateFromState(state);
      expect(ms.getGlobalMultiplier().toString()).toBe('1');
    });

    it('click_multiplier 升级产生全局倍率', () => {
      const state = createTestState();
      state.upgrades.get('click_multiplier')!.level = 1;
      ms.recalculateFromState(state);
      // click_multiplier effectValue=2, level=1 → value=2^1=2
      expect(ms.getGlobalMultiplier().toString()).toBe('2');
    });

    it('producer_multiplier 升级产生对应生产者倍率', () => {
      const state = createTestState();
      state.upgrades.get('producer1_multiplier')!.level = 1;
      ms.recalculateFromState(state);
      // producer1_multiplier → target='producer1', value=2^1=2
      expect(ms.getProducerMultiplier('producer1').toString()).toBe('2');
    });

    it('global_multiplier 升级产生全局倍率', () => {
      const state = createTestState();
      state.upgrades.get('global_multiplier')!.level = 1;
      ms.recalculateFromState(state);
      expect(ms.getGlobalMultiplier().toString()).toBe('2');
    });

    it('output_multiplier 星尘升级产生全局倍率', () => {
      const state = createTestState();
      state.stardustUpgrades.get('output_multiplier')!.level = 3;
      ms.recalculateFromState(state);
      // value = 1 + 0.5*3 = 2.5
      expect(parseFloat(ms.getGlobalMultiplier().toString())).toBeCloseTo(2.5, 5);
    });

    it('expand 纪元产生1.5倍率', () => {
      const state = createTestState();
      state.currentEpoch = 'expand';
      ms.recalculateFromState(state);
      expect(parseFloat(ms.getGlobalMultiplier().toString())).toBeCloseTo(1.5, 5);
    });
  });

  describe('getCostDiscountPercent', () => {
    it('无星尘折扣返回0', () => {
      const state = createTestState();
      expect(ms.getCostDiscountPercent(state)).toBe(0);
    });

    it('1级折扣=5%', () => {
      const state = createTestState();
      state.stardustUpgrades.get('cost_discount')!.level = 1;
      expect(ms.getCostDiscountPercent(state)).toBeCloseTo(0.08, 5);
    });

    it('折扣上限50%', () => {
      const state = createTestState();
      state.stardustUpgrades.get('cost_discount')!.level = 20; // 0.05*20 = 1.0 > 0.5
      expect(ms.getCostDiscountPercent(state)).toBe(0.5);
    });
  });
});
