import type {
  ProducerConfig,
  UpgradeDef,
  StardustUpgradeDef,
  EpochConfig,
  TechNodeDef,
  ExpansionUpgradeDef,
  TranscendUpgradeDef,
  MilestoneDef,
} from '@/types/game';

// ============================================================
// 生产者配置
// ============================================================

export const PRODUCER_CONFIGS: ProducerConfig[] = [
  {
    id: 'producer1',
    name: '量数',
    baseOutput: 1,
    baseCost: 15,
    costMultiplier: 1.12,
    unlockThreshold: 0,
    unlockName: '初始',
  },
  {
    id: 'producer2',
    name: '衍数',
    baseOutput: 5,
    baseCost: 200,
    costMultiplier: 1.12,
    unlockThreshold: 100,
    unlockName: '数之衍生',
  },
  {
    id: 'producer3',
    name: '聚数',
    baseOutput: 25,
    baseCost: 3000,
    costMultiplier: 1.13,
    unlockThreshold: 10000,
    unlockName: '数之汇聚',
  },
  {
    id: 'producer4',
    name: '凝数',
    baseOutput: 100,
    baseCost: 50000,
    costMultiplier: 1.13,
    unlockThreshold: 1000000,
    unlockName: '数之凝练',
  },
  {
    id: 'producer5',
    name: '铸数',
    baseOutput: 500,
    baseCost: 1000000,
    costMultiplier: 1.14,
    unlockThreshold: 100000000,
    unlockName: '数之铸造',
  },
  {
    id: 'producer6',
    name: '纬数',
    baseOutput: 2500,
    baseCost: 25000000,
    costMultiplier: 1.14,
    unlockThreshold: 10000000000,
    unlockName: '数之经纬',
  },
  {
    id: 'producer7',
    name: '界数',
    baseOutput: 10000,
    baseCost: 500000000,
    costMultiplier: 1.15,
    unlockThreshold: 1e15,
    unlockName: '数之边界',
  },
  {
    id: 'producer8',
    name: '元数',
    baseOutput: 50000,
    baseCost: 10000000000,
    costMultiplier: 1.15,
    unlockThreshold: 1e20,
    unlockName: '数之元初',
  },
  {
    id: 'producer9',
    name: '超数',
    baseOutput: 250000,
    baseCost: 200000000000,
    costMultiplier: 1.16,
    unlockThreshold: 1e30,
    unlockName: '数之超越',
  },
];

// ============================================================
// 升级定义
// ============================================================

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: 'click_multiplier',
    name: '点击强化',
    description: '点击值×2',
    baseCost: 100,
    effectType: 'click_multiplier',
    effectValue: 2,
    maxLevel: 10,
    unlockCondition: 'number>=10',
  },
  {
    id: 'producer1_multiplier',
    name: '量数增幅',
    description: '量数产出×2',
    baseCost: 500,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=50',
  },
  {
    id: 'producer2_multiplier',
    name: '衍数增幅',
    description: '衍数产出×2',
    baseCost: 5000,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=1000',
  },
  {
    id: 'global_multiplier',
    name: '全局增幅',
    description: '全局产出×2',
    baseCost: 50000,
    effectType: 'global_multiplier',
    effectValue: 2,
    maxLevel: 3,
    unlockCondition: 'number>=10000',
  },
  {
    id: 'producer3_multiplier',
    name: '聚数增幅',
    description: '聚数产出×2',
    baseCost: 500000,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=100000',
  },
  {
    id: 'producer4_multiplier',
    name: '凝数增幅',
    description: '凝数产出×2',
    baseCost: 5000000,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=1000000',
  },
  {
    id: 'producer5_multiplier',
    name: '铸数增幅',
    description: '铸数产出×2',
    baseCost: 50000000,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=10000000',
  },
  {
    id: 'producer6_multiplier',
    name: '纬数增幅',
    description: '纬数产出×2',
    baseCost: 500000000,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=100000000',
  },
  {
    id: 'producer7_multiplier',
    name: '界数增幅',
    description: '界数产出×2',
    baseCost: 5e9,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=1e10',
  },
  {
    id: 'global_multiplier2',
    name: '全局共鸣',
    description: '全局产出×3',
    baseCost: 5e10,
    effectType: 'global_multiplier',
    effectValue: 3,
    maxLevel: 2,
    unlockCondition: 'number>=1e12',
  },
  {
    id: 'producer8_multiplier',
    name: '元数增幅',
    description: '元数产出×2',
    baseCost: 5e11,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=1e15',
  },
  {
    id: 'producer9_multiplier',
    name: '超数增幅',
    description: '超数产出×2',
    baseCost: 5e12,
    effectType: 'producer_multiplier',
    effectValue: 2,
    maxLevel: 5,
    unlockCondition: 'number>=1e18',
  },
];

// ============================================================
// 星尘升级定义
// ============================================================

export const STARDUST_UPGRADE_DEFS: StardustUpgradeDef[] = [
  {
    id: 'start_bonus',
    name: '起步加成',
    description: '坍缩后起步数字+100/级',
    stardustCost: 1,
    costScaling: 2.5,
    effectValue: 100,
    maxLevel: 20,
  },
  {
    id: 'output_multiplier',
    name: '星尘增幅',
    description: '全局产出+50%/级',
    stardustCost: 2,
    costScaling: 3,
    effectValue: 0.5,
    maxLevel: 10,
  },
  {
    id: 'cost_discount',
    name: '星尘折扣',
    description: '成本折扣-8%/级',
    stardustCost: 2,
    costScaling: 2,
    effectValue: 0.08,
    maxLevel: 10,
  },
];

// ============================================================
// 纪元配置
// ============================================================

export const EPOCH_CONFIGS: EpochConfig[] = [
  {
    id: 'sprout',
    name: '萌芽期',
    threshold: 0,
    narrative: '宇宙的种子在虚空中萌发',
    visualClass: 'epoch-sprout',
  },
  {
    id: 'expand',
    name: '扩展期',
    threshold: 1000000,
    narrative: '数字的力量开始扩展',
    visualClass: 'epoch-expand',
  },
  {
    id: 'construct',
    name: '构建期',
    threshold: 1e15,
    narrative: '数字不再只是增长——它们开始组织。秩序从中涌现。',
    visualClass: 'epoch-construct',
  },
  {
    id: 'perceive',
    name: '感知期',
    threshold: 1e45,
    narrative: '数字意识到自己在增长。这是意识的第一个火花。',
    visualClass: 'epoch-perceive',
  },
  {
    id: 'celestial',
    name: '天界期',
    threshold: 1e100,
    narrative: '你超越了宇宙中的原子。Googol 就在眼前。',
    visualClass: 'epoch-celestial',
  },
];

// ============================================================
// 科技树配置
// ============================================================

export const TECH_TREE_DEFS: TechNodeDef[] = [
  {
    id: 'tech_producers',
    name: '数域扩展',
    description: '解锁 producer7-9',
    stardustCost: 5,
    requires: '',
    effectType: 'unlock_producers',
    effectValue: 0,
  },
  {
    id: 'tech_boost',
    name: '算力增幅',
    description: '全局产出×2',
    stardustCost: 10,
    requires: 'tech_producers',
    effectType: 'global_multiplier',
    effectValue: 2,
  },
  {
    id: 'tech_auto',
    name: '自动化初探',
    description: '购买建议优化',
    stardustCost: 20,
    requires: 'tech_boost',
    effectType: 'global_multiplier',
    effectValue: 1.5,
  },
  {
    id: 'tech_epoch',
    name: '纪元加速',
    description: '纪元推进速度+50%',
    stardustCost: 50,
    requires: 'tech_auto',
    effectType: 'epoch_discount',
    effectValue: 0.5,
  },
  {
    id: 'tech_expand',
    name: '膨胀之门',
    description: '解锁膨胀Prestige',
    stardustCost: 100,
    requires: 'tech_epoch',
    effectType: 'unlock_expansion',
    effectValue: 0,
  },
];

// ============================================================
// 暗能量升级配置（第2层Prestige）
// ============================================================

export const EXPANSION_UPGRADE_DEFS: ExpansionUpgradeDef[] = [
  {
    id: 'de_output',
    name: '暗能增幅',
    description: '全局产出+20%/级',
    deCost: 3,
    costScaling: 2.5,
    effectType: 'output_multiplier',
    effectValue: 0.2,
    maxLevel: 10,
  },
  {
    id: 'de_discount',
    name: '暗能折扣',
    description: '生产者成本-10%/级',
    deCost: 2,
    costScaling: 3,
    effectType: 'cost_discount',
    effectValue: 0.1,
    maxLevel: 5,
  },
  {
    id: 'de_speed',
    name: '暗能加速',
    description: '全局产出+50%/级',
    deCost: 5,
    costScaling: 2,
    effectType: 'output_multiplier',
    effectValue: 0.5,
    maxLevel: 5,
  },
];

// ============================================================
// 游戏常量
// ============================================================

/** 重置阈值 */
export const PRESTIGE_THRESHOLD = 1e12;

/** 基础点击值 */
export const BASE_CLICK_VALUE = 1;

/** 暴击概率 */
export const CRIT_CHANCE = 0.05;

/** 暴击倍率 */
export const CRIT_MULTIPLIER = 10;

/** 游戏tick间隔(ms) */
export const TICK_INTERVAL_MS = 50;

/** 自动存档间隔(ms) */
export const AUTO_SAVE_INTERVAL_MS = 30000;

/** 离线最大计算小时数 */
export const OFFLINE_MAX_HOURS = 24;

/** 存档版本号 */
export const SAVE_VERSION = 2;

/** 超越阈值 — 累计暗能量 */
export const TRANSCEND_THRESHOLD = 100;

// ============================================================
// 多周目里程碑配置
// ============================================================

export const TRANSCEND_MILESTONE_DEFS: MilestoneDef[] = [
  {
    id: 'milestone_1',
    name: '初窥',
    description: '触碰宇宙的边界',
    transcendCount: 1,
    globalMultiplier: 2,
    unlockMetaUpgrade: false,
  },
  {
    id: 'milestone_3',
    name: '破界',
    description: '打破物理的枷锁',
    transcendCount: 3,
    globalMultiplier: 3,
    unlockMetaUpgrade: false,
  },
  {
    id: 'milestone_5',
    name: '创世',
    description: '创造属于你的规则',
    transcendCount: 5,
    globalMultiplier: 5,
    unlockMetaUpgrade: false,
  },
  {
    id: 'milestone_10',
    name: '无限',
    description: '超越无限本身',
    transcendCount: 10,
    globalMultiplier: 10,
    unlockMetaUpgrade: true,
  },
];

// ============================================================
// 超越升级配置（第3层Prestige — 元升级）
// ============================================================

export const TRANSCEND_UPGRADE_DEFS: TranscendUpgradeDef[] = [
  {
    id: 'meta_producers',
    name: '生产者联觉',
    description: '每种生产者提供其他生产者+5%产出/级',
    singularityCost: 1,
    costScaling: 3,
    effectValue: 0.05,
    maxLevel: 5,
  },
  {
    id: 'meta_start',
    name: '奇点起步',
    description: '超越后起步数字×10/级',
    singularityCost: 1,
    costScaling: 2.5,
    effectValue: 10,
    maxLevel: 10,
  },
  {
    id: 'meta_global',
    name: '奇点共鸣',
    description: '全局产出×3/级',
    singularityCost: 2,
    costScaling: 4,
    effectValue: 3,
    maxLevel: 5,
  },
  {
    id: 'meta_epoch',
    name: '纪元压缩',
    description: '纪元阈值-15%/级',
    singularityCost: 3,
    costScaling: 2,
    effectValue: 0.15,
    maxLevel: 3,
  },
];
