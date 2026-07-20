# 宇宙档案馆系统 GDD（Archive System）

> **系统代号**：Archive
> **优先级**：P2
> **版本**：v2.0 Beta
> **依赖系统**：TranscendSystem、DimensionSystem、AchievementSystem、CodexSystem
> **设计日期**：2026-07-01

---

## 1. 系统概述

宇宙档案馆是玩家的"数字宇宙编年史"。每次超越（Transcend）时自动生成一张运行快照卡片，记录本轮游戏的关键数据——最大数字、所用时间、所处维度、触发事件数、基因链快照等。档案馆在完成 5 次 Transcend 后解锁，为玩家提供跨 Run 的成长回顾和数据对比，同时联动成就系统解锁特殊成就。

---

## 2. 核心机制

### 2.1 解锁条件

| 条件 | 详情 |
|------|------|
| 主条件 | Transcend 次数 ≥ 5 |
| 副条件 | 无（不依赖科技树或其他系统） |
| 解锁方式 | 第 5 次 Transcend 完成后自动解锁，弹出档案馆介绍叙事 + UI 入口常驻 |
| 叙事 | 「你已超越了五次。宇宙开始记住你的每一轮轮回——档案馆为你敞开。」 |

### 2.2 运行快照记录逻辑

#### 2.2.1 触发时机

| 触发事件 | 是否记录 | 说明 |
|---------|---------|------|
| Transcend | ✅ 核心记录 | 每次超越后自动生成快照卡片 |
| Expansion | ❌ 不单独记录 | 数据累积到下一次 Transcend 快照中 |
| Prestige | ❌ 不单独记录 | 同上 |
| 手动存档 | ❌ | 仅 Transcend 触发 |

#### 2.2.2 记录数据字段

每次 Transcend 时，在执行重置逻辑**之前**采集以下数据：

| 字段 | 类型 | 说明 |
|------|------|------|
| `runId` | string | 唯一 Run 标识，格式 `run_{transcendCount}_{timestamp}` |
| `transcendCount` | number | 本次超越后的总超越次数 |
| `maxNumber` | string (Decimal) | 本轮（自上次 Transcend 以来）达到的最高数字 |
| `maxLog10` | number | maxNumber 的 log10 值（用于排序和对比） |
| `runDuration` | number | 本轮持续时间（秒，从上次 Transcend 到本次） |
| `dimensionsVisited` | number[] | 本轮访问过的维度 ID 列表 |
| `primaryDimension` | number | 本轮停留时间最长的维度 ID |
| `prestigeCount` | number | 本轮内 Prestige 次数 |
| `expansionCount` | number | 本轮内 Expansion 次数 |
| `eventsTriggered` | number | 本轮触发的事件总数 |
| `collapsesTriggered` | number | 本轮触发的熵崩次数 |
| `maxEntropy` | number | 本轮达到的最高熵值 |
| `geneChainSnapshot` | GeneSnapshot[] | 本轮结束时的基因链快照（类型+等级，不含运行时状态） |
| `stardustEarned` | number | 本轮获得的星尘总量 |
| `darkEnergyEarned` | number | 本轮获得的暗能量总量 |
| `singularityEarned` | number | 本次 Transcend 获得的奇点数量 |
| `timestamp` | number | 快照时间戳 (ms) |
| `epochReached` | string | 本轮达到的最高纪元 ID |

### 2.3 快照存储与管理

- **存储位置**：**不嵌入 `GameState`**，运行快照存储在 Dexie（IndexedDB 封装）的**独立表 `archives`** 中（对齐 ADR-002）。`GameState` 仅保留 `archiveUnlocked` 与本轮计数器（见 §3.2），快照数据在 Transcend 时异步写入 IndexedDB，档案馆 UI 打开时懒加载。
- **容量限制**：最多保留 100 张快照卡片。超出时自动删除最早的（但保留"里程碑快照"——见下）
- **里程碑快照**：以下快照标记为不可删除：
  - 第 1 次 Transcend（首超）
  - 第 5/10/25/50/100 次 Transcend
  - maxLog10 首次突破 50/100/200/300 的 Run
  - 首次在某维度达到特定成就的 Run
- **排序**：默认按时间倒序（最新在前），可切换为按 maxLog10 排序

### 2.4 特殊成就联动规则

档案馆数据可触发以下特殊成就（独立于现有 AchievementSystem 的成就）：

| 成就 ID | 名称 | 解锁条件 | 奖励 |
|---------|------|---------|------|
| `arch_prime_e100` | 质数探索者 | 在质数维度（Dim-1）达到 maxLog10 ≥ 100 | 1 奇点核心 |
| `arch_chaos_survivor` | 混沌行者 | 在混沌维度（Dim-2）完成一次 Transcend 且 maxLog10 ≥ 80 | 2 奇点核心 |
| `arch_anti_entropy_master` | 逆熵者 | 在反熵维度（Dim-3）完成 Transcend 且本轮 0 次熵崩 | 2 奇点核心 |
| `arch_singularity_burst` | 临界爆发者 | 在奇点维度（Dim-4）触发过临界爆发并完成 Transcend | 3 奇点核心 |
| `arch_speedrun` | 闪电轮回 | 单轮 Run 持续时间 < 300 秒且 maxLog10 ≥ 50 | 1 奇点核心 |
| `arch_marathon` | 漫长旅途 | 单轮 Run 持续时间 > 86400 秒（24h）且完成 Transcend | 2 奇点核心 |
| `arch_no_collapse` | 完美轮回 | 单轮 Run 0 次熵崩且 maxLog10 ≥ 100 | 3 奇点核心 |
| `arch_gene_collector` | 基因收藏家 | 基因链快照中包含全部 8 种基因类型（跨多轮累积） | 5 奇点核心 |
| `arch_centurion` | 百次超越 | Transcend 总次数 ≥ 100 | 10 奇点核心 |

### 2.5 数据对比功能

玩家可选中 2 张快照卡片进行对比，对比视图展示：

| 对比维度 | 展示方式 |
|---------|---------|
| maxLog10 | 柱状图对比，标注差值 |
| runDuration | 柱状图对比，标注效率（log10/s） |
| prestigeCount | 数值对比 |
| eventsTriggered | 数值对比 |
| geneChainSnapshot | 基因链可视化并排对比 |

---

## 3. 数据结构

### 3.1 TypeScript 接口定义

```typescript
/** 基因快照（轻量级，仅记录类型和等级） */
export interface GeneSnapshot {
  type: GeneType;
  level: number;
}

/** 运行快照记录 */
export interface ArchiveRecord {
  /** 唯一 Run 标识 */
  runId: string;
  /** 本次超越后的总超越次数 */
  transcendCount: number;
  /** 本轮最高数字 (string 格式 Decimal) */
  maxNumber: string;
  /** 最高数字的 log10 值 */
  maxLog10: number;
  /** 本轮持续时间 (秒) */
  runDuration: number;
  /** 本轮访问过的维度 ID 列表 */
  dimensionsVisited: number[];
  /** 本轮主要维度 (停留最久) */
  primaryDimension: number;
  /** 本轮 Prestige 次数 */
  prestigeCount: number;
  /** 本轮 Expansion 次数 */
  expansionCount: number;
  /** 本轮触发事件总数 */
  eventsTriggered: number;
  /** 本轮熵崩次数 */
  collapsesTriggered: number;
  /** 本轮最高熵值 */
  maxEntropy: number;
  /** 本轮基因链快照 */
  geneChainSnapshot: GeneSnapshot[];
  /** 本轮获得星尘总量 */
  stardustEarned: number;
  /** 本轮获得暗能量总量 */
  darkEnergyEarned: number;
  /** 本次 Transcend 获得奇点数 */
  singularityEarned: number;
  /** 快照时间戳 (ms) */
  timestamp: number;
  /** 本轮最高纪元 ID */
  epochReached: string;
  /** 是否为里程碑快照 (不可删除) */
  isMilestone: boolean;
}

/** 档案馆统计摘要 */
export interface ArchiveSummary {
  /** 总 Run 数 */
  totalRuns: number;
  /** 历史最高 maxLog10 */
  allTimeMaxLog10: number;
  /** 总游戏时长 (秒) */
  totalPlayTime: number;
  /** 总 Transcend 次数 */
  totalTranscends: number;
  /** 总熵崩次数 */
  totalCollapses: number;
  /** 各维度使用次数统计 */
  dimensionUsage: Record<number, number>;
  /** 最快 Run (按效率 log10/s) */
  fastestRun: ArchiveRecord | null;
  /** 最长 Run (按持续时间) */
  longestRun: ArchiveRecord | null;
}
```

### 3.2 GameState 新增字段

```typescript
// ---- 宇宙档案馆（v2.0） ----
// 注意：ArchiveRecord 列表不存储在 GameState 中，
// 而是存储在 IndexedDB 独立表 `archives` 中（对齐 ADR-002）。
/** 档案馆是否已解锁 */
archiveUnlocked: boolean;
/** 本轮 Run 开始时间戳 (ms) */
_runStartTime: number;
/** 本轮访问过的维度集合 */
_runDimensionsVisited: Set<number>;
/** 本轮事件触发计数器 */
_runEventCount: number;
/** 本轮最高熵值 */
_runMaxEntropy: number;
/** 本轮星尘获取量 */
_runStardustEarned: number;
/** 本轮暗能量获取量 */
_runDarkEnergyEarned: number;
```

---

## 4. 与现有系统的交互点

| 交互系统 | 交互方式 | 触发时机 | 详情 |
|---------|---------|---------|------|
| **TranscendSystem** | 快照生成 | Transcend 执行前 | 在重置逻辑前采集本轮数据，生成 ArchiveRecord，异步写入 IndexedDB `archives` 表（对齐 ADR-002） |
| **DimensionSystem** | 数据采集 | 维度切换时 | 记录到 `_runDimensionsVisited`；Transcend 时写入快照的 `dimensionsVisited` 和 `primaryDimension` |
| **EventSystem** | 数据采集 | 事件触发时 | `_runEventCount++` |
| **EntropySystem** | 数据采集 | 熵崩/熵值更新时 | `_runMaxEntropy = Math.max(_runMaxEntropy, currentEntropy)`；`collapsesTriggered` 从 `state.totalCollapses` 差值计算 |
| **AchievementSystem** | 成就联动 | 快照生成后 | 检查快照数据是否满足特殊成就条件，如满足则触发解锁 |
| **CodexSystem** | 叙事收录 | 档案馆解锁/里程碑快照生成时 | 收录档案馆相关叙事词条 |
| **PrestigeSystem** | 数据采集 | Prestige 执行时 | `_runStardustEarned += earnedStardust` |
| **ExpansionSystem** | 数据采集 | Expansion 执行时 | `_runDarkEnergyEarned += earnedDarkEnergy` |

---

## 5. ArchiveModal.vue UI 规格

### 5.1 布局结构

```
┌──────────────────────────────────────────────────────┐
│  🏛️ 宇宙档案馆                            [✕ 关闭]   │
├──────────────────────────────────────────────────────┤
│  📊 总览：127 次 Run | 最高 e287 | 总时长 456h      │
│  最快：Run #89 (e120/300s) | 最长：Run #45 (72h)    │
├──────────────────────────────────────────────────────┤
│  [全部] [里程碑] [质数维度] [混沌维度] ...  ← 筛选   │
│  排序：[时间↓] [maxLog10↓] [效率↓]      ← 排序       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │Run #127 │ │Run #126★│ │Run #125 │  ← 快照卡片   │
│  │e287.3   │ │e200.0   │ │e156.7   │    网格布局   │
│  │4h 32m   │ │12h 15m  │ │2h 48m   │               │
│  │Dim-4 🌑 │ │Dim-1 🔢 │ │Dim-0 ✨ │               │
│  │🧬3 ⚡12 │ │🧬5 ⚡8  │ │🧬2 ⚡15 │               │
│  └─────────┘ └─────────┘ └─────────┘               │
│                                                      │
│  [选中 2 张对比]  [查看统计图表]                     │
├──────────────────────────────────────────────────────┤
│  📖 成就联动 (7/9 已解锁)                            │
│  ✅ 质数探索者  ✅ 混沌行者  ✅ 逆熵者  ...          │
│  🔒 百次超越 (87/100)                               │
└──────────────────────────────────────────────────────┘
```

### 5.2 快照卡片设计

| 元素 | 规格 |
|------|------|
| 卡片尺寸 | 160×200px，圆角 12px |
| 背景 | 深空渐变 `linear-gradient(135deg, #1a1a3a, #0d0d1f)` |
| 里程碑标记 | 右上角金色★图标 + 金色边框 |
| 维度标识 | 卡片底部显示主维度图标 + 名称缩写 |
| 基因/事件数 | `🧬{基因数} ⚡{事件数}` 格式 |
| 点击行为 | 展开详情面板（全屏覆盖）：完整数据、基因链可视化、本轮叙事回放 |
| 长按行为 | 选中/取消选中（用于对比功能），选中时蓝色边框 |
| 删除 | 非里程碑快照可左滑删除（需二次确认） |

### 5.3 对比视图

选中 2 张卡片后点击"对比"：

```
┌──────────────────────────────────────────┐
│  📊 Run #126  vs  Run #127              │
├──────────────────────────────────────────┤
│  maxLog10:  200.0  ████████  287.3      │
│  时长:      12h15m  ██████   4h32m      │
│  效率:      0.45/s  ████     1.05/s     │
│  Prestige:  8次    ██████    12次       │
│  事件:      8次    ████      12次       │
│  熵崩:      1次    ██        0次        │
│  维度:     Dim-1  vs  Dim-4            │
│                                          │
│  基因链对比:                              │
│  #126: 🌱3 ⚗️2 🛡️1 📡2               │
│  #127: 🌱4 🧠2 🔗1 ✨1                │
└──────────────────────────────────────────┘
```

### 5.4 视觉规格

- **主色调**：深空蓝紫 `#1a1a3a` + 金色高亮 `#ffd700`
- **卡片悬停**：`transform: translateY(-4px)` + 阴影增强
- **里程碑卡片**：金色边框 + 微弱金色发光动画
- **对比柱状图**：水平条形图，左 Run 蓝色 `#4488ff`，右 Run 橙色 `#ff8844`
- **解锁前占位**：档案馆入口灰显 + 锁图标，hover 显示"完成 5 次超越后解锁"

---

## 6. 边缘情况

1. **旧存档加载（archiveUnlocked 不存在）**：初始化为 `false`，检查 `transcendCount >= 5` 自动设为 `true`。历史 Transcend 数据无法补录（接受信息丢失）。
2. **快照数量超过 100**：自动删除最早的非里程碑快照。如果 100 张全是里程碑（极端情况），不再删除，允许超过上限。
3. **本轮 Run 开始时间未知（旧存档首次加载）**：`_runStartTime` 设为加载时间，该轮 runDuration 不准确（接受）。
4. **Transcend 时数字为 0（异常情况）**：maxNumber 记录为 "0"，maxLog10 记录为 0。正常流程不会出现。
5. **玩家在同一秒内连续 Transcend（理论上不可能）**：runId 包含 timestamp 保证唯一性，不冲突。
6. **存档迁移导致档案馆数据缺失**：档案馆数据从 IndexedDB `archives` 表读取，无数据则展示空列表，不影响游戏运行。

---

## 7. 验收标准

1. 第 5 次 Transcend 完成后，档案馆自动解锁，入口常驻可见，弹出介绍叙事
2. 每次 Transcend 自动生成快照卡片，包含所有规定字段（maxNumber、runDuration、dimensionsVisited 等）
3. 快照卡片网格正确展示，里程碑快照有金色★标记且不可删除
4. 筛选功能（按维度/里程碑）和排序功能（按时间/maxLog10/效率）正常工作
5. 选中 2 张快照后对比视图正确显示柱状图对比和基因链对比
6. 特殊成就联动正确触发（如质数维度 e100 解锁"质数探索者"）
7. 快照超过 100 张时自动删除最早非里程碑快照
8. 旧存档加载后档案馆正常初始化，不崩溃
9. 档案馆统计总览数据正确（总 Run 数、历史最高、总时长等）
10. 解锁前入口灰显且有锁图标提示

---

*文档结束*
