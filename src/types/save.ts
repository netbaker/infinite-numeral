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
