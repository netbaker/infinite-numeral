# ADR-003: 皮肤主题实现方式

> 状态：已决策
> 日期：2026-07-01
> 决策者：程基岩（engineering-lead）

## 背景

皮肤系统（SkinSystem）包含两类皮肤：
1. **数字皮肤**：改变数字的显示记谱方式（科学记数/工程记数/汉字大数/二进制脉冲）
2. **UI 主题**：改变整体配色方案（深空蓝/质数绿/混沌橙/奇点白/熵崩红）

核心问题是：**UI 主题切换应该用什么技术实现？**

### 现有代码现状

- 项目使用 Vue 3 + TypeScript + Pinia
- 组件使用 `<style scoped>` 风格的 CSS
- 根组件 `App.vue` 包裹全局布局
- gameStore 使用 `markRaw` + `stateVersion` 模式（非标准 Vue 响应式）
- 现有 UI 没有主题切换机制，硬编码为默认深空蓝配色
- CSS 中没有使用 CSS 自定义属性（CSS Variables / `--var`）

### 技术约束

- 主题切换需要在运行时动态生效，不刷新页面
- 主题需要影响全局配色（背景色、文字色、边框色、阴影等）
- 主题切换不能重建组件树（否则丢失游戏状态和 UI 状态）
- Capacitor 移动端和 Electron 桌面端需要一致表现
- 切换性能要求：< 16ms（一帧内完成，避免可感知闪烁）

## 决策

**采用 CSS 自定义属性（CSS Variables）方案**：

1. 在根元素 `:root`（或 `App.vue` 的根容器）上定义 CSS 变量集
2. 每个主题对应一组变量值，通过在根元素上切换 `data-theme` 属性来切换变量集
3. 所有组件的样式引用 CSS 变量而非硬编码颜色

```css
/* App.vue 全局样式 — S4：使用 GDD 命名（--bg-primary 等）；S5：data-theme 值带前缀 */
:root[data-theme="theme_deep_space"] {
  --bg-primary: #0a0a1a;
  --bg-secondary: #141428;
  --text-primary: #e0e0ff;
  --text-accent: #6688ff;
  --border-primary: #333366;
  --number-color: #aaccff;
  --number-glow: rgba(100, 130, 255, 0.3);
  --button-primary: linear-gradient(135deg, #2a2a5a, #3a3a8a);
}

:root[data-theme="theme_prime_green"] {
  --bg-primary: #000000;
  --bg-secondary: #0a0f0a;
  --text-primary: #00ff66;
  --text-accent: #00ff88;
  --border-primary: #114422;
  --number-color: #00ff66;
  --number-glow: rgba(0, 255, 102, 0.4);
  --button-primary: linear-gradient(135deg, #0a1a0a, #0f2a0f);
}

:root[data-theme="theme_entropy_red"] {
  --bg-primary: #1a0808;
  --bg-secondary: #2a1010;
  --text-primary: #ffaaaa;
  --text-accent: #ff4444;
  --border-primary: #4a2020;
  --number-color: #ff6666;
  --number-glow: rgba(255, 68, 68, 0.3);
  --button-primary: linear-gradient(135deg, #2a1010, #3a1818);
}
```

### 数字皮肤的实现

数字皮肤通过 `Formatter.ts` 的 `format()` 函数实现，新增 `skin` 参数：

```typescript
// Formatter.ts
export function format(value: BigNumber, skin?: NumberSkinId): string {
  switch (skin) {
    case 'skin_engineering':
      return formatEngineering(value);
    case 'skin_chinese':
      return formatChinese(value);
    case 'skin_binary':
      return formatBinary(value);
    case 'skin_scientific':
    default:
      return formatScientific(value);  // 现有逻辑
  }
}
```

gameStore 在 `updateDisplayStrings` 中读取当前数字皮肤并传入。

## 类型定义草案（与 GDD 对齐）

> 以下类型定义草案为 ADR-003 的落地规范。数字皮肤与 UI 主题 ID 使用 GDD 带前缀命名（S1）；`NumberSkinDef` 与 `UIThemeDef` 分开定义（S2）；已解锁集合 `unlockedNumberSkins` 与 `unlockedThemes` 分开（S3）；CSS 变量使用 GDD 命名（`--bg-primary` 等，S4）；`data-theme` 属性值带前缀（如 `theme_deep_space`，S5）。

```typescript
/** 数字皮肤 ID — S1：带前缀 */
export type NumberSkinId =
  | 'skin_scientific'   // 科学记数（默认）
  | 'skin_engineering'  // 工程记数
  | 'skin_chinese'      // 汉字大数
  | 'skin_binary';      // 二进制脉冲

/** UI 主题 ID — S1：带前缀 */
export type UIThemeId =
  | 'theme_deep_space'        // 深空蓝（默认）
  | 'theme_prime_green'       // 质数绿
  | 'theme_chaos_orange'      // 混沌橙
  | 'theme_singularity_white' // 奇点白
  | 'theme_entropy_red';      // 熵崩红

/** 数字皮肤静态定义 — S2：独立定义 */
export interface NumberSkinDef {
  id: NumberSkinId;
  name: string;
  description: string;
  icon: string;
  unlockCondition: string;
  unlockCost: { type: 'stardust' | 'singularity' | 'dimension_resource'; amount: number; dimId?: number };
  formatter: 'scientific' | 'engineering' | 'chinese' | 'binary';
}

/** UI 主题静态定义 — S2：独立定义 */
export interface UIThemeDef {
  id: UIThemeId;
  name: string;
  style: string;
  preview: { primary: string; accent: string; bg: string };
  unlockCondition: string;
  unlockCost: { type: 'dimension_resource' | 'singularity' | 'entropy_crystal'; amount: number; dimId?: number };
  cssThemeAttr: string; // 对应 <html data-theme="..."> 的值（S5，带前缀）
}

/** 皮肤系统运行时状态 — S3：已解锁集合分开 */
export interface SkinState {
  activeNumberSkin: NumberSkinId;
  activeTheme: UIThemeId;
  unlockedNumberSkins: Set<NumberSkinId>; // S3
  unlockedThemes: Set<UIThemeId>;         // S3
}
```

## 理由

### 为什么选 CSS Variables 而非动态 class？

1. **性能**：CSS Variables 切换是浏览器原生优化，只需修改一个属性即可触发全局样式重计算。动态 class 方案需要遍历所有受影响的 DOM 节点。实测 CSS Variables 切换 < 1ms，动态 class 方案在 100+ 组件时可能 > 16ms。

2. **组件侵入性低**：CSS Variables 方案下，组件只需将硬编码颜色替换为 `var(--color-xxx)`，不需要添加 `:class="{ theme1: ..., theme2: ... }"` 条件逻辑。组件代码保持声明式。

3. **渐进迁移**：可以先在根元素定义变量，然后逐步将组件中的硬编码颜色替换为变量引用。不需要一次性修改所有组件。

4. **markRaw 兼容**：CSS Variables 通过 DOM API（`element.setAttribute('data-theme', ...)`）操作，不依赖 Vue 响应式系统，与 `markRaw` + `stateVersion` 模式完全兼容。

5. **Capacitor/Electron 兼容**：CSS Variables 是 Web 标准特性，在 WebView 和 Chromium 中原生支持，无需 polyfill。

### 为什么不选 Scoped CSS？

1. **作用域隔离问题**：Scoped CSS 通过 `data-v-xxx` 属性隔离样式，但主题变量是全局共享的。如果用 Scoped CSS，每个组件都需要重复定义主题变量，导致冗余。

2. **动态切换困难**：Scoped CSS 的样式在编译时确定，运行时切换主题需要动态注入新的 style 标签或切换 class，比 CSS Variables 方案复杂。

3. **Deep Selector 限制**：Scoped CSS 使用 `:deep()` 穿透子组件时有性能损耗和选择器优先级问题。

## 后果

### 正面

- 主题切换性能优异（< 1ms）
- 组件代码保持声明式，无主题条件逻辑
- 渐进迁移友好，不阻塞现有组件开发
- 新增主题只需新增一组 CSS 变量定义，不修改组件代码
- 与 markRaw + stateVersion 模式完全兼容

### 负面

- 需要将现有 32 个 Vue 组件中的硬编码颜色逐步替换为 `var(--color-xxx)`
- CSS Variables 不支持 IE11（但项目目标平台为 Capacitor/Electron，不需要 IE 支持）
- 数字皮肤的 Formatter 改造需要修改 `format()` 函数签名，影响所有调用方
- 二进制脉冲皮肤需要 SVG 渲染，无法通过纯 Formatter 实现，需要组件配合
- 主题变量命名需要统一规范，否则容易出现 `--color-bg` vs `--bg-color` 等不一致命名

### 技术约束

- 所有 CSS 变量必须在 `:root` 或根容器上定义，子组件不能重定义（避免优先级冲突）
- `data-theme` 属性设置在 `document.documentElement` 或 `App.vue` 根元素上
- gameStore 需要新增 `setTheme(themeId: string)` action，通过 DOM API 切换
- Formatter 的 `format()` 新增可选参数，默认使用 `'skin_scientific'`，不破坏现有调用方（S1：带前缀 ID）
- 主题切换不需要触发 `bumpVersion()`（因为不通过 Vue 响应式驱动，而是 DOM 直接生效）

## 替代方案

### 方案 B：动态 class 切换

在根元素上添加 `class="theme-prime-green"` 等，通过全局 CSS 覆盖样式。

```css
.theme-prime-green .panel { background: #000; color: #0f0; }
.theme-prime-green .button { background: #003322; }
```

- **优点**：直观，不需要学习 CSS Variables
- **缺点**：①每新增一个组件都要在全局 CSS 中添加对应主题的覆盖样式，维护成本高；②选择器优先级冲突频繁（`scoped` 的 `data-v-xxx` 与全局 class 优先级竞争）；③切换时需要修改 DOM class，触发完整的样式重计算而非仅变量更新
- **否决理由**：选择器优先级冲突在 32 个组件的项目中已经是可预见的维护灾难。CSS Variables 天然避免了这个问题。

### 方案 C：CSS-in-JS（如 vue-styled-components）

通过 JS 动态生成样式，根据当前主题注入不同的 CSS。

- **优点**：类型安全，主题与组件同文件管理
- **缺点**：①引入新依赖（vue-styled-components 或类似库），增加包体积；②运行时生成 CSS 有性能开销；③与现有的 `<style scoped>` 模式不兼容，需要重写所有组件样式；④Capacitor 移动端对 CSS-in-JS 的支持需要验证
- **否决理由**：引入新依赖的迁移成本过高，且与项目现有的简单 CSS 模式不匹配。增量游戏不需要 CSS-in-JS 的动态性。

### 方案 D：Scoped CSS + 主题 mixin

使用 SCSS 的 mixin 功能，在编译时为每个主题生成一份样式。

- **优点**：编译时优化，运行时零开销
- **缺点**：①需要引入 SCSS 预处理器（项目当前使用纯 CSS/PostCSS）；②生成的 CSS 体积随主题数量线性增长（5 主题 = 5 倍样式体积）；③运行时切换主题仍需要 class 或属性切换
- **否决理由**：CSS 体积膨胀 + 运行时仍需切换方案，不比 CSS Variables 更优
