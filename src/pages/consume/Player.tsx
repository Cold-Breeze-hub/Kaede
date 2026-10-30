// Spike-3 播放器证据页（B 负责，目录 src/pages/consume 属 B）。
// 通过 window.api 调主进程 player.resolve，用 hls.js 把真实公开 HLS 挂到 <video>。
// 本地代理（CORS/Referer 改写）是 S1 的事；此处用 CORS 友好的公开测试流直接验证链路。

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface ResolveResult {
  ok: boolean;
  url?: string;
  kind?: 'hls' | 'mp4';
  ruleName?: string;
  candidates?: { ruleId: string; name: string; quality?: string; ok: boolean }[];
  error?: string;
}

export function Player({
  workId,
  ep,
  onClose,
}: {
  workId: string;
  ep: number;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [info, setInfo] = useState<ResolveResult | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    let cancelled = false;

    (async () => {
      const res = await window.api.invoke<ResolveResult>('player.resolve', { workId, ep });
      if (cancelled) return;
      setInfo(res);
      if (!res.ok || !res.url) return;

      const video = videoRef.current;
      if (!video) return;

      if (res.kind === 'hls' && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(res.url);
        hls.attachMedia(video);
      } else {
        video.src = res.url;
      }
      video.play().catch(() => {
        /* 自动播放被浏览器拦截时，等用户手动点播放 */
      });
    })();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [workId, ep]);

  return (
    <div className="app">
      <header className="agg-toolbar">
        <span className="brand">Kaede · 播放器</span>
        <button className="spike-btn" onClick={onClose}>
          ← 返回
        </button>
      </header>

      <main className="player-stage">
        <video ref={videoRef} controls className="player-video" />
        <div className="player-meta">
          {info?.ok
            ? `源：${info.ruleName} · 候选 ${info.candidates?.length ?? 0} 个`
            : `无法解析：${info?.error ?? '未知'}`}
        </div>
        <div className="spike-note">
          Spike-3 · 若此处出现真实视频画面，说明「搜索 → 详情 → m3u8 → &lt;video&gt; 播放」链路已打通
        </div>
      </main>
    </div>
  );
}
