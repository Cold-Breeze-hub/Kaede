import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// 还原原型 CSS：把 prototype 的设计令牌直接打进渲染进程，
// 保证壳内视觉与定稿原型一致。
import '../prototype/assets/style.css';
// 应用基础样式（控件外形 / 播放器布局）；不污染原型设计令牌源。
import './app.css';

const root = document.getElementById('root');
if (!root) throw new Error('root element not found');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
