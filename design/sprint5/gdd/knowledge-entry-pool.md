# 知识点词条池 GDD（Knowledge Entry Pool · Sprint 5）

> **系统代号**：Knowledge
> **优先级**：B·Should
> **版本**：Sprint 5（GDD-1，设计文档）
> **依赖系统**：CodexSystem（既有 `onNarrativeTriggered` 钩子）、Magnitude-Milestone（触发来源，见 `magnitude-milestone.md`）、Codex-Knowledge-UI（呈现，见 `codex-knowledge-ui.md`）
> **设计日期**：2026-07-23
> ⚠️ **本系统为净新增 Codex 第 5 分类 `knowledge`**。

---

## 1. 系统概述

知识点词条池是 Codex 的**第 5 个分类 `knowledge`（数学知识）**，收录**真实数学/物理知识**，按玩家数字到达的 **log10 量级阈值**解锁。解锁路径完全复用既有 `CodexSystem.onNarrativeTriggered(state, text)` 钩子：量级里程碑触发时播出的 `narration` 文本，作为知识词条的 `narrativeTriggers` 匹配键，自动收录对应词条。首批 ~20 条，覆盖 10^6 → 10^308 的真实数量级事实。

---

## 2. 核心机制

### 2.1 解锁方式（复用钩子，零新机制）

- 每个 knowledge 词条定义 `narrativeTriggers: [MAGNITUDE_NARRATION[log10]]`。
- `Magnitude-Milestone` 在跨越量级时调用 `codexSystem.onNarrativeTriggered(state, narration)` → 精确文本匹配 → 自动收录。
- 与既有 origin/cosmic/sage 词条**同机制**，无需新增解锁条件类型。

### 2.2 阈值映射（log10 → 真实事实，首批 20 条）

| log10 | 量级 | 词条 id | 真实知识（摘要） |
|-------|------|---------|------------------|
| 6 | 10⁶ | `know_million` | 百万≈人类头发总数；10⁶ 秒≈11.6 天 |
| 7 | 10⁷ | `know_ten_million` | 千万量级：一台普通服务器日处理请求数级 |
| 8 | 10⁸ | `know_hundred_million` | 亿：中等国家人口级 |
| 9 | 10⁹ | `know_billion` | 十亿≈现全球人口；10⁹ 秒≈31.7 年 |
| 10 | 10¹⁰ | `know_ten_billion` | 百亿：银河系恒星可见数级 |
| 11 | 10¹¹ | `know_hundred_billion` | 千亿：脑神经元数量级(~8.6×10¹⁰) |
| 12 | 10¹² | `know_trillion` | 万亿(1 tera)：硅晶体管年产量级 |
| 15 | 10¹⁵ | `know_peta` | 千万亿(1 peta)：地球蚂蚁总数~10¹⁶ |
| 18 | 10¹⁸ | `know_sand` | 地球所有沙滩沙粒~7.5×10¹⁸（阿基米德《数沙者》） |
| 19 | 10¹⁹ | `know_quintillion` | 百万³：可观测宇宙沙粒古估级 |
| 20 | 10²⁰ | `know_hundred_quintillion` | 百京：银河系质量（太阳质量计）级 |
| 23 | 10²³ | `know_avogadro` | 阿伏伽德罗常数 6.02×10²³（1 摩尔粒子数） |
| 24 | 10²⁴ | `know_stars` | 可观测宇宙恒星数~10²⁴ |
| 26 | 10²⁶ | `know_galaxies` | 可观测宇宙星系数~2×10¹²（星系内恒星叠加）级 |
| 40 | 10⁴⁰ | `know_earth_drops` | 地球海洋水滴总数~10⁴⁶（量级相近） |
| 50 | 10⁵⁰ | `know_no_physical` | 超出可观测宇宙原子数(10⁸⁰)前的最大「无物理意义」刻度 |
| 63 | 10⁶³ | `know_archimedes` | 阿基米德估宇宙沙粒~10⁶³（古代最大数想象） |
| 80 | 10⁸⁰ | `know_atoms` | 可观测宇宙原子总数~10⁸⁰ |
| 100 | 10¹⁰⁰ | `know_googol` | 古戈尔 Googol = 10¹⁰⁰（Google 词源） |
| 308 | 10³⁰⁸ | `know_double_max` | IEEE 754 双精度最大值≈1.8×10³⁰⁸（计算机数字天花板） |

> 数值为数量级近似，用作「到达该刻度即解锁对应真实知识」的叙事锚点；与 `magnitude-milestone.md` 的 `MAGNITUDE_MILESTONE_DEFS` 阈值对齐（子集/超集允许，未列里程碑的 knowledge 词条由相邻里程碑叙事兜底匹配，或后续补全里程碑）。

---

## 3. 数据结构（扩展既有 Codex 类型）

```typescript
// types/codex.ts 扩展
export type CodexCategory =
  | 'origin' | 'cosmic_event' | 'sage_record' | 'mystery'
  | 'knowledge';                       // 新增第 5 分类

export interface CodexEntryDef {
  // …既有字段不变…
  unlockLog10?: number;                // 新增（可选）：用于 UI 显示「量级 e{N}」徽章
}
```

词条定义示例（加入 `CODEX_DEFS`）：

```typescript
{
  id: 'know_avogadro',
  title: '摩尔之海',
  category: 'knowledge',
  icon: '🧪',
  unlockLog10: 23,
  narrativeTriggers: ['一摩尔——阿伏伽德罗数在指尖。'],   // 须与 MAGNITUDE_MILESTONE_DEFS[log10:23].narration 完全一致
  content: [
    '阿伏伽德罗常数约为 6.02×10²³——1 摩尔任何物质所含的微粒数。',
    '它把「宏观可称量的克」与「微观不可数的原子」连了起来，是化学的基石。',
  ],
},
// …其余 19 条同上结构…
```

---

## 4. 与现有系统的交互点

| 系统 | 方式 | 时机 |
|------|------|------|
| **CodexSystem** | `onNarrativeTriggered(state, narration)` 精确匹配 `narrativeTriggers` | 里程碑触发时（见 Milestone GDD） |
| **Magnitude-Milestone** | 提供 `narration` 文本作为匹配键 | 每 tick 量级跨越 |
| **Codex-Knowledge-UI** | 渲染 `knowledge` 分类 Tab 与卡片 | 图鉴打开时 |

---

## 5. UI 规格（详见 `codex-knowledge-ui.md`）

- 第 5 个 Tab「🔢 数学知识」，主题色 `#33dd99`。
- 卡片展示真实知识正文 + 「量级 e{N}」徽章（`unlockLog10`）+ 「真实知识」来源标签。
- 解锁后经既有 CodexToast「📖 图鉴更新」通知。

---

## 6. 边缘情况

1. **量级未达**：词条保持锁定（不显示，与其他非 mystery 分类一致）。
2. **同一叙事匹配多条**：`onNarrativeTriggered` 遍历全部 `CODEX_DEFS`，凡 `narrativeTriggers.includes(text)` 且未收录者全部收录（去重）。
3. **叙事文本不一致**：若 `narration` 与词条 `narrativeTriggers` 不相等，静默忽略 → 须常量联调保证完全一致（本池所有 `narrativeTriggers` 直接引用 `MAGNITUDE_MILESTONE_DEFS` 的同字符串）。
4. **旧存档无 knowledge 分类**：新词条默认未收录，不影响既有 65 条；`CODEX_CATEGORY_META` / `CODEX_CATEGORIES` 扩展后自动计入总进度。
5. **阈值微调**：若里程碑阈值调整，`narrativeTriggers` 须同步；建议代码层用共享常量避免漂移。

---

## 7. 验收标准

1. `CodexCategory` 新增 `'knowledge'`；`CODEX_DEFS` 含 ≥20 条真实知识词条。
2. 每条 knowledge 词条的 `narrativeTriggers` 与 `MAGNITUDE_MILESTONE_DEFS` 对应 `narration` **逐字符一致**。
3. 跨越对应量级时，经 `onNarrativeTriggered` 自动收录该词条（复用既有钩子，无新机制）。
4. 词条正文为真实数学/物理事实，经策划/理科校对。
5. 旧存档加载不崩，新分类默认未收录。

---

*文档结束*
