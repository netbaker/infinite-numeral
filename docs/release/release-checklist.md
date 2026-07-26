# 发布清单（Release Checklist）·《无限数域》Android 首发

> **范围**：本次发布**仅 Android**（用户已拍板）。目标平台 = Android 7.0+（minSdk 24）。
> **形态**：公开 Beta / 软发布（Soft Launch），对齐 QA 门控报告结论（"可以发布，但建议以公测/Beta 形式推出"）。
> **角色缩写**：RL=路远行(release-polish/发布负责人)，ENG=eng-polish，QA=qa-polish，ART=art-polish，LEAD=主理人(游承峰)。
> **门控原则**：任何标记 ⛔ 的步骤未完成 → 不得进入下一阶段；正式发布签字须 LEAD 人工审批。

---

## 阶段 0 · 发布前准备（Pre-release）

| # | 任务 | 负责人 | 命令/动作 | 产出 | 门控 |
|---|------|--------|-----------|------|------|
| P0-1 | 确认发布版本号与 `versionCode` | LEAD + RL | 见 `version-strategy.md`，在 `android/app/build.gradle` 写入 `versionName`/`versionCode` | 单一版本真相源 | ⛔ 未定版本号不得构建 |
| P0-2 | 准备 GitHub Secrets（签名密钥材料） | LEAD（密钥归属人） | 见 `signing-and-release-ci.md` §A，将 `KEYSTORE_BASE64`/`KEY_ALIAS`/`KEY_PASSWORD`/`KEYSTORE_PASSWORD` 存入仓库 Secrets | 4 个 Secret 就位 | ⛔ 缺失任一 = 阻塞 |
| P0-3 | 确认"静音发布"预期 | LEAD | 确认本次为**零音频**发布（audio-polish 已确认策略文档，无回归风险） | 决策记录 | 非阻塞（确认即可） |
| P0-4 | 视觉 P0 债（C1）纳入 backlog | LEAD + ART | 将 300+ 硬编码色板 / 无 `prefers-reduced-motion` / 无 ARIA 列入后续 fast-follow | backlog 条目 | 非阻塞 |

---

## 阶段 1 · 构建前检查（Pre-build Gate）

| # | 任务 | 负责人 | 命令/动作 | 产出 | 门控 |
|---|------|--------|-----------|------|------|
| B1 | 自动化测试全绿 | ENG + QA | `npm test` | 316 passed / 0 failed（基线）；`vue-tsc --noEmit` 0 errors | ⛔ |
| B2 | Web 构建通过 | ENG | `npm run build` | `dist/` 产物 | ⛔ |
| B3 | 准备玩家发行说明 | RL | 维护 `docs/release/changelog.md`（已就绪，作为 GitHub Release 正文） | changelog.md | 非阻塞（建议） |
| B4 | 确认 `build.gradle` 版本号已同步 | ENG | 核对 `versionName`/`versionCode` 与 P0-1 决策一致 | 版本号一致 | ⛔ |
| B5 | 确认 CI Debug 流程仍绿（对照基线） | ENG | 推送 master 触发 `build-apk.yml`，或本地 `npm ci && npm run build && npm test` | Debug APK  artifact | 非阻塞（保险） |

> 注：`build-apk.yml`（ENG 加固版）已含 `npm test` 门禁 + Gradle 缓存，**不改动**。

---

## 阶段 2 · 签名准备（Signing Prep）

| # | 任务 | 负责人 | 命令/动作 | 产出 | 门控 |
|---|------|--------|-----------|------|------|
| S1 | 本地生成 release keystore | LEAD | 见 `signing-and-release-ci.md` §A 命令（**仅在本地执行，绝不进仓库**） | `release-keystore.jks` + 离线备份 | ⛔ |
| S2 | 将 keystore 编码进 GitHub Secret | LEAD | `base64 -w0 release-keystore.jks` → 填入 `KEYSTORE_BASE64` | Secret 就位 | ⛔ |
| S3 | 确认 4 个 Secret 全部存在 | RL | 仓库 Settings → Secrets → 确认 `KEYSTORE_BASE64`/`KEY_ALIAS`/`KEY_PASSWORD`/`KEYSTORE_PASSWORD` | 校验通过 | ⛔ |
| S4 | （已应用）`android/.gitignore` 已取消注释 `*.jks`/`*.keystore` | RL | 取消注释 `android/.gitignore` 中 `*.jks`/`*.keystore` 行 | 防误提交 | 非阻塞（已完成） |

> ⚠️ **密钥不可逆警告**：Android 应用签名密钥一旦丢失，将无法对同一 `applicationId`（`com.infinum.game`）发布更新（除非未来启用 Google Play App Signing 上传密钥分离）。请 LEAD 对 keystore + 密码做**离线加密备份**（密码管理器 / 加密盘）。

---

## 阶段 3 · 构建（Build → Signed Artifact）

| # | 任务 | 负责人 | 命令/动作 | 产出 | 门控 |
|---|------|--------|-----------|------|------|
| C1 | 触发 Release 工作流 | RL / LEAD | 二选一：① `git tag vX.Y.Z && git push origin vX.Y.Z`；② GitHub Actions → `Release Android (Signed)` → `Run workflow` | CI run 启动 | ⛔ |
| C2 | CI 自检 | （自动） | `npm ci` → `npm run build` → `npm test` → decode keystore → `cap sync` → `assembleRelease`（注入签名） | 构建日志 | ⛔（任一步失败即红） |
| C3 | 取回签名产物 | RL | CI Artifacts：`infinite-numeral-android-release-apk`（APK）；可选 `…-aab` | 签名 APK/AAB | ⛔ |
| C4 | （打 tag 时自动）创建 GitHub Release | （自动） | `softprops/action-gh-release`，标题=`tag`，正文=`docs/release/changelog.md`，附件=签名 APK | GitHub Release 页 | 非阻塞 |

> 工作流文件：`.github/workflows/release-android.yml`（由 RL 创建，保留 `build-apk.yml` Debug 流程不动）。
> 构建形态对照：Debug（现存，`build-apk.yml`，无签名，仅 CI artifact）vs Release（新增，签名，可分发）。

---

## 阶段 4 · 内测分发（Internal Beta / Dogfood）

| # | 任务 | 负责人 | 命令/动作 | 产出 | 门控 |
|---|------|--------|-----------|------|------|
| T1 | 真机安装（覆盖安装校验） | QA + LEAD | 10–20 位核心玩家；`adb install -r app-release.apk` 或侧载 | 安装成功率 | ⛔ |
| T2 | 冒烟测试 | QA | 安装/启动、存档存读、离线收益、三类重置（坍缩/膨胀/超越）、维度切换与精通、成就点亮、图谱 Codex、皮肤/主题切换 | 冒烟报告 | ⛔ |
| T3 | 存档兼容性 | QA | 用旧版（Debug）存档覆盖安装新版，确认进度保留、无 NaN/崩溃 | 兼容性结论 | ⛔ |
| T4 | 收集反馈 | RL + QA | 平衡性、新手引导、性能（中低端机）、UI 布局（小屏） | 反馈汇总 | 非阻塞 |

---

## 阶段 5 · 公开分发上线（Public Distribution）

| # | 任务 | 负责人 | 命令/动作 | 产出 | 门控 |
|---|------|--------|-----------|------|------|
| D1 | 发布决策签字 | LEAD | 依据阶段 4 结论，人工拍板是否全量 | 放行/暂缓 | ⛔（人工审批） |
| D2 | 分发渠道 | RL | 本次为侧载/内部分发（非 Play 商店）：GitHub Release 附件 + 社群分享链接；未来可走 Play 内部测试轨道（需 AAB，见 C3 可选产物） | 分发链接 | 非阻塞 |
| D3 | 发布公告 | RL + LEAD | 社群/更新日志，引用 `changelog.md`；明确"Beta / 仅 Android / 静音" | 公告 | 非阻塞 |
| D4 | （未来）Play 商店上架 | LEAD | 若转正式商店：补齐商店素材、隐私政策、内容分级；启用 Play App Signing | — | 非本次 |

---

## 阶段 6 · 上线后监控（Post-launch Monitoring）

| # | 任务 | 负责人 | 命令/动作 | 产出 | 门控 |
|---|------|--------|-----------|------|------|
| M1 | 崩溃/异常收集 | RL + ENG | 当前**无内置遥测**；依赖用户反馈 + 手动复现。建议 fast-follow 接入轻量崩溃上报（如 Firebase Crashlytics，需评估隐私） | 问题清单 | 非阻塞 |
| M2 | 存档兼容监控 | QA | 关注"升级后旧档异常/进度丢失"反馈 | 兼容性跟踪 | ⛔（出现即评估回滚） |
| M3 | 性能/发热（中低端机） | QA + ENG | 真机帧率、长时运行稳定性（Phase 6 已验证热路径 −71%） | 性能报告 | 非阻塞 |
| M4 | 社区/反馈响应 | RL | 论坛/社群答疑、收集平衡性数据 | 反馈闭环 | 非阻塞 |
| M5 | 热修就绪 | RL + ENG | 出现 P0 即走 `rollback-plan.md` 热修分支流程（详见该文档） | 热修产出 | 非阻塞 |

---

## 发布门控汇总（Go / No-Go）

| 条件 | 状态 | 归属 |
|------|------|------|
| 测试/类型/构建全绿（B1–B2） | ⏳ 待触发 | ENG/QA |
| 版本号与 `build.gradle` 一致（P0-1/B4） | ⏳ 待定 | LEAD/ENG |
| 4 个签名 Secret 就位（S2–S3） | ⛔ **阻塞** | LEAD |
| 静音发布确认（P0-3） | ⏳ 待确认 | LEAD |
| 真机冒烟 + 存档兼容通过（T2–T3） | ⏳ 待内测 | QA |
| 发布签字（D1） | ⛔ **人工审批** | LEAD |

> **当前唯一硬阻塞项 = 签名密钥材料（LEAD 提供）**。其余在 LEAD 拍板版本号后即可并行推进。
