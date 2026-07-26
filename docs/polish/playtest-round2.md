# Phase 6 打磨 · Playtest 第 2 轮（R2）— 维度精通 / 跨维度协同 / 晶体商店

- **QA 负责人**：严守真（qa-polish）
- **评审强度**：full
- **范围**：维度精通奖励实际化（乘区型 + 机制型）、跨维度协同增益（set-bonus）、晶体商店永久全局加成；并严格校验「**单维乘源红线**」——mastery/synergy/knowledge 不得向 `MultiplierSystem` 注入新 `MultiplierSource`
- **判定**：**✅ PASS**（无 P0 / 无 P1；单源红线经断言严格成立）

---

## 1. 目标与场景（Focus & Scenario）

| 场景 | 验证目标 | 红线 |
|------|----------|------|
| 晶体商店 | 购买扣费、幂等、三项永久全局加成合计 = 0.85（冻结上限） | 不新增 source |
| 精通奖励实际化 | `dim0_l5` 全局折叠、`dim1_l2` 质数×4、`dim0_l2` 成本折扣、`dim1_l3` 资源 +20% 均真实生效 | 折叠进既有 `dimension` 源 |
| 跨维度协同 | `S1` 反熵质数×3、`S2`/`S4` 组合点亮 | 协同全局乘区贡献恒为 0 |
| 单源红线 | 即便 10 条协同 + 3 条知识全激活，乘区 source 集合不含 `synergy`/`knowledge` | **硬红线** |

---

## 2. 方法（Method）

### 2.1 复用的既有测试
- `src/__tests__/MultiplierSystem.test.ts`（17）— 乘区注册/折叠/单源约束
- `src/__tests__/Sprint6.test.ts`（12）— 维度系统基础行为

### 2.2 新增专项冒烟（`src/__tests__/PolishSmoke-Mastery.test.ts`，10 例，全部通过）

| 测试 ID | 断言内容 | 结果 |
|---------|----------|------|
| R2-A-1 | `buyCrystalUpgrade` 扣晶体/写 Set/幂等（不重复扣费） | ✅ |
| R2-A-2 | 购满 3 项：注册 3 条 `crystal` 源，全局加成合计 = 0.85（冻结上限） | ✅ |
| R2-B-1 | `dim0_l5` 折叠进唯一 `dimension` 源：`dimension_global = 1.5 × 1.05 = 1.575`，`source==='dimension'`（零新 source） | ✅ |
| R2-B-2 | `dim1_l2` 质数倍率提升至 ×4（覆盖基础 ×3） | ✅ |
| R2-B-3 | `dim0_l2` 机制型：生产者成本折扣 +5%（计入 0.5 上限夹紧） | ✅ |
| R2-B-4 | `dim1_l3` 机制型：质核资源获取严格 ×1.20（对照剔除验证） | ✅ |
| R2-B-5 | 派生缓存幂等：`refreshDimensionBuilds` 连跑 5 次集合不变，`S1` 持续点亮 | ✅ |
| R2-C-1 | `S1` 反熵质数共鸣：dim1&dim3 ≥ L3 → 点亮，dim3 下质数倍率 ×3；非质数回落 | ✅ |
| R2-C-2 | `S2`（dim3&4）/`S4`（dim2&3）组合点亮 | ✅ |
| R2-C-3 | 协同全局乘区贡献恒为 0：10 条 perk 全激活也不注入新 source（source 集合无 `synergy`/`knowledge`） | ✅ |

---

## 3. 发现（Findings）

### 3.1 P0（阻塞发布）— 0 项
无。单源红线成立：`R2-B-1` 断言 `dim0_l5` 经既有 `dimension` 源折叠（`entry.source === 'dimension'`）；`R2-C-3` 断言即便 10 条协同 + 3 条知识全激活，`ms.getEntries()` 的 source 集合不含 `synergy`/`knowledge`。

### 3.2 P1（重要，建议修复）— 0 项
无功能性缺陷。

### 3.3 P2（观察 / 非阻塞）
| 编号 | 观察 | 说明 |
|------|------|------|
| P2-1 | `dim1_l3` 等资源型精通需先 `refreshDimensionBuilds` 才进入派生集合 | 测试侧需在 `tickDimensionResources` 前显式 `refreshDimensionBuilds`——这是**缓存重算的预期设计**（派生缓存惰性更新），非游戏 bug。`R2-B-4` 已用对照法剔除 master 差异，严格验证机制型 ×1.20 生效 |
| P2-2 | 晶体商店三项加成之和恰为 0.85 | 与 `DIMENSION_CRYSTAL_SHOP` 冻结上限一致，`R2-A-2` 断言 `(value-1)` 求和 = 0.85 |
| P2-3 | 协同为 set-bonus 机制层，不进入乘区 | 与 GDD「协同为机制增益、非乘源」一致，R2-C 全绿印证 |

### 3.4 红线符合性
- **单源红线**：✅ 严格成立（R2-B-1、R2-C-3）。mastery/synergy/knowledge 均不新增 `MultiplierSystem` 条目。
- **晶体冻结上限**：✅ 三项合计 +85%（R2-A-2）。
- **派生缓存幂等**：✅ 连跑 5 次集合稳定（R2-B-5）。

---

## 4. 判定（Verdict）

### ✅ PASS

**阻塞清单（file:line + 复现）**：无。

**保留关注项（非阻塞）**：
- `dim1_l3` 等资源型精通依赖 `refreshDimensionBuilds` 缓存重算（P2-1）——属预期设计，已在测试中显式处理；建议游戏内确保 `tickDimensionResources` 的调用上下文已在每 tick `gameTick` 中完成 `refreshDimensionBuilds`（R1 已覆盖 `gameTick` 路径 L643）。

**结论**：精通奖励、跨维度协同、晶体商店加成均真实生效且未突破单维乘源红线。可进入 R3（成就/Codex 联动 + 长时运行）。
