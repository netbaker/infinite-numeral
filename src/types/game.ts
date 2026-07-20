import Decimal from 'break_eternity.js';
import type { BigNumber } from '@/core/BigNumber';
import type { CodexEntryState } from './codex';

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
export type MultiplierSource = 'upgrade' | 'stardust' | 'expansion' | 'transcend' | 'tech' | 'epoch' | 'milestone' | 'factor' | 'event' | 'dimension' | 'crystal' | 'gene';

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
// 基因进化系统（v2.0 — GeneEvo）
// 命名/字段集对齐 GDD §3.1 + ADR-001（见 v2-epic-stories.md §9 G1-G7）
// ============================================================

/** 基因类型枚举（GDD 带前缀命名，G1 已对齐） */
export type GeneType =
  | 'gene_growth'      // 增殖基因
  | 'gene_catalyst'    // 催化基因
  | 'gene_resilience'  // 韧性基因
  | 'gene_resonance'   // 共振基因
  | 'gene_mutation'    // 突变基因
  | 'gene_memory'      // 记忆基因
  | 'gene_entangle'    // 纠缠基因
  | 'gene_exotic';     // 奇异基因

/** 基因效果类型（决定 MultiplierSystem 注册方式 / 跨系统接入点） */
export type GeneEffectType =
  | 'output_multiplier'  // 全局产出倍率（gene_growth）
  | 'factor_boost'       // 因子发现加成（gene_catalyst → FactorSystem）
  | 'prestige_start'     // 飞升起点数字（gene_resilience → PrestigeSystem）
  | 'event_boost'        // 事件加成（gene_resonance → EventSystem）
  | 'random'             // 每轮随机变异（gene_mutation）
  | 'memory'             // 记忆倍率（gene_memory，chain 级 historicalMaxNumber）
  | 'producer_synergy'   // 生产者协同倍率（gene_entangle，per-producer）
  | 'hidden';            // 隐藏增益 / 叙事（gene_exotic）

/** 基因静态定义（G5 已对齐：baseEffect + effectPerLevel） */
export interface GeneDef {
  /** 唯一标识 */
  id: GeneType;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 图标 emoji */
  icon: string;
  /** 效果类型 */
  effectType: GeneEffectType;
  /** 每级效果数值（参与 G6 公式） */
  effectPerLevel: number;
  /** 基础效果数值（Lv 1 时参与 G6 公式，G5 已对齐） */
  baseEffect: number;
  /** 最大等级 */
  maxLevel: number;
  /** 初始等级范围 [min, max] */
  initialLevelRange: [number, number];
  /** 是否可被筛选删除（gene_memory 为 false，GDD §2.3.2） */
  canBePruned: boolean;
}

/** 基因运行时状态（链上单条基因，G2 已对齐字段集） */
export interface GeneState {
  /** 唯一实例 ID */
  instanceId: string;
  /** 基因类型 */
  type: GeneType;
  /** 当前等级 (1-5) */
  level: number;
  /** 表达强度 (0-1，影响效果倍率，G3 已对齐) */
  expression: number;
  /** 纠缠基因专属：绑定的生产者ID列表（GDD §2.1） */
  entangledProducers?: string[];
  /** 突变基因专属：随机效果种子（保证读档前后效果一致，ADR-001） */
  mutationSeed: number;
  /** 记忆基因专属：记录的历史最高 log10 值（冗余缓存，真值源见 GeneChainState.historicalMaxNumber，G4 已对齐) */
  memoryRecord?: number;
  /** 获得时间戳 (ms) */
  obtainedAt: number;
  /** 上次突变时间戳 (ms) */
  lastMutatedAt?: number;
}

/** 基因链整体状态（G7 已对齐：GDD 统计字段 + historicalMaxNumber） */
export interface GeneChainState {
  /** 当前基因链（最多 8 槽，每类最多 1 条） */
  chain: GeneState[];
  /** 当前最大槽位数（3-8） */
  maxSlots: number;
  /** 已扩容次数 */
  expansionCount: number;
  /** 累计突变次数 */
  totalMutations: number;
  /** 累计重组次数 */
  totalRecombinations: number;
  /** 累计筛选次数 */
  totalPrunings: number;
  /** 历史最高数字 log10 值（string 格式，序列化安全，记忆基因真值源，G4 / ADR-001) */
  historicalMaxNumber: string;
  /** Expansion 后是否可筛选（每次 Expansion 授予一次，消费后清零） */
  pendingScreen: boolean;
  /** 槽满时 Transcend 获得新基因的暂存区（最多 3 条，GDD §6 边缘情况 #1） */
  pendingStash: GeneState[];
}

// ============================================================
// 宇宙档案馆（v2.0 — Archive）
// 类型与字段集对齐 GDD archive-system.md §3.1 + ADR-002（A2/A3/A4）
// ============================================================

/** 基因轻量快照（仅类型 + 等级，不含运行时状态）— ADR-002 A3 */
export interface GeneSnapshot {
  /** 基因类型（引用 GeneType 带前缀命名） */
  type: GeneType;
  /** 当前等级 */
  level: number;
}

/** 单次运行快照记录 — ADR-002 A2：GDD 17 数据字段 + isMilestone */
export interface ArchiveRecord {
  /** 唯一 Run 标识（A4：string，格式 run_{transcendCount}_{timestamp}） */
  runId: string;
  /** 本次超越后的总超越次数 */
  transcendCount: number;
  /** 本轮最高数字（Decimal string） */
  maxNumber: string;
  /** maxNumber 的 log10 值（用于排序/对比） */
  maxLog10: number;
  /** 本轮持续时间（秒，从上次 Transcend 到本次） */
  runDuration: number;
  /** 本轮访问过的维度 ID 列表 */
  dimensionsVisited: number[];
  /** 本轮主要维度（停留最久） */
  primaryDimension: number;
  /** 本轮 Prestige 次数 */
  prestigeCount: number;
  /** 本轮 Expansion 次数 */
  expansionCount: number;
  /** 本轮触发事件总数 */
  eventsTriggered: number;
  /** 本轮熵崩次数 */
  collapsesTriggered: number;
  /** 本轮最高熵值 */
  maxEntropy: number;
  /** 本轮基因链快照（A3：轻量 type+level） */
  geneChainSnapshot: GeneSnapshot[];
  /** 本轮获得星尘总量 */
  stardustEarned: number;
  /** 本轮获得暗能量总量 */
  darkEnergyEarned: number;
  /** 本次 Transcend 获得奇点数 */
  singularityEarned: number;
  /** 快照时间戳 (ms) */
  timestamp: number;
  /** 本轮最高纪元 ID */
  epochReached: string;
  /** 是否为里程碑快照（不可删除）— A2 */
  isMilestone: boolean;
}

/** 档案馆统计摘要（GDD §3.1 ArchiveSummary） */
export interface ArchiveSummary {
  /** 总 Run 数 */
  totalRuns: number;
  /** 历史最高 maxLog10 */
  allTimeMaxLog10: number;
  /** 总游戏时长（秒） */
  totalPlayTime: number;
  /** 总 Transcend 次数（取记录中最大 transcendCount） */
  totalTranscends: number;
  /** 总熵崩次数 */
  totalCollapses: number;
  /** 各维度使用次数统计（按 primaryDimension 聚合） */
  dimensionUsage: Record<number, number>;
  /** 最快 Run（按效率 maxLog10/runDuration） */
  fastestRun: ArchiveRecord | null;
  /** 最长 Run（按持续时间） */
  longestRun: ArchiveRecord | null;
}

/** 两张快照对比结果（对齐 GDD §2.5 / §5.3） */
export interface CompareResult {
  /** 最高数字 log10 对比 */
  maxLog10: {
    /** 快照 A 的 maxLog10 */
    a: number;
    /** 快照 B 的 maxLog10 */
    b: number;
    /** 两者较大值（用于百分比基准，最小为 1 避免除零） */
    max: number;
    /** 绝对差值 */
    diff: number;
  };
  /** 持续时间与效率对比 */
  runDuration: {
    /** 快照 A 的持续时间（秒） */
    a: number;
    /** 快照 B 的持续时间（秒） */
    b: number;
    /** 快照 A 效率（maxLog10 / 秒） */
    efficiencyA: number;
    /** 快照 B 效率（maxLog10 / 秒） */
    efficiencyB: number;
  };
  /** Prestige 次数对比 */
  prestigeCount: { a: number; b: number };
  /** 事件触发次数对比 */
  eventsTriggered: { a: number; b: number };
  /** 基因链快照对比 */
  geneChain: { a: GeneSnapshot[]; b: GeneSnapshot[] };
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
  group: 'growth' | 'prestige' | 'producer' | 'exploration' | 'legend' | 'archive';
  /** 特殊成就奖励（奇点核心数量）；普通成就无此字段 */
  rewardSingularity?: number;
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
  | 'critical'   // 80-100%：临界，产出 -50%，随机停机
  | 'collapsed'; // >=100%：大崩塌已触发（熵值回落前的瞬间状态）

/** 熵崩道具类型 */
export type EntropyItemType =
  | 'stabilizer'    // 熵稳定剂 — 立即降低20%熵值
  | 'rewind'        // 时间回溯 — 回退5秒熵值积累
  | 'barrier';      // 维度屏障 — 60秒内熵值不上升

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
  /** 维度屏障道具持有数量 */
  entropyBarriers: number = 0;
  /** 维度屏障激活截止时间戳(ms)（0=未激活） */
  _barrierActiveUntil: number = 0;
  /** 历史总崩塌次数 */
  totalCollapses: number = 0;
  /** 上次大崩塌发生时间戳(ms) */
  lastCollapseAt: number = 0;
  /** 熵值上次衰减时间戳(ms) — 用于自然衰减计算 */
  _lastEntropyDecayTick: number = 0;
  /** 临界随机停机的生产者（producerId → 停机结束时间戳 ms） */
  downedProducers: Map<string, number> = new Map();
  /** 连续大崩塌计数（用于阶梯式扣除比例递增，Prestige/Expansion 时清零） */
  collapseStreak: number = 0;
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
  /** 已购买的维度晶体增益ID集合（消耗晶体购买的永久全局加成） */
  purchasedCrystalUpgrades: Set<string> = new Set();
  // ---- 新手引导 ----
  /** 新手引导当前步骤（0=未开始，-1=已完成） */
  tutorialStep: number = 0;
  // ---- 基因进化系统（v2.0） ----
  /** 基因链状态（跨重置继承；首次 Transcend 时获取初始基因） */
  geneChain: GeneChainState = {
    chain: [],
    maxSlots: 3,
    expansionCount: 0,
    totalMutations: 0,
    totalRecombinations: 0,
    totalPrunings: 0,
    historicalMaxNumber: '0',
    pendingScreen: false,
    pendingStash: [],
  };
  // ---- 宇宙档案馆（v2.0） ----
  // 注意：ArchiveRecord 列表不存储在 GameState 中，
  // 而是存储在 IndexedDB 独立表 `archives`（对齐 ADR-002 A1）。
  // 以下为 ADR-002 A5 的 7 个轻量字段 + 为准确采集 ArchiveRecord 关键字段而扩展的少量字段。
  /** 档案馆是否已解锁（参与主存档序列化，对齐 ADR-002 A5） */
  archiveUnlocked: boolean = false;
  /** 本轮 Run 开始时间戳 (ms)（对齐 ADR-002 A5） */
  _runStartTime: number = 0;
  /** 本轮达到的最高数字（Decimal；用于 maxNumber/maxLog10，避免 Transcend 前 Prestige/Expansion 重置 number 导致记录失真） */
  _runMaxNumber: Decimal = new Decimal(0);
  /** 本轮各维度停留时长累计（秒），用于计算 primaryDimension（对齐 GDD §2.2.2 primaryDimension） */
  _runDimensionDwell: Record<number, number> = {};
  /** 本轮访问过的维度集合（对齐 ADR-002 A5） */
  _runDimensionsVisited: Set<number> = new Set();
  /** 本轮事件触发计数器（对齐 ADR-002 A5） */
  _runEventCount: number = 0;
  /** 本轮最高熵值（对齐 ADR-002 A5） */
  _runMaxEntropy: number = 0;
  /** 本轮熵崩次数（用于 ArchiveRecord.collapsesTriggered） */
  _runCollapses: number = 0;
  /** 本轮是否在奇点维度触发过临界爆发（用于特殊成就 arch_singularity_burst） */
  _runSingularityBurst: boolean = false;
  /** 本轮星尘获取量（对齐 ADR-002 A5） */
  _runStardustEarned: number = 0;
  /** 本轮暗能量获取量（对齐 ADR-002 A5） */
  _runDarkEnergyEarned: number = 0;
  // ---- 数字神话图鉴（v2.0，Sprint 3） ----
  /** 图鉴词条状态（id → { unlocked, unlockedAt }），跨重置继承（见各 reset 函数的拷贝逻辑） */
  codexEntries: Map<string, CodexEntryState> = new Map();
  /** 图鉴是否已初始化（首次进入游戏时置 true） */
  codexInitialized: boolean = false;
  // ---- 跨系统联动追踪字段（供 CodexSystem.evaluateMystery 判定 mystery_* 使用，跨重置继承） ----
  /** 曾在哪些维度触发过熵崩（用于 mystery_01 / mystery_07） */
  collapsedDimensions: Set<number> = new Set();
  /** 混沌维度连续掷出 ≥4.0x 倍率的次数（用于 mystery_02） */
  _chaosStreak4x: number = 0;
  /** 是否曾在奇点维度临界爆发期间完成坍缩（用于 mystery_04） */
  _prestigeDuringBurst: boolean = false;
  /** 累计已保存的档案馆快照数（用于 mystery_06） */
  _archiveRecordCount: number = 0;
  /** 累计使用时间回溯道具次数（用于 mystery_08） */
  _rewindUsedCount: number = 0;
  /** 是否曾在混沌维度完成过膨胀（用于 mystery_11） */
  _expandedInChaosDim: boolean = false;
  /** 是否曾在奇点维度触发过临界爆发（用于 mystery_04，持久标记） */
  _singularityBurstEver: boolean = false;
  /** 跨多轮累积「曾获得过的基因类型」集合（用于 mystery_05 的 allTypes 判定，跨重置继承） */
  _allGeneTypesEver: Set<string> = new Set();
}
