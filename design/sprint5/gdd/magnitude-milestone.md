# 量级里程碑系统 GDD（Magnitude Milestone · Sprint 5）

> **系统代号**：Milestone
> **优先级**：B·Must
> **版本**：Sprint 5（GDD-1，设计文档）
> **依赖系统**：CodexSystem（知识解锁，见 `knowledge-entry-pool.md` / `codex-knowledge-ui.md`）
> **设计日期**：2026-07-23

---

## 1. 系统概述

量级里程碑在玩家数字**首次跨越某数量级（10^N）**时给予**一次性小奖励**并**解锁对应 Codex 知识词条**。叙事触发机制已于 v2.0.0 存在（`NUMBER_MILESTONE_NARRATIVES`，gameStore L731-740，基于 `floor(log10(number))` + `triggeredNumberMilestones` 幂等集），但**当前仅播叙事、不发奖励、不解锁知识**。本 GDD 扩展该触发：**发放非货币的一次性小奖励（维度洞察 / 永久微加成，防通胀，R1 已拍板权威口径），不发放数字印记**，并通过既有 `CodexSystem.onNarrativeTriggered` 钩子解锁知识词条。

---

## 2. 核心机制

### 2.1 触发（复用既有）

每 tick 在 gameStore 现有逻辑处扩展：

```
const logE = floor(log10(state.number));
for (const def of MAGNITUDE_MILESTONE_DEFS) {
  if (def.log10 <= logE && !triggeredNumberMilestones.has(String(def.log10))) {
    triggeredNumberMilestones.add(String(def.log10));
    showNarration(def.narration);                       // 沿用既有叙事
    grantMilestoneReward(def.reward);                   // 新增：一次性非货币奖励（维度洞察/永久微加成），不发放数字印记（R1 已拍板）
    codexSystem.onNarrativeTriggered(state, def.narration); // 新增：解锁知识词条
  }
}
```

`triggeredNumberMilestones` 已是 `Set<string>`，保证**跨 Run 幂等**（每个量级只触发一次）。

### 2.2 里程碑定义表（新增 Constants）

```typescript
export interface MilestoneReward {
  kind: 'dimensionInsight';            // 非货币、非乘区，纯叙事/图鉴洞察（R1 已拍板，防通胀）
  insightId: string;                   // 对应一条维度洞察文案（与 knowledgeEntryId 解耦）
}
export interface MagnitudeMilestoneDef {
  log10: number;                       // 量级阈值，如 10 表示 10^10
  narration: string;                   // 叙事文本（同时作为知识词条匹配键）
  reward: MilestoneReward;             // 非货币奖励，不发放数字印记
  knowledgeEntryId: string;            // 对应 knowledge 词条 id
}
export const MAGNITUDE_MILESTONE_DEFS: MagnitudeMilestoneDef[] = [
  { log10: 6,  narration: '你的数字超越了地球上每一粒沙。',        reward:{kind:'dimensionInsight', insightId:'ins_log6'},  knowledgeEntryId:'know_million' },
  { log10: 9,  narration: '十亿——曾经只有神才能数清的数字。',      reward:{kind:'dimensionInsight', insightId:'ins_log9'},  knowledgeEntryId:'know_billion' },
  { log10: 12, narration: '万亿。文明的总和在此刻度。',            reward:{kind:'dimensionInsight', insightId:'ins_log12'}, knowledgeEntryId:'know_trillion' },
  { log10: 18, narration: '你数清了阿基米德想象过的所有沙。',      reward:{kind:'dimensionInsight', insightId:'ins_log18'}, knowledgeEntryId:'know_sand' },
  { log10: 23, narration: '一摩尔——阿伏伽德罗数在指尖。',          reward:{kind:'dimensionInsight', insightId:'ins_log23'}, knowledgeEntryId:'know_avogadro' },
  { log10: 24, narration: '可观测宇宙的恒星，不过如此。',          reward:{kind:'dimensionInsight', insightId:'ins_log24'}, knowledgeEntryId:'know_stars' },
  { log10: 50, narration: '这个数字没有物理意义——只有数学意义。', reward:{kind:'dimensionInsight', insightId:'ins_log50'}, knowledgeEntryId:'know_no_physical' },
  { log10: 63, narration: '沙者之数——古人想象的字宙之沙。',        reward:{kind:'dimensionInsight', insightId:'ins_log63'}, knowledgeEntryId:'know_archimedes' },
  { log10: 80, narration: '你握住了可观测宇宙的每一个原子。',      reward:{kind:'dimensionInsight', insightId:'ins_log80'}, knowledgeEntryId:'know_atoms' },
  { log10: 100,narration: 'Googol。只存在于数学梦境的数字。',      reward:{kind:'dimensionInsight', insightId:'ins_log100'}, knowledgeEntryId:'know_googol' },
  { log10: 308,narration: '浮点之巅——计算机能表示的最大数字。',    reward:{kind:'dimensionInsight', insightId:'ins_log308'}, knowledgeEntryId:'know_double_max' },
];
```

> **合并建议**：既有 `NUMBER_MILESTONE_NARRATIVES`（key 6/12/20/30/50/100）应并入上表，避免两套并行叙事漂移；若保留旧表，须保证 `narration` 文本与知识词条的 `narrativeTriggers` 完全一致。

### 2.3 奖励（非货币、有界、一次性，防通胀）

- 每首次跨越量级 → 发放**一次性非货币奖励（维度洞察，见 §2.2 `insightId`）**，**不发放数字印记**（防通胀，R1 已拍板权威口径）。
- 数字印记载源严格限定 = 5 里程碑超越（第 5/10/25/50/100 次 Transcend）+ 9 档案成就首解 = **全周期上限 14 枚**（与量级里程碑完全脱钩，见 `numeral-persona.md` §2.3）。
- **禁止**发放永久生产乘数 / 永久倍率（违反支柱①）；维度洞察为纯叙事/图鉴类，不进 `effMult`。

---

## 3. 数据结构

- `MAGNITUDE_MILESTONE_DEFS`：新增于 `src/core/Constants.ts`（见 §2.2）。
- `triggeredNumberMilestones`：`Set<string>`，已存在于 `gameStore`（主存档序列化，无需改）。
- `numeralImprints`：**本系统不发放数字印记**（R1 已拍板）；该元货币由 `numeral-persona.md` §3 定义，仅来源 = 5 里程碑超越 + 9 档案成就首解（上限 14 枚）。

---

## 4. 与现有系统的交互点

| 系统 | 方式 | 时机 |
|------|------|------|
| **CodexSystem** | `onNarrativeTriggered(state, narration)` | 里程碑触发时（解锁 knowledge 词条） |
| **Numeral-Persona** | **无直接交互**：量级里程碑不发放数字印记（R1 已拍板）；印记载源见 `numeral-persona.md` §2.3 | — |
| **gameStore** | 扩展既有 `NUMBER_MILESTONE_NARRATIVES` 块 | 每 tick 数字更新后 |

---

## 5. UI 规格

- 叙事 toast 沿用既有 `narrationMessage`（4s 自动消失）。
- 奖励提示：叙事后追加「🔭 维度洞察解锁 · <insight label>」（复用 CodexToast 样式或新增轻量后缀），**不显示数字印记**。
- 知识解锁：交由 CodexToast 既有「📖 图鉴更新」通知（见 `codex-knowledge-ui.md`）。
- 量级别无独立面板；进度隐含于 Codex 知识分类完成度（不计入数字印记计数）。

---

## 6. 边缘情况

1. **重复跨越（每轮都过 e10）**：`triggeredNumberMilestones` 幂等 → 仅首次发奖励，后续不重复。
2. **离线大跳（加载后数字骤增）**：加载后首 tick 的 `logE` 可能跨越多档 → 循环对每档各触发一次（均幂等），一次性补齐奖励与知识。
3. **极大数字（log10 > 308）**：`floor(log10)` 仍安全；超出 `MAGNITUDE_MILESTONE_DEFS` 范围的档位静默忽略。
4. **旧存档无 `triggeredNumberMilestones`**：`?? new Set()` 兜底；历史已跨量级不补发（接受）。
5. **叙事文本不匹配知识词条**：若 `narration` 与词条 `narrativeTriggers` 不一致，`onNarrativeTriggered` 静默忽略 → 须 GDD/常量联调保证文本完全一致（见 §2.2 注释）。

---

## 7. 验收标准

1. 首次跨越每个量级（6/9/12/18/23/24/50/63/80/100/308）触发一次叙事 + 维度洞察奖励 + 知识解锁。
2. 重复跨越不重复发奖（幂等）。
3. 离线大跳后首 tick 补齐所有跨档奖励与知识。
4. 奖励仅为非货币维度洞察，**不发放数字印记**，无任何永久生产乘数。
5. 知识解锁经 `onNarrativeTriggered` 钩子，与 `knowledge-entry-pool.md` 定义的 `narrativeTriggers` 文本一致。
6. 旧存档加载不崩。

---

*文档结束*
