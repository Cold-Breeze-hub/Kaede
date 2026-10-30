// scripts/check-redline.mjs — 红线检查（Spike-1 最小版）
// ---------------------------------------------------------------------------
// 目标：把定稿 120 条红线里「机器能判」的几条前置成 CI 关卡（见 06 §5）。
// 本版只实现两条，证明管线能跑；后续逐步补（硬编码色值、封面容器、innerHTML…）。
//
// 退出码：0 = 通过，1 = 有违例。

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC_ROOT = join(process.cwd(), 'src');

/** 递归收集 src 下所有 .ts/.tsx 文件（不含 node_modules）。 */
function collect(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collect(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const problems = [];

// ① 禁止 alert()（06 §4.4：一律用应用内对话框）
for (const file of collect(SRC_ROOT)) {
  const text = readFileSync(file, 'utf8');
  if (/\balert\s*\(/.test(text)) {
    problems.push(`${file}: 使用了 alert()，请改用应用内对话框组件`);
  }
}

if (problems.length > 0) {
  console.error('✗ check-redline 发现违例：');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}

console.log('✓ check-redline 通过（已检：alert 禁用；其余项目待补）');
