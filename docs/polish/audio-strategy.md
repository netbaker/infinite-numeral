# 《无限数域》音频实现策略与路线图（Phase 6 音频打磨）

> 文档角色：音频总监（阮和鸣）交付的策略文档
> 适用范围：Vue3 + TS + Pinia + Capacitor + Electron 增量游戏 `infinite_numeral`
> 阶段目标：Phase 6 音频打磨
> 本文档性质：**纯策略文档**。本阶段**不新增任何音频文件、不新增音频实现代码、不触发任何 git commit**。所有落地锚点均来自对仓库真实代码的 Grep / Read 核查。

---

## 0. 核查结论（先确认「确实无音频」）

在执行任何设计前，已对全仓做音频实现核查，结论与 Phase 0 诊断一致：**项目内零音频实现、零音频资产**。

| 核查项 | 命令 / 范围 | 结果 |
|--------|-------------|------|
| 代码中音频 API 调用 | Grep `Audio\|Howl\|new Audio\|\.play\(\|AudioContext\|WebAudio\|soundManager\|SoundManager\|playSound` 于 `src/` | **0 命中**（仅在 `node_modules` 依赖中出现，与应用源码无关） |
| 音频资产文件 | Glob `**/*.{mp3,wav,ogg,flac,m4a,aac}` 于仓库根 | **0 文件**（无 mp3/wav/ogg/flac/m4a，亦无 aac） |
| 既有静音/音量设置 | Grep `volume\|mute\|soundEnabled\|audio` 于 `src/` | **0 命中**（`SettingsModal.vue` 存在但无音频相关开关） |
| 既有音频模块/目录 | 目录巡查 `src/`、`assets/`、`public/` | 无 `audio/` 目录、无音频 composable、无音频 store |

**结论**：当前所有音频事件的状态统一为「**无音频（无调用、无资产）**」。下文事件清单中每条均标注此状态，并给出建议触发强度，作为未来实现的规格基线。

> 注：本游戏存在中心化叙事通道 `gameStore.showNarration`（文本 Toast）与中心化成就可以 `gameStore.pushAchievement`（队列 Toast）。这两处是接入音频的天然「总闸」，详见 §2 与 §4。

---

## 1. 音频层定义

增量游戏（idle / incremental）的听觉体验应由「**高频微反馈**」（UI / 购买）与「**低频重反馈**」（纪元叙事 / 成就 / 重置）分层构成，避免高频操作淹没关键节点。建议划分为 6 层：

### 层 1 · UI 反馈音（UI Feedback）
- 范围：按钮点击、开关切换、面板开合、购买成功/失败、批量购买。
- 特征：极短（40–120ms）、低动态、可高频堆叠但需做密度抑制（见 §3.5）。
- 听感：清脆、中性、略带「数字/晶体」质感（适合用 WebAudio 合成短促正弦+轻噪声）。

### 层 2 · 维度切换 / 精通升级反馈（Dimension）
- 范围：维度切换、维度解锁、维度晶体合成、精通等级提升（`tickMastery` 触发等级跃迁时）。
- 特征：中短（150–400ms）、带「空间位移/打开」感的 whoosh 或扫频；精通升级需有「成长/点亮」的正向激励。
- 听感：从低到高的频率滑动，呼应「维度」主题。

### 层 3 · 纪元变革 / 知识叙事音（Narrative）
- 范围：通过 `showNarration` 播出的纪元变革、知识（knowledge）解锁、数值量级里程碑叙事等文本。
- 特征：非节奏性、氛围性「垫音」（bed），应与 BGM 总线分离（见 §3.3）以免与播放音乐打架。
- 听感：空灵 pad / 弦乐长音 / 轻微合唱，按叙事「种类」区分音色（纪元 vs 知识 vs 奖励）。

### 层 4 · 成就解锁 Sting（Achievement）
- 范围：任何经 `pushAchievement` 弹出的成就（含 `group:'dimension'` 维度挑战里程碑，见 §5 GDD 锚定）。
- 特征：明亮、标志性、短促（250–500ms）的「叮/铛」上行琶音；需与 UI 点击明显区分（音 higher、更亮）。
- 听感：铃铛 / 水晶 / 上行三音，给予「收集正反馈」。

### 层 5 · 维度挑战 / 里程碑音（Milestone）
- 子层 5a · 维度挑战里程碑：维度精通 Lv 达成 / 限制条件下精通（Killer 挑战），经 `AchievementSystem.checkAchievements` → `pushAchievement(group:'dimension')` 路由。
- 子层 5b · 数值量级里程碑：首次跨越 10^N（如 10^6/10^9/10^12…），经 `triggeredNumberMilestones` 幂等集触发。
- 特征：比层 4 更「厚重/仪式感」，带低频铺底；量级里程碑随数量级升高可递进加厚（10^6 轻、10^23 宏大）。
- 听感：铜管/合唱短句 + 低频 pulse，强调「跨越阈值」。

### 层 6 · 背景音乐 BGM（Music）
- 基调：深邃、循环、低饱和度的氛围电子 / 暗潮 ambient，贴合「无限数域 / 维度 / 熵」的科幻哲学基调。
- 分层：
  - `bgm.base`：常驻底床（idle / 早期）。
  - `bgm.deep`：随进度叠加的中高频纹理层（高数量级 / 高维度深度时渐入）。
  - `bgm.epoch`：纪元变革时的短时音乐 sting / 过渡段。
- 动态：由游戏进度（数量级 log10、当前维度、重置次数）驱动层的淡入淡出，而非切歌。

---

## 2. 音频事件清单（落地锚点）

> 约定：事件 id 命名空间 `sfx.*`（音效）、`narr.*`（叙事垫音）、`bgm.*`（音乐）。「触发强度」采用 1–5 级（5 最重）；「频次」标注触发密度，用于密度抑制策略。
> 所有「当前状态」均为：**无音频（无调用、无资产）**，已核查确认。

### 2.1 UI 反馈音（层 1）

| event id | 触发点（真实代码锚点） | 当前状态 | 建议强度 | 频次 |
|----------|------------------------|----------|----------|------|
| `sfx.ui.click` | `PulseButton.vue:26 handleClick` → `:40 emit('click-value')`；下游 `CenterPanel.vue:6 onPulseClickValue`（主数字点击） | 无音频 | 1 | 极高（每点） |
| `sfx.ui.button` | 各类面板按钮 `@click`（如 `BottomBar.vue:58-74` 各开合按钮、`SettingsModal.vue`、`*Modal.vue` 关闭键） | 无音频 | 1 | 高 |
| `sfx.purchase.producer` | `gameStore.buyProducer` `gameStore.ts:898` | 无音频 | 2 | 高 |
| `sfx.purchase.producer_bulk` | `gameStore.buyProducerBulk` `gameStore.ts:915` | 无音频 | 2 | 中 |
| `sfx.purchase.upgrade` | `gameStore.buyUpgrade` `gameStore.ts:954` | 无音频 | 2 | 高 |
| `sfx.purchase.stardust` | `gameStore.buyStardustUpgrade` `gameStore.ts:1003` | 无音频 | 2 | 中 |
| `sfx.purchase.tech` | `gameStore.buyTechNode` `gameStore.ts:1086` | 无音频 | 2 | 中 |
| `sfx.purchase.crystal` | `gameStore.buyCrystalUpgrade` `gameStore.ts:1501`（调用 `dimensionSystem.buyCrystalUpgrade` `DimensionSystem.ts:496`）；UI 调用点 `App.vue:141` | 无音频 | 2 | 中 |
| `sfx.purchase.transcend_up` | `gameStore.buyTranscendUpgrade` `gameStore.ts:1358` | 无音频 | 2 | 低 |
| `sfx.purchase.expansion_up` | `gameStore.buyExpansionUpgrade` `gameStore.ts:1394` | 无音频 | 2 | 低 |
| `sfx.purchase.barrier` | `gameStore.buyEntropyBarrier` `gameStore.ts:1472` | 无音频 | 2 | 低 |
| `sfx.purchase.fail` | 上述购买函数返回 `false`（资源不足）分支 | 无音频 | 1 | 中 |
| `sfx.ui.toggle` | 各类开关/切换 UI（皮肤、主题、人格激活等涉及 `showNarration` 的切换类操作） | 无音频 | 1 | 中 |

### 2.2 维度切换 / 精通升级（层 2）

| event id | 触发点（真实代码锚点） | 当前状态 | 建议强度 | 频次 |
|----------|------------------------|----------|----------|------|
| `sfx.dimension.switch` | `gameStore.switchDimension` `gameStore.ts:1736`（成功分支） | 无音频 | 3 | 中 |
| `sfx.dimension.unlock` | `gameStore.unlockDimension` `gameStore.ts:1770`（成功分支）→ `showNarration('🗺️ 维度 … 已解锁！')` | 无音频 | 3 | 低 |
| `sfx.dimension.synth` | `gameStore.synthesizeCrystal` `gameStore.ts:1788` → `showNarration('💎 合成成功！')` | 无音频 | 3 | 低 |
| `sfx.dimension.mastery_up` | `dimensionSystem.tickMastery` `DimensionSystem.ts:101`（每 tick 调用，`gameStore.ts:641`）；**仅在 `getMasteryLevel` 提升时触发**，非每 tick | 无音频 | 3 | 低 |

### 2.3 纪元变革 / 知识叙事（层 3）

| event id | 触发点（真实代码锚点） | 当前状态 | 建议强度 | 频次 |
|----------|------------------------|----------|----------|------|
| `narr.epoch` | `gameStore.showNarration` `gameStore.ts:288` 播出的「纪元变革」类叙事（如熵崩溃 `:628`、知识解锁 `:298` 等） | 无音频 | 4 | 低 |
| `narr.knowledge` | `showNarration` 中 `category:'knowledge'` 路径（`codexSystem.onNarrativeTriggered` 命中 knowledge，`:292-300`） | 无音频 | 3 | 低 |
| `narr.reward` | `showNarration` 播出的奖励/解锁类叙事（皮肤 `:1932`、主题 `:1958`、人格 `:1310/:1328`、印记 `:1289` 等） | 无音频 | 2 | 低 |

> 注：`showNarration` 为统一文本通道，未来接入时建议为其增加「叙事种类」分类（纪元/知识/奖励/通用），以便音频层区分音色——该分类属**前向兼容的 UI 参数**，非本次音频代码，可在未来实现阶段一并处理。

### 2.4 成就解锁 Sting（层 4）

| event id | 触发点（真实代码锚点） | 当前状态 | 建议强度 | 频次 |
|----------|------------------------|----------|----------|------|
| `sfx.achievement.unlock` | `gameStore.pushAchievement` `gameStore.ts:305`（成就入队即触发）；实际弹出经 `drainAchievementQueue` `:312` | 无音频 | 4 | 低–中 |

### 2.5 维度挑战 / 里程碑（层 5）

| event id | 触发点（真实代码锚点） | 当前状态 | 建议强度 | 频次 |
|----------|------------------------|----------|----------|------|
| `sfx.milestone.challenge` | 维度挑战/精通里程碑：经 `AchievementSystem.checkAchievements` `AchievementSystem.ts:19`（每 tick，`gameStore.ts:646/:763`）→ `pushAchievement(group:'dimension')`。GDD 锚定：`design/sprint6/gdd/dimension-challenge-milestones.md`（13 条 `group:'dimension'` 成就） | 无音频 | 4 | 低 |
| `sfx.challenge.claim` | `gameStore.claimChallengeReward` `gameStore.ts:1652`（挑战奖励领取） | 无音频 | 3 | 低 |
| `sfx.milestone.magnitude` | 数值量级里程碑（10^N）：`triggeredNumberMilestones` 幂等集 `gameStore.ts:782-784`；以及 `milestoneSystem.checkMilestones` `gameStore.ts:1193`（`MilestoneSystem.ts:26`）。GDD 锚定：`design/sprint5/gdd/magnitude-milestone.md`（`MAGNITUDE_MILESTONE_DEFS`，log10=6/9/12/18/23…） | 无音频 | 4→5（随量级递增） | 极低（每量级一次） |

### 2.6 三类重置反馈（层 4/5 重反馈）

| event id | 触发点（真实代码锚点） | 当前状态 | 建议强度 | 频次 |
|----------|------------------------|----------|----------|------|
| `sfx.reset.prestige` | `gameStore.executePrestige` `gameStore.ts:1041`（委托 `prestigeSystem.executePrestige`） | 无音频 | 5 | 极低 |
| `sfx.reset.expansion` | `gameStore.executeExpansion` `gameStore.ts:1113`（委托 `expansionSystem.executeExpansion` `ExpansionSystem.ts:63`）；UI `CenterPanel.vue:102` | 无音频 | 5 | 极低 |
| `sfx.reset.transcend` | `gameStore.executeTranscend` `gameStore.ts:1150`（委托 `transcendSystem.executeTranscend` `TranscendSystem.ts:56`）；UI `CenterPanel.vue:107` | 无音频 | 5 | 极低 |

### 2.7 背景音乐 BGM（层 6）

| event id | 触发点（真实代码锚点） | 当前状态 | 建议强度 | 频次 |
|----------|------------------------|----------|----------|------|
| `bgm.base` | 游戏主循环启动后常驻；循环驱动 `core/GameLoop.ts` / `composables/useGameLoop.ts` 与 `gameStore` 进度状态 | 无音频 | — | 常驻循环 |
| `bgm.deep` | 由进度阈值驱动叠加（数量级 log10、当前维度深度 `currentDimensionId`、`gameStore.ts:1748`）；在层 6 动态混入 | 无音频 | — | 条件循环 |
| `bgm.epoch` | 纪元变革过渡段，与 `narr.epoch` 同步触发 | 无音频 | — | 事件式 |

---

## 3. 实现策略

### 3.1 WebAudio vs Howler.js 取舍

| 维度 | WebAudio API | Howler.js |
|------|--------------|-----------|
| 控制粒度 | 高：振荡器/噪声/包络/滤波器/混响/声像，支持**程序化合成**与实时路由 | 中：基于 WebAudio/HTML5Audio 封装，擅长样本播放、sprites、自动解锁 |
| 总线/混音 | 原生 `GainNode` 总线树，精细 ducking | 仅全局 + 单音音量，总线需自行拼装 |
| 程序化 P0 音效 | 天然支持（无需素材） | 不支持，需先有样本 |
| BGM 分层动态 | 原生多源混合、交叉淡入 | 可行但较繁琐 |
| 上手成本 | 较高（需自写封装） | 低 |

**推荐**：以 **WebAudio 为核心**自封装 `AudioBus`（见 §4），P0 音效全部程序化合成、BGM 做分层混合；**Howler.js 仅作为备选**——若团队希望快速播放样本且接受总线控制较弱，可用 Howler 承载样本型 SFX/BGM，但仍建议自管总线。本游戏 P0 强烈依赖程序化合成（无素材即可出声），WebAudio 是唯一契合方案。

### 3.2 与 Capacitor / Electron 的兼容性

- **Electron（Chromium）**：WebAudio 完整支持，无平台限制。注意浏览器自动播放策略——`AudioContext` 须在**首次用户手势**（pointerdown/click）后 `resume()`。窗口失焦可选挂起以省资源。
- **Capacitor · Android（WebView）**：WebAudio 支持良好；自动播放策略同 Chromium，手势解锁即可。
- **Capacitor · iOS（WKWebView）**：
  - WebAudio 可用，但 `AudioContext` 同样须手势后创建/恢复。
  - iOS **静音开关（铃声/静音）** 默认会让 WebAudio 走静音通道；若要求「尊重系统静音」则无需处理，若要求 BGM 始终出声需引入原生音频插件（如 Capacitor Community Audio / 自定义原生 `AVAudioSession`）。
  - 后台/来电中断：WKWebView 音频会被系统中断，需监听并 `suspend/resume`。
  - 结论：本阶段（no-op）无需处理；未来实现时把「手势解锁 `resume()`」作为 `AudioBus.resume()` 的标准动作，iOS 特殊需求再评估原生插件。

### 3.3 音频总线 / 混音结构

建议三层总线（WebAudio `GainNode` 树），与游戏设置解耦：

```
master (GainNode)
 ├─ sfxBus      → UI/购买/维度/成就/里程碑/重置 等一次性音效
 ├─ narrBus     → 叙事垫音（与 BGM 分离，便于 ducking）
 └─ bgmBus      → 背景音乐（base/deep/epoch 子层再细分 GainNode）
```

- 各总线独立音量 + `master` 总音量，均**持久化到存档**（`save.ts` 状态）。
- **Ducking（降噪/避掩）**：叙事/纪元触发时 `bgmBus` 短时衰减（如 -6dB，0.3s 恢复），避免音乐压过叙事。
- 节点复用：一次性 SFX 用短 `AudioBufferSourceNode`，播完即断开；避免节点堆积。

### 3.4 懒加载与内存

- 当前零资产，未来接入时也**不预载全部**：`decodeAudioData` 按需解码，样本缓存到 `Map<eventId, AudioBuffer>`。
- **并发语音上限**：SFX 同时 ≤ 16 路；BGM 子层 ≤ 4 路。超出按优先级抢占低优先。
- **格式**：Electron（Chromium）可用 ogg/opus；Capacitor iOS（Safari 内核）`decodeAudioData` 对 ogg 支持差，建议**通用采用 mp3**，或按平台提供双格式。BGM 用短循环 buffer 或流式，避免整曲解码占内存。
- 内存预算参考：解码后 SFX 合计 < ~5MB；BGM 循环 buffer 单段 < ~1MB。

### 3.5 静音 / 降噪开关

- 在既有 `SettingsModal.vue`（存在，无音频项）新增：`sfxEnabled`、`bgmEnabled` 开关 + `master/sfx/bgm` 音量滑块，持久化。
- `BottomBar.vue` 可加一个快捷静音键（复用现有按钮位）。
- 「降噪」双义处理：
  1. **Ducking**：叙事/纪元时压低 BGM（见 §3.3）。
  2. **密度抑制**：UI 点击等高频音效做最小间隔节流（如 30ms 内同类只播一次）与轻声低通，避免密集操作刺耳。
- 提供「宁静模式（Calm）」：一键降低 SFX 密度与高频，适配长时间放置游玩。

---

## 4. 过渡方案（先无音频，预留零改动接口）

目标：**当前不加任何音频代码/资产，但预埋接口，使未来接入时游戏逻辑零修改**。核心是一个 `AudioBus` 抽象 + `NoOpAudioBus` 实现。

### 4.1 接口契约示意（非本次落地代码，仅供实现规格参考）

```
interface AudioBus {
  resume(): void;                              // 首次用户手势后解锁 AudioContext
  play(eventId: string, opts?: { gain?: number; rate?: number }): void;
  narrate(kind: 'epoch'|'knowledge'|'reward'|'generic', text: string): void;
  startBgm(layer: 'base'|'deep'|'epoch'): void;
  stopBgm(): void;
  setVolume(bus: 'master'|'sfx'|'narr'|'bgm', v: number): void;
  setMuted(muted: boolean): void;
}
class NoOpAudioBus implements AudioBus { /* 全部方法空实现（dev 可 console.debug）*/ }
```

### 4.2 预埋位置（零行为变更）

- 在 `gameStore` 注入一个 `audio: AudioBus`（默认 `NoOpAudioBus` 单例）。
- 在 §2 列出的每个锚点函数成功/触发分支追加一行 `audio.play('sfx.xxx')` / `audio.narrate(...)`。**因当前为 NoOp，调用无副作用、无资产、无回归**——这正是「未来零改动游戏逻辑」的关键：逻辑点已就位，仅替换实现。
- `resume()` 绑定到首个用户手势（如 `App.vue` 根容器的 `pointerdown`/首个 `PulseButton` 点击）。
- 进度驱动 BGM：在 `gameStore` 进度更新处（如 `currentDimensionId`、`number` 量级变化）调用 `audio.startBgm(...)`，NoOp 下无操作。

### 4.3 未来接入步骤（不在本阶段执行）

1. 实现 `WebAudioAudioBus`（或 Howler 封装）替换单例。
2. 填充 `eventId → 资产/合成参数` 映射表。
3. 在设置中接入音量/静音持久化。
4. 游戏逻辑**无需任何改动**。

---

## 5. 补资产优先级路线图

> 「程序化合成」= 用 WebAudio 振荡器/噪声实时生成，无需外部素材；「外部素材」= 需录制/采购音频文件。

### P0（程序化合成 · 无需外部素材，优先级最高）
- `sfx.ui.click` / `sfx.ui.button` / `sfx.ui.toggle`
- `sfx.purchase.*`（producer/upgrade/stardust/tech/crystal/transcend_up/expansion_up/barrier/fail）
- `sfx.dimension.switch` / `sfx.dimension.unlock` / `sfx.dimension.synth` / `sfx.dimension.mastery_up`
- `sfx.achievement.unlock`
- `sfx.reset.prestige` / `sfx.reset.expansion` / `sfx.reset.transcend`
- `sfx.milestone.challenge` / `sfx.milestone.magnitude` / `sfx.challenge.claim`
- 说明：全部可用短促合成（正弦/三角 + 包络 + 轻噪声）实现，**本阶段零素材即可落地**，是「先有声音」的最小可行集。

### P1（程序化 + 轻样本混合）
- `narr.epoch` / `narr.knowledge` / `narr.reward`：建议用合成 pad 或简短样本垫音（可选轻样本增强质感）。
- `bgm.base`：可用程序化 ambient pad 循环，或 1 段短循环样本（mp3，<1MB）。
- `bgm.epoch`：纪元过渡短段，程序化或样本。

### P2（需外部素材 / 进阶）
- `bgm.deep` 分层纹理套件：建议外部素材（高质量循环层），按维度深度/数量级递增叠加。
- 精修版 SFX 包（更丰富泛音、随机变体池）。
- 可选 VO 叙事配音（如纪元旁白真人录音）、环境 room tone、移动端触感（haptics）同步。
- 说明：P2 依赖美术/音频外包或素材采购，不在程序化范围内。

---

## 6. 验收标准（如何判定「音频架构就绪」）

音频架构被视为就绪，当且仅当以下全部成立：

1. **接口就绪**：`AudioBus` 接口 + `NoOpAudioBus` 已实现，并在 §2 全部锚点（含 `buyCrystalUpgrade` / `checkAchievements` / `pushAchievement` / `showNarration` / `tickMastery` / `executePrestige-Expansion-Transcend` 及 UI/购买/里程碑等）完成调用预埋，**游戏逻辑零回归**。
2. **无资产可运行**：不引入任何音频文件时，游戏完整可玩、无报错（`NoOp` 安全）。
3. **设置闭环**：`sfxEnabled` / `bgmEnabled` + `master/sfx/bgm` 音量持久化，并在 `SettingsModal.vue` 可见可用。
4. **平台解锁**：`resume()` 在首次用户手势触发，Electron / Capacitor(Android/iOS) 均无自动播放阻塞。
5. **总线与混音**：`master/sfx/narr/bgm` 四级总线 GainNode 实现，叙事触发时 BGM ducking 生效。
6. **性能预算**：并发语音上限生效（SFX≤16、BGM≤4）；懒加载 + 解码缓存；内存处于 §3.4 预算内。
7. **事件覆盖**：§2 事件表中每个 `event id` 均有明确触发点 +（合成参数 或 资产映射），无悬空事件。
8. **未来零改动**：将 `NoOpAudioBus` 替换为真实实现后，**无需修改任何游戏逻辑代码**即可出声。

---

## 7. 关键结论摘要（供主理人决策）

1. **全仓确证无音频**：`src/` 内音频 API 零调用，仓库零音频文件，零静音/音量设置——与 Phase 0 诊断一致，本文档所有事件均基于真实代码锚点设计，非凭空设想。
2. **高价值锚点已锁定**：`showNarration`（叙事总闸）、`pushAchievement`（成就/维度挑战总闸）、`executePrestige/Expansion/Transcend`（三类重置）、`buyCrystalUpgrade` / `tickMastery` 等均存在且可精确预埋。
3. **推荐 WebAudio 核心自封装**：因 P0 强依赖程序化合成、BGM 需分层动态，WebAudio 优于 Howler；Howler 仅作样本播放备选。
4. **零改动预埋路径清晰**：`AudioBus` + `NoOpAudioBus` 可在不改游戏逻辑前提下预埋全部触发点，未来替换实现即出声。
5. **P0 全部可程序化合成、零素材**：UI/购买/维度/成就/重置/里程碑音效均无需外部素材即可落地，是性价比最高的首批音频；BGM 分层与 VO 等留作 P2 外部素材。
