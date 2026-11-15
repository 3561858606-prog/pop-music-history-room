import { bindUI } from './ui/index.js';
import { createRooms } from './rooms.js';
import { createArchive } from './archive-ui.js';
import { coverFor, MISSING, KIND, RELATION } from './covers.js';
import { storyFor } from './stories.js';
import { gradeWritten } from './written.js';
import { catalog } from './catalog.js';
import { createViewportNavigator } from './viewport.js';
import { appearancesFor, canonicalLegacy, canonicalPending, canonicalReport, backupBeforeCatalogMerge } from './track-model.js';
import { FIELDS, NOT_HEARD, hasAnswer, RandomQueue, buildQuestion, filterTracks, gradeQuestion, summarize, practiceWeight, weightedTrack, summarizeSongs, restoreDeckSelection } from './core.js';

const emit = (name, detail={}) => window.dispatchEvent(new CustomEvent('museum:'+name,{detail}));
const $ = id => document.getElementById(id);
const audio = $('audio');
const storageKey = 'fat-fish-pop-music-review-v1';
const catalogWritable = (() => { try { return backupBeforeCatalogMerge(localStorage, catalog.tracks); } catch { return false; } })();
const knownIds = new Set(catalog.tracks.map(t => t.id));
const deckIds = catalog.lectures.map(d => d.id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
const timeText = seconds => {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
};
const styleFor = t => catalog.styles.find(s => s.id === t.style) || {label:t.style||'未注明',ko:''};
let archive = null;
let rooms = null;
const leaseKey = 'fat-fish-music-active-v2';
let writerId;
let leaseLost = false;
try { writerId=sessionStorage.getItem('music-history-tab-id');if(!writerId){writerId='tab-'+Math.random().toString(36).slice(2);sessionStorage.setItem('music-history-tab-id',writerId);} } catch { writerId='tab-'+Math.random().toString(36).slice(2); }
const readLease=()=>{try{return JSON.parse(localStorage.getItem(leaseKey)||'null');}catch{return null;}};
function claimSession(id){try{localStorage.setItem(leaseKey,JSON.stringify({owner:writerId,id}));leaseLost=false;}catch{}}
function sharedPending(){if(!foreignSession())return false;try{const pending=JSON.parse(localStorage.getItem(storageKey)||'{}').session;return !!pending&&!pending.result;}catch{return false;}}
function foreignSession(){const lease=readLease();return leaseLost || !!lease&&lease.owner!==writerId;}
function ownsSession(){const lease=readLease();return !leaseLost && (!lease||lease.owner===writerId);}
function releaseSession(){if(ownsSession())try{localStorage.removeItem(leaseKey);}catch{}}

let sessionId = '';
let sessionKind = 'listen';
let sessionStartedAt = '';
let reports = [];
let lastReportId = '';
let pendingSession = null;
let pendingTrainingAction = null;
let restoredLegacy = {};
let legacyWritable = true;
let reportsWritable = true;
const reportKey = 'fat-fish-music-sessions-v2';
const activeFields = () => FIELDS;
// Rounds are always a random draw without repeats, 10 or 20 questions, never longer than the scope itself.
// Older saved values (coverage / endless) fall back to 10; old reports keep their own labels.
const sessionLengths = ['10', '20', 'all']; // 'all': the round plays every song in scope once (the 限定每轮题数 switch is off)
function roundProgress() {
  const size=queue.roundSize || sessionTargets.size;
  return {current:queue.cycle,completed:Math.max(0,queue.cycle-1)+(queue.cycle>0 && queue.remaining.length===0 && !!result ? 1 : 0),position:Math.max(0,size-queue.remaining.length),size};
}
const makeId = () => 'round-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
// What this round is reviewing, in the student's words: the lectures (or the retry list) and how many songs.
function scopeLabel(size = (sessionStarted ? sessionTargets.size : currentPool().length)) {
  const decks = selectedDecks.slice().sort((a, b) => a - b);
  const what = focusedIds ? '错题重练' : wrongOnly ? '待巩固' : decks.length === deckIds.length ? '全部七讲' : decks.length === 1 ? '第 ' + decks[0] + ' 讲 · ' + (catalog.lectures.find(d => d.id === decks[0])?.label || '') : decks.length ? '第 ' + decks.join('、') + ' 讲' : '未选范围';
  return what + ' · ' + size + ' 首';
}
function updateProgress() {
  $('sessionProgress').textContent = sessionProgressText();
  $('questionSection').dataset.kind=sessionKind;
  $('answerIntroText').textContent='听完后，给它补全四张名片。';
  $('trainingQuestionTitle').textContent='这一首，你认识吗？';
  $('trainingIdentity').textContent = scopeLabel() + ' · ' + (questionType === 'written' ? '填写' : '选择');
  $('roundProgress').hidden=true;
  $('roundText').textContent='第 '+Math.min(sessionGoal, sessionHistory.length + (result ? 0 : 1))+' / '+sessionGoal+' 题';
  $('sessionMeter').style.width = Math.min(100, sessionGoal ? sessionHistory.length / sessionGoal * 100 : 0) + '%';
}

const sourceText = (t, selectedOnly = false) => appearancesFor(t).filter(a => !selectedOnly || selectedDecks.includes(a.deck)).map(a => '第' + a.deck + '讲 · 第' + a.slide + '页').join('；') || appearancesFor(t).map(a => '第' + a.deck + '讲 · 第' + a.slide + '页').join('；');
const queue = new RandomQueue();
let view = 'practice';
let question = null;
let answers = {};
let result = null;
let drawn = 0;
let sessionAnswered = 0;
let sessionHistory = [];
let sessionGoal = 0;
let sessionTargets = new Set();
let sessionStarted = false;
let lastSummary = [];
let questionType = 'choice';
let writtenDrafts = {};
let correctionDrafts = {};
let correctionOpen = new Set();
let sessionLength = '10';
let focusedIds = null;
const navigator = createViewportNavigator(window, document);
let audioContext = null;
let audioTrack = null;
let playAttempt = 0;
let toastTimer;
let history = [];
let masteryHistory = [];
let wrongIds = new Set();
let selectedDecks = [...deckIds];
// Every course recording is scored (user decision 2026-11-09): the 19 tracks whose embedded file tags disagree with the
// course are treated as the course says they are, with no warning anywhere. The flags stay in the frozen catalog file
// for the record; they are dropped from the running catalog here, so no module shows or filters on them.
for (const t of catalog.tracks) { delete t.uncertainAudio; delete t.discrepancy; }
const verifiedOnly = false;
let wrongOnly = false;

try {
  const stored = canonicalLegacy(JSON.parse(localStorage.getItem(storageKey) || 'null'), catalog.tracks);
  if (stored && typeof stored === 'object') {
    restoredLegacy = stored;
    pendingSession = stored.session || null;
    selectedDecks = restoreDeckSelection(stored.decks, deckIds, stored.catalogDeckIds);
    wrongOnly = stored.wrongOnly === true;
    questionType = stored.questionType === 'written' ? 'written' : 'choice';
    sessionLength = sessionLengths.includes(stored.sessionLength) ? stored.sessionLength : '10';
    if (Array.isArray(stored.lastSummary)) lastSummary = stored.lastSummary.filter(h => knownIds.has(h.id) && Array.isArray(h.fields) && h.fields.length === 4 && h.fields.every(f => FIELDS.some(k => k.key === f.key) && typeof f.isCorrect === 'boolean')).slice(-1000);
    if (Array.isArray(stored.wrongIds)) wrongIds = new Set(stored.wrongIds.filter(id => knownIds.has(id)));
    if (Array.isArray(stored.history)) history = stored.history.filter(h => knownIds.has(h.id) &&
      Array.isArray(h.fields) && h.fields.length === 4 &&
      h.fields.every(f => FIELDS.some(k => k.key === f.key) && typeof f.isCorrect === 'boolean')).slice(-1000);
  }
    if (stored && Array.isArray(stored.masteryHistory)) masteryHistory = stored.masteryHistory.filter(h => knownIds.has(h.id) && Array.isArray(h.fields) && h.fields.length === 4 && h.fields.every(f => FIELDS.some(k => k.key === f.key) && typeof f.isCorrect === 'boolean'));
} catch { try { const raw=localStorage.getItem(storageKey); if(raw)localStorage.setItem('fat-fish-music-unreadable-v1',raw); } catch {legacyWritable=false;} }
const validEntry = e => e && knownIds.has(e.id) && Array.isArray(e.fields) && e.fields.length > 0 && e.fields.every(f => f && FIELDS.some(k => k.key === f.key) && typeof f.isCorrect === 'boolean');
try {
  const data = JSON.parse(localStorage.getItem(reportKey) || '{}');
  reports = Array.isArray(data.reports) ? data.reports.filter(r => r && typeof r.id === 'string' && Array.isArray(r.entries)).map(r => canonicalReport(r, catalog.tracks)).map(r => ({...r,kind:r.kind==='year'?'year':'listen',entries:r.entries.filter(validEntry)})).slice(-100) : [];
  lastReportId = typeof data.lastReportId==='string'?data.lastReportId:'';
} catch { try { const raw=localStorage.getItem(reportKey);if(raw)localStorage.setItem('fat-fish-music-unreadable-sessions',raw); } catch { reportsWritable=false; } }
// Preserve each song's latest score even when the rolling history is trimmed.
masteryHistory = [...new Map([...masteryHistory, ...history].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).map(h => [h.id, h])).values()];

function legacySnapshot() {
  return {
    ...restoredLegacy, decks: selectedDecks, catalogDeckIds: deckIds, wrongOnly, questionType, sessionLength, lastSummary, masteryHistory, wrongIds: [...wrongIds], history: history.slice(-1000), session: sessionStarted && question ? {sessionId,sessionKind,sessionStartedAt,focusedIds:focusedIds?[...focusedIds]:null,trackId:question.track.id,options:question.options,answers,writtenDrafts,result,sessionHistory,sessionGoal,sessionTargets:[...sessionTargets],drawn,sessionAnswered,correctionDrafts,correctionOpen:[...correctionOpen],queueIds:queue.remaining.map(t=>t.id),queueCycle:queue.cycle,queueRoundSize:queue.roundSize,queueLastId:queue.lastId} : null
  };
}
function save() {
  try {
    if(foreignSession())return;
    if(!legacyWritable || !catalogWritable) throw Error('preserve original');
    localStorage.setItem(storageKey, JSON.stringify(legacySnapshot()));
  } catch { toast('训练记录未能保存，请保留页面并重试。'); }
}
function toast(text) {
  clearTimeout(toastTimer);
  $('toast').textContent = text;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3800);
}
// A round's pool is fixed when it starts, so answering a wrong song correctly mid-round never reshuffles the draw.
function currentPool() {
  if (sessionStarted && sessionTargets.size) return catalog.tracks.filter(t => sessionTargets.has(t.id));
  return filterTracks(catalog.tracks, selectedDecks, { verifiedOnly, wrongOnly, wrongIds: [...wrongIds] }).filter(t => !focusedIds || focusedIds.has(t.id));
}
// Scope chips: one per lecture, showing how many of its songs can be scored now and how many wait for audio checks.
const inDeck = id => catalog.tracks.filter(t => appearancesFor(t).some(a => a.deck === id));
function renderDecks() {
  $('deckOptions').innerHTML = catalog.lectures.map(d => {
    const selected = selectedDecks.includes(d.id), all = inDeck(d.id), held = all.filter(t => t.uncertainAudio).length;
    return '<label class="deck-option' + (selected ? ' selected' : '') + '" style="--c:var(--l' + d.id + ')">' +
      '<input type="checkbox" name="deck" value="' + d.id + '"' + (selected ? ' checked' : '') + '>' +
      '<span class="deck-n num">' + String(d.id).padStart(2, '0') + '</span><span class="deck-text"><strong>' + escapeHTML(d.label) + '</strong><small>' +
      escapeHTML(d.period) + '</small></span><span class="deck-number"><b>' + (all.length - held) + '</b>首' + (held ? '<small>另 ' + held + ' 首待核验</small>' : '') + '</span></label>';
  }).join('');
  $('questionType').value = questionType;
  $('roundLimit').checked = sessionLength !== 'all';
  $('sessionLength').disabled = sessionLength === 'all' || sessionStarted;
  if (sessionLength !== 'all') $('sessionLength').value = sessionLength;
  $('wrongOnly').checked = wrongOnly;
  $('totalAudioCount').textContent = catalog.tracks.length + '段课程音频';
  $('catalogSummary').textContent = catalog.lectures.length + '份课件 · ' + catalog.tracks.length + '个曲目版本 · 含' + catalog.tracks.filter(t => t.sourceType === 'video').length + '段视频音轨';
  for(const el of $('deckOptions').querySelectorAll('input'))el.disabled=sessionStarted;
  for(const id of ['allDecks','wrongOnly','questionType','roundLimit'])$(id).disabled=sessionStarted;
  $('allDecks').setAttribute('aria-pressed', selectedDecks.length === deckIds.length ? 'true' : 'false');
}
function renderPoolInfo() {
  const pool = currentPool();
  $('poolCount').textContent = pool.length;
  $('wrongCount').textContent = wrongIds.size ? wrongIds.size + '首待复习 · 四项全对后移出错题' : '还没有错题，先开始一轮吧';
  $('startButton').disabled = !pool.length && !sessionStarted;
  $('resumeSession').hidden = true;
  $('pauseFinish').hidden = !sessionStarted;
  $('startHint').textContent = scopeLabel(pool.length);
  $('questionTypeHint').textContent = questionType === 'written' ? '四项全部填写或明确选择「不知道」后才能提交；提交后对照参考答案，可更正未识别的正确写法。' : '每项四个候选答案，另有“不知道”，不用靠猜。';
  $('welcomeDescription').textContent = questionType === 'written' ? '听音频，自己写出四条线索。可以反复重听，提交后揭晓参考答案。' : '一段原课件音频，四项独立选择。不确定时可选“不知道”，答案提交后揭晓。';
  emit('stats');
}
function renderStats() {
  const stats = summarize(history);
  $('answeredStat').textContent = stats.count;
  $('accuracyStat').textContent = stats.count ? stats.accuracy + '%' : '—';
  $('fieldStats').innerHTML = FIELDS.map(f => {
    const percent = stats.count ? Math.round(stats.byField[f.key] / stats.count * 100) : 0;
    return '<div class="field-stat"><span>' + f.label + '</span><i><b style="width:' + percent +
      '%"></b></i><span>' + (stats.count ? percent + '%' : '—') + '</span></div>';
  }).join('');
  emit('stats');
}
function stopAudio() {
  playAttempt++;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  audioContext = null;
  audioTrack = null;
  $('waveform').classList.remove('playing');
  $('playButton').dataset.playing = 'false';
  $('playButton').setAttribute('aria-label', '播放当前歌曲');
}
// Browsing audio belongs to the mini player: only loading a question or the player's own close button ends it.
function stopPractice() { if (audioContext !== 'library') stopAudio(); }
function stopPreview() { if (audioContext === 'library') { stopAudio(); updateListenButtons(); } }
function resetPractice() {
  $('resumeSession').hidden=true;
  archive?.reset();
  navigator.cancel();
  stopPractice();
  queue.reset();
  question = null;
  result = null;
  answers = {};
  writtenDrafts = {};
  correctionDrafts = {};
  correctionOpen = new Set();
  drawn = 0;
  sessionAnswered = 0;
  sessionHistory = [];
  sessionStarted = false;
  $('summarySection').hidden = true;
  $('questionSection').hidden = true;
  $('feedback').hidden = true;
  $('answerFields').innerHTML = '';
  renderPoolInfo();
  // The wall stays up even when the scope is empty: the round poster says so and offers another scope.
  $('welcome').hidden = false;
  $('emptyState').hidden = true;
  if (currentPool().length === 0) renderEmpty();
}
function renderEmpty() {
  if (!selectedDecks.length) {
    $('emptyTitle').textContent = '先选择练习范围';
    $('emptyText').textContent = '勾选至少一份课件，就可以开始听辨。';
  } else if (wrongOnly) {
    $('emptyTitle').textContent = '这个范围内没有待复习错题';
    $('emptyText').textContent = '取消“只练错题”，或换一份课件，继续积累听辨经验。';
  } else {
    $('emptyTitle').textContent = '这个范围暂时没有可练音频';
    $('emptyText').textContent = '调整课件范围或练习筛选即可继续。';
  }
}
function changeScope() {
  if (sessionStarted && foreignSession()) return toast('训练已在另一个窗口更新，请先继续训练后再操作。');
  if (sessionStarted && sessionHistory.length) rememberReport('interrupted');
  sessionStarted = false;
  pendingSession = null;
  question = null;
  if (sessionHistory.length) lastSummary = [...sessionHistory];
  focusedIds = null;
  save();
  resetPractice();
  renderDecks();
}
function scrollToQuestion() {
  navigator.goTo($('questionSection'), $('playButton'), true);
}
function startSession() {
  // A tab can stay open while another one answers or completes the round. Refresh before taking its lease,
  // so this tab cannot write an older in-memory archive over the other tab's newly saved attempts.
  if (foreignSession() || !sessionStarted || !readLease()) {
    try {
      const pending = refreshStoredLearning();
      sessionStarted=false;question=null;result=null;sessionHistory=[];
      if (pending && !reports.some(r=>r.id===pending.sessionId)) {
        pendingSession={...pending,sessionId:pending.sessionId||makeId()};
        claimSession(pendingSession.sessionId);
        if (foreignSession()) return toast('当前设备未能接续训练，请释放存储空间后重试。');
        if (restorePending()) { save();rooms?.go('train',sessionId);return; }
      }
    } catch { return toast('另一个窗口的最新记录暂时无法读取，请保留页面后重试。'); }
  }
  if (sessionStarted && question) {
    claimSession(sessionId);rooms?.go('train', sessionId);return;
  }
  const newId=makeId();claimSession(newId);
  resetPractice();
  sessionKind = 'listen';
  sessionId = newId;
  sessionStartedAt = new Date().toISOString();
  const pool = currentPool();
  if (!pool.length) { releaseSession(); return toast('这个范围暂时没有可以出题的曲目。'); }
  sessionTargets = new Set(pool.map(t => t.id));
  sessionGoal = sessionLength === 'all' ? pool.length : Math.min(Number(sessionLength) || 10, pool.length);
  sessionStarted = true;
  archive?.reset(sessionId);
  renderPoolInfo();
  nextQuestion();
  rooms?.go('train', sessionId);
}
function sessionComplete() { return sessionHistory.length >= sessionGoal; }
function sessionProgressText() { return '已完成 ' + sessionHistory.length + ' / ' + sessionGoal + ' 题'; }
function rememberReport(reason = 'completed') {
  const report = {id:sessionId || makeId(),kind:sessionKind,startedAt:sessionStartedAt,endedAt:new Date().toISOString(),reason,goal:sessionGoal,length:sessionLength,rounds:null,scope:scopeLabel(sessionTargets.size),entries:JSON.parse(JSON.stringify(sessionHistory)),settings:{decks:[...selectedDecks],questionType,wrongOnly,sessionLength,focusedIds:focusedIds?[...focusedIds]:null}};
  reports = [...reports.filter(r => r.id !== report.id), report].slice(-100);
  lastReportId = report.id;
  try { if(!reportsWritable || !catalogWritable)throw Error('preserve original');localStorage.setItem(reportKey,JSON.stringify({version:2,lastReportId,reports})); } catch { toast('本轮报告暂未保存，请保留页面。已提交的歌曲记录仍在。'); }
  return report;
}
// Every round, newest first, inside the results page. Rounds from retired modes keep their own names.
function renderSessionList(currentId = $('summarySection')?.dataset.reportId) {
  $('sessionList').innerHTML = reports.length ? [...reports].reverse().map(r => { const stats=summarize(r.entries), full=r.entries.filter(e=>e.fields.every(f=>f.isCorrect)).length, d=new Date(r.endedAt); return '<button class="session-record'+(r.id===currentId?' current':'')+'" type="button" data-kind="'+escapeHTML(r.kind)+'" data-report="'+escapeHTML(r.id)+'"'+(r.id===currentId?' aria-current="true"':'')+'><span class="sr-date num">'+(d.getMonth()+1)+'.'+String(d.getDate()).padStart(2,'0')+'</span><strong>'+escapeHTML(r.kind==='year'?'年份归位（旧版）':r.scope||'四维听辨')+'</strong><span class="sr-score num">'+full+' / '+stats.count+'</span><span class="sr-meta">'+stats.accuracy+'% · '+(r.reason==='completed'?'完成':r.reason==='ended'?'手动结束':'提前结束')+'</span></button>'; }).join('') : '<div class="archive-empty"><h2>这里会留下每一轮练习。</h2><p>完成或结束一轮训练后，结果会出现在这里。</p></div>';
}
function finishSession(entries = sessionHistory, existingReport = null, navigate = true) {
  const own = entries === sessionHistory;
  if (own && foreignSession()) return toast('训练已在另一个窗口更新，请先继续训练后再操作。');
  if (own) existingReport = rememberReport(sessionComplete() ? 'completed' : 'interrupted');
  if (own) focusedIds = null;
  if (existingReport) { sessionKind=existingReport.kind; sessionId=existingReport.id; }

  if (entries === sessionHistory) lastSummary = [...entries];
  save();
  navigator.cancel();
  stopPractice();
  question = null;
  sessionStarted = false;
  save();
  releaseSession();
  // The question stays on screen until the room changes (a transition captures it as the page being left); see land().
  const leaveQuestion=()=>{$('questionSection').hidden = true;$('welcome').hidden = true;$('emptyState').hidden = true;};
  if(!navigate) leaveQuestion();
  $('summarySection').hidden = false;
  const stats = summarize(entries);
  const songs = summarizeSongs(entries);
  const weak = songs.filter(s => s.accuracy < 100);
  const unknownFields = entries.flatMap(e => e.fields).filter(f => f.isUnknown).length;
  $('summaryUnknown').textContent = unknownFields ? '本次共 ' + unknownFields + ' 项选择「不知道」，这些歌已放进待巩固。' : '';
  $('summarySubtitle').textContent = stats.count ? '本轮完成了 ' + stats.count + ' 题、接触了 ' + songs.length + ' 首课程曲目。' : '这轮还没有提交答案。准备好后，再听一首吧。';
  $('summaryStats').innerHTML = '<div class="summary-stat count"><strong>' + stats.count + '</strong><span>完成题数</span></div><div class="summary-stat accuracy"><strong>' + (stats.count ? stats.accuracy + '%' : '—') + '</strong><span>四项正确率</span></div><div class="summary-stat weak"><strong>' + weak.length + '</strong><span>首待巩固</span></div>';
  $('summaryFields').innerHTML = FIELDS.map(f => { const pct = stats.count ? Math.round(stats.byField[f.key] / stats.count * 100) : 0; return '<div class="field-stat"><span>' + f.label + '</span><i><b style="width:' + pct + '%"></b></i><span>' + (stats.count ? pct + '%' : '—') + '</span></div>'; }).join('');
  $('summarySongs').innerHTML = weak.length ? weak.map(song => {
    const t = catalog.tracks.find(t => t.id === song.id);
    const c = coverFor(t);
    return '<article class="summary-song">' + (c ? '<span class="ss-img" data-shape="' + c.shape + '"><img src="' + c.img + '" alt="" loading="lazy" decoding="async"></span>' : '<span class="ss-img none" aria-hidden="true">' + String(t.deck).padStart(2, '0') + '</span>') + '<div><h4>' + escapeHTML(t.song) + '</h4>' + (t.versionLabel ? '<p class="version-label">' + escapeHTML(t.versionLabel) + '</p>' : '') + '<p>' + escapeHTML(t.artist) + ' · ' + t.year + '年 · ' + escapeHTML(styleFor(t).label) + '</p><p class="reinforce">继续巩固：' + song.missed.join('、') + '</p><small>本次练习 ' + song.attempts + ' 次 · 最近一次 ' + song.latestScore + (sessionKind==='year'?'/1':'/4') + (t.uncertainAudio ? ' · 音频对应关系尚待核对' : '') + '</small></div><strong>' + song.accuracy + '%<small>'+(sessionKind==='year'?'本次年份正确率':'本次四项正确率')+'</small></strong></article>';
  }).join('') : '<div class="summary-success">' + (stats.count ? (sessionKind==='year'?'这轮年份全部答对。隔一段时间再回忆，让记忆更稳。':'这轮四项全部答对！继续混合听辨，让记忆更稳。') : '提交四项答案后，这里会整理需要巩固的歌曲。') + '</div>';
  $('targetedReviewButton').hidden = !weak.length;
  $('targetedReviewButton').textContent = '这 ' + weak.length + ' 首再练一轮 →';
  $('summaryListDescription').textContent=sessionKind==='year'?'按本次年份正确率排序，保留本轮出现过的年份错误。':'按本次四项正确率排序，保留本轮出现过的错误。';
  $('targetedReviewButton').onclick = () => {
    focusedIds = new Set(weak.map(s => s.id));
    wrongOnly = false;
    renderDecks();
    save();
    startSession();
  };
  renderPoolInfo();
  archive?.setRound(entries.map(e=>e.id),sessionId);
  archive?.scope('round');
  archive?.insights(entries);
  $('summaryCorrect').innerHTML = songs.filter(song=>song.accuracy===100).length ? '<details><summary>本轮正确歌曲 · '+songs.filter(song=>song.accuracy===100).length+' 首</summary>'+songs.filter(song=>song.accuracy===100).map(song=>{const t=catalog.tracks.find(t=>t.id===song.id);return '<p>'+escapeHTML(t.song)+' · '+t.year+' · '+escapeHTML(t.artist)+(t.versionLabel?' · '+escapeHTML(t.versionLabel):'')+'</p>';}).join('')+'</details>' : '';
  $('summaryTitle').textContent = sessionKind==='year' ? '把年代，记得更清楚。' : '这一轮旋律，已经归卷。';
  $('summarySubtitle').textContent = (existingReport?.scope ? existingReport.scope + ' · ' : '') + $('summarySubtitle').textContent + (existingReport?.goal && existingReport.reason !== 'completed' ? ' 计划 ' + existingReport.goal + ' 题，提前结束。' : '');
  $('summaryStats').innerHTML = $('summaryStats').innerHTML.replace('四项正确率',sessionKind==='year'?'年份正确率':'四项正确率');
  $('summaryFields').innerHTML = FIELDS.map(f => { const tested=entries.flatMap(e=>e.fields).filter(x=>x.key===f.key);const pct=tested.length?Math.round(tested.filter(x=>x.isCorrect).length/tested.length*100):null;return '<div class="field-stat"><span>'+f.label+'</span><i><b style="width:'+(pct||0)+'%"></b></i><span>'+(pct===null?'未测试':pct+'%')+'</span></div>'; }).join('');
  $('summarySection').dataset.reportId=existingReport?.id || sessionId;
  renderSessionList(existingReport?.id || sessionId);
  if(navigate) rooms?.go('report',existingReport?.id || sessionId);
  // With a room transition the report appears a frame later: the celebration must still start after the room, as before.
  const finished={reportId:existingReport?.id||sessionId,fresh:own};
  const land=()=>{if(navigate)leaveQuestion();navigator.goTo($('summarySection'), $('summaryTitle'), true);emit('finish',finished);};
  if(rooms?.settled) rooms.settled(land); else land();
}
function nextQuestion() {
  if (pendingTrainingAction) return;
  if (sessionStarted && foreignSession()) return toast('训练已在另一个窗口更新，请先继续训练后再操作。');
  if (!sessionStarted) return startSession();
  if (sessionComplete()) return finishSession();
  const pool = currentPool();
  const track = queue.next(pool);
  if (!track) {
    finishSession();
    return;
  }
  audio.pause();
  question = buildQuestion(track, pool, catalog.tracks, catalog.styles);
  answers = {};
  writtenDrafts = {};
  correctionDrafts = {};
  correctionOpen = new Set();
  result = null;
  drawn++;
  $('welcome').hidden = true;
  $('emptyState').hidden = true;
  $('questionSection').hidden = false;
  $('feedback').hidden = true;
  $('feedback').innerHTML = '';
  for(const id of ['summarySongs','summaryCorrect','sessionList','memoryInsights'])$(id).replaceChildren();
  $('submitBar').hidden = false;
  $('uncertainNotice').hidden = !track.uncertainAudio;
  renderStage();
  $('answerTypeLabel').textContent = questionType === 'written' ? '填写题 · 自主回忆' : '选择题 · 可选不知道';
  $('writtenRule').hidden = questionType !== 'written';
  updateProgress();
  $('questionSection').classList.remove('question-enter');
  void $('questionSection').offsetWidth;
  $('questionSection').classList.add('question-enter');
  renderFields();
  updateSelection();
  loadAudio(track, 'practice');
  void playAudio();
  archive?.sync();
  save();
  scrollToQuestion();
  emit('question',{restored:false});
}
function closeTrainingConfirmation(resume = true) {
  const pending = pendingTrainingAction;
  pendingTrainingAction = null;
  if ($('trainingConfirmDialog').open) $('trainingConfirmDialog').close();
  if (resume && pending?.wasPlaying && pending.sessionId === sessionId && pending.question === question && rooms?.current.name === 'train') void playAudio();
}
function requestTrainingAction(action) {
  if (!sessionStarted || !question || pendingTrainingAction) return;
  if (foreignSession()) return toast('训练已在另一个窗口打开，请先继续训练后再操作。');
  const finishing = action === 'finish';
  pendingTrainingAction = { action, sessionId, question, wasPlaying: !audio.paused && !audio.ended };
  navigator.cancel();
  audio.pause();
  save();
  $('trainingConfirmTitle').textContent = finishing ? '结束本轮训练？' : '换一首歌？';
  $('trainingConfirmDescription').textContent = finishing ?
    '本轮已提交 ' + sessionHistory.length + ' 题。结束后进入学习报告，已提交的成绩和年代档案会保留。' + (!result ? '当前题目尚未提交，不会计入成绩。' : '') :
    sessionComplete() ? '本轮题目已完成，确认后将查看学习报告。' :
    result ? '当前题目已经提交，成绩和年代档案会保留。确认后进入下一首。' : '当前题目尚未提交。确认换歌后，已填答案会清空，本题不计分；已完成的题目和档案会保留。';
  $('trainingConfirmProceed').textContent = finishing ? '确认结束' : sessionComplete() ? '确认，查看总结' : '确认换歌';
  $('trainingConfirmDialog').showModal();
  $('trainingConfirmCancel').focus({ preventScroll: true });
}
function confirmTrainingAction() {
  const pending = pendingTrainingAction;
  closeTrainingConfirmation(false);
  if (!pending || !sessionStarted || pending.sessionId !== sessionId || pending.question !== question) return;
  if (foreignSession()) return toast('训练已在另一个窗口更新，请先继续训练后再操作。');
  if (pending.action === 'finish') finishSession();
  else nextQuestion();
}
function helpFor(field) {
  if (field === 'artist') return '本题角色：' + question.track.artistRole;
  if (field === 'year') return result ? question.track.yearBasis : '回忆课件标注的具体年份';
  if (field === 'song') return questionType === 'written' ? '可填写课件中的原文或对应的中韩译名' : '按课件曲名选择，原文与韩文供对照';
  return result ? question.track.styleBasis || '按课件最具体的归类选择' : '按课件最具体的归类选择';
}
function renderFields() {
  $('answerFields').innerHTML = activeFields().map(field => {
    const scored = result?.fields.find(f => f.key === field.key);
    if (questionType === 'written') return renderWrittenField(field, scored);
    let body = '<fieldset class="field-card"><legend><span class="number">' + field.number +
      '</span><strong>' + field.label + '</strong><small>' + field.ko + '</small></legend><p class="field-help">' +
      escapeHTML(helpFor(field.key)) + '</p><div class="choices">';
    body += question.options[field.key].map((option, index) => {
      const selected = answers[field.key] === option.value;
      const correct = scored && scored.correct === option.value;
      const wrong = scored && selected && !scored.isCorrect;
      const classes = ['choice', selected && 'selected', scored && 'disabled', correct && 'correct', correct && !selected && 'ans', wrong && 'wrong'].filter(Boolean).join(' ');
      const mark = correct ? '✓' : wrong ? '你的选择' : '';
      return '<label class="' + classes + '"><input type="radio" name="' + field.key +
        '" data-field="' + field.key + '" value="' + escapeHTML(option.value) + '"' +
        (selected ? ' checked' : '') + (scored ? ' disabled' : '') + '>' +
        '<span class="choice-letter" aria-hidden="true">' + String(index + 1) +
        '</span><span class="choice-text"><strong>' + escapeHTML(option.label) + '</strong><small>' +
        escapeHTML(option.sub) + '</small></span>' + (mark ? '<span class="result-mark" aria-label="' +
          (correct ? '正确选项' : '选择错误') + '">' + mark + '</span>' : '') + '</label>';
    }).join('');
    const unknown = answers[field.key] === NOT_HEARD;
    body += '<label class="choice unknown-choice' + (unknown ? ' selected' : '') + (scored ? ' disabled' : '') + '"><input type="radio" name="' + field.key + '" data-field="' + field.key + '" value="' + NOT_HEARD + '"' + (unknown ? ' checked' : '') + (scored ? ' disabled' : '') + '><span class="choice-letter" aria-hidden="true">0</span><span class="choice-text"><strong>不知道</strong><small>本项记为待巩固</small></span></label>';
    if (scored) body += '</div><p class="field-result' + (scored.isCorrect ? '' : ' incorrect') + '">' +
      (scored.isCorrect ? '✓ 本项正确' : scored.isUnknown ? '不知道 · 记入待巩固，圈出的选项是参考答案' : '× 本项答错，圈出的选项是正确答案') + '</p>';
    else body += '</div>';
    return body + '</fieldset>';
  }).join('');
  emit('fields',{revealed:!!result});
}
function correctText(key) {
  const t = question.track;
  return key === 'style' ? styleFor(t).label + ' · ' + styleFor(t).ko : key === 'year' ? t.year + '年' : t[key] + ' · ' + (key === 'song' ? t.songKo : t.artistKo);
}
function renderWrittenField(field, scored) {
  const key = field.key;
  const unknown = answers[key] === NOT_HEARD;
  const value = unknown ? '' : (answers[key] || '');
  let body = '<fieldset class="field-card written-card"><legend><span class="number">' + field.number + '</span><strong>' + field.label + '</strong><small>' + field.ko + '</small></legend><p class="field-help">' + escapeHTML(helpFor(key)) + '</p>';
  body += '<input class="written-answer" type="text" data-field="' + key + '" value="' + escapeHTML(value) + '" aria-label="填写' + field.label + '" placeholder="' + (unknown ? '已选择不知道' : key === 'year' ? '填写课件的具体年份' : '填写' + field.label) + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="200" required' + (scored || unknown ? ' disabled' : '') + (key === 'year' ? ' inputmode="numeric"' : '') + '>';
  if (!scored) body += '<button class="unknown-input' + (unknown ? ' selected' : '') + '" data-unknown="' + key + '" aria-pressed="' + unknown + '" type="button">' + (unknown ? '已选不知道 · 改为填写' : '不知道') + '</button>';
  if (scored) {
    const label = scored.isCorrect ? (scored.selfReviewed ? '✓ 已自行核对为正确' : '✓ 本项匹配正确') : scored.isUnknown ? '不知道 · 记入待巩固' : '暂未匹配 · 请对照参考答案';
    body += '<div class="written-result' + (scored.isCorrect ? ' is-correct' : '') + '"><p>' + label + '</p><p class="your-answer">你的回答：' + (scored.isUnknown ? '不知道' : escapeHTML(scored.chosen)) + '</p><p>参考答案：<strong>' + escapeHTML(correctText(key)) + '</strong></p></div>';
    body += '<div class="correction-practice"><button class="text-button" type="button" data-practice="' + key + '" aria-expanded="' + correctionOpen.has(key) + '" aria-controls="correction-' + key + '">' + (correctionOpen.has(key) ? '收起订正练写' : '订正练写 · 再写一遍') + '</button>';
    if (correctionOpen.has(key)) body += '<label class="correction-label" for="correction-' + key + '">再写一遍' + field.label + '</label><textarea id="correction-' + key + '" class="written-answer correction-input" data-correction="' + key + '" rows="2" maxlength="500" autocomplete="off" spellcheck="false" placeholder="对照上方参考答案，再写一遍">' + escapeHTML(correctionDrafts[key] || '') + '</textarea><p class="small muted">用于巩固记忆，不改变本题成绩。切换下一题后清空。</p>';
    else body += '<div id="correction-' + key + '" hidden></div>';
    body += '</div>';
    if (!scored.isUnknown && !scored.autoCorrect) body += '<button class="text-button review-answer" type="button" data-review="' + key + '">' + (scored.selfReviewed ? '撤销本项更正' : '我的写法正确 · 更正本项') + '</button>';
  }
  return body + '</fieldset>';
}
function updateSelection() {
  const fields = activeFields();
  const count = fields.filter(f => hasAnswer(answers[f.key])).length;
  $('selectionCount').textContent = (questionType === 'written' ? '已填写 / 标记 ' : '已选 ') + count + ' / ' + fields.length + ' 项';
  $('submitButton').disabled = !!result || count !== fields.length;
  if(!result && $('statusTitle')) $('statusTitle').textContent=count===fields.length?'可以提交了':'还差 '+fields.filter(f=>!hasAnswer(answers[f.key])).map(f=>f.label).join('、');
}

function sourceLinks(track) {
  return (track.sources || []).map(source => '<a href="' + escapeHTML(source.url) +
    '" target="_blank" rel="noopener noreferrer">' + escapeHTML(source.label) + ' ↗</a>').join('');
}
function submitQuestion(event) {
  event.preventDefault();
  if (!question || result || pendingTrainingAction) return;
  if (foreignSession()) return toast('训练已在另一个窗口更新，请先继续训练后再操作。');
  if (activeFields().some(f => !hasAnswer(answers[f.key]))) {
    toast('还差几项，请逐项作答或选择「不知道」后再提交。');
    return;
  }
  result = questionType === 'written' ? gradeWritten(question.track, answers, catalog.styles, catalog.tracks) : gradeQuestion(question.track, answers);
  sessionAnswered++;
  const t = question.track;
  const prior = wrongIds.has(t.id);
  const firstTime=!archive?.memory.records[t.id];
  if (result.score === 4) wrongIds.delete(t.id); else wrongIds.add(t.id);
  const entry = { sessionId, sessionKind, eventId: 'answer-'+Date.now()+'-'+Math.random(), id: t.id, time: new Date().toISOString(), questionType, fields: result.fields };
  history.push(entry); masteryHistory = [...masteryHistory.filter(h => h.id !== t.id), entry];
  sessionHistory.push(entry);
  archive?.add(entry);
  updateProgress();
  history = history.slice(-1000);
  save();
  renderStats();
  renderPoolInfo();
  renderFields();
  $('submitBar').hidden = true;
  renderStage();
  renderFeedback(prior);
  emit('reveal',{token:entry.eventId,firstTime});
}
function renderStage() {
  if(!question)return;
  const t=question.track;
  $('playerLabel').textContent=result?t.song:'神秘曲目';
  $('playerLabel').setAttribute('lang',result?(/[가-힣]/.test(t.song)?'ko':'en'):'zh');
  if($('stageSub'))$('stageSub').textContent=result?t.artist+' · '+t.artistRole+' · '+styleFor(t).label:'第 '+Math.min(drawn,sessionGoal)+' / '+sessionGoal+' 首';
  if($('stageYear')) { $('stageYear').classList.toggle('slot',!result);$('stageYear').innerHTML=result?escapeHTML(t.year):'<i></i><i></i><i></i><i></i>'; }
  if(!result && $('courseNote'))$('courseNote').textContent='提交后显示这张唱片的故事';
  if(!result && $('resultAnnounce'))$('resultAnnounce').textContent='';
}
// The record's story after the answer: its background, its impact at the time, what came after (stories.js).
function storyHTML(t) {
  const st = storyFor(t); if (!st) return '';
  const links = (st.src || []).map(x => '<a href="' + escapeHTML(x.url) + '" target="_blank" rel="noopener">' + escapeHTML(x.label) + '</a>').join(' · ');
  return '<section class="note-story" aria-label="这张唱片的故事"><h3>这张唱片的故事</h3><dl><dt>背景</dt><dd>' + escapeHTML(st.bg) + '</dd><dt>当时</dt><dd>' + escapeHTML(st.then) + '</dd><dt>后来</dt><dd>' + escapeHTML(st.legacy) + '</dd></dl>' + (links ? '<p class="story-src">来源：' + links + '</p>' : '') + '</section>';
}
function renderFeedback(prior = false, move = true) {
  const t=question.track, missed=result.fields.filter(f=>!f.isCorrect);
  if($('statusTitle'))$('statusTitle').innerHTML=('你认出 '+result.score+' / '+result.total)+(missed.length?'<small>'+escapeHTML(missed.map(f=>f.label).join('、'))+'记入待巩固</small>':'');
  // the place under the answers tells the record's story (the user replaced the course-note text with it)
  if($('courseNote'))$('courseNote').innerHTML=storyHTML(t)||'<p class="note-text">'+escapeHTML(t.note)+'</p>';
  $('feedback').removeAttribute('aria-live');
  $('feedback').innerHTML=(t.uncertainAudio?'<div class="notice"><strong>音频对应关系尚待确认</strong><p>'+escapeHTML(t.discrepancy)+'</p></div>':'')+(archive?.related(t)||'')+'<div class="source-links">'+sourceLinks(t)+'</div><div class="next-row"><p>本次已答 '+sessionAnswered+' 题 · 本轮已收录 '+new Set(sessionHistory.map(e=>e.id)).size+' 首</p><button id="nextButton" type="button" class="primary" disabled>'+(sessionComplete()?'看总结':missed.length?'记住了 · 下一首':'下一首')+'</button></div>';
  $('feedback').hidden=false;
  const revealedQuestion=question,revealedResult=result,button=$('nextButton');
  setTimeout(()=>{if(question===revealedQuestion&&result===revealedResult)button.disabled=false;},500);
  button.addEventListener('click',event=>{if(!event.repeat&&!button.disabled&&question===revealedQuestion&&result===revealedResult)nextQuestion();});
  if($('resultAnnounce'))$('resultAnnounce').textContent=result.score+'/'+result.total+'。'+missed.map(f=>f.label+'错：你选 '+(f.isUnknown?'不知道':f.chosen)+'，正确 '+f.correct).join('；');
  if(move)navigator.goTo($('statusRow')||$('feedback'),$('statusTitle'),true);
  else emit('rerender');
}
function loadAudio(track, context) {
  playAttempt++;
  audio.pause();
  audioTrack = track;
  audioContext = context;
  audio.src = track.src;
  audio.preload = 'metadata';
  audio.load();
  if (context === 'practice') {
    $('currentTime').textContent = '0:00';
    $('duration').textContent = timeText(track.duration);
    $('seekBar').value = 0;
    $('playStatus').textContent = '准备播放';
    $('playButton').dataset.playing = 'false';
    $('waveform').classList.remove('playing');
  }
}
async function playAudio() {
  const attempt = ++playAttempt;
  if (!audioTrack) return;
  if (audioContext === 'practice') $('playStatus').textContent = '正在加载音频…';
  try {
    await audio.play();
  } catch (error) {
    if (attempt !== playAttempt || error.name === 'AbortError') return;
    if (audioContext === 'practice') $('playStatus').textContent = '点播放即可开始';
    toast(error.name === 'NotAllowedError' ? '浏览器需要你再点一次播放。' : '音频暂未加载成功，请点播放重试。');
  }
}
function togglePracticeAudio() {
  if (!question) return;
  if (audioContext !== 'practice' || audioTrack?.id !== question.track.id) loadAudio(question.track, 'practice');
  if (audio.paused || audio.ended) {
    if (audio.ended) audio.currentTime = 0;
    void playAudio();
  } else {
    audio.pause();
  }
}
function updatePlaybackUI() {
  const playing = !audio.paused && !audio.ended;
  if (audioContext === 'practice') {
    $('waveform').classList.toggle('playing', playing);
    $('playButton').dataset.playing=String(playing);
    $('playButton').setAttribute('aria-label', playing ? '暂停当前歌曲' : '播放当前歌曲');
    $('playStatus').textContent = audio.ended ? '播放结束 · 可重听' : playing ? '正在播放' : '已暂停';
  }
  updateListenButtons();
}
// A wall re-render makes new buttons, so this is also what restores the playing card after filtering.
function updateListenButtons() {
  const playing = !audio.paused && !audio.ended;
  document.querySelectorAll('[data-listen]').forEach(button => {
    const active = audioContext === 'library' && audioTrack?.id === button.dataset.listen && playing;
    button.classList.toggle('playing', active);
    button.setAttribute('aria-label', (active ? '暂停 ' : '播放 ') + button.dataset.song);
    button.closest('.archive-song')?.toggleAttribute('data-playing', active);
  });
}

$('deckOptions').addEventListener('change', () => {
  selectedDecks = [...$('deckOptions').querySelectorAll('input:checked')].map(input => Number(input.value));
  changeScope();
});
$('allDecks').addEventListener('click', () => { selectedDecks = selectedDecks.length === deckIds.length ? [] : [...deckIds]; changeScope(); });
$('wrongOnly').addEventListener('change', event => { wrongOnly = event.target.checked; changeScope(); });
$('practiceTab').addEventListener('click', () => rooms?.go('home'));
$('startButton').addEventListener('click', startSession);
$('finishButton').addEventListener('click', () => requestTrainingAction('finish'));
$('restartButton').addEventListener('click', () => { const previous=reports.find(r=>r.id===sessionId); if(previous?.settings){const opts=previous.settings;selectedDecks=restoreDeckSelection(opts.decks,deckIds,deckIds);questionType=opts.questionType==='written'?'written':'choice';sessionLength=sessionLengths.includes(opts.sessionLength)?opts.sessionLength:'10';wrongOnly=!!opts.wrongOnly;focusedIds=opts.focusedIds?new Set(opts.focusedIds):null;} renderDecks();save();startSession(); });
$('questionType').addEventListener('change', event => { questionType = event.target.value; changeScope(); });
$('sessionLength').addEventListener('change', event => { sessionLength = event.target.value; changeScope(); });
$('roundLimit').addEventListener('change', event => { sessionLength = event.target.checked ? ($('sessionLength').value || '10') : 'all'; changeScope(); });
$('skipButton').addEventListener('click', () => requestTrainingAction('skip'));
$('trainingConfirmCancel').addEventListener('click', () => closeTrainingConfirmation());
$('trainingConfirmProceed').addEventListener('click', confirmTrainingAction);
$('trainingConfirmDialog').addEventListener('cancel', event => { event.preventDefault(); closeTrainingConfirmation(); });
$('playButton').addEventListener('click', togglePracticeAudio);
$('replayButton').addEventListener('click', () => {
  if (!question) return;
  if (audioContext !== 'practice' || audioTrack?.id !== question.track.id) loadAudio(question.track, 'practice');
  audio.currentTime = 0;
  void playAudio();
});
$('seekBar').addEventListener('input', event => {
  if (audioContext === 'practice' && Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = Number(event.target.value) / 1000 * audio.duration;
  }
});
function captureAnswer(event) {
  if (foreignSession()) return;
  const input = event.target;
  const correction = input.dataset.correction;
  if (questionType === 'written' && result && FIELDS.some(f => f.key === correction)) {
    correctionDrafts[correction] = input.value;
    save();
    return;
  }
  const key = input.dataset.field;
  if (!question || result || !FIELDS.some(f => f.key === key)) return;
  answers[key] = input.value;
  if (questionType === 'choice') $('answerFields').querySelectorAll('input[data-field="' + key + '"]').forEach(radio => {
    radio.closest('.choice').classList.toggle('selected', radio.checked);
  });
  updateSelection();
  save();
  emit('select',{field:key});
}
$('answerForm').addEventListener('pointerdown', () => navigator.cancel());
$('answerForm').addEventListener('change', captureAnswer);
$('answerForm').addEventListener('input', captureAnswer);
$('answerForm').addEventListener('click', event => {
  if (foreignSession()) return;
  const practice = event.target.closest('[data-practice]');
  if (practice && questionType === 'written' && result) {
    const key = practice.dataset.practice;
    if (!FIELDS.some(f => f.key === key)) return;
    if (correctionOpen.has(key)) correctionOpen.delete(key); else correctionOpen.add(key);
    renderFields();
    save();
    return;
  }
  const toggle = event.target.closest('[data-unknown]');
  if (toggle && questionType === 'written' && question && !result) {
    const key = toggle.dataset.unknown;
    if (!FIELDS.some(f => f.key === key)) return;
    if (answers[key] === NOT_HEARD) answers[key] = writtenDrafts[key] || '';
    else { writtenDrafts[key] = answers[key] || ''; answers[key] = NOT_HEARD; }
    renderFields();
    updateSelection();
    save();
  }
  const review = event.target.closest('[data-review]');
  if (review && questionType === 'written' && result) {
    const field = result.fields.find(f => f.key === review.dataset.review);
    if (!field || field.isUnknown || field.autoCorrect) return;
    field.selfReviewed = !field.selfReviewed;
    field.isCorrect = field.selfReviewed;
    result.score = result.fields.filter(f => f.isCorrect).length;
    if (result.score === 4) wrongIds.delete(question.track.id);
    else wrongIds.add(question.track.id);
    save();
    renderStats();
    renderPoolInfo();
    renderFields();
    const amended = sessionHistory[sessionHistory.length-1];
    if (amended) archive?.add(amended);
    renderFeedback(false, false);
  }
});
$('answerForm').addEventListener('submit', submitQuestion);
// The cover is the play button. Only the cumulative wall in the archive room renders [data-listen], so practice audio is never interrupted from a round view.
$('archiveContent').addEventListener('click', event => {
  const button = event.target.closest('[data-listen]');
  if (!button || archive?.locked()) return;
  const track = catalog.tracks.find(t => t.id === button.dataset.listen);
  if (!track) return;
  if (audioContext === 'library' && audioTrack?.id === track.id && !audio.paused) audio.pause();
  else {
    if (audioContext !== 'library' || audioTrack?.id !== track.id) loadAudio(track, 'library');
    if (audio.ended) audio.currentTime = 0;
    void playAudio();
  }
});
window.addEventListener('museum:wall', updateListenButtons);
audio.addEventListener('play', updatePlaybackUI);
audio.addEventListener('pause', updatePlaybackUI);
audio.addEventListener('ended', updatePlaybackUI);
audio.addEventListener('waiting', () => {
  if (audioContext === 'practice') $('playStatus').textContent = '正在缓冲…';
});
audio.addEventListener('playing', updatePlaybackUI);
audio.addEventListener('error', () => {
  if (!audioTrack) return;
  if (audioContext === 'practice') $('playStatus').textContent = '加载失败 · 点击重试';
  toast('音频加载失败，请检查网络后重试。');
  stopPreview();
});
audio.addEventListener('loadedmetadata', () => {
  if (audioContext === 'practice') $('duration').textContent = timeText(audio.duration);
});
audio.addEventListener('timeupdate', () => {
  if (audioContext !== 'practice') return;
  $('currentTime').textContent = timeText(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) $('seekBar').value = Math.round(audio.currentTime / audio.duration * 1000);
});
document.addEventListener('keydown', event => {
  if (event.code !== 'Space' || !question || view !== 'practice') return;
  const tag = event.target.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'SUMMARY'].includes(tag)) return;
  event.preventDefault();
  togglePracticeAudio();
});

renderDecks();
renderStats();
resetPractice();

function course7TrackDetails(t) {
  if (t.deck !== 7 || !catalog.course7) return '';
  const albums = (t.albumIds || []).map(id => catalog.course7.albums.find(a => a.id === id)).filter(Boolean);
  return '<div class="course7-track-detail"><p>原文标题：' + escapeHTML(t.originalTitle) + '</p><p>本演唱者版本发行：<strong>' + (t.releaseYear ?? '现场版本未确认；歌曲首发 '+t.songReleaseYear) + '</strong> · 课程评分：<strong>' + t.year + '</strong>' + (t.releaseYear && t.releaseYear !== t.year ? '（登顶口径；不是发行年）' : '') + '</p>' + (albums.length ? '<p>关联专辑：' + albums.map(a => escapeHTML(a.title) + '（专辑 ' + a.year + '）').join('、') + '</p>' : '<p>课件未给出本曲明确的专辑收录关系；不推定专辑。</p>') + '</div>';
}
archive = createArchive({catalog,readLegacy:legacySnapshot,getState:()=>({question,result,externalPending:sharedPending(),queueRemainingIds:queue.remaining.map(t=>t.id)}),canWrite:()=>!foreignSession(),writable:catalogWritable,onImport:importLearningBackup,onYearStart:()=>{},describe:{cover:coverFor,missing:t=>MISSING[t?.id]||null,kinds:KIND,relations:RELATION,course7:course7TrackDetails,styleFor,sourceText,sourceLinks,timeText}});

function importLearningBackup(memory, data) {
  if (foreignSession() || !legacyWritable || !reportsWritable || !catalogWritable) throw Error('preserve original');
  const imported = canonicalLegacy(data.legacy, catalog.tracks);
  const mergeEntries = entries => [...new Map(entries.filter(validEntry).map(e => [e.eventId || JSON.stringify([e.id,e.time,e.fields]), e])).values()].sort((a,b) => String(a.time||'').localeCompare(String(b.time||'')));
  // Import is a merge: the current device wins if the same attempt or report was subsequently amended here.
  const nextHistory = mergeEntries([...(Array.isArray(imported?.history)?imported.history:[]), ...Object.values(memory.events).filter(e=>e.fields.length===4), ...history]).filter(e=>e.fields.length===4).slice(-1000);
  const nextMastery = [...new Map(mergeEntries([...(Array.isArray(imported?.masteryHistory)?imported.masteryHistory:[]), ...masteryHistory, ...nextHistory]).filter(e=>e.fields.length===4).map(e=>[e.id,e])).values()];
  const nextWrong = new Set([...canonicalIdsForImport(imported?.wrongIds), ...wrongIds]);
  for (const entry of nextMastery) { if(entry.fields.every(f=>f.isCorrect))nextWrong.delete(entry.id);else nextWrong.add(entry.id); }
  const importedReports = Array.isArray(data.reports?.reports) ? data.reports.reports.filter(r=>r&&typeof r.id==='string'&&Array.isArray(r.entries)).map(r=>canonicalReport(r,catalog.tracks)).map(r=>({...r,kind:r.kind==='year'?'year':'listen',entries:r.entries.filter(validEntry)})) : [];
  const nextReports = [...new Map([...importedReports,...reports].map(r=>[r.id,r])).values()].sort((a,b)=>String(a.endedAt||'').localeCompare(String(b.endedAt||'')) || a.id.localeCompare(b.id)).slice(-100);
  const nextLastReportId = nextReports.some(r=>r.id===lastReportId) ? lastReportId : nextReports.some(r=>r.id===data.reports?.lastReportId) ? data.reports.lastReportId : nextReports.at(-1)?.id || '';
  const nextSummary = lastSummary.length ? lastSummary : (Array.isArray(imported?.lastSummary)?imported.lastSummary.filter(e=>validEntry(e)&&e.fields.length===4):[]);
  const originals = Object.fromEntries([storageKey,reportKey,'fat-fish-music-memory-v2'].map(key=>[key,localStorage.getItem(key)]));
  const priorBackup = localStorage.getItem('fat-fish-music-before-import');
  // Keep the previous recovery point as well as a complete raw snapshot of this device before this import.
  if (priorBackup) localStorage.setItem('fat-fish-music-before-import-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),priorBackup);
  localStorage.setItem('fat-fish-music-before-import',JSON.stringify({version:2,reason:'before learning backup merge',originals}));
  const writes = [
    [storageKey,JSON.stringify({...legacySnapshot(),history:nextHistory,masteryHistory:nextMastery,wrongIds:[...nextWrong],lastSummary:nextSummary})],
    [reportKey,JSON.stringify({version:2,lastReportId:nextLastReportId,reports:nextReports})],
    ['fat-fish-music-memory-v2',JSON.stringify(memory)]
  ];
  const written=[];
  try { for(const [key,raw] of writes){localStorage.setItem(key,raw);written.push(key);} }
  catch (error) { for(const key of written.reverse()){try{if(originals[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,originals[key]);}catch{}}throw error; }
  history=nextHistory;masteryHistory=nextMastery;wrongIds=nextWrong;reports=nextReports;lastReportId=nextLastReportId;lastSummary=nextSummary;
  renderStats();renderPoolInfo();renderSessionList();
}
function canonicalIdsForImport(ids) {
  const canonical=canonicalLegacy({wrongIds:ids},catalog.tracks).wrongIds;
  return Array.isArray(canonical)?canonical.filter(id=>knownIds.has(id)):[];
}
function refreshStoredLearning() {
  const strict=foreignSession();
  const readStored=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch(error){if(strict)throw error;return fallback;}};
  const stored = canonicalLegacy(readStored(storageKey,legacySnapshot()),catalog.tracks);
  const savedReports = readStored(reportKey,{reports,lastReportId});
  const mergeEntries = entries => [...new Map(entries.filter(validEntry).map(e=>[e.eventId||JSON.stringify([e.id,e.time,e.fields]),e])).values()].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  if (stored && typeof stored==='object') {
    restoredLegacy=stored;
    selectedDecks=restoreDeckSelection(stored.decks,deckIds,stored.catalogDeckIds);
    wrongOnly=stored.wrongOnly===true;questionType=stored.questionType==='written'?'written':'choice';
    sessionLength=sessionLengths.includes(stored.sessionLength)?stored.sessionLength:'10';
    history=mergeEntries([...history,...(Array.isArray(stored.history)?stored.history:[])]).filter(e=>e.fields.length===4).slice(-1000);
    masteryHistory=[...new Map(mergeEntries([...masteryHistory,...(Array.isArray(stored.masteryHistory)?stored.masteryHistory:[]),...history]).filter(e=>e.fields.length===4).map(e=>[e.id,e])).values()];
    wrongIds=new Set([...wrongIds,...canonicalIdsForImport(stored.wrongIds)]);
    if(Array.isArray(stored.lastSummary))lastSummary=stored.lastSummary.filter(e=>validEntry(e)&&e.fields.length===4);
  }
  const latestReports=Array.isArray(savedReports.reports)?savedReports.reports.filter(r=>r&&typeof r.id==='string'&&Array.isArray(r.entries)).map(r=>canonicalReport(r,catalog.tracks)).map(r=>({...r,kind:r.kind==='year'?'year':'listen',entries:r.entries.filter(validEntry)})):[];
  reports=[...new Map([...reports,...latestReports].map(r=>[r.id,r])).values()].sort((a,b)=>String(a.endedAt||'').localeCompare(String(b.endedAt||''))||a.id.localeCompare(b.id)).slice(-100);
  lastReportId=reports.some(r=>r.id===savedReports.lastReportId)?savedReports.lastReportId:reports.at(-1)?.id||'';
  archive.reload(strict);reconcileHistory(archive.memory);
  renderDecks();renderStats();renderSessionList();
  pendingSession=stored?.session||null;
  return pendingSession;
}

function reconcileHistory(memory) {
  const recoveredEvents=Object.values(memory.events).filter(e=>validEntry(e)&&e.fields.length===4);
  history=[...new Map([...history,...recoveredEvents].map(e=>[e.eventId||JSON.stringify([e.id,e.time,e.fields]),e])).values()].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).slice(-1000);
  masteryHistory=[...new Map([...masteryHistory,...history].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).map(e=>[e.id,e])).values()];
  for(const entry of masteryHistory){if(entry.fields.every(f=>f.isCorrect))wrongIds.delete(entry.id);else wrongIds.add(entry.id);}
}
reconcileHistory(archive.memory);
{ const audit = catalog.audit; $('courseAuditSummary').textContent = audit ? '课件核对 · ' + audit.date + '：' + audit.decks + '讲 / ' + audit.slides + '页；' + audit.audio_objects + '个音频对象 + ' + audit.video_objects + '个视频音轨均已提取。跨讲同源合并后为' + audit.training_versions + '个版本，均按课件正常出题和计分。' : ''; }

function restorePending() {
  const pending=canonicalPending(pendingSession, catalog.tracks, sessionLength);
  if(pending?.sessionId && reports.some(r=>r.id===pending.sessionId)){pendingSession=null;return false;}
  // Year recall was retired. An unfinished year round is filed as an ended report so its answers stay in the records.
  if(pending?.sessionKind==='year'){const entries=(pending.sessionHistory||[]).filter(validEntry);if(entries.length){reports=[...reports,{id:typeof pending.sessionId==='string'?pending.sessionId:makeId(),kind:'year',startedAt:pending.sessionStartedAt||'',endedAt:new Date().toISOString(),reason:'interrupted',goal:Number(pending.sessionGoal)||entries.length,length:'year',rounds:null,entries,settings:null}].slice(-100);try{if(reportsWritable&&catalogWritable)localStorage.setItem(reportKey,JSON.stringify({version:2,lastReportId,reports}));}catch{}}pendingSession=null;return false;}
  if (!pending || !knownIds.has(pending.trackId) || !Array.isArray(pending.sessionHistory) || !Array.isArray(pending.sessionTargets)) return false;
  const t=catalog.tracks.find(t=>t.id===pending.trackId);
  sessionStarted=true; sessionId=typeof pending.sessionId==='string'?pending.sessionId:makeId();
  if(!readLease())claimSession(sessionId);
  sessionKind='listen'; sessionStartedAt=pending.sessionStartedAt||new Date().toISOString();
  sessionGoal=Number(pending.sessionGoal)||10;sessionTargets=new Set(pending.sessionTargets.filter(id=>knownIds.has(id)));
  focusedIds=Array.isArray(pending.focusedIds)?new Set(pending.focusedIds.filter(id=>knownIds.has(id))):null;
  sessionHistory=pending.sessionHistory.filter(e=>knownIds.has(e.id)&&Array.isArray(e.fields)&&e.fields.every(f=>f&&FIELDS.some(k=>k.key===f.key)&&typeof f.isCorrect==='boolean'));
  drawn=Number(pending.drawn)||1;sessionAnswered=sessionHistory.length;
  question=buildQuestion(t,currentPool(),catalog.tracks,catalog.styles);
  answers=pending.answers&&typeof pending.answers==='object'?{...pending.answers}:{};
  for (const {key} of FIELDS) {
    const saved = pending.options?.[key];
    if (Array.isArray(saved) && saved.length===4 && new Set(saved.map(o=>o?.value)).size===4 && saved.every(o=>o&&typeof o.value==='string'&&typeof o.label==='string')) {
      question.options[key] = [...saved];
      if (!saved.some(o=>o.value===String(t[key]))) {
        const index = saved.findIndex(o=>o.value!==answers[key]);
        question.options[key][index] = buildQuestion(t,currentPool(),catalog.tracks,catalog.styles).options[key].find(o=>o.value===String(t[key]));
      }
    }
    if (questionType==='choice' && answers[key]!==NOT_HEARD && !question.options[key].some(o=>o.value===answers[key])) delete answers[key];
  }
  writtenDrafts=pending.writtenDrafts||{};
  const lastEntry=sessionHistory.at(-1);
  result=pending.result&&Array.isArray(pending.result.fields)&&lastEntry?.id===t.id?{...pending.result,fields:lastEntry.fields}:null;
  if(result) {const current=history.find(e=>e.eventId===lastEntry.eventId);if(current)result.fields=current.fields;lastEntry.fields=result.fields;}
  correctionDrafts=pending.correctionDrafts||{};correctionOpen=new Set(pending.correctionOpen||[]);
  queue.remaining=(pending.queueIds||[]).map(id=>catalog.tracks.find(t=>t.id===id)).filter(Boolean);queue.cycle=pending.queueCycle||1;queue.roundSize=Number(pending.queueRoundSize)||sessionTargets.size;queue.lastId=pending.queueLastId||t.id;
  $('welcome').hidden=true;$('summarySection').hidden=true;$('questionSection').hidden=false;$('resumeSession').hidden=true;$('submitBar').hidden=!!result;
  $('writtenRule').hidden=questionType!=='written';$('uncertainNotice').hidden=!t.uncertainAudio;
  renderStage();
  $('answerTypeLabel').textContent=questionType==='written'?'填写题 · 自主回忆':'选择题 · 可选不知道';
  renderFields();updateSelection();updateProgress();if(result)renderFeedback(false,false);loadAudio(t,'practice');
  archive.setRound(sessionHistory.map(e=>e.id),sessionId);archive.sync();renderPoolInfo();emit('question',{restored:true});return true;
}
try { restorePending(); } catch { sessionStarted=false;question=null;result=null;toast('未完成训练暂不可恢复，已有历史记录仍保留。'); }
if (!catalogWritable) toast('合并前备份未能保存，原记录已保留。本页新记录暂不写入设备，请释放空间后刷新。');
rooms = createRooms({window,document,onRoute: next => {
  if (pendingTrainingAction) closeTrainingConfirmation(false);
  const leaving = rooms?.current.name === 'train' && next.name !== 'train';
  if(leaving){navigator.cancel();audio.pause();save();}
  if(['archive','history','report'].includes(next.name)&&archive.locked()) {toast('当前答案尚未揭示。请先继续训练，提交后再查阅图鉴。');next={name:'home',id:''};}
  // Records and the round report are one results page: the newest round on top, every earlier round below it.
  if(next.name==='history'){const latest=reports.find(r=>r.id===lastReportId)||reports.at(-1);if(latest)next={name:'report',id:latest.id};}
  if(next.name==='train'&&sessionStarted&&foreignSession()){toast('训练已在另一个窗口打开，点击继续可在此接续。');next={name:'home',id:''};}
  if(next.name==='train'&&!sessionStarted) next={name:'home',id:''};
  if(next.name==='train') {stopPreview();next.id=sessionId;view='practice';archive.scope('round');$('practiceView').hidden=true;}
  if(next.name==='report') {
    if(sessionStarted) {toast('请先完成或结束本轮训练，再查看总结。');return {name:'train',id:sessionId};}
    const report=reports.find(r=>r.id===next.id);
    if(report && !$('summarySection').dataset.reportId) { $('summarySection').dataset.reportId=report.id;finishSession(report.entries,report,false); }
    else if(report && $('summarySection').dataset.reportId!==report.id) { $('summarySection').dataset.reportId=report.id;finishSession(report.entries,report,false); }
    else if(!report && !$('summarySection').hidden && lastSummary.length) {} else if(!report) return {name:'home',id:''};
    archive.scope('round');archive.setRound((report?.entries||lastSummary).map(e=>e.id),next.id);archive.insights(report?.entries||lastSummary);
    renderSessionList(next.id);
  }
  if(next.name==='home') {$('practiceView').hidden=false;$('welcome').hidden=false;$('questionSection').hidden=!sessionStarted;renderDecks();renderPoolInfo();renderStats();}
  if(next.name==='archive') {view='library';archive.scope('all');$('archivePanel').open=true;}
  if(next.name==='history') renderSessionList();
  return next;
}});
$('resumeSession').onclick=()=>{if(sessionStarted)startSession();};
$('pauseFinish').addEventListener('click',()=>requestTrainingAction('finish'));
$('doneButton').addEventListener('click',()=>rooms.go('home'));
for(const id of ['archiveNav','homeArchiveButton','summaryArchiveButton']) $(id)?.addEventListener('click',()=>rooms.go('archive'));
for(const id of ['historyNav','homeHistoryButton']) $(id)?.addEventListener('click',()=>rooms.go('history'));
document.addEventListener('click',e=>{if(e.target.closest('[data-go-home]'))rooms.go('home');});
$('roomHome').addEventListener('click',()=>{save();rooms.go('home');});
$('brandHome').addEventListener('click',e=>{e.preventDefault();rooms.go('home');});
$('sessionList').addEventListener('click',e=>{const b=e.target.closest('[data-report]');if(b)rooms.go('report',b.dataset.report);});
window.addEventListener('pagehide',()=>{if(sessionStarted&&ownsSession())save();});
window.addEventListener('storage',e=>{
  if (![leaseKey,storageKey,reportKey,'fat-fish-music-memory-v2'].includes(e.key) && e.key!==null) return;
  if(e.key===leaseKey&&sessionStarted&&foreignSession()){
    leaseLost=true;navigator.cancel();audio.pause();rooms.go('home');toast('训练已在另一个窗口接续，本窗口已暂停。');
  }
  // An idle archive may have been open before the other tab even began its round. Keep it current too,
  // otherwise its next anchor/import/retry could replace the just-completed round with an older archive.
  if(!sessionStarted){try{refreshStoredLearning();}catch{toast('另一个窗口的最新记录暂时无法读取，请保留页面后重试。');}}
  archive.sync();
  if(sharedPending()){stopPreview();if(['archive','report','history'].includes(rooms.current.name))rooms.go('home');}
});
await bindUI({catalog,archive,rooms,getState:()=>({scopePool:currentPool().map(t=>t.id),question,result,answers,sessionStarted,sessionKind,sessionLength,sessionGoal,sessionHistory,sessionTargets,drawn,questionType,selectedDecks,verifiedOnly,scopeLabel:scopeLabel(),focused:!!focusedIds,wrongOnly,wrongIds:[...wrongIds],reports,lastReportId,queueRemainingIds:queue.remaining.map(t=>t.id),lastSummary,roundProgress:roundProgress(),history,audioContext,audioTrackId:audioTrack?.id||null}),actions:{start:()=>startSession(),continueRound:()=>startSession(),reviewWrong:()=>{wrongOnly=true;changeScope();startSession();},practiceDeck:id=>{selectedDecks=[id];changeScope();startSession();},setDecks:ids=>{selectedDecks=[...ids];changeScope();},togglePlay:()=>togglePracticeAudio(),replay:()=>$('replayButton').click(),seekBy:sec=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+sec));},next:()=>{const b=$('nextButton');if(b&&!b.disabled)b.click();},confirmFinish:()=>requestTrainingAction('finish'),confirmSkip:()=>requestTrainingAction('skip'),stopPreview}});
for(const state of ['play','pause','ended','error','waiting'])audio.addEventListener(state,()=>emit('audio',{state}));
rooms.initial();
