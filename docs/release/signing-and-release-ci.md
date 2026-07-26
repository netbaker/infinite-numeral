# 签名与发布 CI 方案（Signing & Release CI）·《无限数域》Android

> 作者：路远行（release-polish）。**关键交付**。
> 配套工作流文件：`.github/workflows/release-android.yml`（由本角色直接创建）。
> 现存 Debug 工作流：`.github/workflows/build-apk.yml`（ENG 加固，**不改动**）。

---

## A. Android 签名密钥（keystore）生成与保管

### A.1 生成命令（仅在**本地**执行，绝不进仓库）

```bash
# 1) 生成 release keystore（PKCS12 存储，RSA 2048，有效期 10000 天）
keytool -genkeypair -v ^
  -keystore release-keystore.jks ^
  -keyalg RSA -keysize 2048 -validity 10000 ^
  -alias infinite-numeral ^
  -storetype PKCS12 ^
  -dname "CN=Infinite Numeral, OU=Release, O=InfiniteNumeral, L=Unknown, ST=Unknown, C=CN"

# 2) 将 keystore 编码为 base64（用于 GitHub Secret）
base64 -w0 release-keystore.jks > keystore.b64
#    Windows(PowerShell): [Convert]::ToBase64String([IO.File]::ReadAllBytes("release-keystore.jks")) | Out-File keystore.b64 -NoNewline
```

> 记录项（请 LEAD 自行保管，不要写进任何文档/聊天）：
> - `KEY_ALIAS` = `infinite-numeral`
> - `KEY_PASSWORD` =（密钥密码）
> - `KEYSTORE_PASSWORD` =（密钥库密码）
> - keystore 文件本身 + 上述两个密码

### A.2 编码进 GitHub Secrets

仓库 **Settings → Secrets and variables → Actions → New repository secret**，新增 4 个：

| Secret 名 | 值 |
|-----------|-----|
| `KEYSTORE_BASE64` | `keystore.b64` 的文本内容（整段 base64） |
| `KEY_ALIAS` | `infinite-numeral` |
| `KEY_PASSWORD` | 密钥密码 |
| `KEYSTORE_PASSWORD` | 密钥库密码 |

> CI 中 `echo "$KEYSTORE_BASE64" | base64 -d > android/release-keystore.jks` 还原密钥。

### A.3 保管规范（⚠️ 不可逆警告）

1. **绝不进仓库**：`release-keystore.jks` / `.b64` / 密码不得提交。建议在 `android/.gitignore` 取消注释 `*.jks` / `*.keystore` 行防误提交。
2. **离线加密备份**：密钥一旦丢失，**无法对同一 `applicationId`（`com.infinum.game`）发布更新**（Android 强制）。请存密码管理器 / 加密盘 / 异地备份。
3. **Play App Signing（未来上架建议）**：若未来转 Google Play 正式商店，启用 **Play App Signing**——上传密钥与签名密钥分离，丢失上传密钥可由 Google 重置，降低单点风险。本次侧载分发暂不需要。
4. **最小知情**：密钥材料仅 LEAD（密钥归属人）掌握；CI 通过 Secrets 注入，开发者本地也无需明文密钥即可构建 Debug。

### A.4 为何不修改 `build.gradle` 的 signingConfig

`android/app/build.gradle` 的 `release` buildType **当前无 signingConfig**（仅 `debug` 有）。本方案**不改动 `build.gradle`**，改为在 CI 用 AGP 原生支持的命令行注入签名：

```
-Pandroid.injected.signing.store.file=release-keystore.jks
-Pandroid.injected.signing.store.password=...
-Pandroid.injected.signing.key.alias=...
-Pandroid.injected.signing.key.password=...
```

好处：零代码改动、Debug 流程完全不受影响、密钥仅存在于 CI 运行时（ephemeral runner）。

---

## B. `release-android.yml` 工作流设计

| 项 | 设计 |
|----|------|
| 触发 | `push: tags: ['v*']`（打 tag 自动发版）+ `workflow_dispatch`（手动，含 `build_aab` 开关） |
| 运行环境 | `ubuntu-latest`，`timeout-minutes: 30` |
| 权限 | `contents: write`（用于创建 GitHub Release） |
| 步骤 | checkout → JDK 21 → Node 22(npm cache) → Android SDK → 安装 `platforms;android-36`+`build-tools;35.0.0` → `npm ci` → `npm run build` → `npm test`（发布门禁）→ decode keystore → `npx cap sync android` → Gradle 缓存 → `assembleRelease`（注入签名）→（可选）`bundleRelease` → 上传签名 APK/AAB → 打 tag 时创建 GitHub Release（正文读 `docs/release/changelog.md`，附件为签名 APK） |
| 产物 | `infinite-numeral-android-release-apk`（签名 APK，保留 90 天）；可选 `…-aab` |
| 与 Debug 流程 | **并存**，互不影响；`build-apk.yml` 不动 |

> **关键门禁**：`npm test` 在 Release 流程内保留（与 ENG 加固的 `build-apk.yml` 一致），测试不过 → 不发版。

---

## C. ⛔ 用户必须提供的阻塞项清单（密钥材料）

发布前 **LEAD 必须提供以下材料**，否则 Release 工作流会在"decode keystore"步骤失败（Secrets 为空）：

| # | 阻塞项 | 形式 | 负责人 |
|---|--------|------|--------|
| 1 | `KEYSTORE_BASE64` | GitHub Secret（base64 整段） | LEAD |
| 2 | `KEY_ALIAS` | GitHub Secret（如 `infinite-numeral`） | LEAD |
| 3 | `KEY_PASSWORD` | GitHub Secret | LEAD |
| 4 | `KEYSTORE_PASSWORD` | GitHub Secret | LEAD |
| 5 | 最终版本号 | 决策（推荐 `1.0.0-beta.1`，见 `version-strategy.md` §3） | LEAD |
| 6 | `build.gradle` 的 `versionName`/`versionCode` 按版本号回填 | 代码改动（ENG 执行，RL 提供公式） | ENG |

> 第 1–4 项为**硬阻塞**：缺失任一，CI 无法签名，Release 产物不可用。
> 第 5–6 项：版本决策后回填，否则 APK 内部版本号不正确。

---

## D. 与现存 `build-apk.yml` 的关系

- `build-apk.yml`：push master → **Debug APK**（无签名，CI artifact，仅内部）。**本次不改动**。
- `release-android.yml`（新增）：tag `v*` / 手动 → **签名 Release APK/AAB**（可分发）。
- 两者共享 `npm ci` / `npm run build` / `npm test` / `cap sync` / Gradle 缓存逻辑，但产物与签名路径独立。

---

## E. ⚠️ 需 ENG 关注的 CI 风险（compileSdk 36 vs 平台安装）

- `android/variables.gradle` 设定 `compileSdkVersion = 36`、`targetSdkVersion = 36`、`minSdkVersion = 24`。
- 最初 `build-apk.yml` 安装的是 `platforms;android-34` + `build-tools;34.0.0`，与 compileSdk 36 不匹配（全新 runner 有失败风险）。
- **本 Release 工作流已显式安装 `platforms;android-36` + `build-tools;35.0.0`** 以匹配 compileSdk 36。
- **已解决（eng-polish）**：`build-apk.yml` 的 `sdkmanager` 已对齐为 `platforms;android-36` + `build-tools;35.0.0`，**与本 Release 工作流使用完全相同的 build-tools 版本**，两个 workflow 环境一致、全新 runner 行为更可预测。最终稳定性待 CI 全新 runner 端到端确认一次（eng 本地无 Android SDK / Gradle 环境，未 git commit，改动待统一提交）。

---

## F. 发布执行速查（LEAD / RL）

```bash
# 1) 确认 4 个 Secrets 已就位（§C）
# 2) 确认 build.gradle 版本号已回填（§C-6）
# 3) 打 tag 触发发版：
git tag v1.0.0-beta.1 && git push origin v1.0.0-beta.1
#    → Actions 自动：构建 + 测试 + 签名 + 上传 APK + 创建 GitHub Release
# 4) 从 GitHub Release 取签名 APK 分发 / 内测
# 5) 出问题见 rollback-plan.md
```

> 不绕过签名、不绕过测试门禁；所有发布经 tag + CI，可审计、可回滚。
