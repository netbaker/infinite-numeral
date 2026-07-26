/**
 * Phase 6 打磨 · 主循环热路径基准（BEFORE / AFTER 对照）
 *
 * 用法：
 *   npx vite-node bench/perf-bench.ts
 *
 * 仅测量底层系统（ProducerSystem / MultiplierSystem / DimensionSystem / AchievementSystem）
 * 的「每 tick 热路径」耗时，复刻 gameStore.gameTick 的产出累积与维度倍率接入步骤。
 * 不修改任何游戏逻辑。用于 A/B 对照优化前后的耗时。
 */
import Decimal from 'break_eternity.js';
import { GameState } from '@/types/game';
import { ProducerSystem } from '@/systems/ProducerSystem';
import { MultiplierSystem } from '@/systems/MultiplierSystem';
import { DimensionSystem } from '@/systems/DimensionSystem';
import { AchievementSystem } from '@/systems/AchievementSystem';
import {
  PRODUCER_CONFIGS,
  UPGRADE_DEFS,
  STARDUST_UPGRADE_DEFS,
  TECH_TREE_DEFS,
  EXPANSION_UPGRADE_DEFS,
  TRANSCEND_UPGRADE_DEFS,
  TRANSCEND_MILESTONE_DEFS,
  DIMENSION_CRYSTAL_SHOP,
} from '@/core/Constants';

const producerSystem = new ProducerSystem();
const multiplierSystem = new MultiplierSystem();
const dimensionSystem = new DimensionSystem();
const achievementSystem = new AchievementSystem();

/** 构造一个「后期游戏」代表性状态：大量生产者 + 大量乘区条目 */
function buildState(): GameState {
  const s = new GameState();
  dimensionSystem.initialize(s);
  achievementSystem.initAchievements(s);

  for (const c of PRODUCER_CONFIGS) {
    s.unlockedProducers.add(c.id);
    s.producers.set(c.id, { id: c.id, level: 60 + (c.id.length % 40) });
  }
  for (const u of UPGRADE_DEFS) {
    s.upgrades.set(u.id, { id: u.id, level: 3 });
  }
  s.stardust = 10;
  for (const u of STARDUST_UPGRADE_DEFS) {
    s.stardustUpgrades.set(u.id, { id: u.id, level: 2 });
  }
  for (const t of TECH_TREE_DEFS) {
    s.techTree.set(t.id, { id: t.id, unlocked: true });
  }
  for (const e of EXPANSION_UPGRADE_DEFS) {
    s.expansionUpgrades.set(e.id, { id: e.id, level: 2 });
  }
  for (const t of TRANSCEND_UPGRADE_DEFS) {
    s.transcendUpgrades.set(t.id, { id: t.id, level: 2 });
  }
  for (const m of TRANSCEND_MILESTONE_DEFS) {
    s.unlockedMilestones.add(m.id);
  }
  for (const shop of DIMENSION_CRYSTAL_SHOP) {
    s.purchasedCrystalUpgrades.add(shop.id);
  }
  s.number = new Decimal('1e100');
  s.totalNumber = new Decimal('1e100');
  s.currentDimension = 0;
  return s;
}

function timeFn(label: string, fn: () => void, iters: number): number {
  for (let i = 0; i < 50; i++) fn(); // warmup
  const t0 = performance.now();
  for (let i = 0; i < iters; i++) fn();
  const ms = performance.now() - t0;
  console.log(
    `  ${label.padEnd(46)} ${ms.toFixed(2).padStart(10)} ms  ` +
      `= ${(ms / iters).toFixed(4)} ms/iter`,
  );
  return ms;
}

const ITERS = 3000;
const s = buildState();
multiplierSystem.recalculateFromState(s); // 一次性全量重建（非每 tick）

console.log('='.repeat(72));
console.log('Phase 6 打磨 · 主循环热路径基准');
console.log(`乘区条目数 (multiplier entries): ${multiplierSystem.getEntries().length}`);
console.log(`活跃生产者数:                    ${s.producers.size}`);
console.log(`成就定义数 (每 tick 评估×2):        ${achievementSystem.checkAchievements(s).length} 条新解锁(此态)`);
console.log('='.repeat(72));

const registerDimMult = () => multiplierSystem.registerDimensionMultiplier(s);
const calcOutput = () => producerSystem.calculateTotalOutput(s, multiplierSystem);
const calcOutput2x = () => {
  producerSystem.calculateTotalOutput(s, multiplierSystem);
  producerSystem.calculateTotalOutput(s, multiplierSystem);
};
const checkAch = () => {
  achievementSystem.checkAchievements(s);
  achievementSystem.checkAchievements(s);
};
const refresh = () => dimensionSystem.refreshDimensionBuilds(s);
const tickBundle = () => {
  multiplierSystem.registerDimensionMultiplier(s);
  producerSystem.calculateTotalOutput(s, multiplierSystem);
  achievementSystem.checkAchievements(s);
  achievementSystem.checkAchievements(s);
  dimensionSystem.refreshDimensionBuilds(s);
};

console.log('单函数耗时：');
const tReg = timeFn('registerDimensionMultiplier', registerDimMult, ITERS);
const tCalc = timeFn('calculateTotalOutput ×1', calcOutput, ITERS);
const tCalc2 = timeFn('calculateTotalOutput ×2 (pre-WIN1 gameTick)', calcOutput2x, ITERS);
const tAch = timeFn('checkAchievements ×2', checkAch, ITERS);
const tRef = timeFn('refreshDimensionBuilds', refresh, ITERS);
console.log('-'.repeat(72));
console.log('每 tick 热路径合计 (register + calc×1 + ach×2 + refresh)：');
const tBundle = timeFn('per-tick hot bundle', tickBundle, ITERS);

console.log('-'.repeat(72));
console.log('汇总 (ms/iter)：');
console.log(`  registerDimensionMultiplier : ${tReg.toFixed(4)}`);
console.log(`  calculateTotalOutput ×1  : ${tCalc.toFixed(4)}`);
console.log(`  calculateTotalOutput ×2  : ${tCalc2.toFixed(4)}`);
console.log(`  checkAchievements ×2     : ${tAch.toFixed(4)}`);
console.log(`  refreshDimensionBuilds   : ${tRef.toFixed(4)}`);
console.log(`  per-tick hot bundle     : ${tBundle.toFixed(4)}`);
console.log('='.repeat(72));
