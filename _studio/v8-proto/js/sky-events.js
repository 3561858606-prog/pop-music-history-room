// 天文年表：唱片上的每个年代，配一件那个年代真实发生过的天文事件。
// 这里只有数据和时间线（纯 JS，没有 GL）；cosmos.js 负责画。歌是年份的锚，天上的事件也是。
// 每件事件：make(ctx) → {frame(age) → {quads, points, fx, anchor}, cues} ；放不下返回 null
// ctx：{W, H, foe, rx, ry, top, right, spot(w, h) → 中心 | null, rim(dir) → 盘边上朝 dir 的点, r() 随机}
// quad.kind：0 彗星 · 1 光帘（极光 / 地平线的光） · 2 旋涡星系 · 3 天体（p[1]：0 行星 1 月球 2 地球 3 日食）

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const fade = (age, dur, fi = 2, fo = 3) => sm(0, fi, age) * (1 - sm(dur - fo, dur, age));
const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const TAU = Math.PI * 2;
const at = (c, v, k) => [c[0] + v[0] * k, c[1] + v[1] * k];

// 彗星：彗尾总是背着「太阳」（唱片就是太阳）；彗头绕着它慢慢走
const comet = o0 => ctx => {
  let c = null, o = o0;   // 放不下就短一点
  for (const k of [1, .8, .64, .5, .4, .32]) { o = {...o0, len: o0.len * k}; if ((c = ctx.spot(o.len * .95, o.len * .8))) break; }
  if (!c) return null;
  const away = norm([c[0] - ctx.foe[0], c[1] - ctx.foe[1]]), side = [-away[1], away[0]];
  return {frame(age) {
    const head = at(at(c, away, -o.len * .33), side, o.drift * (age - o.dur / 2));
    const dir = norm([head[0] - ctx.foe[0], head[1] - ctx.foe[1]]), a = fade(age, o.dur, 3, 4);
    return {a, anchor: [head[0], head[1] + 20],
      quads: [{kind: 0, ctr: at(head, dir, o.len / 2 - 14), half: [o.len / 2 + 14, o.len * .34 + 12], roll: Math.atan2(dir[1], dir[0]),
        col: o.col, col2: o.col2 || [.55, .7, 1], p: [o.len, o.curve, o.spread, o.ion || 0], a: a * (o.gain || 1), ripK: .6}]};
  }};
};

// 天体：一颗星球，可以带几颗绕它转的小卫星
const body = o => ctx => {
  const R = o.R, c = ctx.spot(R * 2 + (o.moons ? R * 6 : 40), R * 2 + (o.moons ? R * 4 : 40)); if (!c) return null;
  const sun = norm([ctx.foe[0] - c[0], ctx.foe[1] - c[1]]);
  return {frame(age) {
    const a = fade(age, o.dur, 2.5, 3.5), pts = [];
    for (const m of o.moons || []) {   // 卫星在一个斜着的轨道平面上：x = cos，y = sin × 倾斜
      const th = (age / m.period + m.phase) * TAU, x = Math.cos(th) * m.r * R, y = Math.sin(th) * m.r * R * .28;
      if (Math.sin(th) < 0 && Math.abs(x) < R) continue;   // 转到星球背后就看不见
      pts.push({p: [c[0] + x, c[1] + y], px: m.px, col: m.col || [1, .96, .9], a: a * (m.a || .8)});
    }
    return {a, anchor: [c[0], c[1] + R + 22], points: pts,
      quads: [{kind: 3, ctr: c, half: [R * (o.corona ? 4 : 1.6) + 4, R * (o.corona ? 4 : 1.6) + 4], roll: 0, col: o.col, col2: o.col2 || [1, 1, 1],
        p: [R, o.mode, o.bands || 0, o.corona || 0], dir: sun, a, ripK: 1}],
      fx: o.lens ? {lens: [c[0], c[1], R, o.lens * sm(1, 4, age) * (1 - sm(o.dur - 3, o.dur, age))]} : null};
  }};
};

export const ERAS = [
  {id: 'donati', decade: 1850, year: 1858, label: '1858 · 多纳蒂彗星：第一颗被拍成照片的彗星', dur: 16, sound: 'shimmer',
    make: comet({len: 230, curve: .28, spread: .2, ion: .5, drift: 3, dur: 16, col: [1, .9, .72]})},
  {id: 'carrington', decade: 1850, year: 1859, label: '1859 · 卡林顿事件：太阳风暴，连热带都看见了极光', dur: 15, sound: 'aurora',
    make: ctx => ({frame(age) { const a = fade(age, 15, 3.5, 4.5), w = Math.min(ctx.right, ctx.W) - 40;
      return {a, anchor: [20 + w * .32, ctx.top + 150],
        quads: [{kind: 1, ctr: [20 + w / 2, ctx.top + 96], half: [w / 2, 96], roll: 0, col: [.35, 1, .55], col2: [1, .32, .38], p: [0, ctx.r() * 9, 0, 0], a, ripK: 0}]}; }})},
  {id: 'helium', decade: 1860, year: 1868, label: '1868 · 日食的光谱里出现一条黄线：发现了氦', dur: 13, sound: 'shimmer',
    make: body({R: 17, mode: 3, corona: 1, col: [1, .86, .45], col2: [1, .35, .3], dur: 13})},
  {id: 'mars', decade: 1870, year: 1877, label: '1877 · 霍尔发现火星的两颗小卫星', dur: 14, sound: 'orbit',
    make: body({R: 14, mode: 0, col: [.95, .45, .26], dur: 14,
      moons: [{r: 1.8, period: 2.4, phase: 0, px: 2.2, a: 1}, {r: 3.2, period: 5.6, phase: .4, px: 2, a: .85}]})},
  {id: 'comet1882', decade: 1880, year: 1882, label: '1882 · 九月大彗星，白天也看得见', dur: 16, sound: 'shimmer',
    make: comet({len: 320, curve: .08, spread: .13, ion: .25, drift: 2.5, dur: 16, gain: 1.25, col: [1, .95, .85]})},
  {id: 'amalthea', decade: 1890, year: 1892, label: '1892 · 巴纳德发现木卫五：伽利略之后木星的第一颗新卫星', dur: 14, sound: 'orbit',
    make: body({R: 17, mode: 0, bands: 7, col: [.95, .82, .64], dur: 14, moons: [
      {r: 1.5, period: 1.6, phase: 0, px: 2.4, col: [1, .85, .6], a: 1},
      {r: 2.8, period: 9, phase: .1, px: 1.8, a: .7}, {r: 3.8, period: 15, phase: .55, px: 1.8, a: .7},
      {r: 5, period: 24, phase: .3, px: 2, a: .7}, {r: 6.6, period: 40, phase: .8, px: 1.9, a: .7}]})},
  {id: 'tunguska', decade: 1900, year: 1908, label: '1908 · 通古斯大爆炸：之后好几晚，欧洲的夜空亮得能读报', dur: 13, sound: 'rumble',
    make: ctx => { const x0 = ctx.r() * Math.min(ctx.right, ctx.W) * .5 + 60, y0 = ctx.top + 30, v = norm([.9, 1.1]);
      return {frame(age) {
        const qs = [], glow = sm(1.2, 3, age) * (1 - sm(9, 13, age)), w = Math.min(ctx.right, ctx.W) - 40;
        if (age < 1.6) { const head = at([x0, y0], v, age * 260), f = sm(0, .2, age) * (1 - sm(1.2, 1.6, age));
          qs.push({kind: 0, ctr: at(head, v, -30), half: [44, 14], roll: Math.atan2(-v[1], -v[0]), col: [1, .78, .5], col2: [1, .6, .4], p: [60, 0, .05, 0], a: f * 1.6, ripK: 0}); }
        qs.push({kind: 1, ctr: [20 + w / 2, ctx.H - 70], half: [w / 2, 70], roll: 0, col: [1, .62, .42], col2: [1, .5, .62], p: [1, 0, 0, 0], a: glow, ripK: 0});
        return {a: Math.max(glow, age < 1.6 ? 1 : 0), anchor: [20 + w * .3, ctx.H - 120], quads: qs};
      }}; }},
  {id: 'halley', decade: 1910, year: 1910, label: '1910 · 哈雷彗星回归，地球从它的彗尾里穿过', dur: 16, sound: 'shimmer',
    make: comet({len: 260, curve: .12, spread: .16, ion: .6, drift: 3, dur: 16, col: [.95, .93, .86]})},
  {id: 'eclipse1919', decade: 1910, year: 1919, label: '1919 · 日食观测：经过太阳旁边的星光被弯折了', dur: 14, sound: 'shimmer',
    make: body({R: 18, mode: 3, corona: 1, col: [.92, .92, 1], col2: [1, .4, .35], lens: 1.1, dur: 14})},
  {id: 'andromeda', decade: 1920, year: 1924, label: '1924–25 · 哈勃证明仙女座是银河系外的另一个星系', dur: 18, sound: 'shimmer',
    make: ctx => { let S = 140, c = null; for (const k of [1, .8, .62, .5]) if ((c = ctx.spot(140 * k * 2, 140 * k * 1.1))) { S = 140 * k; break; } if (!c) return null; const roll = -.55 + ctx.r() * .3;
      return {frame(age) { const a = fade(age, 18, 4, 5);
        return {a, anchor: [c[0], c[1] + S * .5 + 16], quads: [{kind: 2, ctr: c, half: [S, S], roll, col: [1, .9, .76], col2: [.72, .8, 1], p: [.36, .05, age, 0], a, ripK: .5}]}; }}; }},
  {id: 'pluto', decade: 1930, year: 1930, label: '1930 · 汤博对比两张底片，找到一颗会跳的小点：冥王星', dur: 12, sound: 'blink',
    make: ctx => { const c = ctx.spot(70, 70); if (!c) return null; const d = [9, -3];
      return {frame(age) { const a = fade(age, 12, 1.5, 2.5), on = Math.floor(age / .65) % 2, pts = [];
        pts.push({p: on ? at(c, d, .5) : at(c, d, -.5), px: 2.6, col: [1, .95, .85], a});
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {   // 底片的取景框：四个角
          pts.push({p: [c[0] + sx * 26, c[1] + sy * 26], px: 1.2, col: [.8, .85, .95], a: a * .6});
          pts.push({p: [c[0] + sx * 20, c[1] + sy * 26], px: 1.1, col: [.8, .85, .95], a: a * .45});
          pts.push({p: [c[0] + sx * 26, c[1] + sy * 20], px: 1.1, col: [.8, .85, .95], a: a * .45}); }
        return {a, anchor: [c[0], c[1] + 44], points: pts};
      }, cues: Array.from({length: 17}, (_, i) => ({at: 1 + i * .65, kind: 'blink', v: i % 2}))}; }},
  {id: 'jansky', decade: 1930, year: 1933, label: '1932–33 · 央斯基第一次收到银河系的射电「噪声」', dur: 11, sound: 'hiss',
    make: ctx => ({frame(age) { const a = fade(age, 11, 2.5, 3); return {a, anchor: [Math.min(ctx.right, ctx.W) * .3, ctx.H - 90], fx: {static: a}}; },
      cues: [{at: 0, kind: 'hiss', v: 11}]})},
  {id: 'diana', decade: 1940, year: 1946, label: '1946 · 戴安娜计划：雷达第一次收到月球的回波，来回约 2.5 秒', dur: 13, sound: 'ping',
    make: ctx => { const R = 16, c = ctx.spot(R * 2 + 30, R * 2 + 30); if (!c) return null;
      const from = ctx.rim(norm([c[0] - ctx.foe[0], c[1] - ctx.foe[1]])), L = Math.hypot(c[0] - from[0], c[1] - from[1]);
      const sun = norm([ctx.foe[0] - c[0], ctx.foe[1] - c[1]]), shots = [1.5, 6.5];
      return {frame(age) {
        const a = fade(age, 13, 2, 3), pts = [];
        for (const s0 of shots) { const t = age - s0; if (t < 0 || t > 2.56) continue;   // 去 1.28 s，回 1.28 s
          const k = t < 1.28 ? t / 1.28 : 2 - t / 1.28, p = [from[0] + (c[0] - from[0]) * k, from[1] + (c[1] - from[1]) * k];
          pts.push({p, px: 2.2, col: t < 1.28 ? [1, .9, .7] : [.75, .85, 1], a: .95});
          for (let j = 1; j < 6; j++) { const kk = Math.max(0, Math.min(1, k + (t < 1.28 ? -1 : 1) * j * 9 / L));   // 短短的尾巴
            pts.push({p: [from[0] + (c[0] - from[0]) * kk, from[1] + (c[1] - from[1]) * kk], px: 1.6, col: [1, .9, .75], a: .5 * (1 - j / 6)}); } }
        return {a, anchor: [c[0], c[1] + R + 22], points: pts,
          quads: [{kind: 3, ctr: c, half: [R * 1.6 + 4, R * 1.6 + 4], roll: 0, col: [.8, .78, .74], col2: [1, 1, 1], p: [R, 1, 0, 0], dir: sun, a, ripK: 1}]};
      }, cues: shots.flatMap(s0 => [{at: s0, kind: 'ping'}, {at: s0 + 2.56, kind: 'echo', ripple: from}])}; }},
  {id: 'sputnik', decade: 1950, year: 1957, label: '1957 · 斯普特尼克 1 号：第一颗人造卫星，一路「哔—哔—」', dur: 16, sound: 'beep',
    make: ctx => { const right = Math.min(ctx.right, ctx.W) - 30, y0 = ctx.top + 40 + ctx.r() * Math.max(20, ctx.foe[1] - ctx.ry - ctx.top - 90), tilt = (ctx.r() - .5) * .2;
      return {frame(age) { const a = fade(age, 16, 1, 2), k = age / 16, p = [20 + (right - 20) * k, y0 + (right - 20) * k * tilt];
        return {a, anchor: [p[0], p[1] + 30], points: [{p, px: 3, col: [1, .97, .9], a}]}; },
        cues: Array.from({length: 12}, (_, i) => ({at: 1 + i * .6, kind: 'beep'}))}; }},
  {id: 'cmb', decade: 1960, year: 1965, label: '1965 · 宇宙微波背景：宇宙最古老的光，到处都是', dur: 12, sound: 'hiss',
    make: ctx => ({frame(age) { const a = fade(age, 12, 3, 4); return {a, anchor: [Math.min(ctx.right, ctx.W) * .3, ctx.top + 60], fx: {cmb: a}}; },
      cues: [{at: 0, kind: 'hiss', v: 12, soft: 1}]})},
  {id: 'pulsar', decade: 1960, year: 1967, label: '1967 · 贝尔发现脉冲星：每 1.337 秒跳一下', dur: 14, sound: 'tick',
    make: ctx => { const c = ctx.spot(50, 50); if (!c) return null; const P = 1.337;
      return {frame(age) { const a = fade(age, 14, 1.5, 2.5), ph = (age % P) / P, pulse = Math.exp(-ph * 26) + .12;
        return {a, anchor: [c[0], c[1] + 22], points: [{p: c, px: 2.8 + 4 * Math.exp(-ph * 18), col: [.85, .9, 1], a: a * pulse}]}; },
        cues: Array.from({length: 10}, (_, i) => ({at: i * P, kind: 'tick'}))}; }}
];

// 终章：75 首全部刻满。盘心后面升起一颗地球（1968，阿波罗 8 号《地出》）
export const FINALE = {id: 'earthrise', decade: 1960, year: 1968, label: '1968 · 阿波罗 8 号从月球轨道上拍下《地出》', dur: 1e9, sound: 'bloom',
  make: ctx => {
    const room = ctx.foe[1] - ctx.ry - ctx.top, R = Math.max(16, Math.min(ctx.rx * .2, room * .62, 70));
    const x = ctx.foe[0] + ctx.rx * .05, yEnd = ctx.foe[1] - ctx.ry - R * .35, yStart = ctx.foe[1] - ctx.ry * .55;
    return {frame(age) {
      const k = sm(0, 16, age), a = sm(0, 3, age), c = [x, yStart + (yEnd - yStart) * k];
      return {a, anchor: [c[0] + R + 70, c[1] - R * .2], quads: [{kind: 3, ctr: c, half: [R * 1.35, R * 1.35], roll: 0, col: [.2, .42, .8], col2: [1, 1, 1], p: [R, 2, 0, 0], dir: [-.9, -.2], a, ripK: .3}]};
    }, cues: [{at: 1, kind: 'bloom'}]};
  }};

export const eraById = id => id === FINALE.id ? FINALE : ERAS.find(e => e.id === id);
export const erasOf = decade => ERAS.filter(e => e.decade === decade);
