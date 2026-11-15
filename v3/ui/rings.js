// One concentric-ring engine for the course disc, sound covers, the deck record and the decade zeros,
// so everything round on the site moves with the same language. Left alone the rings are alive but quiet:
// gears counter-rotate, a slow spiral winds and unwinds, a radial wave travels outward, a needle sweeps.
// A pointer scatters them from the inside out; leaving gathers them back from the outside in.
// Motion never changes what a mark means: colour = lecture, stroke = mastery, red = weak, dashed = not collected.
import { LCOL, coverRings, loadPeaks, peaksFor } from './visuals.js';
import { songState } from './mastery.js';
import { reduced, canHover } from './motion.js';

const TAU = Math.PI * 2, INK = '#141414', PEN = '#C8341B', UNCOLLECTED = 'rgba(92,94,101,.8)';

// Every number that shapes the motion lives here. Rates are radians per second, times are seconds.
export const RING = {
  gear: .05, gearGrow: .12,                                  // omega_k = gear * (k odd ? -1 : 1) * (1 + gearGrow * k)
  twistAmp: .10, twistRate: .13,                             // the autonomous spiral, about 48 s there and back
  breathAmp: .014, breathRate: .42, breathLag: .65,          // the radial wave, inner rings lead
  needleRate: .22, needleStart: -.95, needleAlpha: .35, needleSwell: .5, needleReach: .16,
  spreadBase: .10, spreadGrow: .45,                          // r = r0 * (1 + s * (base + grow * k / (n - 1)))
  thin: .42, shorten: .3, fade: .22,                         // at s = 1: stroke, arc length, outer-ring opacity
  spinUp: 5, hoverTwist: .32, aimTwist: .06,
  rippleEvery: 1.1, rippleLife: 1.9, rippleAlpha: .5, rippleReach: 1.75, rippleMax: 2,
  parallax: .055,                                            // tunnel depth as a share of R (10 px on the desktop disc)
  trace: .6, tracePitch: 6, traceDuty: .28,                  // the dashed stay-at-home circle each ring leaves behind (px, on-share)
  waveOut: .035, waveBack: .03,                              // stagger per ring, seconds
  springOut: [70, 14], springBack: [90, 15],                 // K, C
  enterMs: 560, enterLag: .03, enterTwist: .5, burstHold: .18,
  fpsPointer: 30, fpsTouch: 20,
};

const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = x => x * x * (3 - 2 * x);
// WebKit ignores setLineDash on arc() paths, so "dashed = not collected" would silently turn solid in Safari.
// Dashes are cut by hand: one path, a fixed count per arc, so they stretch with the ring instead of popping.
function dashedArc(c, x, y, r, a0, a1, count, duty) {
  const pitch = (a1 - a0) / count;
  c.beginPath();
  for (let i = 0; i < count; i++) { const a = a0 + i * pitch; c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.arc(x, y, r, a, a + pitch * duty); }
  c.stroke();
}
const angDist = (a, b) => { const d = (a - b) % TAU; return Math.abs(d > Math.PI ? d - TAU : d < -Math.PI ? d + TAU : d); };
const omega = k => RING.gear * (k % 2 ? -1 : 1) * (1 + RING.gearGrow * k);

// --hit, cubic-bezier(.08,.82,.17,1): most of the distance in the first quarter of the time, no bounce.
const hit = x => {
  if (x <= 0) return 0; if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const u = 1 - t, f = 3 * u * u * t * .08 + 3 * u * t * t * .17 + t * t * t - x, d = 3 * u * u * .08 + 6 * u * t * (.17 - .08) + 3 * t * t * (1 - .17);
    if (Math.abs(f) < 1e-4 || d < 1e-5) break;
    t = clamp01(t - f / d);
  }
  const u = 1 - t;
  return 3 * u * u * t * .82 + 3 * u * t * t + t * t * t;
};

// One rAF loop for the whole site. Only fields that have something to do are in `live`.
// `all` is the autonomous fields; passive covers join `live` only while pointed at, and a removed canvas cleans itself up.
const live = new Set(), all = new Set();
let raf = 0;
const pump = now => { raf = 0; for (const f of [...live]) f.frame(now); kick(); };
const kick = () => { if (!raf && live.size && !document.hidden) raf = requestAnimationFrame(pump); };
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(raf); raf = 0; return; }
  for (const f of live) f.resume();
  kick();
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => { for (const f of new Set([...all, ...live])) f.settle(); });
document.fonts?.ready.then(() => { for (const f of all) f.draw(); });

const seen = new WeakMap();
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { for (const e of es) seen.get(e.target)?.(e); }, { threshold: [0, .35] }) : null;

function makeField(canvas, { build, core, fill, hoverEl, autonomous, pulseOnView = false, needle = false, getFocus = null, getMarker = null }) {
  const c = canvas.getContext('2d');
  canvas.dataset.core = core.toFixed(4);
  let S = 0, dpr = 1, R = 0, model = null, rings = [];
  let t = 0, theta = RING.needleStart, posed = false, wanted = !autonomous, inView = true, hover = false, pulsed = false;
  let px = 0, py = 0, aimX = 0, aimY = 0, ang = 0, aimAng = 0, lastAim = null;
  let ripples = [], nextRipple = 0, frozenRipples = null;
  let enterAt = null, enterD = 0, enterTimer = 0;
  let lastStep = 0, lastPaint = 0;
  const fps = canHover() ? RING.fpsPointer : RING.fpsTouch;
  const stops = new AbortController(), watched = hoverEl || canvas;

  const busy = () => hover || enterAt !== null || ripples.length > 0 || rings.some(r => r.s !== r.goal || r.v !== 0 || r.queue.length > 0);
  const canRun = () => wanted && inView && !posed && S > 0 && !reduced();
  const sync = () => {
    if (canRun() && (autonomous || busy())) { if (!live.has(api)) { lastStep = lastPaint = 0; live.add(api); } kick(); }
    else live.delete(api);
  };
  const focusAlpha = ring => { const id = getFocus?.(); return id && id !== ring.m.id ? .28 : 1; };

  function measure() {
    const size = canvas.clientWidth;
    if (!size) { S = 0; return false; }
    const ratio = Math.min(2, devicePixelRatio || 1);
    if (size === S && ratio === dpr && canvas.width === Math.round(S * dpr)) return true;
    S = size; dpr = ratio; R = S / 2 * core * fill;
    canvas.width = Math.round(S * dpr); canvas.height = Math.round(S * dpr);
    return true;
  }
  function rebuild() {
    model = build(R);
    const n = model.rings.length;
    rings = model.rings.map((m, k) => {
      const old = rings[k];
      return old ? Object.assign(old, { m }) : { m, phi: 0, s: 0, v: 0, goal: 0, queue: [], fa: 1 };
    });
    return n;
  }
  function restRings() { for (const r of rings) { r.s = r.goal = r.v = 0; r.queue = []; } }

  function step(dt) {
    t += dt; theta += RING.needleRate * dt;
    rings.forEach((r, k) => {
      while (r.queue.length && r.queue[0].at <= t) r.goal = r.queue.shift().goal;
      if (r.s !== r.goal || r.v !== 0) {
        const [K, C] = r.goal > r.s ? RING.springOut : RING.springBack;
        for (let left = dt; left > 0; left -= 1 / 120) { const h = Math.min(left, 1 / 120); r.v += (K * (r.goal - r.s) - C * r.v) * h; r.s += r.v * h; }
        if (Math.abs(r.goal - r.s) < .0008 && Math.abs(r.v) < .006) { r.s = r.goal; r.v = 0; }
      }
      r.phi += omega(k) * (1 + RING.spinUp * clamp01(r.s)) * dt;
      r.fa += (focusAlpha(r) - r.fa) * Math.min(1, dt * 14);
    });
    const ease = Math.min(1, dt * 8);
    px += (aimX - px) * ease; py += (aimY - py) * ease; ang += (aimAng - ang) * ease;
    if (hover && model.ripple && t >= nextRipple && ripples.length < RING.rippleMax) { ripples.push(t); nextRipple = t + RING.rippleEvery; }
    if (ripples.length) ripples = ripples.filter(b => t - b < RING.rippleLife);
    if (enterAt !== null && t - enterAt > enterD + rings.length * RING.enterLag) enterAt = null;
  }

  function paint() {
    if (!S || !model) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, S, S); c.translate(S / 2, S / 2);
    c.lineCap = 'butt';
    const n = rings.length, last = Math.max(1, n - 1), inner = model.innerR;
    let mean = 0; for (const r of rings) mean += clamp01(r.s); mean /= n || 1;
    const auto = RING.twistAmp * Math.sin(t * RING.twistRate), twist = auto + (RING.hoverTwist + ang * RING.aimTwist - auto) * smooth(mean);
    const par = R * RING.parallax;

    // Scaffold first: what stayed behind reads as structure under what moved.
    if (model.trace) {
      c.strokeStyle = model.line; c.lineWidth = .5;
      rings.forEach(r => {
        const s = clamp01(r.s); if (s < .02) return;
        c.globalAlpha = RING.trace * s * r.fa;
        dashedArc(c, 0, 0, r.m.r0, 0, TAU, Math.round(TAU * r.m.r0 / RING.tracePitch), RING.traceDuty);
      });
    }
    const waves = frozenRipples || ripples.map(b => (t - b) / RING.rippleLife);
    if (waves.length) {
      c.strokeStyle = model.line; c.lineWidth = 1;
      const end = Math.min(R * RING.rippleReach, S / 2 - 1);
      for (const p of waves) {
        const q = 1 - (1 - p) * (1 - p);
        c.globalAlpha = RING.rippleAlpha * (1 - p);
        c.beginPath(); c.arc(0, 0, inner + (end - inner) * q, 0, TAU); c.stroke();
      }
    }

    let outer = 0;
    const mark = getMarker?.();
    rings.forEach((r, k) => {
      const q = k / last, s = r.s, sc = clamp01(s), m = r.m;
      const e = enterAt === null ? 1 : hit((t - enterAt - k * RING.enterLag) / enterD);
      if (e < .01) return;
      const breath = 1 + RING.breathAmp * Math.sin(t * RING.breathRate - k * RING.breathLag);
      const rad = m.r0 * breath * (1 + s * (RING.spreadBase + RING.spreadGrow * q)) * e;
      const ox = px * q * par, oy = py * q * par;
      const rot = model.base + r.phi + k * (twist + (1 - e) * RING.enterTwist);
      const widthK = 1 - RING.thin * sc, lenK = 1 - RING.shorten * sc;
      const alpha = r.fa * (1 - RING.fade * sc * q) * Math.min(1, e * 3);
      outer = Math.max(outer, rad + (m.width || 0) / 2);
      c.globalAlpha = alpha;
      for (const a of m.arcs) {
        const mid = rot + a.mid, half = a.half * lenK, w = a.dashes ? Math.max(.8, a.width * widthK) : a.width * widthK;
        c.strokeStyle = a.color; c.fillStyle = a.color; c.lineWidth = w;
        if (a.dashes) { dashedArc(c, ox, oy, rad, mid - half, mid + half, a.dashes, .46); continue; }
        const reach = half + RING.needleReach;
        if (!needle || angDist(mid, theta) >= reach) {
          c.beginPath(); c.arc(ox, oy, rad, mid - half, mid + half); c.stroke();
          continue;
        }
        // Closest to the needle the stroke swells: the needle is reading this song's mastery.
        const lead = ((theta - mid) % TAU + TAU + Math.PI) % TAU - Math.PI;
        const from = Math.max(-half, lead - RING.needleReach), to = Math.min(half, lead + RING.needleReach);
        if (from > -half) { c.beginPath(); c.arc(ox, oy, rad, mid - half, mid + from + .004); c.stroke(); }
        if (to < half) { c.beginPath(); c.arc(ox, oy, rad, mid + to - .004, mid + half); c.stroke(); }
        const steps = Math.max(4, Math.ceil((to - from) / .025));
        const edge = (i, sign) => { const b = mid + from + (to - from) * i / steps, hw = w / 2 * (1 + RING.needleSwell * smooth(1 - clamp01(angDist(b, theta) / RING.needleReach))); c.lineTo(ox + Math.cos(b) * (rad + sign * hw), oy + Math.sin(b) * (rad + sign * hw)); };
        c.beginPath();
        for (let i = 0; i <= steps; i++) edge(i, 1);
        for (let i = steps; i >= 0; i--) edge(i, -1);
        c.closePath(); c.fill();
      }
      if (m.label) {
        c.globalAlpha = r.fa * Math.min(1, e * 3); c.fillStyle = INK; c.font = m.font; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(m.label, ox + Math.cos(rot) * rad, oy + Math.sin(rot) * rad);
      }
      const marked = mark && m.arcs.find(x => x.id === mark);
      if (marked) {
        const z = Math.max(4, m.step * .2), at = rot + marked.mid, rm = rad + marked.width * widthK / 2 + z;
        c.save(); c.globalAlpha = 1; c.fillStyle = INK; c.translate(ox + Math.cos(at) * rm, oy + Math.sin(at) * rm); c.rotate(at); c.fillRect(-z / 2, -z / 2, z, z); c.restore();
      }
    });
    if (needle) {
      const a = theta, rIn = inner + (rings[0]?.m.step || 0) * .1, rOut = (outer || R) + R * .05;
      c.globalAlpha = RING.needleAlpha * (enterAt === null ? 1 : clamp01((t - enterAt) / enterD)); c.strokeStyle = INK; c.lineWidth = 1;
      c.beginPath(); c.moveTo(Math.cos(a) * rIn, Math.sin(a) * rIn); c.lineTo(Math.cos(a) * rOut, Math.sin(a) * rOut); c.stroke();
    }
    c.globalAlpha = 1;
  }

  function aim(e) {
    if (!e || e.clientX === undefined) return;
    const b = canvas.getBoundingClientRect(), r = b.width * core / 2 || 1;
    const x = (e.clientX - b.left - b.width / 2) / r, y = (e.clientY - b.top - b.height / 2) / r, len = Math.hypot(x, y);
    aimX = len > 1 ? x / len : x; aimY = len > 1 ? y / len : y;
    const raw = Math.atan2(y, x);
    if (lastAim !== null) { let d = raw - lastAim; d = d > Math.PI ? d - TAU : d < -Math.PI ? d + TAU : d; aimAng += d; } else aimAng = 0;
    lastAim = raw;
  }

  const api = {
    // Rebuild from current data and paint now. Never waits on rAF, so the first frame is there when the room appears.
    draw() {
      if (!measure()) return api;
      rebuild();
      if (!live.has(api)) for (const r of rings) r.fa = focusAlpha(r);
      paint();
      return api;
    },
    start() { wanted = true; posed = false; frozenRipples = null; api.draw(); sync(); return api; },
    // Off screen nothing runs. State rests, so coming back never replays half a gesture.
    stop() {
      wanted = false; hover = false; ripples = []; aimX = aimY = px = py = ang = aimAng = 0; lastAim = null; enterAt = null;
      clearTimeout(enterTimer); restRings(); live.delete(api);
      return api;
    },
    setHover(on, e) {
      on = !!on;
      if (on) aim(e);
      if (on === hover || reduced() || posed) return api;
      hover = on;
      const n = rings.length;
      rings.forEach((r, k) => { r.queue = [{ at: t + (on ? k * RING.waveOut : (n - 1 - k) * RING.waveBack), goal: on ? 1 : 0 }]; });
      if (on) nextRipple = t; else { aimX = aimY = aimAng = 0; lastAim = null; }
      sync();
      return api;
    },
    // A one-shot breath: out from the inside, back from the outside. Reveals and clicks use it.
    burst(a = 1) {
      if (reduced() || posed || !wanted) return api;
      const n = rings.length, top = t + (n - 1) * RING.waveOut + RING.burstHold;
      rings.forEach((r, k) => { r.queue = [{ at: t + k * RING.waveOut, goal: a }, { at: top + (n - 1 - k) * RING.waveBack, goal: hover ? 1 : 0 }]; });
      sync();
      return api;
    },
    // Radiate out from the centre into place, used when home arrives. The fallback timer is the final state.
    enter(ms = RING.enterMs) {
      if (reduced() || posed || !S) return api;
      enterAt = t; enterD = ms / 1000;
      paint(); sync();
      clearTimeout(enterTimer);
      enterTimer = setTimeout(() => { if (enterAt !== null) { enterAt = null; paint(); sync(); } }, ms + rings.length * RING.enterLag * 1000 + 160);
      return api;
    },
    // Paint one exact pose and hold it, for still-frame review. start() lets go of it.
    pose({ t: at = 0, spread = 0, px: x = 0, py: y = 0, ripples: rip = null, angle = 0 } = {}) {
      if (!measure()) return api;
      rebuild();
      posed = true; live.delete(api); t = at; theta = RING.needleStart + RING.needleRate * at; hover = false; ripples = []; enterAt = null;
      px = aimX = x; py = aimY = y; ang = aimAng = angle; frozenRipples = rip;
      rings.forEach((r, k) => { r.phi = omega(k) * at; r.s = r.goal = spread; r.v = 0; r.queue = []; r.fa = focusAlpha(r); });
      paint();
      return api;
    },
    // Step the simulation by hand, so a film strip can be checked where rAF does not run.
    advance(ms, each = 16) { for (let left = ms; left > 0; left -= each) step(Math.min(left, each) / 1000); paint(); return api; },
    resize() { return api.draw(); },
    destroy() { api.stop(); stops.abort(); all.delete(api); if (io) { io.unobserve(watched); seen.delete(watched); } return api; },
    // The visual circle on screen, for flights that have to land exactly on it.
    rect() { const b = canvas.getBoundingClientRect(), d = b.width * core; return { left: b.left + (b.width - d) / 2, top: b.top + (b.height - d) / 2, width: d, height: d, cx: b.left + b.width / 2, cy: b.top + b.height / 2, r: d / 2 }; },
    // Scheduler hooks.
    frame(now) {
      if (!canvas.isConnected) { api.destroy(); return; }
      if (!lastStep) { lastStep = lastPaint = now; return; }
      const idle = !busy();
      if (now - lastPaint < 1000 / (idle ? fps : 60) - 3) return;
      const dt = Math.min(.1, (now - lastStep) / 1000);
      lastStep = lastPaint = now;
      step(dt); paint();
      if (!autonomous && idle && !busy()) live.delete(api);
    },
    resume() { lastStep = lastPaint = 0; },
    settle() { if (reduced()) { hover = false; ripples = []; enterAt = null; restRings(); api.draw(); } sync(); },
  };

  if (hoverEl) {
    const opts = { signal: stops.signal };
    hoverEl.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') api.setHover(true, e); }, opts);
    hoverEl.addEventListener('pointermove', e => { if (hover) aim(e); }, opts);
    hoverEl.addEventListener('pointerleave', () => api.setHover(false), opts);
    hoverEl.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') api.setHover(true, e); }, opts);
    for (const type of ['pointerup', 'pointercancel']) hoverEl.addEventListener(type, e => { if (e.pointerType === 'touch') api.setHover(false); }, opts);
  }
  if (io) {
    seen.set(watched, e => {
      inView = e.isIntersecting;
      if (!inView) pulsed = false;
      if (pulseOnView && wanted && !pulsed && !canHover() && e.intersectionRatio >= .35) { pulsed = true; if (enterAt === null) api.burst(.7); else setTimeout(() => api.burst(.7), enterD * 1000); }
      sync();
    });
    io.observe(watched);
  }
  if (autonomous) all.add(api);
  api.draw();
  return api;
}

// The course as six rings, lecture 1 innermost. Each ring reserves a notch for its number, so 01–06 never sit on a stroke.
function discModel(R, catalog, memory) {
  const inner = .34, lectures = catalog.lectures, step = R * (1 - inner) / lectures.length, size = Math.max(10.5, step * .36);
  return {
    base: -Math.PI / 2, innerR: R * inner, line: INK, trace: true, ripple: true,
    rings: lectures.map((L, k) => {
      const items = catalog.tracks.filter(t => t.deck === L.id).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
      const r0 = R * inner + step * (k + .5), notch = size * 1.9 / r0, span = (TAU - notch) / (items.length || 1), gap = Math.min(span * .16, .07);
      const arcs = items.map((t, i) => {
        const st = songState(memory.records[t.id]);
        return { id: t.id, mid: notch / 2 + span * (i + .5), half: (span - gap) / 2, dashes: st === 'none' ? Math.max(2, Math.round((span - gap) * r0 / 7)) : 0, width: st === 'none' ? 1.3 : st === 'work' ? step * .22 : step * .56, color: st === 'weak' ? PEN : st === 'none' ? UNCOLLECTED : LCOL[L.id] };
      });
      return { id: L.id, r0, step, width: step * .56, arcs, label: String(L.id).padStart(2, '0'), font: `600 ${size}px Archivo, sans-serif` };
    }),
  };
}

// A song's sound as rings, outermost groove first in the data, k = 0 innermost in the engine.
function coverModel(R, track, { fg, neutral, inner }) {
  const m = coverRings(track, { neutral, inner }), step = (R - R * m.inner) / m.count, width = Math.max(1.4, step * .46), color = fg || (track ? LCOL[track.deck] : INK);
  return {
    base: 0, innerR: R * m.inner, line: fg || INK, trace: R >= 24, ripple: R >= 40,
    rings: m.rings.slice().reverse().map(g => ({
      id: g.g, r0: R - g.g * step - step / 2, step, width, label: null,
      arcs: g.arcs.map(a => ({ mid: g.off + a.at + a.len / 2, half: a.len / 2, dashes: 0, width, color })),
    })),
  };
}

export function createDisc(canvas, { catalog, getMemory, getFocus = null, getMarker = null, hoverEl = null } = {}) {
  return makeField(canvas, {
    core: 1 / 1.7, fill: .97, hoverEl: hoverEl || canvas.parentElement, autonomous: true, needle: true, pulseOnView: true, getFocus, getMarker,
    build: R => discModel(R, catalog, getMemory()),
  });
}

// `canvas` should be 1.5 times the visual circle (its CSS is the caller's), and `hoverEl` is the round hit area.
// Sleeps until pointed at. With `autonomous` it keeps moving between start() and stop().
export function createCover(canvas, track, { fg = null, neutral = false, inner, autonomous = false, hoverEl = null, core = 1 / 1.5 } = {}) {
  const field = makeField(canvas, { core, fill: .96, hoverEl, autonomous, build: R => coverModel(R, track, { fg, neutral, inner }) });
  if (track && !neutral && !peaksFor(track)) loadPeaks().then(() => field.draw());
  return field;
}
