# 《无限数域》v2.0 — 移动端布局二次精修方案（v2）

- **文档类型**：UX / 布局精修方案（**仅方案，不修改任何 `.vue` / `.ts` / `.css` 源码**；实现由工程侧落地）
- **范围**：移动端（Capacitor APK，`window.innerWidth < 768`）纵向布局；桌面三栏布局不受影响
- **对应反馈**：手机实测（v1 已 commit+push、已装 APK）——“下半部分操作界面还是太紧凑”，上一轮优化没到位，需二次精修
- **约束基线**：复用现有 `--spacing-*` / `--color-*` / `--border-radius` 变量；不新增/臆造变量；不引入新依赖；不改游戏逻辑/状态/存档；触控目标 ≥ 44px；Sprint 4 `[data-theme]` 主题切换不受影响
- **配套文档**：`design/ux/mobile-layout-optimization.md`（v1 方案，本方案在其基础上二次精修）

---

## A. 根因诊断（v2 二次审计，逐条用行号坐实）

> 结论前置：v1 把"下半太紧凑"归因于**单卡密度过高**（小字号/小 padding/触控不达标）并只做了"子组件零改动 + `:deep` 覆盖"，但**漏了三件事**：① 2 列阈值从未触发；② `LeftPanel` 在移动端被自己的宽度断点压成 160px；③ 子组件内部 `@media` 与 `:deep` 双源冲突未根治。三者叠加 → 下半仍紧凑。

### A.1 根因①：2 列网格阈值过高，绝大多数手机永远是单列

- `src/App.vue:462` — `@media (min-width: 420px) { .app-main-mobile :deep(.left-panel__list), .app-main-mobile :deep(.right-panel__list) { grid-template-columns: repeat(2, 1fr); } }`
- 手机 CSS 宽度主流为 **360–393px**（iPhone SE/12/13/14 ≈ 375/390，常见 Android ≈ 360/393，Pro Max ≈ 430）。`isMobile = window.innerWidth < 768`（`App.vue:216`），故 360–414 全属移动端，但 **`< 420px` → 该内层媒体查询不命中 → 网格停在 `grid-template-columns: 1fr`（单行）**（`App.vue:453-458`）。
- 后果：生产者（常 10+ 张）与升级列表在**密集单列**里竖向铺开 → 滚动行数翻倍、整体密度高、单手滚动成本高。这是"紧凑感"的主因之一。

### A.2 根因②：移动端 spacing 下限被压到 4–8px（且真实代码用的是 `max-height` 而非 `max-width`）

- `src/styles/variables.css:39-42` 基准：`--spacing-xs:4px; --spacing-sm:8px; --spacing-md:16px; --spacing-lg:24px`
- `src/styles/variables.css:49-63` 两个**低高度**媒体查询（注意：是 `max-height`，不是 `max-width`）：
  - `:root { --spacing-lg:16px; --spacing-md:12px; }`（高度 ≤850px）
  - `:root { --spacing-lg:12px; --spacing-md:8px; --spacing-sm:6px; }`（高度 ≤700px）
- **关键校正（与口头描述不一致）**：真实代码按**视口高度**压间距，不是按宽度。手机**竖屏**高度通常 ~800px → 只命中 `≤850px` 那条 → `--spacing-md=12px`、`--spacing-sm=8px`、`--spacing-xs=4px`；只有**横屏/矮屏**（高度 <700px）才会降到 `--spacing-sm=6px`。所以"6px"只在横屏出现，竖屏实际是 8px/4px 这一档。
- `App.vue` 的 `:deep` 块在手机上引用的是这套被压低的变量：`App.vue:450 .mobile-panel{padding:var(--spacing-sm)}`（8px）、`App.vue:457` 列表 `gap:var(--spacing-sm)`（8px）、`App.vue:482/495/500` 卡片 `gap:var(--spacing-xs)`（**4px**）、`App.vue:423 .mobile-status{gap:var(--spacing-xs)}`（**4px**）、卡片 `padding:var(--spacing-sm)`（8px）。
- 后果：面板内边距仅 8px、卡片间/卡片内间隙 4px、状态条间隙 4px → 视觉拥挤、文字贴边。这才是"紧凑"的直接观感来源（与"窄屏"表述无关，本质是**移动端用了过小的基准变量**）。

### A.3 根因③：子组件内部 `@media` 与 `:deep` 双源冲突（"子组件零改动"约束是冲突根源）

- `src/components/game/ProducerCard.vue:162-170` 残留 `@media (max-width: 767px)`：把 `.producer-card{padding:4px 5px; gap:2px}`、名字 11px、body 10px、批量按钮 9px、购买按钮 10px，并 `display:none` 掉"产出/成本"标签。
- `src/components/game/FactorCard.vue:227-233` 残留 `@media (max-width: 767px)`：把 `.factor-card{padding:5px 8px; gap:2px}`、名字/描述/效果值/等级压到 9–11px、描述 `-webkit-line-clamp:1`。
- v1 只在 `App.vue` 用 `:deep` **部分**覆盖了这些属性（padding/gap/字号/buy-btn 高度），但**没覆盖全**：如 `.producer-card__body` 的 `gap:4px`（`:deep` 只改了字号没改 gap）、`.producer-card__bulk-btn` 的 `padding:1px 6px`（`:deep` 没改 padding）、`.producer-card__buy-btn` 的 `padding:2px 0`（`:deep` 没改）→ 子组件内部规则在 `:deep` 未触达处**继续生效**，9–10px 下限与 2px 间隙仍部分泄漏。
- 后果：**两处都在管移动端**、双源不可维护、下限被内部 `@media` 拉回。根因正是 v1 的"子组件零改动"约束。

### A.4 根因④（v1 漏判，本次新增）：面板在移动端未全宽 + `RightPanel` 自带 `@media` 是关键依赖

- `src/components/layout/LeftPanel.vue:60-62` `@media (max-width: 900px) { .left-panel { max-width: 160px; min-width: 110px; } }` —— 该断点按**宽度**，手机 390px < 900px → **命中** → `LeftPanel` 在移动端被压到 **160px 宽**。
  - v1 方案 §3.4 误判为"LeftPanel 移动端同样套网格即可"，**漏了宽度修复**。结果：生产 tab 里生产者面板只有 160px、右侧大片留白；若再开 2 列 → 每卡仅 ~75px，**直接报废**。
- `src/components/layout/RightPanel.vue:396-406` 自带 `@media (max-width: 767px) { .right-panel { max-width:100%; min-width:0; width:100%; ... } }` —— 这是**当前让 `RightPanel` 在移动端全宽的唯一来源**。`App.vue` 的 `:deep` **从未**设置 `.right-panel` 宽度。
  - 这构成**第三个**内部 `@media` 块（口头描述只点了 ProducerCard/FactorCard，但 `RightPanel` 也有）。若按"清理子组件 `@media`"思路删掉它，**必须**在 `:deep` 里补回 `.right-panel` 全宽覆盖，否则 `RightPanel` 会回退到基准 `max-width:280px` → 升级 tab 变窄、右侧留白。

### A.5 根因⑤（v1 漏判）：紧凑列表的"买"按钮触控不达标

- `src/components/layout/RightPanel.vue:350-353` `.upgrade-mini__btn { padding:1px 10px; font-size:10px }` —— **无 `min-height`**，实际高度 ~20px，远低于 44px。暗能量/元升级（`.right-panel__list--compact` 内）的"买"按钮属可交互控件，违反 ≥44px 约束。FactorCard 本身无按钮（纯展示），不受影响。

---

## B. v2 核心决策（聚焦"主流手机下半区密度明显下降、可舒适单手滚动 + 点击"）

> 全部为具体数值，落地时直接照抄 §C 代码片段即可。

### B.1 2 列网格阈值 → **移动端默认 2 列，删掉 420px 门槛**

- **推荐值**：在 `@media (max-width: 767px)` 内**直接对所有移动宽度用 2 列**；仅对 **≤340px 超窄屏**回退单列。
- **理由**：
  - 360px 是**最常见**的手机 CSS 宽（iPhone SE / 大量 Android 均为 360–393）。若阈值设为 `>360` 才 2 列（口头方案选项 b），则**最主流的 360px 仍走单列 → 修复对多数人失效**。
  - 删掉 420px 门槛后，360–414px 全走 2 列：生产者列表行数减半（10+ → 5–6 行），滚动长度骤降，"密度下降 + 单手舒适滚动"直接达成。
  - 2 列卡片宽度核算（面板 padding 取 `--spacing-md`≈14px、网格 gap 取 `--spacing-md`≈14px）：`卡宽 = (W − 28 − 14) / 2` → 360px 时 **159px**、390px 时 **174px**、414px 时 **186px**。ProducerCard 竖向堆叠（header/body/action）在此宽度可读；若 360px 下 body 的"产出/成本"并排挤压，加 `.producer-card__body{flex-wrap:wrap}`（纯 CSS，见 §C.2）即可换行，无需改 DOM。
- **保持单列**：`--compact` 列表（数字分解因子 / 暗能量 / 元升级）、科技树 `TechTreeGraph`（`right-panel__section--tech`）——图结构/窄卡不宜 2 列。

### B.2 间距下限 → 不再用 `--spacing-xs`(4px)；面板/列表用 `--spacing-md`，卡片内用 `--spacing-sm`

- **面板 `padding`（`.mobile-panel`）**：`var(--spacing-md)`（竖屏 14px / 基准 16px）→ **≥14px**（原 8px）。
- **列表 `gap`（`.left-panel__list` / `.right-panel__list`）**：`var(--spacing-md)`（≥14px，原 8px）。
- **卡片 `padding`（producer/upgrade/factor）**：`var(--spacing-sm)`（8px，原 4–8px）。
- **卡片内部 `gap`（header/body/action 之间）**：`var(--spacing-sm)`（8px，原 2–4px）。
- **状态条 `.mobile-status` 内部 `gap`**：`var(--spacing-sm)`（8px，原 4px）。
- **移动端禁止引用 `--spacing-xs`(4px)**：4px 仅保留给桌面发丝级间隙。
- **是否改 `variables.css`**：**改**，但只"抬高下限"，不碰 `:root` 基准、不动桌面三栏。
  - `variables.css:50-54`（≤850px）：`--spacing-md: 14px`（原 12px）；`--spacing-lg:16px` 不变。
  - `variables.css:57-63`（≤700px，横屏/矮笔记本）：`--spacing-md: 12px`（原 8px）、`--spacing-sm: 8px`（原 6px）、`--spacing-lg:12px` 不变。
  - 效果：竖屏面板/列表间隙 = 14px、卡片内 = 8px；横屏/矮屏面板/列表 = 12px、卡片内 = 8px。**全部 ≥8px，列表/面板 ≥12px**，满足"≥8–10px"下限且对短屏安全。

### B.3 字号下限 → 主文字/按钮 ≥13px，次要文字 ≥12px，杜绝 9–10px

| 元素 | v1/现状 | v2 下限 |
|---|---|---|
| 卡片主名（producer/upgrade/factor `__name`） | 11–12px | **13px** |
| 卡片次要（body / cost / desc / level / effect-value） | 9–11px | **12px** |
| 按钮文字（buy / bulk / upgrade-mini__btn） | 10–11px | **12–13px** |
| `.mobile-status` 值/标签 | 13px / 12px | 保持 13px / 12px（已达标） |

- 删除 ProducerCard/FactorCard 内部 `@media` 后，9–11px 来源消失；由 `:deep` 统一给到 12–13px。

### B.4 清理子组件内部 `@media` 冲突 → **推荐方案 X（删除内部 `@media`，统一收口到 `App.vue` 的 `:deep`）**

- **推荐方案 X**：删除 `ProducerCard.vue:162-170`、`FactorCard.vue:227-233`、`RightPanel.vue:396-406` 三处 `@media (max-width: 767px)` 块；所有移动端样式**唯一来源**收口到 `App.vue` 的 `:deep`。
  - **理由**：① 从根本消除"两处都管移动端"的双源冲突与不可维护；② 子组件内部 9–10px/2px 下限被彻底移除；③ 与"子组件零改动"约束解耦——改为"子组件只留桌面/默认样式 + 移动端一律由 `:deep` 收口"，单一事实源；④ 符合主理人倾向，且让 `:deep` 特异性风险自然下降（不再有同级内部 `@media` 抢属性）。
  - **关键依赖（必做）**：删除 `RightPanel.vue:396-406` 后，必须在其 `:deep` 补回 `.right-panel{max-width:100%; min-width:0; width:100%}`；同时新增 `.left-panel` 的同等 `:deep`（v1 漏判的 160px 问题）。否则两个面板在移动端都会变窄/留白。
- **方案 Y（坚持零改动，不推荐）**：`:deep` 必须**全量覆盖**子组件内部 `@media` 涉及的**每一个**属性（含 `.producer-card__body` 的 `gap`、`.producer-card__bulk-btn` 的 `padding`、`buy-btn` 的 `padding`、各类 `font-size`、`display` 等），不留缝隙。可行性低、易漏、长期不可维护，故不推荐。

### B.5 触控目标 → 所有可交互控件 `min-height/min-width ≥ 44px`

- 已有达标：购买按钮、批量 `×N`、标签、底栏图标、熵值消耗按钮（均已在 v1 `:deep` 设 44px）。
- **新增达标**：`.upgrade-mini__btn`（暗能量/元"买"按钮）补 `min-height:44px; font-size:12px`（原无 min-height → ~20px）。
- ProducerCard 在 2 列下仍保持 `buy-btn`/`bulk-btn` ≥44px（`:deep` 已覆盖，§C.2 保留）。

### B.6 科技树 / FactorCard → 保持单列

- `.right-panel__list--compact`（数字分解因子、暗能量、元升级）与 `.right-panel__section--tech`（科技树）显式 `grid-template-columns: 1fr`。

### B.7 不大于上（约束红线，落地时逐条自检）

- 复用现有 `--spacing-*` / `--color-*` / `--border-radius`，**不新增任何变量名**、不引依赖。
- 不改游戏逻辑 / 状态 / 存档 / 自动保存 / 离线收益。
- 桌面三栏（`.app-main` → `LeftPanel`/`CenterPanel`/`RightPanel`）**零变化**（所有改动限 `@media (max-width:767px)` + `.app-main-mobile` 作用域）。
- Sprint 4 五套 `[data-theme]` 主题切换照常级联：**移动端 CSS 严禁硬编码 hex**，颜色一律 `var(--color-*)`（含进度条 `:color` 绑定）。
- 仅原生 CSS Grid / `position:sticky` / `overflow` / Vue `:deep()`，零新包。

---

## C. 组件级 before → after（纯 CSS，优先不改 DOM）

> 所有 `:deep` 选择器带 `.app-main-mobile` 前缀（编译为 `.app-main-mobile[data-v-app] .x`，特异性 `(0,3,0)`，压过子组件 `.x[data-v-child]` 的 `(0,2,0)`）。

### C.1 `App.vue` 的 `:deep` 块（移动端网格/宽度/间距/卡片）—— 重点改写区

**before（`App.vue:450-502` 节选）**
```css
.mobile-panel { padding: var(--spacing-sm); }                 /* 8px */
.app-main-mobile :deep(.left-panel__list),
.app-main-mobile :deep(.right-panel__list) {
  display: grid; grid-template-columns: 1fr; gap: var(--spacing-sm);   /* 8px */
}
@media (min-width: 420px) {                                   /* ← 360–414 永不命中 */
  .app-main-mobile :deep(.left-panel__list),
  .app-main-mobile :deep(.right-panel__list) { grid-template-columns: repeat(2, 1fr); }
}
.app-main-mobile :deep(.right-panel__list--compact) { grid-template-columns: 1fr; }
.app-main-mobile :deep(.producer-card) { padding: var(--spacing-sm); gap: var(--spacing-xs); } /* gap 4px */
.app-main-mobile :deep(.producer-card__name) { font-size: 12px; }
.app-main-mobile :deep(.producer-card__body) { font-size: 11px; }   /* gap 未覆盖 */
.app-main-mobile :deep(.producer-card__bulk-btn) { min-height:44px; min-width:44px; font-size:11px; } /* padding 未覆盖 */
.app-main-mobile :deep(.upgrade-card) { padding: var(--spacing-sm) var(--spacing-md); gap: var(--spacing-xs); }
.app-main-mobile :deep(.factor-card) { padding: var(--spacing-sm); gap: var(--spacing-xs); }  /* gap 4px */
.app-main-mobile :deep(.factor-card__desc) { font-size: 11px; line-height: 1.4; }
.mobile-status { gap: var(--spacing-xs); }                    /* 4px */
```

**after（替换上述节选，含面板全宽 + 2 列默认 + 抬高间距 + 补齐字体/触控）**
```css
/* 下半面板：padding 抬到 --spacing-md（≥14px，原 8px） */
.mobile-panel { padding: var(--spacing-md); }

/* 面板在移动端必须全宽（替代 RightPanel/LeftPanel 各自移动端 width 规则；删 RightPanel.vue:396-406 后此条为唯一来源） */
.app-main-mobile :deep(.left-panel),
.app-main-mobile :deep(.right-panel) {
  max-width: 100%; min-width: 0; width: 100%;
}

/* 卡片网格：移动端默认 2 列（覆盖 360–414px 主流手机）；≤340px 超窄回退单列 */
.app-main-mobile :deep(.left-panel__list),
.app-main-mobile :deep(.right-panel__list) {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);                       /* ≥14px，原 8px */
}
@media (max-width: 340px) {                     /* 超窄屏保底单列 */
  .app-main-mobile :deep(.left-panel__list),
  .app-main-mobile :deep(.right-panel__list) { grid-template-columns: 1fr; }
}
/* 紧凑列表（因子/暗能量/元）与科技树保持单列（图结构/窄卡不宜 2 列） */
.app-main-mobile :deep(.right-panel__list--compact) { grid-template-columns: 1fr; }
.app-main-mobile :deep(.right-panel__section--tech) { grid-template-columns: 1fr; }

/* 吸顶分组标题（保留 v1） */
.app-main-mobile :deep(.right-panel__section-title) {
  position: sticky; top: 0; background: var(--color-surface); z-index: 2;
}

/* ---- ProducerCard：密度 + 触控（内部 @media 已删，此处为唯一来源） ---- */
.app-main-mobile :deep(.producer-card) { padding: var(--spacing-sm); gap: var(--spacing-sm); }  /* 8px/8px，原 8px/4px */
.app-main-mobile :deep(.producer-card__name) { font-size: 13px; }                                /* 原 12px */
.app-main-mobile :deep(.producer-card__body) { font-size: 12px; gap: var(--spacing-sm); flex-wrap: wrap; } /* 原 11px/4px；窄屏允许换行 */
.app-main-mobile :deep(.producer-card__buy-btn) { min-height: 44px; font-size: 13px; border-radius: var(--border-radius); }
.app-main-mobile :deep(.producer-card__bulk-btn) { min-height: 44px; min-width: 44px; font-size: 12px; padding: 0 6px; } /* 补覆盖内部 padding:1px 6px */
.app-main-mobile :deep(.producer-card__output-label),
.app-main-mobile :deep(.producer-card__cost-label) { display: inline; font-size: 12px; }

/* ---- UpgradeCard（本身无内部 @media，干净） ---- */
.app-main-mobile :deep(.upgrade-card) { padding: var(--spacing-sm) var(--spacing-md); gap: var(--spacing-sm); } /* 8/14/8，原 8/16/4 */
.app-main-mobile :deep(.upgrade-card__description) { line-height: 1.5; font-size: 12px; }
.app-main-mobile :deep(.upgrade-card__buy-btn) { min-height: 44px; font-size: 13px; }
/* 紧凑升级（暗能量/元）"买"按钮触控达标（原无 min-height → ~20px） */
.app-main-mobile :deep(.upgrade-mini__btn) { min-height: 44px; font-size: 12px; }

/* ---- FactorCard：保持单列；分类着色/左 border 不动 ---- */
.app-main-mobile :deep(.factor-card) { padding: var(--spacing-sm); gap: var(--spacing-sm); }  /* 8px/8px，原 5–8px/2px */
.app-main-mobile :deep(.factor-card__desc) { font-size: 12px; line-height: 1.4; }            /* 原 9px；允许多行 */
.app-main-mobile :deep(.factor-card__effect-value) { font-size: 12px; }                       /* 原 10px */
.app-main-mobile :deep(.factor-card__level) { font-size: 12px; }                              /* 原 9px */

/* 状态条间隙抬到 --spacing-sm（原 --spacing-xs=4px） */
.mobile-status { gap: var(--spacing-sm); }
```

> `mobile-center` / `mobile-tabs` / `mobile-status` / `bottom-bar` 的其余规则（v1 已落地且本次无回归）**保持不动**；底栏 `gap`（`App.vue:511` 现为 `--spacing-xs`）建议一并抬到 `var(--spacing-sm)`（8px），属可选微调。

### C.2 `ProducerCard.vue` —— 2 列可读性（**优先纯 CSS，不改 DOM**）

- **DOM 现状**（`ProducerCard.vue:2-29`）：竖向 `header(name+level)` → `body(output[label+value] / cost[label+value])` → `action(bulk-btn + buy-btn)`。
- **2 列下是否需重排为横向行式？** **不需要改 DOM**。竖向堆叠在 159–186px 卡宽下完全可读：
  - header 单行（名字 + Lv）：OK；
  - body 用 `justify-content:space-between` + 本次新增 `flex-wrap:wrap` → 360px 窄屏下"成本"自动换到下一行，不截断；
  - action：`bulk-btn`(×N, ~56px) + `buy-btn`(flex:1, ≥100px) 并排，44px 高，舒适。
- **before→after（组件内 `@media` 块）**：
  - **after（方案 X）**：**整段删除 `ProducerCard.vue:161-170` 的 `@media (max-width:767px)`**；移动端样式全部由 §C.1 的 `:deep` 提供。组件内只留存桌面/默认 scoped 样式（含 `:deep` 未覆盖处沿用其默认 12px 名 / 11px body 等，移动端被 `:deep` 13px/12px 覆盖）。
  - （若走方案 Y，则需在该 `@media` 内把 `padding/gap/font-size/display/bulk-btn padding/buy-btn padding` 全部用 `:deep` 再覆盖一遍——不推荐。）

### C.3 `UpgradeCard.vue` —— 已是干净组件，无需改动

- 确认 `UpgradeCard.vue` **无**内部 `@media` 块（全局搜索仅 `scoped` 默认样式）。v2 仅通过 `:deep`（§C.1）统一抬字号/间距/触控，**组件源码零改动**。
- 注意：暗能量/元升级走的是 `RightPanel` 内的 `.upgrade-mini`（非 `UpgradeCard`），其"买"按钮触控补齐见 §C.1 的 `.upgrade-mini__btn`。

### C.4 `FactorCard.vue` —— 删内部 `@media`，单列为唯一布局

- **before→after（组件内 `@media` 块）**：
  - **after（方案 X）**：**删除 `FactorCard.vue:226-233` 的 `@media (max-width:767px)`**（含 `padding:5px 8px; gap:2px`、名字/描述/效果值/等级 9–11px、描述 `-webkit-line-clamp:1`）。
  - 数字分解因子列表属 `.right-panel__list--compact` → 由 §C.1 强制 `grid-template-columns:1fr`（单列），卡宽 = 面板内容宽（~332–360px），宽松可读。
  - 分类着色（左 border `--factor-card--*`）与 category 背景**保持不动**（数值语义编码，勿改）。

### C.5 `LeftPanel.vue` / `RightPanel.vue` —— 补移动端全宽（v1 漏判的关键）

- **LeftPanel**：`LeftPanel.vue:60-62` 的 `@media (max-width:900px){max-width:160px}` 在移动端仍命中 → 必须靠 §C.1 的 `.app-main-mobile :deep(.left-panel){max-width:100%;...}` 压过（特异性胜出）。**组件内无需改**，但工程侧要确认 `:deep` 前缀没漏写。
- **RightPanel**：删除 `RightPanel.vue:396-406` 后，其 `max-width:100%` 来源消失 → 必须靠 §C.1 的 `.app-main-mobile :deep(.right-panel){max-width:100%;...}` 接管，否则升级 tab 回退到 280px 窄栏。**这是方案 X 的硬依赖**。

### C.6 `src/styles/variables.css` —— 抬高下限（只改两处高度查询）

**before（`variables.css:48-63`）**
```css
@media (max-height: 850px) { :root { --spacing-lg: 16px; --spacing-md: 12px; } }
@media (max-height: 700px) { :root { --spacing-lg: 12px; --spacing-md: 8px; --spacing-sm: 6px; } }
```
**after**
```css
/* 中等高度屏幕：缩小间距，但抬高下限（v2） */
@media (max-height: 850px) {
  :root { --spacing-lg: 16px; --spacing-md: 14px; }   /* 原 12px */
}
/* 低高度屏幕（笔记本/横屏手机）：进一步缩小，但保留舒适下限（v2） */
@media (max-height: 700px) {
  :root { --spacing-lg: 12px; --spacing-md: 12px; --spacing-sm: 8px; }  /* md 8→12, sm 6→8 */
}
/* --spacing-xs 保持 4px（仅桌面发丝间隙；移动端禁止引用） */
```
- 桌面三栏不受影响（桌面高度 >850px 时走 `:root` 基准 16/8/4）；短笔记本间距略增，属正向改善，无回归。

---

## D. 验收标准（可量化，实测对照）

1. **2 列触发宽度**：在 360 / 390 / 414px 三档 CSS 宽下，生产 tab 与升级 tab（常规升级/星尘）的卡片列表均为 **2 列**；仅 ≤340px 回退单列。科技树 / 数字分解 / 暗能量 / 元升级列表恒为 **单列**。
2. **触控目标**：移动端所有可交互控件（购买、批量 `×N`、标签、底栏图标、熵值消耗、暗能量/元"买"按钮）实测点击区 `getBoundingClientRect` ≥ **44×44px**。
3. **间距下限**：面板 `padding` ≥ **12px**（目标 14px）；列表 `gap` ≥ **12px**（目标 14px）；卡片内 `gap` ≥ **8px**；状态条 `gap` ≥ **8px**；移动端**无任何 `4px(--spacing-xs)` 间隙**。
4. **字号下限**：卡片主名 / 按钮文字 ≥ **13px**；卡片次要文字 ≥ **12px**；移动端**无 9–10px 文字**。
5. **面板全宽**：生产 tab 的 `LeftPanel` 与升级/科技 tab 的 `RightPanel` 在移动端均为视口全宽（内容宽 ≈ 视口 − 2×面板 padding），**无 160px 窄栏、无右侧留白**。
6. **桌面不回归**：桌面三栏布局像素级不变（截图对比 v1/Sprint 4 基线）；`variables.css` 改动后桌面（高度 >850px）间距与改动前一致。
7. **主题切换不破**：5 套 `[data-theme]`（`theme_deep_space` / `prime_green` / `chaos_orange` / `singularity_white` / `entropy_red`）下，移动端配色/进度条/状态条均随主题正确级联，无硬编码 hex 残留（移动 CSS 全用 `var(--color-*)`）。
8. **内部 `@media` 清零（方案 X 验收）**：`ProducerCard.vue` / `FactorCard.vue` / `RightPanel.vue` 内**不再存在** `@media (max-width: 767px)` 移动端块；移动端视觉事实源唯一位于 `App.vue` 的 `:deep`。

---

## E. 工程落地最容易踩的坑（给 team-lead / 工程侧）

1. **删 `RightPanel.vue:396-406` 后必须补 `:deep` 全宽**：该内部 `@media` 当前是 `RightPanel` 移动端全宽的**唯一来源**；删了却不在 `App.vue` 加 `.app-main-mobile :deep(.right-panel){max-width:100%;width:100%}` → 升级 tab 塌成 280px 窄栏。**这是方案 X 的头号陷阱**。
2. **`LeftPanel` 160px 窄栏（v1 漏判）**：`LeftPanel.vue:60-62` 的 `max-width:900px` 断点在手机上命中，把生产者面板压到 160px。必须加 `.app-main-mobile :deep(.left-panel){max-width:100%...}`，否则 2 列下每卡仅 ~75px 直接报废、或单列时右侧大片留白。
3. **`:deep` 特异性 / 源顺序**：所有覆盖选择器务必带 `.app-main-mobile` 前缀（编译 `(0,3,0)` 压过子组件 `(0,2,0)`）。若某子组件规则带更高特异性或 `!important`，父级 `:deep` 会输——删掉子组件内部 `@media`（方案 X）后此风险自然下降，但遇异常先查是否漏写 `.app-main-mobile` 前缀。
4. **嵌套媒体查询重构**：原 `App.vue` 在 `@media (max-width:767px)` **内**嵌套了 `@media (min-width:420px)`；v2 改为"默认 2 列 + `@media (max-width:340px){1列}`"，避免嵌套、逻辑更直白。重构时别把 340 回退写反。
5. **移动 CSS 严禁硬编码 hex**：任何颜色必须用 `var(--color-*)`，否则绕过 `[data-theme]`、换肤失效（尤其 `entropy_red` 抖动主题最明显）。
6. **2 列文字溢出（360px）**：重点测 ProducerCard 的"产出/成本"在 159px 卡宽下是否并排挤压；已用 `.producer-card__body{flex-wrap:wrap}` 兜底换行。**优先纯 CSS，不要改 DOM**。
7. **`variables.css` 改动范围**：只抬高两处高度查询的下限，**不要动 `:root` 基准**（保留 `--spacing-xs:4px` 给桌面发丝间隙），**不要引入新变量名**；改完在桌面（高度 >850px）与短笔记本（<700px）各截一张确认无回归。
8. **别忘了 `.upgrade-mini__btn`**：暗能量/元升级在 `--compact` 单列里，其"买"按钮原无 `min-height`（~20px），易漏改；必须补 `min-height:44px`（§C.1）。
9. **纪律：别再往子组件塞移动端 `@media`**：方案 X 的核心是"子组件只留默认/桌面样式 + 移动端唯一收口 `App.vue:deep`"。后续若加新卡，移动端样式一律进 `App.vue`，不要回潮到子组件内部。

---

## 附录：涉及文件与行号索引（v2 更新）

| 文件 | 关键行 | 用途 / v2 动作 |
|---|---|---|
| `src/App.vue` | 216-217 | `isMobile = innerWidth < 768`，与 `@media (max-width:767px)` 对齐 |
| `src/App.vue` | 388-522 | 移动端 `:deep` 块（v2 改写 449-502 区段，见 §C.1） |
| `src/App.vue` | 462-467 | 2 列阈值 `min-width:420px`（v2 删除，改默认 2 列 + 340 回退） |
| `src/styles/variables.css` | 39-42 | `--spacing-*` 基准（保留，不改） |
| `src/styles/variables.css` | 49-63 | 两处低高度查询（v2 抬高下限，见 §C.6） |
| `src/components/game/ProducerCard.vue` | 162-170 | 内部 `@media`（方案 X：删除，§C.2） |
| `src/components/game/FactorCard.vue` | 227-233 | 内部 `@media`（方案 X：删除，§C.4） |
| `src/components/game/UpgradeCard.vue` | 全文件 | **无**内部 `@media`，干净，仅被 `:deep` 覆盖 |
| `src/components/layout/LeftPanel.vue` | 60-62 | `max-width:900px` 在移动端命中 → 需 `:deep` 全宽覆盖（§C.5） |
| `src/components/layout/RightPanel.vue` | 396-406 | 内部 `@media`（含 `max-width:100%` 来源；方案 X：删除，改 `:deep` 接管，§C.5） |
| `src/components/layout/RightPanel.vue` | 350-353 | `.upgrade-mini__btn` 无 `min-height`（v2 补 44px，§C.1） |

> 本文档为**方案文档**，未对任何 `.vue` / `.ts` / `.css` 文件做任何写入或修改。实现请按 §C 组件级片段与 §E 避坑清单由工程侧落地。
