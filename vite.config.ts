import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Spike-1：最小可用配置。base 用相对路径，保证 `vite build` 产物能被
// Electron 的 loadFile（file://）正确加载，无需起静态服务器。
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
