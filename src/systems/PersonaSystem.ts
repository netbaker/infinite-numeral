import type { GameState, ArchiveRecord, PersonaId, PersonaState } from '@/types/game';
import {
  D_PERSONA_MAX,
  K_PERSONA,
  PERSONA_WEIGHTS,
  PERSONA_L1_COST,
  PERSONA_L2_COST,
  PERSONA_DIMENSION_KINDS,
  PERSONA_TAMER_MAX_RATE_PER_MIN,
  PERSONA_CHRONICLER_EVENTS_REF,
  PERSONA_CHRONICLER_RUNS_REF,
  PERSONA_CHRONICLER_TRANSCEND_REF,
  TAMER_LOSS_CAP_FRACTION,
  CHRONICLER_START_BUFFER_MAX,
} from '@/core/Constants';

/**
 * 数字人格系统（Sprint 5 Phase 4 · A③ Digital Persona）
 *
 * 全部为纯函数 / 轻量状态变更助手，不触碰 Vue / IndexedDB，便于单测。
 * 设计依据：numeral-persona.md（GDD-1）§2.1~§2.4 / §6。
 *
 * 关键不变量（R1 红线 / 设计支柱①）：
 * - D(s) ∈ [0, D_max=0.25] 全局有界，不随游玩时长 / 超越次数增长（仅随历史质量深度饱和收敛）。
 * - D(s) 仅在 effMult 末端乘 (1 + D(s))，不堆叠、不进 L2 机制。
 * - L2 机制是「机制 / 质量」型加成，不修改任何生产乘区 / 不产生永久乘数。
 * - 数字印记（numeralImprints）的发放与上限由 gameStore.grantNumeralImprint 掌管，本系统只消费。
 */

/** 三人格固定顺序（用于推荐 / UI 渲染） */
export const PERSONA_IDS: PersonaId[] = [
  'persona_walker',
  'persona_tamer',
  'persona_chronicler',
];

/** 人格元信息（名称 / 风格画像，GDD §2.1） */
export const PERSONA_META: Record<PersonaId, { id: PersonaId; name: string; style: string; bonusDesc: string; l2Desc: string }> = {
  persona_walker: {
    id: 'persona_walker',
    name: '维度行者',
    style: '广域探索者',
    bonusDesc: '基于维度广度、维度精通度的有界加成 +D(s)',
    l2Desc: '进入新维度首次切换免冷却',
  },
  persona_tamer: {
    id: 'persona_tamer',
    name: '熵之驯者',
    style: '稳健控制者',
    bonusDesc: '基于熵控能力的有界加成 +D(s)',
    l2Desc: '熵崩损失上限封顶 50% 当前数字',
  },
  persona_chronicler: {
    id: 'persona_chronicler',
    name: '编年史家',
    style: '叙事收集者',
    bonusDesc: '基于编年深度的有界加成 +D(s)',
    l2Desc: '每轮开局获得基于历史深度的一次性星尘缓冲',
  },
};

/** 归一化历史深度向量 s = (s_walker, s_tamer, s_chronicler)，每分量 ∈ [0,1]（GDD §2.1 / §2.3） */
export interface PersonaVector {
  walker: number;
  tamer: number;
  chronicler: number;
}

/** 默认 persona 状态（未激活，三人格全 0 级，GDD §6.5） */
export function defaultPersonaState(): PersonaState {
  return {
    active: null,
    levels: { persona_walker: 0, persona_tamer: 0, persona_chronicler: 0 },
  };
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * 由全量档案馆快照聚合归一化历史深度向量 s ∈ [0,1]^3（GDD §2.1）。
 *
 * 每个分量只依赖「历史质量」，与 Run 次数无关 → D(s) 不随时长通胀。
 *
 * 源字段映射（GDD §2.1 ↔ ArchiveRecord 全量快照，已向 lead 报告歧义，见 REPORT #3）：
 * - s_walker  = 已访问维度种类数 / PERSONA_DIMENSION_KINDS（维度广度）。
 *              ↑ 对应 GDD「访问过的维度种类数 / 维度精通度」；维度精通度非快照字段，
 *                故以「维度种类数」作为广度代理（归档于 ArchiveRecord.dimensionsVisited 的 Union）。
 * - s_tamer   = 0.5 × 平均单轮控制度 + 0.5 × 存活最高熵归一化。
 *              控制度 = 每轮 (1 − min(熵崩率/参考率, 1)) 的均值；熵崩率 =  collapsesTriggered / (runDuration/60)；
 *              存活最高熵 = max(maxEntropy) / 100（熵值 0~100%）。
 *              ↑ 对应 GDD「单位 Run 熵崩率↓ / 存活最高熵」。
 * - s_chronicler = 0.34×事件归一化 + 0.33×Run 数归一化 + 0.33×超越数归一化。
 *              ↑ 对应 GDD「事件触发总数 / 总 Run 数 / 总超越数」。
 *              事件总数 = Σ eventsTriggered；Run 数 = records.length；总超越数 = max(transcendCount)。
 *
 * 归一化参考常量（PERSONA_*_REF）置于 Constants.ts（GDD 未给定，A③ 实现选定调参）。
 */
export function computePersonaVector(records: ArchiveRecord[]): PersonaVector {
  if (!records || records.length === 0) {
    return { walker: 0, tamer: 0, chronicler: 0 };
  }

  const dimKinds = new Set<number>();
  let maxEntropy = 0;
  let collapseRateSum = 0;
  let totalEvents = 0;
  let maxTranscend = 0;

  for (const r of records) {
    for (const d of r.dimensionsVisited) dimKinds.add(d);
    maxEntropy = Math.max(maxEntropy, r.maxEntropy);
    const minutes = Math.max(r.runDuration / 60, 1);
    const rate = r.collapsesTriggered / minutes; // 熵崩率：次/分钟
    // 单轮控制度 ∈ [0,1]：熵崩率越低越接近 1
    collapseRateSum += 1 - Math.min(rate / PERSONA_TAMER_MAX_RATE_PER_MIN, 1);
    totalEvents += r.eventsTriggered;
    maxTranscend = Math.max(maxTranscend, r.transcendCount);
  }

  const sWalker = clamp01(dimKinds.size / PERSONA_DIMENSION_KINDS);

  const avgControl = collapseRateSum / records.length;
  const entropySurvived = clamp01(maxEntropy / 100);
  const sTamer = clamp01(0.5 * avgControl + 0.5 * entropySurvived);

  const sChronicler = clamp01(
    0.34 * clamp01(totalEvents / PERSONA_CHRONICLER_EVENTS_REF) +
      0.33 * clamp01(records.length / PERSONA_CHRONICLER_RUNS_REF) +
      0.33 * clamp01(maxTranscend / PERSONA_CHRONICLER_TRANSCEND_REF),
  );

  return { walker: sWalker, tamer: sTamer, chronicler: sChronicler };
}

/**
 * 历史深度指数 A(s) = Σ w_i·s_i ∈ [0,1]（GDD §2.3）。
 * 纯凹组合前的线性加权，权重 Σw_i = 1。
 */
export function computeDepthIndex(s: PersonaVector): number {
  const a =
    PERSONA_WEIGHTS.walker * s.walker +
    PERSONA_WEIGHTS.tamer * s.tamer +
    PERSONA_WEIGHTS.chronicler * s.chronicler;
  return clamp01(a);
}

/**
 * 饱和凹性加成率 D(s) = D_max·(1 − e^(−k·A)) ∈ [0, D_max]。
 *
 * - 全局有界：A≥0 ⇒ D(s) ≥ 0；A→∞ ⇒ D(s)→D_max=0.25。
 * - 凹（边际递减）：dD/dA = D_max·k·e^(−kA) 随 A 严格递减。
 * - 不随时长/超越次数增长：仅依赖历史质量深度向量 s。
 * 证明边界（单测覆盖）：任意 s ∈ [0,1]^3 ⇒ D(s) ≤ D_max = 0.25。
 */
export function computeDPersona(s: PersonaVector): number {
  const a = computeDepthIndex(s);
  return D_PERSONA_MAX * (1 - Math.exp(-K_PERSONA * a));
}

/**
 * 当前激活人格对 effMult 的加成倍率 (1 + D(s))；未激活 → 1.0（GDD §2.3）。
 * 在既有飞升/超越/基因乘区（M_run）计算末端乘入，单一有界乘数，不堆叠。
 */
export function getPersonaBonusMultiplier(state: GameState, records: ArchiveRecord[]): number {
  return getPersonaBonusFromVector(state, computePersonaVector(records));
}

/**
 * 由预计算的历史深度向量 s 取 effMult 末端加成 (1 + D(s))；未激活 → 1.0。
 * 用于 gameTick 每帧调用（s 已由缓存 PersonaVector 预计算，避免每帧遍历档案馆）。
 */
export function getPersonaBonusFromVector(state: GameState, s: PersonaVector): number {
  if (!state.persona.active) return 1.0;
  return 1 + computeDPersona(s);
}

// ============================================================
// 数字印记发放（A③ 来源 B，GDD §2.2 / R1 红线）
// ============================================================

/** 超越里程碑（数字印记来源 B）：仅这些 transcendCount 跨越点各 +1（5/10/25/50/100 共 5 个） */
export const IMPRINT_TRANSCEND_MILESTONES: readonly number[] = [5, 10, 25, 50, 100];

/**
 * 纯函数：计算一次超越跨越的里程碑印记增益（来源 B）。
 *
 * 规则：对每个里程碑 m，当且仅当 `preCount < m && newCount >= m` 时记 +1。
 * - 一次性跨越多次（离线大跳，如 4→100）也正确累计全部 5 个；
 * - 同一里程碑不会跨两次（pre/new 单调），故天然幂等，无需额外 Set（与 R1 红线一致）。
 *
 * @param preCount 超越前 transcendCount
 * @param newCount 超越后（重置后）transcendCount
 * @returns 本次应发放的印记数（0~5）
 */
export function computeTranscendImprintGain(preCount: number, newCount: number): number {
  let gain = 0;
  for (const m of IMPRINT_TRANSCEND_MILESTONES) {
    if (preCount < m && newCount >= m) gain += 1;
  }
  return gain;
}

/**
 * 推荐人格 = 归一化深度最高者（GDD §2.1 自主权支柱：仅推荐，玩家可无视自由选）。
 * 三者全 0 时回退首个（维度行者）。
 */
export function getRecommendedPersona(s: PersonaVector): PersonaId {
  const entries: Array<[PersonaId, number]> = [
    ['persona_walker', s.walker],
    ['persona_tamer', s.tamer],
    ['persona_chronicler', s.chronicler],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/** 当前激活人格等级（未激活 → 0） */
export function getActiveLevel(state: GameState): 0 | 1 | 2 {
  if (!state.persona.active) return 0;
  return state.persona.levels[state.persona.active];
}

/** 指定人格是否处于 L2（用于 L2 机制判定，如 walker 免冷却 / tamer 封顶 / chronicler 缓冲） */
export function isActiveL2(state: GameState, id: PersonaId): boolean {
  return state.persona.active === id && state.persona.levels[id] === 2;
}

/**
 * 设置激活人格（选择 / 切换）。旧的 L1/L2 保留在 levels 映射中（GDD §6.5：切换无退还）。
 * @returns 是否发生了改变（用于触发叙事 / 版本号）
 */
export function setActivePersona(state: GameState, id: PersonaId): boolean {
  if (state.persona.active === id) return false;
  state.persona.active = id;
  if (!state.persona.levels[id]) state.persona.levels[id] = 0;
  return true;
}

/** 当前激活人格升级至下一档所需的数字印记数（0 = 未激活 / 已满级） */
export function nextUpgradeCost(state: GameState): number {
  const active = state.persona.active;
  if (!active) return 0;
  const level = state.persona.levels[active];
  if (level === 0) return PERSONA_L1_COST;
  if (level === 1) return PERSONA_L2_COST;
  return 0;
}

/** 当前激活人格是否可升级（未激活 / 已满级 / 印记不足 → false） */
export function canUpgradeActivePersona(state: GameState): boolean {
  const active = state.persona.active;
  if (!active) return false;
  const level = state.persona.levels[active];
  if (level >= 2) return false;
  const cost = level === 0 ? PERSONA_L1_COST : PERSONA_L2_COST;
  return state.numeralImprints >= cost;
}

/**
 * 升级当前激活人格（0→1 花费 L1_COST；1→2 花费 L2_COST）。
 * 不激活 / 已满级 / 印记不足均失败（UI 负责禁用，本函数仅做幂等保护）。
 * @returns 实际花费的印记数（0 = 失败，未扣减）
 */
export function upgradeActivePersona(state: GameState): number {
  const active = state.persona.active;
  if (!active) return 0;
  const level = state.persona.levels[active];
  let cost = 0;
  if (level === 0) cost = PERSONA_L1_COST;
  else if (level === 1) cost = PERSONA_L2_COST;
  else return 0; // 已满级
  if (state.numeralImprints < cost) return 0;
  state.numeralImprints -= cost;
  state.persona.levels[active] = (level + 1) as 0 | 1 | 2;
  return cost;
}

// ============================================================
// L2 机制加成（非乘区，GDD §2.4 / §6.4）
// ============================================================

/**
 * 驯者 L2：熵崩损失封顶（GDD §2.4 / §6.4）。
 * lossApplied = min(rawLoss, TAMER_LOSS_CAP_FRACTION · production)，production 取当前数字。
 * 纯函数（数值版），便于单测；不为负、不与其它减损叠加为负（min 保证取较小非负值）。
 *
 * 注意（设计歧义，见 REPORT #4）：当前 ENTROPY_CONFIG 大崩塌基础扣除为 25%、阶梯封顶 40%，
 * 恒 < 0.5，故在默认配置下该 50% 封顶「不绑定」（基础损失已低于封顶）。
 * 此函数为权威公式实现，若未来 ENTROPY_CONFIG 调高扣除比例 >50%，封顶将自动生效。
 *
 * @param rawLoss 原始损失（数值，与当前数字同单位）
 * @param currentNumber 当前数字（production 代理）
 * @param tamerL2Active 驯者 L2 是否激活
 * @returns 实际应用的损失（数值）
 */
export function capTamerLoss(rawLoss: number, currentNumber: number, tamerL2Active: boolean): number {
  if (!tamerL2Active) return rawLoss;
  const cap = currentNumber * TAMER_LOSS_CAP_FRACTION;
  return Math.min(rawLoss, cap);
}

/**
 * 编年史家 L2：每轮开局一次性星尘缓冲 = floor(CHRONICLER_START_BUFFER_MAX · s_chronicler)。
 * 基于历史深度（s_chronicler ∈ [0,1]）线性缩放，非永久乘区（GDD §2.4）。
 * @returns 一次性发放的星尘数量（整数，≥0）
 */
export function computeChroniclerStartBuffer(sChronicler: number): number {
  return Math.floor(CHRONICLER_START_BUFFER_MAX * clamp01(sChronicler));
}

/**
 * 在 run 开局对 state 应用编年史家 L2 一次性星尘缓冲（仅当激活且 L2）。
 * @returns 实际发放的星尘数量（0 = 未应用）
 */
export function applyChroniclerStartBuffer(state: GameState, sChronicler: number): number {
  const granted = computeChroniclerStartBuffer(sChronicler);
  if (granted > 0) state.stardust += granted;
  return granted;
}
