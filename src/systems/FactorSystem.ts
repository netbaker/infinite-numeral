import { FACTOR_DEFS } from '@/core/Constants';
import type {
  FactorDef,
  FactorCategory,
} from '@/types/game';
import type { GameState } from '@/types/game';
import Decimal from 'break_eternity.js';
import { geneSystem } from '@/systems/GeneSystem';

/**
 * 因子系统（数字分解 / Factor System）
 *
 * 检测当前数字中的数学特殊结构（素数邻近、完全幂、斐波那契等），
 * 当数量级（log10）变化时扫描所有因子定义，触发发现或升级。
 *
 * 设计原则：
 * - 仅在 Math.floor(log10(number)) 变化时触发检测（性能友好）
 * - 每个因子有独立的等级上限和效果成长
 * - 同一因子可多次触发升级，每次需要跨更高的数量级
 */
export class FactorSystem {
  /** 已触发的因子 ID 列表（本次 tick 的检测结果，用于 UI 通知） */
  private newlyTriggered: string[] = [];

  /**
   * 主入口：每 tick 由 gameStore 调用
   *
   * @param state 当前游戏状态
   * @returns 本次新触发/升级的 FactorDef 列表
   */
  tick(state: GameState): FactorDef[] {
    this.newlyTriggered = [];

    const num = state.number;
    if (num.lt(1)) return [];

    const currentMag = Math.floor(num.log10().toNumber());

    // 首次初始化 lastMagnitude
    if (state.lastMagnitude < 0) {
      state.lastMagnitude = currentMag;
      // 首次也做一次全量扫描（让已达到量级的因子有机会被发现）
      return this.scanAllFactors(state, currentMag);
    }

    // 数量级未变 → 跳过检测
    if (currentMag === state.lastMagnitude) return [];

    // 数量级变化 → 全量扫描
    state.lastMagnitude = currentMag;
    return this.scanAllFactors(state, currentMag);
  }

  /**
   * 初始化所有因子的状态 Map
   */
  initFactors(state: GameState): void {
    for (const def of FACTOR_DEFS) {
      if (!state.factors.has(def.id)) {
        state.factors.set(def.id, {
          id: def.id,
          level: 0,
          active: false,
        });
      }
    }
  }

  /**
   * 计算某个因子的当前总效果值
   *
   * @param factorId 因子ID
   * @param level 等级
   * @returns 效果数值（倍率或折扣百分比）
   */
  getEffectValue(factorId: string, level: number): number {
    const def = FACTOR_DEFS.find(f => f.id === factorId);
    if (!def || level <= 0) return 0;
    return def.baseEffect + def.effectPerLevel * (level - 1);
  }

  /**
   * 获取所有当前激活的因子的乘数贡献
   *
   * 返回可用于 MultiplierSystem.register() 的条目列表。
   * 每个 active 因子根据其 effectType 生成对应的乘数条目。
   *
   * @param state 当前游戏状态
   * @returns { factorId, source, target, value } 列表
   */
  getActiveMultiplierEntries(state: GameState): Array<{
    id: string;
    source: 'factor';
    target: string;
    value: number;
  }> {
    const entries: Array<{ id: string; source: 'factor'; target: string; value: number }> = [];

    for (const [factorId, fState] of state.factors) {
      if (!fState.active || fState.level <= 0) continue;

      const def = FACTOR_DEFS.find(d => d.id === factorId);
      if (!def) continue;

      const effectValue = this.getEffectValue(factorId, fState.level);

      switch (def.effectType) {
        case 'click_multiplier':
          entries.push({
            id: `factor_${factorId}_click`,
            source: 'factor',
            target: 'click',
            value: effectValue,
          });
          break;
        case 'producer_multiplier':
          entries.push({
            id: `factor_${factorId}_producer`,
            source: 'factor',
            target: '',
            value: effectValue,
          });
          break;
        case 'global_multiplier':
          entries.push({
            id: `factor_${factorId}_global`,
            source: 'factor',
            target: '',
            value: effectValue,
          });
          break;
        case 'cost_discount':
          // 成本折扣不直接产生乘数条目，由购买逻辑读取
          break;
      }
    }

    return entries;
  }

  /**
   * 获取所有激活因子的总成本折扣率
   *
   * @param state 当前游戏状态
   * @returns 总折扣比例（如 0.15 表示 85% 价格，即打 8.5 折）
   */
  getTotalCostDiscount(state: GameState): number {
    let totalDiscount = 0;
    for (const [factorId, fState] of state.factors) {
      if (!fState.active || fState.level <= 0) continue;
      const def = FACTOR_DEFS.find(d => d.id === factorId);
      if (!def || def.effectType !== 'cost_discount') continue;
      totalDiscount += this.getEffectValue(factorId, fState.level);
    }
    return Math.min(totalDiscount, 0.5); // 上限 50% 折扣
  }

  // =================================================================
  // 私有方法：全量扫描
  // =================================================================

  /**
   * 扫描所有因子定义，检查当前数字是否匹配
   */
  private scanAllFactors(state: GameState, currentMag: number): FactorDef[] {
    const triggered: FactorDef[] = [];
    const num = state.number;
    // 将数字转为整数部分用于数学检测（取前几位有效数字）
    const intPart = this.getMantissa(num, currentMag);

    // 催化基因（gene_catalyst）：降低因子发现的数量级门槛（Story 1.3.3 / GDD §2.1）
    // 将「因子发现概率 ×(1 + 0.10×Lv)」映射为确定性的门槛降低：
    // 有效数量级 = currentMag + 降低幅度，门槛检查变为 (currentMag + reduction) >= threshold
    const catalystReduction = geneSystem.getCatalystMagnitudeReduction(state);
    const effectiveMag = currentMag + catalystReduction;

    for (const def of FACTOR_DEFS) {
      // 数量级门槛检查（含催化基因降低）
      if (effectiveMag < def.magnitudeThreshold) continue;

      // 获取或创建状态
      let fState = state.factors.get(def.id);
      if (!fState) {
        fState = { id: def.id, level: 0, active: false };
        state.factors.set(def.id, fState);
      }

      // 已满级 → 保持激活，跳过检测
      if (fState.level >= def.maxLevel) {
        fState.active = true;
        continue;
      }

      // 执行检测器
      if (this.runDetector(def.detector, intPart, num)) {
        fState.level += 1;
        fState.active = true;
        fState.triggeredAt = new Decimal(num.toString());
        triggered.push(def);
        this.newlyTriggered.push(def.id);
      } else {
        // 数量级变了但未命中 → 取消激活
        fState.active = false;
      }
    }

    return triggered;
  }

  // =================================================================
  // 数学检测器（每个对应 FactorDef.detector 字符串值）
  // =================================================================

  private runDetector(detector: string, intPart: number, fullNum: Decimal): boolean {
    switch (detector) {
      case 'checkTwinPrime':
        return this.checkTwinPrime(intPart);
      case 'checkGermainPrime':
        return this.checkGermainPrime(intPart);
      case 'checkPerfectSquare':
        return this.checkPerfectSquare(intPart);
      case 'checkPerfectCube':
        return this.checkPerfectCube(intPart);
      case 'checkFibonacci':
        return this.checkFibonacci(intPart);
      case 'checkPowerOf2':
        return this.checkPowerOf2(intPart);
      case 'checkPowerOf10':
        return this.checkPowerOf10(fullNum);
      case 'checkRepDigit':
        return this.checkRepDigit(intPart);
      case 'checkNearPi':
        return this.checkNearPi(intPart);
      case 'checkNearE':
        return this.checkNearE(intPart);
      default:
        return false;
    }
  }

  // ---- 素数类检测 ----

  /** 双生素数邻近：n-1 或 n+1 之一是素数（宽松匹配） */
  private checkTwinPrime(n: number): boolean {
    return this.isPrime(n - 1) || this.isPrime(n + 1) || this.isPrime(n);
  }

  /** 热尔曼素数：p 是素数且 2p+1 也是素数 */
  private checkGermainPrime(n: number): boolean {
    if (!this.isPrime(n)) return false;
    return this.isPrime(2 * n + 1);
  }

  // ---- 完全幂类检测 ----

  /** 完全平方数 */
  private checkPerfectSquare(n: number): boolean {
    if (n <= 0) return false;
    const root = Math.floor(Math.sqrt(n));
    return root * root === n;
  }

  /** 完全立方数 */
  private checkPerfectCube(n: number): boolean {
    if (n <= 0) return false;
    const root = Math.floor(Math.cbrt(n));
    return root * root * root === n;
  }

  // ---- 斐波那契类检测 ----

  /** 斐波那契数列成员 */
  private checkFibonacci(n: number): boolean {
    if (n < 1) return false;
    // 利用性质：n 是斐波那契数 ⟺ 5n²+4 或 5n²-4 是完全平方数
    const sq = 5 * n * n;
    return this.checkPerfectSquare(sq + 4) || this.checkPerfectSquare(sq - 4);
  }

  // ---- 整幂类检测 ----

  /** 2 的幂 */
  private checkPowerOf2(n: number): boolean {
    if (n <= 0) return false;
    return (n & (n - 1)) === 0;
  }

  /** 10 的幂（直接用完整数字判断） */
  private checkPowerOf10(fullNum: Decimal): boolean {
    if (fullNum.lt(1)) return false;
    const log = fullNum.log10().toNumber();
    return Math.abs(log - Math.round(log)) < 1e-10;
  }

  // ---- 整十 / 重复数字类检测 ----

  /** 重复数字：111, 222, ..., 9999 等 */
  private checkRepDigit(n: number): boolean {
    if (n < 11) return false;
    const s = String(n);
    if (s.length < 2) return false;
    const first = s[0];
    return s.split('').every(c => c === first);
  }

  // ---- 特殊常数邻近检测 ----

  /** π 邻近：数字的有效数字部分接近 π (3.14159...) */
  private checkNearPi(n: number): boolean {
    // 取前 4-6 位与 PI 比较
    const piPrefix = Math.round(Math.PI * 1e4); // 31415
    const nPrefix = n % 100000;
    return Math.abs(nPrefix - piPrefix) < 200; // 允许 ±200 误差
  }

  /** e 邻近：数字的有效数字部分接近 e (2.71828...) */
  private checkNearE(n: number): boolean {
    const ePrefix = Math.round(Math.E * 1e4); // 27182
    const nPrefix = n % 100000;
    return Math.abs(nPrefix - ePrefix) < 200;
  }

  // =================================================================
  // 工具方法
  // =================================================================

  /** 试除法素数判定（适用于小整数，性能可接受） */
  private isPrime(n: number): boolean {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  /**
   * 提取数字的尾数（有效数字部分的整数值）
   * 用于数学特殊结构的检测——我们只关心"数字长什么样"
   * 不在乎它有多大（那是 magnitudeThreshold 的工作）
   *
   * @param num 完整的 Decimal 数字
   * @param mag 数量级 (log10)
   * @returns 有效数字的整数表示（最多保留合适位数）
   */
  private getMantissa(num: Decimal, mag: number): number {
    if (num.lt(1)) return 0;
    // 取数字的前几位有效数字作为整数
    // 例如 1.23e50 → 123（用于检测是否是斐波那契等）
    const divisor = new Decimal(10).pow(Math.max(0, mag - 6)); // 保留 ~7 位有效数字
    const mantissa = num.div(divisor).toNumber();
    return Math.floor(mantissa);
  }

  /**
   * 按分类获取因子定义列表
   */
  static getByCategory(category: FactorCategory): FactorDef[] {
    return FACTOR_DEFS.filter(f => f.category === category);
  }

  /**
   * 获取因子定义
   */
  static getDef(id: string): FactorDef | undefined {
    return FACTOR_DEFS.find(f => f.id === id);
  }
}
