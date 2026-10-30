'use strict';
// ============================================================================
// preload.cjs — 上下文桥（04 §2 铁律 1：通道白名单）
// ----------------------------------------------------------------------------
// 只暴露 invoke 白名单，不暴露 ipcRenderer 本体；渲染进程通过 window.api 调用。
// ============================================================================
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args);
  },
});
