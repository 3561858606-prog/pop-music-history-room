import { emptyMemory, migrate, record, groups, status, KEYS } from './memory.js';
import { appearancesFor } from './track-model.js';
export function createArchive({ catalog, readLegacy, getState, onYearStart, onImport, canWrite=()=>true, writable = true }) {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titleFor = t => t.song + (t.versionLabel ? '（' + t.versionLabel + '）' : '');
  const storage = 'fat-fish-music-memory-v2';
  let memory, round = new Set(), highlight = null, filter = {}, tab = 'round', dirty = false, recovery = false;
  // Failure to take a backup must never cause valid existing memory to be replaced.
  try {
    const old = readLegacy();
    memory = migrate(JSON.parse(localStorage.getItem(storage) || 'null'), [...(old.history || []), ...(old.masteryHistory || [])], catalog.tracks);
  } catch { memory = emptyMemory(); dirty = true; recovery = true; try { const raw=localStorage.getItem(storage); if(raw)localStorage.setItem('fat-fish-music-unreadable-v2',raw); } catch { writable=false; } }
  try { if (!localStorage.getItem('fat-fish-music-pre-v2')) localStorage.setItem('fat-fish-music-pre-v2', JSON.stringify(readLegacy())); } catch { dirty = true; }
  round = new Set(memory.roundIds || []);
  const locked = () => { const s = getState(); return !!s.externalPending || !!(s.question && !s.result); };
  function save() {
    memory.roundIds = [...round];
    if(!canWrite()){if($('memorySave'))$('memorySave').textContent='训练在另一个窗口进行，本窗口保留只读档案。';return;}
    try { if(!writable)throw Error('preserve unreadable original');localStorage.setItem(storage, JSON.stringify(memory)); dirty = false; } catch { dirty = true; }
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
    box.innerHTML = (events.some(e=>catalog.tracks.find(t=>t.id===e.id)?.deck===7) ? '<p class="year-basis">第七讲年份复习：I Want to Hold Your Hand 首发1963／课程1964；My Girl 首发1964／课程1965。错题按当时课程评分保留，勿将登顶年当发行年。</p>' : '') + '<h3>四条线索，分别看清。</h3><div class="insights-grid">' + KEYS.map((key, i) => {
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
  function wall() {
    const protection = locked(), count = Object.keys(memory.records).length;
    $('archiveSearch').disabled=protection;
    $('memoryImport').disabled = protection; $('memoryExport').disabled = protection; $('yearStart').disabled = protection || !count;
    if ($('archiveRecallButton')) $('archiveRecallButton').disabled = protection || !count;
    if ($('homeArchiveCount')) $('homeArchiveCount').textContent = protection ? '当前题目提交后开放图鉴' : '已收录 ' + count + ' 首课程曲目 →';
    const box = $('archiveContent');
    if (protection) {
      $('archiveCount').textContent = '答题保护中'; $('archiveFilters').hidden = true;
      box.innerHTML = '<div class="archive-lock"><strong>先回忆，再打开档案。</strong><p>当前答案尚未揭示，图鉴、搜索和资料暂时关闭。</p></div>';
      $('memoryInsights').innerHTML = '';
      return;
    }
    $('archiveFilters').hidden = false;
    populateFilters();
    filter.styleNames = Object.fromEntries(catalog.styles.map(s => [s.id, [s.label, s.sub, s.ko]]));
    const gs = groups(memory, catalog.tracks, tab === 'round' ? round : null, filter);
    $('archiveCount').textContent = (tab === 'round' ? '本轮' : '累计') + '收录 ' + (tab === 'round' ? round.size : count) + ' 首 · ' + gs.length + ' 个年份';
    $('archiveTabs').querySelectorAll?.('[data-archive-tab]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.archiveTab === tab)));
    box.innerHTML = gs.length ? gs.map(([year, tracks]) => '<section class="year-column" data-decade="' + Math.floor(Number(year)/10)*10 + '" aria-label="' + year + '年"><h3>' + year + '<small>' + tracks.length + ' 首 · ' + (memory.anchors[year] ? '已设锚点' : '等待你的记忆锚点') + '</small></h3>' + tracks.map(t => {
      const r = memory.records[t.id], style = catalog.styles.find(s => s.id === t.style);
      return '<article data-track="' + esc(t.id) + '" class="archive-song ' + (highlight === t.id ? 'new-record' : '') + '"><span class="archive-id">NO. ' + esc(t.id.toUpperCase()) + ' / 第' + appearancesFor(t).map(a=>a.deck).join('、') + '讲</span><h4>' + esc(t.song) + '</h4>' + (t.songKo ? '<p class="song-sub">' + esc(t.songKo) + '</p>' : '') + (t.versionLabel ? '<p class="version-label">' + esc(t.versionLabel) + '</p>' : '') + '<p>' + esc(t.artist || '音乐家未注明') + '</p>' + (t.deck===7 ? '<p class="release-year">本版本发行 '+(t.releaseYear ?? '现场版本未确认（歌曲首发'+t.songReleaseYear+'）')+' · 课程评分 '+t.year+'</p>' : '') + '<p class="archive-style">' + esc(style?.label || t.style || '风格未注明') + '</p>' + (t.uncertainAudio ? '<small>△ 音频版本待核实 · 按课程资料归档</small>' : '') + '<details class="memory-detail"><summary>四维掌握状态</summary><div class="memory-dimensions">' + KEYS.map((k,i) => '<span>' + ['歌名','年份','音乐家','风格'][i] + ' · <b>' + status(r.fields[k]) + '</b><small>' + (r.fields[k]?.c || 0) + '/' + (r.fields[k]?.n || 0) + ' 次正确 · 近况 ' + ((r.fields[k]?.recent || []).slice(-4).map(v => v ? '✓' : '×').join(' ') || '暂无') + '</small></span>').join('') + '</div></details><button type="button" data-anchor="' + esc(t.id) + '" aria-pressed="' + (memory.anchors[year] === t.id) + '">' + (memory.anchors[year] === t.id ? '★ 年份锚点 · 点击取消' : '☆ 设为年份锚点') + '</button></article>';
    }).join('') + '</section>').join('') : '<div class="archive-empty"><span>♫</span><h3>'+(count?'没有匹配当前筛选的歌曲。':'档案正在等待第一段旋律。')+'</h3><p>'+(count?'试试调整筛选；样本不足的歌曲暂不会标记为薄弱。':'完成听辨后，这里会自动收录你的第一首歌曲。')+'</p></div>';
  }
  function sync() { wall(); $('archivePanel').open = false; $('archiveSearch').disabled = locked(); }
  function add(entry) {
    if (!record(memory, entry, catalog.tracks, entry.eventId)) return;
    round.add(entry.id); highlight = entry.id; save(); wall();
  }
  function reset(id = '') { round = new Set(); memory.roundId = id; highlight = null; save(); sync(); }
  function setRound(ids, id = '') { round = new Set(ids.filter(trackId => memory.records[trackId])); memory.roundId = id; filter = {}; for(const el of ['archiveSearch','archiveYear','archiveArtist','archiveStyle']) $(el).value = ''; $('archiveWeak').checked = $('archiveYearWeak').checked = false; save(); }
  function scope(next) { tab = next; filter = {}; for (const id of ['archiveSearch','archiveYear','archiveArtist','archiveStyle']) $(id).value = ''; $('archiveWeak').checked = $('archiveYearWeak').checked = false; wall(); }
  function related(track) {
    const anchor = catalog.tracks.find(t => t.id === memory.anchors[track.year]);
    const sameYear = catalog.tracks.filter(t => t.year === track.year && memory.records[t.id] && t.id !== track.id);
    return (anchor ? '<p class="year-anchor">★ ' + track.year + ' 年锚点：' + esc(titleFor(anchor)) + ' · ' + esc(anchor.artist) + '</p>' : '') + (sameYear.length ? '<p class="year-related">同年已收录：' + sameYear.map(t => esc(titleFor(t))).join('、') + '</p>' : '');
  }
  $('archiveTabs').onclick = e => { const b = e.target.closest('[data-archive-tab]'); if (b && !locked()) { tab = b.dataset.archiveTab; wall(); } };
  for (const [id,key] of [['archiveSearch','query'],['archiveYear','year'],['archiveArtist','artist'],['archiveStyle','style']]) $(id).oninput = e => { if (!locked()) { filter[key] = e.target.value; wall(); } };
  for (const [id,key] of [['archiveWeak','weak'],['archiveYearWeak','yearWeak']]) $(id).onchange = e => { if (!locked()) { filter[key] = e.target.checked; wall(); } };
  $('archiveContent').onclick = e => {
    const b = e.target.closest('[data-anchor]'); if (!b || locked()) return;
    const t = catalog.tracks.find(t => t.id === b.dataset.anchor); if (!t || !Number.isInteger(t.year) || !memory.records[t.id]) return;
    if (memory.anchors[t.year] === t.id) delete memory.anchors[t.year]; else memory.anchors[t.year] = t.id;
    save(); wall();
  };
  $('yearStart').onclick = () => { if (!locked()) onYearStart?.(); };
  $('archivePanel').ontoggle = () => {
    if ($('archivePanel').open && !locked() && highlight) $('archiveContent').querySelector?.('[data-track="' + highlight + '"]')?.scrollIntoView({ block:'nearest', inline:'center', behavior:'auto' });
  };
  $('memoryImport').onchange = async e => {
    const file = e.target.files?.[0]; if (!file || locked()) return;
    if (file.size > 10*1024*1024) { $('memorySave').textContent = '备份超过10MB，暂未导入。'; return; }
    try {
      if (!writable) throw Error('preserve original');
      const data = JSON.parse(await file.text());
      // A question might have begun while the file was being read.
      if (locked()) { $('memorySave').textContent = '请先提交当前题目，再重新导入。'; return; }
      if (data.memory?.version !== 2 || !data.memory.events || Array.isArray(data.memory.events)) throw Error('format');
      localStorage.setItem('fat-fish-music-before-import', JSON.stringify(memory));
      const combined = { ...memory, events: { ...data.memory.events, ...memory.events }, anchors: { ...memory.anchors, ...(data.memory.anchors || {}) } };
      const validated = migrate(combined, [], catalog.tracks);
      localStorage.setItem(storage, JSON.stringify(validated));
      memory = validated; round = new Set(memory.roundIds || []); onImport?.(memory); save(); wall();
    } catch { $('memorySave').textContent = '备份格式不正确或设备未能保存；原学习记录仍保留。'; }
    e.target.value = '';
  };
  $('memoryExport').onclick = () => {
    if (locked()) return;
    const blob = new Blob([JSON.stringify({ memory, legacy:readLegacy(),reports:(()=>{try{return JSON.parse(localStorage.getItem('fat-fish-music-sessions-v2')||'null');}catch{return null;}})() }, null, 2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'music-history-backup.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('memoryRetry').onclick = save;
  save(); sync();
  return { add, reset, sync, locked, wall, scope, setRound, insights, related, get memory() { return memory; } };
}
