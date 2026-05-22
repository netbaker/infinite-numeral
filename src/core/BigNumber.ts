import Decimal from 'break_eternity.js';

/** 可转换为大数的基本类型 */
export type BigNumberish = string | number | BigNumber | Decimal;

/**
 * BigNumber — 不可变大数包装层
 *
 * 所有运算返回新的 BigNumber 实例，原实例不会被修改。
 * 只能通过 BigNumber.from() 工厂方法创建实例。
 */
export class BigNumber {
  private readonly _decimal: Decimal;

  /** 私有构造函数，强制通过工厂方法创建 */
  private constructor(decimal: Decimal) {
    this._decimal = decimal;
  }

  // ============================================================
  // 工厂方法
  // ============================================================

  /** 从任意可转换值创建 BigNumber */
  static from(value: BigNumberish): BigNumber {
    if (value instanceof BigNumber) {
      return new BigNumber(new Decimal(value._decimal));
    }
    if (value instanceof Decimal) {
      return new BigNumber(new Decimal(value));
    }
    return new BigNumber(new Decimal(value));
  }

  /** 创建零值 */
  static zero(): BigNumber {
    return new BigNumber(new Decimal(0));
  }

  /** 创建单位值 */
  static one(): BigNumber {
    return new BigNumber(new Decimal(1));
  }

  // ============================================================
  // 运算方法（均返回新实例）
  // ============================================================

  /** 加法 */
  add(other: BigNumberish): BigNumber {
    const d = this._toDecimal(other);
    return new BigNumber(this._decimal.add(d));
  }

  /** 减法 */
  sub(other: BigNumberish): BigNumber {
    const d = this._toDecimal(other);
    return new BigNumber(this._decimal.sub(d));
  }

  /** 乘法 */
  mul(other: BigNumberish): BigNumber {
    const d = this._toDecimal(other);
    return new BigNumber(this._decimal.mul(d));
  }

  /** 除法 */
  div(other: BigNumberish): BigNumber {
    const d = this._toDecimal(other);
    return new BigNumber(this._decimal.div(d));
  }

  /** 幂运算 */
  pow(other: BigNumberish): BigNumber {
    const d = this._toDecimal(other);
    return new BigNumber(this._decimal.pow(d));
  }

  /** 以10为底的对数 */
  log10(): BigNumber {
    return new BigNumber(this._decimal.log10());
  }

  // ============================================================
  // 比较方法
  // ============================================================

  /** 小于 */
  lt(other: BigNumberish): boolean {
    const d = this._toDecimal(other);
    return this._decimal.lt(d);
  }

  /** 大于等于 */
  gte(other: BigNumberish): boolean {
    const d = this._toDecimal(other);
    return this._decimal.gte(d);
  }

  /** 等于 */
  eq(other: BigNumberish): boolean {
    const d = this._toDecimal(other);
    return this._decimal.eq(d);
  }

  // ============================================================
  // 取整与转换
  // ============================================================

  /** 向下取整 */
  floor(): BigNumber {
    return new BigNumber(this._decimal.floor());
  }

  /** 转为字符串 */
  toString(): string {
    return this._decimal.toString();
  }

  /** 获取底层 Decimal 实例 */
  toDecimal(): Decimal {
    return new Decimal(this._decimal);
  }

  // ============================================================
  // 私有工具
  // ============================================================

  /** 将 BigNumberish 转为 Decimal */
  private _toDecimal(value: BigNumberish): Decimal {
    if (value instanceof BigNumber) {
      return value._decimal;
    }
    if (value instanceof Decimal) {
      return value;
    }
    return new Decimal(value);
  }
}
