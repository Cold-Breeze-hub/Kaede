// ============================================================================
// src/pages/discover/Home.tsx — 首页（A 独占，属 src/pages/discover）
// ----------------------------------------------------------------------------
// 数据来自 SQLite（core/db 迁移 + seed；经主进程 library.home 暴露）。
// 点击卡片跳转到播放器（B 的 consume/Player），验证「壳 → 首页 → 播放」链路。
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

  const open = (workId: string) => navigate(`/player/${workId}/1`);

  return (
    <div className="app">
      <header className="agg-toolbar">
        <span className="brand">Kaede</span>
        {stats && (
          <span className="note">
            {stats.works} 部作品 · {stats.episodes} 集 · {stats.tables} 张表
          </span>
        )}
      </header>

      <main className="shelf">
        <div className="shelf-row">
          <h2 className="shelf-title">动漫 · 全部</h2>
        </div>

        <div className="shelf-grid">
          {works.map((w) => (
            <article
              className="shelf-card"
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => open(w.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') open(w.id);
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
    </div>
  );
}
