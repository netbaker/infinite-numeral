# 皮肤系统 GDD（Skin System）

> **系统代号**：Skin
> **优先级**：P3
> **版本**：v2.0 RC
> **依赖系统**：DimensionSystem（资源消耗）、MultiplierSystem（无功能影响，纯视觉）
> **设计日期**：2026-07-01

---

## 1. 系统概述

皮肤系统是 v2.0 的个性化定制系统，允许玩家改变数字的显示风格和整体 UI 主题。数字皮肤影响游戏中所有数字的记谱方式（科学/工程/汉字/二进制），UI 主题包改变全局配色方案。皮肤系统为纯视觉系统，不影响任何游戏机制和数值平衡。4 种数字皮肤和 5 种 UI 主题通过消耗维度资源或奇点核心解锁，为玩家提供长线视觉收集目标和个性化表达。

---

## 2. 核心机制

### 2.1 数字皮肤（4 种）

数字皮肤影响 `BigNumber.format()` 的输出格式，应用于游戏中所有数字显示（当前数字、产出/秒、价格、资源量等）。

| 皮肤 ID | 名称 | 格式规则 | 示例（数字 1.23e45） | 解锁条件 | 消耗资源 |
|---------|------|---------|---------------------|---------|---------|
| `skin_scientific` | 科学记数 | `[系数]e[指数]`，系数保留 2 位小数 | `1.23e45` | 默认 | 免费 |
| `skin_engineering` | 工程记数 | `[系数]×10^[指数]`，指数为 3 的倍数 | `1.23×10⁴⁵` | Prestige 3 次 | 50 星尘 |
| `skin_chinese` | 汉字大数 | 中文大数单位（万/亿/兆/京/垓…） | `1.23京` | Transcend 1 次 | 3 奇点核心 |
| `skin_binary` | 二进制脉冲 | 二进制可视化 + 科学记数回退 | `▮▯▮▮▯ ×2^150` | 在奇点维度（Dim-4）达到 e100 | 5 奇点核心 |

#### 2.1.1 各皮肤格式化规则详解

**科学记数（默认）**：
- `< 1000`：整数显示 `127`
- `>= 1000`：`[mantissa]e[exponent]`，mantissa 保留 2 位小数
- `>= 1e303`：双上箭头 `10^^[height].[fraction]`
- `>= 1e1e308`：三上箭头 `10^^^[height]`

**工程记数**：
- `< 1000`：整数显示
- `>= 1000`：`[mantissa]×10^[exponent]`，exponent 归整到 3 的倍数，mantissa = value / 10^exponent
- 例：`1.23e45` → `1.23×10⁴⁵`；`1.23e46` → `12.3×10⁴⁵`
- 超大数同科学记数的箭头规则

**汉字大数**：
- `< 10000`：整数显示
- `>= 10000`：中文大数单位序列
- 单位表：万(1e4)、亿(1e8)、兆(1e12)、京(1e16)、垓(1e20)、秭(1e24)、穰(1e28)、沟(1e32)、涧(1e36)、正(1e40)、载(1e44)、极(1e48)…
- 每级 ×10^4，超过已知单位后回退到科学记数
- 例：`1.23e16` → `1.23京`；`1.23e20` → `1.23垓`

**二进制脉冲**：
- `< 256`：实际二进制 `1100100`（100 的二进制）
- `>= 256`：科学记数回退 + 二进制脉冲装饰
- 脉冲装饰：根据 mantissa 的二进制位生成 `▮▯` 波形（每 bit 1→▮，0→▯）
- 例：`1.23e45` → `▮▯▮▮▯▯▮▯ ×2^150`（mantissa 1.23 的浮点位近似为二进制脉冲）
- 超大数同箭头规则，但前缀保留脉冲装饰

### 2.2 UI 主题包（5 种）

UI 主题通过 CSS 自定义属性（CSS Variables）实现全局配色切换。

| 主题 ID | 名称 | 风格 | 解锁条件 | 消耗资源 |
|---------|------|------|---------|---------|
| `theme_deep_space` | 深空蓝 | 现代科技 | 默认 | 免费 |
| `theme_prime_green` | 质数绿 | 黑客风 | 质数维度（Dim-1）精通 Lv 2 | 20 质核 |
| `theme_chaos_orange` | 混沌橙 | 蒸汽朋克 | 混沌维度（Dim-2）精通 Lv 2 | 20 混沌碎片 |
| `theme_singularity_white` | 奇点白 | 极简主义 | 奇点维度（Dim-4）精通 Lv 3 | 10 奇点核心 |
| `theme_entropy_red` | 熵崩红 | 末日风 | 累计触发 10 次熵崩 | 30 熵晶 |

### 2.3 完整配色方案（CSS 变量级别）

#### 2.3.1 深空蓝（默认）— `theme_deep_space`

```css
:root[data-theme="theme_deep_space"] {
  /* ---- 背景色 ---- */
  --bg-primary: #0a0a1a;
  --bg-secondary: #141428;
  --bg-tertiary: #1a1a3a;
  --bg-panel: rgba(20, 20, 40, 0.92);
  --bg-input: #0d0d1f;

  /* ---- 文字色 ---- */
  --text-primary: #e0e0ff;
  --text-secondary: #aaccff;
  --text-muted: #6666aa;
  --text-accent: #6688ff;

  /* ---- 边框/分割线 ---- */
  --border-primary: #333366;
  --border-secondary: #4444aa;
  --border-accent: #5555cc;

  /* ---- 功能色 ---- */
  --color-success: #66ffaa;
  --color-warning: #ffcc44;
  --color-danger: #ff6666;
  --color-info: #66ddff;

  /* ---- 特殊元素 ---- */
  --number-color: #aaccff;
  --number-glow: rgba(100, 130, 255, 0.3);
  --progress-fill: linear-gradient(90deg, #4444aa, #6688ff);
  --button-primary: linear-gradient(135deg, #2a2a5a, #3a3a8a);
  --button-hover: linear-gradient(135deg, #3a3a7a, #4a4a9a);

  /* ---- 纪元背景 ---- */
  --epoch-bg-overlay: radial-gradient(circle at 50% 30%, rgba(50, 50, 100, 0.15), transparent 70%);
}
```

#### 2.3.2 质数绿 — `theme_prime_green`

```css
:root[data-theme="theme_prime_green"] {
  /* ---- 背景色 ---- */
  --bg-primary: #000000;
  --bg-secondary: #0a0f0a;
  --bg-tertiary: #0f1a0f;
  --bg-panel: rgba(5, 15, 5, 0.92);
  --bg-input: #000500;

  /* ---- 文字色 ---- */
  --text-primary: #00ff66;
  --text-secondary: #44dd55;
  --text-muted: #226633;
  --text-accent: #00ff88;

  /* ---- 边框/分割线 ---- */
  --border-primary: #114422;
  --border-secondary: #226633;
  --border-accent: #00ff66;

  /* ---- 功能色 ---- */
  --color-success: #00ff66;
  --color-warning: #88ff00;
  --color-danger: #ff3333;
  --color-info: #00ffaa;

  /* ---- 特殊元素 ---- */
  --number-color: #00ff66;
  --number-glow: rgba(0, 255, 102, 0.4);
  --progress-fill: linear-gradient(90deg, #114422, #00ff66);
  --button-primary: linear-gradient(135deg, #0a1a0a, #0f2a0f);
  --button-hover: linear-gradient(135deg, #0f2a0f, #1a3a1a);

  /* ---- 纪元背景 ---- */
  --epoch-bg-overlay: radial-gradient(circle at 50% 30%, rgba(0, 50, 20, 0.2), transparent 70%);

  /* ---- 专属：终端字体 ---- */
  --font-mono: 'Courier New', monospace;
}
```

#### 2.3.3 混沌橙 — `theme_chaos_orange`

```css
:root[data-theme="theme_chaos_orange"] {
  /* ---- 背景色 ---- */
  --bg-primary: #1a0f08;
  --bg-secondary: #2a1810;
  --bg-tertiary: #3a2418;
  --bg-panel: rgba(35, 20, 12, 0.92);
  --bg-input: #1a0f08;

  /* ---- 文字色 ---- */
  --text-primary: #ffcc88;
  --text-secondary: #cc8844;
  --text-muted: #886633;
  --text-accent: #ff8844;

  /* ---- 边框/分割线 ---- */
  --border-primary: #4a3020;
  --border-secondary: #6a4530;
  --border-accent: #cc8844;

  /* ---- 功能色 ---- */
  --color-success: #88cc44;
  --color-warning: #ffaa00;
  --color-danger: #cc3333;
  --color-info: #ddaa66;

  /* ---- 特殊元素 ---- */
  --number-color: #ffaa44;
  --number-glow: rgba(255, 136, 68, 0.3);
  --progress-fill: linear-gradient(90deg, #6a4530, #ff8844);
  --button-primary: linear-gradient(135deg, #3a2418, #5a3624);
  --button-hover: linear-gradient(135deg, #5a3624, #7a4830);

  /* ---- 纪元背景 ---- */
  --epoch-bg-overlay: radial-gradient(circle at 50% 30%, rgba(80, 40, 10, 0.2), transparent 70%);
}
```

#### 2.3.4 奇点白 — `theme_singularity_white`

```css
:root[data-theme="theme_singularity_white"] {
  /* ---- 背景色 ---- */
  --bg-primary: #f8f8f8;
  --bg-secondary: #eeeeee;
  --bg-tertiary: #e0e0e0;
  --bg-panel: rgba(255, 255, 255, 0.95);
  --bg-input: #f0f0f0;

  /* ---- 文字色 ---- */
  --text-primary: #222222;
  --text-secondary: #555555;
  --text-muted: #999999;
  --text-accent: #c0a030;

  /* ---- 边框/分割线 ---- */
  --border-primary: #cccccc;
  --border-secondary: #bbbbbb;
  --border-accent: #c0a030;

  /* ---- 功能色 ---- */
  --color-success: #44aa44;
  --color-warning: #cc8800;
  --color-danger: #cc4444;
  --color-info: #4488cc;

  /* ---- 特殊元素 ---- */
  --number-color: #c0a030;
  --number-glow: rgba(192, 160, 48, 0.2);
  --progress-fill: linear-gradient(90deg, #cccccc, #c0a030);
  --button-primary: linear-gradient(135deg, #e8e8e8, #d8d8d8);
  --button-hover: linear-gradient(135deg, #d8d8d8, #c8c8c8);

  /* ---- 纪元背景 ---- */
  --epoch-bg-overlay: radial-gradient(circle at 50% 30%, rgba(200, 180, 100, 0.1), transparent 70%);
}
```

#### 2.3.5 熵崩红 — `theme_entropy_red`

```css
:root[data-theme="theme_entropy_red"] {
  /* ---- 背景色 ---- */
  --bg-primary: #1a0808;
  --bg-secondary: #2a1010;
  --bg-tertiary: #3a1818;
  --bg-panel: rgba(30, 10, 10, 0.92);
  --bg-input: #1a0808;

  /* ---- 文字色 ---- */
  --text-primary: #ffaaaa;
  --text-secondary: #cc6666;
  --text-muted: #884444;
  --text-accent: #ff4444;

  /* ---- 边框/分割线 ---- */
  --border-primary: #4a2020;
  --border-secondary: #6a3030;
  --border-accent: #aa3333;

  /* ---- 功能色 ---- */
  --color-success: #aa6644;
  --color-warning: #ff6644;
  --color-danger: #ff2222;
  --color-info: #cc4466;

  /* ---- 特殊元素 ---- */
  --number-color: #ff6666;
  --number-glow: rgba(255, 68, 68, 0.3);
  --progress-fill: linear-gradient(90deg, #4a2020, #aa3333);
  --button-primary: linear-gradient(135deg, #2a1010, #3a1818);
  --button-hover: linear-gradient(135deg, #3a1818, #4a2020);

  /* ---- 纪元背景 ---- */
  --epoch-bg-overlay: radial-gradient(circle at 50% 30%, rgba(80, 10, 10, 0.25), transparent 70%);

  /* ---- 专属：微弱屏幕抖动效果 ---- */
  --bg-shake: subtle-tremor 8s infinite;
}

@keyframes subtle-tremor {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(0.3px, -0.2px); }
  50% { transform: translate(-0.2px, 0.3px); }
  75% { transform: translate(0.2px, 0.2px); }
}
```

### 2.4 切换逻辑

- **数字皮肤切换**：即时生效，修改 `GameState.activeNumberSkin`，`BigNumber.format()` 读取该字段选择格式化器
- **UI 主题切换**：即时生效，修改 `<html data-theme="...">` 属性，CSS 变量自动级联
- **切换无冷却**：已解锁的皮肤/主题可自由切换
- **切换不消耗资源**：解锁时消耗资源，之后切换免费
- **存档持久化**：`activeNumberSkin` 和 `activeTheme` 存入存档

---

## 3. 数据结构

### 3.1 TypeScript 接口定义

```typescript
/** 数字皮肤 ID */
export type NumberSkinId =
  | 'skin_scientific'   // 科学记数（默认）
  | 'skin_engineering'  // 工程记数
  | 'skin_chinese'      // 汉字大数
  | 'skin_binary';      // 二进制脉冲

/** UI 主题 ID */
export type UIThemeId =
  | 'theme_deep_space'       // 深空蓝（默认）
  | 'theme_prime_green'      // 质数绿
  | 'theme_chaos_orange'     // 混沌橙
  | 'theme_singularity_white' // 奇点白
  | 'theme_entropy_red';     // 熵崩红

/** 数字皮肤静态定义 */
export interface NumberSkinDef {
  /** 唯一标识 */
  id: NumberSkinId;
  /** 显示名称 */
  name: string;
  /** 描述 */
  description: string;
  /** 图标 emoji */
  icon: string;
  /** 解锁条件描述 */
  unlockCondition: string;
  /** 解锁消耗 (资源类型 + 数量) */
  unlockCost: { type: 'stardust' | 'singularity' | 'dimension_resource'; amount: number; dimId?: number };
  /** 格式化器标识 */
  formatter: 'scientific' | 'engineering' | 'chinese' | 'binary';
}

/** UI 主题静态定义 */
export interface UIThemeDef {
  /** 唯一标识 */
  id: UIThemeId;
  /** 显示名称 */
  name: string;
  /** 风格描述 */
  style: string;
  /** 预览配色（主色 + 强调色，用于选择器预览） */
  preview: { primary: string; accent: string; bg: string };
  /** 解锁条件描述 */
  unlockCondition: string;
  /** 解锁消耗 */
  unlockCost: { type: 'dimension_resource' | 'singularity' | 'entropy_crystal'; amount: number; dimId?: number };
  /** CSS data-theme 属性值 */
  cssThemeAttr: string;
}
```

### 3.2 GameState 新增字段

```typescript
// ---- 皮肤系统（v2.0） ----
/** 当前激活的数字皮肤 */
activeNumberSkin: NumberSkinId;
/** 当前激活的 UI 主题 */
activeTheme: UIThemeId;
/** 已解锁的数字皮肤 ID 集合 */
unlockedNumberSkins: Set<NumberSkinId>;
/** 已解锁的 UI 主题 ID 集合 */
unlockedThemes: Set<UIThemeId>;
```

---

## 4. 与现有系统的交互点

| 交互系统 | 交互方式 | 触发时机 | 详情 |
|---------|---------|---------|------|
| **BigNumber / format()** | 数字格式化 | 所有数字显示时 | 读取 `activeNumberSkin` 选择对应格式化器 |
| **DimensionSystem** | 资源消耗 + 解锁条件检查 | 皮肤/主题解锁时 | 消耗维度资源（质核/混沌碎片/熵晶）；检查维度精通度条件 |
| **TranscendSystem** | 解锁条件检查 | Transcend 后 | 检查汉字大数皮肤解锁条件（Transcend 1 次） |
| **PrestigeSystem** | 解锁条件检查 | Prestige 后 | 检查工程记数皮肤解锁条件（Prestige 3 次） |
| **EntropySystem** | 解锁条件检查 | 熵崩触发后 | 检查熵崩红主题解锁条件（累计 10 次熵崩） |
| **App.vue / 根组件** | CSS 变量应用 | 主题切换时 | 修改 `<html data-theme="...">` 属性 |
| **CodexSystem** | 联动检测 | 皮肤切换时 | 检查"二进制脉冲+e100"等图鉴联动条件 |

### 4.1 实现要点

**数字皮肤与 BigNumber 的集成**：

```typescript
// BigNumber.ts
export function format(value: BigNumber, skin: NumberSkinId = 'skin_scientific'): string {
  switch (skin) {
    case 'skin_scientific': return formatScientific(value);
    case 'skin_engineering': return formatEngineering(value);
    case 'skin_chinese': return formatChinese(value);
    case 'skin_binary': return formatBinary(value);
  }
}
```

**UI 主题与 CSS 的集成**：

```vue
<!-- App.vue -->
<script setup>
import { watch } from 'vue';
import { useGameStore } from '@/stores/gameStore';

const store = useGameStore();

watch(() => store.activeTheme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
}, { immediate: true });
</script>
```

**关键约束**：所有现有组件的 CSS 必须使用 `var(--xxx)` 变量，不能硬编码颜色值。这是主题切换的前提条件。需审查现有组件的 CSS 是否已使用变量（如未完全使用，需逐步迁移）。

---

## 5. SkinSelector.vue UI 规格

### 5.1 布局结构

```
┌──────────────────────────────────────────────────────┐
│  🎨 皮肤定制                              [✕ 关闭]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📝 数字皮肤                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐       │
│  │1.23e45 │ │1.23×10⁴⁵│ │1.23京  │ │▮▯▮▮▯  │       │
│  │ 科学   │ │ 工程   │ │ 汉字   │ │ 二进制 │       │
│  │ ✅使用中│ │ 🔒50⭐ │ │ 🔒3奇点│ │ 🔒e100 │       │
│  └────────┘ └────────┘ └────────┘ └────────┘       │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🎨 UI 主题                                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│  │████████│ │░░░░░░░░│ │▓▓▓▓▓▓▓▓│ │▒▒▒▒▒▒▒▒│ │▓▓▓▓▓▓▓▓│ │
│  │深空蓝  │ │质数绿  │ │混沌橙  │ │奇点白  │ │熵崩红  │ │
│  │✅使用中 │ │🔒20质核│ │🔒20碎片│ │🔒10奇点│ │🔒30熵晶│ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│  💡 皮肤和主题均为纯视觉效果，不影响游戏数值         │
└──────────────────────────────────────────────────────┘
```

### 5.2 数字皮肤卡片设计

| 元素 | 规格 |
|------|------|
| 卡片尺寸 | 120×100px，圆角 8px |
| 预览区 | 卡片上半部分，以 `123456789` 为示例数字展示该皮肤格式化效果 |
| 名称 | 卡片中部，12px |
| 状态 | 卡片底部：`✅使用中` / `🔓已解锁` / `🔒{消耗}` |
| 背景 | 使用当前主题的 `--bg-tertiary` |
| 选中态 | 蓝色边框 + 右上角✅ |
| 已解锁未选中 | 正常边框，点击即切换 |
| 未解锁 | 半透明 + 锁图标 + 消耗资源提示 |

### 5.3 UI 主题卡片设计

| 元素 | 规格 |
|------|------|
| 卡片尺寸 | 100×80px，圆角 8px |
| 预览区 | 卡片上半部分，展示该主题的主色+背景色+强调色色块 |
| 名称 | 卡片中部 |
| 状态 | 同数字皮肤 |
| 选中态 | 该主题的强调色边框 + ✅ |
| 已解锁未选中 | 点击即切换，全屏即时变色 |
| 未解锁 | 半透明 + 锁图标 + 消耗资源提示 |

### 5.4 交互行为

| 元素 | 行为 |
|------|------|
| 已解锁皮肤/主题卡片 | 点击即时切换，卡片更新选中态 |
| 未解锁卡片 | 点击弹出解锁确认弹窗（显示消耗资源 + 解锁条件 + 确认/取消） |
| 数字皮肤切换 | 即时生效，预览区示例数字实时变化 |
| UI 主题切换 | 即时生效，全屏配色即时变化（0.2s 过渡动画） |
| 解锁确认弹窗 | 显示："解锁 {名称}？消耗 {数量} {资源名}。确认/取消" |

### 5.5 视觉规格

- **过渡动画**：主题切换时 `transition: all 0.2s ease`（全局 CSS 变量过渡）
- **预览数字**：统一使用 `123456789` 作为预览数字，展示格式化效果
- **主题色块预览**：3 个并排色块（背景色 + 主文字色 + 强调色），各占 1/3 宽度
- **锁图标**：灰色 `🔒`，消耗资源文字用 `--text-muted` 色
- **提示文字**：底部固定提示"皮肤和主题均为纯视觉效果，不影响游戏数值"

---

## 6. 边缘情况

1. **旧存档加载（无皮肤字段）**：初始化为默认值——`activeNumberSkin: 'skin_scientific'`，`activeTheme: 'theme_deep_space'`，`unlockedNumberSkins: Set(['skin_scientific'])`，`unlockedThemes: Set(['theme_deep_space'])`。
2. **解锁条件在加载时已满足但未解锁**：不做追溯解锁。皮肤/主题需玩家手动点击解锁（即使条件已满足）。
3. **资源不足时点击解锁**：弹窗显示"资源不足"，按钮灰显。
4. **二进制脉冲皮肤对超大数字（> 1e308）**：回退到科学记数箭头格式，前缀保留装饰性脉冲符号。
5. **汉字大数超出已知单位（> 1e52）**：回退到科学记数，前缀加"（数已超载）"提示。
6. **主题切换时正在播放动画（如飞升过场）**：动画继续播放，颜色在下一帧自然过渡。不中断动画。
7. **CSS 变量未完全迁移的组件**：这些组件在非默认主题下颜色不匹配。需在 v2.0 RC 阶段做一次全组件 CSS 变量审计。

---

## 7. 验收标准

1. 4 种数字皮肤均能正确格式化数字，切换即时生效
2. 科学记数、工程记数、汉字大数、二进制脉冲的格式化规则符合本 GDD 定义
3. 5 种 UI 主题切换即时生效，所有 CSS 变量正确级联
4. 各主题配色方案符合本 GDD 定义的 CSS 变量值
5. 解锁条件检查正确（Prestige 3 次、Transcend 1 次、维度精通度、熵崩次数等）
6. 解锁消耗正确扣减对应资源（星尘/奇点核心/维度资源/熵晶）
7. 未解锁卡片半透明 + 锁图标 + 消耗提示
8. 解锁确认弹窗正确显示资源消耗和确认/取消
9. 旧存档加载后皮肤系统正常初始化为默认值，不崩溃
10. 皮肤和主题切换不影响任何游戏数值（纯视觉验证）
11. 主题切换有 0.2s 过渡动画，不突兀

---

*文档结束*
