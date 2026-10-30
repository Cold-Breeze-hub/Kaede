# 前端原型（Web）

定稿方向的可交互原型：界面与交互先在这里敲死，再决定怎么实现。纯静态、无构建步骤、无依赖。

```
prototype/
├─ index.html          入口，直接双击或起个静态服务器打开
├─ assets/
│  ├─ app.js           全部界面与交互（单文件，hash 路由）
│  ├─ data.js          演示数据：系列 / 作品 / 卷 / 集 / 标签 / 下载任务
│  ├─ style.css        设计令牌与全部样式
│  └─ covers/          演示用封面图
└─ tools/
   ├─ fetch_covers.py       批量抓封面
   └─ fetch_music_covers.py 音乐专辑封面
```

## 打开

```bash
# 方式一：直接打开
start prototype/index.html

# 方式二：起静态服务器（推荐，hash 路由与封面路径都不挑协议）
python -m http.server 8080 --directory prototype
# → http://localhost:8080
```

## 约定

- **地址即状态。** 所有视图走 hash 路由（`#/shelf`、`#/detail/:id`、`#/player/:id?ep=3`、`#/reader/:id?vol=2&ch=5`），刷新和前进后退都要能落回同一屏。
- **返回先回来处。** 返回栈记录真实来路，栈顶是哪儿就回哪儿，栈空才按层级回上级。
- **卡片封面即播放/阅读。** 想看清详情走卡片右上角「⋯」，或从播放页退出到详情页。
- **响应式断点。** 390 窄屏与 1000 宽两种布局都要能站住，窄屏靠「⋯」收纳次要动作。

界面规格以 [`../docs/ACGN聚合软件-设计定稿.md`](../docs/ACGN聚合软件-设计定稿.md)（v3.3）为准；逐条走查记录见 [`../docs/ACGN-审查清单-2026-10-30.md`](../docs/ACGN-审查清单-2026-10-30.md)。
