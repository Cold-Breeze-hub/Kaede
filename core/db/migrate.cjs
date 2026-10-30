'use strict';
// ============================================================================
// core/db/migrate.cjs — SQLite 打开与迁移
// ----------------------------------------------------------------------------
// 主进程 CommonJS，可直接 require。S1 阶段会随 electron-vite 转成 TS 版。
// 来源：docs/design/03-数据模型与存储设计 §3 / §6（迁移）。
// ============================================================================
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const SCHEMA_PATH = path.resolve(__dirname, 'schema/V001__init.sql');

/** 执行 V001 schema 并写 meta。 */
function migrate(db) {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(sql);
  db.exec('PRAGMA user_version = 1');
  const now = Date.now();
  db.prepare(`INSERT OR IGNORE INTO schema_meta (key, value) VALUES (?, ?)`).run('schema_version', '1');
  try {
    const pkg = require('../../package.json');
    db.prepare(`INSERT OR IGNORE INTO schema_meta (key, value) VALUES (?, ?)`).run('app_version', pkg.version || '0.0.0');
  } catch {
    db.prepare(`INSERT OR IGNORE INTO schema_meta (key, value) VALUES (?, ?)`).run('app_version', '0.0.0');
  }
  db.prepare(`INSERT OR IGNORE INTO schema_meta (key, value) VALUES (?, ?)`).run('last_migrated_at', String(now));
}

/**
 * 打开（或创建）数据库并执行迁移。
 * @param {string} dataDir 应用数据目录（userData）
 * @returns {import('better-sqlite3').Database}
 */
function openDatabase(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, 'kaede.db'));
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA synchronous = NORMAL');
  migrate(db);
  return db;
}

module.exports = { openDatabase, migrate };
