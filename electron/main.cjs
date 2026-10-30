'use strict';
// ============================================================================
// electron/main.cjs — 主进程（Spike-1 ~ 4 演进版）
// ----------------------------------------------------------------------------
// - Spike-1：Electron 壳 + 加载 Vite / 构建产物
// - Spike-2：接入 SQLite（打开 + 迁移 + seed），暴露 db:stats / library.home
// - Spike-3：暴露 player.resolve（真实源解析）
// - 通道白名单：通过 preload.cjs 暴露 window.api（见 04 §2 铁律 1）
// ============================================================================
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { openDatabase, seedIfEmpty } = require('./../core/db/migrate.cjs');
const { resolveSource } = require('./../core/player/resolve-source.cjs');

let db = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.resolve(__dirname, '../preload.cjs'),
    },
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    win.loadURL(rendererUrl);
  } else {
    win.loadFile(path.resolve(__dirname, '../dist/index.html'));
  }
}

function registerIpc() {
  ipcMain.handle('db:stats', () => {
    if (!db) return { tables: 0, works: 0, episodes: 0 };
    const tables = db.prepare(`SELECT COUNT(*) AS c FROM sqlite_master WHERE type IN ('table','view')`).get().c;
    const works = db.prepare(`SELECT COUNT(*) AS c FROM works`).get().c;
    const episodes = db.prepare(`SELECT COUNT(*) AS c FROM episodes`).get().c;
    return { tables, works, episodes };
  });

  ipcMain.handle('library.home', () => {
    if (!db) return [];
    return db.prepare(
      `SELECT id, name, year, score, cover_path AS cover
       FROM works WHERE in_shelf = 1
       ORDER BY score IS NOT NULL DESC, score DESC
       LIMIT 30`
    ).all();
  });

  ipcMain.handle('player.resolve', (_e, { workId, ep }) => {
    if (!db) return { ok: false, error: 'E_INTERNAL', candidates: [] };
    return resolveSource(db, workId, ep);
  });
}

app.whenReady().then(() => {
  try {
    const userData = app.getPath('userData');
    db = openDatabase(userData);
    seedIfEmpty(db);
  } catch (err) {
    console.error('[kaede] 数据库初始化失败：', err);
  }
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
