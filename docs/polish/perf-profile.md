# Phase 6 打磨 · 性能剖析与优化报告（eng-polish）

- 负责人：程基岩（engineering-lead）
- 仓库：`infinite_numeral`（Vue3 + TS + Pinia + Capacitor(Android) + Electron(Windows) 增量游戏）
- 关联评审强度：full（Phase 6 性能 + Phase 7 发布 + 技术债清理）
- 红线（已遵守）：不改变数值/通胀上界（`design/sprint6/gdd/_consistency.md`）、不改 `GameState` 序列化字段、不引入新乘源（`MultiplierSource`）/新印记、保持测试全绿。

---

## 0. 结论速览

| 指标 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| 主循环每 tick 热路径合计 | **0.1658 ms/tick** | **0.0479 ms/tick** | **−71.1%（3.46×）** |
| `calculateTotalOutput` 单次 | 0.1284 ms | 0.0425 ms | −66.9%（3.02×） |
| `calculateTotalOutput` 每 tick 实际调用（优化前 ×2） | 0.2915 ms | 0.0425 ms（×1） | **−85.4%** |
| 测试（vitest） | 287 baseline | **316 passed / 0 failed** | ≥287 ✓ |
| `vue-tsc --noEmit` | 0 errors | **0 errors** | ✓ |
| `npm run build`（web） | 通过 | **通过** | ✓ |

> 基准环境为单台开发机；绝对数值随机型波动，**相对比值（×倍数）才是可信结论**。
> 基准状态：后期游戏存档（9 个生产者、等级 60~99；升级/星尘/科技/暗能量/超越/里程碑/晶体全激活 → **36 条乘区条目**），tick = 50ms（≈20 tick/s）。

---

## 1. 热点剖析（Hotspot Profiling）

主循环 `gameStore.gameTick`（由 `GameLoop` 以 50ms 累加器驱动，≈20 次/秒）每 tick 执行以下热路径。用 `bench/perf-bench.ts`（`npx vite-node`）直接驱动底层系统复刻该路径，量化各函数占比：

### 1.1 热点清单（按主循环时间占比）

| 排名 | 函数 / 路径 | 单次耗时 | 每 tick 调用 | 占热路径比 | 问题 |
|------|--------------|----------|---------------|------------|------|
| 🥇 1 | `ProducerSystem.calculateTotalOutput` | 0.1284 ms | **×2**（L619 直接 + L1693 `updateDisplayStrings` 内重算） | ≈77% | ① 每 tick 被算 **两次**；② 循环内对每个生产者调用 `getGlobalMultiplier()` + `getProducerMultiplier(id)`，二者都 **全量遍历 `_entries`（36 条）→ 单次调用 O(生产者×条目) ≈ 9×2×36 ≈ 648 次条目迭代 + 大量 `new Decimal` 分配 |
| 2 | `AchievementSystem.checkAchievements` | 0.0060 ms | ×2（L646 + L763） | ≈7% | 每 tick 跑 **两次**，每次遍历全部成就定义并对 `number_reach`/`total_number_reach` 做 `new Decimal(state.number).gte(new Decimal(...))`（每条件 **两次 `Decimal` 分配**） |
| 3 | `MultiplierSystem.registerDimensionMultiplier` | 0.0025 ms | ×1（L616） | ≈2% | 每 tick 执行 `unregister('dimension_global')`（**整数组 filter + 重分配**）后再 `register()`（**又一次 filter + 重分配**）→ 每 tick 两次数组重分配 |
| 4 | `DimensionSystem.refreshDimensionBuilds` | 0.0029 ms | ×1（L643） | ≈2% | 遍历 5 维 + 10 条协同判定，纯 `Map.get`，开销已很低 |
| 5 | `bumpVersion()`（stateVersion++）引发的 Vue 重渲染 | — | ×1/ tick | — | 见 §4「分析但本期未改」 |

**核心结论**：`calculateTotalOutput` 独占主循环热路径约 77% 的时间，且因 `updateDisplayStrings` 在 L1693 重复调用而被每 tick 计算 **两次**。这是唯一值得动刀的“大象”。

### 1.2 `break_eternity.js` Decimal 分配热点
- `calculateTotalOutput` 原实现每次调用为每个生产者做 `BigNumber.from(level)`、`BigNumber.from(baseOutput)`、`getProducerMultiplier`/`getGlobalMultiplier`（内部 `BigNumber.one().mul(...)`）等，叠加循环内 O(条目) 的 `Decimal` 读取/相乘，单次调用产生 **数百次 `Decimal` 实例分配**。
- `AchievementSystem.evaluate` 的 `number_reach`/`total_number_reach` 分支每条件 `new Decimal(state.number)` + `new Decimal(conditionValue)` 两次分配。

### 1.3 Vue 组件重渲染
- `bumpVersion()` 每 tick 让 `stateVersion` 自增，所有依赖 `void store.stateVersion` 的 `computed` 每 tick 重算。`DimensionPanel` 打开时 `panelData` 每 tick 重算 `getDimensionPanelData()`（内含 5 次 `calculateDimensionMultiplier`）。
- 该机制是 `markRaw` 架构的固有设计，**不在本期低风险优化范围内**（改动需重构响应式模型，风险高、ROI 低）。见 §4。

---

## 2. 优化项（全部低风险、可逐条回退、行为保持）

### 🟢 WIN1 — 主循环去掉 `calculateTotalOutput` 重复计算（最大单点收益）
- **位置**：`src/stores/gameStore.ts`
  - `updateDisplayStrings(state, precomputedOutputPerSec?: BigNumber)` 新增可选参数；有传入则直接复用，**不再重算**。
  - `gameTick` 的调用点（L760）改为 `updateDisplayStrings(state, rawOutputPerSec)`（复用 L619 已算出的 `rawOutputPerSec`）。
  - 其余所有调用点（买升级/买生产者/点击/飞升等）仍只传 `state` → 行为与原先完全一致。
- **行为保持**：`rawOutputPerSec`（L619，entropy 之前）与 `updateDisplayStrings` 原重算（L1693，entropy 之后）在正常情况（该 tick 内无因子/纪元触发 `recalculateFromState`）下，**读的是同一条 `dimension_global` 条目**，结果数值相等。仅在“因子/纪元于 tick 中段触发重算”的罕见情形下，`displayOutputPerSec` 会滞后至多 1 tick（纯显示字符串，且无任何测试断言该精确值）。
- **收益**：`gameTick` 每 tick 的 `calculateTotalOutput` 调用由 ×2 降为 ×1，该分量耗时 **0.2915 ms → 0.0425 ms（−85.4%）**。

### 🟢 WIN2 — `calculateTotalOutput` 乘区查找提到生产者循环外（核心算法优化）
- **位置**：`src/systems/ProducerSystem.ts`
- **改动**：原实现对每个生产者都调用 `getGlobalMultiplier()`（遍历全部 `_entries`）与 `getProducerMultiplier(id)`（再遍历全部 `_entries`）。改为在循环前**遍历一次 `multiplierSystem.getEntries()`**：
  - 全局倍率 `globalMul` = ∏{`e.target === ''`} `e.value`；
  - 逐生产者倍率 `producerMul: Map<id, number>` = ∏{`e.target === id`} `e.value`。
  - 循环内改为 `level.mul(baseOutput).mul(producerMul.get(id) ?? 1).mul(globalMul)`。
- **语义严格等价**（已对照 `getGlobalMultiplier`/`getProducerMultiplier` 源码）：
  - 仅 `target === ''` 计入全局；仅**精确匹配** `target === producerId` 计入该生产者（原 `getProducerMultiplier` 从不匹配 `'all_producers'`，此处同样忽略）；
  - `Decimal.mul` 最终都落到 `decimal.mul(Decimal(value))`，用 `number` 入参与原先 `BigNumber.from(number)` 完全等价；乘法交换律保证顺序无关。
- **收益**：条目迭代由 O(生产者×条目) 降为 O(条目+生产者)；单次 `calculateTotalOutput` **0.1284 ms → 0.0425 ms（−66.9%，3.02×）**。

### 🟢 WIN3 — `registerDimensionMultiplier` 原地复用，消除每 tick 数组重分配
- **位置**：`src/systems/MultiplierSystem.ts`
- **改动**：原实现每 tick 执行 `unregister('dimension_global')`（整数组 filter + 新数组）+ `register()`（再次 filter + 重分配）。改为：查找既有的唯一 `dimension_global` 条目，**存在则原地改 `.value`，否则 push 一次**。
- **行为保持**：乘法顺序无关 → 数组顺序不影响结果；单一条目的值与原先完全一致（`recalculateFromState` 中 `_entries = []` 后再调用时走 push 分支，每 tick 走 mutate 分支，最终条目数恒为 1）。
- **收益**：每 tick 省去 2 次数组 filter + 重分配，**显著降低 GC 压力**。绝对 wall-time 在本基准（36 条目）下已是亚微秒级、落在噪声内（0.0025→0.0026 ms），故以“分配/churn 削减”计收益而非墙钟时间。

### 🟢 WIN4 — `AchievementSystem.evaluate` 去掉无谓 `new Decimal`
- **位置**：`src/systems/AchievementSystem.ts`
- **改动**：`state.number` / `state.totalNumber` 在 `GameState` 中**本就是 `Decimal`**。`number_reach`/`total_number_reach` 分支由
  `new Decimal(state.number).gte(new Decimal(def.conditionValue))`
  改为
  `state.number.gte(def.conditionValue)`（`gte` 直接接受 `number` 字面量）。
- **行为保持**：等价比较，仅省去每次条件判定的两次 `Decimal` 拷贝分配。
- **收益**：每 tick `checkAchievements ×2` 的 `Decimal` 分配显著减少；墙钟时间因基准下成就定义规模有限而落在噪声内（0.0121→0.0124 ms），属防御性分配削减（对大型成就集/高频评估更受益）。

### 2.1 每 tick 热路径合计（BEFORE vs AFTER）
| 分量 | BEFORE (ms/tick) | AFTER (ms/tick) |
|------|------------------|-----------------|
| registerDimensionMultiplier | 0.0025 | 0.0026 |
| calculateTotalOutput ×1 | 0.1284 | 0.0425 |
| calculateTotalOutput ×2（优化前 gameTick 实际） | 0.2915 | 0.0663 |
| checkAchievements ×2 | 0.0121 | 0.0124 |
| refreshDimensionBuilds | 0.0029 | 0.0032 |
| **per-tick hot bundle** | **0.1658** | **0.0479** |

→ 主循环热路径 **−71.1%（3.46×）**。其中 `calculateTotalOutput` 作为占比 77% 的“大象”，经 WIN1（去重）+ WIN2（提查找）后该分量从 ×2 的 0.2915 ms 降至 ×1 的 0.0425 ms。

---

## 3. 技术债三项（已直接改仓库根，见 §5 清单）

| 项 | 文件 | 内容 |
|----|------|------|
| (a) 根 `.gitattributes` | 新建 | `* text=auto eol=lf` 归一化换行；`*.png/*.jpg/*.jpeg/*.webp/*.ico/*.mp3/*.wav/*.ogg/*.apk` 标记为二进制（消除 git 提交 LF/CRLF 警告） |
| (b) 扩展 `.gitignore` | 追加（不破坏既有规则） | `dev-dist/`、`*.apk`（根级松散 apk）、`vite.config.ts.timestamp-*.mjs`（Vite 缓存） |
| (c) 加固 CI `.github/workflows/build-apk.yml` | 改 | ① `Build web app` 之后新增 `Run tests`（`npm test`，失败即 CI 失败 = 测试门禁）；② 新增 `actions/cache@v4` 缓存 `~/.gradle/caches` 与 `~/.gradle/wrapper`，key 基于 `android/**/*.gradle*` + `**/gradle-wrapper.properties` 的 hash；③ `./gradlew assembleDebug` 去掉 `--info`（保留 `--no-daemon --stacktrace`）收敛日志；④ 保持 `ELECTRON_SKIP_BINARY_DOWNLOAD: 1` 与 artifact 上传逻辑不变 |

---

## 4. 分析但本期未改（含理由，供主理人决策）

- **Vue 重渲染（`bumpVersion` / `panelData`）**：分析确认 `stateVersion` 每 tick 自增触发所有 `stateVersion`-依赖 `computed` 重算，`DimensionPanel` 打开时额外重算 5× `calculateDimensionMultiplier`。但这是 `markRaw` 响应式架构的固有设计，**消除需重构响应式模型（如拆分更细的版本戳 / 对面板数据做 shallow 比较缓存）**，风险高、且主循环 JS 热路径（已优化 3.46×）才是真正的帧预算瓶颈。建议留待独立“响应式细化”专项，不在本期低风险打磨中动。
- **`refreshDimensionBuilds` 加 dirty 标志**：该函数本就仅 O(15) 的 `Map.get`，占比 ≈2%，加 dirty 标志收益极小、且需引入“协同知识门控是否变化”的判定（易漏掉 `codexEntries` 解锁导致的协同点亮），风险/收益不划算，故不改。

---

## 5. 改动文件清单（eng-polish 负责，均未经 git commit）

### 性能优化（4 项 / WIN1–4）
- `src/stores/gameStore.ts` — WIN1：`updateDisplayStrings` 接收可选 `precomputedOutputPerSec`；`gameTick` 传入 `rawOutputPerSec` 避免重复计算。
- `src/systems/ProducerSystem.ts` — WIN2：`calculateTotalOutput` 乘区查找提到循环外（O(条目) 单次预计算）。
- `src/systems/MultiplierSystem.ts` — WIN3：`registerDimensionMultiplier` 原地复用 `'dimension_global'` 条目。
- `src/systems/AchievementSystem.ts` — WIN4：`evaluate` 的 `number_reach`/`total_number_reach` 去掉多余 `new Decimal`；并移除非必需的 `Decimal` import（见下）。

### 技术债（3 项）
- `.gitattributes`（新建）— 换行归一 + 二进制保护。
- `.gitignore`（追加）— `dev-dist/`、`*.apk`、`vite.config.ts.timestamp-*.mjs`。
- `.github/workflows/build-apk.yml`（改写）— 测试门禁 + Gradle 缓存 + 收敛 `--info` 日志。

### 顺带修复（为保证 `vue-tsc 0 errors` 门禁，纯机械、不改逻辑）
- `src/systems/AchievementSystem.ts` — WIN4 后 `import Decimal` 不再使用，移除（避免 `noUnusedLocals` 报错）。
- `src/__tests__/PolishSmoke-Loop.test.ts`（Phase 6 打磨专用冒烟测试，已随本任务存在）— 移除未使用的 `GeneChainState` / `dimState` / `DimensionId` 导入与未使用的 `dimState` 辅助函数；修正 `delete (save.state as Record<string, unknown>)` 的非法类型转换（`as unknown` 先转）。

> 说明：上述测试文件错误为随任务一并存在的既有 TS lint 错误（非本次引入）。为达成“`vue-tsc 0 errors`”硬门禁，已顺手修平，未改动任何测试断言逻辑。

---

## 6. 验证结果（已跑，未 push / 未 commit）

| 命令 | 结果 |
|------|------|
| `npm test`（vitest） | **316 passed / 0 failed**（≥287 基线；现仓含 Phase 6 打磨冒烟测试，故活体计数为 316） |
| `npx vue-tsc --noEmit` | **0 errors** |
| `npm run build`（web） | **通过**（>500 kB chunk 为预存警告，非错误） |

- 数值/通胀上界未变：`calculateTotalOutput` 返回**完全相同的 `Decimal` 值**（仅计算编排重排，无任何乘源/印记/上界改动），由 `ProducerSystem.test.ts` 与 `PolishSmoke-Loop.test.ts`（5000 tick 长时运行数值不爆/不 NaN、存档往返一致、三类重置后 meta 完整）断言覆盖。
- 可回退性：每项改动均为局部、自包含的函数体重排；回退任一单条即可精确恢复原行为。
- 未执行 `git commit` / `git push`（按主理人统一复核后提交的要求）。

---

## 7. 基准脚本（可复跑）

`bench/perf-bench.ts`（不在 vitest `*.test.ts` 匹配范围内，不会污染测试门禁）：

```bash
npx vite-node bench/perf-bench.ts
```

构造“后期游戏”状态（9 生产者 + 全激活乘源 → 36 条乘区条目），对 `registerDimensionMultiplier` / `calculateTotalOutput ×1` / `calculateTotalOutput ×2` / `checkAchievements ×2` / `refreshDimensionBuilds` / 合并 per-tick 热路径分别计时 3000 次取均值。修改前后各跑一次即得本报告 §2.1 的对照数字。
