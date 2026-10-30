// Electron 主进程（Spike-1）。
// 用 CommonJS（.cjs）是为了不引入第二套 TS 构建管线；
// 渲染进程由 Vite 构建，主进程直接被 electron 运行。
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    // 跟随系统主题 + 无边框由后续阶段做；Spike-1 先验证壳能起。
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    // 开发模式：加载 Vite dev server
    win.loadURL(rendererUrl);
  } else {
    // 生产模式：加载构建产物
    win.loadFile(path.resolve(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
