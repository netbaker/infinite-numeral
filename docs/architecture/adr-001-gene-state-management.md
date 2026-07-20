# ADR-001: 基因系统状态管理策略

> 状态：已决策
> 日期：2026-07-01
> 决策者：程基岩（engineering-lead）

## 背景

基因进化系统（GeneSystem）是 v2.0 的核心新系统之一。每次 Transcend 时，数字宇宙"留下基因"，这些基因在下一轮游戏中被继承并进化。

基因链有以下操作时机：
- **生成**：Transcend 时随机生成 2-3 条初始基因
- **突变**：Prestige 时有概率改变基因等级或类型
- **筛选**：Expansion 时可删除一条最弱基因
- **重组**：Transcend 时合并两条同类基因为升级版

核心问题是：**基因链应该在 GameState 中序列化存储，还是每次 Transcend 时根据种子动态生成？**

### 现有代码现状

- GameState 是一个 class，通过 `markRaw` 包裹避免 Vue 响应式代理
- 所有状态字段在 `Serializer.ts` 中手动序列化/反序列化
- Decimal 字段转为 string，Map/Set 转为 Record/Array
- 现有系统的运行时状态（如 FactorState、ChallengeState）都是在 GameState 中用 Map 存储，并在 Serializer 中手动处理

## 决策

**基因链采用序列化存储策略**：将完整的 `GeneChainState`（包含 chain 数组、maxSlots、GDD 统计字段、historicalMaxNumber[chain-level]）序列化存储在 GameState 中，随主存档一起保存和恢复。

突变操作使用**注入式随机种子**（seedable random），种子本身存储在 GeneState 中（见下方类型定义草案）。

## 类型定义草案（与 GDD 对齐）

> 以下类型定义草案为 ADR-001 的落地规范，与基因进化系统 GDD 及 §9 建议方向保持一致。GeneType 使用 GDD 带前缀命名（G1）；基因运行时状态由 GeneSlot 合并为 GeneState（G2）；expression 范围为 0-1（G3）；记忆基因使用 chain-level 的 historicalMaxNumber（G4，本 ADR 已决策，保持不变）；GeneDef 新增 baseEffect（G5）；效果公式见 G6；GeneChainState 合并 GDD 统计字段 + historicalMaxNumber（G7）。

```typescript
/** 基因类型（8类，带前缀命名，与 GDD 一致）— G1 */
export type GeneType =
  | 'gene_growth'      // 增殖基因
  | 'gene_catalyst'    // 催化基因
  | 'gene_resilience'  // 韧性基因
  | 'gene_resonance'   // 共振基因
  | 'gene_mutation'    // 突变基因
  | 'gene_memory'      // 记忆基因
  | 'gene_entangle'    // 纠缠基因
  | 'gene_exotic';     // 奇异基因

/** 基因静态定义 — G5：新增 baseEffect */
export interface GeneDef {
  id: GeneType;
  name: string;
  description: string;
  icon: string;
  effectType: 'output_multiplier' | 'factor_boost' | 'prestige_start'
            | 'event_boost' | 'random' | 'memory' | 'producer_synergy' | 'hidden';
  /** 基础效果数值（G5） */
  baseEffect: number;
  /** 每级效果数值 */
  effectPerLevel: number;
  maxLevel: number;
  initialLevelRange: [number, number];
  canBePruned: boolean;
}

/** 基因运行时状态（链上单条基因）— G2：GeneSlot 合并为 GeneState（GDD 8 字段 + mutationSeed） */
export interface GeneState {
  instanceId: string;          // 唯一实例 ID
  type: GeneType;              // 基因类型
  level: number;               // 当前等级 1-5
  expression: number;          // 表达强度（G3：范围 0-1）
  entangledProducers?: string[]; // 纠缠基因专属：绑定的生产者 ID 列表
  mutationSeed: number;        // 突变种子（注入式随机，确保确定性）
  memoryRecord?: number;       // 记忆基因专属：历史最高 log10 值
  obtainedAt: number;          // 获得时间戳 (ms)
  lastMutatedAt?: number;      // 上次突变时间戳 (ms)
}

/** 基因链整体状态 — G7：合并 GDD 统计字段 + chain-level historicalMaxNumber（G4） */
export interface GeneChainState {
  chain: GeneState[];          // 当前基因链（最多 8 槽）
  maxSlots: number;            // 当前最大槽位数
  expansionCount: number;      // 已扩容次数
  totalMutations: number;      // 累计突变次数
  totalRecombinations: number; // 累计重组次数
  totalPrunings: number;       // 累计筛选次数
  historicalMaxNumber: string; // chain-level 历史最高数字（Decimal string，序列化安全）— G4
}
```

**效果计算公式（G6）**：基因对 MultiplierSystem 的加成值为

```typescript
// value 注册到 MultiplierSystem（source: 'gene'）
const effectValue = geneDef.baseEffect + geneDef.effectPerLevel * (state.level - 1);
const finalMultiplier = 1 + effectValue * state.expression; // expression ∈ [0, 1]（G3）
```

即：**加成 = 1 + (baseEffect + effectPerLevel × (level − 1)) × expression**。expression 参与效果计算（与 §9 建议方向一致）。

## 理由

### 为什么不选动态生成？

1. **可测试性**：动态生成依赖不可控随机数，测试时无法断言确定结果。序列化存储 + 种子注入可以让测试可复现。

2. **玩家预期一致性**：基因链是玩家在多个 Run 中积累的核心资产，类似于"技能树"或"天赋"。如果每次 Transcend 后基因链可能完全不同（动态生成），玩家会失去对基因系统的掌控感。增量游戏的核心是"积累感"，基因链应该是可预期的资产。

3. **与现有架构一致**：FactorSystem、ChallengeSystem 等所有现有系统都采用"状态存储在 GameState Map 中 + Serializer 手动序列化"的模式。基因系统遵循同一模式可降低维护成本。

4. **回滚安全性**：如果基因链是动态生成的，当存档损坏或需要回滚时，基因链会重新生成导致玩家资产损失。序列化存储可以通过存档备份恢复。

### 为什么突变用种子注入？

突变基因（`mutation` 类型）每轮随机化效果。如果不存储种子，每次读档后突变效果会重新随机，导致玩家读档前后基因效果不一致。存储种子确保同一存档的突变效果确定。

## 后果

### 正面

- 基因链作为持久化资产，玩家可以策略性规划基因组合
- 测试可通过固定种子断言突变结果
- 与现有序列化模式一致，维护成本低
- 支持存档备份和回滚

### 负面

- GameState 体积增加（8 个 GeneState 对象，每个 ~100 bytes，总计 < 1KB，可接受）
- Serializer 需要新增 GeneChainState 的序列化/反序列化逻辑
- 突变种子需要在 GeneState 中额外存储 `mutationSeed: number` 字段
- 基因重组逻辑需要在 TranscendSystem 中实现，增加了 TranscendSystem 的复杂度

### 技术约束

- `GeneChainState.historicalMaxNumber` 必须存储为 string（Decimal 序列化安全），不能存 Decimal 实例
- GeneState 中不存储 Decimal 类型字段，全部用 number/string
- 基因链的 `chain` 数组在 markRaw 模式下安全（无 Decimal 实例，无 Vue proxy 问题）

## 替代方案

### 方案 B：动态生成 + 随机种子存储

每次 Transcend 时，根据存储的随机种子 + transcendCount 动态生成基因链。种子在首次 Transcend 时生成并存储。

- **优点**：GameState 体积更小（只存种子，不存完整链）
- **缺点**：①突变/筛选/重组操作后的状态变化难以表达（需要操作日志而非最终状态）；②调试困难（需要"重放"操作序列才能得到当前状态）；③与现有系统模式不一致
- **否决理由**：增量游戏的基因系统本质是"状态积累"而非"过程回放"，序列化最终状态更直接

### 方案 C：基因链独立存储在 IndexedDB

将基因链存储在 IndexedDB 的独立表中，不放在主 GameState 中。

- **优点**：主存档体积不增加；基因链可独立备份
- **缺点**：①基因效果需要在每个 tick 中读取，独立存储引入异步读取复杂度；②与 FactorSystem 等同类系统不一致（它们都存在 GameState 中）；③存档迁移时需要同时迁移两个存储位置
- **否决理由**：基因链数据量小（< 1KB），不值得引入独立存储的异步复杂度。档案馆适合独立存储是因为它不参与 tick 热路径，但基因链每 tick 都需要读取
