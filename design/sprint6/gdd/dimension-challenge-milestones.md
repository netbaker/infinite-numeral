# 维度挑战 / 精通里程碑 GDD（Dimension Challenge & Milestones · Sprint 6 Should ④）

> **系统代号**：Dimension Milestones（成就框架扩展，无新系统）
> **优先级**：Sprint 6 Should ④
> **设计日期**：2026-07-25
> **依赖**：`AchievementSystem`（`checkAchievements` / `initAchievements`）、`AchIEVEMENT_DEFS`（`Constants.ts:573`）、`DimensionSystem`（`getMasteryLevel` `:130-133`、`dimensionStates`）、`AchievementsModal`（分组展示）、`gameStore`（解锁 toast）
> **Bartle 锚点**：Achiever（精通/里程碑收集者）、Killer（速度/限制条件下的精通"挑战"）
> **红线遵循**：机制/记录驱动、复用框架；**零新数字印记来源**（印记硬上限 14 不变：仅 5 超越里程碑 + 9 档案成就）；**零新增独立乘源**（纯成就徽章，不入 effMult）。

---

## 1. 系统概述

把"维度精通度"（每维 `master` 0–100、`getMasteryLevel = floor(master/20)`，`DimensionSystem.ts:130-133`）转化为**长期、可展示的目标**。本质是"成就/记录层"——玩家因深耕某维、或在限制条件下达成精通而获得**永久徽章**，**不产生任何数值加成**。

- 复用既有 `AchIEVEMENT_DEFS`（`Constants.ts:573`）+ `AchievementSystem`，**不新建 Challenge 表**（Challenge 含每日重置 + 星尘/暗能奖励，不适合"永久精通里程碑"语义；成就才是永久一次性、且 `AchievementsModal` 已按 `group` 分组）。
- 新增一个**成就分组** `group: 'dimension'`（对齐既有 `group: 'archive'` 的"分组机制"），并在 `AchievementSystem.evaluate` 新增一个 `conditionType: 'dimension_mastery'`。
- 两类动机：
  - **里程碑（Achiever）**：每维 L3/L5 精通、全维 L3 —— 收集向。
  - **挑战（Killer）**：在 `transcendCount`/`expansionCount` 低于阈值前把某维精通推到高位 —— 速度/限制向，制造"我比常规路线更快养出 build"的支配感。

---

## 2. 核心机制与系统拆解（锚定真实代码）

### 2.1 数据表扩展：`AchIEVEMENT_DEFS` 新增分组（Constants.ts:573 之后追加）
新增 13 条，统一 `group: 'dimension'`。复用既有 `AchievementDef` 字段（`id`/`name`/`description`/`hint`/`icon`/`conditionType`/`conditionValue`/`conditionTarget`/`group`），仅新增可选 `conditionParam?: { beforeTranscend?: number; beforeExpansion?: number; allDimensions?: boolean }`。

### 2.2 `AchievementSystem.evaluate` 新增分支（AchievementSystem.ts:55-96 的 switch）
```typescript
case 'dimension_mastery': {
  if (def.conditionParam?.allDimensions) {
    // 跨维："全维 master ≥ conditionValue"
    for (let i = 0; i < 5; i++) {
      const ds = state.dimensionStates.get(i as DimensionId);
      if (!ds || ds.master < (def.conditionValue ?? 100)) return false;
    }
    return true;
  }
  const dim = Number(def.conditionTarget ?? 0);
  const ds = state.dimensionStates.get(dim as DimensionId);
  if (!ds || ds.master < (def.conditionValue ?? 100)) return false;
  // Killer 限制条件：达成时 transcend/expansion 计数须低于阈值
  if (def.conditionParam?.beforeTranscend != null
      && state.transcendCount >= def.conditionParam.beforeTranscend) return false;
  if (def.conditionParam?.beforeExpansion != null
      && state.expansionCount >= def.conditionParam.beforeExpansion) return false;
  return true;
}
```
- 读取的是 `ds.master`（0–100 绝对值），比 `getMasteryLevel` 更细；`conditionValue` 用 master 阈值（60=L3、100=L5）。
- `AchievementSystem.checkAchievements`（`AchievementSystem.ts:20-38`）**已**遍历 `AchIEVEMENT_DEFS` 并跳过 `group === 'archive'`（`:30`）；本分组 `'dimension'` 不在跳过之列 → **每 tick 自动评估**，且**绝不经过 `grantNumeralImprint`**（见 §6）。
- `initAchievements`（`AchievementSystem.ts:43-49`）遍历 `AchIEVEMENT_DEFS` 初始化 Map → 新条目自动覆盖。

### 2.3 解锁反馈（gameStore 既有通道）
`checkAchievements` 返回新解锁 def → gameStore 既有成就 toast 流程弹出（`💡 成就解锁：{{name}}`）。**不调用 `grantNumeralImprint`**（全仓唯一发放点为 `gameStore.ts:1212`，仅由 `evaluateSpecialAchievements` 档案/超越路径触发，见 §6）。

### 2.4 新增成就目录（13 条，group:'dimension'）
| id | name | conditionType | target | value(master) | param | 锚点 |
|----|------|----------------|--------|------|-------|------|
| `dim_milestone_0_3` | 基础·熟手 | dimension_mastery | 0 | 60 | — | Achiever |
| `dim_milestone_1_3` | 质数·熟手 | dimension_mastery | 1 | 60 | — | Achiever |
| `dim_milestone_2_3` | 混沌·熟手 | dimension_mastery | 2 | 60 | — | Achiever |
| `dim_milestone_3_3` | 反熵·熟手 | dimension_mastery | 3 | 60 | — | Achiever |
| `dim_milestone_4_3` | 奇点·熟手 | dimension_mastery | 4 | 60 | — | Achiever |
| `dim_milestone_0_5` | 基础·宗师 | dimension_mastery | 0 | 100 | — | Achiever |
| `dim_milestone_1_5` | 质数·宗师 | dimension_mastery | 1 | 100 | — | Achiever |
| `dim_milestone_2_5` | 混沌·宗师 | dimension_mastery | 2 | 100 | — | Achiever |
| `dim_milestone_3_5` | 反熵·宗师 | dimension_mastery | 3 | 100 | — | Achiever |
| `dim_milestone_4_5` | 奇点·宗师 | dimension_mastery | 4 | 100 | — | Achiever |
| `dim_milestone_all_3` | 五维均衡 | dimension_mastery | — | 60 | allDimensions:true | Achiever（广度） |
| `dim_challenge_prime_fast` | 质数速成 | dimension_mastery | 1 | 80 | beforeTranscend:3 | Killer |
| `dim_challenge_sing_blitz` | 奇点突袭 | dimension_mastery | 4 | 60 | beforeExpansion:2 | Killer |

> Killer 条目语义：`dim_challenge_prime_fast` = "在第 3 次超越**之前**把质数维度 master 推到 80（≈L4）"；`dim_challenge_sing_blitz` = "在第 2 次膨胀**之前**把奇点维度 master 推到 60（L3）"。制造 tempo 压力与"速通 build"的支配感。

---

## 3. 数值 / 平衡

- **阈值映射**：`master` 0–100 每 20 为 1 级（L1=20…L5=100）。L3=60、L5=100 取既有 5 级结构的自然节点，与 `DIMENSION_MASTERY_EFFECTS`（`mastery-rewards.md` §2.2）的等级奖励**同源同尺**，玩家感知一致。
- **成长速率**：`tickMastery`（`DimensionSystem.ts:101-117`）`growthRate = log10(outputPerSec+1) × deltaTime × 0.0005`，随产出对数增长、任意量级有限单调递增。故 L3（60）为中期可达、L5（100）为长弧目标；Killer 的 80/60 阈值介于其间，需"提前专注某一维"方可抢在重置计数前达成。
- **平衡张力**：Killer 条目要求在重置计数到达前达成 → 玩家须在"铺开广度（全维 L3）"与"抢速专精（Killer）"间取舍，强化支柱三 build 多样性。
- **无数值奖励**：本系统**只发徽章**，不发星尘/暗能/印记/乘区。平衡完全由"目标可达性"而非"数值膨胀"驱动（支柱一）。

---

## 4. 重置语义（Reset Semantics）

- **已解锁成就跨重置保留**：`state.achievements` Map 在三套重置中均被显式拷贝——`PrestigeSystem.ts:129`、`TranscendSystem.ts:123`、`ExpansionSystem.ts:121`（均为 `new Map(state.achievements)`）。故徽章**永久**保留，符合"里程碑"语义。
- **精通度跨重置可读**：`state.dimensionStates` 在 `PrestigeSystem.ts:198-202`、`TranscendSystem.ts:78-79`、`ExpansionSystem.ts:84-85` 均被重建保留 → 重置后 `dimension_mastery` 条件仍可正确读取（且精通度本身会因 prestige/expansion 重置而回退，见 `mastery-rewards.md` §4.1）。
- **Killer 限制条件的时序**：`beforeTranscend`/`beforeExpansion` 在**解锁判定瞬间**比对 `state.transcendCount`/`expansionCount`；因 `checkAchievements` 每 tick 在重置前运行，一旦计数越过阈值即永久失去该挑战（不补发）——制造真实 tempo 代价。
- **与印记发放解耦**：本系统不调用 `grantNumeralImprint`（见 §6），重置路径亦不因其触发印记。

---

## 5. UI / UX 流程

- **入口**：`AchievementsModal.vue` 已按 `group` 分组（`GROUP_LABELS` `:53-60`、`groups` order `:63`）。当前为**硬编码**列表，故须：
  - 在 `GROUP_LABELS`（`AchievementsModal.vue:53-60`）追加 `'dimension': '🧭 维度精通'`；
  - 在 `groups` 的 `order` 数组（`:63`）追加 `'dimension'`。
  - 之后 `defs: ACHIEVEMENT_DEFS.filter((d) => d.group === key)`（`:67`）**自动**把 13 条归入新页签，无需改渲染。
- **解锁态**：`isUnlocked`（`AchievementsModal.vue:82-85`）读 `achievements.get(id)?.unlocked` → 对新分组天然生效。
- **进度提示（可选增强）**：对未解锁的 `dimension_mastery` 条目，可在卡片副标题显示"当前 master {{ds.master}}/100（Dim-{{target}}）"，复用 `state.dimensionStates`。纯展示，不写状态。
- **叙事/Toast**：复用 gameStore 既有成就解锁 toast（§2.3）。

---

## 6. 抗通胀自检（设计红线）

| 维度 | 禁止模型 | 本设计 |
|------|----------|--------|
| 乘源 | 精通里程碑开新乘源 | **零乘源**：纯成就徽章，绝不入 `effMult` / `MultiplierSystem.register` |
| 数字印记 | 里程碑发印记 | **零印记**：`group:'dimension'` ≠ `'archive'`，`checkAchievements` 跳过 archive（`AchievementSystem.ts:30`），且全仓唯一 `grantNumeralImprint` 调用点为 `gameStore.ts:1212`（仅档案/超越路径）→ 本分组**永不经过**发放点。印记硬上限 14 不变 |
| D(s) 尾部 | 触碰 persona | 本系统不读不改 `persona` / `D(s)` |
| 全局倍率 | 里程碑抬升全局乘区 | 无任何全局乘区影响；S6 全局乘区增量仍仅 `dim0_l5`(+5%) 与晶体商店(+85%)，与本系统无关 |
| 主导策略 | "全精通刷徽章"成最优 | 13 条互相独立、纯收集；与既有 `dim0_l5`(+5%) 等数值增益**解耦**——徽章不影响 build 强度，故无"为数值而刷"的单一最优解 |
| 支柱一 | 纯线性倍率通胀 | **记录/机制驱动**（精通深度 + Killer tempo），无任何通胀 |

**结论**：全局乘区上界、协同全局=0、`D(s)≤0.25` 三条边界**均不被本系统触碰**；印记增量=0。✅ 满足全部红线与支柱一。

---

## 7. 风险

1. **R1 印记红线误触（高）**：若未来有人把 `group:'dimension'` 也接入 `grantNumeralImprint`，会突破 14 上限。**缓解**：本 GDD 明确规定 `'dimension'` 分组**不**走印记发放；发放点仅 `gameStore.ts:1212`（档案/超越）。建议在 `grantNumeralImprint` 调用处加注释守卫。
2. **Modal 硬编码分组遗漏（中）**：`AchievementsModal.vue:53-63` 为硬编码；若只加 def 不加分组标签/顺序，徽章会"已解锁却不可见"。**缓解**：§5 钩点须同步改 `GROUP_LABELS` 与 `order` 两处。
3. **精通 L5 过长（低）**：`master` 100 需长弧。**缓解**：阈值取既有 5 级自然节点（60/100），与奖励体系同源；Killer 用 80/60 中段阈值保证可达。
4. **Killer 计数时序歧义（低）**：`beforeTranscend` 在 tick 评估时比对，重置后计数清零、条件变易满足——但徽章已永久获得，不会撤销（符合成就语义）。无需特殊处理。

---

## 8. 验收标准

1. `AchIEVEMENT_DEFS` 新增 13 条、`group:'dimension'`；`AchievementSystem.evaluate` 含 `dimension_mastery` 分支（含 `allDimensions` / `beforeTranscend` / `beforeExpansion`）。
2. 每 tick `checkAchievements` 正确评估新条件：某维 `master ≥ conditionValue` 时点亮对应徽章；`allDimensions` 与 Killer 限制条件按 §2.2 生效。
3. `initAchievements` 覆盖新条目（新存档不缺条目）；旧存档加载不崩（`achievements` Map 缺条目时按既有逻辑惰性初始化）。
4. **零印记**：grep 确认本系统**未**调用 `grantNumeralImprint`；`numeralImprints` 上限 14 不受影响（仅档案 9 + 超越 5）。
5. **零新乘源**：grep 确认本系统**未**调用 `MultiplierSystem.register` / 新增 `MultiplierSource` 枚举值；`effMult` 不受任何影响。
6. `AchievementsModal` 出现"🧭 维度精通"页签且 13 条正确归组（`GROUP_LABELS` 与 `order` 均已追加）。
7. **重置保留**：`executePrestige`/`executeExpansion`/`executeTranscend` 后已解锁维度徽章仍在（`achievements` Map 三处均拷贝，`:129/:123/:121`）。

---

*文档结束。本系统为纯成就/记录层，与 `mastery-rewards.md`、`dimension-synergy.md`、`_consistency.md` 的乘区/印记/通胀边界完全正交，不引入任何交互风险。*
