# Sprint 5 GDD-1 索引（逐系统八节设计文档）

> **阶段**：GDD-1（设计文档，不含代码实现）
> **方向决策**：方向 A 为主 + 方向 B 伴随（A+B 组合，已拍板）
> **范围**：A 的 Must 层 + B 的 Must/Should 层
> **依赖阅读**：`design/sprint5/concept.md`、`design/sprint5/directions.md`、`design/gdd/archive-system.md`、`design/gdd/codex-system.md`、`docs/architecture/adr-002-archive-storage-strategy.md`
> **设计日期**：2026-07-23

---

## 0. 范围映射（A/B 层 → 文档）

| 层 | 子系统 | 文档 | 真实状态（已核对代码） |
|----|--------|------|------------------------|
| A·Must① | 档案馆快照采集与 IndexedDB 持久化 | [`archive-data-layer.md`](./archive-data-layer.md) | **v2.0.0 已实现**（`captureRun` + `persistArchiveRecord` + Dexie `archives` 表 + `Serializer` 双向序列化）。GDD 定为「验证/收口」，非从零实现 |
| A·Must② | ArchiveModal 数据接入 | [`archive-modal-integration.md`](./archive-modal-integration.md) | **UI 已完整**（434 行）。GDD 定为「store↔Modal 数据契约核对」，非从零造 UI |
| A·Must③ | 数字人格元升级（最小闭环 1~2 档） | [`numeral-persona.md`](./numeral-persona.md) | **零代码**（grep `persona`/`数字人格` 全仓 0 匹配）→ 真实净新增 |
| B·Must | 量级里程碑系统（e10/e20/… 一次性小奖励） | [`magnitude-milestone.md`](./magnitude-milestone.md) | 叙事触发已存在（`NUMBER_MILESTONE_NARRATIVES`，gameStore L731-740）；**仅缺奖励发放 + 知识联动** |
| B·Should | 知识点词条池（首批 ~20 条真实数学/物理知识） | [`knowledge-entry-pool.md`](./knowledge-entry-pool.md) | **净新增**第 5 个 Codex 分类 `knowledge` |
| B·Should | Codex 知识分类 UI（复用 onNarrativeTriggered） | [`codex-knowledge-ui.md`](./codex-knowledge-ui.md) | **净新增**第 5 个 Tab；复用既有钩子 |

---

## 1. 关键校正（主理人独立复核，已据以调整工作量）

**1.1 `recordRun` 不存在 ≠ 档案馆未完工。** 全仓 grep `recordRun` 为 0 匹配，**但快照采集逻辑已存在且命名为 `captureRun`**（`src/systems/ArchiveSystem.ts` L118-161）。经 `git show v2.0.0` 核对，`captureRun` 已于 v2.0.0 基线落地：`executeTranscend` 在重置逻辑前调用 `captureRun`（gameStore L1092），随后 `persistArchiveRecord`（L1166）→ Dexie `archives` 表。
→ **结论**：A·Must① 的真实工作量不是「从零写方法+调用点+持久化」，而是「验证 `captureRun` 字段完整性、`isMilestone` 判定与 GDD §2.3 一致、Dexie 写失败兜底、Serializer 字段收口」。

**1.2 ArchiveModal 已完整。** `src/components/modals/ArchiveModal.vue`（434 行）已实现：统计总览、筛选、排序、对比模式、卡片网格、详情。`design/sprint5/directions.md` 中「从零造 UI」的估计**偏高**——真实瓶颈只在「store 数据填充是否正确驱动 Modal」。
→ **结论**：A·Must② 的工作量归口为「store getter/loader 契约核对 + 9 个特殊成就与里程碑标记在 Modal 中的呈现验证」。

**1.3 真实瓶颈收敛到两处**：
- **索引层收口**：确认 `captureRun → persistArchiveRecord → Dexie` 全链路无遗漏字段（尤其 `_runSingularityBurst`、基因链快照、`isMilestone`）。此层在 v2.0.0 已在线，GDD 仅做一致性收口。
- **两个净新增**：`数字人格`（A③）与 `Codex 知识分类 + 知识点池`（B②③）。这两处才是 Sprint 5 的真实增量工作量与风险点。

---

## 2. 设计支柱回归（GDD 不得偏离）

1. **印记优先于通胀**：所有新增加成必须为「印记/记录/质量」驱动，而非堆乘数。数字人格加成须显式证明「非纯线性通胀」（见 `numeral-persona.md` §2.4 + §7.5）；量级里程碑奖励必须是**有界、稀缺、一次性**的**非货币奖励（维度洞察 / 永久微加成）**——**不发放数字印记**（防通胀，R1 已拍板权威口径），禁止发放永久生产乘数。
2. **可感知的正反馈节奏**：量级里程碑 + 知识解锁 = 在每个数量级跨越点给一次「小确幸」。
3. **每个 Run 都独一无二**：数字人格由历史统计**派生**，知识解锁由当轮到达的量级**触发**，Run 间不可复制。

---

## 3. 跨文档一致性红线（设计理论）

- **杜绝主导策略**：数字人格不得提供「叠层乘数」式的纯线性通胀通道（违反支柱①）。L2 必须为「机制/质量」加成，非额外乘数。
- **杜绝经济失衡**：`数字印记` 来源仅 = 里程碑超越(5/10/25/50/100) + 9 个档案特殊成就首次解锁 → 全游戏周期有界（上限 = 5 + 9 = 14 枚，**R1 已拍板，权威口径**），天然稀缺，不会通胀。（量级里程碑不发放数字印记，见 `magnitude-milestone.md` §2.3）
- **杜绝认知过载**：Codex 新增第 5 分类 Tab，沿用既有 `CODEX_CATEGORIES` 渲染循环，不新增交互范式。
- **杜绝支柱漂移**：B 层知识解锁依附于 A 层档案馆已采集的量级数据，二者同源。

---

## 4. 交付清单（本目录）

- `index.md`（本文件）
- `archive-data-layer.md`（A·Must①）
- `archive-modal-integration.md`（A·Must②）
- `numeral-persona.md`（A·Must③，净新增）
- `magnitude-milestone.md`（B·Must）
- `knowledge-entry-pool.md`（B·Should，净新增）
- `codex-knowledge-ui.md`（B·Should，净新增）

---

## 5. 修订记录（GDD-1 rev.1）

**日期**：2026-07-23（rev.1，据 eng-confirm-2 独立代码核查修订）

- **A·Must① `singularityBurst`「真实缺口」作废**：初稿标记「`ArchiveRecord` 须补 `singularityBurst?: boolean`」经核查**不成立**。`arch_singularity_burst` 成就用近似实现 `dimensionsVisited.includes(4) && maxLog10>=300`（`ArchiveSystem.ts:241`，注释 :211），`_runSingularityBurst` 服务于 `mystery_04` 的 `_singularityBurstEver`（`game.ts:1095`），均不进 `ArchiveRecord`。`archive-data-layer.md` §2.2/§3.2/§7 已改为「无新增字段」。
- **A·Must② 成就展示缺口确认且扩大**：9 个 archive 成就确无常驻列表（`ArchiveModal` 无展示区），且通用 `AchievementsModal.vue:62` 的 `groups` 硬编码缺 `'archive'` → 9 条连通用面板都不可见（total 计数含却不可见 = 进度 bug）。收口位置定为两处：① `ArchiveModal` 新增 §5.4 成就联动区；② 通用 `AchievementsModal` 纳入 `'archive'` 分组。
- **路径修正**：成就定义实际位于 `src/core/Constants.ts:730-829`（非初稿误写的 `Constants.ts` / `src/types/Constants.ts`）。三处 GDD（`archive-data-layer` / `archive-modal-integration` / `magnitude-milestone`）已同步。

## 5.1 修订记录（GDD-1 rev.2）

**日期**：2026-07-23（rev.2，据 eng-confirm-2 代码确认 + 用户 R1 拍板修订）

- **A·Must① singularityBurst 措辞精确化**：`archive-data-layer.md` §2.2/§3.2 重写为「已确认非缺口——`captureRun` 与 `ArchiveRecord` 接口（types/game.ts:329）字段一致，均无 `singularityBurst`；`arch_singularity_burst` 成就走代理条件 `dimensionsVisited.includes(4) && maxLog10>=300`，不依赖该字段」；§7 验收清单移除「新增 singularityBurst 字段」项（原第 2 条，现重排为 7 条）。
- **R1 印记上限 14 拍板（权威口径）**：`numeral-persona.md` §2.3 与 `index.md` §3 的「14 枚」红线标注「R1 已拍板，权威口径」；`magnitude-milestone.md` §2.3 删除「每档 +1 ×11 档 = +11，叠加总上限 25」的印记发放，改为「量级里程碑不发放数字印记（防通胀），改发维度洞察/永久微加成等非货币奖励；数字印记载源严格限定 = 5 里程碑超越 + 9 档案成就首解 = 14 枚上限」。同步清除 `magnitude-milestone.md` 中其余「发放数字印记」表述（§1/§2.1/§2.2/§3/§4/§5/§7）与 `numeral-persona.md` §4 错将量级里程碑列为印记来源的描述；`index.md` §2 同步将量级里程碑奖励由「数字印记」改为「非货币奖励」。
- **路径复核**：全仓 Grep 确认 GDD 内 `Constants.ts` 引用均为 `src/core/Constants.ts`（仅 `index.md` §5 修订记录中以「初稿误写路径」形式保留 `src/types/Constants.ts` 字样作为历史说明，非误述）。无新增路径修正。

---

*文档结束*
