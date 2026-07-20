import type { ActiveEvent, OngoingEffect, GeneType } from '@/types/game';

/**
 * 维度状态的序列化形式（Decimal 转为 string）
 */
export interface SerializedDimensionState {
  /** 维度ID */
  id: number;
  /** 是否已解锁 */
  unlocked: boolean;
  /** 精通度（0-100） */
  master: number;
  /** 专属资源数量（string 表示，避免丢失精度） */
  resource: string;
  /** 维度晶体数量 */
  crystals: number;
  /** 本维度最高数字记录（string 表示） */
  maxNumber: string;
}

/**
 * 单条基因序列化形式（无 Decimal，纯可序列化字段）
 */
export interface SerializedGeneState {
  /** 唯一实例 ID */
  instanceId: string;
  /** 基因类型 */
  type: GeneType;
  /** 当前等级 */
  level: number;
  /** 表达强度 (0-1) */
  expression: number;
  /** 纠缠基因专属：绑定的生产者ID列表 */
  entangledProducers?: string[];
  /** 突变基因专属：随机效果种子 */
  mutationSeed: number;
  /** 记忆基因专属：记录的历史最高 log10 值（冗余缓存） */
  memoryRecord?: number;
  /** 获得时间戳 (ms) */
  obtainedAt: number;
  /** 上次突变时间戳 (ms) */
  lastMutatedAt?: number;
}

/**
 * 基因链序列化形式
 */
export interface SerializedGeneChainState {
  /** 当前基因链 */
  chain: SerializedGeneState[];
  /** 当前最大槽位数 */
  maxSlots: number;
  /** 已扩容次数 */
  expansionCount: number;
  /** 累计突变次数 */
  totalMutations: number;
  /** 累计重组次数 */
  totalRecombinations: number;
  /** 累计筛选次数 */
  totalPrunings: number;
  /** 历史最高数字 log10 值（string，序列化安全，G4） */
  historicalMaxNumber: string;
  /** Expansion 后是否可筛选 */
  pendingScreen: boolean;
  /** 暂存区（槽满时 Transcend 获得的新基因） */
  pendingStash: SerializedGeneState[];
}

/**
 * 序列化后的状态（所有Decimal转为string，Map/Set转为可序列化结构）
 */
export interface SerializedState {
  /** 当前数字（字符串表示） */
  number: string;
  /** 累计总数字（字符串表示） */
  totalNumber: string;
  /** 星尘数量 */
  stardust: number;
  /** 坍缩次数 */
  prestigeCount: number;
  /** 累计获得星尘总数 */
  cumulativeStardust: number;
  /** 暗能量数量 */
  darkEnergy: number;
  /** 膨胀次数 */
  expansionCount: number;
  /** 累计暗能量 */
  cumulativeDarkEnergy: number;
  /** 奇点数量 */
  singularity: number;
  /** 超越次数 */
  transcendCount: number;
  // ---- v2.0 熵崩系统字段 ----
  /** 当前熵值（0-100） */
  entropy: number;
  /** 熵稳定剂持有数量 */
  entropyStabilizers: number;
  /** 时间回溯道具持有数量 */
  entropyRewinds: number;
  /** 历史总崩塌次数 */
  totalCollapses: number;
  /** 连续大崩塌计数（阶梯式扣除用） */
  collapseStreak: number;
  /** 维度屏障持有数量 */
  entropyBarriers: number;
  /** 维度屏障激活截止时间戳(ms)（0=未激活） */
  _barrierActiveUntil: number;
  // ---- v2.0 维度系统字段 ----
  /** 当前所处维度ID（0-4） */
  currentDimension: number;
  /** 各维度状态（key = dimensionId） */
  dimensionStates: Record<number, SerializedDimensionState>;
  /** 维度晶体数量（跨维度通用货币，string 表示） */
  dimensionCrystals: string;
  /** 混沌维度当前随机倍率（每60秒重投） */
  _chaosMultiplier: number;
  /** 奇点维度临界爆发是否激活 */
  _singularityBurstActive: boolean;
  /** 奇点维度临界爆发结束时间戳(ms)（0=未激活） */
  _singularityBurstEndsAt: number;
  /** 已购买的维度晶体增益ID列表 */
  purchasedCrystalUpgrades: string[];
  // ---- 事件系统运行时字段 ----
  /** 当前活跃事件（等待玩家选择） */
  activeEvent: ActiveEvent | null;
  /** 正在生效的持续效果列表 */
  ongoingEffects: OngoingEffect[];
  /** 临界随机停机的生产者（producerId → 停机结束时间戳 ms） */
  downedProducers: Record<string, number>;
  /** 生产者状态（id→level） */
  producers: Record<string, number>;
  /** 升级状态（id→level） */
  upgrades: Record<string, number>;
  /** 星尘升级状态（id→level） */
  stardustUpgrades: Record<string, number>;
  /** 暗能量升级状态（id→level） */
  expansionUpgrades: Record<string, number>;
  /** 超越升级状态（id→level） */
  transcendUpgrades: Record<string, number>;
  /** 科技树状态（id→已解锁） */
  techTree: Record<string, boolean>;
  /** 当前纪元ID */
  currentEpoch: string;
  /** 已解锁生产者ID列表 */
  unlockedProducers: string[];
  /** 上次tick时间戳(ms) */
  lastTickTime: number;
  /** 游戏开始时间戳(ms) */
  gameStartTime: number;
  /** 总计脉冲点击次数 */
  totalClicks: number;
  /** 总计手动点击收益（字符串表示） */
  totalManualEarnings: string;
  /** 成就解锁状态（id→unlockedAt timestamp，未解锁则不存在） */
  achievements?: Record<string, number>;
  /** 上次量级（因子系统用，-1表示未初始化） */
  lastMagnitude: number;
  /** 因子状态（id→{level, active}） */
  factors?: Record<string, { level: number; active: boolean }>;
  /** 挑战状态（id→{progress, completed, claimed}） */
  challenges?: Record<string, { progress: number; completed: boolean; claimed: boolean }>;
  /** 已完成的里程碑ID列表 */
  completedMilestones?: string[];
  /** 上次计时挑战时间戳(ms) */
  lastTimedChallengeTime: number;
  /** 事件冷却剩余秒数 */
  eventCooldown: number;
  /** 时间速度倍率 */
  timeSpeedMultiplier: number;
  /** 新手引导步骤（0=未开始，-1=已完成） */
  tutorialStep?: number;
  // ---- v2.0 基因进化系统字段 ----
  /** 基因链状态（无 Decimal） */
  geneChain: SerializedGeneChainState;
  // ---- v2.0 宇宙档案馆字段（对齐 ADR-002 A5 + ArchiveRecord 采集需要） ----
  /** 档案馆是否已解锁 */
  archiveUnlocked: boolean;
  /** 本轮 Run 开始时间戳 (ms) */
  _runStartTime: number;
  /** 本轮最高数字（Decimal string） */
  _runMaxNumber: string;
  /** 本轮各维度停留时长累计（秒） */
  _runDimensionDwell: Record<number, number>;
  /** 本轮访问过的维度 ID 列表 */
  _runDimensionsVisited: number[];
  /** 本轮事件触发计数器 */
  _runEventCount: number;
  /** 本轮最高熵值 */
  _runMaxEntropy: number;
  /** 本轮熵崩次数 */
  _runCollapses: number;
  /** 本轮是否在奇点维度触发过临界爆发 */
  _runSingularityBurst: boolean;
  /** 本轮星尘获取量 */
  _runStardustEarned: number;
  /** 本轮暗能量获取量 */
  _runDarkEnergyEarned: number;
}

/**
 * 完整存档数据
 */
export interface SaveData {
  /** 存档版本号 */
  version: number;
  /** 存档时间戳(ms) */
  timestamp: number;
  /** 序列化后的游戏状态 */
  state: SerializedState;
}
