// ============================================================================
// src/shell/router.tsx — 极简 hash 路由（A 负责，属 src/shell）
// ----------------------------------------------------------------------------
// 桌面端不需要 react-router 这种重依赖；一个 ~20 行的 hash 路由足够驱动页面切换。
// 选 hash 而非 history：Electron 的 file:// 加载下 history API 不可用（见 vite.config base:'./'）。
// 页面只关心「当前路径」，跳转统一走 navigate()，彼此解耦——这正是 A/B 能并行的前提。
// ============================================================================
import { useEffect, useState } from 'react';

/** 读取当前 hash 路径（去掉前导 #，缺省为 '/'）。 */
export function useHashRoute(): string {
  const [hash, setHash] = useState<string>(() => window.location.hash.replace(/^#/, '') || '/');

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash.replace(/^#/, '') || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return hash;
}

/** 跳转到指定路径（写入 location.hash，触发 hashchange）。 */
export function navigate(path: string): void {
  window.location.hash = path;
}
