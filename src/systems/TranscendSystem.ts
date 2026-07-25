import Decimal from 'break_eternity.js';
import { GameState } from '@/types/game';
import { geneSystem } from '@/systems/GeneSystem';

/**
 * 超越叙事文本
 */
const TRANSCEND_NARRATIVES: Record<number, string> = {
  1: '你触碰到了宇宙的边界。数字的尽头，是无尽的虚空。',
  2: '虚空不再令你恐惧。你开始理解——数字即是力量。',
  3: '数字在你手中化为虚无，又重新凝聚。这是创造的第一步。',
  5: '你已是超越者...还是说，你是造物主？',
  10: '无限本身在你面前展开。你超越的，是所有可能性的总和。',
};

const TRANSCEND_NARRATIVE_DEFAULT = '你超越了物理的极限。奇点在你手中。';

/**
 * 获取超越叙事文本
 */
export function getTranscendNarrative(transcendCount: number): string {
  // 精确匹配优先
  if (TRANSCEND_NARRATIVES[transcendCount]) {
    return TRANSCEND_NARRATIVES[transcendCount];
  }
  // 插值：找最近的较低值
  const keys = Object.keys(TRANSCEND_NARRATIVES)
    .filter(k => k !== 'default')
    .map(Number)
    .filter(k => k < transcendCount)
    .sort((a, b) => b - a);
  if (keys.length > 0) {
    return TRANSCEND_NARRATIVES[keys[0]];
  }
  return TRANSCEND_NARRATIVE_DEFAULT;
}

/**
 * 超越系统（第3层Prestige）
 */
export class TranscendSystem {
  /** 最小累计暗能量阈值 */
  private static readonly MIN_CUMULATIVE_DE = 100;

  canTranscend(state: GameState): boolean {
    return state.cumulativeDarkEnergy >= TranscendSystem.MIN_CUMULATIVE_DE;
  }

  calculateSingularity(cumulativeDE: number): number {
    if (cumulativeDE < TranscendSystem.MIN_CUMULATIVE_DE) return 0;
    const logVal = Math.log10(cumulativeDE);
    if (isNaN(logVal) || !isFinite(logVal)) return 0;
    return Math.floor(logVal * 0.5);
  }

  executeTranscend(state: GameState): GameState {
    const gainedSingularity = this.calculateSingularity(state.cumulativeDarkEnergy);
    const newState = new GameState();

    // Sprint 3：图鉴与跨系统联动追踪字段跨 Transcend 继承
    newState.codexEntries = state.codexEntries;
    newState.codexInitialized = state.codexInitialized;
    newState.collapsedDimensions = state.collapsedDimensions;
    // 隐患2 修复：_chaosStreak4x 不做跨轮拷贝 → 落回 newState 默认 0，实现"每轮清零"（streak 连续语义）
    newState._prestigeDuringBurst = state._prestigeDuringBurst;
    newState._archiveRecordCount = state._archiveRecordCount;
    newState._rewindUsedCount = state._rewindUsedCount;
    newState._expandedInChaosDim = state._expandedInChaosDim;
    newState._singularityBurstEver = state._singularityBurstEver;
    newState._allGeneTypesEver = state._allGeneTypesEver; // 跨轮累积字段，随重置保留
    // 隐患3 修复：_runCollapses 跨 Transcend 保留，让 post-Transcend 的 checkAllMysteries 看到刚结束那轮的崩塌数
    newState._runCollapses = state._runCollapses;
    newState.numeralImprints = state.numeralImprints;
    newState.persona = state.persona;

    // Sprint 6 阻断修复：Transcend 不重置 master（GDD §4.1 仅列 prestige/expansion 重置 master），
    // 故 master 完整保留；resource/crystals/maxNumber 重置为新轮起点。transcend 不走 S5（S5 为 prestige 专属）。
    for (const [id, ds] of state.dimensionStates) {
      newState.dimensionStates.set(id, {
        id: ds.id,
        unlocked: ds.unlocked,
        master: ds.master,
        resource: new Decimal(0),
        crystals: 0,
        maxNumber: new Decimal(0),
      });
    }

    // 基因链跨 Transcend 继承（GDD §2.3.3）
    newState.geneChain = geneSystem.cloneChain(state.geneChain);

    // 元升级起步加成
    let startMult = 1;
    const metaStart = state.transcendUpgrades.get('meta_start');
    if (metaStart && metaStart.level > 0) {
      startMult = Math.pow(10, metaStart.level);
    }

    newState.number = new Decimal(startMult);
    newState.totalNumber = new Decimal(startMult);
    newState.stardust = 0;
    newState.cumulativeStardust = 0;
    newState.darkEnergy = 0;
    newState.cumulativeDarkEnergy = 0;
    newState.prestigeCount = 0;
    newState.expansionCount = 0;
    // dim3_l5：Transcend 后额外 +1 奇点核心（非数字印记）；dim4_l5：保留 20% 既有奇点核心。
    // 二者均读 state.activeMasteryEffects（超越前维度精通状态），不触碰 numeralImprint（R1 红线）。
    let newSingularity = state.singularity + gainedSingularity;
    if (state.activeMasteryEffects.has('dim3_l5')) newSingularity += 1;
    if (state.activeMasteryEffects.has('dim4_l5')) newSingularity += Math.floor(state.singularity * 0.20);
    newState.singularity = newSingularity;
    newState.transcendCount = state.transcendCount + 1;

    // 保留元升级、超越升级
    newState.transcendUpgrades = new Map(state.transcendUpgrades);

    // 保留科技树
    newState.techTree = new Map(state.techTree);

    // 保留成就进度（重要：档案馆特殊成就仅由 ArchiveSystem 解锁，
    // 若不在此复制，超越会清空成就导致下一轮重复发放奇点奖励）
    newState.achievements = new Map(state.achievements);

    // 保留已解锁生产者
    newState.unlockedProducers = new Set(state.unlockedProducers);

    // 初始化所有生产者/升级/星尘/暗能升级 level=0
    for (const [id] of state.producers) {
      newState.producers.set(id, { id, level: 0 });
    }
    for (const [id] of state.upgrades) {
      newState.upgrades.set(id, { id, level: 0 });
    }
    for (const [id] of state.stardustUpgrades) {
      newState.stardustUpgrades.set(id, { id, level: 0 });
    }
    for (const [id] of state.expansionUpgrades) {
      newState.expansionUpgrades.set(id, { id, level: 0 });
    }

    newState.currentEpoch = 'sprout';
    newState.gameStartTime = state.gameStartTime;
    newState.lastTickTime = Date.now();

    // 保留全时统计
    newState.totalClicks = state.totalClicks;
    newState.totalManualEarnings = state.totalManualEarnings;

    // --- 新字段：Transcend(奇点)策略（最激进重置） ---
    // 因子：全部重置（超越后重新发现）
    newState.lastMagnitude = -1;
    // factors 留空 Map（new GameState() 已初始化）

    // 挑战：全部重置
    // daily 保留进度但标记未完成，timed/milestone 全清
    for (const [id, cs] of state.challenges) {
      if (id.startsWith('ch_daily_')) {
        // 每日任务保留 progress 但重置完成状态
        newState.challenges.set(id, { id, progress: cs.progress, completed: false, claimed: false });
      }
      // timed 和 milestone 不复制 → 自然丢失
    }
    // completedMilestones 清空
    // （new GameState() 已初始化为空 Set）
    newState.lastTimedChallengeTime = 0;

    // 清除事件状态
    newState.activeEvent = null;
    newState.eventCooldown = 0;
    newState.ongoingEffects = [];
    newState.timeSpeedMultiplier = 1;

    // 基因进化：首次 Transcend 获取初始基因（2-3 条）；否则额外获取 1 条新基因（5% exotic）
    // 重组由玩家在 UI 中选择（Story 1.2.3），此处仅做自动获取
    if (newState.geneChain.chain.length === 0) {
      geneSystem.generateInitialChain(newState);
    } else {
      geneSystem.acquireNewGene(newState);
    }

    // ---- 宇宙档案馆（Story 2.1.2 / 2.1.3）----
    // 档案馆解锁：累计超越 >= 5 时永久解锁（ADR-002 A5 / GDD §2.3）
    newState.archiveUnlocked = state.archiveUnlocked || newState.transcendCount >= 5;
    // 新 Run 计时起点（本轮采集以此为准；runDuration 从该时刻算起）
    newState._runStartTime = Date.now();
    // 新 Run 起始最高数字（避免 Transcend 后首帧 _runMaxNumber 失真）
    newState._runMaxNumber = newState.number;

    return newState;
  }
}
