# 知识点跨系统联动 GDD（Knowledge × Dimension Linkage · Sprint 6 Should ⑤）

> **系统代号**：Knowledge–Dimension Linkage（CodexSystem + DimensionSystem 扩展，无新系统）
> **优先级**：Sprint 6 Should ⑤（由 Sprint 5 B.Could 升舱）
> **设计日期**：2026-07-25
> **依赖**：`CodexSystem`（`onNarrativeTriggered` `CodexSystem.ts:36`、`checkAllMysteries` `:199`、`evaluateCondition` 已含 `dimension_mastery` `:149`）、`CodexEntryState{id,unlocked,unlockedAt}`、`CODEX_DEFS`（`category: 'knowledge'`）、`DimensionSystem`（`evaluateSynergies` `:173-183`、`refreshDimensionBuilds` `:189`、`getMasteryLevel` `:130-133`、`DIMENSION_SYNERGY_DEFS`）、`DimensionPanel.vue`（synergy tab `:160-182`、已 import `DIMENSION_SYNERGY_DEFS`/`SYNERGY_MIN_LEVEL` `:191-196`）
> **红线遵循**：零新乘源、零印记、不突破 `_consistency.md` 通胀上界（全局精通≤25%、协同全局=0、`D(s)≤0.25` 唯一尾部）。

---

## 1. 系统概述

让"知识词条"（Codex 的 `knowledge` 分类条目，经 `onNarrativeTriggered` 精确文本匹配收录）成为**维度系统的发现钥匙**：知识解锁后，原本隐藏的协同被揭示、维度专属叙事被点亮、或某组协同的**生效门槛被放宽**。本质是"探索记录 → 维度 build 解锁"的联动，**全程不改任何数值乘率、不发放印记**。

三种可组合方向（本 GDD 推荐 **方向 1 为主干 + 方向 2 为体验糖 + 方向 3 为可选单例**）：

- **方向 1 · 揭示隐藏协同**：某协同 `knowledgeGate` 指向一个知识词条；知识未解锁前该协同在 UI 显示为"未知羁绊"，且 `activeSynergies` 中不点亮；知识解锁后揭示并参与常规解锁判定。
- **方向 2 · 维度专属叙事 flavor**：知识解锁后，在对应维度面板点亮一段专属叙事文本（`knowledgeFlavor`，纯 UI）。
- **方向 3 · 放宽协同门槛（可选单例）**：知识解锁后，某协同的生效 `minLevel` 由 `SYNERGY_MIN_LEVEL`(3) 降至 `relaxedMinLevel`(如 2)。**仅降门槛、绝不改效果 magnitude**，故通胀上界不变。

> 锚定真实代码：`evaluateCondition` 已支持 `dimension_mastery`（`:149-162`）、`achievement_all`/`codex_complete`（`:118-132`）——本系统复用其"读 `state.codexEntries.get(id).unlocked`"的同构判定。

---

## 2. 核心机制与系统拆解（锚定真实代码）

### 2.1 `DimensionSynergyDef` 扩展（Constants.ts，随 `DIMENSION_SYNERGY_DEFS` 同表）
在既有接口（`id`/`name`/`dims`/`minLevel`/`desc`/`effect`/`magnitude`/`niche`）上**仅追加可选字段**：
```typescript
/** 方向1：需先解锁的 Codex 知识词条 id；未解锁时本协同隐藏且不激活 */
knowledgeGate?: string;
/** 方向2：解锁后在该维度面板展示的叙事 flavor（纯 UI，零数值） */
knowledgeFlavor?: { dimensionId: number; text: string };
/** 方向3：知识解锁后，生效门槛由 minLevel 降至 relaxedMinLevel（仅降门槛，不改 magnitude） */
knowledgeEase?: { knowledgeId: string; relaxedMinLevel: number };
```

### 2.2 `evaluateSynergies` 扩展（DimensionSystem.ts:173-183）
在既有 `dims.every(d => getMasteryLevel >= def.minLevel)` 判定**之前**插入知识门槛逻辑（仍是 O(10)、幂等、只 toggle `activeSynergies`，**绝不** `MultiplierSystem.register`）：
```typescript
evaluateSynergies(state: GameState): void {
  state.activeSynergies.clear();
  for (const def of DIMENSION_SYNERGY_DEFS) {
    // 方向1：知识未解锁 → 协同保持隐藏/未激活
    if (def.knowledgeGate && !state.codexEntries.get(def.knowledgeGate)?.unlocked) continue;
    // 方向3：知识解锁则门槛放宽（仅降 minLevel，magnitude 不变）
    const minLv = (def.knowledgeEase && state.codexEntries.get(def.knowledgeEase.knowledgeId)?.unlocked)
      ? def.knowledgeEase.relaxedMinLevel
      : def.minLevel;
    const allMet = def.dims.every((d) => this.getMasteryLevel(state, d as DimensionId) >= minLv);
    if (allMet) state.activeSynergies.add(def.id);
  }
}
```

### 2.3 知识解锁 → 协同重算钩点（gameStore.ts:292）
`onNarrativeTriggered` 是知识词条收录的真实位置（`gameStore.ts:292` `const collected = codexSystem.onNarrativeTriggered(gameState.value, text)`）。在此追加**幂等**重算：
```typescript
const collected = codexSystem.onNarrativeTriggered(gameState.value, text);
// Sprint 6 ⑤：知识（category:'knowledge'）解锁可能揭示/放宽维度协同门槛 → 重算 activeSynergies（O(10)，幂等）
if (collected.some((d) => d.category === 'knowledge')) {
  dimensionSystem.refreshDimensionBuilds(gameState.value);
}
```
> 既有 `refreshDimensionBuilds` 调用点（`gameStore.ts:553` unlockDimension、`:638` tickMastery 后、`:1759` transcend）已覆盖常规路径；本钩点专补"叙事触发知识"这一异步入口，确保揭示即时生效。

### 2.4 新增强知识词条（CODEX_DEFS，category:'knowledge'）
复用既有 `narrativeTriggers` 精确文本匹配（与 origin/cosmic_event/sage_record 同机制），**不**改 `checkAllMysteries`（该函数只处理 `category==='mystery'`，`:201`）。示例（取 2–3 条，避免 over-gating）：
| 知识 id | 揭示的协同 | 放宽(方向3) | flavor 维度 | 触发叙事文本（须与游戏内某 narration 精确一致） |
|---------|------------|--------------|------------|----------------------------------------------|
| `know_trilogy` | 揭示 S8（三位一体 {1,3,4}） | — | 1/3/4 | 例如奇点爆发且质数时的专门 narration |
| `know_resonance` | 揭示 S7（基础充能 {0,4} ★小众） | — | 0/4 | 基础维度点击充能相关 narration |
| `know_chaos_sing` | 揭示 S10（混沌奇点质数 {2,4,1} ★小众） | **S10 minLevel 3→2** | 2/4/1 | 混沌维度预热期(e280+)质数相关 narration |

> 仅 3 条小众/三元协同设为知识门控；7 条主流协同（S1–S6、S9）**保持常显**，避免"全隐藏"的认知过载（支柱三：保留主流骨架，探索为甜点）。

---

## 3. 数值 / 平衡

- **零数值变动**：`knowledgeFlavor` 纯文本；`knowledgeGate` 仅控制 `activeSynergies` 的成员资格；`knowledgeEase` **仅**把 `minLevel`(3) 改为 `relaxedMinLevel`(2)。三者均**不触碰** `DIMENSION_SYNERGY_DEFS[].magnitude`，故协同效果（如 S10 的 ×1.5、S1 的 ×3）的数值与边界**完全不变**。
- **放宽幅度有界**：`relaxedMinLevel` 仅取 2（从 3 降 1 级），不允许降至 0/1（避免"几乎无门槛"稀释 build 取舍）。单例（仅 S10）以控风险。
- **探索节奏**：知识经 `onNarrativeTriggered` 在正常玩法叙事中收录（非付费/非重置），与 Sprint 5 B 的图鉴联动同构，形成"看见叙事 → 解锁知识 → 揭示羁绊"的发现锯齿（Bartle Explorer）。
- **平衡张力**：门控仅作用于 3 条小众/三元协同，主流 build 不受知识可得性影响；放宽仅让"小众组合"更早可玩，不抬高其（零乘率）效果强度。

---

## 4. 重置语义（Reset Semantics）

- **知识收录跨重置保留**：`state.codexEntries` 在 `PrestigeSystem.ts:68`（`newState.codexEntries = state.codexEntries`）显式继承 → 知识解锁态在坍缩后仍在，`knowledgeGate`/`knowledgeEase` 判定持续有效。
- **维度精通跨重置保留**：`state.dimensionStates` 在三套重置中均重建保留（`PrestigeSystem.ts:198-202`、`TranscendSystem.ts:78-79`、`ExpansionSystem.ts:84-85`）→ `getMasteryLevel` 重置后可读，协同门槛判定一致。
- **派生集合幂等重算**：`activeSynergies` 为派生缓存，反序列化后由 `refreshDimensionBuilds`（`_consistency.md` §1）兜底重算 → 旧存档或重置后知识门控状态自动一致，**无需落盘新增字段**。
- **与印记/乘区解耦**：本系统不读写 `numeralImprints`、不调用 `grantNumeralImprint`、不调用 `MultiplierSystem.register`。

---

## 5. UI / UX 流程

- **协同页签（DimensionPanel.vue:160-182，已 import `DIMENSION_SYNERGY_DEFS`/`SYNERGY_MIN_LEVEL`）**：
  - 常显协同（无 `knowledgeGate`）：维持现状（名称 + desc + 需求维度进度）。
  - 门控未解锁（`knowledgeGate` 未满足）：显示为 `🔒 未知羁绊` + 提示"`需先发现知识：{{gateName}}`"，**不**泄露 `dims`/`desc`（保留探索惊喜）。
  - 门控已解锁：正常显示，并在标题加 `✨ 已揭示` 角标。
  - 放宽生效中（`knowledgeEase` 满足）：需求行显示"`均 ≥ Lv.{{relaxedMinLevel}}（知识放宽）`"。
- **维度专属 flavor（方向 2）**：`knowledgeFlavor` 解锁后，在对应维度卡片（`DimensionPanel.vue` 维度区 `:40-75`）追加一段斜体叙事文本，纯展示。
- **知识面板**：既有 Codex 模态已按 `category` 展示 `knowledge` 条目 → 新词条自动归位，无需改渲染。
- **即时反馈**：`gameStore.ts:292` 钩点触发 `refreshDimensionBuilds` 后，`synergyList`（`DimensionPanel.vue:227-235`，依赖 `stateVersion`）随版本号刷新 → 揭示/放宽即时可见。

---

## 6. 抗通胀自检（设计红线）

| 维度 | 禁止模型 | 本设计 |
|------|----------|--------|
| 乘源 | 知识联动开新乘源 | **零乘源**：`evaluateSynergies` 仍只 toggle `activeSynergies`；`knowledgeGate`/`knowledgeEase` 只改"哪些协同激活/其门槛"，**绝不** `MultiplierSystem.register` 新条目 |
| 数字印记 | 知识发印记 | **零印记**：全链路不触碰 `grantNumeralImprint` / `numeralImprints` |
| 全局倍率 | 知识抬高全局乘区 | 协同对全局乘区贡献**恒为 0**（继承 `dimension-synergy.md` §2.3）；`knowledgeEase` 仅降 `minLevel`，不改 `magnitude` → 全局贡献仍为 0 |
| 维度分支有界 | 放宽后效果突破单源 | S10 效果（chaos_sing_prime ×1.5）仍仅在 Dim-2 分支、单源有界；放宽只让它**更早解锁**，强度不变 |
| D(s) 尾部 | 新增尾部乘源 | 本系统不读不改 `persona` / `D(s)` |
| 主导策略 | "集齐知识=最强 build" | 知识仅揭示 3 条小众/三元协同 + 单例门槛放宽；主流 7 条协同不受知识影响 → 无单一最优解 |

**结论**：全局精通≤25%、协同全局=0、`D(s)≤0.25` 三条边界**均不被本系统突破**；印记增量=0；乘源增量=0。✅ 满足全部红线与支柱一/三。

---

## 7. 风险

1. **`knowledgeEase` 误扩至 magnitude（高）**：若实现把放宽误写成"同时提升 magnitude"，会破坏 `_consistency.md` 上界。**缓解**：本 GDD 硬性规定 `knowledgeEase` **只**改 `minLevel`；`DIMENSION_SYNERGY_DEFS[].magnitude` 在任意知识状态下恒定。验收须 grep 确认放宽分支不读/不改 `magnitude`。
2. **知识不可达 → 协同永久隐藏（中）**：若某 `knowledgeGate` 的知识词条在正常玩法中无法触发，`onNarrativeTriggered` 永不收录，协同永不可见。**缓解**：§2.4 仅门控 3 条，且每条的 `narrativeTriggers` 须对应游戏内**确有**的 narration 文本（实现时逐一比对 `showNarration` 调用点）；主流 7 条不设门控。
3. **over-gating 认知过载（中）**：隐藏过多协同会令玩家困惑。**缓解**：门控限于 3 条小众/三元；UI 对未解锁门控显示"需先发现知识"而非完全空白。
4. **钩点遗漏导致揭示延迟（低）**：若 `gameStore.ts:292` 未加 `refreshDimensionBuilds`，知识解锁后协同要等下次 tickMastery/transcend 才刷新（仍可最终一致，但体验延迟）。**缓解**：§2.3 钩点为 P0 必加。

---

## 8. 验收标准

1. `DIMENSION_SYNERGY_DEFS` 条目含可选 `knowledgeGate`/`knowledgeFlavor`/`knowledgeEase`；`evaluateSynergies`（`DimensionSystem.ts:173`）仅在既有判定**前**插入知识门槛，仍 O(10)、幂等、只 toggle `activeSynergies`。
2. 门控协同在知识未解锁时**不**进入 `activeSynergies`，且 UI 显示"未知羁绊 + 需发现知识"；解锁后正常判定。
3. `knowledgeEase` 仅降 `minLevel`（单例 S10: 3→2），`DIMENSION_SYNERGY_DEFS[].magnitude` 在任意知识状态下**不变**（grep 确认放宽分支不读写 magnitude）。
4. `gameStore.ts:292` 钩点在 `collected` 含 `category==='knowledge'` 时调用 `dimensionSystem.refreshDimensionBuilds`（幂等）。
5. **零新乘源**：grep 确认本系统**未**调用 `MultiplierSystem.register` / 新增 `MultiplierSource` 枚举值。
6. **零印记**：grep 确认本系统**未**调用 `grantNumeralImprint`；`numeralImprints` 上限 14 不受影响。
7. **重置保留**：`executePrestige` 后 `state.codexEntries` 保留（`:68`），知识门控/放宽持续有效；`activeSynergies` 反序列化后由 `refreshDimensionBuilds` 兜底重算。
8. 协同全局贡献仍为 0、`D(s)≤0.25`、维度分支单源有界 —— 三条边界与 `_consistency.md` §4 一致。

---

## 9. 一致性注记（与 `_consistency.md` 的交互）

本系统**直接复用** `_consistency.md` 已证的单一乘汇点与通胀上界，不引入任何新交互：

- **§2 唯一 `dimension` 源**：`knowledgeGate`/`knowledgeEase` 不改变任何 `MultiplierSystem` 注册行为，唯一 `dimension` 源与 `crystal` 等既有 source 结构**不变**。
- **§3 `D(s)` 唯一有界尾部**：本系统不触碰 `persona` / `D(s)`，尾部关系不变。
- **§4 总通胀上界**：
  - 维度源因精通：仍 `1 + clamp(Σglobal_magnitude, 0, 0.25)`（仅 `dim0_l5`=0.05，上限 1.25）——**不受知识联动影响**。
  - 维度源因协同：对全局乘区贡献**恒为 0**；`knowledgeEase` 仅降低 S10 的 `minLevel`，其 `magnitude`(1.5) 与"仅 Dim-2 分支单源"性质**完全不变** → 协同全局贡献仍为 0。
  - `D(s)≤1.25`：不变。
  - 印记增量 = 0；乘源增量 = 0。
  - ∴ Sprint 6 引入的全局乘区增量 = +5%（封顶 +25%）、协同增量 = 0、印记增量 = 0，与 `_consistency.md` §4 结论**逐字一致**。
- **共享字段**：本系统不新增 `GameState` 落盘字段（`activeSynergies` 已属 `_consistency.md` §1 的派生集合，由 `refreshDimensionBuilds` 重算）；`state.codexEntries` 为既有字段，序列化方案已存在。故**不**触发 `Serializer.ts`/`save.ts` 新增（与 plan.md §6 的"新增字段须序列化"条款无冲突，因无新增字段）。

*文档结束。本系统为"探索记录 → 维度 build 解锁"的纯联动层，与 `mastery-rewards.md`/`dimension-synergy.md`/`_consistency.md` 的乘区/印记/通胀边界完全正交且相容。*
