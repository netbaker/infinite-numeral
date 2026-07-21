import { BigNumber } from './BigNumber';
import type { NumberSkinId } from '@/types/game';

/**
 * 5级数字格式化器（默认科学皮肤，与旧版一致）
 *
 * L1: 整数 (≤999,999) → "123,456"
 * L2: 命名数 (10^6 ~ 10^9) → "1.23 百万", "4.56 十亿"
 * L3: 科学+命名 (10^10 ~ 10^33) → "1.23e15 万亿"
 * L4: Mega前缀 (10^33 ~ 10^303) → 标准SI Mega前缀
 * L5: Tera前缀 (10^303+) → "1.23 Tera" 用log10值标注
 *
 * 皮肤系统（Sprint 4）：
 * - `format(value, skin?)` 默认读取模块级「当前皮肤」镜像 `_activeNumberSkin`，
 *   由 gameStore 在初始化/加载/切换时通过 `setActiveNumberSkin` 同步（零侵入 12+ 调用点）。
 * - 其余 3 种皮肤（工程/汉字/二进制）通过 `NumberSkinDef.formatter` 路由到对应实现。
 */

// ============================================================
// 皮肤访问器（模块级镜像，避免 Formatter ↔ gameStore 循环依赖）
// ============================================================

/** 当前激活皮肤（由 gameStore 同步，保证与 GameState.activeNumberSkin 一致） */
let _activeNumberSkin: NumberSkinId = 'skin_scientific';

/** 读取当前激活数字皮肤（供 format() 默认使用） */
export function getActiveNumberSkin(): NumberSkinId {
  return _activeNumberSkin;
}

/** 由 gameStore 在初始化/加载/切换时写入当前激活皮肤 */
export function setActiveNumberSkin(id: NumberSkinId): void {
  _activeNumberSkin = id;
}

// ============================================================
// 公共入口
// ============================================================

/**
 * 格式化 BigNumber 为可读字符串（按当前/指定皮肤）
 * @param value 要格式化的大数
 * @param skin 可选，指定皮肤；缺省时读取当前激活皮肤（模块镜像）
 * @returns 格式化后的字符串
 */
export function format(value: BigNumber, skin: NumberSkinId = _activeNumberSkin): string {
  switch (skin) {
    case 'skin_scientific':
      return formatScientific(value);
    case 'skin_engineering':
      return formatEngineering(value);
    case 'skin_chinese':
      return formatChinese(value);
    case 'skin_binary':
      return formatBinary(value);
    default:
      return formatScientific(value);
  }
}

// ============================================================
// 科学皮肤（= 旧版 format，保持现有输出完全不变）
// ============================================================

/**
 * 科学记数（默认皮肤）：与 Sprint 4 之前的 `format` 逻辑完全一致。
 * 现有 Formatter.test.ts 默认皮肤用例依赖此输出，不得更改。
 */
export function formatScientific(value: BigNumber): string {
  // 特殊处理：小于1的值直接显示小数
  if (value.lt(1)) {
    const num = parseFloat(value.toString());
    if (isNaN(num)) {
      return value.toString();
    }
    return num < 0.01 ? value.toString() : num.toFixed(2);
  }

  const log = value.log10();
  const logStr = log.toString();
  const logNum = parseFloat(logStr);

  // 如果logNum为NaN或Infinity（极端大数），走L5
  if (isNaN(logNum) || !isFinite(logNum)) {
    return formatTera(value, logNum);
  }

  // L1: 整数 (≤999,999)
  if (logNum < 6) {
    return formatInteger(value);
  }

  // L2: 命名数 (10^6 ~ 10^9)
  if (logNum < 10) {
    return formatNamed(value, logNum);
  }

  // L3: 科学+命名 (10^10 ~ 10^33)
  if (logNum < 33) {
    return formatScientificNamed(value, logNum);
  }

  // L4: Mega前缀 (10^33 ~ 10^303)
  if (logNum < 303) {
    return formatMega(value, logNum);
  }

  // L5: Tera前缀 (10^303+)
  return formatTera(value, logNum);
}

// ============================================================
// 工程皮肤：指数归整到 3 的倍数，Unicode 上标
// ============================================================

/** Unicode 上标数字（0-9） */
const SUPERSCRIPT_DIGITS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

/** 将非负整数转为 Unicode 上标字符串 */
function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUPERSCRIPT_DIGITS[Number(c)] ?? c)
    .join('');
}

/**
 * 工程记数：<1000 整数；≥1000 指数归整到 3 的倍数，形如 `1.23×10⁴⁵`。
 * 例：1.23e45 → "1.23×10⁴⁵"；1.23e46 → "12.3×10⁴⁵"。
 */
export function formatEngineering(value: BigNumber): string {
  if (value.lt(1)) {
    const num = parseFloat(value.toString());
    if (isNaN(num)) return value.toString();
    return num < 0.01 ? value.toString() : num.toFixed(2);
  }

  const logNum = parseFloat(value.log10().toString());
  if (isNaN(logNum) || !isFinite(logNum)) return formatTera(value, logNum);
  if (logNum < 3) return formatInteger(value); // < 1000 整数
  if (logNum >= 303) return formatTera(value, logNum); // 超大数走箭头规则

  const exponent = Math.floor(logNum / 3) * 3;
  const divisor = BigNumber.from(10).pow(exponent);
  const mantissa = value.div(divisor);
  const mantissaStr = formatMantissa(mantissa, 2);
  return `${mantissaStr}×10${toSuperscript(exponent)}`;
}

// ============================================================
// 汉字皮肤：万/亿/兆/京/垓/秭/穰/沟/涧/正/载/极
// ============================================================

/** 中文大数单位表（每级 ×10^4，对齐 GDD §2.1.1） */
const CHINESE_UNITS: [number, string][] = [
  [4, '万'],
  [8, '亿'],
  [12, '兆'],
  [16, '京'],
  [20, '垓'],
  [24, '秭'],
  [28, '穰'],
  [32, '沟'],
  [36, '涧'],
  [40, '正'],
  [44, '载'],
  [48, '极'],
];

/**
 * 汉字大数：<10000 整数；≥10000 取不超过 log10 的最大单位。
 * 例：1.23e16 → "1.23 京"；1.23e20 → "1.23 垓"。
 * 超过已知单位（>1e52）回退科学记数法并追加"（数已超载）"。
 */
export function formatChinese(value: BigNumber): string {
  if (value.lt(1)) {
    const num = parseFloat(value.toString());
    if (isNaN(num)) return value.toString();
    return num < 0.01 ? value.toString() : num.toFixed(2);
  }

  const logNum = parseFloat(value.log10().toString());
  if (isNaN(logNum) || !isFinite(logNum)) return formatTera(value, logNum);

  if (logNum > 52) {
    // 边缘情况：超过已知中文单位 → 回退科学记数法（GDD §6.5）
    return formatScientific(value) + '（数已超载）';
  }
  if (logNum < 4) return formatInteger(value); // < 10000 整数

  let bestExp = 4; // 默认"万"
  let bestName = '万';
  for (const [exp, name] of CHINESE_UNITS) {
    if (exp <= logNum && exp > bestExp) {
      bestExp = exp;
      bestName = name;
    }
  }

  const divisor = BigNumber.from(10).pow(bestExp);
  const mantissa = value.div(divisor);
  const mantissaStr = formatMantissa(mantissa, 2);
  return `${mantissaStr} ${bestName}`;
}

// ============================================================
// 二进制脉冲皮肤：<256 真实二进制；≥256 科学底 + ▮▯ 脉冲
// ============================================================

/** 二进制脉冲符号：1→▮，0→▯（U+25AE / U+25AF） */
function toBinaryPulse(bits: number, width: number): string {
  let s = '';
  for (let i = width - 1; i >= 0; i--) {
    s += (bits & (1 << i)) !== 0 ? '▮' : '▯';
  }
  return s;
}

/**
 * 二进制脉冲（GDD §2.1.1）：
 * - <256：显示真实二进制（如 100 → "1100100"）
 * - ≥256：科学记数回退 + 尾数比特脉冲装饰，形如 `▮▯▮▮▯▯▮▯ ×2^150`
 *   （指数取 log2 四舍五入；脉冲取 mantissa∈[1,2) 小数部分映射为 7 位比特）
 * - 超大数（>1e308）同样保留脉冲前缀，走箭头规则
 */
export function formatBinary(value: BigNumber): string {
  if (value.lt(1)) {
    const num = parseFloat(value.toString());
    if (isNaN(num)) return value.toString();
    return num < 0.01 ? value.toString() : num.toFixed(2);
  }

  const logNum = parseFloat(value.log10().toString());
  if (isNaN(logNum) || !isFinite(logNum)) {
    // 超大数（如 tetration）：箭头规则，前缀保留固定脉冲装饰
    return toBinaryPulse(0b1011010, 7) + ' ' + formatTera(value, logNum);
  }

  // <256：真实二进制
  if (logNum < Math.log10(256)) {
    const n = Math.floor(value.toDecimal().toNumber());
    return n.toString(2);
  }

  // ≥256：科学底 + 脉冲装饰
  const exp2 = Math.round(logNum / Math.log10(2));
  const mantissa = value.div(BigNumber.from(2).pow(exp2)); // ∈ [1, 2)
  const frac = mantissa.sub(1); // ∈ [0, 1)
  const fracNum = frac.toDecimal().toNumber();
  const bits = Math.floor(fracNum * 128) & 0x7f; // 7 位
  return `${toBinaryPulse(bits, 7)} ×2^${exp2}`;
}

// ============================================================
// 科学皮肤内部辅助（保持旧版命名/逻辑，供 formatScientific 复用）
// ============================================================

/** L1: 格式化为带千位分隔符的整数 */
function formatInteger(value: BigNumber): string {
  const numStr = value.floor().toString();
  return addThousandSeparator(numStr);
}

/** L2: 命名数格式化 (10^6 ~ 10^9) */
function formatNamed(value: BigNumber, logNum: number): string {
  let bestExp = 4; // 默认"万"
  let bestName = '万';

  for (const [exp, name] of CHINESE_NAMES) {
    if (exp <= logNum && exp > bestExp) {
      bestExp = exp;
      bestName = name;
    }
  }

  const divisor = BigNumber.from(10).pow(bestExp);
  const mantissa = value.div(divisor);
  const mantissaStr = formatMantissa(mantissa, 2);
  return `${mantissaStr} ${bestName}`;
}

/** L3: 科学+命名格式化 (10^10 ~ 10^33) */
function formatScientificNamed(_value: BigNumber, logNum: number): string {
  let bestExp = 4;
  let bestName = '万';

  for (const [exp, name] of CHINESE_NAMES) {
    if (exp <= logNum && exp > bestExp) {
      bestExp = exp;
      bestName = name;
    }
  }

  const exponent = Math.floor(logNum);
  const mantissaValue = logNum - exponent;
  const mantissaNum = Math.pow(10, mantissaValue);
  const mantissaStr = mantissaNum.toFixed(2);
  return `${mantissaStr}e${exponent} ${bestName}`;
}

/** L4: Mega前缀格式化 (10^33 ~ 10^303) */
function formatMega(value: BigNumber, logNum: number): string {
  const prefixIndex = Math.floor((logNum - 33) / 3);
  const prefix =
    prefixIndex < SI_MEGA_PREFIXES.length ? SI_MEGA_PREFIXES[prefixIndex] : `10^${33 + prefixIndex * 3}`;

  const baseExp = 33 + prefixIndex * 3;
  const divisor = BigNumber.from(10).pow(baseExp);
  const mantissa = value.div(divisor);
  const mantissaStr = formatMantissa(mantissa, 2);
  return `${mantissaStr} ${prefix}`;
}

/** L5: Tera前缀格式化 (10^303+) */
function formatTera(_value: BigNumber, logNum: number): string {
  const exponent = Math.floor(logNum);
  const mantissaValue = logNum - exponent;
  const mantissaNum = Math.pow(10, mantissaValue);
  const mantissaStr = mantissaNum.toFixed(2);
  return `${mantissaStr} Tera${exponent}`;
}

/** 中文大数命名映射（科学皮肤的 L2/L3 复用，保持旧版输出） */
const CHINESE_NAMES: [number, string][] = [
  [4, '万'],
  [8, '亿'],
  [12, '万亿'],
  [16, '京'],
  [20, '垓'],
  [24, '秭'],
  [28, '穰'],
  [32, '沟'],
];

/** SI Mega前缀（10^33 起，每 10^3 一个前缀） */
const SI_MEGA_PREFIXES: string[] = [
  '极', // 10^33
  '载', // 10^36
  '涧', // 10^39
  '正', // 10^42
  '载', // 10^45
  '极', // 10^48
  '恒河沙', // 10^51
  '阿僧祇', // 10^54
  '那由他', // 10^57
  '不可思议', // 10^60
  '无量大数', // 10^63
  // 10^66 及以上用科学计数法+Tera
];

// ============================================================
// 通用辅助函数
// ============================================================

/** 格式化尾数，保留指定小数位 */
function formatMantissa(value: BigNumber, decimals: number): string {
  const str = value.toString();
  if (str.includes('e')) {
    const parts = str.split('e');
    const num = parseFloat(parts[0]);
    const exp = parseInt(parts[1], 10);
    return (num * Math.pow(10, exp % 1 || 0)).toFixed(decimals);
  }
  const num = parseFloat(str);
  if (isNaN(num)) {
    return str;
  }
  return num.toFixed(decimals);
}

/** 添加千位分隔符 */
function addThousandSeparator(numStr: string): string {
  if (numStr.includes('e') || numStr.includes('E')) {
    const num = parseFloat(numStr);
    if (!isNaN(num) && Math.abs(num) < 1e6) {
      return Math.floor(num).toLocaleString('en-US');
    }
    return numStr;
  }
  const parts = numStr.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';

  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;

  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + formatted + decPart;
}
