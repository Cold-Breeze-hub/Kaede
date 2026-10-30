// Spike-1 首屏：刻意使用原型的真实类名（.app / .shelf / .shelf-grid /
// .shelf-card / .cover），配合 main.tsx 导入的 prototype/assets/style.css，
// 用来验证「原型设计令牌与样式在 Electron 渲染进程里能正常呈现」。
// 这不是产品页面，只是壳跑通 + CSS 还原的证据页。

const DEMO_TITLES = ['葬送的芙莉莲', '咒术回战', '链锯人', 'CLANNAD', '进击的巨人', '命运石之门'];

export function App() {
  return (
    <div className="app">
      <header className="agg-toolbar">
        <span className="brand">Kaede</span>
        <span className="spike-note">Spike-1 · Electron 壳已启动，原型 CSS 已加载</span>
      </header>

      <main className="shelf">
        <div className="shelf-row">
          <h2 className="shelf-title">动漫 · 全部</h2>
        </div>

        <div className="shelf-grid">
          {DEMO_TITLES.map((title) => (
            <article className="shelf-card" key={title}>
              <div className="cover" />
              <div className="shelf-meta">
                <span className="shelf-name">{title}</span>
                <span className="shelf-sub">共 12 · 看到 3</span>
              </div>
            </article>
          ))}
        </div>
      </main>

      <footer className="agg-toolbar">
        <span className="spike-note">
          Electron 45 · React 19 · Vite 8 · TypeScript 7 — 若你看到这行且窗口无报错，Spike-1 通过
        </span>
      </footer>
    </div>
  );
}
