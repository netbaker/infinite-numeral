import { describe, it, expect, beforeEach } from 'vitest';
import { OfflineSystem } from '@/systems/OfflineSystem';
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
  state.unlockedProducers.add('producer1');
  return state;
}

describe('OfflineSystem', () => {
  let offlineSystem: OfflineSystem;

  beforeEach(() => {
    offlineSystem = new OfflineSystem();
  });

  describe('calculateOfflineGain', () => {
    it('无生产者时离线收益为0', () => {
      const state = createTestState();
      const gain = offlineSystem.calculateOfflineGain(state, 3600 * 1000); // 1h
      expect(gain.eq(0)).toBe(true);
    });

    it('1级量数离线1小时', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1;
      // 产出=1/s, 离线3600s, 100%效率
      const gain = offlineSystem.calculateOfflineGain(state, 3600 * 1000);
      expect(parseFloat(gain.toString())).toBeCloseTo(3600, 0);
    });

    it('离线0秒收益为0', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1;
      const gain = offlineSystem.calculateOfflineGain(state, 0);
      expect(gain.eq(0)).toBe(true);
    });
  });

  describe('效率递减', () => {
    it('0-8h 全效', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1; // 1/s

      // 4小时
      const gain4h = offlineSystem.calculateOfflineGain(state, 4 * 3600 * 1000);
      expect(parseFloat(gain4h.toString())).toBeCloseTo(4 * 3600, 0);
    });

    it('8-16h 半效', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1; // 1/s

      // 12小时: 8h×100% + 4h×50% = 8*3600 + 4*3600*0.5 = 36000
      const gain12h = offlineSystem.calculateOfflineGain(state, 12 * 3600 * 1000);
      // 期望值 = 1 × (8*3600 + 4*3600*0.5) = 36000
      expect(parseFloat(gain12h.toString())).toBeCloseTo(36000, 0);
    });

    it('16-24h 1/4效', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1; // 1/s

      // 24小时: 8h×100% + 8h×50% + 8h×25%
      // 有效秒 = 8*3600*1 + 8*3600*0.5 + 8*3600*0.25 = 50400
      const gain24h = offlineSystem.calculateOfflineGain(state, 24 * 3600 * 1000);
      expect(parseFloat(gain24h.toString())).toBeCloseTo(50400, 0);
    });

    it('超过24h被截断', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1; // 1/s

      // 48小时: 最大24h, 与24h结果相同
      const gain48h = offlineSystem.calculateOfflineGain(state, 48 * 3600 * 1000);
      const gain24h = offlineSystem.calculateOfflineGain(state, 24 * 3600 * 1000);
      expect(parseFloat(gain48h.toString())).toBeCloseTo(parseFloat(gain24h.toString()), 0);
    });
  });

  describe('getOfflineEarnings', () => {
    it('返回完整结果', () => {
      const state = createTestState();
      state.producers.get('producer1')!.level = 1;

      const result = offlineSystem.getOfflineEarnings(state, 4 * 3600 * 1000);
      expect(result.offlineDuration).toBe(4 * 3600);
      expect(result.efficiency).toBeCloseTo(1.0, 2); // 4h全效
      expect(parseFloat(result.gainedNumber.toString())).toBeGreaterThan(0);
    });
  });
});
