import {
  GENE_DEFS,
  GENE_COMMON_POOL,
  GENE_SLOT_EXPANSIONS,
  GENE_INITIAL_COUNT_RANGE,
  GENE_EXOTIC_CHANCE,
  GENE_STASH_MAX,
  GENE_MUTATION_NARRATIVES,
} from '@/core/Constants';
import type { GameState, GeneType, GeneDef, GeneState, GeneChainState } from '@/types/game';

/** 默认生产者 ID 列表（纠缠基因兜底绑定用） */
const PRODUCER_IDS = [
  'producer1', 'producer2', 'producer3', 'producer4', 'producer5',
  'producer6', 'producer7', 'producer8', 'producer9',
];

/** 突变结果 */
export interface MutationResult {
  /** 是否发生突变 */
  mutated: boolean;
  /** 发生突变的基因（若有） */
  gene?: GeneState;
  /** 突变种类：level_up / level_down / type_variation / mutation_reroll / none */
  kind?: 'level_up' | 'level_down' | 'type_variation' | 'mutation_reroll' | 'none';
  /** 突变叙事（若有） */
  narrative?: string;
}

/**
 * 基因进化系统（GeneEvo）
 *
 * 负责基因链的创建、三层进化（突变/筛选/重组）、新基因获取、槽位扩容，
 * 以及非倍率型基因效果的查询接口（catalyst/resonance/resilience/entangle/mutation）。
 *
 * 所有随机性均通过「注入式种子」驱动（ADR-001）：
 * - 每条基因持有 `mutationSeed`（生成时确定并存储）
 * - 突变决策 = mulberry32(hash(gene.mutationSeed, runIndex))，读档后种子一致 → 结果可复现
 *
 * @see design/gdd/gene-evolution.md
 * @see docs/architecture/adr-001-gene-state-management.md
 */
export class GeneSystem {
  /** 实例 ID 自增计数器（仅用于生成人类可读的唯一 ID，不影响突变确定性） */
  private _idCounter = 0;
  /** 种子自增计数器（确定性顺序播种，避免使用 Math.random 直出种子） */
  private _seedCounter = 1;

  // ============================================================
  // 确定性随机（ADR-001：可注入 / 可复现）
  // ============================================================

  /**
   * mulberry32 伪随机数生成器（确定性）
   * @param seed 32 位整数种子
   * @returns 返回 [0,1) 的确定性序列函数
   */
  private mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 将多个整数混合为一个 32 位种子（FNV-1a 变体）
   */
  private hashSeed(...nums: number[]): number {
    let h = 2166136261 >>> 0;
    for (const n of nums) {
      h ^= n >>> 0;
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** 生成下一个确定性种子 */
  private nextSeed(): number {
    return (Math.imul(this._seedCounter++, 2654435761)) >>> 0;
  }

  // ============================================================
  // 基因创建 / 工具
  // ============================================================

  /** 查找基因静态定义 */
  getDef(type: GeneType): GeneDef {
    const def = GENE_DEFS.find((d) => d.id === type);
    if (!def) throw new Error(`Unknown gene type: ${type}`);
    return def;
  }

  /**
   * 在初始等级范围内随机一个等级（确定性可注入）
   */
  randomLevel(type: GeneType, rng: number): number {
    const def = this.getDef(type);
    const [min, max] = def.initialLevelRange;
    return min + Math.floor(rng * (max - min + 1));
  }

  /**
   * 从常规池中随机挑选一个基因类型（排除指定类型，排除 gene_exotic）
   */
  pickRandomType(rng: number, exclude: GeneType): GeneType {
    const pool = GENE_COMMON_POOL.filter((t) => t !== exclude);
    const idx = Math.floor(rng * pool.length) % pool.length;
    return pool[idx];
  }

  /**
   * 为纠缠基因随机挑选 2 个不同生产者
   */
  private pickTwoProducers(state: GameState): string[] {
    const pool = state.unlockedProducers.size >= 2
      ? Array.from(state.unlockedProducers)
      : PRODUCER_IDS;
    if (pool.length < 2) return [pool[0] ?? 'producer1', pool[0] ?? 'producer2'];
    const i = Math.floor(Math.random() * pool.length);
    let j = Math.floor(Math.random() * pool.length);
    while (j === i) j = Math.floor(Math.random() * pool.length);
    return [pool[i], pool[j]];
  }

  /**
   * 创建一条基因实例
   */
  createGene(
    type: GeneType,
    ctx: { state?: GameState; level?: number; instanceId?: string; mutationSeed?: number; expression?: number },
  ): GeneState {
    const level = ctx.level ?? this.randomLevel(type, this.mulberry32(this.nextSeed())());
    const gene: GeneState = {
      instanceId:
        ctx.instanceId ?? `gene_${type}_${(this._idCounter++).toString(36)}_${this.nextSeed().toString(36)}`,
      type,
      level: Math.max(1, Math.min(this.getDef(type).maxLevel, level)),
      expression: ctx.expression ?? 1.0,
      mutationSeed: ctx.mutationSeed ?? this.nextSeed(),
      obtainedAt: Date.now(),
    };

    if (type === 'gene_entangle' && ctx.state) {
      gene.entangledProducers = this.pickTwoProducers(ctx.state);
    }
    if (type === 'gene_memory' && ctx.state) {
      gene.memoryRecord = Number(ctx.state.geneChain.historicalMaxNumber) || 0;
    }
    return gene;
  }

  // ============================================================
  // 基因链状态生命周期
  // ============================================================

  /**
   * 深拷贝基因链状态（用于 Prestige/Expansion/Transcend 重置时继承基因链）
   */
  cloneChain(chain: GeneChainState): GeneChainState {
    return {
      chain: chain.chain.map((g) => ({
        ...g,
        entangledProducers: g.entangledProducers ? [...g.entangledProducers] : undefined,
      })),
      maxSlots: chain.maxSlots,
      expansionCount: chain.expansionCount,
      totalMutations: chain.totalMutations,
      totalRecombinations: chain.totalRecombinations,
      totalPrunings: chain.totalPrunings,
      historicalMaxNumber: chain.historicalMaxNumber,
      pendingScreen: chain.pendingScreen,
      pendingStash: chain.pendingStash.map((g) => ({
        ...g,
        entangledProducers: g.entangledProducers ? [...g.entangledProducers] : undefined,
      })),
    };
  }

  /**
   * 将旧基因链继承到新 GameState（重置时调用，避免基因链被清空）
   */
  preserveGeneChain(newState: GameState, oldState: GameState): void {
    newState.geneChain = this.cloneChain(oldState.geneChain);
  }

  /**
   * 记录历史最高数字的 log10（记忆基因真值源，G4）
   * 仅在增长时更新，不下降（GDD §6 边缘情况 #4）
   */
  recordMaxNumber(state: GameState): void {
    const log10 = state.number.lt(1) ? 0 : state.number.log10().toNumber();
    const cur = Number(state.geneChain.historicalMaxNumber) || 0;
    if (log10 > cur) {
      state.geneChain.historicalMaxNumber = String(log10);
      for (const g of state.geneChain.chain) {
        if (g.type === 'gene_memory') g.memoryRecord = log10;
      }
    }
  }

  // ============================================================
  // Epic 1.2.4：新基因获取与奇异基因
  // ============================================================

  /**
   * 首次 Transcend 时获取初始基因（2-3 条，不含 exotic）
   */
  generateInitialChain(state: GameState, opts: { count?: number } = {}): GeneState[] {
    const chain = state.geneChain;
    if (chain.chain.length > 0) return [];
    const [min, max] = GENE_INITIAL_COUNT_RANGE;
    const count = opts.count ?? min + Math.floor(Math.random() * (max - min + 1));
    const added: GeneState[] = [];
    for (let i = 0; i < count; i++) {
      const type = this.pickRandomType(Math.random(), 'gene_exotic');
      const gene = this.createGene(type, { state });
      chain.chain.push(gene);
      added.push(gene);
    }
    return added;
  }

  /**
   * 每次 Transcend 后获取 1 条新基因（如有空槽），5% 概率 exotic
   * 槽满则暂存到 pendingStash（最多 3 条，超出丢弃最旧）
   * @param opts.type 测试时可强制指定类型；opts.forceExotic 可强制 exotic
   */
  acquireNewGene(
    state: GameState,
    opts: { type?: GeneType; forceExotic?: boolean } = {},
  ): GeneState | null {
    const chain = state.geneChain;
    let type: GeneType;
    if (opts.type) {
      type = opts.type;
    } else {
      const wantExotic = opts.forceExotic || Math.random() < GENE_EXOTIC_CHANCE;
      if (wantExotic && !chain.chain.some((g) => g.type === 'gene_exotic')) {
        type = 'gene_exotic';
      } else {
        type = this.pickRandomType(Math.random(), 'gene_exotic');
      }
    }
    const gene = this.createGene(type, { state });
    if (chain.chain.length < chain.maxSlots) {
      chain.chain.push(gene);
    } else {
      chain.pendingStash.push(gene);
      if (chain.pendingStash.length > GENE_STASH_MAX) chain.pendingStash.shift();
    }
    return gene;
  }

  /**
   * 将暂存区基因移入链（槽位有空时）
   */
  stashToChain(state: GameState, instanceId: string): boolean {
    const chain = state.geneChain;
    if (chain.chain.length >= chain.maxSlots) return false;
    const idx = chain.pendingStash.findIndex((g) => g.instanceId === instanceId);
    if (idx < 0) return false;
    const [gene] = chain.pendingStash.splice(idx, 1);
    chain.chain.push(gene);
    return true;
  }

  // ============================================================
  // Epic 1.2.1：突变（Prestige 触发）
  // ============================================================

  /**
   * 每次 Prestige 触发突变：每条基因 30% 概率，同一次 Prestige 最多 1 条（GDD §2.3.1）
   * 确定性基于 gene.mutationSeed + runIndex（= 当前 prestigeCount）
   */
  mutate(state: GameState, runIndex?: number): MutationResult {
    const chain = state.geneChain;
    if (chain.chain.length === 0) return { mutated: false, kind: 'none' };

    const idx = runIndex ?? state.prestigeCount;
    for (const gene of chain.chain) {
      const roll = this.mulberry32(this.hashSeed(gene.mutationSeed, idx))();
      if (roll < 0.3) {
        const kind = this.applyMutation(state, gene, idx);
        gene.lastMutatedAt = Date.now();
        chain.totalMutations++;
        const narrative = GENE_MUTATION_NARRATIVES[
          Math.floor(this.mulberry32(this.hashSeed(gene.mutationSeed, idx, 99))() * GENE_MUTATION_NARRATIVES.length)
        ];
        return { mutated: true, gene, kind, narrative };
      }
    }
    return { mutated: false, kind: 'none' };
  }

  /**
   * 应用单条基因的突变效果
   * 分布（GDD §2.3.1）：等级+1(40%) / 等级-1(30%) / 类型变异(20%) / 突变基因必变(10%)
   */
  private applyMutation(state: GameState, gene: GeneState, runIndex: number): MutationResult['kind'] {
    const def = this.getDef(gene.type);

    // 突变基因：必定变异为随机其他类型（保留等级随机），高风险高收益
    if (gene.type === 'gene_mutation') {
      const r = this.mulberry32(this.hashSeed(gene.mutationSeed, runIndex, 7))();
      const newType = this.pickRandomType(r, 'gene_exotic');
      const rLv = this.mulberry32(this.hashSeed(gene.mutationSeed, runIndex, 11))();
      this.setGeneType(state, gene, newType, this.randomLevel(newType, rLv));
      return 'mutation_reroll';
    }

    const r2 = this.mulberry32(this.hashSeed(gene.mutationSeed, runIndex, 1))();
    if (r2 < 0.4) {
      gene.level = Math.min(def.maxLevel, gene.level + 1);
      return 'level_up';
    } else if (r2 < 0.7) {
      gene.level = Math.max(1, gene.level - 1);
      return 'level_down';
    } else if (r2 < 0.9) {
      const r = this.mulberry32(this.hashSeed(gene.mutationSeed, runIndex, 3))();
      const newType = this.pickRandomType(r, gene.type);
      this.setGeneType(state, gene, newType, gene.level); // 保留等级
      return 'type_variation';
    }
    return 'none';
  }

  /**
   * 将基因转换为新类型（保留/重设类型专属字段）
   */
  private setGeneType(state: GameState, gene: GeneState, newType: GeneType, newLevel: number): void {
    gene.type = newType;
    gene.level = Math.max(1, Math.min(this.getDef(newType).maxLevel, newLevel));
    if (newType === 'gene_entangle') {
      gene.entangledProducers = this.pickTwoProducers(state);
    } else {
      gene.entangledProducers = undefined;
    }
    if (newType === 'gene_memory') {
      gene.memoryRecord = Number(state.geneChain.historicalMaxNumber) || 0;
    }
  }

  // ============================================================
  // Epic 1.2.2：筛选（Expansion 触发，玩家驱动）
  // ============================================================

  /**
   * 是否可以删除某条基因（gene_memory 不可删，GDD §2.3.2）
   */
  canPrune(state: GameState, instanceId: string): boolean {
    const gene = state.geneChain.chain.find((g) => g.instanceId === instanceId);
    if (!gene) return false;
    if (!this.getDef(gene.type).canBePruned) return false;
    return state.geneChain.pendingScreen;
  }

  /**
   * 删除一条基因（仅 gene_memory 免疫；仅 pendingScreen 窗口内有效，0-1 条/次）
   */
  prune(state: GameState, instanceId: string): boolean {
    if (!this.canPrune(state, instanceId)) return false;
    const chain = state.geneChain;
    const gene = chain.chain.find((g) => g.instanceId === instanceId);
    if (!gene) return false;
    chain.chain = chain.chain.filter((g) => g.instanceId !== instanceId);
    chain.totalPrunings++;
    chain.pendingScreen = false; // 消费本次筛选窗口
    return true;
  }

  /** 放弃本次筛选 */
  skipScreen(state: GameState): void {
    state.geneChain.pendingScreen = false;
  }

  // ============================================================
  // Epic 1.2.3：重组（Transcend 触发，玩家驱动）
  // ============================================================

  /**
   * 查找可重组的同类基因对（GDD §2.3.3）
   */
  findRecombinablePairs(state: GameState): Array<[GeneState, GeneState]> {
    const byType = new Map<GeneType, GeneState[]>();
    for (const g of state.geneChain.chain) {
      const arr = byType.get(g.type) ?? [];
      arr.push(g);
      byType.set(g.type, arr);
    }
    const pairs: Array<[GeneState, GeneState]> = [];
    for (const arr of byType.values()) {
      if (arr.length >= 2) pairs.push([arr[0], arr[1]]);
    }
    return pairs;
  }

  /**
   * 重组两条同类型基因：合并为 1 条，等级 = min(Lv_a + Lv_b, maxLevel)
   */
  recombine(state: GameState, instanceIdA: string, instanceIdB: string): boolean {
    const chain = state.geneChain;
    const a = chain.chain.find((g) => g.instanceId === instanceIdA);
    const b = chain.chain.find((g) => g.instanceId === instanceIdB);
    if (!a || !b || a.type !== b.type) return false;
    const mergedLevel = Math.min(a.level + b.level, this.getDef(a.type).maxLevel);
    chain.chain = chain.chain.filter((g) => g.instanceId !== instanceIdB);
    a.level = mergedLevel;
    a.lastMutatedAt = Date.now();
    chain.totalRecombinations++;
    return true;
  }

  // ============================================================
  // Epic 1.3.2：基因槽扩容
  // ============================================================

  /**
   * 检查是否可以扩容
   */
  canExpandSlot(state: GameState): { can: boolean; next?: (typeof GENE_SLOT_EXPANSIONS)[number]; reason?: string } {
    const chain = state.geneChain;
    if (chain.expansionCount >= GENE_SLOT_EXPANSIONS.length) {
      return { can: false, reason: '已达到最大槽位（8）' };
    }
    const next = GENE_SLOT_EXPANSIONS[chain.expansionCount];
    if (state.transcendCount < next.requiredTranscends) {
      return { can: false, reason: `需要超越 ${next.requiredTranscends} 次` };
    }
    if (next.requireExoticLv3) {
      const exotic = chain.chain.find((g) => g.type === 'gene_exotic');
      if (!exotic || exotic.level < 3) {
        return { can: false, reason: '需要奇异基因 Lv 3' };
      }
    }
    if (state.singularity < next.cost) {
      return { can: false, reason: '奇点核心不足' };
    }
    return { can: true, next };
  }

  /**
   * 执行扩容（消耗奇点核心，maxSlots+1，expansionCount+1）
   */
  expandSlot(state: GameState): boolean {
    const result = this.canExpandSlot(state);
    if (!result.can || !result.next) return false;
    state.singularity -= result.next.cost;
    state.geneChain.maxSlots = result.next.targetSlots;
    state.geneChain.expansionCount++;
    return true;
  }

  // ============================================================
  // Epic 1.3.3：跨系统效果查询接口
  // ============================================================

  /** 韧性基因等级（0 = 无） */
  getResilienceLevel(state: GameState): number {
    const g = state.geneChain.chain.find((x) => x.type === 'gene_resilience');
    return g ? g.level : 0;
  }

  /** 韧性基因效果：Prestige 后起始数字 = 10^Lv */
  getResilienceStart(state: GameState): number {
    const lv = this.getResilienceLevel(state);
    return lv > 0 ? Math.pow(10, lv) : 0;
  }

  /** 催化基因倍率：因子发现概率 ×(1 + 0.10×Lv) 的乘积 */
  getCatalystMultiplier(state: GameState): number {
    let m = 1;
    for (const g of state.geneChain.chain) {
      if (g.type === 'gene_catalyst') {
        m *= 1 + 0.1 * (g.level - 1) * g.expression;
      }
    }
    return m;
  }

  /**
   * 催化基因对因子检测量级门槛的降低幅度（至少 0）
   *
   * 将 GDD §2.1 的「因子发现概率 ×(1 + 0.10×Lv)」映射为确定性的量级门槛降低：
   * 每条基因催化倍率 = 1 + 0.10×(Lv-1)×expression（G6），
   * 降低幅度 = round((倍率 - 1) × 10)，即每级约降低 1 个量级门槛。
   * - Lv1 → 0（无效果，与 GDD 一致）
   * - Lv2 → 1，Lv3 → 2，Lv4 → 3，Lv5 → 4
   */
  getCatalystMagnitudeReduction(state: GameState): number {
    return Math.max(0, Math.round((this.getCatalystMultiplier(state) - 1) * 10));
  }

  /** 共振基因效果：事件发生率倍率 + 持续时间倍率 */
  getResonance(state: GameState): { rateMult: number; durationMult: number } {
    let rate = 1;
    let dur = 1;
    for (const g of state.geneChain.chain) {
      if (g.type === 'gene_resonance') {
        rate *= 1 + 0.15 * (g.level - 1) * g.expression;
        dur *= 1 + 0.1 * (g.level - 1) * g.expression;
      }
    }
    return { rateMult: rate, durationMult: dur };
  }

  /** 某生产者从纠缠基因获得的协同倍率（默认 1） */
  getEntangledProducerMultiplier(state: GameState, producerId: string): number {
    let m = 1;
    for (const g of state.geneChain.chain) {
      if (g.type === 'gene_entangle' && g.entangledProducers?.includes(producerId)) {
        m *= 1 + 0.2 * (g.level - 1) * g.expression;
      }
    }
    return m;
  }
}

/** 单例（与 dimensionSystem 同模式） */
export const geneSystem = new GeneSystem();
