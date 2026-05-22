# 无限数域 - 游戏设计文档

> 本文档为内部技术说明，涵盖所有游戏机制、数值设计和系统架构。
> 文档基于 v0.3.0（阶段三完成）

---

## 目录

1. [核心循环](#1-核心循环)
2. [数字与进制](#2-数字与进制)
3. [生产者](#3-生产者)
4. [升级系统](#4-升级系统)
5. [声望层级](#5-声望层级)
   - 5.1 坍缩层（Prestige I）
   - 5.2 膨胀层（Prestige II）
   - 5.3 超越层（Prestige III）
6. [里程碑系统](#6-里程碑系统)
7. [科技树](#7-科技树)
8. [纪元系统](#8-纪元系统)
9. [倍增器系统](#9-倍增器系统)
10. [存档系统](#10-存档系统)
11. [数值速查表](#11-数值速查表)

---

## 1. 核心循环

```
数字增长 → 解锁生产者 → 购买生产者 → 数字加速增长
    ↓
触发坍缩(Prestige) → 获取星尘 → 购买星尘升级/科技树
    ↓
触发膨胀(Expansion) → 获取暗能量 → 购买膨胀升级
    ↓
触发超越(Transcend) → 获取奇点 → 购买元升级 → 里程碑加成
```

游戏为典型的增量游戏（Incremental Game）三层嵌套循环：

- **第一循环**：数字 → 生产者购买 → 更多数字
- **第二循环**：星尘 → 科技树加速 → 更快数字
- **第三循环**：暗能量 → 膨胀升级 → 更快星尘

---

## 2. 数字与进制

### 显示格式

| 区间           | 示例        | 说明               |
| ------------ | --------- | ---------------- |
| `< 1000`     | `127`     | 整数               |
| `>= 1000`    | `1.27K`   | K/M/B/T/Qa/Qb... |
| `>= 1e6`     | `1.27M`   | 英文缩写             |
| `>= 1e33`    | `1.27Qd`  | 超出常规后缀           |
| `>= 1e303`   | `10^^2.1` | 双上箭头表示双上箭头数      |
| `>= 1e1e308` | `10^^^2`  | 三上箭头             |

**文件位置**：`src/core/BigNumber.ts`

### 存储

- 使用 `break_eternity.js` 库处理任意大小整数
- 游戏状态中存储 `string` 格式的 Decimal
- 内部计算使用 `Decimal` 对象

---

## 3. 生产者

### 基础信息

| ID         | 名称  | 基础产出      | 基础价格        | 解锁阈值       |
| ---------- | --- | --------- | ----------- | ---------- |
| `basic`    | 计数器 | 1/s       | 10          | —          |
| `clicker`  | 点击者 | 5/s       | 100         | 50         |
| `farm`     | 农场  | 20/s      | 1,000       | 500        |
| `factory`  | 工厂  | 100/s     | 10,000      | 5,000      |
| `lab`      | 实验室 | 500/s     | 100,000     | 50,000     |
| `portal`   | 传送门 | 3,000/s   | 1,000,000   | 500,000    |
| `universe` | 宇宙  | 20,000/s  | 10,000,000  | 5,000,000  |
| `infinity` | 无限  | 150,000/s | 100,000,000 | 50,000,000 |

**文件位置**：`src/core/Constants.ts` → `PRODUCER_DEFS`

### 价格公式

```
价格(n) = floor(基础价格 × 1.15^n)
```

### 产出公式

```
单次产出 = 基础产出 × 数量 × globalMultiplier
```

---

## 4. 升级系统

### 4.1 普通升级

每个生产者有 5 个升级槽位：

| 槽位  | 价格倍数       | 效果    |
| --- | ---------- | ----- |
| 0   | ×100       | 产出 ×2 |
| 1   | ×1,000     | 产出 ×2 |
| 2   | ×10,000    | 产出 ×2 |
| 3   | ×100,000   | 产出 ×2 |
| 4   | ×1,000,000 | 产出 ×3 |

**文件位置**：`src/core/Constants.ts` → `UPGRADE_DEFS`

### 4.2 星尘升级（坍缩层）

| ID          | 名称    | 费用   | 效果                |
| ----------- | ----- | ---- | ----------------- |
| `s_global`  | 全局加速  | 10星尘 | 全局产出 ×2           |
| `s_basic`   | 计数器强化 | 25星尘 | 计数器产出 ×5          |
| `s_clicker` | 点击强化  | 25星尘 | 点击产出 ×5           |
| `s_farm`    | 农场强化  | 50星尘 | 农场产出 ×5           |
| `s_autobuy` | 自动购买  | 75星尘 | 每秒自动购买 1 个最便宜的生产者 |

**文件位置**：`src/core/Constants.ts` → `STARDUST_UPGRADE_DEFS`

---

## 5. 声望层级

### 5.1 坍缩层（Prestige I）

**触发条件**：`number >= 10^12`

**星尘获取公式**：

```
星尘 = floor(log10(number) × 0.5)
```

**效果**：

- 数字归零
- 坍缩次数 +1
- 所有生产者的星尘加成生效
- 已购买的星尘升级保留

**文件位置**：`src/systems/PrestigeSystem.ts`

### 5.2 膨胀层（Prestige II）

**触发条件**：

- 坍缩次数 >= 3
- 累计星尘 >= 100
- 科技树节点 `tech_expand` 已解锁

**暗能量获取公式**：

```
暗能量 = floor(sqrt(累计星尘 / 100))
```

**效果**：

- 数字归零
- 坍缩次数归零（重置）
- 星尘归零（重置）
- 科技树归零（重置）
- 星尘升级和普通升级**保留**
- 膨胀次数 +1

**文件位置**：`src/systems/ExpansionSystem.ts`

### 5.3 超越层（Prestige III）

**触发条件**：

- 暗能量 >= 1000
- 科技树节点 `tech_transcend` 已解锁

**奇点获取公式**：

```
奇点 = floor(log10(暗能量) × 0.5)
```

**效果**：

- 数字归零
- 坍缩次数归零
- 膨胀次数归零
- 暗能量归零
- 星尘归零
- 科技树归零
- **星尘升级保留**（重要！）
- 普通升级全部保留
- 超越次数 +1
- 检查里程碑解锁

**文件位置**：`src/systems/TranscendSystem.ts`

### 声望层级对比

| 维度    | 坍缩    | 膨胀            | 超越                  |
| ----- | ----- | ------------- | ------------------- |
| 触发阈值  | 10^12 | 累计星尘100 + 科技树 | 暗能量1000 + 科技树       |
| 重置内容  | 数字    | 数字 + 星尘 + 科技树 | 数字 + 星尘 + 暗能量 + 科技树 |
| 保留内容  | 星尘升级  | 星尘升级 + 普通升级   | 星尘升级 + 普通升级         |
| 获取资源  | 星尘    | 暗能量           | 奇点                  |
| 解锁升级  | 星尘升级  | 膨胀升级          | 元升级                 |
| 解锁科技树 | ✓     | ✓             | ✓                   |

---

## 6. 里程碑系统

**文件位置**：`src/systems/MilestoneSystem.ts`

### 里程碑定义

| ID             | 名称  | 超越次数 | 全局倍率 | 解锁元升级 |
| -------------- | --- | ---- | ---- | ----- |
| `milestone_1`  | 初窥  | 1    | ×2   | 否     |
| `milestone_3`  | 破界  | 3    | ×3   | 否     |
| `milestone_5`  | 创世  | 5    | ×5   | 否     |
| `milestone_10` | 无限  | 10   | ×10  | 是     |

### 里程碑加成

里程碑通过 `MultiplierSystem` 应用全局倍率：

```typescript
// MilestoneSystem.ts
const milestoneResult = milestoneSystem.checkMilestones(newState);
for (const m of milestoneResult.newlyUnlocked) {
  newState.unlockedMilestones.add(m.id);
}
```

所有里程碑的倍率**可叠加**，即超越10次后总全局倍率为：

```
2 × 3 × 5 × 10 = 300
```

---

## 7. 科技树

**文件位置**：`src/systems/TechTreeSystem.ts`

### 节点定义

| ID                | 名称   | 费用    | 解锁条件                                 | 效果           |
| ----------------- | ---- | ----- | ------------------------------------ | ------------ |
| `tech_savings`    | 储蓄协议 | 50星尘  | —                                    | 坍缩时保留 10% 数字 |
| `tech_expand`     | 膨胀理论 | 75星尘  | 坍缩3次                                 | 解锁膨胀层        |
| `tech_autobuy_ii` | 超级自动 | 150星尘 | `tech_savings`                       | 自动购买升级       |
| `tech_transcend`  | 超越哲学 | 200星尘 | `tech_expand` + 坍缩10次                | 解锁超越层        |
| `tech_enhance`    | 增强协议 | 300星尘 | `tech_autobuy_ii` + `tech_transcend` | 所有产出 ×5      |

### 依赖关系

```
tech_savings ──┬── tech_autobuy_ii ── tech_enhance
               │
               └── tech_expand ─── tech_transcend ─── tech_enhance
```

### UI 组件

`src/components/game/TechTreeGraph.vue` — SVG 垂直树状图

- 三态显示：已解锁（🟢）/ 可购买（🔵光晕）/ 锁定（⚫虚线）
- 贝塞尔曲线连接
- Hover tooltip 显示详情
- 点击可购买节点弹出确认

---

## 8. 纪元系统

**文件位置**：`src/systems/EpochSystem.ts`

### 纪元配置

| ID                 | 名称   | 阈值   | 效果     |
| ------------------ | ---- | ---- | ------ |
| `era_civilization` | 文明纪元 | 0    | 正常游戏   |
| `era_information`  | 信息纪元 | 1e10 | 解锁信息加成 |
| `era_quantum`      | 量子纪元 | 1e20 | 解锁量子加成 |
| `era_cosmic`       | 宇宙纪元 | 1e30 | 解锁宇宙加成 |

### meta_epoch 效果

元升级 `meta_epoch` 每级减少纪元阈值 **15%**：

```
实际阈值 = 原阈值 × (1 - 0.15 × level)
```

例如：3级 meta_epoch → 信息纪元阈值为 `1e10 × (1 - 0.45) = 5.5e9`

---

## 9. 倍增器系统

**文件位置**：`src/systems/MultiplierSystem.ts`

倍增器系统是游戏的中央计算引擎，所有加成通过 `register()` 方法登记，最后通过 `getTotal()` 汇总。

### 加成来源

| source      | 说明          |
| ----------- | ----------- |
| `base`      | 基础生产者产出     |
| `upgrade`   | 普通升级加成      |
| `scaling`   | 购买数量缩放      |
| `stardust`  | 星尘升级加成      |
| `tech`      | 科技树加成       |
| `expansion` | 膨胀升级加成      |
| `transcend` | 超越升级（元升级）加成 |
| `milestone` | 里程碑全局倍率     |
| `epoch`     | 纪元加成        |

### 计算顺序

```
基础产出 × (1 + sum(upgrade)) × (1 + sum(scaling))
    × (1 + sum(stardust)) × (1 + sum(tech))
    × (1 + sum(expansion)) × (1 + sum(transcend))
    × prod(allMilestones) × (1 + sum(epoch))
```

---

## 10. 存档系统

**文件位置**：

- `src/stores/saveStore.ts` — 存档主逻辑
- `src/composables/useAutoSave.ts` — 自动保存
- `src/composables/useOffline.ts` — 离线计算

### 存档位置

- **Electron 客户端**：`%APPDATA%/infinite-numeral/`
- **浏览器**：`localStorage` + IndexedDB

### 存档触发

| 时机    | 触发条件                        |
| ----- | --------------------------- |
| 每次操作后 | 5秒防抖                        |
| 页面离开  | `beforeunload` 事件           |
| 应用隐藏  | `visibilitychange → hidden` |
| 每分钟   | 定时器                         |

### 离线计算

```typescript
// 页面恢复时（visibilitychange → visible）
// 仅计算离线收益，不重新加载存档（防止覆盖）
saveStore.calculateOfflineEarnings();
```

---

## 11. 数值速查表

### 触发阈值

| 事件   | 阈值                                |
| ---- | --------------------------------- |
| 坍缩触发 | 10^12                             |
| 膨胀触发 | 累计星尘 ≥ 100 + `tech_expand` 已解锁    |
| 超越触发 | 暗能量 ≥ 1000 + `tech_transcend` 已解锁 |
| 信息纪元 | 10^10（meta_epoch 可降低）             |
| 量子纪元 | 10^20                             |
| 宇宙纪元 | 10^30                             |

### 获取系数

| 资源  | 公式                        | 系数             |
| --- | ------------------------- | -------------- |
| 星尘  | `floor(log10(n) × k)`     | 0.5            |
| 暗能量 | `floor(sqrt(累计星尘 / 100))` | —              |
| 奇点  | `floor(log10(暗能量) × k)`   | 0.5（已调整，原为0.1） |

### 价格公式

| 类型   | 公式                     |
| ---- | ---------------------- |
| 生产者  | `floor(基础价格 × 1.15^n)` |
| 普通升级 | `基础价格 × 100^n`         |
| 星尘升级 | 固定值（不随购买变化）            |
| 膨胀升级 | 暗能量消耗递增                |
| 元升级  | 奇点消耗递增                 |

---

## 附录：文件索引

| 文件                                      | 职责               |
| --------------------------------------- | ---------------- |
| `src/stores/gameStore.ts`               | 游戏状态主存储，暴露所有计算接口 |
| `src/stores/saveStore.ts`               | IndexedDB 存档管理   |
| `src/systems/PrestigeSystem.ts`         | 坍缩层逻辑 + 叙事       |
| `src/systems/ExpansionSystem.ts`        | 膨胀层逻辑            |
| `src/systems/TranscendSystem.ts`        | 超越层逻辑 + 叙事       |
| `src/systems/MilestoneSystem.ts`        | 里程碑检查            |
| `src/systems/TechTreeSystem.ts`         | 科技树状态管理          |
| `src/systems/EpochSystem.ts`            | 纪元切换             |
| `src/systems/MultiplierSystem.ts`       | 加成计算引擎           |
| `src/composables/useGameLoop.ts`        | 主循环（tick驱动）      |
| `src/composables/useAutoSave.ts`        | 自动保存             |
| `src/composables/useOffline.ts`         | 离线收益             |
| `src/components/layout/RightPanel.vue`  | 科技树 UI（列表→SVG）   |
| `src/components/game/TechTreeGraph.vue` | 科技树 SVG 可视化      |
| `src/core/Constants.ts`                 | 所有静态配置           |
| `src/types/game.ts`                     | TypeScript 类型定义  |
