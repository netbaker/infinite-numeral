# 晶体商店收口打磨规格（Crystal Shop Polish · Sprint 6 Must ①）

> **性质**：验证 + 轻量打磨规格（非从零设计）
> **优先级**：Sprint 6 Must ①
> **设计日期**：2026-07-25
> **配套**：`../plan.md` §1（规划校正：商店已完整在线）、§5 #5（S6 冻结商店上限 +85%）
> **红线遵循**：S6 **不再新增任何乘区商品**（上限 +85% 冻结）；本项不新增系统、不新增乘源、不发放印记。

---

## 0. 执行摘要（验证驱动）

经代码核实，**晶体商店全链路已 live**，UI 已覆盖余额/成本/已购态/不足禁用（见 §1）。但发现 **1 个 P0 持久化缺陷**（见 §1 第 6 项）：三套重置系统（`executePrestige`/`executeExpansion`/`executeTranscend`）均以 `new GameState()` 重建状态并**白名单拷贝字段**，**未**拷贝 `dimensionCrystals` 与 `purchasedCrystalUpgrades`，导致"永久 +X% 全局"加成在任意一次坍缩/膨胀/超越后**静默丢失**。

其余打磨项（§2/§3）均为低风险边角 UX 增强，不改变机制、不新增乘源、不触碰印记。

---

## ① 现状核实清单（Verification Checklist）

| # | 核查项 | 锚点（已核实行号） | 结论 |
|---|---------|----------------------|------|
| 1 | 商品定义存在（3 项，+10/25/50%） | `Constants.ts:1848` `DIMENSION_CRYSTAL_SHOP` | ✅ 合计成本 95、最高 value=0.85 → **+85% 永久全局** |
| 2 | 面板含晶体商店区 + 余额展示 | `DimensionPanel.vue:8-12`（💎 `store.dimensionCrystals`）、`:135-157` | ✅ 顶栏已显示晶体余额 |
| 3 | 成本展示 | `DimensionPanel.vue:154`（`💎 {{ item.cost }}`） | ✅ |
| 4 | 已购态标识 | `DimensionPanel.vue:142`（`shop-item--owned`）、`:153`（"已拥有"） | ✅ |
| 5 | 晶体不足禁用 | `DimensionPanel.vue:150,258-262`（`canBuyCrystal` 基于 `purchasedCrystalUpgrades.has` + `dimensionCrystals.gte(cost)`） | ✅ |
| 6 | 购买全链路 | `DimensionPanel.vue:210,294` `@buy-crystal` → `App.vue:141` → `gameStore.buyCrystalUpgrade`（`gameStore.ts:1484`）→ `dimensionSystem.buyCrystalUpgrade`（`DimensionSystem.ts:487-495`，扣晶体 + 写 Set）→ `multiplierSystem.recalculateFromState` 注册 `crystal` 源（`MultiplierSystem.ts:292-301`，`source:'crystal'`、`value:1+item.value`）→ toast + `bumpVersion`（`gameStore.ts:1487-1491`） | ✅ 数据层 live |
| 7 | 序列化往返 | `Serializer.ts:41,45`（crystals→string、upgrades→Array.from）、`:173,177`（`?? []` / `new Decimal(0)` 兜底）、`save.ts:125,133`、`game.ts:1045,1056` | ✅ 存档往返正常（有 `?? []` 兜底） |
| 8 | 底栏晶体角标 | `BottomBar.vue:60,150-152` | ✅ |
| **9** | **重置后保留（P0 缺陷）** | `PrestigeSystem.ts:65`（白名单拷贝 `:68-79`，**无** `dimensionCrystals`/`purchasedCrystalUpgrades`）、`ExpansionSystem.ts:66`、`TranscendSystem.ts:58`；三系统 grep 均**零提及**这两个字段 | ⚠️ **缺陷**：重置后 `new GameState()` 默认 `crystals=0`、`purchasedCrystalUpgrades=∅` → `recalculateFromState` 读空 Set，+85% 加成静默消失 |

> 第 9 项即 plan.md §1 所述"数据层 live"之外的**隐藏正确性缺口**：购买动作本身可用且持久化（盘点 7），但**重置清零**使"永久"承诺失效。本规格将其列为 **P0 必改**。

---

## ② 待补 / 打磨 UI 项（轻量，均读多写少）

> 规划原"待补 UI 项（余额/成本/已购态）"经核实**均已在线**（见 §1 之 2–5）。故本节为真实剩余的增强项，不重复造轮。

1. **商店区累计进度行（读-only）**
   在 `DimensionPanel.vue` 晶体商店标题下追加一行：`已购 {{n}}/3 · 当前 +{{pct}}% 全局`，其中 `n = purchasedCrystalUpgrades.size`，`pct = Σ_{已购 item} value × 100`。让玩家看见 build 进度（SDT 胜任感），不写任何状态。
2. **商店区就近余额**
   面板可滚动时，顶栏余额（§1-2）与商店区视觉脱钩。在商店标题旁追加一个小余额：`💎 {{ store.dimensionCrystals }}`（读 `store.gameState.dimensionCrystals`）。纯展示。
3. **不足态 hover 提示**
   当前不足时按钮仅置灰（§1-5）。增加 `title` 提示："晶体不足，还需 {{ item.cost - crystals }} 💎"，提升可访问性与反馈。
4. **"已购满"空态**
   当 `purchasedCrystalUpgrades.size === 3` 时，将整块商店区替换为只读卡：`✅ 维度共鸣已全部激活（永久 +85% 全局）`，取代三个灰按钮（避免"满级后仍可点"的歧义）。
5. **购买成功 toast 含商品名（核对）**
   `gameStore.ts:1489` 当前 toast 为通用"已购买维度增益"。建议改为 `💎 已激活《{{item.name}}》，永久 +{{item.value*100}}% 全局！`，与 `DIMENSION_CRYSTAL_SHOP[name/value]` 对齐。

---

## ③ 边角 UX 规则（Edge-Case Rules）

1. **旧存档无 `purchasedCrystalUpgrades`**：`Serializer.ts:177` 已 `?? []` 兜底；`MultiplierSystem.ts:293` 遍历空 Set 不注册 → 无加成、不崩。✅ 无需改动。
2. **恰好够买**：`DimensionSystem.ts:491` 用 `.lt(cost)` 拒绝、`DimensionPanel.vue:261` 用 `.gte(cost)` 放行，二者一致（门槛 = 临界值可买）。✅
3. **整数成本 vs Decimal 余额**：`cost` 为整数、`dimensionCrystals` 为 `Decimal`，`.gte` 精确比较无精度损失。✅
4. **一次性购买防重**：`DimensionSystem.ts:490` 已购返回 `false`；UI 同步 `:disabled`（`:260`）。Vue `@click` 同步调用，无竞态。✅
5. **【P0 必改】重置保留**：在 `PrestigeSystem.ts` / `ExpansionSystem.ts` / `TranscendSystem.ts` 的 `newState` 白名单拷贝段，各追加两行（对齐 `PrestigeSystem.ts:78` `newState.numeralImprints = state.numeralImprints;`）：
   ```typescript
   newState.dimensionCrystals        = state.dimensionCrystals;        // 未消耗余额保留
   newState.purchasedCrystalUpgrades = new Set(state.purchasedCrystalUpgrades); // 永久购买记录保留
   ```
   **理由**：shop 是"永久全局加成"型消费出口，重置清零即违背承诺；且与 `numeralImprints`/`persona`/`geneChain` 等 meta 字段的保留策略一致。修复后 `recalculateFromState` 在重置链路末端仍读到非空 Set，+85% 持续生效。
6. **商店冻结（plan §5 #5）**：S6 **不新增任何 `DIMENSION_CRYSTAL_SHOP` 条目**；上限锁 +85%。建议在 `Constants.ts` 附近补派生常量 `export const CRYSTAL_SHOP_MAX_BONUS = DIMENSION_CRYSTAL_SHOP.reduce((s,i)=>s+i.value,0); // = 0.85`，供 UI/校验引用，避免魔法数。
7. **可访问性**：禁用按钮须 `aria-disabled` 且可聚焦但 inert（不触发点击）；已购态与可购态对比度达标；不靠纯颜色区分（加"已拥有"文字，已有）。

---

## ④ 验收标准（Acceptance）

1. **全链路 live**：购买 → 扣晶体 → 写 Set → `crystal` 源注册 → 全局产出 ×(1+value) 生效 → toast 出现。手动/单测可复现（`__tests__/Sprint0.test.ts:50,63,70,178` 已覆盖序列化段，可沿用）。
2. **【P0】重置保留**：新增/扩展回归测试，断言 `executePrestige` / `executeExpansion` / `executeTranscend` 后 `state.purchasedCrystalUpgrades` 与 `state.dimensionCrystals` 与重置前一致，且 `MultiplierSystem` 仍注册 3 条 `crystal` 源、全局倍率含 +85%。
3. **累计进度行数值正确**：`n/3` 与 `+pct%` 与实际已购项吻合。
4. **旧存档加载不崩**：缺 `purchasedCrystalUpgrades` 时 `?? []` 兜底。
5. **红线不动**：
   - grep `DIMENSION_CRYSTAL_SHOP` 长度 === 3（无新增商品）；
   - grep 确认本规格**未**引入新 `MultiplierSource` 枚举值、未触碰 `grantNumeralImprint`；
   - `CRYSTAL_SHOP_MAX_BONUS === 0.85`（冻结验证）。
6. **已购满空态**：3/3 时显示只读卡，无灰按钮残留。

---

*规格结束。核心交付：§1 验证全绿（除 P0），§3-5 为 P0 修复 + 轻量边角打磨；全程零新系统 / 零新乘源 / 零印记 / 商店上限 +85% 冻结。*
