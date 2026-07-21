/**
 * 皮肤系统（SkinSystem）— Sprint 4 纯函数逻辑层
 *
 * 对齐 GDD skin-system.md §2 / §3 与 ADR-003（S1/S2/S3 命名决策）。
 * 所有函数接收 `state: GameState` 并就地修改皮肤/主题相关字段，不持有实例状态。
 *
 * 关键约定：
 * - 数字皮肤与 UI 主题分开管理（两套独立 Set，S3）。
 * - 解锁 = 满足解锁条件（条件仅作门槛，不做追溯解锁，见 GDD §6 边缘情况 #2）
 *         + 扣减对应资源（维度资源 / 奇点核心 / 星尘）。
 * - 切换免费、无冷却；解锁后仅修改激活字段。
 * - 资源扣减统一走 `consumeResource`，金额校验走 `hasEnoughResource`。
 */

import Decimal from 'break_eternity.js';
import type {
  GameState,
  NumberSkinId,
  UIThemeId,
  NumberSkinDef,
  UIThemeDef,
  SkinCost,
} from '@/types/game';
import { DIMENSION_DEFS } from '@/core/Constants';

/** 解锁结果 */
export interface UnlockResult {
  /** 是否成功解锁 */
  ok: boolean;
  /** 失败原因（ok=false 时有效） */
  reason?: 'already_unlocked' | 'condition_unmet' | 'insufficient_resource';
}

// ============================================================
// 静态定义（单一数据源，对齐 GDD §2）
// ============================================================

/** 4 种数字皮肤定义（顺序即选择器展示顺序） */
export const SKIN_DEFS: NumberSkinDef[] = [
  {
    id: 'skin_scientific',
    name: '科学记数法',
    description: '默认格式，[系数]e[指数]，系数保留 2 位小数。',
    icon: '🔢',
    unlockCondition: '默认解锁',
    unlockCost: { type: 'none', amount: 0 },
    formatter: 'scientific',
  },
  {
    id: 'skin_engineering',
    name: '工程记数',
    description: '[系数]×10^[指数]，指数归整到 3 的倍数。',
    icon: '⚙️',
    unlockCondition: '坍缩（Prestige）3 次',
    unlockCost: { type: 'stardust', amount: 50 },
    formatter: 'engineering',
  },
  {
    id: 'skin_chinese',
    name: '汉字大数',
    description: '中文大数单位（万/亿/兆/京/垓…）。',
    icon: '🀄',
    unlockCondition: '超越（Transcend）1 次',
    unlockCost: { type: 'singularity', amount: 3 },
    formatter: 'chinese',
  },
  {
    id: 'skin_binary',
    name: '二进制脉冲',
    description: '二进制可视化 + 科学记数法回退。',
    icon: '💻',
    unlockCondition: '在奇点维度（Dim-4）使数字达到 1e100',
    unlockCost: { type: 'singularity', amount: 5 },
    formatter: 'binary',
  },
];

/** 5 种 UI 主题定义（顺序即选择器展示顺序） */
export const THEME_DEFS: UIThemeDef[] = [
  {
    id: 'theme_deep_space',
    name: '深空蓝',
    style: '现代科技',
    preview: { primary: '#0a0a1a', accent: '#6688ff', bg: '#1a1a2e' },
    unlockCondition: '默认解锁',
    unlockCost: { type: 'none', amount: 0 },
    cssThemeAttr: 'theme_deep_space',
  },
  {
    id: 'theme_prime_green',
    name: '质数绿',
    style: '黑客风',
    preview: { primary: '#000000', accent: '#00ff66', bg: '#0a0f0a' },
    unlockCondition: '质数维度（Dim-1）精通 Lv 2',
    unlockCost: { type: 'dimension_resource', amount: 20, dimId: 1 },
    cssThemeAttr: 'theme_prime_green',
  },
  {
    id: 'theme_chaos_orange',
    name: '混沌橙',
    style: '蒸汽朋克',
    preview: { primary: '#1a0f08', accent: '#ff8844', bg: '#2a1810' },
    unlockCondition: '混沌维度（Dim-2）精通 Lv 2',
    unlockCost: { type: 'dimension_resource', amount: 20, dimId: 2 },
    cssThemeAttr: 'theme_chaos_orange',
  },
  {
    id: 'theme_singularity_white',
    name: '奇点白',
    style: '极简主义',
    preview: { primary: '#f8f8f8', accent: '#c0a030', bg: '#eeeeee' },
    unlockCondition: '奇点维度（Dim-4）精通 Lv 3',
    unlockCost: { type: 'singularity', amount: 10 },
    cssThemeAttr: 'theme_singularity_white',
  },
  {
    id: 'theme_entropy_red',
    name: '熵崩红',
    style: '末日风',
    preview: { primary: '#1a0808', accent: '#ff4444', bg: '#2a1010' },
    unlockCondition: '累计触发 10 次熵崩',
    unlockCost: { type: 'dimension_resource', amount: 30, dimId: 3 },
    cssThemeAttr: 'theme_entropy_red',
  },
];

// ============================================================
// 查询辅助
// ============================================================

/** 取得数字皮肤静态定义 */
export function getNumberSkinDef(id: NumberSkinId): NumberSkinDef {
  const def = SKIN_DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`[SkinSystem] 未知数字皮肤 ID: ${id}`);
  return def;
}

/** 取得 UI 主题静态定义 */
export function getThemeDef(id: UIThemeId): UIThemeDef {
  const def = THEME_DEFS.find((d) => d.id === id);
  if (!def) throw new Error(`[SkinSystem] 未知 UI 主题 ID: ${id}`);
  return def;
}

/** 数字皮肤是否已解锁 */
export function isSkinUnlocked(state: GameState, id: NumberSkinId): boolean {
  return state.unlockedNumberSkins.has(id);
}

/** UI 主题是否已解锁 */
export function isThemeUnlocked(state: GameState, id: UIThemeId): boolean {
  return state.unlockedThemes.has(id);
}

// ============================================================
// 解锁条件判定（GDD §2.1 / §2.2）
// ============================================================

/**
 * 数字皮肤解锁条件是否满足（仅门槛判定，不扣资源）。
 */
export function isSkinConditionMet(state: GameState, def: NumberSkinDef): boolean {
  switch (def.id) {
    case 'skin_scientific':
      return true; // 默认皮肤永远满足
    case 'skin_engineering':
      return state.prestigeCount >= 3;
    case 'skin_chinese':
      return state.transcendCount >= 1;
    case 'skin_binary': {
      // 在奇点维度（Dim-4）解锁，且当前数字达到 1e100
      const dim4 = state.dimensionStates.get(4);
      const inDim4 = !!dim4 && dim4.unlocked;
      return inDim4 && state.number.gte(new Decimal('1e100'));
    }
    default:
      return false;
  }
}

/**
 * UI 主题解锁条件是否满足（仅门槛判定，不扣资源）。
 */
export function isThemeConditionMet(state: GameState, def: UIThemeDef): boolean {
  switch (def.id) {
    case 'theme_deep_space':
      return true; // 默认主题永远满足
    case 'theme_prime_green':
      return getDimensionMasteryLevel(state, 1) >= 2;
    case 'theme_chaos_orange':
      return getDimensionMasteryLevel(state, 2) >= 2;
    case 'theme_singularity_white':
      return getDimensionMasteryLevel(state, 4) >= 3;
    case 'theme_entropy_red':
      return state.totalCollapses >= 10;
    default:
      return false;
  }
}

/** 维度精通等级（master 0-100，每 20 为 1 级；未解锁维度视为 0 级） */
function getDimensionMasteryLevel(state: GameState, dimId: number): number {
  const ds = state.dimensionStates.get(dimId);
  if (!ds) return 0;
  return Math.floor(ds.master / 20);
}

// ============================================================
// 资源扣减
// ============================================================

/** 取得资源消耗的展示文案（如 "50 星尘"、"20 质核"） */
export function getCostLabel(cost: SkinCost): string {
  switch (cost.type) {
    case 'none':
      return '免费';
    case 'stardust':
      return `${cost.amount} 星尘`;
    case 'singularity':
      return `${cost.amount} 奇点核心`;
    case 'dimension_resource': {
      const dimId = cost.dimId ?? 0;
      const name = DIMENSION_DEFS[dimId]?.resourceName ?? '维度资源';
      return `${cost.amount} ${name}`;
    }
    default:
      return '';
  }
}

/** 是否存在足够资源支付该消耗 */
export function hasEnoughResource(state: GameState, cost: SkinCost): boolean {
  switch (cost.type) {
    case 'none':
      return true;
    case 'stardust':
      return state.stardust >= cost.amount;
    case 'singularity':
      return state.singularity >= cost.amount;
    case 'dimension_resource': {
      const ds = cost.dimId !== undefined ? state.dimensionStates.get(cost.dimId) : undefined;
      return !!ds && ds.resource.gte(cost.amount);
    }
    default:
      return false;
  }
}

/** 扣减资源（调用前务必先 hasEnoughResource 校验） */
function consumeResource(state: GameState, cost: SkinCost): void {
  switch (cost.type) {
    case 'stardust':
      state.stardust -= cost.amount;
      break;
    case 'singularity':
      state.singularity -= cost.amount;
      break;
    case 'dimension_resource': {
      const ds = cost.dimId !== undefined ? state.dimensionStates.get(cost.dimId) : undefined;
      if (ds) ds.resource = ds.resource.sub(cost.amount);
      break;
    }
    case 'none':
    default:
      break;
  }
}

// ============================================================
// 解锁 / 切换（就地修改 state）
// ============================================================

/**
 * 解锁数字皮肤：条件满足 + 资源充足 → 扣资源并加入已解锁集合。
 * @returns 结果（失败带原因）
 */
export function unlockNumberSkin(state: GameState, id: NumberSkinId): UnlockResult {
  const def = getNumberSkinDef(id);
  if (isSkinUnlocked(state, id)) return { ok: false, reason: 'already_unlocked' };
  if (!isSkinConditionMet(state, def)) return { ok: false, reason: 'condition_unmet' };
  if (!hasEnoughResource(state, def.unlockCost)) return { ok: false, reason: 'insufficient_resource' };
  consumeResource(state, def.unlockCost);
  state.unlockedNumberSkins.add(id);
  return { ok: true };
}

/**
 * 切换当前激活的数字皮肤（必须已解锁）。
 * @returns 是否切换成功
 */
export function setNumberSkin(state: GameState, id: NumberSkinId): boolean {
  if (!isSkinUnlocked(state, id)) return false;
  state.activeNumberSkin = id;
  return true;
}

/**
 * 解锁 UI 主题：条件满足 + 资源充足 → 扣资源并加入已解锁集合。
 */
export function unlockTheme(state: GameState, id: UIThemeId): UnlockResult {
  const def = getThemeDef(id);
  if (isThemeUnlocked(state, id)) return { ok: false, reason: 'already_unlocked' };
  if (!isThemeConditionMet(state, def)) return { ok: false, reason: 'condition_unmet' };
  if (!hasEnoughResource(state, def.unlockCost)) return { ok: false, reason: 'insufficient_resource' };
  consumeResource(state, def.unlockCost);
  state.unlockedThemes.add(id);
  return { ok: true };
}

/**
 * 切换当前激活的 UI 主题（必须已解锁）。
 * @returns 是否切换成功
 */
export function setTheme(state: GameState, id: UIThemeId): boolean {
  if (!isThemeUnlocked(state, id)) return false;
  state.activeTheme = id;
  return true;
}
