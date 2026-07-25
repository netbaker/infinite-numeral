# 跨 GDD 一致性说明（_consistency · Sprint 6 Must ②③）

> 配套：`mastery-rewards.md`（Must ②）、`dimension-synergy.md`（Must ③）
> 目的：声明两文档共享的字段、唯一的乘源出口、通胀上界，以及待主理人拍板的开放问题。
> 设计日期：2026-07-25

---

## 1. 共享新增状态字段（避免重复声明）

两 GDD 在 `GameState`（`src/types/game.ts`）、`SerializedState`（`src/types/save.ts`）、`Serializer`（`src/core/Serializer.ts`）各新增**两个派生集合字段**，二者同由唯一入口重算：

| 字段 | 写入方 | 读取方 |
|------|--------|--------|
| `activeMasteryEffects: Set<string>` | `DimensionSystem.applyMasteryRewards` | 各机制型宿主系统 + MultiplierSystem（global 型） |
| `activeSynergies: Set<string>` | `SynergySystem.evaluateSynergies` | 各协同宿主系统（Entropy/Event/Prestige/Transcend/Factor/Offline/Dimension） |

**唯一重算入口**：`DimensionSystem.refreshDimensionBuilds(state)` 编排：
1. `this.applyMasteryRewards(state)` → 写 `activeMasteryEffects`；
2. `synergySystem.evaluateSynergies(state)` → 写 `activeSynergies`。

调用点统一为 `gameStore.ts:633`（`tickMastery` 之后）、`unlockDimension` 后、反序列化后。**两字段声明一次、实现一次，禁止在两文档各写一遍**（已分别在两 GDD §3 标注「同源」）。

---

## 2. 唯一 `dimension` 源是唯一的乘率汇点

- 乘区型精通奖励（`dim0_l5` 全局、`dim1_l1`/`dim1_l2`/`dim4_l1` 维度规则）全部折叠进 `MultiplierSystem.registerDimensionMultiplier` 的 `dimension_global` 条目（`MultiplierSystem.ts:316-325`），**无新 `MultiplierSource` 枚举值、无新 `register` 调用**。
- 协同 perk **从不**调用 `MultiplierSystem.register`——任何对乘区的影响（S1/S6/S8/S10 在 `calculateDimensionMultiplier` 对应分支内）仍只是单源 `dimension_global` 值的分支修正，**不新增条目**。
- 结论：全局乘区中，维度相关贡献 = 单一 `dimension` 源；除 `dimension`（及各既有 source）外无维度/S6 新增源。

---

## 3. `D(s)` 仍为唯一有界尾部

- `D(s)`（数字人格，`numeral-persona.md §2.3`）由 PersonaSystem 在乘区末端单乘 `(1 + D(s))`，`D(s) ≤ 0.25`。
- 本 Sprint 6 两系统**均不修改 `persona`、不新增尾部乘源、不向 `effMult` 注入额外尾部**。维度源（`dimension`）位于 `M_run` 链中，`D(s)` 在其后串联，二者顺序相乘、互不替代。
- 结论：`D(s)` 保持唯一有界尾部，红线成立。

---

## 4. 总通胀上界（组合证明）

令全局乘区总贡献 `G_total` 由以下顺序串联（均独立、有界）：

- 维度源因精通：`1 + clamp(Σglobal_magnitude, 0, MASTERY_GLOBAL_MULT_CAP=0.25)` → 当前 **1.05**，上限 **1.25**。
- 维度源因协同：对全局乘区贡献 = **0**（协同仅改对应维分支内的单源值，不抬全局）。
- `D(s)`：`≤ 1.25`（persona 上限）。
- 其余既有 source（upgrade/stardust/expansion/transcend/tech/epoch/milestone/factor/crystal/gene）不在本 Sprint 范围，保持原样。

∴ 本 Sprint 6 引入的全局乘区增量 = **+5%（封顶 +25%）**，协同增量 = **0**，印记增量 = **0**。`D(s)` 不变。总体系有界、非纯线性通胀。✅

---

## 5. 待主理人拍板的开放问题

1. **`activeMasteryEffects` / `activeSynergies` 是否持久化**：本 GDD 建议持久化（`Set→string[]`）并反序列化后 `refreshDimensionBuilds` 兜底重算；若主理人倾向纯派生，可仅在反序列化时重算、不落盘。请确认。
2. **`dim1_l1` 重释义**：原“质数触发概率 +15%”因 `isPrimeDimensionTrigger` 为确定性判定（无概率）不可直译，已重释为「质数维度倍率额外 +15%」（单源 Dim-1 分支）。是否接受此重释？
3. **`SYNERGY_MIN_LEVEL` 默认 3（mastery ≥ 60）**：是否合适？调高=更硬核长弧，调低=更早体验羁绊。
4. **`dim3_l5` / `dim4_l5` 中“奇点印记”**：本 GDD 明确 = `singularity`（奇点核心，**非** `numeralImprint`）。请确认该措辞解读与主理人“零新增印记来源”口径一致。
5. **`MASTERY_GLOBAL_MULT_CAP = 0.25`**：当前实际仅 `dim0_l5`（+5%）命中；该上限为未来补全局型条目预留的硬闸，是否同意 0.25 阈值？
6. **Serializer 版本号**：新增两字段用 `?? []` 兜底（与 numeral-persona 同策略），可不 bump；建议审计性 bump `CURRENT_VERSION` 4→5，请确认是否 bump。

*一致性说明结束*
