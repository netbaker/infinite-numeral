# Codex 知识分类 UI GDD（Codex Knowledge UI · Sprint 5）

> **系统代号**：Codex-Knowledge-UI
> **优先级**：B·Should
> **版本**：Sprint 5（GDD-1，设计文档）
> **依赖系统**：CodexSystem（既有 `CODEX_CATEGORIES` / `getCategoryCounts` / `onNarrativeTriggered`）、Knowledge-Entry-Pool（数据，见 `knowledge-entry-pool.md`）
> **设计日期**：2026-07-23

---

## 1. 系统概述

在既有 `CodexModal.vue` 中新增**第 5 个分类 Tab「🔢 数学知识」**，呈现 `knowledge-entry-pool.md` 定义的真实知识词条。**最大化复用既有渲染循环**：`CodexModal` 的 Tab 与进度均从 `CODEX_CATEGORIES` + `CODEX_CATEGORY_META` 派生，故只需扩展这两个常量即可自动出现第 5 个 Tab，无需新增交互范式（满足「杜绝认知过载」红线）。

---

## 2. 核心机制

### 2.1 分类注册（最小改动）

```typescript
// CodexSystem.ts
export const CODEX_CATEGORIES: CodexCategory[] =
  ['origin', 'cosmic_event', 'sage_record', 'mystery', 'knowledge']; // 新增 'knowledge'

// types/codex.ts
export const CODEX_CATEGORY_META = {
  // …既有 4 项…
  knowledge: { label: '数学知识', icon: '🔢', color: '#33dd99' },  // 新增
};
```

`CodexModal.vue` 已用 `v-for="cat in CODEX_CATEGORIES"` 渲染 Tab、`getCategoryCounts` 已按分类聚合 → **自动支持第 5 类**，无新模板逻辑。

### 2.2 进度计数泛化（真实改动点）

现有 `CodexModal.totalProgress` 硬编码 4 分类求和（L30-33）。须泛化为遍历 `CODEX_CATEGORIES`：

```typescript
const totalProgress = computed(() => {
  const c = categoryCounts.value;
  let unlocked = 0;
  for (const cat of CODEX_CATEGORIES) unlocked += c[cat].unlocked;
  const all = CODEX_DEFS.length;
  return { unlocked, all, pct: all > 0 ? (unlocked / all) * 100 : 0 };
});
```

### 2.3 知识卡片渲染

knowledge 词条**非 mystery**，遵循「已收录才显示」规则（`isUnlocked(def)` 为真才渲染正常卡片）。卡片额外元素：
- 「量级 e{N}」徽章：读 `def.unlockLog10`（knowledge 词条专有）。
- 「真实知识」来源标签：`meta[def.category].label` 已为「数学知识」。
- NEW 高亮 / 定位高亮：复用 `isNew` / `isHighlight`，与既有逻辑一致。

---

## 3. 数据结构（沿用 + 小扩展）

- `CodexCategory` 增 `'knowledge'`（见 `knowledge-entry-pool.md` §3）。
- `CodexEntryDef.unlockLog10?: number`（新增可选字段，仅 knowledge 词条使用）。
- `CODEX_CATEGORY_META.knowledge`（新增）。
- `CODEX_CATEGORIES` 增 `'knowledge'`。

无新运行时状态（沿用 `GameState.codexEntries`）。

---

## 4. 与现有系统的交互点

| 系统 | 方式 | 时机 |
|------|------|------|
| **CodexSystem** | `CODEX_CATEGORIES` / `getCategoryCounts` / `onNarrativeTriggered` | 渲染 / 解锁 |
| **Knowledge-Entry-Pool** | 提供 `knowledge` 词条数据与 `unlockLog10` | 图鉴打开 |
| **CodexToast** | 知识解锁通知「📖 图鉴更新」 | 里程碑触发 |

---

## 5. UI 规格

```
┌──────────────────────────────────────────────────────┐
│  📖 数字神话图鉴                         [✕ 关闭]    │
├──────────────────────────────────────────────────────┤
│  📖 起源(12/15) ⚡ 宇宙(8/20) 🧬 先贤(10/18)       │
│  ❓ 未解(3/12) 🔢 数学(5/20)                       │
│  总收录：38/85 (44.7%)                                │
├──────────────────────────────────────────────────────┤
│  [📖起源][⚡宇宙][🧬先贤][❓未解][🔢数学]           │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐       │
│  │ 🧪 摩尔之海                    e23 🔖 NEW │       │
│  │ ─────────────────────────────────────── │       │
│  │ 阿伏伽德罗常数约为 6.02×10²³……          │       │
│  │ 收录于：2026-07-23 14:32                 │       │
│  │ 来源：数学知识                           │       │
│  └──────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

- 第 5 Tab 样式与其他 Tab 一致（圆角、主题色边框），仅颜色 `#33dd99`。
- 知识卡片左侧色条用 `meta['knowledge'].color`（沿用 `borderLeftColor` 逻辑）。
- 移动端：沿用既有 `:deep` 收口与 `--color-*` 主题变量（ADR-003），不新增 CSS 变量。

---

## 6. 边缘情况

1. **旧存档无 knowledge 词条**：`codexEntries` 无对应 id → 卡片不显示，分类计数 `(0/20)`，总进度分母含新词条（85）。
2. **知识未解锁（量级未达）**：不显示卡片（与其他非 mystery 一致），Tab 显示 `(0/20)`。
3. **NEW 高亮 24h 窗口**：复用 `CODE_NEW_BADGE_WINDOW_MS`，知识词条同样适用。
4. **定位跳转**：`store.codexHighlightId` 指向 knowledge 词条时，`watch(visible)` 自动切到 `knowledge` 分类（逻辑已按 `def.category` 判断，自动生效）。
5. **总进度泛化后回归**：确保 origin/cosmic/sage/mystery 计数与改造前一致（单测覆盖 `totalProgress`）。

---

## 7. 验收标准

1. `CODEX_CATEGORIES` 含 `'knowledge'`，`CODEX_CATEGORY_META` 含 knowledge 元数据 → 第 5 Tab 自动出现。
2. `totalProgress` 泛化为遍历 `CODEX_CATEGORIES`，含 knowledge 计数，且 4 旧分类行为不变。
3. knowledge 词条已收录时正确渲染卡片 + 「e{N}」徽章 + 「数学知识」来源。
4. 知识解锁经 CodexToast 通知，点击可跳转定位（复用既有 `codexHighlightId`）。
5. NEW 高亮 / 24h 窗口对 knowledge 生效。
6. 旧存档加载不崩，新分类默认未收录、计数正确。

---

*文档结束*
