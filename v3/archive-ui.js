import {songState,fieldState} from './ui/mastery.js';
import { emptyMemory, migrate, record, groups, status, KEYS } from './memory.js';
import { appearancesFor } from './track-model.js';
export function createArchive({ catalog, readLegacy, getState, onYearStart, onImport, canWrite=()=>true, writable = true, describe = {} }) {
  const emit=(name,detail={})=>window.dispatchEvent(new CustomEvent('museum:'+name,{detail}));
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titleFor = t => t.song + (t.versionLabel ? '（' + t.versionLabel + '）' : '');
  const storage = 'fat-fish-music-memory-v2';
  let memory, lastMemoryRaw, round = new Set(), highlight = null, filter = {}, tab = 'round', playable = false, dirty = false, recovery = false;
  // Failure to take a backup must never cause valid existing memory to be replaced.
  try {
    const old = readLegacy();
    lastMemoryRaw=localStorage.getItem(storage);
    memory = migrate(JSON.parse(lastMemoryRaw || 'null'), [...(old.history || []), ...(old.masteryHistory || [])], catalog.tracks);
  } catch { memory = emptyMemory(); dirty = true; recovery = true; try { const raw=localStorage.getItem(storage); if(raw)localStorage.setItem('fat-fish-music-unreadable-v2',raw); } catch { writable=false; } }
  try { if (!localStorage.getItem('fat-fish-music-pre-v2')) localStorage.setItem('fat-fish-music-pre-v2', JSON.stringify(readLegacy())); } catch { dirty = true; }
  round = new Set(memory.roundIds || []);
  const locked = () => { const s = getState(); return !!s.externalPending || !!(s.question && !s.result); };
  function save(changedEvent = '', changedAnchor = null) {
    memory.roundIds = [...round];
    if(!canWrite()){if($('memorySave'))$('memorySave').textContent='训练在另一个窗口进行，本窗口保留只读档案。';return;}
    try {
      if(!writable)throw Error('preserve unreadable original');
      const latestRaw=localStorage.getItem(storage);
      // Storage events can still be queued when a user clicks. Preserve a newer archive even before that event arrives;
      // only the attempt or anchor explicitly edited by this action takes precedence over its stored counterpart.
      if(latestRaw!==lastMemoryRaw){
        const latest=JSON.parse(latestRaw||'null');
        if(latest?.version===2){
          const events={...memory.events,...latest.events},anchors={...memory.anchors,...latest.anchors};
          if(changedEvent&&memory.events[changedEvent])events[changedEvent]=memory.events[changedEvent];
          if(changedAnchor!==null){delete anchors[changedAnchor];if(memory.anchors[changedAnchor])anchors[changedAnchor]=memory.anchors[changedAnchor];}
          memory=migrate({...memory,events,anchors},[],catalog.tracks);
        }
      }
      const raw=JSON.stringify(memory);localStorage.setItem(storage,raw);lastMemoryRaw=raw;dirty=false;
    } catch { dirty = true; }
    if ($('memorySave')) $('memorySave').textContent = dirty ? '尚未保存到设备，请保留页面，稍后重试或导出备份。' : recovery?'旧档案读取失败，原始内容已保留备份；本轮记录保存在当前浏览器。':'已保存在当前浏览器 · 可导出备份';
  }
  function insights(entries) {
    const box = $('memoryInsights'); if (!box) return;
    if (locked()) { box.innerHTML = ''; return; }
    const events = entries || Object.values(memory.events);
    const confusions = {};
    for (const event of events) for (const f of event.fields || []) {
      if (f.key === 'year' && !f.isCorrect && /^\d{4}$/.test(String(f.chosen)) && /^\d{4}$/.test(String(f.correct))) {
        const k = f.correct + ' → ' + f.chosen; confusions[k] = (confusions[k] || 0) + 1;
      }
    }
    box.innerHTML = '<h3>四条线索，分别看清。</h3><div class="insights-grid">' + KEYS.map((key, i) => {
      const tested = events.flatMap(e => (e.fields || []).filter(f => f.key === key).map(f => ({...f, id:e.id})));
      const weakIds = [...new Set(tested.filter(f => !f.isCorrect).map(f => f.id))];
      const correct = tested.filter(f => f.isCorrect).length;
      const weak = weakIds.map(id => catalog.tracks.find(t => t.id === id)).filter(Boolean);
      return '<div class="insight-row"><span class="eyebrow">0' + (i + 1) + '</span><strong>' + ['歌曲名称','年份记忆','音乐家','风格'][i] + '</strong><p>' + (tested.length ? correct + ' / ' + tested.length + ' 项正确' : '本轮未测试') + '</p><p>' + (weak.length ? '优先复习：' + weak.slice(0, 5).map(t => esc(key === 'year' ? t.year + ' · ' + titleFor(t) : titleFor(t))).join('；') : tested.length ? '本轮表现良好，再隔一段时间回忆一次。' : '未作答的维度不会计入掌握度。') + '</p></div>';
    }).join('') + '</div><h4>年份混淆 · 正确年份 → 作答年份</h4><p>' + (Object.entries(confusions).sort((a,b) => b[1] - a[1]).slice(0,6).map(([k,n]) => esc(k) + '：' + n + ' 次').join('；') || '本轮暂无可辨识的年份误选。') + '</p><p class="analysis-note">长期状态需要足够样本：少于4次为数据不足；至少8次、正确率≥85%且最近3次正确，才标记稳定掌握。</p>';
  }
  function populateFilters() {
    const learned = catalog.tracks.filter(t => memory.records[t.id]);
    const make = (id, label, values, display = x => x) => {
      const selected = $(id).value || '';
      $(id).innerHTML = '<option value="">' + label + '</option>' + values.map(v => '<option value="' + esc(v) + '">' + esc(display(v)) + '</option>').join('');
      $(id).value = values.some(v => String(v) === selected) ? selected : '';
    };
    make('archiveYear', '全部年份', [...new Set(learned.map(t => t.year).filter(Number.isInteger))].sort((a,b) => a-b));
    make('archiveArtist', '全部音乐家', [...new Set(learned.map(t => t.artist))].sort());
    make('archiveStyle', '全部风格', [...new Set(learned.map(t => t.style))].sort(), id => catalog.styles.find(s => s.id === id)?.label || id);
  }
  const WEAK=['明显薄弱','仍需加强'];
  const statusFilters={collected:r=>!!r,uncollected:r=>!r,weak:r=>!!r&&Object.values(r.fields).some(f=>WEAK.includes(status(f))),yearWeak:r=>!!r&&WEAK.includes(status(r.fields.year))};
  // Everything the library page used to search: names in every language, year, version, aliases and the style's three names.
  const searchable=new Map();
  const haystack=t=>{
    if(!searchable.has(t.id)){const s=catalog.styles.find(x=>x.id===t.style);searchable.set(t.id,[t.artist,t.artistKo,t.song,t.songKo,t.year,t.versionLabel||'',t.sourceType==='video'?'视频音轨':'',s?.label,s?.ko,s?.sub,...(t.aliases||[])].join(' ').toLocaleLowerCase());}
    return searchable.get(t.id);
  };
  function passes(t,f){
    const r=memory.records[t.id],q=String(f.query||'').trim().toLocaleLowerCase();
    if(q&&!haystack(t).includes(q))return false;
    if(f.lecture!=null&&!appearancesFor(t).some(a=>a.deck===f.lecture))return false;
    if(f.styles?.size&&!f.styles.has(t.style))return false;
    if(f.status&&!statusFilters[f.status]?.(r))return false;
    if(f.year&&String(t.year)!==f.year)return false;
    if(f.artist&&t.artist!==f.artist)return false;
    if(f.style&&t.style!==f.style)return false;
    if(f.weak&&!statusFilters.weak(r))return false;
    if(f.yearWeak&&!statusFilters.yearWeak(r))return false;
    return true;
  }
  // The wall is every song in the course, whatever the home page has selected for practice.
  const matching=(patch={})=>catalog.tracks.filter(t=>passes(t,{...filter,...patch}));
  const hasFilter=()=>!!(String(filter.query||'').trim()||filter.lecture!=null||filter.styles?.size||filter.status||filter.year||filter.artist||filter.style||filter.weak||filter.yearWeak);
  const langOf=text=>/[가-힣]/.test(text)?'ko':'en';
  function courseNote(t,r){
    const style=catalog.styles.find(s=>s.id===t.style),src=describe.sourceText?.(t)||'',links=describe.sourceLinks?.(t)||'',len=describe.timeText?.(t.duration)||'';
    const line=[src,len,t.sourceType==='video'?'视频音轨':'',t.audioEdit?'已剪辑音乐段':'','音乐家角色：'+t.artistRole].filter(Boolean).join(' · ');
    return '<div class="md-body"><p class="md-ko"><span lang="ko">'+esc(t.songKo)+'</span><br><span lang="ko">'+esc(t.artistKo)+'</span></p>'
      +(t.discrepancy?'<p class="md-flag">音频标签差异：'+esc(t.discrepancy)+'</p>':'')
      +(describe.course7?.(t)||'')
      +albumLine(t)
      +'<p class="md-basis">年份口径：'+esc(t.yearBasis)+'</p>'
      +(style?'<p class="md-basis">风格：<span lang="en">'+esc(style.label)+'</span> · '+esc(style.sub)+(t.styleBasis?' · '+esc(t.styleBasis):'')+'</p>':'')
      +'<p class="md-note">'+esc(t.note)+'</p>'
      +'<p class="md-source">'+esc(line)+'</p>'
      +(t.aliases?.length?'<p class="md-source">别名：'+t.aliases.map(a=>'<span lang="'+langOf(a)+'">'+esc(a)+'</span>').join('、')+'</p>':'')
      +(links?'<div class="source-links">'+links+'</div>':'')
      +(r?'<div class="memory-dimensions">'+KEYS.map((k,i)=>'<span>'+['歌名','年份','音乐家','风格'][i]+' · <b>'+status(r.fields[k])+'</b><small>'+(r.fields[k]?.c||0)+'/'+(r.fields[k]?.n||0)+' 次正确 · 近况 '+((r.fields[k]?.recent||[]).slice(-4).map(v=>v?'✓':'×').join(' ')||'暂无')+'</small></span>').join('')+'</div>':'')
      +'</div>';
  }
  // One cover rule for the whole archive: a verified album sleeve when the album holds this recording, otherwise the shared placeholder
  // (the song's own sound rings on a paper sleeve, marked 封面待补). Another version of the song is labelled as such.
  // The 19 tag disagreements were accepted as course-correct. Hide only their retired warnings;
  // keep source/licensing uncertainty and real differences between the pictured record and the course recording.
  function coverNote(value) {
    return [
      '此曲音频在 19 段待核验名单中，', '此曲音频在 19 段待核验名单中。', '此曲音频在待核验名单中。',
      '音频内嵌标签与课件不一致（待核验）；', '音频内嵌标签写的是另一首歌（待核验）；', '；此曲音频也在待核验名单中'
    ].reduce((text,obsolete)=>text.replace(obsolete,''),String(value||'')).trim();
  }
  function albumLine(t){
    const c=describe.cover?.(t),m=describe.missing?.(t),note=coverNote(c?.note);
    if(!c) return '<p class="md-basis">唱片图像：暂缺'+(m?'。'+esc(coverNote(m.searched)):'')+'</p>';
    const K=describe.kinds||{},R=describe.relations||{},carrier=[c.label,c.catalog].filter(Boolean).join(' ');
    const years=[c.recorded?'录音 '+c.recorded:'',c.released?'发行 '+c.released:'','课程按 '+c.courseYear].filter(Boolean).join(' · ');
    return '<div class="md-basis md-cover"><p><b>'+esc(K[c.kind]||'唱片图像')+'</b> · <span lang="'+langOf(c.album)+'">《'+esc(c.album)+'》</span>'+(carrier?' · '+esc(carrier):'')+'</p>'
      +'<p>'+esc(years)+'</p><p>与课程音频：'+esc(R[c.relation]||'')+(c.match==='version'?'（同曲的另一次录音）':c.match==='context'?'（不代表这一录音本身）':'')+'</p>'
      +(note?'<p>'+esc(note)+'</p>':'')+'<p class="md-src">核对：'+esc(c.verified||'—')+' · <a href="'+esc(c.source)+'" target="_blank" rel="noopener">出处</a> · '+esc(c.license)+'</p></div>';
  }
  // Each image keeps its own shape: labels sit on a record, sleeves and albums fill the square with a record behind them,
  // sheet music, photos, devices and adverts are mounted whole on paper so no catalogue number or caption is cut off.
  function sleeve(t,canvas){
    const c=describe.cover?.(t);
    if(!c) return '<span class="sleeve todo">'+canvas+'<i class="tag">图像待补</i></span>';
    const K=describe.kinds||{},doc=c.shape==='portrait'||c.shape==='landscape',tag=c.match==='version'?'其他版本':c.match==='context'?(K[c.kind]||''):c.kind==='compilation'?'再版合辑':'';
    return '<span class="sleeve art" data-shape="'+esc(c.shape)+'" data-kind="'+esc(c.kind)+'">'+(doc?'':'<span class="disc" aria-hidden="true"></span>')+'<img src="'+esc(c.img)+'" alt="'+esc(K[c.kind]||'唱片图像')+'：《'+esc(c.album)+'》" width="'+c.w+'" height="'+c.h+'" loading="lazy" decoding="async">'+(tag?'<i class="tag">'+esc(tag)+'</i>':'')+'</span>';
  }
  function card(t,opened){
    const r=memory.records[t.id],style=catalog.styles.find(s=>s.id===t.style),year=t.year,lecture=appearancesFor(t)[0]?.deck,canvas='<canvas class="cover" data-track="'+esc(t.id)+'"></canvas>';
    const cells=KEYS.map(k=>'<i class="'+fieldState(r?.fields?.[k])+'"></i>').join(''),label=r?KEYS.map((k,i)=>['歌名','年份','音乐家','风格'][i]+status(r.fields[k])).join('，'):'未入藏';
    return '<article class="archive-song '+(highlight===t.id?'new-record':'')+'" data-track="'+esc(t.id)+'" data-state="'+songState(r)+'"><div class="top"><span class="meta"><span class="lec" data-lecture="'+lecture+'"></span>'+esc(t.id.toUpperCase())+' · 第 '+appearancesFor(t).map(a=>a.deck).join('、')+' 讲</span><span class="m4" role="img" aria-label="'+label+'">'+cells+'</span></div><h3 lang="'+langOf(t.song)+'">'+esc(t.song)+'</h3><p class="ar" lang="'+langOf(t.artist)+'">'+esc(t.artist||'音乐家未注明')+'</p>'+(t.versionLabel?'<p class="ver">'+esc(t.versionLabel)+'</p>':'')+(t.uncertainAudio?'<small class="flag">△ 音频版本待核实 · 按课程资料归档</small>':'')+'<div class="foot"><div><b class="yr">'+year+'</b><span class="st">'+esc(style?.label||t.style)+'</span></div>'+(playable?'<button class="cover-play listen-button" type="button" data-listen="'+esc(t.id)+'" data-song="'+esc(t.song)+'" aria-label="播放 '+esc(t.song)+'">'+sleeve(t,canvas)+'</button>':sleeve(t,canvas))+'</div><div class="c-foot"><details class="memory-detail"'+(opened.has(t.id)?' open':'')+'><summary>课件说明</summary>'+courseNote(t,r)+'</details>'+(r?'<button type="button" data-anchor="'+esc(t.id)+'" aria-pressed="'+(memory.anchors[year]===t.id)+'">'+(memory.anchors[year]===t.id?'★ 年份锚点 · 点击取消':'☆ 设为年份锚点')+'</button>':'')+'</div></article>';
  }
  const decadeOf=year=>Math.floor(Number(year)/10)*10;
  const protectedOptions=new Map();
  // Every room change re-runs wall() (the scope switches between this round and all). When the markup is identical the
  // 4000-node wall is left as it is: rebuilding it each time only made garbage and long pauses during room transitions.
  let lastWall=null;
  function wall(reason) {
    // 年份卡片 (training sheet): while a question is open, this round's answered songs can still be shown, since none of
    // them can be the current one (a round never repeats a song). The cumulative tab, the filters and the chips stay closed.
    const roundOnly = locked() && !getState().externalPending && tab === 'round' && document.body.dataset.room === 'train';
    const protection = locked() && !roundOnly, count = Object.keys(memory.records).length;
    $('archiveSearch').disabled=protection;
    $('memoryImport').disabled = protection; $('memoryExport').disabled = protection; 
    if ($('archiveRecallButton')) $('archiveRecallButton').disabled = protection || !count;
    if ($('homeArchiveCount')) $('homeArchiveCount').textContent = protection ? '当前题目提交后开放图鉴' : '已收录 ' + count + ' 首课程曲目 →';
    const box = $('archiveContent');
    if (protection) {
      $('archiveCount').textContent = '答题保护中'; $('archiveFilters').hidden = true;
      box.innerHTML = '<div class="archive-lock"><strong>先回忆，再打开档案。</strong><p>当前答案尚未揭示，图鉴和搜索暂时关闭。</p></div>'; lastWall=null;
      $('memoryInsights').innerHTML = '';
      // The band and the chips name decades, styles and lectures: they leave the DOM with the wall, not just the view.
      for(const id of ['statusChips','lectureChips','styleChips','decadeNav'])$(id)?.replaceChildren();
      if($('bandSub'))$('bandSub').textContent='';
      for(const id of ['archiveYear','archiveArtist','archiveStyle']) {const el=$(id);if(!protectedOptions.has(id)){protectedOptions.set(id,{nodes:[...el.childNodes],value:el.value});el.replaceChildren();}}
      emit('wall');
      return;
    }
    if (roundOnly) { $('archiveFilters').hidden = true; for(const id of ['statusChips','lectureChips','styleChips'])$(id)?.replaceChildren(); }
    else {
    for(const [id,saved] of protectedOptions){$(id).replaceChildren(...saved.nodes);$(id).value=saved.value;}
    protectedOptions.clear();
    $('archiveFilters').hidden = false;
    populateFilters();
    }
    $('archiveTabs').querySelectorAll?.('[data-archive-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.archiveTab === tab)));
    $('archiveSearch').placeholder=tab==='all'?'搜索曲名、音乐家、年份、风格或韩文':'搜索曲名、音乐家、风格';
    const opened=new Set([...box.querySelectorAll('details[open]')].map(d=>d.closest('[data-track]')?.dataset.track));
    const byDecade=new Map();
    const place=(decade,tracks)=>{if(!byDecade.has(decade))byDecade.set(decade,[]);byDecade.get(decade).push(...tracks);};
    if(tab==='all'){
      const list=matching().sort((a,b)=>a.year-b.year);
      $('archiveCount').textContent='累计收录 '+count+' 首 · '+new Set(list.map(t=>t.year)).size+' 个年份';
      for(const t of list)place(decadeOf(t.year),[t]);
    } else {
      const f = roundOnly ? {} : filter;
      f.styleNames = Object.fromEntries(catalog.styles.map(s => [s.id, [s.label, s.sub, s.ko]]));
      const gs = groups(memory, catalog.tracks, round, f);
      $('archiveCount').textContent = '本轮收录 ' + round.size + ' 首 · ' + gs.length + ' 个年份';
      for(const [year,tracks] of gs)place(decadeOf(year),tracks);
    }
    const filtered=tab==='all'&&hasFilter();
    const note=tab==='all'&&!count?'<p class="wall-note"><span>灰色的都还没听过。点封面可以先听，听辨答过一次就收进图鉴、变成彩色。</span><button class="link" type="button" data-start>开始听辨 →</button></p>':'';
    const html=note+(byDecade.size?[...byDecade].sort((a,b)=>a[0]-b[0]).map(([decade,tracks])=>{
      const all=catalog.tracks.filter(t=>decadeOf(t.year)===decade),collected=all.filter(t=>memory.records[t.id]).length;
      return '<section class="decade year-column" data-decade="'+decade+'" id="d'+decade+'"><div class="d-head"><h2>'+decade+'s</h2><span class="cnt">'+(filtered?'匹配 '+tracks.length+' 首 · ':'')+'已入藏 '+collected+' / '+all.length+'</span></div><div class="cards">'+tracks.map(t=>card(t,opened)).join('')+'</div></section>';
    }).join(''):tab==='all'?'<div class="archive-empty no-match"><h3>没有匹配的曲目</h3><button class="btn sec" type="button" data-clear-filters>清除筛选</button></div>':'<div class="archive-empty"><span>♫</span><h3>'+(count?'没有匹配当前筛选的歌曲。':'档案正在等待第一段旋律。')+'</h3><p>'+(count?'试试调整筛选；样本不足的歌曲暂不会标记为薄弱。':'完成听辨后，这里会自动收录你的第一首歌曲。')+'</p></div>');
    if(html!==lastWall||!box.firstChild){box.innerHTML=html;lastWall=html;}
    emit('wall',{reason});
  }
  function sync() { wall(); if(document.body.dataset.room!=='archive')$('archivePanel').open = false; $('archiveSearch').disabled = locked(); }
  function add(entry) {
    const isNew=!memory.records[entry.id];
    if (!record(memory, entry, catalog.tracks, entry.eventId)) return;
    if(isNew)emit('collect',{id:entry.id,isNew});
    round.add(entry.id); highlight = entry.id; save(entry.eventId); wall();
  }
  function reset(id = '') { round = new Set(); memory.roundId = id; highlight = null; save(); sync(); }
  function reload(strict=false) {
    let stored;
    try { lastMemoryRaw=localStorage.getItem(storage);stored=JSON.parse(lastMemoryRaw||'null'); } catch(error) { if(strict)throw error; }
    const old=readLegacy();
    const combined=stored?.version===2 ? {...memory,...stored,events:{...memory.events,...stored.events}} : memory;
    memory=migrate(combined,[...(old.history||[]),...(old.masteryHistory||[])],catalog.tracks);
    round=new Set(memory.roundIds||[]);highlight=null;sync();
  }
  let composing=false,searchTimer;
  function resetFilter() { clearTimeout(searchTimer); filter = {}; for(const el of ['archiveSearch','archiveYear','archiveArtist','archiveStyle']) $(el).value = ''; $('archiveWeak').checked = $('archiveYearWeak').checked = false; }
  function setRound(ids, id = '') { round = new Set(ids.filter(trackId => memory.records[trackId])); memory.roundId = id; resetFilter(); save(); }
  // Only the archive room's own wall can start a song. A round view or a tab switched inside training must not touch practice audio.
  function scope(next) { tab = next; playable = next === 'all'; resetFilter(); wall(); }
  function setFilter(patch) { if (locked()) return; Object.assign(filter, patch); wall('filter'); }
  function clearFilters() { if (locked()) return; resetFilter(); wall('filter'); }
  function related(track) {
    // Only filter the presentation: keep the learning queue and archive intact.
    const remaining = new Set(getState().queueRemainingIds || []);
    const anchor = catalog.tracks.find(t => t.id === memory.anchors[track.year] && !remaining.has(t.id));
    const sameYear = catalog.tracks.filter(t => t.year === track.year && memory.records[t.id] && t.id !== track.id && !remaining.has(t.id));
    return (anchor ? '<p class="year-anchor">★ ' + track.year + ' 年锚点：' + esc(titleFor(anchor)) + ' · ' + esc(anchor.artist) + '</p>' : '') + (sameYear.length ? '<p class="year-related">同年已收录：' + sameYear.map(t => esc(titleFor(t))).join('、') + '</p>' : '');
  }
  $('archiveTabs').onclick = e => { const b = e.target.closest('[data-archive-tab]'); if (b && !locked()) { tab = b.dataset.archiveTab; playable = false; wall(); } };
  // Typing Korean or pinyin composes first: search only after the word lands, and let fast typing settle.
  const runSearch=()=>{if(!locked()){filter.query=$('archiveSearch').value;wall('filter');}};
  const scheduleSearch=()=>{clearTimeout(searchTimer);if(!composing)searchTimer=setTimeout(runSearch,120);};
  $('archiveSearch').addEventListener('compositionstart',()=>{composing=true;clearTimeout(searchTimer);});
  $('archiveSearch').addEventListener('compositionend',()=>{composing=false;scheduleSearch();});
  $('archiveSearch').addEventListener('input',scheduleSearch);
  for (const [id,key] of [['archiveYear','year'],['archiveArtist','artist'],['archiveStyle','style']]) $(id).oninput = e => { if (!locked()) { filter[key] = e.target.value; wall(); } };
  for (const [id,key] of [['archiveWeak','weak'],['archiveYearWeak','yearWeak']]) $(id).onchange = e => { if (!locked()) { filter[key] = e.target.checked; wall(); } };
  $('archiveContent').onclick = e => {
    if (e.target.closest('[data-clear-filters]')) { clearFilters(); return; }
    if (e.target.closest('[data-start]')) { if (!locked()) $('startButton').click(); return; }
    const b = e.target.closest('[data-anchor]'); if (!b || locked()) return;
    const t = catalog.tracks.find(t => t.id === b.dataset.anchor); if (!t || !Number.isInteger(t.year) || !memory.records[t.id]) return;
    if (memory.anchors[t.year] === t.id) delete memory.anchors[t.year]; else memory.anchors[t.year] = t.id;
    save('',t.year); wall();
    $('archiveContent').querySelector('[data-anchor="'+t.id+'"]')?.focus({ preventScroll: true });
  };
  $('archivePanel').ontoggle = () => {
    if (document.body.dataset.room==='archive' && $('archivePanel').open && !locked() && highlight) $('archiveContent').querySelector?.('[data-track="' + highlight + '"]')?.scrollIntoView({ block:'nearest', inline:'center', behavior:'auto' });
  };
  $('memoryImport').onchange = async e => {
    const file = e.target.files?.[0]; if (!file || locked() || !canWrite()) return;
    if (file.size > 10*1024*1024) { $('memorySave').textContent = '备份超过10MB，暂未导入。'; return; }
    try {
      if (!writable) throw Error('preserve original');
      const data = JSON.parse(await file.text());
      // A question might have begun while the file was being read.
      if (locked() || !canWrite()) { $('memorySave').textContent = '请先提交当前题目，再重新导入。'; return; }
      if (data.memory?.version !== 2 || !data.memory.events || Array.isArray(data.memory.events)) throw Error('format');
      const combined = { ...memory, events: { ...data.memory.events, ...memory.events }, anchors: { ...memory.anchors, ...(data.memory.anchors || {}) } };
      const importedHistory = [...(Array.isArray(data.legacy?.history)?data.legacy.history:[]), ...(Array.isArray(data.legacy?.masteryHistory)?data.legacy.masteryHistory:[])];
      const validated = migrate(combined, importedHistory, catalog.tracks);
      // The controller commits all three learning stores, with a raw backup and rollback, before live state changes.
      onImport(validated, data);
      memory = validated; round = new Set(memory.roundIds || []); save(); wall();
    } catch { $('memorySave').textContent = '备份格式不正确或设备未能保存；原学习记录仍保留。'; }
    e.target.value = '';
  };
  $('memoryExport').onclick = () => {
    if (locked()) return;
    const blob = new Blob([JSON.stringify({ memory, legacy:readLegacy(),reports:(()=>{try{return JSON.parse(localStorage.getItem('fat-fish-music-sessions-v2')||'null');}catch{return null;}})() }, null, 2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'music-history-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('memoryRetry').onclick = () => save();
  save(); sync();
  return { add, reset, reload, sync, locked, wall, scope, setRound, insights, related, setFilter, clearFilters, matching, hasFilter, get filter() { return filter; }, get tab() { return tab; }, get memory() { return memory; } };
}
