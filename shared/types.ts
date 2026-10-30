// ============================================================================
// shared/types.ts — 首批契约类型（Spike-1）
// ----------------------------------------------------------------------------
// 这是 A（体验侧）与 B（内核侧）的第一份接口约定。
// 来源：docs/design/03-数据模型与存储设计（DDL）+ 04-接口与源规则规范（DSL v1）。
// 约定：类型只能在这里与模块内部定义；视图层禁止重新定义领域类型（见 06 §4.1）。
// ============================================================================

/** 五个分区（与定稿 §3 的 kind 对齐）。 */
export type Partition = 'anime' | 'comic' | 'novel' | 'game' | 'music';

/** 作品状态。 */
export type WorkStatus = 'airing' | 'finished' | 'upcoming' | 'unknown';

/** 单集 / 单话 / 单章 / 单首的计量单位（unitOf，见定稿 §3.1）。 */
export type UnitOf = '集' | '话' | '章' | '首' | '卷';

/** 作品（聚合后的一个条目）。 */
export interface Work {
  id: string;
  kind: Partition;
  title: string;
  altTitles: string[];
  /** 封面相对/绝对路径；无封面为 null（禁止空字符串）。 */
  cover: string | null;
  /** 媒体分（只读，来自 Bangumi 等），无则 null。 */
  score: number | null;
  year: number | null;
  status: WorkStatus;
  tags: string[];
}

/** 单集（作品下的一个可播放/可读单元）。 */
export interface Episode {
  id: string;
  workId: string;
  /** 卷/季内序号，从 1 开始。 */
  idx: number;
  title: string | null;
  unitOf: UnitOf;
}

/** 选择器引擎（与 04 DSL v1 对齐）。 */
export type SelectorEngine = 'xpath' | 'css' | 'jsonpath';

/** 单条选择器：引擎 + 表达式。 */
export interface Selector {
  engine: SelectorEngine;
  expr: string;
}

/**
 * 源规则（声明式 JSON，specVersion 1）。
 * 与 04 §4 的 DSL v1 字段一一对应；导入 Kazumi 规则走映射（见 04 §9）。
 */
export interface SourceRule {
  id: string;
  /** 固定为 1，向后兼容用。 */
  specVersion: 1;
  name: string;
  homepage: string;
  /** 搜索 URL 模板，@keyword 占位。 */
  searchUrl: string;
  /** 选择器集合：searchList / searchName / searchUrl / epList / epName / epUrl … */
  selectors: Record<string, Selector>;
  /** 视频嗅探配置（Kazumi 规则必须补这块才能播，见 07 §11.3）。 */
  sniff?: {
    kind: 'm3u8' | 'mp4' | 'magnet';
  };
  enabled: boolean;
}

/** 播放 / 阅读进度。 */
export interface Progress {
  workId: string;
  epIdx: number;
  /** 当前位置（毫秒）。 */
  positionMs: number;
  /** 总时长（毫秒）；直播 / 未知为 null。 */
  durationMs: number | null;
  /** 最后更新时间戳（ms）。 */
  updatedAt: number;
}

/** 一次「选源」产出的候选（player 用，按 score 排序）。 */
export interface ResolveCandidate {
  ruleId: string;
  epId: string;
  url: string;
  quality: string | null;
  /** 选源打分（越高越优先，见 07 选源打分）。 */
  score: number;
}
