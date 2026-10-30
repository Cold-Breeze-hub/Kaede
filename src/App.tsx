// Spike 综合证据页（Spike-1/2/3 串联）。
// - 复用原型真实类名 + 设计令牌（Spike-1：CSS 还原）
// - 首页卡片数据来自 SQLite（Spike-2：DB 已接入）
// - 「试播真实源」按钮跳到播放器，用 hls.js 播真实公开 HLS（Spike-3：真源链路）
// 路由是 S1 的事；这里用一个本地 state 切换视图即可。

interface HomeWork {
  id: string;
  name: string;
  year: number | null;
  score: number | null;
  cover: string | null;
}

interface DbStats {
  tables: number;
  works: number;
  episodes: number;
}

import { useEffect, useState } from 'react';
import { Player } from './pages/consume/Player';

export function App() {
  const [works, setWorks] = useState<HomeWork[]>([]);
  const [stats, setStats] = useState<DbStats | null>(null);
  const [view, setView] = useState<{ workId: string; ep: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const home = await window.api.invoke<HomeWork[]>('library.home');
        setWorks(home);
      } catch {
        /* 数据库未就绪时静默，保持空列表 */
      }
      try {
        const s = await window.api.invoke<DbStats>('db:stats');
        setStats(s);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  if (view) {
    return <Player workId={view.workId} ep={view.ep} onClose={() => setView(null)} />;
  }

  return (
    <div className="app">
      <header className="agg-toolbar">
        <span className="brand">Kaede</span>
        <span className="spike-note">
          Spike-2 · 数据来自 SQLite（
          {stats ? `${stats.works} 部作品 / ${stats.episodes} 集 / ${stats.tables} 张表` : '加载中…'}）
        </span>
      </header>

      <main className="shelf">
        <div className="shelf-row">
          <h2 className="shelf-title">动漫 · 全部（来自数据库）</h2>
        </div>

        <div className="shelf-grid">
          {works.map((w) => (
            <article className="shelf-card" key={w.id}>
              <div className="cover" />
              <div className="shelf-meta">
                <span className="shelf-name">{w.name}</span>
                <span className="shelf-sub">
                  {w.year ? `${w.year} · ` : ''}
                  {w.score ? `★ ${w.score}` : '看到 1'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="agg-toolbar">
        <button className="spike-btn" onClick={() => setView({ workId: 'frieren', ep: 1 })}>
          ▶ 试播真实源（Spike-3）
        </button>
        <span className="spike-note">
          Electron 45 · React 19 · Vite 8 · TypeScript 7 · SQLite · hls.js
        </span>
      </footer>
    </div>
  );
}
