# ADR-002: 档案馆数据存储策略

> 状态：已决策
> 日期：2026-07-01
> 决策者：程基岩（engineering-lead）

## 背景

宇宙档案馆（ArchiveSystem）记录每次 Transcend 的运行快照（ArchiveRecord），包含最大数字、用时、维度、事件数等。解锁条件为完成5次 Transcend。

核心问题是：**运行快照数据应该存储在哪里？**

### 现有代码现状

- 存档系统使用 Dexie（IndexedDB 封装）存储主 GameState
- `src/stores/saveStore.ts` 管理存档读写
- `src/core/Serializer.ts` 将 GameState 序列化为 `SaveData`，其中 `SerializedState` 是一个扁平的 JSON 友好结构
- GameState 中的所有数据（Decimal、Map、Set）都在 serialize 时转为 string/Record/Array
- 现有存档体积估算：约 5-15 KB（取决于成就/因子/挑战数量）

### 档案馆数据特征

- **只增不删**：每次 Transcend 追加一条记录，永不删除
- **非热路径**：仅在 Transcend 时写入，仅在打开档案馆 UI 时读取
- **单条体积**：每条 ArchiveRecord 约 200-500 bytes（含基因链快照）
- **增长速度**：每次 Transcend +1 条，预期玩家生命周期内 < 1000 条
- **总量估算**：1000 条 × 500 bytes = 500 KB（最坏情况）

## 决策

**采用 IndexedDB 独立表存储**（A1，已决策并保持不变）：运行快照（`ArchiveRecord[]`）存储在 Dexie 的独立表中（如 `archives` 表），**不嵌入 GameState**。本决策优先于基因/档案馆 GDD 中“运行快照存于 GameState.runArchive”的措辞——GDD §3.2 的存储位置描述以本 ADR 为准（IndexedDB 独立表）。

GameState 中仅保留以下轻量字段（A5，以档案馆 GDD 为准，移除旧版 `_currentRunStart` / `_currentRunEvents` 简化字段）：
- `archiveUnlocked: boolean` — 档案馆是否已解锁
- `_runStartTime: number` — 本轮 Run 起始时间戳 (ms)
- `_runDimensionsVisited: Set<number>` — 本轮访问过的维度 ID 集合
- `_runEventCount: number` — 本轮事件触发计数器
- `_runMaxEntropy: number` — 本轮最高熵值
- `_runStardustEarned: number` — 本轮星尘获取量
- `_runDarkEnergyEarned: number` — 本轮暗能量获取量

这 7 个轻量字段参与主存档序列化；运行快照本身走 IndexedDB。

## 类型定义草案（与 GDD 对齐）

> 以下类型定义草案为 ADR-002 的落地规范，与档案馆 GDD 保持一致。存储位置采用 IndexedDB 独立表（A1）；ArchiveRecord 字段集采用 GDD 的 17 个数据字段 + `isMilestone`（A2）；`geneChainSnapshot` 使用轻量 `GeneSnapshot[]`（A3）；`runId` 为 `string` 格式 `run_{transcendCount}_{timestamp}`（A4）。

```typescript
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

> 注：`ArchiveRecord[]` 不存储在 GameState 中，而是存储在 IndexedDB 独立表（见 A1 / 决策）。GameState 仅保留 A5 的 7 个轻量字段。

## 理由

### 1. 体积隔离

档案馆数据是只增不删的追加型数据。如果嵌入 GameState，主存档会随 Transcend 次数线性增长。1000 次 Transcend 后主存档从 ~15KB 增长到 ~500KB，每次自动保存（5秒防抖）的写入开销显著增加。

独立存储后，主存档体积保持稳定（< 20KB），档案馆数据独立写入不影响主存档性能。

### 2. 读写模式匹配

档案馆的访问模式是"写一次，读多次"——仅在 Transcend 时写入，仅在打开 UI 时读取。这与主 GameState 的"每 tick 读写"模式完全不同。

Dexie 的独立表可以设置不同的读写策略：档案馆表不需要实时同步，可以只在 UI 打开时懒加载。

### 3. 序列化简化

ArchiveRecord 中包含 `geneChainSnapshot: GeneSnapshot[]`（轻量类型+等级快照，见下方类型定义草案），如果嵌入 GameState，需要在 Serializer 中新增嵌套序列化逻辑。独立存储时，ArchiveRecord 直接以 JSON 格式存入 Dexie，无需自定义序列化。

### 4. 与现有架构的兼容性

现有 saveStore.ts 已经使用 Dexie，新增一个 table 定义非常简单：

```typescript
// saveStore.ts 中新增
db.version(3).stores({
  ...existingStores,
  archives: '++id, runId, endedAt',
});
```

不需要引入新的依赖或存储机制。

## 后果

### 正面

- 主存档体积稳定，不随 Transcend 次数增长
- 档案馆写入不触发主存档的自动保存
- ArchiveRecord 可直接 JSON 序列化，无需自定义 Serializer 逻辑
- 档案馆 UI 打开时懒加载，不影响游戏主循环性能
- 可独立备份/导出档案馆数据

### 负面

- 需要新增 Dexie table 定义和迁移逻辑
- gameStore 需要新增异步方法 `getArchiveRecords()` 来查询数据
- 存档导出/导入功能需要同时处理主存档和档案馆数据（两个独立数据源）
- 如果 IndexedDB 损坏，档案馆数据与主存档可能不一致
- 档案馆解锁状态（`archiveUnlocked`）在主存档中，但档案数据在独立表中，存在逻辑分裂

### 技术约束

- Dexie table 升级时需要处理版本迁移（CURRENT_VERSION 从 2 → 3）
- `getArchiveRecords()` 是异步方法，gameStore 需要暴露 async getter 或使用 ref 缓存结果
- 档案馆 UI 组件需要处理加载状态（loading → loaded）

## 替代方案

### 方案 B：嵌入 GameState 数组

将 `ArchiveRecord[]` 直接存储在 GameState 中，随主存档序列化。

- **优点**：①单一数据源，无一致性问题；②存档导出/导入只需处理一个文件；③不需要 Dexie 迁移
- **缺点**：①主存档体积线性增长（1000次 Transcend → 500KB 存档）；②每次自动保存写入 500KB 数据，性能下降；③Serializer 需要处理嵌套的 ArchiveRecord 序列化
- **否决理由**：500KB 的主存档在 Capacitor 移动端和 Electron 上会有明显的序列化/写入延迟（实测 JSON.stringify 500KB ~5-10ms，IndexedDB 写入 ~20-50ms）。增量游戏每 5 秒自动保存，频繁写入大对象会影响帧率。

### 方案 C：localStorage 存储

将档案馆数据序列化为 JSON 存储在 localStorage 中。

- **优点**：同步 API，无需异步处理
- **缺点**：①localStorage 有 5-10MB 限制，1000条记录可能接近上限；②无法结构化查询（需要全量读取后内存过滤）；③Electron 端与 IndexedDB 数据不一致（现有存档用 Dexie/IndexedDB）
- **否决理由**：localStorage 不适合存储大量结构化数据，且与现有 Dexie 存储方案不统一
