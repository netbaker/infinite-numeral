# 无限数域 v2.0 — Epic & Story 拆解汇总

> **文档性质**：Sprint 规划与任务拆解
> **编制人**：文策渊（设计策划）
> **编制日期**：2026-07-01
> **依据文档**：4 份系统 GDD + 3 份 ADR + 架构评估报告 + P0 一致性审查 + 测试覆盖计划 + v2.0 更新方案
> **版本**：v1.0

---

## 1. 概述

### 1.1 v2.0 范围说明

v2.0 代号「维度裂变」（Dimensional Fracture），在 v1.x 基础上构建游戏**深度**。版本范围分两层：

| 层级 | 系统 | 优先级 | 状态 |
|------|------|:---:|------|
| P0 已实现待修 | 维度系统（DimensionSystem）、熵崩系统（EntropySystem） | P0 | Alpha 已实现，16 个问题待修 |
| P1 新开发 | 基因进化系统（GeneSystem） | P1 | GDD 已完成，待实现 |
| P2 新开发 | 宇宙档案馆（ArchiveSystem） | P2 | GDD 已完成，待实现 |
| P2 新开发 | 数字神话图鉴（CodexSystem） | P2 | GDD 已完成，待实现 |
| P3 新开发 | 皮肤系统（SkinSystem） | P3 | GDD 已完成，待实现 |

### 1.2 Sprint 规划原则

1. **依赖优先**：Serializer 序列化缺口是所有新系统开发的前置阻塞——必须最先修复
2. **致命 Bug 先行**：P0 系统的致命缺陷（维度倍率未接入、混沌 ID 错配、质数检测失效等）直接影响核心玩法，必须在开发新功能前修复
3. **ADR 对齐**：每个 Sprint 的技术实现必须遵循对应 ADR 的决策约束
4. **关键路径优先**：Serializer → 基因系统 → Transcend 改造 → 档案馆 是关键路径，不可并行
5. **并行机会**：图鉴与皮肤系统可在档案馆开发期间并行推进（二者互不依赖核心逻辑）
6. **复杂度标注**：S = 半天内，M = 1-2 天，L = 3+ 天

### 1.3 GDD 与 ADR 不一致声明

> ⚠️ 在编制本文件过程中，发现 GDD 与 ADR/架构评估之间存在多处结构性不一致。这些不一致**必须在对应 Sprint 启动前由策划与工程对齐**，已在各 Story 中以「⚠️ 对齐项」标注，并在第 9 节集中汇总。

---

## 2. Sprint 0：致命 Bug 修复（阻塞性）

> **来源**：P0 一致性审查（`design/reviews/p0-consistency-review.md`）13 项 + 架构评估报告（`docs/architecture/v2-arch-assessment.md`）3 项 = **共 16 个问题**
> **目标**：修复所有阻塞核心玩法的缺陷，为新系统开发扫清前置障碍
> **原则**：按阻断优先级排序，P0-阻断项必须在 Sprint 1 启动前完成

---

### Story 0.1: Serializer 序列化缺口修复

- **描述**: `SerializedState` 接口和 `Serializer.ts` 缺失所有 v2.0 字段（entropy、dimensionStates、dimensionCrystals、activeEvent、ongoingEffects 等），导致刷新页面后维度状态和熵值全部丢失
- **验收标准**:
  1. `SerializedState` 接口包含 `entropy`、`entropyStabilizers`、`entropyRewinds`、`totalCollapses`、`currentDimension`、`dimensionStates`、`dimensionCrystals`、`activeEvent`、`ongoingEffects` 全部字段
  2. `serialize()` 正确将上述字段从 GameState 写入 SerializedState
  3. `deserialize()` 正确从 SerializedState 恢复上述字段到 GameState
  4. 存档→读档 round-trip 后，熵值、当前维度、维度资源、活跃事件效果全部保持不变
  5. 旧存档（无 v2.0 字段）加载时不崩溃，缺失字段初始化为默认值
- **复杂度**: M
- **依赖**: 无（这是所有后续开发的前置依赖）
- **涉及文件**: `src/core/Serializer.ts`、`src/types/save.ts`
- **来源**: 架构评估 §0 前置发现（CRITICAL）

---

### Story 0.2: 维度倍率接入产出计算

- **描述**: `DimensionSystem.calculateDimensionMultiplier()` 正确计算了各维度倍率，但结果未接入 `gameTick()` 的产出计算链路，维度系统沦为纯视觉装饰
- **验收标准**:
  1. `MultiplierSource` 类型新增 `'dimension'` 来源
  2. `MultiplierSystem.recalculateFromState()` 中调用 `dimensionSystem.calculateDimensionMultiplier(state)` 注册维度倍率（方案 A），或在 `gameTick()` 中将 `rawOutputPerSec` 乘以维度倍率（方案 B）
  3. 切换到质数维度且数字为质数时，实际产出 ×3（对比基础维度）
  4. 切换到混沌维度时，实际产出受 `_chaosMultiplier`（0.5~5.0）影响
  5. 切换到奇点维度且 log10 > 300 时，实际产出 ×100
- **复杂度**: M
- **依赖**: 无
- **涉及文件**: `src/systems/MultiplierSystem.ts`、`src/stores/gameStore.ts`（L455-494 gameTick 产出计算流程）
- **来源**: P0 审查缺陷 #1（P0-阻断）
- **备注**: 需与程基岩确认走方案 A（MultiplierSystem 注册）还是方案 B（gameTick 直接乘）

---

### Story 0.3: 混沌维度 ID 映射修正（1→2）

- **描述**: `checkChaosMultiplier()`、`getChaosMultiplier()`、`getChaosTimer()` 三个方法均检查 `state.currentDimension !== 1`，但混沌维度是 Dim-2（Dim-1 是质数维度），导致混沌维度逻辑全部失效
- **验收标准**:
  1. `checkChaosMultiplier()`（L328）中 `!== 1` 改为 `!== 2`
  2. `getChaosMultiplier()`（L346）中 `!== 1` 改为 `!== 2`
  3. `getChaosTimer()`（L354）中 `!== 1` 改为 `!== 2`
  4. 在混沌维度（Dim-2）时，混沌倍率正常重投、显示、倒计时工作
  5. 在质数维度（Dim-1）时，不执行任何混沌逻辑
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/systems/DimensionSystem.ts`（L328、L346、L354）
- **来源**: P0 审查缺陷 #2（P0-阻断）

---

### Story 0.4: 质数检测大数字失效修复

- **描述**: `isPrime(n)` 接收 `state.number.toNumber()`，JavaScript Number 安全整数上限为 2^53 ≈ 9e15，增量游戏数字几分钟内即超此值，质数维度 ×3 倍率在中后期完全失效
- **验收标准**:
  1. 数字 < 1e15 时，质数检测行为与现有逻辑一致
  2. 数字 ≥ 1e15 时，采用降级策略（概率性质数检测 Miller-Rabin，或改为检测 `log10(number)` 整数部分是否为质数）
  3. 质数维度在数字为 1e50、1e100、1e200 等大数字阶段仍能正确触发 ×3 倍率（当条件满足时）
  4. 非质数大数字不误触发倍率
- **复杂度**: M
- **依赖**: Story 0.2（维度倍率接入后才能验证效果）
- **涉及文件**: `src/systems/DimensionSystem.ts`（isPrime 方法、calculateDimensionMultiplier case 1）
- **来源**: P0 审查缺陷 #3（P0-阻断）
- **备注**: 需策划决策降级策略——是改用概率检测保持"数字是质数"原意，还是重新设计触发条件（如位数之和为质数）

---

### Story 0.5: tickDimensionResources 调用补全

- **描述**: `DimensionSystem.tickDimensionResources()` 实现了维度专属资源产出逻辑，但从未在 `gameStore.gameTick()` 中被调用，维度资源（质核/混沌碎片/熵晶/奇点核心）无法积累
- **验收标准**:
  1. `gameStore.gameTick()` 中调用 `dimensionSystem.tickDimensionResources(state, deltaSec)`
  2. 在各维度中游戏时，对应专属资源按设计速率积累
  3. 维度切换后，资源积累切换到新维度的资源类型
  4. 资源量正确持久化（依赖 Story 0.1 的 Serializer 修复）
- **复杂度**: S
- **依赖**: Story 0.1（Serializer 修复后 dimensionCrystals 才能持久化）
- **涉及文件**: `src/stores/gameStore.ts`（gameTick）、`src/systems/DimensionSystem.ts`
- **来源**: 架构评估 §6 风险表 + 测试覆盖计划已知 bug

---

### Story 0.6: synthesizeCrystal 重复实现统一

- **描述**: `gameStore` 和 `DimensionSystem` 中各有一份 `synthesizeCrystal` 实现，逻辑不一致，维护成本高
- **验收标准**:
  1. 删除 `gameStore` 中的重复 `synthesizeCrystal` 实现
  2. `gameStore` 统一调用 `DimensionSystem.synthesizeCrystal()`
  3. 晶体合成功能行为不变（资源充足时成功合成、扣除 1000 资源、晶体 +1）
  4. UI 调用路径不变，无回归
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/stores/gameStore.ts`、`src/systems/DimensionSystem.ts`
- **来源**: 架构评估 §6 风险表

---

### Story 0.7: 维度屏障道具实现

- **描述**: 设计规定 3 种熵崩对抗道具，但「维度屏障」（60 秒内熵值不上升）完全未实现，玩家缺少"拖延战术"选项
- **验收标准**:
  1. `EntropyItemType` 新增 `'barrier'` 类型
  2. `ENTROPY_ITEM_DEFS` 新增维度屏障定义（消耗星尘购买，持有数上限与现有道具一致）
  3. `EntropySystem` 新增 `applyBarrier()` 方法，设置 `_barrierActiveUntil` 时间戳
  4. `EntropySystem.tick()` 中屏障激活时跳过熵值增长计算
  5. `GameState` 新增 `entropyBarriers` 持有数字段 + `_barrierActiveUntil` 时间戳
  6. `EntropyBar.vue` 新增屏障按钮 + 激活状态指示（倒计时）
  7. `gameStore.ts` 新增 `buyEntropyBarrier()` / `useEntropyBarrier()` 方法
  8. 屏障激活期间熵值进度条显示特殊视觉态（如蓝色护盾边框）
- **复杂度**: M
- **依赖**: Story 0.1（新增字段需 Serializer 支持）
- **涉及文件**: `src/systems/EntropySystem.ts`、`src/types/game.ts`、`src/core/Constants.ts`、`src/components/game/EntropyBar.vue`、`src/stores/gameStore.ts`
- **来源**: P0 审查缺陷 #8（P0-缺失）

---

### Story 0.8: 临界等级随机生产者停机效果

- **描述**: 设计规定临界（80-100%）时"随机一个生产者停机 30 秒"，但仅实现了 -50% 产出惩罚，随机停机完全未实现
- **验收标准**:
  1. `GameState` 新增 `downedProducers: Map<string, number>`（producerId → 停机结束时间戳）
  2. `EntropySystem` 在进入 critical 等级时随机选择一个已拥有生产者，设置 30 秒停机
  3. `ProducerSystem.calculateTotalOutput()` 跳过停机中的生产者
  4. 停机生产者在 UI 上灰显 + 显示倒计时
  5. 停机结束后生产者自动恢复
  6. 同一时间最多 1 个生产者停机（不叠加）
- **复杂度**: M
- **依赖**: Story 0.1（新增字段需 Serializer 支持）
- **涉及文件**: `src/systems/EntropySystem.ts`、`src/systems/ProducerSystem.ts`、`src/types/game.ts`、`src/stores/gameStore.ts`、生产者 UI 组件
- **来源**: P0 审查缺陷 #9（P0-缺失）

---

### Story 0.9: 不稳定等级时间因子效果减弱

- **描述**: 设计规定不稳定（50-80%）时"时间因子效果减弱"，但仅实现了 -20% 产出惩罚
- **验收标准**:
  1. 熵值处于 unstable 等级时，`timeSpeedMultiplier` 效果按 0.7 系数折减
  2. 折减在 `gameTick()` 中生效，影响事件 speed_change 和离线收益效率
  3. 熵值回到 stable 后，时间因子效果恢复正常
  4. 折减系数可配置（`ENTROPY_CONFIG` 中新增 `UNSTABLE_TIME_FACTOR_PENALTY: 0.7`）
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/stores/gameStore.ts`（gameTick）、`src/systems/EntropySystem.ts`、`src/core/Constants.ts`
- **来源**: P0 审查缺陷 #10（P1-缺失）

---

### Story 0.10: 时间回溯实现方式修正

- **描述**: `applyRewind()` 使用基于当前熵值的百分比扣减公式，而非设计规定的"回退 5 秒的熵值积累"
- **验收标准**:
  1. `EntropySystem` 维护 5 秒滑动窗口的熵值历史记录（环形缓冲区，每 tick 记录一次）
  2. `applyRewind()` 扣除窗口内净增量（而非当前熵值的百分比）
  3. 回溯后熵值不低于 0
  4. 窗口数据不参与序列化（运行时重建即可，旧存档加载时窗口为空，首次回溯回退 0）
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/systems/EntropySystem.ts`
- **来源**: P0 审查缺陷 #11（P1-偏离）

---

### Story 0.11: 反熵维度 prestigeCount 清零问题

- **描述**: 反熵维度（Dim-3）使用 `1 + state.prestigeCount * 0.2` 计算倍率，但膨胀（Expansion）会清零 prestigeCount，导致倍率归零，与设计意图矛盾
- **验收标准**:
  1. 反熵维度倍率改用 `state.transcendCount`（超越次数，不重置）或新增 `cumulativePrestigeCount` 字段
  2. 膨胀后反熵维度倍率不归零
  3. 倍率随飞升次数单调递增
- **复杂度**: S
- **依赖**: 无（若新增字段则依赖 Story 0.1）
- **涉及文件**: `src/systems/DimensionSystem.ts`（calculateDimensionMultiplier case 3）、`src/types/game.ts`（若新增字段）
- **来源**: P0 审查优化 #4（P1）

---

### Story 0.12: 精通度增长公式精度修复

- **描述**: `tickMastery()` 使用 `outputPerSec.toNumber() * deltaTime * 0.0001`，当 outputPerSec 超过 Number.MAX_VALUE 时返回 Infinity，精通度瞬间拉满
- **验收标准**:
  1. `toNumber()` 结果做 `Math.min(value, cap)` 钳制，或改用 `log10(outputPerSec)` 作为增长因子
  2. outputPerSec 为极大值（如 1e300）时精通度不瞬间拉满
  3. 精通度增长速率在大数字阶段仍合理（不过快也不过慢）
  4. 精通度不超过 `maxMastery`
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/systems/DimensionSystem.ts`（tickMastery 方法）
- **来源**: P0 审查优化 #5（P1）

---

### Story 0.13: 混沌倍率范围统一

- **描述**: `rollChaosMultiplier()` 范围为 0.5~5.0（与设计一致），但 `checkChaosMultiplier()` 使用 `1 + Math.random() * 4` → 范围 1.0~5.0（与设计不符）
- **验收标准**:
  1. `checkChaosMultiplier()` 的随机范围统一为 0.5~5.0
  2. 两个方法产生的随机范围一致
  3. 混沌维度倍率最低可为 0.5x（惩罚性低倍率）
- **复杂度**: S
- **依赖**: Story 0.3（混沌 ID 修正后才能正确测试）
- **涉及文件**: `src/systems/DimensionSystem.ts`（checkChaosMultiplier、rollChaosMultiplier）
- **来源**: P0 审查优化 #6（P2）

---

### Story 0.14: 维度晶体消费出口

- **描述**: `synthesizeCrystal()` 可合成维度晶体，但晶体无任何消费出口，设计意图为"用于购买跨维度增益"
- **验收标准**:
  1. 新增晶体商店或消费机制（消耗晶体购买全局加成、维度精通加速等）
  2. 晶体消耗后 `dimensionCrystals` 正确扣减
  3. 购买的增益通过 MultiplierSystem 注册生效
  4. 晶体商店 UI 集成到 DimensionPanel.vue 或独立面板
- **复杂度**: M
- **依赖**: Story 0.5（资源产出正常后才有晶体可消费）
- **涉及文件**: `src/systems/DimensionSystem.ts`、`src/components/game/DimensionPanel.vue`、`src/core/Constants.ts`、`src/stores/gameStore.ts`
- **来源**: P0 审查优化 #7（P2）
- **备注**: 可与 Sprint 1 并行，不阻塞关键路径

---

### Story 0.15: 大崩塌扣除比例调整

- **描述**: 当前大崩塌扣除 15% 数字，对增量游戏大数字阶段可能威慑不足
- **验收标准**:
  1. 扣除比例调整为阶梯式或提高至 25-30%（需数值平衡测试确认）
  2. 阶梯式方案：连续触发崩塌时扣除比例递增
  3. `COLLAPSE_DRAIN_PERCENT` 配置项可调
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/core/Constants.ts`（COLLAPSE_DRAIN_PERCENT）、`src/systems/EntropySystem.ts`
- **来源**: P0 审查优化 #12（P2）
- **备注**: 需数值平衡测试确认最终比例

---

### Story 0.16: EntropyCollapseLevel 类型补全

- **描述**: `EntropyCollapseLevel` 类型定义为 `'stable' | 'unstable' | 'critical'`，缺少 `'collapsed'`，但 UI 在 entropy >= 100 时使用 `'collapsed'` 值
- **验收标准**:
  1. `EntropyCollapseLevel` 类型扩展为 `'stable' | 'unstable' | 'critical' | 'collapsed'`
  2. `getCollapseLevel()` 在 entropy >= 100 时返回 `'collapsed'`
  3. `EntropyBar.vue` 的 level computed 与 `getCollapseLevel()` 返回值一致
  4. 序列化中 CollapseLevel 值正确持久化
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/types/game.ts`、`src/systems/EntropySystem.ts`（getCollapseLevel）、`src/components/game/EntropyBar.vue`
- **来源**: P0 审查优化 #13（P2）

---

## 3. Sprint 1：基因进化系统

> **来源 GDD**: `design/gdd/gene-evolution.md`
> **对齐 ADR**: `docs/architecture/adr-001-gene-state-management.md`（序列化存储 + 种子注入）
> **对齐架构评估**: `docs/architecture/v2-arch-assessment.md` §1

### Epic 1.1: 基因系统类型与数据层

> **对齐 GDD §3**（数据结构）+ **ADR-001**（序列化存储策略）

---

#### Story 1.1.1: 基因类型定义与静态数据

- **描述**: 定义 8 类基因的 TypeScript 类型与 `GENE_DEFS` 静态数据池
- **验收标准**:
  1. `GeneType` 联合类型包含全部 8 类基因
  2. `GeneDef` 接口包含 id、name、description、icon、effectType、effectPerLevel、maxLevel、initialLevelRange、canBePruned 字段（对齐 GDD §3.1）
  3. `GENE_DEFS` 常量定义全部 8 条基因静态数据，数值与 GDD §2.1 表格一致
  4. `gene_exotic` 不出现在常规随机池中（仅 Transcend 时 5% 概率获得）
- **复杂度**: S
- **依赖**: 无
- **涉及文件**: `src/types/game.ts`、`src/core/Constants.ts`
- **⚠️ 对齐项**: GDD 使用 `gene_growth`/`gene_catalyst` 等带前缀命名，架构评估使用 `proliferation`/`catalyst` 等短命名。**须统一为一种命名方案**。GDD 的 `GeneDef` 有 `effectPerLevel` 但无 `baseEffect`；架构评估的 `GeneDef` 有 `baseEffect` + `effectPerLevel`。须对齐字段集。

---

#### Story 1.1.2: 基因链状态结构与序列化

- **描述**: 定义 `GeneChainState` 和单条基因状态结构，实现 Serializer 序列化/反序列化
- **验收标准**:
  1. `GeneChainState` 包含 chain（基因数组）、maxSlots、expansionCount、totalMutations、totalRecombinations、totalPrunings 字段（对齐 GDD §3.1）
  2. 单条基因状态包含 instanceId、type、level、expression、entangledProducers、memoryRecord、obtainedAt、lastMutatedAt 字段（对齐 GDD §3.1 GeneState）
  3. Serializer 新增 `geneChain` 序列化逻辑，Decimal 字段转 string，无 Decimal 实例存入 GeneSlot（对齐 ADR-001 技术约束）
  4. 存档→读档 round-trip 后基因链完整保留，基因类型/等级/表达强度不变
  5. 旧存档（无 geneChain 字段）加载时初始化为 `{ chain: [], maxSlots: 3, expansionCount: 0, ... }`，不崩溃
  6. `geneChain` 在 markRaw 模式下安全（无 Vue proxy 干扰）
- **复杂度**: M
- **依赖**: Story 0.1（Serializer 基础修复）、Story 1.1.1（类型定义）
- **涉及文件**: `src/types/game.ts`、`src/core/Serializer.ts`、`src/types/save.ts`、`src/stores/gameStore.ts`
- **⚠️ 对齐项**: GDD 的 `GeneState` 有 `instanceId`/`memoryRecord`/`entangledProducers`/`obtainedAt`/`lastMutatedAt`；架构评估的 `GeneSlot` 有 `geneId`/`mutationSeed`。字段集不同。GDD 的 `expression` 范围 0-100，架构评估为 0-1。GDD 的记忆基因用 per-gene `memoryRecord`，ADR-001 用 chain-level `historicalMaxNumber`。**须统一**。
- **ADR-001 约束**: `historicalMaxNumber` 必须存储为 string（Decimal 序列化安全），不能存 Decimal 实例

---

#### Story 1.1.3: 注入式随机种子机制

- **描述**: 实现可注入的随机种子（seedable random），确保突变操作可测试、可复现
- **验收标准**:
  1. 突变基因（`gene_mutation`）的 `mutationSeed` 存储在基因状态中
  2. 同一存档读档后，突变基因的效果不变（种子一致则结果一致）
  3. 测试中可固定种子断言突变结果（对齐 ADR-001 理由："可测试性"）
  4. 种子生成使用确定性算法（非 `Math.random()`），或 `Math.random()` 结果在生成时捕获并存储
- **复杂度**: M
- **依赖**: Story 1.1.2（基因状态结构）
- **涉及文件**: `src/systems/GeneSystem.ts`（新建）、`src/core/Serializer.ts`
- **ADR-001 约束**: 突变种子存储在 GeneSlot 中，确保同一存档的突变效果确定

---

### Epic 1.2: 基因进化操作

> **对齐 GDD §2.3**（三层进化机制）+ **GDD §4**（与现有系统交互点）

---

#### Story 1.2.1: 突变机制（Prestige 触发）

- **描述**: 每次 Prestige 后，30% 概率有 1 条基因发生突变（等级±1 / 类型变异 / 突变基因必变）
- **验收标准**:
  1. `PrestigeSystem.executePrestige` 执行后调用 `GeneSystem.mutate(state)`
  2. 每条基因 30% 概率发生突变，同一次 Prestige 最多 1 条基因突变（对齐 GDD §2.3.1 限制）
  3. 突变效果随机选择：等级+1（40%）、等级-1（30%，最低 Lv 1）、类型变异（20%，保留等级）、`gene_mutation` 必变（10%）
  4. 突变触发时随机播报突变叙事（从叙事池选取）
  5. 突变后基因状态正确更新并触发 MultiplierSystem 重算
- **复杂度**: M
- **依赖**: Story 1.1.2（基因链状态）、Story 1.1.3（种子机制）
- **涉及文件**: `src/systems/GeneSystem.ts`（新建）、`src/systems/PrestigeSystem.ts`、`src/stores/gameStore.ts`

---

#### Story 1.2.2: 筛选机制（Expansion 触发）

- **描述**: 每次 Expansion 后，玩家可选择删除 0-1 条基因（`gene_memory` 不可删）
- **验收标准**:
  1. `ExpansionSystem.executeExpansion` 执行后弹出筛选选择面板
  2. 玩家可选择删除 0-1 条基因（对齐 GDD §2.3.2）
  3. `gene_memory` 不可被筛选删除（`canBePruned: false`）
  4. 删除后基因链更新，totalPrunings +1
  5. 筛选面板 UI 在 Expansion 过场动画后弹出
- **复杂度**: M
- **依赖**: Story 1.1.2（基因链状态）
- **涉及文件**: `src/systems/GeneSystem.ts`、`src/systems/ExpansionSystem.ts`、`src/stores/gameStore.ts`、筛选面板 UI 组件（新建）

---

#### Story 1.2.3: 重组机制（Transcend 触发）

- **描述**: 每次 Transcend 后，检查链中是否存在 2 条同类型基因，玩家可选择合并
- **验收标准**:
  1. `TranscendSystem.executeTranscend` 执行后调用 `GeneSystem.recombinate(state)`
  2. 检测链中同类型基因对，玩家手动选择是否重组及重组哪一对（可放弃）
  3. 重组效果：合并为 1 条该类型基因，等级 = min(Lv_a + Lv_b, 5)（对齐 GDD §2.3.3）
  4. 重组后占用 1 槽，溢出部分不补偿
  5. 重组后 totalRecombinations +1
  6. 可重组的同类基因对在 UI 上高亮绿色边框 + 重组按钮浮现
- **复杂度**: M
- **依赖**: Story 1.1.2（基因链状态）
- **涉及文件**: `src/systems/GeneSystem.ts`、`src/systems/TranscendSystem.ts`、`src/stores/gameStore.ts`

---

#### Story 1.2.4: 新基因获取与奇异基因

- **描述**: 每次 Transcend 后额外随机获得 1 条新基因（如有空槽），5% 概率获得 `gene_exotic`
- **验收标准**:
  1. 首次 Transcend 后随机获得 2-3 条基因（从 8 类中随机，不含 `gene_exotic`）（对齐 GDD §2.2）
  2. 后续每次 Transcend 后额外随机获得 1 条新基因（如果槽位有空）
  3. `gene_exotic` 仅在 Transcend 时 5% 概率获得（不通过常规随机池）
  4. 槽位满 + Transcend 获得新基因时，新基因暂存到"待入链"区（最多 3 条，超出丢弃最旧的）
  5. 暂存区基因可通过筛选腾出空间后入链
- **复杂度**: M
- **依赖**: Story 1.1.2（基因链状态）、Story 1.2.3（重组机制）
- **涉及文件**: `src/systems/GeneSystem.ts`、`src/systems/TranscendSystem.ts`

---

### Epic 1.3: 基因效果接入

> **对齐 GDD §2.5**（与 MultiplierSystem 交互）+ **GDD §4**（交互点表）+ **架构评估 §1.4**

---

#### Story 1.3.1: MultiplierSystem 基因加成注册

- **描述**: 基因效果通过 `MultiplierSystem.register()` 注册为 `gene` 来源的加成
- **验收标准**:
  1. `MultiplierSource` 类型新增 `'gene'`
  2. `MultiplierSystem.recalculateFromState()` 新增基因链遍历逻辑（对齐架构评估 §1.4）
  3. `gene_growth` 注册为全局加法倍率：`0.05 * level`
  4. `gene_memory` 注册为全局加法倍率：`0.02 * memoryRecord`
  5. `gene_exotic`（Lv 3+）注册为全局加法倍率：`0.50 * level`
  6. `gene` 来源在乘法链中与 `upgrade`、`stardust` 同级参与 `(1 + sum(gene))` 分组
  7. 基因链变化时（Prestige/Expansion/Transcend/扩容后）触发 recalculateFromState
- **复杂度**: M
- **依赖**: Story 1.1.2（基因链状态）、Story 0.2（MultiplierSystem 已支持 dimension 来源的模式参考）
- **涉及文件**: `src/systems/MultiplierSystem.ts`、`src/systems/GeneSystem.ts`
- **⚠️ 对齐项**: GDD §2.5 的注册逻辑直接用 `0.05 * gene.level` 作为加法倍率值；架构评估 §1.4 用 `1 + (baseEffect + effectPerLevel * (level - 1)) * expression`。计算公式不同，须统一。

---

#### Story 1.3.2: 基因槽扩容

- **描述**: 玩家可消耗奇点核心扩容基因槽（3→8 槽，5 次扩容）
- **验收标准**:
  1. 扩容规则与 GDD §2.4 表格一致（3→4→5→6→7→8 槽，消耗 3/5/8/12/20 奇点核心）
  2. 前置条件检查正确（Transcend 2/3/5/7/10 次 + 第 5 次需奇异基因 Lv 3）
  3. 扩容消耗正确扣减奇点核心
  4. 扩容后 maxSlots +1，expansionCount +1
  5. 扩容需二次确认
- **复杂度**: S
- **依赖**: Story 1.1.2（基因链状态）
- **涉及文件**: `src/systems/GeneSystem.ts`、`src/stores/gameStore.ts`

---

#### Story 1.3.3: 跨系统效果接入

- **描述**: 将非倍率型基因效果接入对应系统（Factor/Event/Entropy/Prestige 起点）
- **验收标准**:
  1. `gene_catalyst`：FactorSystem 的因子发现概率 ×(1 + 0.10×Lv)（对齐 GDD §2.1）
  2. `gene_resilience`：Prestige 后起始数字 = 10^Lv（对齐 GDD §2.1）
  3. `gene_resonance`：EventSystem 事件发生率 ×(1 + 0.15×Lv)，事件持续时间 ×(1 + 0.10×Lv)
  4. `gene_entangle`：随机选中 2 个生产者，协同倍率 ×(1 + 0.20×Lv)
  5. `gene_mutation`：每轮 Prestige 随机化为其他基因类型，强度随机
  6. 各系统在对应逻辑中正确读取基因效果值
- **复杂度**: L
- **依赖**: Story 1.3.1（MultiplierSystem 注册）、Story 1.1.3（种子机制 for gene_mutation）
- **涉及文件**: `src/systems/FactorSystem.ts`、`src/systems/EventSystem.ts`、`src/systems/PrestigeSystem.ts`、`src/systems/ProducerSystem.ts`、`src/systems/GeneSystem.ts`
- **备注**: 此 Story 涉及面广，可拆分为子任务并行

---

### Epic 1.4: 基因链 UI

> **对齐 GDD §5**（GeneChain.vue UI 规格）

---

#### Story 1.4.1: GeneChain.vue 基础布局与 DNA 可视化

- **描述**: 实现基因链面板 UI，含 DNA 双螺旋可视化、基因卡片、槽位展示
- **验收标准**:
  1. 布局结构对齐 GDD §5.1（标题栏、槽位计数、扩容按钮、DNA 螺旋区、空槽、统计区、维度推荐）
  2. 基因卡片显示图标、等级、表达强度进度条、名称（对齐 GDD §5.3 视觉规格）
  3. DNA 连接线为贝塞尔曲线，颜色随基因类型变化
  4. 等级徽章：Lv 1-3 银色，Lv 4 金色，Lv 5 彩虹色
  5. 空槽 [+] 按钮：有暂存基因时可点击入链
  6. 扩容按钮：消耗奇点核心，二次确认
- **复杂度**: L
- **依赖**: Story 1.1.2（基因链状态）、Story 1.3.2（扩容逻辑）
- **涉及文件**: `src/components/game/GeneChain.vue`（新建）

---

#### Story 1.4.2: 基因交互与动画效果

- **描述**: 实现基因卡片交互行为和动画效果
- **验收标准**:
  1. 基因卡片点击展开详情：效果说明、当前等级数值、表达强度进度条、突变历史（对齐 GDD §5.2）
  2. 基因卡片长按弹出操作菜单：查看详情 / 标记为待筛选
  3. 基因链变化时播放螺旋重组动画（0.5s）
  4. 基因突变时该卡片紫色闪光 + 图标抖动 0.5s（对齐 GDD §5.4）
  5. 可重组的同类基因对同时高亮绿色边框 + 重组按钮浮现
  6. `gene_mutation` 卡片边框彩虹流动效果
  7. 待筛选标记卡片右上角红色标记
- **复杂度**: M
- **依赖**: Story 1.4.1（基础布局）、Story 1.2.1（突变触发）、Story 1.2.3（重组检测）
- **涉及文件**: `src/components/game/GeneChain.vue`

---

## 4. Sprint 2：宇宙档案馆

> **来源 GDD**: `design/gdd/archive-system.md`
> **对齐 ADR**: `docs/architecture/adr-002-archive-storage-strategy.md`（IndexedDB 独立表）
> **对齐架构评估**: `docs/architecture/v2-arch-assessment.md` §2

### Epic 2.1: 档案馆数据层

> **对齐 GDD §3**（数据结构）+ **ADR-002**（IndexedDB 独立表存储）

---

#### Story 2.1.1: IndexedDB 独立表与 Dexie 迁移

- **描述**: 在 Dexie 中新增 `archives` 独立表，处理版本迁移
- **验收标准**:
  1. `saveStore.ts` 中 Dexie 版本从 2 升级到 3，新增 `archives` 表定义（对齐 ADR-002 §决策）
  2. 表索引：`++id, runId, endedAt`（支持按运行编号和时间查询）
  3. 版本迁移逻辑正确，旧存档升级不丢数据
  4. `getArchiveRecords()` 异步方法暴露给 gameStore
  5. 档案馆 UI 组件支持 loading → loaded 状态（对齐 ADR-002 技术约束）
  6. 主存档体积不随 Transcend 次数增长（ArchiveRecord 不嵌入 GameState）
- **复杂度**: M
- **依赖**: Story 0.1（Serializer 基础修复）
- **涉及文件**: `src/stores/saveStore.ts`、`src/stores/gameStore.ts`
- **ADR-002 约束**: ArchiveRecord 不参与 GameState 序列化，独立存储在 IndexedDB
- **⚠️ 对齐项**: GDD §2.3 写"存储位置：`GameState.runArchive: ArchiveRecord[]`"，与 ADR-002 决策（IndexedDB 独立表）**直接矛盾**。以 ADR-002 为准，GDD 需更新。

---

#### Story 2.1.2: ArchiveRecord 数据结构与快照采集

- **描述**: 定义 ArchiveRecord 接口，在 Transcend 执行前采集本轮数据生成快照
- **验收标准**:
  1. `ArchiveRecord` 包含 GDD §2.2.2 定义的全部字段：runId、transcendCount、maxNumber、maxLog10、runDuration、dimensionsVisited、primaryDimension、prestigeCount、expansionCount、eventsTriggered、collapsesTriggered、maxEntropy、geneChainSnapshot、stardustEarned、darkEnergyEarned、singularityEarned、timestamp、epochReached、isMilestone
  2. `TranscendSystem.executeTranscend` 重置逻辑**之前**采集数据（对齐 GDD §2.2.1）
  3. `geneChainSnapshot` 为轻量级 `GeneSnapshot[]`（仅类型+等级，不含运行时状态）
  4. 快照写入 IndexedDB `archives` 表
  5. 本轮计数器（`_runStartTime`、`_runDimensionsVisited`、`_runEventCount` 等）在 Transcend 后重置
- **复杂度**: M
- **依赖**: Story 2.1.1（IndexedDB 表）、Sprint 1 完成（基因链快照需要基因系统）
- **涉及文件**: `src/types/game.ts`、`src/systems/ArchiveSystem.ts`（新建）、`src/systems/TranscendSystem.ts`、`src/stores/gameStore.ts`
- **⚠️ 对齐项**: GDD 的 `ArchiveRecord` 有 17 个字段（含 `maxLog10`、`dimensionsVisited[]`、`primaryDimension`、`geneChainSnapshot: GeneSnapshot[]`、`isMilestone`）；架构评估的 `ArchiveRecord` 有 12 个字段（含 `totalNumber`、`dimensionUsed: DimensionId`、`geneChainSnapshot: GeneSlot[]`）。字段集和类型不同，**须统一**。建议以 GDD 为准（更完整）。

---

#### Story 2.1.3: 档案馆解锁逻辑

- **描述**: 完成 5 次 Transcend 后自动解锁档案馆
- **验收标准**:
  1. `GameState` 新增 `archiveUnlocked: boolean`（参与主存档序列化）
  2. 第 5 次 Transcend 完成后 `archiveUnlocked` 设为 `true`，弹出介绍叙事（对齐 GDD §2.1）
  3. 解锁后 UI 入口常驻可见
  4. 解锁前入口灰显 + 锁图标，hover 显示"完成 5 次超越后解锁"（对齐 GDD §5.4）
  5. 旧存档加载时检查 `transcendCount >= 5` 自动设为 `true`（对齐 GDD §6 边缘情况 #1）
- **复杂度**: S
- **依赖**: Story 0.1（Serializer 支持 archiveUnlocked）、Story 2.1.1
- **涉及文件**: `src/systems/ArchiveSystem.ts`、`src/stores/gameStore.ts`、`src/types/game.ts`

---

### Epic 2.2: 档案馆功能

> **对齐 GDD §2.3~2.5**（存储管理、成就联动、数据对比）

---

#### Story 2.2.1: 快照存储管理与容量控制

- **描述**: 快照最多保留 100 张，超出时自动删除最早非里程碑快照
- **验收标准**:
  1. 快照数量超过 100 时自动删除最早的非里程碑快照（对齐 GDD §2.3）
  2. 里程碑快照不可删除（第 1/5/10/25/50/100 次 Transcend、maxLog10 首次突破 50/100/200/300 等）
  3. 100 张全是里程碑时不删除，允许超过上限（对齐 GDD §6 边缘情况 #2）
  4. 非里程碑快照可左滑删除（需二次确认）
  5. 里程碑快照有金色★标记 + 金色边框
- **复杂度**: M
- **依赖**: Story 2.1.2（快照数据结构）
- **涉及文件**: `src/systems/ArchiveSystem.ts`、`src/stores/gameStore.ts`

---

#### Story 2.2.2: 特殊成就联动

- **描述**: 档案馆数据触发特殊成就（质数探索者、混沌行者、逆熵者等 9 个）
- **验收标准**:
  1. 9 个特殊成就定义与 GDD §2.4 表格一致（ID、名称、解锁条件、奖励）
  2. 快照生成后检查是否满足特殊成就条件
  3. 满足条件时通过 AchievementSystem 触发解锁
  4. 成就奖励（奇点核心）正确发放
  5. 成就联动面板在档案馆 UI 中展示（已解锁/未解锁状态）
- **复杂度**: M
- **依赖**: Story 2.1.2（快照数据）、Story 0.5（维度资源产出正常——部分成就依赖维度数据）
- **涉及文件**: `src/systems/ArchiveSystem.ts`、`src/systems/AchievementSystem.ts`、`src/core/Constants.ts`（ACHIEVEMENT_DEFS 扩展）

---

#### Story 2.2.3: 数据对比功能

- **描述**: 玩家可选中 2 张快照进行数据对比
- **验收标准**:
  1. 选中 2 张快照后点击"对比"按钮进入对比视图（对齐 GDD §2.5）
  2. 对比维度：maxLog10（柱状图）、runDuration（柱状图+效率 log10/s）、prestigeCount、eventsTriggered、geneChainSnapshot（并排可视化）
  3. 对比柱状图：左 Run 蓝色 `#4488ff`，右 Run 橙色 `#ff8844`（对齐 GDD §5.4）
  4. 基因链对比展示类型+等级并排
- **复杂度**: M
- **依赖**: Story 2.1.2（快照数据）
- **涉及文件**: `src/systems/ArchiveSystem.ts`、`src/components/modals/ArchiveModal.vue`（新建）

---

### Epic 2.3: 档案馆 UI

> **对齐 GDD §5**（ArchiveModal.vue UI 规格）

---

#### Story 2.3.1: ArchiveModal.vue 快照卡片网格

- **描述**: 实现档案馆面板 UI，含总览统计、快照卡片网格、筛选排序
- **验收标准**:
  1. 布局结构对齐 GDD §5.1（总览栏、筛选标签、排序选项、快照卡片网格、成就联动栏）
  2. 快照卡片（160×200px）显示：Run 编号、maxLog10、时长、主维度图标、基因/事件数（对齐 GDD §5.2）
  3. 里程碑卡片金色★+金色边框+微弱发光动画
  4. 卡片悬停 `translateY(-4px)` + 阴影增强
  5. 点击卡片展开详情面板（全屏覆盖）
  6. 长按选中/取消选中（蓝色边框），用于对比功能
- **复杂度**: L
- **依赖**: Story 2.1.3（解锁逻辑）、Story 2.2.1（存储管理）
- **涉及文件**: `src/components/modals/ArchiveModal.vue`（新建）

---

#### Story 2.3.2: 筛选排序与统计总览

- **描述**: 实现快照筛选、排序和统计总览功能
- **验收标准**:
  1. 筛选标签：全部 / 里程碑 / 按维度（质数/混沌/反熵/奇点）（对齐 GDD §5.1）
  2. 排序选项：时间↓ / maxLog10↓ / 效率↓（对齐 GDD §2.3 排序规则）
  3. 统计总览：总 Run 数、历史最高 maxLog10、总时长、最快 Run、最长 Run（对齐 GDD §3.1 ArchiveSummary）
  4. 统计数据从 IndexedDB 异步查询，UI 显示 loading 状态
- **复杂度**: M
- **依赖**: Story 2.3.1（基础布局）、Story 2.1.1（异步查询）
- **涉及文件**: `src/components/modals/ArchiveModal.vue`、`src/systems/ArchiveSystem.ts`

---

## 5. Sprint 3：数字神话图鉴

> **来源 GDD**: `design/gdd/codex-system.md`
> **对齐架构评估**: `docs/architecture/v2-arch-assessment.md` §3
> **备注**: 图鉴核心功能（叙事自动收录）不依赖基因/档案馆/皮肤系统，可部分并行开发；但未解之谜联动解锁测试需要前序系统就绪

### Epic 3.1: 图鉴数据层

> **对齐 GDD §3**（数据结构）+ **架构评估 §3.2**

---

#### Story 3.1.1: CodexEntryDef 定义与 CODEX_DEFS 静态数据

- **描述**: 定义图鉴词条分类、静态定义接口，编写全部词条静态数据
- **验收标准**:
  1. `CodexCategory` 联合类型：`'origin' | 'cosmic_event' | 'sage_record' | 'mystery'`（对齐 GDD §2.1）
  2. `CodexEntryDef` 接口包含 id、title、category、content（string[] 段落列表）、narrativeSource、narrativeHash、unlockConditions、hiddenHint、icon（对齐 GDD §3.1）
  3. `CODEX_DEFS` 定义全部 ~65 条词条（起源传说 ~15、宇宙事件 ~20、先贤记录 ~18、未解之谜 ~12）
  4. 12 条未解之谜词条的解锁条件与 GDD §2.3 表格一致（mystery_01~12）
  5. 每条词条正文 2-4 段，每段 50-100 字（对齐 GDD §2.5）
- **复杂度**: L
- **依赖**: 无
- **涉及文件**: `src/types/game.ts`、`src/core/Constants.ts`
- **⚠️ 对齐项**: GDD 的 `CodexEntryDef.content` 为 `string[]`（多段落）；架构评估为 `string`（单字符串）。GDD 的 `unlockConditions` 为 `CodexUnlockCondition[]`（多条件数组）；架构评估为单一 `unlockCondition` 对象 + `unlockType` 枚举。**须统一**，建议以 GDD 为准（更灵活，支持多条件组合）。

---

#### Story 3.1.2: 图鉴状态与序列化

- **描述**: 定义图鉴运行时状态，实现序列化/反序列化
- **验收标准**:
  1. `GameState` 新增 `codexEntries: Map<string, CodexEntryState>` 和 `codexInitialized: boolean`（对齐 GDD §3.2）
  2. `CodexEntryState` 包含 id、unlocked、unlockedAt 字段
  3. Serializer 将 `codexEntries` Map 序列化为 `Record<string, CodexEntryState>`
  4. 存档→读档 round-trip 后图鉴收录状态完整保留
  5. 旧存档加载时初始化为空 Map，不崩溃（对齐 GDD §6 边缘情况 #2）
  6. `categoryCounts` 在序列化时不存储（运行时从 entries 计算）
- **复杂度**: M
- **依赖**: Story 0.1（Serializer 基础）、Story 3.1.1（类型定义）
- **涉及文件**: `src/types/game.ts`、`src/core/Serializer.ts`、`src/types/save.ts`
- **⚠️ 对齐项**: GDD 用 `codexEntries: Map<string, CodexEntryState>` + `categoryCounts`；架构评估用 `unlockedCodexEntries: Set<string>` + `triggeredNarratives: Map<string, number>`。数据结构不同，**须统一**。GDD 方案保留了收录时间戳，更完整。

---

#### Story 3.1.3: 叙事触发钩子注入

- **描述**: 在 `gameStore.showNarration()` 中注入图鉴收录钩子
- **验收标准**:
  1. `showNarration()` 中新增 `codexSystem.onNarrativeTriggered(source, text)` 调用（对齐 GDD §4.1）
  2. 所有叙事触发路径（Prestige/Expansion/Transcend/Dimension/Entropy/Gene/Event）都经过 `showNarration()`
  3. 叙事 key 命名规范统一：`{system}_{event}_{index}`（对齐架构评估 §6 风险表建议）
  4. 钩子注入不影响现有叙事展示性能
- **复杂度**: M
- **依赖**: Story 3.1.2（图鉴状态）
- **涉及文件**: `src/stores/gameStore.ts`、`src/systems/CodexSystem.ts`（新建）

---

### Epic 3.2: 图鉴收录与解锁

> **对齐 GDD §2.2**（自动收录）+ **GDD §2.3**（跨系统联动解锁）

---

#### Story 3.2.1: 自动收录机制

- **描述**: 叙事触发时自动检查关联图鉴词条，未收录则收录并通知
- **验收标准**:
  1. `onNarrativeTriggered(source, text)` 通过 source + text hash 匹配关联 CodexEntry（对齐 GDD §2.2.2 收录流程）
  2. 词条存在且未收录 → 标记为已收录 + 通知玩家（"📖 图鉴更新：{词条标题}"）
  3. 词条不存在 → 忽略（非所有叙事都有图鉴词条）
  4. 词条已收录 → 忽略（去重，对齐 GDD §6 边缘情况 #1）
  5. 收录通知右上角显示，持续 3 秒后消失，最多堆叠 3 条（对齐 GDD §5.5）
  6. 点击通知可直接打开图鉴并定位到该词条
- **复杂度**: M
- **依赖**: Story 3.1.3（钩子注入）、Story 3.1.1（CODEX_DEFS）
- **涉及文件**: `src/systems/CodexSystem.ts`、`src/stores/gameStore.ts`、通知 UI 组件

---

#### Story 3.2.2: 跨系统联动解锁检测

- **描述**: 未解之谜词条的跨系统条件组合检测
- **验收标准**:
  1. 12 条未解之谜的解锁条件全部实现（mystery_01~12，对齐 GDD §2.3 表格）
  2. 联动检测在以下时机执行：每次 Transcend 后、每次维度切换后、每次熵崩触发后、每次基因变化后、每次皮肤切换后（对齐 GDD §4 联动检测时机）
  3. 条件满足时词条从 `??????????` 解锁为正常显示
  4. 解锁后词条显示标题、正文、解锁条件描述、解锁时间
  5. 至少手动测试 mystery_01~05 确认解锁逻辑正确（对齐 GDD §7 验收标准 #5）
- **复杂度**: L
- **依赖**: Sprint 1（基因系统——mystery_05 需要全 8 类基因）、Sprint 2（档案馆——mystery_06 需要 ≥50 条快照）、Sprint 4（皮肤——mystery_10 需要二进制脉冲皮肤）
- **涉及文件**: `src/systems/CodexSystem.ts`、`src/stores/gameStore.ts`
- **备注**: 联动解锁检测可先实现框架，具体条件在依赖系统就绪后逐步接入

---

#### Story 3.2.3: 兜底全量检查

- **描述**: 每次 Transcend 后做一次全量条件检查，防止条件满足但未被检测到的情况
- **验收标准**:
  1. 每次 Transcend 后调用 `CodexSystem.checkAllMysteries(state)` 全量检查所有未解之谜条件（对齐 GDD §6 边缘情况 #3）
  2. 全量检查不显著影响 Transcend 后的性能（< 50ms）
  3. 检查结果与实时检测一致
- **复杂度**: S
- **依赖**: Story 3.2.2（联动解锁框架）
- **涉及文件**: `src/systems/CodexSystem.ts`、`src/systems/TranscendSystem.ts`

---

### Epic 3.3: 图鉴 UI

> **对齐 GDD §5**（CodexModal.vue UI 规格）

---

#### Story 3.3.1: CodexModal.vue 分类与列表

- **描述**: 实现图鉴面板 UI，含分类标签、词条列表、进度条
- **验收标准**:
  1. 布局结构对齐 GDD §5.1（总览进度、分类标签、词条列表）
  2. 四大分类标签切换：起源传说 / 宇宙事件 / 先贤记录 / 未解之谜
  3. 各分类进度计数显示（如"12/15"）
  4. 总收录进度条显示（如"33/65 (50.8%)"）
  5. 已收录词条卡片：标题+分类图标+正文+收录时间+来源（对齐 GDD §5.2）
  6. 隐藏词条卡片：模糊标题 `??????????` + 模糊正文 + 提示语 + 锁图标（对齐 GDD §5.2）
  7. 新收录词条（24h 内）金色边框 + "NEW" 标签（对齐 GDD §5.2）
  8. 已收录卡片背景 `rgba(30,20,50,0.85)` + 左侧 4px 分类色条
  9. 隐藏卡片正文模糊滤镜 `blur(3px)`
- **复杂度**: L
- **依赖**: Story 3.1.1（CODEX_DEFS）、Story 3.2.1（收录机制）
- **涉及文件**: `src/components/modals/CodexModal.vue`（新建）

---

#### Story 3.3.2: 收录通知与跳转

- **描述**: 实现图鉴收录通知和点击跳转
- **验收标准**:
  1. 叙事触发且图鉴更新时，右上角显示轻量通知（对齐 GDD §5.5）
  2. 通知持续 3 秒后自动消失
  3. 多条同时触发时堆叠显示（最多 3 条）
  4. 点击通知直接打开图鉴并定位到该词条
  5. 新收录动画：卡片从底部滑入 + 金色闪光 0.5s（对齐 GDD §5.4）
- **复杂度**: S
- **依赖**: Story 3.2.1（收录机制）、Story 3.3.1（图鉴面板）
- **涉及文件**: 通知 UI 组件、`src/components/modals/CodexModal.vue`

---

## 6. Sprint 4：皮肤系统

> **来源 GDD**: `design/gdd/skin-system.md`
> **对齐 ADR**: `docs/architecture/adr-003-skin-theme-implementation.md`（CSS Variables）
> **对齐架构评估**: `docs/architecture/v2-arch-assessment.md` §4

### Epic 4.1: 数字皮肤

> **对齐 GDD §2.1**（4 种数字皮肤）+ **ADR-003**（Formatter 改造）

---

#### Story 4.1.1: Formatter 改造与格式化器实现

- **描述**: 改造 `Formatter.ts`（或 `BigNumber.format()`），新增 skin 参数支持 4 种格式化器
- **验收标准**:
  1. `format(value, skin?)` 新增可选 `skin` 参数，默认 `'scientific'`，不破坏现有调用方（对齐 ADR-003 技术约束）
  2. 科学记数（`skin_scientific`）：`< 1000` 整数显示，`>= 1000` 为 `[mantissa]e[exponent]`，`>= 1e303` 双上箭头，`>= 1e1e308` 三上箭头（对齐 GDD §2.1.1）
  3. 工程记数（`skin_engineering`）：指数归整到 3 的倍数（对齐 GDD §2.1.1）
  4. 汉字大数（`skin_chinese`）：万/亿/兆/京/垓…单位序列，超过已知单位回退科学记数（对齐 GDD §2.1.1）
  5. 二进制脉冲（`skin_binary`）：`< 256` 实际二进制，`>= 256` 科学记数回退 + 脉冲装饰（对齐 GDD §2.1.1）
  6. `gameStore.updateDisplayStrings()` 读取当前皮肤并传入 format
- **复杂度**: L
- **依赖**: 无
- **涉及文件**: `src/core/Formatter.ts`（或 `src/core/BigNumber.ts`）、`src/stores/gameStore.ts`
- **⚠️ 对齐项**: GDD 使用 `NumberSkinId`（`skin_scientific` 等）+ `formatter: 'scientific' | 'engineering' | ...`；架构评估使用 `NumberSkinType`（`scientific` 等）。命名不同。**须统一**。
- **备注**: 二进制脉冲可能需要 SVG 渲染，与纯文本格式化不兼容。架构评估建议 v2.0 先做前三种，二进制脉冲延后。建议在本 Story 中实现前三种，二进制脉冲单独拆为 Story 4.1.3。

---

#### Story 4.1.2: 数字皮肤解锁与切换逻辑

- **描述**: 实现数字皮肤的解锁条件检查、资源消耗和切换
- **验收标准**:
  1. `GameState` 新增 `activeNumberSkin`、`unlockedNumberSkins: Set`（对齐 GDD §3.2）
  2. 4 种皮肤解锁条件正确：科学记数（默认）、工程记数（Prestige 3 次，50 星尘）、汉字大数（Transcend 1 次，3 奇点核心）、二进制脉冲（奇点维度 e100，5 奇点核心）（对齐 GDD §2.1）
  3. 解锁消耗正确扣减对应资源
  4. 切换即时生效，修改 `activeNumberSkin`，`format()` 读取该字段
  5. 切换无冷却，已解锁可自由切换
  6. 旧存档加载时初始化为默认值（对齐 GDD §6 边缘情况 #1）
  7. 资源不足时解锁按钮灰显
- **复杂度**: M
- **依赖**: Story 0.1（Serializer）、Story 4.1.1（Formatter）
- **涉及文件**: `src/systems/SkinSystem.ts`（新建）、`src/types/game.ts`、`src/core/Serializer.ts`、`src/stores/gameStore.ts`
- **⚠️ 对齐项**: GDD 用 `unlockedNumberSkins: Set<NumberSkinId>` + `unlockedThemes: Set<UIThemeId>`（分开）；架构评估用 `unlockedSkins: Set<string>`（合并）。**须统一**。

---

#### Story 4.1.3: 二进制脉冲皮肤（可选/延后）

- **描述**: 实现二进制脉冲皮肤的脉冲装饰渲染
- **验收标准**:
  1. `>= 256` 的数字显示科学记数 + `▮▯` 脉冲装饰前缀
  2. 脉冲装饰根据 mantissa 的二进制位生成（每 bit 1→▮，0→▯）
  3. 超大数（> 1e308）回退科学记数箭头格式，前缀保留装饰性脉冲符号（对齐 GDD §6 边缘情况 #4）
  4. 可能需要组件配合（SVG 渲染），不通过纯 Formatter 实现
- **复杂度**: M
- **依赖**: Story 4.1.1（Formatter 基础）、Story 4.1.2（解锁逻辑）
- **涉及文件**: `src/core/Formatter.ts`、可能需要新增 SVG 组件
- **备注**: 架构评估建议可延后至 v2.1，v2.0 先做前三种皮肤

---

### Epic 4.2: UI 主题

> **对齐 GDD §2.2~2.3**（5 种主题 + CSS 变量）+ **ADR-003**（CSS Variables 方案）

---

#### Story 4.2.1: CSS Variables 定义与主题切换

- **描述**: 在根元素定义 CSS 变量集，实现 5 种主题的变量切换
- **验收标准**:
  1. `:root` 上定义全部 CSS 变量（背景色、文字色、边框色、功能色、特殊元素等）（对齐 GDD §2.3）
  2. 5 种主题各对应一组变量值，通过 `data-theme` 属性切换（对齐 ADR-003 决策）
  3. `gameStore` 新增 `setTheme(themeId)` action，通过 `document.documentElement.setAttribute('data-theme', ...)` 切换
  4. 主题切换 < 1ms（一帧内完成，对齐 ADR-003 技术约束）
  5. 主题切换有 0.2s 过渡动画（对齐 GDD §5.5）
  6. `activeTheme` 持久化到存档
- **复杂度**: M
- **依赖**: Story 0.1（Serializer）
- **涉及文件**: `src/App.vue`（或根组件 CSS）、`src/stores/gameStore.ts`、`src/types/game.ts`
- **⚠️ 对齐项**: GDD 的 CSS 变量命名为 `--bg-primary`、`--text-primary`、`--number-color` 等；ADR-003 的示例为 `--color-bg-primary`、`--color-text-primary`、`--color-accent` 等。命名规范不一致。**须统一为一种命名方案**。建议以 GDD 为准（更完整，含 `--number-color`、`--progress-fill` 等特殊元素变量）。

---

#### Story 4.2.2: 现有组件 CSS 变量迁移

- **描述**: 将现有 ~32 个 Vue 组件中的硬编码颜色替换为 `var(--xxx)` 引用
- **验收标准**:
  1. 全部组件的 `<style scoped>` 中无硬编码颜色值（全部使用 `var(--xxx)`）
  2. 默认主题（深空蓝）下视觉与迁移前一致
  3. 切换到其他 4 种主题时，所有组件配色正确变化
  4. 无选择器优先级冲突（对齐 ADR-003 否决理由）
  5. 熵崩红主题的微弱屏幕抖动效果（`subtle-tremor` 动画）正常播放（对齐 GDD §2.3.5）
- **复杂度**: L
- **依赖**: Story 4.2.1（CSS 变量定义）
- **涉及文件**: 全部 `src/components/**/*.vue` 的 `<style>` 部分
- **备注**: 这是工作量最大的 Story，可按组件分批迁移

---

#### Story 4.2.3: UI 主题解锁逻辑

- **描述**: 实现 5 种 UI 主题的解锁条件检查和资源消耗
- **验收标准**:
  1. 5 种主题解锁条件正确：深空蓝（默认）、质数绿（Dim-1 精通 Lv 2，20 质核）、混沌橙（Dim-2 精通 Lv 2，20 混沌碎片）、奇点白（Dim-4 精通 Lv 3，10 奇点核心）、熵崩红（累计 10 次熵崩，30 熵晶）（对齐 GDD §2.2）
  2. 解锁消耗正确扣减对应维度资源或奇点核心
  3. 主题切换即时生效，全屏配色即时变化
  4. 未解锁主题半透明 + 锁图标 + 消耗资源提示
  5. 解锁确认弹窗显示资源消耗 + 确认/取消
- **复杂度**: M
- **依赖**: Story 4.2.1（主题切换）、Story 0.5（维度资源产出正常）
- **涉及文件**: `src/systems/SkinSystem.ts`、`src/stores/gameStore.ts`

---

### Epic 4.3: 皮肤选择器 UI

> **对齐 GDD §5**（SkinSelector.vue UI 规格）

---

#### Story 4.3.1: SkinSelector.vue 布局与交互

- **描述**: 实现皮肤选择器面板 UI，含数字皮肤卡片和 UI 主题卡片
- **验收标准**:
  1. 布局结构对齐 GDD §5.1（数字皮肤区、UI 主题区、底部提示）
  2. 数字皮肤卡片（120×100px）：预览区（以 `123456789` 为示例数字）、名称、状态（✅使用中 / 🔒{消耗}）（对齐 GDD §5.2）
  3. UI 主题卡片（100×80px）：预览色块（背景色+主文字色+强调色）、名称、状态（对齐 GDD §5.3）
  4. 已解锁卡片点击即时切换，选中态蓝色边框 + ✅
  5. 未解锁卡片半透明 + 锁图标，点击弹出解锁确认弹窗（对齐 GDD §5.4）
  6. 数字皮肤切换预览区示例数字实时变化
  7. UI 主题切换全屏即时变色
  8. 底部固定提示"皮肤和主题均为纯视觉效果，不影响游戏数值"
- **复杂度**: M
- **依赖**: Story 4.1.2（数字皮肤解锁）、Story 4.2.3（主题解锁）
- **涉及文件**: `src/components/modals/SkinSelector.vue`（新建）

---

## 7. 依赖关系总览

### 7.1 Sprint 间依赖

```
Sprint 0 (致命Bug修复)
  │
  ├── Story 0.1 (Serializer) ──────────────────────┐
  │     ↓                                           │
  ├── Story 0.2 (维度倍率接入)                      │
  ├── Story 0.3 (混沌ID修正)                        │
  ├── Story 0.4 (质数检测修复) ←── 依赖 0.2         │
  ├── Story 0.5 (tickDimensionResources) ←── 依赖 0.1
  ├── Story 0.7 (维度屏障) ←── 依赖 0.1             │
  ├── Story 0.8 (随机停机) ←── 依赖 0.1             │
  └── 其余 Story 0.6, 0.9-0.16 (无强依赖)           │
                                                    │
Sprint 1 (基因进化) ←── 依赖 Sprint 0 完成 ─────────┘
  │
  ├── Epic 1.1 (类型与数据层)
  │     ├── 1.1.1 (类型定义) ←── 无依赖
  │     ├── 1.1.2 (状态+序列化) ←── 依赖 0.1, 1.1.1
  │     └── 1.1.3 (种子机制) ←── 依赖 1.1.2
  │
  ├── Epic 1.2 (进化操作)
  │     ├── 1.2.1 (突变) ←── 依赖 1.1.2, 1.1.3
  │     ├── 1.2.2 (筛选) ←── 依赖 1.1.2
  │     ├── 1.2.3 (重组) ←── 依赖 1.1.2
  │     └── 1.2.4 (新基因+奇异) ←── 依赖 1.1.2, 1.2.3
  │
  ├── Epic 1.3 (效果接入)
  │     ├── 1.3.1 (MultiplierSystem) ←── 依赖 1.1.2
  │     ├── 1.3.2 (槽扩容) ←── 依赖 1.1.2
  │     └── 1.3.3 (跨系统) ←── 依赖 1.3.1, 1.1.3
  │
  └── Epic 1.4 (UI)
        ├── 1.4.1 (基础布局) ←── 依赖 1.1.2, 1.3.2
        └── 1.4.2 (交互动画) ←── 依赖 1.4.1, 1.2.1, 1.2.3
  │
Sprint 2 (档案馆) ←── 依赖 Sprint 1 完成（基因链快照需要基因系统）
  │
  ├── Epic 2.1 (数据层)
  │     ├── 2.1.1 (IndexedDB) ←── 依赖 0.1
  │     ├── 2.1.2 (快照采集) ←── 依赖 2.1.1, Sprint 1
  │     └── 2.1.3 (解锁逻辑) ←── 依赖 0.1, 2.1.1
  │
  ├── Epic 2.2 (功能)
  │     ├── 2.2.1 (存储管理) ←── 依赖 2.1.2
  │     ├── 2.2.2 (成就联动) ←── 依赖 2.1.2, 0.5
  │     └── 2.2.3 (数据对比) ←── 依赖 2.1.2
  │
  └── Epic 2.3 (UI)
        ├── 2.3.1 (卡片网格) ←── 依赖 2.1.3, 2.2.1
        └── 2.3.2 (筛选统计) ←── 依赖 2.3.1, 2.1.1
  │
Sprint 3 (图鉴) ←── 核心功能可并行于 Sprint 2；联动解锁需 Sprint 1+2+4
  │
  ├── Epic 3.1 (数据层) ←── 可与 Sprint 2 并行
  │     ├── 3.1.1 (CODEX_DEFS) ←── 无依赖
  │     ├── 3.1.2 (状态序列化) ←── 依赖 0.1, 3.1.1
  │     └── 3.1.3 (钩子注入) ←── 依赖 3.1.2
  │
  ├── Epic 3.2 (收录与解锁)
  │     ├── 3.2.1 (自动收录) ←── 依赖 3.1.3, 3.1.1
  │     ├── 3.2.2 (联动解锁) ←── 依赖 Sprint 1+2+4 (逐步接入)
  │     └── 3.2.3 (兜底检查) ←── 依赖 3.2.2
  │
  └── Epic 3.3 (UI) ←── 可与 Sprint 2 UI 并行
        ├── 3.3.1 (分类列表) ←── 依赖 3.1.1, 3.2.1
        └── 3.3.2 (通知跳转) ←── 依赖 3.2.1, 3.3.1
  │
Sprint 4 (皮肤) ←── 可与 Sprint 3 并行；不阻塞任何依赖链
  │
  ├── Epic 4.1 (数字皮肤)
  │     ├── 4.1.1 (Formatter) ←── 无依赖
  │     ├── 4.1.2 (解锁切换) ←── 依赖 0.1, 4.1.1
  │     └── 4.1.3 (二进制脉冲) ←── 依赖 4.1.1, 4.1.2 [可选延后]
  │
  ├── Epic 4.2 (UI主题)
  │     ├── 4.2.1 (CSS变量) ←── 依赖 0.1
  │     ├── 4.2.2 (组件迁移) ←── 依赖 4.2.1
  │     └── 4.2.3 (主题解锁) ←── 依赖 4.2.1, 0.5
  │
  └── Epic 4.3 (选择器UI)
        └── 4.3.1 (SkinSelector) ←── 依赖 4.1.2, 4.2.3
```

### 7.2 关键依赖链

| 链路 | 路径 | 说明 |
|------|------|------|
| **关键路径** | 0.1 → 1.1.2 → 1.2.3 → 2.1.2 | Serializer → 基因序列化 → 重组(Transcend改造) → 档案馆快照 |
| **维度修复链** | 0.1 → 0.5 → 0.2 → 0.4 | Serializer → 资源产出 → 倍率接入 → 质数检测 |
| **熵崩补全线** | 0.1 → 0.7 + 0.8 + 0.9 + 0.10 | Serializer → 屏障 + 停机 + 时间因子 + 回溯 |
| **图鉴联动链** | Sprint 1 + 2 + 4 → 3.2.2 | 全部新系统 → 未解之谜联动解锁 |
| **并行机会 1** | Sprint 3 Epic 3.1 ∥ Sprint 2 | 图鉴数据层与档案馆并行 |
| **并行机会 2** | Sprint 4 ∥ Sprint 3 | 皮肤系统与图鉴并行 |

---

## 8. 工作量估算总表

### 8.1 Sprint 汇总

| Sprint | Epic 数 | Story 数 | 预估总复杂度 | 说明 |
|:---:|:---:|:---:|:---:|------|
| Sprint 0 | — | 16 | 16S+0M+0L → 实际 8S+6M+2L* | 致命Bug修复，含3个P0阻断+4个P0缺失 |
| Sprint 1 | 4 | 11 | 2S+7M+2L | 基因进化系统 |
| Sprint 2 | 3 | 8 | 1S+5M+2L | 宇宙档案馆 |
| Sprint 3 | 3 | 7 | 1S+3M+3L | 数字神话图鉴 |
| Sprint 4 | 3 | 6 | 0S+3M+3L | 皮肤系统 |
| **合计** | **13** | **48** | **12S+24M+12L** | — |

> *Sprint 0 复杂度分布：S=8（Story 0.3/0.5/0.6/0.9/0.10/0.11/0.12/0.13/0.15/0.16 中的 8 个）、M=6（Story 0.1/0.2/0.4/0.7/0.8/0.14）、L=0。修正后：10S+6M+0L

### 8.2 修正后的复杂度分布

| Sprint | Story 数 | S | M | L | 预估人天* |
|:---:|:---:|:---:|:---:|:---:|:---:|
| Sprint 0 | 16 | 10 | 6 | 0 | ~14 天 |
| Sprint 1 | 11 | 2 | 7 | 2 | ~18 天 |
| Sprint 2 | 8 | 1 | 5 | 2 | ~15 天 |
| Sprint 3 | 7 | 1 | 3 | 3 | ~15 天 |
| Sprint 4 | 6 | 0 | 3 | 3 | ~13 天 |
| **合计** | **48** | **14** | **24** | **10** | **~75 天** |

> *预估人天按 S=0.5天、M=1.5天、L=3天 估算，单人开发。实际可并行后缩短。

### 8.3 Sprint 0 致命项优先级排序

| 优先级 | Story | 复杂度 | 阻塞说明 |
|:---:|------|:---:|------|
| P0-阻断 | 0.1 Serializer 序列化缺口 | M | 阻塞所有新系统序列化 |
| P0-阻断 | 0.2 维度倍率接入产出 | M | 维度系统沦为视觉装饰 |
| P0-阻断 | 0.3 混沌维度 ID 修正 | S | 混沌维度逻辑全部失效 |
| P0-阻断 | 0.4 质数检测大数字修复 | M | 质数维度中后期完全失效 |
| P0-阻断 | 0.5 tickDimensionResources | S | 维度资源无法积累 |
| P0-缺失 | 0.7 维度屏障道具 | M | 缺少关键策略工具 |
| P0-缺失 | 0.8 临界随机停机 | M | 临界惩罚力度不足 |
| P1-缺失 | 0.9 不稳定时间因子 | S | 不稳定惩罚不够立体 |
| P1-偏离 | 0.10 时间回溯修正 | S | 回溯效果与设计不符 |
| P1 | 0.11 反熵 prestigeCount | S | 膨胀后倍率归零 |
| P1 | 0.12 精通度精度 | S | 大数字精通度溢出 |
| P2 | 0.6 synthesizeCrystal 统一 | S | 重复实现维护风险 |
| P2 | 0.13 混沌倍率范围 | S | 范围不一致 |
| P2 | 0.14 晶体消费出口 | M | 晶体无用途 |
| P2 | 0.15 崩塌扣除比例 | S | 威慑不足 |
| P2 | 0.16 CollapseLevel 类型 | S | 类型不匹配 |

---

## 9. GDD 与 ADR 不一致汇总

> ⚠️ 以下不一致项已由用户拍板**最终对齐状态**（见各条末尾 ✅ 已对齐 标注）。GDD 侧已按最终状态更新完毕；程基岩同步更新 ADR 侧，交叉校验后两份文档应完全一致。

### 9.1 基因系统（GDD vs ADR-001 / 架构评估）

| # | 不一致项 | GDD（gene-evolution.md） | ADR-001 / 架构评估 | 建议方向 |
|---|---------|------------------------|---------------------|---------|
| G1 | 基因类型命名 | `gene_growth`、`gene_catalyst` 等带前缀 | `proliferation`、`catalyst` 等短名 | 统一为一种，建议用 GDD 的带前缀命名（更清晰） ✅ 已对齐：类型命名用 GDD 带前缀（gene_growth 等） |
| G2 | 单条基因状态接口 | `GeneState`（instanceId/type/level/expression/entangledProducers/memoryRecord/obtainedAt/lastMutatedAt） | `GeneSlot`（geneId/level/expression/mutationSeed） | 合并字段集，GDD 更完整但缺 mutationSeed ✅ 已对齐：GeneState = {instanceId, type, level, expression, entangledProducers, mutationSeed, memoryRecord, obtainedAt, lastMutatedAt} |
| G3 | expression 范围 | 0-100 | 0-1 | 统一，建议 0-1（架构评估更合理，避免大数运算） ✅ 已对齐：expression 范围 0-1 |
| G4 | 记忆基因存储 | per-gene `memoryRecord` | chain-level `historicalMaxNumber` | 统一，建议 chain-level（ADR-001 已决策） ✅ 已对齐：记忆存储用 chain-level historicalMaxNumber（ADR-001 已决策） |
| G5 | GeneDef 字段 | 有 effectPerLevel，无 baseEffect | 有 baseEffect + effectPerLevel | 统一，建议加 baseEffect（架构评估更灵活） ✅ 已对齐：GeneDef 加 baseEffect（baseEffect + effectPerLevel） |
| G6 | 基因效果计算公式 | `0.05 * level` 直接作为加法倍率值 | `1 + (baseEffect + effectPerLevel * (level-1)) * expression` | 统一公式，需考虑 expression 是否参与 ✅ 已对齐：公式 = 1 + (baseEffect + effectPerLevel*(level-1)) * expression |
| G7 | GeneChainState 字段 | chain/maxSlots/expansionCount/totalMutations/totalRecombinations/totalPrunings | slots/maxSlots/historicalMaxNumber | 合并，GDD 有统计数据，ADR 有历史最大值 ✅ 已对齐：GeneChainState 合并 GDD 统计字段 + historicalMaxNumber |

### 9.2 档案馆（GDD vs ADR-002 / 架构评估）

| # | 不一致项 | GDD（archive-system.md） | ADR-002 / 架构评估 | 建议方向 |
|---|---------|------------------------|---------------------|---------|
| A1 | 存储位置 | `GameState.runArchive: ArchiveRecord[]`（嵌入 GameState） | IndexedDB 独立表（不嵌入 GameState） | **以 ADR-002 为准**，GDD 需更新 §2.3 ✅ 已对齐：存储用 IndexedDB 独立表（ADR-002），GDD §2.3 已改为"不嵌入 GameState，存 Dexie 独立表" |
| A2 | ArchiveRecord 字段数 | 17 个字段（含 maxLog10、dimensionsVisited[]、primaryDimension、isMilestone 等） | 12 个字段（含 totalNumber、dimensionUsed、无 isMilestone） | 以 GDD 为准（更完整），补充 isMilestone ✅ 已对齐：ArchiveRecord 用 GDD 17 字段 + isMilestone |
| A3 | geneChainSnapshot 类型 | `GeneSnapshot[]`（仅 type+level） | `GeneSlot[]`（完整基因状态） | 以 GDD 为准（轻量快照，不需要运行时状态） ✅ 已对齐：geneChainSnapshot 用 GDD 的 GeneSnapshot[]（type+level） |
| A4 | runId 类型 | string（`run_{transcendCount}_{timestamp}`） | number（运行编号） | 以 GDD 为准（string 更灵活，保证唯一性） ✅ 已对齐：runId 用 string（run_{transcendCount}_{timestamp}） |
| A5 | GameState 新增字段 | 8 个（runArchive + archiveUnlocked + 6 个本轮计数器） | 3 个（archiveUnlocked + _currentRunStart + _currentRunEvents） | 合并，GDD 的计数器更完整（需支持维度/熵/星尘/暗能量统计） ✅ 已对齐：GameState 新增字段以 GDD 为准（archiveUnlocked + 6个本轮计数器，移除 runArchive 嵌入） |

### 9.3 图鉴系统（GDD vs 架构评估）

| # | 不一致项 | GDD（codex-system.md） | 架构评估 | 建议方向 |
|---|---------|------------------------|---------|---------|
| C1 | 词条正文类型 | `content: string[]`（多段落） | `content: string`（单字符串） | 以 GDD 为准（多段落更灵活） ✅ 已对齐：content: string[] |
| C2 | 解锁条件结构 | `unlockConditions: CodexUnlockCondition[]`（多条件数组） | `unlockCondition: {单对象}` + `unlockType` 枚举 | 以 GDD 为准（支持多条件组合，未解之谜需要） ✅ 已对齐：unlockConditions: CodexUnlockCondition[] |
| C3 | 图鉴状态结构 | `codexEntries: Map<string, CodexEntryState>` + `categoryCounts` | `unlockedCodexEntries: Set<string>` + `triggeredNarratives: Map` | 以 GDD 为准（保留收录时间戳） ✅ 已对齐：codexEntries: Map<string, CodexEntryState> + categoryCounts |
| C4 | 叙事匹配方式 | source + text hash 匹配 | narrativeKey 精确匹配 | 以 GDD 为准（hash 匹配更健壮） ✅ 已对齐：source + text hash 匹配 |

### 9.4 皮肤系统（GDD vs ADR-003 / 架构评估）

| # | 不一致项 | GDD（skin-system.md） | ADR-003 / 架构评估 | 建议方向 |
|---|---------|------------------------|---------------------|---------|
| S1 | 类型命名 | `NumberSkinId`（`skin_scientific` 等）+ `UIThemeId`（`theme_deep_space` 等） | `NumberSkinType`（`scientific` 等）+ `ThemeType`（`deep_space` 等） | 统一，建议用 GDD 的带前缀命名 ✅ 已对齐：NumberSkinId / UIThemeId 带前缀 |
| S2 | 皮肤定义接口 | `NumberSkinDef` + `UIThemeDef`（分开） | `SkinDef`（合并，kind 区分） | 统一，建议分开（GDD 更清晰） ✅ 已对齐：NumberSkinDef + UIThemeDef 分开 |
| S3 | 已解锁集合 | `unlockedNumberSkins: Set<NumberSkinId>` + `unlockedThemes: Set<UIThemeId>`（分开） | `unlockedSkins: Set<string>`（合并） | 统一，建议分开（GDD 更清晰） ✅ 已对齐：unlockedNumberSkins + unlockedThemes 分开 |
| S4 | CSS 变量命名 | `--bg-primary`、`--text-primary`、`--number-color` 等 | `--color-bg-primary`、`--color-text-primary`、`--color-accent` 等 | 统一，建议以 GDD 为准（更完整，含特殊元素变量） ✅ 已对齐：CSS 变量用 GDD 命名（--bg-primary 等） |
| S5 | data-theme 属性值 | `theme_deep_space` 等（带前缀） | `deep_space` 等（短名） | 与 S1 统一 ✅ 已对齐：data-theme 值带前缀（theme_deep_space） |

### 9.5 跨文档不一致

| # | 不一致项 | 位置 | 说明 |
|---|---------|------|------|
| X1 | Transcend 触发条件 | `GAME_DESIGN_DOC.md` §5.3：暗能量 ≥ 1000；`test-coverage-plan.md` §8.1：cumulativeDarkEnergy ≥ 100 | 阈值差 10 倍，须确认正确值 ✅ 已对齐：Transcend 阈值 = 1000（GAME_DESIGN_DOC 为准，测试计划 100 为错） |
| X2 | 维度切换机制 | `v2.0-update-plan.md` §二：每次 Prestige 可切换；`p0-consistency-review.md` §2.2：任意时刻 5 秒冷却 | 实现已偏离设计，须确认是否接受 ✅ 已对齐：维度切换 = 任意时刻 + 5秒冷却（已更新 v2.0-update-plan.md §二） |
| X3 | 基因 expression 是否参与效果计算 | GDD §2.5：直接用 level 计算；架构评估 §1.4：乘以 expression | 须确认 expression 是否影响实际效果倍率 ✅ 已对齐：基因 expression 参与效果计算（架构评估方案） |

---

## 10. 风险与建议

### 10.1 高风险项

| 风险 | 严重度 | 影响 Story | 缓解措施 |
|------|:---:|---------|---------|
| GDD 与 ADR 不一致未对齐 | 高 | Sprint 1-4 全部 | Sprint 启动前召开对齐会议，逐项确认 |
| 基因系统与 3 个 Prestige 层深度耦合 | 高 | 1.2.1/1.2.2/1.2.3 | 先完成类型定义和数据层，再逐步接入各 Prestige 层 |
| 档案馆引入 IndexedDB 新表 | 中 | 2.1.1 | 先写 PoC 验证 Dexie 多表方案 |
| CSS 变量迁移工作量 | 中 | 4.2.2 | 分批迁移，不阻塞其他 Story |
| 二进制脉冲皮肤渲染 | 低 | 4.1.3 | 可延后至 v2.1 |
| Transcend 触发条件阈值不一致 | 中 | 跨文档 | 须立即确认是 100 还是 1000 |

### 10.2 建议下一步

1. **立即**：召开 GDD-ADR 对齐会议，逐项确认第 9 节的不一致（特别是 G1-G7 基因系统字段集）
2. **Sprint 0 启动前**：确认维度倍率接入方案（A vs B）、质数检测降级策略
3. **Sprint 1 启动前**：确认基因类型命名方案、expression 范围、记忆基因存储方式
4. **Sprint 2 启动前**：确认 ArchiveRecord 字段集（以 GDD 为准还是架构评估为准）
5. **Sprint 3 启动前**：确认图鉴状态数据结构（Map vs Set）
6. **Sprint 4 启动前**：确认 CSS 变量命名规范
7. **持续**：每个 Sprint 完成后补充对应单元测试（对齐 `tests/test-coverage-plan.md`）

---

*文档结束*
