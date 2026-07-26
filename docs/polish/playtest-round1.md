# Phase 6 打磨 · Playtest 第 1 轮（R1）— 核心循环 & 重置曲线稳定性

- **QA 负责人**：严守真（qa-polish）
- **评审强度**：full（每轮明确 PASS / CONCERNS / FAIL）
- **范围**：核心主循环长时运行数值不爆/不 NaN、存档存读往返一致性、三类重置（Prestige / Expansion / Transcend）后 meta 字段完整
- **判定**：**✅ PASS**（无 P0 / 无 P1 阻塞项；GDD 历史 P0「晶体商店重置丢失」经确认已在 sprint6b 修复）

---

## 1. 目标与场景（Focus & Scenario）

| 场景 | 验证目标 | 风险来源 |
|------|----------|----------|
| 主循环长时运行 | 5000+ tick 内 `number`/`totalNumber` 始终有限、严格递增，乘区条目无 NaN/Infinity | 极限量级下 Decimal 溢出、奇点临界爆发分支 |
| 存档存读往返 | `serialize → deserialize` 后关键字段逐字节一致；旧存档缺派生缓存字段可安全重算 | Serializer 版本演进（CURRENT_VERSION=4）、派生缓存 `activeMasteryEffects`/`activeSynergies` |
| 三类重置曲线 | Prestige / Expansion / Transcend 各自正确保留/重置 meta 与维度资源；重置后续跑仍稳定 | 红线：晶体字段、精通（S5 保留 25%）、master 跨重置语义 |

**本轮重点红线**：GDD `crystal-shop-polish.md` §0 #9 曾列 P0「晶体商店购买在重置后丢失」——本轮用 `Sprint6b.test.ts` + 新增 `PolishSmoke-Loop` 三重交叉验证该缺陷**已修复**。

---

## 2. 方法（Method）

### 2.1 复用的既有测试（回归基线）
- `src/__tests__/ProducerSystem.test.ts`（15）— 产出计算语义
- `src/__tests__/MultiplierSystem.test.ts`（17）— 乘区折叠/单源
- `src/__tests__/PrestigeSystem.test.ts`（17）— 飞升重置语义
- `src/__tests__/Sprint6b.test.ts`（19）— **晶体商店跨三类重置保留**（验证 §0 #9 P0 已修）
- `src/__tests__/BigNumber.test.ts`（20）— Decimal 边界/有限性

### 2.2 新增专项冒烟（`src/__tests__/PolishSmoke-Loop.test.ts`，10 例，全部通过）
直接驱动底层系统，复刻 `gameStore.gameTick` 的产出累积与维度倍率接入（`registerDimensionMultiplier` → `calculateTotalOutput` → `tickMastery` → `refreshDimensionBuilds` → number 自增），不修改任何游戏逻辑。

| 测试 ID | 断言内容 | 结果 |
|---------|----------|------|
| R1-A-1 | 5000 tick：number/totalNumber 有限 & 严格递增；乘区条目无 NaN/Infinity | ✅ |
| R1-A-2 | 混沌维度(dim2) 300 tick 随机倍率长时运行有限 | ✅ |
| R1-A-3 | 极端量级 `10^1e6` / `10^(1e100)` 下 `calculateDimensionMultiplier` 有限（含奇点临界爆发分支） | ✅ |
| R1-B-1 | rich state 序列化→反序列化：number/crystals/imprints/persona/achievements/codex/upgrades 一致；派生缓存重算正确 | ✅ |
| R1-B-2 | 旧存档缺 `activeMasteryEffects`/`activeSynergies` → 反序列化不崩，按 `dimensionStates` 重算 | ✅ |
| R1-C-1 | `executePrestige` 保留全部 meta + 重置 producer/维度资源 + 按 S5 保留基础维度 25% master | ✅ |
| R1-C-2 | `executePrestige`（无 S5）所有维度 master 清零 | ✅ |
| R1-C-3 | `executeExpansion` master→0 但保留 unlocked 与全部 meta | ✅ |
| R1-C-4 | `executeTranscend` 完整保留 master 与 meta，奇点核心累加 | ✅ |
| R1-C-5 | 重置后续跑（Prestige→续跑 500 tick）：number 仍有限且递增 | ✅ |

---

## 3. 发现（Findings）

### 3.1 P0（阻塞发布）— 0 项
无。GDD §0 #9 历史 P0「晶体商店重置丢失」经 `Sprint6b.test.ts`（19 例）与 `PolishSmoke-Loop` R1-C 全绿，**确认已在 sprint6b 修复**，不在本轮阻塞清单。

### 3.2 P1（重要，建议修复）— 0 项
无功能性缺陷。

### 3.3 P2（观察 / 非阻塞）
| 编号 | 观察 | 说明 |
|------|------|------|
| P2-1 | 长时运行「不爆/不 NaN」断言以 `isFinite()` 为界 | `break_eternity.js` 的 Infinity 边界约在 `number > 10^(1e309)`，远超一切可达量级（R1-A-3 验证 `10^1e6`/`10^(1e100)` 均有限），断言安全 |
| P2-2 | 旧存档派生缓存重算路径有效 | R1-B-2 证明 Serializer 版本升级无需落盘派生字段即可恢复 `S1` 等协同，规避了脏缓存风险 |
| P2-3 | 冒烟 `simulateTick` 仅复刻维度倍率路径 | 真实 `gameTick` 还含熵/人格因子（在测试中简化为 1）。本轮聚焦 Phase-6 新增的维度/精通/协同/晶体面，属预期覆盖边界，非遗漏 |

### 3.4 红线符合性
- **单源红线**：维度倍率始终经单一 `dimension_global` 条目接入（`MultiplierSystem`），R2 将更严格断言（见 R2）。
- **晶体字段保留**：`PrestigeSystem.ts` L80-82、`ExpansionSystem.ts` L81-83、`TranscendSystem.ts` L75-77 三处均保留 `dimensionCrystals`/`purchasedCrystalUpgrades`。
- **S5 保留 25%**：`PrestigeSystem.ts` L200-213 重置 master 但保留基础维度 25%（R1-C-1 断言 `master=25`）。

---

## 4. 判定（Verdict）

### ✅ PASS

**阻塞清单（file:line + 复现）**：无。

**保留关注项（非阻塞）**：
- 长时运行有限性以 Decimal 边界为界，属设计预期（P2-1）。
- 旧存档重算路径已验证（P2-2）。

**结论**：核心循环与三类重置曲线在 Phase 6 下稳定、一致、meta 完整。可进入 R2（精通/协同/晶体商店）评估。
