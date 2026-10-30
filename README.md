<div align="center">
  <h1>Kaede</h1>
  <p>ACGN 多源聚合软件 —— 设计定稿、可交互原型与工程设计文档</p>
  <p>
    <img alt="status" src="https://img.shields.io/badge/status-设计定稿%20v3.3%20%C2%B7%20工程设计%20v1.0-1F1D1B?style=flat-square">
    <img alt="prototype" src="https://img.shields.io/badge/prototype-纯静态%20%C2%B7%20无依赖-4CD08A?style=flat-square">
    <img alt="license" src="https://img.shields.io/badge/license-MIT-31C48D?style=flat-square">
  </p>
</div>

---

## 这是什么

把散落在各个资源站的动画、漫画、轻小说、游戏、音乐**按作品聚合成一个入口**，只知道作品名就能找全、接着看。单机自用、不公开分发。

这个仓库现在有四样东西：**一份设计定稿**、**一个把定稿跑起来的网页原型**、**一层把它变成可开发工程的文档**（`docs/design/`），以及**一套已搭好的工程骨架**（S1：Electron 壳 + React 视图 + 内核 `core/` + hash 路由 + 共享契约类型，由 Spike-1~4 演进）。

> 上一版 Flutter 桌面实现（`acgn_app` / `acgn_core`，2026-10-27 至 10-30）已整体废弃，
> 代码与安装包不再保留。实现结果没有达到设计要求，所以退回设计层：先把界面和交互在原型里钉死，
> 再决定用什么方式实现。

## 仓库结构

```
prototype/    可交互前端原型（定稿现场，纯静态，双击即开）
  index.html    入口
  assets/       app.js · data.js · style.css · covers/
  tools/        批量抓封面脚本
src/           渲染进程（React 视图）
  main.tsx     入口（导入 prototype 的 style.css，验证 CSS 在壳里还原）
  App.tsx      应用壳：hash 路由分发（#/ 首页 · #/player/:id/:ep 播放器）
  shell/        A 独占：窗口与托盘、路由（src/shell/router.tsx）
  pages/
    discover/   A 独占：首页 · 分类页 · 作品区 · 典藏 · 系列页 · 搜索 · 百科（含 Home.tsx）
    consume/    B 独占：详情 · 播放器 · 阅读器 · 音乐 · 我的 · 下载 · 资源 · 磁盘（含 Player.tsx）
  components/   A 独占：共用组件（卡片 / 进度条 / 弹层 / 图标 / 样式令牌）
shared/        跨端契约类型（A/B 共管，见 shared/types.ts）
electron/      主进程（Electron 窗口 + IPC 注册，A 独占）
core/          内核（Node 侧，纯逻辑，禁 import src/）
  db/          ★ 共管：SQLite schema 与迁移（V001__init.sql / migrate.cjs / seed.cjs）
  player/      B 独占：源解析（resolve-source.cjs）+ hls.js 挂载
  library/ search/ wiki/          A 独占能力域（预留占位）
  source/ download/ resource/ disk/ reader/   B 独占能力域（预留占位）
scripts/       工程脚本（check-redline.mjs · spike-2-check.mjs · spike-3-check.mjs）
tests/         A 管 e2e/（Playwright）· B 管 unit/（Vitest）（预留占位）
resources/     ★ 共管资源（图标 / 字体 / 模板 / 地区化字符串，预留占位）
package.json / vite.config.ts / tsconfig.json   构建与依赖
docs/         设计定稿、走查记录与工程设计文档
  ACGN聚合软件-设计定稿.md        唯一设计蓝本（v3.3，含 120 条红线）
  ACGN-审查清单-2026-10-30.md     22 条界面走查的逐条裁决与结项
  acgn-界面审查.md                首轮全面审查记录
  design/                         工程转化：需求 · 架构 · 数据 · 接口 · 选型 · 规范
  adr/                            已拍板的技术决策记录（不可逆决定留档）
```

> 目录所有权见 [06 §2](docs/design/06-开发规范.md)：**A 与 B 在各自目录里并行扩展，跨边界改动只通过 `shared/` 契约**——骨架本身就在保障两人不踩到同一份文件。

改界面的顺序是 **原型 → 定稿文档**，两边必须同步；定稿是判断"这处改动对不对"的唯一依据。

## 跑起原型

```bash
# 直接打开
start prototype/index.html

# 或起个静态服务器（推荐）
python -m http.server 8080 --directory prototype
# → http://localhost:8080
```

无构建、无依赖、无框架。`app.js` 一个文件装下全部视图与交互，`data.js` 是演示数据，换掉它就能接真数据。

## 本地运行（开发）

> 这是 S1 正式骨架（由 Spike-1~4 演进）：已证明 Electron + Vite + React + TS 这套栈能跑、原型 CSS 在壳里能还原、SQLite 能建库、真源能播通、安装包能打出。骨架本身已可运行，但各页面与能力域仍是占位，等 A/B 按 [06 §2](docs/design/06-开发规范.md) 各自填充。

```bash
# 1) 安装依赖（含 Electron，首次较慢）
npm install

# 2) 两人各自验证：开发模式（Vite dev server + Electron 窗口）
npm run dev
#   → 应弹出一个 1280×800 的窗口，显示 Kaede 首页式卡片网格（卡片来自 SQLite），
#     点「▶ 试播真实源（Spike-3）」或任意卡片会打开播放器并真实播放一段公开 HLS。
#   → 浏览器控制台（Ctrl+Shift+I）应无报错、无硬编码色值告警。

# 3) 只验证类型与红线（不启动窗口，CI 用）
npm run verify

# 4) 生产构建 + 用构建产物启动（验证 loadFile 路径）
npm run build && npm start
```

跑通后各自在电脑上确认窗口能开、无报错，即 **Spike-1 通过**；之后再做 Spike-2（SQLite 建库）、Spike-3（真实源播通一集）、Spike-4（打出安装包）。

Spike-2 / Spike-3 另有**无需开窗口**即可在 Node 侧跑通的验证脚本：`npm run spike2`（建库 + 读写断言）、`npm run spike3`（真实公开 HLS 解析断言）。Spike-4 用 `npm run package` 出 NSIS 安装版 + 便携 zip。

## 提交到 GitHub（只传源码，不传依赖与构建产物）

这个仓库的「框架」——Electron + React + Vite + TypeScript 的脚手架——**它的源码就是要提交的内容**，不是另外要单独处理的对象。上传到 GitHub 的只是源码，依赖和构建产物由协作者本地还原，不入库。

**提交（纳入版本控制）：**
- 工程配置：`package.json`、`package-lock.json`、`vite.config.ts`、`tsconfig.json`、`.gitignore`
- 源码：`electron/`、`src/`、`shared/`、`scripts/`、`index.html`
- 文档与说明：`README.md`、`docs/`、`LICENSE`、`prototype/`

**不提交（已被 `.gitignore` 排除，可随时重新生成）：**
- `node_modules/` —— 依赖，别人 `npm install` 还原
- `dist/`、`out/`、`.vite/` —— 构建产物，`npm run build` 还原
- `Kaede.zip`、`design.zip`、Electron 打出的安装包 —— 打包 / 备份产物

> 也就是说：clone 下来后跑 `npm install && npm run dev` 就能还原出和作者一样的开发环境，无需任何被忽略的文件。

## 四个 Spike 与正式骨架的关系（不用推倒重来）

Spike-1 产出的 `package.json` / 主进程 / 渲染入口 / 共享契约类型**本身就是项目骨架**，不是放在一边的临时验证。Spike-2（SQLite）、Spike-3（真源播通一集）、Spike-4（打出安装包）都是**往同一套骨架上累加能力模块**。四个 Spike 全过后进入的「S1 正式骨架」，是**在 Spike-1 基础上补 `core/`、路由、契约初版、迁移与 seed**——是扩展，不是删除重建。删了重建只会把已验证的「能跑、CSS 能还原」成果丢掉、重新引入风险。

## 设计的几条主张

定稿里有 14 条铁律和 120 条红线，最能代表这个产品性格的是这四条：

- **一个界面只干这个界面的活。** 切源在播放器里做完，别在详情页写"共 3 个源"；进度在详情页看得见，不用回作品区查。
- **不出现无效信息。** 分区已经决定介质，卡片就不再标"动漫/漫画"；上面写了年份，下面不再写"2021 年放送"。
- **不做重复功能。** 同一能力只留一个入口，一个入口出现两处就删一处。
- **不写解释性文字。** 功能靠结构自解释；一块界面需要一句话才说得清，那是结构没做对。这条被反复踩，所以单独画了边界。

交互层另有两条硬约束：**点封面即播**（详情走卡片右上角「⋯」或播放页退出）、**返回先回来处**（返回栈记录真实来路，从作品区进详情就回作品区，不是回首页）。

## 文档

| 文档 | 内容 |
|---|---|
| [设计定稿 v3.3](docs/ACGN聚合软件-设计定稿.md) | 产品定位、信息架构、数据模型、视觉规范、功能版图、已否决清单、评审方法 |
| [审查清单 2026-10-30](docs/ACGN-审查清单-2026-10-30.md) | 22 条问题（P1 结构问题 → 细节），逐条写明处理方式与验证结论 |
| [界面审查（首轮）](docs/acgn-界面审查.md) | 第一次整体走查：布局、密度、文案、一致性 |

### 工程设计文档（`docs/design/`）

从定稿到可开发之间的一层：需求怎么验收、系统怎么分层、数据怎么存、两人怎么对接。

| 文档 | 内容 |
|---|---|
| [00 索引与待决事项](docs/design/00-索引与待决事项.md) | **先读这篇**：进度快照、已定决策、还欠的事、风险、里程碑 |
| [01 需求规格说明书](docs/design/01-需求规格说明书.md) | 116 条带编号的功能需求（每条一句验收线）、非功能预算、v1 五个阶段出口 |
| [02 系统架构设计](docs/design/02-系统架构设计.md) | 四层分层、进程模型、模块边界、三条数据流、错误降级、安全边界 |
| [03 数据模型与存储设计](docs/design/03-数据模型与存储设计.md) | SQLite 全量 DDL、派生规则、索引、迁移策略、文件布局与命名模板 |
| [04 接口与源规则规范](docs/design/04-接口与源规则规范.md) | IPC 通道表、领域接口、声明式源规则 DSL v1、失败语义、错误码 |
| [05 技术选型方案](docs/design/05-技术选型方案.md) | 5 个候选方案加权对比、推荐栈、可逆性分析、决策留档 |
| [06 开发规范](docs/design/06-开发规范.md) | 两人分工与目录所有权、提交评审、红线转检查项、测试与 DoD |
| [07 关键模块详细设计](docs/design/07-关键模块详细设计.md) | 播放管线与代理、阅读器、下载器、资源扫描、搜索、动效落地 |
| [08 需求提问文档](docs/design/08-需求提问文档.md) | 定位与最终效果的追问（**已答完**，§5 汇总、§6 Kazumi 调研、§7 待拍板 6 项） |
| [09 第一版范围与迭代计划](docs/design/09-第一版范围与迭代计划.md) | **待你确认**：v1 做什么/不做什么、S1–S5 出口条件、可行性风险 |

## 技术栈（2026-10-30 已定）

| 层 | 选型 | 理由一句话 |
|---|---|---|
| 外壳 | **Electron 45** | 原型 CSS 1:1 复用、Node 生态直接可用、两人无需 Rust |
| 视图 | **React 19 + TypeScript 7 + Vite 8** | 生态最大；配 Zustand 选择器订阅满足局部更新 |
| 数据 | **SQLite（better-sqlite3）+ 手写迁移** | 单文件、零运维、事务可靠 |
| 播放 | **`<video>` + hls.js + 本地代理** | 一周内能真播；P1 再挂 libmpv 补 Anime4K 与多音轨 |
| 规则 | **声明式 JSON（specVersion 1）** | 可导入分享、可单测，且不允许远程执行代码 |
| 分发 | **NSIS 安装版 + 便携 zip** | 便携版可放 U 盘，数据目录随行走 |

决策留档在 `docs/adr/`：[ADR-001 外壳](docs/adr/ADR-001-shell-electron.md) · [ADR-002 播放内核](docs/adr/ADR-002-hls-first.md) · [ADR-003 规则形态](docs/adr/ADR-003-declarative-rules.md)。

## 下一步

1. **Spike-1 已通过**：开发者在本地 `npm run dev` 验证窗口可开、原型 CSS 生效、控制台无报错。
2. **Spike-2 / Spike-3 / Spike-4 已全部完成**：`npm run spike2`、`npm run spike3` 在 Node 侧无界面即可跑通（建库 / 真实公开 HLS 解析）；渲染端已在首页接入 SQLite、并可用 hls.js 播真实源；`npm run package` 本机已实跑出 NSIS 安装版 + 便携 zip 两个产物（若遇电子构建二进制 CDN 瞬时 502，用 `ELECTRON_BUILDER_BINARIES_MIRROR` 指向 npmmirror 镜像即可）。
3. **S1 骨架已起步**：目录结构（按 [06 §2](docs/design/06-开发规范.md) 的 A/B 所有权）、hash 路由（`src/shell/router.tsx`）、契约初版（`HomeItem` / `DbStats` / `PlayerResolveResult` 已抽进 `shared/`）已落地，`npm run verify` 与 `npm run build` 通过。下一步由 A/B 在各自目录里填充页面与能力域。
4. **确认第一版范围**（[09](docs/design/09-第一版范围与迭代计划.md)）：v1 = 动漫分区完整闭环 + 下载与本地资源 + 全站界面还原。
5. 补齐原型里还没实现的部分（阅读器工具栏：目录 / 书签 / 笔记 / 全文搜索，目前是占位）——是否进第一版取决于 08 的 B2。

## 许可

[MIT](LICENSE)。界面与文案自用为主，转载注明出处即可。
