import { describe, it, expect } from 'vitest';
import { BigNumber } from '@/core/BigNumber';
import Decimal from 'break_eternity.js';

describe('BigNumber', () => {
  describe('工厂方法', () => {
    it('from(number) 创建实例', () => {
      const bn = BigNumber.from(42);
      expect(bn.toString()).toBe('42');
    });

    it('from(string) 创建实例', () => {
      const bn = BigNumber.from('123.456');
      expect(bn.toString()).toBe('123.456');
    });

    it('from(BigNumber) 创建副本', () => {
      const a = BigNumber.from(100);
      const b = BigNumber.from(a);
      expect(b.toString()).toBe('100');
      expect(a.toString()).toBe('100');
    });

    it('from(Decimal) 创建实例', () => {
      const d = new Decimal(999);
      const bn = BigNumber.from(d);
      expect(bn.toString()).toBe('999');
    });

    it('zero() 创建零值', () => {
      expect(BigNumber.zero().toString()).toBe('0');
    });

    it('one() 创建单位值', () => {
      expect(BigNumber.one().toString()).toBe('1');
    });
  });

  describe('运算', () => {
    it('add 加法', () => {
      expect(BigNumber.from(3).add(7).toString()).toBe('10');
    });

    it('sub 减法', () => {
      expect(BigNumber.from(10).sub(3).toString()).toBe('7');
    });

    it('mul 乘法', () => {
      expect(BigNumber.from(6).mul(7).toString()).toBe('42');
    });

    it('div 除法', () => {
      expect(BigNumber.from(42).div(6).toString()).toBe('7');
    });

    it('pow 幂运算', () => {
      const result = BigNumber.from(2).pow(10);
      expect(parseFloat(result.toString())).toBeCloseTo(1024, 5);
    });

    it('log10 对数', () => {
      const result = BigNumber.from(1000).log10();
      expect(parseFloat(result.toString())).toBeCloseTo(3, 5);
    });
  });

  describe('比较', () => {
    it('lt 小于', () => {
      expect(BigNumber.from(3).lt(5)).toBe(true);
      expect(BigNumber.from(5).lt(3)).toBe(false);
      expect(BigNumber.from(5).lt(5)).toBe(false);
    });

    it('gte 大于等于', () => {
      expect(BigNumber.from(5).gte(3)).toBe(true);
      expect(BigNumber.from(3).gte(5)).toBe(false);
      expect(BigNumber.from(5).gte(5)).toBe(true);
    });

    it('eq 等于', () => {
      expect(BigNumber.from(42).eq(42)).toBe(true);
      expect(BigNumber.from(42).eq(43)).toBe(false);
    });
  });

  describe('取整与转换', () => {
    it('floor 向下取整', () => {
      expect(BigNumber.from(3.7).floor().toString()).toBe('3');
    });

    it('toDecimal 返回 Decimal 实例', () => {
      const bn = BigNumber.from(42);
      const d = bn.toDecimal();
      expect(d).toBeInstanceOf(Decimal);
    });
  });

  describe('不可变性', () => {
    it('运算后原实例不变', () => {
      const a = BigNumber.from(10);
      const original = a.toString();
      a.add(5);
      a.sub(5);
      a.mul(2);
      a.div(2);
      a.pow(2);
      expect(a.toString()).toBe(original);
    });
  });

  describe('大数支持', () => {
    it('支持极大数运算', () => {
      const a = BigNumber.from('1e100');
      const b = BigNumber.from('1e50');
      const result = a.add(b);
      expect(result.gte('1e100')).toBe(true);
    });

    it('乘法支持极大数', () => {
      const a = BigNumber.from('1e50');
      const b = BigNumber.from('1e50');
      const result = a.mul(b);
      expect(result.gte('1e100')).toBe(true);
    });
  });
});
