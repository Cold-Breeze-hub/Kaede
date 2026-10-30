'use strict';
// ============================================================================
// core/player/resolve-source.cjs — 选源解析
// ----------------------------------------------------------------------------
// 与 docs/design/04-接口与源规则规范 §3.3 选源算法对齐：
//   排序 = ok desc, health desc, latency asc
// 真实源验证：从 seed 里一条「公开 HLS」规则解析出可播地址。
// ============================================================================

/**
 * 选源打分纯函数（可单测，不依赖 DB）。
 * 排序优先级：先 ok，再 health，再延迟低者优先。
 * @param {Array<{ok?:number,health?:number,latency_ms?:number}>} candidates
 */
function pickBest(candidates) {
  if (!candidates || candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const ok = (b.ok ?? 0) - (a.ok ?? 0);
    if (ok !== 0) return ok;
    const h = (b.health ?? 0) - (a.health ?? 0);
    if (h !== 0) return h;
    return (a.latency_ms ?? 0) - (b.latency_ms ?? 0);
  })[0];
}

/**
 * 解析某作品某集的可播地址（返回首个通过的候选）。
 * @param {import('better-sqlite3').Database} db
 * @param {string} workId
 * @param {number} ep 集号（从 1 开始）
 */
function resolveSource(db, workId, ep) {
  const rows = db.prepare(`
    SELECT es.play_url        AS play_url,
           es.quality         AS quality,
           es.ok              AS ok,
           es.latency_ms      AS latency_ms,
           r.id               AS rule_id,
           r.name             AS rule_name,
           r.health           AS health
    FROM ep_sources es
    JOIN rules r        ON r.id = es.rule_id
    JOIN episodes e     ON e.id = es.episode_id
    WHERE e.work_id = ? AND e.n = ? AND r.enabled = 1
    ORDER BY es.ok DESC, r.health DESC, es.latency_ms ASC
  `).all(workId, ep);

  if (!rows || rows.length === 0) {
    return { ok: false, error: 'E_NO_SOURCE', candidates: [] };
  }

  const candidates = rows.map((r) => ({
    ruleId: r.rule_id,
    name: r.rule_name,
    quality: r.quality,
    ok: r.ok,
    latency_ms: r.latency_ms,
    health: r.health,
    play_url: r.play_url,
  }));

  const best = pickBest(candidates);
  return {
    ok: true,
    url: best.play_url,
    kind: 'hls',
    ruleId: best.rule_id,
    ruleName: best.rule_name,
    quality: best.quality,
    candidates: candidates.map((c) => ({
      ruleId: c.ruleId, name: c.name, quality: c.quality, ok: c.ok,
    })),
  };
}

module.exports = { pickBest, resolveSource };
