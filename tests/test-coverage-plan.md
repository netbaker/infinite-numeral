# 测试覆盖缺口分析与补全计划

> 评估人：程基岩（engineering-lead）
> 评估日期：2026-07-01
> 评估范围：8 个未测系统 — DimensionSystem, EntropySystem, FactorSystem, ChallengeSystem, EventSystem, AchievementSystem, TechTreeSystem, TranscendSystem

---

## 0. 现有测试现状

### 已有测试（6个）

| 测试文件 | 覆盖系统 | 用例数 | 测试风格 |
|---------|---------|:---:|---------|
| `BigNumber.test.ts` | BigNumber 核心 | 17 | 工厂方法 + 运算 + 比较 + 取整 + 不可变性 + 大数 |
| `Formatter.test.ts` | Formatter | 12 | 分层格式化 + 边界值 |
| `OfflineSystem.test.ts` | OfflineSystem | 7 | 离线收益 + 效率递减 + 截断 |
| `ProducerSystem.test.ts` | ProducerSystem | 12 | 成本计算 + 购买 + 产出 + 解锁 |
| `MultiplierSystem.test.ts` | MultiplierSystem | 13 | 注册/注销 + 全局/生产者倍率 + recalculate + 折扣 |
| `PrestigeSystem.test.ts` | PrestigeSystem | 13 | 可重置判定 + 星尘计算 + 执行重置 |

### 测试风格总结

- 框架：Vitest
- 模式：`describe` → `describe`（分组）→ `it`（用例）
- 工具：`beforeEach` 初始化系统实例；`createTestState()` 工厂函数
- 断言：`expect(...).toBe/toBeCloseTo/toEqual/toContain/toBeLessThan`
- Decimal 处理：`new Decimal(value)` 创建，`parseFloat(bn.toString())` 转数字比较
- 命名：中文用例描述，简洁明了

---

## 1. DimensionSystem（维度系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P0** — v2.0 核心系统，含已知 bug |
| 复杂度 | **L** — 5 种维度类型，各有多独特规则，精通度/资源/晶体/混沌/奇点爆发 |
| 依赖关系 | 依赖 GameState（dimensionStates Map）、Constants（DIMENSION_DEFS） |
| 已知 bug | ① checkChaosMultiplier 检查 dimId===1 但 dim1 是质数维度（非混沌）；② tickDimensionResources 未在 gameStore 中调用 |

### 关键测试用例清单

#### 1.1 初始化（initialize）

| # | 用例 | 类型 |
|---|------|------|
| 1 | 初始化后 5 个维度状态全部存在 | 正常路径 |
| 2 | Dim-0 默认解锁（unlockCost=0） | 正常路径 |
| 3 | Dim-1~4 初始未解锁 | 正常路径 |
| 4 | 各维度初始 resource 为 Decimal(0) | 正常路径 |
| 5 | 各维度初始 master=0、crystals=0 | 正常路径 |
| 6 | currentDimension 超出范围(>4)时重置为0 | 边界条件 |
| 7 | currentDimension 为负数时重置为0 | 边界条件 |
| 8 | 已有 dimensionStates 的存档不会被覆盖 | 兼容性 |

#### 1.2 维度切换（switchDimension）

| # | 用例 | 类型 |
|---|------|------|
| 9 | 已解锁维度可切换成功 | 正常路径 |
| 10 | 未解锁维度切换失败 | 异常情况 |
| 11 | 5秒冷却期内切换失败 | 边界条件 |
| 12 | 冷却期结束后切换成功 | 边界条件 |
| 13 | 切换到不存在的维度ID失败 | 异常情况 |
| 14 | 切换后 currentDimension 更新 | 正常路径 |
| 15 | 切换后 _lastDimensionSwitch 更新 | 正常路径 |

#### 1.3 维度解锁（unlockDimension）

| # | 用例 | 类型 |
|---|------|------|
| 16 | 奇点充足时解锁成功 | 正常路径 |
| 17 | 奇点不足时解锁失败 | 异常情况 |
| 18 | 已解锁维度再次解锁失败 | 边界条件 |
| 19 | unlockCost=0 的维度不可通过此方法解锁 | 边界条件 |
| 20 | 解锁后扣除奇点 | 正常路径 |

#### 1.4 维度倍率计算（calculateDimensionMultiplier）

| # | 用例 | 类型 |
|---|------|------|
| 21 | Dim-0（基础）倍率=1.0 | 正常路径 |
| 22 | Dim-1（质数）数字为质数时倍率×3 | 正常路径 |
| 23 | Dim-1（质数）数字非质数时倍率=1.0 | 正常路径 |
| 24 | Dim-2（混沌）倍率受 _chaosMultiplier 影响 | 正常路径 |
| 25 | Dim-3（反熵）倍率随 prestigeCount 增长 | 正常路径 |
| 26 | Dim-4（奇点）log10>300 时倍率×100 | 边界条件 |
| 27 | Dim-4（奇点）log10 280-300 之间预热倍率 | 边界条件 |
| 28 | 精通度加成（每点+0.5%） | 正常路径 |

#### 1.5 精通度（tickMastery / getMastery / getMasteryLevel）

| # | 用例 | 类型 |
|---|------|------|
| 29 | 精通度随产出增长 | 正常路径 |
| 30 | 精通度不超过 maxMastery | 边界条件 |
| 31 | 未解锁维度精通度不增长 | 异常情况 |
| 32 | getMasteryLevel 每20点一级 | 正常路径 |
| 33 | 精通度=0 时 level=0 | 边界条件 |

#### 1.6 混沌与奇点爆发

| # | 用例 | 类型 |
|---|------|------|
| 34 | rollChaosMultiplier 结果在 [0.5, 5.0] 范围内 | 正常路径 |
| 35 | checkChaosMultiplier 首次初始化设置随机值 | 正常路径 |
| 36 | checkChaosMultiplier 60秒后重投 | 边界条件 |
| 37 | checkSingularityBurst 在 log10>300 时触发 | 正常路径 |
| 38 | checkSingularityBurst 5秒后结束 | 边界条件 |
| 39 | getChaosMultiplier 非混沌维度返回1 | 边界条件 |

#### 1.7 晶体合成与面板数据

| # | 用例 | 类型 |
|---|------|------|
| 40 | synthesizeCrystal 资源充足时成功 | 正常路径 |
| 41 | synthesizeCrystal 资源不足时失败 | 异常情况 |
| 42 | synthesizeCrystal 扣除1000资源 | 正常路径 |
| 43 | getDimensionPanelData 返回5条数据 | 正常路径 |
| 44 | applyDimensionBonus 应用维度倍率 | 正常路径 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数（需扩展，初始化 dimensionStates）
- 依赖 `GameState` 类（已有 dimensionStates 字段）
- 依赖 `DIMENSION_DEFS` 常量
- 不依赖其他系统的测试

---

## 2. EntropySystem（熵崩系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P0** — v2.0 核心系统，影响产出惩罚 |
| 复杂度 | **M** — 熵值增长/衰减/崩溃三级/道具使用 |
| 依赖关系 | 依赖 GameState（entropy 字段）、Constants（ENTROPY_CONFIG）、BigNumber |

### 关键测试用例清单

#### 2.1 初始化（initialize）

| # | 用例 | 类型 |
|---|------|------|
| 1 | 初始化后 entropy 在 [0, 100] 范围内 | 正常路径 |
| 2 | 熵值负数被修正为0 | 边界条件 |
| 3 | 熵值超过100被修正为100 | 边界条件 |
| 4 | 稳定剂/回溯道具数量负数被修正为0 | 边界条件 |
| 5 | _lastEntropyDecayTick 初始化为当前时间 | 正常路径 |

#### 2.2 tick 主循环

| # | 用例 | 类型 |
|---|------|------|
| 6 | 高产出时熵值增长 | 正常路径 |
| 7 | 零产出时熵值自然衰减 | 正常路径 |
| 8 | 熵值增长不超过100 | 边界条件 |
| 9 | 熵值衰减不低于0 | 边界条件 |
| 10 | 熵值达到100触发大崩塌 | 边界条件 |
| 11 | 大崩塌后熵值回落到 70（CRITICAL_THRESHOLD-10） | 正常路径 |
| 12 | 大崩塌扣除当前数字15% | 正常路径 |
| 13 | 大崩塌后 totalCollapses+1 | 正常路径 |
| 14 | 等级从 stable→unstable 触发预警 | 正常路径 |
| 15 | 等级从 stable→critical 触发预警 | 正常路径 |
| 16 | tick 返回 true 当崩溃发生时 | 正常路径 |
| 17 | tick 返回 true 当等级变化时 | 正常路径 |
| 18 | tick 返回 false 当无变化时 | 正常路径 |

#### 2.3 崩溃等级与产出惩罚

| # | 用例 | 类型 |
|---|------|------|
| 19 | entropy=0 → 'stable' | 边界条件 |
| 20 | entropy=49 → 'stable' | 边界条件 |
| 21 | entropy=50 → 'unstable' | 边界条件 |
| 22 | entropy=79 → 'unstable' | 边界条件 |
| 23 | entropy=80 → 'critical' | 边界条件 |
| 24 | entropy=100 → 'critical' | 边界条件 |
| 25 | stable 产出倍率=1.0 | 正常路径 |
| 26 | unstable 产出倍率=0.80 | 正常路径 |
| 27 | critical 产出倍率=0.50 | 正常路径 |

#### 2.4 道具使用

| # | 用例 | 类型 |
|---|------|------|
| 28 | applyStabilizer 有道具时降低20点熵值 | 正常路径 |
| 29 | applyStabilizer 无道具时失败 | 异常情况 |
| 30 | applyStabilizer 后道具数量-1 | 正常路径 |
| 31 | applyRewind 有道具时回退熵值 | 正常路径 |
| 32 | applyRewind 无道具时失败 | 异常情况 |
| 33 | applyRewind 回退值在 [1, 15] 范围内 | 边界条件 |

#### 2.5 Prestige/Expansion 重置

| # | 用例 | 类型 |
|---|------|------|
| 34 | resetOnPrestige 熵值归零（PRESTIGE_RESIDUAL=0） | 正常路径 |
| 35 | resetOnExpansion 熵值归零（EXPANSION_RESIDUAL=0） | 正常路径 |

#### 2.6 辅助方法

| # | 用例 | 类型 |
|---|------|------|
| 36 | shouldSuggestPrestige 熵值>70 且已Prestige且number≥1e12 → true | 正常路径 |
| 37 | shouldSrestige 熵值<70 → false | 边界条件 |
| 38 | shouldSuggestPrestige 未Prestige过 → false | 边界条件 |
| 39 | calculateBulkPenalty ×10 返回 HIGH_BULK_PENALTY | 正常路径 |
| 40 | calculateBulkPenalty ×100 返回 HIGH_BULK_PENALTY+5 | 正常路径 |
| 41 | getDisplayPercent 返回0-100整数 | 正常路径 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数
- 依赖 `GameState` 类
- 依赖 `ENTROPY_CONFIG` 常量
- 依赖 `BigNumber`（outputPerSec 参数）

---

## 3. FactorSystem（因子系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P0** — 核心循环数值来源，影响 MultiplierSystem |
| 复杂度 | **M** — 10种数学检测器 + 等级/激活逻辑 |
| 依赖关系 | 依赖 GameState（factors Map, lastMagnitude）、Constants（FACTOR_DEFS）、Decimal |

### 关键测试用例清单

#### 3.1 初始化（initFactors）

| # | 用例 | 类型 |
|---|------|------|
| 1 | 初始化后所有 FACTOR_DEFS 对应的状态存在 | 正常路径 |
| 2 | 初始 level=0, active=false | 正常路径 |
| 3 | 已有状态的因子不被覆盖 | 兼容性 |

#### 3.2 tick 主循环

| # | 用例 | 类型 |
|---|------|------|
| 4 | number<1 时不检测 | 边界条件 |
| 5 | 首次调用初始化 lastMagnitude 并全量扫描 | 正常路径 |
| 6 | 数量级未变时不检测 | 性能 |
| 7 | 数量级变化时触发全量扫描 | 正常路径 |
| 8 | 返回新触发的 FactorDef 列表 | 正常路径 |

#### 3.3 数学检测器

| # | 用例 | 类型 |
|---|------|------|
| 9 | checkTwinPrime 邻近素数时命中 | 正常路径 |
| 10 | checkGermainPrime 热尔曼素数时命中 | 正常路径 |
| 11 | checkPerfectSquare 完全平方数命中（如 144=12²） | 正常路径 |
| 12 | checkPerfectCube 完全立方数命中（如 125=5³） | 正常路径 |
| 13 | checkFibonacci 斐波那契数命中（如 144） | 正常路径 |
| 14 | checkPowerOf2 2的幂命中（如 128=2⁷） | 正常路径 |
| 15 | checkPowerOf10 10的幂命中（如 1e50） | 正常路径 |
| 16 | checkRepDigit 重复数字命中（如 1111） | 正常路径 |
| 17 | checkNearPi π邻近命中 | 正常路径 |
| 18 | checkNearE e邻近命中 | 正常路径 |
| 19 | 非特殊数字所有检测器返回false | 异常情况 |

#### 3.4 因子升级与激活

| # | 用例 | 类型 |
|---|------|------|
| 20 | 命中检测器后 level+1 | 正常路径 |
| 21 | 命中后 active=true | 正常路径 |
| 22 | 已满级因子保持 active=true 不再升级 | 边界条件 |
| 23 | 数量级变化但未命中时 active=false | 正常路径 |
| 24 | magnitudeThreshold 不足时跳过检测 | 边界条件 |

#### 3.5 效果计算

| # | 用例 | 类型 |
|---|------|------|
| 25 | getEffectValue level=0 返回0 | 边界条件 |
| 26 | getEffectValue level=1 返回 baseEffect | 正常路径 |
| 27 | getEffectValue level=2 返回 baseEffect + effectPerLevel | 正常路径 |
| 28 | getActiveMultiplierEntries 返回激活因子的乘数条目 | 正常路径 |
| 29 | cost_discount 类型因子不产生乘数条目 | 边界条件 |
| 30 | getTotalCostDiscount 返回总折扣，上限50% | 边界条件 |

#### 3.6 工具方法

| # | 用例 | 类型 |
|---|------|------|
| 31 | getMantissa 提取有效数字（1.23e50 → 123） | 正常路径 |
| 32 | getMantissa number<1 返回0 | 边界条件 |
| 33 | isPrime 正确判定素数 | 正常路径 |
| 34 | isPrime 负数/0/1 返回false | 边界条件 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数（需扩展，初始化 factors Map）
- 依赖 `FACTOR_DEFS` 常量
- 间接依赖 `MultiplierSystem`（getActiveMultiplierEntries 的输出格式需匹配）

---

## 4. ChallengeSystem（挑战系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P1** — 重要功能但不影响核心循环 |
| 复杂度 | **M** — 三类挑战（daily/timed/milestone）+ 多种进度类型 |
| 依赖关系 | 依赖 GameState（challenges Map）、Constants（CHALLENGE_DEFS） |

### 关键测试用例清单

#### 4.1 初始化（initialize）

| # | 用例 | 类型 |
|---|------|------|
| 1 | 初始化后所有 CHALLENGE_DEFS 对应的状态存在 | 正常路径 |
| 2 | daily 类挑战初始化 lastResetDate | 正常路径 |
| 3 | 已有状态的挑战不被覆盖 | 兼容性 |

#### 4.2 每日重置（checkDailyReset）

| # | 用例 | 类型 |
|---|------|------|
| 4 | 日期变化时重置 daily 挑战 | 正常路径 |
| 5 | 重置后 progress=0, completed=false, claimed=false | 正常路径 |
| 6 | 日期未变化时不重置 | 边界条件 |
| 7 | 非 daily 类挑战不受影响 | 边界条件 |

#### 4.3 限时挑战

| # | 用例 | 类型 |
|---|------|------|
| 8 | startTimedChallenge 成功开始并设置 startedAt/remainingTime | 正常路径 |
| 9 | startTimedChallenge 非timed类返回false | 异常情况 |
| 10 | startTimedChallenge 已完成的不允许重新开始 | 边界条件 |
| 11 | updateTimedChallenges 剩余时间递减 | 正常路径 |
| 12 | updateTimedChallenges 超时后清除 startedAt | 边界条件 |
| 13 | 超时后 completed 保持 false（可重新开始） | 边界条件 |

#### 4.4 进度追踪

| # | 用例 | 类型 |
|---|------|------|
| 14 | recordClick 更新 click_count 类型进度 | 正常路径 |
| 15 | recordPrestige 更新 prestige_once 类型进度 | 正常路径 |
| 16 | recordExpansion 更新 expansion_once 类型进度 | 正常路径 |
| 17 | recordProduction 更新 produce_amount 类型进度 | 正常路径 |
| 18 | recordIdleTime 更新 idle_seconds 类型进度 | 正常路径 |
| 19 | 进度达到 targetValue 后自动标记 completed | 正常路径 |
| 20 | 已完成的挑战不继续增加进度 | 边界条件 |
| 21 | number_reach 类型每帧快照检测 | 正常路径 |

#### 4.5 奖励领取

| # | 用例 | 类型 |
|---|------|------|
| 22 | claimReward 已完成未领取时发放星尘 | 正常路径 |
| 23 | claimReward milestone 类额外发放暗能量 | 正常路径 |
| 24 | claimReward 未完成时返回null | 异常情况 |
| 25 | claimReward 已领取后返回null | 边界条件 |
| 26 | milestone 类领取后加入 completedMilestones | 正常路径 |

#### 4.6 数据查询

| # | 用例 | 类型 |
|---|------|------|
| 27 | getAllChallenges 返回所有挑战含定义和状态 | 正常路径 |
| 28 | progressPercent 计算正确 | 正常路径 |
| 29 | getUnclaimedCount 正确统计 | 正常路径 |
| 30 | getDailyStats 正确统计 | 正常路径 |
| 31 | getChallengesByCategory 按类别筛选 | 正常路径 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数（需扩展，初始化 challenges Map）
- 依赖 `CHALLENGE_DEFS` 常量
- 依赖 `Decimal`（number_reach 类型的进度快照需要 Decimal 比较）

---

## 5. EventSystem（事件系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P1** — 重要功能，事件效果影响 MultiplierSystem |
| 复杂度 | **M** — 概率触发 + 冷却 + 选项 + 即时/持续效果 |
| 依赖关系 | 依赖 GameState（activeEvent, ongoingEffects, eventCooldown）、Constants（EVENT_DEFS） |

### 关键测试用例清单

#### 5.1 tick 主循环

| # | 用例 | 类型 |
|---|------|------|
| 1 | 有活跃事件时不触发新事件 | 正常路径 |
| 2 | 冷却期内不触发新事件 | 边界条件 |
| 3 | 冷却结束后可触发 | 正常路径 |
| 4 | number<1 时不触发 | 边界条件 |
| 5 | 清理过期持续效果 | 正常路径 |
| 6 | 无持续效果时重置 timeSpeedMultiplier=1 | 边界条件 |

#### 5.2 事件触发（tryTriggerEvent）

| # | 用例 | 类型 |
|---|------|------|
| 7 | 满足 minMagnitude 的事件进入候选 | 正常路径 |
| 8 | 不满足 minMagnitude 的事件不进入候选 | 边界条件 |
| 9 | 触发后设置 activeEvent | 正常路径 |
| 10 | 触发后设置 eventCooldown | 正常路径 |
| 11 | 重大事件 deadline=0（无限等待） | 边界条件 |
| 12 | 非重大事件 deadline=60秒 | 正常路径 |

#### 5.3 选项处理（applyChoice）

| # | 用例 | 类型 |
|---|------|------|
| 13 | 即时效果立即应用 | 正常路径 |
| 14 | 持续效果注册到 ongoingEffects | 正常路径 |
| 15 | stardust_gain 增加星尘 | 正常路径 |
| 16 | stardust_loss 扣除星尘（不低于0） | 边界条件 |
| 17 | number_drain 扣除数字比例 | 正常路径 |
| 18 | number_drain 后不低于1 | 边界条件 |
| 19 | 无效选项索引回退到选项0 | 异常情况 |
| 20 | applyChoice 后清除 activeEvent | 正常路径 |

#### 5.4 持续效果管理

| # | 用例 | 类型 |
|---|------|------|
| 21 | cleanExpiredEffects 移除过期效果 | 正常路径 |
| 22 | expiresAt=0 的效果永久存在 | 边界条件 |
| 23 | recalcSpeedMultiplier 乘法叠加 speed_change | 正常路径 |
| 24 | recalcSpeedMultiplier 限制范围 [0.1, 5.0] | 边界条件 |
| 25 | getActiveEffects 返回剩余秒数 | 正常路径 |

#### 5.5 超时处理

| # | 用例 | 类型 |
|---|------|------|
| 26 | 活跃事件超时后自动选选项0 | 边界条件 |
| 27 | deadline=0 的事件永不超时 | 边界条件 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数
- 依赖 `EVENT_DEFS` 常量
- 注意：概率触发测试需要 mock `Math.random()`

---

## 6. AchievementSystem（成就系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P1** — 重要功能但不影响核心循环数值 |
| 复杂度 | **S** — 纯条件检测，无副作用 |
| 依赖关系 | 依赖 GameState（achievements Map）、Constants（ACHIEVEMENT_DEFS） |

### 关键测试用例清单

#### 6.1 初始化

| # | 用例 | 类型 |
|---|------|------|
| 1 | initAchievements 为所有定义创建未解锁状态 | 正常路径 |
| 2 | 已有状态不被覆盖 | 兼容性 |

#### 6.2 条件检测（各类型）

| # | 用例 | 类型 |
|---|------|------|
| 3 | number_reach 达到数字阈值时解锁 | 正常路径 |
| 4 | number_reach 未达到时不解锁 | 边界条件 |
| 5 | total_number_reach 累计数字达标时解锁 | 正常路径 |
| 6 | prestige_count 坍缩次数达标时解锁 | 正常路径 |
| 7 | expansion_count 膨胀次数达标时解锁 | 正常路径 |
| 8 | transcend_count 超越次数达标时解锁 | 正常路径 |
| 9 | click_count 点击次数达标时解锁 | 正常路径 |
| 10 | stardust_total 累计星尘达标时解锁 | 正常路径 |
| 11 | singularity_total 奇点数量达标时解锁 | 正常路径 |
| 12 | producer_level 指定生产者等级达标时解锁 | 正常路径 |
| 13 | producer_level 未指定 target 时不解锁 | 异常情况 |
| 14 | epoch_reach 到达指定纪元时解锁 | 正常路径 |
| 15 | epoch_reach 未到达时不解锁 | 边界条件 |

#### 6.3 状态管理

| # | 用例 | 类型 |
|---|------|------|
| 16 | 已解锁的成就不重复返回 | 正常路径 |
| 17 | checkAchievements 返回新解锁列表 | 正常路径 |
| 18 | 无新解锁时返回空数组 | 边界条件 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数
- 依赖 `ACHIEVEMENT_DEFS` 常量
- 依赖 `Decimal`（number_reach 条件需要 Decimal 比较）

---

## 7. TechTreeSystem（科技树系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P1** — 影响游戏进度解锁 |
| 复杂度 | **S** — 前置检查 + 购买 |
| 依赖关系 | 依赖 GameState（techTree Map）、Constants（TECH_TREE_DEFS） |

### 关键测试用例清单

#### 7.1 前置条件检查

| # | 用例 | 类型 |
|---|------|------|
| 1 | 无前置节点的节点可购买（requires 为空） | 正常路径 |
| 2 | 前置已解锁时可购买 | 正常路径 |
| 3 | 前置未解锁时不可购买 | 边界条件 |
| 4 | 星尘不足时不可购买 | 边界条件 |
| 5 | 已解锁节点不可再次购买 | 边界条件 |
| 6 | 不存在的节点ID不可购买 | 异常情况 |

#### 7.2 购买（buyNode）

| # | 用例 | 类型 |
|---|------|------|
| 7 | 购买成功后扣除星尘 | 正常路径 |
| 8 | 购买成功后标记为已解锁 | 正常路径 |
| 9 | unlock_producers 效果解锁 producer7-9 | 正常路径 |
| 10 | global_multiplier 效果不在此处理（由 MultiplierSystem 处理） | 边界条件 |
| 11 | unlock_expansion 效果仅标记解锁 | 正常路径 |

#### 7.3 查询方法

| # | 用例 | 类型 |
|---|------|------|
| 12 | getNodes 返回所有节点定义 | 正常路径 |
| 13 | getNode 存在的ID返回定义 | 正常路径 |
| 14 | getNode 不存在的ID返回undefined | 异常情况 |
| 15 | getAvailableNodes 返回当前可购买列表 | 正常路径 |
| 16 | getUnlockedNodes 返回已解锁列表 | 正常路径 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数（需扩展，初始化 techTree Map）
- 依赖 `TECH_TREE_DEFS` 常量
- 间接依赖 `MultiplierSystem`（global_multiplier 效果通过 MultiplierSystem 验证，但测试 TechTreeSystem 本身不需要）

---

## 8. TranscendSystem（超越系统）

### 基本信息

| 属性 | 值 |
|------|---|
| 优先级 | **P0** — 第三层 Prestige，重置逻辑复杂，高风险 |
| 复杂度 | **M** — 大量字段重置 + 保留逻辑 + 挑战/事件清理 |
| 依赖关系 | 依赖 GameState（所有字段）、Decimal |

### 关键测试用例清单

#### 8.1 canTranscend

| # | 用例 | 类型 |
|---|------|------|
| 1 | cumulativeDarkEnergy < 1000 不可超越 | 边界条件 |
| 2 | cumulativeDarkEnergy = 1000 可超越 | 边界条件 |
| 3 | cumulativeDarkEnergy > 1000 可超越 | 正常路径 |

#### 8.2 calculateSingularity

| # | 用例 | 类型 |
|---|------|------|
| 4 | cumulativeDE < 1000 返回0 | 边界条件 |
| 5 | cumulativeDE = 1000 返回 floor(log10(1000)*0.5) = 1 | 正常路径 |
| 6 | cumulativeDE = 10000 返回 floor(log10(10000)*0.5) = 2 | 正常路径 |
| 7 | cumulativeDE = 1e10 返回 floor(log10(1e10)*0.5) = 5 | 正常路径 |

#### 8.3 executeTranscend 重置逻辑

| # | 用例 | 类型 |
|---|------|------|
| 8 | 重置后 number 归零（无 meta_start） | 正常路径 |
| 9 | meta_start 升级生效：起始数字=10^level | 正常路径 |
| 10 | 重置后 totalNumber 归零 | 正常路径 |
| 11 | 重置后 stardust 归零 | 正常路径 |
| 12 | 重置后 darkEnergy 归零 | 正常路径 |
| 13 | 重置后 cumulativeDarkEnergy 归零 | 正常路径 |
| 14 | 重置后 prestigeCount 归零 | 正常路径 |
| 15 | 重置后 expansionCount 归零 | 正常路径 |
| 16 | 重置后 singularity 增加（原值+新获得） | 正常路径 |
| 17 | 重置后 transcendCount+1 | 正常路径 |
| 18 | 重置后保留 transcendUpgrades | 正常路径 |
| 19 | 重置后保留 techTree | 正常路径 |
| 20 | 重置后保留 unlockedProducers | 正常路径 |
| 21 | 重置后所有 producers level 归0 | 正常路径 |
| 22 | 重置后所有 upgrades level 归0 | 正常路径 |
| 23 | 重置后所有 stardustUpgrades level 归0 | 正常路径 |
| 24 | 重置后所有 expansionUpgrades level 归0 | 正常路径 |
| 25 | 重置后 currentEpoch 回归 'sprout' | 正常路径 |
| 26 | 重置后保留 totalClicks | 正常路径 |
| 27 | 重置后保留 totalManualEarnings | 正常路径 |

#### 8.4 挑战与事件重置

| # | 用例 | 类型 |
|---|------|------|
| 28 | 重置后 daily 挑战保留 progress 但 completed=false | 正常路径 |
| 29 | 重置后 timed 挑战丢失 | 正常路径 |
| 30 | 重置后 milestone 挑战丢失 | 正常路径 |
| 31 | 重置后 completedMilestones 清空 | 正常路径 |
| 32 | 重置后 lastTimedChallengeTime=0 | 正常路径 |
| 33 | 重置后 activeEvent=null | 正常路径 |
| 34 | 重置后 ongoingEffects=[] | 正常路径 |
| 35 | 重置后 timeSpeedMultiplier=1 | 正常路径 |

#### 8.5 因子重置

| # | 用例 | 类型 |
|---|------|------|
| 36 | 重置后 lastMagnitude=-1 | 正常路径 |
| 37 | 重置后 factors Map 为空 | 正常路径 |

### 与现有测试的依赖关系

- 依赖 `createTestState()` 工厂函数（需扩展，初始化 transcendUpgrades、challenges 等所有相关字段）
- 参考现有 `PrestigeSystem.test.ts` 的测试模式
- 依赖 `TRANSCEND_UPGRADE_DEFS` 常量（验证 meta_start 效果）

---

## 9. 测试优先级汇总

| 顺序 | 系统 | 优先级 | 复杂度 | 预计用例数 | 理由 |
|:---:|------|:---:|:---:|:---:|------|
| 1 | **TranscendSystem** | P0 | M | 37 | 第三层 Prestige 重置逻辑最复杂，涉及大量字段保留/重置，回归风险最高 |
| 2 | **DimensionSystem** | P0 | L | 44 | v2.0 核心系统，含已知 bug，5 种维度类型各需独立测试 |
| 3 | **EntropySystem** | P0 | M | 41 | v2.0 核心系统，崩溃逻辑影响产出惩罚 |
| 4 | **FactorSystem** | P0 | M | 34 | 影响核心循环数值，10 种数学检测器需逐个验证 |
| 5 | **ChallengeSystem** | P1 | M | 31 | 三类挑战逻辑，但不影响核心循环数值 |
| 6 | **EventSystem** | P1 | M | 27 | 概率触发测试需 mock random，持续效果管理复杂 |
| 7 | **AchievementSystem** | P1 | S | 18 | 纯条件检测，复杂度低 |
| 8 | **TechTreeSystem** | P1 | S | 16 | 前置检查 + 购买，逻辑简单 |

### 补充说明

1. **Serializer 缺口测试**：虽然不在原始 8 个系统中，但 Serializer 缺失 v2.0 字段是 P0 阻塞问题，建议新增 `Serializer.test.ts` 作为第一优先级补全。

2. **概率测试策略**：EventSystem 的概率触发和 FactorSystem 的随机性需要 mock `Math.random()`。建议使用 Vitest 的 `vi.spyOn(Math, 'random')` 或依赖注入方式。

3. **Decimal 使用注意**：所有测试中 Decimal 不能用 `+-*/` 运算符，必须使用 `.add()/.sub()/.mul()/.div()` 方法。比较时用 `.lt()/.gte()/.eq()` 而非 `</>=/===`。

4. **createTestState() 扩展**：现有工厂函数只初始化了 producers/upgrades/stardustUpgrades。需要为每个系统扩展对应的字段初始化。建议创建通用的 `createFullTestState()` 函数，初始化所有系统字段。
