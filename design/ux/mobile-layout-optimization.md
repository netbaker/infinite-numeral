# 《无限数域》v2.0 — 移动端布局重平衡方案

- **文档类型**：UX / 布局优化方案（仅方案，不修改任何 `.vue` / `.ts` 源码，实现由工程侧落地）
- **范围**：移动端（Capacitor APK，`window.innerWidth < 768`）纵向布局；桌面三栏布局不受影响
- **对应反馈**：手机试玩（Sprint 3 早期版本）——“上半部分数字区太空旷、下半部分操作界面太紧凑”
- **约束基线**：复用现有 `--spacing-*` / `--color-*` / `--border-radius` 变量；不新增/臆造变量；不引入新依赖；不改游戏逻辑/状态；触控目标 ≥ 44px；Sprint 4 `[data-theme]` 主题切换不受影响

---

## 1. 诊断（基于真实代码）

### 1.1 上半“空旷”的成因

移动端骨架（`src/App.vue`）：

```
.app (flex column, height:100dvh)                  App.vue:285-292
├─ .app-main-mobile (flex:1, column)              App.vue:307-311
│   ├─ .mobile-center (flex-shrink:0)            App.vue:312-314  ← 渲染 CenterPanel
│   ├─ .mobile-tabs (flex-shrink:0)              App.vue:315-319
│   └─ .mobile-panel (flex:1; min-height:0; overflow-y:auto)  App.vue:331-334
├─ EffectIndicator (v-if, 流内, 偶发)            App.vue:51-54
└─ BottomBar (footer)                             App.vue:63-77
```

根因逐条：

1. **`.mobile-center` 高度由内容撑开，且 `CenterPanel` 的 `flex:1` 实际失效**。
   `CenterPanel.vue:134-139` 的 `.center-panel{flex:1; min-height:0}` 依赖 flex 父级；但其父 `.mobile-center`（`App.vue:312-314`）只是 `flex-shrink:0` 的普通块，不是 flex 容器 → `flex:1` 无意义，整块高度 = 内容高度（约 300–330px）。在 700px 高的手机上，上半区只占约 45% 且**内部元素集中在顶部**，下方留出大片空白带。
2. **早期游戏“膨胀/超越”按钮整体不渲染，留下死区**。`CenterPanel.vue:16-26` 中 `PrestigeButton`（`v-if="canPrestige"`）、`expand-button`（`v-if="hasTechExpand"`）、`transcend-button`（`v-if="canTranscend"`）在早期全部为 false → `.center-panel__prestige` 容器无子节点、高度趋零，脉冲按钮下方出现无内容的纵向空洞。
3. **`CenterPanel` 用 `align-items:center` + `gap:var(--spacing-sm)` 居中堆叠**（`CenterPanel.vue:134-139`），EpochIndicator（小）、NumberDisplay、120×120 的 PulseButton 之间分布着居中留白，进一步放大“空旷”观感。
4. **上半信息密度过低**。上半区实际只露出：纪元名+叙事（`EpochIndicator.vue`）、当前数字 + `+CPS/秒` + 总计（`NumberDisplay.vue`）、脉冲按钮。玩家最关心的“进度/产出可见性”（自我决定论·胜任感）没有被刻意组织成仪表盘。

### 1.2 下半“紧凑”的成因

下半 `.mobile-panel` 渲染 `LeftPanel`（生产者卡）或 `RightPanel`（升级卡 / 科技卡），卡片密度过高：

| 组件 | 字号 | 内边距 | 关键行 |
|---|---|---|---|
| `ProducerCard` | 10–12px（含 `max-width:767px` 降到 9–11px） | `4–5px`（移动端 `padding:4px 5px; gap:2px`） | `ProducerCard.vue:119, 163-170` |
| `UpgradeCard` | 11–13px | `var(--spacing-sm) var(--spacing-md)` | `UpgradeCard.vue:121, 152-194` |
| `FactorCard` | 9–12px | `5–8px`（移动端 `padding:5px 8px; gap:2px`） | `FactorCard.vue:93, 227-233` |

**触控目标严重不达标**：
- `ProducerCard` 的“购买”按钮 `padding:2px 0; font-size:11px`（`ProducerCard.vue:153-157`）→ 高度约 18–20px，远低于 44px。
- `ProducerCard` 的批量切换 `×N` 按钮 `padding:1px 6px; font-size:9px`（`ProducerCard.vue:166`）→ 约 16px。
- `BottomBar` 的功能图标按钮 `padding:1px 4px; font-size:13px`（`BottomBar.vue:192-195`）→ 约 21px。
- `mobile-tab` 标签 `padding:10px 0` + 13px 字（`App.vue:320-326`）→ 约 37–40px，临界但未达 44px。

### 1.3 底部栏隐性占地（补充）

`BottomBar.vue:181-196` 移动端 `flex-wrap:wrap; gap:4px 6px` + 10 个资源读数 + EntropyBar + 10 个功能图标，会**换行成 2–3 行**，高度可达 80–100px，进一步压缩游戏区，是“上半空/下半挤”被放大的间接因素。

---

## 2. 移动端重平衡总方案

### 2.1 flex 分配与高度策略

保持 `.app-main-mobile` 为 `flex:1` 的纵向 column，对三段做“上半自适应且有界、标签定高、下半占余量”的分配：

| 区 | 策略 | 具体 |
|---|---|---|
| `.mobile-center`（含新增状态条） | 内容自适应 + 上限封顶 | `flex:0 0 auto; max-height:46dvh; overflow-y:auto`；内部用 `justify-content:space-between` 让 hero / 脉冲 / 状态自然铺满，杜绝 >120px 空白带 |
| `.mobile-tabs` | 定高、≥44px 触控 | `flex-shrink:0; min-height:44px` |
| `.mobile-panel` | 占余量、可滚动 | `flex:1; min-height:0; overflow-y:auto`（维持现状） |

> 说明：当前下半已是 `flex:1`，故“下半挤”本质是**单卡密度**问题（见 2.3），不是总高度不足；“上半空”本质是**信息密度 + 居中留白**问题（见 2.2）。本方案不动三段高度占比的大框架，只在各自内部做密度/布局重平衡。

### 2.2 上半区如何填充“空旷感”

**原则**：只聚合**已暴露的数据**，不新增状态/逻辑。

1. **新增「移动状态条 `mobile-status`」**——在 `App.vue` 的 `.mobile-center` 内、`CenterPanel` 之后追加一个展示块（工程侧在 `App.vue` 模板加标记即可）。数据全部来自既有 store 取值：
   - 当前数字 `gameStore.displayNumber`（hero，沿用 `NumberDisplay`）
   - `+{{ displayOutputPerSec }}/秒`（`gameStore.displayOutputPerSec`，CPS，胜任感核心）
   - `总计 {{ displayTotalNumber }}`（`gameStore.displayTotalNumber`）
   - **下一纪元进度**（`gameStore.epochProgress().percent`，纪元即游戏内主线里程碑；复用 `EpochIndicator` 已调用的同一方法，零新增逻辑），用 `ProgressBar` 绑定 `:color="'var(--color-milestone)'"` 渲染。
2. **重排 `CenterPanel` 移动端内部顺序**（纯 CSS `order`，不改模板）：
   纪元条(1) → 大数字 + CPS(2) → 脉冲按钮(3) → **状态条/进度(4，填补脉冲下方死区)**。
   用 `:deep()` 在 `.app-main-mobile` 作用域对 `.center-panel` 子节点设 `order`，并对 `.center-panel` 设 `justify-content:space-between`，让原本“脉冲下方空洞”被状态条接住。
3. **条件性“死区”兜底**：当 `canPrestige/hasTechExpand/canTranscend` 全 false 时，`.center-panel__prestige` 高度为 0，不会留下 120px 空白；同时上一条的状态条已占据脉冲下方空间，视觉上连续。
4. **视觉分隔**：在 `.mobile-center` 与 `.mobile-tabs` 之间加 1px `var(--color-border)` 分隔线（或用 `var(--color-border-strong)` 做更明显的“面板边界”），消除“上下无边界”的失衡感。

> 信息密度上限：上半只放 **4 个指标（当前数 / CPS / 总计 / 纪元进度）+ 脉冲**。避免过载，守住增量游戏心流（flow）。

### 2.3 下半区如何降低“紧凑感”

1. **字号下限**：卡片主文字 ≥ 12px（现 9–11px），描述 ≥ 11px；`ProducerCard` 移动端不再把标签隐藏到只剩数字（保留“产出/成本”可读），或改为图标+主值的可读紧凑式。
2. **内边距**：卡片 `padding` 提到 `var(--spacing-sm)` 级（≥8px），卡片间 `gap` 提到 `var(--spacing-xs)`~`var(--spacing-sm)`（4–8px，现 2–4px）。
3. **触控目标统一 ≥44px**：
   - 购买按钮：设 `min-height:44px`，宽度撑满卡片内可用区（`flex:1`）。
   - 批量切换 `×N` 按钮：`min-height:44px; min-width:44px`。
   - `mobile-tab`：`min-height:44px`（现约 37–40px）。
   - `BottomBar` 功能图标：建议 `min-height:44px; min-width:44px`（见 2.4）。
4. **2 列网格（按屏幕宽度评估）**：
   - 默认（窄屏 `≤419px`）：单列，但每张卡更“高”、更易点。
   - 宽屏/大手机/横屏（`min-width:420px` 或 `orientation:landscape`）：`ProducerCard` / `UpgradeCard` 改为 **2 列 CSS Grid**（`grid-template-columns: repeat(2, 1fr); gap:var(--spacing-sm)`）。手机宽 390–430px CSS 下，2 列每卡约 168–200px，容纳“名称+Lv / 产出 / 成本 / 购买”无截断。
   - 科技树（`mobile-panel--tech`，`TechTreeGraph`）保持单列（图结构不宜 2 列）。
5. **分组吸顶标题**：`RightPanel` 的 `.right-panel__section-title`（常规升级 / 数字分解 / 星尘升级 / …）在移动端设 `position:sticky; top:0; background:var(--color-surface)`，滚动时分组标题吸附，降低“无尽卡片流”的迷失感。

### 2.4 底部栏占地收敛

- 移动端 `BottomBar` 改为**固定紧凑高度**（建议 `height:52px` 或 `min-height:44px; max-height:56px`），内部：资源读数单行横向滚动（或只保留 2–3 个最关键：坍缩/星尘/纪元），功能图标行横向滚动（`overflow-x:auto`）。避免换行成 3 行吃掉游戏区。
- 所有图标按钮 `min-height:44px; min-width:44px`，`gap` 用 `var(--spacing-xs)`。
- 注意：`EntropyBar` 已嵌入底栏，收敛时别把它挤没；可把熵值进度条常驻、把“稳定/回溯/屏障”三个消耗按钮收进一个折叠或保持最小尺寸。

---

## 3. 组件级调整建议（before → after 要点 + CSS 片段）

> **核心实现手法**：所有对子组件（`CenterPanel`/`NumberDisplay`/`PulseButton`/`ProducerCard`/`UpgradeCard`/`FactorCard`/`LeftPanel`/`RightPanel`）的视觉调整，**统一在 `App.vue` 的 `<style scoped>` 内用 `:deep()` 写移动端媒体查询**。原因：`CenterPanel` 等均有 `scoped` 样式，`App.vue` 的 `.app-main-mobile :deep(.x)` 编译为 `.app-main-mobile[data-v-app] .x`，特异性 `(0,3,0)` 高于子组件 `.x[data-v-child]` 的 `(0,2,0)`，**可覆盖且子组件源码零改动、桌面端不受影响**。

### 3.1 `App.vue`（改动集中地）

```css
/* 移动端骨架重平衡 */
@media (max-width: 767px) {
  .app-main-mobile { /* flex:1 column 维持 */ }

  /* 上半：自适应 + 上限封顶，内部铺满 */
  .mobile-center {
    flex: 0 0 auto;
    max-height: 46dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    border-bottom: 1px solid var(--color-border);   /* 视觉分隔 */
  }
  /* 让 CenterPanel 在移动端内部用 order 重排并铺满 */
  .app-main-mobile :deep(.center-panel) {
    flex: 1 1 auto;
    justify-content: space-between;
    padding: var(--spacing-sm);
    gap: var(--spacing-sm);
  }
  .app-main-mobile :deep(.epoch-indicator)      { order: 1; }
  .app-main-mobile :deep(.number-display)       { order: 2; }
  .app-main-mobile :deep(.center-panel__click-area) { order: 3; }
  /* .center-panel__prestige 保持原序，无子时高度0，不占空白 */

  /* 新增状态条（标记写在 App.vue 模板，数据用既有 store 取值） */
  .mobile-status {
    order: 4;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-surface);
    border-top: 1px solid var(--color-border);
    border-radius: var(--border-radius);
  }
  .mobile-status__row { display: flex; justify-content: space-between; align-items: baseline; }
  .mobile-status__label { font-size: 12px; color: var(--color-text-dim); }
  .mobile-status__value { font-size: 13px; font-weight: 600; color: var(--color-text); }
  .mobile-status__value--cps { color: var(--color-growth); }
  .mobile-status__value--total { color: var(--color-number); }
  .mobile-status__progress { width: 100%; }

  /* 标签栏定高、≥44px 触控 */
  .mobile-tabs { min-height: 44px; }
  .mobile-tab { min-height: 44px; display: flex; align-items: center; justify-content: center; }

  /* 下半占余量（维持 flex:1; min-height:0; overflow-y:auto） */
  .mobile-panel { padding: var(--spacing-sm); }

  /* 卡片网格：默认单列；宽屏/横屏 2 列 */
  .app-main-mobile :deep(.left-panel__list),
  .app-main-mobile :deep(.right-panel__list) {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--spacing-sm);
  }
  @media (min-width: 420px) {
    .app-main-mobile :deep(.left-panel__list),
    .app-main-mobile :deep(.right-panel__list) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  /* 科技树保持单列 */
  .app-main-mobile :deep(.right-panel__section--tech) { grid-template-columns: 1fr; }

  /* 吸顶分组标题 */
  .app-main-mobile :deep(.right-panel__section-title) {
    position: sticky;
    top: 0;
    background: var(--color-surface);
    z-index: 2;
  }
}
```

`mobile-status` 在 `App.vue` 模板中的标记（只绑定既有取值，**不新增 computed/状态**；若需 `epochProgress()` 可在 App.vue 用一个读取既有方法的 computed，仍属纯展示）：

```html
<div class="mobile-center">
  <CenterPanel />
  <div class="mobile-status">
    <div class="mobile-status__row">
      <span class="mobile-status__label">每秒产出</span>
      <span class="mobile-status__value mobile-status__value--cps">+{{ gameStore.displayOutputPerSec }}/秒</span>
    </div>
    <div class="mobile-status__row">
      <span class="mobile-status__label">总计</span>
      <span class="mobile-status__value mobile-status__value--total">{{ gameStore.displayTotalNumber }}</span>
    </div>
    <ProgressBar
      class="mobile-status__progress"
      :percent="nextEpochPercent"
      :color="'var(--color-milestone)'"
    />
  </div>
</div>
```

### 3.2 `CenterPanel` / `NumberDisplay` / `PulseButton`（移动端微调，靠 `:deep`）

- **`NumberDisplay`**：hero 数字维持 `32px`（不要缩小，避免“数字区更小”）；但把 `+CPS/秒` 与 `总计` 在状态条里再呈现一次（见 3.1），形成“大数字 + 明细”的仪表盘感。可用 `:deep(.number-display__per-sec){ font-size:13px }` 略收，把视觉权重让给状态条。
- **`PulseButton`**：120×120 在窄屏偏大、四周留白多。移动端可略缩到 `min(104px, 28vw)` 并用 `:deep(.pulse-button){ width:min(104px,28vw); height:min(104px,28vw) }`，居中但仍作为视觉锚点；不要改其渐变/动画（属皮肤与反馈系统，勿动）。
- **`CenterPanel` 移动端**：见 3.1 的 `justify-content:space-between` + `order` 重排，仅布局。

### 3.3 `ProducerCard` / `UpgradeCard` / `FactorCard`（密度 + 触控）

- **`ProducerCard`**（before：`padding:4px 5px; gap:2px; 购买按钮 padding:2px 0 高~18px` → after）：
  ```css
  @media (max-width: 767px) {
    .app-main-mobile :deep(.producer-card) { padding: var(--spacing-sm); gap: var(--spacing-xs); }
    .app-main-mobile :deep(.producer-card__name) { font-size: 12px; }
    .app-main-mobile :deep(.producer-card__body) { font-size: 11px; }
    /* 触控目标 ≥44px */
    .app-main-mobile :deep(.producer-card__buy-btn) {
      min-height: 44px; font-size: 13px; border-radius: var(--border-radius);
    }
    .app-main-mobile :deep(.producer-card__bulk-btn) {
      min-height: 44px; min-width: 44px; font-size: 11px;
    }
    /* 不再隐藏 产出/成本 标签，保证可读 */
    .app-main-mobile :deep(.producer-card__output-label),
    .app-main-mobile :deep(.producer-card__cost-label) { display: inline; font-size: 11px; }
  }
  ```
- **`UpgradeCard`**：`padding` 维持 `var(--spacing-sm) var(--spacing-md)`，购买按钮 `min-height:44px`；描述 `line-height` 略增（`1.5`）。
- **`FactorCard`**：`padding` 提到 `var(--spacing-sm)`；描述 `font-size:11px`；效果值 `font-size:12px`；其余分类着色（左 border / category 背景）**保持不动**（属于数值语义编码，勿改）。

### 3.4 `LeftPanel` / `RightPanel`（吸顶 + 网格）

- 卡片列表网格化见 3.1；`RightPanel` 的 `.right-panel__section-title` 吸顶见 3.1。
- `RightPanel` 移动端本身已是 `width:100%`（`RightPanel.vue:396-403`），无需改；只在其内部列表上套网格 + 吸顶。
- `LeftPanel` 移动端（`app-main-mobile` 内）同样套网格即可。

### 3.5 `BottomBar`（占地收敛 + 触控）

```css
@media (max-width: 767px) {
  .bottom-bar {
    height: auto;
    min-height: 44px;
    max-height: 56px;
    flex-wrap: nowrap;          /* 改为单行横向滚动，避免换行吃空间 */
    overflow-x: auto;
    gap: var(--spacing-xs);
  }
  .bottom-bar__settings-btn {
    min-height: 44px; min-width: 44px;
    font-size: 18px;            /* 图标略大更易识别 */
  }
  /* 资源读数：必要时单行横向滚动而非换行 */
  .bottom-bar__item { white-space: nowrap; }
}
```

---

## 4. 桌面端兼容性备注

- 所有移动端改动均包裹在 `@media (max-width: 767px)` 内，且对子组件的覆盖一律走 `.app-main-mobile :deep(...)` 前缀。**桌面三栏（`.app-main` → `LeftPanel` / `CenterPanel` / `RightPanel`）的样式完全不受影响**。
- `CenterPanel` 桌面端仍是 `.app-main` 中的 `flex:1` 三栏之一；其移动端 `order` / `justify-content` 只在 `.app-main-mobile` 作用域生效。
- `mobile-status` 块只存在于 `.mobile-center` 内，桌面不渲染（桌面用三栏天然信息充足）。
- `RightPanel` / `LeftPanel` 的吸顶与网格只在 `:deep` 移动媒体查询内，桌面列表布局不变。

---

## 5. 约束遵守声明

| 约束 | 遵守方式 |
|---|---|
| 复用 `--spacing-*` / `--color-*` / `--border-radius` | 全文仅使用 `variables.css` 既有变量；**不新增、不臆造任何变量名** |
| 不引入新依赖 | 仅用原生 CSS Grid、`position:sticky`、`overflow`、Vue `:deep()`，零新包 |
| 不改游戏逻辑/状态 | 状态条只绑定既有 `store` 取值（`displayNumber` / `displayOutputPerSec` / `displayTotalNumber` / `epochProgress()`），无新 computed/状态/系统 |
| 触控目标 ≥44px | 购买/批量/标签/底栏图标全部 `min-height/width:44px`（见 3.3 / 3.5） |
| Sprint 4 `[data-theme]` 不破 | 移动端覆盖**只用 `--color-*` 变量**（含进度条 `:color="'var(--color-milestone)'"`），禁止在移动 CSS 中硬编码 hex；故 5 套主题级联照常生效 |
| 桌面三栏不受影响 | 见第 4 节，所有改动限定移动媒体查询 + `.app-main-mobile` 作用域 |

> ⚠️ **潜在隐患（不在本方案范围，提醒工程侧）**：`src/styles/variables.css` 与 `src/styles/themes.css` **两处都定义了 `:root[data-theme=...]` 覆盖块**（且 `prime_green` 的 `--color-text-dim` 取值在两文件不一致：variables.css 为 `#226633`，themes.css 为 `#44dd55`）。本方案不触碰主题文件；但工程侧在 `:deep` 移动覆盖中务必**只用变量**而非硬编码，否则两套主题都无法级联。建议另行排查该重复定义（属 Sprint 4 主题实现的遗留一致性问题）。

---

## 6. 验收标准（可量化）

1. **触控目标**：移动端所有可交互控件（购买、批量切换、标签、底栏图标、熵值消耗按钮）实测点击区域 ≥ 44×44px（用设备审查器量 `getBoundingClientRect`）。
2. **信息密度（上半）**：上半区稳定呈现 ≥ 4 个指标（当前数字、CPS、总计、下一纪元进度）；早期游戏（无膨胀/超越按钮）时脉冲下方**不得出现 >80px 的连续空白带**。
3. **视觉平衡**：`.mobile-center` 与 `.mobile-tabs` 间有可见 1px 分隔；上下两区均“有内容、有边界”，不再出现“上太空 / 下太挤”的主观失衡（由 3 名内部人员盲评通过）。
4. **主题切换不破**：在 5 套主题（`theme_deep_space` / `prime_green` / `chaos_orange` / `singularity_white` / `entropy_red`）下切换，移动端配色、进度条、状态条均随 `[data-theme]` 正确级联，无硬编码色块残留。
5. **桌面回归**：桌面三栏布局像素级不变（截图对比 Sprint 4 基线）。
6. **无逻辑回归**：仅布局/密度变更，游戏数值、存档、自动保存、离线收益等逻辑零改动（单测 + 手测通过）。

---

## 7. 工程落地最容易踩的坑（给 team-lead / 工程侧）

1. **误改子组件 `scoped` 样式**：不要在 `ProducerCard.vue` 等内部加移动端样式去“就地改”，否则桌面端会一并变化、且破坏“子组件零改动”约束。一律在 `App.vue` 用 `:deep()` + 移动媒体查询。
2. **`:deep()` 特异性误判**：若子组件内某规则带更高特异性或 `!important`，父级 `:deep` 可能压不过。本方案选择器已带 `.app-main-mobile[data-v]` 前缀（特异性胜出），但若有异常，优先检查是否漏写 `.app-main-mobile` 前缀。
3. **在移动 CSS 里硬编码颜色**：如写 `background:#1a1a2e` 会绕过 `[data-theme]`，导致换肤失效（尤其 `entropy_red` 抖动主题下最明显）。任何颜色必须用 `var(--color-*)`。
4. **新增状态条时顺手加 computed/改 store**：`mobile-status` 只用既有取值；`epochProgress()` 是 `gameStore` 既有方法，可在 `App.vue` 用一个“仅读取既有方法”的 computed 包一层，**不要**在 `gameStore` 里加字段或改 `stateVersion` 语义。
5. **2 列网格导致卡片文字截断**：`min-width:420px` 才开 2 列；窄屏（≤419px）保持单列，避免 `ProducerCard` 内“产出/成本/购买”挤断行。科技树 `.right-panel__section--tech` 显式单列。
6. **底栏收敛过度**：`BottomBar` 改 `flex-wrap:nowrap + overflow-x:auto` 后，要确认 `EntropyBar`（含三个消耗按钮）仍可见可点，别被 `max-height:56px` 裁掉。
7. **`100dvh` 与移动浏览器地址栏**：`.app` 已用 `height:100dvh`（App.vue:288），`mobile-center` 的 `max-height:46dvh` 同理用 `dvh`，避免 iOS Safari 地址栏伸缩造成跳动。
8. **漏测“早期 vs 后期”两种态**：务必分别验证（a）早期无膨胀/超越按钮时上半无空洞；（b）后期按钮出现时顺序与状态条互不遮挡。

---

## 附录：涉及文件与行号索引

| 文件 | 关键行 | 用途 |
|---|---|---|
| `src/App.vue` | 285-292, 307-335, 320-326 | 移动端骨架、`.mobile-center/tabs/panel`、标签 |
| `src/components/layout/CenterPanel.vue` | 16-26, 134-139 | 条件性 prestige 按钮（死区根因）、居中留白 |
| `src/components/game/NumberDisplay.vue` | 29-47 | hero 数字 / CPS / 总计 |
| `src/components/game/PulseButton.vue` | 50-67 | 120×120 脉冲按钮（移动端可略缩） |
| `src/components/progress/EpochIndicator.vue` | 36-40 | `epochProgress()` 已暴露，状态条复用 |
| `src/components/game/ProducerCard.vue` | 119, 144-159, 163-170 | 密度与触控目标（最不达标） |
| `src/components/game/UpgradeCard.vue` | 121, 152-214 | 升级卡密度 |
| `src/components/game/FactorCard.vue` | 93, 227-233 | 因子卡密度（保持语义色不动） |
| `src/components/layout/LeftPanel.vue` | 48-55 | 列表容器（套网格） |
| `src/components/layout/RightPanel.vue` | 306-333, 396-406 | 分组标题（吸顶）、移动端全宽 |
| `src/components/layout/BottomBar.vue` | 151-196 | 底栏换行占地 + 图标触控 |
| `src/styles/variables.css` | 1-46, 65-205 | `--spacing-*` / `--color-*` / `--border-radius` 契约（须复用） |
| `src/styles/themes.css` | 14-186 | Sprint 4 `[data-theme]` 覆盖块（须不破；与 variables.css 重复，见 §5 提醒） |

> 本文档为**方案文档**，未对任何 `.vue` / `.ts` 文件做任何写入或修改。实现请按第 3 节组件级建议与第 7 节避坑清单由工程侧落地。
