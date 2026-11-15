// Room transitions v7 「纵深」 (2026-11-10). Reference: the Seekfor clip the user sent — black-and-white HUD motion graphics
// with hairlines and nodes, corner marks, one huge word, an iris, rings, panels turning in perspective, a box.
// Translated into this site's printed-matter language: the HUD becomes printer's marks (crop marks, a registration mark, a
// slug line with the room's number), the rings are record grooves, and the panels in perspective are the paper pages.
//
// Why it is smooth now: the browser's View Transitions hold the old page as an image while the room changes underneath in
// one frame, and every move is that image or the live new page (transform and opacity; the iris is the one clip-path).
// No copy of the old DOM is built, nothing animates layout, and the heavy first layout of a room is done while the old frame
// is still on screen. The learning state never waits for motion: work that needs the new room uses rooms.settled().
// Only a person's own click, key or back button gets a transition. Scripted clicks (the regression suite) change the room at
// once, as before. Without View Transitions, or with reduced motion, the room changes at once with a short fade.
//
// Routes, each with its reason:
//   dive    → listening: the room opens from the button you pressed, rimmed by a cobalt ring (the record's edge); the old page
//           tips back and away. The most frequent path, so the shortest.
//   file    listening → results: the cobalt stage flies into the poster; crop marks register the print.
//   invert  → archive: the only inversion on the site. Black blinds flip shut, 年代图鉴 is printed across them, then they
//           roll up under the header and uncover the black decade band.
//   home    → the issue: the old page lies down on its bottom edge while the two magazine pages swing open from the spine.
//   turn    the other tab changes: two faces of one box, turning in the direction of the tabs.
import { HIT, ms, reduced, isPhone, tempEl } from './motion.js';
import { createBigFish } from './bigfish.js';

const $ = id => document.getElementById(id);
const ROOT = document.documentElement;
const CAN = typeof document.startViewTransition === 'function' && !!window.CSS?.supports?.('view-transition-name', 'none');
const LABEL = { home: ['01', '音乐档案馆', 'THE ISSUE · NO.07'], train: ['02', '专注听辨', 'LISTENING · 33⅓'], report: ['03', '结果', 'RESULTS'], history: ['03', '结果', 'RESULTS'], archive: ['04', '年代图鉴', 'ARCHIVE'] };
const decades = () => [...new Set(ctx.catalog.tracks.filter(t => Number.isFinite(t.year)).map(t => Math.floor(t.year / 10) * 10))].sort((a, b) => a - b);
const archiveWord = () => { const d = decades(); return d.length ? `ARCHIVE · ${d[0]}s—${d.at(-1)}s` : 'ARCHIVE'; };
const ORDER = { home: 0, train: 1, report: 2, history: 2, archive: 3 };
const INK = '#141414', WALL = '#DDD9CE';
const IRIS = [.62, .02, .2, 1], OUT = 'cubic-bezier(.5,0,.75,.4)', OPEN = 'cubic-bezier(.16,.84,.2,1)', BOX = 'cubic-bezier(.66,0,.24,1)';
const ease = b => `cubic-bezier(${b.join(',')})`;

let ctx = null, booted = false, vt = null, job = null, inUpdate = false, first = null;
const intent = { at: -Infinity, trusted: false, x: null, y: null, el: null };
const seen = {};

const rectOf = el => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height } : null; };
const onScreen = r => !!r && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
const visibleIn = (root, sel) => root ? [...root.querySelectorAll(sel)].filter(el => onScreen(rectOf(el))) : [];
const fx = (kind, detail = {}) => dispatchEvent(new CustomEvent('museum:fx', { detail: { kind, ...detail } }));
const farthest = (x, y) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
const headerBottom = () => Math.max(0, rectOf(document.querySelector('.site-header'))?.bottom || 0);
// a point on a cubic-bezier easing: [time, progress] at curve parameter u
const onCurve = ([x1, y1, x2, y2], u) => { const f = (a, b) => 3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3; return [f(x1, x2), f(y1, y2)]; };

// ---- the surfaces that travel between rooms (start button, stage, poster, the fish), read from the page being left
function snapshot() {
  const at = performance.now();
  for (const [key, el] of [['cta', $('startButton')], ['stage', $('audioPlayer')], ['poster', document.querySelector('#reportRoom .poster')], ['fish', document.querySelector('#curatorSlot .bf')]]) {
    const r = rectOf(el); if (r) seen[key] = { ...r, at };
  }
}
const recent = key => (seen[key] && performance.now() - seen[key].at < 2500 && onScreen(seen[key]) ? seen[key] : null);
// Nothing is measured here (this runs on every key, also while typing a written answer): only when a transition starts.
function remember(e) {
  if (e.repeat) return;
  if (job && !inUpdate) skip(job); // any input: the page is final at once
  first?.kill(true);
  intent.at = performance.now(); intent.trusted = e.isTrusted;
  const point = e.type === 'pointerdown' && Number.isFinite(e.clientX);
  intent.x = point ? e.clientX : null; intent.y = point ? e.clientY : null;
  intent.el = point ? null : document.activeElement;
}
function pressPoint() {
  if (intent.x !== null) return { x: intent.x, y: intent.y };
  const r = rectOf(intent.el?.closest?.('button,a,summary,label,[role=button]') || intent.el);
  return r && onScreen(r) ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: innerWidth / 2, y: innerHeight / 2 };
}

// ---- one view transition
function pse(j, target, frames, { delay = 0, duration = 1, easing = 'linear' } = {}) {
  if (job !== j) return null;
  try { return ROOT.animate(frames, { delay: ms(delay), duration: ms(duration), easing, fill: 'both', pseudoElement: '::view-transition-' + target }); } catch { return null; }
}
function play(j, el, frames, { delay = 0, duration = 1, easing = HIT, fill = 'both' } = {}) {
  if (!el?.animate || job !== j) return null;
  const a = el.animate(frames, { delay: ms(delay), duration: ms(duration), easing, fill });
  j.live.push(a);
  return a;
}
// keep a real element out of sight until the moment its stand-in lands on it
const hold = (j, el, until) => play(j, el, [{ opacity: 0 }, { opacity: 0 }], { duration: until, easing: 'linear', fill: 'none' });
function name(j, el, n) { if (!el) return; el.style.viewTransitionName = n; j.named.push(el); }
function piece(j, cls, css = {}, parent = j.stage, tag = 'i') { const el = document.createElement(tag); el.className = cls; Object.assign(el.style, css); parent.appendChild(el); return el; }

// ?txtest lets scripted clicks have transitions too, so the frame timing of each route can be measured repeatedly
const TEST = new URLSearchParams(location.search).has('txtest');
function begin(change, run) {
  if (!CAN || !booted || !ctx || reduced() || document.hidden) return false;
  const now = performance.now(), fresh = (intent.trusted || TEST) && now - intent.at < 1500;
  if (!fresh && !(change.fromHistory && change.trusted)) return false;
  end();
  snapshot(); // the old page is still exactly as it was: read the surfaces that will travel
  const p = fresh ? pressPoint() : { x: innerWidth / 2, y: innerHeight / 2 };
  const j = job = { from: change.previous, to: change.name, x: p.x, y: p.y, named: [], nodes: [], live: [], timers: [], skipped: false, route: null, stage: null, total: 0 };
  // the masthead is the anchor: when both rooms show it, it stays exactly where it is
  if (j.from !== 'train' && j.to !== 'train' && scrollY < 24) {
    const header = document.querySelector('.site-header');
    name(j, header, 'tx-header');
    if (isPhone()) name(j, header?.querySelector('.tabs'), 'tx-tabs');
  }
  ROOT.dataset.tx = 'hold';
  let t;
  try { t = document.startViewTransition(() => update(j, run)); } catch { end(); return false; }
  vt = t;
  t.ready.then(() => { if (job === j && !j.skipped) MOVES[j.route]?.(j); }).catch(() => {});
  t.finished.finally(() => { if (job === j) end(); });
  return true;
}
function update(j, run) {
  if (job !== j) { run(); return; }
  inUpdate = true;
  try { run(); } finally { inUpdate = false; }
  if (job !== j || j.skipped) return;
  j.to = ctx.rooms.current?.name || j.to; // the route may have sent the student somewhere else
  if (j.to === j.from) { skip(j); return; }
  j.route = j.to === 'train' ? 'dive' : j.from === 'train' && (j.to === 'report' || j.to === 'history') ? 'file' : j.to === 'archive' ? 'invert' : j.to === 'home' ? 'home' : 'turn';
  ROOT.dataset.tx = j.route;
  try { buildStage(j); PREP[j.route]?.(j); } catch { skip(j); }
}
function skip(j) { j.skipped = true; try { vt?.skipTransition(); } catch { /* already over */ } }
function end() {
  const j = job; job = null; vt = null;
  if (!j) return;
  j.timers.forEach(clearTimeout);
  // Interrupted: everything jumps to its final state. Otherwise a detail still running on the live page (a sticker, an echo)
  // finishes on its own and then lets go, so the end of the transition is not a visible cut.
  j.live.forEach(a => { try { if (j.skipped || a.playState === 'finished' || !a.effect?.target?.isConnected) a.cancel(); else a.finished.then(() => a.cancel(), () => {}); } catch { /* gone */ } });
  j.nodes.forEach(n => n.remove());
  j.named.forEach(el => { el.style.viewTransitionName = ''; });
  delete ROOT.dataset.tx;
  ROOT.style.removeProperty('--tx-void');
}
const at = (j, time, fn) => { j.timers.push(setTimeout(() => { if (job === j) fn(); }, ms(time))); };

// ---- the stage: printer's marks over both pages, captured as its own live layer above them
function buildStage(j) {
  const tone = j.route === 'invert' || j.route === 'turn' ? 'ink' : 'paper';
  ROOT.style.setProperty('--tx-void', tone === 'ink' ? INK : WALL);
  // outside <body>, so the 150% / 200% text-size zoom on body does not move the marks off the points they mark
  const s = j.stage = tempEl('tx-stage', {}, ROOT); s.dataset.tone = tone; s.style.viewTransitionName = 'tx-stage';
  j.nodes.push(s);
  const top = j.to === 'train' ? 0 : headerBottom(), phone = isPhone(), inset = phone ? 10 : 18;
  j.top = top;
  for (const c of ['tl', 'tr', 'bl', 'br']) piece(j, 'tx-crop', { [c[0] === 't' ? 'top' : 'bottom']: (c[0] === 't' ? top + inset : inset) + 'px', [c[1] === 'l' ? 'left' : 'right']: inset + 'px' }).dataset.c = c;
  const [num, title, word] = LABEL[j.to] || LABEL.home;
  const slug = piece(j, 'tx-slug', { left: inset + (phone ? 22 : 30) + 'px', top: top + inset + 2 + 'px' }, s, 'p');
  slug.innerHTML = '<b>' + num + '</b>' + title;
  piece(j, 'tx-word', { right: inset + (phone ? 22 : 30) + 'px', bottom: inset + 2 + 'px' }, s, 'p').textContent = j.to === 'archive' ? archiveWord() : word;
}
function marksIn(j, total) {
  const s = j.stage;
  s.querySelectorAll('.tx-crop').forEach(el => {
    play(j, el, [{ opacity: 0, scale: '.25' }, { opacity: 1, scale: '1' }], { duration: 240 });
    play(j, el, [{ opacity: 1 }, { opacity: 0 }], { delay: total - 200, duration: 160, easing: 'linear', fill: 'forwards' });
  });
  s.querySelectorAll('.tx-slug,.tx-word').forEach((el, i) => {
    play(j, el, [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { delay: 70 + i * 50, duration: 220 });
    play(j, el, [{ opacity: 1 }, { opacity: 0 }], { delay: total - 220, duration: 160, easing: 'linear', fill: 'forwards' });
  });
}
// registration mark and two hairlines through the point you pressed, with nodes on them, like a lock-on
function lockOn(j, x, y, life) {
  const reg = piece(j, 'tx-reg', { left: x - 20 + 'px', top: y - 20 + 'px' });
  play(j, reg, [{ opacity: 0, transform: 'scale(1.9) rotate(90deg)' }, { opacity: 1, transform: 'scale(1) rotate(0deg)' }], { duration: 260 });
  play(j, reg, [{ opacity: 1 }, { opacity: 0 }], { delay: life, duration: 160, easing: 'linear', fill: 'forwards' });
  const h = piece(j, 'tx-ax', { left: '0', top: Math.round(y) + 'px', width: '100%', height: '1px', transformOrigin: x + 'px 0' });
  const v = piece(j, 'tx-ax', { left: Math.round(x) + 'px', top: '0', width: '1px', height: '100%', transformOrigin: '0 ' + y + 'px' });
  play(j, h, [{ opacity: 1, transform: 'scaleX(0)' }, { opacity: 1, transform: 'scaleX(1)' }], { duration: 340 });
  play(j, v, [{ opacity: 1, transform: 'scaleY(0)' }, { opacity: 1, transform: 'scaleY(1)' }], { delay: 30, duration: 340 });
  [h, v].forEach(el => play(j, el, [{ opacity: 1 }, { opacity: 0 }], { delay: life - 60, duration: 200, easing: 'linear', fill: 'forwards' }));
  [-260, -120, 120, 260].forEach((d, i) => {
    for (const [nx, ny] of [[x + d, y], [x, y + d * .7]]) {
      if (nx < 8 || ny < 8 || nx > innerWidth - 8 || ny > innerHeight - 8) continue;
      const n = piece(j, 'tx-node', { left: nx - 3.5 + 'px', top: ny - 3.5 + 'px' });
      play(j, n, [{ opacity: 0, scale: '0' }, { opacity: 1, scale: '1' }], { delay: 80 + i * 30, duration: 180 });
      play(j, n, [{ opacity: 1 }, { opacity: 0 }], { delay: life - 80, duration: 160, easing: 'linear', fill: 'forwards' });
    }
  });
}
// record grooves running out from a point, like a radar pulse
function grooves(j, x, y, radii, delay = 0) {
  radii.forEach((r, i) => {
    const g = piece(j, 'tx-ring', { left: x - r + 'px', top: y - r + 'px', width: r * 2 + 'px', height: r * 2 + 'px' });
    play(j, g, [{ opacity: .55, transform: 'scale(.12)' }, { opacity: 0, transform: 'scale(1)' }], { delay: delay + i * 70, duration: 520, easing: 'cubic-bezier(.2,.6,.3,1)' });
  });
}
// a solid cobalt sheet flying between two rects: it carries no content, so scaling it is honest and cheap
function sheet(j, from, to, duration) {
  const el = piece(j, 'tx-sheet', { width: to.width + 'px', height: to.height + 'px' }, j.stage, 'div');
  play(j, el, [
    { opacity: 1, transform: `translate(${from.left}px,${from.top}px) scale(${from.width / to.width},${from.height / to.height})` },
    { opacity: 1, transform: `translate(${to.left}px,${to.top}px) scale(1,1)` },
  ], { duration });
  play(j, el, [{ opacity: 1 }, { opacity: 0 }], { delay: duration - 30, duration: 110, easing: 'linear', fill: 'forwards' });
  return el;
}
// crop marks registering one rect, as if it were being printed
function register(j, r, delay, life) {
  const arm = isPhone() ? 12 : 18, gap = 8;
  for (const c of ['tl', 'tr', 'bl', 'br']) {
    const m = piece(j, 'tx-crop tx-crop-s', { left: (c[1] === 'l' ? r.left - gap - arm : r.right + gap) + 'px', top: (c[0] === 't' ? r.top - gap - arm : r.bottom + gap) + 'px', width: arm + 'px', height: arm + 'px' });
    m.dataset.c = c;
    play(j, m, [{ opacity: 0, translate: (c[1] === 'l' ? -14 : 14) + 'px ' + (c[0] === 't' ? -14 : 14) + 'px' }, { opacity: 1, translate: '0 0' }], { delay, duration: 260 });
    play(j, m, [{ opacity: 1 }, { opacity: 0 }], { delay: delay + life, duration: 180, easing: 'linear', fill: 'forwards' });
  }
  for (const [axis, pos] of [['x', r.top], ['x', r.bottom], ['y', r.left], ['y', r.right]]) {
    const across = axis === 'x', line = piece(j, 'tx-ax', across ? { left: '0', top: Math.round(pos) + 'px', width: '100%', height: '1px', transformOrigin: (r.left + r.width / 2) + 'px 0' } : { left: Math.round(pos) + 'px', top: '0', width: '1px', height: '100%', transformOrigin: '0 ' + (r.top + r.height / 2) + 'px' });
    play(j, line, [{ opacity: .9, transform: across ? 'scaleX(0)' : 'scaleY(0)' }, { opacity: .9, transform: across ? 'scaleX(1)' : 'scaleY(1)' }], { delay: delay - 60, duration: 320 });
    play(j, line, [{ opacity: .9 }, { opacity: 0 }], { delay: delay + life - 100, duration: 200, easing: 'linear', fill: 'forwards' });
  }
}
// the issue's details, on the live pages: the big letters rise, their red echoes close up on them, the stickers press on
function spreadDetails(anim, base) {
  const mag = $('welcome'); if (!mag || !rectOf(mag)) return;
  visibleIn(mag, '.mg-A:not(.echo),.mg-title,.mg-pop:not(.echo) span').forEach((el, i) => anim(el, [{ opacity: 0, translate: '0 28px' }, { opacity: 1, translate: '0 0' }], { delay: base + 40 + i * 40, duration: 460 }));
  visibleIn(mag, '.echo').forEach(el => { const i = Number(el.style.getPropertyValue('--i')) || 1; anim(el, [{ opacity: .6 - i * .08, translate: `0 ${i * 20}px` }, { opacity: 0, translate: '0 0' }], { delay: base + 70 + i * 30, duration: 640, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'none' }); });
  visibleIn(mag, '.orn').forEach((el, i) => anim(el, [{ opacity: 0, scale: '.55' }, { opacity: 1, scale: '1' }], { delay: base + 360 + i * 40, duration: 320, easing: 'cubic-bezier(.3,1.45,.5,1)' }));
  const path = mag.querySelector('.mg-s path');
  if (path && rectOf(path)) { const len = Math.ceil(path.getTotalLength()); anim(path, [{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }], { delay: base + 160, duration: 560, easing: 'cubic-bezier(.4,.1,.2,1)' }); }
}

// ---- the routes: PREP runs inside the update (the new room is laid out, nothing has been painted yet), MOVES at ready
const PREP = {
  dive(j) {
    const x = j.x, y = j.y, R = j.R = farthest(x, y);
    // the rim of the opening: a cobalt ring drawn at its final size and grown with it while the opening is small
    const RIM = Math.min(360, R * .45);
    j.rim = piece(j, 'tx-rim', { left: x - RIM + 'px', top: y - RIM + 'px', width: RIM * 2 + 'px', height: RIM * 2 + 'px' });
    j.RIM = RIM;
    const a = j.from === 'home' ? recent('fish') : null, sf = document.querySelector('.stage-fish'), b = rectOf(sf);
    if (a && b) {
      const flyer = createBigFish({ pose: 'yay', size: Math.round(a.width) }).el;
      flyer.classList.add('tx-fish'); Object.assign(flyer.style, { left: '0', top: '0', transformOrigin: '0 0' });
      j.stage.appendChild(flyer); j.fish = { el: flyer, a, b };
      hold(j, sf, 520);
    }
  },
  file(j) {
    const poster = document.querySelector('#reportRoom .poster'), to = rectOf(poster), from = recent('stage');
    j.poster = to;
    if (to && from) { j.sheetFrom = from; hold(j, poster, 470); }
  },
  invert(j) {
    const H = innerHeight, top = j.top, by = new Map();
    for (const tk of ctx.catalog.tracks) { if (!Number.isFinite(tk.year)) continue; const d = Math.floor(tk.year / 10) * 10; by.set(d, (by.get(d) || 0) + 1); }
    const shares = [...by.keys()].sort((p, q) => p - q).map(d => by.get(d)), all = shares.reduce((p, q) => p + q, 0) || 1;
    const curtain = j.curtain = piece(j, 'tx-curtain', { top: top + 'px', height: H - top + 'px' }, j.stage, 'div');
    let acc = 0;
    j.slats = shares.map(n => { const y1 = Math.round(acc / all * (H - top)); acc += n; const y2 = Math.round(acc / all * (H - top)); return piece(j, 'tx-slat', { top: y1 + 'px', height: y2 - y1 + 1 + 'px' }, curtain); });
    const big = j.big = piece(j, 'tx-big', {}, curtain, 'p');
    big.innerHTML = '<span>年代图鉴</span><small>ARCHIVE · ' + ctx.catalog.tracks.length + ' RECORDINGS · ' + shares.length + ' DECADES</small>';
  },
  home(j) {
    const mag = $('welcome'), wide = innerWidth >= 1100 && !isPhone() && !!rectOf(mag);
    if (wide) { name(j, mag.querySelector('.pg-l'), 'tx-pg-l'); name(j, mag.querySelector('.pg-r'), 'tx-pg-r'); j.pages = true; }
    const cta = $('startButton'), to = rectOf(cta), from = j.from === 'train' ? recent('stage') : j.from === 'report' ? recent('poster') : null;
    if (to && from) { j.sheetFrom = from; j.cta = to; hold(j, cta, 460); }
  },
};
const MOVES = {
  dive(j) {
    const T = j.total = 700, x = j.x, y = j.y, R = j.R, D = 50, LEN = 560, k = 1.07;
    pse(j, 'old(root)', [{ transformOrigin: `${x}px ${y}px`, transform: 'translateZ(0) rotateX(0deg)', opacity: 1 }, { transformOrigin: `${x}px ${y}px`, transform: 'translateZ(-380px) rotateX(10deg)', opacity: .1 }], { duration: 600, easing: OUT });
    pse(j, 'new(root)', [{ transformOrigin: `${x}px ${y}px`, clipPath: `circle(0px at ${x}px ${y}px)`, transform: `scale(${k})` }, { transformOrigin: `${x}px ${y}px`, clipPath: `circle(${Math.ceil(R)}px at ${x}px ${y}px)`, transform: 'scale(1)' }], { delay: D, duration: LEN, easing: ease(IRIS) });
    // the rim follows the opening's edge exactly (same curve, sampled) until it is as large as it was drawn, then lets go
    const frames = [];
    for (let i = 0; i <= 40; i++) {
      const [tx, p] = onCurve(IRIS, i / 40), r = R * p * (k - (k - 1) * p);
      frames.push({ t: tx, s: r / j.RIM });
      if (r >= j.RIM * 1.2) break;
    }
    const tEnd = frames.at(-1).t || 1;
    play(j, j.rim, frames.map(f => ({ offset: Math.min(1, f.t / tEnd), transform: `scale(${f.s})` })), { delay: D, duration: LEN * tEnd, easing: 'linear' });
    play(j, j.rim, [{ opacity: 1 }, { opacity: 1, offset: .62 }, { opacity: 0 }], { delay: D, duration: LEN * tEnd, easing: 'linear' });
    lockOn(j, x, y, 380);
    grooves(j, x, y, [150, 230, 320], 30);
    marksIn(j, T);
    if (j.fish) {
      const { el, a, b } = j.fish, kk = b.width / a.width, top = Math.min(a.top, b.top) - 90;
      play(j, el, [{ opacity: 1, transform: `translate(${a.left}px,${a.top}px) scale(1)` }, { opacity: 1, transform: `translate(${(a.left + b.left) / 2}px,${top}px) scale(${(1 + kk) / 2}) rotate(-10deg)`, offset: .45 }, { opacity: 1, transform: `translate(${b.left}px,${b.top + 2}px) scale(${kk})` }], { duration: 500, easing: 'cubic-bezier(.33,.66,.4,1)' });
      play(j, el, [{ opacity: 1 }, { opacity: 0 }], { delay: 500, duration: 1, easing: 'linear', fill: 'forwards' });
    }
    pse(j, 'group(tx-stage)', [{ opacity: 1 }, { opacity: 1 }], { duration: T }); // keeps the marks alive to the end
  },
  file(j) {
    const T = j.total = 720;
    pse(j, 'old(root)', [{ transformOrigin: '50% 0%', transform: 'translateY(0) translateZ(0) rotateX(0deg)', opacity: 1 }, { transformOrigin: '50% 0%', transform: 'translateY(-3%) translateZ(-300px) rotateX(12deg)', opacity: 0 }], { duration: 460, easing: OUT });
    pse(j, 'new(root)', [{ transformOrigin: '50% 100%', transform: 'translateY(56px) rotateX(-8deg)', opacity: 0 }, { transformOrigin: '50% 100%', transform: 'translateY(0) rotateX(0deg)', opacity: 1 }], { delay: 70, duration: 420, easing: HIT });
    if (j.sheetFrom && j.poster) sheet(j, j.sheetFrom, j.poster, 440);
    if (j.poster) register(j, j.poster, 300, 300);
    marksIn(j, T);
    pse(j, 'group(tx-stage)', [{ opacity: 1 }, { opacity: 1 }], { duration: T });
  },
  invert(j) {
    const T = j.total = 880, COVER = 330, n = j.slats.length, H = innerHeight;
    j.slats.forEach((s, i) => play(j, s, [{ opacity: 1, transform: 'rotateX(-92deg)' }, { opacity: 1, transform: 'rotateX(0deg)' }], { delay: i * 18, duration: COVER - (n - 1) * 18, easing: 'cubic-bezier(.3,1.32,.5,1)' }));
    pse(j, 'old(root)', [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.95)', opacity: 1, offset: .98 }, { transform: 'scale(.95)', opacity: 0 }], { duration: COVER + 20, easing: 'cubic-bezier(.4,0,.6,1)' });
    pse(j, 'new(root)', [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 0, transform: 'translateY(30px)', offset: .4 }, { opacity: 1, transform: 'translateY(30px)', offset: .401, easing: HIT }, { opacity: 1, transform: 'translateY(0)' }], { duration: T - 40, easing: 'linear' });
    // the word is printed on the blinds, tipping up out of them
    const big = j.big;
    play(j, big, [{ opacity: 0, transform: 'perspective(900px) rotateX(-38deg) translateY(30px) scale(1.12)' }, { opacity: 1, transform: 'perspective(900px) rotateX(0deg) translateY(0) scale(1)' }], { delay: 150, duration: 300 });
    play(j, big, [{ opacity: 1 }, { opacity: 0 }], { delay: COVER + 160, duration: 140, easing: 'linear', fill: 'forwards' });
    // then the blinds roll up under the header, uncovering the band as they go
    play(j, j.curtain, [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 1, transform: `translateY(${-(H - j.top) - 4}px)` }], { delay: COVER + 70, duration: T - COVER - 110, easing: 'cubic-bezier(.72,0,.2,1)' });
    // the decade records roll into the band on the live page, each turning by the distance it travels
    const nav = $('decadeNav'), left = rectOf(nav)?.left ?? 0;
    visibleIn(nav, '.dec').forEach((dec, i) => {
      const o = dec.querySelector('.o'), r = rectOf(o), when = COVER + 180 + i * 30;
      if (!r) return;
      const dist = r.left - left + r.width, deg = -dist / (r.width / 2) * 180 / Math.PI;
      play(j, o, [{ transform: `translateX(${-dist}px) rotate(${deg}deg)` }, { transform: 'translateX(0) rotate(0deg)' }], { delay: when, duration: 460 });
      play(j, dec.querySelector('.lab'), [{ opacity: 0, translate: '0 6px' }, { opacity: 1, translate: '0 0' }], { delay: when + 120, duration: 220 });
    });
    marksIn(j, T);
    pse(j, 'group(tx-stage)', [{ opacity: 1 }, { opacity: 1 }], { duration: T });
  },
  home(j) {
    const T = j.total = 820;
    pse(j, 'old(root)', [{ transformOrigin: '50% 100%', transform: 'rotateX(0deg)', opacity: 1 }, { transformOrigin: '50% 100%', transform: 'rotateX(68deg)', opacity: 0 }], { duration: 520, easing: OUT });
    pse(j, 'new(root)', [{ opacity: 0 }, { opacity: 1 }], { delay: 30, duration: 320 });
    if (j.pages) {
      pse(j, 'new(tx-pg-l)', [{ transformOrigin: '100% 50%', transform: 'perspective(2400px) rotateY(76deg)', opacity: .15 }, { transformOrigin: '100% 50%', transform: 'perspective(2400px) rotateY(0deg)', opacity: 1 }], { delay: 90, duration: 700, easing: OPEN });
      pse(j, 'new(tx-pg-r)', [{ transformOrigin: '0% 50%', transform: 'perspective(2400px) rotateY(-76deg)', opacity: .15 }, { transformOrigin: '0% 50%', transform: 'perspective(2400px) rotateY(0deg)', opacity: 1 }], { delay: 90, duration: 700, easing: OPEN });
    } else pse(j, 'new(root)', [{ transform: 'translateY(40px)' }, { transform: 'translateY(0)' }], { delay: 30, duration: 560, easing: HIT });
    if (j.sheetFrom && j.cta) sheet(j, j.sheetFrom, j.cta, 430);
    spreadDetails((el, frames, o) => play(j, el, frames, o), 120);
    marksIn(j, T);
    at(j, 640, () => fx('fish-hop'));
    pse(j, 'group(tx-stage)', [{ opacity: 1 }, { opacity: 1 }], { duration: T });
  },
  turn(j) {
    const T = j.total = 720, dir = (ORDER[j.to] ?? 0) >= (ORDER[j.from] ?? 0) ? 1 : -1, o = `50% 50% ${-innerWidth / 2}px`;
    pse(j, 'old(root)', [{ transformOrigin: o, transform: 'rotateY(0deg)' }, { transformOrigin: o, transform: `rotateY(${-90 * dir}deg)` }], { duration: 680, easing: BOX });
    pse(j, 'new(root)', [{ transformOrigin: o, transform: `rotateY(${90 * dir}deg)` }, { transformOrigin: o, transform: 'rotateY(0deg)' }], { duration: 680, easing: BOX });
    // the camera pulls back while the box turns, so both faces are in view at the corner
    pse(j, 'image-pair(root)', [{ transform: 'scale(1)' }, { transform: 'scale(.82)', offset: .5 }, { transform: 'scale(1)' }], { duration: 680, easing: 'cubic-bezier(.45,0,.55,1)' });
    const edge = piece(j, 'tx-ax', { left: innerWidth / 2 + 'px', top: '0', width: '1px', height: '100%', transformOrigin: '0 50%' });
    play(j, edge, [{ opacity: 0, transform: 'scaleY(0)' }, { opacity: .8, transform: 'scaleY(1)', offset: .5 }, { opacity: 0, transform: 'scaleY(1)' }], { duration: 680, easing: 'linear' });
    marksIn(j, T);
    pse(j, 'group(tx-stage)', [{ opacity: 1 }, { opacity: 1 }], { duration: T });
  },
};
// ---- first load (no old page to hold) and the no-transition fallback: plain element animations, cancelled on any input
function timeline(total) {
  const anims = [];
  let dead = false;
  const t = {
    play(el, frames, { delay = 0, duration = 1, easing = HIT, fill = 'both' } = {}) {
      if (dead || !el?.animate) return null;
      const a = el.animate(frames, { delay: ms(delay), duration: ms(duration), easing, fill }); anims.push(a); return a;
    },
    kill() { if (dead) return; dead = true; clearTimeout(guard); anims.forEach(a => { try { a.cancel(); } catch { /* gone */ } }); if (first === t) first = null; },
  };
  const guard = setTimeout(() => t.kill(), ms(total) + 400);
  return t;
}
function spreadIn(t, opening) {
  const mag = $('welcome'); if (!mag || !rectOf(mag)) return;
  if (opening && innerWidth >= 1100) {
    t.play(mag.querySelector('.pg-l'), [{ transformOrigin: '100% 50%', transform: 'perspective(2400px) rotateY(64deg)', opacity: .3 }, { transformOrigin: '100% 50%', transform: 'perspective(2400px) rotateY(0deg)', opacity: 1 }], { duration: 680, easing: OPEN });
    t.play(mag.querySelector('.pg-r'), [{ transformOrigin: '0% 50%', transform: 'perspective(2400px) rotateY(-64deg)', opacity: .3 }, { transformOrigin: '0% 50%', transform: 'perspective(2400px) rotateY(0deg)', opacity: 1 }], { duration: 680, easing: OPEN });
  }
  spreadDetails(t.play, opening ? 100 : 0);
  const cta = $('startButton');
  if (rectOf(cta)) t.play(cta, [{ opacity: 0, translate: '-30px 0' }, { opacity: 1, translate: '0 0' }], { delay: opening ? 420 : 60, duration: 420 });
  setTimeout(() => { if (first === t) fx('fish-hop'); }, ms(opening ? 760 : 380));
}
function onRoom({ name, previous }) {
  if (!booted) { // the first load is not a transition; only home gets an entrance, once
    booted = true;
    if (name !== 'home' || reduced() || document.hidden) return;
    queueMicrotask(() => { first?.kill(); spreadIn(first = timeline(1000), true); });
    return;
  }
  if (name === previous || job) return; // a view transition is carrying this change
  first?.kill();
  const room = $(name + 'Room');
  if (document.hidden || !room?.animate) return;
  // no transition (reduced motion, a scripted change, no View Transitions): the room simply fades in
  room.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(reduced() ? 120 : 160), easing: 'linear', fill: 'backwards' });
}

export function initTransitions(c) {
  ctx = c;
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, remember, true);
  addEventListener('museum:room-before', () => { if (vt && !inUpdate && job) skip(job); }); // a change that did not wait: no transition
  addEventListener('museum:room', e => onRoom(e.detail));
  addEventListener('resize', () => { if (job) skip(job); first?.kill(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (job) skip(job); first?.kill(); } });
  if (ctx.rooms) ctx.rooms.transition = begin;
}
