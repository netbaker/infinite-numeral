# 档案馆数据层 GDD（Archive Data Layer · Sprint 5）

> **系统代号**：Archive-Data
> **优先级**：A·Must①
> **版本**：Sprint 5（GDD-1，设计文档）
> **依赖系统**：TranscendSystem、DimensionSystem、EventSystem、EntropySystem、PrestigeSystem、ExpansionSystem、ArchiveSystem、AchievementSystem、Dexie/IndexedDB
> **设计日期**：2026-07-23

---

## 1. 系统概述

档案馆数据层负责在每次 Transcend 时**采集本轮运行快照**并**持久化到 IndexedDB 独立表 `archives`**（对齐 ADR-002）。本 GDD 在 Sprint 5 中的角色是**验证与收口**——经代码核对（`git show v2.0.0` + 现行 `src`），快照采集（`captureRun`）、持久化（`persistArchiveRecord`）、Dexie 表、主存档 `_run*` 计数器序列化**均已于 v2.0.0 落地**。因此本文档的「核心机制」描述现状并锁定契约，「验收标准」以**收口核对清单**为主，「边缘情况」关注真实边界。

> **命名澄清**：主理人复核指出「`recordRun` 全仓 0 匹配，需从零实现」。经核对，采集方法已存在且命名为 **`captureRun`**（`src/systems/ArchiveSystem.ts` L118-161）。Sprint 5 **不重写**该方法，仅做字段/逻辑收口。

---

## 2. 核心机制

### 2.1 触发时机（现状锁定）

| 触发事件 | 是否记录 | 代码位置 |
|---------|---------|---------|
| Transcend | ✅ 核心记录 | `gameStore.executeTranscend` 在重置逻辑**前**调用 `captureRun(preState, …)`（L1092），随后 `persistArchiveRecord(record)`（L1166） |
| Expansion / Prestige | ❌ 不单独记录 | 数据累积进 `_run*` 计数器，Transcend 时入快照 |
| 手动存档 | ❌ | 仅 Transcend 触发 |

### 2.2 采集字段契约（current vs GDD）

`captureRun` 当前构造的 `ArchiveRecord` 含：`_runMaxNumber` / `_runStartTime` / `_runDimensionsVisited` / `_runDimensionDwell` / `geneChainSnapshot` / `_runEventCount` / `_runCollapses` / `_runMaxEntropy` / `_runStardustEarned` / `_runDarkEnergyEarned` / `currentEpoch` 等，落库为 `ArchiveRecord`（17 字段 + `isMilestone`，见 `types/game.ts` L329-368）。

**收口项（Sprint 5 须确认/补全）**：
- ✅ `isMilestone` 由 `determineMilestone()` 判定，规则须与 §2.3 完全一致（见收口项）。
- ✅ **已确认非缺口**：`captureRun` 与 `ArchiveRecord` 接口（types/game.ts:329）字段一致，均无 `singularityBurst`；档案成就 `arch_singularity_burst` 走代理条件 `dimensionsVisited.includes(4) && maxLog10>=300`（`ArchiveSystem.ts:241`，:211 注释明确），不依赖该字段。补充：`_runSingularityBurst` 计数器确存在于 `GameState`（`gameStore` 写入、`Serializer` 序列化），但其下游消费者是 `mystery_04` 的 `_singularityBurstEver`（`game.ts:1095`），**不进入 `ArchiveRecord`**；故 `captureRun` 返回值与 `ArchiveRecord` 逐字段一致、无需新增字段（详见 §3.2）。

### 2.3 里程碑快照规则（锁定，须与 `determineMilestone` 对齐）

以下快照 `isMilestone = true`（不可删除）：
- 第 1 次 Transcend（首超）
- 第 5 / 10 / 25 / 50 / 100 次 Transcend
- `maxLog10` 首次突破 50 / 100 / 200 / 300 的 Run
- 首次在某维度达到特殊成就的 Run（联动 §4）

### 2.4 存储与容量（现状锁定，ADR-002）

- 快照存 Dexie 独立表 `archives`（`'++id, runId, endedAt'`，database.ts version 3），**不嵌入 `GameState`**。
- 容量上限 100；超出删最早非里程碑快照；若 100 张全为里程碑则允许超限。
- 主存档仅保留 A5 轻量 `_run*` 字段，`Serializer.ts` L78-87 已序列化、L233-242 已反序列化（**已收口，无需改动**）。

---

## 3. 数据结构

### 3.1 ArchiveRecord（现状，来自 types/game.ts）

```typescript
export interface ArchiveRecord {
  runId: string;            // 格式 run_{transcendCount}_{timestamp}
  transcendCount: number;
  maxNumber: string;        // Decimal string
  maxLog10: number;
  runDuration: number;      // 秒
  dimensionsVisited: number[];
  primaryDimension: number;
  prestigeCount: number;
  expansionCount: number;
  eventsTriggered: number;
  collapsesTriggered: number;
  maxEntropy: number;
  geneChainSnapshot: GeneSnapshot[];   // 轻量 {type, level}
  stardustEarned: number;
  darkEnergyEarned: number;
  singularityEarned: number;
  timestamp: number;
  epochReached: string;
  isMilestone: boolean;
}
```

### 3.2 Sprint 5 新增字段：无（已确认非缺口）

**已确认非缺口**：`captureRun` 与 `ArchiveRecord` 接口（types/game.ts:329）字段一致，均无 `singularityBurst`；档案成就 `arch_singularity_burst` 走代理条件 `dimensionsVisited.includes(4) && maxLog10>=300`，不依赖该字段。故 **Sprint 5 数据层无新增字段**，GDD-1 初稿标记的「唯一真实缺口」作废。

### 3.3 GameState `_run*` 计数器（已序列化，无需改）

`archiveUnlocked` / `_runStartTime` / `_runDimensionsVisited` / `_runDimensionDwell` / `_runEventCount` / `_runMaxEntropy` / `_runCollapses` / `_runSingularityBurst` / `_runStardustEarned` / `_runDarkEnergyEarned` —— 均已存在于 `GameState` 并由 `Serializer` 双向处理。

---

## 4. 与现有系统的交互点

| 交互系统 | 交互方式 | 时机 | 详情 |
|---------|---------|------|------|
| **TranscendSystem** | 采集+持久化 | 重置前 | `captureRun(preState)` → `persistArchiveRecord(record)` → Dexie |
| **DimensionSystem** | 写 `_runDimensionsVisited` / `_runDimensionDwell` | 维度切换 | 累计进快照 `dimensionsVisited` / `primaryDimension` |
| **EventSystem** | `_runEventCount++` | 事件触发 | 入快照 `eventsTriggered` |
| **EntropySystem** | `_runMaxEntropy = max(…)`；`_runCollapses` | 熵崩/更新 | 入快照 `maxEntropy` / `collapsesTriggered` |
| **AchievementSystem** | `evaluateSpecialAchievements(record)` | 快照生成后 | 9 个档案成就（`src/core/Constants.ts:730-829`，group:'archive'） |
| **PrestigeSystem** | `_runStardustEarned += …` | Prestige | 入快照 `stardustEarned` |
| **ExpansionSystem** | `_runDarkEnergyEarned += …` | Expansion | 入快照 `darkEnergyEarned` |
| **CodexSystem** | 叙事收录 | 档案馆解锁/里程碑 | 收录档案馆叙事词条 |

---

## 5. UI 规格（本层不直接渲染，数据契约）

本层为数据层，UI 由 `ArchiveModal.vue` 消费。数据契约：
- `store.archiveRecords: ArchiveRecord[]`（来自 Dexie `getArchiveRecords`）
- `store.archiveSummary: ArchiveSummary`（由 `ArchiveSystem.computeSummary` 计算）
- `store.archiveLoading: boolean`（异步加载态）
- `store.loadArchives()` / `store.removeArchive(id)` / `store.compareRecords(a,b)`

UI 呈现细节见 `archive-modal-integration.md`。

---

## 6. 边缘情况

1. **Dexie 写入失败（IndexedDB 配额/隐私模式）**：`persistArchiveRecord` 须 try/catch，失败仅告警不阻断 Transcend；下一轮重试或提示「档案馆不可用」。
2. **`_runSingularityBurst` 旧存档缺失**：`Serializer` 反序列化已用 `?? false` 兜底（L240），`captureRun` 取 `state._runSingularityBurst ?? false`。
3. **同秒连续 Transcend（理论不可达）**：`runId` 含 timestamp 保证唯一，不冲突；若极端碰撞，`addArchiveRecord` 自增 `++id` 兜底。
4. **`isMilestone` 误标**：里程碑判定须幂等于 §2.3；已标记里程碑快照禁止被容量淘汰逻辑删除（L196-219 `enforceCapacity` 已保护）。
5. **旧存档无 `archives` 表（version < 3）**：Dexie 迁移至 version 3；旧快照不可补录（接受信息丢失），展示空列表不影响主循环。

---

## 7. 验收标准（收口核对清单）

1. `captureRun` 字段集与 `ArchiveRecord`（types/game.ts）逐字段一致，无遗漏。
2. `determineMilestone` 输出的 `isMilestone` 与 §2.3 规则逐条一致（单测覆盖 5 类里程碑）。
3. `persistArchiveRecord` → Dexie `archives` 写入成功；`getArchiveRecords` 可回读。
4. 容量为 100 时正确淘汰最早非里程碑；里程碑快照永不被删。
5. `Serializer` 对全部 `_run*` 计数器双向往返一致（含 `Set`/`Decimal`）。
6. Dexie 写失败时 Transcend 不崩、有兜底提示。
7. 9 个档案特殊成就在快照生成后正确评估（联动 `evaluateSpecialAchievements`）。

---

*文档结束*
