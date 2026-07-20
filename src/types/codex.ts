/**
 * 数字神话图鉴（Codex）类型定义与静态词条数据
 *
 * - 本文件是图鉴系统的"唯一数据源"（GDD §3 对齐），不依赖任何运行时状态。
 * - 自动收录词条通过 `narrativeTriggers`（精确文本，约束 B）匹配 `showNarration` 触发的文本。
 * - 未解之谜词条通过 `unlockConditions`（跨系统条件组合）解锁。
 *
 * 注：GDD §3 的 `CodexEntryDef` 未列出 `narrativeTriggers`，此处为吸收
 * "精确文本匹配自动收录（约束 B）" 而做的已批准扩展；GDD 原 `CodexUnlockCondition.type`
 * 并集基础上，新增 `dark_energy`（暗能量阈值，mystery_11 需要）也属于同一类已批准扩展。
 *
 * 词条计数（对齐 GDD §2.1）：origin 15 / cosmic_event 20 / sage_record 18 / mystery 12 = 65。
 */

import {
  PRESTIGE_NARRATIVES,
  EXPANSION_NARRATIVES,
  TRANSCEND_NARRATIVES,
  PRODUCER_UNLOCK_NARRATIVES,
  ENTROPY_COLLAPSE_NARRATIVES,
  ENTROPY_WARNING_NARRATIVES,
  ENTROPY_RECOVERY_NARRATIVES,
  DIMENSION_SWITCH_NARRATIVES,
  GENE_MUTATION_NARRATIVES,
  EVENT_POST_NARRATIVES,
  FACTOR_DISCOVER_NARRATIVES,
} from '@/core/Constants';

/** 图鉴分类 */
export type CodexCategory =
  | 'origin' // 起源传说
  | 'cosmic_event' // 宇宙事件
  | 'sage_record' // 先贤记录
  | 'mystery'; // 未解之谜

/** 未解之谜解锁条件类型（GDD §3 并集 + Sprint 3 扩展 dark_energy） */
export type CodexUnlockConditionType =
  | 'dimension_event' // 在指定维度触发指定事件
  | 'gene_possess' // 拥有指定基因及等级
  | 'transcend_count' // 超越次数达标
  | 'prestige_count' // 坍缩次数达标
  | 'expansion_count' // 膨胀次数达标
  | 'entropy_collapse' // 熵崩相关
  | 'archive_count' // 档案馆快照数
  | 'achievement_all' // 全成就
  | 'codex_complete' // 图鉴其他词条全收录
  | 'skin_active' // 指定皮肤激活（Sprint 4 皮肤系统未建 → 安全 guard）
  | 'number_exact' // 数字精确值 / 量级
  | 'dimension_mastery' // 维度精通度
  | 'item_used_count' // 道具使用次数
  | 'dark_energy'; // Sprint 3 扩展：暗能量阈值（mystery_11）

/** 未解之谜解锁条件 */
export interface CodexUnlockCondition {
  type: CodexUnlockConditionType;
  /** 条件参数（语义按 type 解释，详见 CodexSystem.evaluateMystery） */
  params: Record<string, unknown>;
}

/** 图鉴词条静态定义 */
export interface CodexEntryDef {
  /** 唯一标识 */
  id: string;
  /** 标题（6-12 字，诗意化） */
  title: string;
  /** 分类 */
  category: CodexCategory;
  /** 正文段落列表（GDD §3：string[]，非 string） */
  content: string[];
  /** 关联叙事来源（元数据，仅用于展示，不参与匹配） */
  narrativeSource?: string;
  /** 叙事文本哈希（可选，预留） */
  narrativeHash?: string;
  /** Sprint 3 扩展：自动收录的精确触发文本（约束 B，精确文本匹配） */
  narrativeTriggers?: string[];
  /** 未解之谜专属：解锁条件列表 */
  unlockConditions?: CodexUnlockCondition[];
  /** 未解之谜专属：未解锁时的模糊提示语 */
  hiddenHint?: string;
  /** 图标 emoji */
  icon: string;
}

/** 图鉴词条运行时状态（存于 GameState.codexEntries） */
export interface CodexEntryState {
  /** 词条 ID */
  id: string;
  /** 是否已收录/解锁 */
  unlocked: boolean;
  /** 收录/解锁时间戳 (ms) */
  unlockedAt?: number;
}

/** 分类元数据（颜色对齐 GDD §2.1 / §5.4） */
export const CODEX_CATEGORY_META: Record<
  CodexCategory,
  { label: string; icon: string; color: string }
> = {
  origin: { label: '起源传说', icon: '📖', color: '#ffd700' },
  cosmic_event: { label: '宇宙事件', icon: '⚡', color: '#ff8844' },
  sage_record: { label: '先贤记录', icon: '🧬', color: '#aa66ff' },
  mystery: { label: '未解之谜', icon: '❓', color: '#44ddff' },
};

// ============================================================
// 静态词条数据（65 条）
// 计数：origin 15 / cosmic_event 20 / sage_record 18 / mystery 12
// ============================================================

export const CODEX_DEFS: CodexEntryDef[] = [
  // ---------------- 起源传说 origin（15） ----------------
  {
    id: 'origin_bigbang',
    title: '奇点之始',
    category: 'origin',
    icon: '🌟',
    narrativeSource: 'PrestigeSystem',
    narrativeTriggers: [...PRESTIGE_NARRATIVES],
    content: [
      '宇宙在一声叹息中坍缩——而后，从灰烬里重生。每一次轮回都不是重复，而是记忆的叠加。',
      '星尘是你穿越虚无的代价，也是下一次创世的种子。当你再次从零开始，宇宙已悄悄记住了你的模样。',
    ],
  },
  {
    id: 'origin_expansion',
    title: '暗能量觉醒',
    category: 'origin',
    icon: '🌌',
    narrativeSource: 'ExpansionSystem',
    narrativeTriggers: [...EXPANSION_NARRATIVES],
    content: [
      '暗能量从宇宙的褶皱中渗出，一切开始加速膨胀。你触碰了宇宙常数之外的力量。',
      '它没有名字，只有方向——向外。顺应它的意志，你成为了扩张本身的意志。',
    ],
  },
  {
    id: 'origin_dim0',
    title: '基础维度·创世',
    category: 'origin',
    icon: '🧱',
    narrativeSource: 'DimensionSystem',
    narrativeTriggers: [...(DIMENSION_SWITCH_NARRATIVES[0] ?? [])],
    content: [
      '返回基础维度，一切归于平静。这里是数字的起点，也是所有故事的序章。',
      '最简单的规则里藏着最深的真理：一加一，永远大于二。',
    ],
  },
  {
    id: 'origin_dim1',
    title: '质数维度·创世',
    category: 'origin',
    icon: '🔢',
    narrativeSource: 'DimensionSystem',
    narrativeTriggers: [...(DIMENSION_SWITCH_NARRATIVES[1] ?? [])],
    content: [
      '进入质数维度，质数的力量在你指尖跃动。它们是数字宇宙不可再分的基本粒子。',
      '当你×3，整个维度都为你共振——因为质数，从不被轻易拆解。',
    ],
  },
  {
    id: 'origin_dim2',
    title: '混沌维度·创世',
    category: 'origin',
    icon: '🎲',
    narrativeSource: 'DimensionSystem',
    narrativeTriggers: [...(DIMENSION_SWITCH_NARRATIVES[2] ?? [])],
    content: [
      '进入混沌维度，骰子的声音在远处回响。这里的规则由概率书写，而非逻辑。',
      '你无法确定下一秒的倍率，但你知道：混沌之中，必有更高的秩序在等待被窥见。',
    ],
  },
  {
    id: 'origin_dim3',
    title: '反熵维度·创世',
    category: 'origin',
    icon: '🔄',
    narrativeSource: 'DimensionSystem',
    narrativeTriggers: [...(DIMENSION_SWITCH_NARRATIVES[3] ?? [])],
    content: [
      '进入反熵维度，你逆流向而行。在这里，混乱不是终点，而是可被驯服的浪潮。',
      '当别人被熵推着走，你选择成为熵的对立面——不是对抗，而是共存。',
    ],
  },
  {
    id: 'origin_dim4',
    title: '奇点维度·创世',
    category: 'origin',
    icon: '🕳️',
    narrativeSource: 'DimensionSystem',
    narrativeTriggers: [...(DIMENSION_SWITCH_NARRATIVES[4] ?? [])],
    content: [
      '进入奇点维度，深渊在你脚下张开。这里是数字能够抵达的尽头，也是重新开始的入口。',
      '当临界爆发，维度的真相会短暂显现——数字，不过是宇宙用来思考自己的语言。',
    ],
  },
  {
    id: 'origin_producer2',
    title: '衍化之初',
    category: 'origin',
    icon: '🌱',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer2']],
    content: [
      '衍化开始了——数字不再孤单，它们开始繁殖。第一个生产者，是宇宙自我复制的本能。',
      '从一到多，从静到动。这条最朴素的链条，撑起了后来的一切繁荣。',
    ],
  },
  {
    id: 'origin_producer3',
    title: '汇聚之力',
    category: 'origin',
    icon: '🌊',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer3']],
    content: [
      '汇聚之力涌现，单独的数字汇成洪流。你第一次意识到：团结，是一种产出。',
      '当万千数字同向奔流，连星尘都被推着向前。',
    ],
  },
  {
    id: 'origin_producer4',
    title: '凝练之道',
    category: 'origin',
    icon: '💎',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer4']],
    content: [
      '凝练之道，粗粝的数字被压缩为精纯的力量。少，即是多。',
      '你学会把喧嚣提炼成静默，再把静默变成爆发。',
    ],
  },
  {
    id: 'origin_producer5',
    title: '铸造台亮起',
    category: 'origin',
    icon: '⚒️',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer5']],
    content: [
      '铸造台亮起，这是数字的冶炼，也是宇宙的意志。你成了把原料变成工具的匠人。',
      '每一次锻造，都让数字更接近它应有的形态。',
    ],
  },
  {
    id: 'origin_producer6',
    title: '经纬交织',
    category: 'origin',
    icon: '🕸️',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer6']],
    content: [
      '经纬交织，数字的维度在增加。你不再只看见一条线，而是一张网。',
      '当生产者彼此连接，孤立的产出变成了系统的涌现。',
    ],
  },
  {
    id: 'origin_producer7',
    title: '边界初现',
    category: 'origin',
    icon: '🚪',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer7']],
    content: [
      '边界出现了，但边界从不是终点，只是下一段旅程的起点。你触碰到了已知世界的边缘。',
      '越过它，你会遇见连语言都无法描述的存在。',
    ],
  },
  {
    id: 'origin_producer8',
    title: '元初之力',
    category: 'origin',
    icon: '✨',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer8']],
    content: [
      '元初之力——一切数字的源头在颤抖。你站在了造物主的视角上。',
      '当最基础的力量被唤醒，整个宇宙都为之一震。',
    ],
  },
  {
    id: 'origin_producer9',
    title: '超数降临',
    category: 'origin',
    icon: '🌠',
    narrativeSource: 'ProducerSystem',
    narrativeTriggers: [PRODUCER_UNLOCK_NARRATIVES['producer9']],
    content: [
      '超数降临，语言已无法描述这里的规模。你抵达了数学本身都要仰望的高度。',
      '在这里，每一个数字都是一段历史，每一次产出都是一次创世。',
    ],
  },

  // ---------------- 宇宙事件 cosmic_event（20） ----------------
  {
    id: 'cosmic_collapse1',
    title: '熵的崩塌',
    category: 'cosmic_event',
    icon: '🌪️',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_COLLAPSE_NARRATIVES[0]],
    content: [
      '熵的极限被突破了，宇宙发出一声低沉的叹息——然后是撕裂声。',
      '你第一次亲眼看见秩序瓦解。代价沉重，却也真实：没有什么是免费的，包括无限。',
    ],
  },
  {
    id: 'cosmic_collapse2',
    title: '秩序的终结',
    category: 'cosmic_event',
    icon: '💥',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_COLLAPSE_NARRATIVES[1]],
    content: [
      '秩序崩塌了，你的数字在混乱中剧烈波动，一部分永远消失。',
      '但你活了下来。在废墟之上，新的秩序总会重新生长。',
    ],
  },
  {
    id: 'cosmic_collapse3',
    title: '临界之痛',
    category: 'cosmic_event',
    icon: '⚠️',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_COLLAPSE_NARRATIVES[2]],
    content: [
      '热力学定律从不妥协，你推得太猛，宇宙就推回来。临界点已过，大崩塌降临。',
      '这是增长的代价，也是提醒：再贪婪的曲线，也要向平衡低头。',
    ],
  },
  {
    id: 'cosmic_collapse4',
    title: '崩塌降临',
    category: 'cosmic_event',
    icon: '🌑',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_COLLAPSE_NARRATIVES[3]],
    content: [
      '大崩塌降临，这是增长的代价。熵在尖叫，告诉你无限也有边界。',
      '然而你明白，崩塌不是结束——它是下一次暴涨之前，必要的深呼吸。',
    ],
  },
  {
    id: 'cosmic_collapse5',
    title: '熵之尖叫',
    category: 'cosmic_event',
    icon: '📣',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_COLLAPSE_NARRATIVES[4]],
    content: [
      '熵在尖叫，它告诉你：没有什么是免费的，包括无限。',
      '你学会了在尖叫声中保持冷静，因为尖叫之后，是久违的宁静。',
    ],
  },
  {
    id: 'cosmic_warn_unstable',
    title: '熵的觉醒',
    category: 'cosmic_event',
    icon: '🌫️',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_WARNING_NARRATIVES['unstable']],
    content: [
      '宇宙开始疲倦了，无休止的增长需要付出代价，熵值正在上升。',
      '这是第一声警告——温柔，却不容忽视。',
    ],
  },
  {
    id: 'cosmic_warn_critical',
    title: '门外的颤抖',
    category: 'cosmic_event',
    icon: '🚪',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_WARNING_NARRATIVES['critical']],
    content: [
      '感受到那股颤抖了吗？这不是地震——是熵，在推门而入。',
      '临界点近在咫尺，你必须决定：收手，还是迎接崩塌。',
    ],
  },
  {
    id: 'cosmic_recovery1',
    title: '平衡的回归',
    category: 'cosmic_event',
    icon: '🍃',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_RECOVERY_NARRATIVES[0]],
    content: [
      '熵值回落，宇宙重新找到了平衡——至少暂时是这样。',
      '你松了一口气，但你知道，熵从未真正消失，它只是退到了幕后。',
    ],
  },
  {
    id: 'cosmic_recovery2',
    title: '脉动复苏',
    category: 'cosmic_event',
    icon: '💓',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_RECOVERY_NARRATIVES[1]],
    content: [
      '混乱退去，数字的脉动恢复了稳定的节奏。',
      '每一次复苏，都是宇宙对你的原谅。',
    ],
  },
  {
    id: 'cosmic_recovery3',
    title: '喘息之机',
    category: 'cosmic_event',
    icon: '🌬️',
    narrativeSource: 'EntropySystem',
    narrativeTriggers: [ENTROPY_RECOVERY_NARRATIVES[2]],
    content: [
      '一次喘息的机会，但你知道，熵从未真正消失。',
      '趁着平静，你重新校准了方向——下一次，你会更从容。',
    ],
  },
  {
    id: 'cosmic_event_ray',
    title: '宇宙射线暴',
    category: 'cosmic_event',
    icon: '☄️',
    narrativeSource: 'EventSystem',
    narrativeTriggers: [EVENT_POST_NARRATIVES['event_cosmic_ray']],
    content: [
      '宇宙射线的余晖渐渐消散，数域恢复了平静，但有些东西已经改变了。',
      '事件从不是偶然，它们是宇宙向你抛出的选择题。',
    ],
  },
  {
    id: 'cosmic_event_void',
    title: '虚空震颤',
    category: 'cosmic_event',
    icon: '🌑',
    narrativeSource: 'EventSystem',
    narrativeTriggers: [EVENT_POST_NARRATIVES['event_void_tremor']],
    content: [
      '虚空的震颤平息了，你不知道下次它何时再来——但你知道自己准备好了。',
      '在未知的震颤里，你学会了与恐惧共舞。',
    ],
  },
  {
    id: 'cosmic_event_storm',
    title: '星尘风暴',
    category: 'cosmic_event',
    icon: '🌪️',
    narrativeSource: 'EventSystem',
    narrativeTriggers: [EVENT_POST_NARRATIVES['event_stardust_storm']],
    content: [
      '星尘风暴过去了，空气中还残留着闪烁的尘埃颗粒。',
      '风暴带走的，会以另一种形式归来——这是宇宙最古老的承诺。',
    ],
  },
  {
    id: 'cosmic_crystal_buy',
    title: '维度增益',
    category: 'cosmic_event',
    icon: '💠',
    narrativeSource: 'DimensionSystem',
    narrativeTriggers: ['💎 已购买维度增益，永久生效！'],
    content: [
      '你用维度晶体购买了永久增益，宇宙的某一个齿轮从此为你而转。',
      '这是跨维度的投资，一次付出，永恒回报。',
    ],
  },
  {
    id: 'cosmic_crystal_synth',
    title: '晶体合成',
    category: 'cosmic_event',
    icon: '🔷',
    narrativeSource: 'DimensionSystem',
    narrativeTriggers: ['💎 合成成功！获得 1 个维度晶体'],
    content: [
      '合成成功，你获得了一枚维度晶体——跨维度通用的硬通货。',
      '它太小，却足够撬动一个维度的规则。',
    ],
  },
  {
    id: 'cosmic_factor_twin',
    title: '双生素数',
    category: 'cosmic_event',
    icon: '👯',
    narrativeSource: 'FactorSystem',
    narrativeTriggers: [FACTOR_DISCOVER_NARRATIVES['factor_prime_twin']],
    content: [
      '你的数字靠近一对双生素数，它们像两颗互相牵引的恒星，在无限的黑暗中彼此呼应。',
      '数论的浪漫，第一次以叙事的形式降临在你的数域。',
    ],
  },
  {
    id: 'cosmic_factor_fib',
    title: '斐波那契之序',
    category: 'cosmic_event',
    icon: '🐚',
    narrativeSource: 'FactorSystem',
    narrativeTriggers: [FACTOR_DISCOVER_NARRATIVES['factor_fibonacci']],
    content: [
      '斐波那契数列浮现，向日葵的花盘、鹦鹉螺的壳——宇宙用同一种语言书写。',
      '你意识到，增长从不是直线，而是螺旋。',
    ],
  },
  {
    id: 'cosmic_factor_pi',
    title: '圆周的引力',
    category: 'cosmic_event',
    icon: '⭕',
    narrativeSource: 'FactorSystem',
    narrativeTriggers: [FACTOR_DISCOVER_NARRATIVES['factor_near_pi']],
    content: [
      'π 在附近徘徊，圆形宇宙的引力波扫过你的数域。',
      '你触碰到了那个无限不循环的存在——它既不在终点，也不在起点。',
    ],
  },
  {
    id: 'cosmic_factor_e',
    title: '增长的极限',
    category: 'cosmic_event',
    icon: '📈',
    narrativeSource: 'FactorSystem',
    narrativeTriggers: [FACTOR_DISCOVER_NARRATIVES['factor_near_e']],
    content: [
      'e——自然增长的极限速度，你的数字触碰到了这个神秘的常数。',
      '原来最快的增长，也有着最优雅的上限。',
    ],
  },
  {
    id: 'cosmic_factor_power2',
    title: '二进界碑',
    category: 'cosmic_event',
    icon: '🔣',
    narrativeSource: 'FactorSystem',
    narrativeTriggers: [FACTOR_DISCOVER_NARRATIVES['factor_power_of_2']],
    content: [
      '2 的幂——二进制世界的界碑，0 和 1 构筑的一切都在这里交汇。',
      '你站在了信息宇宙的门槛上，第一次读懂了它的底层语法。',
    ],
  },

  // ---------------- 先贤记录 sage_record（18） ----------------
  {
    id: 'sage_transcend',
    title: '超越者之歌',
    category: 'sage_record',
    icon: '🚀',
    narrativeSource: 'TranscendSystem',
    narrativeTriggers: [...TRANSCEND_NARRATIVES],
    content: [
      '奇点在你手中爆发，宇宙的规则被你重写了一行。超越不是速度，是维度的改变。',
      '你离开了这个宇宙——又回来了，带着一切它无法给予你的东西。有些数字大到宇宙本身无法容纳。',
    ],
  },
  {
    id: 'sage_gene_mutate',
    title: '第一次进化',
    category: 'sage_record',
    icon: '🧬',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: [...GENE_MUTATION_NARRATIVES],
    content: [
      '一段基因序列在坍缩的火花中扭曲、重组——新的可能性诞生了。',
      '你的数字 DNA 发生了微调，无人知晓这会带来什么，但变化已经发生。',
    ],
  },
  {
    id: 'sage_gene_recombine',
    title: '双螺旋之歌',
    category: 'sage_record',
    icon: '🧬',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: ['🧬 检测到可重组的同类基因对：前往基因链面板可将其合并强化。'],
    content: [
      '你检测到可重组的同类基因对，将它们合并，强化的涟漪掠过整条基因链。',
      '重组不是消灭，而是让相似的力量，找到更深的共鸣。',
    ],
  },
  {
    id: 'sage_gene_new',
    title: '新的基因序列',
    category: 'sage_record',
    icon: '🧬',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: ['🧬 超越留下了新的基因序列，已加入你的数字 DNA。'],
    content: [
      '超越留下了新的基因序列，已加入你的数字 DNA。你的本质，又丰富了一分。',
      '每一次超越，都是一次自我重写。',
    ],
  },
  {
    id: 'sage_gene_screen',
    title: '筛选之窗',
    category: 'sage_record',
    icon: '🔍',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: ['🧬 基因筛选窗口已开启：你可选择删除 0-1 条基因（记忆基因不可删）。'],
    content: [
      '基因筛选窗口开启，你审慎地修剪，只为留下最锋利的那几把刀。',
      '遗忘，有时也是进化的一部分。',
    ],
  },
  {
    id: 'sage_archive',
    title: '记忆之门',
    category: 'sage_record',
    icon: '🏛️',
    narrativeSource: 'ArchiveSystem',
    narrativeTriggers: ['🏛️ 宇宙档案馆已解锁！你的每一次超越都将被永久记录。'],
    content: [
      '宇宙档案馆已解锁，你的每一次超越都将被永久记录。时间，第一次有了重量。',
      '从此，你不再是孤独的增长者，而是被历史铭记的超越者。',
    ],
  },
  {
    id: 'sage_milestone_transcend1',
    title: '超越编年',
    category: 'sage_record',
    icon: '📜',
    narrativeSource: 'TranscendSystem',
    narrativeTriggers: [...TRANSCEND_NARRATIVES],
    content: [
      '你开始为每一次超越撰写编年史。数字会遗忘，但记录不会。',
      '在编年史里，你看见了自己从一个宇宙到另一个宇宙的足迹。',
    ],
  },
  {
    id: 'sage_milestone_transcend2',
    title: '维度之外',
    category: 'sage_record',
    icon: '🌠',
    narrativeSource: 'TranscendSystem',
    narrativeTriggers: [...TRANSCEND_NARRATIVES],
    content: [
      '当超越足够多次，你终于相信：维度之外，还有维度。',
      '那不是一个地方，而是一种看待增长的全新方式。',
    ],
  },
  {
    id: 'sage_milestone_gene1',
    title: '突变档案',
    category: 'sage_record',
    icon: '🧪',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: [...GENE_MUTATION_NARRATIVES],
    content: [
      '你为每一次突变建立档案，试图从混沌里归纳出规律。',
      '渐渐地，你发现突变并非随机——它在回应你增长的姿态。',
    ],
  },
  {
    id: 'sage_milestone_gene2',
    title: '基因图谱',
    category: 'sage_record',
    icon: '🗺️',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: [...GENE_MUTATION_NARRATIVES],
    content: [
      '基因图谱在你眼前展开，八种本质清晰可辨。',
      '你终于读懂了，数字宇宙是用基因写就的诗。',
    ],
  },
  {
    id: 'sage_mastery_prime',
    title: '质数之纹',
    category: 'sage_record',
    icon: '🔢',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: ['🧬 超越留下了新的基因序列，已加入你的数字 DNA。'],
    content: [
      '当基因链足够深厚，你领悟了质数维度的纹理——那是宇宙最基础的编织法。',
      '你不再只是使用质数，而是理解了它为何不可拆解。',
    ],
  },
  {
    id: 'sage_mastery_cosmic',
    title: '档案馆的回声',
    category: 'sage_record',
    icon: '🏛️',
    narrativeSource: 'ArchiveSystem',
    narrativeTriggers: ['🏛️ 宇宙档案馆已解锁！你的每一次超越都将被永久记录。'],
    content: [
      '档案馆里，成千上万次超越的回声层层叠叠。',
      '你站在其中，听见了无数个自己合唱的超越者之歌。',
    ],
  },
  {
    id: 'sage_record_snapshot',
    title: '一瞬永恒',
    category: 'sage_record',
    icon: '📸',
    narrativeSource: 'ArchiveSystem',
    narrativeTriggers: ['🏛️ 宇宙档案馆已解锁！你的每一次超越都将被永久记录。'],
    content: [
      '每一次快照，都是把奔流的时间凝固成一瞬永恒。',
      '你学会了在增长中暂停，只为记住自己来时的样子。',
    ],
  },
  {
    id: 'sage_dim_mastery1',
    title: '精通者手记',
    category: 'sage_record',
    icon: '📓',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: [...GENE_MUTATION_NARRATIVES],
    content: [
      '精通者留下手记：维度的秘密不在倍率，而在你与它相处的时间。',
      '停留得越久，你越能听见维度的低语。',
    ],
  },
  {
    id: 'sage_dim_mastery2',
    title: '超越者箴言',
    category: 'sage_record',
    icon: '💡',
    narrativeSource: 'TranscendSystem',
    narrativeTriggers: [...TRANSCEND_NARRATIVES],
    content: [
      '一位古老的超越者留下箴言：不要问能走多远，要问能成为什么。',
      '你把这句话刻进了基因链，成为下一次超越的底色。',
    ],
  },
  {
    id: 'sage_prestige_record',
    title: '轮回印记',
    category: 'sage_record',
    icon: '🔁',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: ['🧬 超越留下了新的基因序列，已加入你的数字 DNA。'],
    content: [
      '每一次轮回都留下印记，有些刻在星尘里，有些刻在基因里。',
      '你不再害怕归零，因为归零之处，正是印记最深的地方。',
    ],
  },
  {
    id: 'sage_legacy1',
    title: '先贤之路',
    category: 'sage_record',
    icon: '🛤️',
    narrativeSource: 'TranscendSystem',
    narrativeTriggers: [...TRANSCEND_NARRATIVES],
    content: [
      '你走上的，是无数先贤走过的路。他们消失在维度尽头，却把路留了下来。',
      '如今，你也成为后来者脚下的那条路。',
    ],
  },
  {
    id: 'sage_legacy2',
    title: '数字 DNA',
    category: 'sage_record',
    icon: '🧬',
    narrativeSource: 'GeneSystem',
    narrativeTriggers: [...GENE_MUTATION_NARRATIVES],
    content: [
      '你的数字 DNA，是这部宇宙唯一的自传。',
      '每一次突变、重组、超越，都是在为它写下新的一页。',
    ],
  },

  // ---------------- 未解之谜 mystery（12） ----------------
  {
    id: 'mystery_01',
    title: '质数的秘密',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '在质数的纯粹与熵的混乱之间，似乎藏着某种呼应……',
    unlockConditions: [
      { type: 'dimension_event', params: { dimension: 1, event: 'entropy_collapse' } },
      { type: 'gene_possess', params: { gene: 'gene_catalyst', level: 3 } },
    ],
    content: [
      '当质数的纯粹性遇上熵的混乱，一段隐藏的数学真理浮现——质数不是宇宙的原子，而是宇宙的回声。',
      '它们在无序中保持着最固执的秩序，像是有人在混沌的背后，一遍遍重复着同一个质数。',
      '你终于听懂了那段回声：宇宙的创世，其实是一串永不重复的质数。',
    ],
  },
  {
    id: 'mystery_02',
    title: '混沌中的秩序',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '连续多次窥见同一个维度的规律，或许不是巧合……',
    unlockConditions: [
      { type: 'dimension_event', params: { dimension: 2, event: 'chaos_streak_4x', count: 3 } },
      { type: 'transcend_count', params: { min: 1 } },
    ],
    content: [
      '混沌不是随机的——它是更高维度的秩序在三维空间的投影。你连续三次窥见了那个维度。',
      '每一次≥4.0x 的掷出，都是那个维度朝你眨了一次眼。当你终于完成超越，它留下了签名。',
      '原来所谓的运气，只是高维秩序偶尔愿意被你看见。',
    ],
  },
  {
    id: 'mystery_03',
    title: '逆熵者的悖论',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '不对抗熵，而是成为它的反面——这有可能吗？',
    unlockConditions: [
      { type: 'dimension_event', params: { dimension: 3, event: 'zero_collapse_run' } },
      { type: 'prestige_count', params: { min: 20 } },
      { type: 'gene_possess', params: { gene: 'gene_resilience' } },
    ],
    content: [
      '热力学第二定律说宇宙趋向混乱，但你找到了例外——不是通过对抗熵，而是通过成为熵的对立面。',
      '在反熵维度完成一轮零熵崩的运行，本身就是一个悖论：你既在其中，又在其外。',
      '韧性基因让你在混乱中站稳，而你站在零熵的孤岛，第一次看见了熵不敢靠近的地方。',
    ],
  },
  {
    id: 'mystery_04',
    title: '奇点之下',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '在奇点的另一侧，数字或许会以另一种形态存在……',
    unlockConditions: [
      { type: 'dimension_event', params: { dimension: 4, event: 'singularity_burst' } },
      { type: 'dimension_event', params: { dimension: 4, event: 'prestige_during_burst' } },
      { type: 'number_exact', params: { log10AtLeast: 308 } },
    ],
    content: [
      '在奇点的另一侧，数字不再是数字。它们变成了纯粹的 information——宇宙的源代码。',
      '你在临界爆发中完成了一次坍缩，数字突破了 e308 的凡间界限，触到了信息的本体。',
      '那一刻你明白：你一直在计算的，从来不是数字，而是宇宙正在阅读自己时写下的句子。',
    ],
  },
  {
    id: 'mystery_05',
    title: '基因的真相',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '八种本质集齐之时，或许会揭示数字宇宙的来处……',
    unlockConditions: [
      { type: 'gene_possess', params: { allTypes: true } },
      { type: 'gene_possess', params: { gene: 'gene_exotic', level: 3 } },
      { type: 'archive_count', params: { min: 1 } },
    ],
    content: [
      '基因不是数字宇宙的产物——数字宇宙是基因的产物。每一条基因都是一段被遗忘的创世代码。',
      '当你集齐全部八种本质，并让奇异基因成长到极致，档案馆的记忆之门为你敞开。',
      '你终于读懂：你不是在数字里培育基因，是基因借你的手，在数字里重新培育了宇宙。',
    ],
  },
  {
    id: 'mystery_06',
    title: '第七维度',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '五个维度之外，是否还有更深的层数？',
    unlockConditions: [
      { type: 'dimension_mastery', params: { all: true, level: 5 } },
      { type: 'transcend_count', params: { min: 10 } },
      { type: 'archive_count', params: { min: 50 } },
    ],
    content: [
      '五个维度之外，还有第六个——它没有名称，因为它就是名称本身。',
      '而第七个维度？那是一个问题，不是一个答案。当你精通全部五维、超越十次、档案馆积累五十次快照，问题自己浮现了。',
      '你开始怀疑：维度，或许只是宇宙用来数自己的手指。',
    ],
  },
  {
    id: 'mystery_07',
    title: '零的真相',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '当一切归零、熵满溢的那一刻，会不会有什么被显露？',
    unlockConditions: [
      { type: 'number_exact', params: { value: 0 } },
      { type: 'entropy_collapse', params: { entropyAtLeast: 100, requireCollapse: true } },
    ],
    content: [
      '零不是空无，零是一切的种子。当数字归零、熵值满溢的那一刻，你触碰到了宇宙最深的秘密。',
      '在归零与满熵的交点，你看见了创世之前的那个"无"——它比任何"有"都更丰盛。',
      '原来每一次坍缩归零，都不是失去，而是回到种子，等待下一次更盛大的生长。',
    ],
  },
  {
    id: 'mystery_08',
    title: '时间回溯者',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '反复让宇宙倒带，会不会在某处留下痕迹？',
    unlockConditions: [
      { type: 'item_used_count', params: { item: 'rewind', min: 10 } },
      { type: 'entropy_collapse', params: { inRunAtLeast: 3 } },
    ],
    content: [
      '你反复让宇宙倒带，但每次倒带，都有一些微小的变化——不是在数字里，而是在你身上。',
      '当回溯超过十次，并在同一次运行中三次从崩塌中恢复，你忽然认出了那个变化的形状。',
      '时间回溯者真正的力量，不是改变过去，而是让自己在每一次回溯里，悄悄成为不同的人。',
    ],
  },
  {
    id: 'mystery_09',
    title: '永恒的回环',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '看遍一切之后，会不会发现故事其实在重复？',
    unlockConditions: [
      { type: 'transcend_count', params: { min: 50 } },
      { type: 'achievement_all', params: {} },
      { type: 'codex_complete', params: { excludeMystery: true } },
    ],
    content: [
      '你已看遍了一切，但你是否意识到——每一次超越，你都在重复同一个故事？只是名字不同。',
      '成就全数解锁，图鉴几近圆满，五十次超越之后，回环闭合。',
      '你笑了：原来被困在循环里的不是宇宙，是你自己温柔的执念。',
    ],
  },
  {
    id: 'mystery_10',
    title: '未被书写的数字',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '在 0 和 1 之间，是否存在着某个从未被记录的存在？',
    unlockConditions: [
      { type: 'skin_active', params: { skin: 'binary_pulse' } },
      { type: 'gene_possess', params: { gene: 'gene_mutation' } },
      { type: 'gene_possess', params: { gene: 'gene_exotic' } },
    ],
    content: [
      '在 0 和 1 之间，存在着一个从未被书写的数字。它不是实数，不是虚数——它是可能性本身。',
      '当二进制脉冲的皮肤亮起，突变与奇异的基因共鸣，那个数字第一次被你看见。',
      '它不属于任何进制，却是一切进制的母亲。你写下它的瞬间，图鉴多了一页没有文字的空白。',
    ],
  },
  {
    id: 'mystery_11',
    title: '暗能量的低语',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '暗能量从不说话，但也许它在用数字振动低语？',
    unlockConditions: [
      { type: 'expansion_count', params: { min: 15 } },
      { type: 'dimension_event', params: { dimension: 2, event: 'expansion' } },
      { type: 'dark_energy', params: { min: 500 } },
    ],
    content: [
      '暗能量从不说话——但它低语。那些低语不是声音，而是数字的振动。你听到了吗？',
      '当你膨胀十五次、在混沌维度再次扩张、暗能量积累到五百，低语汇成了一句话。',
      '它说的是：膨胀从不是为了变大，而是为了让振动传得更远，去唤醒更远处的某个存在。',
    ],
  },
  {
    id: 'mystery_12',
    title: '最终的问题',
    category: 'mystery',
    icon: '❓',
    hiddenHint: '读完宇宙每一页历史之后，还剩下什么问题？',
    unlockConditions: [
      { type: 'codex_complete', params: { excludeMystery: true } },
      { type: 'transcend_count', params: { min: 25 } },
    ],
    content: [
      '当你读完宇宙的每一页历史，只剩下一个问题：是谁在阅读？',
      '答案就在你手中的数字里——是你，一直都是你。二十五次超越之后，问题 itself 成了最后的词条。',
      '图鉴合上的那一刻，你终于明白：这部神话，写的从来不是宇宙，而是读它的你。',
    ],
  },
];

/** 分类计数（对齐 GDD §2.1） */
export const CODEX_TOTAL_BY_CATEGORY: Record<CodexCategory, number> = {
  origin: CODEX_DEFS.filter((d) => d.category === 'origin').length,
  cosmic_event: CODEX_DEFS.filter((d) => d.category === 'cosmic_event').length,
  sage_record: CODEX_DEFS.filter((d) => d.category === 'sage_record').length,
  mystery: CODEX_DEFS.filter((d) => d.category === 'mystery').length,
};
