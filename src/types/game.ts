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
export type MultiplierSource = 'upgrade' | 'stardust' | 'expansion' | 'transcend' | 'tech' | 'epoch' | 'milestone';

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
}
