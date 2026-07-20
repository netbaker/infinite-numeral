# 基因进化系统 GDD（Gene Evolution System）

> **系统代号**：GeneEvo
> **优先级**：P1
> **版本**：v2.0 Beta
> **依赖系统**：PrestigeSystem、ExpansionSystem、TranscendSystem、MultiplierSystem、DimensionSystem
> **设计日期**：2026-07-01

---

## 1. 系统概述

基因进化系统是 v2.0「维度裂变」的核心战略深度系统。每次超越（Transcend）时，数字宇宙"留下基因"，这些基因在下一轮游戏中被继承并进化，形成玩家独有的"数字 DNA"。基因通过三层飞升分别经历**突变→筛选→重组**三种进化操作，玩家需在基因槽容量有限的前提下，策略性地保留、淘汰和强化基因，构建适合当前维度的最优基因链。

---

## 2. 核心机制

### 2.1 基因类型定义（8 类）

| ID | 名称 | 图标 | 效果描述 | 初始强度范围 | 突变方向 |
|----|------|------|---------|-------------|---------|
| `gene_growth` | 增殖基因 | 🌱 | 生产者基础产出 ×(1 + 0.05×Lv) | Lv 1-3 | Lv↑ 或 Lv↓ |
| `gene_catalyst` | 催化基因 | ⚗️ | 因子发现概率 ×(1 + 0.10×Lv) | Lv 1-2 | Lv↑ 或 类型变异为 `gene_growth` |
| `gene_resilience` | 韧性基因 | 🛡️ | 飞升后起点数字 ×(10^Lv) | Lv 1-3 | Lv↑ |
| `gene_resonance` | 共振基因 | 📡 | 事件发生率 ×(1 + 0.15×Lv)，事件持续时间 ×(1 + 0.10×Lv) | Lv 1-2 | Lv↑ 或 Lv↓ |
| `gene_mutation` | 突变基因 | 🎲 | 每轮 Prestige 随机化为其他基因类型，强度随机（高风险高收益） | Lv 1-5 | 每轮必变 |
| `gene_memory` | 记忆基因 | 🧠 | 记录历史最高数字 log10 值，提供永久全局倍率 ×(1 + 0.02×记录值) | 初始记录当前 maxLog10 | 记录值↑（不降） |
| `gene_entangle` | 纠缠基因 | 🔗 | 随机选中 2 个生产者，其协同倍率 ×(1 + 0.20×Lv) | Lv 1-2 | 重新随机目标生产者 |
| `gene_exotic` | 奇异基因 | ✨ | 解锁隐藏增益或特殊叙事文本；Lv 3+ 时全局产出 ×(1 + 0.50×Lv) | Lv 1 | Lv↑（极低概率）或触发隐藏事件 |

### 2.2 基因链结构

- **初始状态**：首次 Transcend 后，随机获得 2-3 条基因（从 8 类中随机，不含 `gene_exotic`）
- **基因槽**：初始 3 槽，可通过消耗奇点核心扩容
- **槽位上限**：8 槽（对应 8 类基因，最多每类 1 条）
- **基因等级**：每条基因 Lv 1-5，通过重组升阶

### 2.3 三层进化机制

#### 2.3.1 突变（Prestige 时触发）

| 规则 | 详情 |
|------|------|
| 触发时机 | 每次 Prestige（坍缩）后 |
| 突变概率 | 每条基因 30% 概率发生突变 |
| 突变效果 | 随机选择以下之一：① 等级 +1（40%）；② 等级 -1（30%，最低 Lv 1）；③ 类型变异为另一随机类型（20%，保留等级）；④ `gene_mutation` 必定变异为随机类型随机等级（10%，仅对突变基因自身） |
| 突变叙事 | 触发时随机播报突变叙事（见叙事池） |
| 限制 | 同一次 Prestige 最多 1 条基因突变（避免连锁剧变） |

#### 2.3.2 筛选（Expansion 时触发）

| 规则 | 详情 |
|------|------|
| 触发时机 | 每次 Expansion（膨胀）后 |
| 筛选规则 | 玩家可选择删除 0-1 条基因（从当前链中移除） |
| 筛选目的 | 淘汰低等级或不利基因，为重组腾出空间 |
| 特殊 | `gene_memory` 不可被筛选删除（记忆不可遗忘） |
| UI | Expansion 过场动画后弹出筛选选择面板 |

#### 2.3.3 重组（Transcend 时触发）

| 规则 | 详情 |
|------|------|
| 触发时机 | 每次 Transcend（超越）后 |
| 重组条件 | 链中存在 2 条同类型基因 |
| 重组效果 | 合并为 1 条该类型基因，等级 = min(Lv_a + Lv_b, 5)，合并后占用 1 槽 |
| 重组选择 | 玩家手动选择是否重组及重组哪一对（可放弃） |
| 新基因获取 | 每次 Transcend 后额外随机获得 1 条新基因（如果槽位有空） |
| `gene_exotic` | 仅在 Transcend 时 5% 概率获得（不通过常规随机池） |

### 2.4 基因槽扩容规则

| 扩容次数 | 目标槽位数 | 消耗资源 | 前置条件 |
|---------|-----------|---------|---------|
| 1 | 4 槽 | 3 奇点核心 | Transcend 2 次 |
| 2 | 5 槽 | 5 奇点核心 | Transcend 3 次 |
| 3 | 6 槽 | 8 奇点核心 | Transcend 5 次 |
| 4 | 7 槽 | 12 奇点核心 | Transcend 7 次 |
| 5 | 8 槽 | 20 奇点核心 | Transcend 10 次 + 奇异基因 Lv 3 |

### 2.5 与 MultiplierSystem 的交互

基因效果通过 `MultiplierSystem.register()` 注册为 `gene` 来源的加成：

```typescript
// 注册时机：基因链变化时（Prestige/Expansion/Transcend/扩容后）
// 统一公式（对齐 G6 / 架构评估 §1.4）：
//   value = 1 + (baseEffect + effectPerLevel × (level - 1)) × expression
//   expression ∈ [0, 1]（G3）；mutationSeed 保证可复现（ADR-001）
// 注册逻辑：
for (const gene of state.geneChain.chain) {
  const def = GENE_DEFS.find(g => g.id === gene.type)!;
  const geneValue = 1 + (def.baseEffect + def.effectPerLevel * (gene.level - 1)) * gene.expression;
  switch (gene.type) {
    case 'gene_growth':
      multiplierSystem.register({
        id: `gene_growth_${gene.instanceId}`,
        source: 'gene',
        target: '',  // 全局
        value: geneValue,  // 完整乘数值（含 1+）
      });
      break;
    case 'gene_resilience':
      // 非倍率型，直接修改 Prestige 起始数字（= 10^Lv）
      break;
    case 'gene_memory':
      // 记忆基因特殊：记录值来自 chain 级 historicalMaxNumber（G4 决策），不按等级公式
      const recordLog10 = Number(state.geneChain.historicalMaxNumber);
      multiplierSystem.register({
        id: `gene_memory_${gene.instanceId}`,
        source: 'gene',
        target: '',
        value: 1 + def.baseEffect * recordLog10 * gene.expression,
      });
      break;
    case 'gene_exotic':
      if (gene.level >= 3) {
        multiplierSystem.register({
          id: `gene_exotic_${gene.instanceId}`,
          source: 'gene',
          target: '',
          value: geneValue,
        });
      }
      break;
    // ... 其他基因类型按效果注册（均套用统一公式）
  }
}
```

**计算位置**：`gene` 来源在 `MultiplierSystem` 中注册**完整乘数值**（含 `1 + ...`，对齐架构评估 §1.4），与 `upgrade`、`stardust` 等同级参与乘法链。统一公式（对齐 G6）：`value = 1 + (baseEffect + effectPerLevel × (level − 1)) × expression`，其中 `expression ∈ [0, 1]`（G3 决策）。

---

## 3. 数据结构

### 3.1 TypeScript 接口定义

```typescript
/** 基因类型枚举 */
export type GeneType =
  | 'gene_growth'      // 增殖基因
  | 'gene_catalyst'    // 催化基因
  | 'gene_resilience'  // 韧性基因
  | 'gene_resonance'   // 共振基因
  | 'gene_mutation'    // 突变基因
  | 'gene_memory'      // 记忆基因
  | 'gene_entangle'    // 纠缠基因
  | 'gene_exotic';     // 奇异基因

/** 基因静态定义 */
export interface GeneDef {
  /** 唯一标识 */
  id: GeneType;
  /** 显示名称 */
  name: string;
  /** 描述文本 */
  description: string;
  /** 图标 emoji */
  icon: string;
  /** 效果类型 */
  effectType: 'output_multiplier' | 'factor_boost' | 'prestige_start' 
            | 'event_boost' | 'random' | 'memory' | 'producer_synergy' 
            | 'hidden';
  /** 每级效果数值 */
  effectPerLevel: number;
  /** 基础效果数值（Lv 1 时的效果值，参与统一公式 G6） */
  baseEffect: number;
  /** 最大等级 */
  maxLevel: number;
  /** 初始等级范围 [min, max] */
  initialLevelRange: [number, number];
  /** 是否可被筛选删除 */
  canBePruned: boolean;
}

/** 基因运行时状态（链上单条基因） */
export interface GeneState {
  /** 唯一实例 ID */
  instanceId: string;
  /** 基因类型 */
  type: GeneType;
  /** 当前等级 (1-5) */
  level: number;
  /** 表达强度 (0-1，影响效果倍率，对齐 G3) */
  expression: number;
  /** 纠缠基因专属：绑定的生产者ID列表 */
  entangledProducers?: string[];
  /** 记忆基因专属：记录的历史最高 log10 值（冗余缓存，真值源见 GeneChainState.historicalMaxNumber，对齐 G4) */
  memoryRecord?: number;
  /** 突变基因专属：随机效果种子（保证读档前后效果一致，对齐 ADR-001) */
  mutationSeed?: number;
  /** 获得时间戳 (ms) */
  obtainedAt: number;
  /** 上次突变时间戳 (ms) */
  lastMutatedAt?: number;
}

/** 基因链整体状态 */
export interface GeneChainState {
  /** 当前基因链（最多 8 槽） */
  chain: GeneState[];
  /** 当前最大槽位数 */
  maxSlots: number;
  /** 已扩容次数 */
  expansionCount: number;
  /** 累计突变次数 */
  totalMutations: number;
  /** 累计重组次数 */
  totalRecombinations: number;
  /** 累计筛选次数 */
  totalPrunings: number;
  /** 历史最高数字 log10 值（string 格式，序列化安全，记忆基因真值源，对齐 G4 / ADR-001) */
  historicalMaxNumber: string;
}
```

### 3.2 GameState 新增字段

```typescript
// ---- 基因进化系统（v2.0） ----
/** 基因链状态 */
geneChain: GeneChainState;
/** 基因静态定义池（运行时缓存） */
genePool: GeneDef[];
```

---

## 4. 与现有系统的交互点

| 交互系统 | 交互方式 | 触发时机 | 详情 |
|---------|---------|---------|------|
| **PrestigeSystem** | 突变触发 + 韧性基因起点数字 | Prestige 执行后 | ① 30% 概率突变 1 条基因；② `gene_resilience` 的等级决定 Prestige 后起始数字 = 10^Lv |
| **ExpansionSystem** | 筛选触发 | Expansion 执行后 | 弹出筛选面板，玩家选择删除 0-1 条基因 |
| **TranscendSystem** | 重组触发 + 新基因获取 | Transcend 执行后 | ① 检查可重组对，玩家选择是否重组；② 获得新随机基因（如有空槽）；③ 5% 概率获得 `gene_exotic` |
| **MultiplierSystem** | 加成注册 | 基因链变化时 | `gene_growth`、`gene_memory`、`gene_exotic` 等注册为 `gene` 来源倍率 |
| **FactorSystem** | 催化基因效果 | 因子检测时 | `gene_catalyst` 提高因子发现概率 |
| **EventSystem** | 共振基因效果 | 事件触发/持续时 | `gene_resonance` 提高事件发生率与持续时间 |
| **DimensionSystem** | 维度适配建议 | 维度切换时 | UI 提示当前维度推荐的基因组合（如混沌维度推荐 `gene_resonance`） |
| **CodexSystem** | 叙事收录 | 突变/重组/奇异基因触发时 | 将基因相关叙事文本自动收录进图鉴 |

---

## 5. GeneChain.vue UI 规格

### 5.1 布局结构

```
┌─────────────────────────────────────────────────┐
│  🧬 基因链                           [✕ 关闭]   │
├─────────────────────────────────────────────────┤
│  槽位：3/5  💎 扩容（需 5 奇点核心）             │
├─────────────────────────────────────────────────┤
│                                                 │
│    ╭─────╮  ╭─────╮  ╭─────╮                   │
│    │ 🌱  │──│ ⚗️  │──│ 🛡️  │   ← DNA 双螺旋   │
│    │ Lv3 │  │ Lv2 │  │ Lv1 │     可视化链     │
│    │▓▓▓░░│  │▓▓░░░│  │▓░░░░│                  │
│    ╰─────╯  ╰─────╯  ╰─────╯                   │
│     增殖     催化     韧性                      │
│                                                 │
│    [空槽 +]  [空槽 +]                           │
│                                                 │
├─────────────────────────────────────────────────┤
│  📊 基因统计                                     │
│  累计突变：12 | 累计重组：3 | 累计筛选：5       │
├─────────────────────────────────────────────────┤
│  💡 当前维度推荐：混沌维度适合「共振基因」       │
└─────────────────────────────────────────────────┘
```

### 5.2 交互行为

| 元素 | 行为 |
|------|------|
| 基因卡片 | 点击展开详情：效果说明、当前等级数值、表达强度进度条、突变历史 |
| 基因卡片（长按） | 弹出操作菜单：查看详情 / 标记为待筛选（Expansion 时快捷删除） |
| 空槽 [+] | 如果有未入链的基因（Transcend 新获得但槽满时暂存），点击入链 |
| 扩容按钮 | 消耗奇点核心扩容 1 槽，需二次确认 |
| DNA 螺旋动画 | 基因链变化时播放螺旋重组动画（0.5s） |
| 突变闪光 | 基因突变时该卡片紫色闪光 + 图标抖动 |

### 5.3 视觉规格

- **基因卡片**：圆角矩形（80×100px），背景半透明深紫 `rgba(40,20,60,0.85)`
- **DNA 连接线**：贝塞尔曲线，颜色随基因类型变化（增殖=绿、催化=紫、韧性=蓝…）
- **表达强度条**：卡片底部 4px 高进度条，expression 满 1.0（满格）时金色发光
- **等级标识**：右上角圆形徽章，Lv 1-3 银色，Lv 4 金色，Lv 5 彩虹色

### 5.4 状态展示规则

| 状态 | 展示 |
|------|------|
| 正常 | 基因卡片正常显示，DNA 连接线实线 |
| 突变中（本帧触发） | 紫色闪光 + 图标抖动 0.5s |
| 可重组（Transcend 后检测到同类对） | 两条同类基因卡片同时高亮绿色边框 + 重组按钮浮现 |
| 待筛选标记 | 卡片右上角红色标记 |
| `gene_mutation`（每轮随机） | 卡片边框彩虹流动效果 |

---

## 6. 边缘情况

1. **所有基因槽满 + Transcend 获得新基因**：新基因暂存到"待入链"区，玩家需先筛选删除一条才能入链。暂存区最多 3 条，超出时自动丢弃最旧的。
2. **重组后等级溢出**：Lv 3 + Lv 4 = 7，但上限为 5。合并后为 Lv 5，溢出部分不补偿。
3. **`gene_mutation` 连续变异为同一类型**：允许。变异是完全随机的，可能出现"增殖→增殖"的视觉无变化，但等级会重新随机。
4. **`gene_memory` 在数字被大崩塌扣除后**：记录值不下降（记忆不可逆），只记录历史最高值。
5. **`gene_entangle` 绑定的生产者被卖出（如果未来支持卖出）**：自动重新绑定到另一个随机生产者。
6. **存档兼容（旧存档无 geneChain 字段）**：初始化时 `geneChain = { chain: [], maxSlots: 3, ... }`，下次 Transcend 时正常获取初始基因。

---

## 7. 验收标准

1. 首次 Transcend 后，玩家获得 2-3 条随机基因，基因链 UI 正确显示
2. 每次 Prestige 后，30% 概率有 1 条基因突变，突变效果和叙事正确触发
3. 每次 Expansion 后，筛选面板弹出，玩家可删除 0-1 条基因（`gene_memory` 不可删）
4. 每次 Transcend 后，可重组的同类基因对高亮，重组后等级正确计算（min(a+b, 5)）
5. 基因槽扩容消耗正确数量的奇点核心，扩容后槽位增加
6. `gene_growth` 和 `gene_memory` 的加成正确注册到 MultiplierSystem 并影响实际产出
7. `gene_resilience` 的等级正确决定 Prestige 后的起始数字（10^Lv）
8. `gene_entangle` 绑定的 2 个生产者获得协同倍率加成
9. 基因链 UI 的 DNA 螺旋动画、突变闪光、重组高亮均正常播放
10. 旧存档加载后基因系统正常初始化，不崩溃

---

*文档结束*
