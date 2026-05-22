import { BigNumber } from '@/core/BigNumber';
import { UPGRADE_DEFS, STARDUST_UPGRADE_DEFS, TECH_TREE_DEFS, EXPANSION_UPGRADE_DEFS, TRANSCEND_UPGRADE_DEFS, TRANSCEND_MILESTONE_DEFS } from '@/core/Constants';
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
}
