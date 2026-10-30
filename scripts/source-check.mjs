// ============================================================================
// scripts/source-check.mjs — 内核回归：真实源解析
// 把真实公开 HLS 源写进库，验证：①选源打分纯函数 ②resolveSource 产出真实 m3u8。
// 运行：npm run source:check
// ============================================================================
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(resolve(__dirname, '../core/db/schema/V001__init.sql'), 'utf8');
const { seed } = require('../core/db/seed.cjs');
const { resolveSource, pickBest } = require('../core/player/resolve-source.cjs');

const db = new Database(':memory:');
db.exec(schema);
seed(db);

// ① 选源打分纯函数：ok 优先，其次 health，再次低延迟
const best = pickBest([
  { ok: 0, health: 0.9, latency_ms: 50 },
  { ok: 1, health: 0.8, latency_ms: 120 },
  { ok: 1, health: 0.95, latency_ms: 10 },
]);
if (!best || best.health !== 0.95) {
  console.error('✗ 源解析检查失败：选源打分错误', best);
  process.exit(1);
}

// ② 真实源解析：frieren 第 1 集应解析出真实公开 m3u8
const res = resolveSource(db, 'frieren', 1);
if (!res.ok || !res.url || !res.url.endsWith('.m3u8')) {
  console.error('✗ 源解析检查失败：未解析出真实 HLS 地址', res);
  process.exit(1);
}

console.log('✓ 源解析检查通过：选源打分正确，真实公开 HLS 地址已解析');
console.log('  播放地址 =>', res.url);
console.log('  候选源数 =>', res.candidates.length, `（${res.candidates.map((c) => c.name).join(' / ')}）`);
db.close();
