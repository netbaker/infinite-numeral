# 回滚预案（Rollback Plan）·《无限数域》Android 首发

> 作者：路远行（release-polish）。配套：`release-checklist.md`、`signing-and-release-ci.md`、`version-strategy.md`。
> **适用**：发布失败、严重 Bug（崩溃 / 存档损坏 / 进度丢失）、商店驳回、严重数值漏洞。

---

## 1. 触发条件与分级

| 级别 | 症状 | 响应时限 | 动作 |
|------|------|----------|------|
| P0 严重 | 启动即崩溃 / 存档损坏或进度清零 / 安全漏洞 | 即时（≤ 数小时） | 撤回分发 + 热修或回退到上一可用版本 |
| P1 高 | 核心系统不可用（如重置循环报错）、中低端机普遍卡死 | ≤ 1 天 | 热修（PATCH）或暂停分发 |
| P2 中 | 个别 UI 缺陷 / 文案错误 / 非阻断平衡问题 | 下个迭代 | 常规 PATCH |

**判定权**：P0/P1 是否触发回滚由 LEAD 拍板；RL 提供方案与影响评估。

---

## 2. 回滚路径总览

```
发现严重问题
   │
   ├─(A) Git tag 回退：重新分发上一"绿"版本的签名 APK（推荐，最快）
   │
   ├─(B) 分发撤回：停发/下架当前版本，社群公告回退指引
   │
   ├─(C) 热修（hotfix）分支：从 release tag 切 hotfix/X.Y.Z，修后打新 tag 触发 CI
   │
   └─(D) 用户数据兼容：旧存档在新客户端/回退客户端下的安全策略（见 §3）
```

---

## 3. 用户数据兼容（存档向后兼容策略）

### 3.1 存档真相源（来自 `src/core/Serializer.ts` + `src/stores/gameStore.ts`）
- **存档 schema 版本**：`Serializer.CURRENT_VERSION = 4`（**独立于 SemVer**，见 `version-strategy.md` §1）。
- **序列化**：`serialize()` 将 `GameState` → `SaveData`，Decimal 转 string、Map→Record、Set→Array，`SaveData.version = 4`。
- **反序列化容错**：`deserialize()` 对**每一个 v2.0 字段均使用 `?? 默认值`**（如 `state.entropy = s.entropy ?? 0`）。**旧存档缺失新字段 → 自动取默认值，不报错**。
- **系统补位**：`gameStore.loadFromSave()` 在反序列化后调用一整套 `*System.initialize(state)`（achievements / factors / events / challenges / entropy / dimension）+ `refreshDimensionBuilds` + `recalculateFromState`，**补全缺失条目、重算派生缓存**。
- **档案馆快照**独立存于 IndexedDB `archives` 表，不进主存档，抗主存损坏。
- **结论**：**存档前向/后向兼容设计完善**，是安全回滚的基础。

### 3.2 升级（新客户端读旧档）
- 旧版存档（schema < 4）被新版客户端加载 → 缺失字段取默认 → 系统补位 → **进度保留，无崩溃**。✅
- 例：v3 存档在 v4 客户端下，新加的维度/基因/图谱字段自动初始化。

### 3.3 降级（回退客户端读新档）—— 回滚场景重点
- 新版客户端（schema 4/5）写出的存档，被回退的旧客户端（schema 4）读取：
  - 旧客户端 `deserialize` 用 `?? 默认` 处理它"认识"的字段；**它不认识的字段被忽略（JSON 多余键无害）**。
  - 风险：若新版本**新增了旧客户端不感知的字段**（如新增系统），回退后该字段数据在下次保存时被旧客户端丢弃 → **局部数据丢失**。
  - **可接受性**：增量游戏核心进度（number / 生产者 / 升级 / 三层重置资源）均建立在旧有字段上，**不会因降级丢失**。丢失的仅是新增系统（维度/基因/图谱）的增量进度，且可通过重新游玩恢复。
- **规则**：
  1. **绝不删除**已发布存档字段；新字段一律用 `?? 默认` 兼容。
  2. **破坏性变更**必须 bump `CURRENT_VERSION` 并提供迁移函数（`deserialize` 内按 `data.version` 分支）。
  3. 回退前优先引导用户**导出存档**（游戏内"存档导出"）备份，降低焦虑。

### 3.4 存档版本迁移代码位置
- 版本分支逻辑应置于 `src/core/Serializer.ts` 的 `deserialize()`（按 `data.version` 做迁移），与 `gameStore.loadFromSave()` 的系统补位协同。
- 当前无需迁移（v4 容错即可），此节为**未来破坏性变更的规范**。

---

## 4. 路径 A · Git tag 回退（推荐最快）

```bash
# 1) 列出历史发布 tag（每个发布都打 vX.Y.Z）
git tag --list 'v*' --sort=-v:refname

# 2) 确认上一可用版本（如 v1.0.0-beta.1）artifact 仍在 CI Artifacts / GitHub Release
#    （Release APK 保留 90 天；GitHub Release 永久）

# 3) 重新分发该版本的签名 APK（直接从 GitHub Release 下载，无需重新构建）
#    通知渠道：社群公告"请回退安装 v1.0.0-beta.1"
```

- **前提**：每个发布都打 `vX.Y.Z` tag 并产出 GitHub Release（见 `release-android.yml`）。
- **优点**：不重新构建、不重新签名，最快止血。
- **注意**：Android **覆盖安装**要求新 `versionCode` ≥ 旧（回退版本 code 更低会安装失败）。因此回退时玩家需**先卸载再装**旧版，或走路径 C 用更高 PATCH 号热修。

---

## 5. 路径 B · 分发撤回

| 渠道 | 撤回动作 |
|------|----------|
| GitHub Release | 将 Release 标记为 Draft / 删除附件 / 编辑说明"暂停分发" |
| 社群分享链接 | 停止传播新 APK 链接，置顶"暂回退至 vX.Y.Z"公告 |
| （未来）Play 商店 | 内部/封闭轨道暂停发布；正式轨道"暂停滚动推广"/撤回（需 Play Console 操作） |

- 侧载场景下"撤回"= 停止分享 + 公告指引回退，**无强制远程 kill**（游戏无强制更新机制，符合当前离线友好定位）。

---

## 6. 路径 C · 热修（hotfix）分支流程

> 用于需修复而非单纯回退的场景；保留完整审计与回滚能力。

```bash
# 1) 从出问题的发布 tag 切热修分支
git checkout -b hotfix/1.0.0-beta.2 v1.0.0-beta.1
#    （或从 master 的安全点；须保证不含未发布的不兼容改动）

# 2) 修复 → 提交（PR + Code Review，保留审计）
#    若涉及存档：遵循 §3.4 规范（不删字段 / bump CURRENT_VERSION / 提供迁移）

# 3) 按 version-strategy.md 公式 bump 版本：
#    versionName = 1.0.0-beta.2，versionCode = 1000002（betaOffset=2）
#    同步 android/app/build.gradle

# 4) 打 tag 触发 Release 工作流（自动签名 + GitHub Release）
git tag v1.0.0-beta.2 && git push origin v1.0.0-beta.2
#    → release-android.yml 自动产出签名 APK/AAB + 创建 Release

# 5) 分发热修版（versionCode 高于问题版 → 可覆盖安装）
```

- **热修简化流程**：仍走 tag 触发 CI，**不绕过签名与测试门禁**（`npm test` 在 `release-android.yml` 内）。
- **审计**：所有热修经 PR + tag，可追溯；不删历史 tag。

---

## 7. 回滚决策矩阵（RACI）

| 动作 | 负责人(R) | 审批(A) | 咨询(C) | 知会(I) |
|------|-----------|---------|---------|---------|
| 是否触发回滚/热修 | RL | LEAD | QA, ENG | 全员 |
| 重新分发上一版本 | RL | LEAD | — | 社群 |
| 热修修复 + 版本 bump | ENG | LEAD | RL, QA | 全员 |
| 用户公告 / 社群沟通 | RL | LEAD | — | 玩家 |
| 存档兼容性评估 | QA | — | RL, ENG | LEAD |

---

## 8. 预防清单（降低回滚概率）
- [x] CI 测试门禁（`build-apk.yml` + `release-android.yml` 均跑 `npm test`）
- [x] 类型检查零错误（`vue-tsc`）
- [x] 存档容错 + 系统补位（§3）
- [ ] 接入轻量崩溃上报（fast-follow，当前无遥测，见 `release-checklist.md` M1）
- [ ] 真机覆盖安装 + 旧档兼容冒烟（内测阶段强制，T2–T3）
