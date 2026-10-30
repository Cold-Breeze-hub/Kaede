// ============================================================================
// src/App.tsx — 应用壳（S1 正式骨架）
// ----------------------------------------------------------------------------
// 从 Spike 的「本地 state 切视图」升级为「hash 路由驱动」：
//   #/                → 首页（A，src/pages/discover）
//   #/player/:id/:ep  → 播放器（B，src/pages/consume）
// 壳只做路由分发与目录装配，不含任何页面业务——A/B 各自在自有目录里扩展，互不踩文件。
// （Spike-1/2/3 验证链路：首页卡片来自 SQLite，点卡片/按钮经 player.resolve 用 hls.js 播真源）
// ============================================================================
import { useHashRoute, navigate } from './shell/router';
import { Home } from './pages/discover/Home';
import { Player } from './pages/consume/Player';

export function App() {
  const route = useHashRoute();
  const match = route.match(/^\/player\/([^/]+)\/(\d+)$/);

  if (match && match[1] && match[2]) {
    const workId = match[1];
    const ep = Number(match[2]);
    return <Player workId={workId} ep={ep} onClose={() => navigate('/')} />;
  }

  return <Home />;
}
