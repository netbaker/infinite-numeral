# 《无限数域》Sprint 6 方向规划草案（收口型 · 方向 C）

> 编制：文策渊（design-plan / design-strategist）｜基线：v2.0.x + Sprint 5 已落地 A/B
> 配套：`design/sprint5/directions.md` §4（方向 C）、`design/sprint5/concept.md` §3 三设计支柱
> 文档性质：方向性规划/对齐（非 GDD、非实现）

---

## 1. 背景与定位

Sprint 5 已交付 A（档案馆/数字人格）与 B（量级里程碑/知识点）。`directions.md` 明确将 **C. 维度精通深化与跨维度协同** 列为 A 收尾后的**收口型 Sprint**：闭环维度晶体消费出口，把维度从"倍率切换"升级为"可养成的策略 build"。本草案据此立项，并评估 Sprint 5 的 Could 项哪些值得升舱。

**关键校正（已读代码核实，影响范围）**：
- `directions.md` §4.3 将"维度晶体商店"列为 C·Must①，但当前代码**已完整实现**该消费出口——`DimensionPanel.vue` 含晶体商店区、`App.vue:141` 绑定 `@buy-crystal→gameStore.buyCrystalUpgrade`、`MultiplierSystem` 已将购买项注册为 `crystal` 来源（`Constants.ts:1848` `DIMENSION_CRYSTAL_SHOP` 3 项，+10/25/50% 全局）。故 p0 #7 实质已闭环。Sprint 6 真实增量**不是"造商店"，而是在其之上做实维度 build 深度**：精通奖励实际化 + 跨维度协同增益。
- 质数检测大数字失效（directions §7 #3）在 `DimensionSystem.isPrimeDimensionTrigger`（L297-313）已用 log10 整数法修复；反熵维度 `prestigeCount` 膨胀清零（#4）已在 `DimensionSystem.ts:180-185` 改用 `transcendCount`（膨胀保留），二者均**非阻塞项**（#4 详见 §5.6，eng-fix 核实）。

## 2. 核心支柱（MDA + 动词）

- **动词（2 个）**：**主宰（Master）**——深耕某维度精通以解锁真实机制；**共鸣（Resonate）**——组合已精通维度触发协同羁绊。
- **MDA**：Mechanics=精通机制效果 + 协同 set-bonus +（已有）晶体商店；Dynamics=选哪维精通/追哪组羁绊的 build 取舍，避免单一最优解；Aesthetics=Expression（build 身份）+ Challenge（精通里程碑）+ Discovery（组合发现）。
- **SDT**：自主（自选 build）、胜任（精通 0–100/5 级可见进度）、关联（"共鸣"主题叙事 + 后续 build 分享）。
- **Bartle**：Achiever（精通/协同完成）、Explorer（发现组合）、Killer（维度挑战）、Socializer（后续分享）。
- **心流**：维度 build 为长弧目标，配短周期晶体购买、中周期精通升级，形成可持续锯齿。

## 3. 范围分层（Must / Should / Could）

| 层 | 项 | 一句话规格 |
|----|----|-----------|
| **Must** | ①晶体商店收口验证与打磨 | 验证 DimensionPanel+`buyCrystalUpgrade`+`crystal` 来源全链路；补全晶体余额/成本展示与边角 UX（低成本，非从零） |
| **Must** | ②精通奖励实际化 | 将 `DIMENSION_MASTERY_REWARDS` 文本转为真实机制效果，复用 DimensionSystem/MultiplierSystem，拉开 5 维差异 |
| **Must** | ③跨维度协同增益（维度羁绊） | net-new set-bonus/机制层：基于"已精通维度组合"解锁羁绊，**非倍率堆叠** |
| Should | ④维度挑战/精通里程碑 | 基于精通度的长期目标（Bartle 锚点），复用既有成就/挑战框架 |
| Should | ⑤知识点跨系统联动 | 由 B.Could 升舱：知识词条解锁特殊维度叙事/羁绊，复用 CodexSystem+DimensionSystem |
| Could | ⑥档案导出/分享 | A.Could 轻社交（本地 JSON/分享卡），与 C 弱相关，可延后 |
| Could | ⑦维度主题/皮肤深度联动 | SkinSystem 已依赖维度精通，深化 build 的视觉反馈 |

## 4. Must 项拆解

**① 晶体商店收口（复用）**：系统=已有 DimensionPanel + `gameStore.buyCrystalUpgrade` + MultiplierSystem(`crystal` 源)。风险=极低（数据层 live）；仅补 UI 校验（晶体不足禁用、已购态）。无新模块。

**② 精通奖励实际化**：核心循环=`tickMastery`(已在线)→masteryLevel 达阈值→解锁 `DIMENSION_MASTERY_REWARDS[i]` 真实效果。系统拆分：
- 新增 `applyMasteryRewards(state)`（DimensionSystem 内）按已达成 level 激活效果标志位；
- 乘区型奖励（如"全局倍率+5%"）**折叠进既有 `dimension` 来源**（additive 有界）；机制型（成本折扣/离线效率/混沌保底/爆发时长）直接由对应系统读标志；
- 风险：部分奖励是乘区，跨 5 维×5 级若各开新 source 会组合通胀 → 红线：乘区型必须并入单一有界 `dimension` 源，**禁止新增独立乘源**。

**③ 跨维度协同增益（net-new）**：核心循环=多维度 mastery≥阈值→组合命中羁绊表→解锁协同 perk。系统拆分：
- 新增 `DIMENSION_SYNERGY_DEFS`(Constants) + 轻量 `SynergySystem`（或并入 DimensionSystem）；
- 协同 perk 以**机制/规则**为主（如"反熵维度下质数 ×3 仍生效""奇点爆发期间免熵崩"），而非"每精通一维 +X% 全局"；
- 风险：若做成线性倍率会成主导策略（精通全 5 维=最优）→ 红线：用**特定组合 set-bonus**（10 组配对/部分三元），含小众组合以保 支柱三；**不发放数字印记**（R1 上限 14 不变）。

## 5. 设计风险与待裁决（给主理人）

1. **协同形态裁决**：set-bonus/机制层（推荐，抗通胀安全）vs 组合乘区（风险高）。需主理人定调，因触及 MultiplierSystem 架构。
2. **精通乘区型奖励**落地：折叠进既有 `dimension` 源（有界）还是独立 source？建议前者。
3. **与 persona D(s) 的交互**：D(s) 已是唯一有界尾部（≤0.25，effMult 末端单乘）。若协同/精通皆为机制层→不与 D(s) 乘性叠加，D(s) 保唯一尾部；若引入新乘源则叠乘突破。请确认"协同/精通不新增独立乘源"可接受。
4. **数字印记红线**：S6 的 C 方向**零新增印记来源**（上限 14 不变），协同/精通用独立机制解锁，不绕过 R1。确认。
5. **晶体商店冻结建议**：现有 3 项已给最高 +85% 永久全局；建议 S6 **不再新增乘区商品**，把深度放在非乘区的精通/协同上，护住 支柱一。确认。
6. **反熵 `prestigeCount` 膨胀清零(#4) — 已修复，非阻塞（eng-fix 核实）**：`DimensionSystem.ts:180-185` 反熵维度已用 `state.transcendCount`（注释明示"不随膨胀清零"），`ExpansionSystem.ts:100` 膨胀时显式保留 `transcendCount`，仅 `prestigeCount` 在膨胀清零。故反熵倍率与 Sprint 6 协同所依赖的精通/维度数据基础干净，**无需前置修**。`design/p0-consistency-review.md` 中 #4 描述的 `1 + state.prestigeCount * 0.2` 为陈旧口径，与当前代码不符——本草案 §5.6 原列"待查"属文档滞后，此处更正。**剩余待裁决为上述 1–5 项。**

## 6. 红线与约束（继承）

- **数字印记硬上限 14**：仅 5 次超越里程碑(5/10/25/50/100)+9 档案成就首解；S6 C **不增来源**。
- **量级里程碑不发放印记/永久生产乘数**（R1）；S6 协同不得变相复制该奖励。
- **persona D(s) ≤ 0.25**，单一有界尾部，不堆叠、不进 L2 机制。
- **支柱一**：禁纯线性倍率通胀；新深度须策略/机制/记录驱动。
- **复用优先**：优先扩展 Dimension/Multiplier/Codex/Skin，不平行新系统。
- 新增字段须纳入 `Serializer` 与 `save.ts`（跨端兼容）。

## 7. 建议的首个切片（vertical slice）

单维配对验证"精通→协同"乐趣，全程**机制层、零新乘源**：
- 选 **Dim-1(质数)+Dim-3(反熵)** 为试点；
- 两者 mastery 均≥L3 → 解锁 1 条协同 perk（机制例："反熵维度下质数 ×3 仍生效"，或"Prestige 后保留质数倍率窗口"）；同时落地这两维的 `DIMENSION_MASTERY_REWARDS` 实际化（机制型优先）；
- 验收：玩家是否感到"我在养一个 build"、是否存在有意义取舍（专精 vs 铺开）、是否未触发通胀。通过→扩展到全部 10 组配对/三元与剩余 3 维精通。

---

*草案结束。主理人拍板后，可针对 Must ②③ 产出逐系统 GDD（八节）。*
