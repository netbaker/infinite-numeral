import { describe, it, expect, beforeEach } from 'vitest';
import Decimal from 'break_eternity.js';
import { PrestigeSystem } from '@/systems/PrestigeSystem';
import { GameState } from '@/types/game';
import { BigNumber } from '@/core/BigNumber';
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
  state.unlockedProducers.add('producer1');
  return state;
}

describe('PrestigeSystem', () => {
  let prestigeSystem: PrestigeSystem;

  beforeEach(() => {
    prestigeSystem = new PrestigeSystem();
  });

  describe('canPrestige', () => {
    it('number < 1e12 不可重置', () => {
      const state = createTestState();
      state.number = new Decimal(1e11);
      expect(prestigeSystem.canPrestige(state)).toBe(false);
    });

    it('number = 1e15 可重置', () => {
      const state = createTestState();
      state.number = new Decimal(1e15);
      expect(prestigeSystem.canPrestige(state)).toBe(true);
    });

    it('number > 1e15 可重置', () => {
      const state = createTestState();
      state.number = new Decimal('1e20');
      expect(prestigeSystem.canPrestige(state)).toBe(true);
    });
  });

  describe('calculateStardustGain', () => {
    it('number < 1e12 获得0星尘', () => {
      const result = prestigeSystem.calculateStardustGain(BigNumber.from(1e11));
      expect(result).toBe(0);
    });

    it('number = 1e15 获得 ⌊15×0.5⌋ = 7 星尘', () => {
      const result = prestigeSystem.calculateStardustGain(BigNumber.from(1e15));
      expect(result).toBe(7);
    });

    it('number = 1e20 获得 ⌊20×0.5⌋ = 10 星尘', () => {
      const result = prestigeSystem.calculateStardustGain(BigNumber.from('1e20'));
      expect(result).toBe(10);
    });

    it('number = 1e100 获得 ⌊100×0.5⌋ = 50 星尘', () => {
      const result = prestigeSystem.calculateStardustGain(BigNumber.from('1e100'));
      expect(result).toBe(50);
    });
  });

  describe('executePrestige', () => {
    it('重置后 number 归0（无start_bonus）', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.totalNumber = new Decimal('1e15');
      state.stardust = 0;

      const newState = prestigeSystem.executePrestige(state);
      expect(parseFloat(newState.number.toString())).toBe(0);
    });

    it('重置后获得星尘', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.stardust = 0;

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.stardust).toBe(7); // ⌊15×0.5⌋ = 7
    });

    it('重置后星尘累积（已有+新获得）', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.stardust = 5;

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.stardust).toBe(12); // 5 + 7
    });

    it('重置后生产者等级归0', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.producers.get('producer1')!.level = 10;

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.producers.get('producer1')!.level).toBe(0);
    });

    it('重置后升级等级归0', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.upgrades.get('click_multiplier')!.level = 3;

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.upgrades.get('click_multiplier')!.level).toBe(0);
    });

    it('重置后保留星尘升级', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.stardustUpgrades.get('output_multiplier')!.level = 2;

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.stardustUpgrades.get('output_multiplier')!.level).toBe(2);
    });

    it('重置后保留已解锁生产者', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.unlockedProducers.add('producer2');

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.unlockedProducers.has('producer1')).toBe(true);
      expect(newState.unlockedProducers.has('producer2')).toBe(true);
    });

    it('重置后 prestigeCount +1', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.prestigeCount = 0;

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.prestigeCount).toBe(1);
    });

    it('重置后纪元回归萌芽期', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.currentEpoch = 'expand';

      const newState = prestigeSystem.executePrestige(state);
      expect(newState.currentEpoch).toBe('sprout');
    });

    it('start_bonus 星尘升级生效：起始数字>0', () => {
      const state = createTestState();
      state.number = new Decimal('1e15');
      state.stardustUpgrades.get('start_bonus')!.level = 2;
      // start_bonus: effectValue=100, level=2 → 200

      const newState = prestigeSystem.executePrestige(state);
      expect(parseFloat(newState.number.toString())).toBe(200);
    });
  });
});
