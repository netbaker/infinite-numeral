// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import Decimal from 'break_eternity.js';
import SkinSelector from '@/components/modals/SkinSelector.vue';
import { useGameStore } from '@/stores/gameStore';
import {
  format,
  getActiveNumberSkin,
  setActiveNumberSkin,
} from '@/core/Formatter';
import { BigNumber } from '@/core/BigNumber';
import type { Pinia } from 'pinia';

/**
 * SkinSelector 组件测试（jsdom 环境）
 *
 * 参考 Sprint4.test.ts 的写法与 formatter 测试范式：本组件是 SkinSystem /
 * Formatter 的薄视图层，这里验证：
 *  1) 渲染出正确的皮肤卡 / 主题卡数量；
 *  2) 默认激活态（科学皮肤 / 深空蓝主题）正确高亮；
 *  3) formatter 联动：每张卡片预览都经 Formatter.format(id) 路由（二进制皮肤带 ×2^ 标记）；
 *  4) 点击未解锁皮肤 → 弹出确认框（条件未满足时确认按钮禁用），可取消关闭；
 *  5) 解锁后点击皮肤卡 → 切换激活皮肤，并同步 Formatter 模块镜像；
 *  6) 主题同理：解锁后可点击切换激活主题。
 *
 * 使用真实 gameStore + Pinia（组件仅读取/调用 store，不触发任何 DB 操作）。
 */
const PREVIEW_NUMBER = BigNumber.from(123456789);

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  setActiveNumberSkin('skin_scientific');
});

afterEach(() => {
  setActiveNumberSkin('skin_scientific');
});

function mountSelector(): VueWrapper {
  return mount(SkinSelector, {
    props: { visible: true },
    global: { plugins: [pinia] },
  });
}

describe('SkinSelector 组件 — 渲染与默认激活态', () => {
  it('渲染 4 张数字皮肤卡 + 5 张 UI 主题卡', () => {
    const wrapper = mountSelector();
    expect(wrapper.findAll('.skin-card').length).toBe(4);
    expect(wrapper.findAll('.theme-card').length).toBe(5);
  });

  it('默认高亮当前激活项：科学皮肤卡 + 深空蓝主题卡带 is-active', () => {
    const wrapper = mountSelector();
    const skinCards = wrapper.findAll('.skin-card');
    expect(skinCards[0].classes()).toContain('is-active'); // skin_scientific
    const themeCards = wrapper.findAll('.theme-card');
    expect(themeCards[0].classes()).toContain('is-active'); // theme_deep_space
  });
});

describe('SkinSelector 组件 — formatter 联动', () => {
  it('每张皮肤卡预览都经 Formatter.format(id) 路由（科学=原值，二进制带 ×2^）', () => {
    const wrapper = mountSelector();
    const skinCards = wrapper.findAll('.skin-card');

    const sciPreview = skinCards[0].find('.skin-card__preview').text();
    expect(sciPreview).toBe(format(PREVIEW_NUMBER, 'skin_scientific'));

    const binPreview = skinCards[3].find('.skin-card__preview').text();
    expect(binPreview).toContain('×2^'); // 二进制皮肤的 Formatter 标记
    expect(binPreview).toBe(format(PREVIEW_NUMBER, 'skin_binary'));
  });
});

describe('SkinSelector 组件 — 未解锁项确认框流程', () => {
  it('点击未解锁皮肤 → 弹出确认框，条件未满足时确认按钮禁用，取消可关闭', async () => {
    const wrapper = mountSelector();
    const skinCards = wrapper.findAll('.skin-card');
    // 工程皮肤（索引 1）默认未解锁（需坍缩 3 次）
    await skinCards[1].trigger('click');

    const dialog = wrapper.find('.confirm-dialog');
    expect(dialog.exists()).toBe(true);
    // 默认条件未满足 → 确认按钮禁用
    const confirmBtn = wrapper.find('.confirm-dialog .btn-confirm');
    expect(confirmBtn.attributes('disabled')).toBeDefined();

    // 取消关闭
    await wrapper.find('.confirm-dialog .btn-cancel').trigger('click');
    expect(wrapper.find('.confirm-dialog').exists()).toBe(false);
  });

  it('点击未解锁主题 → 弹出确认框', async () => {
    const wrapper = mountSelector();
    const themeCards = wrapper.findAll('.theme-card');
    await themeCards[1].trigger('click'); // 质数绿默认未解锁
    expect(wrapper.find('.confirm-dialog').exists()).toBe(true);
  });
});

describe('SkinSelector 组件 — 皮肤切换端到端', () => {
  it('解锁中文皮肤后点击其卡片 → 切换激活皮肤并同步 Formatter 镜像', async () => {
    const store = useGameStore();
    // 构造满足中文皮肤（超越 1 次 + 奇点核心 3）的条件
    store.gameState.transcendCount = 1;
    store.gameState.singularity = 3;
    const unlock = store.unlockNumberSkin('skin_chinese');
    expect(unlock.ok).toBe(true);

    const wrapper = mountSelector();
    const skinCards = wrapper.findAll('.skin-card');
    await skinCards[2].trigger('click'); // 中文皮肤现已解锁 → 直接切换

    expect(store.activeNumberSkin).toBe('skin_chinese');
    // Formatter 模块镜像同步（零侵入调用点生效）
    expect(getActiveNumberSkin()).toBe('skin_chinese');
    await nextTick();
    expect(wrapper.findAll('.skin-card')[2].classes()).toContain('is-active');
  });
});

describe('SkinSelector 组件 — 主题切换端到端', () => {
  it('解锁质数绿后点击其卡片 → 切换激活主题', async () => {
    const store = useGameStore();
    // 质数绿条件：Dim-1 精通 Lv≥2（master 40）+ 质核资源 20
    store.gameState.dimensionStates.set(1, {
      id: 1,
      unlocked: true,
      master: 40,
      resource: new Decimal(20),
      maxNumber: new Decimal(0),
    } as any);
    const unlock = store.unlockTheme('theme_prime_green');
    expect(unlock.ok).toBe(true);

    const wrapper = mountSelector();
    const themeCards = wrapper.findAll('.theme-card');
    await themeCards[1].trigger('click'); // 质数绿现已解锁 → 直接切换

    expect(store.activeTheme).toBe('theme_prime_green');
    await nextTick();
    expect(wrapper.findAll('.theme-card')[1].classes()).toContain('is-active');
  });
});
