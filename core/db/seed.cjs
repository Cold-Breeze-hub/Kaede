'use strict';
// ============================================================================
// core/db/seed.cjs — 演示数据（Spike-2）
// ----------------------------------------------------------------------------
// 少量动漫作品 + 剧集 + 两条内置「公开 HLS」源规则（供 Spike-3 多源选优）。
// 幂等：只在 works 为空时写入。
// ============================================================================

// 真实公开 HLS 测试流（CORS 允许，hls.js 可直接拉）。
const REAL_HLS = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8',
];

const DEMO_WORKS = [
  { id: 'frieren', name: '葬送的芙莉莲', year: 2023, score: 8.9, votes: 12345 },
  { id: 'jujutsu', name: '咒术回战', year: 2020, score: 8.1, votes: 9800 },
  { id: 'chainsaw', name: '链锯人', year: 2022, score: 8.4, votes: 7600 },
  { id: 'clannad', name: 'CLANNAD', year: 2008, score: 8.7, votes: 21000 },
  { id: 'aot', name: '进击的巨人', year: 2013, score: 8.6, votes: 30000 },
  { id: 'steins', name: '命运石之门', year: 2011, score: 9.0, votes: 18000 },
];

/** 写入演示数据（幂等，应在 works 为空时调用）。 */
function seed(db) {
  const now = Date.now();
  const insWork = db.prepare(
    `INSERT OR IGNORE INTO works
       (id, kind, name, display_name, year, status, og, accent, score, votes, in_shelf, shelf_added, created_at, updated_at)
     VALUES
       (@id, 'anime', @name, @name, @year, '完结', '', '#6E675F', @score, @votes, 1, @now, @now, @now)`
  );
  const insEp = db.prepare(`INSERT OR IGNORE INTO episodes (work_id, n, title) VALUES (?, ?, ?)`);
  const insRule = db.prepare(
    `INSERT OR IGNORE INTO rules
       (id, name, version, partition, origin, spec_json, enabled, health, created_at, updated_at)
     VALUES (@id, @name, '1.0.0', 'anime', 'builtin', @spec, 1, 1.0, @now, @now)`
  );
  const insSrc = db.prepare(
    `INSERT OR IGNORE INTO ep_sources (episode_id, rule_id, page_url, play_url, quality, latency_ms, ok, last_check)
     VALUES (@epId, @ruleId, @pageUrl, @playUrl, @quality, @latency, 1, @now)`
  );

  const tx = db.transaction(() => {
    for (const w of DEMO_WORKS) {
      insWork.run({ ...w, now });
      for (let n = 1; n <= 12; n++) insEp.run(w.id, n, `第 ${n} 集`);
    }

    // 两条内置演示规则（声明式 DSL v1 形态；spec_json 仅占位，Spike-3 仅用 play_url）
    insRule.run({
      id: 'demo-hls',
      name: '演示·Mux测试流',
      spec: JSON.stringify({
        specVersion: 1, id: 'demo-hls', name: '演示·Mux测试流',
        partition: 'anime', baseUrl: 'https://test-streams.mux.dev',
      }),
      now,
    });
    insRule.run({
      id: 'demo-apple',
      name: '演示·Apple示例流',
      spec: JSON.stringify({
        specVersion: 1, id: 'demo-apple', name: '演示·Apple示例流',
        partition: 'anime', baseUrl: 'https://devstreaming-cdn.apple.com',
      }),
      now,
    });

    // frieren 第 1 集挂两条不同规则的真实公开 HLS（演示多源选优）
    const ep = db.prepare(`SELECT id FROM episodes WHERE work_id='frieren' AND n=1`).get();
    if (ep) {
      // Mux：延迟未记（NULL）→ 选源时与 Apple 同 health，靠低延迟胜出
      insSrc.run({ epId: ep.id, ruleId: 'demo-hls', pageUrl: REAL_HLS[0], playUrl: REAL_HLS[0], quality: 'Auto', latency: null, now });
      // Apple：延迟 120ms，用于演示排序
      insSrc.run({ epId: ep.id, ruleId: 'demo-apple', pageUrl: REAL_HLS[1], playUrl: REAL_HLS[1], quality: 'Auto', latency: 120, now });
    }
  });
  tx();
}

/** works 为空才写演示数据。 */
function seedIfEmpty(db) {
  const { c } = db.prepare(`SELECT COUNT(*) AS c FROM works`).get();
  if (c === 0) seed(db);
}

module.exports = { seed, seedIfEmpty, DEMO_WORKS, REAL_HLS };
