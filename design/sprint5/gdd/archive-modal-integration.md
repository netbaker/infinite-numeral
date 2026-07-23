# ArchiveModal 数据接入 GDD（Archive Modal Integration · Sprint 5）

> **系统代号**：Archive-UI
> **优先级**：A·Must②
> **版本**：Sprint 5（GDD-1，设计文档）
> **依赖系统**：Archive-Data（本目录 `archive-data-layer.md`）、AchievementSystem、CodexSystem
> **设计日期**：2026-07-23

---

## 1. 系统概述

`ArchiveModal.vue`（434 行）在 v2.0.0 已完整实现：统计总览、维度/里程碑筛选、时间/量级/效率排序、卡片网格、2 张对比模式、详情面板。本 GDD 的焦点**不是造 UI**，而是锁定「**store ↔ Modal 的数据契约**」——确保 UI 从空态变为真实档案展示。经核对，Modal 已读取 `store.archiveRecords` / `store.archiveSummary` / `store.archiveLoading`，并调用 `store.loadArchives()` / `store.removeArchive()` / `store.compareRecords()`，导入 `ArchiveRecordDB`。**真实风险仅在 store 是否正确填充这些数据**。

---

## 2. 核心机制

### 2.1 数据契约（store → Modal）

| store 暴露 | 类型 | 来源 | 须保证 |
|-----------|------|------|--------|
| `archiveRecords` | `ArchiveRecordDB[]` | `loadArchives()` → Dexie `getArchiveRecords()` | 打开 Modal 时触发 `loadArchives`，异步回填 |
| `archiveSummary` | `ArchiveSummary` | `ArchiveSystem.computeSummary(records)` | 与 `archiveRecords` 同源计算，打开时刷新 |
| `archiveLoading` | `boolean` | `loadArchives` 异步态 | Modal 渲染 loading 占位 |
| `loadArchives()` | `async` | `dbGetArchives` → 缓存 | 幂等；重复打开不重复请求 |
| `removeArchive(id)` | `async` | `deleteArchiveRecord` + 刷新 | 非里程碑可删，二次确认 |
| `compareRecords(a,b)` | `(ArchiveRecord,ArchiveRecord)=>CompareResult` | `ArchiveSystem.compareRecords` | 选中 2 张时可用 |

### 2.2 9 个特殊成就呈现（经独立核查 = 真实缺口，且范围大于初稿）

**确认缺口为真**（eng-confirm-2 核查）：
- 解锁 + 发奖逻辑已接（`evaluateSpecialAchievements` + `gameStore` 发 `rewardSingularity` + Toast）。
- 但 **`ArchiveModal.vue` 无任何成就展示区**（grep 仅命中无关 CSS `sort-group`）→ 9 个成就无常驻列表，仅解锁时弹 Toast。
- **范围更大**：通用 `AchievementsModal.vue:62` 的 `groups` 硬编码 `['growth','prestige','producer','exploration','legend']`，**不含 `'archive'`** → 9 个成就连通用成就面板都不渲染。由于成就总计数含这 9 条却不可见，**进度显示存在 bug**（total 含不可见项）。

**收口位置（建议两处都补）**：
1. `ArchiveModal`：新增 §5.4 成就联动区，消费 `group:'archive'` 的 9 个成就（可在 `loadArchives` 一并拉取 `achievementStore` 的 archive 组状态，或复用 `ACHIEVEMENT_DEFS.filter(d => d.group==='archive')`）。
2. `AchievementsModal`：将 `'archive'` 纳入 `groups` 顺序与 `GROUP_LABELS`（如 `archive: '🏛️ 档案馆'`），使 9 个成就在通用面板可见、进度计数自洽。

### 2.3 里程碑标记呈现

`isMilestone === true` 的卡片显示金色 ★ + 金色边框 + 不可删（§5.2）。收口项：确认 `archiveRecords` 回流的 `isMilestone` 正确驱动该样式。

---

## 3. 数据结构（沿用，无新增）

- `ArchiveRecordDB extends ArchiveRecord { id: number; endedAt: number }`（database.ts）
- `ArchiveSummary`（types/game.ts L370-388）
- `CompareResult`（types/game.ts L390+）

无新类型；若 §2.2 成就区需数据，复用既有 `AchievementState` 映射。

---

## 4. 与现有系统的交互点

| 交互系统 | 方式 | 时机 |
|---------|------|------|
| **Archive-Data** | 提供 `archiveRecords` / `archiveSummary` | Modal `onMounted`/`visible` 变更 |
| **AchievementSystem** | 提供 archive 组成就状态 | `loadArchives` 并行拉取 / 通用面板 groups 纳入 'archive' |
| **CodexSystem** | 叙事收录（档案馆解锁词条） | 首次解锁时 |

---

## 5. UI 规格（现状锁定，复用 `archive-system.md` §5）

- 卡片 160×200px、圆角 12px、深空渐变；里程碑金色 ★；维度图标 + `🧬{基因数} ⚡{事件数}`。
- 总览行：`总 Run | 最高 eN | 总时长` + `最快/最长 Run`。
- 筛选：`[全部][里程碑][维度…]`；排序：`[时间↓][maxLog10↓][效率↓]`。
- 对比视图：水平条形图（左蓝 `#4488ff` / 右橙 `#ff8844`）+ 基因链并排。
- **Sprint 5 仅补充**：数据为空态（新玩家未达 5 次 Transcend）时，Modal 入口应灰显 + 锁图标（archive-system.md §5.4 已规范），且 `archiveUnlocked === false` 时入口不响应。

### 5.4 成就联动区（Sprint 5 新增，填补 §2.2 缺口）

在 Modal 底部新增「🏛️ 成就联动 (x/9)」区块，渲染 `ACHIEVEMENT_DEFS.filter(d => d.group === 'archive')`：

- 每个成就显示图标 + 名称 + 解锁态（已解锁高亮 / 未解锁灰显 + 进度条件文字）。
- 数据来源：复用 `store.gameState.achievements`（或 `loadArchives` 时并行拉取 archive 组状态），无需新增 store 字段。
- 布局沿用 `archive-system.md` §5.4 的卡片网格（160×200 同款圆角风格），金色主题对齐档案馆。
- 与 §2.2 第 2 点联动：通用 `AchievementsModal.vue` 须将 `'archive'` 加入 `groups` 顺序与 `GROUP_LABELS`，否则其 total 计数含这 9 条却不可见（进度 bug）。

---

## 6. 边缘情况

1. **新玩家（archives 为空）**：`archiveUnlocked=false`，入口灰显；强行打开显示「完成 5 次超越后解锁」，不读 Dexie。
2. **异步加载竞态**：快速开/关 Modal 时 `loadArchives` 未完成即关闭 → 用 token/abort 或「关闭即取消渲染」，避免旧数据回填已关 Modal。
3. **IndexedDB 不可用（隐私模式/配额满）**：`loadArchives` reject → `archiveLoading=false` + 提示「档案馆暂不可用」，不白屏。
4. **100+ 快照渲染性能**：虚拟滚动或分页；首屏只渲染最近 N 张，滚动懒加载。
5. **对比模式选中同张/仅 1 张**：禁用对比按钮，提示「请再选 1 张」。

---

## 7. 验收标准（收口核对清单）

1. 打开 Modal 触发 `loadArchives`，`archiveRecords` 回填真实档案（非空态）。
2. `archiveSummary` 与 `archiveRecords` 一致（总 Run 数、最高 eN、最快/最长）。
3. 筛选（维度/里程碑）与排序（时间/量级/效率）基于真实数据正确工作。
4. 里程碑卡片金色 ★ + 不可删。
5. **9 个 archive 组成就正确展示进度/解锁态**：`ArchiveModal` §5.4 成就联动区正常渲染（确认 §2.2 缺口已补）；且通用 `AchievementsModal` 已将 `'archive'` 纳入 `groups`，使总进度计数与可见条目一致（消除「total 含 9 条却不可见」的 bug）。
6. 对比模式选中 2 张输出正确 `CompareResult`。
7. 空态/隐私模式/竞态均不崩、有兜底。
8. 删除非里程碑快照后列表与摘要同步刷新。

---

*文档结束*
