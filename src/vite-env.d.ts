/// <reference types="vite/client" />

// 允许把原型 / 资源里的 .css 作为副作用导入（仅类型声明，不影响运行）。
declare module '*.css';

// 主进程经由 preload.cjs 暴露的桥（04 §2 通道白名单）。
export {};
declare global {
  interface Window {
    api: {
      invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
    };
  }
}
