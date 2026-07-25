# 跨维度协同增益 GDD（Dimension Synergy · Sprint 6 Must ③）

> **系统代号**：SynergySystem（DimensionSystem 扩展）
> **优先级**：Sprint 6 Must ③
> **版本**：Sprint 6（设计文档）
> **依赖系统**：DimensionSystem（精通等级 / `activeMasteryEffects`）、MultiplierSystem（仅读、不写）、EntropySystem / EventSystem / PrestigeSystem / TranscendSystem / FactorSystem / OfflineSystem（机制型 perk 宿主）
> **设计日期**：2026-07-25
> **红线遵循**：主理人裁决——协同 = set-bonus / 机制层；**不发放数字印记**（R1 上限 14 不变）；**绝不新增独立乘源**；`D(s)` 保持唯一有界尾部；含小众组合以保支柱三 build 多样性。

---

## 1. 系统概述

维度羁绊是**跨维度协同层**：当一组「已精通维度」同时达到精通阈值，解锁一条 **set-bonus perk**。本质是「特定维度组合 → 特定机制/规则」的触发，而非「每精通一维 +X% 全局」（后者会成主导策略、且违反单源红线）。

- 组合 = 维度 id 集合（配对 2 维 / 三元 3 维）。
- 解锁条件 = 组合内**每个**维度 `getMasteryLevel(state, dimId) ≥ SYNERGY_MIN_LEVEL`（默认 3，即 mastery ≥ 60）。
- perk 全部为**机制/规则型**，由所属系统在运行时读取 `state.activeSynergies` 标志位生效；**零乘源、零印记**。

---

## 2. 核心机制

### 2.1 数据表：`DIMENSION_SYNERGY_DEFS`（Constants）

```typescript
// src/core/Constants.ts 新增
export interface DimensionSynergyDef {
  id: string;                 // perk id，如 'S1'
  name: string;               // 展示名
  dims: number[];             // 所需维度 id 集合（2 或 3 个）
  minLevel: number;           // 每维所需精通等级（默认取全局 SYNERGY_MIN_LEVEL）
  desc: string;               // 机制描述（UI）
  effect: SynergyEffectKind;  // 机制类型（决定哪个系统读取）
  magnitude: number;          // 机制数值（常量，运行时只读）
  niche?: boolean;            // 小众组合标记（支柱三 build 多样性）
}
export const SYNERGY_MIN_LEVEL = 3;
export const DIMENSION_SYNERGY_DEFS: DimensionSynergyDef[];
```

`effect: SynergyEffectKind` 取值：`prime_in_anti` | `burst_no_collapse` | `chaos_prime_bias` | `chaos_floor_scale` | `retain_base_mastery` | `burst_prime_bonus` | `click_charge_burst` | `trinity_burst` | `steady_triad` | `chaos_sing_prime`。

### 2.2 Perk 目录（10 组，含 2 小众）

| id | 组合 dims | 名称 | 机制（effect） | magnitude | 读标志位系统 |
|----|-----------|------|----------------|-----------|--------------|
| S1 | {1,3} | 反熵质数共鸣 | 反熵维度下质数 ×3 仍生效（`prime_in_anti`） | 3（倍率） | DimensionSystem（Dim-3 分支） |
| S2 | {3,4} | 奇点免崩 | 奇点爆发期间免熵崩（`burst_no_collapse`） | 0 | EntropySystem |
| S3 | {1,2} | 质数混沌 | 混沌重投时若数字为质数则偏向高值（`chaos_prime_bias`） | 0.5（高值概率权重） | DimensionSystem.rollChaosMultiplier |
| S4 | {2,3} | 反熵抬混沌 | 混沌下限随反熵叠加层数提升（`chaos_floor_scale`） | 0.2（每层） | DimensionSystem.rollChaosMultiplier |
| S5 | {0,3} | 反熵留痕 | Prestige 后额外保留基础维度精通（`retain_base_mastery`） | 0.25（基础 master 保留比例） | PrestigeSystem |
| S6 | {1,4} | 奇点质爆 | 奇点爆发期间若数字为质数额外 ×2（`burst_prime_bonus`） | 2 | DimensionSystem.checkSingularityBurst |
| S7 | {0,4} | 基础充能 | 基础维度点击为奇点维度充能爆发条（`click_charge_burst`） | 0.02（每次点击充能秒） | ClickSystem / DimensionSystem | ★小众 |
| S8 | {1,3,4} | 三位一体 | 反熵维度触发奇点爆发且数字为质数 → 爆发 ×3（`trinity_burst`） | 3 | DimensionSystem.checkSingularityBurst |
| S9 | {0,2,3} | 稳态三和弦 | Prestige 保留 + 混沌下限 + 熵减 三安全网叠加（`steady_triad`） | 0（组合增益，见 §2.3） | Prestige/Entropy |
| S10 | {2,4,1} | 混沌奇点质数 | 混沌维度进入奇点预热期(e280+)且质数 → 倍率 ×1.5（`chaos_sing_prime`） | 1.5 | DimensionSystem（Dim-2 分支） | ★小众 |

> 小众（★）组合 S7 / S10 收益窄但趣味独特，保支柱三「非单一最优解」。其余为常见配对，构成主流 build 骨架。

### 2.3 机制生效细则（避免歧义）

- **S1 `prime_in_anti`**：`calculateDimensionMultiplier` 的 Dim-3 分支（`DimensionSystem.ts:180-185`）内，若 `activeSynergies.has('S1') && isPrimeDimensionTrigger(state.number)` → `multiplier *= 3`。仍属单源计算，无新乘源。
- **S2 `burst_no_collapse`**：`EntropySystem` 触发大崩塌前，若 `activeSynergies.has('S2') && state._singularityBurstActive` → 跳过本次崩塌（仅免该次，不永久免熵）。
- **S3 `chaos_prime_bias`**：`rollChaosMultiplier`（`DimensionSystem.ts:211-217`）重投时，若 `isPrimeDimensionTrigger` 为真，以 `magnitude` 权重偏向 [3,5] 区间。
- **S4 `chaos_floor_scale`**：`rollChaosMultiplier` 下限 = `max(baseFloor, antiEntropyStacks * 0.2)`（antiEntropyStacks = 反熵叠加层数）。
- **S5 `retain_base_mastery`**：Prestige 重置 master 时，基础维度(0) `master` 保留 `magnitude`（25%）而非清零。
- **S6 `burst_prime_bonus`**：Dim-4 爆发激活且质数 → 爆发额外 ×2（叠加在 ×100/×200 上，仍单源）。
- **S7 `click_charge_burst`**：在奇点维度时，每次点击为 `_singularityBurstEndsAt` 充能 `magnitude` 秒（上限 +5s/次，避免刷爆）。
- **S8 `trinity_burst`**：Dim-3 触发奇点爆发（需同时激活 Dim-4 规则）且质数 → 该次爆发 ×3。
- **S9 `steady_triad`**：组合增益——仅当 S9 激活时，Prestige 保留阈值额外 +10%、混沌下限 +0.5、熵增再 ×0.9（三系统各自读取 S9 标志位应用小增量）。
- **S10 `chaos_sing_prime`**：Dim-2 分支预热期（`DimensionSystem.ts:192-196` 的 e280+）且质数 → `multiplier *= 1.5`，仍单源。

### 2.4 `evaluateSynergies(state)` 规格（轻量、缓存）

- **签名**：`SynergySystem.evaluateSynergies(state: GameState): void`（由 `DimensionSystem.refreshDimensionBuilds` 编排调用）。
- **运行时机**：仅当精通等级可能变化时调用——`gameStore.ts:633` 每 tick `tickMastery` 后统一入口；`unlockDimension` 后；反序列化后。
- **性能（隐式缓存，非每帧全扫）**：仅遍历 `DIMENSION_SYNERGY_DEFS`（固定 10 条），对每条检查 `dims.every(d => getMasteryLevel(state,d) >= def.minLevel)` → 满足则加入 `state.activeSynergies`。**不在 per-tick 产出计算中全扫组合**；perk 生效时各宿主系统仅做一次 `Set.has(id)` 判定（O(1)）。
- **幂等性**：先 `clear()` 再重算，结果确定。

---

## 3. 数据结构（新增）

```typescript
// src/types/game.ts — GameState 新增（与 mastery-rewards.md 同一对字段，避免重复声明）
/** 已激活跨维度协同 perk id 集合（如 'S1'） */
activeSynergies: Set<string> = new Set();
// （activeMasteryEffects 见 mastery-rewards.md §3，两字段同源 refreshDimensionBuilds 重算）
```

```typescript
// src/types/save.ts — SerializedState 新增
activeSynergies: string[];
// activeMasteryEffects 同见 mastery-rewards.md §3
```

```typescript
// src/core/Serializer.ts（与 mastery-rewards.md §3 同步）
// serialize: activeSynergies: Array.from(state.activeSynergies)
// deserialize: state.activeSynergies = new Set(s.activeSynergies ?? [])
```

> 两 GDD 共享 `refreshDimensionBuilds(state)` 作为**唯一重算入口**：先 `applyMasteryRewards`（写 `activeMasteryEffects`），再 `evaluateSynergies`（写 `activeSynergies`）。详见 `_consistency.md`。

---

## 4. 进阶（进度）与跨系统交互

### 4.1 进度解锁
- 每个 perk 在其 `dims` 内**所有**维度 `masteryLevel ≥ SYNERGY_MIN_LEVEL(3)` 时点亮（mastery ≥ 60）。
- 因依赖多维精通，解锁晚于单维奖励，构成长弧目标（Bartle Achiever/Explorer 锚点）。
- 任何维度 master 回退（Prestige/Expansion 重置）会令依赖它的 perk 熄灭——组合 build 存在“ Maintenance 风险”，强化取舍。

### 4.2 跨系统交互点

| perk id | 宿主系统 | 生效点 |
|---------|----------|--------|
| S1 | DimensionSystem（Dim-3 分支） | 质数 ×3 叠加 |
| S2 | EntropySystem | 爆发期免崩 |
| S3 / S4 | DimensionSystem.rollChaosMultiplier | 混沌重投偏向 / 下限抬升 |
| S5 / S9 | PrestigeSystem | 保留基础精通 / 组合保留+ |
| S6 / S8 | DimensionSystem.checkSingularityBurst | 爆发质数额外倍 / 三位一体 ×3 |
| S7 | ClickSystem + DimensionSystem | 奇点维度点击充能爆发 |
| S9 | EntropySystem | 熵增再减 |
| S10 | DimensionSystem（Dim-2 分支） | 预热期质数额外 ×1.5 |

> **所有 perk 均为机制/规则读取 `state.activeSynergies`，无任何条目调用 `MultiplierSystem.register` 写入新 source。**

---

## 5. UI 规格

入口：`DimensionPanel.vue` 新增「维度羁绊」页签。
- 列出 10 条 perk，显示名称 + `desc` + 所需维度组合与各自当前等级进度条。
- 已激活：发光边框 + 🔗 图标 + 「已共鸣」。
- 未激活：展示缺口（如「反熵 Lv2/3 · 质数 Lv3/3」）。
- 小众（★）perk 加角标「小众组合」提示探索价值。

---

## 6. 边缘情况

1. **旧存档无 `activeSynergies`**：`?? []` 兜底 + 反序列化后 `refreshDimensionBuilds` 重算。
2. **某维 master 回退致 perk 熄灭**：`evaluateSynergies` 幂等重算自动移除，`Set.has` 立即返回 false，机制即时失效。
3. **同时命中多 perk（如 S8 同时含 S1/S6 维度）**：各 perk 独立判定、独立生效，互不冲突（S8 是独立三元组合，不与 S1/S6 互斥）。
4. **S2 免崩与熵稳定剂/屏障叠加**：仅本次崩塌跳过，不消耗道具、不延长屏障。
5. **S7 点击充能刷爆**：每次点击充能上限 +5s，且总爆发时长受 `checkSingularityBurst` 既有逻辑约束。
6. **S9 与 `dim3_l4`/`dim2_l3` 等单维机制叠加**：S9 仅在其标志位激活时追加小增量，与单维奖励乘性/加性并存但不突破既有上限。
7. **`SYNERGY_MIN_LEVEL` 调整**：若主理人改为 4，则所有 perk 解锁门槛同步提高（集中常量，易调）。

---

## 7. 验收标准

1. 10 条 `DIMENSION_SYNERGY_DEFS` 均含 `dims`/`minLevel`/`effect`/`magnitude`；`evaluateSynergies` 仅遍历此表、O(1) 判定。
2. 每条 perk 在其 `dims` 全部 `masteryLevel ≥ SYNERGY_MIN_LEVEL` 时点亮、否则熄灭；`evaluateSynergies` 幂等。
3. 全部 perk 经 `state.activeSynergies` 由宿主系统读取生效；**grep 确认无 `MultiplierSystem.register` 新 source、无新 `MultiplierSource` 枚举值**。
4. **零 `numeralImprint` 发放**（grep 确认无 `numeralImprints +=` 路径），R1 上限 14 不变。
5. 小众 perk（S7/S10）正确点亮且不影响主 perk 平衡。
6. 旧存档加载不崩；`activeSynergies` 正确往返序列化。

---

## 8. 抗通胀自检（设计红线）

| 维度 | 禁止模型 | 本设计 |
|------|----------|--------|
| 形态 | 每精通一维 +X% 全局 → 全精通=最优主导 | **特定组合 set-bonus**，机制/规则型，非线性倍率 |
| 乘源 | 协同开新乘源 | **零乘源**：perk 仅读 `activeSynergies` 改机制/规则，从不 `register` 新条目 |
| 数字印记 | 协同发印记 | **零印记**（R1 上限 14 不变，已 grep 确认） |
| D(s) 尾部 | 新增尾部乘源 | `D(s)` 仍由 PersonaSystem 末端单乘，本系统不触碰 `persona` |
| 主导策略 | “精通全 5 维”最优 | 仅特定组合解锁、且多为窄机制；小众组合(S7/S10)保多样性 → 无单一最优 |
| 全局倍率影响 | 协同抬升全局乘区 | 协同对全局乘区贡献 = 0；即便 S1/S6/S8/S10 影响 `dimension` 源，也只在对应 `currentDimension` 分支内、单源有界 |

**总通胀上界**：协同层全局乘区贡献 = 0；`D(s) ≤ 0.25`；精通层全局贡献 ≤ +25%（当前 +5%）；三者顺序串联、互不叠加突破。✅ 满足支柱一、支柱三与全部红线。

*文档结束*
