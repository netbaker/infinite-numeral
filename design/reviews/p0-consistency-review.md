# P0 系统实现一致性审查报告

> **审查人**：文策渊（设计策划）
> **审查日期**：2026-07-01
> **审查范围**：维度系统（DimensionSystem）、熵崩系统（EntropySystem）
> **对照基准**：`docs/v2.0-update-plan.md` 第二章设计要点 + `GAME_DESIGN_DOC.md` 第九章倍增器系统

---

## 一、审查总览

| 系统 | 设计完整度 | 实现完整度 | 关键缺陷数 | 评级 |
|------|-----------|-----------|-----------|------|
| 维度系统 | 100% | ~65% | 3 个致命 + 4 个建议 | 🔴 需修复 |
| 熵崩系统 | 100% | ~75% | 2 个必须修 + 2 个建议 | 🟠 需补全 |

---

## 二、维度系统审查

### 2.1 审查文件清单

| 文件 | 职责 |
|------|------|
| `src/systems/DimensionSystem.ts` | 维度切换、精通度、倍率计算、资源产出、晶体合成 |
| `src/components/game/DimensionPanel.vue` | 维度面板 UI（列表、切换、解锁、合成） |
| `src/core/Constants.ts` → `DIMENSION_DEFS` | 5 个维度静态定义 |
| `src/core/Constants.ts` → `DIMENSION_MASTERY_REWARDS` | 精通度奖励文本 |
| `src/types/game.ts` | `DimensionDef`、`DimensionState`、`DimensionPanelData` 类型 |
| `src/stores/gameStore.ts` | 系统集成：初始化、tick 调用、产出计算 |

### 2.2 逐项对照

| 设计要点 | 实现状态 | 详情 |
|---------|---------|------|
| 5 个维度（Dim-0~4） | ✅ 完整 | `DIMENSION_DEFS` 定义了全部 5 个维度，类型/名称/资源/解锁成本均匹配 |
| 每维度独特增益规则 | ⚠️ 已实现但未生效 | `calculateDimensionMultiplier()` 逻辑正确（质数×3、混沌随机、反熵叠加、奇点爆发），**但结果未接入实际产出计算**（见致命缺陷 #1） |
| 维度切换机制 | ⚠️ 偏离设计 | 设计说"每次 Prestige 可以在维度间切换"，实现为**任意时刻 5 秒冷却切换**。更灵活但削弱了 Prestige 作为切换窗口的策略深度 |
| 维度精通度 | ✅ 已实现 | `tickMastery()` 每 tick 增长，5 级（每 20 点），有奖励文本。但增长公式有精度隐患（见缺陷 #5） |
| 维度碎片→晶体合成 | ⚠️ 部分实现 | `synthesizeCrystal()` 可合成晶体，但**晶体无消费出口**——设计说"用于购买跨维度增益"，无对应购买系统 |
| 维度图谱 UI | ✅ 已实现 | `DimensionPanel.vue` 全屏面板，展示 5 维度卡片、精通度进度条、混沌倍率、奇点爆发状态 |

### 2.3 致命缺陷（必须修）

#### 缺陷 #1：维度倍率未接入产出计算 — 🔴 致命

**现象**：`DimensionSystem.calculateDimensionMultiplier()` 正确计算了各维度倍率，`gameStore.getDimensionBoost()` 也暴露了接口，但**在主游戏循环 `gameTick()` 中从未调用**。

**当前产出计算流程**（`gameStore.ts` L455-494）：
```
rawOutputPerSec = producerSystem.calculateTotalOutput(state, multiplierSystem)
    ↓ （MultiplierSystem 中无 dimension 来源）
outputPerSec = rawOutputPerSec × entropyMult
    ↓
increment = outputPerSec × deltaSec
```

维度倍率完全不参与上述链路。`MultiplierSystem` 的 `MultiplierSource` 枚举中甚至没有 `'dimension'` 类型。

**影响**：玩家切换到质数维度（×3）、混沌维度（最高 ×5）、奇点维度（×100 爆发）后，**实际数字增长速度没有任何变化**。维度系统沦为纯视觉装饰。

**修复建议**：
- 方案 A（推荐）：在 `MultiplierSystem` 新增 `dimension` 来源，在 `recalculateFromState()` 中调用 `dimensionSystem.calculateDimensionMultiplier(state)` 注册维度倍率
- 方案 B：在 `gameTick()` 中将 `rawOutputPerSec` 乘以维度倍率，即 `rawOutputPerSec.mul(dimensionSystem.calculateDimensionMultiplier(state))`

#### 缺陷 #2：混沌维度 ID 错配 — 🔴 致命

**现象**：以下三个方法均检查 `state.currentDimension !== 1`，但混沌维度是 **Dim-2**（Dim-1 是质数维度）：

| 方法 | 行号 | 错误判断 | 应为 |
|------|------|---------|------|
| `checkChaosMultiplier()` | L328 | `!== 1` | `!== 2` |
| `getChaosMultiplier()` | L346 | `!== 1` | `!== 2` |
| `getChaosTimer()` | L354 | `!== 1` | `!== 2` |

**影响**：当玩家在混沌维度（Dim-2）时，这三个方法全部提前 return，混沌倍率不会被重投、不会显示、倒计时不工作。反之在质数维度（Dim-1）时，这些方法会错误地尝试执行混沌逻辑。

**修复**：将三处 `!== 1` 改为 `!== 2`。注意 `calculateDimensionMultiplier()` 中 `case 2` 是正确的，说明这是一个局部笔误。

#### 缺陷 #3：质数检测在大数字下失效 — 🔴 致命

**现象**：`isPrime(n)` 接收 `state.number.toNumber()` 的返回值。JavaScript 的 `Number` 安全整数上限为 `2^53 ≈ 9e15`。当数字超过此值时，`toNumber()` 返回近似值，质数检测必然失败。

增量游戏中，数字在几分钟内就会超过 1e15。代码注释也承认"适用于 < 1e12 的数字"，但没有做任何降级处理。

**影响**：质数维度的 ×3 倍率在游戏早期（< 1e12）偶尔生效，中后期（绝大多数游戏时间）**完全失效**。质数维度变成纯粹的 1.0x 维度。

**修复建议**：
- 短期：对大数字使用概率性质数检测（Miller-Rabin），或改为检测 `log10(number)` 的整数部分是否为质数
- 长期：重新设计质数维度的触发条件，不依赖原始数字的质数性（如"数字的位数之和为质数时触发"）

### 2.4 建议优化

#### 优化 #4：反熵维度使用 `prestigeCount` 会在膨胀时清零

**现象**：`case 3`（反熵维度）使用 `1 + state.prestigeCount * 0.2` 计算倍率。但根据 GDD 5.2，膨胀（Expansion）会"坍缩次数归零"。这意味着玩家每次膨胀后反熵维度的加成归零，与设计意图"飞升次数越多倍率越高，鼓励深度游玩"矛盾。

**建议**：改用 `state.transcendCount`（超越次数，不重置）或新增 `cumulativePrestigeCount` 字段。

#### 优化 #5：精通度增长公式精度隐患

**现象**：`tickMastery()` 使用 `outputPerSec.toNumber() * deltaTime * 0.0001`。当 `outputPerSec` 超过 `Number.MAX_VALUE`（~1.8e308）时，`toNumber()` 返回 `Infinity`，精通度会瞬间拉满。

**建议**：对 `toNumber()` 结果做 `Math.min(value, someCap)` 钳制，或改用 `log10(outputPerSec)` 作为增长因子。

#### 优化 #6：混沌倍率范围不一致

**现象**：
- `rollChaosMultiplier()`：`min=0.5, max=5.0`（与设计一致）
- `checkChaosMultiplier()`：`1 + Math.random() * 4` → 范围 1.0~5.0（与设计不符）

两个方法产生不同的随机范围。应统一为 0.5~5.0。

#### 优化 #7：维度晶体无消费出口

**现象**：`synthesizeCrystal()` 可以合成维度晶体，`GameState.dimensionCrystals` 也在累加，但没有任何消费晶体的方法或商店。设计意图是"用于购买跨维度增益"。

**建议**：在 v2.0 Beta 阶段补充晶体商店（消耗晶体购买全局加成、维度精通加速等）。

---

## 三、熵崩系统审查

### 3.1 审查文件清单

| 文件 | 职责 |
|------|------|
| `src/systems/EntropySystem.ts` | 熵值增长/衰减、等级检测、大崩塌、对抗道具 |
| `src/components/game/EntropyBar.vue` | 熵值进度条 UI（渐变色、等级标签、道具按钮） |
| `src/core/Constants.ts` → `ENTROPY_CONFIG` | 阈值、增长率、惩罚倍率等配置 |
| `src/core/Constants.ts` → `ENTROPY_ITEM_DEFS` | 对抗道具定义 |
| `src/types/game.ts` | `EntropyCollapseLevel`、`EntropyItemType`、`EntropyItemDef` |

### 3.2 逐项对照

| 设计要点 | 实现状态 | 详情 |
|---------|---------|------|
| 熵值增长（数字增长驱动） | ✅ 已实现 | `calculateGrowth()` = 基础增长 + 产出比例加速 |
| 大倍率购买增加熵值 | ✅ 已实现 | `calculateBulkPenalty()` + `addEntropy()`，×10=+3%，×100/MAX=+8% |
| Prestige 清零熵值 | ✅ 已实现 | `resetOnPrestige()` → `PRESTIGE_RESIDUAL=0` |
| 4 级效果（稳定/不稳定/临界/熵崩） | ⚠️ 部分实现 | 稳定 ✅、不稳定（-20%产出 ✅，时间因子减弱 ❌）、临界（-50%产出 ✅，随机停机 ❌）、熵崩（扣除数字 ✅） |
| 3 种对抗道具 | ⚠️ 仅实现 2 种 | 熵稳定剂 ✅、时间回溯 ✅（但实现方式偏离）、维度屏障 ❌ |
| 熵值 UI 进度条 | ✅ 已实现 | 渐变色（蓝→黄→橙→红）、等级标签、道具快捷按钮、tooltip |
| "建议 Prestige"提示 | ✅ 已实现 | `shouldSuggestPrestige()`：熵值>70% 且可 Prestige 时触发 |

### 3.3 必须修复

#### 缺陷 #8：缺少第三种对抗道具「维度屏障」— 🔴 必须修

**设计规定 3 种对抗道具**：

| 道具 | 设计效果 | 实现状态 |
|------|---------|---------|
| 熵稳定剂 | 立即降低 20% 熵值 | ✅ `applyStabilizer()` |
| 时间回溯 | 回退 5 秒的熵值积累 | ⚠️ `applyRewind()`（实现方式偏离，见 #10） |
| 维度屏障 | 60 秒内熵值不上升 | ❌ **完全未实现** |

**影响**：玩家在高熵值时只有 2 种应对手段，缺少"拖延战术"选项。维度屏障是设计中的关键策略工具——它允许玩家在 60 秒内无视熵值增长，为冲量或等待 Prestige 时机争取窗口。

**修复清单**：
1. `EntropyItemType` 新增 `'barrier'` 类型
2. `ENTROPY_ITEM_DEFS` 新增维度屏障定义
3. `EntropySystem` 新增 `applyBarrier()` 方法和 `_barrierActiveUntil` 状态
4. `tick()` 中增加屏障检查：屏障激活时跳过增长计算
5. `GameState` 新增 `entropyBarriers` 持有数字段 + `_barrierActiveUntil` 时间戳
6. `EntropyBar.vue` 新增屏障按钮 + 激活状态指示
7. `gameStore.ts` 新增 `buyEntropyBarrier()` / `useEntropyBarrier()` 方法

#### 缺陷 #9：临界等级缺少「随机生产者停机」效果 — 🔴 必须修

**设计规定**：临界（80-100%）时"产出 -50%，**随机一个生产者停机 30 秒**"。

**现状**：`getProductionMultiplier()` 正确返回 0.50 倍率，但"随机停机"完全未实现。进入临界状态后没有生产者被停机，只有数值惩罚。

**影响**：临界状态的惩罚力度不足，玩家可能选择"硬扛"而非策略性重置。设计意图是通过随机停机制造不可预测的损失，倒逼玩家在高熵时主动 Prestige。

**修复建议**：
1. `GameState` 新增 `downedProducers: Map<string, number>`（producerId → 停机结束时间戳）
2. `EntropySystem` 在进入 critical 等级时随机选择一个已拥有生产者，设置 30 秒停机
3. `ProducerSystem.calculateTotalOutput()` 跳过停机中的生产者
4. UI 层显示停机状态（生产者卡片灰显 + 倒计时）

#### 缺陷 #10：不稳定等级缺少「时间因子效果减弱」— 🟠 必须修

**设计规定**：不稳定（50-80%）时"所有产出 -20%，**时间因子效果减弱**"。

**现状**：仅实现了 -20% 产出惩罚，"时间因子效果减弱"未实现。

**影响**：不稳定等级的惩罚不够立体。设计意图是让时间相关的增益（如事件 speed_change、离线收益效率）在高熵下打折，增加多维度压力。

**修复建议**：在 `gameTick()` 中，当熵值处于 unstable 时，将 `timeSpeedMultiplier` 的效果按 0.7 系数折减（或类似机制）。需与程基岩确认具体实现方式。

#### 缺陷 #11：时间回溯实现方式偏离设计 — 🟠 必须修

**设计规定**："回退 5 秒的熵值积累"。

**现状**：`applyRewind()` 使用公式 `Math.max(1, Math.min(15, state.entropy * 0.03 + 2))`，本质是基于当前熵值的百分比扣减，并非真正"回退 5 秒"。

**影响**：在不同熵值水平下，回溯效果差异很大（熵值 20 时减 ~2.6 点，熵值 80 时减 ~4.4 点）。与设计意图"回退 5 秒"不一致——真正的 5 秒回退应该记录最近 5 秒的熵值增量并扣除。

**修复建议**：在 `EntropySystem` 中维护一个 5 秒滑动窗口的熵值历史记录（环形缓冲区），`applyRewind()` 时扣除窗口内净增量。

### 3.4 建议优化

#### 优化 #12：大崩塌扣除比例可能偏低

**设计措辞**："强制消耗大量数字"。当前实现扣除 15%（`COLLAPSE_DRAIN_PERCENT: 15`）。对于增量游戏的大数字阶段，15% 可能不构成足够的威慑。

**建议**：考虑改为阶梯式扣除——熵值刚到 100 时扣 15%，如果连续触发崩塌（短时间内多次），扣除比例递增。或调整为 25-30%。需后续数值平衡测试确认。

#### 优化 #13：`EntropyCollapseLevel` 类型缺少 `collapsed`

**现象**：`game.ts` 中 `EntropyCollapseLevel` 类型定义为 `'stable' | 'unstable' | 'critical'`，不包含 `'collapsed'`。但 `EntropyBar.vue` 的 `level` computed 属性使用了 `'collapsed'` 值（当 entropy >= 100 时）。

类型系统层面不匹配。虽然 TS 不会运行时报错（因为 Vue computed 用了显式联合类型），但 `EntropySystem.getCollapseLevel()` 在 entropy=100 时返回 `'critical'`，而 UI 显示 `'collapsed'`，两者不一致。

**建议**：将 `EntropyCollapseLevel` 扩展为 `'stable' | 'unstable' | 'critical' | 'collapsed'`，并在 `getCollapseLevel()` 中增加 `>= 100 → 'collapsed'` 分支。

---

## 四、修复优先级汇总

### 必须修（阻断核心玩法）

| # | 缺陷 | 系统 | 优先级 | 预估工作量 |
|---|------|------|--------|-----------|
| 1 | 维度倍率未接入产出计算 | 维度 | P0-阻断 | M |
| 2 | 混沌维度 ID 错配（1→2） | 维度 | P0-阻断 | S |
| 3 | 质数检测大数字失效 | 维度 | P0-阻断 | M |
| 8 | 缺少维度屏障道具 | 熵崩 | P0-缺失 | M |
| 9 | 缺少临界随机停机效果 | 熵崩 | P0-缺失 | M |
| 10 | 缺少不稳定时间因子减弱 | 熵崩 | P1-缺失 | S |
| 11 | 时间回溯实现偏离设计 | 熵崩 | P1-偏离 | S |

### 建议优化（提升体验/健壮性）

| # | 缺陷 | 系统 | 优先级 | 预估工作量 |
|---|------|------|--------|-----------|
| 4 | 反熵维度用 prestigeCount 会清零 | 维度 | P1 | S |
| 5 | 精通度增长公式精度隐患 | 维度 | P1 | S |
| 6 | 混沌倍率范围不一致 | 维度 | P2 | S |
| 7 | 维度晶体无消费出口 | 维度 | P2 | M |
| 12 | 大崩塌扣除比例偏低 | 熵崩 | P2 | S |
| 13 | EntropyCollapseLevel 缺少 collapsed | 熵崩 | P2 | S |

> 复杂度标注：S = 半天内，M = 1-2 天，L = 3+ 天

---

## 五、与工程团队协作建议

1. **缺陷 #1（维度倍率未接入）** 是最高优先级。建议与程基岩确认：是走 MultiplierSystem 注册路线（方案 A）还是 gameTick 直接乘路线（方案 B）。方案 A 更符合现有架构，但需要修改 `MultiplierSource` 类型和 `recalculateFromState()` 逻辑。

2. **缺陷 #3（质数检测）** 需要设计决策：是改用概率检测保持"数字是质数"的原意，还是重新设计触发条件。建议先由策划定方案，再交工程实现。

3. **缺陷 #8-10（熵崩缺失效果）** 涉及 GameState 结构变更（新增字段），需与程基岩协调存档兼容性。

4. 所有修复完成后，建议严守真补充对应的单元测试（尤其是维度倍率接入、混沌 ID 修正、质数检测边界用例）。

---

*文档结束*
