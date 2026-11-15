// 平面的盘（SVG）。它是 WebGL 不可用时的探索页，也是训练反馈和结果页里的小盘。
import {rings, bands, GEO, TAU, lanesOf, localXZ} from './model.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, parent) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
const C = {lacquer: '#0F0D0C', gap: '#070606', paper: '#EEE8DA', ink: '#16130F', amber: '#E7A33C', cut: '#B9AC98', cutCoarse: '#8E7F6C'};

// 一段从辐线起、顺时针的圆弧：用整圆加虚线画，长度可以过渡。
function arc(parent, r, phi, frac, width, color, opacity = 1) {
  const len = TAU * r;
  return el('circle', {r, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-opacity': opacity,
    'stroke-dasharray': `${Math.max(0, frac) * len} ${len}`, transform: `rotate(${phi * 180 / Math.PI - 90})`}, parent);
}

/**
 * opts.detail  true：每圈画四道（歌名、年份、音乐家、风格）；false：每圈一道，取平均
 * opts.focus   曲目 id：这一圈和它的辐线用琥珀色标出
 * opts.marks   Set<id>：本轮出现过的圈，画一个小点
 * opts.digits  是否画盘缘的 0—9
 * opts.decades 是否画年代名
 */
export function flatDisc(opts = {}) {
  const {detail = false, focus = null, marks = null, digits = true, decades = false, label = true, title = '母盘'} = opts;
  const pad = digits ? 1.13 : 1.02;
  const svg = el('svg', {viewBox: `${-pad} ${-pad} ${pad * 2} ${pad * 2}`, role: 'img', 'aria-label': title, class: 'flat-disc'});
  el('circle', {r: 1, fill: C.lacquer}, svg);
  el('circle', {r: .992, fill: 'none', stroke: 'rgba(238,232,218,.16)', 'stroke-width': .004}, svg);
  // 年代之间的间隔带
  for (let i = 0; i < bands.length - 1; i++) {
    const a = bands[i].inner, b = bands[i + 1].outer;
    el('circle', {r: (a + b) / 2, fill: 'none', stroke: C.gap, 'stroke-width': a - b}, svg);
  }
  const u = GEO.unit, gArcs = el('g', {}, svg), refs = new Map();
  for (const g of rings) {
    el('circle', {r: g.mid, fill: 'none', stroke: 'rgba(238,232,218,.075)', 'stroke-width': u * .12}, gArcs);
    const lanes = lanesOf(g.id), color = g.coarse ? C.cutCoarse : C.cut;
    if (detail) {
      refs.set(g.id, lanes.map((m, k) => arc(gArcs, g.outer - u * (.185 + .21 * k), g.phi, m, u * .15, color, .9)));
    } else {
      const m = lanes.reduce((a, b) => a + b, 0) / 4;
      refs.set(g.id, [arc(gArcs, g.mid, g.phi, m, u * .7, color, .85)]);
    }
  }
  if (marks) for (const id of marks) { const g = rings.find(r => r.id === id); if (!g) continue; const [x, z] = localXZ(g.mid, g.phi); el('circle', {r: g.mid, fill: 'none', stroke: C.amber, 'stroke-width': u * .5, 'stroke-opacity': .55}, svg); el('circle', {cx: x, cy: z, r: .024, fill: C.amber, stroke: C.lacquer, 'stroke-width': .007}, svg); }
  if (label) {
    el('circle', {r: GEO.RL, fill: C.paper}, svg);
    el('circle', {r: GEO.RL * .93, fill: 'none', stroke: C.ink, 'stroke-width': .003, 'stroke-opacity': .5}, svg);
    el('circle', {r: .016, fill: C.lacquer}, svg);
  }
  if (digits) for (let d = 0; d < 10; d++) {
    const [x, z] = localXZ(1.07, d / 10 * TAU);
    const t = el('text', {x, y: z, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': .075, class: 'fd-digit'}, svg);
    t.textContent = d;
    const [x1, z1] = localXZ(.965, d / 10 * TAU), [x2, z2] = localXZ(.995, d / 10 * TAU);
    el('line', {x1, y1: z1, x2, y2: z2, stroke: 'rgba(238,232,218,.5)', 'stroke-width': .006}, svg);
  }
  if (decades) for (const b of bands) {
    const [x, z] = localXZ(b.mid, 205 * Math.PI / 180);
    const t = el('text', {x, y: z, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': .042, class: 'fd-decade'}, svg);
    t.textContent = b.label;
  }
  const gFocus = el('g', {}, svg);
  const api = {svg, refs,
    setFocus(id) {
      gFocus.replaceChildren();
      for (const n of svg.querySelectorAll('.fd-digit.on')) n.classList.remove('on');
      const g = rings.find(r => r.id === id); if (!g) return;
      const b = bands[g.band];
      el('circle', {r: b.mid, fill: 'none', stroke: C.amber, 'stroke-width': b.outer - b.inner, 'stroke-opacity': .13}, gFocus);
      el('circle', {r: g.mid, fill: 'none', stroke: C.amber, 'stroke-width': Math.max(u * .5, .006)}, gFocus);
      const spoke = g.digit / 10 * TAU, [x1, z1] = localXZ(GEO.RL + .02, spoke), [x2, z2] = localXZ(1, spoke);
      el('line', {x1, y1: z1, x2, y2: z2, stroke: C.amber, 'stroke-width': .006, 'stroke-opacity': .7, 'stroke-dasharray': '.012 .014'}, gFocus);
      const [x, z] = localXZ(g.mid, g.phi);
      el('circle', {cx: x, cy: z, r: .028, fill: C.amber, stroke: C.lacquer, 'stroke-width': .008}, gFocus);
      svg.querySelectorAll('.fd-digit')[g.digit]?.classList.add('on');
    },
    // 把一圈的刻纹从旧值过渡到新值
    cut(id, to, ms = 900) {
      const nodes = refs.get(id); if (!nodes) return;
      const g = rings.find(r => r.id === id);
      const vals = nodes.length === 1 ? [to.reduce((a, b) => a + b, 0) / 4] : to;
      nodes.forEach((n, k) => {
        const len = TAU * +n.getAttribute('r');
        n.style.transition = `stroke-dasharray ${ms}ms cubic-bezier(.3,.7,.2,1)`;
        requestAnimationFrame(() => { n.style.strokeDasharray = `${vals[k] * len} ${len}`; });
      });
      return g;
    }};
  if (focus) api.setFocus(focus);
  return api;
}
