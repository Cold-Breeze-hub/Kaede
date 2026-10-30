// ============================================================================
// src/pages/discover/Home.tsx — 首页（A 独占，属 src/pages/discover）
// ----------------------------------------------------------------------------
// Spike-1/2/3 的综合证据页被搬到这里，成为 S1 首页骨架：
//   - 卡片数据来自 SQLite（Spike-2：library.home）
//   - 「试播真实源」跳到播放器，用 hls.js 播真实公开 HLS（Spike-3 真源链路）
// 本页只负责「展示 + 跳转」，不碰播放/解析——那些在 B 的 consume/ 与 core/player。
// ============================================================================
import { useEffect, useState } from 'react';
import { navigate } from '../../shell/router';
import type { HomeItem, DbStats } from '../../../shared';

export function Home() {
  const [works, setWorks] = useState<HomeItem[]>([]);
  const [stats, setStats] = useState<DbStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const home = await window.api.invoke<HomeItem[]>('library.home');
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

  const openPlayer = (workId: string) => navigate(`/player/${workId}/1`);

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
            <article
              className="shelf-card"
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => openPlayer(w.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') openPlayer(w.id);
              }}
            >
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
        <button className="spike-btn" onClick={() => openPlayer('frieren')}>
          ▶ 试播真实源（Spike-3）
        </button>
        <span className="spike-note">
          Electron 45 · React 19 · Vite 8 · TypeScript 7 · SQLite · hls.js
        </span>
      </footer>
    </div>
  );
}
