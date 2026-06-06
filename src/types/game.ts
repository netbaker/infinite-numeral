import Decimal from 'break_eternity.js';
import type { BigNumber } from '@/core/BigNumber';

// ============================================================
// 生产者配置
// ============================================================

/** 生产者静态配置 */
export interface ProducerConfig {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 基础产出（每tick） */
  baseOutput: number;
  /** 基础购买成本 */
  baseCost: number;
  /** 成本增长系数 */
  costMultiplier: number;
  /** 解锁阈值（number达到此值时解锁） */
  unlockThreshold: number;
  /** 解锁提示名称 */
  unlockName: string;
}

/** 生产者运行时状态 */
export interface ProducerState {
  /** 唯一标识 */
  id: string;
  /** 当前等级 */
  level: number;
}

// ============================================================
// 升级定义
// ============================================================

/** 升级效果类型 */
export type UpgradeEffectType =
  | 'click_multiplier'
  | 'producer_multiplier'
  | 'global_multiplier';

/** 升级静态定义 */
export interface UpgradeDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 基础购买成本 */
  baseCost: number;
  /** 效果类型 */
  effectType: UpgradeEffectType;
  /** 效果数值（如×2 的 2） */
  effectValue: number;
  /** 最大等级 */
  maxLevel: number;
  /** 解锁条件表达式 */
  unlockCondition: string;
}

/** 升级运行时状态 */
export interface UpgradeState {
  /** 唯一标识 */
  id: string;
  /** 当前等级 */
  level: number;
}

// ============================================================
// 星尘升级定义
// ============================================================

/** 星尘效果类型 */
export type StardustEffectType =
  | 'start_bonus'
  | 'output_multiplier'
  | 'cost_discount';

/** 星尘升级静态定义 */
export interface StardustUpgradeDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 星尘花费 */
  stardustCost: number;
  /** 成本缩放系数 */
  costScaling: number;
  /** 效果数值 */
  effectValue: number;
  /** 最大等级 */
  maxLevel: number;
}

/** 星尘升级运行时状态 */
export interface StardustUpgradeState {
  /** 唯一标识 */
  id: string;
  /** 当前等级 */
  level: number;
}

// ============================================================
// 科技树
// ============================================================

/** 科技树节点静态定义 */
export interface TechNodeDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 星尘成本 */
  stardustCost: number;
  /** 前置节点ID（空字符串=无前置） */
  requires: string;
  /** 效果类型 */
  effectType: 'unlock_producers' | 'global_multiplier' | 'epoch_discount' | 'unlock_expansion';
  /** 效果数值 */
  effectValue: number;
}

/** 科技树节点运行时状态 */
export interface TechNodeState {
  /** 唯一标识 */
  id: string;
  /** 是否已解锁 */
  unlocked: boolean;
}

// ============================================================
// 暗能量升级（第2层Prestige）
// ============================================================

/** 暗能量升级静态定义 */
export interface ExpansionUpgradeDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 暗能量成本 */
  deCost: number;
  /** 成本缩放系数 */
  costScaling: number;
  /** 效果类型 */
  effectType: 'output_multiplier' | 'cost_discount';
  /** 效果数值 */
  effectValue: number;
  /** 最大等级 */
  maxLevel: number;
}

/** 暗能量升级运行时状态 */
export interface ExpansionUpgradeState {
  /** 唯一标识 */
  id: string;
  /** 当前等级 */
  level: number;
}

// ============================================================
// 超越升级（第3层Prestige — 元升级）
// ============================================================

/** 超越升级静态定义 */
export interface TranscendUpgradeDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 奇点成本 */
  singularityCost: number;
  /** 成本缩放系数 */
  costScaling: number;
  /** 效果数值 */
  effectValue: number;
  /** 最大等级 */
  maxLevel: number;
}

/** 超越升级运行时状态 */
export interface TranscendUpgradeState {
  /** 唯一标识 */
  id: string;
  /** 当前等级 */
  level: number;
}

// ============================================================
// 乘数系统
// ============================================================

/** 乘数来源 */
export type MultiplierSource = 'upgrade' | 'stardust' | 'expansion' | 'transcend' | 'tech' | 'epoch' | 'milestone' | 'factor' | 'event';

/** 乘数条目 */
export interface MultiplierEntry {
  /** 唯一标识 */
  id: string;
  /** 来源类型 */
  source: MultiplierSource;
  /** 目标（空字符串=全局） */
  target: string;
  /** 乘数值 */
  value: number;
}

// ============================================================
// 纪元配置
// ============================================================

/** 纪元静态配置 */
export interface EpochConfig {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 触发阈值 */
  threshold: number;
  /** 叙事文本 */
  narrative: string;
  /** 视觉CSS类名 */
  visualClass: string;
}

// ============================================================
// 离线收益
// ============================================================

/** 离线收益结果 */
export interface OfflineResult {
  /** 离线期间获得的数字 */
  gainedNumber: BigNumber;
  /** 离线时长（秒） */
  offlineDuration: number;
  /** 离线效率（0-1） */
  efficiency: number;
}

// ============================================================
// 多周目里程碑
// ============================================================

/** 里程碑静态定义 */
export interface MilestoneDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 需要的超越次数 */
  transcendCount: number;
  /** 全局产出倍率 */
  globalMultiplier: number;
  /** 是否解锁超元升级 */
  unlockMetaUpgrade: boolean;
}

/** 里程碑运行时状态 */
export interface MilestoneState {
  /** 唯一标识 */
  id: string;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 解锁时间戳 */
  unlockedAt?: number;
}

// ============================================================
// 成就系统
// ============================================================

/** 成就触发条件类型 */
export type AchievementConditionType =
  | 'number_reach'        // 当前数字 >= value
  | 'total_number_reach'  // 累计总数字 >= value
  | 'prestige_count'      // 坍缩次数 >= value
  | 'expansion_count'     // 膨胀次数 >= value
  | 'transcend_count'     // 超越次数 >= value
  | 'producer_level'      // 指定生产者等级 >= value（target=producerId）
  | 'click_count'         // 总点击次数 >= value
  | 'epoch_reach'         // 到达指定纪元（target=epochId）
  | 'stardust_total'      // 累计星尘 >= value
  | 'singularity_total';  // 奇点数量 >= value

/** 成就静态定义 */
export interface AchievementDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本（解锁后展示） */
  description: string;
  /** 未解锁时的提示文本（隐藏真实条件） */
  hint: string;
  /** 图标 emoji */
  icon: string;
  /** 触发条件类型 */
  conditionType: AchievementConditionType;
  /** 条件数值（epoch_reach时填 0） */
  conditionValue: number;
  /** 条件目标（producer_level / epoch_reach 时使用） */
  conditionTarget?: string;
  /** 分组标签 */
  group: 'growth' | 'prestige' | 'producer' | 'exploration' | 'legend';
}

/** 成就运行时状态 */
export interface AchievementState {
  /** 唯一标识 */
  id: string;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 解锁时间戳（ms） */
  unlockedAt?: number;
}

// ============================================================
// 数字分解 / 因子系统
// ============================================================

/** 因子效果类型 */
export type FactorEffectType =
  | 'click_multiplier'     // 点击倍率
  | 'producer_multiplier'  // 生产者产出倍率
  | 'global_multiplier'    // 全局产出倍率
  | 'cost_discount';       // 购买成本折扣

/** 因子分类（用于UI分组展示） */
export type FactorCategory =
  | 'prime'        // 素数
  | 'perfect'      // 完全平方/立方
  | 'fibonacci'    // 斐波那契
  | 'power'        // 2/5/10 的幂
  | 'repdigit'     // 整十/整百等
  | 'special';     // 特殊常数邻近

/** 因子静态定义 */
export interface FactorDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 分类 */
  category: FactorCategory;
  /** 检测函数名（FactorSystem中的方法名） */
  detector: string;
  /** 效果类型 */
  effectType: FactorEffectType;
  /** 基础效果数值（×倍或%折扣） */
  baseEffect: number;
  /** 每级效果成长 */
  effectPerLevel: number;
  /** 最大等级 */
  maxLevel: number;
  /** 触发数量级阈值（log10门槛） */
  magnitudeThreshold: number;
  /** 图标 emoji */
  icon: string;
}

/** 因子运行时状态 */
export interface FactorState {
  /** 唯一标识 */
  id: string;
  /** 当前等级 */
  level: number;
  /** 是否当前激活中 */
  active: boolean;
  /** 上次触发时的数字快照（用于叙事展示） */
  triggeredAt?: Decimal;
}

// ============================================================
// 维度系统（v2.0 核心机制）
// ============================================================

/** 维度ID类型（0-4） */
export type DimensionId = 0 | 1 | 2 | 3 | 4;

/** 维度类型 */
export type DimensionType =
  | 'base'        // 基础维度（标准规则）
  | 'prime'       // 质数维度
  | 'chaos'       // 混沌维度
  | 'anti_entropy'// 反熵维度
  | 'singularity'; // 奇点维度

/** 维度静态定义 */
export interface DimensionDef {
  /** 维度ID */
  id: DimensionId;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 维度类型 */
  type: DimensionType;
  /** 专属资源名称 */
  resourceName: string;
  /** 专属资源图标 */
  resourceIcon: string;
  /** 解锁所需奇点核心数量 */
  unlockCost: number;
  /** 基础产出倍率 */
  baseMultiplier: number;
  /** 精通度上限 */
  maxMastery: number;
  /** 叙事文本池（切换时随机展示） */
  narratives: string[];
}

/** 维度运行时状态 */
export interface DimensionState {
  /** 维度ID */
  id: DimensionId;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 精通度（0-100） */
  master: number;
  /** 专属资源数量 */
  resource: Decimal;
  /** 维度晶体数量（合成用） */
  crystals: number;
  /** 本维度最高数字记录 */
  maxNumber: Decimal;
}

/** 维度面板单条数据（给 UI 渲染用） */
export interface DimensionPanelData {
  id: DimensionId;
  name: string;
  type: string;
  description: string;
  unlocked: boolean;
  isActive: boolean;
  master: number;
  masterLevel: number;
  masterReward: string | null;
  resource: Decimal;
  resourceName: string;
  resourceIcon: string;
  crystals: number;
  unlockCost: number;
  canUnlock: boolean;
  multiplier: number;
}

// ============================================================
// 挑战 / 任务系统
// ============================================================

/** 挑战类别 */
export type ChallengeCategory = 'daily' | 'timed' | 'milestone';

/** 挑战进度类型 */
export type ChallengeProgressType =
  | 'number_reach'         // 数字达到目标
  | 'click_count'          // 点击次数达到目标
  | 'prestige_once'        // 执行一次坍缩
  | 'expansion_once'       // 执行一次膨胀
  | 'produce_amount'       // 生产者总产出达到目标
  | 'idle_seconds';        // 在线挂机秒数

/** 挑战静态定义 */
export interface ChallengeDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 类别 */
  category: ChallengeCategory;
  /** 进度类型 */
  progressType: ChallengeProgressType;
  /** 目标数值 */
  targetValue: number;
  /** 目标对象（produce_type 时填 producerId，其他为空） */
  targetRef?: string;
  /** 时间限制（秒），仅 timed 类别有效；0=无限制 */
  timeLimit: number;
  /** 奖励星尘数 */
  stardustReward: number;
  /** 奖励暗能量数（里程碑挑战专属） */
  deReward?: number;
  /** 刷新周期（daily用）：'daily'=每天重置，''=不重置 */
  resetSchedule: string;
  /** 图标 emoji */
  icon: string;
}

/** 挑战运行时状态 */
export interface ChallengeState {
  /** 唯一标识 */
  id: string;
  /** 当前进度值 */
  progress: number;
  /** 是否已完成 */
  completed: boolean;
  /** 完成时间戳（ms） */
  completedAt?: number;
  /** 开始时间戳（ms，timed挑战用） */
  startedAt?: number;
  /** 剩余时间（秒，timed挑战实时更新） */
  remainingTime?: number;
  /** 已领取奖励 */
  claimed: boolean;
  /** 上次重置时间（YYYYMMDD字符串，daily用） */
  lastResetDate?: string;
}

// ============================================================
// 随机事件 / 宇宙异变系统
// ============================================================

/** 事件效果类型 */
export type EventEffectType =
  | 'global_multiplier'    // 全局倍率变化
  | 'producer_boost'       // 特定生产者加成
  | 'cost_change'          // 成本变动
  | 'stardust_gain'        // 星尘获取
  | 'stardust_loss'        // 星尘损失
  | 'number_drain'         // 数字流失
  | 'speed_change';        // 游戏速度变化

/** 事件选项（玩家可做的选择） */
export interface EventOption {
  /** 选项文本（简短描述） */
  text: string;
  /** 选择后触发的效果列表 */
  effects: EventEffect[];
  /** 叙事后果文本 */
  narrative: string;
}

/** 事件单条效果 */
export interface EventEffect {
  /** 效果类型 */
  type: EventEffectType;
  /** 效果数值（正=增益，负=减益） */
  value: number;
  /** 目标（空字符串=全局，producer_boost/cost_change 时填具体ID） */
  target?: string;
  /** 持续时间（秒）；0=即时效果，>0=持续效果 */
  duration: number;
}

/** 事件静态定义 */
export interface EventDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 事件描述（引入文本） */
  description: string;
  /** 最小触发数量级（log10） */
  minMagnitude: number;
  /** 基础触发概率（每tick，0-1） */
  baseProbability: number;
  /** 冷却时间（秒） */
  cooldown: number;
  /** 玩家选项列表 */
  options: EventOption[];
  /** 图标emoji */
  icon: string;
  /** 是否为重大事件（强制弹出模态框） */
  isMajor: boolean;
}

/** 当前活跃事件（等待玩家选择） */
export interface ActiveEvent {
  /** 事件定义ID */
  eventId: string;
  /** 触发时间戳(ms) */
  triggeredAt: number;
  /** 截止时间戳(ms)；0=无限期等待 */
  deadline: number;
}

/** 事件持续效果（选择后正在生效的buff/debuff） */
export interface OngoingEffect {
  /** 唯一标识（eventId + optionIndex 组合） */
  id: string;
  /** 来源事件定义ID */
  sourceEventId: string;
  /** 效果类型 */
  effects: EventEffect[];
  /** 生效开始时间戳(ms) */
  startedAt: number;
  /** 过期时间戳(ms)；0=永久效果 */
  expiresAt: number;
  /** 来源选项文本摘要 */
  summary: string;
}

// ============================================================
// 熵崩系统（v2.0 核心机制）
// ============================================================

/** 熵值崩溃等级 */
export type EntropyCollapseLevel =
  | 'stable'     // 0-50%：稳定，无影响
  | 'unstable'   // 50-80%：不稳定，产出 -20%
  | 'critical';  // 80-100%：临界，产出 -50%，随机停机

/** 熵崩道具类型 */
export type EntropyItemType =
  | 'stabilizer'    // 熵稳定剂 — 立即降低20%熵值
  | 'rewind';       // 时间回溯 — 回退5秒熵值积累

/** 熵崩道具静态定义 */
export interface EntropyItemDef {
  /** 唯一标识 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 道具类型 */
  type: EntropyItemType;
  /** 星尘购买成本 */
  stardustCost: number;
  /** 图标 emoji */
  icon: string;
  /** 最大持有数量 */
  maxStack: number;
}

// ============================================================
// 游戏状态
// ============================================================

/**
 * 游戏核心状态类
 * 包含所有运行时数据，Decimal字段直接存储Decimal实例
 */
export class GameState {
  /** 当前数字 */
  number: Decimal = new Decimal(0);
  /** 累计总数字 */
  totalNumber: Decimal = new Decimal(0);
  /** 星尘数量 */
  stardust: number = 0;
  /** 坍缩次数 */
  prestigeCount: number = 0;
  /** 累计获得星尘总数（用于膨胀判定） */
  cumulativeStardust: number = 0;
  /** 暗能量数量 */
  darkEnergy: number = 0;
  /** 膨胀次数 */
  expansionCount: number = 0;
  /** 累计暗能量（用于超越判定） */
  cumulativeDarkEnergy: number = 0;
  /** 奇点数量 */
  singularity: number = 0;
  /** 超越次数 */
  transcendCount: number = 0;
  /** 生产者状态 */
  producers: Map<string, ProducerState> = new Map();
  /** 升级状态 */
  upgrades: Map<string, UpgradeState> = new Map();
  /** 星尘升级状态 */
  stardustUpgrades: Map<string, StardustUpgradeState> = new Map();
  /** 暗能量升级状态 */
  expansionUpgrades: Map<string, ExpansionUpgradeState> = new Map();
  /** 超越升级（元升级）状态 */
  transcendUpgrades: Map<string, TranscendUpgradeState> = new Map();
  /** 科技树节点状态 */
  techTree: Map<string, TechNodeState> = new Map();
  /** 已解锁里程碑ID集合 */
  unlockedMilestones: Set<string> = new Set();
  /** 成就状态 */
  achievements: Map<string, AchievementState> = new Map();
  /** 当前纪元ID */
  currentEpoch: string = 'sprout';
  /** 已解锁生产者ID集合 */
  unlockedProducers: Set<string> = new Set();
  /** 上次tick时间戳(ms) */
  lastTickTime: number = 0;
  /** 游戏开始时间戳(ms) */
  gameStartTime: number = 0;
  /** 总计脉冲点击次数 */
  totalClicks: number = 0;
  /** 总计手动点击收益 */
  totalManualEarnings: Decimal = new Decimal(0);
  // ---- 因子系统 ----
  /** 上次检测因子时的数量级（log10值） */
  lastMagnitude: number = -1;
  /** 已发现的因子状态 */
  factors: Map<string, FactorState> = new Map();
  // ---- 挑战系统 ----
  /** 挑战状态 */
  challenges: Map<string, ChallengeState> = new Map();
  /** 已完成的里程碑挑战ID集合（跨重置保留） */
  completedMilestones: Set<string> = new Set();
  /** 上次限时挑战开始时间（ms） */
  lastTimedChallengeTime: number = 0;
  // ---- 事件系统 ----
  /** 当前活跃事件（等待玩家选择） */
  activeEvent: ActiveEvent | null = null;
  /** 事件冷却剩余时间（秒） */
  eventCooldown: number = 0;
  /** 上次事件 tick 时间戳（ms），用于冷却倒计时计算 */
  _lastEventTick: number = 0;
  /** 正在生效的持续效果列表 */
  ongoingEffects: OngoingEffect[] = [];
  /** 全局时间流速倍率（事件可临时修改，范围 [0.1, 5.0]） */
  timeSpeedMultiplier: number = 1;
  // ---- 熵崩系统（v2.0） ----
  /** 当前熵值（0-100，超过阈值触发崩溃惩罚） */
  entropy: number = 0;
  /** 熵稳定剂持有数量 */
  entropyStabilizers: number = 0;
  /** 时间回溯道具持有数量 */
  entropyRewinds: number = 0;
  /** 历史总崩塌次数 */
  totalCollapses: number = 0;
  /** 上次大崩塌发生时间戳(ms) */
  lastCollapseAt: number = 0;
  /** 熵值上次衰减时间戳(ms) — 用于自然衰减计算 */
  _lastEntropyDecayTick: number = 0;
  // ---- 维度系统（v2.0） ----
  /** 当前所处维度ID（0-4） */
  currentDimension: DimensionId = 0;
  /** 各维度状态（key = dimensionId） */
  dimensionStates: Map<number, DimensionState> = new Map();
  /** 维度晶体数量（跨维度通用货币） */
  dimensionCrystals: Decimal = new Decimal(0);
  /** 上次维度切换时间戳(ms)（防止频繁切换） */
  _lastDimensionSwitch: number = 0;
  // ---- 维度系统运行时临时状态 ----
  /** 混沌维度当前随机倍率（每60秒重投） */
  _chaosMultiplier: number = 1.0;
  /** 奇点维度临界爆发是否激活 */
  _singularityBurstActive: boolean = false;
  /** 奇点维度临界爆发结束时间戳(ms) */
  _singularityBurstEndsAt: number = 0;
  // ---- 新手引导 ----
  /** 新手引导当前步骤（0=未开始，-1=已完成） */
  tutorialStep: number = 0;
}
