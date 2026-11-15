// 听辨：标签纸面。出题、判定、记忆都用 v3 原来的模块（core.js / memory.js），这里只有界面。
// 这一页不加载 WebGL。动画只有三处：声槽前进、红笔订正、全对时刻下一段。
import {FIELDS, NOT_HEARD, RandomQueue, buildQuestion, filterTracks, gradeQuestion, summarize} from '../../../v3/core.js';
import * as M from './model.js';
import {gradeWritten, checkField} from './names.js';
import {nameHTML, optionAliasesHTML, storyHTML} from './reading.js';
import {createAudio} from './audio.js';
import {flatDisc} from './flat.js';
import {createWaveform} from './waveform.js';
import {wordAnswerHTML, createWordPeek} from './word-peek.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const clock = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export function createTrain(root, ctx) {
  const peeks = createWordPeek(root);
  const playback = createAudio();
  const audio = playback.element;
  const queue = new RandomQueue();
  let round = null, wave = null, waveView = null, raf = 0, operating = false, saveError = null;
  let tail = Promise.resolve(), retryAction = null, saving = 0, savedAt = '';
  const complete = a => FIELDS.every(f => typeof a[f.key] === 'string' && a[f.key].trim());
  const snapshot = () => ({version: 2, id: round.id, revision: round.revision, state: 'active',
    scope: round.scope, size: round.size, questionType: round.questionType, startedAt: round.startedAt,
    entries: round.done.map(d => ({...d.entry, cut: d.cut, ...(d.fix ? {fix: d.fix} : {})})), cuts: [...round.cuts.values()],
    trackId: round.question.track.id, options: round.question.options, eventId: round.question.eventId,
    answers: {...round.answers}, drafts: {...round.drafts}, phase: round.phase, col: round.col,
    queueIds: queue.remaining.map(t => t.id), queueLastId: queue.lastId, queueCycle: queue.cycle,
    audioTime: playback.position() || 0});
  function saveUI() {
    const n = root.querySelector('.save-state'); if (!n) return;
    n.dataset.error = saveError ? '1' : '0';
    n.querySelector('span').textContent = saveError ? saveError.message + ' 当前内容仍留在此页，请重试。' : saving ? '正在保存…' : savedAt ? '已保存在此浏览器 · ' + savedAt : '准备保存…';
    n.querySelector('button').hidden = !saveError;
    n.querySelector('button').textContent = saveError?.name === 'ConflictError' ? '保留草稿并载入最新进度' : '重试保存';
    root.querySelectorAll('[data-act=next],[data-act=end]').forEach(b => { b.disabled = operating; });
    root.querySelectorAll('[data-field]').forEach(input => { input.disabled = operating || round?.answers[input.dataset.field] === NOT_HEARD; });
    const submit = root.querySelector('.submit'); if (submit) submit.disabled = operating || !round || !complete(round.answers);
  }
  function enqueue(work) {
    saving++; saveUI();
    const task = tail.then(work);
    tail = task.catch(() => {});
    return task.finally(() => { saving--; saveUI(); });
  }
  async function persist(data, entry = null) {
    const saved = await M.saveRound({...data, revision: round.revision}, entry);
    round.revision = saved.revision; savedAt = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); if (!saveError || retryAction === saveDraft || entry || data.state === 'finished') saveError = null;
    return saved;
  }
  function saveDraft() {
    if (!round || operating) return;
    const data = snapshot();
    enqueue(() => persist(data)).catch(error => { if (!saveError || retryAction === saveDraft) { saveError = error; retryAction = saveDraft; } saveUI(); });
  }
  async function start(scope, type = M.prefs.questionType) {
    await tail;
    const pool = filterTracks(M.catalog.tracks, scope);
    if (!pool.length) throw Error('请至少选择一讲。');
    queue.reset();
    round = {id: M.uid('round'), revision: 0, startedAt: new Date().toISOString(), questionType: type === 'written' ? 'written' : 'choice',
      scope: [...scope], pool, size: M.sizeFor(pool.length), done: [], question: null, answers: {}, drafts: {}, phase: 'answer', col: 0, cuts: new Map()};
    saveError = null; savedAt = ''; setQuestion(); render();
    await enqueue(() => persist(snapshot())).catch(error => { saveError = error; retryAction = saveDraft; saveUI(); });
  }
  function setQuestion() {
    const track = queue.next(round.pool);
    round.question = round.questionType === 'written' ? {track, options: {}} : buildQuestion(track, round.pool, M.catalog.tracks, M.catalog.styles);
    round.question.eventId = M.uid('answer');
    round.answers = {}; round.drafts = {}; round.phase = 'answer'; round.col = 0;
    playback.load(track); playback.play();
  }
  async function next() {
    if (!round || operating) return;
    if (round.done.length >= round.size) return finish();
    setQuestion(); render(); saveDraft();
  }
  async function submit() {
    if (!round || operating || round.phase !== 'answer' || !complete(round.answers)) return;
    operating = true; saveUI();
    await tail;
    const q = round.question;
    const result = round.questionType === 'written' ? gradeWritten(q.track, round.answers, M.catalog.styles, M.catalog.tracks) : gradeQuestion(q.track, round.answers);
    const entry = {sessionId: round.id, sessionKind: 'v8-proto', eventId: q.eventId, id: q.track.id,
      time: new Date().toISOString(), questionType: round.questionType, fields: result.fields};
    const cut = M.previewAnswer(entry), previous = round.cuts.get(q.track.id);
    const data = snapshot(); data.phase = 'feedback'; data.entries.push({...entry, cut});
    const allCuts = new Map(round.cuts); allCuts.set(q.track.id, {id: q.track.id, before: previous ? previous.before : cut.before, after: cut.after});
    data.cuts = [...allCuts.values()];
    try {
      await enqueue(() => persist(data, entry));
      round.cuts = allCuts; round.done.push({track: q.track, result, cut, entry, fix: fixFor(result)}); round.phase = 'feedback';
      render();
    } catch (error) { saveError = error; retryAction = submit; }
    finally { operating = false; saveUI(); }
  }
  async function finish() {
    if (!round || operating) return;
    operating = true; saveUI(); await tail;
    const data = snapshot(); data.state = 'finished'; data.time = new Date().toISOString();
    data.reason = round.done.length >= round.size ? 'completed' : 'early';
    try {
      const saved = await enqueue(() => persist(data));
      hideSheet(false); playback.stop(); cancelAnimationFrame(raf); round = null;
      if (!saved.entries.length) return ctx.exit();
      ctx.finish(saved);
    } catch (error) { saveError = error; retryAction = finish; }
    finally { operating = false; saveUI(); }
  }
  async function recoverConflict() {
    operating = true; saveUI(); await tail;
    try {
      await M.store.archiveDraft(snapshot()); // 先保留冲突草稿，成功后才载入另一页的进度。
      await M.refreshRecords();
      const saved = M.roundById(round.id);
      if (!saved) throw Error('未找到这轮记录，请导出备份后重试。');
      saveError = null;
      if (saved.state === 'active') restore(saved);
      else { playback.stop(); round = null; ctx.finish(saved); }
    } catch (error) { saveError = error; retryAction = recoverConflict; }
    finally { operating = false; saveUI(); }
  }
  function restore(saved) {
    const t = M.byId.get(saved.trackId);
    if (!t || !Array.isArray(saved.queueIds) || !Array.isArray(saved.scope)) return false;
    queue.remaining = saved.queueIds.map(id => M.byId.get(id)).filter(Boolean);
    queue.lastId = saved.queueLastId; queue.cycle = saved.queueCycle || 1;
    const done = saved.entries.map(e => ({entry: e, track: M.byId.get(e.id), cut: e.cut || {before: [0,0,0,0], after: M.lanesOf(e.id)}, fix: e.fix || null,
      result: {fields: e.fields, score: e.fields.filter(f => f.isCorrect).length}})).filter(d => d.track);
    round = {...saved, pool: filterTracks(M.catalog.tracks, saved.scope), done,
      question: {track: t, options: saved.options || {}, eventId: saved.eventId || M.uid('answer')},
      answers: saved.answers || {}, drafts: saved.drafts || {}, cuts: new Map((saved.cuts || []).map(c => [c.id,c]))};
    playback.load(t, saved.audioTime || 0); savedAt = new Date(saved.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    saveError = null; render(); return true; // 恢复后由用户点播放，避免自动播放限制。
  }

  /* ---------- 每首音频的真实振幅包络，点击 / 拖动可定位 ---------- */
  function drawWave() {
    if (!wave?.isConnected) return;
    waveView?.draw();
    const duration = waveView?.duration() || round?.question?.track.duration || 0;
    const time = root.querySelector('.g-time');
    if (time) time.textContent = clock(playback.position()) + ' / ' + clock(duration);
  }
  const tick = () => { drawWave(); raf = !audio.paused && wave?.isConnected ? requestAnimationFrame(tick) : 0; };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); syncPlay(); };
  const syncPlay = () => {
    const b = root.querySelector('.g-play'); if (b) { b.dataset.on = audio.paused ? '0' : '1'; b.setAttribute('aria-label', audio.paused ? '播放' : '暂停'); }
    const n = root.querySelector('.audio-state'); if (n) { n.textContent = playback.message(); n.dataset.error = playback.failed() ? '1' : '0'; }
  };
  playback.on(kick);
  for (const ev of ['seeked', 'loadedmetadata', 'durationchange', 'ended']) audio.addEventListener(ev, kick);
  const toggle = () => audio.paused || playback.failed() ? playback.play() : playback.pause();
  const seek = t => { playback.seekTo(t, waveView?.duration()); drawWave(); };

  /* ---------- 画面 ---------- */
  function head() {
    const n = round.done.length + (round.phase === 'answer' ? 1 : 0);
    return `<header class="tr-top">
        <button class="tr-back" data-act="back">← 盘面</button>
        <div class="tr-count"><span class="tr-type">${round.questionType === 'written' ? '填空' : '选择'}</span>第 <b>${n}</b> / ${round.size} 首${round.size > 20 ? `<span class="tr-bar" aria-hidden="true"><i style="--v:${round.done.length / round.size}"></i></span>` : ''}<span class="tr-dots" aria-hidden="true" ${round.size > 20 ? 'hidden' : ''}>${Array.from({length: round.size > 20 ? 0 : round.size}, (_, i) => `<i data-s="${i < round.done.length ? (round.done[i].result.score === 4 ? 'ok' : 'miss') : i === n - 1 ? 'now' : ''}"></i>`).join('')}</span></div>
        <div class="tr-right"><button class="tr-cards" data-act="cards" aria-expanded="${ys.open}" aria-controls="yearSheet">年份卡片<kbd>Y</kbd></button><button class="tr-end" data-act="end">结束本轮</button></div>
      </header>
      <div class="groove">
        <button class="g-play" data-act="play" data-on="0" aria-label="播放"></button>
        <canvas class="g-wave" role="slider" tabindex="0" aria-label="音频波形与播放位置" aria-valuemin="0" aria-orientation="horizontal" aria-describedby="waveHint"></canvas>
        <span class="g-time">0:00</span>
      </div><p class="wave-hint" id="waveHint">点击或拖动波形调进度<span class="wave-status" role="status"></span><button data-act="retry-wave" hidden>重新加载波形</button></p><p class="audio-state" role="status"></p>
      <div class="save-state" role="status"><span></span><button data-act="retry-save" hidden>重试保存</button></div>`;
  }
  function render() {
    if (!round) return;
    peeks.hide();
    cancelAnimationFrame(raf); raf = 0;
    root.dataset.phase = round.phase;
    root.innerHTML = `<div class="tr">${head()}${round.phase === 'answer' ? answerHTML() : feedbackHTML()}</div>`;
    peeks.sync();
    wave = root.querySelector('.g-wave');
    waveView?.destroy();
    waveView = createWaveform(wave, {track: round.question.track, arrowSeek: false,
      duration: () => audio.duration, position: () => playback.position(),
      onSeek: seek, onCommit: saveDraft, onToggle: toggle,
      onStatus(state) {
        const label = root.querySelector('.wave-status'), retry = root.querySelector('[data-act=retry-wave]');
        if (label) label.textContent = state === 'loading' ? ' · 波形加载中…' : state === 'error' ? ' · 波形暂未载入，仍可点击调进度' : '';
        if (retry) retry.hidden = state !== 'error';
      }
    });
    drawWave(); kick();
    if (round.phase === 'answer') focusCol(round.col);
    else afterFeedback();
    if (ys.open) renderSheet();
    saveUI();
  }
  function answerHTML() {
    const q = round.question;
    if (round.questionType === 'written') return writtenHTML();
    return `<p class="tr-status" id="trStatus" aria-live="polite"></p>
      <div class="cols">${FIELDS.map((f, ci) => `
        <div class="col" data-key="${f.key}" data-col="${ci}" role="radiogroup" aria-label="${M.FIELD_NAMES[f.key]}">
          <div class="col-h" aria-hidden="true"><i>${f.number}</i>${M.FIELD_NAMES[f.key]}</div>
          ${q.options[f.key].map((o, i) => `<button type="button" role="radio" aria-checked="false" data-v="${esc(o.value)}"><kbd>${i + 1}</kbd><span><b>${esc(f.key === 'year' ? o.value : o.label)}</b>${optionAliasesHTML(f.key, o)}</span></button>`).join('')}
          <button type="button" role="radio" aria-checked="false" class="unknown" data-v="${NOT_HEARD}"><kbd>0</kbd><span>没听出</span></button>
        </div>`).join('')}
      </div>
      <footer class="tr-foot"><span class="keys">1—4 选择 · 0 没听出 · ←→ 换列 · 空格 播放 · Enter 提交</span><button class="submit" data-act="submit" disabled>提交<kbd>Enter</kbd></button></footer>`;
  }
  function writtenHTML() {
    return `<p class="tr-status" id="trStatus" aria-live="polite"></p>
      <div class="cols written-cols">${FIELDS.map((f, ci) => {
        const unknown = round.answers[f.key] === NOT_HEARD;
        return `<div class="col" data-key="${f.key}" data-col="${ci}">
          <label class="col-h" for="written-${f.key}"><i>${f.number}</i>${M.FIELD_NAMES[f.key]}</label>
          <input id="written-${f.key}" class="written-answer" data-field="${f.key}" type="text" maxlength="200"
            value="${esc(unknown ? round.drafts[f.key] || '' : round.answers[f.key] || '')}" aria-label="填写${M.FIELD_NAMES[f.key]}"
            autocomplete="off" autocapitalize="off" spellcheck="false" ${f.key === 'year' ? 'inputmode="numeric"' : ''} ${unknown ? 'disabled' : ''}
            placeholder="${f.key === 'year' ? '四位年份' : '填写' + M.FIELD_NAMES[f.key]}">
          <button class="written-unknown" data-unknown="${f.key}" aria-pressed="${unknown}">${unknown ? '已标记没听出 · 继续填写' : '没听出'}<kbd>0</kbd></button>
        </div>`; }).join('')}</div>
      <p class="written-rule">接受课程中的名称、别名和中韩译名，忽略大小写及标点；年份需准确。空白项按 0 标记「没听出」，已有文字中的数字正常输入。</p>
      <footer class="tr-foot"><span class="keys">←→ / Tab 换项 · 空白项 0 没听出 · Enter 提交 · Shift + ←→ 选文字</span><button class="submit" data-act="submit" disabled>提交<kbd>Enter</kbd></button></footer>`;
  }
  function updateAnswer() {
    const missing = FIELDS.filter(f => !String(round.answers[f.key] || '').trim());
    root.querySelectorAll('.col').forEach((col, ci) => {
      col.dataset.active = ci === round.col ? '1' : '0'; col.dataset.done = String(round.answers[col.dataset.key] || '').trim() ? '1' : '0';
      for (const b of col.querySelectorAll('[role=radio]')) b.setAttribute('aria-checked', String(round.answers[col.dataset.key] === b.dataset.v));
    });
    const st = root.querySelector('#trStatus'), sb = root.querySelector('.submit');
    if (st && round.questionType === 'written') st.textContent = missing.length ? '还差 ' + missing.map(f => M.FIELD_NAMES[f.key]).join('、') + '；可填课程原文或中韩译名。' : '四项都填了，按 Enter 提交';
    else if (st) st.innerHTML = missing.length
      ? `<span class="tr-now">按 <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> 选「${M.FIELD_NAMES[FIELDS[round.col].key]}」</span>还差 ${missing.map(f => M.FIELD_NAMES[f.key]).join('、')}`
      : '四项都选了，按 <kbd>Enter</kbd> 提交';
    if (sb) sb.disabled = operating || !!missing.length;
  }
  function choose(ci, value) {
    if (operating) return;
    const key = FIELDS[ci].key; round.answers[key] = value;
    const nextCol = [...FIELDS.keys()].map(i => (ci + 1 + i) % 4).find(i => !round.answers[FIELDS[i].key]);
    round.col = nextCol ?? ci;
    updateAnswer(); saveDraft();
    if (nextCol === undefined) root.querySelector('.submit')?.focus({preventScroll: true});
    else if (root.contains(document.activeElement) && document.activeElement.closest('.col')) focusCol(round.col);
  }
  function focusCol(ci) {
    round.col = ci; updateAnswer();
    const col = root.querySelector(`.col[data-col="${ci}"]`);
    (col?.querySelector('input:not(:disabled)') || col?.querySelector('.written-unknown') || col?.querySelector('[aria-checked=true]') || col?.querySelector('[role=radio]'))?.focus({preventScroll: true});
  }
  function writtenUnknown(ci, restore = false, advance = false) {
    const key = FIELDS[ci].key, wasUnknown = round.answers[key] === NOT_HEARD;
    if (restore && wasUnknown) round.answers[key] = round.drafts[key] || '';
    else if (!wasUnknown) { round.drafts[key] = round.answers[key] || ''; round.answers[key] = NOT_HEARD; }
    const unknown = round.answers[key] === NOT_HEARD;
    const input = root.querySelector(`[data-field="${key}"]`), button = root.querySelector(`[data-unknown="${key}"]`);
    input.value = unknown ? round.drafts[key] || '' : round.answers[key]; input.disabled = unknown;
    button.setAttribute('aria-pressed', String(unknown));
    button.innerHTML = `${unknown ? '已标记没听出 · 继续填写' : '没听出'}<kbd>0</kbd>`;
    const next = advance ? [...FIELDS.keys()].map(i => (ci + 1 + i) % 4).find(i => !String(round.answers[FIELDS[i].key] || '').trim()) : ci;
    round.col = next ?? ci; updateAnswer(); saveDraft();
    if (next === undefined) root.querySelector('.submit')?.focus({preventScroll: true});
    else focusCol(next);
  }

  const optionLabel = (key, value) => value === NOT_HEARD ? '没听出' : key === 'style' ? (M.catalog.styles.find(s => s.id === value)?.label || value) : value;
  function feedbackHTML() {
    const d = round.done[round.done.length - 1], t = d.track, g = M.ringOf.get(t.id), band = M.bands[g.band], cover = M.coverOf(t), story = M.storyOf(t);
    const wrong = d.result.fields.filter(f => !f.isCorrect), mates = M.spokeMates(t).slice(0, 6), last = round.done.length >= round.size;
    const grew = d.cut.after.some((v, i) => v > d.cut.before[i] + .004);
    return `<div class="fb" data-all="${wrong.length ? 0 : 1}">
        <div class="fb-main">
          <p class="fb-verdict" aria-live="polite">${wrong.length ? verdictText(d) : '四项全对' + (grew ? '，这一圈往前刻了一段' : '')}</p>
          <div class="fb-year">${t.year}</div>
          <h2>${nameHTML(t, 'song', M.titleOf(t))}</h2>
          <div class="fb-meta name-meta"><p>${nameHTML(t, 'artist')}</p><p>${nameHTML(t, 'style')}</p><p>${M.lectureIds(t).map(id => '第 ' + id + ' 讲').join('、')}</p></div>
          <ul class="fb-rows">${d.result.fields.map(f => f.isCorrect
            ? `<li data-ok="1"><span class="k">${M.FIELD_NAMES[f.key]}</span><span class="is">${esc(optionLabel(f.key, f.correct))}</span><span class="tick" aria-label="对">✓</span></li>`
            : fixRowHTML(d, f)).join('')}</ul>
          ${wrong.length ? `<p class="fix-rule">看一眼红笔圈出的答案，开始写时它会被盖住；点遮挡处可单词查看 1.2 秒，同一时间只显示一个词。凭记忆写一遍，按 Enter 核对。写错要重写；也可以不订正，直接下一首。</p>` : ''}
          ${storyHTML(story, 'fb-story')}
        </div>
        <aside class="fb-side">
          ${cover ? `<img class="fb-cover" data-shape="${cover.shape}" src="${cover.url}" alt="${esc(t.song)} 的封面" width="${cover.w}" height="${cover.h}"><p class="fb-cover-caption">${esc(M.coverLabel(cover))}</p>` : ''}
          <div class="fb-where">
            <div class="fb-disc" id="fbDisc"></div>
            <div><p class="fb-pos"><b>${band.label} 带</b><b>${t.year % 10} 号辐</b></p>
            ${mates.length ? `<p class="fb-mates">同一条辐线：${[...new Map(mates.map(o => [o.year + o.song, o])).values()].map(o => o.year + ' ' + esc(o.song)).join('、')}</p>` : ''}</div>
          </div>
          <dl class="fb-lanes" aria-label="这一圈的四道刻纹">${M.KEYS.map((k, i) => `<div><dt>${M.FIELD_NAMES[k]}</dt><dd><span class="lane-bar" style="--v:${d.cut.before[i]}" data-to="${d.cut.after[i]}"></span></dd></div>`).join('')}</dl>
        </aside>
        <footer class="tr-foot"><span class="keys">${wrong.length ? '订正框里 Enter 核对 · 框外 Enter 继续' : '空格 再听 · Enter 继续'}</span><button class="next" data-act="next" data-pending="${pendingFix(d) ? 1 : 0}">${nextLabel(d, last)}<kbd>Enter</kbd></button></footer>
      </div>`;
  }

  /* ---------- 当场订正：看一眼 → 盖住 → 凭记忆写一遍 → 核对，写错重写，可以跳过 ----------
     订正不改成绩、不进记忆统计；只记在这一轮里，结果页会标出订正过的项。 */
  const PEN = '<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 22 C6 8 40 3 62 4 C88 6 97 14 94 23 C90 35 52 38 30 36 C12 34 4 28 10 17" pathLength="1"/></svg>';
  const fixFor = result => { const w = result.fields.filter(f => !f.isCorrect); return w.length ? Object.fromEntries(w.map(f => [f.key, {state: 'todo', tries: 0}])) : null; };
  const pendingFix = d => d.fix ? Object.values(d.fix).filter(x => x.state !== 'done').length : 0;
  const nextLabel = (d, last) => (pendingFix(d) ? '不订正，' : '') + (last ? '看这一轮' : '下一首');
  const verdictText = d => { const n = pendingFix(d), all = Object.keys(d.fix || {}).length;
    return n ? `订正 ${d.result.fields.filter(f => !f.isCorrect).map(f => M.FIELD_NAMES[f.key]).join('、')}${n < all ? ` · 还差 ${n} 项` : ''}` : `订正完成 · ${all} 项都凭记忆写对了`; };
  function fixRowHTML(d, f) {
    const fx = d.fix?.[f.key] || {state: 'todo', tries: 0}, done = fx.state === 'done', ph = f.key === 'year' ? '写出四位年份' : '写出' + M.FIELD_NAMES[f.key];
    return `<li data-ok="0" data-key="${f.key}" data-fix="${fx.state}">
      <span class="k">${M.FIELD_NAMES[f.key]}</span><span class="was"><s>${esc(optionLabel(f.key, f.chosen))}</s></span>
      <span class="is pen"><span class="ans">${wordAnswerHTML(optionLabel(f.key, f.correct))}</span>${PEN}</span>
      <div class="fix">${done
        ? `<span class="fix-ok"><b>✓</b> 已订正：${esc(fx.text || '')}${fx.tries > 1 ? `<small>写了 ${fx.tries} 次</small>` : ''}</span>`
        : `<input data-fix="${f.key}" type="text" maxlength="200" enterkeyhint="done" autocomplete="off" autocapitalize="off" spellcheck="false" ${f.key === 'year' ? 'inputmode="numeric"' : ''}
            placeholder="${ph}" aria-label="订正${M.FIELD_NAMES[f.key]}：凭记忆写一遍，按 Enter 核对">
           <button class="fix-check" data-act="fix" data-key="${f.key}">核对</button>
           <span class="fix-msg" role="status">${fx.tries ? `不对，再看一眼，重写一遍（已写 ${fx.tries} 次）` : ''}</span>`}</div></li>`;
  }
  function checkFix(key) {
    peeks.hide();
    const d = round?.done[round.done.length - 1]; if (!d?.fix?.[key] || round.phase !== 'feedback') return;
    const row = root.querySelector(`.fb-rows li[data-key="${key}"]`), input = row?.querySelector('input'), fx = d.fix[key];
    if (!input) return;
    if (!input.value.trim()) { input.focus(); return; }
    fx.tries++;
    if (checkField(d.track, key, input.value, M.catalog.styles, M.catalog.tracks)) {
      fx.state = 'done'; fx.text = input.value.trim();
      row.dataset.fix = 'done'; row.classList.remove('typing');
      row.querySelector('.fix').innerHTML = `<span class="fix-ok"><b>✓</b> 已订正：${esc(fx.text)}${fx.tries > 1 ? `<small>写了 ${fx.tries} 次</small>` : ''}</span>`;
      const nextInput = root.querySelector('.fb-rows input[data-fix]');
      (nextInput || root.querySelector('.next'))?.focus({preventScroll: true});
    } else {
      fx.state = 'retry'; row.dataset.fix = 'retry';
      input.value = ''; row.classList.remove('typing');
      row.querySelector('.fix-msg').textContent = `不对，再看一眼，重写一遍（已写 ${fx.tries} 次）`;
      input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake');
      input.focus();
    }
    const v = root.querySelector('.fb-verdict'); if (v) v.textContent = verdictText(d);
    const nb = root.querySelector('.next'); if (nb) { nb.dataset.pending = pendingFix(d) ? '1' : '0'; nb.firstChild.textContent = nextLabel(d, round.done.length >= round.size); }
    peeks.sync(); saveDraft();
  }
  function afterFeedback() {
    const d = round.done[round.done.length - 1];
    const mini = flatDisc({detail: false, digits: true, focus: d.track.id, title: `${d.track.year} 在盘上的位置`});
    root.querySelector('#fbDisc')?.replaceChildren(mini.svg);
    // 小盘先显示旧的刻纹，再刻到新的
    mini.cut(d.track.id, d.cut.before, 1);
    setTimeout(() => { mini.cut(d.track.id, d.cut.after, ctx.reduced() ? 1 : 900);
      for (const n of root.querySelectorAll('.fb-lanes .lane-bar')) n.style.setProperty('--v', n.dataset.to); }, ctx.reduced() ? 0 : 420);
    const firstFix = root.querySelector('.fb-rows input[data-fix]');
    (firstFix && !matchMedia('(pointer:coarse)').matches ? firstFix : root.querySelector('.next'))?.focus({preventScroll: true});
  }

  /* ---------- 年份卡片：做题时随时翻看 ----------
     打开、翻看、关闭都不碰题目、已选答案、出题顺序和成绩。
     当前这首还没提交时，只放本轮已经答过的歌；提交之后才能看累计（与 v3 的防剧透规则一致）。 */
  const ys = {open: false, tab: 'round', opener: null, el: null};
  function sheetEl() {
    if (ys.el) return ys.el;
    const el = ys.el = document.createElement('aside');
    el.className = 'ys'; el.id = 'yearSheet'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '年份卡片');
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      if (e.target.closest('[data-ys=close]') || e.target === el.querySelector('.ys-scrim')) return hideSheet();
      const t = e.target.closest('[data-tab]'); if (t && !t.disabled) { ys.tab = t.dataset.tab; renderSheet(); el.querySelector(`[data-tab="${ys.tab}"]`)?.focus(); }
    });
    el.addEventListener('keydown', e => {   // 焦点留在卡片里
      if (e.key !== 'Tab') return;
      const f = [...el.querySelectorAll('button:not(:disabled),[tabindex="0"]')]; if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { f[0].focus(); e.preventDefault(); }
    });
    return el;
  }
  function renderSheet() {
    if (!round) return;
    const el = sheetEl(), locked = round.phase === 'answer';
    if (locked) ys.tab = 'round';
    const roundIds = [...new Set(round.done.map(d => d.track.id))], justId = !locked ? round.done[round.done.length - 1]?.track.id : null;
    const hidden = locked ? round.question.track.id : null;   // 当前这首绝不出现
    const ids = (ys.tab === 'all' ? M.tracks.filter(t => M.hasRecord(t.id)).map(t => t.id) : roundIds).filter(id => id !== hidden);
    const set = new Set(ids), body = [];
    for (const b of M.bands) {
      const years = new Map();
      for (const id of b.ids) if (set.has(id)) { const t = M.byId.get(id); if (!years.has(t.year)) years.set(t.year, []); years.get(t.year).push(t); }
      if (!years.size) continue;
      body.push(`<section><h3><b>${b.label}</b><span>${[...years.values()].reduce((n, a) => n + a.length, 0)} 首</span></h3><div class="ys-grid">${[...years].map(([y, list]) => `
        <article class="yc"><header><span class="yc-year">${y}</span><span class="yc-spoke">${y % 10} 号辐</span></header>
          <ul>${list.map(t => { const c = M.coverOf(t), l = M.lanesOf(t.id), miss = round.done.findLast(d => d.track.id === t.id)?.result.fields.filter(f => !f.isCorrect).map(f => M.FIELD_NAMES[f.key]);
            return `<li ${t.id === justId ? 'data-just' : ''}>${c ? `<img data-shape="${c.shape}" src="${c.url}" alt="" loading="lazy">` : '<i class="yc-noimg"></i>'}
              <div><b>${nameHTML(t, 'song', M.titleOf(t))}</b><span>${nameHTML(t, 'artist')} · ${nameHTML(t, 'style')}</span>${miss?.length ? `<em>本轮订正：${miss.join('、')}</em>` : ''}</div>
              <span class="c-lanes" role="img" aria-label="刻纹 ${Math.round(l.reduce((a, v) => a + v, 0) * 25)}%">${l.map(v => `<span style="--v:${v}"></span>`).join('')}</span></li>`; }).join('')}</ul>
        </article>`).join('')}</div></section>`);
    }
    const note = locked ? (roundIds.length ? '这一首还没提交：这里只放本轮已经答过的歌。累计的卡片在提交后可以看。' : '这一轮还没有答过的歌。提交第一首后，它会按年份出现在这里。')
      : ys.tab === 'all' ? '听辨过的全部歌曲，按年份排。' : '这一轮答过的歌，按年份排。';
    const top = el.querySelector('.ys-body')?.scrollTop || 0, sameTab = el.dataset.tab === ys.tab;
    el.dataset.tab = ys.tab;
    el.innerHTML = `<div class="ys-scrim"></div><div class="ys-panel">
      <header class="ys-head"><h2>年份卡片</h2>
        <div class="seg" role="group" aria-label="范围"><button data-tab="round" aria-pressed="${ys.tab === 'round'}">本轮 ${roundIds.length}</button><button data-tab="all" aria-pressed="${ys.tab === 'all'}" ${locked ? 'disabled title="提交这一首后可以看"' : ''}>累计</button></div>
        <button class="ys-close" data-ys="close">关闭<kbd>Esc</kbd></button></header>
      <p class="ys-note">${note}</p>
      <div class="ys-body" tabindex="0" aria-label="卡片列表">${body.join('') || '<p class="ys-empty">还没有卡片。</p>'}</div></div>`;
    if (sameTab) el.querySelector('.ys-body').scrollTop = top;
  }
  function showSheet() {
    if (!round || ys.open) return;
    ys.open = true; ys.opener = document.activeElement;
    const el = sheetEl(); renderSheet();
    el.hidden = false; el.getBoundingClientRect(); el.dataset.open = '1';
    root.querySelector('.tr-cards')?.setAttribute('aria-expanded', 'true');
    el.querySelector('.ys-close')?.focus({preventScroll: true});
    el.querySelector('[data-just]')?.scrollIntoView({block: 'center'});
  }
  function hideSheet(restore = true) {
    if (!ys.open) return;
    ys.open = false; const el = sheetEl(); delete el.dataset.open;
    root.querySelector('.tr-cards')?.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!ys.open) el.hidden = true; }, ctx.reduced() ? 0 : 260);
    if (restore) { const o = ys.opener?.isConnected ? ys.opener : root.querySelector('.tr-cards'); o?.focus?.({preventScroll: true}); }
  }

  /* ---------- 事件 ---------- */
  root.addEventListener('click', e => {
    if (!round) return;
    if (operating) return;
    const unknown = e.target.closest('[data-unknown]');
    if (unknown && round.phase === 'answer') {
      return writtenUnknown(FIELDS.findIndex(f => f.key === unknown.dataset.unknown), true);
    }
    const opt = e.target.closest('.col [role=radio]');
    if (opt && round.phase === 'answer') return choose(+opt.closest('.col').dataset.col, opt.dataset.v);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'retry-save') { if (saveError?.name === 'ConflictError') recoverConflict(); else { const action = retryAction; saveError = null; action?.(); } }
    else if (act === 'retry-wave') waveView?.retry();
    else if (act === 'play') toggle();
    else if (act === 'submit') submit();
    else if (act === 'next') next();
    else if (act === 'back') ctx.exit();
    else if (act === 'end') finish();
    else if (act === 'cards') ys.open ? hideSheet() : showSheet();
    else if (act === 'fix') checkFix(e.target.closest('[data-key]').dataset.key);
  });
  // 挂在 document 上：焦点在页面任何地方（甚至没有焦点）时，数字键都能直接作答
  // 开始写订正时盖住答案；清空就重新露出来，可以再看一眼
  root.addEventListener('input', e => {
    const fix = e.target.closest('input[data-fix]');
    if (fix) { fix.closest('li').classList.toggle('typing', !!fix.value.trim()); peeks.sync(); return; }
  });
  root.addEventListener('keydown', e => {
    const fix = e.target.closest?.('input[data-fix]'); if (!fix || e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); checkFix(fix.dataset.fix); }
    else if (e.key === 'Escape') { e.preventDefault(); fix.blur(); root.querySelector('.next')?.focus(); }
  });
  root.addEventListener('input', e => {
    const input = e.target.closest('[data-field]');
    if (!input || !round || operating || round.phase !== 'answer' || round.questionType !== 'written') return;
    round.answers[input.dataset.field] = input.value; round.col = FIELDS.findIndex(f => f.key === input.dataset.field);
    updateAnswer(); saveDraft();
  });
  root.addEventListener('keydown', e => {
    if (!round || root.hidden || operating || round.phase !== 'answer' || round.questionType !== 'written' || !e.target.matches('[data-field]') || e.isComposing || e.keyCode === 229 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.repeat && e.key === '0' && !e.target.value.trim()) { e.preventDefault(); return; }
    const ci = FIELDS.findIndex(f => f.key === e.target.dataset.field);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); focusCol((ci + (e.key === 'ArrowRight' ? 1 : 3)) % 4); }
    else if (e.key === '0' && !e.target.value.trim()) { e.preventDefault(); writtenUnknown(ci, false, true); }
    else if (e.key === 'Enter') { e.preventDefault(); if (complete(round.answers)) submit(); else focusCol((ci + 1) % 4); }
  });
  document.addEventListener('keydown', e => {
    if (!round || operating || root.hidden || e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.isComposing || e.keyCode === 229) return;
    if (e.target.closest?.('input,textarea,select')) return;
    if (e.key === 'Escape' && ys.open) { hideSheet(); e.preventDefault(); return; }
    if ((e.key === 'y' || e.key === 'Y') && !e.target.closest?.('.ys')) { ys.open ? hideSheet() : showSheet(); e.preventDefault(); return; }
    if (ys.open) return;   // 卡片开着的时候，数字键不作答
    const digit = /^(?:Digit|Numpad)([0-4])$/.exec(e.code || '')?.[1];
    const k = digit ?? e.key;
    if (k === ' ') { if (!e.target.closest('.tr-back,.tr-end,.submit,.next,.g-play')) { toggle(); e.preventDefault(); } return; }
    if (round.phase === 'feedback') { if (k === 'Enter' && !e.target.closest('button')) { next(); e.preventDefault(); } return; }
    if (round.questionType === 'written') {
      if ((k === 'ArrowLeft' || k === 'ArrowRight') && !e.shiftKey) { focusCol((round.col + (k === 'ArrowRight' ? 1 : 3)) % 4); e.preventDefault(); }
      else if (k === '0' && !e.shiftKey) { writtenUnknown(round.col, false, true); e.preventDefault(); }
      else if (k === 'Enter' && complete(round.answers) && !e.target.closest('button')) { submit(); e.preventDefault(); }
      return;
    }
    if (k >= '0' && k <= '4') {
      const col = root.querySelector(`.col[data-col="${round.col}"]`), b = k === '0' ? col?.querySelector('.unknown') : col?.querySelectorAll('[role=radio]')[+k - 1];
      if (b) { choose(round.col, b.dataset.v); flash(b); e.preventDefault(); }
    } else if (k === 'ArrowLeft' || k === 'ArrowRight') { focusCol((round.col + (k === 'ArrowRight' ? 1 : 3)) % 4); e.preventDefault(); }
    else if (k === 'ArrowUp' || k === 'ArrowDown') {
      const col = e.target.closest('.col'); if (!col) return;
      const list = [...col.querySelectorAll('[role=radio]')], i = list.indexOf(e.target); list[(i + (k === 'ArrowDown' ? 1 : list.length - 1)) % list.length]?.focus(); e.preventDefault();
    } else if (k === 'Enter') { if (complete(round.answers)) { submit(); e.preventDefault(); } }
  });
  const flash = b => { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); };
  root.addEventListener('focusin', e => { const col = e.target.closest?.('.col'); if (col && round?.phase === 'answer' && +col.dataset.col !== round.col) { round.col = +col.dataset.col; updateAnswer(); } });
  addEventListener('resize', () => drawWave());

  let lastAudioSave = 0;
  audio.addEventListener('timeupdate', () => { if (round && !operating && Date.now() - lastAudioSave > 5000) { lastAudioSave = Date.now(); saveDraft(); } });
  audio.addEventListener('pause', () => { if (round && !operating) saveDraft(); });
  addEventListener('pagehide', () => { if (round && !operating) saveDraft(); });
  addEventListener('beforeunload', e => { if (round && (saveError || saving || operating)) { e.preventDefault(); e.returnValue = ''; } });
  return {
    start, restore, active: () => !!round, id: () => round?.id,
    info: () => round ? {n: round.done.length + 1, size: round.size} : null,
    resume() { render(); },
    pause() { peeks.hide(); hideSheet(false); playback.pause(); if (round && !operating) saveDraft(); },
    async discard() {
      if (operating) throw Error('正在保存，请稍后再切换轮次。');
      peeks.hide(); operating = true; playback.pause();
      try {
        await tail;
        if (saveError) throw Error('当前内容尚未保存，请先重试保存后再切换轮次。');
        const latest = round ? M.roundById(round.id) : null;
        hideSheet(false); round = null; waveView?.destroy(); waveView = null; playback.stop();
        return latest;
      } finally { operating = false; saveUI(); }
    },
    flush: () => tail
  };
}

/* ---------- 结果 ---------- */
export function renderResult(root, last, ctx) {
  if (!last?.entries?.length) {
    root.innerHTML = `<div class="rs rs-empty"><h1>还没有完成的一轮</h1><p>回到盘面，落针听十首。</p><button class="primary" data-act="disc">回到盘面</button></div>`;
  } else {
    const sum = summarize(last.entries), n = last.entries.length, perfect = last.entries.filter(e => e.fields.every(f => f.isCorrect)).length;
    const grew = (last.cuts || []).filter(c => c.after.some((v, i) => v > c.before[i] + .004)).length;
    const label = (key, value) => value === NOT_HEARD ? '没听出' : key === 'style' ? (M.catalog.styles.find(s => s.id === value)?.label || value) : value;
    root.innerHTML = `<div class="rs">
      <header class="rs-head">
        <p class="rs-kicker">这一轮 · ${n} 首 · ${!Array.isArray(last.scope) ? '旧记录 · 范围未保存' : last.scope.length === M.lectures.length ? '全部七讲' : '第 ' + last.scope.join('、') + ' 讲'} · ${last.questionType === 'written' ? '填空题' : '选择题'}${last.reason === 'early' ? ' · 提前结束' : ''}</p>
        <h1><b>${perfect}</b><span>/ ${n} 首四项全对</span></h1>
        <p class="rs-sub">${grew ? `${grew} 圈往前刻了一段。` : '这一轮没有新的刻纹。'}单项正确率 ${sum.accuracy}%。${(() => { const fx = last.entries.flatMap(e => Object.values(e.fix || {})); return fx.length ? `当场订正 ${fx.filter(x => x.state === 'done').length} / ${fx.length} 项。` : ''; })()}</p>
      </header>
      <div class="rs-grid">
        <figure class="rs-disc"><div id="rsDisc"></div><figcaption>琥珀色的点是这一轮听过的圈</figcaption></figure>
        <dl class="rs-fields">${FIELDS.map(f => `<div><dt>${M.FIELD_NAMES[f.key]}</dt><dd><span class="lane-bar" style="--v:${sum.byField[f.key] / n}"></span><em>${sum.byField[f.key]} / ${n}</em></dd></div>`).join('')}</dl>
      </div>
      <ol class="rs-list">${last.entries.map(e => { const t = M.byId.get(e.id); if (!t) return ''; const miss = e.fields.filter(f => !f.isCorrect);
        return `<li data-ok="${miss.length ? 0 : 1}"><i>${t.year}</i><b>${nameHTML(t, 'song', M.titleOf(t))}</b><span class="rs-artist">${nameHTML(t, 'artist')}</span><span class="rs-marks">${miss.length ? miss.map(f => `<em>${M.FIELD_NAMES[f.key]}：<s>${esc(label(f.key, f.chosen))}</s> ${esc(label(f.key, f.correct))}${e.fix?.[f.key] ? (e.fix[f.key].state === 'done' ? ' <i class="rs-fix" data-done="1">已订正</i>' : ' <i class="rs-fix">未订正</i>') : ''}</em>`).join('') : '✓'}</span></li>`; }).join('')}</ol>
      <footer class="rs-foot"><button class="primary" data-act="disc">回到盘面，看它们刻上去<kbd>Enter</kbd></button><button data-act="again">再来一轮</button><button data-act="history">全部历史</button></footer>
    </div>`;
    const d = flatDisc({detail: false, digits: true, marks: new Set(last.entries.map(e => e.id)), title: '这一轮在盘上的位置'});
    root.querySelector('#rsDisc').replaceChildren(d.svg);
  }
  root.onclick = e => { const a = e.target.closest('[data-act]')?.dataset.act; if (a === 'disc') ctx.toDisc(); else if (a === 'again') ctx.again(); else if (a === 'history') ctx.history(); };
  root.onkeydown = e => { if (e.key === 'Enter' && !e.defaultPrevented && !e.isComposing && e.keyCode !== 229 && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.target.closest('button,a,input,select,textarea,[contenteditable]')) { e.preventDefault(); if (!e.repeat) ctx.toDisc(); } };
}
