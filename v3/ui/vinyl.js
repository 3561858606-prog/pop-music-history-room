// An iridescent vinyl record, drawn with Canvas 2D. The grooves are drawn once; the sheen (two rainbow wedges and two
// white glints) is fixed to the light, not to the record, exactly as on a real disc: the record can spin underneath
// (a CSS rotation of the label) while the canvas is only redrawn when the light moves. No WebGL, no library.
const TAU = Math.PI * 2;
const conic = (g, a, x, y) => (typeof g.createConicGradient === 'function' ? g.createConicGradient(a, x, y) : null);

function grooves(px) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), R = px / 2;
  const base = g.createRadialGradient(R, R, R * .3, R, R, R);
  base.addColorStop(0, '#151515'); base.addColorStop(1, '#0a0a0a');
  g.fillStyle = base; g.beginPath(); g.arc(R, R, R, 0, TAU); g.fill();
  // grooves: fine rings with a little variation, a lead-in band and gaps between tracks
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const step = Math.max(1, px / 420);
  for (let r = R * .36; r < R * .975; r += step) {
    const gap = [.52, .63, .74, .85].some(k => Math.abs(r / R - k) < .006);
    g.strokeStyle = gap ? 'rgba(255,255,255,.015)' : `rgba(255,255,255,${(.025 + rnd() * .05).toFixed(3)})`;
    g.lineWidth = step * .55; g.beginPath(); g.arc(R, R, r, 0, TAU); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = Math.max(1, px / 300); g.beginPath(); g.arc(R, R, R * .985, 0, TAU); g.stroke();
  return c;
}

// draw(angle): angle is where the light comes from, in radians; strength 0..1 scales the colour.
export function createVinyl(canvas, { size = 480 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), px = Math.round(size * dpr);
  canvas.width = canvas.height = px; canvas.style.width = canvas.style.height = size + 'px';
  const g = canvas.getContext('2d'), base = grooves(px), R = px / 2;
  let raf = 0, want = { a: .7, s: 1 };
  function paint({ a, s }) {
    g.clearRect(0, 0, px, px);
    g.drawImage(base, 0, 0);
    g.save(); g.beginPath(); g.arc(R, R, R * .975, 0, TAU); g.arc(R, R, R * .35, 0, TAU, true); g.clip();
    g.globalCompositeOperation = 'screen';
    const hues = ['rgba(255,70,90,0)', 'rgba(255,120,60,.42)', 'rgba(255,226,90,.40)', 'rgba(80,240,170,.36)', 'rgba(70,150,255,.42)', 'rgba(170,90,255,.38)', 'rgba(255,70,200,0)'];
    for (const off of [0, Math.PI]) {
      const cg = conic(g, a + off - .45, R, R);
      if (cg) { hues.forEach((h, i) => cg.addColorStop(i / 48, h)); cg.addColorStop(7 / 48, 'rgba(0,0,0,0)'); cg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = s; g.fillStyle = cg; g.fillRect(0, 0, px, px); }
      else { const lg = g.createLinearGradient(R + Math.cos(a + off) * R, R + Math.sin(a + off) * R, R, R); lg.addColorStop(0, 'rgba(120,180,255,.35)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = s; g.fillStyle = lg; g.fillRect(0, 0, px, px); }
      // the glint: a thin white wedge right where the light hits
      const w = conic(g, a + off - .05, R, R);
      if (w) { w.addColorStop(0, 'rgba(255,255,255,0)'); w.addColorStop(.012, 'rgba(255,255,255,.55)'); w.addColorStop(.03, 'rgba(255,255,255,0)'); w.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = .9 * s; g.fillStyle = w; g.fillRect(0, 0, px, px); }
    }
    g.restore();
  }
  const api = {
    // move the light; the redraw waits for the next frame and collapses repeated calls
    light(a, s = 1) { want = { a, s }; if (!raf) raf = requestAnimationFrame(() => { raf = 0; paint(want); }); return api; },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
  paint(want);
  return api;
}
