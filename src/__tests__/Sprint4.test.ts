import { describe, it, expect, afterEach } from 'vitest';
import Decimal from 'break_eternity.js';
import { BigNumber } from '@/core/BigNumber';
import {
  format,
  formatEngineering,
  formatChinese,
  formatBinary,
  getActiveNumberSkin,
  setActiveNumberSkin,
} from '@/core/Formatter';
import { GameState, type DimensionState, type NumberSkinId, type UIThemeId } from '@/types/game';
import { serialize, deserialize } from '@/core/Serializer';
import {
  SKIN_DEFS,
  THEME_DEFS,
  getNumberSkinDef,
  getThemeDef,
  isSkinConditionMet,
  isThemeConditionMet,
  getCostLabel,
  hasEnoughResource,
  unlockNumberSkin,
  setNumberSkin,
  unlockTheme,
  setTheme,
} from '@/systems/SkinSystem';
import { evaluateMystery, checkAllMysteries } from '@/systems/CodexSystem';
import { CODEX_DEFS } from '@/types/codex';

// ============================================================
// 辅助：构造带指定基因的 GameState（供 mystery_10 基因条件）
// ============================================================
function withGenes(types: Array<{ type: string; level?: number }>): GameState {
  const s = new GameState();
  s.geneChain.chain = types.map((t, i) => ({
    instanceId: `g${i}`,
    type: t.type as any,
    level: t.level ?? 1,
    expression: 1,
    mutationSeed: 1,
    obtainedAt: 1,
  }));
  return s;
}

// 构造一个维度状态条目（DimensionState 全字段）
function dimState(id: number, opts: Partial<DimensionState> = {}): DimensionState {
  return {
    id: id as any,
    unlocked: opts.unlocked ?? false,
    master: opts.master ?? 0,
    resource: opts.resource ?? new Decimal(0),
    crystals: opts.crystals ?? 0,
    maxNumber: opts.maxNumber ?? new Decimal(0),
  };
}

// 重置 Formatter 模块级皮肤镜像，避免跨用例污染
afterEach(() => {
  setActiveNumberSkin('skin_scientific');
});

// ============================================================
// Group 1 — Formatter 四种数字皮肤
// ============================================================
describe('Sprint 4 Formatter 四种数字皮肤', () => {
  it('默认皮肤（不传 skin）与显式 skin_scientific 输出一致（零侵入保证）', () => {
    const v = BigNumber.from(123456789);
    expect(format(v)).toBe(format(v, 'skin_scientific'));
  });

  it('skin_engineering：指数归整到 3 的倍数，形如 1.23×10⁴⁵', () => {
    const out = format(BigNumber.from('1.23e45'), 'skin_engineering');
    // 提取上标指数数值（Unicode 上标 → 普通数字）
    const supMap: Record<string, string> = {
      '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
      '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
    };
    const m = out.match(/×10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/);
    expect(m, `工程皮肤输出应为 ×10ⁿ 形式，实际: ${out}`).not.toBeNull();
    const expStr = m![1].split('').map((c) => supMap[c]).join('');
    const exp = Number(expStr);
    expect(exp % 3).toBe(0); // 指数必为 3 的倍数
    expect(exp).toBeGreaterThan(0);
  });

  it('skin_engineering 导出函数与 format 路由一致', () => {
    expect(formatEngineering(BigNumber.from('1e33'))).toBe(
      format(BigNumber.from('1e33'), 'skin_engineering'),
    );
  });

  it('skin_chinese：1e16 → 含「京」', () => {
    const out = format(BigNumber.from('1e16'), 'skin_chinese');
    expect(out).toContain('京');
  });

  it('skin_chinese：导出函数与 format 路由一致，且超限回退带「（数已超载）」', () => {
    expect(formatChinese(BigNumber.from('1e20'))).toBe(format(BigNumber.from('1e20'), 'skin_chinese'));
    const huge = format(BigNumber.from('1e60'), 'skin_chinese');
    expect(huge).toContain('（数已超载）');
  });

  it('skin_binary：100 → 真实二进制 "1100100"', () => {
    const out = format(BigNumber.from(100), 'skin_binary');
    expect(out).toBe('1100100');
  });

  it('skin_binary：1e45 → 含科学底 "×2^" 与脉冲符号 ▮/▯', () => {
    const out = format(BigNumber.from('1e45'), 'skin_binary');
    expect(out).toContain('×2^');
    expect(out).toContain('▮');
    expect(out).toContain('▯');
  });

  it('skin_binary：导出函数与 format 路由一致', () => {
    expect(formatBinary(BigNumber.from(255))).toBe(format(BigNumber.from(255), 'skin_binary'));
  });

  it('皮肤切换通过模块访问器生效：setActiveNumberSkin 后 format() 默认使用该皮肤', () => {
    setActiveNumberSkin('skin_binary');
    expect(getActiveNumberSkin()).toBe('skin_binary');
    const out = format(BigNumber.from('1e45')); // 不传 skin
    expect(out).toContain('×2^');
    expect(out).toContain('▮');
  });
});

// ============================================================
// Group 2 — GameState 皮肤字段默认值（Sprint 4 新增）
// ============================================================
describe('Sprint 4 GameState 皮肤字段默认值', () => {
  it('new GameState() 默认皮肤/主题/已解锁集合符合 S3 命名约定', () => {
    const s = new GameState();
    expect(s.activeNumberSkin).toBe('skin_scientific');
    expect(s.activeTheme).toBe('theme_deep_space');
    expect(new Set(s.unlockedNumberSkins)).toEqual(new Set<NumberSkinId>(['skin_scientific']));
    expect(new Set(s.unlockedThemes)).toEqual(new Set<UIThemeId>(['theme_deep_space']));
  });

  it('已解锁集合为独立 Set（数字皮肤与 UI 主题分开管理）', () => {
    const s = new GameState();
    s.unlockedNumberSkins.add('skin_engineering');
    // 修改数字皮肤集合不应影响主题集合
    expect(s.unlockedThemes.has('skin_engineering' as any)).toBe(false);
    expect(s.unlockedThemes.size).toBe(1);
  });
});

// ============================================================
// Group 3 — 序列化往返（Sprint 4 字段，不 bump 版本号）
// ============================================================
describe('Sprint 4 序列化往返（皮肤字段）', () => {
  it('含皮肤字段的状态序列化→反序列化后字段一致，版本保持 4', () => {
    const s = new GameState();
    s.activeNumberSkin = 'skin_chinese';
    s.activeTheme = 'theme_chaos_orange';
    s.unlockedNumberSkins.add('skin_engineering');
    s.unlockedThemes.add('theme_prime_green');

    const data = serialize(s);
    expect(data.version).toBe(4); // Sprint 4 不 bump 版本号（向下兼容）
    expect(data.state.activeNumberSkin).toBe('skin_chinese');
    expect(data.state.activeTheme).toBe('theme_chaos_orange');
    expect(data.state.unlockedNumberSkins).toContain('skin_engineering');
    expect(data.state.unlockedThemes).toContain('theme_prime_green');

    const restored = deserialize(data);
    expect(restored.activeNumberSkin).toBe('skin_chinese');
    expect(restored.activeTheme).toBe('theme_chaos_orange');
    expect(new Set(restored.unlockedNumberSkins)).toEqual(
      new Set<NumberSkinId>(['skin_scientific', 'skin_engineering']),
    );
    expect(new Set(restored.unlockedThemes)).toEqual(
      new Set<UIThemeId>(['theme_deep_space', 'theme_prime_green']),
    );
  });

  it('旧存档（无皮肤字段）反序列化不崩溃，使用默认值', () => {
    const full = serialize(new GameState());
    const legacy: any = { version: 3, timestamp: full.timestamp, state: { ...full.state } };
    delete legacy.state.activeNumberSkin;
    delete legacy.state.activeTheme;
    delete legacy.state.unlockedNumberSkins;
    delete legacy.state.unlockedThemes;

    const restored = deserialize(legacy);
    expect(restored.activeNumberSkin).toBe('skin_scientific');
    expect(restored.activeTheme).toBe('theme_deep_space');
    expect(restored.unlockedNumberSkins.size).toBe(1);
    expect(restored.unlockedThemes.size).toBe(1);
  });
});

// ============================================================
// Group 4 — SkinSystem 解锁/切换/资源逻辑
// ============================================================
describe('Sprint 4 SkinSystem 解锁/切换逻辑', () => {
  it('静态定义数量对齐 GDD：4 数字皮肤 + 5 UI 主题', () => {
    expect(SKIN_DEFS.length).toBe(4);
    expect(THEME_DEFS.length).toBe(5);
    expect(SKIN_DEFS.map((d) => d.id)).toEqual([
      'skin_scientific',
      'skin_engineering',
      'skin_chinese',
      'skin_binary',
    ]);
    expect(THEME_DEFS.map((d) => d.id)).toEqual([
      'theme_deep_space',
      'theme_prime_green',
      'theme_chaos_orange',
      'theme_singularity_white',
      'theme_entropy_red',
    ]);
  });

  // ---- 数字皮肤条件判定 ----
  it('isSkinConditionMet：default 恒真、engineering 需坍缩3次、chinese 需超越1次', () => {
    const s = new GameState();
    expect(isSkinConditionMet(s, getNumberSkinDef('skin_scientific'))).toBe(true);
    expect(isSkinConditionMet(s, getNumberSkinDef('skin_engineering'))).toBe(false);
    s.prestigeCount = 3;
    expect(isSkinConditionMet(s, getNumberSkinDef('skin_engineering'))).toBe(true);
    expect(isSkinConditionMet(s, getNumberSkinDef('skin_chinese'))).toBe(false);
    s.transcendCount = 1;
    expect(isSkinConditionMet(s, getNumberSkinDef('skin_chinese'))).toBe(true);
  });

  it('isSkinConditionMet：binary 需奇点维度解锁 + 数字≥1e100', () => {
    const s = new GameState();
    expect(isSkinConditionMet(s, getNumberSkinDef('skin_binary'))).toBe(false);
    s.dimensionStates.set(4, dimState(4, { unlocked: true }));
    s.number = new Decimal('1e100');
    expect(isSkinConditionMet(s, getNumberSkinDef('skin_binary'))).toBe(true);
  });

  // ---- 资源扣减与解锁 ----
  it('getCostLabel：星尘/奇点核心/维度资源/免费 文案正确', () => {
    expect(getCostLabel({ type: 'none', amount: 0 })).toBe('免费');
    expect(getCostLabel({ type: 'stardust', amount: 50 })).toBe('50 星尘');
    expect(getCostLabel({ type: 'singularity', amount: 3 })).toBe('3 奇点核心');
    // 维度资源走 DIMENSION_DEFS[dimId].resourceName（Dim-1 = 质核）
    expect(getCostLabel({ type: 'dimension_resource', amount: 20, dimId: 1 })).toBe('20 质核');
  });

  it('unlockNumberSkin：条件+资源满足 → 解锁并扣资源；否则按原因失败', () => {
    // 条件不满足（engineering 需坍缩3次）
    const a = new GameState();
    a.stardust = 100;
    expect(unlockNumberSkin(a, 'skin_engineering')).toEqual({ ok: false, reason: 'condition_unmet' });
    // 资源不足（chinese 需奇点核心3，仅1）
    const b = new GameState();
    b.transcendCount = 1;
    b.singularity = 1; // < 3
    expect(unlockNumberSkin(b, 'skin_chinese')).toEqual({ ok: false, reason: 'insufficient_resource' });
    // 条件+资源满足 → 成功并扣费
    const c = new GameState();
    c.transcendCount = 1;
    c.singularity = 3;
    const res = unlockNumberSkin(c, 'skin_chinese');
    expect(res.ok).toBe(true);
    expect(c.unlockedNumberSkins.has('skin_chinese')).toBe(true);
    expect(c.singularity).toBe(0); // 3 - 3 = 0
    // 重复解锁 → already_unlocked
    expect(unlockNumberSkin(c, 'skin_chinese')).toEqual({ ok: false, reason: 'already_unlocked' });
  });

  it('setNumberSkin：仅已解锁可切换；切换后 activeNumberSkin 更新', () => {
    const s = new GameState();
    expect(setNumberSkin(s, 'skin_chinese')).toBe(false); // 未解锁
    s.unlockedNumberSkins.add('skin_chinese');
    expect(setNumberSkin(s, 'skin_chinese')).toBe(true);
    expect(s.activeNumberSkin).toBe('skin_chinese');
  });

  // ---- UI 主题条件判定 ----
  it('isThemeConditionMet：default 恒真；质数绿需 Dim-1 精通 Lv≥2；熵崩红需累计10次', () => {
    const s = new GameState();
    expect(isThemeConditionMet(s, getThemeDef('theme_deep_space'))).toBe(true);
    expect(isThemeConditionMet(s, getThemeDef('theme_prime_green'))).toBe(false);
    s.dimensionStates.set(1, dimState(1, { unlocked: true, master: 40 })); // 40/20 = Lv2
    expect(isThemeConditionMet(s, getThemeDef('theme_prime_green'))).toBe(true);
    expect(isThemeConditionMet(s, getThemeDef('theme_entropy_red'))).toBe(false);
    s.totalCollapses = 10;
    expect(isThemeConditionMet(s, getThemeDef('theme_entropy_red'))).toBe(true);
  });

  it('unlockTheme + setTheme：维度资源充足可解锁并扣费，切换主题生效', () => {
    const s = new GameState();
    // 质核（Dim-1）资源 20，master 40（满足 Lv2 条件）
    s.dimensionStates.set(1, dimState(1, { unlocked: true, master: 40, resource: new Decimal(20) }));
    expect(hasEnoughResource(s, getThemeDef('theme_prime_green').unlockCost)).toBe(true);
    const res = unlockTheme(s, 'theme_prime_green');
    expect(res.ok).toBe(true);
    expect(s.unlockedThemes.has('theme_prime_green')).toBe(true);
    // 扣费：20 - 20 = 0
    expect(s.dimensionStates.get(1)!.resource.toString()).toBe('0');
    // 未满足条件时解锁失败
    expect(unlockTheme(s, 'theme_chaos_orange')).toEqual({ ok: false, reason: 'condition_unmet' });
    // 切换主题
    expect(setTheme(s, 'theme_prime_green')).toBe(true);
    expect(s.activeTheme).toBe('theme_prime_green');
  });
});

// ============================================================
// Group 5 — CodexSystem mystery_10 联动 + 选择器逻辑集成
// ============================================================
describe('Sprint 4 CodexSystem mystery_10 联动 + 选择器逻辑集成', () => {
  it('mystery_10 负向：默认皮肤（非 skin_binary）时 skin_active 判定为 false', () => {
    const state = withGenes([
      { type: 'gene_mutation', level: 1 },
      { type: 'gene_exotic', level: 1 },
    ]);
    // activeNumberSkin 默认 skin_scientific → 即便基因齐备，mystery_10 仍不解锁
    expect(state.activeNumberSkin).toBe('skin_scientific');
    expect(evaluateMystery(state, CODEX_DEFS.find((d) => d.id === 'mystery_10')!)).toBe(false);
  });

  it('mystery_10 正向：激活 skin_binary + 基因齐备 → 真实判定解锁', () => {
    const state = withGenes([
      { type: 'gene_mutation', level: 1 },
      { type: 'gene_exotic', level: 1 },
    ]);
    state.activeNumberSkin = 'skin_binary'; // 接入 Sprint 4 皮肤系统
    const m10 = CODEX_DEFS.find((d) => d.id === 'mystery_10')!;
    expect(evaluateMystery(state, m10)).toBe(true);

    const unlocked = checkAllMysteries(state);
    expect(unlocked.some((d) => d.id === 'mystery_10')).toBe(true);
    expect(state.codexEntries.get('mystery_10')?.unlocked).toBe(true);
  });

  it('选择器集成：模拟「解锁→应用」全流程（SkinSystem + Formatter 模块镜像同步）', () => {
    const state = new GameState();
    // 1) 选择器读取静态定义
    expect(SKIN_DEFS.length).toBe(4);
    // 2) 构造满足 chinese 皮肤（超越1次 + 奇点核心3）的条件
    state.transcendCount = 1;
    state.singularity = 3;
    // 3) 选择器预览：用 format(PREVIEW_NUMBER, id)（与 SkinSelector 一致）
    const preview = format(BigNumber.from(123456789), 'skin_chinese');
    expect(preview.length).toBeGreaterThan(0);
    // 4) 点击解锁
    const unlock = unlockNumberSkin(state, 'skin_chinese');
    expect(unlock.ok).toBe(true);
    // 5) 点击应用 → 切换激活皮肤
    expect(setNumberSkin(state, 'skin_chinese')).toBe(true);
    expect(state.activeNumberSkin).toBe('skin_chinese');
    // 6) 模拟 gameStore 的同步副作用：把激活皮肤推入 Formatter 模块镜像
    setActiveNumberSkin(state.activeNumberSkin);
    expect(getActiveNumberSkin()).toBe('skin_chinese');
    // 7) 此后 format() 默认即用该皮肤（零侵入调用点生效）
    const applied = format(BigNumber.from('1e16'));
    expect(applied).toContain('京');
  });

  it('选择器集成：主题切换端到端（质数绿：Dim-1 Lv2 + 质核20）', () => {
    const state = new GameState();
    state.dimensionStates.set(1, dimState(1, { unlocked: true, master: 40, resource: new Decimal(20) }));
    expect(unlockTheme(state, 'theme_prime_green').ok).toBe(true);
    expect(setTheme(state, 'theme_prime_green')).toBe(true);
    expect(state.activeTheme).toBe('theme_prime_green');
  });
});
