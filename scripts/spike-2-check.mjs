// ============================================================================
// scripts/spike-2-check.mjs — Spike-2 验证（SQLite 建库 + 读写）
// 在 Node 侧用 better-sqlite3 真跑 V001 schema，断言建表与读写成功。
// 运行：npm run spike2
// ============================================================================
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(resolve(__dirname, '../core/db/schema/V001__init.sql'), 'utf8');

const REQUIRED = [
  'schema_meta', 'series', 'works', 'tags', 'work_tags', 'credits', 'episodes',
  'volumes', 'chapters', 'tracks', 'game_info', 'reading_positions', 'rules',
  'ep_sources', 'work_updates', 'work_relations', 'downloads', 'download_items',
  'resource_roots', 'resource_files', 'disks', 'history', 'scrape_cache', 'kv', 'works_fts',
];

const db = new Database(':memory:');
db.exec(schema);

const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type IN ('table','view')`).all().map((r) => r.name);
const missing = REQUIRED.filter((t) => !tables.includes(t));
if (missing.length) {
  console.error('✗ Spike-2 失败：缺失表', missing);
  process.exit(1);
}

// 读写冒烟测试
db.prepare(
  `INSERT INTO works (id, kind, name, display_name, year, created_at, updated_at)
   VALUES (?, 'anime', ?, ?, ?, ?, ?)`
).run('frieren', '葬送的芙莉莲', '葬送的芙莉莲', 2023, Date.now(), Date.now());
const info = db.prepare(`INSERT INTO episodes (work_id, n, title) VALUES (?, ?, ?)`).run('frieren', 1, '第 1 集');
const readBack = db.prepare(
  `SELECT w.name AS wname, e.title AS etitle FROM works w JOIN episodes e ON e.work_id=w.id WHERE e.id=?`
).get(info.lastInsertRowid);

if (!readBack || readBack.wname !== '葬送的芙莉莲') {
  console.error('✗ Spike-2 失败：读写断言未通过', readBack);
  process.exit(1);
}

console.log(`✓ Spike-2 通过：建表 ${tables.length} 张（含 FTS 虚拟表 works_fts）`);
console.log(`  读回演示数据 => ${readBack.wname} / ${readBack.etitle}`);
db.close();
