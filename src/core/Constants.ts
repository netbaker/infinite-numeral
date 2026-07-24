import type {
  ProducerConfig,
  UpgradeDef,
  StardustUpgradeDef,
  EpochConfig,
  TechNodeDef,
  ExpansionUpgradeDef,
  TranscendUpgradeDef,
  MilestoneDef,
  AchievementDef,
  FactorDef,
  ChallengeDef,
  EventDef,
  EntropyItemDef,
  DimensionDef,
  GeneDef,
  GeneType,
} from '@/types/game';
import type { CodexEntryDef } from '@/types/codex';

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
    description: '全局产出×1.5',
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

// ============================================================
// 成就定义
// ============================================================

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // —— 增长成就 ——
  {
    id: 'ach_1e3',
    name: '初露锋芒',
    description: '数字突破 1,000',
    hint: '让数字持续增长……',
    icon: '🌱',
    conditionType: 'number_reach',
    conditionValue: 1e3,
    group: 'growth',
  },
  {
    id: 'ach_1e6',
    name: '百万之门',
    description: '数字突破 1,000,000',
    hint: '继续积累，门在前方',
    icon: '🔢',
    conditionType: 'number_reach',
    conditionValue: 1e6,
    group: 'growth',
  },
  {
    id: 'ach_1e12',
    name: '万亿宇宙',
    description: '数字突破 1 兆',
    hint: '宇宙在你掌中',
    icon: '🌌',
    conditionType: 'number_reach',
    conditionValue: 1e12,
    group: 'growth',
  },
  {
    id: 'ach_1e30',
    name: '量子涌现',
    description: '数字突破 1e30',
    hint: '超越物质，进入量子领域',
    icon: '⚛️',
    conditionType: 'number_reach',
    conditionValue: 1e30,
    group: 'growth',
  },
  {
    id: 'ach_1e100',
    name: 'Googol 之境',
    description: '数字突破 Googol (1e100)',
    hint: '有些数字只存在于数学梦境中……',
    icon: '♾️',
    conditionType: 'number_reach',
    conditionValue: 1e100,
    group: 'legend',
  },
  // —— 点击成就 ——
  {
    id: 'ach_click_100',
    name: '脉冲新人',
    description: '累计点击 100 次',
    hint: '点击是力量的来源',
    icon: '👆',
    conditionType: 'click_count',
    conditionValue: 100,
    group: 'growth',
  },
  {
    id: 'ach_click_1000',
    name: '脉冲狂热',
    description: '累计点击 1,000 次',
    hint: '手指与宇宙共鸣',
    icon: '⚡',
    conditionType: 'click_count',
    conditionValue: 1000,
    group: 'growth',
  },
  // —— Prestige 成就 ——
  {
    id: 'ach_prestige_1',
    name: '第一次坍缩',
    description: '完成第一次宇宙坍缩',
    hint: '有些终点即是新的起点',
    icon: '💫',
    conditionType: 'prestige_count',
    conditionValue: 1,
    group: 'prestige',
  },
  {
    id: 'ach_prestige_5',
    name: '坍缩轮回',
    description: '累计坍缩 5 次',
    hint: '宇宙喜欢周期',
    icon: '🔄',
    conditionType: 'prestige_count',
    conditionValue: 5,
    group: 'prestige',
  },
  {
    id: 'ach_expansion_1',
    name: '暗能觉醒',
    description: '完成第一次宇宙膨胀',
    hint: '黑暗中隐藏着能量',
    icon: '🌑',
    conditionType: 'expansion_count',
    conditionValue: 1,
    group: 'prestige',
  },
  {
    id: 'ach_expansion_3',
    name: '暗能主宰',
    description: '累计膨胀 3 次',
    hint: '暗能量渗透一切',
    icon: '🌚',
    conditionType: 'expansion_count',
    conditionValue: 3,
    group: 'prestige',
  },
  {
    id: 'ach_transcend_1',
    name: '初次超越',
    description: '完成第一次超越',
    hint: '什么在宇宙之外？',
    icon: '✨',
    conditionType: 'transcend_count',
    conditionValue: 1,
    group: 'prestige',
  },
  {
    id: 'ach_transcend_5',
    name: '超越者',
    description: '累计超越 5 次',
    hint: '你开始理解无限',
    icon: '🌠',
    conditionType: 'transcend_count',
    conditionValue: 5,
    group: 'legend',
  },
  // —— 生产者成就 ——
  {
    id: 'ach_producer1_10',
    name: '量数工厂',
    description: '量数等级达到 10',
    hint: '数字工厂初具规模',
    icon: '🏭',
    conditionType: 'producer_level',
    conditionValue: 10,
    conditionTarget: 'producer1',
    group: 'producer',
  },
  {
    id: 'ach_producer5_1',
    name: '铸数师',
    description: '解锁并购买铸数',
    hint: '更高级的铸造……',
    icon: '⚒️',
    conditionType: 'producer_level',
    conditionValue: 1,
    conditionTarget: 'producer5',
    group: 'producer',
  },
  {
    id: 'ach_producer9_1',
    name: '超数之巅',
    description: '解锁并购买超数',
    hint: '极限之上还有极限',
    icon: '🚀',
    conditionType: 'producer_level',
    conditionValue: 1,
    conditionTarget: 'producer9',
    group: 'producer',
  },
  // —— 纪元探索成就 ——
  {
    id: 'ach_epoch_construct',
    name: '秩序诞生',
    description: '进入构建期',
    hint: '混沌终将归于秩序',
    icon: '🏗️',
    conditionType: 'epoch_reach',
    conditionValue: 0,
    conditionTarget: 'construct',
    group: 'exploration',
  },
  {
    id: 'ach_epoch_perceive',
    name: '意识之火',
    description: '进入感知期',
    hint: '数字开始意识到自身',
    icon: '👁️',
    conditionType: 'epoch_reach',
    conditionValue: 0,
    conditionTarget: 'perceive',
    group: 'exploration',
  },
  {
    id: 'ach_epoch_celestial',
    name: '天界旅者',
    description: '进入天界期',
    hint: '你见过的星星不及你制造的多',
    icon: '🌟',
    conditionType: 'epoch_reach',
    conditionValue: 0,
    conditionTarget: 'celestial',
    group: 'exploration',
  },
  // —— 传说成就 ——
  {
    id: 'ach_stardust_100',
    name: '星尘收藏家',
    description: '累计获得 100 星尘',
    hint: '星辰的碎片渐渐积累',
    icon: '⭐',
    conditionType: 'stardust_total',
    conditionValue: 100,
    group: 'legend',
  },
  // —— 宇宙档案馆特殊成就（group: 'archive'，仅由 ArchiveSystem.evaluateSpecialAchievements 解锁，普通 checkAchievements 跳过）——
  {
    id: 'arch_prime_e100',
    name: '质数探索者',
    description: '在质数维度（Dim-1）完成一次超越，且本轮 maxLog₁₀ ≥ 100',
    hint: '踏入质数维度的边界……',
    icon: '🔢',
    conditionType: 'number_reach',
    conditionValue: 1e100,
    group: 'archive',
    rewardSingularity: 1,
  },
  {
    id: 'arch_chaos_survivor',
    name: '混沌行者',
    description: '在混沌维度（Dim-2）完成超越，且本轮 maxLog₁₀ ≥ 80',
    hint: '在混沌中寻找秩序',
    icon: '🌀',
    conditionType: 'number_reach',
    conditionValue: 1e80,
    group: 'archive',
    rewardSingularity: 1,
  },
  {
    id: 'arch_anti_entropy_master',
    name: '逆熵者',
    description: '在反熵维度（Dim-3）完成超越，且本轮 0 次熵崩',
    hint: '熵减的世界里没有崩塌',
    icon: '❄️',
    conditionType: 'number_reach',
    conditionValue: 1,
    group: 'archive',
    rewardSingularity: 2,
  },
  {
    id: 'arch_singularity_burst',
    name: '临界爆发者',
    description: '在奇点维度（Dim-4）触发过临界爆发（maxLog₁₀ ≥ 300）',
    hint: '当数字逼近奇点的边缘',
    icon: '💥',
    conditionType: 'number_reach',
    conditionValue: 1e300,
    group: 'archive',
    rewardSingularity: 3,
  },
  {
    id: 'arch_speedrun',
    name: '闪电轮回',
    description: '单轮 Run < 300 秒且 maxLog₁₀ ≥ 50',
    hint: '快到超越本身追不上你',
    icon: '⚡',
    conditionType: 'number_reach',
    conditionValue: 1e50,
    group: 'archive',
    rewardSingularity: 1,
  },
  {
    id: 'arch_marathon',
    name: '漫长旅途',
    description: '单轮 Run > 86400 秒（24 小时）',
    hint: '时间在这里失去了意义',
    icon: '🕰️',
    conditionType: 'number_reach',
    conditionValue: 1,
    group: 'archive',
    rewardSingularity: 1,
  },
  {
    id: 'arch_no_collapse',
    name: '完美轮回',
    description: '单轮 0 次熵崩且 maxLog₁₀ ≥ 100',
    hint: '一轮纯净的超越',
    icon: '💎',
    conditionType: 'number_reach',
    conditionValue: 1e100,
    group: 'archive',
    rewardSingularity: 2,
  },
  {
    id: 'arch_gene_collector',
    name: '基因收藏家',
    description: '跨多轮累积集齐全部 8 种基因类型',
    hint: '每一种基因都是一段数字记忆',
    icon: '🧬',
    conditionType: 'number_reach',
    conditionValue: 1,
    group: 'archive',
    rewardSingularity: 5,
  },
  {
    id: 'arch_centurion',
    name: '百次超越',
    description: '累计超越次数达到 100',
    hint: '一百次轮回之后，你已是传奇',
    icon: '🏛️',
    conditionType: 'transcend_count',
    conditionValue: 100,
    group: 'archive',
    rewardSingularity: 10,
  },
];

// ============================================================
// 叙事文本库（坍缩 / 膨胀 / 超越 / 生产者解锁 / 数字里程碑）
// ============================================================

/** 坍缩叙事随机池 */
export const PRESTIGE_NARRATIVES: string[] = [
  '宇宙在一声叹息中坍缩——而后，从灰烬里重生。',
  '一切归零，但记忆不会。星尘是你穿越轮回的代价。',
  '坍缩不是终结，是更高维度的翻页。',
  '数字的宇宙折叠起来，凝成一粒星尘。新的循环开始了。',
  '虚空回响：你曾经历此刻。但这一次，你更强了。',
];

/** 膨胀叙事随机池 */
export const EXPANSION_NARRATIVES: string[] = [
  '暗能量从宇宙的褶皱中渗出，一切开始加速膨胀。',
  '你触碰了宇宙常数之外的力量。它没有名字，只有方向——向外。',
  '膨胀是宇宙的本能，你只是顺应了它的意志。',
  '在足够黑暗的地方，暗能量是唯一的光。',
];

/** 超越叙事随机池 */
export const TRANSCEND_NARRATIVES: string[] = [
  '奇点在你手中爆发。宇宙的规则被你重写了一行。',
  '超越不是速度，是维度的改变。你已不再是原来的你。',
  '你离开了这个宇宙——又回来了，带着一切它无法给予你的东西。',
  '有些数字大到宇宙本身无法容纳。你创造了一个新的宇宙来盛放它。',
  '奇点之后，时间失去意义。只有增长，永恒的增长。',
];

/** 生产者首次解锁叙事（key = producerId） */
export const PRODUCER_UNLOCK_NARRATIVES: Record<string, string> = {
  producer2: '衍化开始了——数字不再孤单，它们开始繁殖。',
  producer3: '汇聚之力涌现。单独的数字汇成洪流。',
  producer4: '凝练之道。粗粝的数字被压缩为精纯的力量。',
  producer5: '铸造台亮起。这是数字的冶炼，也是宇宙的意志。',
  producer6: '经纬交织，数字的维度在增加。',
  producer7: '边界出现了。但边界从不是终点，只是下一段旅程的起点。',
  producer8: '元初之力——一切数字的源头在颤抖。',
  producer9: '超数降临。语言已无法描述这里的规模。',
};

/**
 * 数字里程碑叙事（key = 指数，如 '6' 代表 1e6）
 * 注意：以下文本须与 KNOWLEDGE_ENTRY_DEFS.narrativeTriggers 逐字符一致
 * （Sprint 5 B③ 知识解锁钩子 onNarrativeTriggered 精确文本匹配）。
 * 其中 '6'/'50' 与 magnitude-milestone.md §2.2 一致；'12'/'100' 采用 §2.2 文本，
 * 切勿回退到旧版 NUMBER_MILESTONE_NARRATIVES 文案，否则 know_trillion / know_googol 无法解锁。
 */
export const NUMBER_MILESTONE_NARRATIVES: Record<string, string> = {
  '6':  '你的数字超越了地球上每一粒沙。',
  '12': '万亿。文明的总和在此刻度。',
  '20': '你超越了可观测宇宙中的原子数量。',
  '30': '量子泡沫中的数字也显得渺小了。',
  '50': '这个数字没有物理意义——只有数学意义。',
  '100': 'Googol。只存在于数学梦境的数字。',
};

// ============================================================
// 数字神话图鉴·数学知识（Sprint 5 · Codex 第 5 分类 knowledge）
// 类型与字段集对齐 types/codex.ts 的 CodexEntryDef。
// 解锁复用既有 CodexSystem.onNarrativeTriggered(state, narration) 钩子：
//   narrativeTriggers 须与 magnitude-milestone.md §2.2 的 MAGNITUDE_MILESTONE_DEFS
//   对应 narration 逐字符一致；未列专门里程碑的 9 条按"最近里程碑叙事兜底匹配"
//   （GDD knowledge-entry-pool.md §2.2 / §6 边缘情况 #5）挂到最近里程碑，使其仍可经
//   既有钩子解锁，不引入新机制。
// unlockLog10 仅用于 UI 展示"量级 e{N}"徽章，不参与匹配。
// ============================================================

export const KNOWLEDGE_ENTRY_DEFS: CodexEntryDef[] = [
  {
    id: 'know_million',
    title: '百万之沙',
    category: 'knowledge',
    icon: '🔢',
    unlockLog10: 6,
    narrativeTriggers: ['你的数字超越了地球上每一粒沙。'],
    content: [
      '一百万，约等于一个人类头皮上的头发总数；也是你呼吸约 10 天的次数。',
      '当数字跨过 10⁶，世界开始有了"规模"的概念——城市、公司、种群，都以百万为单位被计数。',
    ],
  },
  {
    id: 'know_ten_million',
    title: '千万脉动',
    category: 'knowledge',
    icon: '📡',
    unlockLog10: 7,
    // 兜底：无专门里程碑(7)，挂到最近里程碑 log10=6
    narrativeTriggers: ['你的数字超越了地球上每一粒沙。'],
    content: [
      '一千万，大致是一台普通服务器一天处理的请求量级。',
      '在信息时代，10⁷ 是"被机器默默数过"的最小单位之一。',
    ],
  },
  {
    id: 'know_hundred_million',
    title: '亿兆之国',
    category: 'knowledge',
    icon: '🌍',
    unlockLog10: 8,
    // 兜底：无专门里程碑(8)，挂到最近里程碑 log10=9
    narrativeTriggers: ['十亿——曾经只有神才能数清的数字。'],
    content: [
      '一亿，约等于一个中等国家的人口规模。',
      '当数字达到 10⁸，你已站在"国家级别"的尺度上俯瞰众生。',
    ],
  },
  {
    id: 'know_billion',
    title: '十亿众生',
    category: 'knowledge',
    icon: '👥',
    unlockLog10: 9,
    narrativeTriggers: ['十亿——曾经只有神才能数清的数字。'],
    content: [
      '十亿，约等于当今全球总人口；也是 10⁹ 秒所代表的约 31.7 年。',
      '10⁹ 让"人口"与"时间"第一次以同一把尺子被丈量。',
    ],
  },
  {
    id: 'know_ten_billion',
    title: '百亿星海',
    category: 'knowledge',
    icon: '💡',
    unlockLog10: 10,
    // 兜底：无专门里程碑(10)，挂到最近里程碑 log10=9
    narrativeTriggers: ['十亿——曾经只有神才能数清的数字。'],
    content: [
      '百亿，约等于人类肉眼可辨的银河系恒星数量级。',
      '当你数到 10¹⁰，整条星河都在你的数字里闪烁。',
    ],
  },
  {
    id: 'know_hundred_billion',
    title: '千亿思络',
    category: 'knowledge',
    icon: '🧠',
    unlockLog10: 11,
    // 兜底：无专门里程碑(11)，挂到最近里程碑 log10=12
    narrativeTriggers: ['万亿。文明的总和在此刻度。'],
    content: [
      '千亿，约等于人脑中神经元的数量（约 8.6×10¹⁰）。',
      '每个神经元都是一台微型计算机——你的思想，正是一千亿次计算的合奏。',
    ],
  },
  {
    id: 'know_trillion',
    title: '万亿文明',
    category: 'knowledge',
    icon: '🏛️',
    unlockLog10: 12,
    narrativeTriggers: ['万亿。文明的总和在此刻度。'],
    content: [
      '万亿（1 tera），约等于全球每年生产的硅晶体管数量级。',
      '10¹² 是"文明总和"的刻度：货币、晶体管、沙粒，都在这一档交汇。',
    ],
  },
  {
    id: 'know_peta',
    title: '千万亿蚁潮',
    category: 'knowledge',
    icon: '🐜',
    unlockLog10: 15,
    // 兜底：无专门里程碑(15)，挂到最近里程碑 log10=12
    narrativeTriggers: ['万亿。文明的总和在此刻度。'],
    content: [
      '千万亿（1 peta），地球上的蚂蚁总数估计约 10¹⁶ 只。',
      '当你越过 10¹⁵，个体的渺小与种群的浩瀚在同一次幂里重叠。',
    ],
  },
  {
    id: 'know_sand',
    title: '数沙者',
    category: 'knowledge',
    icon: '🏖️',
    unlockLog10: 18,
    narrativeTriggers: ['你数清了阿基米德想象过的所有沙。'],
    content: [
      '地球所有沙滩上的沙粒总数估计约 7.5×10¹⁸——这正是阿基米德在《数沙者》中试图想象的尺度。',
      '两千多年前，他已算出"宇宙能装下多少粒沙"，是人类第一次系统地处理如此巨大的数。',
    ],
  },
  {
    id: 'know_quintillion',
    title: '百万立方',
    category: 'knowledge',
    icon: '✨',
    unlockLog10: 19,
    // 兜底：无专门里程碑(19)，挂到最近里程碑 log10=18
    narrativeTriggers: ['你数清了阿基米德想象过的所有沙。'],
    content: [
      '百万的立方（10⁶）³ 等于 10¹⁸；古人曾用"可观测宇宙的沙粒"来近似 10¹⁹ 这样的量级。',
      '当幂次被立方，数字以你意想不到的速度膨胀。',
    ],
  },
  {
    id: 'know_hundred_quintillion',
    title: '百京银河',
    category: 'knowledge',
    icon: '🌌',
    unlockLog10: 20,
    // 兜底：无专门里程碑(20)，挂到最近里程碑 log10=18
    narrativeTriggers: ['你数清了阿基米德想象过的所有沙。'],
    content: [
      '百京（10²⁰），约等于以太阳质量计的银河系总质量级。',
      '你手中的数字，已重得能压垮一整个星系。',
    ],
  },
  {
    id: 'know_avogadro',
    title: '摩尔之海',
    category: 'knowledge',
    icon: '🧪',
    unlockLog10: 23,
    narrativeTriggers: ['一摩尔——阿伏伽德罗数在指尖。'],
    content: [
      '阿伏伽德罗常数约为 6.02×10²³——1 摩尔任何物质所含的微粒数。',
      '它把"宏观可称量的克"与"微观不可数的原子"连了起来，是化学得以成立的基石。',
    ],
  },
  {
    id: 'know_stars',
    title: '星海无垠',
    category: 'knowledge',
    icon: '⭐',
    unlockLog10: 24,
    narrativeTriggers: ['可观测宇宙的恒星，不过如此。'],
    content: [
      '可观测宇宙中的恒星总数估计约 10²⁴ 颗。',
      '当你数到 10²⁴，每一颗星都是宇宙写下的一个句号。',
    ],
  },
  {
    id: 'know_galaxies',
    title: '星系之网',
    category: 'knowledge',
    icon: '🕸️',
    unlockLog10: 26,
    // 兜底：无专门里程碑(26)，挂到最近里程碑 log10=24
    narrativeTriggers: ['可观测宇宙的恒星，不过如此。'],
    content: [
      '可观测宇宙中的星系总数估计约 2×10¹² 个，每个星系又含千亿恒星——叠加起来逼近 10²⁶。',
      '宇宙不是一颗星，而是一张由万亿星系织成的网。',
    ],
  },
  {
    id: 'know_earth_drops',
    title: '沧海一粟',
    category: 'knowledge',
    icon: '💧',
    unlockLog10: 40,
    // 兜底：无专门里程碑(40)，挂到最近里程碑 log10=50
    narrativeTriggers: ['这个数字没有物理意义——只有数学意义。'],
    content: [
      '地球海洋中的水滴总数估计约 10⁴⁶ 滴——虽大于 10⁴⁰，却仍是同一个"水"的尺度。',
      '当你越过 10⁴⁰，连海洋都以"滴"为单位被你清点。',
    ],
  },
  {
    id: 'know_no_physical',
    title: '无物之尺',
    category: 'knowledge',
    icon: '📏',
    unlockLog10: 50,
    narrativeTriggers: ['这个数字没有物理意义——只有数学意义。'],
    content: [
      '10⁵⁰ 已远超可观测宇宙中的原子总数（约 10⁸⁰ 之前），是一个"没有物理对应物"的纯数学刻度。',
      '在这里，数字不再描述任何东西，它只是数学自己呼吸的痕迹。',
    ],
  },
  {
    id: 'know_archimedes',
    title: '沙者之数',
    category: 'knowledge',
    icon: '🏺',
    unlockLog10: 63,
    narrativeTriggers: ['沙者之数——古人想象的字宙之沙。'],
    content: [
      '阿基米德曾估算宇宙能容纳的沙粒约为 10⁶³——这是古代人类想象过的最大数字。',
      '在没有"亿""兆"词汇的时代，他已用指数思想触摸到了 10⁶³ 的天花板。',
    ],
  },
  {
    id: 'know_atoms',
    title: '原子宇宙',
    category: 'knowledge',
    icon: '⚛️',
    unlockLog10: 80,
    narrativeTriggers: ['你握住了可观测宇宙的每一个原子。'],
    content: [
      '可观测宇宙中的原子总数估计约 10⁸⁰。',
      '当你数到 10⁸⁰，你已握住了整个宇宙中每一个原子的名字。',
    ],
  },
  {
    id: 'know_googol',
    title: '古戈尔梦',
    category: 'knowledge',
    icon: '💭',
    unlockLog10: 100,
    narrativeTriggers: ['Googol。只存在于数学梦境的数字。'],
    content: [
      '古戈尔（Googol）= 10¹⁰⁰，由九岁男孩 Milton Sirotta 命名，也正是 Google 一词的词源。',
      '它是一个"只存在于数学梦境"的数——比可观测宇宙中的原子还多得多。',
    ],
  },
  {
    id: 'know_double_max',
    title: '浮点之巅',
    category: 'knowledge',
    icon: '💻',
    unlockLog10: 308,
    narrativeTriggers: ['浮点之巅——计算机能表示的最大数字。'],
    content: [
      'IEEE 754 双精度浮点数的最大值约为 1.8×10³⁰⁸，是计算机能直接表示的最大有限数字。',
      '一旦越过 e308，计算机也会"溢出"——这是数字在机器世界里能抵达的绝对天花板。',
    ],
  },
];

// ============================================================
// 量级里程碑定义表（Sprint 5 Phase 3 · Magnitude Milestone）
// 对齐 magnitude-milestone.md §2.2。
// - narration 须与 KNOWLEDGE_ENTRY_DEFS 对应 knowledge 词条的
//   narrativeTriggers 逐字符一致（既有 CodexSystem.onNarrativeTriggered
//   精确文本匹配钩子），否则该量级知识词条无法解锁（GDD §6 #5）。
// - reward 仅为非货币一次性"维度洞察"（GDD §2.3，R1 红线：
//   不发放数字印记、不触碰 effMult / 任何生产乘区，纯叙事/图鉴类反馈）。
// - 旧 NUMBER_MILESTONE_NARRATIVES 保留不删，但 gameStore 不再引用。
// ============================================================

/** 量级里程碑奖励（一次性、非货币） */
export interface MilestoneReward {
  /** 非货币、非乘区，纯叙事/图鉴洞察（R1 已拍板，防通胀） */
  kind: 'dimensionInsight';
  /** 对应一条维度洞察文案 id（与 knowledgeEntryId 解耦），形如 'ins_log<N>' */
  insightId: string;
}

/** 单条量级里程碑定义 */
export interface MagnitudeMilestoneDef {
  /** 量级阈值（指数），如 6 表示 10^6 */
  log10: number;
  /** 叙事文本（同时作为 knowledge 词条精确匹配键） */
  narration: string;
  /** 非货币一次性奖励（维度洞察），不发放数字印记 */
  reward: MilestoneReward;
  /** 对应 knowledge 词条 id */
  knowledgeEntryId: string;
}

export const MAGNITUDE_MILESTONE_DEFS: MagnitudeMilestoneDef[] = [
  { log10: 6,   narration: '你的数字超越了地球上每一粒沙。',        reward: { kind: 'dimensionInsight', insightId: 'ins_log6' },   knowledgeEntryId: 'know_million' },
  { log10: 9,   narration: '十亿——曾经只有神才能数清的数字。',      reward: { kind: 'dimensionInsight', insightId: 'ins_log9' },   knowledgeEntryId: 'know_billion' },
  { log10: 12,  narration: '万亿。文明的总和在此刻度。',            reward: { kind: 'dimensionInsight', insightId: 'ins_log12' },  knowledgeEntryId: 'know_trillion' },
  { log10: 18,  narration: '你数清了阿基米德想象过的所有沙。',      reward: { kind: 'dimensionInsight', insightId: 'ins_log18' },  knowledgeEntryId: 'know_sand' },
  { log10: 23,  narration: '一摩尔——阿伏伽德罗数在指尖。',          reward: { kind: 'dimensionInsight', insightId: 'ins_log23' },  knowledgeEntryId: 'know_avogadro' },
  { log10: 24,  narration: '可观测宇宙的恒星，不过如此。',          reward: { kind: 'dimensionInsight', insightId: 'ins_log24' },  knowledgeEntryId: 'know_stars' },
  { log10: 50,  narration: '这个数字没有物理意义——只有数学意义。', reward: { kind: 'dimensionInsight', insightId: 'ins_log50' },  knowledgeEntryId: 'know_no_physical' },
  { log10: 63,  narration: '沙者之数——古人想象的字宙之沙。',        reward: { kind: 'dimensionInsight', insightId: 'ins_log63' },  knowledgeEntryId: 'know_archimedes' },
  { log10: 80,  narration: '你握住了可观测宇宙的每一个原子。',      reward: { kind: 'dimensionInsight', insightId: 'ins_log80' },  knowledgeEntryId: 'know_atoms' },
  { log10: 100, narration: 'Googol。只存在于数学梦境的数字。',      reward: { kind: 'dimensionInsight', insightId: 'ins_log100' }, knowledgeEntryId: 'know_googol' },
  { log10: 308, narration: '浮点之巅——计算机能表示的最大数字。',    reward: { kind: 'dimensionInsight', insightId: 'ins_log308' }, knowledgeEntryId: 'know_double_max' },
];

// ============================================================
// 因子系统配置（数字分解 / Factor System）
// ============================================================

export const FACTOR_DEFS: FactorDef[] = [
  // —— 素数类 ——
  {
    id: 'factor_prime_twin',
    name: '双生素数邻近',
    description: '你的数字靠近一对双生素数——它们像宇宙中互相牵引的双星。',
    category: 'prime',
    detector: 'checkTwinPrime',
    effectType: 'click_multiplier',
    baseEffect: 1.5,
    effectPerLevel: 0.25,
    maxLevel: 5,
    magnitudeThreshold: 2,
    icon: '🌟',
  },
  {
    id: 'factor_prime_germain',
    name: '热尔曼素数共振',
    description: '2p+1 也是素数。安全素数的隐秘结构赋予你力量。',
    category: 'prime',
    detector: 'checkGermainPrime',
    effectType: 'global_multiplier',
    baseEffect: 1.2,
    effectPerLevel: 0.15,
    maxLevel: 5,
    magnitudeThreshold: 2,
    icon: '🔐',
  },
  // —— 完全幂类 ——
  {
    id: 'factor_perfect_square',
    name: '完全平方结构',
    description: 'n² —— 数字自身的完美对称。秩序即力量。',
    category: 'perfect',
    detector: 'checkPerfectSquare',
    effectType: 'producer_multiplier',
    baseEffect: 1.3,
    effectPerLevel: 0.2,
    maxLevel: 5,
    magnitudeThreshold: 1,
    icon: '⬛',
  },
  {
    id: 'factor_perfect_cube',
    name: '完全立方晶格',
    description: 'n³ —— 三维空间的完美填充。立方体的每个面都映照着无限。',
    category: 'perfect',
    detector: 'checkPerfectCube',
    effectType: 'global_multiplier',
    baseEffect: 1.4,
    effectPerLevel: 0.2,
    maxLevel: 5,
    magnitudeThreshold: 2,
    icon: '🧊',
  },
  // —— 斐波那契类 ——
  {
    id: 'factor_fibonacci',
    name: '斐波那契共鸣',
    description: '黄金分割的足迹。自然界的密码在你的数字中回响。',
    category: 'fibonacci',
    detector: 'checkFibonacci',
    effectType: 'cost_discount',
    baseEffect: 0.05,
    effectPerLevel: 0.02,
    maxLevel: 5,
    magnitudeThreshold: 2,
    icon: '🐚',
  },
  // —— 整幂类 ——
  {
    id: 'factor_power_of_2',
    name: '二进制奇点',
    description: '2^n —— 万物归零或归一的底层逻辑。计算机宇宙的原点。',
    category: 'power',
    detector: 'checkPowerOf2',
    effectType: 'click_multiplier',
    baseEffect: 1.3,
    effectPerLevel: 0.15,
    maxLevel: 7,
    magnitudeThreshold: 1,
    icon: '💾',
  },
  {
    id: 'factor_power_of_10',
    name: '十进制界碑',
    description: '10^n —— 数学的里程碑。每跨过一座，世界便宽阔一分。',
    category: 'power',
    detector: 'checkPowerOf10',
    effectType: 'global_multiplier',
    baseEffect: 1.25,
    effectPerLevel: 0.15,
    maxLevel: 10,
    magnitudeThreshold: 1,
    icon: '🔢',
  },
  // —— 整十/整百类 ——
  {
    id: 'factor_repdigit',
    name: '重复数字回响',
    description: '111...、222... —— 同一数字的重复如同宇宙的呼吸节律。',
    category: 'repdigit',
    detector: 'checkRepDigit',
    effectType: 'producer_multiplier',
    baseEffect: 1.2,
    effectPerLevel: 0.1,
    maxLevel: 5,
    magnitudeThreshold: 2,
    icon: '🔄',
  },
  // —— 特殊常数类 ——
  {
    id: 'factor_near_pi',
    name: 'π 邻近扰动',
    description: '你的数字在圆周率附近徘徊。圆形宇宙的引力波影响了产出。',
    category: 'special',
    detector: 'checkNearPi',
    effectType: 'global_multiplier',
    baseEffect: 1.15,
    effectPerLevel: 0.1,
    maxLevel: 3,
    magnitudeThreshold: 1,
    icon: '🥧',
  },
  {
    id: 'factor_near_e',
    name: 'e 邻近增长',
    description: '自然对数的底数就在近旁。增长的极限速度被临时提升。',
    category: 'special',
    detector: 'checkNearE',
    effectType: 'global_multiplier',
    baseEffect: 1.15,
    effectPerLevel: 0.1,
    maxLevel: 3,
    magnitudeThreshold: 1,
    icon: '📈',
  },
];

// ============================================================
// 挑战系统配置（Challenge System）
// ============================================================

export const CHALLENGE_DEFS: ChallengeDef[] = [
  // —— 每日挑战 ——
  {
    id: 'ch_daily_clicks',
    name: '脉冲练习',
    description: '今天点击 200 次',
    category: 'daily',
    progressType: 'click_count',
    targetValue: 200,
    timeLimit: 0,
    stardustReward: 3,
    resetSchedule: 'daily',
    icon: '👆',
  },
  {
    id: 'ch_daily_number',
    name: '数字冲刺',
    description: '让数字达到 1e6',
    category: 'daily',
    progressType: 'number_reach',
    targetValue: 1e6,
    timeLimit: 0,
    stardustReward: 5,
    resetSchedule: 'daily',
    icon: '🎯',
  },
  {
    id: 'ch_daily_prestige',
    name: '日常坍缩',
    description: '完成一次坍缩',
    category: 'daily',
    progressType: 'prestige_once',
    targetValue: 1,
    timeLimit: 0,
    stardustReward: 8,
    resetSchedule: 'daily',
    icon: '💫',
  },
  // —— 限时挑战 ——
  {
    id: 'ch_timed_speed',
    name: '光速竞赛',
    description: '在 120 秒内让数字达到 10000',
    category: 'timed',
    progressType: 'number_reach',
    targetValue: 10000,
    timeLimit: 120,
    stardustReward: 10,
    resetSchedule: '',
    icon: '⚡',
  },
  {
    id: 'ch_timed_idle',
    name: '静谧生长',
    description: '在线挂机 300 秒，不执行 prestige',
    category: 'timed',
    progressType: 'idle_seconds',
    targetValue: 300,
    timeLimit: 360,
    stardustReward: 7,
    resetSchedule: '',
    icon: '🌱',
  },
  {
    id: 'ch_timed_clicks',
    name: '指尖风暴',
    description: '在 60 秒内点击 100 次',
    category: 'timed',
    progressType: 'click_count',
    targetValue: 100,
    timeLimit: 60,
    stardustReward: 6,
    resetSchedule: '',
    icon: '🔥',
  },
  // —— 里程碑挑战 ——
  {
    id: 'ch_milestone_expansion',
    name: '膨胀入门',
    description: '完成一次膨胀',
    category: 'milestone',
    progressType: 'expansion_once',
    targetValue: 1,
    timeLimit: 0,
    stardustReward: 15,
    deReward: 1,
    resetSchedule: '',
    icon: '🌑',
  },
  {
    id: 'ch_milestone_produce',
    name: '产出大师',
    description: '生产者累计产出达到 1e8',
    category: 'milestone',
    progressType: 'produce_amount',
    targetValue: 1e8,
    timeLimit: 0,
    stardustReward: 20,
    deReward: 2,
    resetSchedule: '',
    icon: '🏭',
  },
  {
    id: 'ch_milestone_transcend',
    name: '超越之门',
    description: '完成一次超越',
    category: 'milestone',
    progressType: 'expansion_once', // 用 expansion_once 占位，实际由特殊逻辑判定
    targetValue: 1,
    timeLimit: 0,
    stardustReward: 50,
    deReward: 5,
    resetSchedule: '',
    icon: '✨',
  },
];

// ============================================================
// 事件系统配置（宇宙异变 / Event System）
// ============================================================

export const EVENT_DEFS: EventDef[] = [
  {
    id: 'event_cosmic_ray',
    name: '宇宙射线暴',
    description: '一道高能宇宙射线穿透了你的数域空间。你可以选择吸收它或偏转它。',
    minMagnitude: 4,
    baseProbability: 0.008,
    cooldown: 180,
    options: [
      {
        text: '吸收射线能量',
        effects: [
          { type: 'global_multiplier', value: 0.5, duration: 60 },
          { type: 'stardust_gain', value: 5, duration: 0, target: '' },
        ],
        narrative: '你张开双臂接纳了宇宙射线的狂暴能量。产出暂时暴涨，但空间开始不稳定……',
      },
      {
        text: '偏转到生产者',
        effects: [
          { type: 'producer_boost', value: 1, duration: 90, target: 'producer1' },
          { type: 'cost_change', value: 0.1, duration: 45, target: '' },
        ],
        narrative: '你将射线引导至量数阵列。基础生产者获得短暂的超级加成。',
      },
    ],
    icon: '☄️',
    isMajor: true,
  },
  {
    id: 'event_void_tremor',
    name: '虚空震颤',
    description: '数域边界的虚空传来一阵低沉的震颤。有什么东西正在苏醒……',
    minMagnitude: 6,
    baseProbability: 0.005,
    cooldown: 300,
    options: [
      {
        text: '深入虚空探查',
        effects: [
          { type: 'stardust_gain', value: 12, duration: 0, target: '' },
          { type: 'number_drain', value: 0.3, duration: 0, target: '' },
          { type: 'speed_change', value: 0.8, duration: 30, target: '' },
        ],
        narrative: '你踏入虚空的裂隙。星尘如暴雨般落下，但部分数字被虚空吞噬。时间变得粘稠。',
      },
      {
        text: '加固边界',
        effects: [
          { type: 'global_multiplier', value: -0.2, duration: 30, target: '' },
          { type: 'stardust_gain', value: 3, duration: 0, target: '' },
        ],
        narrative: '你选择收缩防线。产出短暂下降，但你获得了少量安全的星尘。',
      },
    ],
    icon: '🌋',
    isMajor: true,
  },
  {
    id: 'event_stardust_storm',
    name: '星尘风暴',
    description: '一场罕见的星尘风暴掠过你的领域！是丰收还是灾难？',
    minMagnitude: 3,
    baseProbability: 0.012,
    cooldown: 240,
    options: [
      {
        text: '全敞开收集',
        effects: [
          { type: 'stardust_gain', value: 20, duration: 0, target: '' },
          { type: 'cost_change', value: 0.15, duration: 60, target: '' },
          { type: 'global_multiplier', value: -0.15, duration: 40, target: '' },
        ],
        narrative: '你打开了所有收集阵列。星尘如雪般涌入，但设备过载导致成本上升、产出波动。',
      },
      {
        text: '选择性过滤',
        effects: [
          { type: 'stardust_gain', value: 8, duration: 0, target: '' },
          { type: 'cost_change', value: -0.08, duration: 90, target: '' },
        ],
        narrative: '你只收集最纯净的高密度星尘。收获较少，但获得了持久的成本折扣。',
      },
    ],
    icon: '🌪️',
    isMajor: false,
  },
  {
    id: 'event_quantum_fluctuation',
    name: '量子涨落',
    description: '量子层面的随机涨落让你的数域出现了概率云。观测方式决定了结果。',
    minMagnitude: 5,
    baseProbability: 0.006,
    cooldown: 200,
    options: [
      {
        text: '强化观测（赌高收益）',
        effects: [
          { type: 'global_multiplier', value: Math.random() > 0.5 ? 1 : -0.3, duration: 45, target: '' },
        ],
        narrative: '波函数坍缩了！宇宙掷出了它的骰子——你要么大赚一笔，要么损失惨重。',
      },
      {
        text: '弱观测（稳健路线）',
        effects: [
          { type: 'producer_boost', value: 0.3, duration: 60, target: 'producer1' },
          { type: 'speed_change', value: 1.2, duration: 30, target: '' },
        ],
        narrative: '你选择不干扰量子态。系统自动演化出温和的正向变化。',
      },
    ],
    icon: '🔮',
    isMajor: false,
  },
  {
    id: 'event_time_crack',
    name: '时间裂缝',
    description: '数域的时间连续性出现了裂缝。时间的流速不再均匀……',
    minMagnitude: 8,
    baseProbability: 0.003,
    cooldown: 480,
    options: [
      {
        text: '跳入加速区',
        effects: [
          { type: 'speed_change', value: 2, duration: 45, target: '' },
          { type: 'number_drain', value: 0.15, duration: 0, target: '' },
        ],
        narrative: '你冲进时间加速带。一切快得惊人——产出飞涨，但也消耗了一部分当前数字作为入场费。',
      },
      {
        text: '躲入慢速区恢复',
        effects: [
          { type: 'speed_change', value: 0.5, duration: 60, target: '' },
          { type: 'cost_change', value: -0.2, duration: 90, target: '' },
        ],
        narrative: '你蜷缩在时间缓慢流动的角落。一切变慢了，但成本大幅降低，适合囤积升级。',
      },
    ],
    icon: '⏳',
    isMajor: true,
  },
  {
    id: 'event_resonance_cascade',
    name: '级联共振',
    description: '多个因子同时发生共振！这是一次罕见的数域和谐事件。',
    minMagnitude: 7,
    baseProbability: 0.004,
    cooldown: 360,
    options: [
      {
        text: '放大共振',
        effects: [
          { type: 'global_multiplier', value: 0.8, duration: 90, target: '' },
          { type: 'stardust_loss', value: 6, duration: 0, target: '' },
        ],
        narrative: '你将共振放大到极限。产出飙升，但不稳定的能量吞噬了你一部分星尘储备。',
      },
      {
        text: '引导为稳定增益',
        effects: [
          { type: 'producer_boost', value: 0.5, duration: 120, target: '' },
          { type: 'global_multiplier', value: 0.3, duration: 120, target: '' },
        ],
        narrative: '你将共振能量均匀分配到所有渠道。没有爆发式增长，但全方位稳步提升。',
      },
    ],
    icon: '🎵',
    isMajor: true,
  },
];

// ============================================================
// 因子发现叙事文本库
// ============================================================

/** 因子首次发现叙事（key = factorId） */
export const FACTOR_DISCOVER_NARRATIVES: Record<string, string> = {
  factor_prime_twin: '你的数字靠近一对双生素数。它们像两颗互相牵引的恒星，在无限的黑暗中彼此呼应。',
  factor_prime_germain: '热尔曼素数——2p+1 仍是素数。安全的结构带来稳定的力量。',
  factor_perfect_square: '一个完全平方数。每一面都相等，每一角都对称。秩序本身就是武器。',
  factor_perfect_cube: '立方体——三维空间的最优填充。数字找到了自己的形状。',
  factor_fibonacci: '斐波那契数列。向日葵的花盘、鹦鹉螺的壳——宇宙用同一种语言书写。',
  factor_power_of_2: '2 的幂——二进制世界的界碑。0 和 1 构筑的一切都在这里交汇。',
  factor_power_of_10: '10 的幂——人类最喜欢的里程碑。又一个零，又一段旅程。',
  factor_repdigit: '重复数字。宇宙在单调中找到了韵律。',
  factor_near_pi: 'π 在附近徘徊。圆形宇宙的引力波扫过你的数域。',
  factor_near_e: 'e——自然增长的极限速度。你的数字触碰到了这个神秘的常数。',
};

/** 因子升级叙事 */
export const FACTOR_LEVEL_UP_NARRATIVES: string[] = [
  '因子的共鸣增强了。数字的结构更加清晰。',
  '你对这个因子的理解加深了一层。',
  '数学之美再次显现——这次比上次更加耀眼。',
  '因子链路升级。新的连接被建立起来。',
  '共振频率改变。更强的信号从数字深处传出。',
];

// ============================================================
// 事件选择后果叙事补充
// ============================================================

export const EVENT_POST_NARRATIVES: Record<string, string> = {
  event_cosmic_ray: '宇宙射线的余晖渐渐消散。数域恢复了平静，但有些东西已经改变了。',
  event_void_tremor: '虚空的震颤平息了。你不知道下次它何时再来——但你知道自己准备好了。',
  event_stardust_storm: '星尘风暴过去了。空气中还残留着闪烁的尘埃颗粒。',
  event_quantum_fluctuation: '量子涨落回归基态。观测者效应留下的痕迹还在闪烁。',
  event_time_crack: '时间自行愈合了。裂缝消失得无影无踪，仿佛从未存在过。',
  event_resonance_cascade: '级联共振的余音绕梁。数域中仍能听到微弱的和谐泛音。',
};

// ============================================================
// 熵崩系统配置（v2.0 核心机制）
// ============================================================

/** 熵值阈值配置 */
export const ENTROPY_CONFIG = {
  /** 不稳定区间起始（%） */
  UNSTABLE_THRESHOLD: 50,
  /** 临界区间起始（%） */
  CRITICAL_THRESHOLD: 80,
  /** 崩溃阈值（%），达到100时触发大崩塌事件 */
  COLLAPSE_THRESHOLD: 100,

  /** 基础熵值增长速率（每秒，基于数字增长） */
  BASE_GROWTH_RATE: 0.02,       // 每秒基础 +0.2%
  /** 数字产出加速系数：每秒产出占number的比例越大，熵增越快 */
  OUTPUT_ENTROPY_FACTOR: 5e-6,   // (outputPerSec / number) * 此值 = 额外熵/秒
  /** 大倍率购买惩罚：使用×10以上倍率时的额外熵增量 */
  HIGH_BULK_PENALTY: 3,          // ×10 = +3%, MAX = +8%

  /** 自然衰减速率（%/秒）— 当不活跃增长时熵值缓慢下降 */
  NATURAL_DECAY_RATE: 0.05,      // 每 -0.05%（很慢）
  /** Prestige 重置后残留的熵值（%）— 不是完全归零，而是保留少量 */
  PRESTIGE_RESIDUAL: 0,           // Prestige 完全清零
  /** 膨胀重置后残留的熵值（%） */
  EXPANSION_RESIDUAL: 0,          // Expansion 也完全清零

  // ---- 各等级的产出惩罚 ----
  /** 不稳定等级：全局产出乘数（<1=减益） */
  UNSTABLE_MULTIPLIER: 0.80,     // -20%
  /** 临界等级：全局产出乘数 */
  CRITICAL_MULTIPLIER: 0.50,     // -50%
  /** 崩塌时扣除数字基础比例（当前number的百分比） */
  COLLAPSE_DRAIN_PERCENT: 25,    // 基础扣除当前数字25%（原15%，威慑不足已上调）
  /** 不稳定等级时间因子折减系数（timeSpeedMultiplier 在 unstable 时 × 该值） */
  UNSTABLE_TIME_FACTOR_PENALTY: 0.7,
  /** 连续大崩塌阶梯递增量（每次 +5%，与 COLLAPSE_DRAIN_PERCENT 叠加） */
  COLLAPSE_DRAIN_STEP: 5,
  /** 连续大崩塌扣除比例上限（%） */
  COLLAPSE_DRAIN_MAX: 40,
} as const;

/** 熵崩道具定义 */
export const ENTROPY_ITEM_DEFS: EntropyItemDef[] = [
  {
    id: 'stabilizer',
    name: '熵稳定剂',
    description: '立即降低20点熵值。宇宙的镇定剂。',
    type: 'stabilizer',
    stardustCost: 50,
    icon: '🧊',
    maxStack: 99,
  },
  {
    id: 'rewind',
    name: '时间回溯',
    description: '回退最近5秒积累的熵值。让宇宙倒带。',
    type: 'rewind',
    stardustCost: 120,
    icon: '⏪',
    maxStack: 9,
  },
  {
    id: 'barrier',
    name: '维度屏障',
    description: '激活后60秒内熵值不再上升，为你争取喘息的拖延战术空间。',
    type: 'barrier',
    stardustCost: 80,
    icon: '🛡️',
    maxStack: 9,
  },
];

/** 熵崩叙事文本池 — 大崩塌触发时 */
export const ENTROPY_COLLAPSE_NARRATIVES: string[] = [
  '熵的极限被突破了。宇宙发出一声低沉的叹息——然后是撕裂声。',
  '秩序崩塌了。你的数字在混乱中剧烈波动，一部分永远消失了。',
  '热力学定律从不妥协。你推得太猛，宇宙就推回来。',
  '临界点已过。大崩塌降临——这是增长的代价。',
  '熵在尖叫。它告诉你：没有什么是免费的，包括无限。',
];

/** 熵值预警叙事文本池 — 进入不稳定/临界区域时 */
export const ENTROPY_WARNING_NARRATIVES: Record<string, string> = {
  unstable: '宇宙开始疲倦了。无休止的增长需要付出代价。熵值正在上升……',
  critical: '感受到那股颤抖了吗？这不是地震——是熵，在推门而入。',
};

/** 熵值恢复叙事（使用稳定剂或Prestige后） */
export const ENTROPY_RECOVERY_NARRATIVES: string[] = [
  '熵值回落。宇宙重新找到了平衡——至少暂时是这样。',
  '混乱退去。数字的脉动恢复了稳定的节奏。',
  '一次喘息的机会。但你知道，熵从未真正消失。',
];

// ============================================================
// 维度晶体商店（v2.0 — 晶体消费出口）
// ============================================================

/** 维度晶体商店单条商品 */
export interface DimensionCrystalShopItem {
  /** 唯一ID（购买后写入 GameState.purchasedCrystalUpgrades） */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 晶体消耗 */
  cost: number;
  /** 全局产出加成数值（注册为 1 + value，即 value=0.1 → ×1.10） */
  value: number;
}

/** 维度晶体商店商品定义（消耗维度晶体购买永久全局加成） */
export const DIMENSION_CRYSTAL_SHOP: DimensionCrystalShopItem[] = [
  {
    id: 'crystal_global_1',
    name: '维度共鸣 I',
    description: '永久 +10% 全局产出。',
    cost: 10,
    value: 0.10,
  },
  {
    id: 'crystal_global_2',
    name: '维度共鸣 II',
    description: '永久 +25% 全局产出。',
    cost: 25,
    value: 0.25,
  },
  {
    id: 'crystal_global_3',
    name: '维度共鸣 III',
    description: '永久 +50% 全局产出。',
    cost: 60,
    value: 0.50,
  },
];

// ============================================================
// 维度系统配置（v2.0 核心机制）
// ============================================================

/** 维度静态定义（5个平行维度） */
export const DIMENSION_DEFS: DimensionDef[] = [
  {
    id: 0,
    name: '基础维度',
    description: '标准规则，星尘为通用资源。一切的起点。',
    type: 'base',
    resourceName: '星尘',
    resourceIcon: '✨',
    unlockCost: 0,      // 起始维度，无需解锁
    baseMultiplier: 1.0,
    maxMastery: 100,
    narratives: [
      '基础维度稳定如初。数字在这里找到最初的秩序。',
      '标准规则下，每一个增长都按部就班。',
    ],
  },
  {
    id: 1,
    name: '质数维度',
    description: '当数字为质数时，所有生产者产出 ×3。专属资源「质核」。',
    type: 'prime',
    resourceName: '质核',
    resourceIcon: '🔢',
    unlockCost: 1,      // 需1个奇点核心
    baseMultiplier: 1.0,
    maxMastery: 100,
    narratives: [
      '质数维度开启。你感受到数字的"不可分解性"了吗？',
      '质核在手中脉动。只有质数才能激发真正的力量。',
      '2, 3, 5, 7, 11……质数的旋律在数域中回响。',
    ],
  },
  {
    id: 2,
    name: '混沌维度',
    description: '产出倍率每60秒随机重投（0.5x ~ 5x）。高风险高回报。专属资源「混沌碎片」。',
    type: 'chaos',
    resourceName: '混沌碎片',
    resourceIcon: '🎲',
    unlockCost: 2,
    baseMultiplier: 1.0,
    maxMastery: 100,
    narratives: [
      '混沌维度开启。秩序崩塌了——但混乱中藏着机遇。',
      '骰子已经掷出。你敢赌这一把吗？',
      '混沌碎片闪烁着不确定的光芒。每一次都是新的开始。',
    ],
  },
  {
    id: 3,
    name: '反熵维度',
    description: '每次Prestige后，本维度临时产出倍率 +20%（可叠加）。专属资源「熵晶」。',
    type: 'anti_entropy',
    resourceName: '熵晶',
    resourceIcon: '🧊',
    unlockCost: 3,
    baseMultiplier: 1.0,
    maxMastery: 100,
    narratives: [
      '反熵维度开启。你逆着热力学第二定律而行。',
      '熵晶冰凉刺骨。每一次重置，都是对混乱的反叛。',
      '越多次飞升，越强的回报——这是给坚持者的奖励。',
    ],
  },
  {
    id: 4,
    name: '奇点维度',
    description: '数字接近奇点（e308+）时触发"临界爆发"——5秒内产出 ×100。专属资源「奇点核心」。',
    type: 'singularity',
    resourceName: '奇点核心',
    resourceIcon: '🌑',
    unlockCost: 5,
    baseMultiplier: 1.0,
    maxMastery: 100,
    narratives: [
      '奇点维度开启。你凝视着深渊——深渊也在凝视你。',
      '奇点核心散发着不祥的紫光。太接近了……数字即将失控。',
      '临界点。再往前一步，就是永恒的寂静——或者爆发。',
    ],
  },
];

/** 维度切换叙事文本池 */
export const DIMENSION_SWITCH_NARRATIVES: Record<number, string[]> = {
  0: ['返回基础维度。一切归于平静。'],
  1: ['进入质数维度。质数的力量在你指尖跃动。'],
  2: ['进入混沌维度。骰子的声音在远处回响……'],
  3: ['进入反熵维度。你逆流向而行。'],
  4: ['进入奇点维度。深渊在你脚下张开。'],
};

/** 维度精通奖励（每20点精通解锁一个被动） */
export const DIMENSION_MASTERY_REWARDS: Record<number, string[]> = {
  0: ['星尘获取 +10%', '生产者成本 -5%', '点击基础值 +20%', '离线效率 +15%', '全局倍率 +5%'],
  1: ['质数触发概率 +15%', '质数倍率提升至 ×4', '质核获取 +20%', '因子发现速度 +10%', '质数时自动Prestige建议'],
  2: ['混沌上限提升至 8x', '混沌持续时间 +30s', '混沌保底机制（最低 1.0x）', '碎片合成效率 +25%', '随机事件触发率 +10%'],
  3: ['反熵叠加上限 +5层', 'Prestige后保留 10% 数字', '熵晶获取 +30%', '熵值增长 -15%', 'Transcend后额外奇点核心'],
  4: ['临界爆发倍率提升至 ×200', '爆发持续时间 +5s', '奇点核心可兑换维度晶体', '数字 e300+ 时自动触发爆发', '超越后可保留奇点印记'],
};

// ============================================================
// 基因进化系统配置（v2.0 — GeneEvo）
// 数值对齐 GDD §2.1 + G6 公式（v2-epic-stories.md §9 G5/G6）
//   value = 1 + (baseEffect + effectPerLevel * (level - 1)) * expression
// ============================================================

/** 基因静态定义池（8 类，对齐 GDD §3.1） */
export const GENE_DEFS: GeneDef[] = [
  {
    id: 'gene_growth',
    name: '增殖基因',
    description: '生产者基础产出 ×(1 + 0.05×Lv)',
    icon: '🌱',
    effectType: 'output_multiplier',
    effectPerLevel: 0.05,
    baseEffect: 0,
    maxLevel: 5,
    initialLevelRange: [1, 3],
    canBePruned: true,
  },
  {
    id: 'gene_catalyst',
    name: '催化基因',
    description: '因子发现概率 ×(1 + 0.10×Lv)',
    icon: '⚗️',
    effectType: 'factor_boost',
    effectPerLevel: 0.10,
    baseEffect: 0,
    maxLevel: 5,
    initialLevelRange: [1, 2],
    canBePruned: true,
  },
  {
    id: 'gene_resilience',
    name: '韧性基因',
    description: '飞升后起点数字 ×(10^Lv)',
    icon: '🛡️',
    effectType: 'prestige_start',
    effectPerLevel: 0.10,
    baseEffect: 0,
    maxLevel: 5,
    initialLevelRange: [1, 3],
    canBePruned: true,
  },
  {
    id: 'gene_resonance',
    name: '共振基因',
    description: '事件发生率 ×(1 + 0.15×Lv)，事件持续时间 ×(1 + 0.10×Lv)',
    icon: '📡',
    effectType: 'event_boost',
    effectPerLevel: 0.15,
    baseEffect: 0,
    maxLevel: 5,
    initialLevelRange: [1, 2],
    canBePruned: true,
  },
  {
    id: 'gene_mutation',
    name: '突变基因',
    description: '每轮 Prestige 随机化为其他基因类型，强度随机（高风险高收益）',
    icon: '🎲',
    effectType: 'random',
    effectPerLevel: 0,
    baseEffect: 0,
    maxLevel: 5,
    initialLevelRange: [1, 5],
    canBePruned: true,
  },
  {
    id: 'gene_memory',
    name: '记忆基因',
    description: '记录历史最高数字 log10 值，提供永久全局倍率 ×(1 + 0.02×记录值)',
    icon: '🧠',
    effectType: 'memory',
    effectPerLevel: 0,
    baseEffect: 0.02,
    maxLevel: 5,
    initialLevelRange: [1, 1],
    canBePruned: false,
  },
  {
    id: 'gene_entangle',
    name: '纠缠基因',
    description: '随机选中 2 个生产者，其协同倍率 ×(1 + 0.20×Lv)',
    icon: '🔗',
    effectType: 'producer_synergy',
    effectPerLevel: 0.20,
    baseEffect: 0,
    maxLevel: 5,
    initialLevelRange: [1, 2],
    canBePruned: true,
  },
  {
    id: 'gene_exotic',
    name: '奇异基因',
    description: '解锁隐藏增益或特殊叙事文本；Lv 3+ 时全局产出 ×(1 + 0.50×Lv)',
    icon: '✨',
    effectType: 'hidden',
    effectPerLevel: 0.50,
    baseEffect: 0,
    maxLevel: 5,
    initialLevelRange: [1, 1],
    canBePruned: true,
  },
];

/** 常规随机池（不含 gene_exotic，exotic 仅 Transcend 5% 概率） */
export const GENE_COMMON_POOL: GeneType[] = GENE_DEFS
  .filter((g) => g.id !== 'gene_exotic')
  .map((g) => g.id);

/** 基因槽扩容规则（对齐 GDD §2.4） */
export interface GeneSlotExpansion {
  /** 扩容后目标槽位数 */
  targetSlots: number;
  /** 消耗奇点核心 */
  cost: number;
  /** 需要的超越次数 */
  requiredTranscends: number;
  /** 是否需要奇异基因 Lv 3 */
  requireExoticLv3: boolean;
}

export const GENE_SLOT_EXPANSIONS: GeneSlotExpansion[] = [
  { targetSlots: 4, cost: 3, requiredTranscends: 2, requireExoticLv3: false },
  { targetSlots: 5, cost: 5, requiredTranscends: 3, requireExoticLv3: false },
  { targetSlots: 6, cost: 8, requiredTranscends: 5, requireExoticLv3: false },
  { targetSlots: 7, cost: 12, requiredTranscends: 7, requireExoticLv3: false },
  { targetSlots: 8, cost: 20, requiredTranscends: 10, requireExoticLv3: true },
];

/** 突变叙事随机池（Story 1.2.1 验收 #4） */
export const GENE_MUTATION_NARRATIVES: string[] = [
  '一段基因序列在坍缩的火花中扭曲、重组——新的可能性诞生了。',
  '你的数字 DNA 发生了微调。无人知晓这会带来什么，但变化已经发生。',
  '突变的涟漪掠过基因链。某条基因睁开了新的眼睛。',
  '在坍缩的临界点上，一条基因记住了另一种形状。',
  '基因链的某个节点闪烁了一下——它再也不是原来的自己了。',
];

/** 首次 Transcend 初始基因数量范围（对齐 GDD §2.2） */
export const GENE_INITIAL_COUNT_RANGE: [number, number] = [2, 3];
/** Transcend 后新基因获取数量（对齐 GDD §2.3.3） */
export const GENE_ACQUIRE_PER_TRANSCEND = 1;
/** 奇异基因 Transcend 获取概率（对齐 GDD §2.3.3） */
export const GENE_EXOTIC_CHANCE = 0.05;
/** 暂存区上限（对齐 GDD §6 边缘情况 #1） */
export const GENE_STASH_MAX = 3;
