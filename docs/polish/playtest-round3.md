# Phase 6 打磨 · Playtest 第 3 轮（R3）— 成就 / 知识图鉴（Codex）联动 + 长时运行

- **QA 负责人**：严守真（qa-polish）
- **评审强度**：full
- **范围**：13 条维度成就「零数字印记」红线、Codex 叙事解锁 → 协同门控联动、成就跨重置保留、长时运行（含重置续跑）数值有限、知识条目 trigger 与真实叙事一致性
- **判定**：**✅ PASS**（无 P0 / 无 P1；零印记红线经断言严格成立）

---

## 1. 目标与场景（Focus & Scenario）

| 场景 | 验证目标 | 红线 |
|------|----------|------|
| 维度成就 | 13 条 `group:'dimension'` 成就解锁、成就跨重置保留 | **数字印记（numeralImprint）恒为 0** |
| Codex 联动 | 维度切换叙事解锁知识 → 点亮受知识门控的协同（S7/S8/S10） | 知识门控链路一致 |
| 叙事一致性 | 知识条目 `narrativeTriggers` 逐字符等于真实 `DIMENSION_SWITCH_NARRATIVES` | 无悬空 trigger |
| 长时运行 | 1000 tick + Prestige 续跑 500 tick、维度切换 300×3 tick 数值有限 | 不爆/不 NaN |

---

## 2. 方法（Method）

### 2.1 复用的既有测试
- `src/__tests__/AchievementSystem.test.ts`（相关用例）— 成就解锁/去重
- `src/__tests__/BigNumber.test.ts`（20）— Decimal 有限性

### 2.2 新增专项冒烟（`src/__tests__/PolishSmoke-Codex.test.ts`，9 例，全部通过）

| 测试 ID | 断言内容 | 结果 |
|---------|----------|------|
| R3-A-1 | `ACHIEVEMENT_DEFS` 含 13 条 `group:'dimension'` 成就 | ✅ |
| R3-A-2 | 满精通扫描解锁 13 条维度成就，`numeralImprints` 不变（零印记红线） | ✅ |
| R3-A-3 | `dim0` 精通 L5 点亮 `dim_milestone_0_5`，印记不变 | ✅ |
| R3-A-4 | 成就跨 `executeTranscend` 保留（不重复触发、不丢失），印记不变 | ✅ |
| R3-B-1 | `onNarrativeTriggered` 真实维度切换叙事解锁 `know_resonance` | ✅ |
| R3-B-2 | 知识门控：满精通但未揭示知识 → `S7/S8/S10` 隐藏；揭示后点亮 | ✅ |
| R3-B-3 | 3 条维度知识 `category='knowledge'`，`narrativeTriggers` 逐字符等于真实 `DIMENSION_SWITCH_NARRATIVES` | ✅ |
| R3-C-1 | 1000 tick + Prestige 续跑 500 tick：number 始终有限且递增 | ✅ |
| R3-C-2 | 维度切换（dim0→dim3→dim4 各 300 tick）：派生缓存一致、number 有限 | ✅ |

---

## 3. 发现（Findings）

### 3.1 P0（阻塞发布）— 0 项
无。零印记红线成立：`R3-A-2` 满精通扫描解锁全部 13 条维度成就后 `s.numeralImprints` 仍为 0；`R3-A-3`/`R3-A-4` 同样保持 0。

### 3.2 P1（重要，建议修复）— 0 项
无功能性缺陷。

### 3.3 P2（观察 / 非阻塞）
| 编号 | 观察 | 说明 |
|------|------|------|
| P2-1 | `gameTick` 每 tick 调用 `checkAchievements` **两次**（gameStore.ts L646 维度成就 + L763 通用成就） | 经 `AchievementSystem.checkAchievements` 确认：已解锁成就被跳过，不重复解锁、不重复弹 toast，**功能无害**；但每 tick 多一次全量遍历，属 per-tick 性能开销（perf-profile.md §1.1 #2 记为「checkAchievements ×2」约 7% 热路径）。建议后续合并为单次调用（非阻塞） |
| P2-2 | Codex 门控依赖 `codexEntries` 解锁状态 | `R3-B-2` 验证门控链路；揭示知识的时机由游戏内 `onNarrativeTriggered` 驱动（R3-B-1 覆盖） |
| P2-3 | 叙事一致性已硬断言 | `R3-B-3` 逐字符比对，杜绝知识条目引用不存在的叙事 trigger |

### 3.4 红线符合性
- **零印记红线**：✅ 严格成立（R3-A-2/3/4）。
- **成就跨重置保留**：✅ Transcend 不丢成就、不重复触发（R3-A-4）。
- **Codex→协同门控**：✅ 知识未揭示时 `S7/S8/S10` 隐藏，揭示后点亮（R3-B-2）。
- **叙事一致性**：✅ 知识 `narrativeTriggers` 与真实 `DIMENSION_SWITCH_NARRATIVES` 逐字符一致（R3-B-3）。

---

## 4. 判定（Verdict）

### ✅ PASS

**阻塞清单（file:line + 复现）**：无。

**保留关注项（非阻塞）**：
- `gameTick` 双 `checkAchievements` 调用（P2-1，gameStore.ts L646 & L763）——功能无害但存在 per-tick 冗余开销，建议 eng 在后续以「合并单次评估」优化（perf-profile.md 已记录，非本次阻塞项）。

**结论**：成就/Codex 联动链路正确、零印记红线守住、长时运行稳定。三轮 Playtest 全部 PASS，可汇总进 Phase 6 QA 门控报告。
