# ADR-001 · 应用外壳与视图栈选 Electron + React

- **状态**：已采纳
- **日期**：2026-10-30
- **决策人**：项目所有者
- **影响面**：全局（不可逆）

## 背景

产品是 Windows 单机桌面软件，UI 已由 `prototype/` 跑通并被设计定稿逐条固化。定稿的约束是 **CSS 级**的：`repeat(6, minmax(0,1fr))` 六列网格、`mask-image` 左缘渐隐的 Hero、`backdrop-filter` 浮层、五条 `data-anim` 转场曲线、进出管理态 `grid.top` 必须完全相等。

同时内核需要：读写任意磁盘路径、认盘符容量、启动本地 EXE、改写请求头绕防盗链、SQLite 事务与 FTS5、嵌入 libmpv（P1）。

## 选项

| 方案 | 原型对齐 | 内核语言 | 安装包 |
| --- | --- | --- | --- |
| Electron 45（Chromium 156 / Node 24.22） | 原生复用 | JS/TS | 120–160 MB |
| Tauri 2.12（系统 WebView2） | 原生复用 | Rust | 8–15 MB |
| Flutter 3.47 + media_kit | 需全部重写 | Dart | 40–60 MB |
| .NET + WebView2 | 原生复用 | C#（桥要手写） | 30–50 MB |

加权打分（`05` §4）：Electron 90.2 / Tauri 80.8 / .NET 76.2 / Flutter 70.8。

## 决定

采用 **Electron 45 + React 19 + TypeScript 5 + Vite**。

- 视图层：React + 原生 CSS（令牌变量 + CSS Modules），**不用组件库**（定稿每个控件都与通用控件不同，套库等于先写覆盖再删行为）。
- 路由：自写 hash 路由。必须自己控 `data-anim`、`backStack`、签名去重（红线 74/77/78），现成路由反而挡路。
- 状态：Zustand，按 key 订阅，满足"点追番只换按钮文案"。
- 数据库：better-sqlite3（同步 API，事务写法最简单）。

## 后果

**好的**：

- 原型 HTML/CSS 可直接搬进 `src/`，不做视觉重写。
- 两人都是 JS/TS 栈，无语言学习成本。
- Node 生态覆盖抓取、图片处理、HLS 分片合并、进程管理。
- libmpv 有现成 Electron 插件（`electron-mpv-video`，Windows x64），P1 有路可走。

**代价**：

- 安装包 120–160 MB，空闲内存 300 MB+。已接受：个人自用、单机。
- 原生模块（better-sqlite3）必须在 CI 上 `electron-rebuild`，且要在干净 Windows 上验证产物。
- 主进程单线程，重活必须下沉到 worker；这条已写进 `02` §4。

**不可逆性**：换 Tauri 需用 Rust 重写整个 `core/`，估算 3–4 周。因此 `02` 刻意把外壳当可替换件、领域层当资产——但事实上成本仍然很高，这个决定只做一次。

## 相关

- [05 技术选型方案](../design/05-技术选型方案.md)
- [02 系统架构设计](../design/02-系统架构设计.md) §3.1（外壳映射表）
