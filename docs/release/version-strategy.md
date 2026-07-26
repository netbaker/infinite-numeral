# 版本与构建策略（Version & Build Strategy）·《无限数域》Android 首发

> 作者：路远行（release-polish）。配套：`release-checklist.md`、`signing-and-release-ci.md`、`rollback-plan.md`。

---

## 1. 现状审计（接地气：基于真实文件）

| 来源 | 当前值 | 说明 |
|------|--------|------|
| `package.json` → `version` | `0.1.0` | 业务 SemVer，长期未随功能演进 bump |
| `android/app/build.gradle` → `versionName` | `"2.0"` | 本地开发遗留，与 `package.json` **不一致** |
| `android/app/build.gradle` → `versionCode` | `2` | 同上 |
| git tag | `v2.0.0` → 指向 `a4725ee`（**旧提交，非 master HEAD `2f5e93d`**） | 陈旧 tag，不代表当前代码 |
| `docs/CHANGELOG.md` | 视 `v2.0.0` 为"首个正式发布版本" | 内部叙事，与代码实际状态脱节 |
| `src/core/Serializer.ts` → `CURRENT_VERSION` | `4` | **存档 schema 版本**（独立于 SemVer，见 §4） |

**结论**：版本真相源不统一。本次发布须先确立**单一版本真相源**，并以一个**全新、不与陈旧 `v2.0.0` tag 冲突**的版本号对外发布。

---

## 2. SemVer 策略

遵循 [SemVer 2.0.0](https://semver.org/lang/zh-CN/)：`MAJOR.MINOR.PATCH[-prerelease]`。

| 位 | 规则 |
|----|------|
| MAJOR | 不兼容的存档/玩法断代（如移除核心系统、破坏旧档）；当前不会 bump |
| MINOR | 新增可见内容/系统（维度、基因、图谱、人格等）；向后兼容 |
| PATCH | 缺陷修复、性能、稳定性（热修走 PATCH，见 `rollback-plan.md`） |
| prerelease | `-beta.N` 表示 Beta/软发布阶段；正式稳定后去掉后缀 |

**存档兼容性约束**：版本号变化**不强制** bump 存档 schema。存档兼容由 `Serializer.CURRENT_VERSION` + `?? default` 容错 + `*System.initialize()` 填充保证（见 `rollback-plan.md` §3），与 SemVer 解耦。

---

## 3. 本次发布建议版本号

### 推荐（默认）：`1.0.0-beta.1`

**理由**：
1. **首次公开分发**：此前仅有 CI Debug APK（内部分发），本次是第一个面向玩家的可安装 Release。
2. **QA 门控明确建议 Beta/软发布**："可以发布，但建议以公测/Beta 形式推出"；且存在真实 P0 关注项（视觉 C1 / 数值平衡未经验证 / 静音发布），Beta 标签对玩家诚实。
3. **避开陈旧 `v2.0.0` tag**：该 tag 指向旧代码，复用会造成版本混乱；`1.0.0-beta.1` 是干净的新起点。
4. **成熟度匹配**：内容深度已达正式版量级（三层重置 + 维度 + 基因 + 图谱 + 人格），给 `1.0.0` 主线而非 `0.x` 低估。

### 备选方案（供 LEAD 决策）

| 方案 | 版本号 | 适用场景 | 风险 |
|------|--------|----------|------|
| A（推荐） | `1.0.0-beta.1` | 首次公开 + Beta 软发布 | 无；最诚实 |
| B | `0.2.0` | 保守，仅从 `0.1.0` 小幅 bump | 低估内容深度，玩家可能困惑"为何 0.2 却有维度/基因" |
| C | `2.1.0` | 延续内部 "v2.0" 叙事 | 须跳过陈旧 `v2.0.0` tag（避免复用）；与团队外部认知需对齐 |

> ⚠️ **最终版本号是人工决策（LEAD 签字）**。以上为发布负责人建议，不在本角色单方面拍板。确定后回填 `P0-1` / `B4` 并同步 `build.gradle`。

---

## 4. Android `versionName` / `versionCode` 规则

### `versionName`
- 等于对外 SemVer 字符串，如 `1.0.0-beta.1`。
- 写入 `android/app/build.gradle` 的 `defaultConfig.versionName`（手动 bump，见 `release-checklist.md` P0-1/B4）。
- 仅展示用，可含 `-beta.N` 后缀。

### `versionCode`（整数，单调递增，永不复用）
推荐编码公式（覆盖 `0.x → 1.x → 2.x` 全区间有序）：

```
versionCode = MAJOR * 1_000_000 + MINOR * 10_000 + PATCH * 100 + betaOffset
betaOffset ∈ [0, 99]：正式版 = 0；beta.N = N（1..99）
```

| 版本 | 计算 | versionCode |
|------|------|-------------|
| `1.0.0-beta.1` | 1*1e6 + 0 + 0 + 1 | **1000001** |
| `1.0.0-beta.2` | 1*1e6 + 0 + 0 + 2 | 1000002 |
| `1.0.0` | 1*1e6 + 0 + 0 + 0 | 1000000 |
| `0.2.0` | 0 + 2*1e4 + 0 + 0 | 20000 |
| `2.1.0` | 2*1e6 + 1*1e4 + 0 + 0 | 2010000 |

- **Play 商店要求**：同一 `applicationId` 的 `versionCode` 必须严格递增且全局唯一。公式保证跨主版本仍有序。
- **侧载场景**：不强制，但保持单调递增是良好卫生。
- 当前 `build.gradle` 的 `versionCode 2` 为遗留值，发布前须按公式重设。

> 简化备选：若团队不愿用公式，可采用"每次发布人工 +1"的单调整数（如从 `1000001` 起）。公式仅作推荐规范。

---

## 5. 构建产物形态（Debug vs Release）

| 维度 | Debug（现存 `build-apk.yml`） | Release（新增 `release-android.yml`） |
|------|-------------------------------|----------------------------------------|
| 触发 | push master / workflow_dispatch | push tag `v*` / workflow_dispatch |
| 签名 | `debug.keystore`（已提交，Google 共享调试密钥逻辑） | 自有 release keystore（GitHub Secrets 注入，绝不进仓库） |
| `minifyEnabled` | false | false（当前 `build.gradle`；未来可开 R8，需先验证 Dex 与 Capacitor 兼容） |
| 产物 | `app-debug.apk`（CI artifact，30 天） | `app-release.apk`（签名，artifact 90 天）+ 可选 `app-release.aab` |
| 分发 | 仅内部 | 内测 / 公开 Beta /（未来）Play |
| 改动 | **不改动** | 由 RL 新增工作流 |

> 注：`build.gradle` 的 `release` buildType 当前**未配置 signingConfig**（见 `signing-and-release-ci.md`）。本方案通过 AGP 的 `android.injected.signing.*` 命令行参数在 CI 注入签名，**无需修改 `build.gradle`**，保持 Debug 流程零侵入。

---

## 6. 发布节奏建议（与 SemVer 配合）

1. `1.0.0-beta.1` → 内测 + 公开 Beta（本发）。
2. 收集反馈，修 P0/P1 → `1.0.0-beta.2` …（betaOffset 递增）。
3. 稳定后去 suffix → `1.0.0` 正式。
4. 后续内容系统 → `1.1.0` / `1.2.0`；缺陷修复 → `1.0.x` 热修。

---

## 7. 待 LEAD 决策项（阻塞/签字）

- [ ] ⛔ 最终版本号（推荐 `1.0.0-beta.1`，或备选 B/C）
- [ ] ⛔ 回填 `build.gradle` 的 `versionName`/`versionCode`（按 §4 公式）
- [ ] 是否启用 Play App Signing（影响未来密钥策略，见 `signing-and-release-ci.md` §A）
