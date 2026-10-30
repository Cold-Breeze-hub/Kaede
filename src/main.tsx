import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// 还原原型 CSS：把 prototype 的样式直接打进渲染进程，
// 验证「设计令牌 / 主题色」在 Electron 壳里能正常加载（Spike-1 关键证据）。
import '../prototype/assets/style.css';

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
