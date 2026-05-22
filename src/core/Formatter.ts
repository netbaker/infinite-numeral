import { BigNumber } from './BigNumber';

/**
 * 5级数字格式化器
 *
 * L1: 整数 (≤999,999) → "123,456"
 * L2: 命名数 (10^6 ~ 10^9) → "1.23 百万", "4.56 十亿"
 * L3: 科学+命名 (10^10 ~ 10^33) → "1.23e15 万亿"
 * L4: Mega前缀 (10^33 ~ 10^303) → 标准SI Mega前缀
 * L5: Tera前缀 (10^303+) → "1.23 Tera" 用log10值标注
 */

/** 中文大数命名映射 */
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
  '极',     // 10^33
  '载',     // 10^36
  '涧',     // 10^39
  '正',     // 10^42
  '载',     // 10^45
  '极',     // 10^48
  '恒河沙', // 10^51
  '阿僧祇', // 10^54
  '那由他', // 10^57
  '不可思议', // 10^60
  '无量大数', // 10^63
  // 10^66 及以上用科学计数法+Tera
];

/**
 * 格式化 BigNumber 为可读字符串
 * @param value 要格式化的大数
 * @returns 格式化后的字符串
 */
export function format(value: BigNumber): string {
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

/**
 * L1: 格式化为带千位分隔符的整数
 */
function formatInteger(value: BigNumber): string {
  const numStr = value.floor().toString();
  return addThousandSeparator(numStr);
}

/**
 * L2: 命名数格式化 (10^6 ~ 10^9)
 * 找到不超过 log10 的最大中文命名
 */
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

/**
 * L3: 科学+命名格式化 (10^10 ~ 10^33)
 * 组合科学计数法与中文命名
 */
function formatScientificNamed(_value: BigNumber, logNum: number): string {
  // 找到最接近的中文命名
  let bestExp = 4;
  let bestName = '万';

  for (const [exp, name] of CHINESE_NAMES) {
    if (exp <= logNum && exp > bestExp) {
      bestExp = exp;
      bestName = name;
    }
  }

  // 以科学计数法展示
  const exponent = Math.floor(logNum);
  const mantissaValue = logNum - exponent;
  const mantissaNum = Math.pow(10, mantissaValue);
  const mantissaStr = mantissaNum.toFixed(2);
  return `${mantissaStr}e${exponent} ${bestName}`;
}

/**
 * L4: Mega前缀格式化 (10^33 ~ 10^303)
 */
function formatMega(value: BigNumber, logNum: number): string {
  // 每10^3一个前缀，从10^33开始
  const prefixIndex = Math.floor((logNum - 33) / 3);
  const prefix = prefixIndex < SI_MEGA_PREFIXES.length
    ? SI_MEGA_PREFIXES[prefixIndex]
    : `10^${33 + prefixIndex * 3}`;

  const baseExp = 33 + prefixIndex * 3;
  const divisor = BigNumber.from(10).pow(baseExp);
  const mantissa = value.div(divisor);
  const mantissaStr = formatMantissa(mantissa, 2);
  return `${mantissaStr} ${prefix}`;
}

/**
 * L5: Tera前缀格式化 (10^303+)
 */
function formatTera(_value: BigNumber, logNum: number): string {
  const exponent = Math.floor(logNum);
  const mantissaValue = logNum - exponent;
  const mantissaNum = Math.pow(10, mantissaValue);
  const mantissaStr = mantissaNum.toFixed(2);
  return `${mantissaStr} Tera${exponent}`;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 格式化尾数，保留指定小数位
 */
function formatMantissa(value: BigNumber, decimals: number): string {
  const str = value.toString();
  // 对科学计数法字符串处理
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

/**
 * 添加千位分隔符
 */
function addThousandSeparator(numStr: string): string {
  // 处理可能的科学计数法
  if (numStr.includes('e') || numStr.includes('E')) {
    const num = parseFloat(numStr);
    if (!isNaN(num) && Math.abs(num) < 1e6) {
      return Math.floor(num).toLocaleString('en-US');
    }
    return numStr;
  }
  // 处理小数
  const parts = numStr.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';

  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = sign ? intPart.slice(1) : intPart;

  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + formatted + decPart;
}
