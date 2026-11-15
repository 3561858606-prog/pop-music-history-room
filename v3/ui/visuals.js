// Code-drawn graphics: per-song ring covers and the six-ring course disc.
import { reduced, canHover } from './motion.js';
import { songState } from './mastery.js';

export const LCOL = { 1: '#B3AC86', 2: '#F0A35E', 3: '#B7A7DA', 4: '#82B38D', 5: '#9DB2E8', 6: '#232323', 7: '#DDAF3A' };
const PEN = '#C8341B', INK = '#141414';

let peaks = null, loading = null;
export function loadPeaks() {
  if (!loading) loading = fetch('assets/peaks.json').then(r => r.json()).then(j => (peaks = j)).catch(() => (peaks = {}));
  return loading;
}
export const peaksFor = t => { const k = (t?.src || '').split('/').pop().split(/[.?]/)[0]; return peaks?.[k] ? (Array.isArray(peaks[k]) ? peaks[k] : peaks[k].p) : null; };

export function setupCanvas(canvas) {
  const S = canvas.clientWidth || canvas.width, dpr = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== Math.round(S * dpr)) { canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr); }
  const c = canvas.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, S, S); c.translate(S / 2, S / 2);
  return [c, S / 2];
}

// The hole is a physical anchor for the year: a small 78 rpm hole until the 45 arrived in 1949, a large hole after it.
// Korean pressings stay 78. Maple Leaf Rag's three carriers and Elvis's TV Hound Dog are set by hand.
// A neutral record has one fixed hole, so the hole says nothing while a question is open.
const SMALL_HOLE = new Set(['t50', 't51', 't52', 't56']);
export const NEUTRAL_INNER = .2;
export const apertureOf = t => !t ? NEUTRAL_INNER : t.year < 1949 || SMALL_HOLE.has(t.id) || /[가-힣]/.test(`${t.artist}${t.song}`) ? .12 : .32;

// Ring count comes from the song's length, how full each ring is from its absolute level, colour from its lecture.
// Absolute threshold, so a parlour song is a few sparse strokes and a live Hound Dog is nearly solid.
// Grooves run from the outermost in, like a needle reading a record.
export function coverRings(t, { neutral = false, inner } = {}) {
  const p = neutral ? null : peaksFor(t), segs = 12, span = Math.PI * 2 / segs;
  const count = p ? Math.max(3, Math.min(9, Math.round(3 + ((t.duration || 120) - 30) / 55))) : 7;
  // Rock records are all about equally full, so fullness alone cannot tell them apart. The step between grooves is a
  // fingerprint of the waveform: spokes that lean one way, lean the other, or fall into brickwork. A neutral record has none.
  const pitch = p ? span * (.14 + .72 * (p.reduce((a, x, i) => a + x * (i + 1), 0) % 97) / 97) : .55;
  const rings = [];
  for (let g = 0; g < count; g++) {
    const arcs = [];
    for (let j = 0; j < segs; j++) {
      const raw = p ? p[Math.floor((g * segs + j) / (count * segs) * p.length)] : 60;
      if (p && raw < 60) continue;
      arcs.push({ at: j * span, len: span * (p ? .45 + .5 * Math.min(1, (raw - 60) / 40) : .624) });
    }
    rings.push({ g, off: g * pitch, arcs });
  }
  return { count, inner: inner ?? (neutral ? NEUTRAL_INNER : apertureOf(t)), rings };
}

// twist rotates ring k by k*twist radians: 0 is concentric, larger values line the rings up into a spiral.
export function cover(canvas, t, { fg = null, neutral = false, twist = 0, inner } = {}) {
  const [c, half] = setupCanvas(canvas);
  const m = coverRings(t, { neutral, inner }), R = half * .96, step = (R - R * m.inner) / m.count;
  c.strokeStyle = fg || (t ? LCOL[t.deck] : INK); c.lineWidth = Math.max(1.4, step * .46); c.lineCap = 'butt';
  for (const ring of m.rings) {
    const r = R - ring.g * step - step / 2, off = ring.off + ring.g * twist;
    for (const a of ring.arcs) { c.beginPath(); c.arc(0, 0, r, off + a.at, off + a.at + a.len); c.stroke(); }
  }
}

// The whole course as six rings, lecture 1 innermost. Colour = lecture, stroke = mastery, red = weak, dashed = not collected.
export function courseDisc(canvas, catalog, memory, { twist = 0, labels = true, focus = null } = {}) {
  const [c, half] = setupCanvas(canvas);
  const R = half * .97, inner = .34, n = catalog.lectures.length, step = R * (1 - inner) / n;
  catalog.lectures.forEach((L, k) => {
    const items = catalog.tracks.filter(t => t.deck === L.id).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
    if (!items.length) return;
    const r = R * inner + step * (k + .5), span = Math.PI * 2 / items.length, gap = Math.min(span * .16, .07), rot = -Math.PI / 2 + .09 + k * twist;
    c.globalAlpha = focus && focus !== L.id ? .28 : 1;
    items.forEach((t, i) => {
      const st = songState(memory.records[t.id]), a0 = rot + i * span + gap / 2, a1 = a0 + span - gap;
      c.setLineDash(st === 'none' ? [3, 4] : []);
      c.lineWidth = st === 'none' ? 1.2 : st === 'work' ? step * .22 : step * .56;
      c.strokeStyle = st === 'weak' ? PEN : st === 'none' ? 'rgba(102,104,111,.7)' : LCOL[L.id];
      c.beginPath(); c.arc(0, 0, r, a0, a1); c.stroke();
    });
    c.setLineDash([]);
    if (labels) { c.fillStyle = INK; c.font = `600 ${Math.max(9, step * .34)}px Archivo, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.rotate(rot - .045 + Math.PI / 2); c.fillText(String(L.id).padStart(2, '0'), 0, -r); c.restore(); }
    c.globalAlpha = 1;
  });
}

// Hover twist: rings ease into a spiral while the pointer is over the element and follow its angle.
// Touch devices twist once when the element first comes into view.
export function twistOnHover(el, draw, { max = .32, onceOnView = true } = {}) {
  if (reduced() || el.dataset.twist) return;
  el.dataset.twist = '1';
  let target = 0, cur = 0, ang = 0, raf = 0;
  const tick = () => { cur += (target + ang - cur) * .14; draw(cur); raf = Math.abs(target + ang - cur) > .002 ? requestAnimationFrame(tick) : 0; if (!raf) draw(target + ang); };
  const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
  if (canHover()) {
    el.addEventListener('pointerenter', () => { target = max; go(); });
    el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(); ang = Math.atan2(e.clientY - b.top - b.height / 2, e.clientX - b.left - b.width / 2) * .06; go(); });
    el.addEventListener('pointerleave', () => { target = 0; ang = 0; go(); });
  } else if (onceOnView && 'IntersectionObserver' in window) {
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { target = max * .8; go(); setTimeout(() => { target = 0; go(); }, 900); o.disconnect(); } }, { threshold: .6 }).observe(el);
  }
}
