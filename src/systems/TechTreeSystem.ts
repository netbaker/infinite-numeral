import { TECH_TREE_DEFS } from '@/core/Constants';
import type { GameState, TechNodeDef } from '@/types/game';

/**
 * 科技树系统
 *
 * 负责科技节点的解锁判定、购买和前置校验。
 */
export class TechTreeSystem {
  /**
   * 获取所有科技节点定义
   */
  getNodes(): readonly TechNodeDef[] {
    return TECH_TREE_DEFS;
  }

  /**
   * 获取指定节点定义
   *
   * @param id 节点ID
   */
  getNode(id: string): TechNodeDef | undefined {
    return TECH_TREE_DEFS.find((n) => n.id === id);
  }

  /**
   * 检查节点是否可购买
   *
   * 条件：
   * 1. 节点存在
   * 2. 节点未解锁
   * 3. 前置节点已解锁（或无需前置）
   * 4. 星尘足够
   *
   * @param id 节点ID
   * @param state 游戏状态
   */
  canBuy(id: string, state: GameState): boolean {
    const node = this.getNode(id);
    if (!node) return false;

    // 已解锁则不可再买
    const nodeState = state.techTree.get(id);
    if (nodeState && nodeState.unlocked) return false;

    // 检查前置
    if (!this._prerequisiteMet(node, state)) return false;

    // 检查星尘
    if (state.stardust < node.stardustCost) return false;

    return true;
  }

  /**
   * 购买科技节点
   *
   * @param id 节点ID
   * @param state 游戏状态（会被修改）
   * @returns 是否购买成功
   */
  buyNode(id: string, state: GameState): boolean {
    if (!this.canBuy(id, state)) return false;

    const node = this.getNode(id)!;

    // 扣除星尘
    state.stardust -= node.stardustCost;

    // 标记解锁
    state.techTree.set(id, { id, unlocked: true });

    // 根据效果类型处理
    switch (node.effectType) {
      case 'unlock_producers':
        // 解锁 producer7-9
        for (let i = 7; i <= 9; i++) {
          state.unlockedProducers.add(`producer${i}`);
        }
        break;
      case 'global_multiplier':
        // 效果由 MultiplierSystem 在 recalculateFromState 中处理
        break;
      case 'epoch_discount':
        // 效果需要在 EpochSystem 中处理，暂存为 multiplier
        break;
      case 'unlock_expansion':
        // 仅标记解锁，膨胀由 ExpansionSystem.canExpand 判断
        break;
    }

    return true;
  }

  /**
   * 获取当前可购买的节点ID列表
   *
   * @param state 游戏状态
   */
  getAvailableNodes(state: GameState): string[] {
    return TECH_TREE_DEFS
      .filter((node) => this.canBuy(node.id, state))
      .map((n) => n.id);
  }

  /**
   * 获取已解锁的节点ID列表
   *
   * @param state 游戏状态
   */
  getUnlockedNodes(state: GameState): string[] {
    const result: string[] = [];
    for (const [id, nodeState] of state.techTree) {
      if (nodeState.unlocked) result.push(id);
    }
    return result;
  }

  /**
   * 检查前置条件
   */
  private _prerequisiteMet(node: TechNodeDef, state: GameState): boolean {
    if (!node.requires) return true;

    const prereqState = state.techTree.get(node.requires);
    return prereqState ? prereqState.unlocked : false;
  }
}
