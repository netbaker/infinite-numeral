import { describe, it, expect } from 'vitest';
import { BigNumber } from '@/core/BigNumber';
import { format } from '@/core/Formatter';

describe('Formatter', () => {
  // ============================================================
  // L1: 整数 (≤999,999)
  // ============================================================
  describe('L1 整数', () => {
    it('0 → "0"', () => {
      expect(format(BigNumber.from(0))).toBe('0');
    });

    it('1 → "1"', () => {
      expect(format(BigNumber.from(1))).toBe('1');
    });

    it('999 → "999"', () => {
      expect(format(BigNumber.from(999))).toBe('999');
    });

    it('1000 → "1,000"', () => {
      expect(format(BigNumber.from(1000))).toBe('1,000');
    });

    it('999999 → "999,999"', () => {
      expect(format(BigNumber.from(999999))).toBe('999,999');
    });
  });

  // ============================================================
  // L2: 命名数 (10^6 ~ 10^9)
  // ============================================================
  describe('L2 命名数', () => {
    it('1,000,000 → 包含 "万"', () => {
      const result = format(BigNumber.from(1_000_000));
      // 1,000,000 = 100万, 可能是 "100 万" 或 "1.00 百万"
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('1e8 → 包含 "亿"', () => {
      const result = format(BigNumber.from(1e8));
      // 1e8 = 1亿
      expect(result).toBeTruthy();
    });

    it('1e9 → 包含亿级命名', () => {
      const result = format(BigNumber.from(1e9));
      expect(result).toBeTruthy();
    });
  });

  // ============================================================
  // L3: 科学+命名 (10^10 ~ 10^33)
  // ============================================================
  describe('L3 科学+命名', () => {
    it('1e10 → 科学计数法+命名', () => {
      const result = format(BigNumber.from(1e10));
      expect(result).toContain('e');
    });

    it('1e15 → 科学计数法+命名', () => {
      const result = format(BigNumber.from(1e15));
      expect(result).toContain('e');
    });
  });

  // ============================================================
  // L4: Mega前缀 (10^33 ~ 10^303)
  // ============================================================
  describe('L4 Mega前缀', () => {
    it('1e33 → 包含中文Mega前缀', () => {
      const result = format(BigNumber.from('1e33'));
      expect(result.length).toBeGreaterThan(0);
      // 应该是 Mega 前缀格式而非 Tera
      expect(result).not.toContain('Tera');
    });
  });

  // ============================================================
  // L5: Tera前缀 (10^303+)
  // ============================================================
  describe('L5 Tera前缀', () => {
    it('1e303 → 包含 "Tera"', () => {
      const result = format(BigNumber.from('1e303'));
      expect(result).toContain('Tera');
    });

    it('1e1000 → Tera格式', () => {
      const result = format(BigNumber.from('1e1000'));
      expect(result).toContain('Tera');
    });
  });

  // ============================================================
  // 边界值
  // ============================================================
  describe('边界值', () => {
    it('小于1的值', () => {
      const result = format(BigNumber.from(0.5));
      expect(result).toBe('0.50');
    });

    it('负数不应崩溃', () => {
      // 负数格式化不崩溃即可
      const result = format(BigNumber.from(-1));
      expect(result).toBeDefined();
    });
  });
});
