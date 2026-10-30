/* ============================================================
   ACGN 聚合软件 · 静态原型（现代重构版）应用逻辑
   ============================================================ */
(function(){
  'use strict';

  /* ---------------- 状态 ---------------- */
  const state = {
    bottom:'aggregate', partition:'anime', aggCat:null, randomPick:{}, tagPicks:{},
    /* 随机推荐去重：每个分区记住最近 5 次抽到的 id，避免「换一个」连着抽回同一张 */
    pickHist:{},
    /* 导航轨迹：navFrom 是"上一次停在哪"，lastSig 是它的指纹。
       存指纹是为了挡住重复渲染——navigate() 会同步调一次 route()，浏览器随后
       还会再派发一次 hashchange，第二次重绘会带着 no-anim 把刚起的动画掐掉。 */
    navFrom:null, lastSig:null, pendingAnim:null,
    themeMode:'system', catTag:null,
    pageKind:null, pageTitle:null, artistName:null, toggles:{}, artOpen:{},
    // 音乐播放条：{ id, idx, t, playing } / null
    mp:null,
    // 分类页：排序键 + 升/降序；筛选面板展开态
    catSort:'pop', catAsc:false, catOpenFilter:false,
    // 排行榜维度：day / week / total
    rankDim:'week',
    // 时间表选中日（null = 今天）
    schDay:null, schOnlyMine:false,
    // 作品区：工具条「管理」按钮进入管理态（多选）；手势入口已作废（定稿第 102 条）
    shelfPartition:'anime', shelfManage:false, shelfSel:[], tagOpen:null,
    search:'', searchHist:[],
    /* 首页：点过「换一个」之后隐藏右上角续播按钮（属于被换掉的那张推荐） */
    resumeOff:false,
    /* 搜索范围：'all' = 五个分区一起搜；其余 = 只搜某个分区。
       以前范围被绑死在 state.partition 上（在哪个分区就只能搜哪个），
       搜一部跨介质的作品得先切分区再搜两次。 */
    searchScope:(function(){ try{ return localStorage.getItem('acgn-search-scope')||'all'; }catch(e){ return 'all'; } })(),
    /* 列表分页：key → 已加载条数（每次 30 条，到底再加载 30） */
    listLim:{},
    /* 典藏管理：选中态 / 被移出的系列 / 自定义合集 / 自定义封面 */
    colManage:false, colSel:[],
    colHidden:(function(){ try{ return JSON.parse(localStorage.getItem('acgn-col-hidden')||'[]'); }catch(e){ return []; } })(),
    customSeries:(function(){ try{ return JSON.parse(localStorage.getItem('acgn-col-custom')||'[]'); }catch(e){ return []; } })(),
    customCovers:(function(){ try{ return JSON.parse(localStorage.getItem('acgn-col-covers')||'{}'); }catch(e){ return {}; } })(),
    /* 资源管理：虚拟文件系统路径 / 搜索 / 排序 */
    resPath:[], resQ:'', resSort:'name', resAsc:true, resSel:{},
    /* 作品区排序与筛选（R25） */
    shelfSort:'recent', shelfFilter:'all',
    /* 排行榜：按日/周/总，或按题材（R47） */
    rankMode:'dim', rankTopic:null,
    /* 时间表：开播提醒（R49） */
    schBell:{},
    /* 浏览历史（可删 / 可清空） */
    hist:HISTORY_SEED.map(h=>({...h})),
    downloads: DOWNLOADS.map(d=>({...d})),
    filters:{}, dlFilter:'全部',
    playPos:{}, playEp:{}, readPos:{},
    wikiBusy:{},
    player:null, reader:null,
    // 渲染对比：同一视图内重绘不重播入场动画
    curView:null, curKey:null,
  };

  /* ---------------- 工具 ---------------- */
  const $ = (s,el=document)=>el.querySelector(s);
  function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function shade(hex,f){
    hex=hex.replace('#',''); if(hex.length===3) hex=hex.split('').map(c=>c+c).join('');
    let r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
    r=Math.max(0,Math.min(255,Math.round(r*f)));g=Math.max(0,Math.min(255,Math.round(g*f)));b=Math.max(0,Math.min(255,Math.round(b*f)));
    return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  function coverArt(accent){
    const hi=shade(accent,1.36), mid=accent, lo=shade(accent,0.7), deep=shade(accent,0.46), ink=shade(accent,0.32);
    return `radial-gradient(130% 80% at 12% -15%, ${hi} 0%, transparent 48%),`
         + `radial-gradient(80% 70% at 105% 115%, ${lo} 0%, transparent 55%),`
         + `radial-gradient(55% 45% at 84% 6%, ${mid}55 0%, transparent 60%),`
         + `linear-gradient(158deg, ${deep} 0%, ${ink} 100%)`;
  }
  /* 封面：占位（精致海报渐变 + 首字水印）与真实图片统一切换，后期替换零改动 */
  function coverStyle(w){ return w.cover ? `background-image:url('${w.cover}');background-size:cover;background-position:center top;` : `background:${coverArt(w.accent)}`; }
  function coverInner(w){ return w.cover ? `<img class="cover-img" src="${w.cover}" alt="${esc(w.name)} 封面" loading="lazy">` : `<span class="glyph">${glyphOf(w.name)}</span>`; }
  function glyphOf(name){ return (name||'?').trim().charAt(0); }

  /* ---- R05 / R20：封面取景焦点 ----
     竖版海报塞进宽扁容器时，`center top` 常把主体（脸）切掉，`center` 又会切到天。
     这里按作品稳定派生一个纵向焦点（18%–44%），少数作品手动校正；
     封面盒子用 --focus 变量，宽扁容器统一 background-position:center var(--focus)。 */
  const FOCUS_FIX = { aot:'26%', frieren:'30%', chainsaw:'24%', mushoku:'28%', eva_a:'32%', jojo_a:'22%' };
  function focusOf(w){
    if(!w) return '26%';
    if(FOCUS_FIX[w.id]) return FOCUS_FIX[w.id];
    let h=0; for(let i=0;i<w.id.length;i++) h=(h*31+w.id.charCodeAt(i))%997;
    return (18 + (h%27)) + '%';
  }

  /* ---- R45：播放量/阅读量统一写法：不足 1 万写准确值，超过 1 万按「万」 ---- */
  function fmtCount(n){
    n = Math.max(0, Math.round(n||0));
    if(n < 10000) return n.toLocaleString('zh-CN');
    const v = n/10000;
    return (v>=100 ? Math.round(v) : v.toFixed(1).replace(/\.0$/,'')) + ' 万';
  }

  /* ---- R66：命中词高亮（只包一层 <mark>，不做正则摘要） ---- */
  function hl(text, term){
    const s=String(text==null?'':text);
    if(!term) return esc(s);
    const i=s.toLowerCase().indexOf(term.toLowerCase());
    if(i<0) return esc(s);
    return esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+term.length))+'</mark>'+esc(s.slice(i+term.length));
  }

  /* ---- R06 / G5：统一的「每次 30 条」分页 ----
     key 区分页面（搜索/分类/更新…），换筛选条件时由调用方重置。 */
  const PAGE_SIZE = 30;
  function pageOf(key, list){
    const lim = state.listLim[key] || PAGE_SIZE;
    const shown = list.slice(0, lim);
    return { shown, rest: list.length - shown.length, lim, total: list.length };
  }
  function loadMore(key, rest, total){
    return `<div class="loadmore"><button class="btn" data-action="load-more" data-key="${esc(key)}">
      加载更多 <span style="color:var(--sub);font-weight:600">（还有 ${rest} 条 · 共 ${total} 条）</span></button></div>`;
  }

  /* ---- 通用确认弹窗：删除/移出这类不可逆操作必须先问一次 ---- */
  function confirmBox(title, desc, okLabel, onOk){
    const mask=document.createElement('div');
    mask.className='modal-mask';
    mask.innerHTML=`<div class="modal" role="alertdialog" aria-modal="true">
      <h3>${esc(title)}</h3><p>${esc(desc)}</p>
      <div class="m-acts"><button class="btn" data-m="no">取消</button>
      <button class="btn primary danger" data-m="ok">${esc(okLabel||'删除')}</button></div></div>`;
    document.body.appendChild(mask);
    const close=()=>mask.remove();
    mask.addEventListener('click', e=>{
      if(e.target===mask || e.target.closest('[data-m="no"]')) { close(); return; }
      if(e.target.closest('[data-m="ok"]')){ close(); onOk&&onOk(); }
    });
    document.addEventListener('keydown', function esc2(ev){
      if(ev.key==='Escape'){ close(); document.removeEventListener('keydown',esc2); }
    });
  }

  /* ---- G3：通用「⋯ 更多」浮层菜单 ---- */
  let menuEl=null;
  function closeMenu(){ if(menuEl){ menuEl.remove(); menuEl=null; } }
  function openMenu(anchor, itemsIn){
    closeMenu();
    /* hide:true 的项直接不渲染（比如音乐没有「继续」），也不用在调用处写两套数组 */
    const items=itemsIn.filter(it=>!it.hide)
      .filter((it,i,arr)=>!(it.sep && (i===arr.length-1 || arr[i+1].sep)));
    const r=anchor.getBoundingClientRect();
    const el=document.createElement('div');
    el.className='menu-pop';
    el.innerHTML=items.map(it=>it.sep?'<div class="mp-sep"></div>'
      :`<button data-mk="${esc(it.k)}" class="${it.danger?'danger':''}">${it.icon?icon(it.icon,15):''}${esc(it.label)}</button>`).join('');
    document.body.appendChild(el);
    menuEl=el;
    const w=el.offsetWidth||180, h=el.offsetHeight||120;
    let left=Math.min(r.right-w, window.innerWidth-w-8);
    left=Math.max(8,left);
    let top=r.bottom+6;
    if(top+h>window.innerHeight-8) top=Math.max(8, r.top-h-6);
    el.style.left=left+'px'; el.style.top=top+'px';
    el.addEventListener('click', e=>{
      const b=e.target.closest('[data-mk]'); if(!b) return;
      const it=items.find(x=>x.k===b.dataset.mk);
      closeMenu();
      if(it&&it.run) it.run();
    });
  }
  document.addEventListener('click', e=>{
    if(!e.target || typeof e.target.closest!=='function') return;
    if(menuEl && !e.target.closest('.menu-pop') && !e.target.closest('[data-action="more-menu"],[data-action="dl-menu"]')) closeMenu();
  });

  function setLocal(key,val){ try{ localStorage.setItem(key, typeof val==='string'?val:JSON.stringify(val)); }catch(e){} }

  function seriesMetaOf(sid){
    return SERIES_META[sid] || null;
  }
  /* 典藏封面：用户上传 > 代表作品封面 */
  function seriesCover(sid, members){
    if(state.customCovers[sid]) return state.customCovers[sid];
    const rep = (members||[]).find(m=>m.local) || (members||[])[0];
    return rep ? rep.cover : null;
  }
  function allSeriesIds(){
    const builtin=[...new Set(WORKS.map(w=>w.series).filter(Boolean))].filter(s=>!state.colHidden.includes(s));
    return builtin.concat(state.customSeries.map(s=>s.id));
  }
  function seriesMembers(sid){
    const c=state.customSeries.find(s=>s.id===sid);
    if(c) return c.works.map(getWork).filter(Boolean);
    return getSeriesWorks(sid);
  }
  function seriesName(sid){
    const c=state.customSeries.find(s=>s.id===sid);
    if(c) return c.name;
    const m=getSeriesWorks(sid);
    return SERIES_NAMES[sid] || (m[0]?m[0].name.split(' ')[0]:'未命名系列');
  }

  /* ---------------- 线条图标系统（统一描边 SVG） ---------------- */
  const ICON_PATHS = {
    aggregate:'<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/>',
    shelf:'<path d="M4 5.5C4 4.7 4.9 4 6 4h5v15.5H6c-1.1 0-2-.7-2-1.5z"/><path d="M20 5.5C20 4.7 19.1 4 18 4h-5v15.5h5c1.1 0 2-.7 2-1.5z"/>',
    collection:'<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18"/><path d="M9 4 7 9 12 20 17 9 15 4"/>',
    mine:'<circle cx="12" cy="8.5" r="3.8"/><path d="M5 20c0-3.9 3.1-6 7-6s7 2.1 7 6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    download:'<path d="M12 4v10"/><path d="M8 11l4 3 4-3"/><path d="M5 19h14"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    moon:'<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
    play:'<path d="M8 5.5v13l11-6.5z"/>',
    pause:'<path d="M9 5v14M15 5v14"/>',
    close:'<path d="M6 6l12 12M18 6L6 18"/>',
    tag:'<path d="M4 12.5V5h7.5L20 13.5 13.5 20 4 12.5z"/><circle cx="8.2" cy="8.7" r="1.2"/>',
    danmaku:'<path d="M4 5h16v10H9l-4 4v-4H4z"/><path d="M8 9.5h7M8 12.5h4"/>',
    volume:'<path d="M4 9.5v5h4l5 4V5.5L8 9.5z"/><path d="M16.5 9.5a4 4 0 0 1 0 5"/>',
    fullscreen:'<path d="M4 9V4.5h5M20 9V4.5h-5M4 15v4.5h5M20 15v4.5h-5"/>',
    chevronRight:'<path d="M9 6l6 6-6 6"/>',
    chevronDown:'<path d="M6 9l6 6 6-6"/>',
    chevronLeft:'<path d="M15 6l-6 6 6 6"/>',
    film:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9.5h16M4 14.5h16M8 5v14M16 5v14"/>',
    bookOpen:'<path d="M4 5.5C4 4.7 4.9 4 6 4h5v15.5H6c-1.1 0-2-.7-2-1.5z"/><path d="M20 5.5C20 4.7 19.1 4 18 4h-5v15.5h5c1.1 0 2-.7 2-1.5z"/>',
    book:'<path d="M5 4h11a2 2 0 0 1 2 2v13.5H5z"/><path d="M9 4v13.5"/>',
    game:'<rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M7 11.5v3M5.5 13h3"/><circle cx="15.5" cy="12" r=".8"/><circle cx="17.5" cy="14" r=".8"/>',
    arrowLeft:'<path d="M19 12H6"/><path d="M11 7l-5 5 5 5"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    sliders:'<path d="M4 7h9M16 7h4M4 12h4M11 12h9M4 17h11M17 17h3"/><circle cx="14.5" cy="7" r="1.6"/><circle cx="8.5" cy="12" r="1.6"/><circle cx="14.5" cy="17" r="1.6"/>',
    image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l4.5-4 3 2.5L16 12l3 4"/>',
    doc:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h5M9.5 15h5"/>',
    link:'<path d="M10 14a4 4 0 0 0 5.7.4l2.3-2.3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7-.4L6 11.9a4 4 0 0 0 5.7 5.7l1-1"/>',
    monitor:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M9.5 21h5M12 17v4"/>',
    chart:'<path d="M5 20V10M10 20V5M15 20v-8M20 20v-4"/>',
    clock:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    box:'<path d="M4 8l3-4h10l3 4v11H4z"/><path d="M4 8h16"/>',
    layers:'<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
    bookmark:'<path d="M7 4h10v16l-5-4-5 4z"/>',
    sparkles:'<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>',
    bell:'<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    refresh:'<path d="M20 11a8 8 0 1 0-2.6 6.1"/><path d="M20 5v6h-6"/>',
    check:'<path d="M5 12.5l4.5 4.5L19 7"/>',
    star:'<path d="M12 4l2.4 5.2 5.6.7-4.1 3.9 1.1 5.6L12 16.8 6.9 19.4 8 13.8 3.9 9.9l5.6-.7z"/>',
    music:'<path d="M9 18V5.5l11-2V16"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    disc:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/>',
    mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21M9 21h6"/>',
    dots:'<circle cx="12" cy="5.5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="18.5" r="1.4"/>',
    folder:'<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2.5h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    hdd:'<rect x="3" y="6" width="18" height="8" rx="2"/><path d="M6 14v3a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3"/><circle cx="17" cy="10" r="1"/>',
    trash:'<path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M6.5 7l1 12.5h9L17.5 7"/><path d="M10.5 11v5M13.5 11v5"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    upload:'<path d="M12 16V5"/><path d="M8 8.5L12 4.5l4 4"/><path d="M5 17v2.5h14V17"/>',
    arrowUp:'<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>',
    arrowDown:'<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>',
    eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  };
  function icon(name, size){
    size = size || 20;
    const p = ICON_PATHS[name] || '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  }

  /* ---------------- 主题（跟随系统 / 浅色 / 深色 / 按时间自动） ---------------- */
  function computeDark(mode){
    if(mode==='dark') return true;
    if(mode==='light') return false;
    if(mode==='auto'){ const h=new Date().getHours(); return h>=19 || h<7; }
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function applyThemeMode(mode){
    state.themeMode = mode;
    document.documentElement.classList.toggle('dark', computeDark(mode));
    try{ localStorage.setItem('acgn-theme-mode', mode); }catch(e){}
  }
  (function initTheme(){
    let saved=null; try{ saved=localStorage.getItem('acgn-theme-mode'); }catch(e){}
    if(!saved){ let old=null; try{ old=localStorage.getItem('acgn-theme'); }catch(e){} if(old) saved = old==='dark'?'dark':'light'; }
    applyThemeMode(saved || 'system');
    if(window.matchMedia){
      const mq=window.matchMedia('(prefers-color-scheme: dark)');
      const onChg=()=>{ if(state.themeMode==='system') document.documentElement.classList.toggle('dark', computeDark('system')); };
      if(mq.addEventListener) mq.addEventListener('change', onChg); else if(mq.addListener) mq.addListener(onChg);
    }
    // 按时间模式：每分钟校正一次
    setInterval(()=>{ if(state.themeMode==='auto') document.documentElement.classList.toggle('dark', computeDark('auto')); }, 60000);
  })();

  /* ---------------- 路由 ---------------- */
  function parseHash(){
    let h=location.hash.replace(/^#\/?/,'');
    let [path,qs]=h.split('?');
    const q={}; if(qs){ qs.split('&').forEach(p=>{const i=p.indexOf('='); if(i>=0) q[p.slice(0,i)]=decodeURIComponent(p.slice(i+1));}); }
    const parts=path.split('/').filter(Boolean);
    return { view:parts[0]||'aggregate', id:parts[1]||null, q };
  }
  /* ---- 返回栈 --------------------------------------------------------------
     记的是「一次次真实跳转」，不是「这一页理论上属于谁」。
     以前 parentInfo() 把详情页的上一级写死成首页，于是从作品区点进详情、再点返回，
     人会被扔回首页——来处是作品区，却被送到了另一个地方。
     现在优先回真正的来处；栈空（直接打开链接）才退回结构上的上级。 */
  const backStack=[];
  let historyGuard=false;
  function buildHash(view,q,id){
    let hash='#/'+view+(id?('/'+id):'');
    const keys=Object.keys(q||{}).filter(k=>q[k]!=null && q[k]!=='');
    if(keys.length) hash+='?'+keys.map(k=>k+'='+encodeURIComponent(q[k])).join('&');
    return hash;
  }
  function viewOfHash(h){
    const path=(h||'').replace(/^#\/?/,'').split('?')[0];
    return path.split('/').filter(Boolean)[0]||'aggregate';
  }
  function goHash(hash){
    const cur=location.hash;
    if(!historyGuard && hash && hash!==cur) backStack.push(cur||'#/aggregate');
    historyGuard=false;
    if(location.hash===hash){ route(true); }   // 同地址再点一次＝强制重绘（清掉筛选等临时态）
    else { location.hash=hash; route(); }      // 同步路由，避免依赖 hashchange 异步触发造成的闪烁/竞态
  }
  function navigate(view,q,id){ goHash(buildHash(view,q,id)); }

  /* ---------------- 外壳构建（一次性） ---------------- */
  function buildShell(){
    const app=document.getElementById('app');
    app.innerHTML = `
      <header class="topbar">
        <button class="brand" data-action="brand" aria-label="返回首页">
          <span class="brand-mark">A</span><span class="brand-name">ACGN</span>
        </button>
        <div class="search" id="searchWrap">
          <span class="ico">${icon('search',17)}</span>
          <input id="searchInput" type="text" placeholder="搜索作品 / 歌手 / 标签…" autocomplete="off">
          <button class="scope-btn" id="scopeBtn" data-action="toggle-scope" aria-haspopup="menu" aria-expanded="false" title="搜索范围">
            <span class="scope-cap">范围</span><span id="scopeLabel">全部</span>${icon('chevronDown',13)}
          </button>
          <div class="scope-menu" id="scopeMenu" role="menu" aria-label="搜索范围">
            <div class="scope-menu-t">搜索范围</div>
            ${SEARCH_SCOPES.map(s=>`<button class="scope-item ${s.id===state.searchScope?'on':''}" role="menuitemradio" aria-checked="${s.id===state.searchScope}" data-action="set-scope" data-s="${s.id}">
              <span class="si-label">${esc(s.label)}</span>
              <span class="si-hint">${s.id==='all'?`${PARTITIONS.length} 个分区`:(s.id==='wiki'?'角色 · 声优':`${kindCount(s.id)} 部`)}</span>
              <span class="si-tick">${icon('check',13)}</span>
            </button>`).join('')}
          </div>
        </div>
        <div class="top-actions">
          <button class="iconBtn" id="dlBtn" data-action="goto-download" title="下载中心" aria-label="下载中心">
            ${icon('download',18)}<span class="dot" id="dlDot" style="display:none"></span>
          </button>
        </div>
      </header>
      <main class="view" id="view"></main>
      <nav class="bottomnav" id="bottomnav">
        <button class="bnitem" data-action="bottom" data-tab="aggregate"><span class="bi">${icon('aggregate',22)}</span>首页</button>
        <button class="bnitem" data-action="bottom" data-tab="shelf"><span class="bi">${icon('shelf',22)}</span>作品区</button>
        <button class="bnitem" data-action="bottom" data-tab="collection"><span class="bi">${icon('collection',22)}</span>典藏</button>
        <button class="bnitem" data-action="bottom" data-tab="mine"><span class="bi">${icon('mine',22)}</span>我的</button>
      </nav>`;

    const input=$('#searchInput');
    /* R65：输入防抖 180ms。以前每敲一个字就整页重绘 + 重播一轮入场动画，
       打 5 个字等于 5 次全量渲染。现在只在停手后渲染一次，且搜索态不播 stagger。 */
    let sTimer=null, lastQ=null;
    input.addEventListener('input', ()=>{
      const v=input.value.trim();
      clearTimeout(sTimer);
      sTimer=setTimeout(()=>{
        if(v===lastQ) return;
        lastQ=v;
        state.search=v;
        if(!state.search){ state.aggCat=null; state.listLim={}; }
        state.listLim['search']=PAGE_SIZE;
        state.listLim['wiki-search']=PAGE_SIZE;
        if(location.hash.indexOf('#/aggregate')===0) renderView('aggregate');
        else if(location.hash.indexOf('#/search')===0) renderView('search');
        else { state.bottom='aggregate'; navigate('aggregate',{p:state.partition}); }
      }, 180);
    });
    input.addEventListener('keydown', e=>{
      if(e.key==='Enter' && state.search){
        if(!state.searchHist.includes(state.search)) state.searchHist.unshift(state.search);
        state.searchHist=state.searchHist.slice(0,6);
        /* 回车＝把这次搜索变成一个可分享的地址（#/search?q=…） */
        state.bottom='aggregate';
        navigate('search',{q:state.search});
      }
    });
    updateDlDot();
  }

  function updateDlDot(){
    const dot=$('#dlDot'); if(!dot) return;
    const active=state.downloads.some(d=>d.status==='downloading');
    dot.style.display=active?'block':'none';
  }

  /* ---------------- 外壳行更新（仅底部导航高亮） ---------------- */
  function bottomFor(view){
    if(view==='category'||view==='detail'||view==='series'||view==='wiki'||view==='feature'
       ||view==='search'||view==='player'||view==='reader') return 'aggregate';
    if(view==='download'||view==='resources'||view==='disk'||view==='stats'||view==='settings'||view==='panel') return 'mine';
    return view;
  }
  function renderShellRows(){
    const {view}=parseHash();
    const bottom = bottomFor(view);
    state.bottom = bottom;
    document.querySelectorAll('.bnitem').forEach(b=>{
      b.classList.toggle('on', b.dataset.tab===bottom);
    });
    syncScopeUI();
  }

  /* 范围按钮与菜单勾选：所有会改 searchScope 的路径最后都过这一道，
     别让按钮上写着「动漫」而菜单里勾着「全部」。 */
  function syncScopeUI(){
    const b=$('#scopeBtn'); if(!b) return;
    const lbl=$('#scopeLabel');
    if(lbl) lbl.textContent=scopeLabel(state.searchScope);
    b.classList.toggle('searching', !!state.search);         // 搜索中点亮，提醒当前范围在生效
    b.classList.toggle('scoped', state.searchScope!=='all'); // 选了具体分区时强调
    /* 占位文字跟着范围走：收窄到「音乐」后还写「搜索作品 / 歌手 / 标签」会误导 */
    const inp=$('#searchInput');
    if(inp && !inp.value) inp.placeholder = state.searchScope==='all'
      ? '搜索作品 / 歌手 / 标签…'
      : state.searchScope==='wiki'
        ? '在百科里搜角色 / 声优 / 制作…'
        : `在${scopeLabel(state.searchScope)}里搜索…`;
    const m=$('#scopeMenu');
    if(m) m.querySelectorAll('.scope-item').forEach(it=>{
      const on=it.dataset.s===state.searchScope;
      it.classList.toggle('on',on);
      it.setAttribute('aria-checked', on?'true':'false');
    });
  }

  function closeScope(){
    const m=$('#scopeMenu'), b=$('#scopeBtn');
    if(m) m.classList.remove('show');
    if(b) b.setAttribute('aria-expanded','false');
  }

  /* ---------------- 未知路由兜底 ----------------
     不许静默回落聚合页假装一切正常：地址写错要明确说出来，并给两个出口。 */
  function renderNotFound(hint){
    /* R69：以前把内部 hash 直接丢给用户（「找不到 #/panel」）。地址是程序之间的约定，
       不是用户写的东西，这里只说「你访问的页面」。 */
    return `<div class="notfound">
      <div class="nf-code">404</div>
      <div class="nf-title">这个页面不存在</div>
      <div class="nf-desc">你访问的页面可能已经改名，或者链接不完整${hint?`（${esc(hint)}）`:''}。<br>
        也可能是这部作品还没收进站里。</div>
      <div class="nf-actions">
        <button class="btn primary" data-action="nf-home">${icon('aggregate',16)} 回到首页</button>
        <button class="btn" data-action="back">${icon('arrowLeft',16)} 返回上一页</button>
      </div>
    </div>`;
  }

  /* ---------------- 视图渲染 ----------------
     同一视图内重绘（切筛选 / 排序 / 选中）不重播入场动画，也不回到顶部；
     只有真正换页面才播 viewIn。 */
  function renderView(view, id, animOverride){
    const view_el=$('#view');
    const q=parseHash().q;
    const key=view+'|'+(id||'')+'|'+(q.p||'');
    const pending = animOverride || state.pendingAnim;
    state.pendingAnim=null;
    const same = pending ? pending==='same' : (state.curView===view && state.curKey===key);
    state.curView=view; state.curKey=key;
    /* 同一个元素上换 data-anim 的值不会重播动画：必须先摘掉属性、强制一次样式计算、
       再挂回去。少了中间这一步，第二次进入同一类页面就"没有动画"了。 */
    view_el.removeAttribute('data-anim');
    view_el.classList.toggle('no-anim', same || pending==='first');
    void view_el.offsetWidth;
    switch(view){
      case 'aggregate': view_el.innerHTML=renderAggregate(); break;
      case 'search': view_el.innerHTML=renderAggregate(); break;  // 搜索结果就是首页的搜索分支
      case 'player': view_el.innerHTML=renderDetail(id); break;   // 播放器是覆盖层，底衬用详情页
      case 'reader': view_el.innerHTML=renderDetail(id); break;
      case 'shelf': view_el.innerHTML=renderShelf(); break;
      case 'collection': view_el.innerHTML=renderCollection(); break;
      /* #/mine/disk、#/mine/resource 这两个地址以前会静默渲染成「我的」——
         地址说明它要哪个页面，就该给哪个页面。 */
      case 'mine': view_el.innerHTML = id==='disk' ? renderDisk()
                                   : id==='resource' ? renderResources()
                                   : renderMine(); break;
      case 'category': view_el.innerHTML=renderCategory(); break;
      case 'feature': view_el.innerHTML=renderFeature(); break;
      case 'panel': view_el.innerHTML=renderPanel(); break;
      case 'detail': view_el.innerHTML=renderDetail(id); break;
      case 'series': view_el.innerHTML=renderSeries(id); break;
      case 'wiki': view_el.innerHTML=renderWiki(id); break;
      case 'download': view_el.innerHTML=renderDownload(); break;
      case 'resources': view_el.innerHTML=renderResources(); break;
      case 'disk': view_el.innerHTML=renderDisk(); break;
      case 'stats': view_el.innerHTML=renderStats(); break;
      case 'settings': view_el.innerHTML=renderSettings(); break;
      default: view_el.innerHTML=renderNotFound();
    }
    if(!same && pending && pending!=='first' && pending!=='same'){
      view_el.setAttribute('data-anim', pending);
    }
    if(!same) window.scrollTo(0,0);
    updateChipFades();
  }
  /* 筛选 chips 能不能滑：只有滑得动才加右侧渐隐（见 style.css 的 .has-more） */
  function updateChipFades(){
    document.querySelectorAll('.st-chips').forEach(el=>{
      el.classList.toggle('has-more', el.scrollWidth > el.clientWidth+1);
    });
  }

  /* 导航动作 → 动画。五种动作必须能被用户分辨出来，否则"全站淡入"跟没做一样。 */
  const VIEW_DEPTH={aggregate:0,shelf:0,collection:0,mine:0,
                    category:1,feature:1,panel:1,download:1,resources:1,disk:1,stats:1,settings:1,search:1,
                    detail:2,series:2,wiki:3,player:3,reader:3};
  function animFor(view,id,q,sig){
    const f=state.navFrom;
    const curP=(q&&q.p)||'';
    if(!f) return 'first';                                   // 首屏：直接出来，别淡入
    /* 比对整条签名，别只比 view/id/p：功能页之间互切（k 不同）和分类页切标签（tag 不同）
       在 view/id/p 上长得一模一样，只比这三项会被当成"原地重绘"，动画就没了。 */
    if(f.sig===sig) return 'same';
    /* 首页换分区：横滑，方向跟分区条从左到右的排列一致 */
    if(f.view==='aggregate' && view==='aggregate'){
      const a=PARTITIONS.findIndex(x=>x.id===f.p);
      const b=PARTITIONS.findIndex(x=>x.id===curP);
      return (a>=0 && b>=0 && b<a) ? 'part-l' : 'part-r';
    }
    const d0=VIEW_DEPTH[f.view]||0, d1=VIEW_DEPTH[view]||0;
    if(d0===0 && d1===0) return 'tab';                       // 底栏四个根页互跳：同级，动作要小
    if(bottomFor(f.view)!==bottomFor(view) && d1===0) return 'tab';
    return d1<d0 ? 'pop' : 'push';                           // 进去 / 退出来
  }

  /* ----- 聚合上下文工具条：四分区并列（原来那样），不是范围下拉 ----- */
  /* active 传 null 时一个都不高亮：全范围搜索时结果不属于任何单个分区，
     高亮「动漫」会让人以为搜出来的只有动漫。 */
  function aggToolbar(active){
    const cur = active===undefined ? state.partition : active;
    const segs=PARTITIONS.map(p=>`<button class="pseg ${p.id===cur?'on':''}" data-action="partition" data-p="${p.id}">${esc(p.label)}</button>`).join('');
    return `<div class="toolbar agg-toolbar"><div class="partition-bar">${segs}</div></div>`;
  }

  /* 分区功能按键区：第一位固定「全部」（= 该分区全部作品 + 筛选），后面接各区功能 */
  function partitionFunctions(){
    const map = {
      anime: [
        {label:'时间表', icon:'clock', k:'schedule'},
        {label:'排行榜', icon:'chart', k:'ranking'},
        {label:'标签广场', icon:'sliders', k:'tags'},
      ],
      game: [
        /* R54：「新游推荐」里 6 部有 5 部是 2018–2022 年的，叫「新」名不副实。
           先改回它的真实身份「推荐游戏」，等有推荐算法再上线，现在点进去是说明页。 */
        {label:'推荐游戏', icon:'sparkles', k:'newgames'},
        {label:'即将发售', icon:'clock', k:'upcoming'},
        {label:'排行榜', icon:'chart', k:'ranking'},
        {label:'评测', icon:'doc', k:'reviews'},
        {label:'攻略', icon:'bookOpen', k:'guides'},
      ],
      manga: [
        {label:'排行榜', icon:'chart', k:'ranking'},
        {label:'最近更新', icon:'clock', k:'updates'},
        {label:'标签广场', icon:'sliders', k:'tags'},
      ],
      novel: [
        {label:'排行榜', icon:'chart', k:'ranking'},
        {label:'更新表', icon:'clock', k:'updates'},
        {label:'标签广场', icon:'sliders', k:'tags'},
      ],
      /* 音乐这一排是照着音乐平台做的：
         网易云「发现音乐」= 个性推荐 / 歌单 / 排行榜；QQ 音乐「音乐馆」= 歌手 / 排行 / 分类歌单。
         二次元场景再加一个「广播剧」（音声、Drama CD 是这类库的固定品类）。 */
      music: [
        {label:'每日推荐', icon:'sparkles', k:'daily'},
        {label:'排行榜',   icon:'chart',    k:'ranking'},
        {label:'歌手',     icon:'mic',      k:'artists'},
        {label:'分类歌单', icon:'layers',   k:'playlists'},
        {label:'广播剧',   icon:'disc',     k:'drama'},
      ],
    };
    return map[state.partition] || map.anime;
  }
  function functionZone(){
    // 「全部」+ 各功能按钮：同一行等宽排满，不留空位
    const fns=partitionFunctions().map(f=>`<button class="fn-btn" data-action="fn" data-k="${f.k}" data-t="${esc(f.label)}">${icon(f.icon,17)}<span>${f.label}</span></button>`).join('');
    return `<section class="fnzone">
      <div class="fnzone-row">
        <button class="fn-btn" data-action="open-category">${icon('layers',17)}<span>全部</span></button>
        ${fns}
      </div>
    </section>`;
  }

  /* ----- 聚合页 ----- */
  function renderAggregate(){
    const p=state.partition;

    /* 搜索优先。范围由 state.searchScope 决定：
       'all' = 五个分区一起搜，结果按分区成组；其余 = 只搜那个分区。
       以前范围被绑死在 state.partition 上，搜跨介质的作品要先切分区再搜一遍。 */
    if(state.search){
      const t=state.search.toLowerCase();
      const scope=state.searchScope||'all';
      /* 范围只影响搜索，不回写 state.partition：
         把分区也跟着改掉的话，清空搜索词之后用户会莫名落到另一个分区的首页。 */
      const hist = state.searchHist.length
        ? `<div class="subchips" style="margin-bottom:var(--s-4);"><span class="subchip" style="border:none;background:var(--tagBg);">历史</span>${state.searchHist.map(h=>`<button class="subchip" data-action="search-hist" data-term="${esc(h)}">${esc(h)}</button>`).join('')}</div>`
        : '';

      /* ---- 百科范围（R67）：命中的是条目里的角色 / 声优 / 制作人员 ---- */
      if(scope==='wiki'){
        const rows=WORKS.map(w=>({w,hits:matchWiki(w,t)})).filter(x=>x.hits.length);
        const head=`<div class="view-head"><div class="view-title">百科 · 搜索「${esc(state.search)}」</div>
          <div class="view-sub">范围：百科 · ${rows.length?`${rows.length} 个条目`:'没有结果'}</div></div>`;
        if(!rows.length){
          return aggToolbar('wiki') + `<div class="page-body">${head}
            <div class="empty"><span class="e-ico">${icon('book',40)}</span>百科里没有匹配「${esc(state.search)}」的条目<br>
            <span style="opacity:.8">可以搜角色名、声优、制作公司</span></div></div>`;
        }
        const pg=pageOf('wiki-search', rows);
        const body=pg.shown.map(({w,hits})=>`<button class="work-item" data-action="open-wiki" data-id="${w.id}">
          <div class="wi-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
          <div class="wi-body">
            <div class="wi-name">${hl(w.name,t)}</div>
            <div class="wi-meta">${esc(hits.slice(0,2).join(' · '))}</div>
          </div>
          <span class="wi-go">${icon('chevronRight',18)}</span>
        </button>`).join('');
        return aggToolbar('wiki') + `<div class="page-body">${head}${hist}<div class="worklist">${body}</div>
          ${pg.rest>0?loadMore('wiki-search',pg.rest,pg.total):''}</div>`;
      }

      /* ---- 全范围：按分区成组，每组最多 3 条 + 「查看全部 N 项」 ---- */
      if(scope==='all'){
        const groups=PARTITIONS.map(p=>({p, list:WORKS.filter(w=>w.kind===p.id && matchWork(w,t))}))
          .filter(g=>g.list.length);
        const wikiRows=WORKS.map(w=>({w,hits:matchWiki(w,t)})).filter(x=>x.hits.length);
        const total=groups.reduce((n,g)=>n+g.list.length,0)+wikiRows.length;
        const head=`<div class="view-head"><div class="view-title">搜索「${esc(state.search)}」</div>
          <div class="view-sub">全部范围 · ${total?`${groups.length+(wikiRows.length?1:0)} 类 · ${total} 项`:'没有结果'}</div></div>`;
        if(!total){
          return aggToolbar(null) + `<div class="page-body">${head}
            <div class="empty"><span class="e-ico">${icon('search',40)}</span>五个分区里都没有匹配「${esc(state.search)}」的作品<br>
              <span style="opacity:.8">试试作品名、标签、歌手或声优</span></div></div>`;
        }
        /* R67：组内不再全量铺开——一次搜出 19 部动漫时，光第一组就要滚两屏 */
        const body=groups.map(g=>{
          const shown=g.list.slice(0,3);
          return `<div class="section-title">${esc(g.p.label)}<span class="sec-right">${g.list.length} 项</span>
            ${g.list.length>3?`<button class="grp-more" data-action="set-scope" data-s="${g.p.id}">查看全部 ${g.list.length} 项 ${icon('chevronRight',13)}</button>`:''}</div>`
            +`<div class="worklist">${shown.map((w,i)=>workListItem(w,i)).join('')}</div>`;
        }).join('');
        const wikiBlock = wikiRows.length ? `<div class="section-title">百科<span class="sec-right">${wikiRows.length} 项</span>
          ${wikiRows.length>3?`<button class="grp-more" data-action="set-scope" data-s="wiki">查看全部 ${wikiRows.length} 项 ${icon('chevronRight',13)}</button>`:''}</div>
          <div class="worklist">${wikiRows.slice(0,3).map(({w,hits})=>`<button class="work-item" data-action="open-wiki" data-id="${w.id}">
            <div class="wi-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
            <div class="wi-body"><div class="wi-name">${hl(w.name,t)}</div>
            <div class="wi-meta">${esc(hits.slice(0,2).join(' · '))}</div></div>
            <span class="wi-go">${icon('chevronRight',18)}</span></button>`).join('')}</div>` : '';
        return aggToolbar(null) + `<div class="page-body">${head}${hist}${body}${wikiBlock}</div>`;
      }

      /* ---- 单分区：结果平铺，标题写明范围 ---- */
      const list=WORKS.filter(w=>w.kind===scope && matchWork(w,t));
      const others=WORKS.filter(w=>w.kind!==scope && matchWork(w,t)).length
        + WORKS.map(w=>({w,hits:matchWiki(w,t)})).filter(x=>x.hits.length).length;
      const head=`<div class="view-head"><div class="view-title">${esc(labelOfPartition(scope))} · 搜索「${esc(state.search)}」</div>
        <div class="view-sub">范围：${esc(labelOfPartition(scope))} · ${list.length?`${list.length} 项`:'没有结果'}</div></div>`;
      if(!list.length){
        return aggToolbar(scope) + `<div class="page-body">${head}
          <div class="empty"><span class="e-ico">${icon('search',40)}</span>${esc(labelOfPartition(scope))}里没有匹配的作品${others?`，其他范围还有 ${others} 项`:''}${others?`<br><button class="btn" data-action="scope-all" style="margin-top:var(--s-4)">在全部范围中搜索</button>`:''}</div></div>`;
      }
      const pg=pageOf('search', list);
      const more = others ? `<button class="more-hint" data-action="scope-all">其他范围还有 ${others} 项 · 在全部范围中查看 ${icon('chevronRight',14)}</button>` : '';
      return aggToolbar(scope) + `<div class="page-body">${head}${hist}${workList(pg.shown)}
        ${pg.rest>0?loadMore('search',pg.rest,pg.total):''}${more}</div>`;
    }

    /* 分区条留在 .agg-body **外面**：切分区时它只是换一个高亮，不该跟着内容左右滑。
       横滑动效只作用在 .agg-body 上（见 style.css 的 part-r / part-l）。 */
    return aggToolbar() + `<div class="page-body">` + renderHome() + `</div>`;
  }

  /* Hero 单独抽出来：点「换一个」时只替换这一块，页面其余部分一动不动。
     以前走整页重渲染，整页入场动画跟着重播一遍——换的是一张推荐，不是换了个页面。 */
  function pickRandom(pool, key){
    const hist=state.pickHist[key]||[];
    let cand=pool.filter(w=>!hist.includes(w.id));
    if(!cand.length) cand=pool;
    const pick=cand[Math.floor(Math.random()*cand.length)] || pool[0];
    state.pickHist[key]=[pick.id].concat(hist).slice(0,PICK_MEMORY);
    return pick;
  }
  /* 最近在看在读、且没看完的那一部 —— Hero 右上角那颗浮动续播按钮指向它。
     **只在本分区里找，找不到就不显示**：以前会往全站回落，于是在游戏首页弹出
     「继续观看《命运石之门》第 12 集」——按钮的介质和整个页面说的不是一回事，
     点下去还是跳去别处，比不显示更糟。 */
  function latestUnfinished(){
    const ok=w=>w && w.kind===state.partition && w.progress && !w.progress.done
              && w.kind!=='game' && w.kind!=='music';
    for(const h of state.hist){ const w=getWork(h.work); if(ok(w)) return w; }
    return WORKS.find(ok) || null;
  }

  function heroBlock(){
    // 随机推荐：当前分区内抽取，且不与最近 5 次重复（R04）
    const pool = WORKS.filter(w=>w.kind===state.partition);
    const feat = state.randomPick[state.partition] || (state.randomPick[state.partition] = pickRandom(pool, state.partition));
    // 主操作随介质变化：动漫=播放 / 游戏=启动 / 漫画·小说=开始阅读
    const heroAct = feat.kind==='anime' ? {act:'open-player-latest', label:'立即播放', ico:'play'}
                  : feat.kind==='game'  ? {act:'launch-game',        label:'启动游戏', ico:'play'}
                  : feat.kind==='music' ? {act:'play-album',         label:'播放全部', ico:'play'}
                  : {act:'open-reader', label:'开始阅读', ico:'bookOpen'};
    /* Hero：封面当背景框，但**贴在右边**——左边整块留给文字（信息区因此有整屏宽度的 2/3），
       封面左缘渐隐融进模糊打底，右缘保留完整画面（不再从中间裁人像）。整块可点。 */
    const pos=`center ${focusOf(feat)}`;
    const heroBg = feat.cover
      ? `background-image:url('${feat.cover}');background-position:${pos}`
      : `background:${coverArt(feat.accent)}`;
    /* Hero 里不必再标介质：分区已经决定了介质，标题里的「（漫画）/（小说）」
       这种同名区分后缀要去掉（同一句话里说两遍介质属无效信息）。 */
    const heroName = feat.name.replace(/（(漫画|小说|动漫)）$/,'');

    /* R01：首页第一件事通常是「接着上次看」。之前给的两版方案（顶部窄条 / 改推荐优先级）
       都太抢戏，这里换成 Hero 右上角的一颗浮动续播按钮：
       · 不新增任何布局块，不打乱 Hero 的三段结构；
       · 环形进度直接画出「看到多少」，文字只写作品与集数；
       · 没有未完成进度时整颗按钮不出现。
       · 它属于**这一张推荐**：点了「换一个」就一起撤掉——用户换的正是"不想接着这个往下"，
         留着那颗按钮等于把被否掉的选项又推回来一次。 */
    const res = state.resumeOff ? null : latestUnfinished();
    let resumeBtn='';
    if(res){
      const p=res.progress||{};
      const isBook=res.kind!=='anime';
      const label=isBook?`第 ${p.at} 卷`:`第 ${p.at} 集`;
      const verb=isBook?'继续阅读':'继续观看';
      resumeBtn=`<button class="hero-resume" data-action="continue-work" data-id="${res.id}"
        style="--p:${p.pct||0}" title="${verb}《${esc(res.name)}》 · ${label} ${p.pct||0}%"
        aria-label="${verb}《${esc(res.name)}》${label}">
        <span class="hr-ring">${icon('play',13)}</span>
        <span class="hr-txt"><b>继续</b><span>${esc(res.name.replace(/（(漫画|小说|动漫)）$/,''))} · ${label}</span></span>
      </button>`;
    }

    return `<section class="hero" data-kind="${feat.kind}" data-action="open-detail" data-id="${feat.id}" role="link" tabindex="0" aria-label="查看《${esc(feat.name)}》详情">
      <div class="hero-bg" style="${heroBg}"></div>
      <div class="hero-poster" style="${heroBg}"></div>
      <div class="hero-veil"></div>
      ${resumeBtn}
      <div class="hero-inner">
        <div class="hero-head">
          <div class="hero-kicker">随机推荐</div>
          <h1 class="hero-title">${esc(heroName)}</h1>
        <div class="hero-meta">
          <span class="chip score">${feat.score.toFixed(1)}</span>
          <span class="chip">${feat.year}</span>
          ${feat.kind==='music'?`<span class="chip">${countOf(feat)} 首 · ${albumDur(feat)}</span>`:''}
          ${feat.tags.slice(0,3).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}
        </div>
        <!-- 简介紧跟评分：这里是"这一部讲什么"，用户视线从标题下来第一眼就该读到它，
             不是被丢到 hero 正中、上下各留一大块空气。简介长短由内容自己决定，
             下面的 hero-body 只当弹簧，把按钮顶到底。 -->
        <p class="hero-intro">${esc(feat.intro)}</p>
        </div>
        <div class="hero-body" aria-hidden="true"></div>
        <div class="hero-actions">
          <button class="btn primary" data-action="${heroAct.act}" data-id="${feat.id}">${icon(heroAct.ico,16)} ${heroAct.label}</button>
          <button class="btn ghost" data-action="hero-shuffle">换一个</button>
        </div>
      </div>
    </section>`;

  }

  function renderHome(){
    const pool = WORKS.filter(w=>w.kind===state.partition);
    // 功能区 + 按标签分组的作品区（每组 6 部，带「刷新 / 更多」）
    return heroBlock() + functionZone() + tagRows(pool);
  }

  /* 统计分区内高频标签，取前 N 个作为分组 */
  function topTags(list, n){
    const freq={};
    list.forEach(w=>(w.tags||[]).forEach(t=>{ freq[t]=(freq[t]||0)+1; }));
    return Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,n);
  }
  /* 每组露出的卡片数：一行 6 列。封面小一点反而更清楚——原图分辨率有限，
     摊成 3 列时被放大到 300+px 会发糊，6 列约 150px 正好接近原图尺寸。 */
  const TAG_COLS = 6;
  function tagRows(list){
    // 只保留至少 3 部作品的题材（不足 3 部会出现空卡片位）
    const freq={};
    list.forEach(w=>(w.tags||[]).forEach(t=>{ freq[t]=(freq[t]||0)+1; }));
    const tags=Object.keys(freq).filter(t=>freq[t]>=3)
      .sort((a,b)=>freq[b]-freq[a]).slice(0,4);

    return tags.map(tag=>{
      const pool=list.filter(w=>(w.tags||[]).includes(tag));
      const key=state.partition+'|'+tag;
      if(!state.tagPicks[key]) state.tagPicks[key]=pool.slice(0,TAG_COLS).map(w=>w.id);
      let shown=state.tagPicks[key].map(id=>getWork(id)).filter(w=>w && w.kind===state.partition).slice(0,TAG_COLS);
      if(!shown.length){ shown=pool.slice(0,TAG_COLS); }
      const cards=shown.map((w,i)=>tagCard(w,i)).join('');
      return `<section class="tag-block">
        <div class="tag-head">
          <button class="tag-title" data-action="tag-more" data-tag="${esc(tag)}">${esc(tag)}<span class="tag-go">${icon('chevronRight',15)}</span></button>
          <button class="tag-refresh" data-action="tag-refresh" data-tag="${esc(tag)}" title="换一批" aria-label="换一批">${icon('refresh',16)}</button>
        </div>
        <div class="tag-row">${cards}</div>
      </section>`;
    }).join('');
  }
  function tagCard(w,i){
    const meta = w.kind==='music'
      ? `${w.year} · ${esc((w.artist||'').split(' / ')[0])}`
      : `${w.year} · ${w.score.toFixed(1)} 分`;
    return `<button class="tag-work" data-action="open-detail" data-id="${w.id}" data-kind="${w.kind}" style="animation-delay:${i*40}ms">
      <div class="tw-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
      <div class="tw-name">${esc(w.name)}</div>
      <div class="tw-meta">${meta}</div>
    </button>`;
  }
  function refreshTag(tag){
    const pool=WORKS.filter(w=>w.kind===state.partition && (w.tags||[]).includes(tag));
    const key=state.partition+'|'+tag;
    const shuffled=pool.slice().sort(()=>Math.random()-0.5);
    state.tagPicks[key]=shuffled.slice(0,TAG_COLS).map(w=>w.id);
    renderView('aggregate');
  }

  /* 单列竖排列表（聚合默认视图） */
  function workList(list){
    if(!list.length) return `<div class="empty"><span class="e-ico">${icon('box',40)}</span>没有匹配的作品</div>`;
    return `<div class="worklist">${list.map((w,i)=>workListItem(w,i)).join('')}</div>`;
  }
  function workListItem(w,i,meta){
    /* 搜索态不播入场动画：结果每敲一个字就换一批，逐条淡入会变成持续闪烁 */
    const anim = state.search ? '' : `animation:fadeUp .45s var(--ease) both;animation-delay:${i*30}ms`;
    return `<button class="work-item" data-action="open-detail" data-id="${w.id}" data-kind="${w.kind}" style="${anim}">
      <div class="wi-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
      <div class="wi-body">
        <div class="wi-name">${hl(w.name, state.search)}</div>
        <div class="wi-meta">${meta?esc(meta):(w.year+' · '+esc((w.tags||[]).join(' / ')))}</div>
      </div>
      <span class="wi-go">${icon('chevronRight',18)}</span>
    </button>`;
  }

  /* ----- 作品区页（分区按钮即标题：我的追番 / 我的游戏 / 我的追漫 / 轻小说书架） ----- */
  /* 进度文案（单行版本）：位置 · 百分比；游戏不记进度，返回空 */
  function progText(w){
    const p=w && w.progress;
    if(!p || w.kind==='game') return '';
    if(p.done) return `全 ${p.total} ${w.kind==='anime'?'集':'卷'} · 已看完`;
    if(w.kind==='anime') return `第 ${p.at} 集 · ${p.pct}%`;
    if(w.kind==='manga') return `第 ${p.at} 卷 · ${p.pct}%`;
    return `第 ${p.at} 卷 · 第 ${p.ch} 章 · ${p.pct}%`;
  }
  /* 作品卡下方的两行信息：
       第一行 = 总量（动漫「全 24 集」/ 漫画·小说「全 34 卷」；游戏改用平台）
       第二行 = 当前进度（第 5 集 · 21%；小说「第 6 卷 · 第 3 章 · 18%」；游戏改用体积） */
  function shelfMeta(w){
    /* 音乐和游戏一样没有"进度"：第一行给发行形态，第二行给「几首 + 多长」 */
    if(w.kind==='music'){
      return { l1:w.albumType||'专辑', l2:`${countOf(w)} 首 · ${albumDur(w)}`, pct:null };
    }
    if(w.kind==='game'){
      const gi=w.gameInfo||{};
      /* 状态放在第二行：筛「在玩」之后，卡片上得看得出哪些是在玩，
         否则筛完还是一片一样的卡，等于没筛。 */
      return { l1:(gi.platform||'PC').split(' · ')[0], l2:`${gi.status||'想玩'} · ${resSize(w)} GB`, pct:null };
    }
    const p=w.progress;
    if(!p) return { l1:'', l2:'', pct:null };
    const l1 = `全 ${p.total} ${w.kind==='anime'?'集':'卷'}`;
    let l2;
    if(p.done) l2='已看完';
    else if(w.kind==='anime') l2=`第 ${p.at} 集`;
    else if(w.kind==='manga') l2=`第 ${p.at} 卷`;
    else l2=`第 ${p.at} 卷 · 第 ${p.ch} 章`;
    /* R24：已看完时不再挂「100%」——「已看完」本身就是 100%，
       两句话说的是同一件事，百分比只会让这一行多占一格。 */
    return { l1, l2, pct:p.done?null:p.pct };
  }
  /* 是否已有本地资源 */
  function hasLocal(w){
    return !!w.local || (w.episodes&&w.episodes.some(e=>e.local)) || (w.volumes&&w.volumes.some(v=>v.local));
  }
  /* 资源体积（GB，演示用稳定派生值） */
  function resSize(w){
    const base = w.kind==='game' ? 12 : w.kind==='anime' ? 0.35 : 0.16;
    return Math.round((base*(1+(w.name.length%7)*0.6))*10)/10;
  }
  /* 下载任务：同一作品只保留一条任务，详情页是唯一发起入口 */
  function dlTaskOf(id){ return state.downloads.find(d=>d.work===id); }
  function dlLabelOf(w){
    const t=dlTaskOf(w.id);
    if(!t) return '下载';
    if(t.status==='done') return '已下载';
    if(t.status==='downloading') return '下载中 '+t.pct+'%';
    return '重新下载';
  }
  function createDownload(w){
    const t=dlTaskOf(w.id);
    if(t){
      if(t.status==='failed'){ t.status='downloading'; t.pct=1; t.speed='1.0 MB/s'; updateDlDot(); toast('已重新加入下载'); }
      else toast(t.status==='done'?'已下载到本地':'已在下载队列');
      return t;
    }
    const name = w.kind==='anime' ? `${w.name} S01E01`
      : w.kind==='game' ? `${w.name} 安装包`
      : `${w.name} 第 1 卷`;
    state.downloads.unshift({ work:w.id, name, pct:2, speed:'1.1 MB/s', status:'downloading' });
    updateDlDot(); toast('已加入下载中心'); return null;
  }
  /* 作品区的排序与筛选**按介质分派**（R-new）：
     同一套「有更新 / 在看 / 已看完」套到游戏上，"看完"是什么？套到音乐上，"在看"是什么？
     游戏不记进度、音乐没有更新，硬套只会让筛选项变成一串点了没结果的按钮。 */
  /* 作品区的筛选**必须按介质各配一套**：
     五类东西的「状态」不是同一维度 —— 动漫/漫画/小说有百分比进度，
     游戏只有离散状态（通关度算不出来），音乐连状态都没有、只能按发行形态分。
     所以这里不是一张通用表，而是每类一份；排序项同理（游戏/音乐才有「年份」）。 */
  const SHELF_CFG={
    anime:{ recent:'最近观看', filters:[['all','全部'],['update','有更新'],['unread','在看'],['done','已看完']] },
    manga:{ recent:'最近阅读', filters:[['all','全部'],['update','有更新'],['unread','在读'],['done','已读完']] },
    novel:{ recent:'最近阅读', filters:[['all','全部'],['update','有更新'],['unread','在读'],['done','已读完']] },
    game: { recent:'最近打开', filters:[['all','全部'],['playing','在玩'],['cleared','已通关'],['todo','待玩']] },
    music:{ recent:'最近播放', filters:[['all','全部'],['ost','OST'],['album','专辑'],['single','单曲'],['drama','广播剧']] },
  };
  function shelfPass(w,f){
    if(f==='all') return true;
    /* 进度类：只对 动漫 / 漫画 / 小说 有意义（游戏的 progress 恒为 null） */
    if(f==='update') return !!hasNewBit(w);
    if(f==='unread') return !!(w.progress && !w.progress.done);
    if(f==='done') return !!(w.progress && w.progress.done);
    /* 游戏：离散状态，不做百分比 */
    const gs=w.gameInfo&&w.gameInfo.status;
    if(f==='playing') return gs==='在玩';
    if(f==='cleared') return gs==='已通关';
    if(f==='todo') return gs==='想玩'||gs==='搁置';
    /* 音乐：按发行形态 */
    if(f==='album') return ['专辑','同人专辑'].includes(w.albumType);
    if(f==='single') return w.albumType==='单曲专辑';
    if(f==='ost') return String(w.albumType||'').includes('OST');
    if(f==='drama') return w.albumType==='广播剧';
    /* 旧值兜底（local / dlc / new 已从任何分区的配置里移除） */
    if(f==='local') return hasLocal(w);
    return true;
  }
  /* 管理态入口只有「管理」按钮与卡片「⋯ → 管理」两处，都指向这一个函数 */
  function enterManage(id){
    state.shelfManage=true;
    state.shelfSel = id ? [id] : [];
    renderView('shelf');
  }
  function exitManage(){ state.shelfManage=false; state.shelfSel=[]; renderView('shelf'); }
  function renderShelf(){
    const p=state.shelfPartition;
    let list=WORKS.filter(w=>w.kind===p && w.shelfStatus);
    const cfg=SHELF_CFG[p]||SHELF_CFG.anime;
    const tabs=PARTITIONS.map(x=>`<button class="pseg ${x.id===p?'on':''}" data-action="shelftab" data-p="${x.id}">${esc(SHELF_TITLE[x.id]||x.label)}</button>`).join('');

    const sorters={
      recent:{ l:cfg.recent, f:w=>{ const i=state.hist.findIndex(h=>h.work===w.id); return i<0?999:i; } },
      name:  { l:'名称',     f:w=>w.name },
      score: { l:'评分',     f:w=>-w.score },
    };
    if(p==='game') sorters.year={ l:'发售年份', f:w=>-(w.year||0) };
    if(p==='music') sorters.year={ l:'发行年份', f:w=>-(w.year||0) };
    const sortKey=sorters[state.shelfSort]?state.shelfSort:'recent';
    list=list.slice().sort((a,b)=>{
      const fa=sorters[sortKey].f(a), fb=sorters[sortKey].f(b);
      return typeof fa==='string' ? fa.localeCompare(fb,'zh') : fa-fb;
    });
    if(state.shelfFilter!=='all') list=list.filter(w=>shelfPass(w,state.shelfFilter));

    const manage=state.shelfManage, n=state.shelfSel.length;

    /* 工具栏与管理条**共用同一行**：进入管理只把这行内容换掉，不额外插一行，
       否则下面的卡片会整体下移一次、退出再弹回来一次，看着像页面在跳。 */
    const tools = manage ? `<div class="shelf-tools managing">
        <span class="st-sel">已选 <b>${n}</b> 项</span>
        <button class="btn" data-action="shelf-remove" ${n?'':'disabled'}>移出作品区</button>
        <div class="st-right">
          <span class="st-hint">点卡片可多选</span>
          <button class="btn primary" data-action="shelf-done">完成</button>
        </div>
      </div>` : `<div class="shelf-tools">
        <label class="sel-mini" title="排序方式">${icon('sliders',12)}
          <select data-action="shelf-sort" aria-label="排序方式">${Object.entries(sorters).map(([k,v])=>
            `<option value="${k}" ${k===sortKey?'selected':''}>${v.l}</option>`).join('')}</select>
        </label>
        <div class="st-chips">
          ${cfg.filters.map(([k,l])=>
            `<button class="subchip ${state.shelfFilter===k?'on':''}" data-action="shelf-filter" data-f="${k}">${l}</button>`).join('')}
        </div>
        <div class="st-right">
          <button class="btn" data-action="shelf-manage">${icon('sliders',15)} 管理</button>
        </div>
      </div>`;
    return `<div class="toolbar agg-toolbar compact"><div class="partition-bar shelf-tabs">${tabs}</div></div>
      <div class="page-body">${tools}
      ${list.length?`<div class="shelf-grid ${manage?'managing':''}">${list.map((w,i)=>shelfCard(w,i)).join('')}</div>`
        :`<div class="empty"><span class="e-ico">${icon('shelf',40)}</span>${state.shelfFilter==='all'?esc(SHELF_TITLE[p]||'作品区')+'还没有作品':'这个筛选条件下没有作品'}</div>`}</div>`;
  }
  /* 五种介质的「继续」不是同一件事：看 / 读 / 玩。一个字「继续」在游戏卡上会变成谎话。 */
  const CONT_LABEL={ anime:'继续观看', manga:'继续阅读', novel:'继续阅读', game:'启动' };
  /* 作品卡：**点封面就开始看/读/玩**，不是进详情。
     这一页的全部意义是「接着看」，多一次详情页点击就是多一道墙；
     想看详情走封面右上角「⋯」里的「作品详情」，或从播放页退出时落到详情页。
     管理态下点封面＝多选。 */
  function shelfCard(w,i){
    const manage=state.shelfManage;
    const sel=manage && state.shelfSel.includes(w.id);
    const act=manage?'shelf-pick':'shelf-open';
    const m=shelfMeta(w);
    /* 作品区已经按介质分区（我的追漫里不会出现轻小说），标题再带「（漫画）」是同一句话说两遍；
       同名区分后缀只在分类页那种混合列表里才有意义。 */
    const cardName=w.name.replace(/（(漫画|小说|动漫)）$/,'');
    const canContinue = w.kind!=='music';
    return `<div class="shelf-card ${sel?'sel':''}" data-id="${w.id}" data-kind="${w.kind}" style="--accent:${w.accent};animation-delay:${i*30}ms">
      <div class="cover" style="${coverStyle(w)}" data-action="${act}" data-id="${w.id}">
        ${coverInner(w)}
        ${hasNewBit(w)?`<span class="new-bit" title="有更新">更新</span>`:''}
        ${manage?`<span class="pick">${sel?icon('check',15):''}</span>`:''}
        ${!manage&&canContinue?`<button class="quick-cont" data-action="shelf-continue" data-id="${w.id}" title="${CONT_LABEL[w.kind]||'继续'}">${icon('play',12)} ${CONT_LABEL[w.kind]||'继续'}</button>`:''}
        ${!manage?`<button class="more-dot" data-action="more-menu" data-id="${w.id}" aria-label="更多操作">${icon('dots',14)}</button>`:''}
      </div>
      <div class="shelf-row">
        <span class="work-name" data-action="${act}" data-id="${w.id}" title="${esc(cardName)}">${esc(cardName)}</span>
      </div>
      <div class="shelf-meta">
        <span class="sm-total">${esc(m.l1)}</span>
        <span class="sm-prog">
          <span class="sm-pos">${esc(m.l2)}</span>
          ${m.pct!=null?`<span class="sm-pct">${m.pct}%</span>`:''}
        </span>
      </div>
    </div>`;
  }
  /* 继续看/继续读：优先用本次播放器/阅读器记住的位置，其次用作品区进度，都没有就从第 1 集/卷开始 */
  function continueWork(w){
    if(w.kind==='game'){ toast('已启动《'+w.name+'》'); return; }
    if(w.kind==='anime'){
      const idx = state.playEp[w.id]!=null ? state.playEp[w.id]
                : (w.progress && w.progress.at>1 ? w.progress.at-1 : 0);
      openPlayer(w.id, Math.max(0, idx));
      return;
    }
    const saved=state.readPos[w.id];
    const vol=(saved && saved.vol) || (w.progress ? w.progress.at : 1);
    openReader(w.id, undefined, vol);
  }

  /* ----- 典藏页（系列整合区） -----
     R20：原来封面是 16:9 横幅 + 竖版海报底图，每次横切一刀、主体位置随机。
     两版「改 focus / 改拼贴」都只是把裁切挪个位置，干脆换成竖版海报卡（2:3）——
     源图本来就是竖的，不裁就是最好的裁法。R22：封面允许用户上传自己的海报。 */
  function renderCollection(){
    const ids=allSeriesIds();
    const manage=state.colManage, n=state.colSel.length;
    const cards=ids.map(sid=>{
      const members=seriesMembers(sid);
      if(!members.length) return '';
      const name=seriesName(sid);
      const since=Math.min(...members.map(m=>m.year));
      const kinds=[...new Set(members.map(m=>m.kind))];
      /* 介质标签只占一行：三个介质时「轻小说」会被挤到第二行，同排卡片的内容底边就参齐了。
         超出部分折成「+1」，点进系列页能看到完整清单。 */
      const shownKinds=kinds.slice(0,2), restKinds=kinds.length-shownKinds.length;
      const pills=shownKinds.map(k=>`<span class="media-pill">${mediaIcon(k,14)} ${(members.find(m=>m.kind===k)||{}).kindLabel||''}</span>`).join('')
        + (restKinds?`<span class="media-pill more" title="${esc(kinds.slice(2).map(k=>((members.find(m=>m.kind===k)||{}).kindLabel||'')).join(' / '))}">+${restKinds}</span>`:'');
      const cover=seriesCover(sid,members);
      const sel=state.colSel.includes(sid);
      const isCustom=state.customSeries.some(s=>s.id===sid);
      return `<div class="series-card ${sel?'sel':''}" data-action="${manage?'col-pick':'open-series'}" data-id="${sid}">
        <div class="sc-banner" style="${cover?`background-image:url('${cover}');background-position:center ${focusOf(members[0])}`:`background:${coverArt(members[0].accent)}`}">
          ${cover?'':`<span class="glyph">${glyphOf(name)}</span>`}
          <span class="sc-veil"></span>
          <span class="sc-badge"><span>${members.length} 部${isCustom?' · 自建':''}</span></span>
          ${manage?`<span class="sc-check">${sel?icon('check',13):''}</span>`:''}
        </div>
        <div class="sc-body">
          <h3 class="sc-name">${esc(name)}</h3>
          <div class="sc-since">SINCE ${since}</div>
          <div class="media-pills">${pills}</div>
        </div>
      </div>`;
    }).join('');

    /* 这一页没有标题（底部导航已经写着「典藏」），也没有一句解释"典藏是什么"的副标题。
       管理态与常态共用同一行工具条：换内容不换高度，卡片不会因为进管理而整体往下掉。 */
    const tools = manage ? `<div class="series-toolbar managing">
        <span class="st-sel">已选 <b>${n}</b> 个</span>
        <button class="btn" data-action="col-cover" ${n===1?'':'disabled'}>${icon('upload',15)} 更换封面</button>
        <button class="btn" data-action="col-remove" ${n?'':'disabled'}>移出典藏</button>
        <div class="st-right">
          <span class="st-hint">${n===1?'':'选 1 个才能换封面'}</span>
          <button class="btn primary" data-action="col-done">完成</button>
        </div>
      </div>` : `<div class="series-toolbar">
        <button class="btn" data-action="col-create">${icon('plus',15)} 新建典藏</button>
        <div class="st-right">
          <span style="font-size:var(--t-xs);color:var(--sub)">${ids.length} 个系列</span>
          <button class="btn" data-action="col-manage">${icon('sliders',15)} 管理</button>
        </div>
      </div>`;

    return `${tools}
      ${cards?`<div class="series-grid">${cards}</div>`
        :`<div class="empty"><span class="e-ico">${icon('collection',40)}</span>典藏是空的，点「新建典藏」把喜欢的作品收进来</div>`}`;
  }

  /* ---- 自建典藏：名称 + 多选作品 ---- */
  function openCollectionPicker(){
    state.tmpSel=[]; state.tmpName='';
    const mask=document.createElement('div');
    mask.className='modal-mask'; mask.id='colPicker';
    mask.innerHTML=collectionPickerHTML();
    document.body.appendChild(mask);
    mask.addEventListener('click', e=>{
      if(e.target===mask){ mask.remove(); return; }
      const t=e.target.closest('[data-pick]');
      if(t){
        const id=t.dataset.pick;
        const i=state.tmpSel.indexOf(id);
        if(i>=0) state.tmpSel.splice(i,1); else state.tmpSel.push(id);
        const box=mask.querySelector('.cp-list');
        const list=WORKS;
        box.innerHTML=collectionPickRows();
        mask.querySelector('.cp-count').textContent=`已选 ${state.tmpSel.length} 部`;
        return;
      }
      if(e.target.closest('[data-cp="cancel"]')){ mask.remove(); return; }
      if(e.target.closest('[data-cp="ok"]')){
        const nm=(mask.querySelector('#cpName').value||'').trim();
        if(!nm){ toast('先给这个典藏起个名字'); return; }
        if(!state.tmpSel.length){ toast('至少选一部作品'); return; }
        const id='custom_'+Date.now().toString(36);
        state.customSeries.push({ id, name:nm, works:state.tmpSel.slice() });
        setLocal('acgn-col-custom', state.customSeries);
        mask.remove(); renderView('collection'); toast(`已新建典藏「${nm}」`);
      }
    });
  }
  function collectionPickerHTML(){
    return `<div class="modal" style="max-width:520px">
      <h3>新建典藏</h3>
      <p>给这一组作品一个名字，之后可以随时改成员、换封面。</p>
      <input id="cpName" placeholder="例如：周末一口气看完" style="width:100%;margin:var(--s-4) 0 var(--s-3);
        padding:10px 12px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--bg);
        color:var(--text);font:inherit;">
      <div style="display:flex;align-items:center;font-size:var(--t-xs);color:var(--sub);margin-bottom:8px">
        <span class="cp-count">已选 0 部</span><span style="margin-left:auto">可跨分区选择</span></div>
      <div class="cp-list" style="max-height:44vh;overflow:auto;border:1px solid var(--line);border-radius:var(--r-md);padding:6px">
        ${collectionPickRows()}
      </div>
      <div class="m-acts"><button class="btn" data-cp="cancel">取消</button>
      <button class="btn primary" data-cp="ok">创建</button></div>
    </div>`;
  }
  function collectionPickRows(){
    return PARTITIONS.map(p=>{
      const list=WORKS.filter(w=>w.kind===p.id);
      return `<div style="font-size:10px;font-weight:800;letter-spacing:1px;color:var(--sub);padding:8px 6px 4px">${p.label}</div>`
        + list.map(w=>{
          const on=state.tmpSel.includes(w.id);
          return `<button data-pick="${w.id}" style="display:flex;align-items:center;gap:8px;width:100%;
            padding:7px 6px;border:none;background:${on?'var(--tagBg)':'none'};border-radius:var(--r-sm);
            color:var(--text);font-size:var(--t-sm);text-align:left">
            <span style="width:16px;height:16px;border-radius:4px;border:1.5px solid ${on?'var(--sel)':'var(--line)'};
              background:${on?'var(--sel)':'transparent'};display:flex;align-items:center;justify-content:center;color:var(--selText)">
              ${on?icon('check',11):''}</span>${esc(w.name)}</button>`;
        }).join('');
    }).join('');
  }

  /* ---- 上传典藏海报：缩到 400×600 再存 dataURL，避免把 localStorage 撑爆 ---- */
  let pendingCoverSid=null;
  function pickCover(sid){
    pendingCoverSid=sid;
    let inp=document.getElementById('coverFile');
    if(!inp){
      inp=document.createElement('input');
      inp.type='file'; inp.accept='image/*'; inp.id='coverFile'; inp.style.display='none';
      document.body.appendChild(inp);
      inp.addEventListener('change', ()=>{
        const f=inp.files && inp.files[0]; if(!f) return;
        const fr=new FileReader();
        fr.onload=()=>{
          const img=new Image();
          img.onload=()=>{
            const W=400, H=600;
            const c=document.createElement('canvas'); c.width=W; c.height=H;
            const ctx=c.getContext('2d');
            const s=Math.max(W/img.width, H/img.height);
            const w=img.width*s, h=img.height*s;
            ctx.drawImage(img, (W-w)/2, (H-h)/2, w, h);
            const url=c.toDataURL('image/jpeg',0.82);
            state.customCovers[pendingCoverSid]=url;
            setLocal('acgn-col-covers', state.customCovers);
            renderView('collection'); toast('封面已更新');
          };
          img.src=fr.result;
        };
        fr.readAsDataURL(f);
        inp.value='';
      });
    }
    inp.click();
  }

  /* ----- 我的页 -----
     R29：取消「常用 / 偏好 / 关于」三段分区——设置类入口本来就该和工具类入口排在一起，
     用户找的是「某个功能」，不是「这个功能属于哪一类」。整页只剩一个网格 + 一行版本信息。 */
  function renderMine(){
    const entries = [
      {icon:'download', label:'下载中心', act:'goto-download'},
      {icon:'box', label:'资源管理', act:'open-resources'},
      {icon:'hdd', label:'磁盘管理', act:'open-disk'},
      {icon:'clock', label:'浏览历史', act:'panel', k:'history'},
      {icon:'chart', label:'观看统计', act:'open-stats'},
      {icon:'link', label:'作品关系', act:'panel', k:'relations'},
      {icon:'sliders', label:'源管理', act:'panel', k:'sources'},
      {icon:'game', label:'引擎管理', act:'panel', k:'engines'},
      {icon:'layers', label:'同步备份', act:'panel', k:'backup'},
      {icon:'book', label:'命名规则', act:'panel', k:'rules'},
      {icon:'bell', label:'通知', act:'panel', k:'notify'},
      {icon:'sliders', label:'设置', act:'open-settings'},
    ];
    const grid = entries.map(e=>`<button class="entry" data-action="${e.act}" ${e.k?`data-k="${e.k}"`:''}><span class="ei">${icon(e.icon,20)}</span>${e.label}</button>`).join('');

    /* 不写「我的」标题（底部导航已经写着），也不在头像旁边解释"数据只存在这台设备"、
       不在版本号旁边解释这个软件是什么——用户点进来不是来读说明的。 */
    return `<div class="mine-head">
        <div class="avatar">头</div>
        <div class="mine-id"><div class="name">我 · 本地单机</div></div>
      </div>
      <div class="mine-grid">${grid}</div>
      <div class="about-line" style="margin-top:var(--s-6)">
        <b>ACGN v0.9</b>
        <button class="btn" data-action="check-update" style="margin-left:auto">检查更新</button>
      </div>`;
  }

  /* ----- 站内百科（刮削占位：直接读取本地数据渲染，正式版接入刮削源） ----- */
  function renderWiki(id){
    const w=getWork(id); if(!w) return renderNotFound();
    const busy=state.wikiBusy[w.id]==='loading', done=state.wikiBusy[w.id]==='done';
    const isVA=(w.kind==='anime'||w.kind==='game');
    const m=w.meta||{};
    const info=[
      /* 「原名」在还没有日文原名数据前，就是标题本身 —— 等于把大标题再抄一遍，先不出 */
      {k:'介质',v:w.kindLabel},{k:'首播 / 发售',v:`${w.year} 年 ${quarterTxt(w.quarter)}`},
      {k:'评分',v:w.score.toFixed(1)},{k:'标签',v:(w.tags||[]).join('、')},{k:'来源',v:originText(w)},
      /* R16：别名 / 原名 / 放送局 —— 有数据才出这一行，没有就整行不出，不摆「—」 */
      ...(m.jp?[{k:'原名',v:m.jp}]:[]),
      ...(m.aka?[{k:'别名',v:m.aka}]:[]),
      ...((m.station||w.station)?[{k:'放送局',v:m.station||w.station}]:[]),
      /* 游戏没有"集数"，摆一个「—」等于摆块废话，直接不出这一行 */
      ...(w.kind==='game' ? [] : [{k:'总集数',v:countOf(w)?countOf(w)+' '+totalUnitOf(w.kind):'—'}]),
    ];
    const prod=Object.entries(w.production||{});
    /* R15：角色头像从「取姓名首字做方块」改成统一的人形剪影 —— 首字方块既不像头像，
       也把「角色」和「声优」两种信息压进同一个字形里。 */
    const cast=(w.cast||[]).map(c=>`<div class="cast-card">
        <div class="cast-av">${icon('mine',18)}</div>
        <div class="cast-txt"><b>${esc(c.role)}</b><span>${c.actor&&c.actor!=='-'?'CV · '+esc(c.actor):w.kindLabel}</span></div>
      </div>`).join('');
    // 关联作品：同系列其它介质
    const rel=relatedWorks(w);
    const sid=w.series; const sMembers=sid?getSeriesWorks(sid):[];
    const sMeta=sid?seriesMetaOf(sid):null;
    return `<div class="detail" style="--accent:${w.accent};max-width:820px;margin:0 auto;">
      <button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('wiki')}</button>
      <div class="view-head wiki-head">
        <div class="view-title">百科</div>
        <button class="subchip ${busy?'on':''}" data-action="wiki-refresh" data-id="${w.id}" ${busy?'disabled':''}>${icon('refresh',13)} ${busy?'刮削中…':done?'已更新':'重新刮削'}</button>
      </div>
      ${busy?`<div class="demo-note" style="display:block">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><b>正在重新刮削…</b><span>匹配条目 / 抓取角色表</span></div>
        <div style="height:5px;background:var(--line);border-radius:999px;overflow:hidden">
          <i style="display:block;height:100%;width:60%;background:var(--sel);animation:pulse 1.1s infinite"></i></div></div>`:''}
      <div class="wiki-hero">
        <div class="wiki-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
        <div>
          <h2 class="wiki-name">${esc(w.name)}</h2>
          <div class="wiki-tags">${(w.tags||[]).map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="wiki-block"><div class="wiki-h">简介</div><p class="wiki-p">${esc(w.intro)}</p></div>
      <div class="wiki-block"><div class="wiki-h">基本信息</div>
        <div class="wiki-kv">${info.map(x=>`<div class="kv"><b>${esc(x.k)}</b><span>${esc(x.v)}</span></div>`).join('')}</div>
      </div>
      ${cast?`<div class="wiki-block"><div class="wiki-h">${isVA?'角色 / 声优':'角色'}</div>
        <div class="cast-grid">${cast}</div>
      </div>`:''}
      ${prod.length?`<div class="wiki-block"><div class="wiki-h">制作信息</div>
        <div class="wiki-kv">${prod.map(([k,v])=>`<div class="kv"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>
      </div>`:''}
      ${rel.length?`<div class="wiki-block"><div class="wiki-h">关联作品</div>
        <div class="wiki-rel">${rel.map(r=>`<button class="subchip" data-action="open-detail" data-id="${r.id}">${mediaIcon(r.kind,13)} ${esc(r.name)}</button>`).join('')}</div>
      </div>`:''}
      ${sid&&sMembers.length>1?`<div class="wiki-block"><div class="wiki-h">所属系列</div>
        <button class="subchip" data-action="open-series" data-id="${sid}" style="margin-bottom:var(--s-3)">
          ${icon('collection',13)} ${esc(seriesName(sid))} · ${sMembers.length} 部 ${icon('chevronRight',12)}</button>
        ${sMeta?`<p class="wiki-p" style="margin-top:0">${esc(sMeta.intro)}</p>`:''}
        <div class="wiki-rel">${sMembers.filter(x=>x.id!==w.id).map(x=>
          `<button class="subchip" data-action="open-detail" data-id="${x.id}">${mediaIcon(x.kind,13)} ${esc(x.name)}</button>`).join('')}</div>
      </div>`:''}
      <div class="wiki-block"><div class="wiki-h">资料源</div>
        <div class="wiki-src">${[['萌娘百科',w.wiki.moegirl],['百度百科',w.wiki.baidu],['Bangumi',w.wiki.bangumi]].map(([n,u])=>`<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join('')}</div>
      </div>
    </div>`;
  }

  /* ----- 分类页（参考 B 站番剧索引：排序 tab + 可折叠多维筛选 + 结果网格） ----- */
  /* 排序项按介质给：游戏没有"更新时间"，漫画/小说不叫"开播时间" */
  function catSortsOf(p){
    const list=[
      { k:'pop',   label:'热度', f:w=>w.pop.total },
      { k:'score', label:'评分', f:w=>w.score },
    ];
    if(p==='music'){
      list.length=0;
      list.push({ k:'pop', label:'播放量', f:w=>w.pop.total });
      list.push({ k:'score', label:'评分', f:w=>w.score });
      list.push({ k:'year', label:'发行时间', f:w=>w.year*10+w.quarter });
      return list;
    }
    if(p!=='game') list.push({ k:'updated', label:'更新时间', f:w=>-w.updatedHoursAgo });
    const yearLabel = p==='game' ? '发售时间' : p==='anime' ? '开播时间' : '开始连载';
    list.push({ k:'year', label:yearLabel, f:w=>w.year*10+w.quarter });
    return list;
  }
  /* 筛选维度：只在当前介质内筛，所以不再需要「介质」这一维 */
  function catDimsOf(p){
    const d={};
    /* R08：本地库场景里最实用的一维是「资源状态」——已下载 / 已收藏 / 有更新，
       以前整页没有这个筛选，想只看本地已有的内容只能去资源管理页。 */
    d.状态=['已下载','已收藏','有更新'];
    /* 音乐没有"连载/来源"这些东西：它按发行形态和曲风筛，否则会出现整行都点不出结果的死条件 */
    if(p==='music'){
      d.形态=['单曲专辑','专辑','OST','同人专辑','广播剧'];
      d.曲风=['动画OP','动画OST','摇滚','电子','治愈','Vocaloid','同人音乐','广播剧'];
      d.年份=['2022后','2015-2021','2010-2014','2009前'];
      return d;
    }
    // 类别：连载/完结全适用；新番、剧场版只对动漫成立
    d.类别 = (p==='anime') ? ['连载','完结','新番','剧场版'] : ['连载','完结'];
    d.题材=['热血','科幻','日常','治愈','战斗','悬疑','恋爱','奇幻'];
    d.年份=['2024后','2020-2023','2015-2019','2010-2014','2009前'];
    if(p!=='game') d.季度=['1月','4月','7月','10月'];
    if(p!=='game') d.来源=['原作','原创','漫画改','轻小说改','游戏改','小说改'];
    return d;
  }
  function catYearMatch(y,range){
    if(range==='2022后') return y>=2022;
    if(range==='2015-2021') return y>=2015&&y<=2021;
    if(range==='2024后') return y>=2024;
    if(range==='2020-2023') return y>=2020&&y<=2023;
    if(range==='2015-2019') return y>=2015&&y<=2019;
    if(range==='2010-2014') return y>=2010&&y<=2014;
    if(range==='2009前') return y<2010;
    return true;
  }
  function catFilter(list){
    const f=state.filters||{};
    return list.filter(w=>{
      for(const dim in f){
        const sel=f[dim]; if(!sel||!sel.length) continue;
        if(dim==='题材'){ if(!(w.tags||[]).some(t=>sel.includes(t))) return false; }
        else if(dim==='年份'){ if(!sel.some(r=>catYearMatch(w.year,r))) return false; }
        else if(dim==='季度'){ if(!sel.some(q=>parseInt(q,10)===w.quarter)) return false; }
        else if(dim==='类别'){
          if(!sel.some(s=>{
            if(s==='连载'||s==='完结') return w.status===s;
            if(s==='新番') return !w.form && w.year>=2024;
            if(s==='剧场版') return w.form==='剧场版';
            return true;
          })) return false;
        }
        else if(dim==='来源'){
          if(!sel.includes(w.og||'')) return false;
        }
        else if(dim==='形态'){
          if(!sel.includes(w.albumType||'')) return false;
        }
        else if(dim==='曲风'){
          if(!(w.tags||[]).some(t=>sel.includes(t))) return false;
        }
        else if(dim==='状态'){
          if(!sel.some(s=>{
            if(s==='已下载') return hasLocal(w);
            if(s==='已收藏') return !!w.shelfStatus;
            if(s==='有更新') return hasNewBit(w);
            return true;
          })) return false;
        }
      }
      return true;
    });
  }
  function activeFilterCount(){
    return Object.values(state.filters||{}).reduce((a,v)=>a+(v?v.length:0),0);
  }
  function renderCategory(){
    const p=state.partition;
    const label=labelOfPartition(p);

    // 排序 tab：箭头常驻占位，切换时文字不位移（再点一次切升降序）
    const sorts=catSortsOf(p);
    const sortDef=sorts.find(s=>s.k===state.catSort)||sorts[0];
    const sortBar=sorts.map(s=>`<button class="ctab ${s.k===state.catSort?'on':''}" data-action="cat-sort" data-k="${s.k}">
        <span class="ctab-t">${s.label}</span><span class="ctab-arrow ${state.catAsc?'asc':''}">${icon('chevronDown',12)}</span>
      </button>`).join('');

    // 筛选面板（类别在这里选，页面上不再单列一行）
    const dims=Object.entries(catDimsOf(p)).map(([dim,opts])=>{
      const sel=state.filters[dim]||[];
      return `<div class="frow">
        <div class="frow-t">${dim}</div>
        <div class="frow-opts">
          <button class="fchip ${!sel.length?'on':''}" data-action="cat-opt" data-dim="${dim}" data-opt="">全部</button>
          ${opts.map(o=>`<button class="fchip ${sel.includes(o)?'on':''}" data-action="cat-opt" data-dim="${dim}" data-opt="${o}">${o}</button>`).join('')}
        </div>
      </div>`;
    }).join('');

    let list=catFilter(WORKS.filter(w=>w.kind===p));
    if(state.catTag) list=list.filter(w=>(w.tags||[]).includes(state.catTag));
    list=list.slice().sort((a,b)=>{
      const d=sortDef.f(a)-sortDef.f(b);
      return state.catAsc?d:-d;
    });

    const n=activeFilterCount();
    /* R07：生效条件必须写清「哪一维 / 选了哪个」——只显示「热血 ✕」的话，
       下次看到会以为是标签而不是筛选。 */
    const activeChips=Object.entries(state.filters).flatMap(([dim,arr])=>(arr||[]).map(o=>
      `<button class="subchip on" data-action="cat-opt" data-dim="${dim}" data-opt="${o}">${esc(dim)}：${esc(o)} ✕</button>`)).join('');

    /* R06：标题不写计数（按你的意见），一次最多铺 30 张，到底再「加载更多」 */
    const pg=pageOf('category', list);
    const grid = list.length ? `<div class="cat-grid">${pg.shown.map((w,i)=>catCard(w,i)).join('')}</div>
        ${pg.rest>0?loadMore('category',pg.rest,pg.total):''}`
      : `<div class="empty"><span class="e-ico">${icon('box',40)}</span>没有符合条件的作品<br><button class="btn" style="margin-top:var(--s-4)" data-action="cat-clear">清除全部条件</button></div>`;

    return `<button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('category')}</button>
      <div class="view-head cat-head">
        <div class="view-title">${label} · 全部</div>
        <button class="filter-toggle ${state.catOpenFilter?'on':''}" data-action="cat-filter-toggle">
          ${icon('sliders',15)} 筛选${n?` · ${n}`:''}
        </button>
      </div>
      <div class="cat-sortbar">${sortBar}</div>
      <div class="cat-filter ${state.catOpenFilter?'show':''}">${dims}</div>
      ${state.catTag||n?`<div class="cat-active">
          ${state.catTag?`<button class="subchip on" data-action="cat-tag-clear">${esc(state.catTag)} ✕</button>`:''}
          ${activeChips}
          <button class="cat-clear" data-action="cat-clear">清除全部</button>
        </div>`:''}
      ${grid}`;
  }
  function catCard(w,i){
    const cnt=countOf(w);
    const meta = w.kind==='music'
      ? `${cnt} 首 · ${esc((w.artist||'').split(' / ')[0])}`
      : `${cnt?`全 ${cnt} ${totalUnitOf(w.kind)}`:`${w.year}`} · ${esc((w.tags||[])[0]||'')}`;
    return `<button class="cat-card" data-action="open-detail" data-id="${w.id}" data-kind="${w.kind}" style="animation-delay:${i*25}ms">
      <div class="cc-cover" style="${coverStyle(w)}">
        ${coverInner(w)}
        <span class="cc-score">${w.score.toFixed(1)}</span>
      </div>
      <div class="cc-name" title="${esc(w.name)}">${esc(w.name)}</div>
      <div class="cc-meta">${meta}</div>
    </button>`;
  }

  /* ----- 分区功能区 → 真实功能页（排行榜 / 新番时间表 / 更新 / 标签广场 / 新游 / 评测 / 攻略） ----- */
  const WEEKDAYS=['周一','周二','周三','周四','周五','周六','周日'];
  function todayIdx(){ return (new Date().getDay()+6)%7; }  // 0=周一

  function renderFeature(){
    const k=state.pageKind||'ranking';
    const p=state.partition;
    const pool = WORKS.filter(w=>w.kind===p);
    const FEATURE_KEYS=['ranking','schedule','updates','tags','newgames','upcoming','reviews','guides',
                        'daily','artists','artist','playlists','drama'];
    /* 同上：未知功能页 key 直接 404，不给一个空标题页 */
    if(FEATURE_KEYS.indexOf(k)<0) return renderNotFound();
    if(k==='artist' && !state.artistName) return renderNotFound();
    const title=state.pageTitle || {ranking:'排行榜',schedule:'新番时间表',updates:'最近更新',tags:'标签广场',
      newgames:'推荐游戏',upcoming:'即将发售',reviews:'评测',guides:'攻略',
      daily:'每日推荐',artists:'歌手',artist:'歌手',playlists:'分类歌单',drama:'广播剧'}[k] || '功能';
    let body='';
    if(k==='ranking') body=rankList(pool);
    else if(k==='daily') body=dailyAlbums(pool);
    else if(k==='artists') body=artistGrid(pool);
    else if(k==='artist') body=artistDetail(state.artistName);
    else if(k==='playlists') body=playlistGrid(pool);
    else if(k==='drama') body=albumGrid(pool.filter(w=>w.albumType==='广播剧'));
    else if(k==='schedule') body=scheduleBoard();
    else if(k==='updates') body=updateList(pool);
    else if(k==='tags') body=tagCloud(pool);
    else if(k==='newgames') body=soonPage('推荐游戏','推荐算法还没做。等有了推荐模型，这里会按你的口味出游戏——现在先占个位，不留一个空列表。');
    else if(k==='upcoming') body=upcomingList(pool);
    else if(k==='reviews'||k==='guides') body=articleList(k,pool);
    else body=workList(pool);
    return `<button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('feature')}</button>
      <div class="view-head"><div class="view-title">${esc(title)}</div></div>${body}`;
  }

  /* 排行榜：日 / 周 / 总，外加「按题材」。
     R45：同一列数字曾经两种写法（前三名「4.0 万」、第 4 名起「33,948」）——
     现在全站一个 fmtCount：不足 1 万写准确值，超过 1 万按「万」。
     R46：前三名原来 305px 大竖卡占掉半屏，第 4 名往下忽然变成行；现在前三名收窄，
     4–10 名单独起一节并加重名次。 */
  const RANK_DIMS=[{k:'day',l:'日榜',s:'近 24 小时'},{k:'week',l:'周榜',s:'近 7 天'},{k:'total',l:'总榜',s:'累计'}];
  const RANK_METRIC={anime:'播放量',game:'热度',manga:'阅读量',novel:'阅读量',music:'播放量'};
  function rankList(pool){
    const metric=RANK_METRIC[state.partition]||'热度';
    const dim=RANK_DIMS.find(d=>d.k===state.rankDim)||RANK_DIMS[1];
    const topicMode=state.rankMode==='topic';
    const topics=topTags(pool,8);
    const topic=topicMode ? (state.rankTopic||topics[0]) : null;

    let sorted = topicMode
      ? pool.filter(w=>(w.tags||[]).includes(topic)).sort((a,b)=>b.pop.total-a.pop.total)
      : pool.slice().sort((a,b)=>b.pop[dim.k]-a.pop[dim.k]);

    const tabs=RANK_DIMS.map(d=>`<button class="ctab ${!topicMode&&d.k===state.rankDim?'on':''}" data-action="rank-dim" data-k="${d.k}">${d.l}</button>`).join('')
      + `<button class="ctab ${topicMode?'on':''}" data-action="rank-more" title="按题材排名">题材 ${icon('chevronDown',12)}</button>`;

    const heat=v=>`${fmtCount(v)} ${metric==='播放量'?'次播放':metric==='阅读量'?'次阅读':''}`;

    const rankRows=(arr, start)=>arr.map((w,i)=>{
      const t=w.trend;
      const tr = t>0?`<span class="trend up">▲${t}</span>`: t<0?`<span class="trend down">▼${-t}</span>`:`<span class="trend flat">—</span>`;
      const rank=i+start;
      return `<button class="rank-row ${rank<=10?'top10':''}" data-action="open-detail" data-id="${w.id}" style="animation-delay:${i*25}ms">
        <span class="rank-n">${rank}</span>
        <div class="rank-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
        <div class="rank-main">
          <div class="rank-name">${esc(w.name)}</div>
          <div class="rank-meta">${w.year} · ${esc((w.tags||[]).slice(0,2).join(' / '))} · ${w.score.toFixed(1)} 分</div>
        </div>
        ${tr}
        <span class="rank-heat">${heat(w.pop[topicMode?'total':dim.k])}</span>
      </button>`;
    }).join('');

    if(topicMode){
      return `<div class="rank-wrap" data-kind="${state.partition}">
        <div class="rank-top">
          <div class="cat-sortbar">${tabs}</div>
          <div class="rank-note">按题材「${esc(topic)}」累计${metric}排序</div>
          <div class="topic-bar">${topics.map(t=>`<button class="subchip ${t===topic?'on':''}" data-action="rank-topic" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        </div>
        ${sorted.length?`<div class="rank-list">${rankRows(sorted,1)}</div>`:`<div class="empty"><span class="e-ico">${icon('chart',40)}</span>这个题材下还没有作品</div>`}
      </div>`;
    }

    const top=sorted.slice(0,3), mid=sorted.slice(3,10), rest=sorted.slice(10);
    const podium=top.map((w,i)=>`<button class="podium-card r${i+1}" data-action="open-detail" data-id="${w.id}">
        <div class="pd-cover" style="${coverStyle(w)}">${coverInner(w)}
          <span class="pd-rank">${i+1}</span>
        </div>
        <div class="pd-name">${esc(w.name)}</div>
        <div class="pd-meta">${w.score.toFixed(1)} 分 · ${heat(w.pop[dim.k])}</div>
      </button>`).join('');
    return `<div class="rank-wrap" data-kind="${state.partition}">
        <div class="rank-top">
          <div class="cat-sortbar">${tabs}</div>
          <div class="rank-note">按${dim.s}${metric}排序 · 每日 04:00 更新</div>
        </div>
        <div class="podium">${podium}</div>
        ${mid.length?`<div class="rank-sec"><b>4 – 10</b><span>名次接近，随时会换位</span></div>
          <div class="rank-list">${rankRows(mid,4)}</div>`:''}
        ${rest.length?`<div class="rank-sec"><b>11 名以后</b><span>共 ${sorted.length} 部</span></div>
          <div class="rank-list">${rankRows(rest,11)}</div>`:''}
      </div>`;
  }

  /* 新番时间表：星期 tab + 当日时间轴 */
  function scheduleBoard(){
    const pool=WORKS.filter(w=>w.kind==='anime' && w.air);
    const day = state.schDay==null ? todayIdx() : state.schDay;
    const today=todayIdx();
    /* R48：按钮里直接写「周一…周日」，今天那一颗额外加「今天」角标并加粗；
       点进去之后不再重复一句「周三 · 今天」——tab 已经说过了。 */
    const tabs=WEEKDAYS.map((d,i)=>{
      const n=pool.filter(w=>w.air.day===i).length;
      const mine=pool.filter(w=>w.air.day===i && w.shelfStatus).length;
      return `<button class="wd-tab ${i===day?'on':''}" data-action="sch-day" data-d="${i}">
        <b>${d}</b><span>${mine?mine+' 追':n+' 部'}</span>${i===today?'<i class="wd-today">今天</i>':''}
      </button>`;
    }).join('');
    let list=pool.filter(w=>w.air.day===day).sort((a,b)=>a.air.time.localeCompare(b.air.time));
    if(state.schOnlyMine) list=list.filter(w=>w.shelfStatus);
    const rows=list.map(w=>{
      const on=!!w.shelfStatus, bell=!!state.schBell[w.id];
      return `<div class="air-row">
        <div class="air-time">${w.air.time}</div>
        <div class="air-cover" style="${coverStyle(w)}" data-action="open-detail" data-id="${w.id}">${coverInner(w)}</div>
        <div class="air-main" data-action="open-detail" data-id="${w.id}">
          <div class="air-name">${esc(w.name)}</div>
          <div class="air-meta">更新至 第 ${countOf(w)} ${serialUnitOf('anime')} · ${w.score.toFixed(1)} 分</div>
        </div>
        <button class="air-bell ${bell?'on':''}" data-action="sch-bell" data-id="${w.id}"
          title="${bell?'已开启开播提醒':'开播前提醒我'}" aria-label="开播提醒">${icon('bell',15)}</button>
        <button class="plan-btn ${on?'on':''}" data-action="plan-toggle" data-id="${w.id}">${on?icon('check',13)+' 已加入':'加入追番'}</button>
      </div>`;
    }).join('');
    return `<div class="wd-bar">${tabs}</div>
      <div class="sch-bar">
        <span class="sch-label">共 ${list.length} 部</span>
        <button class="subchip ${state.schOnlyMine?'on':''}" data-action="sch-mine">只看追番</button>
      </div>
      ${list.length?`<div class="air-list">${rows}</div>`:`<div class="empty"><span class="e-ico">${icon('clock',40)}</span>${WEEKDAYS[day]}没有${state.schOnlyMine?'在追的':'更新的'}作品</div>`}`;
  }
  /* R52 / R53：更新表按「话 / 章」报连载进度，并给一排筛选 */
  function updateList(pool){
    const unit=serialUnitOf(pool[0]?pool[0].kind:'manga');
    const f=state.updFilter||'all';
    let list=pool.slice().sort((a,b)=>a.updatedHoursAgo-b.updatedHoursAgo);
    if(f==='mine') list=list.filter(w=>w.shelfStatus);
    else if(f==='today') list=list.filter(w=>w.updatedHoursAgo<=24);
    else if(f==='week') list=list.filter(w=>w.updatedHoursAgo<=168);
    return `<div class="upd-bar">
        ${[['all','全部'],['mine','只看在追'],['today','今天'],['week','本周']].map(([k,l])=>
          `<button class="subchip ${f===k?'on':''}" data-action="upd-filter" data-f="${k}">${l}</button>`).join('')}
        <span class="uright">共 ${list.length} 部</span>
      </div>
      <div class="worklist">${list.map((w,i)=>
        workListItem(w,i,`更新至 第 ${countOf(w)} ${unit} · ${w.updatedHoursAgo} 小时前`)).join('')}</div>`;
  }
  /* ================= 标签广场 =================
     R51 落地：原来只有「词 + 数字」，点进去还是分类页，等于一个没有内容的导航。
     1) 标签卡带代表封面（错位叠 3 张）——标签从"词"变成"一片内容"；
     3) 分组从「热门/常规/长尾」改成「情绪 / 题材 / 玩法与风格 / 制作来源」——
        前三档只是同一个维度切大中小，没有语义；
     4) 顶部给你推荐的 3 个标签 + 理由（从你在作品区收藏的作品里算）；
     5) 点标签先在原地展开前 6 部，不立刻跳分类页。 */
  const TAG_GROUPS=[
    { id:'mood',  label:'情绪',       tags:['热血','治愈','黑暗','催泪','日常','喜剧','心理','恐怖','温情','羁绊','群像','剧情'] },
    { id:'theme', label:'题材',       tags:['奇幻','科幻','校园','冒险','战斗','悬疑','推理','烧脑','时间旅行','异世界','重生','机战','超能力','战争','谍战','忍者','和风','乡村','虚拟现实','学园','恋爱','建国','旅行'] },
    { id:'style', label:'玩法与风格', tags:['JRPG','回合制','卡牌','养成','开放世界','类魂','硬核','动作','经济','对话','对话剧','电子','摇滚','Vocaloid','同人音乐','广播剧','动画 OP','动画OST'] },
    { id:'prod',  label:'制作来源',   tags:['漫画改','小说改','游戏改','原创','剧场版','续作'] },
  ];
  function tagGroupOf(t){
    for(const g of TAG_GROUPS) if(g.tags.includes(t)) return g.id;
    return 'theme';   // 没归类的新标签先落到「题材」，不要单开一个"其它"
  }
  function tagCloud(pool){
    const freq={}, bag={};
    pool.forEach(w=>(w.tags||[]).forEach(t=>{
      freq[t]=(freq[t]||0)+1;
      (bag[t]=bag[t]||[]).push(w);
    }));
    const items=Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    if(!items.length) return `<div class="empty"><span class="e-ico">${icon('tag',40)}</span>这个分区还没有标签</div>`;

    const card=([t,n])=>{
      const covers=(bag[t]||[]).filter(w=>w.cover).slice(0,3);
      const stack=covers.map((w,i)=>
        `<i style="background-image:url('${w.cover}');background-position:center ${focusOf(w)};--r:${(i-1)*7}deg"></i>`).join('');
      const open=state.tagOpen===t;
      return `<button class="tag-card ${open?'on':''}" data-action="tag-open" data-tag="${esc(t)}">
        <span class="tc-stack">${stack||`<i class="tc-empty">${icon('tag',16)}</i>`}</span>
        <span class="tc-main"><b>${esc(t)}</b><i>${n} 部</i></span>
      </button>`;
    };
    const fly=(tag)=>{
      const list=bag[tag]||[];
      return `<div class="tag-fly">
        <div class="tf-head"><b>${esc(tag)}</b><span>${list.length} 部</span>
          <button class="tf-close" data-action="tag-open" data-tag="${esc(tag)}" aria-label="收起">${icon('close',14)}</button></div>
        <div class="tf-row">${list.slice(0,6).map(w=>`
          <button class="tf-item" data-action="open-detail" data-id="${w.id}">
            <div class="tf-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
            <span class="tf-name">${esc(w.name)}</span>
          </button>`).join('')}
          ${list.length>6?`<button class="tf-all" data-action="tag-more" data-tag="${esc(tag)}">
            <span>查看全部</span><b>${list.length} 部</b>${icon('chevronRight',14)}
          </button>`:''}
        </div>
      </div>`;
    };

    /* 推荐：从作品区里已收藏的作品算，说清为什么推荐它 */
    const mine=WORKS.filter(w=>w.shelfStatus);
    const mc={};
    mine.forEach(w=>(w.tags||[]).forEach(t=>{ mc[t]=(mc[t]||0)+1; }));
    let recs=Object.entries(mc).sort((a,b)=>b[1]-a[1]).slice(0,3)
      .map(([t,n])=>({ t, why:`你的 ${mine.length} 部收藏里，${n} 部带这个标签` }));
    if(!recs.length) recs=items.slice(0,3).map(([t])=>({ t, why:'全库收录最多' }));
    /* 推荐位和下面的标签卡用同一套封面：顶部三张纯文字的卡片，在第一屏看起来就是三块空白，
       也和下面"有封面的卡片"不是同一种东西。 */
    const stackFor=(t)=>((bag[t]||[]).filter(w=>w.cover).slice(0,3)).map((w,i)=>
      `<i style="background-image:url('${w.cover}');background-position:center ${focusOf(w)};--r:${(i-1)*7}deg"></i>`).join('');
    const recHtml=`<div class="rec-tags">${recs.map(r=>`
      <button class="rec-tag" data-action="tag-open" data-tag="${esc(r.t)}">
        <span class="tc-stack">${stackFor(r.t)||`<i class="tc-empty">${icon('tag',16)}</i>`}</span>
        <span class="rt-txt"><b>${esc(r.t)}</b><i class="rec-why" title="${esc(r.why)}">${esc(r.why)}</i></span>
      </button>`).join('')}</div>`;

    const secs=TAG_GROUPS.map(g=>{
      const list=items.filter(([t])=>tagGroupOf(t)===g.id);
      if(!list.length) return '';
      const openTag=list.map(([t])=>t).find(t=>state.tagOpen===t);
      return `<div class="cloud-sec">${g.label}<span class="cs-n">${list.length}</span></div>
        <div class="tag-grid">${list.map(card).join('')}</div>
        ${openTag?fly(openTag):''}`;
    }).join('');
    return `${recHtml}${secs}`;
  }
  function soonPage(title, desc){
    return `<div class="soon">
      <div class="so-ico">${icon('sparkles',34)}</div>
      <div class="so-t">${esc(title)}还没上线</div>
      <div class="so-d">${esc(desc)}</div>
      <button class="btn" data-action="back">${icon('arrowLeft',15)} 返回</button>
    </div>`;
  }
  /* ================= 音乐分区的几个页面（仿主流音乐平台） ================= */
  /* 专辑卡：方形封面 + 悬停播放角标 + 歌手，一行六列 */
  function albumCard(w,i){
    return `<button class="album-card" data-action="open-detail" data-id="${w.id}" data-kind="music" style="animation-delay:${i*35}ms">
      <div class="al-cover" style="${coverStyle(w)}">${coverInner(w)}<span class="al-play">${icon('play',15)}</span></div>
      <div class="al-name" title="${esc(w.name)}">${esc(w.name)}</div>
      <div class="al-sub">${esc(w.artist||'')}</div>
    </button>`;
  }
  function albumGrid(list){
    if(!list.length) return `<div class="empty"><span class="e-ico">${icon('music',40)}</span>这里还没有专辑</div>`;
    return `<div class="album-grid">${list.map((w,i)=>albumCard(w,i)).join('')}</div>`;
  }
  /* 每日推荐：日期做种子，同一天进来永远是同一批（像真有歌单每日更新） */
  function dailyAlbums(pool){
    const d=new Date();
    const seed=parseInt(`${d.getFullYear()}${d.getMonth()+1}${d.getDate()}`,10);
    const list=pool.slice()
      .sort((a,b)=>((seed+a.name.length*37)%101)-((seed+b.name.length*37)%101))
      .slice(0,12);   // 12 张 = 六列两行，正好铺满，不会剩一列孤儿
    return `<div class="daily-head">
        <div class="daily-date"><b>${d.getDate()}</b><span>${d.getMonth()+1} 月</span></div>
        <div class="daily-txt">
          <div class="daily-t">今天为你挑了 ${list.length} 张</div>
          <div class="daily-s">按日期抽取，同一天进来永远同一批 · 每日 00:00 换</div>
        </div>
      </div>${albumGrid(list)}`;
  }
  /* 歌手：按歌手聚合，头像用小尺寸的首张专辑封面（不拿色块冒充） */
  function artistGrid(pool){
    const map={};
    pool.forEach(w=>{
      const key=(w.artist||'未知').split(' / ')[0];
      (map[key]=map[key]||[]).push(w);
    });
    const rows=Object.entries(map).sort((a,b)=>b[1].length-a[1].length);
    return `<div class="artist-grid">${rows.map(([name,ws],i)=>
      `<button class="artist-card" data-action="open-artist" data-a="${esc(name)}" data-kind="music" style="animation-delay:${i*35}ms">
        <div class="ar-face" style="${coverStyle(ws[0])}">${coverInner(ws[0])}</div>
        <div class="ar-name">${esc(name)}</div>
        <div class="ar-meta">${ws.length>1?`${ws.length} 张 · `:''}${ws.reduce((a,w)=>a+countOf(w),0)} 首</div>
      </button>`).join('')}</div>`;
  }
  function artistDetail(name){
    const list=WORKS.filter(w=>w.kind==='music' && (w.artist||'').split(' / ').includes(name));
    const n=list.reduce((a,w)=>a+countOf(w),0);
    /* 热门歌曲：把该歌手名下所有曲目摊平取前 8 首。
       只有一张专辑的歌手，若不摊曲目，页面就是「一个头像 + 一张专辑 + 一屏空白」。 */
    const hot=[];
    list.forEach(w=>(w.tracks||[]).forEach((t,i)=>hot.push({w,i,t})));
    return `<div class="artist-head">
        <div class="ah-face" style="${list[0]?coverStyle(list[0]):''}">${list[0]?coverInner(list[0]):''}</div>
        <div>
          <h2 class="ah-name">${esc(name)}</h2>
          <div class="ah-meta">${list.length} 张专辑 · 共 ${n} 首</div>
        </div>
      </div>${hot.length?`<div class="section-title">热门歌曲<span class="sec-right">共 ${n} 首</span></div>
        <div class="track-list">${hot.slice(0,8).map((r,idx)=>
          `<button class="track-row" data-action="play-track" data-id="${r.w.id}" data-i="${r.i}">
            <span class="tr-n">${idx+1}</span>
            <span class="tr-title">${esc(r.t.title)}</span>
            <span class="tr-album">${esc(r.w.name)}</span>
            <span class="tr-dur">${esc(r.t.dur)}</span>
          </button>`).join('')}</div>`:''}
      <div class="section-title">专辑<span class="sec-right">${list.length} 张</span></div>
      ${albumGrid(list)}`;
  }
  /* 分类歌单：按题材聚成歌单方块（四宫格拼贴 + 名称 + 数量），点进去是分类页的筛选结果 */
  function playlistGrid(pool){
    const freq={};
    pool.forEach(w=>(w.tags||[]).forEach(t=>{ freq[t]=(freq[t]||0)+1; }));
    const tags=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]);
    return `<div class="pl-grid">${tags.map(t=>{
      const ws=pool.filter(w=>(w.tags||[]).includes(t)).slice(0,4);
      /* 不足 4 张时**不拿别的专辑凑数**（广播剧歌单里混进一张 LiSA 单曲，等于说错话），
         改用 1 / 2 / 4 格的比例拼贴：n1 单图、n2 并排、n3 上大下两小。 */
      return `<button class="pl-card" data-action="tag-more" data-tag="${esc(t)}" data-kind="music">
        <div class="pl-mosaic n${ws.length}">${ws.map(w=>`<div class="pl-sq" style="${coverStyle(w)}"></div>`).join('')}</div>
        <div class="pl-t">${esc(t)}</div>
        <div class="pl-n">${freq[t]} 张专辑</div>
      </button>`;
    }).join('')}</div>`;
  }
  function upcomingList(pool){
    return `<div class="worklist">${pool.slice().sort((a,b)=>a.year-b.year).map((w,i)=>{
      const m=((w.name.length*3)%12)+1;
      const y=2026+(w.name.length%3);
      return workListItem(w,i,`预计 ${y} 年 ${m} 月发售 · ${((w.name.length*137)%900)+120} 人期待`);
    }).join('')}</div>`;
  }
  /* 评测 / 攻略（R55 / R56 / R57）
     以前 10 篇标题全是「《X》评测：{题材}向的稳定发挥」，连游戏攻略都写「观看顺序」。
     现在：① 有具体角度的作品用手写角度；② 没有的按介质换句式；
     ③ 行内补作者 / 摘要 / 时间 / 阅读量；④ 不再显示评分（评分机制单独立项）。 */
  const REV_FALLBACK=['值得一看吗：三个具体场景','被低估的部分和明显短板','看到第三集才明白它想干什么',
    '技术层面的得与失','两个仍然记得的镜头','为什么它不适合所有人'];
  const GUIDE_FALLBACK={
    anime:['观看顺序与跳过建议','分集看点与时间线整理'],
    game:['全流程与关键选择','白金路线与收集清单'],
    manga:['阅读顺序与卷章对照','从哪里开始补最省时间'],
    novel:['阅读顺序与卷章对照','改编与原作的差异对照'],
    music:['曲目顺序与听感笔记','从哪一首开始听'],
  };
  function seedIdx(str,n){ let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))%99991; return h%n; }
  function articleList(kind,pool){
    const rows=pool.map((w,i)=>{
      const key=kind+w.id, open=!!state.artOpen[key];
      const fallback = kind==='reviews' ? REV_FALLBACK : (GUIDE_FALLBACK[w.kind]||GUIDE_FALLBACK.anime);
      const angle = kind==='reviews'
        ? (REVIEW_ANGLES[w.id] || fallback[seedIdx(w.id,fallback.length)])
        : (GUIDE_ANGLES[w.id] || fallback[seedIdx(w.id,fallback.length)]);
      const title = kind==='reviews' ? `《${w.name}》${angle}` : `《${w.name}》${angle}`;
      const author = ART_AUTHORS[seedIdx(w.id+'a', ART_AUTHORS.length)];
      const days = 1 + seedIdx(w.id+'d', 26);
      const reads = 800 + seedIdx(w.id+'r', 42000);
      const abs = kind==='reviews'
        ? `从${(w.tags||[])[0]||'类型'}这一面切入，谈它做对了什么、又在哪一段失手。全文约 ${2+seedIdx(w.id+'l',5)} 千字，含轻微剧透。`
        : `${w.kind==='game'?'按章节拆流程':'按卷章拆顺序'}，标注了可以跳过的段落与必须补的前置。适合已经决定要看、只差顺序的人。`;
      return `<div class="art-item ${open?'open':''}">
        <div class="art-head" data-action="art-toggle" data-key="${key}">
          <div class="art-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
          <div class="art-main">
            <div class="art-title">${esc(title)}</div>
            <div class="art-byline"><b>${esc(author)}</b><span>·</span><span>${days} 天前</span>
              <span>·</span><span>${fmtCount(reads)} 阅读</span></div>
            <div class="art-abs">${esc(abs)}</div>
          </div>
          <span class="art-chev">${icon('chevronRight',15)}</span>
        </div>
        <div class="art-body"><p>${esc(kind==='reviews'
            ? `${w.intro} 这篇评测不再给总分，只谈三个具体判断：${abs}`
            : `${abs} ${(w.tags||[]).join('、')} 相关的作品可在详情页「相关作品」与百科的「所属系列」里找到。`)}</p>
          <div class="art-actions"><button class="btn" data-action="open-detail" data-id="${w.id}">查看作品</button></div>
        </div>
      </div>`;
    }).join('');
    const unit = kind==='reviews' ? '篇评测' : (state.partition==='game' ? '篇攻略' : '篇顺序整理');
    return `<div class="demo-note">${icon('doc',14)}<span>演示数据：标题与作者为占位。共 ${pool.length} ${unit}。</span></div>
      <div class="art-list">${rows}</div>`;
  }

  /* ----- 我的 → 功能页（浏览历史 / 作品关系 / 源管理 / 引擎 / 备份 / 命名规则 / 播放 / 弹幕 / 通知） ----- */
  function toggleVal(key, def){
    if(!(key in state.toggles)) state.toggles[key]=def;
    return state.toggles[key];
  }
  function renderPanel(){
    const k=state.pageKind||'sources';
    const cfg=PANEL_PAGES[k];
    /* 未知的 k 不许渲染出一个只有标题的空壳（那也是地址写错了） */
    if(!cfg) return renderNotFound();
    let body='', extra='';
    if(k==='history'){ body=historyList(); extra=state.hist.length?`<button class="btn" data-action="hist-clear">清空历史</button>`:''; }
    else if(k==='relations') body=relationList();
    else body=rowsPanel(k);
    /* R44：这些开关刷新就丢，页面上要写明，别让人以为真的存下来了 */
    const demo = ['sources','engines','backup','rules','notify','playback','danmaku'].includes(k)
      ? `<div class="demo-note">${icon('sliders',14)}<span>演示数据：这些开关只在本页生效，刷新后会回到默认值。正式版会写入本地配置。</span></div>` : '';
    return `<button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('panel')}</button>
      <div class="view-head ${extra?'head-row':''}"><div class="view-title">${esc(state.pageTitle||cfg.title)}</div>${extra}</div>${demo}${body}`;
  }
  /* R42 / R43：浏览历史照 B 站的做法 —— 按「今天 / 昨天 / 更早」分组，
     行尾（悬停）出删除，页头一个「清空历史」。隐私相关的操作不能只有「看」。 */
  function historyList(){
    if(!state.hist.length){
      return `<div class="empty"><span class="e-ico">${icon('clock',40)}</span>还没有浏览记录</div>`;
    }
    return [0,1,2].map(b=>{
      const items=state.hist.filter(h=>h.bucket===b);
      if(!items.length) return '';
      return `<div class="hist-group">
        <div class="hist-group-t">${HIST_LABEL[b]}<span>${items.length} 条</span></div>
        <div class="hist-list">${items.map(h=>{
          const w=getWork(h.work); if(!w) return '';
          return `<div class="hist-card">
            <button class="hist-row" data-action="open-detail" data-id="${w.id}">
              <div class="hist-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
              <div class="hist-main"><div class="hist-name">${esc(w.name)}</div>
                <div class="hist-meta">${esc(h.prog)}</div></div>
              <span class="hist-when">${esc(h.when)}</span>
            </button>
            <button class="hist-del" data-action="hist-del" data-id="${h.id}" aria-label="删除这条记录">${icon('close',13)}</button>
          </div>`;
        }).join('')}</div>
      </div>`;
    }).join('');
  }
  function relationList(){
    const ids=[...new Set(WORKS.map(w=>w.series).filter(Boolean))];
    const rows=ids.map(sid=>{
      const members=getSeriesWorks(sid);
      const name=SERIES_NAMES[sid]||members[0].name;
      return `<button class="rel-row" data-action="open-series" data-id="${sid}">
        <div class="rel-row-main"><div class="rel-row-name">${esc(name)}</div>
          <div class="rel-row-meta">${members.map(m=>m.kindLabel).join(' · ')}</div></div>
        <span class="rel-row-n">${members.length} 部</span>
        ${icon('chevronRight',16)}
      </button>`;
    }).join('');
    return `<div class="panel-rows">${rows}</div>`;
  }
  function rowsPanel(k){
    const rows=(PANEL_ROWS[k]||[]).map(r=>{
      const key=k+'.'+r.k;
      if(r.type==='toggle'){
        const on=toggleVal(key, r.def!==false);
        return `<div class="set-row">
          <div class="set-row-main"><b>${esc(r.label)}</b>${r.desc?`<i>${esc(r.desc)}</i>`:''}</div>
          <button class="switch ${on?'on':''}" data-action="toggle" data-key="${key}" data-def="${r.def!==false}" aria-pressed="${on}"><span></span></button>
        </div>`;
      }
      if(r.type==='value'){
        /* R39：「界面语言」这类取值项原来是「显示一段文字 + 点一下循环下一个」，
           既没有可点暗示也不知道还有哪些选项。改成原生下拉。 */
        const idx=toggleVal(key, r.def||0);
        return `<div class="set-row">
          <div class="set-row-main"><b>${esc(r.label)}</b>${r.desc?`<i>${esc(r.desc)}</i>`:''}</div>
          <select class="set-select" data-sel-key="${key}" aria-label="${esc(r.label)}">
            ${r.opts.map((o,i)=>`<option value="${i}" ${i===idx%r.opts.length?'selected':''}>${esc(o)}</option>`).join('')}
          </select>
        </div>`;
      }
      return `<div class="set-row">
        <div class="set-row-main"><b>${esc(r.label)}</b>${r.desc?`<i>${esc(r.desc)}</i>`:''}</div>
        <button class="btn" data-action="panel-act" data-label="${esc(r.act||'操作')}">${esc(r.act||'操作')}</button>
      </div>`;
    }).join('');
    return `<div class="panel-rows">${rows}</div>`;
  }
  /* ================= 资源管理（文件管理器形态） =================
     R37 / R38：这里维护的「本质是一个文件夹」，所以不用列表堆所有作品，
     改成能进去、能返回、能搜、能排序的文件树；容量概览交给「磁盘管理」页。
     · 根目录 = 五个分区文件夹
     · 分区   = 作品文件夹（只列有本地文件的）
     · 作品   = 具体文件（按集 / 卷拆开）
     删除一律先弹确认。 */
  function fsFilesOf(w){
    const out=[];
    const per = Math.max(0.05, Math.round((resSize(w)/Math.max(1,countOf(w)||1))*100)/100);
    if(w.kind==='anime'){
      (w.episodes||[]).filter(e=>e.local).forEach(e=>out.push({ name:`${w.name} S01E${String(e.n).padStart(2,'0')}.mkv`, size:per, kind:'video' }));
    } else if(w.kind==='manga'||w.kind==='novel'){
      (w.volumes||[]).filter(v=>v.local).slice(0,8).forEach(v=>out.push({ name:`${w.name} 第 ${String(v.n).padStart(2,'0')} 卷.${w.kind==='manga'?'cbz':'epub'}`, size:per, kind:'book' }));
    } else if(w.kind==='game'){
      out.push({ name:`${w.name} 安装包.iso`, size:resSize(w), kind:'game' });
      out.push({ name:`${w.name} 存档备份.zip`, size:0.02, kind:'game' });
    } else {
      out.push({ name:`${w.name}.flac`, size:resSize(w), kind:'music' });
    }
    return out;
  }
  function renderResources(){
    const path=state.resPath;
    const level = path.length;   // 0 根 / 1 分区 / 2 作品
    const q=(state.resQ||'').toLowerCase();
    let rows=[], crumb='';
    const UPD=['昨天 23:40','3 天前','上周','9 月 28 日','9 月 12 日'];

    const crumbHome=level===0?`<span class="cur">资源库</span>`:`<button data-action="fs-go" data-i="-1">资源库</button>`;
    if(level===0){
      crumb=crumbHome;
      rows=PARTITIONS.map((p,i)=>{
        const list=localWorks(p.id);
        const size=list.reduce((a,w)=>a+resSize(w),0);
        return { type:'folder', id:p.id, name:p.label, sub:`${list.length} 个作品文件夹`, size,
                 note:`最近更新 ${UPD[i%UPD.length]}`, icon:mediaIcon(p.id,16) };
      });
    } else if(level===1){
      const p=PARTITIONS.find(x=>x.id===path[0]);
      crumb=crumbHome+`<span class="sep">/</span><span class="cur">${esc(p?p.label:'')}</span>`;
      rows=localWorks(path[0]).map((w,i)=>({
        type:'work', id:w.id,
        name:w.name,
        sub:`${fsFilesOf(w).length} 个文件 · ${w.kindLabel} · ${w.year}`,
        size:resSize(w), icon:'',
        note:`最近更新 ${UPD[i%UPD.length]}`,
      }));
    } else {
      const w=getWork(path[1]);
      crumb=crumbHome+`<span class="sep">/</span><button data-action="fs-go" data-i="0">${esc(labelOfPartition(path[0]))}</button>`
        +`<span class="sep">/</span><span class="cur">${esc(w?w.name:'')}</span>`;
      rows=w?fsFilesOf(w).map((f,i)=>({ type:'file', id:w.id+':'+i, name:f.name,
        sub:`${w.name} · ${f.kind==='video'?'视频':f.kind==='book'?'电子书':f.kind==='game'?'安装包':'音频'}`, size:f.size,
        note:`${f.kind==='video'?'1080p · H.264':'—'}` })):[];
    }

    if(q) rows=rows.filter(r=>r.name.toLowerCase().includes(q));
    const key=state.resSort;
    rows=rows.slice().sort((a,b)=>{
      let d=0;
      if(key==='size') d=a.size-b.size;
      else if(key==='date') d=(a.type==='file'?1:0)-(b.type==='file'?1:0);
      else d=a.name.localeCompare(b.name,'zh');
      return state.resAsc?d:-d;
    });

    const listHTML=rows.length?rows.map(r=>{
      const isFolder=r.type!=='file';
      const act = r.type==='folder' ? `data-action="fs-enter" data-id="${r.id}"`
                : r.type==='work'   ? `data-action="fs-enter" data-id="${r.id}"`
                : '';
      return `<div class="fs-row" ${act} role="button" tabindex="0">
        <div class="fs-ico ${isFolder?'folder':''}">${isFolder?(r.type==='work'?icon('folder',16):r.icon):(r.sub.includes('视频')?icon('film',15):r.sub.includes('书')?icon('bookOpen',15):r.sub.includes('安装')?icon('box',15):icon('music',15))}</div>
        <div class="fs-main"><div class="fs-name">${esc(r.name)}</div><div class="fs-sub">${esc(r.sub)}</div></div>
        ${r.note?`<span class="fs-note">${esc(r.note)}</span>`:''}
        <span class="fs-size">${r.size.toFixed(r.size<1?2:1)} GB</span>
        <div class="fs-act">
          ${r.type==='work'?`<button data-action="res-open" data-id="${r.id}" title="在文件管理器中打开" aria-label="打开文件夹">${icon('folder',14)}</button>`:''}
          ${r.type==='file'?`<button data-action="res-open" data-id="${r.id}" title="打开" aria-label="打开">${icon('eye',14)}</button>`:''}
          ${r.type==='work'?`<button data-action="res-delete" data-id="${r.id}" title="删除本地文件" aria-label="删除">${icon('trash',14)}</button>`:''}
        </div>
      </div>`;
    }).join('') : `<div class="empty"><span class="e-ico">${icon('folder',40)}</span>${q?'没有匹配的文件':'这个文件夹是空的'}</div>`;

    const total=rows.reduce((a,r)=>a+r.size,0);
    const allWorks=localWorks().length;
    /* R41：根目录只有五个文件夹时下半屏全空 —— 补一条汇总（不是内存条，只是一行读数）
       和「没有被规则命中的文件夹」出口，让根层级有信息量也有下一步动作。 */
    const sumBar = level!==0 ? '' : `<div class="fs-sum">
        <span class="fs-sum-l">${icon('hdd',14)} 资源目录 <b>D:/ACGN</b></span>
        <span class="fs-sum-m">识别到 <b>${PARTITIONS.length}</b> 个分类 · <b>${allWorks}</b> 个作品文件夹 · 合计 <b>${localWorks().reduce((a,w)=>a+resSize(w),0).toFixed(1)} GB</b></span>
        <span class="fs-sum-r">最近扫描：今天 09:12
          <button class="btn" data-action="fs-rescan">${icon('refresh',13)} 重新扫描</button></span>
      </div>`;
    const unmatched = level!==0 ? '' : `
      <div class="mine-section-t" style="margin-top:var(--s-6)">未识别的文件夹 <span class="mt-n">${UNMATCHED_DIRS.length}</span></div>
      <div class="fs-list">${UNMATCHED_DIRS.map((u,i)=>`<div class="fs-row is-unm">
        <div class="fs-ico warn">${icon('folder',16)}</div>
        <div class="fs-main"><div class="fs-name">${esc(u.name)}</div><div class="fs-sub">${esc(u.meta)}</div></div>
        <div class="fs-act always">
          <button class="btn" data-action="unm-pick" data-i="${i}">指定归属</button>
          <button class="btn" data-action="unm-ignore" data-i="${i}">忽略</button>
        </div>
      </div>`).join('')}</div>`;

    return `<button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('resources')}</button>
      <div class="view-head head-row"><div class="view-title">资源管理</div>
        <button class="btn" data-action="open-disk">${icon('hdd',15)} 磁盘管理</button></div>
      ${sumBar}
      <div class="fs-bar">
        <div class="fs-crumb">${crumb}</div>
        <label class="fs-search">${icon('search',13)}<input id="fsSearch" placeholder="搜索当前文件夹" value="${esc(state.resQ)}"></label>
      </div>
      <div class="fs-bar">
        <div class="fs-sort">
          ${[['name','名称'],['size','大小'],['date','类型']].map(([k,l])=>
            `<button class="${state.resSort===k?'on':''}" data-action="fs-sort" data-k="${k}">${l}${state.resSort===k?(state.resAsc?' ↑':' ↓'):''}</button>`).join('')}
        </div>
        <span style="margin-left:auto;font-size:var(--t-xs);color:var(--sub)">${rows.length} 项 · 合计 ${total.toFixed(1)} GB</span>
      </div>
      <div class="fs-list">${listHTML}</div>
      ${unmatched}
      <div class="fs-foot">${icon('folder',13)} 资源目录：D:/ACGN · 只有符合「一级分类/作品/集数」结构并被「初始化」识别过的文件夹才会出现在这里</div>`;
  }
  function localWorks(kind){
    return WORKS.filter(w=>hasLocal(w) && (!kind || w.kind===kind));
  }

  /* ----- 磁盘管理（R37）：灰=其它占用 / 彩色=可识别资源 / 白=空闲 ----- */
  const DISK_COLOR={anime:'#C2544F',game:'#6FA8C7',manga:'#C9A66B',novel:'#AE83D6',music:'#4FB3A6'};
  function renderDisk(){
    const cards=DISKS.map(d=>{
      const resTotal=Object.values(d.res).reduce((a,b)=>a+b,0);
      const other=d.usedOther;
      const free=Math.max(0, d.total-other-resTotal);
      const pct=v=>Math.max(0,Math.min(100, v/d.total*100));
      const segs=Object.entries(d.res).filter(([,v])=>v>0).map(([k,v])=>
        `<i style="width:${pct(v)}%;background:${DISK_COLOR[k]}" title="${labelOfPartition(k)} ${v} GB"></i>`).join('');
      const legend=Object.entries(d.res).filter(([,v])=>v>0).map(([k,v])=>
        `<span><i style="background:${DISK_COLOR[k]}"></i>${labelOfPartition(k)} <b>${v.toFixed(1)}</b> GB</span>`).join('');
      const kindLabel={ssd:'内置 SSD',hdd:'内置 HDD',usb:'可移动磁盘',nas:'网络位置'}[d.kind];
      /* 标签只说**挂没挂上**，四块盘保持同一套说法。以前 E 盘写「已识别」、
         C/D/NAS 写「已挂载」，同一列里两种叫法，像是在说两件不同的事。 */
      const mounted = d.kind==='nas' ? '已连接' : '已挂载';
      return `<div class="disk-card">
        <div class="disk-top">
          <div>
            <div class="disk-name">${esc(d.name)}</div>
            <div class="disk-sub">${kindLabel} · ${d.total} GB · 可用 ${free.toFixed(0)} GB</div>
          </div>
          <span class="disk-tag ${d.kind==='nas'?'on':''}">${mounted}</span>
        </div>
        <div class="disk-bar">
          <i class="seg-other" style="width:${pct(other)}%" title="其它文件 ${other} GB"></i>
          ${segs}
          <i class="seg-free" style="width:${pct(free)}%" title="空闲 ${free.toFixed(0)} GB"></i>
        </div>
        <div class="disk-legend">
          <span><i style="background:#C8C2B6"></i>其它文件 <b>${other}</b> GB</span>
          ${legend}
          <span><i style="background:var(--bg);border:1px solid var(--line)"></i>空闲 <b>${free.toFixed(0)}</b> GB</span>
        </div>
      </div>`;
    }).join('');
    return `<button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('resources')}</button>
      <div class="view-head"><div class="view-title">磁盘管理</div></div>
      ${cards}
      <div class="demo-note">${icon('hdd',14)}<span>演示数据。正式版读取真实磁盘容量与占用。</span></div>
      <div style="display:flex;gap:var(--s-2);margin-top:var(--s-4)">
        <button class="btn" data-action="res-dir">${icon('folder',15)} 添加/识别文件夹</button>
        <button class="btn" data-action="open-resources">${icon('box',15)} 打开资源管理</button>
      </div>`;
  }

  /* ----- 观看统计（R30：先给一页大致数据，详细报表再说） ----- */
  function renderStats(){
    const s=STATS_DEMO;
    const max=Math.max(...Object.values(s.byKind));
    const bars=Object.entries(s.byKind).map(([k,v])=>{
      const p=PARTITIONS.find(x=>x.id===k);
      return `<div class="stat-bar"><span class="sb-l">${p?p.label:k}</span>
        <span class="sb-t"><i style="width:${v/max*100}%"></i></span>
        <span class="sb-v">${v} 小时</span></div>`;
    }).join('');
    /* R41：四格数字 + 五根横条只占了半屏，补「本周每天时长」和「最近在看」两块 */
    const wmax=Math.max(1,...s.week.map(w=>w.h));
    const week=s.week.map(w=>`<div class="stat-col ${w.h===0?'zero':''}">
        <span class="sc-v">${w.h?w.h.toFixed(1):'—'}</span>
        <i style="height:${w.h?Math.max(6,(w.h/wmax)*100):2}%"></i>
        <span class="sc-d">${w.d}</span>
      </div>`).join('');
    const recent=s.recent.map(r=>{
      const w=getWork(r.work); if(!w) return '';
      return `<div class="stat-row" data-action="open-detail" data-id="${w.id}" role="button" tabindex="0">
        <div class="sr-cover" style="--focus:${focusOf(w)}">${coverInner(w)}</div>
        <div class="sr-main"><b>${esc(w.name)}</b><i>${esc(r.sub)}</i></div>
        <span class="sr-go">${icon('chevronRight',14)}</span>
      </div>`;
    }).join('');
    return `<button class="backbar" data-action="back">${icon('arrowLeft',18)} 返回我的</button>
      <div class="view-head"><div class="view-title">观看统计</div>
        <div class="view-sub">统计口径：播放器停留时长，不含后台暂停</div></div>
      <div class="stat-hero">
        <div class="stat-cell"><b>${s.watchHours}</b><span>累计观看小时</span></div>
        <div class="stat-cell"><b>${s.finished}</b><span>已看完部数</span></div>
        <div class="stat-cell"><b>${s.thisWeek}</b><span>本周新增小时</span></div>
        <div class="stat-cell"><b>${s.streak}</b><span>连续观看天数</span></div>
      </div>
      <div class="stat-cols">
        <div class="stat-block">
          <div class="stat-block-t">本周每天看了多久<span class="sbt-r">日均 ${s.weekAvg} 小时</span></div>
          <div class="stat-week">${week}</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-t">按介质分布</div>
          <div class="stat-bars">${bars}</div>
        </div>
      </div>
      <div class="mine-section-t">最近在看</div>
      <div class="stat-rows">${recent}</div>
      <div class="demo-note" style="margin-top:var(--s-6)">${icon('chart',14)}<span>演示数据，按本机示例记录统计。</span></div>`;
  }

  /* ----- 设置（R29 / R39 / R40 / R41）-----
     以前「通用」只有三项、右侧还是一段看不出能点的文字，整页使用率不到 40%、下面大片空白。
     现在把所有设置项按主题 / 通用 / 播放 / 弹幕 / 通知 / 存储 / 高级排成一页，
     取值项改下拉，页尾给一行版本信息（不再单设「关于」分区）。 */
  function renderSettings(){
    const modes=[
      {k:'system', l:'跟随系统', d:'跟随设备深浅色设置'},
      {k:'light', l:'浅色', d:'始终使用暖白画廊'},
      {k:'dark', l:'深色', d:'始终使用暖调暗夜'},
      {k:'auto', l:'按时间自动', d:'19:00–07:00 自动切深色'},
    ];
    const cur=state.themeMode;
    const group=(title,tip,key)=>`<div class="mine-section" style="margin-bottom:var(--s-6)">
      <div class="mine-section-t">${title}</div>${tip?`<div class="set-group-desc">${tip}</div>`:''}
      ${rowsPanel(key)}</div>`;
    return `<button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('settings')}</button>
      <div class="view-head"><div class="view-title">设置</div></div>
      <div class="mine-section"><div class="mine-section-t">主题</div>
        <div class="set-list">${modes.map(m=>`<button class="set-opt ${cur===m.k?'on':''}" data-action="set-theme" data-mode="${m.k}">
          <span class="set-radio"></span>
          <span class="set-txt"><b>${m.l}</b><i>${m.d}</i></span>
        </button>`).join('')}</div>
      </div>
      ${group('通用','','general')}
      ${group('播放','这些是播放器的默认值，在播放器设置里改也会同步到这里','playback')}
      ${group('弹幕','默认关闭：需要时再打开，打开后可以在播放器里单独调','danmaku')}
      ${group('通知','','notify')}
      ${group('存储','缓存 / 导入导出 / 备份位置','storage')}
      ${group('高级','实验特性与重置','advanced')}
      <div class="about-line">
        <b>ACGN v0.9</b><span>本地单机 · 原型演示版，设置不持久</span>
        <button class="btn" data-action="check-update" style="margin-left:auto">检查更新</button>
      </div>`;
  }

  /* ----- 作品详情页（按介质差异化：动漫=剧集 / 游戏=游戏信息 / 漫画·小说=卷展开） ----- */
  /* 相关作品：同系列（排除自身）优先；否则按 related 名称解析到库内作品（同样排除自身），解析不到就不显示 */
  function relatedWorks(w){
    const out=[];
    const push=x=>{ if(x && x.id!==w.id && !out.some(o=>o.id===x.id)) out.push(x); };
    if(w.series) getSeriesWorks(w.series).forEach(push);
    (w.related||[]).forEach(r=>{
      const hit=WORKS.find(x=>x.id!==w.id && x.name===r.name) ||
                WORKS.find(x=>x.id!==w.id && r.name.includes(x.name) && x.name.length>=3);
      push(hit);
    });
    return out;
  }
  function hasSeries(w){ return !!w.series && getSeriesWorks(w.series).filter(x=>x.id!==w.id).length>0; }
  /* 加入作品区的按钮文案：随介质命名（追番 / 加入库 / 追漫 / 加入书架） */
  const ADD_LABEL = { anime:'+ 追番', game:'+ 加入库', manga:'+ 追漫', novel:'+ 加入书架', music:'+ 收藏' };

  /* 主操作：有观看/阅读记录就续上次的位置，没有就从第 1 集 / 第 1 卷开始（文案与行为必须一致） */
  function primaryAction(w){
    if(w.kind==='music') return { label:icon('play',16)+` 播放全部 · ${countOf(w)} 首`, act:'play-album' };
    if(w.kind==='game') return {label:icon('play',16)+' 启动游戏', act:'launch-game'};
    if(w.kind==='anime'){
      const at = state.playEp[w.id]!=null ? state.playEp[w.id]+1
               : (w.progress && w.progress.at>1 ? w.progress.at : 0);
      return { label: at ? icon('play',16)+` 继续观看 · 第 ${at} 集`
                         : icon('play',16)+' 从第 1 集开始',
               act:'continue-work' };
    }
    const rd=state.readPos[w.id]
      || (w.progress ? {vol:w.progress.at, ch:w.progress.ch||1} : null);
    const unit=w.kind==='manga'?'话':'章';
    return { label: rd ? icon('bookOpen',16)+` 继续阅读 · 第 ${rd.vol} 卷 · 第 ${rd.ch} ${unit}`
                       : icon('bookOpen',16)+' 从第 1 卷开始',
             act:'continue-work' };
  }
  /* 播放器 / 阅读器关掉后，详情页那颗主按钮要跟着变（局部更新，不整页重绘） */
  function refreshPrimaryAction(id){
    if(parseHash().view!=='detail') return;
    const w=getWork(id||parseHash().id); if(!w) return;
    const btn=document.querySelector('.detail-actions .btn.primary'); if(!btn) return;
    const a=primaryAction(w);
    btn.setAttribute('data-action', a.act);
    btn.innerHTML=a.label;
  }

  function renderDetail(id){
    const w=getWork(id); if(!w) return renderNotFound();
    const isAnime=w.kind==='anime', isGame=w.kind==='game', isBook=(w.kind==='manga'||w.kind==='novel');
    const isMusic=w.kind==='music';
    const isLocal = !!w.local || (w.episodes&&w.episodes.some(e=>e.local)) || (w.volumes&&w.volumes.some(v=>v.local));
    const localBadge = isLocal ? `<span class="local-badge">${icon('download',13)} 已缓存本地</span>` : '';
    const unit = w.kind==='manga'?'话':'章';

    // 主操作：有记录就续上次的位置，没有就从第 1 集 / 第 1 卷开始
    const act = primaryAction(w);

    let body='';
    if(isAnime){
      /* R10：剧集格子里必须看得出「我看到第几集」。
         只标「当前」这一格——已看的不标（"全部标一遍"等于没标），
         也不区分本地/在线：缓存是按整季下的，逐集标了也不改变任何操作。 */
      const cur = state.playEp[w.id]!=null ? state.playEp[w.id]
                : (w.progress ? Math.max(0,(w.progress.at||1)-1) : null);
      body = `<div class="section-title">剧集<span class="sec-right">共 ${w.episodes.length} 集</span></div>
        <div class="ep-grid">${w.episodes.map((e,i)=>epTile(e,i,w.accent,w.id,cur)).join('')}</div>`;
    } else if(isGame){
      const gi=w.gameInfo||{};
      body = `<div class="section-title">游戏信息</div>
        <div class="game-card">
          <div class="g-row"><span>平台</span><b>${esc(gi.platform||'—')}</b></div>
          <div class="g-row"><span>发售</span><b>${esc(gi.release||String(w.year))}</b></div>
          <div class="g-row"><span>语言</span><b>${esc(gi.lang||'—')}</b></div>
          <div class="g-row"><span>DLC / 版本</span><b>${esc((gi.dlc||[]).join('、')||'—')}</b></div>
          <div class="g-row"><span>成就</span><b>${esc(gi.achievements||'—')}</b></div>
        </div>`;
    } else if(isBook){
      /* 漫画 / 小说没有"格子"可标，位置就标在卷头与章片上：
         当前卷默认展开，当前章高亮。原先这里挂的百分比进度条已删（见下）。 */
      const bp = w.progress || null;
      body = `<div class="section-title">${w.kind==='manga'?'卷 / 话':'卷 / 章'}<span class="sec-right">共 ${w.volumes.length} 卷</span></div>
        <div class="vol-list">${w.volumes.map((v,i)=>volRow(v,i,w,unit,bp)).join('')}</div>`;
    } else if(isMusic){
      /* 专辑只有曲目表：编号 / 曲名 / 时长，点一行就是播放这一首 */
      body = `<div class="section-title">曲目<span class="sec-right">${w.tracks.length} 首 · ${albumDur(w)}</span></div>
        <div class="track-list">${w.tracks.map((t,i)=>
          `<button class="track-row ${state.mp&&state.mp.id===w.id&&state.mp.idx===i?'on':''}"
             data-action="play-track" data-id="${w.id}" data-i="${i}">
            <span class="tr-n">${state.mp&&state.mp.id===w.id&&state.mp.idx===i?icon('volume',13):t.n}</span>
            <span class="tr-title">${esc(t.title)}</span>
            <span class="tr-dur">${esc(t.dur)}</span>
          </button>`).join('')}</div>`;
    }

    /* 评分只显示媒体分：分数 + 样本数（多少人评的）。「我的评分」整块已撤，
       评分机制尚未定案（§10 只是备选方案，未采用），详情页不预留入口。 */
    const rel = relatedWorks(w);
    /* 相关作品：音乐卡也占满 2:3 的框（和漫画同高），封面缩成居中的圆形唱片，
       框底色是唱片纹。R11 的错位就是这么来的——把音乐的框强行压成 1:1，
       同一行的卡片高度不齐，网格看起来像散了架。 */
    const relHtml = rel.length ? `<div class="section-title">相关作品${
        hasSeries(w)?`<button class="sec-link" data-action="open-series" data-id="${w.series}">系列主页 ${icon('chevronRight',13)}</button>`:''}</div>
      <div class="rel-grid">${rel.map(r=>{
        const disc = r.kind==='music';
        return `<button class="rel-card" data-action="open-detail" data-id="${r.id}" data-kind="${r.kind}">
        <div class="rel-cover ${disc?'vinyl-lines disc-box':''}" style="${disc?'':coverStyle(r)}">
          ${disc?`<span class="rc-disc" style="${coverStyle(r)}"></span>`:coverInner(r)}
        </div>
        <div class="rel-name">${esc(r.name)}</div>
        <div class="rel-meta">${mediaIcon(r.kind,13)} ${esc(r.kindLabel)}</div>
      </button>`;}).join('')}</div>` : '';

    /* 详情上半区改成三段式，和首页 Hero 一致：
       上 = 标题 + 元信息；中 = 简介（吃掉留白）；下 = 继续观看等动作。
       原来这里还有一条「第 12 集 / 共 25 集 + 62%」的进度条，已删：
       剧集格里已经标了当前集，两处说的是同一件事。 */
    return `<div class="detail" data-kind="${w.kind}" style="--accent:${w.accent}">
      <button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('detail', id)}</button>
      <div class="detail-top">
        <div class="detail-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
        <div class="info">
          <div class="info-head">
            <h1>${esc(w.name)}</h1>
            <div class="detail-meta">
              <span class="score-badge" title="来源 ${esc(w.scoreSrc||'媒体')}">${w.score.toFixed(1)}</span>
              <span class="score-cap">${fmtCount(w.votes||0)}人评分</span><span class="meta-dot">·</span>
              <span>${w.year}</span><span>·</span><span>${esc(w.kindLabel)}</span>
              ${w.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}
              ${w.og?`<span class="chip" style="border-color:var(--accent);color:var(--accent)">${esc(originText(w))}</span>`:''}
              ${localBadge}
            </div>
          </div>
          <div class="detail-intro">${esc(w.intro)}</div>
          <div class="detail-actions acts-4">
            <button class="btn primary" data-action="${act.act}" data-id="${w.id}">${act.label}</button>
            <button class="btn js-add" data-action="add-shelf" data-id="${w.id}">${w.shelfStatus?'✓ 已在作品区':(ADD_LABEL[w.kind]||'+ 加入')}</button>
            <button class="btn js-dl" data-action="dl-create" data-id="${w.id}">${icon('download',16)} ${dlLabelOf(w)}</button>
            <button class="btn" data-action="open-wiki" data-id="${w.id}">${icon('book',16)} 百科</button>
          </div>
        </div>
      </div>
      ${body}
      ${relHtml}
    </div>`;
  }
  function volRow(v,i,w,unit,bp){
    const curVol = !!(bp && bp.at===v.n && !bp.done);
    const open = i===0 || curVol;
    return `<div class="vol-item ${open?'open':''} ${curVol?'now':''}">
      <div class="vol-head" data-action="vol-toggle">
        <div class="vol-cover" style="background:${coverArt(w.accent)}"><span>${v.n}</span></div>
        <div class="vol-info">
          <div class="vol-name">${esc(v.name)}${curVol?`<span class="now-tag">读到这里</span>`:''}</div>
          <div class="vol-sub">共 ${v.chapters.length} ${unit}</div>
        </div>
        <span class="vol-chev">${icon('chevronRight',16)}</span>
      </div>
      <div class="vol-chapters">
        ${v.chapters.map(c=>{
          const isCur = curVol && bp.ch===c.n;
          return `<button class="ch-chip ${isCur?'now':''}" data-action="open-reader" data-id="${w.id}" data-v="${v.n}" data-ch="${c.n}">${unit} ${c.n}</button>`;
        }).join('')}
      </div>
    </div>`;
  }
  function epTile(e,i,accent,workId,cur){
    const act = (e.sources && e.sources.length) ? 'open-player' : 'open-reader';
    const w=getWork(workId);
    const title=(w&&w.epTitles&&w.epTitles[i])||'';
    const now=(cur!=null && cur===i);
    const tip=`第 ${e.n} 集${title?' · '+title:''}${now?' · 看到这里':''}`;
    return `<button class="ep ${now?'now':''}" data-action="${act}" data-id="${workId}" data-ep="${i}"
      style="--accent:${accent}" title="${esc(tip)}" aria-label="${esc(tip)}">
      <span class="ep-n">${typeof e.n==='number'?('0'+e.n).slice(-2):esc(e.n)}</span>
    </button>`;
  }

  /* ----- 系列页（内容地图） ----- */
  const SERIES_SORTS=[{k:'media',l:'按介质分组'},{k:'timeline',l:'按故事时间线'},{k:'date',l:'按出版日期'}];
  const KIND_ORDER={anime:0,game:1,manga:2,novel:3,music:4};
  function renderSeries(sid){
    const all=seriesMembers(sid); if(!all.length) return renderNotFound();
    const rep=all.find(m=>m.local)||all[0];
    const name=seriesName(sid);
    const cur=state.seriesSort||'media';
    let members=all.slice();
    if(cur==='media') members.sort((a,b)=>KIND_ORDER[a.kind]-KIND_ORDER[b.kind]);
    else if(cur==='timeline') members.sort((a,b)=>a.year-b.year);
    else members.sort((a,b)=>b.year-a.year);

    const start=all.slice().sort((a,b)=>a.year-b.year)[0];
    const meta=seriesMetaOf(sid);
    const cover=seriesCover(sid,all);

    const rows=members.map((m,i)=>`
      <div class="media-row" data-action="open-detail" data-id="${m.id}" style="animation-delay:${i*40}ms">
        <div class="mr-cover" style="${coverStyle(m)}">${coverInner(m)}</div>
        <div class="mb">
          <div class="mt">${mediaIcon(m.kind,15)} ${esc(m.name)}${m.id===start.id?`<span class="start-tag">从这里开始</span>`:''}</div>
          <div class="mprog">${esc(m.kind==='game' ? ((m.gameInfo&&m.gameInfo.platform)||'游戏') : (progText(m)||'未加入作品区'))} · ${m.year}</div>
        </div>
        <span class="mr-score">${m.score.toFixed(1)}</span>
      </div>`).join('');

    return `<div class="detail" data-kind="${rep.kind}" style="--accent:${rep.accent};max-width:820px;margin:0 auto;">
      <button class="backbar" data-action="back">${icon('arrowLeft',18)} ${backLabelFor('series')}</button>
      <div class="detail-top">
        <div class="detail-cover" style="${cover?`background-image:url('${cover}');background-position:center ${focusOf(rep)}`:`background:${coverArt(rep.accent)}`}">
          ${cover?'':`<span class="glyph">${glyphOf(name)}</span>`}</div>
        <div class="info"><h1>${esc(name)}</h1>
          <div class="detail-meta">${[...new Set(all.map(m=>m.kind))].map(k=>`<span class="chip">${mediaIcon(k,14)} ${(all.find(m=>m.kind===k)||{}).kindLabel||''}</span>`).join('')}
            <span class="chip">${all.length} 部</span><span class="chip">${Math.min(...all.map(m=>m.year))} 起</span></div>
          ${meta?`<div class="detail-intro">${esc(meta.intro)}</div>`:''}
          <div class="detail-actions">
            <button class="btn primary" data-action="open-detail" data-id="${start.id}">${icon('play',16)} 从第一部开始</button>
            <button class="btn" data-action="col-cover" data-id="${sid}">${icon('image',16)} 换封面</button>
          </div>
        </div>
      </div>
      ${meta?`<div class="demo-note" style="display:block">
        <b>怎么看这个系列</b>
        <div style="margin-top:4px">${esc(meta.order)}</div></div>`:''}
      <div class="subchips" style="margin-bottom:var(--s-4);">${SERIES_SORTS.map(s=>`<button class="subchip ${s.k===cur?'on':''}" data-action="series-sort" data-k="${s.k}">${s.l}</button>`).join('')}</div>
      <div class="media-rows">${rows}</div>
    </div>`;
  }

  /* ----- 下载中心（只管"传输任务"，磁盘上的内容在资源管理里看，两者不重复） ----- */
  function renderDownload(){
    const f=state.dlFilter||'全部';
    let list=state.downloads;
    if(f==='下载中') list=list.filter(d=>d.status==='downloading');
    else if(f==='已暂停') list=list.filter(d=>d.status==='paused');
    else if(f==='完成') list=list.filter(d=>d.status==='done');
    else if(f==='失败') list=list.filter(d=>d.status==='failed');
    const filters=DL_FILTERS.map(x=>`<button class="chip ${x===f?'on':''}" data-action="dlfilter" data-f="${x}">${x}</button>`).join('');

    const active=state.downloads.filter(d=>d.status==='downloading');
    const paused=state.downloads.filter(d=>d.status==='paused');
    const doneCount=state.downloads.filter(d=>d.status==='done').length;
    const avg=active.length?Math.round(active.reduce((a,d)=>a+d.pct,0)/active.length):0;
    const remainMin=active.reduce((a,d)=>a+Math.round((100-d.pct)*0.9),0);
    const usedGB=state.downloads.filter(d=>d.status==='done').reduce((a,d)=>a+(d.size||1),0);
    /* R35：统计条原来只说「2 个任务下载中」，总任务数、占用、剩余磁盘都没有 */
    const summary=`<div class="dl-summary">
      <div class="dl-sum-main"><b>${active.length}</b><span>个任务下载中${paused.length?` · ${paused.length} 个已暂停`:''}</span></div>
      <div class="dl-sum-bar"><i style="width:${avg}%"></i></div>
      <div class="dl-sum-eta">共 ${state.downloads.length} 项 · 已完成占用 ${usedGB.toFixed(1)} GB · 剩余 ${(128-usedGB).toFixed(0)} GB</div>
      <button class="btn" data-action="dl-all">${active.length?'全部暂停':'全部继续'}</button>
      ${doneCount?`<button class="btn" data-action="dl-clear-done">清空已完成</button>`:''}
    </div>`;

    const rows=list.map(d=>{
      const w=getWork(d.work);
      const accent=w?w.accent:'#4FB3A6';
      const statusTxt={downloading:'下载中',paused:'已暂停',done:'已完成',failed:'失败'}[d.status];
      const eta = d.status==='downloading' ? `剩余 ${Math.round((100-d.pct)*0.9)} 分` : '';
      /* 失败原因压成一行：原来那句「连接源超时（内置源A / 镜像B 均不可用）」把行撑到 155px，
         同一页出现三种行高。原因放 title 里，想看细节悬停即可。 */
      const fail = d.status==='failed'
        ? `<div class="dl-fail" title="连接源超时（内置源A / 镜像B 均不可用）">连接源超时，可换源重试</div>` : '';
      /* 一行只留一个主操作，其余收进「⋯」：三个按钮并排会把作品名压成「物语系…」 */
      const mainAct = d.status==='downloading'
        ? `<button class="btn" data-action="dlpause" data-id="${d.work}">暂停</button>`
        : d.status==='paused'
        ? `<button class="btn" data-action="dlresume" data-id="${d.work}">继续</button>`
        : d.status==='done' ? `<button class="btn primary" data-action="dl-open" data-id="${d.work}">打开</button>`
        : `<button class="btn primary" data-action="dlretry" data-id="${d.work}">重试</button>`;
      return `<div class="dl-row" style="--accent:${accent}">
        <div class="dl-thumb" style="--focus:${focusOf(w)};${w?coverStyle(w):`background:${coverArt(accent)}`}">${w?coverInner(w):''}</div>
        <div class="dl-main">
          <div class="dl-name" title="${esc(d.name)}">${esc(d.name)}</div>
          <div class="dl-bar"><i style="width:${d.pct}%"></i></div>
          <div class="dl-meta"><span>${statusTxt} · ${d.pct}%</span><span>${d.speed||eta||((d.size||1)+' GB')}</span></div>
          ${fail}
        </div>
        <div class="dl-actions">${mainAct}
          <button class="more-dot dl-more" data-action="dl-menu" data-id="${d.work}" aria-label="更多操作">${icon('dots',15)}</button>
        </div>
      </div>`;
    }).join('');
    return `<div class="view-head"><div class="view-title">下载中心</div></div>
      ${summary}
      <div class="subchips" style="margin-bottom:var(--s-5);">${filters}</div>
      ${list.length?`<div class="dl-list">${rows}</div>`:`<div class="empty"><span class="e-ico">${icon('download',40)}</span>该分类暂无任务</div>`}`;
  }

  function mediaIcon(kind, size){ const m={anime:'film',game:'game',manga:'bookOpen',novel:'book',music:'music'}[kind]||'film'; return icon(m, size||15); }

  /* ---------------- 播放器覆盖层 ---------------- */
  const playerEl=document.createElement('div');
  playerEl.className='player'; playerEl.id='player';
  document.body.appendChild(playerEl);

  /* ---------------- 音乐：底部迷你播放条 ----------------
     静态原型也得点得动：点「播放全部」真的会出现一条播放条，进度按秒走，
     一首放完自动进下一首。不接真实音频，只演示播放状态。 */
  const mpEl=document.createElement('div');
  mpEl.className='miniplayer'; mpEl.id='miniplayer';
  document.body.appendChild(mpEl);

  let mpTimer=null;
  function fmtSec(s){ return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'); }
  function playAlbum(wid, idx){
    const w=getWork(wid); if(!w || w.kind!=='music') return;
    const n=w.tracks.length;
    state.mp={ id:wid, idx:Math.max(0, Math.min(idx||0, n-1)), t:0, playing:true };
    renderMp(); startMpTimer();
  }
  function startMpTimer(){
    clearInterval(mpTimer);
    mpTimer=setInterval(()=>{
      const mp=state.mp; if(!mp || !mp.playing) return;
      const w=getWork(mp.id); if(!w) return;
      const sec=trackSecs(w.tracks[mp.idx].dur);
      mp.t++;
      if(mp.t>=sec){
        if(mp.idx<w.tracks.length-1){ mp.idx++; mp.t=0; }
        else { mp.t=sec; mp.playing=false; }
      }
      renderMp();
    },1000);
  }
  function renderMp(){
    const mp=state.mp;
    if(!mp){
      mpEl.classList.remove('show');
      document.body.classList.remove('mp-on');
      mpEl.innerHTML='';
      return;
    }
    const w=getWork(mp.id); if(!w) return;
    const tr=w.tracks[mp.idx], sec=trackSecs(tr.dur), t=Math.min(mp.t, sec);
    const pct=sec?Math.round(t/sec*100):0;
    mpEl.innerHTML=`<div class="mp-cover" style="${coverStyle(w)}">${coverInner(w)}</div>
      <div class="mp-main">
        <div class="mp-title">${esc(tr.title)}</div>
        <div class="mp-sub">${esc((w.artist||'').split(' / ')[0])} · 第 ${mp.idx+1}/${w.tracks.length} 首</div>
        <div class="mp-bar"><i style="width:${pct}%"></i></div>
      </div>
      <span class="mp-time">${fmtSec(t)} / ${esc(tr.dur)}</span>
      <button class="mp-btn" data-action="mp-toggle" aria-label="${mp.playing?'暂停':'播放'}">${icon(mp.playing?'pause':'play',18)}</button>
      <button class="mp-btn" data-action="mp-next" aria-label="下一首">${icon('chevronRight',18)}</button>
      <button class="mp-btn" data-action="mp-close" aria-label="关闭播放条">${icon('close',16)}</button>`;
    mpEl.classList.add('show');
    document.body.classList.add('mp-on');
  }

  function openPlayer(workId, epIndex){
    const w=getWork(workId); if(!w) return;
    if(!w.episodes||!w.episodes.length){ openReader(workId); return; }
    const ep = w.episodes[epIndex] || w.episodes[0];
    const failSet = new Set();
    if(ep.sources.length>1) failSet.add(ep.sources.length-1);
    // 播放位置记忆：每部作品独立记录
    const saved = state.playPos && state.playPos[workId];
    const pos = saved!=null ? saved : 0;
    state.player={ workId, epIndex, w, ep, playing:false, speed:'1.0x', activeSource:0, failSet,
                   /* R60：弹幕默认关闭。不喜欢弹幕的人不该每次进来都先关一遍；
                      但打开后功能要齐（透明度 / 字号 / 速度 / 屏蔽词 / 输入框）。 */
                   danmaku:false, dmText:'', dmOpacity:100, dmSize:'中', dmSpeed:'中', dmShield:true,
                   autoNext:true, pip:false, showEp:false, showSet:false, showMore:false,
                   mute:false, vol:70, quality:'1080P', sub:'简中', pos, resumed: saved!=null };
    renderPlayer();
    playerEl.classList.add('show');
    /* 地址跟着走，但只在「本来就在这部作品的详情页」时改：
       从作品区点开时不改地址，退出时才好把详情页压上来、返回就回作品区。 */
    const h=parseHash();
    if(h.view==='detail' && h.id===workId) overlayHash('#/player/'+workId+(epIndex?('?ep='+(epIndex+1)):''));
  }
  function fmtTime(sec){
    const m=Math.floor(sec/60), s=sec%60;
    return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  }
  const DM_LINES=[
    '这个转场我反复看了三遍','第一次看的时候完全没注意到这个伏笔',
    '这里的配乐太犯规了','前方高能','这段作画是真的顶',
    '别跳，后面还有彩蛋','我承认我哭了','这集的节奏刚刚好',
  ];
  function renderPlayer(){
    const p=state.player; if(!p) return;
    state.playEp[p.workId]=p.epIndex;   // 当前看到第几集，详情页据此显示"继续观看"
    const ep=p.ep;
    const TOTAL=1450;  // 24:10
    const cur=Math.round(TOTAL*p.pos/100);
    const srcItems=ep.sources.map((s,i)=>{
      const fail=p.failSet.has(i);
      return `<div class="src-item ${i===p.activeSource?'active':''} ${fail?'fail':''}" data-action="src-pick" data-i="${i}">
        <span>${esc(s)}</span><span class="st">${fail?'连接失败':(i===p.activeSource?'使用中':'可用')}</span>
      </div>`;
    }).join('');
    const hasPrev=p.epIndex>0, hasNext=p.epIndex<p.w.episodes.length-1;

    /* R59：未播放时不再是「纯黑 + 一个巨大播放键」——
       用封面虚化打底，给出作品名、简介、和一句缓解等待的说明。
       卡片里不再放一张小封面：底衬已经是同一张图，再放一次就成了「两张小封面」。 */
    const waitStage = !p.playing ? `
      <div class="pl-poster" style="--focus:${focusOf(p.w)};background-image:url('${p.w.cover}')"></div>
      <div class="pl-postcard">
        <div class="pl-pc-txt">
          <h3>${esc(p.w.name)} · 第 ${ep.n} 集</h3>
          <p>${esc(p.w.intro)}</p>
          <div class="pl-wait"><span class="dotpulse"><i></i><i></i><i></i></span>
            正在寻源与缓冲，通常 3 秒内开始。若长时间无画面，可换一个源。</div>
        </div>
      </div>
      <button class="bigplay" data-action="player-play">${icon('play',34)}</button>` : `
      <div class="pl-poster" style="--focus:${focusOf(p.w)};background-image:url('${p.w.cover}');filter:blur(40px) brightness(.28)"></div>
      <div style="position:relative;z-index:2;color:#6E675F;font-size:var(--t-sm);text-align:center;line-height:1.9">
        <div style="font-size:var(--t-lg);color:#B9B2A7;font-weight:700">正在播放 · 第 ${ep.n} 集</div>
        <div>原型没有接入真实片源，这里只演示播放器的界面与状态。</div>
      </div>
      ${p.danmaku?`<div class="dm-layer">${DM_LINES.map((t,i)=>
        `<span style="top:${8+i*11}%;animation-delay:${i*1.1}s;font-size:${p.dmSize==='大'?18:p.dmSize==='小'?13:15}px;opacity:${p.dmOpacity/100}">${esc(t)}</span>`).join('')}</div>`:''}`;

    const epList=p.w.episodes.map((e,i)=>{
      const t=(p.w.epTitles&&p.w.epTitles[i])||'';
      return `<button class="pe-item ${i===p.epIndex?'on':''}" data-action="player-ep" data-i="${i}">
        <span class="pe-n">${typeof e.n==='number'?('0'+e.n).slice(-2):esc(e.n)}</span>
        <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t||('第 '+e.n+' 集'))}</span>
        ${e.local?`<span style="font-size:10px;color:var(--local)">本地</span>`:''}
      </button>`;
    }).join('');

    playerEl.style.setProperty('--accent', p.w.accent);
    playerEl.innerHTML=`
      <div class="player-top">
        <button class="pc-ico" data-action="close-player" aria-label="关闭播放器">${icon('close',18)}</button>
        <div class="pt-title">${esc(p.w.name)} · 第${(typeof ep.n==='number'?('0'+ep.n).slice(-2):ep.n)}集${(p.w.epTitles&&p.w.epTitles[p.epIndex])?' · '+esc(p.w.epTitles[p.epIndex]):''}</div>
        <button class="pc-ico" data-action="player-danmaku" title="弹幕开关" aria-pressed="${p.danmaku}" style="${p.danmaku?'':'opacity:.45'}">${icon('danmaku',18)}</button>
        <button class="pc-ico" data-action="player-set" title="播放器设置" aria-label="播放器设置">${icon('sliders',18)}</button>
      </div>
      <div class="pl-stage">
        <div class="pl-proto">网站原型 · 界面可交互，功能未真实实现</div>
        ${waitStage}
        <div class="src-panel" id="srcPanel">
          <h4>切换源</h4>
          ${srcItems}
        </div>
        <div class="ctrl-a" style="position:absolute;right:var(--s-4);bottom:var(--s-4);display:flex;gap:var(--s-2);z-index:9">
          <div class="pl-eppanel ${p.showEp?'show':''}" id="epPanel" style="right:0;bottom:calc(100% + 10px)">
            <div class="pe-h">选集<span>共 ${p.w.episodes.length} 集 · 标题为演示数据</span></div>
            <div class="pe-list">${epList}</div>
          </div>
          <div class="pl-set ${p.showSet?'show':''}" id="setPanel" style="right:0;bottom:calc(100% + 10px)">
            <div class="ps-h">播放器设置</div>
            <div class="ps-row"><span>弹幕</span><button data-action="player-danmaku" class="${p.danmaku?'on':''}">${p.danmaku?'已开启':'已关闭'}</button></div>
            <div class="ps-row"><span>弹幕透明度</span><span>${[['40',40],['70',70],['100',100]].map(([l,v])=>
              `<button data-action="dm-op" data-v="${v}" class="${p.dmOpacity==v?'on':''}">${l}%</button>`).join(' ')}</span></div>
            <div class="ps-row"><span>弹幕字号</span><span>${['小','中','大'].map(v=>
              `<button data-action="dm-size" data-v="${v}" class="${p.dmSize===v?'on':''}">${v}</button>`).join(' ')}</span></div>
            <div class="ps-row"><span>自动连播下一集</span><button data-action="player-autonext" class="${p.autoNext?'on':''}">${p.autoNext?'开':'关'}</button></div>
            <div class="ps-row"><span>跳过片头片尾</span><button data-action="player-proto" data-label="跳过片头片尾">90s / 60s</button></div>
            <div class="ps-row"><span>画中画</span><button data-action="player-proto" data-label="画中画">未实现</button></div>
          </div>
        </div>
      </div>
      <div class="player-ctrl">
        <!-- 控件恒定两行：①进度 + 时间 ②按钮组。
             窄屏只留「上一集 / 播放 / 下一集 / 选集 / 更多 / 全屏」，
             清晰度、字幕、片源、倍速、音量收进「更多」——
             全塞在第二行时会折成三四行，⛶ 还会被挤到单独一行靠左。 -->
        <div class="pc-line1">
          <span class="time">${fmtTime(cur)}</span>
          <div class="progress" data-action="player-seek"><i style="width:${p.pos}%"></i></div>
          <span class="time">${fmtTime(TOTAL)}</span>
        </div>
        <div class="pc-line2">
          <div class="pc-group">
            <button class="pc-ico" data-action="player-prev" ${hasPrev?'':'disabled'} style="${hasPrev?'':'opacity:.35'}" aria-label="上一集">${icon('chevronLeft',18)}</button>
            <button class="pc-ico pc-play" data-action="player-play" aria-label="${p.playing?'暂停':'播放'}">${p.playing?icon('pause',18):icon('play',18)}</button>
            <button class="pc-ico" data-action="player-next" ${hasNext?'':'disabled'} style="${hasNext?'':'opacity:.35'}" aria-label="下一集">${icon('chevronRight',18)}</button>
            <!-- R61：剧集选择从「一条横跨全宽的缩略图带」改成按钮 + 向上展开的竖列表 -->
            <button class="pl-epbtn ${p.showEp?'on':''}" data-action="player-ep-toggle">选集 ${icon('chevronDown',13)}</button>
          </div>
          <div class="pc-group pc-group-r">
            <button class="spd wide-only" data-action="player-quality" title="清晰度">${p.quality}</button>
            <button class="spd wide-only" data-action="player-sub" title="字幕">字幕 ${p.sub}</button>
            <button class="src-btn wide-only" data-action="src-toggle">切源 ${icon('chevronDown',14)}</button>
            <button class="spd wide-only" data-action="player-spd" title="倍速">${p.speed}</button>
            <div class="vol wide-only" title="音量（↑ ↓ 调节）">
              <button class="pc-ico" data-action="player-mute" style="${p.mute||!p.vol?'opacity:.35':''}" aria-label="静音">${icon('volume',18)}</button>
              <input class="vol-range" type="range" min="0" max="100" step="5" value="${p.mute?0:p.vol}" aria-label="音量">
            </div>
            <button class="pc-ico pc-more ${p.showMore?'on':''}" data-action="player-more" aria-label="更多播放设置" aria-expanded="${!!p.showMore}">${icon('dots',18)}</button>
            <button class="pc-ico" data-action="player-proto" data-label="全屏" aria-label="全屏">${icon('fullscreen',18)}</button>
            <span class="kbd-hint wide-only">空格 播放 · ←→ 跳转 · ↑↓ 音量</span>
          </div>
          <!-- 窄屏的「更多」：和上面那排是同一组动作，只是换了个入口 -->
          <div class="pl-more ${p.showMore?'show':''}" id="morePanel">
            <div class="pm-h">播放设置</div>
            <div class="pm-row"><span>清晰度</span><span class="pm-opts">${['1080P','720P','480P'].map(v=>
              `<button data-action="pv" data-k="quality" data-v="${v}" class="${p.quality===v?'on':''}">${v}</button>`).join('')}</span></div>
            <div class="pm-row"><span>字幕</span><span class="pm-opts">${['简中','繁中','关闭'].map(v=>
              `<button data-action="pv" data-k="sub" data-v="${v}" class="${p.sub===v?'on':''}">${v}</button>`).join('')}</span></div>
            <div class="pm-row"><span>片源</span><span class="pm-opts">${ep.sources.map((s,i)=>
              `<button data-action="src-pick" data-i="${i}" class="${p.activeSource===i?'on':''} ${p.failSet.has(i)?'fail':''}">${esc(s)}</button>`).join('')}</span></div>
            <div class="pm-row"><span>倍速</span><span class="pm-opts">${['0.5x','1.0x','1.25x','1.5x','2.0x'].map(v=>
              `<button data-action="pv" data-k="speed" data-v="${v}" class="${p.speed===v?'on':''}">${v}</button>`).join('')}</span></div>
            <div class="pm-row"><span>音量</span><span class="pm-opts pm-vol">
              <button class="pc-ico" data-action="player-mute" style="${p.mute||!p.vol?'opacity:.35':''}" aria-label="静音">${icon('volume',18)}</button>
              <input class="vol-range" type="range" min="0" max="100" step="5" value="${p.mute?0:p.vol}" aria-label="音量">
            </span></div>
          </div>
          ${p.danmaku?`<div class="pl-dm">
            <input id="dmInput" placeholder="发一条弹幕…" maxlength="40" value="${esc(p.dmText||'')}">
            <button data-action="dm-send">发送</button>
          </div>`:''}
        </div>
      </div>`;
  }
  function closePlayer(){ playerEl.classList.remove('show'); }
  /* 关闭 = 退回详情页（Esc 与左上角关闭按钮走同一条路，不各写一套） */
  function exitPlayer(){
    const wid=state.player?state.player.workId:null;
    if(state.player){ state.playPos[wid]=state.player.pos; state.playEp[wid]=state.player.epIndex; }
    closePlayer();
    landOnDetail(wid);
    refreshPrimaryAction(wid);
  }

  /* ---------------- 阅读器覆盖层 ---------------- */
  const readerEl=document.createElement('div');
  readerEl.className='reader'; readerEl.id='reader';
  document.body.appendChild(readerEl);

  function openReader(workId, chapter, volNo){
    const w=getWork(workId); if(!w) return;
    const vols=(w.volumes&&w.volumes.length)?w.volumes:[{n:1,name:'第 1 卷',chapters:[{n:1,title:'第 1 话'}]}];
    const saved=state.readPos[workId];
    const vi=Math.min(Math.max(1, volNo||(saved?saved.vol:1)), vols.length);
    const firstLen=vols[vi-1].chapters.length;
    const ch=(chapter&&chapter>0)?Math.min(chapter,firstLen)
      :(saved&&saved.vol===vi?Math.min(saved.ch,firstLen):1);
    state.reader={ workId, w, vols, vol:vi, ch, tocVol:vi, view:'single', chPct:0,
      manga:(w.kind==='manga'),
      settings:{fs:17,lh:1.9,bg:'follow',font:'sans',width:700} };
    saveRead();
    renderReader();
    readerEl.classList.add('show');
    rebindReader();
    const h=parseHash();
    if(h.view==='detail' && h.id===workId) overlayHash('#/reader/'+workId+'?vol='+vi+'&ch='+ch);
  }
  /* 阅读进度写入（同一作品只记一处，重开即从这里继续） */
  function saveRead(){
    const r=state.reader; if(!r) return;
    state.readPos[r.workId]={vol:r.vol, ch:r.ch};
  }
  function readerCur(){
    const r=state.reader;
    const vol=r.vols[r.vol-1]||r.vols[0];
    const ch=vol.chapters[r.ch-1]||vol.chapters[0];
    return { vol, ch };
  }
  function readerStep(dir){
    const r=state.reader;
    let v=r.vol, c=r.ch;
    if(dir>0){
      if(c<r.vols[v-1].chapters.length) c++;
      else if(v<r.vols.length){ v++; c=1; }
    } else {
      if(c>1) c--;
      else if(v>1){ v--; c=r.vols[v-1].chapters.length; }
    }
    r.vol=v; r.ch=c; r.tocVol=v; r.chPct=0; r.keepScroll=false; saveRead(); renderReader(); rebindReader();
  }
  /* 每次重绘阅读器后重新挂滚动监听（innerHTML 换掉后旧节点已不存在） */
  function rebindReader(){
    const body=readerEl.querySelector('.reader-body');
    if(body){ body.dataset.bound=''; bindReaderScroll(); }
  }
  /* ---- R62：示例正文 ----
     以前是同一段占位文字重复 5 次（「这一段用于演示阅读器排版与设置」），
     一屏里同一句话出现五遍，任何排版都救不回来。这里换成 4 段连贯的示例正文，
     只用于演示排版（不是任何真实作品的原文）。 */
  const DEMO_PASSAGES=[
    '天还没亮透的时候，镇上的雾是贴着地面走的。它从河那边过来，绕过晒谷场，把电线杆一根一根吞掉，最后停在旧书店的门口，像在等谁开门。',
    '少年把钥匙插进锁孔，手腕一转，门轴发出很长的一声响。屋里没有开灯，书架之间浮着细小的灰。他把书包放在柜台后面，先去开后窗——这是他祖父留下的规矩，说书要透气，人才坐得住。',
    '第一束光落在最里侧那一排书脊上，颜色像放久了的橘子皮。他伸手抽出其中一本，封皮已经卷边，扉页写着一行小字：给将来会翻开它的人。',
    '他忽然想起很久以前，有人在这里对他说过一句话，具体是什么已经记不清了，只记得对方说这句话的时候，窗外正在下雨。',
    '书店里最旧的那只钟还在走，只是每到一个整点就会慢半拍。祖父说过，钟慢一点没关系，人别慢下来就好。这句话他当时没听懂，现在也只是大概明白。',
    '午后有客人进来，穿灰色外套，不买书，只问了句「还开着吗」。他说开着。客人点点头，在门口站了一会儿就走了，风把门上的铃铛摇了两下。',
    '傍晚他整理到一箱没编号的旧刊，纸页发黄，边角卷起。里面夹着一张借书卡，最后一次的日期停在十几年前，名字被水渍晕开，只能看出一个「木」字。',
    '他把借书卡夹回原处，想了想，又在旁边补了一张新的，写上今天的日期，名字那一栏空着。他不确定这张卡还会不会有人来填。',
    '天黑之前，他把窗关上一半，留一条缝。街对面的灯一盏一盏亮起来，光落在书架上，像有人从很远的地方走过来，又走过去。',
    '关门的时候，他又听见了那声很长的门轴响。这一次他没有急着上锁，站在门口回头看了一眼——店里所有的书都安静地待在原处，像在等他明天再来。',
  ];
  function chapterText(w, ch, unit){
    /* 章号参与起始段落，不同章节读起来不是同一段复制；正文长度足够触发滚动，
       底部百分比才有意义（R63：按滚动位置算，不是按卷数算）。 */
    const head=`第 ${ch.n} ${unit}`;
    const n=DEMO_PASSAGES.length, start=((ch.n-1)%n+n)%n;
    const arr=[];
    for(let i=0;i<n;i++) arr.push(DEMO_PASSAGES[(start+i)%n]);
    arr[0]=head+'。'+arr[0];
    return arr.map(p=>`<p>${esc(p)}</p>`).join('');
  }

  function renderReader(){
    const r=state.reader; if(!r) return;
    const s=r.settings;
    const { vol, ch }=readerCur();
    const unit=r.w.kind==='manga'?'话':'章';
    const bodyBg = s.bg==='night'?'#15140F':s.bg==='sepia'?'#F3EAD7':s.bg==='paper'?'#FBFAF6':'var(--bg)';
    const textColor = s.bg==='night'?'#D8D2C7':'var(--text)';

    const toc = r.vols.map((v,vi)=>`<div class="toc-group">
        <div class="toc-vol ${vi+1===r.tocVol?'open':''}" data-action="reader-vol" data-v="${vi+1}">${esc(v.name)}</div>
        ${vi+1===r.tocVol?`<div class="toc-chs">${v.chapters.map((c,ci)=>
          `<div class="toc-item ${(vi+1===r.vol&&ci+1===r.ch)?'on':''}" data-action="reader-jump" data-v="${vi+1}" data-c="${ci+1}">第 ${c.n} ${unit}</div>`).join('')}</div>`:''}
      </div>`).join('');

    const posText=`第 ${vol.n} 卷 · 第 ${ch.n} ${unit}`;
    /* R63：百分比＝「从本章开头到已读位置」的滚动进度，不再是「第几卷 / 总卷数」的假进度 */
    const pct=Math.round(r.chPct||0);

    let bodyContent;
    if(r.manga){
      const pages = r.view==='double' ? 2 : 1;
      const w2 = r.view==='double' ? '760px' : '520px';
      bodyContent=`<div class="manga-pages ${r.view}" style="max-width:${w2};">
        ${Array.from({length:pages}).map((_,k)=>`<div class="manga-page" style="background:${coverArt(r.w.accent)}">${esc(posText)} · ${k+1}</div>`).join('')}
      </div>`;
    } else {
      bodyContent=`<div class="reader-text" style="font-size:${s.fs}px;line-height:${s.lh};color:${textColor};
        font-family:${s.font==='serif'?"'Songti SC','SimSun',serif":"'PingFang SC','Microsoft YaHei',sans-serif"};
        max-width:${s.width}px;letter-spacing:.02em;">${chapterText(r.w,ch,unit)}</div>`;
    }

    readerEl.style.background = s.bg==='night'?'#15140F':'var(--bg)';
    const onShelf=!!r.w.shelfStatus, dlTask=dlTaskOf(r.w.id);
    const dlOn = dlTask && (dlTask.status==='downloading'||dlTask.status==='done');

    /* R64：参照开源阅读器（KOReader / Foliate / Thorium / Librera）的常见能力排布工具栏。
       按钮都在，未实现的点了给一句说明，不装死。 */
    const tools=[
      {k:'toc',  i:'menu',    l:'目录', on:false},
      {k:'mark', i:'bookmark',l:'书签', on:!!r.bookmarks},
      {k:'note', i:'doc',     l:'笔记', on:false},
      {k:'find', i:'search',  l:'全文搜索', on:false},
      {k:'tts',  i:'mic',     l:'朗读',  on:false},
      {k:'auto', i:'play',    l:'自动滚动', on:!!r.autoScroll},
    ];

    readerEl.innerHTML=`
      <div class="reader-top">
        <button class="pc-ico rt-btn" data-action="close-reader">${icon('arrowLeft',18)} 返回</button>
        <div class="rt-title">《${esc(r.w.name)}》${esc(posText)}</div>
        <button class="pc-ico rt-btn" data-action="reader-dl" title="下载" style="${dlOn?'color:var(--accent,#3E9B57);':''}">${icon('download',18)}</button>
        <button class="pc-ico rt-btn" data-action="reader-shelf" title="${onShelf?'已在作品区':'加入作品区'}" style="${onShelf?'color:var(--accent,#3E9B57);':''}">${onShelf?icon('check',18):icon('bookmark',18)}</button>
        <button class="pc-ico rt-btn" data-action="reader-set">${icon('sliders',18)} Aa</button>
      </div>
      <div class="rd-bar">
        ${tools.map(t=>`<button data-action="reader-tool" data-k="${t.k}" class="${t.on?'on':''}">${icon(t.i,13)} ${t.l}</button>`).join('')}
        ${r.manga?`<span style="width:1px;height:18px;background:var(--line);flex-shrink:0"></span>
          ${[['single','单页'],['double','双页'],['scroll','竖向']].map(([k,l])=>
            `<button data-action="reader-view" data-v="${k}" class="${r.view===k?'on':''}">${l}</button>`).join('')}`:''}
        <span style="margin-left:auto;font-size:var(--t-xs);color:var(--sub);white-space:nowrap">${pct}%</span>
      </div>
      <div class="reader-body" style="background:${bodyBg};">${bodyContent}</div>
      <div class="reader-bottom">
        <button class="btn" data-action="reader-prev">${icon('chevronLeft',16)} 上一${unit}</button>
        <div class="rb-mid">${esc(posText)} · ${pct}%</div>
        <button class="btn primary" data-action="reader-next">下一${unit} ${icon('chevronRight',16)}</button>
      </div>
      <div class="rd-progress"><i id="rdBar" style="width:${pct}%"></i></div>
      <div class="toc" id="readerToc">${toc}</div>
      <div class="reader-set" id="readerSet">
        <div class="rs-row"><span>字号</span>
          <span class="rs-seg"><button data-action="rs-fs" data-d="-1">A−</button><b style="padding:0 6px">${s.fs}</b><button data-action="rs-fs" data-d="1">A+</button></span></div>
        <div class="rs-row"><span>行距</span>
          <span class="rs-seg">${[['1.6','1.6'],['1.9','1.9'],['2.2','2.2']].map(([l,v])=>
            `<button data-action="rs-lh2" data-v="${v}" class="${String(s.lh)===v?'on':''}">${l}</button>`).join('')}</span></div>
        <div class="rs-row"><span>字体</span>
          <span class="rs-seg">${[['sans','黑体'],['serif','宋体']].map(([v,l])=>
            `<button data-action="rs-font" data-v="${v}" class="${s.font===v?'on':''}">${l}</button>`).join('')}</span></div>
        <div class="rs-row"><span>版心宽度</span>
          <span class="rs-seg">${[['620','窄'],['700','中'],['820','宽']].map(([v,l])=>
            `<button data-action="rs-width" data-v="${v}" class="${String(s.width)===v?'on':''}">${l}</button>`).join('')}</span></div>
        <div class="rs-row"><span>背景</span>
          <span class="rd-theme">${[['follow','var(--bg)'],['paper','#FBFAF6'],['sepia','#F3EAD7'],['night','#15140F']].map(([v,c])=>
            `<button data-action="rs-bg2" data-v="${v}" class="${s.bg===v?'on':''}" style="background:${c}" aria-label="${v}"></button>`).join('')}</span></div>
      </div>`;
    /* 打开时把滚动位置复位（换章 / 切换设置时不必每次都跳回顶部，见下方 restore） */
    const body=readerEl.querySelector('.reader-body');
    if(body) body.scrollTop = r.keepScroll ? (r.scrollTop||0) : 0;
    r.keepScroll=false;
  }
  /* 章节内滚动进度：写回状态并只改两条 DOM，不整页重绘 */
  function bindReaderScroll(){
    const body=readerEl.querySelector('.reader-body');
    if(!body || body.dataset.bound) return;
    body.dataset.bound='1';
    body.addEventListener('scroll', ()=>{
      const r=state.reader; if(!r) return;
      const max=Math.max(1, body.scrollHeight-body.clientHeight);
      const pct=Math.min(100, Math.max(0, Math.round(body.scrollTop/max*100)));
      r.chPct=pct; r.scrollTop=body.scrollTop;
      const mid=readerEl.querySelector('.rb-mid');
      if(mid){ const {vol,ch}=readerCur(); const unit=r.w.kind==='manga'?'话':'章';
        mid.textContent=`第 ${vol.n} 卷 · 第 ${ch.n} ${unit} · ${pct}%`; }
      const bar=readerEl.querySelector('#rdBar');
      if(bar) bar.style.width=pct+'%';
      const top=readerEl.querySelector('.rd-bar span[style*="margin-left:auto"]');
      if(top) top.textContent=pct+'%';
      saveRead();
    }, {passive:true});
  }
  function closeReader(){ readerEl.classList.remove('show'); }

  /* ---------------- 作品管理：唯一入口是工具条右侧的「管理」按钮 ----------------
     进入后工具条原地换内容为「已选 N 项 · 移出作品区 · 完成」，点其它作品可多选。
     右键 / 长按手势入口已按定稿第 102 条作废——同一功能三条路径等于没有入口。 */

  /* ---------------- 树形层级：每个页面的「上级页面」（固定父子关系，不随访问轨迹变化） ----------------
     首页(根) ┬─ 分类页 / 功能页（排行榜·时间表…） → 首页
              ├─ 作品详情 → 所属分区的首页
              │    └─ 百科 → 作品详情
              ├─ 典藏 → 系列页
              └─ 我的 → 下载 / 资源管理 / 设置 / 各功能页
     返回按钮直接写出目标页，避免「返回」这种模糊文案。 */
  /* ---------------- 搜索范围 ----------------
     分区之外还有一个「百科」范围（R67）：搜的不是作品名，而是百科条目里的
     角色 / 声优 / 制作公司 / 简介。想查「梶裕贵配过什么」只有这个范围能一次找全。 */
  const SEARCH_SCOPES=[{id:'all',label:'全部',hint:'五个分区一起搜'}]
    .concat(PARTITIONS.map(p=>({id:p.id,label:p.label,hint:'只在'+p.label+'里搜'})),[
      {id:'wiki',label:'百科',hint:'角色 / 声优 / 制作'}
    ]);
  function scopeLabel(id){ const x=SEARCH_SCOPES.find(v=>v.id===id); return x?x.label:'全部'; }
  function kindCount(k){
    if(k==='wiki') return WORKS.filter(w=>w.cast&&w.cast.length).length;
    return WORKS.filter(w=>w.kind===k).length;
  }
  /* 一处定义匹配规则：名字 / 标签 / 歌手 / 声优。
     搜索框里写了「歌手」，就必须真能搜到歌手（音乐没有 cast）。 */
  function matchWork(w,t){
    return w.name.toLowerCase().includes(t)
      || (w.tags && w.tags.join('').toLowerCase().includes(t))
      || (w.artist && w.artist.toLowerCase().includes(t))
      || (w.cast && w.cast.some(c=>c.actor.toLowerCase().includes(t)));
  }
  /* 百科范围：命中角色名 / 声优 / 制作人员 / 简介 / 别名，返回命中的那一句作摘要 */
  function matchWiki(w,t){
    const hits=[];
    (w.cast||[]).forEach(c=>{
      if((c.role||'').toLowerCase().includes(t)) hits.push(`角色 · ${c.role}`);
      else if((c.actor||'').toLowerCase().includes(t)) hits.push(`声优 · ${c.role} / ${c.actor}`);
    });
    Object.entries(w.production||{}).forEach(([k,v])=>{
      if(String(v).toLowerCase().includes(t)) hits.push(`${k} · ${v}`);
    });
    if((w.intro||'').toLowerCase().includes(t)) hits.push('简介中命中');
    if((w.name||'').toLowerCase().includes(t)) hits.push('作品名');
    if(w.meta && (w.meta.aka||'').toLowerCase().includes(t)) hits.push('别名 · '+w.meta.aka);
    return hits;
  }

  function labelOfPartition(p){
    const x=PARTITIONS.find(t=>t.id===p); return x?x.label:'动漫';
  }
  /* 「聚合」已改名为「首页」：返回文案写「返回首页 · 动漫」，既不叫错名字也保留上下文 */
  function backToAggLabel(p){ return '返回首页 · '+labelOfPartition(p); }
  function parentInfo(){
    const {view,id}=parseHash();
    if(view==='wiki') return {view:'detail', q:{}, id, label:'返回详情'};
    if(view==='player'||view==='reader') return {view:'detail', q:{}, id, label:'返回详情'};
    if(view==='detail'){ const w=getWork(id); const p=w?w.kind:state.partition; return {view:'aggregate', q:{p}, label:backToAggLabel(p)}; }
    if(view==='series') return {view:'collection', q:{}, label:'返回典藏'};
    if(view==='search') return {view:'aggregate', q:{p:state.partition}, label:'返回首页'};
    if(view==='category') return {view:'aggregate', q:{p:state.partition}, label:backToAggLabel(state.partition)};
    if(view==='feature') return {view:'aggregate', q:{p:state.partition}, label:backToAggLabel(state.partition)};
    if(view==='download'||view==='resources'||view==='disk'||view==='stats'||view==='settings'||view==='panel') return {view:'mine', q:{}, label:'返回我的'};
    return {view:'aggregate', q:{p:state.partition}, label:'返回首页'};
  }
  function backLabelFor(view,id){
    /* 有来处就写来处：从作品区点进详情，返回键就该写「返回作品区」，
       写「返回首页」是骗人的——按下去到的也不是首页。 */
    const prev=backStack.length?backStack[backStack.length-1]:null;
    const pv=prev?viewOfHash(prev):null;
    if(view==='detail'){
      if(pv==='shelf') return '返回作品区';
      if(pv==='collection') return '返回典藏';
      if(pv==='search') return '返回搜索';
      if(pv==='feature') return backToAggLabel(state.partition);
      const w=getWork(id||parseHash().id); const p=w?w.kind:state.partition;
      return backToAggLabel(p);
    }
    if(view==='wiki') return prev && pv==='search' ? '返回搜索' : '返回详情';
    if(view==='series') return '返回典藏';
    if(view==='category'||view==='feature') return backToAggLabel(state.partition);
    if(view==='search') return '返回首页';
    return '返回我的';
  }
  function goBack(){
    /* 先回真正的来处（跳过与当前相同的项：浏览器自带的返回也会移动 hash，
       栈里可能留下一条已经等于当前页的记录）。 */
    const cur=location.hash;
    while(backStack.length){
      const h=backStack.pop();
      if(!h || h===cur) continue;
      const v=viewOfHash(h);
      if(v==='404') continue;
      historyGuard=true;                 // 这次跳转是「退」，不要再压栈
      goHash(h);
      return;
    }
    const p=parentInfo(); navigate(p.view, p.q, p.id);
  }

  /* 范围菜单是浮层：点别处、按 Esc 都要能收起来，否则它会一直挂在那儿 */
  document.addEventListener('click', e=>{
    if(!e.target || typeof e.target.closest!=='function') return;
    if(!e.target.closest('#searchWrap')) closeScope();
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape') closeScope();
  });

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener('click', e=>{
    // 兜底：document 上直接派发的合成事件没有 closest，先挡掉（真机不会走到，但别让它抛错）
    if(!e.target || typeof e.target.closest!=='function') return;
    const t=e.target.closest('[data-action]'); if(!t) return;
    const a=t.dataset.action;
    const {view,id}=parseHash();

    switch(a){
      case 'brand': state.search=''; state.aggCat=null; $('#searchInput').value=''; navigate('aggregate',{p:state.partition}); break;
      /* 搜索范围：按钮开合菜单 / 菜单选项 / 空结果里的「在全部范围中搜索」 */
      case 'toggle-scope': {
        const m=$('#scopeMenu');
        if(!m) break;
        const open=m.classList.toggle('show');
        t.setAttribute('aria-expanded', open?'true':'false');
        break;
      }
      case 'set-scope': {
        const sc=t.dataset.s;
        state.searchScope=sc;
        setLocal('acgn-search-scope', sc);   // R68：范围要持久，刷新后别回到「全部」
        state.listLim['search']=PAGE_SIZE; state.listLim['wiki-search']=PAGE_SIZE;
        closeScope(); syncScopeUI();
        /* 只在搜索态下重渲染——没在搜的时候换范围只是记个偏好，页面不该动。 */
        if(state.search){
          if(location.hash.indexOf('#/aggregate')===0) renderView('aggregate');
          else { state.bottom='aggregate'; navigate('aggregate',{p:state.partition}); }
        }
        break;
      }
      case 'scope-all': {
        if(state.searchScope==='all') break;
        state.searchScope='all'; closeScope(); syncScopeUI();
        if(state.search) renderView('aggregate');
        break;
      }
      case 'goto-download': navigate('download'); break;
      case 'nf-home': navigate('aggregate',{p:state.partition}); break;
      case 'open-artist': navigate('feature',{p:state.partition,k:'artist',t:t.dataset.a,a:t.dataset.a}); break;
      /* 音乐：播放整张 / 单曲 / 播放条控制 */
      case 'play-album': playAlbum(t.dataset.id, 0); break;
      case 'play-track': playAlbum(t.dataset.id, parseInt(t.dataset.i,10)||0); break;
      case 'mp-toggle': if(state.mp){ state.mp.playing=!state.mp.playing; renderMp(); } break;
      case 'mp-next': {
        if(!state.mp) break;
        const mw=getWork(state.mp.id);
        if(mw){ state.mp.idx=(state.mp.idx+1)%mw.tracks.length; state.mp.t=0; renderMp(); }
        break;
      }
      case 'mp-close': state.mp=null; clearInterval(mpTimer); renderMp(); break;
      case 'open-settings': navigate('settings'); break;
      case 'open-resources': navigate('resources'); break;
      case 'open-category': state.catTag=null; navigate('category',{p:state.partition}); break;
      case 'set-theme': applyThemeMode(t.dataset.mode); renderView('settings'); break;
      case 'partition': {
        /* 切分区只换范围，搜索词保留（在新分区内重新搜），筛选条件清空（维度随介质变）。
           搜索态下点分区条＝把搜索范围收到这个分区，两处控件指向同一个状态。 */
        state.partition=t.dataset.p;
        /* 搜索态下点分区条＝把范围收到这个分区；两处控件指向同一个状态。
           这里 partition 本来就跟着 hash 变了，不需要额外同步。 */
        if(state.search) state.searchScope=state.partition;
        state.filters={}; state.catTag=null; state.listLim={}; state.tagOpen=null;
        navigate('aggregate',{p:state.partition});
        break;
      }
      case 'bottom': {
        const tab=t.dataset.tab;
        if(tab==='shelf'){ navigate('shelf',{p:state.shelfPartition}); }
        else if(tab==='aggregate'){ navigate('aggregate',{p:state.partition}); }
        else { navigate(tab); }
        break;
      }
      /* 换分区就把筛选复位：在「在看」里点到游戏分区，那个筛选项在新分区里根本不存在 */
      case 'shelftab': state.shelfPartition=t.dataset.p; state.shelfManage=false; state.shelfSel=[]; state.shelfFilter='all'; renderView('shelf', null, 'swap'); break;
      case 'shelf-continue': { const w=getWork(t.dataset.id); if(w) continueWork(w); break; }
      case 'shelf-pick': {
        const wid=t.dataset.id;
        const i=state.shelfSel.indexOf(wid);
        if(i>=0) state.shelfSel.splice(i,1); else state.shelfSel.push(wid);
        renderView('shelf'); break;
      }
      case 'shelf-done': exitManage(); break;
      case 'shelf-remove': {
        const n=state.shelfSel.length;
        state.shelfSel.forEach(wid=>{ const w=getWork(wid); if(w){ w.shelfStatus=false; w.progress=null; } });
        toast(`已移出 ${n} 部`);
        exitManage(); break;
      }
      case 'dl-create': {
        const w=getWork(t.dataset.id); if(!w) break;
        const task=dlTaskOf(w.id);
        // 已有任务（下载中/已暂停/已完成）→ 直接去下载中心操作，按钮不是死的
        if(task && task.status!=='failed'){ navigate('download'); break; }
        createDownload(w);
        t.innerHTML=`${icon('download',16)} ${dlLabelOf(w)}`;
        break;
      }
      case 'series-sort': state.seriesSort=t.dataset.k; renderView('series', id); break;
      case 'rank-dim': state.rankDim=t.dataset.k; renderView('feature'); break;
      case 'sch-day': state.schDay=parseInt(t.dataset.d,10); renderView('feature'); break;
      case 'sch-mine': state.schOnlyMine=!state.schOnlyMine; renderView('feature'); break;
      case 'cat-sort': {
        const k=t.dataset.k;
        if(state.catSort===k) state.catAsc=!state.catAsc;
        else { state.catSort=k; state.catAsc=false; }
        state.listLim['category']=PAGE_SIZE;
        renderView('category'); break;
      }
      case 'cat-filter-toggle': state.catOpenFilter=!state.catOpenFilter; renderView('category'); break;
      case 'cat-clear': state.filters={}; state.catTag=null; state.listLim['category']=PAGE_SIZE; renderView('category'); break;
      case 'cat-tag-clear': state.catTag=null; state.listLim['category']=PAGE_SIZE; renderView('category'); break;
      case 'wiki-refresh': {
        const w=getWork(t.dataset.id); if(!w) break;
        if(state.wikiBusy[w.id]==='loading') break;
        state.wikiBusy[w.id]='loading';
        renderView('wiki', w.id);
        setTimeout(()=>{ state.wikiBusy[w.id]='done'; if(parseHash().view==='wiki') renderView('wiki', w.id); toast('已重新刮削：匹配到 1 条条目'); },900);
        break;
      }
      case 'check-update': toast('已是最新版本 v0.9'); break;
      case 'dl-all': {
        const running=state.downloads.filter(d=>d.status==='downloading').length;
        state.downloads.forEach(d=>{
          if(running && d.status==='downloading'){ d.status='paused'; d.speed=''; }
          else if(!running && d.status==='paused'){ d.status='downloading'; d.speed='1.0 MB/s'; }
        });
        updateDlDot(); renderView('download'); break;
      }
      case 'res-open': toast('已打开所在文件夹（演示）'); break;
      case 'res-clean': toast('已清理 3 项（演示）'); break;
      case 'open-detail': navigate('detail',{},t.dataset.id); break;
      case 'open-series': navigate('series',{},t.dataset.id); break;
      case 'open-player': openPlayer(t.dataset.id, parseInt(t.dataset.ep,10)); break;
      case 'open-player-latest': openPlayer(t.dataset.id, 0); break;
      case 'open-reader': openReader(t.dataset.id, t.dataset.ch?parseInt(t.dataset.ch,10):undefined, t.dataset.v?parseInt(t.dataset.v,10):undefined); break;
      case 'add-shelf': {
        const w=getWork(t.dataset.id); if(!w) break;
        if(w.shelfStatus){ w.shelfStatus=false; w.progress=null; t.textContent=(ADD_LABEL[w.kind]||'+ 加入'); toast('已从作品区移除'); }
        else { w.shelfStatus=true; if(!w.read) w.read={at:1,ch:1}; deriveProgress(w); t.textContent='✓ 已在作品区'; toast('已加入作品区'); }
        break;
      }
      case 'search-hist': {
        const term=t.dataset.term;
        $('#searchInput').value=term; state.search=term;
        navigate('aggregate',{p:state.partition});
        break;
      }
      case 'fn': navigate('feature',{k:t.dataset.k, t:t.dataset.t, p:state.partition}); break;
      case 'panel': navigate('panel',{k:t.dataset.k}); break;
      case 'toggle': {
        const key=t.dataset.key;
        state.toggles[key] = !toggleVal(key, t.dataset.def==='true');
        renderView('panel'); break;
      }
      case 'cycle': {
        const key=t.dataset.key, n=parseInt(t.dataset.n,10)||2;
        state.toggles[key] = ((toggleVal(key,0)+1)%n);
        renderView('panel'); break;
      }
      case 'panel-act': toast(t.dataset.label+'（演示）'); break;
      case 'res-delete': {
        const w=getWork(t.dataset.id); if(!w) break;
        /* R38：删除没有二次确认，误点就没了 */
        confirmBox('删除本地文件？', `将删除《${w.name}》在本机的资源（${resSize(w)} GB），作品仍在库内，可重新下载。`, '删除', ()=>{
          w.local=false; if(w.episodes) w.episodes.forEach(e=>e.local=false);
          if(w.volumes) w.volumes.forEach(v=>v.local=false);
          if(state.resPath.length>=2) state.resPath=state.resPath.slice(0,1);
          renderView('resources'); toast('已移除本地文件');
        });
        break;
      }
      case 'plan-toggle': {
        const w=getWork(t.dataset.id); if(!w) break;
        if(w.shelfStatus){ w.shelfStatus=false; w.progress=null; }
        else { w.shelfStatus=true; if(!w.read) w.read={at:1,ch:1}; deriveProgress(w); }
        const on=!!w.shelfStatus;
        t.classList.toggle('on', on);
        t.innerHTML = on ? icon('check',13)+' 已加入' : '加入追番';
        // 同步当日 tab 的追番数，不整页重绘
        if(w.air){
          const day=w.air.day;
          const tab=document.querySelector(`.wd-tab[data-d="${day}"] span`);
          if(tab){
            const all=WORKS.filter(x=>x.kind==='anime'&&x.air&&x.air.day===day);
            const mine=all.filter(x=>x.shelfStatus).length;
            tab.textContent = mine ? mine+' 追' : all.length+' 部';
          }
        }
        break;
      }
      case 'art-toggle': {
        const key=t.dataset.key;
        state.artOpen[key]=!state.artOpen[key];
        renderView('feature'); break;
      }
      case 'back': goBack(); break;
      case 'open-wiki': navigate('wiki',{},t.dataset.id); break;
      case 'tag-refresh': refreshTag(t.dataset.tag); break;
      case 'hero-shuffle': {
        /* 记住最近 5 次抽到的作品，连续点「换一个」不会反复撞回同一张 */
        const pool=WORKS.filter(w=>w.kind===state.partition);
        if(pool.length>1){
          const next=pickRandom(pool, state.partition);
          state.randomPick[state.partition]=next;
        }
        /* 「换一个」＝这一张我都不想要，那颗续播按钮跟着一起撤（它属于这张推荐）。
           离开首页或切分区时恢复，不做永久关闭。 */
        state.resumeOff=true;
        /* 只换 Hero 这一块，不是重渲染整页。整页重绘会让功能按钮和下面所有分组
           跟着重播一次入场动画——用户点的只是一个"换一张推荐"。 */
        const old=$('.hero');
        if(old){
          const box=document.createElement('div');
          box.innerHTML=heroBlock();
          const next=box.firstElementChild;
          next.classList.add('swap');
          old.replaceWith(next);
        }
        break;
      }
      /* 点标签先在原地展开，再点一次收起；「查看全部」才跳分类页 */
      case 'tag-open': {
        const tg=t.dataset.tag;
        state.tagOpen = state.tagOpen===tg ? null : tg;
        renderView('feature'); break;
      }
      case 'tag-more': state.catTag=t.dataset.tag; navigate('category',{p:state.partition, tag:t.dataset.tag}); break;
      case 'cat-opt': {
        const dim=t.dataset.dim, opt=t.dataset.opt;
        if(!opt){ state.filters[dim]=[]; renderView('category'); break; }
        state.filters[dim]=state.filters[dim]||[];
        const i=state.filters[dim].indexOf(opt);
        if(i>=0) state.filters[dim].splice(i,1); else state.filters[dim].push(opt);
        renderView('category'); break;
      }
      case 'vol-toggle': { const it=t.closest('.vol-item'); if(it) it.classList.toggle('open'); break; }
      case 'continue-work': { const w=getWork(t.dataset.id); if(w) continueWork(w); break; }
      case 'launch-game': openPlayer(t.dataset.id, 0); break;
      case 'close-player': exitPlayer(); break;
      case 'player-play':
        state.player.playing=!state.player.playing;
        if(state.player.playing) state.player.pos=Math.min(99, state.player.pos+1);
        state.playPos[state.player.workId]=state.player.pos;
        renderPlayer(); break;
      case 'player-seek': {
        // 按点击位置定位，而不是固定 +10%
        const r=t.getBoundingClientRect();
        const pct=Math.min(99,Math.max(0,Math.round((e.clientX-r.left)/Math.max(1,r.width)*100)));
        state.player.pos=pct;
        state.playPos[state.player.workId]=pct;
        renderPlayer(); break;
      }
      case 'player-prev': {
        if(state.player.epIndex>0){ state.player.epIndex--; state.player.ep=state.player.w.episodes[state.player.epIndex]; state.player.pos=0; state.player.resumed=false; renderPlayer(); }
        break;
      }
      case 'player-next': {
        const p=state.player;
        if(p.epIndex<p.w.episodes.length-1){ p.epIndex++; p.ep=p.w.episodes[p.epIndex]; p.pos=0; p.resumed=false; renderPlayer(); }
        break;
      }
      case 'player-quality': {
        const arr=['1080P','720P','480P'];
        let i=arr.indexOf(state.player.quality); state.player.quality=arr[(i+1)%arr.length]; renderPlayer(); break;
      }
      case 'player-sub': {
        const arr=['简中','繁中','关闭'];
        let i=arr.indexOf(state.player.sub); state.player.sub=arr[(i+1)%arr.length]; renderPlayer(); break;
      }
      case 'player-ep': {
        state.player.epIndex=parseInt(t.dataset.i,10);
        state.player.ep=state.player.w.episodes[state.player.epIndex];
        state.player.pos=0; state.player.resumed=false;
        renderPlayer(); break;
      }
      case 'player-spd': {
        const arr=['0.5x','1.0x','1.25x','1.5x','2.0x'];
        let i=arr.indexOf(state.player.speed); state.player.speed=arr[(i+1)%arr.length]; renderPlayer(); break;
      }
      case 'player-danmaku': state.player.danmaku=!state.player.danmaku; renderPlayer(); break;
      case 'player-mute': {
        const p=state.player;
        p.mute=!p.mute;
        if(!p.mute && !p.vol) p.vol=70;   // 静音前若音量是 0，取消静音时给个可听值
        renderPlayer(); break;
      }
      case 'player-fs': toast('全屏（演示）'); break;
      case 'src-toggle': { const sp=$('#srcPanel',playerEl); sp.classList.toggle('show'); break; }
      case 'src-pick': {
        const i=parseInt(t.dataset.i,10);
        if(state.player.failSet.has(i)){ toast('该源连接失败，已自动回落'); return; }
        state.player.activeSource=i; renderPlayer(); break;
      }
      case 'close-reader': { const wid=state.reader?state.reader.workId:null; closeReader(); landOnDetail(wid); refreshPrimaryAction(wid); break; }
      /* 阅读器里就能下载 / 加入作品区，不必退回详情页再做一遍 */
      case 'reader-dl': { createDownload(state.reader.w); renderReader(); break; }
      case 'reader-shelf': {
        const r=state.reader, w=r.w;
        if(w.shelfStatus){ w.shelfStatus=false; w.progress=null; toast('已从作品区移除'); }
        else {
          w.shelfStatus=true;
          w.read={at:r.vol, ch:r.ch};
          deriveProgress(w);
          toast('已加入作品区');
        }
        renderReader(); break;
      }
      case 'reader-prev': readerStep(-1); break;
      case 'reader-next': readerStep(1); break;
      case 'reader-toc': { const tc=$('#readerToc',readerEl); tc.classList.toggle('show'); break; }
      case 'reader-jump': {
        state.reader.vol=parseInt(t.dataset.v,10)||1;
        state.reader.ch=parseInt(t.dataset.c,10)||1;
        state.reader.tocVol=state.reader.vol;
        state.reader.chPct=0; state.reader.keepScroll=false;
        saveRead(); renderReader(); rebindReader(); break;
      }
      case 'reader-vol': { state.reader.tocVol=parseInt(t.dataset.v,10)||1; state.reader.keepScroll=true; renderReader(); rebindReader(); break; }
      case 'reader-view': state.reader.view=t.dataset.v; state.reader.keepScroll=true; renderReader(); rebindReader(); break;
      case 'reader-set': { const rs=$('#readerSet',readerEl); rs.classList.toggle('show'); break; }
      case 'rs-fs': { const d=parseInt(t.dataset.d,10); state.reader.settings.fs=Math.max(12,Math.min(28,state.reader.settings.fs+d)); state.reader.keepScroll=true; renderReader(); rebindReader(); break; }
      case 'rs-lh': { const d=parseFloat(t.dataset.d); state.reader.settings.lh=Math.max(1.4,Math.min(2.6,Math.round((state.reader.settings.lh+d)*10)/10)); state.reader.keepScroll=true; renderReader(); rebindReader(); break; }
      case 'rs-night': state.reader.settings.bg = state.reader.settings.bg==='night'?'follow':'night'; renderReader(); rebindReader(); break;
      case 'rs-bg': state.reader.settings.bg=state.reader.settings.bg==='follow'?'sepia':'follow'; renderReader(); rebindReader(); break;
      case 'res-dir': toast('更改资源目录（演示）'); break;
      case 'res-cache': toast('已清理刮削缓存 246 MB'); break;
      case 'dlfilter': state.dlFilter=t.dataset.f; renderView('download'); break;
      case 'dlpause': {
        const d=state.downloads.find(x=>x.work===t.dataset.id);
        if(d){ d.status='paused'; d.speed=''; }
        updateDlDot(); renderView('download'); break;
      }
      case 'dlresume': {
        const d=state.downloads.find(x=>x.work===t.dataset.id);
        if(d){ d.status='downloading'; d.speed='1.0 MB/s'; }
        updateDlDot(); renderView('download'); break;
      }
      case 'dlretry': {
        const d=state.downloads.find(x=>x.work===t.dataset.id);
        if(d){ d.status='downloading'; d.pct=1; d.speed='0.9 MB/s'; }
        updateDlDot(); renderView('download'); break;
      }
      case 'dl-alt': {
        const d=state.downloads.find(x=>x.work===t.dataset.id);
        if(d){ d.status='downloading'; d.pct=1; d.speed='2.4 MB/s'; }
        toast('已切换到镜像源 B'); updateDlDot(); renderView('download'); break;
      }
      case 'dl-remove': {
        const d0=state.downloads.find(x=>x.work===t.dataset.id);
        confirmBox('删除这条下载任务？', d0?`「${d0.name}」已下载的部分会一并删除。`:'该任务会从列表移除。','删除',()=>{
          state.downloads=state.downloads.filter(x=>x.work!==t.dataset.id);
          updateDlDot(); renderView('download'); toast('已删除任务');
        });
        break;
      }
      /* 下载行右上「⋯」：一行只留一个主操作，其余放这里 */
      case 'dl-menu': {
        const d=state.downloads.find(x=>x.work===t.dataset.id); if(!d) break;
        openMenu(t,[
          {k:'open', label:'打开文件', icon:'play', hide:d.status!=='done',
            run:()=>toast(d?`正在打开 ${d.name}（演示）`:'文件不存在')},
          {k:'alt', label:'换源重下', icon:'refresh', hide:d.status!=='failed',
            run:()=>{ d.status='downloading'; d.pct=1; d.speed='2.4 MB/s'; toast('已切换到镜像源 B'); updateDlDot(); renderView('download'); }},
          {k:'folder', label:'打开所在文件夹', icon:'folder', run:()=>toast('已在文件管理器中定位（演示）')},
          {sep:true},
          {k:'rm', label:'删除任务', icon:'trash', danger:true, run:()=>{
            confirmBox('删除这条下载任务？', `「${d.name}」已下载的部分会一并删除。`, '删除', ()=>{
              state.downloads=state.downloads.filter(x=>x.work!==d.work);
              updateDlDot(); renderView('download'); toast('已删除任务');
            });
          }},
        ]);
        break;
      }
      case 'dl-clear-done': {
        const n=state.downloads.filter(x=>x.status==='done').length;
        state.downloads=state.downloads.filter(x=>x.status!=='done');
        toast(`已清空 ${n} 条已完成任务`); updateDlDot(); renderView('download'); break;
      }

      /* ---------- 第二轮审查新增动作 ---------- */
      case 'load-more': {
        const key=t.dataset.key;
        state.listLim[key]=(state.listLim[key]||PAGE_SIZE)+PAGE_SIZE;
        renderView(view,id); break;
      }
      case 'open-disk': state.resPath=[]; navigate('disk'); break;
      case 'open-stats': navigate('stats'); break;

      /* 作品区：排序 / 筛选 / 显式管理入口 */
      case 'shelf-filter': state.shelfFilter=t.dataset.f; renderView('shelf'); break;
      case 'shelf-manage': enterManage(); break;
      /* 点卡片＝接着看：番=播放器、漫画/小说=阅读器、游戏=启动、音乐=播放这张专辑 */
      case 'shelf-open': {
        const w=getWork(t.dataset.id); if(!w) break;
        if(w.kind==='music') playAlbum(w.id, 0); else continueWork(w);
        break;
      }

      /* 卡片上的「⋯」：只放**这一部作品**的调整。
         不放「继续观看」（封面本身就是继续）、不放「管理作品区」（那是整页的动作，
         右键/长按已按你的要求删掉，整页管理走工具条上的「管理」按钮）。 */
      case 'more-menu': {
        const wid=t.dataset.id; const w=getWork(wid); if(!w) break;
        const items=[
          {k:'detail', label:'作品详情', icon:'bookOpen', run:()=>navigate('detail',{},wid)},
          {k:'wiki',   label:'百科', icon:'book', run:()=>navigate('wiki',{},wid)},
          {k:'dl',     label:'下载到本地', icon:'download', run:()=>{createDownload(w);}},
          {sep:true},
          {k:'remove', label:'移出作品区', icon:'trash', danger:true, run:()=>{
            confirmBox('移出作品区？', `《${w.name}》会从作品区移除，观看进度一并清空。`, '移出', ()=>{
              w.shelfStatus=false; w.progress=null; renderView('shelf'); toast('已移出作品区');
            });
          }},
        ];
        openMenu(t, items); break;
      }

      /* 典藏：管理 / 新建 / 移出 / 换封面 */
      case 'col-manage': state.colManage=true; state.colSel=[]; renderView('collection'); break;
      case 'col-done': state.colManage=false; state.colSel=[]; renderView('collection'); break;
      case 'col-pick': {
        const sid=t.dataset.id; const i=state.colSel.indexOf(sid);
        if(i>=0) state.colSel.splice(i,1); else state.colSel.push(sid);
        renderView('collection'); break;
      }
      case 'col-remove': {
        const n=state.colSel.length; if(!n) break;
        confirmBox('移出典藏？', `将从典藏里移除 ${n} 个系列（只影响这一页，不会删除作品）。`, '移出', ()=>{
          state.colHidden=state.colHidden.concat(state.colSel);
          state.customSeries=state.customSeries.filter(s=>!state.colSel.includes(s.id));
          setLocal('acgn-col-hidden', state.colHidden); setLocal('acgn-col-custom', state.customSeries);
          state.colSel=[]; state.colManage=false; renderView('collection'); toast(`已移出 ${n} 个系列`);
        });
        break;
      }
      /* 换封面在「管理」里：先勾中恰好一个系列，再点换封面（卡片上不再挂按钮） */
      case 'col-cover': {
        const sid=state.colSel[0];
        if(!sid){ toast('先勾选要换封面的那个系列'); break; }
        pickCover(sid); break;
      }
      case 'col-create': openCollectionPicker(); break;

      /* 浏览历史 */
      case 'hist-del': {
        state.hist=state.hist.filter(h=>h.id!==t.dataset.id);
        renderView('panel'); break;
      }
      case 'hist-clear': {
        confirmBox('清空浏览历史？','所有浏览记录会被删除，观看进度不受影响。','清空',()=>{
          state.hist=[]; renderView('panel'); toast('已清空浏览历史');
        });
        break;
      }

      /* 排行榜：更多榜单（按题材） */
      case 'rank-more': state.rankMode=state.rankMode==='topic'?'dim':'topic'; renderView('feature'); break;
      case 'rank-topic': state.rankMode='topic'; state.rankTopic=t.dataset.t; renderView('feature'); break;

      /* 时间表：开播提醒 */
      case 'sch-bell': {
        const id=t.dataset.id;
        state.schBell[id]=!state.schBell[id];
        toast(state.schBell[id]?'开播前 30 分钟提醒你':'已关闭提醒');
        renderView('feature'); break;
      }
      case 'upd-filter': state.updFilter=t.dataset.f; renderView('feature'); break;

      /* 资源管理：文件树 */
      case 'fs-enter': {
        state.resPath=state.resPath.concat(t.dataset.id); state.resQ=''; renderView('resources'); break;
      }
      case 'fs-go': {
        const i=parseInt(t.dataset.i,10);
        state.resPath = i<0 ? [] : state.resPath.slice(0,i+1);
        state.resQ=''; renderView('resources'); break;
      }
      case 'fs-sort': {
        const k=t.dataset.k;
        if(state.resSort===k) state.resAsc=!state.resAsc; else { state.resSort=k; state.resAsc=true; }
        renderView('resources'); break;
      }
      /* R41：根目录的「重新扫描」与未识别文件夹出口 */
      case 'fs-rescan': {
        confirmBox('重新扫描资源目录','会重新读取 D:/ACGN 下的文件夹结构，已识别的作品进度不受影响。',
          '开始扫描', ()=>toast('已开始扫描 D:/ACGN（演示）'));
        break;
      }
      case 'unm-pick': {
        const u=UNMATCHED_DIRS[parseInt(t.dataset.i,10)];
        openMenu(t,[
          { label:'指定为某部作品', onClick:()=>toast(`已把「${u.name}」关联到指定作品（演示）`) },
          { label:'指定为某个分类', onClick:()=>toast(`已把「${u.name}」归入所选分类（演示）`) },
          { label:'按命名规则重新识别', onClick:()=>toast('正在重新解析命名（演示）') },
        ]);
        break;
      }
      case 'unm-ignore': {
        const i=parseInt(t.dataset.i,10), u=UNMATCHED_DIRS[i];
        confirmBox('忽略这个文件夹？',`「${u.name}」会从列表里隐藏，文件夹本身不会被删除，下次扫描仍可重新识别。`,'忽略',()=>{
          UNMATCHED_DIRS.splice(i,1); renderView('resources'); toast('已忽略');
        });
        break;
      }

      /* 下载：已完成 → 打开文件 */
      case 'dl-open': {
        const d=state.downloads.find(x=>x.work===t.dataset.id);
        toast(d?`正在打开 ${d.name}（演示）`:'文件不存在'); break;
      }

      /* 播放器：设置面板 / 选集面板 / 弹幕 / 窄屏「更多」 */
      case 'player-set': state.player.showSet=!state.player.showSet; state.player.showEp=false; state.player.showMore=false; renderPlayer(); break;
      case 'player-ep-toggle': state.player.showEp=!state.player.showEp; state.player.showSet=false; state.player.showMore=false; renderPlayer(); break;
      case 'player-more': state.player.showMore=!state.player.showMore; state.player.showEp=false; state.player.showSet=false; renderPlayer(); break;
      /* 面板里的一次性选择（清晰度 / 字幕 / 倍速），比原来「点一下换下一个」一目了然 */
      case 'pv': {
        const k=t.dataset.k, v=t.dataset.v;
        if(k==='quality'||k==='sub'||k==='speed') state.player[k]=v;
        renderPlayer(); break;
      }
      case 'player-autonext': state.player.autoNext=!state.player.autoNext; renderPlayer(); break;
      case 'player-proto': toast((t.dataset.label||'该功能')+'：原型未实现'); break;
      case 'dm-op': state.player.dmOpacity=parseInt(t.dataset.v,10); renderPlayer(); break;
      case 'dm-size': state.player.dmSize=t.dataset.v; renderPlayer(); break;
      case 'dm-send': {
        const inp=$('#dmInput');
        const v=(inp&&inp.value||'').trim();
        if(!v){ toast('先写点什么再发'); break; }
        state.player.dmText='';
        toast('弹幕已发送（演示）');
        renderPlayer();
        break;
      }

      /* 阅读器：工具栏 / 排版 */
      case 'reader-tool': {
        const k=t.dataset.k;
        if(k==='toc'){ $('#readerToc',readerEl).classList.toggle('show'); break; }
        if(k==='mark'){
          state.reader.bookmarks=!state.reader.bookmarks;
          toast(state.reader.bookmarks?'已在本章加书签':'已取消本章书签');
          renderReader(); rebindReader(); break;
        }
        if(k==='auto'){
          state.reader.autoScroll=!state.reader.autoScroll;
          toast(state.reader.autoScroll?'自动滚动已开启（演示）':'已关闭自动滚动');
          renderReader(); rebindReader(); break;
        }
        toast({note:'笔记',find:'全文搜索',tts:'朗读'}[k]+'：原型未实现'); break;
      }
      case 'rs-lh2': state.reader.settings.lh=parseFloat(t.dataset.v); state.reader.keepScroll=true; renderReader(); rebindReader(); break;
      case 'rs-font': state.reader.settings.font=t.dataset.v; state.reader.keepScroll=true; renderReader(); rebindReader(); break;
      case 'rs-width': state.reader.settings.width=parseInt(t.dataset.v,10); state.reader.keepScroll=true; renderReader(); rebindReader(); break;
      case 'rs-bg2': state.reader.settings.bg=t.dataset.v; state.reader.keepScroll=true; renderReader(); rebindReader(); break;

    }
  });

  /* ---------------- 播放器：音量滑块 + 键盘快捷键 ----------------
     空格 播放/暂停 · ← → 跳转 · ↑ ↓ 音量 · N 下一集 · Esc 退出 */
  document.addEventListener('input', e=>{
    const el=e.target;
    /* 资源管理搜索：只重绘列表不重绘整页（键盘每敲一下就跳一次布局很难用） */
    if(el.id==='fsSearch'){
      clearTimeout(el._t);
      el._t=setTimeout(()=>{
        state.resQ=el.value.trim();
        renderView('resources');
        const again=document.getElementById('fsSearch');
        if(again){ again.focus(); again.setSelectionRange(again.value.length,again.value.length); }
      },160);
      return;
    }
    if(!el.classList || !el.classList.contains('vol-range')) return;
    const p=state.player; if(!p) return;
    p.vol=Math.max(0,Math.min(100,parseInt(el.value,10)||0));
    p.mute = p.vol===0;
    const btn=el.parentElement.querySelector('.pc-ico');
    if(btn) btn.style.opacity = p.mute?'0.35':'1';
  });

  /* 下拉选择（设置项 / 作品区排序）：change 事件不会冒泡到 click 的委托里，单独接一层 */
  document.addEventListener('change', e=>{
    const sel=e.target;
    if(sel.dataset && sel.dataset.action==='shelf-sort'){
      state.shelfSort=sel.value; renderView('shelf'); return;
    }
    if(sel.dataset && sel.dataset.selKey){
      const k=sel.dataset.selKey;
      state.toggles[k]=parseInt(sel.value,10)||0;
      if(state.pageKind==='settings' || parseHash().view==='settings'){ renderView('settings'); }
      else if(parseHash().view==='panel'){ renderView('panel'); }
      return;
    }
  });

  document.addEventListener('keydown', e=>{
    const p=state.player;
    if(!p || !playerEl.classList.contains('show')) return;
    const tag=(e.target.tagName||'').toLowerCase();
    if(tag==='input'||tag==='textarea') return;
    const seek=d=>{ p.pos=Math.min(99,Math.max(0,p.pos+d)); state.playPos[p.workId]=p.pos; renderPlayer(); };
    const vol=d=>{ p.vol=Math.min(100,Math.max(0,p.vol+d)); p.mute=p.vol===0; renderPlayer(); };
    if(e.key===' '||e.key==='k'||e.key==='K'){ e.preventDefault(); p.playing=!p.playing; renderPlayer(); return; }
    if(e.key==='ArrowLeft'){ e.preventDefault(); seek(-1); return; }
    if(e.key==='ArrowRight'){ e.preventDefault(); seek(1); return; }
    if(e.key==='ArrowUp'){ e.preventDefault(); vol(5); return; }
    if(e.key==='ArrowDown'){ e.preventDefault(); vol(-5); return; }
    if(e.key==='Escape'){ exitPlayer(); return; }
    if(e.key==='n'||e.key==='N'){
      if(p.epIndex<p.w.episodes.length-1){ p.epIndex++; p.ep=p.w.episodes[p.epIndex]; p.pos=0; p.resumed=false; renderPlayer(); }
    }
  });

  /* ---------------- 轻提示 ---------------- */
  let toastTimer;
  function toast(msg){
    let el=document.getElementById('toast');
    if(!el){ el=document.createElement('div'); el.id='toast';
      el.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:var(--sel);color:var(--selText);padding:10px 18px;border-radius:999px;font-size:13px;z-index:200;box-shadow:0 8px 22px rgba(0,0,0,.3);transition:opacity .2s;';
      document.body.appendChild(el); }
    el.textContent=msg; el.style.opacity='1';
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ el.style.opacity='0'; },1600);
  }

  /* ---------------- 路由驱动 ---------------- */
  function route(force){
    const {view,id,q}=parseHash();
    /* 指纹相同＝同一次跳转的第二次触发，直接跳过。重绘会让 data-anim 重来一遍，
       而入场的淡入被强行重播时看起来就是"闪一下"。 */
    const sig=sigOf(view,id,q);
    if(!force && sig===state.lastSig) return;
    state.lastSig=sig;
    /* 分区只有一个来源：p。sp 只是历史链接的别名——之前作品区用 sp、聚合页用 p，
       于是 #/shelf?p=game 会静默显示动漫。 */
    const prevP=state.partition;
    if(q.p){ state.partition=q.p; state.shelfPartition=q.p; }
    /* 续播按钮的隐藏只在当前这一次首页访问里有效：换分区或离开首页就恢复 */
    if(state.partition!==prevP || view!=='aggregate') state.resumeOff=false;
    if(q.sp) state.shelfPartition=q.sp;
    if(q.c!==undefined) state.aggCat=q.c||null;
    if(q.tag!==undefined) state.catTag=q.tag||null;
    if(q.k) state.pageKind=q.k;
    /* 歌手页只可能属于音乐分区：直接地址进来时也要落对分区，否则返回文案写成「返回首页 · 动漫」 */
    if(q.a!==undefined){ state.artistName=q.a||null; if(q.a) state.partition='music'; }
    if(q.t) state.pageTitle=q.t;
    /* 可寻址的状态：搜索结果、播放器、阅读器都有自己的地址，刷新/分享/后退都拿得到。
       以前这三个都只有内存状态，`#/player/aot` 直接被判 404。 */
    if(view==='search'){
      state.search = q.q || '';
      if(q.scope) state.searchScope = q.scope;
      const si=$('#searchInput'); if(si && si.value!==state.search) si.value=state.search;
    }
    state.pendingAnim = animFor(view, id, q, sig);
    state.navFrom = {view, id, p:q.p||'', sig};
    renderShellRows();
    renderView(view, id);
    /* 覆盖层跟着地址走：进 player/reader 地址就打开，地址换了就收起 */
    if(view==='player'||view==='reader') openByRoute(view, id, q);
    else { closeOverlays(); }
  }
  function closeOverlays(){
    if(state.player) closePlayer();
    if(state.reader) closeReader();
  }
  function openByRoute(view, id, q){
    const w=getWork(id); if(!w) return;
    if(view==='player'){
      const ep=Math.max(0,(parseInt(q.ep,10)||1)-1);
      if(!state.player || state.player.workId!==w.id) openPlayer(w.id, ep);
      else { playerEl.classList.add('show'); }
    } else {
      const vol=parseInt(q.vol,10)||undefined, ch=parseInt(q.ch,10)||undefined;
      if(!state.reader || state.reader.workId!==w.id) openReader(w.id, ch, vol);
      else { readerEl.classList.add('show'); }
    }
  }
  /* 覆盖层打开时把地址换掉，但不触发路由（replaceState 不派发 hashchange）。
     用 replace 而不是 push：播放器是详情页的一层皮，不该在后退里多出一层。 */
  function overlayHash(h){ try{ history.replaceState(null,'',h); }catch(e){} }
  function sigOf(view,id,q){
    return [view,id||'',q.p||'',q.k||'',q.c||'',q.tag||'',q.a||'',q.sp||''].join('|');
  }
  /* 退出播放器 / 阅读器时落在作品详情页——这就是它的「上一级」。
     · 本来就压着详情页（地址是 #/player/…）→ 把地址换回详情页，不新增历史；
     · 从作品区等地方点开的 → 正常跳详情页，于是"返回"能回到作品区。 */
  function landOnDetail(wid){
    if(!wid) return;
    const h=parseHash();
    if(h.view==='detail' && h.id===wid) return;
    if(h.view==='player'||h.view==='reader'){
      overlayHash('#/detail/'+wid);
      state.lastSig=sigOf('detail',wid,{});
      state.curView='detail'; state.curKey='detail|'+wid+'|';
      renderView('detail', wid);
      renderShellRows();
      return;
    }
    navigate('detail',{},wid);
  }

  /* ---------------- 启动 ---------------- */
  buildShell();
  window.addEventListener('hashchange', function(){ route(); });
  route();

})();
