-- ============================================================================
-- V001__init.sql — Kaede 初始 schema（Spike-2）
-- 来源：docs/design/03-数据模型与存储设计 §3 / §3.1
-- 只增不改；后续迁移走 V002__*.sql。
-- ============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

-- ---------- 元信息 ----------
CREATE TABLE IF NOT EXISTS schema_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ---------- 系列 ----------
CREATE TABLE IF NOT EXISTS series (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  since_year  INTEGER,
  intro       TEXT DEFAULT '',
  order_note  TEXT DEFAULT '',
  cover_path  TEXT,
  is_custom   INTEGER NOT NULL DEFAULT 0,
  hidden      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- ---------- 作品 ----------
CREATE TABLE IF NOT EXISTS works (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('anime','game','manga','novel','music')),
  name         TEXT NOT NULL,
  display_name TEXT NOT NULL,
  year         INTEGER,
  quarter      INTEGER,
  status       TEXT CHECK (status IN ('连载','完结') OR status IS NULL),
  form         TEXT CHECK (form IN ('剧场版','TV','OVA','单曲专辑','专辑','OST','同人专辑','广播剧') OR form IS NULL),
  og           TEXT NOT NULL DEFAULT '' CHECK (og IN ('','原作','原创','漫画改','轻小说改','游戏改','小说改')),
  accent       TEXT NOT NULL DEFAULT '#6E675F',
  intro        TEXT NOT NULL DEFAULT '',
  cover_path   TEXT,
  series_id    TEXT REFERENCES series(id) ON DELETE SET NULL,
  score        REAL,
  score_src    TEXT,
  votes        INTEGER,
  artist       TEXT,
  album_type   TEXT,
  in_shelf     INTEGER NOT NULL DEFAULT 0,
  shelf_added  INTEGER,
  local        INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  CHECK (score IS NULL OR votes IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_works_kind_year ON works(kind, year DESC);
CREATE INDEX IF NOT EXISTS idx_works_shelf     ON works(in_shelf, kind, shelf_added DESC);
CREATE INDEX IF NOT EXISTS idx_works_series    ON works(series_id);

-- ---------- 标签 ----------
CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS work_tags (
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (work_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_work_tags_tag ON work_tags(tag_id);

-- ---------- 制作 / 声优 ----------
CREATE TABLE IF NOT EXISTS credits (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id   TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN ('production','cast')),
  role      TEXT NOT NULL,
  name      TEXT NOT NULL,
  ord       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_credits_work ON credits(work_id, role_type, ord);

-- ---------- 剧集（动漫） ----------
CREATE TABLE IF NOT EXISTS episodes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id  TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  n        INTEGER NOT NULL,
  title    TEXT DEFAULT '',
  air_at   INTEGER,
  dur_sec  INTEGER,
  local    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (work_id, n)
);
CREATE INDEX IF NOT EXISTS idx_eps_work ON episodes(work_id, n);

-- ---------- 卷 / 话 ----------
CREATE TABLE IF NOT EXISTS volumes (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  n       INTEGER NOT NULL,
  name    TEXT DEFAULT '',
  cover_path TEXT,
  UNIQUE (work_id, n)
);
CREATE TABLE IF NOT EXISTS chapters (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  volume_id INTEGER NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
  n         INTEGER NOT NULL,
  title     TEXT DEFAULT '',
  UNIQUE (volume_id, n)
);

-- ---------- 曲目（音乐） ----------
CREATE TABLE IF NOT EXISTS tracks (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  n       INTEGER NOT NULL,
  title   TEXT NOT NULL,
  dur_sec INTEGER NOT NULL,
  UNIQUE (work_id, n)
);

-- ---------- 游戏属性 ----------
CREATE TABLE IF NOT EXISTS game_info (
  work_id      TEXT PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
  platform     TEXT,
  release_at   INTEGER,
  languages    TEXT,
  dlc          TEXT,
  achievements INTEGER,
  play_status  TEXT CHECK (play_status IN ('在玩','已通关','想玩','搁置'))
);

-- ---------- 进度（唯一真相） ----------
CREATE TABLE IF NOT EXISTS reading_positions (
  work_id    TEXT PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
  at         INTEGER NOT NULL DEFAULT 0,
  ch         INTEGER,
  ch_of_vol  INTEGER,
  done       INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- ---------- 源规则 ----------
CREATE TABLE IF NOT EXISTS rules (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  version      TEXT NOT NULL DEFAULT '1.0.0',
  partition    TEXT,
  origin       TEXT NOT NULL CHECK (origin IN ('builtin','imported')),
  source_url   TEXT,
  spec_json    TEXT NOT NULL,
  enabled      INTEGER NOT NULL DEFAULT 1,
  health       REAL NOT NULL DEFAULT 1.0,
  ok_count     INTEGER NOT NULL DEFAULT 0,
  fail_count   INTEGER NOT NULL DEFAULT 0,
  last_ok_at   INTEGER,
  last_err     TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

-- ---------- 每集候选源 ----------
CREATE TABLE IF NOT EXISTS ep_sources (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id  INTEGER NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  rule_id     TEXT NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  page_url    TEXT NOT NULL,
  play_url    TEXT,
  quality     TEXT,
  latency_ms  INTEGER,
  ok          INTEGER NOT NULL DEFAULT 0,
  last_check  INTEGER,
  UNIQUE (episode_id, rule_id)
);

-- ---------- 更新 ----------
CREATE TABLE IF NOT EXISTS work_updates (
  work_id    TEXT PRIMARY KEY REFERENCES works(id) ON DELETE CASCADE,
  latest_at  INTEGER,
  latest_no  INTEGER,
  seen_no    INTEGER,
  unread     INTEGER NOT NULL DEFAULT 0
);

-- ---------- 关联作品 ----------
CREATE TABLE IF NOT EXISTS work_relations (
  work_id   TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL,
  target_name TEXT,
  rel_type  TEXT NOT NULL,
  PRIMARY KEY (work_id, target_id)
);

-- ---------- 下载 ----------
CREATE TABLE IF NOT EXISTS downloads (
  id         TEXT PRIMARY KEY,
  work_id    TEXT REFERENCES works(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  target_dir TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('queued','running','paused','done','failed')),
  total_items INTEGER NOT NULL DEFAULT 0,
  done_items  INTEGER NOT NULL DEFAULT 0,
  err_code   TEXT,
  err_msg    TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS download_items (
  id           TEXT PRIMARY KEY,
  download_id  TEXT NOT NULL REFERENCES downloads(id) ON DELETE CASCADE,
  episode_id   INTEGER,
  n            INTEGER NOT NULL,
  url          TEXT NOT NULL,
  target_path  TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('queued','running','paused','done','failed')),
  bytes_done   INTEGER NOT NULL DEFAULT 0,
  bytes_total  INTEGER NOT NULL DEFAULT 0,
  seg_done     INTEGER NOT NULL DEFAULT 0,
  seg_total    INTEGER NOT NULL DEFAULT 0,
  speed_bps    INTEGER NOT NULL DEFAULT 0,
  attempts     INTEGER NOT NULL DEFAULT 0,
  err_msg      TEXT,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dli_download ON download_items(download_id, n);

-- ---------- 资源 ----------
CREATE TABLE IF NOT EXISTS resource_roots (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  path     TEXT NOT NULL UNIQUE,
  label    TEXT,
  type     TEXT CHECK (type IN ('local','removable','network')),
  enabled  INTEGER NOT NULL DEFAULT 1,
  scanned_at INTEGER
);
CREATE TABLE IF NOT EXISTS resource_files (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  root_id    INTEGER NOT NULL REFERENCES resource_roots(id) ON DELETE CASCADE,
  rel_path   TEXT NOT NULL,
  is_dir     INTEGER NOT NULL DEFAULT 0,
  kind       TEXT,
  work_id    TEXT,
  size       INTEGER NOT NULL DEFAULT 0,
  mtime      INTEGER,
  ignored    INTEGER NOT NULL DEFAULT 0,
  UNIQUE (root_id, rel_path)
);
CREATE INDEX IF NOT EXISTS idx_rf_parent ON resource_files(root_id, rel_path);
CREATE INDEX IF NOT EXISTS idx_rf_work   ON resource_files(work_id);

-- ---------- 磁盘读数缓存 ----------
CREATE TABLE IF NOT EXISTS disks (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  total      INTEGER,
  free       INTEGER,
  by_kind    TEXT,
  measured_at INTEGER
);

-- ---------- 历史 ----------
CREATE TABLE IF NOT EXISTS history (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  work_id TEXT NOT NULL REFERENCES works(id) ON DELETE CASCADE,
  view    TEXT NOT NULL,
  at      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_at ON history(at DESC);

-- ---------- 刮削缓存 ----------
CREATE TABLE IF NOT EXISTS scrape_cache (
  work_id    TEXT NOT NULL,
  provider   TEXT NOT NULL,
  payload    TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  ttl_sec    INTEGER NOT NULL DEFAULT 604800,
  PRIMARY KEY (work_id, provider)
);

-- ---------- 设置 ----------
CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ---------- 全文检索（trigram 对中文子串友好，SQLite 3.34+） ----------
CREATE VIRTUAL TABLE IF NOT EXISTS works_fts USING fts5(
  name, display_name, intro, tags,
  content='', tokenize='trigram'
);
