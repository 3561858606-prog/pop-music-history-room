// The red pen: strokes on an SVG overlay inside a positioned container.
import { reduced } from './motion.js';

function smooth(p) {
  const f = v => v.toFixed(1); let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) { const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2; d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`; }
  return d;
}
export function overlay(container) {
  let svg = container.querySelector(':scope > svg.pen');
  if (!svg) { svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('class', 'pen'); svg.setAttribute('aria-hidden', 'true'); container.appendChild(svg); }
  const b = container.getBoundingClientRect(); svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
  return { svg, b };
}
export function clearPen(container) { container?.querySelector(':scope > svg.pen')?.remove(); }
function stroke(svg, d, { animate = false, delay = 0 } = {}) {
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); svg.appendChild(p);
  if (animate && !reduced()) {
    const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
    p.getBoundingClientRect();
    p.style.transition = `stroke-dashoffset 240ms cubic-bezier(.2,.7,.2,1) ${delay}ms`;
    setTimeout(() => { p.style.strokeDashoffset = 0; }, 20);
    setTimeout(() => { p.style.transition = 'none'; p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = 0; }, 320 + delay);
  }
  return p;
}
// A hand-drawn loop around an element; the seed keeps each loop's wobble stable between renders.
export function penLoop(container, target, { padX = 9, padY = 5, seed = 3, ...o } = {}) {
  const { svg, b } = overlay(container), r = target.getBoundingClientRect();
  let s = seed * 7919 + 13; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const cx = r.left - b.left + r.width / 2, cy = r.top - b.top + r.height / 2, rx = r.width / 2 + padX, ry = r.height / 2 + padY, pts = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30, a = Math.PI * 1.1 + Math.PI * 2.16 * t, j = 1 + (rnd() - .5) * .04 + .02 * Math.sin(t * 7); pts.push([cx + Math.cos(a) * rx * j + t * 3, cy + Math.sin(a) * ry * j - t * 2]); }
  return stroke(svg, smooth(pts), o);
}
export function penStrike(container, target, o = {}) {
  const { svg, b } = overlay(container), r = target.getBoundingClientRect(), y = r.top - b.top + r.height * .55, x0 = r.left - b.left - 2, x1 = r.right - b.left + 2;
  return stroke(svg, smooth([[x0, y + 1], [(x0 + x1) / 2, y - 1], [x1, y]]), o);
}
