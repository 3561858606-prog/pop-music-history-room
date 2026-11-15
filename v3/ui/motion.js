import { readPrefs, writePrefs } from './prefs.js';
// Motion helpers. Logic never waits on these; every helper has a final state without animation.
export const TOKENS = { press: 100, quick: 160, base: 240, scene: 280 };
export const EASE = 'cubic-bezier(.2,.7,.2,1)';
// The hit: 90% of the distance in the first quarter of the time, then a long quiet tail. Same curve as --hit in css/motion.css.
export const HIT = 'cubic-bezier(.08,.82,.17,1)';
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const canHover = () => matchMedia('(hover: hover)').matches;
export const isPhone = () => innerWidth <= 760;

// ?slowmo=8 stretches every duration, delay and fallback timer by 8, so a transition can be read frame by frame.
// The 2x transition setting (settings drawer, saved in prefs) halves the same timings: one set of animations, twice as fast.
let slowSearch = null, slowRate = 1, speed = Number(readPrefs().speed) === 2 ? 2 : 1;
document.documentElement.dataset.speed = String(speed);
export const getSpeed = () => speed;
export function setSpeed(v) { speed = Number(v) === 2 ? 2 : 1; document.documentElement.dataset.speed = String(speed); writePrefs({ speed }); }
export function ms(v = 0) {
  if (location.search !== slowSearch) { slowSearch = location.search; const r = Number(new URLSearchParams(slowSearch).get('slowmo')); slowRate = r > 0 ? r : 1; }
  return v * slowRate / speed;
}

// Deterministic randomness for visuals: Math.random is reserved for the question draw.
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled(list, rnd) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function fadeIn(el, dur = TOKENS.quick, delay = 0) {
  if (!el || reduced() || !el.animate) return;
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(dur), delay: ms(delay), easing: 'linear', fill: 'backwards' });
}
export function rise(el, { y = 8, ms: dur = TOKENS.quick, delay = 0 } = {}) {
  if (!el || reduced() || !el.animate) return;
  el.animate([{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }], { duration: ms(dur), delay: ms(delay), easing: EASE, fill: 'backwards' });
}
export function slideIn(el, dir = 1, dur = 120) {
  if (!el || reduced() || !el.animate) return;
  el.animate([{ opacity: 0, transform: `translateX(${dir * 14}px)` }, { opacity: 1, transform: 'none' }], { duration: ms(dur), easing: EASE });
}

// The cobalt surface is continuous: a solid cobalt sheet flies between two rects. It carries no content,
// so scaling it is honest and cheap, and the real content fades in underneath.
export function morphCobalt(from, to, dur = TOKENS.scene) {
  if (reduced() || !from || !to || !from.width || !to.width) return;
  const sheet = document.createElement('div');
  sheet.className = 'cobalt-morph';
  sheet.style.width = to.width + 'px'; sheet.style.height = to.height + 'px';
  document.body.appendChild(sheet);
  const start = `translate(${from.left}px,${from.top}px) scale(${from.width / to.width},${from.height / to.height})`;
  const end = `translate(${to.left}px,${to.top}px) scale(1,1)`;
  const a = sheet.animate([{ transform: start }, { transform: end }], { duration: ms(dur), easing: EASE, fill: 'both' });
  const clean = () => sheet.remove();
  a.onfinish = () => { sheet.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(100), easing: 'linear' }).onfinish = clean; };
  setTimeout(clean, ms(dur + 500));
}

// Turntable inertia: the record spins up and winds down instead of switching on and off.
export function turntable(el, msPerTurn = 3200) {
  if (!el?.animate) return { set() {} };
  const a = el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: msPerTurn, iterations: Infinity });
  a.pause();
  let target = 0, rate = 0, timer = 0;
  const step = () => {
    rate += (target - rate) * .22;
    if (Math.abs(target - rate) < .02) rate = target;
    if (rate === 0) a.pause(); else { if (a.playState !== 'running') a.play(); a.playbackRate = rate; }
    timer = rate === target ? 0 : setTimeout(step, 40);
  };
  return { set(on) { target = on && !reduced() ? 1 : 0; if (!timer) step(); } };
}

// ---- Transition tools. Each returns a handle: cancel() jumps to the final state, and a plain timer calls it
// anyway, so nothing here depends on requestAnimationFrame or animationend having run.
const NONE = { els: [], anims: [], total: 0, cancel() {} };
function effect(els, anims, total) {
  let done = false, timer = 0;
  const h = { els, anims, total, cancel() { if (done) return; done = true; clearTimeout(timer); anims.forEach(a => { try { a.cancel(); } catch { /* already gone */ } }); els.forEach(e => e.remove()); } };
  timer = setTimeout(h.cancel, ms(total) + 80);
  return h;
}
// Temporary layers: never hit-testable, never focusable, invisible to assistive tech.
export function tempEl(cls, css = {}, parent = document.body, tag = 'div') {
  const el = document.createElement(tag);
  el.className = cls; el.setAttribute('aria-hidden', 'true'); el.inert = true;
  Object.assign(el.style, css);
  parent.appendChild(el);
  return el;
}

// A solid bar sweeps across a rect: it grows until it covers the text, the text appears behind it, then it runs off the far side.
// hide:'color' keeps a child like a canvas visible while only the text is held back.
export function barWipe(el, { dir = 1, ms: dur = 220, delay = 0, color = 'var(--ink)', hide = 'opacity', z = null } = {}) {
  if (!el?.animate || reduced()) return NONE;
  const r = el.getBoundingClientRect(); if (!r.width) return NONE;
  const bar = tempEl('tx-bar', { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', background: color, transformOrigin: dir > 0 ? '0 50%' : '100% 50%' });
  if (z !== null) bar.style.zIndex = z;
  const COVER = .42;
  const sweep = bar.animate([
    { transform: 'translateX(0) scaleX(0)', easing: HIT, offset: 0 },
    { transform: 'translateX(0) scaleX(1)', easing: 'cubic-bezier(.5,0,.15,1)', offset: COVER },
    { transform: `translateX(${dir * r.width}px) scaleX(0)`, offset: 1 },
  ], { duration: ms(dur), delay: ms(delay), fill: 'both' });
  const held = hide === 'color' ? 'transparent' : 0, prop = hide === 'color' ? 'color' : 'opacity';
  const hold = el.animate([{ [prop]: held }, { [prop]: held }], { duration: ms(delay + dur * COVER), easing: 'linear' });
  return effect([bar], [sweep, hold], delay + dur);
}

// The old page is cut along a rectangular grid in a few discrete steps, with solid squares flashing where blocks left.
// order(c, r) gives a block's step; without it the order is a seeded shuffle split into equal groups.
export function mosaicOut(layer, { cols = 4, rows = 6, order = null, steps = 4, stepMs = 32, tiles = 0, colors = ['var(--ink)'], seed = 1, delay = 0 } = {}) {
  if (!layer?.animate || reduced()) return NONE;
  if (!CSS.supports?.('clip-path', 'path("M0 0")')) return effect([], [layer.animate([{ opacity: 1, easing: 'step-end' }, { opacity: 0 }], { duration: ms(steps * stepMs), delay: ms(delay), fill: 'both' })], delay + steps * stepMs);
  const W = layer.clientWidth || innerWidth, H = layer.clientHeight || innerHeight, rnd = seeded(seed);
  const X = i => Math.round(i * W / cols), Y = i => Math.round(i * H / rows), cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ c, r, x: X(c), y: Y(r), x2: X(c + 1), y2: Y(r + 1), step: 0 });
  if (order) cells.forEach(b => { b.step = Math.max(0, Math.min(steps - 1, Math.floor(order(b.c, b.r)))); });
  else shuffled(cells, rnd).forEach((b, i) => { b.step = Math.floor(i * steps / cells.length); });
  const after = k => { const live = cells.filter(b => b.step > k); return live.length ? `path("${live.map(b => `M${b.x} ${b.y}H${b.x2}V${b.y2}H${b.x}Z`).join('')}")` : 'path("M0 0")'; };
  const frames = [];
  for (let k = 0; k < steps; k++) frames.push({ clipPath: after(k), offset: k / steps, easing: 'step-end' });
  frames.push({ clipPath: after(steps - 1), offset: 1 });
  const anims = [layer.animate(frames, { duration: ms(steps * stepMs), delay: ms(delay), fill: 'both' })], els = [];
  let n = 0;
  if (tiles > 0) for (let k = 0; k < steps; k++) {
    for (const b of shuffled(cells.filter(q => q.step === k), rnd).slice(0, tiles)) {
      const w = b.x2 - b.x, h = b.y2 - b.y, s = Math.round(Math.min(w, h) * (rnd() > .5 ? .5 : 1 / 3));
      const tile = tempEl('tx-tile', { left: b.x + (rnd() > .5 ? 0 : w - s) + 'px', top: b.y + (rnd() > .5 ? 0 : h - s) + 'px', width: s + 'px', height: s + 'px', background: colors[n++ % colors.length] });
      els.push(tile);
      anims.push(tile.animate([{ opacity: 1 }, { opacity: 1 }], { duration: ms(stepMs), delay: ms(delay + k * stepMs), easing: 'linear' }));
    }
  }
  return effect(els, anims, delay + steps * stepMs);
}

// Scaffold: a 1px line draws itself and fades. fade:0 means it stays until removed, for standing in for a real border.
export function drawLine({ axis = 'x', x = 0, y = 0, len = 0, dir = 1, delay = 0, draw = 200, hold = 0, fade = 260, color = 'var(--ink)', z = null, parent = document.body } = {}) {
  if (reduced() || !(len > 0)) return NONE;
  const across = axis === 'x', scale = across ? 'scaleX' : 'scaleY';
  const line = tempEl('tx-line', { left: x + 'px', top: y + 'px', width: across ? len + 'px' : '1px', height: across ? '1px' : len + 'px', background: color, transformOrigin: dir > 0 ? '0 0' : across ? '100% 0' : '0 100%' }, parent);
  if (z !== null) line.style.zIndex = z;
  const anims = [line.animate([{ transform: `${scale}(0)` }, { transform: `${scale}(1)` }], { duration: ms(draw), delay: ms(delay), easing: HIT, fill: 'both' })];
  if (fade) anims.push(line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(fade), delay: ms(delay + draw + hold), easing: 'linear', fill: 'both' }));
  return effect([line], anims, delay + draw + hold + fade);
}
