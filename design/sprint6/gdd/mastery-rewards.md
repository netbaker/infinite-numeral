# 精通奖励实际化 GDD（Mastery Rewards · Sprint 6 Must ②）

> **系统代号**：MasteryRewards（DimensionSystem 扩展）
> **优先级**：Sprint 6 Must ②
> **版本**：Sprint 6（设计文档）
> **依赖系统**：DimensionSystem（`tickMastery` / `calculateDimensionMultiplier`）、MultiplierSystem（`dimension` 源）、StardustSystem / ProducerSystem / OfflineSystem / ClickSystem / EntropySystem / FactorSystem / EventSystem / PrestigeSystem / TranscendSystem（机制型效果宿主）
> **设计日期**：2026-07-25
> **红线遵循**：主理人裁决——乘区型精通奖励折叠进既有 `dimension` 源（有界）、禁新增独立乘源；零新增数字印记来源（R1 上限 14 不变）；`D(s)` 保持唯一有界尾部。

---

## 1. 系统概述

`DIMENSION_MASTERY_REWARDS`（`src/core/Constants.ts:1969-1975`）目前是**纯文本数组**：每维度 5 条字符串（对应精通等级 L1–L5），由 `DimensionSystem.getMasteryReward`（`DimensionSystem.ts:137-144`）仅作 UI 展示，不产生任何真实机制。

本 GDD 将其**实际化**：把每条文本映射为可执行的真实效果，复用既有 `DimensionSystem` / `MultiplierSystem`，并基于既有的 5 维度 × 5 级精通结构（`DIMENSION_DEFS` 每维 `maxMastery:100`，`getMasteryLevel = floor(master/20)`，见 `DimensionSystem.ts:129-132`）拉开 5 维差异。

两类效果：
- **乘区型（multiplier）**：仅生产乘率，全部折叠进唯一 `dimension` 源（`MultiplierSystem.registerDimensionMultiplier` 的 `dimension_global` 条目，`MultiplierSystem.ts:316-325`），**不新增任何独立乘源**。
- **机制型（mechanic）**：成本折扣 / 离线效率 / 熵保底 / 爆发时长 / 资源获取等，由所属系统读取**效果标志位**生效，**不触碰全局乘区**。

---

## 2. 核心机制

### 2.1 单一权威数据表：`DIMENSION_MASTERY_EFFECTS`（替换旧文本数组）

废弃 `DIMENSION_MASTERY_REWARDS`（仅 `Constants.ts:1969` 与 `DimensionSystem.ts:139` 两处引用，可安全替换），改为带类型的单一权威表 `DIMENSION_MASTERY_EFFECTS: Record<number, MasteryRewardEffect[]>`，每条含 `label`（保留原文本做 UI）、`key`、`type`、`scope`、`magnitude`、`note`。`getMasteryReward` 改为读 `DIMENSION_MASTERY_EFFECTS[dimId][level-1].label`，避免平行数据源。

`MasteryRewardEffect` 字段：
- `key: string` —— 效果标志位 id（如 `'dim0_l5'`），写入 `state.activeMasteryEffects`。
- `type: 'multiplier' | 'mechanic'` —— 乘区型 / 机制型。
- `scope` —— `'global'`（全局乘区，仅 multiplier）| `'dim_rule'`（修改某维度自身 `calculateDimensionMultiplier` 分支，仍属单源）| `'resource'` | `'cost'` | `'offline'` | `'click'` | `'entropy'` | `'trigger'` | `'flag'`（纯 UI/无数值）。
- `magnitude: number` —— 效果数值（见下表），常量来自此表，运行时只读。

### 2.2 完整映射表（5 维 × 5 级 = 25 条）

| 维 | Lv | 原文本 | key | type | scope | magnitude | 读标志位的系统 |
|----|----|--------|-----|------|-------|-----------|----------------|
| 0 基础 | 1 | 星尘获取 +10% | `dim0_l1` | mechanic | resource | 0.10（×1.10 星尘） | StardustSystem（发放星尘时） |
| 0 基础 | 2 | 生产者成本 -5% | `dim0_l2` | mechanic | cost | 0.05（折扣） | ProducerSystem / Upgrade 购买成本 |
| 0 基础 | 3 | 点击基础值 +20% | `dim0_l3` | mechanic | click | 0.20（×1.20 点击） | ClickSystem |
| 0 基础 | 4 | 离线效率 +15% | `dim0_l4` | mechanic | offline | 0.15（效率 +0.15） | OfflineSystem |
| 0 基础 | 5 | 全局倍率 +5% | `dim0_l5` | **multiplier** | **global** | 0.05（×1.05 全局） | MultiplierSystem（维度源） |
| 1 质数 | 1 | 质数触发概率 +15% | `dim1_l1` | **multiplier** | **dim_rule** | 0.15（质数触发时 ×1.15） | DimensionSystem（Dim-1 分支） |
| 1 质数 | 2 | 质数倍率提升至 ×4 | `dim1_l2` | **multiplier** | **dim_rule** | 4（覆盖基 3） | DimensionSystem（Dim-1 分支） |
| 1 质数 | 3 | 质核获取 +20% | `dim1_l3` | mechanic | resource | 0.20（×1.20 质核） | DimensionSystem.tickDimensionResources |
| 1 质数 | 4 | 因子发现速度 +10% | `dim1_l4` | mechanic | trigger | 0.10（发现速率 +10%） | FactorSystem |
| 1 质数 | 5 | 质数时自动Prestige建议 | `dim1_l5` | mechanic | flag | 0（仅 UI 提示） | DimensionPanel UI |
| 2 混沌 | 1 | 混沌上限提升至 8x | `dim2_l1` | mechanic | dim_rule | 8（覆盖基 5） | DimensionSystem.rollChaosMultiplier |
| 2 混沌 | 2 | 混沌持续时间 +30s | `dim2_l2` | mechanic | trigger | 30（秒，重投间隔） | DimensionSystem.checkChaosMultiplier |
| 2 混沌 | 3 | 混沌保底（最低 1.0x） | `dim2_l3` | mechanic | dim_rule | 1.0（下限） | DimensionSystem.rollChaosMultiplier |
| 2 混沌 | 4 | 碎片合成效率 +25% | `dim2_l4` | mechanic | resource | 0.25（×1.25 碎片） | DimensionSystem.synthesizeCrystal |
| 2 混沌 | 5 | 随机事件触发率 +10% | `dim2_l5` | mechanic | trigger | 0.10（触发率 +10%） | EventSystem |
| 3 反熵 | 1 | 反熵叠加上限 +5层 | `dim3_l1` | mechanic | dim_rule | 5（层数上限 +5） | DimensionSystem（Dim-3 分支） |
| 3 反熵 | 2 | Prestige后保留 10% 数字 | `dim3_l2` | mechanic | trigger | 0.10（保留比例） | PrestigeSystem |
| 3 反熵 | 3 | 熵晶获取 +30% | `dim3_l3` | mechanic | resource | 0.30（×1.30 熵晶） | DimensionSystem.tickDimensionResources |
| 3 反熵 | 4 | 熵值增长 -15% | `dim3_l4` | mechanic | entropy | 0.15（增长率 ×0.85） | EntropySystem |
| 3 反熵 | 5 | Transcend后额外奇点核心 | `dim3_l5` | mechanic | resource | 1（额外 +1 奇点核心） | TranscendSystem |
| 4 奇点 | 1 | 临界爆发倍率 ×200 | `dim4_l1` | **multiplier** | **dim_rule** | 200（覆盖基 100） | DimensionSystem（Dim-4 分支） |
| 4 奇点 | 2 | 爆发持续时间 +5s | `dim4_l2` | mechanic | trigger | 5（秒） | DimensionSystem.checkSingularityBurst |
| 4 奇点 | 3 | 奇点核心可兑换维度晶体 | `dim4_l3` | mechanic | flag | 0（解锁兑换 UI） | DimensionPanel / synthesizeCrystal |
| 4 奇点 | 4 | 数字 e300+ 自动触发爆发 | `dim4_l4` | mechanic | trigger | 300（log10 阈值） | DimensionSystem.checkSingularityBurst |
| 4 奇点 | 5 | 超越后保留奇点印记 | `dim4_l5` | mechanic | resource | 0.20（Transcend 保留 20% 奇点核心） | TranscendSystem |

> **关键重释义（须主理人确认）**：
> - `dim1_l1` 原“质数触发概率”在现有确定性 `isPrimeDimensionTrigger`（`DimensionSystem.ts:297-313`，无概率概念）下不可直译，重释为「质数维度倍率额外 +15%」（仍是单源内的 Dim-1 规则修正）。
> - `dim3_l5` / `dim4_l5` 中“奇点印记/奇点核心”= `singularity`（奇点核心，**非** `numeralImprint` 数字印记）。本 GDD 任何条目**均不发放数字印记**（R1 红线）。

### 2.3 `applyMasteryRewards(state)` 规格

- **签名**：`DimensionSystem.applyMasteryRewards(state: GameState): void`。
- **运行位置**：统一由 `DimensionSystem.refreshDimensionBuilds(state)` 编排（见 §4），在 `gameStore.ts:633` 每 tick `tickMastery` 之后调用；并在 `unlockDimension` 后、`recalculateFromState` 重算维度源前、以及存档反序列化后各调用一次。
- **幂等性**：先 `state.activeMasteryEffects.clear()`，再据 `getMasteryLevel(dimId)` 重算全量——无增量状态，重入结果一致。
- **算法**：对每个 `dimId ∈ 0..4`，取 `lv = getMasteryLevel(state, dimId)`；对 `i ∈ 0..lv-1` 将 `DIMENSION_MASTERY_EFFECTS[dimId][i].key` 加入集合。即等级 L 解锁前 L 条，达成即激活。
- **不在此写数值**： magnitude 全来自 `DIMENSION_MASTERY_EFFECTS` 常量，运行时只读标志位。

### 2.4 乘区型如何折叠进唯一 `dimension` 源

- **全局型（`dim0_l5`）**：`MultiplierSystem.registerDimensionMultiplier`（`MultiplierSystem.ts:316-325`）改为
  `value = calculateDimensionMultiplier(state) * (1 + clamp(getMasteryGlobalMultiplierDelta(state), 0, MASTERY_GLOBAL_MULT_CAP))`。
  `getMasteryGlobalMultiplierDelta` = 所有 `activeMasteryEffects` 中 `type==='multiplier' && scope==='global'` 的 `magnitude` 之和（当前仅 `dim0_l5`=0.05）。**仍是单一条 `dimension_global` 条目，无新 source。**
- **维度规则型（`dim1_l1` / `dim1_l2` / `dim4_l1`）**：在 `calculateDimensionMultiplier` 对应分支内生效，本身即单源计算的一部分：
  - Dim-1（`DimensionSystem.ts:167-172`）：质数触发时 `mult = (active?'dim1_l2'?4:3)`，若 `dim1_l1` 再 `×1.15`。
  - Dim-4（`DimensionSystem.ts:187-198`）：若 `dim4_l1` 则爆发倍率 100→200。
  - 这些仅在 `currentDimension` 为该维时对当前 `dimension_global` 值生效，**不跨维叠加**。

---

## 3. 数据结构（新增）

```typescript
// src/core/Constants.ts 新增
export interface MasteryRewardEffect {
  key: string;                 // 写入 state.activeMasteryEffects 的标志位
  label: string;               // 原文本（UI 展示，替代旧 DIMENSION_MASTERY_REWARDS）
  type: 'multiplier' | 'mechanic';
  scope: 'global' | 'dim_rule' | 'resource' | 'cost'
       | 'offline' | 'click' | 'entropy' | 'trigger' | 'flag';
  magnitude: number;           // 效果数值（常量，运行时只读）
  note?: string;
}
/** 单权威映射表：keyed by dimId → 该维 L1..L5 效果数组 */
export const DIMENSION_MASTERY_EFFECTS: Record<number, MasteryRewardEffect[]>;
/** 乘区型全局精通奖励之总加成比例硬上限（防组合通胀） */
export const MASTERY_GLOBAL_MULT_CAP = 0.25;   // 维度源因精通最多 ×1.25（当前仅 dim0_l5 → ×1.05）
```

```typescript
// src/types/game.ts — GameState 新增（维度系统区块，约 line 1056 后）
// ---- Sprint 6 精通奖励 / 维度协同：派生缓存（由 refreshDimensionBuilds 幂等重算） ----
/** 已激活精通奖励标志位集合（如 'dim0_l5'） */
activeMasteryEffects: Set<string> = new Set();
/** 已激活跨维度协同 perk id 集合（如 'S1'） */
activeSynergies: Set<string> = new Set();
```

```typescript
// src/types/save.ts — SerializedState 新增
activeMasteryEffects: string[];
activeSynergies: string[];
```

```typescript
// src/core/Serializer.ts
// serialize（约 line 44 后，与 purchasedCrystalUpgrades 同区块）：
activeMasteryEffects: Array.from(state.activeMasteryEffects),
activeSynergies: Array.from(state.activeSynergies),
// deserialize（约 line 173 后）：
state.activeMasteryEffects = new Set(s.activeMasteryEffects ?? []);
state.activeSynergies = new Set(s.activeSynergies ?? []);
// 反序列化末尾建议调用 dimensionSystem.refreshDimensionBuilds(state) 兜底重算（幂等）。
```
> 旧存档缺字段时 `?? []` 兜底为空集，不强制 bump 版本号（与 numeral-persona 一致）；建议审计性 bump `CURRENT_VERSION` 4→5。

---

## 4. 进阶（进度）与跨系统交互

### 4.1 进度解锁
- 精通度经 `tickMastery`（`DimensionSystem.ts:100-116`）随产出对数增长，等级 `floor(master/20)`，5 级满 `master=100`。
- 每条奖励在其 `level` 达成（mastery ≥ 20·level）即激活，无需额外消耗；可因 prestige/expansion 重置 master 而回退（标志位随之清除）——符合“养成即回退风险”的取舍张力（支柱三）。
- 5 维独立，玩家可专精单维（满级早）或铺开多维（广度），形成 build 取舍。

### 4.2 跨系统交互点（机制型读取标志位）

| 读标志位 | 宿主系统 | 生效点 |
|----------|----------|--------|
| `dim0_l1` | StardustSystem | 发放星尘 `× (1+0.10)` |
| `dim0_l2` | ProducerSystem/Upgrade | 购买成本 `× (1-0.05)`（与既有折扣叠加后 min 0.5 上限） |
| `dim0_l3` | ClickSystem | 点击值 `× (1+0.20)` |
| `dim0_l4` | OfflineSystem | 离线效率 `+0.15`（夹紧 [0,1]） |
| `dim1_l3` / `dim3_l3` / `dim2_l4` | DimensionSystem.tickDimensionResources | 该维资源获取 `× (1+magnitude)` |
| `dim1_l4` | FactorSystem | 因子发现速率 `× (1+0.10)` |
| `dim1_l5` | DimensionPanel UI | 仅提示，无数值 |
| `dim2_l1`/`dim2_l3` | DimensionSystem.rollChaosMultiplier | 混沌上限 5→8、下限 0→1.0 |
| `dim2_l2` | DimensionSystem.checkChaosMultiplier | 重投间隔 +30s |
| `dim2_l5` | EventSystem | 事件触发率 `× (1+0.10)` |
| `dim3_l1` | DimensionSystem Dim-3 分支 | 反熵叠加层数上限 +5（`1+transcendCount*0.2` 仍成立，仅提高层数上限） |
| `dim3_l2` | PrestigeSystem | Prestige 后保留 10% `number` |
| `dim3_l4` | EntropySystem | 熵增长速率 `× (1-0.15)` |
| `dim3_l5` / `dim4_l5` | TranscendSystem | 额外 +1 奇点核心 / 保留 20% 奇点核心（非数字印记） |
| `dim4_l1`/`dim4_l2`/`dim4_l4` | DimensionSystem.checkSingularityBurst | 爆发 ×200、+5s、e300 自动触发 |
| `dim4_l3` | synthesizeCrystal / UI | 解锁「奇点核心→维度晶体」兑换入口 |

> 乘区型（`dim0_l5`/`dim1_l1`/`dim1_l2`/`dim4_l1`）**不在此表**——它们只在 MultiplierSystem / `calculateDimensionMultiplier` 内折叠进 `dimension` 源，见 §2.4。

---

## 5. UI 规格

入口：复用 `DimensionPanel.vue` 的精通奖励区。每条奖励展示 `DIMENSION_MASTERY_EFFECTS[dimId][i].label`，并按 `state.activeMasteryEffects.has(key)` 区分：
- 已激活：高亮 + ✅，并显示类型徽章（乘区型=金 `—color-milestone`、机制型=蓝）。
- 未激活（等级未达）：灰显 + 锁定图标 + 「需精通 Lv{i+1}」。
- `dim1_l5` 激活时，质数维度面板出现「建议 Prestige」浮标（非阻塞）。
- `dim4_l3` 激活时，奇点维度面板出现「兑换维度晶体」按钮（消耗奇点核心）。

---

## 6. 边缘情况

1. **旧存档无 `activeMasteryEffects`**：`Serializer` `?? []` 兜底；反序列化后 `refreshDimensionBuilds` 重算。
2. **精通度回退（Prestige/Expansion 重置 master）**：`applyMasteryRewards` 幂等重算，回退等级的奖励 key 自动移出集合，对应机制即时失效——无残留加成的“幽灵效果”。
3. **同时多维满级**：各维独立写入同一集合（key 唯一），不互相覆盖；乘区型仅 `dim0_l5` 全局，维度规则型仅作用于自身维，无跨维乘性叠加。
4. **`dim0_l2` 与既有成本折扣叠加**：与星尘/暗能/因子折扣同走 `MultiplierSystem.getTotalCostDiscount` 的 0.5 上限夹紧，不突破 50%。
5. **`dim3_l2` 与驯者 L2 熵崩损失封顶**：二者作用点不同（前者保 Prestige 后数字、后者封顶熵崩损失比例），互不冲突。
6. **`dim1_l5`/`dim4_l3` 纯 flag**：不写数值、不影响任何系统计算，仅 UI。
7. **`MASTERY_GLOBAL_MULT_CAP` 触发**：若未来为其他维补 global 型条目且总和 >0.25，`getMasteryGlobalMultiplierDelta` 夹紧至 0.25，维度源封顶 ×1.25。

---

## 7. 验收标准

1. `DIMENSION_MASTERY_REWARDS` 文本被 `DIMENSION_MASTERY_EFFECTS` 取代，`getMasteryReward` 读 `.label` 不报错；全仓无残留旧引用。
2. 每条奖励在其 `level` 达成时激活、`applyMasteryRewards` 幂等（连跑 N 次集合不变）。
3. `dim0_l5` 使 `dimension_global` 值 ×1.05；`dim1_l1`/`dim1_l2`/`dim4_l1` 仅在其维生效；**全程无新增 multiplier source**（grep `MultiplierEntry.source` 无新值）。
4. 机制型效果（成本/离线/熵/资源）由对应系统读取标志位正确生效，不影响全局乘区。
5. 旧存档加载不崩；`activeMasteryEffects` 正确往返序列化。
6. 任何奖励条目**不发放 `numeralImprint`**（grep 确认无 `numeralImprints +=` 路径）。

---

## 8. 抗通胀自检（设计红线）

| 维度 | 禁止模型 | 本设计 |
|------|----------|--------|
| 乘源数量 | 每维每级开新独立乘源 → 组合爆炸 | 全部乘区型折叠进**单一 `dimension` 源**（`dimension_global`），零新增 source |
| 全局上限 | 全精通 = 全局 ×∞ | 全局型仅 `dim0_l5`=+5%；硬上限 `MASTERY_GLOBAL_MULT_CAP=0.25` → 维度源因精通最多 ×1.25 |
| 跨维叠加 | 5 维乘区相乘 | 维度规则型仅作用于 `currentDimension` 自身分支，不跨维乘性叠加 |
| 数字印记 | 精通发印记 | **零印记来源**，R1 上限 14 不变 |
| D(s) 尾部 | 新增尾部乘源 | `D(s)` 仍由 PersonaSystem 在乘区末端单乘，本系统不新增尾部、不触碰 `persona` |
| 主导策略 | “全精通刷乘数”最优 | 仅 1 条全局乘区（+5%），其余为机制/资源差异 → 玩家转向 build 取舍而非纯堆级 |

**通胀上界证明**：设全局乘区贡献 `G = 1 + clamp(Σ global_magnitude, 0, 0.25)`。当前数据 `Σ = 0.05` ⇒ `G = 1.05`。维度规则型贡献 `R(dim)` 仅当 `currentDimension==dim` 时进入 `dimension_global`，常数有界（×4 / ×200）。故 `dimension` 源总贡献有界，且与 `D(s)≤0.25` 顺序串联、互不突破。✅ 满足支柱一与全部红线。

*文档结束*
