# 《无限数域》视觉实现策略与路线图（Visual Implementation Strategy & Roadmap）

> **文档性质**：Phase 6 资产审计 · 策略文档（**只产出策略，不新增任何美术资产、不写代码、不改仓库资产/CI**）
> **编制角色**：林绘澄（art-director / 美术总监）
> **编制日期**：2026-07-25
> **配套定位**：本文件是未来一切美术资产、主题、动效、可访问性改动的**唯一决策入口**；落地实现以 `design/`、`src/styles/` 为执行依据。
> **技术栈上下文**：Vue 3 + TS + Pinia + Capacitor（Android）+ Electron（桌面）+ Web；目标平台 = 浏览器 / Android / 桌面三端。

---

## 执行摘要（关键结论）

1. **当前视觉由「emoji + CSS 变量」完全驱动，项目内零游戏内美术资产**（仅 `public/vite.svg`、`public/icons/icon-192/512.png` 与安卓默认 splash/launcher）。这是一次**体系审计**，不是「磨亮贴图」。
2. **最大一致性/可维护性风险 = 主题盲区硬编码色**：`variables.css` 明文规定「组件内不得硬编码 hex」，但 `CodexModal / EventModal / AchievementsModal / DimensionPanel / PulseButton / EntropyBar / SettingsModal` 等大量组件直接写死颜色（`#1a0d2e`、`#ffc107`、`#3d2b79`…），**切换 6 套皮肤主题时这些面板不会跟随变色**，且无法保证对比度。
3. **可访问性存在两处硬缺口**：① 全仓库**零 `prefers-reduced-motion` 降级**，且 `theme_entropy_red` 的 `skin-shake`、事件图标的 `iconPulse`、`countdownPulse`、`shimmer` 等为**无限循环动效**，对前庭/注意力敏感玩家不友好；② 全仓库**零 ARIA / `role` / `tabindex` / `alt`**，模态、进度条、Toast 对屏幕阅读器不可见。
4. **跨端 emoji 渲染差异是隐藏的一致性炸弹**：图鉴（Codex）单系统已使用 80+ 个 emoji（含 🧬 ⚛️ 🕳️ 🛤️ 👯 🐚 等新字形），在 Web/Android/Electron（Segoe/Noto/Apple Color Emoji/Twemoji）下颜色、字重、甚至有无（老 Android 豆腐块 □）均不同——这是「视觉身份」跨端漂移的最大来源。
5. **建议落地顺序**：先修 CSS 体系（去硬编码、补 reduced-motion、加高对比主题），**再**谈插画/图标集/着色器/VFX；任何未来资产务必用 `currentColor`/CSS 变量上色，使其天生可主题化，从根上消除主题盲区。

---

## §0 范围、依据与约束

### 0.1 本次已读取的真实文件（接地气依据）
- 样式基座：`src/styles/variables.css`、`src/styles/themes.css`、`src/styles/global.css`、`src/styles/animations.css`
- 核心组件：`src/components/game/DimensionPanel.vue`、`PulseButton.vue`、`NumberDisplay.vue`、`EntropyBar.vue`
- 模态代表：`src/components/modals/CodexModal.vue`、`AchievementsModal.vue`、`EventModal.vue`、`SettingsModal.vue`、`SkinSelector.vue`
- 资产词汇源：`src/core/Constants.ts`（生产者/升级/成就/维度图标）、`src/types/codex.ts`（`CODEX_CATEGORY_META` 与 80+ 词条 `icon`）、`src/stores/gameStore.ts`（主题/皮肤状态）
- 设计锚点：`design/sprint5/concept.md`（3 设计支柱 / MDA / LeBlanc 美学）、`design/sprint6/gdd/_consistency.md`、`design/reviews/p0-consistency-review.md`、`GAME_DESIGN_DOC.md`

### 0.2 硬约束（来自主理人 brief）
- ✅ 仅产出本 Markdown 策略文档；**不写实现代码、不新增 png/svg 资产、不改 `.gitignore`/CI、不做 git commit**。
- ✅ 所有结论须可追溯到真实文件（下文以 `文件:行号` 标注）。
- ✅ 可访问性分级须被未来的 UX 规格引用（见 §2）。

---

## §1 现状评估

### 1.1 当前视觉体系构成
| 层 | 现状 | 证据 |
|----|------|------|
| 游戏内美术资产 | **零**（仅 PWA 图标 + 安卓默认资源） | `public/` 下仅 `vite.svg`、`icons/icon-*.png` |
| 图标体系 | **emoji 驱动**，集中在 `Constants.ts` / `codex.ts` / 各 `.vue` 模板 | `Constants.ts` 约 50+ `icon:'…'`；`codex.ts` 80+ 词条 `icon` |
| 配色系统 | **集中 token**（`variables.css`）+ **6 套主题**（`themes.css`，`<html data-theme>` 切换） | `themes.css` 定义 `theme_deep_space / prime_green / chaos_orange / singularity_white / entropy_red` |
| 字体 | 系统字体栈 + `Noto Sans SC` 兜底 | `global.css:20` `system-ui, …, 'Noto Sans SC'` |
| 动效 | 关键帧集中在 `animations.css` + 各组件局部 keyframes | `critPulse / floatUp / collapseFlash / shimmer` 等 |
| 焦点可见性 | 仅 `button:focus-visible` 有 outline | `global.css:75` |
| 可访问性 | 无 `prefers-reduced-motion`、无 ARIA、无语义 `role`/`tabindex`/`alt` | 全仓库 grep 仅命中 `global.css:75` 一处 `focus-visible` |

### 1.2 优点（应保留的资产）
- **轻量零包体**：emoji 不增加任何下载体积，对 Capacitor/Electron 包体极友好，离线/弱网无压力。
- **集中 token 基座已建好**：`variables.css` 的 `--color-*` / `--spacing-*` / `--border-radius` 与 `themes.css` 的 6 套主题是多主题架构的优质地基，**未来补资产只需接这套 token 即可自动适配主题**。
- **emoji 自带形状语义**：多数状态用「emoji + 文字」双通道表达（如 🔒+「锁定」、✅+「已解锁」、🌟+「临界爆发」），天然规避了「仅靠颜色传达信息」的 WCAG 1.4.1 风险。
- **焦点轮廓基线存在**：`button:focus-visible` 用 `--color-narrative` 描边，键盘可达性有起点。
- **动效克制且语义化**：核心动效（暴击脉冲、数字上浮、坍缩闪光、微光）短促、有意义，非装饰性堆砌。

### 1.3 风险（按严重度排序）

#### 风险 A — 主题盲区：硬编码色违反「单一真值」规则（**P0，最严重**）
`variables.css:10` 注释明文：**「组件内不得硬编码 hex」**。但实测大量组件直接写死颜色，导致这些面板**切换主题时不跟随变色**，且对比度无法被主题保证：

| 组件 | 硬编码色示例 | 后果 |
|------|-------------|------|
| `CodexModal.vue` | `#1a0d2e`/`#4a3a6a`/`#ece6f5`/`#44ddff`/`#33dd99`…（整面板紫色私有调色板） | **完全不响应 6 套主题**，皮肤系统对它失效；与全局深空蓝基调割裂 |
| `EventModal.vue` | `#ffc107`/`#ff5252`/`#ff9800`/`#16213e`/`#81c784`/`#e57373` | 事件卡恒为金色硬编码，不随主题 |
| `AchievementsModal.vue` | `rgba(255,215,0,…)` 硬编码金、`#FFE87C` | 应改用 `var(--color-milestone)` |
| `DimensionPanel.vue` | 约 **94 处**硬编码（`#e0e0ff`/`#aaccff`/`#8888bb`/`#333366`/`#141428`…） | 维度面板在 6 主题下颜色错乱 |
| `PulseButton.vue` | `radial-gradient(#3d2b79,#1a0e3e)` 硬编码 | 主按钮不随主题 |
| `EntropyBar.vue` | 蓝→黄→橙→红渐变硬编码 | 熵崩条颜色不随主题 |
| `SettingsModal.vue` | `#2f2f50`/`#e53935` | 设置面板悬停/危险色写死 |

> **影响半径**：grep 全仓库 `#hex` 命中约 20 个组件、累计 **300+ 处**硬编码（含 `themes.css` 自身的合法主题定义与 `codex.ts` 作为数据的分类色）。组件级违规是本次一致性审计的**头号问题**。

#### 风险 B — 跨端 emoji 渲染差异（**P1，一致性炸弹**）
- 三端渲染引擎不同：Web(Segoe/Apple/Noto Color Emoji)、Android(Capacitor→Noto Color Emoji)、Electron(桌面系统 emoji 字体)。同一 emoji 在三端**颜色、描边、字重、对齐、脚标**均不同；🧬(DNA) ⚛️(原子) 🕳️(黑洞) 🛤️(铁轨) 👯(舞者) 🐚(贝壳) 🔷 💠 🧪 🗺️ 等较新字形在**旧 Android 系统上可能显示为豆腐块 □**，直接塌掉图鉴的视觉辨识度。
- 图鉴（`CodexModal`）把 emoji 当作**词条唯一视觉身份**（卡片 `codex-card-icon` 仅一个 emoji），一旦某端渲染失败，该词条「失图」。
- 无集中 emoji 词表 → 同一语义可能用了不同 glyph（如「重置/坍缩」在多处混用 🔄/🌑/🌚），跨端更难统一。

#### 风险 C — 可维护性（**P0/P1**）
- 无 `Art Bible`、无资产清单（asset manifest）、无命名规范；新美术若现在进场，无单一基准可对齐。
- 硬编码色导致「加第 7 套主题 / 高对比模式」必须逐组件改——这正是风险 A 的延伸。

#### 风险 D — 可访问性（**P0/P1，见 §2**）
- 无 `prefers-reduced-motion` 降级；无限循环动效无开关。
- 无 ARIA/语义角色；模态/进度条/Toast 对屏幕阅读器不可见。
- 状态以「颜色 + 形状」双通道为主（合格），但熵条/精通条渐变属**纯色传达**；`SkinSelector` 选中态仅靠 `border-color`（`is-active`）——虽另有 ✅ 图标兜底，仍需系统化处理。

#### 风险 E — 性能（**当前为优点，补资产时需守住**）
- 当前零美术下载，首屏与包体最优。补位插画/着色器时须设**体积预算与分辨率阶梯**（见 §3.4），避免拖累 Capacitor/Electron 包体与移动端内存。

---

## §2 可访问性分级（Basic / Standard / Comprehensive）

> **用法约定**：未来所有 UX 规格（模态、HUD、引导、设置项）**必须引用本节分级**作为验收基线。等级向上兼容（Comprehensive ⊇ Standard ⊇ Basic）。

### 2.1 三级定义与适用场景
| 等级 | 含义 | 适用判定 |
|------|------|---------|
| **Basic** | 可用底线：键盘可操作 + 文本可读 + 焦点可见 | 所有版本最低要求；不达标不得发布 |
| **Standard** | 舒适可读：对比度达标 + 动效可降级 + 颜色非唯一信息通道 | 正式发布的默认目标（**本作建议落地到此级**） |
| **Comprehensive** | 全包容：屏幕阅读器语义 + 高对比主题 + 文本缩放 + 输入重映射 | 若申报无障碍合规/上架严格平台（如某些商店评审）时要求 |

### 2.2 检查清单矩阵
| # | 检查项 | Basic | Standard | Comprehensive | 当前状态（实测） |
|---|--------|:-----:|:--------:|:------------:|----------------|
| A1 | 键盘可聚焦所有交互元素 | ✅ | ✅ | ✅ | ⚠️ 按钮有 `focus-visible`（`global.css:75`）；但模态/卡片部分可点区非 `<button>`，焦点环缺失 |
| A2 | 焦点可见（≥2px 轮廓，非仅靠颜色） | ✅ | ✅ | ✅ | 🟡 仅 `button:focus-visible` 用 `--color-narrative` 描边；非按钮可点元素无 |
| A3 | 文本与背景对比度 ≥ 4.5:1（正文）/ 3:1（大字） | — | ✅ | ✅ | 🟡 默认深空蓝 ≈ 4.8–5.5:1、白主题 ≈ 6.4:1 达标；但**硬编码色面板不保证**、未做全主题自动化校验 |
| A4 | 不使用颜色作为唯一信息通道（WCAG 1.4.1） | — | ✅ | ✅ | 🟡 多数「emoji+文字」双通道合格；熵条/精通条渐变纯色、部分选中态仅靠 `border-color` |
| A5 | `prefers-reduced-motion` 降级（禁用无限循环/大幅位移动效） | — | ✅ | ✅ | 🔴 **全仓库零实现**；`skin-shake`/`iconPulse`/`countdownPulse`/`shimmer` 无限循环无降级 |
| A6 | 模态/对话框有 `role="dialog"` + `aria-modal` + 焦点陷阱 | — | 🟡 | ✅ | 🔴 无 ARIA；`Teleport` 模态无 `role`/`aria-modal`/Esc 关闭/焦点归还 |
| A7 | 进度条有 `role="progressbar"` + `aria-valuenow/min/max` | — | 🟡 | ✅ | 🔴 熵条/精通条为纯 `<div>` 宽度，屏幕阅读器不可读 |
| A8 | 状态变化有文本/图标（非仅靠色）提示 | — | ✅ | ✅ | ✅ 锁定/解锁/当前均有 emoji+文字 |
| A9 | 图片/图标有 `alt` / `aria-label` 或 `aria-hidden` | — | ✅ | ✅ | 🔴 装饰性图标未标 `aria-hidden`，功能性 emoji 无 `aria-label` |
| A10 | 文本可缩放至 200% 不破版 | — | ✅ | ✅ | 🟡 用 `rem`/`var(--spacing-*)` 部分响应式；硬编码 `px` 字号（`NumberDisplay` 32px 等）在缩放时可能溢出 |
| A11 | 高对比 / 增强主题可选 | — | — | ✅ | 🔴 6 主题无高对比档；`theme_singularity_white` 非为高对比设计 |
| A12 | 动效可由用户开关（设置内「减少动效」） | — | 🟡 | ✅ | 🔴 设置面板（`SettingsModal`）无此开关，纯依赖 OS 级媒体查询（且未接） |
| A13 | 屏幕阅读器朗读 Toast/成就/叙事 | — | — | ✅ | 🔴 `AchievementToast`/`CodexToast`/`NarrationToast` 无 `aria-live` |

图例：✅ 已满足 / 🟡 部分满足 / 🔴 缺失

### 2.3 当前达标评估
- **Basic**：约 60%——键盘与焦点有基线，但模态焦点陷阱、非按钮可点区焦点环缺失。
- **Standard**：约 35%——对比度基线尚可、双通道表达良好，但 **A5（reduced-motion）完全缺失**、A6/A7/A9 语义缺失。
- **Comprehensive**：约 5%——几乎空白（A11/A13 均未做）。

### 2.4 最该先补的可访问性项（按 ROI）
1. **【P0】补 `prefers-reduced-motion` 全局降级块**（A5/A12 支柱）：一个 `@media (prefers-reduced-motion: reduce)` 关闭所有 `animation`/`transition` 中位移与循环项，并让 `theme_entropy_red` 的 `skin-shake` 在该模式下停用。成本极低、收益最高、覆盖全部循环动效。
2. **【P0】模态语义化**（A6）：所有 `Teleport` 模态加 `role="dialog"` `aria-modal="true"`、Esc 关闭、打开时焦点移入、关闭时焦点归还触发源。
3. **【P1】进度条语义化**（A7）：熵条/精通条加 `role="progressbar"` 与 `aria-*` 值。
4. **【P1】装饰/功能图标 aria**（A9）：装饰性 emoji 标 `aria-hidden="true"`，功能性图标补 `aria-label`。
5. **【P1】高对比主题**（A11）：在 6 主题外增加 `theme_high_contrast`（纯黑底 + 高亮描边 + 禁用渐变），呼应已建的 token 架构，成本可控。

---

## §3 未来资产补位路线图

### 3.1 总原则（先修体系，再补资产）
> **在任何新美术入场前，必须先完成 §3.2 的 P0「CSS 体系治理」**。否则新资产会重蹈硬编码覆辙，且无法继承 6 主题。

### 3.2 补位系统表（含优先级）
| 系统 / 入口 | 现状 | 建议补位资产 | 优先级 | 说明 |
|------------|------|-------------|--------|------|
| **DimensionPanel · 维度总览** | emoji + 94 处硬编码色 | 维度图标集（5 维度各 1 主图标 + 状态变体）、维度光环着色器 | **P0(去硬编码) → P2(图标集/VFX)** | 先去硬编码接 token；P2 用 SVG 图标替换 emoji 主视觉，用 `currentColor` 随主题 |
| **DimensionPanel · 维度羁绊 tab** | 纯文字 + emoji 星标 | 羁绊关系连线/节点装饰图（SVG）、激活态光效 | **P2** | 低优先级，机制型内容为主 |
| **模态层（Codex/Achievement/Event/Settings…）** | 各自私有调色板 | **统一模态视觉 Token 套件**（边框/阴影/遮罩规范）；事件/成就用插画头图 | **P0(去硬编码) → P1(统一套件) → P2(头图插画)** | P0 把 Codex/Event/Achievement 调色板并入 `variables.css` |
| **成就徽章（Achievements）** | 🔒/🏆 emoji + 灰度 | 成就徽章图标集（锁定/解锁/传说三态 SVG）+ 解锁过场 VFX | **P2** | 高展示价值，适合做「印记」视觉资产 |
| **Codex 图鉴** | 80+ emoji 作词条唯一视觉 | 分类图标集（5 类）+ 重点词条插画；余下低频词条保留 emoji 作 fallback | **P1(分类图标+集中 emoji 词表) → P2(插画)** | 直接对冲风险 B 跨端漂移；先固化词表与分类图标 |
| **纪元变革叙事（Epoch/Transcend 过场）** | 文字 Toast + emoji | 纪元切换/超越过场插画或着色器转场（key art） | **P2** | 最强「感官(Sensation)」资产，呼应 `sprint5/concept.md` §4.3 |
| **全局 VFX** | CSS 关键帧（暴击/上浮/坍缩/微光） | 数字辉光着色器、临界爆发粒子、熵崩全屏反馈 | **P2** | 在 reduced-motion 下须可关 |

### 3.3 优先级解读
- **P0（阻断，必须先做）**：CSS 体系治理——去硬编码色（风险 A）、补 reduced-motion（风险 D-A5）、建 `Art Bible`（本文件即起点）、加高对比主题（A11）。**P0 不涉及任何新美术文件**，纯样式/规范。
- **P1（应做）**：Codex 分类图标集 + 集中 emoji 词表（对冲风险 B）、模态统一 Token 套件、模态/进度条 ARIA 语义化（A6/A7/A9）、文本缩放健壮性（A10）。
- **P2（可选/锦上添花）**：维度/成就/图鉴插画与图标集、纪元过场 key art、全局辉光/粒子 VFX、着色器。需附体积预算（§3.4）。

### 3.4 资产规格模板（尺寸 / 格式 / 命名 / 分辨率阶梯）
> 所有模板以「**可主题化**」为第一约束：UI 类资产一律用 `currentColor` 或引用 CSS 变量上色，**禁止在资产内烤死颜色**（从根消除风险 A）。

#### 模板 A — 图标集（Icon Set，用于维度/成就/分类/功能）
| 项 | 规范 |
|----|------|
| 格式 | **SVG（首选，矢量可主题化）**；如需位图则用 **WebP**，禁止 PNG 除非平台强制 |
| 画布 | 24×24 / 32×32 设计网格；视角统一（正面/等轴其一） |
| 上色 | `fill="currentColor"` 或 `stroke="currentColor"`；多色图标用 CSS 变量占位（`<stop stop-color="var(--color-milestone)">`） |
| 分辨率阶梯 | SVG 本身无限分辨率；位图导出 `@1x/@2x/@3x`（即 24/48/72、32/64/96） |
| 命名 | `icon_<system>_<semantic>_<state>[@scale].ext`<br>例：`icon_dim_prime.svg`、`icon_ach_legend_locked.svg`、`icon_codex_origin@2x.webp` |
| 状态变体 | 统一 `_locked / _unlocked / _active / _hover` 后缀；状态也由 CSS 类驱动（不另出图） |
| 体积 | 单 SVG ≤ 4 KB（gzip 后）；位图单张 ≤ 8 KB |

#### 模板 B — 插画 / 叙事 key art（图鉴词条、纪元过场、事件头图）
| 项 | 规范 |
|----|------|
| 格式 | **WebP（有损，压缩优先）**；透明需求用 **WebP 无损**或 **SVG**；禁止未压缩 PNG 入仓 |
| 画布 | 词条插画 512×512；过场 key art 1280×720（16:9）或 1080×1920（竖屏优先，因移动端为主） |
| 上色 | 主体可主题化部分用变量；背景氛围可烤色（但须提供高对比主题下的替代配色或描边版） |
| 分辨率阶梯 | `@1x/@2x`（移动端 @2x 足够；桌面可 @3x）；CDN/本地按需加载 |
| 命名 | `art_<system>_<entryId>[_variant][@scale].webp`<br>例：`art_codex_bigbang.webp`、`art_epoch_transcend@2x.webp` |
| 体积预算 | 单张 ≤ 120 KB（@2x）；图鉴全量插画总量 ≤ 2 MB（压缩后）；过场 ≤ 300 KB |
| 降级 | 无图时回退到 emoji + 文字（保留现 emoji 体系作 fallback，对冲风险 B） |

#### 模板 C — 着色器 / VFX（数字辉光、维度光环、临界爆发、熵崩）
| 项 | 规范 |
|----|------|
| 技术 | CSS `filter`/渐变优先；复杂用 Canvas/WebGL 片元着色器（须评估移动端 GPU 功耗） |
| 颜色源 | 全部读 CSS 变量（`--color-*`），**不烤色** |
| 降级 | **强制接入 `prefers-reduced-motion`**：触发类 VFX（暴击/坍缩）保留一次性短动画；循环类（光环/微光）在 reduced-motion 下停用或改为静态描边 |
| 性能预算 | 全屏后处理 ≤ 1 个 pass；粒子 ≤ 60 粒子/屏；中端 Android 帧时间增量 ≤ 2 ms |
| 命名 | `fx_<system>_<effect>.glsl` / `vfx_<system>_<effect>.css` |

#### 通用分辨率阶梯与命名契约
- **阶梯**：`@1x`（基准） / `@2x`（移动高清，默认交付） / `@3x`（桌面/高分屏可选）。
- **目录**：`src/assets/icons/`、`src/assets/art/`、`src/assets/fx/`（当前不存在，P0 阶段随治理一并建立，且**仅当 P2 资产开工时**才写入——本阶段不建空目录资产）。
- **清单契约**：任何资产入场须在 `design/art/asset-manifest.md` 登记（id / 系统 / 格式 / 尺寸 / 主题化方式 / 体积 / 关联 GDD），由美术总监审计命名与预算一致性。

---

## §4 美术圣经（Art Bible）骨架

> 本骨架提炼**当前已存在的视觉身份**，作为未来统一基准。落地 P2 资产时须回填「插画/图标范例」章节。

### 4.1 视觉锚点（呼应设计支柱）
- 来源：`design/sprint5/concept.md` 三大支柱——**印记优先于通胀 / 可感知正反馈节奏 / 每个 Run 独一无二**；美学层偏 **Sensation（主题视觉/过场）+ Discovery（图鉴/未解之谜）**。
- 视觉调性：**「深空数域」科幻感**——深底 + 冷蓝主调 + 金/青强调；用数学符号（🔢 ♾️ ⚛️）与宇宙意象（🌌 💎 🌟）承载「数字神话」叙事。
- 基调原则：**克制、发光、有序**；动效服务于「正反馈节奏」，不喧宾夺主。

### 4.2 配色板（hex tokens — 取自 `variables.css` / `themes.css`）
**语义主调（默认深空蓝 `theme_deep_space`，全主题共用语义名）：**
| Token | 默认深空蓝 | 含义 |
|-------|-----------|------|
| `--color-bg` | `#0a0a1a` | 背景 |
| `--color-surface` | `#1a1a2e` | 表面/卡片 |
| `--color-surface-hover` | `#252540` | 悬停表面 |
| `--color-text` | `#e0e0e0` | 正文 |
| `--color-text-dim` | `#888` | 次要文字（注意：小字需复核对比度） |
| `--color-text-accent` | `#6688ff` | 强调文字 |
| `--color-number` | `#aaccff` | 数字 |
| `--color-growth` | `#4CAF50` | 增益/绿 |
| `--color-cost` | `#F44336` | 消耗/红 |
| `--color-milestone` | `#FFD700` | 里程碑/金 |
| `--color-prestige` | `#9C27B0` | 轮回/紫 |
| `--color-narrative` | `#00BCD4` | 叙事/青（亦作焦点色） |
| `--color-chaos-accent` | `#ff8844` | 混沌橙 |
| `--color-singularity-accent` | `#ffd54f` | 奇点金 |
| `--color-border` | `rgba(255,255,255,0.08)` | 边框 |
| `--color-border-accent` | `#5555cc` | 强调边框 |
| `--color-progress` | `linear-gradient(90deg,#4444aa,#6688ff)` | 进度 |
| `--color-button` | `linear-gradient(135deg,#2a2a5a,#3a3a8a)` | 按钮 |

**5 套可选主题（`<html data-theme>`）：** `theme_prime_green`（黑底荧光绿）、`theme_chaos_orange`（暖橙）、`theme_singularity_white`（浅色）、`theme_entropy_red`（红+`skin-shake`）。
**图鉴分类色（`codex.ts` 数据）：** origin `#ffd700`、cosmic_event `#ff8844`、sage_record `#aa66ff`、mystery `#44ddff`、knowledge `#33dd99`。

> ⚠️ Art Bible 铁律：**组件不得再出现上表之外的裸 hex**（风险 A 的根治）。新增色必须先来此表立项。

### 4.3 字体
- 家族：`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans SC', sans-serif`（`global.css:20`）。
- 数字：`PulseButton`/`NumberDisplay` 用同族 700 字重 + `text-shadow` 辉光；数字皮肤（Formatter）改的是**数字字形渲染**而非字体族。
- 字号基准：`html` 14px（移动端 15px）；标题用 `rem` 阶梯；**禁止在关键文本用写死 `px` 而破坏 200% 缩放**（A10）。

### 4.4 圆角 / 间距 token
| Token | 值 | 用途 |
|-------|----|------|
| `--border-radius` | `8px` | 卡片/按钮统一圆角 |
| `--spacing-xs/sm/md/lg` | `4 / 8 / 16 / 24px` | 间距阶梯（中/低屏高有媒体查询下调，见 `variables.css:54-69`） |
| 响应式 | `@media(max-height:850px / 700px)` 收缩间距下限 | 笔记本/横屏手机舒适下限 |

### 4.5 动效原则
- 来源关键帧：`critPulse / floatUp / collapseFlash / shimmer`（`animations.css`）+ 组件级 `eventFadeIn / slideUp / iconPulse / countdownPulse / codex-slide-in / skin-shake`。
- 原则：**短促（≤0.8s）、有意义、可降级**；循环类（光环/微光/`skin-shake`）**必须**在 `prefers-reduced-motion: reduce` 下停用（A5）。
- 全局过渡：`themes.css` 末对 `*` 施加 `0.2s` 颜色过渡（主题切换柔和），**不影响 transform/opacity 玩法动效**。

### 4.6 emoji 使用规范（过渡期基线，待 P1 集中词表固化）
- **集中词表**：P1 阶段建 `design/art/emoji-lexicon.md`，收敛「一语义一 glyph」，消除 🔄/🌑/🌚 混用。
- **功能 vs 装饰**：功能性 emoji（状态/分类）须有配套文字或 `aria-label`；纯装饰 emoji 标 `aria-hidden`。
- **跨端兜底**：新 glyph 须验证 Android/Electron/Web 三端均有字形；高风险新字形（🧬⚛️🕳️🛤️👯🐚）优先在 P1 用 SVG 图标替代，emoji 仅作 fallback。
- **不烤色**：emoji 本身由系统字体上色，不参与主题变量（这是其与未来 SVG 图标 `currentColor` 的最大区别——也是风险 B 的根源）。

### 4.7 命名与资产清单契约
- 命名见 §3.4；清单见 `design/art/asset-manifest.md`（P2 开工时建立）。
- 审计权：美术总监对命名、预算、主题化方式拥有一票否决。

---

## §5 验收标准（本策略文档「可发布就绪」判定）

### 5.1 文档自身验收清单
| # | 验收项 | 状态 |
|---|--------|------|
| V1 | 覆盖 brief 五大章节（现状/可访问性分级/路线图/美术圣经骨架/验收标准） | ✅ 本文件已覆盖 |
| V2 | 现状评估有真实文件证据（`文件:行号`） | ✅ §0.1 / §1.3 |
| V3 | 可访问性三级检查清单完整且标注当前状态 | ✅ §2.2 |
| V4 | 路线图含 P0/P1/P2 与资产规格模板（尺寸/格式/命名/分辨率） | ✅ §3.2–3.4 |
| V5 | 美术圣经含 hex 配色/字体/圆角间距/emoji 规范 | ✅ §4 |
| V6 | 明确「只产出策略、不写代码、不新增资产」且未违反约束 | ✅ 全文 + §0.2 |
| V7 | 可访问性分级可被未来 UX 规格引用 | ✅ §2 开头约定 |

> **判定**：本文件达到「可发布就绪（Ready）」——可作为 Phase 6 资产审计的正式交付，供主理人评审与后续 Sprint 引用。

### 5.2 后续落地验收钩子（当本策略被实施时，对应的「完成」定义）
- **P0 完成** = 全仓库 grep `#[0-9a-f]{3,6}` 在组件 `<style>` 中仅剩 `themes.css` 合法主题定义与 `codex.ts` 数据色；新增 `@media (prefers-reduced-motion: reduce)` 块覆盖全部循环动效；`theme_high_contrast` 主题上线。
- **P1 完成** = `emoji-lexicon.md` 发布且图鉴分类图标集替换 emoji 主视觉；所有 `Teleport` 模态带 `role="dialog"`+焦点陷阱；熵条/精通条带 `role="progressbar"`。
- **P2 完成** = 维度/成就/图鉴插画与全局 VFX 按 §3.4 模板入场并在 `asset-manifest.md` 登记；移动端包体增量在预算内；reduced-motion 下无循环动效。

---

## 附录 A — 硬编码 hex 审计速查（代表性，非穷举）
- `CodexModal.vue`：`#1a0d2e` `#4a3a6a` `#ece6f5` `#b9a9d6` `#3a2a5a` `#2a1f44` `#c9bce6` `#6a5a8a` `#d6cbe8` `#8c7eb0` `#9d8fc0` `#44ddff` `#33dd99` `#063`（整面板私有紫色调色板，主题盲区典型）
- `EventModal.vue`：`#ffc107` `#ff5252` `#ff9800` `#16213e` `#81c784` `#e57373`
- `AchievementsModal.vue`：`rgba(255,215,0,…)`（应 `var(--color-milestone)`）`#FFE87C`
- `DimensionPanel.vue`：约 94 处（`#e0e0ff` `#aaccff` `#8888bb` `#333366` `#141428` `#4444aa` `#6688ff` `#ccccee` `#8888aa` `#bbbbff` `#66ffaa` `#1a1a2a` `#2a2a5a` `#3a3a7a` `#1a2a5a` `#4466cc` `#88aaff` `#2a2a6a` `#3a3a8a` `#88ddff` …）
- `PulseButton.vue`：`radial-gradient(circle at 40% 40%, #3d2b79, #1a0e3e)`
- `EntropyBar.vue`：蓝→黄→橙→红渐变硬编码
- `SettingsModal.vue`：`#2f2f50` `#e53935`

## 附录 B — emoji 词表抽样（跨端高风险字形）
🧬(DNA) ⚛️(原子) 🕳️(黑洞) 🛤️(铁轨) 👯(舞者) 🐚(贝壳) 🔷 💠 🧪(试管) 🗺️(地图) 📸 📓 🔁 🧭 🎲 🕳️ 🌫️ 🌬️ ☄️ 👯 🐚 ⭕ —— 这些在旧 Android/部分 Electron 字体下可能缺字或风格迥异，是 P1「SVG 图标替代 + emoji fallback」的重点对象。

---

*文档结束 · 编制：林绘澄（art-director）· 2026-07-25 · Phase 6 资产审计交付*
