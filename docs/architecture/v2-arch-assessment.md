# v2.0 新系统技术架构评估报告

> 评估人：程基岩（engineering-lead）
> 评估日期：2026-07-01
> 评估范围：基因进化系统（GeneSystem）、宇宙档案馆（ArchiveSystem）、数字神话图鉴（CodexSystem）、皮肤系统（SkinSystem）
> 代码基线：v2.0 Alpha（DimensionSystem + EntropySystem 已实现）

---

## 0. 前置发现：序列化缺口（CRITICAL）

在评估新系统之前，发现一个**阻塞性问题**：

`src/core/Serializer.ts` 和 `src/types/save.ts` 中的 `SerializedState` 接口**未包含任何 v2.0 字段**：

| v2.0 字段 | GameState 中存在 | SerializedState 中存在 | serialize() 中处理 |
|-----------|:---:|:---:|:---:|
| `entropy` | YES | NO | NO |
| `entropyStabilizers` | YES | NO | NO |
| `entropyRewinds` | YES | NO | NO |
| `totalCollapses` | YES | NO | NO |
| `currentDimension` | YES | NO | NO |
| `dimensionStates` | YES | NO | NO |
| `dimensionCrystals` | YES | NO | NO |
| `activeEvent` | YES | NO | NO |
| `ongoingEffects` | YES | NO | NO |

**后果**：玩家刷新页面后，熵值、维度状态、活跃事件效果全部丢失。v2.0 Alpha 的两个 P0 系统（DimensionSystem、EntropySystem）在存档/读档时处于"假工作"状态。

**建议**：在任何新系统开发前，必须先修复 Serializer 和 SerializedState，将所有 v2.0 字段纳入序列化。这是新系统开发的前置依赖。

---

## 1. 基因进化系统（GeneSystem）

### 1.1 系统概述

每次 Transcend 时生成/进化基因链，基因在后续 Run 中提供被动加成。8 类基因，支持突变（Prestige）、筛选（Expansion）、重组（Transcend）三种进化操作。

### 1.2 新增类型定义（TypeScript 接口草案）

```typescript
// ============================================================
// 基因系统类型定义 — 添加到 src/types/game.ts
// ============================================================

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

/** 基因静态定义 — G5：新增 baseEffect（与 GDD GeneDef 对齐） */
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
  entangledProducers?: string[]; // 纠缠基因专属
  mutationSeed: number;        // 突变种子（注入式随机，确定性）
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
  historicalMaxNumber: string; // chain-level 历史最高数字（Decimal string）— G4
}
```

### 1.3 GameState 新增字段

```typescript
// 添加到 GameState class
// ---- 基因系统（v2.0） ----
/** 当前基因链 */
geneChain: GeneChainState = {
  slots: [],
  maxSlots: 3,  // 初始3槽，可通过奇点核心扩容
  historicalMaxNumber: '0',
};
/** 已解锁的基因定义ID集合（决定哪些基因可出现在突变/重组中） */
unlockedGeneDefs: Set<string> = new Set();
```

### 1.4 MultiplierSystem 接入

基因系统通过 `recalculateFromState` 中新增遍历逻辑接入：

```typescript
// MultiplierSystem.recalculateFromState() 中新增段落
// 基因加成（G6：value = 1 + (baseEffect + effectPerLevel*(level-1)) * expression）
if (state.geneChain && state.geneChain.chain.length > 0) {
  for (const gene of state.geneChain.chain) {
    if (gene.level <= 0) continue;

    const geneDef = GENE_DEFS.find(g => g.id === gene.type);
    if (!geneDef) continue;

    // G6 公式
    const effectValue = geneDef.baseEffect + geneDef.effectPerLevel * (gene.level - 1);
    const finalValue = effectValue * gene.expression; // expression ∈ [0,1]（G3）

    let target = '';
    switch (geneDef.effectType) {
      case 'output_multiplier':
        target = '';  // 全局产出倍率
        break;
      case 'producer_synergy':
        target = geneDef.target ?? '';  // 特定生产者协同倍率
        break;
      case 'memory':
        // 记忆基因：按 GDD §2.5，value = 0.02 * memoryRecord（memoryRecord 为 chain-level historicalMaxNumber 的 log10）
        this.register({
          id: `gene_${gene.instanceId}`,
          source: 'gene' as MultiplierSource,
          target: '',
          value: 1 + 0.02 * (gene.memoryRecord ?? 0),
        });
        continue;
      case 'factor_boost':
      case 'event_boost':
        continue; // 非乘数类，由对应系统直接读取
      case 'prestige_start':
      case 'random':
      case 'hidden':
        continue; // 非乘数类或特殊处理
    }

    this.register({
      id: `gene_${gene.instanceId}`,
      source: 'gene' as MultiplierSource,
      target,
      value: 1 + finalValue,
    });
  }
}
```

**MultiplierSource 类型需新增 `'gene'`。**

### 1.5 与现有系统的交互

| 交互系统 | 交互点 | 需修改的文件 |
|---------|-------|-------------|
| TranscendSystem | `executeTranscend` — 触发基因重组，生成/升级基因 | `TranscendSystem.ts`（新增调用 GeneSystem.recombinate） |
| PrestigeSystem | `executePrestige` — 有概率触发基因突变 | `PrestigeSystem.ts`（新增调用 GeneSystem.mutate） |
| ExpansionSystem | `executeExpansion` — 允许筛选删除一条基因 | `ExpansionSystem.ts`（新增调用 GeneSystem.screen） |
| MultiplierSystem | `recalculateFromState` — 遍历基因链注册乘数 | `MultiplierSystem.ts` |
| EntropySystem | `calculateGrowth` — 基因可降低熵值增长速率 | `EntropySystem.ts`（读取 gene 效果） |
| FactorSystem | `tick` — 基因可提升因子发现概率 | `FactorSystem.ts`（读取 gene 效果） |
| EventSystem | `tryTriggerEvent` — 基因可影响事件触发率 | `EventSystem.ts`（读取 gene 效果） |
| gameStore | `gameTick` — 新增 geneSystem.tick() 调用 | `gameStore.ts` |
| Serializer | serialize/deserialize — 新增 geneChain 序列化 | `Serializer.ts`, `save.ts` |
| Constants | 新增 GENE_DEFS | `Constants.ts` |

### 1.6 性能风险评估

- **markRaw 影响**：基因链 `GeneState[]` 是普通数组，内含 number/string 基础类型，无 Decimal 实例。`markRaw` 模式下不受 Vue proxy 干扰，安全。
- **tick 开销**：基因链最多8个槽，每 tick 遍历 O(8)，可忽略。
- **recalculateFromState 开销**：新增 O(slots) 遍历，最多8次乘法，对现有 O(n) 遍历无显著影响。
- **序列化开销**：`GeneChainState` 序列化为 JSON 友好的 `{ slots: [...], maxSlots: number, historicalMaxNumber: string }`，体积小。
- **内存**：基因链常驻内存，8 个 slot 对象，内存占用 < 1KB。
- **风险点**：`historicalMaxNumber` 是 Decimal 字符串，需要在每次 number 增长时比较更新——建议只在 tick 末尾做一次比较（而非每次 number 写入时），避免热路径开销。

---

## 2. 宇宙档案馆（ArchiveSystem）

### 2.1 系统概述

记录每次 Transcend 的运行快照（Run Record），包含最大数字、用时、使用的维度、触发事件数等。解锁条件：完成5次 Transcend。

### 2.2 新增类型定义

```typescript
// ============================================================
// 档案馆类型定义 — 添加到 src/types/game.ts
// ============================================================

/** 基因轻量快照（仅类型 + 等级，不含运行时状态）— A3 */
export interface GeneSnapshot {
  type: GeneType;   // 引用基因系统 GeneType（带前缀）
  level: number;
}

/** 单次运行快照 — A2：GDD 17 字段 + isMilestone */
export interface ArchiveRecord {
  runId: string;              // A4：string，格式 run_{transcendCount}_{timestamp}
  transcendCount: number;     // 本次超越后的总超越次数
  maxNumber: string;          // 本轮最高数字 (Decimal string)
  maxLog10: number;           // maxNumber 的 log10 值
  runDuration: number;        // 本轮持续时间 (秒)
  dimensionsVisited: number[];// 本轮访问过的维度 ID 列表
  primaryDimension: number;   // 本轮主要维度 (停留最久)
  prestigeCount: number;      // 本轮 Prestige 次数
  expansionCount: number;     // 本轮 Expansion 次数
  eventsTriggered: number;    // 本轮触发事件总数
  collapsesTriggered: number; // 本轮熵崩次数
  maxEntropy: number;         // 本轮最高熵值
  geneChainSnapshot: GeneSnapshot[]; // A3
  stardustEarned: number;     // 本轮获得星尘总量
  darkEnergyEarned: number;   // 本轮获得暗能量总量
  singularityEarned: number;  // 本次 Transcend 获得奇点数
  timestamp: number;          // 快照时间戳 (ms)
  epochReached: string;       // 本轮最高纪元 ID
  isMilestone: boolean;       // 是否为里程碑快照（不可删除）— A2
}

/** 档案馆统计摘要 */
export interface ArchiveSummary {
  totalRuns: number;
  allTimeMaxLog10: number;
  totalPlayTime: number;
  totalTranscends: number;
  totalCollapses: number;
  dimensionUsage: Record<number, number>;
  fastestRun: ArchiveRecord | null;
  longestRun: ArchiveRecord | null;
}
```

### 2.3 GameState 新增字段

```typescript
// 添加到 GameState class
// ---- 档案馆（v2.0） ----
// ---- 档案馆（v2.0） — A5：以 GDD 为准，移除 _currentRunStart / _currentRunEvents 简化字段 ----
/** 档案馆是否已解锁（完成5次Transcend后解锁） */
archiveUnlocked: boolean = false;
/** 本轮 Run 起始时间戳 (ms) — A5 */
_runStartTime: number = 0;
/** 本轮访问过的维度 ID 集合 — A5 */
_runDimensionsVisited: Set<number> = new Set();
/** 本轮事件触发计数器 — A5 */
_runEventCount: number = 0;
/** 本轮最高熵值 — A5 */
_runMaxEntropy: number = 0;
/** 本轮星尘获取量 — A5 */
_runStardustEarned: number = 0;
/** 本轮暗能量获取量 — A5 */
_runDarkEnergyEarned: number = 0;
```

**注意**：`ArchiveRecord[]` 不存储在 GameState 中，而是存储在 IndexedDB 独立表中（详见 ADR-002）。

### 2.4 MultiplierSystem 接入

档案馆**不直接接入 MultiplierSystem**。它是一个纯展示/记录系统，不提供数值加成。

但档案馆可解锁"基于档案数据的特殊成就"（如"首次在质数维度达到 e100"），这些成就可能有 multiplier 效果——通过现有的 AchievementSystem → MultiplierSystem 路径间接接入。

### 2.5 与现有系统的交互

| 交互系统 | 交互点 | 需修改的文件 |
|---------|-------|-------------|
| TranscendSystem | `executeTranscend` — 生成运行快照并写入档案 | `TranscendSystem.ts`（新增调用 ArchiveSystem.recordRun） |
| EventSystem | `tick` — 每次触发事件时递增 _runEventCount | `EventSystem.ts` 或 `gameStore.ts` |
| AchievementSystem | 可新增基于档案数据的成就条件 | `Constants.ts`（新增 ACHIEVEMENT_DEFS） |
| gameStore | `executeTranscend` — 检查档案解锁条件 | `gameStore.ts` |
| saveStore | 新增 IndexedDB 档案表读写 | `saveStore.ts`（新增 Dexie table 定义） |

### 2.6 性能风险评估

- **markRaw 影响**：档案记录存储在 IndexedDB 中，不常驻 GameState，无 Vue 响应式问题。
- **查询开销**：档案馆 UI 打开时一次性查询 IndexedDB，非 tick 热路径。档案记录数量预期 < 1000 条，查询性能良好。
- **序列化开销**：ArchiveRecord 不参与 GameState 序列化（独立存储），不影响主存档体积。
- **风险点**：`_runEventCount` 计数器需要确保在每次 EventSystem 触发新事件时递增，容易遗漏——建议在 gameStore 的 `makeEventChoice` 中统一递增。

---

## 3. 数字神话图鉴（CodexSystem）

### 3.1 系统概述

收录游戏中所有触发过的叙事文本，分类管理，部分词条初始隐藏需跨系统联动解锁。

### 3.2 新增类型定义

```typescript
// ============================================================
// 图鉴系统类型定义 — 添加到 src/types/game.ts
// ============================================================

/** 图鉴分类 */
export type CodexCategory =
  | 'origin'       // 起源传说
  | 'cosmic_event' // 宇宙事件
  | 'sage_record'  // 先贤记录
  | 'mystery';     // 未解之谜

/** 未解之谜解锁条件 — C2 */
export interface CodexUnlockCondition {
  type:
    | 'dimension_event'
    | 'gene_possess'
    | 'transcend_count'
    | 'prestige_count'
    | 'expansion_count'
    | 'entropy_collapse'
    | 'archive_count'
    | 'achievement_all'
    | 'codex_complete'
    | 'skin_active'
    | 'number_exact'
    | 'dimension_mastery'
    | 'item_used_count';
  params: Record<string, unknown>;
}

/** 图鉴词条静态定义 — C1：content 为 string[]；C4：narrativeSource + narrativeHash 用于匹配 */
export interface CodexEntryDef {
  id: string;
  title: string;
  category: CodexCategory;
  /** 正文段落列表 — C1 */
  content: string[];
  /** 关联叙事来源（用于自动收录匹配）— C4 */
  narrativeSource?: string;
  /** 叙事文本哈希（用于精确匹配）— C4 */
  narrativeHash?: string;
  /** 未解之谜专属：解锁条件列表 — C2 */
  unlockConditions?: CodexUnlockCondition[];
  /** 未解之谜专属：未解锁时的提示语 */
  hiddenHint?: string;
  icon: string;
}

/** 图鉴运行时状态 */
export interface CodexEntryState {
  id: string;
  unlocked: boolean;
  unlockedAt?: number;
}

/** 图鉴整体状态 — C3：entries Map + categoryCounts */
export interface CodexSystemState {
  entries: Map<string, CodexEntryState>;
  categoryCounts: Record<CodexCategory, { unlocked: number; total: number }>;
}
```

### 3.3 GameState 新增字段

```typescript
// 添加到 GameState class
// ---- 图鉴系统（v2.0） — C3：codexEntries Map + codexInitialized ----
/** 图鉴词条状态映射 — C3 */
codexEntries: Map<string, CodexEntryState> = new Map();
/** 图鉴是否已初始化 */
codexInitialized: boolean = false;
```

### 3.4 MultiplierSystem 接入

图鉴系统**不接入 MultiplierSystem**。它是纯叙事/收集系统，不提供数值加成。

### 3.5 与现有系统的交互

| 交互系统 | 交互点 | 需修改的文件 |
|---------|-------|-------------|
| gameStore | `showNarration` — 每次显示叙事时检查是否解锁图鉴 | `gameStore.ts`（新增调用 CodexSystem.checkNarrativeUnlock） |
| DimensionSystem | `switchDimension` / `unlockDimension` — 维度相关图鉴解锁 | `DimensionSystem.ts` 或 `gameStore.ts` |
| EntropySystem | `triggerCollapse` — 熵崩相关图鉴解锁 | `EntropySystem.ts` 或 `gameStore.ts` |
| EventSystem | `applyChoice` — 事件相关图鉴解锁 | `EventSystem.ts` 或 `gameStore.ts` |
| Serializer | serialize/deserialize — 新增 unlockedCodexEntries 序列化 | `Serializer.ts`, `save.ts` |

### 3.6 性能风险评估

- **markRaw 影响**：`Set<string>` 和 `Map<string, number>` 是基础类型集合，markRaw 模式下安全。
- **tick 开销**：图鉴解锁检查不在 tick 热路径中，仅在叙事触发时执行，频率低。
- **序列化开销**：`unlockedCodexEntries` 序列化为 `string[]`，`triggeredNarratives` 序列化为 `Record<string, number>`，体积小。
- **风险点**：`triggeredNarratives` Map 如果叙事 key 不统一（有些用事件ID，有些用纪元ID），容易导致重复解锁或遗漏——建议设计统一的叙事 key 命名规范。

---

## 4. 皮肤系统（SkinSystem）

### 4.1 系统概述

改变数字显示风格和 UI 主题。数字皮肤影响记谱方式，UI 主题影响配色。

### 4.2 新增类型定义

```typescript
// ============================================================
// 皮肤系统类型定义 — 添加到 src/types/game.ts
// ============================================================

/** 数字皮肤 ID（带前缀）— S1 */
export type NumberSkinId =
  | 'skin_scientific'   // 科学记数（默认）
  | 'skin_engineering'  // 工程记数
  | 'skin_chinese'      // 汉字大数
  | 'skin_binary';      // 二进制脉冲

/** UI 主题 ID（带前缀）— S1 */
export type UIThemeId =
  | 'theme_deep_space'        // 深空蓝（默认）
  | 'theme_prime_green'       // 质数绿
  | 'theme_chaos_orange'      // 混沌橙
  | 'theme_singularity_white' // 奇点白
  | 'theme_entropy_red';      // 熵崩红

/** 数字皮肤静态定义 — S2：独立定义 */
export interface NumberSkinDef {
  id: NumberSkinId;
  name: string;
  description: string;
  icon: string;
  unlockCondition: string;
  unlockCost: { type: 'stardust' | 'singularity' | 'dimension_resource'; amount: number; dimId?: number };
  formatter: 'scientific' | 'engineering' | 'chinese' | 'binary';
}

/** UI 主题静态定义 — S2：独立定义 */
export interface UIThemeDef {
  id: UIThemeId;
  name: string;
  style: string;
  preview: { primary: string; accent: string; bg: string };
  unlockCondition: string;
  unlockCost: { type: 'dimension_resource' | 'singularity' | 'entropy_crystal'; amount: number; dimId?: number };
  cssThemeAttr: string; // 对应 <html data-theme="..."> 的值（S5，带前缀）
}

/** 皮肤系统运行时状态 — S3：已解锁集合分开 */
export interface SkinState {
  activeNumberSkin: NumberSkinId;
  activeTheme: UIThemeId;
  unlockedNumberSkins: Set<NumberSkinId>; // S3
  unlockedThemes: Set<UIThemeId>;         // S3
}
```

### 4.3 GameState 新增字段

```typescript
// 添加到 GameState class
// ---- 皮肤系统（v2.0） — S1/S3：带前缀 ID + 分开的已解锁集合 ----
/** 当前激活的数字皮肤ID — S1 */
activeNumberSkin: NumberSkinId = 'skin_scientific';
/** 当前激活的UI主题ID — S1 */
activeTheme: UIThemeId = 'theme_deep_space';
/** 已解锁的数字皮肤ID集合 — S3 */
unlockedNumberSkins: Set<NumberSkinId> = new Set(['skin_scientific']);
/** 已解锁的UI主题ID集合 — S3 */
unlockedThemes: Set<UIThemeId> = new Set(['theme_deep_space']);
```

### 4.4 MultiplierSystem 接入

皮肤系统**不接入 MultiplierSystem**。它是纯视觉系统，不影响游戏数值。

但需要与 Formatter 系统交互——不同的数字皮肤需要不同的格式化逻辑。

### 4.5 与现有系统的交互

| 交互系统 | 交互点 | 需修改的文件 |
|---------|-------|-------------|
| Formatter | `format` — 根据当前数字皮肤选择格式化方式 | `Formatter.ts`（新增 skin 参数或读取全局 skin 设置） |
| gameStore | `updateDisplayStrings` — 应用当前皮肤格式化 | `gameStore.ts` |
| App.vue 或根组件 | CSS 变量切换 | 根组件（详见 ADR-003） |
| Serializer | serialize/deserialize — 新增 skin 字段序列化 | `Serializer.ts`, `save.ts` |
| Constants | 新增 SKIN_DEFS | `Constants.ts` |

### 4.6 性能风险评估

- **markRaw 影响**：皮肤字段是 string 和 Set<string>，markRaw 模式下安全。
- **切换开销**：主题切换通过 CSS 变量实现（详见 ADR-003），无组件重建开销。
- **Formatter 开销**：不同数字皮肤的格式化算法不同，但 `format()` 已有 L1-L5 分层逻辑，新增分支不影响性能。
- **风险点**：二进制脉冲皮肤可能需要额外的 SVG 渲染逻辑，与现有纯文本格式化不兼容——建议作为 v2.1 延后实现，v2.0 先做前三种。

---

## 5. 实现优先级排序

### 推荐实现顺序

| 顺序 | 系统 | 优先级 | 理由 |
|:---:|------|:---:|------|
| 0 | **Serializer 修复** | P0 阻塞 | 所有序列化字段缺失，是所有新系统开发的前置依赖 |
| 1 | **基因进化系统** | P1 | ①与 Transcend/Prestige/Expansion 三个核心系统深度耦合，越早接入改造成本越低；②提供全局乘数加成，直接影响游戏数值平衡；③基因链数据轻量，不引入新的存储架构 |
| 2 | **宇宙档案馆** | P2 | ①依赖 TranscendSystem 和 EventSystem 的计数器，需在基因系统改 Transcend 时一并接入；②引入 IndexedDB 独立表（ADR-002），需尽早验证存储架构可行性；③解锁条件为5次 Transcend，开发完成后可立即在测试中验证 |
| 3 | **数字神话图鉴** | P2 | ①纯收集系统，不提供数值加成，开发风险最低；②依赖统一的叙事触发钩子，需要与 gameStore.showNarration 对接；③可与档案馆并行开发，但图鉴解锁逻辑依赖维度/熵崩等已实现系统，需先确认这些系统的叙事触发点 |
| 4 | **皮肤系统** | P3 | ①纯视觉系统，不涉及游戏逻辑，开发风险最低；②Formatter 改造与 CSS 变量切换是两个独立子任务，可并行；③二进制脉冲皮肤需额外 SVG 渲染，可延后；④不影响其他系统开发，放最后不阻塞任何依赖链 |

### 依赖关系图

```
Serializer 修复 (P0 阻塞)
    ↓
基因系统 ←── 接入 MultiplierSystem
    ↓           ↑
    ├── 改造 TranscendSystem (重组)
    ├── 改造 PrestigeSystem (突变)
    └── 改造 ExpansionSystem (筛选)
         ↓
档案馆 ←── 接入 TranscendSystem (快照)
    ↓
图鉴 ←── 接入 showNarrative 钩子
    ↓
皮肤 ←── 改造 Formatter
```

### 关键路径分析

- **关键路径**：Serializer → 基因系统 → Transcend 改造 → 档案馆
- **并行机会**：图鉴和皮肤可并行开发；基因系统的类型定义可与档案馆类型定义并行编写
- **风险最高**：基因系统（与3个Prestige层耦合）+ 档案馆（引入新存储架构）

---

## 6. 架构风险总结

| 风险 | 严重度 | 影响 | 缓解措施 |
|------|:---:|------|---------|
| Serializer 缺失 v2.0 字段 | **致命** | 存档/读档丢失熵值和维度数据 | 立即修复，在新系统开发前完成 |
| DimensionSystem 维度ID与类型映射混乱 | 高 | checkChaosMultiplier 检查 dimId===1 但 dim1 是质数维度 | 统一维度ID与类型映射，修复 checkChaosMultiplier |
| DimensionSystem.tickDimensionResources 未被调用 | 高 | 维度资源产出功能不生效 | 在 gameStore.gameTick 中补充调用 |
| gameStore.synthesizeCrystal 重复实现 | 中 | 维护成本，逻辑不一致 | 删除 gameStore 中的重复实现，统一调用 DimensionSystem.synthesizeCrystal |
| 基因突变随机性不可测试 | 中 | 测试覆盖困难 | 使用注入式随机种子（seedable random），测试中固定种子 |
| 档案馆引入 IndexedDB 新表 | 中 | 存储架构变更风险 | 先写 PoC 验证 Dexie 多表方案，再正式实现 |
| 图鉴叙事 key 不统一 | 低 | 重复解锁或遗漏 | 设计统一命名规范：`{system}_{event}_{index}` |
| 皮肤系统二进制脉冲渲染 | 低 | 与现有纯文本格式化不兼容 | v2.0 先做前三种皮肤，二进制脉冲延后 |
