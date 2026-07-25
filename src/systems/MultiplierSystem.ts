import { BigNumber } from '@/core/BigNumber';
import { UPGRADE_DEFS, STARDUST_UPGRADE_DEFS, TECH_TREE_DEFS, EXPANSION_UPGRADE_DEFS, TRANSCEND_UPGRADE_DEFS, TRANSCEND_MILESTONE_DEFS, FACTOR_DEFS, DIMENSION_CRYSTAL_SHOP, GENE_DEFS, MASTERY_GLOBAL_MULT_CAP } from '@/core/Constants';
import { dimensionSystem } from '@/systems/DimensionSystem';
import type { MultiplierEntry, GameState } from '@/types/game';

/**
 * 倍增器系统
 *
 * 管理所有乘数条目，提供全局/生产者倍率查询，
 * 并根据游戏状态（升级、星尘升级、纪元）重新计算倍增器。
 */
export class MultiplierSystem {
  /** 所有倍增器条目 */
  private _entries: MultiplierEntry[] = [];

  /**
   * 注册一个倍增器条目
   *
   * @param entry 倍增器条目
   */
  register(entry: MultiplierEntry): void {
    // 如果已存在同ID，先移除
    this.unregister(entry.id);
    this._entries.push(entry);
  }

  /**
   * 移除指定ID的倍增器条目
   *
   * @param id 倍增器ID
   */
  unregister(id: string): void {
    this._entries = this._entries.filter((e) => e.id !== id);
  }

  /**
   * 获取全局倍率
   *
   * 将所有 target='' 的 value 相乘。
   *
   * @returns 全局倍率
   */
  getGlobalMultiplier(): BigNumber {
    let result = BigNumber.one();
    for (const entry of this._entries) {
      if (entry.target === '') {
        result = result.mul(entry.value);
      }
    }
    return result;
  }

  /**
   * 获取指定生产者的倍率
   *
   * 将所有 target=producerId 的 value 相乘。
   *
   * @param producerId 生产者ID
   * @returns 生产者倍率
   */
  getProducerMultiplier(producerId: string): BigNumber {
    let result = BigNumber.one();
    for (const entry of this._entries) {
      if (entry.target === producerId) {
        result = result.mul(entry.value);
      }
    }
    return result;
  }

  /**
   * 获取指定生产者的总倍率 = 全局 × 生产者专属
   *
   * @param producerId 生产者ID
   * @returns 总倍率
   */
  getTotalMultiplier(producerId: string): BigNumber {
    return this.getGlobalMultiplier().mul(this.getProducerMultiplier(producerId));
  }

  /**
   * 根据当前游戏状态重新计算所有倍增器
   *
   * 清空 entries，然后遍历 state.upgrades、state.stardustUpgrades 和纪元重新注册。
   *
   * 升级→MultiplierEntry映射：
   * - effectType='click_multiplier' → target='', source='upgrade'
   * - effectType='producer_multiplier' → target=对应生产者id, source='upgrade'
   *   升级id格式: 'producer1_multiplier' → target='producer1'
   * - effectType='global_multiplier' → target='', source='upgrade'
   *
   * 星尘升级→MultiplierEntry映射：
   * - effectType='output_multiplier' → target='', source='stardust', value=1+0.1*level
   *
   * 纪元加成：
   * - expand epoch → 全局 ×1.5
   *
   * @param state 当前游戏状态
   */
  recalculateFromState(state: GameState): void {
    this._entries = [];

    // 遍历所有升级
    for (const upgradeDef of UPGRADE_DEFS) {
      const upgradeState = state.upgrades.get(upgradeDef.id);
      if (!upgradeState || upgradeState.level === 0) {
        continue;
      }

      // 计算倍增值：effectValue^level
      const value = Math.pow(upgradeDef.effectValue, upgradeState.level);

      let target = '';
      switch (upgradeDef.effectType) {
        case 'click_multiplier':
          target = '';
          break;
        case 'producer_multiplier':
          // 从升级ID解析生产者ID: 'producer1_multiplier' → 'producer1'
          target = upgradeDef.id.replace(/_multiplier$/, '');
          break;
        case 'global_multiplier':
          target = '';
          break;
      }

      this.register({
        id: `upgrade_${upgradeDef.id}`,
        source: 'upgrade',
        target,
        value,
      });
    }

    // 遍历所有星尘升级
    for (const sdDef of STARDUST_UPGRADE_DEFS) {
      const sdState = state.stardustUpgrades.get(sdDef.id);
      if (!sdState || sdState.level === 0) {
        continue;
      }

      switch (sdDef.id) {
        case 'output_multiplier':
          // value = 1 + 0.1 * level
          this.register({
            id: `stardust_${sdDef.id}`,
            source: 'stardust',
            target: '',
            value: 1 + sdDef.effectValue * sdState.level,
          });
          break;
        // start_bonus 和 cost_discount 不产生 multiplier entry
        default:
          break;
      }
    }

    // 星尘被动倍率：每持有1星尘 +50% 全局产出
    if (state.stardust > 0) {
      this.register({
        id: 'stardust_passive',
        source: 'stardust',
        target: '',
        value: 1 + 0.5 * state.stardust,
      });
    }

    // 纪元加成
    if (state.currentEpoch === 'expand') {
      this.register({
        id: 'epoch_expand',
        source: 'epoch',
        target: '',
        value: 1.5,
      });
    }

    // 科技树加成
    for (const techDef of TECH_TREE_DEFS) {
      const techState = state.techTree.get(techDef.id);
      if (!techState || !techState.unlocked) continue;

      if (techDef.effectType === 'global_multiplier' && techDef.effectValue !== 0) {
        this.register({
          id: `tech_${techDef.id}`,
          source: 'tech',
          target: '',
          value: techDef.effectValue,
        });
      }
    }

    // 暗能量升级加成
    for (const exDef of EXPANSION_UPGRADE_DEFS) {
      const exState = state.expansionUpgrades.get(exDef.id);
      if (!exState || exState.level === 0) continue;

      if (exDef.effectType === 'output_multiplier') {
        this.register({
          id: `expansion_${exDef.id}`,
          source: 'expansion',
          target: '',
          value: 1 + exDef.effectValue * exState.level,
        });
      }
    }

    // 超越升级（元升级）加成
    for (const tcDef of TRANSCEND_UPGRADE_DEFS) {
      const tcState = state.transcendUpgrades.get(tcDef.id);
      if (!tcState || tcState.level === 0) continue;

      switch (tcDef.id) {
        case 'meta_global':
          this.register({
            id: `transcend_${tcDef.id}`,
            source: 'transcend',
            target: '',
            value: Math.pow(tcDef.effectValue, tcState.level),
          });
          break;
        case 'meta_producers': {
          // 每种生产者提供其他生产者加成
          const producerCount = state.unlockedProducers.size;
          const bonusPerLevel = tcDef.effectValue * tcState.level;
          for (const prodId of state.unlockedProducers) {
            this.register({
              id: `transcend_meta_prod_${prodId}`,
              source: 'transcend',
              target: prodId,
              value: 1 + bonusPerLevel * producerCount,
            });
          }
          break;
        }
      }
    }

    // 里程碑加成
    for (const mDef of TRANSCEND_MILESTONE_DEFS) {
      if (state.unlockedMilestones.has(mDef.id)) {
        this.register({
          id: `milestone_${mDef.id}`,
          source: 'milestone',
          target: '',
          value: mDef.globalMultiplier,
        });
      }
    }

    // 数字分解因子加成
    if (state.factors) {
      for (const fDef of FACTOR_DEFS) {
        const fState = state.factors.get(fDef.id);
        if (!fState || !fState.active) continue;

        // 效果值 = baseEffect + effectPerLevel * (level - 1)
        const effectValue = fDef.baseEffect + fDef.effectPerLevel * (fState.level - 1);
        if (effectValue <= 0) continue;

        let target = '';
        switch (fDef.effectType) {
          case 'global_multiplier':
          case 'click_multiplier':
            target = '';
            break;
          case 'cost_discount':
            continue; // 因子折扣不产生倍增器条目
          case 'producer_multiplier':
            target = 'all_producers';
            break;
          default:
            continue;
        }

        this.register({
          id: `factor_${fDef.id}`,
          source: 'factor',
          target,
          value: 1 + effectValue,
        });
      }
    }

    // 维度产出倍率（方案A：通过 MultiplierSystem 注册为全局倍率，接入产出链）
    this.registerDimensionMultiplier(state);

    // 基因倍率（'gene' 来源，G6 公式，对齐 GDD §2.5 / 架构评估 §1.4）
    this.registerGeneMultipliers(state);

    // 维度晶体商店购买的永久全局加成（源 'crystal'）
    for (const item of DIMENSION_CRYSTAL_SHOP) {
      if (state.purchasedCrystalUpgrades.has(item.id)) {
        this.register({
          id: `crystal_${item.id}`,
          source: 'crystal',
          target: '',
          value: 1 + item.value,
        });
      }
    }
  }

  /**
   * 注册/刷新维度产出倍率（全局）。
   *
   * 维度系统计算出的当前维度倍率（质数 ×3、混沌随机倍率、反熵叠加、
   * 奇点临界爆发等）通过 MultiplierSystem 注册为 'dimension' 来源的全局倍率，
   * 从而真正接入 gameTick 的产出计算链路（此前维度系统仅为纯视觉装饰）。
   *
   * 该方法可独立于 recalculateFromState 每 tick 单独调用，仅更新这一条
   * 倍率条目，避免整体重算所有升级倍率带来的开销。
   *
   * @param state 当前游戏状态
   */
  registerDimensionMultiplier(state: GameState): void {
    this.unregister('dimension_global');
    const dimMult = dimensionSystem.calculateDimensionMultiplier(state);
    // 全局型精通奖励折叠进唯一 dimension 源：dim0_l5 等 global 型 magnitude 之和，
    // 受 MASTERY_GLOBAL_MULT_CAP（0.25）夹紧 → 维度源因精通最多 ×1.25。无新 source。
    const masteryDelta = Math.min(
      Math.max(dimensionSystem.getMasteryGlobalMultiplierDelta(state), 0),
      MASTERY_GLOBAL_MULT_CAP,
    );
    this.register({
      id: 'dimension_global',
      source: 'dimension',
      target: '',
      value: dimMult * (1 + masteryDelta),
    });
  }

  /**
   * 获取当前所有倍增器条目（只读）
   *
   * @returns 倍增器条目列表
   */
  getEntries(): readonly MultiplierEntry[] {
    return this._entries;
  }

  /**
   * 注册基因倍率（'gene' 来源，G6 公式）
   *
   * 统一公式（G6 / 架构评估 §1.4）：
   *   value = 1 + (baseEffect + effectPerLevel × (level - 1)) × expression
   *   expression ∈ [0, 1]（G3）
   *
   * 注册策略（对齐 GDD §2.5）：
   * - gene_growth / gene_memory / gene_exotic(Lv≥3) → 全局（target=''）
   * - gene_entangle → 逐生产者（target=producerId）
   * - gene_catalyst / gene_resilience / gene_resonance / gene_mutation →
   *   非倍率型，由对应系统（Factor/Event/Prestige）读取，此处不注册
   */
  registerGeneMultipliers(state: GameState): void {
    const chain = state.geneChain;
    if (!chain || chain.chain.length === 0) return;

    const recordLog10 = Number(chain.historicalMaxNumber) || 0;

    for (const gene of chain.chain) {
      const def = GENE_DEFS.find((d) => d.id === gene.type);
      if (!def) continue;

      // 记忆基因：特殊公式（使用 chain 级 historicalMaxNumber，G4）
      if (gene.type === 'gene_memory') {
        const value = 1 + def.baseEffect * recordLog10 * gene.expression;
        this.register({
          id: `gene_memory_${gene.instanceId}`,
          source: 'gene',
          target: '',
          value,
        });
        continue;
      }

      // 奇异基因：仅 Lv 3+ 注册全局倍率
      if (gene.type === 'gene_exotic') {
        if (gene.level < 3) continue;
        const value = 1 + (def.baseEffect + def.effectPerLevel * (gene.level - 1)) * gene.expression;
        this.register({
          id: `gene_exotic_${gene.instanceId}`,
          source: 'gene',
          target: '',
          value,
        });
        continue;
      }

      // 纠缠基因：逐生产者注册协同倍率
      if (gene.type === 'gene_entangle') {
        const value = 1 + (def.baseEffect + def.effectPerLevel * (gene.level - 1)) * gene.expression;
        const producers = gene.entangledProducers && gene.entangledProducers.length > 0
          ? gene.entangledProducers
          : ['producer1'];
        for (const pid of producers) {
          this.register({
            id: `gene_entangle_${gene.instanceId}_${pid}`,
            source: 'gene',
            target: pid,
            value,
          });
        }
        continue;
      }

      // 通用全局倍率型（gene_growth 等）
      if (def.effectType === 'output_multiplier') {
        const value = 1 + (def.baseEffect + def.effectPerLevel * (gene.level - 1)) * gene.expression;
        this.register({
          id: `${gene.type}_${gene.instanceId}`,
          source: 'gene',
          target: '',
          value,
        });
      }
      // gene_catalyst / gene_resilience / gene_resonance / gene_mutation：
      // 非倍率型，不在此注册（由 FactorSystem / EventSystem / PrestigeSystem 读取）
    }
  }

  /**
   * 获取星尘折扣百分比
   *
   * 检查 cost_discount 星尘升级的等级，返回折扣百分比（0-1）。
   *
   * @param state 当前游戏状态
   * @returns 折扣百分比（0-1）
   */
  getCostDiscountPercent(state: GameState): number {
    let totalDiscount = 0;

    // 星尘折扣
    const sdState = state.stardustUpgrades.get('cost_discount');
    if (sdState && sdState.level > 0) {
      const sdDef = STARDUST_UPGRADE_DEFS.find((d) => d.id === 'cost_discount');
      if (sdDef) {
        totalDiscount += sdDef.effectValue * sdState.level;
      }
    }

    // 暗能量折扣
    const exState = state.expansionUpgrades.get('de_discount');
    if (exState && exState.level > 0) {
      const exDef = EXPANSION_UPGRADE_DEFS.find((d) => d.id === 'de_discount');
      if (exDef) {
        totalDiscount += exDef.effectValue * exState.level;
      }
    }

    // 上限50%
    return Math.min(totalDiscount, 0.5);
  }

  /**
   * 获取含因子的总折扣百分比
   *
   * @param state 当前游戏状态
   * @returns 折扣百分比（0-1）
   */
  getTotalCostDiscount(state: GameState): number {
    let totalDiscount = this.getCostDiscountPercent(state);

    // 因子系统提供的 cost_discount
    if (state.factors) {
      for (const fDef of FACTOR_DEFS) {
        if (fDef.effectType !== 'cost_discount') continue;
        const fState = state.factors.get(fDef.id);
        if (!fState || !fState.active) continue;
        const effectValue = fDef.baseEffect + fDef.effectPerLevel * (fState.level - 1);
        totalDiscount += effectValue;
      }
    }

    // dim0_l2：生产者成本 -5%（与既有折扣叠加，统一受 0.5 上限夹紧）
    if (state.activeMasteryEffects.has('dim0_l2')) {
      totalDiscount += 0.05;
    }

    // 成本折扣上限 50%（成本乘数下限 0.5）——与 mastery-rewards.md §6 边缘情况 4 一致
    return Math.min(totalDiscount, 0.5);
  }
}
