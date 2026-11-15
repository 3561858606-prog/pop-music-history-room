import { createRooms } from './rooms.js';
import { createArchive } from './archive-ui.js';
import { gradeWritten } from './written.js';
import { catalog } from './catalog.js';
import { createViewportNavigator } from './viewport.js';
import { appearancesFor, canonicalLegacy, canonicalPending, canonicalReport, backupBeforeCatalogMerge } from './track-model.js';
import { FIELDS, NOT_HEARD, hasAnswer, RandomQueue, buildQuestion, filterTracks, gradeQuestion, summarize, practiceWeight, weightedTrack, summarizeSongs, restoreDeckSelection } from './core.js';

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
try { writerId=sessionStorage.getItem('music-history-tab-id');if(!writerId){writerId='tab-'+Math.random().toString(36).slice(2);sessionStorage.setItem('music-history-tab-id',writerId);} } catch { writerId='tab-'+Math.random().toString(36).slice(2); }
const readLease=()=>{try{return JSON.parse(localStorage.getItem(leaseKey)||'null');}catch{return null;}};
function claimSession(id){try{localStorage.setItem(leaseKey,JSON.stringify({owner:writerId,id}));}catch{}}
function sharedPending(){if(!foreignSession())return false;try{const pending=JSON.parse(localStorage.getItem(storageKey)||'{}').session;return !!pending&&!pending.result;}catch{return false;}}
function foreignSession(){const lease=readLease();return !!lease&&lease.owner!==writerId;}
function ownsSession(){const lease=readLease();return !lease||lease.owner===writerId;}
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
const activeFields = () => sessionKind === 'year' ? FIELDS.filter(f => f.key === 'year') : FIELDS;
const sessionLengths = ['10', '20', 'all', 'coverage', 'endless'];
const usesRoundQueue = () => sessionLength === 'endless' || (sessionKind === 'listen' && trainingMode === 'random');
function roundProgress() {
  const size=queue.roundSize || sessionTargets.size;
  return {current:queue.cycle,completed:Math.max(0,queue.cycle-1)+(queue.cycle>0 && queue.remaining.length===0 && !!result ? 1 : 0),position:Math.max(0,size-queue.remaining.length),size};
}
const makeId = () => 'round-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
function updateProgress() {
  $('sessionProgress').textContent = sessionProgressText();
  $('questionSection').dataset.kind=sessionKind;
  $('answerIntroText').textContent=sessionKind==='year'?'听完后，回忆这段旋律所属的年份。':'听完后，给它补全四张名片。';
  $('trainingQuestionTitle').textContent=sessionKind==='year'?'这段旋律，属于哪一年？':'这一首，你认识吗？';
  $('trainingIdentity').textContent = sessionKind === 'year' ? '年份归位 · 主动回忆' : (questionType === 'written' ? '填写听辨' : '选择听辨') + ' · ' + (trainingMode === 'targeted' ? '薄弱项强化' : '随机训练');
  const rounds=roundProgress();
  $('roundProgress').hidden=!usesRoundQueue();
  $('roundProgress').textContent='第 '+rounds.current+' 轮 · 已走完 '+rounds.completed+' 轮';
  $('roundText').textContent=usesRoundQueue() ? '第 '+rounds.current+' 轮 · 本轮第 '+rounds.position+' / '+rounds.size+' 首' : sessionKind==='year' ? 'YEAR RECALL · 第 '+drawn+' 首' : 'TARGETED PRACTICE · 按掌握度加权';
  const numerator = sessionLength === 'endless' ? rounds.position : sessionLength === 'coverage' ? coveredSongs().size : sessionHistory.length;
  const denominator = sessionLength === 'endless' ? rounds.size : sessionGoal;
  $('sessionMeter').style.width = Math.min(100, denominator ? numerator / denominator * 100 : 0) + '%';
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
let trainingMode = 'random';
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
let verifiedOnly = false;
let wrongOnly = false;

try {
  const stored = canonicalLegacy(JSON.parse(localStorage.getItem(storageKey) || 'null'), catalog.tracks);
  if (stored && typeof stored === 'object') {
    restoredLegacy = stored;
    pendingSession = stored.session || null;
    selectedDecks = restoreDeckSelection(stored.decks, deckIds, stored.catalogDeckIds);
    verifiedOnly = stored.verifiedOnly === true;
    wrongOnly = stored.wrongOnly === true;
    questionType = stored.questionType === 'written' ? 'written' : 'choice';
    trainingMode = stored.trainingMode === 'targeted' ? 'targeted' : 'random';
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

function save() {
  try {
    if(foreignSession())return;
    if(!legacyWritable || !catalogWritable) throw Error('preserve original');
    localStorage.setItem(storageKey, JSON.stringify({
      ...restoredLegacy, decks: selectedDecks, catalogDeckIds: deckIds, verifiedOnly, wrongOnly, trainingMode, questionType, sessionLength, lastSummary, masteryHistory, wrongIds: [...wrongIds], history: history.slice(-1000), session: sessionStarted && question ? {sessionId,sessionKind,sessionStartedAt,focusedIds:focusedIds?[...focusedIds]:null,trackId:question.track.id,options:question.options,answers,writtenDrafts,result,sessionHistory,sessionGoal,sessionTargets:[...sessionTargets],drawn,sessionAnswered,correctionDrafts,correctionOpen:[...correctionOpen],queueIds:queue.remaining.map(t=>t.id),queueCycle:queue.cycle,queueRoundSize:queue.roundSize,queueLastId:queue.lastId} : null
    }));
  } catch { toast('训练记录未能保存，请保留页面并重试。'); }
}
function toast(text) {
  clearTimeout(toastTimer);
  $('toast').textContent = text;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 3800);
}
function currentPool() {
  if (sessionStarted && (sessionKind === 'year' || ['coverage','endless'].includes(sessionLength))) return catalog.tracks.filter(t => sessionTargets.has(t.id));
  return filterTracks(catalog.tracks, selectedDecks, { verifiedOnly, wrongOnly, wrongIds: [...wrongIds] }).filter(t => !focusedIds || focusedIds.has(t.id));
}
function renderDecks() {
  $('deckOptions').innerHTML = catalog.lectures.map(d => {
    const selected = selectedDecks.includes(d.id);
    return '<label class="deck-option' + (selected ? ' selected' : '') + '">' +
      '<input type="checkbox" name="deck" value="' + d.id + '"' + (selected ? ' checked' : '') + '>' +
      '<span class="deck-text"><strong>第' + d.id + '讲 · ' + escapeHTML(d.label) + '</strong><small>' +
      escapeHTML(d.period) + '</small></span><span class="deck-number"><b>' + d.count + '</b>段</span></label>';
  }).join('');
  $('questionType').value = questionType;
  $('trainingMode').value = trainingMode;
  $('sessionLength').value = sessionLength;
  $('verifiedOnly').checked = verifiedOnly;
  $('wrongOnly').checked = wrongOnly;
  $('uncertainFilterLabel').textContent = '跳过' + catalog.tracks.filter(t => t.uncertainAudio).length + '段标签存疑的音频';
  $('totalAudioCount').textContent = catalog.tracks.length + '段课程音频';
  $('catalogSummary').textContent = catalog.lectures.length + '份课件 · ' + catalog.tracks.length + '个曲目版本 · 含' + catalog.tracks.filter(t => t.sourceType === 'video').length + '段视频音轨';
  for(const el of $('deckOptions').querySelectorAll('input'))el.disabled=sessionStarted;
  for(const id of ['allDecks','verifiedOnly','wrongOnly','questionType','trainingMode','sessionLength'])$(id).disabled=sessionStarted;
  $('allDecks').setAttribute('aria-pressed', selectedDecks.length === deckIds.length ? 'true' : 'false');
}
function renderPoolInfo() {
  const pool = currentPool();
  $('poolCount').textContent = pool.length;
  $('wrongCount').textContent = wrongIds.size ? wrongIds.size + '首待复习 · 四项全对后移出错题' : '还没有错题，先开始一轮吧';
  $('startButton').disabled = !pool.length && !sessionStarted;
  $('startButton').innerHTML = sessionStarted ? '继续本轮训练 <span aria-hidden="true">↗</span>' : '开始听辨 <span aria-hidden="true">↗</span>';
  $('resumeSession').hidden = !sessionStarted;
  $('pauseFinish').hidden = !sessionStarted;
  $('startHint').textContent = (selectedDecks.length === deckIds.length ? '全部混合' :
    selectedDecks.length ? '第' + selectedDecks.slice().sort().join('、') + '讲' : '尚未选课件') +
    ' · ' + pool.length + '段音频 · ' + (sessionLength==='endless' ? '无尽轮回 · 每轮完整洗牌' : trainingMode === 'targeted' ? '按掌握度加权，允许重复' : '每轮完整洗牌，轮内不重复');
  $('modeHint').textContent = sessionLength==='endless' ? (trainingMode==='targeted' ? '每轮每曲只出现一次，薄弱曲目倾向于更早出现；整轮出完后重新洗牌，直到手动结束。' : '每轮覆盖当前范围全部曲目，轮内不重复，出完重新洗牌；手动结束后查看总结。') : trainingMode === 'targeted' ? '最近一次四项每错一项，抽中权重加1：全对1倍，全错5倍。未练过为1倍；答得更好后自动降低。' : '当前范围全部曲目按随机顺序逐一出现，出完再重新洗牌进入下一轮。';
  $('questionTypeHint').textContent = questionType === 'written' ? '四项全部填写或明确选择「不知道」后才能提交；提交后对照参考答案，可更正未识别的正确写法。' : '每项四个候选答案，另有“不知道”，不用靠猜。';
  $('welcomeDescription').textContent = questionType === 'written' ? '听音频，自己写出四条线索。可以反复重听，提交后揭晓参考答案。' : '一段原课件音频，四项独立选择。不确定时可选“不知道”，答案提交后揭晓。';
  $('showSummaryButton').hidden = (!lastSummary.length && !reports.length) || sessionStarted;
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
}
function stopAudio() {
  playAttempt++;
  audio.pause();
  audio.removeAttribute('src');
  audio.load();
  audioContext = null;
  audioTrack = null;
  $('waveform').classList.remove('playing');
  $('playIcon').textContent = '▶';
  $('playButton').setAttribute('aria-label', '播放当前歌曲');
}
function resetPractice() {
  $('resumeSession').hidden=true;
  archive?.reset();
  navigator.cancel();
  stopAudio();
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
  const empty = currentPool().length === 0;
  $('welcome').hidden = empty;
  $('emptyState').hidden = !empty;
  if (empty) renderEmpty();
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
  if (sessionStarted && sessionHistory.length) rememberReport('interrupted');
  sessionStarted = false;
  pendingSession = null;
  question = null;
  if (sessionHistory.length) lastSummary = [...sessionHistory];
  focusedIds = null;
  save();
  resetPractice();
  renderDecks();
  if (view === 'library') renderLibrary();
}
function scrollToQuestion() {
  navigator.goTo($('audioPlayer'), $('playButton'), true);
}
function startSession(kind = 'listen') {
  if (typeof kind !== 'string') kind = 'listen';
  if (sessionStarted && question) {
    if(foreignSession()){try{const latest=JSON.parse(localStorage.getItem(storageKey)||'{}').session;if(latest){pendingSession=latest;restorePending();}}catch{}}
    claimSession(sessionId);rooms?.go('train', sessionId);return;
  }
  const newId=makeId();claimSession(newId);
  resetPractice();
  sessionKind = kind;
  sessionId = newId;
  sessionStartedAt = new Date().toISOString();
  const pool = kind === 'year' ? catalog.tracks.filter(t => archive?.memory.records[t.id] && Number.isInteger(t.year) && (!focusedIds || focusedIds.has(t.id))) : currentPool();
  if (!pool.length) return toast('先完成一道听辨，再开始年份归位。');
  sessionTargets = new Set(pool.map(t => t.id));
  sessionGoal = sessionLength==='endless' ? 0 : ['all', 'coverage'].includes(sessionLength) ? pool.length : Number(sessionLength);
  sessionStarted = true;
  archive?.reset(sessionId);
  renderPoolInfo();
  nextQuestion();
  rooms?.go('train', sessionId);
}
function coveredSongs() { return new Set(sessionHistory.map(e => e.id)); }
function sessionComplete() {
  if(sessionLength==='endless')return false;
  return sessionLength === 'coverage' ? [...sessionTargets].every(id => coveredSongs().has(id)) : sessionHistory.length >= sessionGoal;
}
function sessionProgressText() {
  if(sessionLength==='endless')return '无尽轮回 · 已答 '+sessionHistory.length+' 题';
  return sessionLength === 'coverage' ? '已覆盖 ' + [...sessionTargets].filter(id => coveredSongs().has(id)).length + ' / ' + sessionGoal + ' 首 · 已答 ' + sessionHistory.length + ' 题' : '已完成 ' + sessionHistory.length + ' / ' + sessionGoal + ' 题';
}
function rememberReport(reason = 'completed') {
  const report = {id:sessionId || makeId(),kind:sessionKind,startedAt:sessionStartedAt,endedAt:new Date().toISOString(),reason,goal:sessionGoal,length:sessionLength,rounds:usesRoundQueue()?roundProgress():null,entries:JSON.parse(JSON.stringify(sessionHistory)),settings:{decks:[...selectedDecks],trainingMode,questionType,verifiedOnly,wrongOnly,sessionLength,focusedIds:focusedIds?[...focusedIds]:null}};
  reports = [...reports.filter(r => r.id !== report.id), report].slice(-100);
  lastReportId = report.id;
  try { if(!reportsWritable || !catalogWritable)throw Error('preserve original');localStorage.setItem(reportKey,JSON.stringify({version:2,lastReportId,reports})); } catch { toast('本轮报告暂未保存，请保留页面。已提交的歌曲记录仍在。'); }
  return report;
}
function renderSessionList() {
  $('sessionList').innerHTML = reports.length ? [...reports].reverse().map(r => { const stats=summarize(r.entries); return '<button class="session-record" type="button" data-report="'+escapeHTML(r.id)+'"><span>'+escapeHTML(new Date(r.endedAt).toLocaleString('zh-CN'))+'</span><strong>'+(r.kind==='year'?'年份归位':'四维听辨')+'</strong><span>'+stats.count+' 题 · '+stats.accuracy+'% · '+(r.reason==='completed'?'已完成':r.reason==='ended'?'手动结束':'提前归卷')+'</span><b>查看报告 ↗</b></button>'; }).join('') : '<div class="archive-empty"><h2>这里会留下每一轮练习。</h2><p>完成或结束一轮训练后，就能回看报告。</p></div>';
}
function finishSession(entries = sessionHistory, existingReport = null, navigate = true) {
  const own = entries === sessionHistory;
  if (own) existingReport = rememberReport(sessionLength==='endless' ? 'ended' : sessionComplete() ? 'completed' : 'interrupted');
  if (existingReport) { sessionKind=existingReport.kind; sessionId=existingReport.id; }

  if (entries === sessionHistory) lastSummary = [...entries];
  save();
  navigator.cancel();
  stopAudio();
  question = null;
  sessionStarted = false;
  save();
  releaseSession();
  $('questionSection').hidden = true;
  $('welcome').hidden = true;
  $('emptyState').hidden = true;
  $('summarySection').hidden = false;
  const stats = summarize(entries);
  const songs = summarizeSongs(entries);
  const weak = songs.filter(s => s.accuracy < 100);
  const unknownFields = entries.flatMap(e => e.fields).filter(f => f.isUnknown).length;
  $('summaryUnknown').textContent = unknownFields ? '本次共 ' + unknownFields + ' 项选择「不知道」，已纳入待巩固歌曲和针对训练权重。' : '';
  $('summarySubtitle').textContent = stats.count ? '本轮完成了 ' + stats.count + ' 题、接触了 ' + songs.length + ' 首课程曲目。' : '这轮还没有提交答案。准备好后，再听一首吧。';
  $('summaryStats').innerHTML = '<div><strong>' + stats.count + '</strong><span>完成题数</span></div><div><strong>' + (stats.count ? stats.accuracy + '%' : '—') + '</strong><span>四项正确率</span></div><div><strong>' + weak.length + '</strong><span>首待巩固</span></div>';
  $('summaryFields').innerHTML = FIELDS.map(f => { const pct = stats.count ? Math.round(stats.byField[f.key] / stats.count * 100) : 0; return '<div class="field-stat"><span>' + f.label + '</span><i><b style="width:' + pct + '%"></b></i><span>' + (stats.count ? pct + '%' : '—') + '</span></div>'; }).join('');
  $('summarySongs').innerHTML = weak.length ? weak.map(song => {
    const t = catalog.tracks.find(t => t.id === song.id);
    return '<article class="summary-song"><div><h4>' + escapeHTML(t.song) + '</h4>' + (t.versionLabel ? '<p class="version-label">' + escapeHTML(t.versionLabel) + '</p>' : '') + '<p>' + escapeHTML(t.artist) + ' · ' + t.year + '年 · ' + escapeHTML(styleFor(t).label) + '</p><p class="reinforce">继续巩固：' + song.missed.join('、') + '</p><small>本次练习 ' + song.attempts + ' 次 · 最近一次 ' + song.latestScore + (sessionKind==='year'?'/1':'/4') + (t.uncertainAudio ? ' · 音频对应关系尚待核对' : '') + '</small></div><strong>' + song.accuracy + '%<small>'+(sessionKind==='year'?'本次年份正确率':'本次四项正确率')+'</small></strong></article>';
  }).join('') : '<div class="summary-success">' + (stats.count ? (sessionKind==='year'?'这轮年份全部答对。隔一段时间再回忆，让记忆更稳。':'这轮四项全部答对！继续混合听辨，让记忆更稳。') : '提交四项答案后，这里会整理需要巩固的歌曲。') + '</div>';
  $('targetedReviewButton').hidden = !weak.length;
  $('summaryListDescription').textContent=sessionKind==='year'?'按本次年份正确率排序，保留本轮出现过的年份错误。':'按本次四项正确率排序，保留本轮出现过的错误。';
  $('targetedReviewButton').onclick = () => {
    focusedIds = new Set(weak.map(s => s.id));
    trainingMode = 'targeted';
    wrongOnly = false;
    renderDecks();
    save();
    startSession(sessionKind);
  };
  renderPoolInfo();
  archive?.setRound(entries.map(e=>e.id),sessionId);
  archive?.scope('round');
  archive?.insights(entries);
  $('summaryCorrect').innerHTML = songs.filter(song=>song.accuracy===100).length ? '<details><summary>本轮正确歌曲 · '+songs.filter(song=>song.accuracy===100).length+' 首</summary>'+songs.filter(song=>song.accuracy===100).map(song=>{const t=catalog.tracks.find(t=>t.id===song.id);return '<p>'+escapeHTML(t.song)+' · '+t.year+' · '+escapeHTML(t.artist)+(t.versionLabel?' · '+escapeHTML(t.versionLabel):'')+'</p>';}).join('')+'</details>' : '';
  $('summaryTitle').textContent = sessionKind==='year' ? '把年代，记得更清楚。' : '这一轮旋律，已经归卷。';
  if(existingReport?.length==='endless') $('summarySubtitle').textContent += ' 无尽轮回 · 已走完 '+(existingReport.rounds?.completed||0)+' 轮 · 手动结束。';
  else $('summarySubtitle').textContent += existingReport?.goal ? ' 计划 '+existingReport.goal+' '+(existingReport.length==='coverage'?'首全部覆盖':'题')+' · '+(existingReport.reason==='completed'?'完成本轮':'提前归卷')+'。' : '';
  $('summaryStats').innerHTML = $('summaryStats').innerHTML.replace('四项正确率',sessionKind==='year'?'年份正确率':'四项正确率');
  $('summaryFields').innerHTML = FIELDS.map(f => { const tested=entries.flatMap(e=>e.fields).filter(x=>x.key===f.key);const pct=tested.length?Math.round(tested.filter(x=>x.isCorrect).length/tested.length*100):null;return '<div class="field-stat"><span>'+f.label+'</span><i><b style="width:'+(pct||0)+'%"></b></i><span>'+(pct===null?'未测试':pct+'%')+'</span></div>'; }).join('');
  $('summarySection').dataset.reportId=existingReport?.id || sessionId;
  if(navigate) rooms?.go('report',existingReport?.id || sessionId);
  $('archivePanel').open=true;
  navigator.goTo($('summarySection'), $('summaryTitle'), true);
}
function nextQuestion() {
  if (pendingTrainingAction) return;
  if (!sessionStarted) return startSession();
  if (sessionComplete()) return finishSession();
  const pool = currentPool();
  const unseen = pool.filter(t => sessionTargets.has(t.id) && !coveredSongs().has(t.id));
  const drawPool = sessionLength === 'coverage' && (trainingMode === 'targeted' || sessionKind === 'year') && sessionHistory.length % 3 === 2 && unseen.length ? unseen : pool;
  const weakYears = sessionKind === 'year' ? drawPool.map(t => ({id:t.id,fields:Array(Math.min(4,Math.max(0,(archive.memory.records[t.id].fields.year?.n||0)-(archive.memory.records[t.id].fields.year?.c||0)))).fill({isCorrect:false})})) : masteryHistory;
  const roundPriority = sessionKind==='year' || trainingMode==='targeted' ? candidates=>weightedTrack(candidates,weakYears) : null;
  const track = sessionLength==='endless' ? queue.next(pool,roundPriority) : sessionKind === 'year' ? weightedTrack(drawPool, weakYears) : trainingMode === 'targeted' ? weightedTrack(drawPool, masteryHistory) : queue.next(sessionLength === 'coverage' && unseen.length ? unseen : pool);
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
  $('submitBar').hidden = false;
  $('uncertainNotice').hidden = !track.uncertainAudio;
  $('playerLabel').textContent = '神秘曲目 · 第 ' + drawn + ' 首';
  $('answerTypeLabel').textContent = sessionKind === 'year' ? '只测试年份 · 其他维度不计分' : questionType === 'written' ? '填写题 · 自主回忆' : '选择题 · 可选不知道';
  $('writtenRule').hidden = questionType !== 'written' || sessionKind === 'year';
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
  $('libraryList').innerHTML = '';
  scrollToQuestion();
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
  if (field === 'year') return question.track.yearBasis;
  if (field === 'song') return questionType === 'written' ? '可填写课件中的原文或对应的中韩译名' : '按课件曲名选择，原文与韩文供对照';
  return result ? question.track.styleBasis || '按课件最具体的归类选择' : '按课件最具体的归类选择';
}
function renderFields() {
  $('answerFields').innerHTML = activeFields().map(field => {
    const scored = result?.fields.find(f => f.key === field.key);
    if (questionType === 'written' && sessionKind !== 'year') return renderWrittenField(field, scored);
    let body = '<fieldset class="field-card"><legend><span class="number">' + field.number +
      '</span><strong>' + field.label + '</strong><small>' + field.ko + '</small></legend><p class="field-help">' +
      escapeHTML(helpFor(field.key)) + '</p><div class="choices">';
    body += question.options[field.key].map((option, index) => {
      const selected = answers[field.key] === option.value;
      const correct = scored && scored.correct === option.value;
      const wrong = scored && selected && !scored.isCorrect;
      const classes = ['choice', selected && 'selected', scored && 'disabled', correct && 'correct', wrong && 'wrong'].filter(Boolean).join(' ');
      const mark = correct ? '✓' : wrong ? '×' : '';
      return '<label class="' + classes + '"><input type="radio" name="' + field.key +
        '" data-field="' + field.key + '" value="' + escapeHTML(option.value) + '"' +
        (selected ? ' checked' : '') + (scored ? ' disabled' : '') + '>' +
        '<span class="choice-letter" aria-hidden="true">' + String.fromCharCode(65 + index) +
        '</span><span class="choice-text"><strong>' + escapeHTML(option.label) + '</strong><small>' +
        escapeHTML(option.sub) + '</small></span>' + (mark ? '<span class="result-mark" aria-label="' +
          (correct ? '正确选项' : '选择错误') + '">' + mark + '</span>' : '') + '</label>';
    }).join('');
    const unknown = answers[field.key] === NOT_HEARD;
    body += '<label class="choice unknown-choice' + (unknown ? ' selected' : '') + (scored ? ' disabled' : '') + '"><input type="radio" name="' + field.key + '" data-field="' + field.key + '" value="' + NOT_HEARD + '"' + (unknown ? ' checked' : '') + (scored ? ' disabled' : '') + '><span class="choice-letter" aria-hidden="true">?</span><span class="choice-text"><strong>不知道</strong><small>本项记为待巩固</small></span></label>';
    if (scored) body += '</div><p class="field-result' + (scored.isCorrect ? '' : ' incorrect') + '">' +
      (scored.isCorrect ? '✓ 本项正确' : scored.isUnknown ? '不知道 · 记入待巩固，绿色选项是参考答案' : '× 本项答错，绿色选项是正确答案') + '</p>';
    else body += '</div>';
    return body + '</fieldset>';
  }).join('');
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
  $('selectionCount').textContent = (questionType === 'written' && sessionKind !== 'year' ? '已填写 / 标记 ' : '已选 ') + count + ' / ' + fields.length + ' 项';
  $('submitButton').disabled = !!result || count !== fields.length;
}

function sourceLinks(track) {
  return (track.sources || []).map(source => '<a href="' + escapeHTML(source.url) +
    '" target="_blank" rel="noopener noreferrer">' + escapeHTML(source.label) + ' ↗</a>').join('');
}
function submitQuestion(event) {
  event.preventDefault();
  if (!question || result || pendingTrainingAction) return;
  if (activeFields().some(f => !hasAnswer(answers[f.key]))) {
    toast(sessionKind==='year'?'先选择一个年份，或选「不知道」。':'还差几项，请逐项作答或选择「不知道」后再提交。');
    return;
  }
  result = sessionKind === 'year' ? {score:answers.year===String(question.track.year)?1:0,total:1,fields:[{key:'year',label:'年份',chosen:answers.year,correct:String(question.track.year),isCorrect:answers.year===String(question.track.year),isUnknown:answers.year===NOT_HEARD}]} : questionType === 'written' ? gradeWritten(question.track, answers, catalog.styles, catalog.tracks) : gradeQuestion(question.track, answers);
  sessionAnswered++;
  const t = question.track;
  const prior = wrongIds.has(t.id);
  if (sessionKind !== 'year') { if (result.score === 4) wrongIds.delete(t.id); else wrongIds.add(t.id); }
  const entry = { sessionId, sessionKind, eventId: 'answer-'+Date.now()+'-'+Math.random(), id: t.id, time: new Date().toISOString(), questionType:sessionKind==='year'?'year':questionType, fields: result.fields };
  if (sessionKind !== 'year') { history.push(entry); masteryHistory = [...masteryHistory.filter(h => h.id !== t.id), entry]; }
  sessionHistory.push(entry);
  archive?.add(entry);
  updateProgress();
  history = history.slice(-1000);
  save();
  renderStats();
  renderPoolInfo();
  renderFields();
  $('submitBar').hidden = true;
  $('playerLabel').textContent = (t.uncertainAudio ? '课件标注：' : '') + t.song;
  renderFeedback(prior);
}
function renderFeedback(prior = false, move = true) {
  const t = question.track;
  const missed = result.fields.filter(f => !f.isCorrect).map(f => f.label);
  const heading = sessionKind === 'year' ? (result.score ? '✓ 这段旋律，回到了正确的年代。' : '把它记在 '+t.year+' 年。') : result.score === 4 ? '四条线索，都连上了。' : result.score === 0 ? '四条线索，留给下一轮再巩固。' : '认出了一部分，继续补上关联。';
  const coach = sessionKind === 'year' ? '本题只记录年份记忆，不推断歌名、音乐家或风格是否掌握。' : result.score === 4 ?
    (prior ? '这首已从错题中移出。大肥鱼陪你继续，宝宝。' : '歌曲名称、年份、音乐家和风格都答对啦。下一首继续，宝宝。') :
    '这次需要巩固：' + missed.join('、') + '。这首已加入错题，下次四项全对就会移出。';
  const style = styleFor(t);
  $('feedback').innerHTML = '<div class="feedback-head"><div class="score-badge">' + result.score +
    '<small>/'+result.total+'</small></div><div><h3>' + heading + '</h3><p>' + coach +
    '</p></div></div><div class="answer-sheet"><p class="source-line">' + escapeHTML(sourceText(t, true)) + '</p><h3>' + escapeHTML(t.song) +
    '</h3><p class="song-sub">' + escapeHTML(t.songKo) + '</p>' + (t.versionLabel ? '<p class="version-label">' + (t.sourceType === 'video' ? '视频音轨 · ' : '') + escapeHTML(t.versionLabel) + '</p>' : '') + '<div class="answer-tags"><span>' +
    escapeHTML(t.artist) + ' · ' + escapeHTML(t.artistRole) + '</span><span>' + t.year +
    '年</span><span>' + escapeHTML(style.label) + ' · ' + escapeHTML(style.ko) +
    '</span></div>' + (result.fields.some(f => f.key === 'year' && f.correct !== String(t.year)) ? '<p class="note-text">此题按旧题库评分；当前年份已统一为 ' + t.year + ' 年，原成绩保留。</p>' : '') + (t.uncertainAudio ? '<div class="notice" style="margin:15px 0 0"><strong>音频对应关系尚待确认</strong><p>' +
      escapeHTML(t.discrepancy) + '</p></div>' : '') + course7TrackDetails(t) + '<p class="year-basis">年份口径：' + escapeHTML(t.yearBasis) + '</p><p class="note-text">' + escapeHTML(t.note) +
    '</p><div class="revealed-year"><span>已归档</span><strong>'+t.year+'</strong></div>'+(archive?.related(t)||'')+'<div class="source-links">' + sourceLinks(t) + '</div></div><div class="next-row"><p>本次已答 ' +
    sessionAnswered + ' 题 · 本轮已收录 '+coveredSongs().size+' 首</p><button id="nextButton" type="button" class="primary">' + (sessionComplete() ? '完成训练 · 看总结' : '下一首') + ' <span aria-hidden="true">→</span></button></div>';
  $('feedback').hidden = false;
  const revealedQuestion=question, revealedResult=result;
  $('nextButton').addEventListener('click',()=>{if(question===revealedQuestion&&result===revealedResult)nextQuestion();});
  if (move) navigator.goTo($('feedback'), undefined, true);
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
    $('playIcon').textContent = '▶';
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
    $('playIcon').textContent = playing ? 'Ⅱ' : '▶';
    $('playButton').setAttribute('aria-label', playing ? '暂停当前歌曲' : '播放当前歌曲');
    $('playStatus').textContent = audio.ended ? '播放结束 · 可重听' : playing ? '正在播放' : '已暂停';
  }
  document.querySelectorAll('[data-listen]').forEach(button => {
    const active = audioContext === 'library' && audioTrack?.id === button.dataset.listen && playing;
    button.classList.toggle('playing', active);
    button.textContent = active ? 'Ⅱ 暂停' : '▶ 播放';
    button.setAttribute('aria-label', (active ? '暂停 ' : '播放 ') + button.dataset.song);
  });
}
function course7TrackDetails(t) {
  if (t.deck !== 7) return '';
  const albums = (t.albumIds || []).map(id => catalog.course7.albums.find(a => a.id === id)).filter(Boolean);
  return '<div class="course7-track-detail"><p>原文标题：' + escapeHTML(t.originalTitle) + '</p><p>本演唱者版本发行：<strong>' + (t.releaseYear ?? '现场版本未确认；歌曲首发 '+t.songReleaseYear) + '</strong> · 课程评分：<strong>' + t.year + '</strong>' + (t.releaseYear && t.releaseYear !== t.year ? '（登顶口径；不是发行年）' : '') + '</p>' + (albums.length ? '<p>关联专辑：' + albums.map(a => escapeHTML(a.title) + '（专辑 ' + a.year + '）').join('、') + '</p>' : '<p>课件未给出本曲明确的专辑收录关系；不推定专辑。</p>') + '</div>';
}
function renderCourse7Notes(query) {
  const box = $('course7Notes');
  if (!selectedDecks.includes(7) || archive?.locked()) { box.innerHTML = ''; return; }
  const k = catalog.course7, kind = $('libraryKind').value || 'all';
  const match = value => JSON.stringify(value).toLocaleLowerCase().includes(query);
  const link = url => url ? '<a href="' + escapeHTML(url) + '" target="_blank" rel="noopener noreferrer">来源 ↗</a>' : '来源：第七讲PPT正文';
  const albums = k.albums.filter(match), backgrounds = k.background.filter(match);
  let out = '<section class="course7-notes"><p class="eyebrow">LECTURE 07 / ROCK &amp; SOUL</p><h2>正文、专辑与声音，分别记清。</h2><p>20个课件音频版本 · 5张相关专辑。听辨评分与学习记录继续使用原有题目。</p>';
  if (['all','album'].includes(kind)) out += '<h3>课件专辑索引</h3><div class="course7-grid">' + albums.map(a => '<article class="track-card album-study"><img src="' + a.cover + '" alt="' + escapeHTML(a.title) + '原创学习封面示意，非唱片原封面" width="480" height="480" loading="lazy"><div><span class="pill">专辑 · ' + a.year + ' · 第' + a.page + '页</span><h3>' + escapeHTML(a.title) + '</h3><p>' + escapeHTML(a.artist) + '</p><p>原文：' + escapeHTML(a.original) + '</p><p>' + escapeHTML(a.note) + '</p><p>' + link(a.source) + '</p><small>本站原创学习封面示意 · 非唱片原封面</small></div></article>').join('') + '</div>';
  if (['all','background'].includes(kind)) {
    out += '<h3>背景知识</h3>' + backgrounds.map(b => '<details class="track-card"><summary>' + escapeHTML(b.title) + ' · 第' + b.pages.join('、') + '页</summary><p>' + escapeHTML(b.text) + '</p></details>').join('');
    out += '<details class="track-card"><summary>' + k.quiz.length + '张知识自测卡 · 先回忆，再展开答案</summary><p>知识自测与音频四维评分分开，不写入听辨成绩。</p>' + k.quiz.filter(match).map(q => '<details class="course7-question"><summary>' + escapeHTML(q.question) + '</summary><p>' + escapeHTML(q.answer) + '</p></details>').join('') + '</details>';
    out += '<details class="track-card"><summary>校正与待核实映射 · 保留课件原文</summary>' + k.corrections.filter(match).map(c => '<div class="course7-question"><p>第' + c.page + '页原文：' + escapeHTML(c.original) + '</p><p>校正／核对：' + escapeHTML(c.normalized) + '</p><p>' + escapeHTML(c.reason) + ' ' + link(c.source) + '</p></div>').join('') + '</details>';
    out += '<details class="track-card"><summary>听辨相关课件摘录与媒体来源</summary>' + k.slides.map(s => '<details class="course7-question"><summary>第' + s.page + '页</summary><p class="slide-original">' + escapeHTML(s.text) + '</p></details>').join('') + '<p>' + escapeHTML(k.rights) + '</p></details>';
  }
  box.innerHTML = out + '</section>';
}
function renderLibrary() {
  if (archive?.locked()) { $('course7Notes').innerHTML = ''; $('libraryList').innerHTML = '<p>请先提交当前题目，再查阅歌曲资料。</p>'; return; }
  const query = $('searchInput').value.trim().toLocaleLowerCase();
  renderCourse7Notes(query);
  const audit = catalog.audit;
  $('courseAuditSummary').textContent = audit ? '课件核对 · ' + audit.date + '：' + audit.decks + '讲 / ' + audit.slides + '页；' + audit.audio_objects + '个音频对象 + ' + audit.video_objects + '个视频音轨均已提取。跨讲同源合并后为' + audit.training_versions + '个版本。' + audit.unresolved_audio_labels + '段原音频标签与课件有冲突，仍待确认；可在首页勾选跳过。' : '';
  const pool = filterTracks(catalog.tracks, selectedDecks);
  const mediaFilter = $('libraryKind').value || 'all';
  const tracks = pool.filter(t => {
    const style = styleFor(t);
    return ['all','audio'].includes(mediaFilter) && [t.artist, t.artistKo, t.song, t.songKo, t.year, t.releaseYear || '', t.originalTitle || '', ...(t.albumIds || []).map(id=>catalog.course7.albums.find(a=>a.id===id)?.title || ''), t.versionLabel || '', t.sourceType === 'video' ? '视频音轨' : '', style.label, style.ko, style.sub, ...(t.aliases || []), ...(t.artistAliases || [])]
      .join(' ').toLocaleLowerCase().includes(query);
  });
  const reference = selectedDecks.includes(7) ? catalog.course7 : null;
  const matchesReference = rows => (rows || []).filter(r=>JSON.stringify(r).toLocaleLowerCase().includes(query)).length;
  $('libraryCount').textContent = mediaFilter==='album' ? matchesReference(reference?.albums)+'张专辑' : mediaFilter==='background' ? matchesReference(reference?.background)+'组背景' : tracks.length+'段音频';
  $('libraryList').hidden = !['all','audio'].includes(mediaFilter);
  $('libraryList').innerHTML = tracks.length ? tracks.map(t => {
    const style = styleFor(t);
    return '<article class="track-card"><div class="track-top"><span class="track-order">' +
      String(catalog.tracks.indexOf(t) + 1).padStart(2, '0') + '</span><div class="track-info"><h3>' +
      escapeHTML(t.song) + '</h3><p class="song-sub">' + escapeHTML(t.songKo) +
      '</p>' + (t.versionLabel ? '<p class="version-label">' + (t.sourceType === 'video' ? '视频音轨 · ' : '') + escapeHTML(t.versionLabel) + '</p>' : '') + '<div class="track-meta"><span>' + escapeHTML(t.artist) + '</span><i>·</i><span>' +
      t.year + '年</span><i>·</i><span>' + escapeHTML(style.label) + '</span></div><p class="track-source">' +
      escapeHTML(sourceText(t)) + ' · ' + timeText(t.duration) + (t.audioEdit ? ' · 已剪辑音乐段' : '') + ' · 音乐家角色：' + escapeHTML(t.artistRole) +
      '</p>' + (t.uncertainAudio ? '<span class="warning-mini">⚑ 音频标签与课件不一致 · 需要核对</span>' : '') +
      '</div><button class="listen-button" type="button" data-listen="' + t.id + '" data-song="' +
      escapeHTML(t.song) + '" aria-label="播放 ' + escapeHTML(t.song) + '">▶ 播放</button></div><details><summary>' +
      (t.discrepancy ? '查看课件说明与标签差异' : '查看课件说明与关联考点') +
      '</summary>' + course7TrackDetails(t) + '<p class="year-basis">年份口径：' + escapeHTML(t.yearBasis) + '</p><p>' + escapeHTML(t.note) + '</p><div class="source-links">' + sourceLinks(t) + '</div></details></article>';
  }).join('') : '<div class="no-search">没有找到匹配的曲目，试试换个关键词或课件范围。</div>';
  updatePlaybackUI();
}
function setView(next) { rooms?.go(next === 'library' ? 'library' : 'home'); }

$('deckOptions').addEventListener('change', () => {
  selectedDecks = [...$('deckOptions').querySelectorAll('input:checked')].map(input => Number(input.value));
  changeScope();
});
$('allDecks').addEventListener('click', () => { selectedDecks = selectedDecks.length === deckIds.length ? [] : [...deckIds]; changeScope(); });
$('verifiedOnly').addEventListener('change', event => { verifiedOnly = event.target.checked; changeScope(); });
$('wrongOnly').addEventListener('change', event => { wrongOnly = event.target.checked; changeScope(); });
$('practiceTab').addEventListener('click', () => setView('practice'));
$('libraryTab').addEventListener('click', () => setView('library'));
$('startButton').addEventListener('click', startSession);
$('finishButton').addEventListener('click', () => requestTrainingAction('finish'));
$('restartButton').addEventListener('click', () => { const previous=reports.find(r=>r.id===sessionId); if(previous?.settings){const opts=previous.settings;selectedDecks=restoreDeckSelection(opts.decks,deckIds,deckIds);questionType=opts.questionType==='written'?'written':'choice';trainingMode=opts.trainingMode==='targeted'?'targeted':'random';sessionLength=opts.sessionLength;verifiedOnly=!!opts.verifiedOnly;wrongOnly=!!opts.wrongOnly;focusedIds=opts.focusedIds?new Set(opts.focusedIds):null;} renderDecks();startSession(sessionKind); });
$('showSummaryButton').addEventListener('click', () => { const report=reports.find(r=>r.id===lastReportId); if(report) rooms.go('report',report.id); else {sessionKind='listen';finishSession(lastSummary);} });
$('questionType').addEventListener('change', event => { questionType = event.target.value; changeScope(); });
$('trainingMode').addEventListener('change', event => { trainingMode = event.target.value; changeScope(); });
$('sessionLength').addEventListener('change', event => { sessionLength = event.target.value; changeScope(); });
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
  if (questionType === 'choice' || sessionKind === 'year') $('answerFields').querySelectorAll('input[data-field="' + key + '"]').forEach(radio => {
    radio.closest('.choice').classList.toggle('selected', radio.checked);
  });
  updateSelection();
  save();
}
$('answerForm').addEventListener('pointerdown', () => navigator.cancel());
$('answerForm').addEventListener('change', captureAnswer);
$('answerForm').addEventListener('input', captureAnswer);
$('answerForm').addEventListener('click', event => {
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
$('searchInput').addEventListener('input', renderLibrary);
$('libraryKind').addEventListener('change', renderLibrary);
$('libraryList').addEventListener('click', event => {
  const button = event.target.closest('[data-listen]');
  if (!button) return;
  const track = catalog.tracks.find(t => t.id === button.dataset.listen);
  if (!track) return;
  if (audioContext === 'library' && audioTrack?.id === track.id && !audio.paused) audio.pause();
  else {
    if (audioContext !== 'library' || audioTrack?.id !== track.id) loadAudio(track, 'library');
    if (audio.ended) audio.currentTime = 0;
    void playAudio();
  }
});
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

$('waveform').innerHTML = Array.from({ length: 76 }, (_, i) => {
  const height = 5 + ((i * 17 + i * i * 3) % 26);
  return '<i style="--height:' + height + 'px;--speed:' + (0.45 + (i % 6) * 0.13) +
    's;--delay:-' + (i % 9) * 0.15 + 's"></i>';
}).join('');
renderDecks();
renderStats();
resetPractice();

archive = createArchive({catalog,readLegacy:()=>({...restoredLegacy,history,masteryHistory,lastSummary}),getState:()=>({question,result,externalPending:sharedPending()}),canWrite:()=>!foreignSession(),writable:catalogWritable,onImport:m=>{reconcileHistory(m);save();renderStats();renderPoolInfo();},onYearStart:()=>startSession('year')});

function reconcileHistory(memory) {
  const recoveredEvents=Object.values(memory.events).filter(e=>validEntry(e)&&e.fields.length===4);
  history=[...new Map([...history,...recoveredEvents].map(e=>[e.eventId||JSON.stringify([e.id,e.time,e.fields]),e])).values()].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).slice(-1000);
  masteryHistory=[...new Map([...masteryHistory,...history].sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))).map(e=>[e.id,e])).values()];
  for(const entry of masteryHistory){if(entry.fields.every(f=>f.isCorrect))wrongIds.delete(entry.id);else wrongIds.add(entry.id);}
}
reconcileHistory(archive.memory);

function restorePending() {
  const pending=canonicalPending(pendingSession, catalog.tracks, sessionLength);
  if(pending?.sessionId && reports.some(r=>r.id===pending.sessionId)){pendingSession=null;return false;}
  if (!pending || !knownIds.has(pending.trackId) || !Array.isArray(pending.sessionHistory) || !Array.isArray(pending.sessionTargets)) return false;
  const t=catalog.tracks.find(t=>t.id===pending.trackId);
  sessionStarted=true; sessionId=typeof pending.sessionId==='string'?pending.sessionId:makeId();
  if(!readLease())claimSession(sessionId);
  sessionKind=pending.sessionKind==='year'?'year':'listen'; sessionStartedAt=pending.sessionStartedAt||new Date().toISOString();
  sessionGoal=sessionLength==='endless'?0:Number(pending.sessionGoal)||10;sessionTargets=new Set(pending.sessionTargets.filter(id=>knownIds.has(id)));
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
    if ((questionType==='choice' || sessionKind==='year') && answers[key]!==NOT_HEARD && !question.options[key].some(o=>o.value===answers[key])) delete answers[key];
  }
  writtenDrafts=pending.writtenDrafts||{};
  const lastEntry=sessionHistory.at(-1);
  result=pending.result&&Array.isArray(pending.result.fields)&&lastEntry?.id===t.id?{...pending.result,fields:lastEntry.fields}:null;
  if(result) {const current=history.find(e=>e.eventId===lastEntry.eventId);if(current)result.fields=current.fields;lastEntry.fields=result.fields;}
  correctionDrafts=pending.correctionDrafts||{};correctionOpen=new Set(pending.correctionOpen||[]);
  queue.remaining=(pending.queueIds||[]).map(id=>catalog.tracks.find(t=>t.id===id)).filter(Boolean);queue.cycle=pending.queueCycle||1;queue.roundSize=Number(pending.queueRoundSize)||sessionTargets.size;queue.lastId=pending.queueLastId||t.id;
  $('welcome').hidden=true;$('summarySection').hidden=true;$('questionSection').hidden=false;$('resumeSession').hidden=false;$('submitBar').hidden=!!result;
  $('writtenRule').hidden=questionType!=='written'||sessionKind==='year';$('uncertainNotice').hidden=!t.uncertainAudio;
  $('playerLabel').textContent=result?t.song:'神秘曲目 · 第 '+drawn+' 首';
  $('answerTypeLabel').textContent=sessionKind==='year'?'只测试年份 · 其他维度不计分':questionType==='written'?'填写题 · 自主回忆':'选择题 · 可选不知道';
  renderFields();updateSelection();updateProgress();if(result)renderFeedback(false,false);loadAudio(t,'practice');
  archive.setRound(sessionHistory.map(e=>e.id),sessionId);archive.sync();renderPoolInfo();return true;
}
try { restorePending(); } catch { sessionStarted=false;question=null;result=null;toast('未完成训练暂不可恢复，已有历史记录仍保留。'); }
if (!catalogWritable) toast('合并前备份未能保存，原记录已保留。本页新记录暂不写入设备，请释放空间后刷新。');
rooms = createRooms({window,document,onRoute: next => {
  if (pendingTrainingAction) closeTrainingConfirmation(false);
  const leaving = rooms?.current.name === 'train' && next.name !== 'train';
  if(leaving){navigator.cancel();audio.pause();save();}
  if(['archive','library','history','report'].includes(next.name)&&archive.locked()) {toast('当前答案尚未揭示。请先继续训练，提交后再查阅资料。');next={name:'home',id:''};}
  if(next.name==='train'&&sessionStarted&&foreignSession()){toast('训练已在另一个窗口打开，点击继续可在此接续。');next={name:'home',id:''};}
  if(next.name==='train'&&!sessionStarted) next={name:'home',id:''};
  if(next.name==='train') {next.id=sessionId;view='practice';archive.scope('round');$('practiceView').hidden=true;}
  if(next.name==='report') {
    if(sessionStarted) {toast('请先完成或结束本轮训练，再查看总结。');return {name:'train',id:sessionId};}
    const report=reports.find(r=>r.id===next.id);
    if(report && !$('summarySection').dataset.reportId) { $('summarySection').dataset.reportId=report.id;finishSession(report.entries,report,false); }
    else if(report && $('summarySection').dataset.reportId!==report.id) { $('summarySection').dataset.reportId=report.id;finishSession(report.entries,report,false); }
    else if(!report && !$('summarySection').hidden && lastSummary.length) {} else if(!report) return {name:'home',id:''};
    archive.scope('round');archive.setRound((report?.entries||lastSummary).map(e=>e.id),next.id);archive.wall();archive.insights(report?.entries||lastSummary);
    $('archivePanel').open=true;
  }
  if(next.name==='home') {$('practiceView').hidden=false;$('welcome').hidden=false;$('questionSection').hidden=!sessionStarted;renderDecks();renderPoolInfo();renderStats();}
  if(next.name==='archive') {archive.scope('all');$('archivePanel').open=true;}
  if(next.name==='library') {view='library';$('libraryView').hidden=false;renderLibrary();}
  if(next.name==='history') renderSessionList();
  return next;
}});
$('resumeSession').onclick=()=>{if(sessionStarted)startSession(sessionKind);};
$('pauseFinish').addEventListener('click',()=>requestTrainingAction('finish'));
$('doneButton').addEventListener('click',()=>rooms.go('home'));
for(const id of ['archiveNav','homeArchiveButton','summaryArchiveButton']) $(id).addEventListener('click',()=>rooms.go('archive'));
for(const id of ['historyNav','homeHistoryButton']) $(id).addEventListener('click',()=>rooms.go('history'));
$('roomHome').addEventListener('click',()=>{save();rooms.go('home');});
$('brandHome').addEventListener('click',e=>{e.preventDefault();rooms.go('home');});
$('archiveRecallButton').addEventListener('click',()=>startSession('year'));
$('sessionList').addEventListener('click',e=>{const b=e.target.closest('[data-report]');if(b)rooms.go('report',b.dataset.report);});
window.addEventListener('pagehide',()=>{if(sessionStarted&&ownsSession())save();});
window.addEventListener('storage',e=>{if(e.key===leaseKey&&sessionStarted&&foreignSession()){navigator.cancel();audio.pause();rooms.go('home');toast('训练已在另一个窗口接续，本窗口已暂停。');}if(e.key===leaseKey||e.key===storageKey){archive.sync();if(sharedPending()){$('libraryList').innerHTML='';if(['archive','library','report','history'].includes(rooms.current.name))rooms.go('home');}}});
rooms.initial();
