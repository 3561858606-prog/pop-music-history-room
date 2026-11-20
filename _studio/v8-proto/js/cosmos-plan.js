// 深空：纯逻辑。没有 DOM、没有 GL，可以单独测试。
// 星和封面都在同一个空间里，由同一个宇宙时钟 T 推着：相机以 CFG.speed 匀速沿视线前进。
// 屏幕位置 = 消失点 + 偏移 × (参考深度 / 当前深度)。近的移动快、远的慢，都是这一条算出来的。

export const CFG = {
  speed: .27,            // 世界单位 / 秒。全程恒定：任何状态只改亮度，不改速度（0.12 → 0.18 → 0.27）
  dprCap: 1.5,
  fpsCap: 60,
  // perMpx：每百万屏幕像素里同时看得见的数量。near：接近镜头时 [大小, 亮度] 的倍数；fadeNear：近端淡出区占深度的比例
  // 少而亮：远尘稀一点、偏冷；中景星更大更亮、离镜头更近，接近时由远到近加速、变大、变亮
  stars: {
    dust:   {perMpx: 850, z: [30, 90], mag: [.12, .38], size: 1.6, near: [1.2, 1.15], fadeNear: .08, cool: .2},
    star:   {perMpx: 180, z: [4, 60],  mag: [.20, .45], magHi: [.55, .85], hiShare: .2, size: 2.3, near: [1.9, 1.6], fadeNear: .04},
    bright: {perMpx: 9,   z: [6, 60],  mag: [.78, 1.0], size: 2.6, near: [1.6, 1.4], fadeNear: .06}
  },
  maxPxPerSec: 42,       // 星在屏幕上最快的速度；再快就在几帧里淡掉，不让近处的星「嗖」地划过
  twinkle: {period: [5, 14], amp: [.08, .35]},
  // 余晖：亮星和两成较亮的中景星偶尔变亮，0.6 s 升起，约 9.6 s 慢慢落完。各星按自己的相位在着色器里发生
  // 1440×900 下平均约 10 颗候选看得见，周期 90–130 s → 约 11 s 一次
  flare: {period: [45, 65], gain: [1.8, 2.2], rise: .6, fall: 9.6},
  // 消失点在盘后缓慢漂移（C25）：相机横向慢慢平移，近处比远处挪得多。amp 是消失点的漂移幅度（±px）
  drift: {amp: [50, 30], period: [263, 347]},
  nebula: {warm: .090, cool: .070, breathe: [47, 71], amp: .12},
  covers: {
    // 首页停留短：第一张 1.2 s 就出，之后每 2.5–4.5 s 一张，同屏最多 4 张；中、近的多，远处的少
    max: 4, nearMax: 1, gap: [2.5, 4.5], firstAt: 1.2,
    life: {in: 2.6, hold: [4.5, 7], out: 3.2}, jitter: .2, kill: 1.5,
    classes: {
      far:  {p: .25, z: 44, size: [40, 58],   alpha: [.26, .34], blur: 1.2, sat: .62, glow: 0},
      mid:  {p: .50, z: 22, size: [62, 88],   alpha: [.42, .54], blur: .5,  sat: .74, glow: .05},
      near: {p: .25, z: 13, size: [104, 144], alpha: [.55, .66], blur: 0,   sat: .78, glow: .07}
    },
    narrowScale: .7, nearMinStageH: 420, tries: 64, margin: 10, coverGap: 20, edge: 10, core: .3
  },
  closeDim: .45,
  // 暗星云（C01）：一片暗云从远处迎面过来，身后的星被掩住。z：出生和离开时的深度；R：半径（像素 × 深度）
  // spots：在盘的上方、左上、左下经过（单位是盘在屏幕上的半径）
  cloud: {every: [70, 80], firstAt: -1,   // firstAt：第一片在打开页面前就已出发，约第 8 s 走到深度 8（近处）
     z: [15, 3], fadeIn: 8, R: 2100, occl: .75, occlPhone: .45, rim: 3,
    minStageH: 340, phoneScale: .6, spots: [[0, -1.3], [-1.05, -.9], [-1.15, .7]]},
  // 显影（C09）：亮处 0.8 s、中间调 2.5 s、全部 4.5 s；前 1.5 s 低饱和暖灰；边框最后到
  develop: {hi: .45, mid: 1.4, full: 2.6, mono: .8},
  far: 'keep',             // 远处的小封面：'keep' 照旧 · 'hi' 只显影到亮处 · 'none' 不出（?far= 可以临时换）
  ember: {life: 14, max: 3, size: 2.6},   // 封面隐去后中心留下的余光星
  // 跟焦（C05）：贴近时失焦成的软斑直径（px）；钻进时加深到 dive
  focus: {close: {dust: 5, star: 8, bright: 12}, dive: 20},
  push: .15,             // 推近（C06）：盘镜头离盘心近了多少，宇宙的相机就前进它的 0.15 倍
  calm: {gap: 2.5, idle: 2.5, back: 1.5, hover: false},   // 间隔与避让（C24）：事件起点相隔 ≥2.5 s；停手 2.5 s 后用 1.5 s 回来；hover：指针停在曲目表里算不算在操作
  // 快门星轨（C02）：听歌时天空绕消失点慢慢转，亮星拖出弧；抬针后弧原地褪去
  trail: {rate: .22, cap: 26, n: 160, fade: 25, width: 1.1, alpha: .42, minMag: .55},
  recall: {quiet: 10, hold: 3},
  // 点击水波：speed 环向外走的速度（px/s），gap 相邻两道环的间距，amp 折射的推拉（px），light 水面反光（/255）
  // push 落点附近被推开的半径（px）：pushIn 秒里慢慢推开，holdUntil 之后到 life 慢慢回来
  ripple: {max: 6, speed: 260, gap: 38, amp: 9, light: 16, shade: 30, push: 130, pushIn: 1.4, holdUntil: 4.5, life: 11},   // shade：起伏明暗（/255）
  // 天是一盘还没干的显影液：碰它起波，起波就搅动了它
  // chain：波碰到余光星，它复燃并放出一道小波（只传一代）；shake：波碰到还在显影的封面，0.5 s 里显影完
  chain: {ember: .45, meet: .22, shake: .5, band: 26},
  // 按住：星绕着手指转、聚拢。R 影响半径（px），pull 最多往里收多少，spin 每秒转多少（弧度，随蓄力加快），full 几秒蓄满
  vortex: {R: 170, pull: .55, spin: [.6, 2.2], full: 2.4, maxTurn: 9, relax: 1.1, burst: [1.2, 2.6], startAfter: .3},
  // 拖：身后一道 V 形尾流。n 个采样点，每 every px 记一个，life 秒散去
  wake: {n: 16, every: 26, life: 2.6, open: 70, amp: .55},
  // 甩盘：天跟着转 follow 倍；转得快时亮星拉成弧（arc 秒的运动），停下后 fade 秒褪去
  spin: {follow: .2, decay: 1.6, arc: .5, fade: 2.6},
  // 很久不碰：天慢慢睡着（星流变慢、变暗、帧率减半），一碰就醒
  sleep: {after: 180, pace: .3, dim: .65, into: 6, wake: 1.6},
  // 你的星空：记住的歌是一颗不动的恒星
  sky: {min: .5, con: .75, size: [2.6, 3.6], fullSize: 4.4, inner: 1.16, margin: 22, dotGap: 7, maxSeg: 280, maxGap: 75},
  // 天文年表：idle 空闲时多久轮到一件；hover 指针停在年代带上多久才出现；gap 两件之间至少隔多久
  era: {idle: [45, 70], hover: .7, gap: 4, firstIdle: 25},
  // 暗适应：亮星先出来，再是暗星，最后是星云（秒）
  reveal: {bright: [0, 1], star: [.4, 1.8], dust: [.8, 2.4], nebula: [1.2, 2.4]}
};

export const KINDS = ['dust', 'star', 'bright'];

/* ---------- 随机数 ---------- */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const lerp = (a, b, t) => a + (b - a) * t;
const pickRange = (r, [a, b]) => lerp(a, b, r());
export const smoother = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * t * (t * (t * 6 - 15) + 10); };

/* ---------- 星 ---------- */
// 横向位置在最远处的平面上均匀（ξ ∈ [0,1)），深度在本层的范围里均匀：
// 这样屏幕上各方向的密度一样，不会在消失点四周堆成一圈。
// 本层同时看得见的比例 = ∫(z/zF)² dz / (zF − zN)
export const visibleFraction = ([zN, zF]) => (zF ** 3 - zN ** 3) / (3 * zF * zF * (zF - zN));

// 每颗星 12 个数：ξx ξy 深度相位 亮度 | 闪烁周期 相位 幅度 颜色 | 变亮周期 相位 增益 种类
export const STAR_STRIDE = 12;
export function makeStars(seed, maxBoxMpx = 4) {
  const r = rng(seed), out = {}, C = CFG.stars;
  for (const [ki, kind] of KINDS.entries()) {
    const k = C[kind], n = Math.ceil(k.perMpx * maxBoxMpx / visibleFraction(k.z));
    const a = new Float32Array(n * STAR_STRIDE);
    for (let i = 0; i < n; i++) {
      const o = i * STAR_STRIDE, m = kind === 'dust' ? r() ** 3 : r();
      const hi = k.magHi && r() < k.hiShare, mag = hi ? lerp(k.magHi[0], k.magHi[1], m) : lerp(k.mag[0], k.mag[1], m);
      const c = r(), color = c < .70 ? 0 : c < .90 ? 1 : 2;
      const flares = kind === 'bright' || hi;
      a.set([r(), r(), r(), mag,
        pickRange(r, CFG.twinkle.period), r() * Math.PI * 2, pickRange(r, CFG.twinkle.amp), color,
        pickRange(r, CFG.flare.period), r(), flares ? pickRange(r, CFG.flare.gain) : 1, ki], o);
    }
    out[kind] = {data: a, max: n};
  }
  return out;
}
// 当前舞台需要画多少颗：E 是消失点到四边的最大距离（像素），盒子 = 4·Ex·Ey
export function starCounts(stars, E) {
  const boxMpx = 4 * E[0] * E[1] / 1e6, n = {};
  for (const kind of KINDS) n[kind] = Math.min(stars[kind].max, Math.ceil(CFG.stars[kind].perMpx * boxMpx / visibleFraction(CFG.stars[kind].z)));
  return n;
}
export const extentOf = (W, H, foe) => [Math.max(foe[0], W - foe[0], 1) * 1.05, Math.max(foe[1], H - foe[1], 1) * 1.05];

// 相机横向位置（单位：像素 × 深度）。深度 z 处的东西在屏幕上挪 −cam/z；
// 消失点（运动的发散中心）偏离 = cam′/speed，幅度正好是 CFG.drift.amp
export function camAt(T, on = true) {
  if (!on) return [0, 0];
  const {amp, period} = CFG.drift;
  return [0, 1].map(i => amp[i] * period[i] * CFG.speed / (2 * Math.PI) * Math.sin(2 * Math.PI * T / period[i] + i * 1.3));
}

/* ---------- 几何：禁区 ---------- */
// 形状：{rect:[x0,y0,x1,y1]} | {poly:[[x,y]…]}（凸） | {seg:[ax,ay,bx,by], r}；behind:true 表示封面可以藏到它后面一部分
const inPoly = (poly, x, y) => { let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
  return inside; };
const rectsHit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const ptRectDist = (r, x, y) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - y, 0, y - r[3]));
export function hits(rect, shape) {
  if (shape.rect) return rectsHit(rect, shape.rect);
  if (shape.poly) {
    for (const [x, y] of shape.poly) if (x >= rect[0] && x <= rect[2] && y >= rect[1] && y <= rect[3]) return true;
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (inPoly(shape.poly, lerp(rect[0], rect[2], i / 4), lerp(rect[1], rect[3], j / 4))) return true;
    return false;
  }
  if (shape.seg) { const [ax, ay, bx, by] = shape.seg;
    for (let i = 0; i <= 24; i++) if (ptRectDist(rect, lerp(ax, bx, i / 24), lerp(ay, by, i / 24)) < shape.r) return true;
    return false; }
  return false;
}

/* ---------- 封面 ---------- */
// 一张封面在时刻 T 的样子：可见度（0–1）、相对停留中点的缩放、倾斜
export function coverLife(s) { return s.dur.in + s.dur.hold + s.dur.out; }
export function coverVis(s, T) {
  const age = T - s.t0, life = coverLife(s);
  let v = smoother(0, s.dur.in, age) * (1 - smoother(s.dur.in + s.dur.hold, life, age));
  if (s.killAt != null) v *= 1 - smoother(s.killAt, s.killAt + CFG.covers.kill, T);
  return v;
}
// 显影进度（0–1，线性；着色器里按亮度分先后）和隐去进度（0–1）
export const coverDev = (s, T) => Math.min(1, Math.max(0, (T - s.t0) / s.dur.in));
export function coverOut(s, T) {
  let o = smoother(s.dur.in + s.dur.hold, coverLife(s), T - s.t0);
  if (s.killAt != null) o = Math.max(o, smoother(s.killAt, s.killAt + CFG.covers.kill, T));
  return o;
}
// push：推近时相机额外前进的量（世界单位）
export function coverScale(s, T, push = 0) {
  const tMid = s.t0 + coverLife(s) / 2, z = s.z - CFG.speed * (T - tMid) - push;
  return s.z / Math.max(z, .5);
}
export const coverDone = (s, T) => T - s.t0 >= coverLife(s) || (s.killAt != null && T >= s.killAt + CFG.covers.kill);
export const coverDims = (it, L) => it.shape === 'round' ? [L, L] : it.w >= it.h ? [L, L * it.h / it.w] : [L * it.w / it.h, L];
// 一生扫过的范围：封面只沿离开消失点的方向外移、变大，起点矩形 ∪ 终点矩形就够了
export function sweptRect(s, foe, pad = 0) {
  const life = coverLife(s), sc = [s.z / (s.z + CFG.speed * life / 2), s.z / Math.max(s.z - CFG.speed * life / 2, .5)];
  let r = [1e9, 1e9, -1e9, -1e9];
  for (const k of sc) {
    const cx = foe[0] + s.q[0] * k, cy = foe[1] + s.q[1] * k, g = 1 + 2 * (s.glow ? .22 : 0);
    const hw = s.dims[0] * k * g / 2 + pad, hh = s.dims[1] * k * g / 2 + pad;
    r = [Math.min(r[0], cx - hw), Math.min(r[1], cy - hh), Math.max(r[2], cx + hw), Math.max(r[3], cy + hh)];
  }
  return r;
}

function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// 调度：只在 tick 里决定出生和提前隐去，每秒约 4 次，不是每帧。
// env: {W, H, foe, keepOut, narrow, suppress, kill, avoid:Set, ready:id=>bool}
export function createScheduler(pool, seed = 7) {
  const r = rng(seed), C = CFG.covers;
  const S = {slots: [], bag: [], nextAt: C.firstAt, recent: [], past: []};
  // 走完一生的封面留在 past 里（被提前隐去的不算），用来在它的中心留一颗余光星
  const prune = T => { S.slots = S.slots.filter(s => { if (!coverDone(s, T)) return true; if (s.killAt == null) S.past = [s, ...S.past].slice(0, 4); return false; }); };
  const refill = () => { S.bag = shuffle(pool.slice(), r); };
  function pickTrack(env) {
    const live = new Set(S.slots.map(s => s.item.id)), decades = new Set(S.slots.map(s => s.item.decade));
    if (!S.bag.length) refill();
    for (let i = 0; i < S.bag.length; i++) {
      const it = S.bag[i];
      if (live.has(it.id) || decades.has(it.decade) || env.avoid?.has(it.id) || !(env.ready?.(it.id) ?? true)) continue;
      S.bag.splice(i, 1); return it;
    }
    return null;
  }
  function pickClass(env) {
    const cls = C.classes, hasNear = S.slots.some(s => s.cls === 'near');
    const nearOk = !hasNear && !(env.narrow && env.H < C.nearMinStageH);
    const x = r(); let name = x < cls.far.p ? 'far' : x < cls.far.p + cls.mid.p ? 'mid' : 'near';
    if (name === 'near' && !nearOk) name = 'mid';
    return name;
  }
  // dir：只沿这个方向（从消失点出发的单位向量）找位置，离盘最近的那个；用于「学会的先被想起」
  function place(item, name, T, env, dir = null, extraHold = 0, from = 60) {
    const k = C.classes[name], sc = env.narrow ? C.narrowScale : 1;
    const L = pickRange(r, k.size) * sc, j = () => 1 + (r() * 2 - 1) * C.jitter;
    const s = {item, cls: name, z: k.z, dims: coverDims(item, L), t0: T,
      dur: {in: C.life.in * j(), hold: pickRange(r, C.life.hold) + extraHold, out: C.life.out * j()},
      alpha: pickRange(r, k.alpha), blur: k.blur, sat: k.sat, glow: k.glow,
      roll: (r() * 2 - 1) * 4 * Math.PI / 180, rollV: (r() * 2 - 1) * 1 * Math.PI / 180, q: [0, 0], killAt: null};
    const others = S.slots.map(o => sweptRect(o, env.foe, C.coverGap / 2));
    let best = null, bestScore = -1;
    for (let t = 0; t < (dir ? 60 : C.tries); t++) {
      const x = dir ? env.foe[0] + dir[0] * (from + t * 12) : lerp(C.edge, env.W - C.edge, r()), y = dir ? env.foe[1] + dir[1] * (from + t * 12) : lerp(C.edge, env.H - C.edge, r());
      s.q = [x - env.foe[0], y - env.foe[1]];
      const box = sweptRect(s, env.foe, 0), pad = sweptRect(s, env.foe, C.margin);
      if (box[0] < C.edge || box[1] < C.edge || box[2] > env.W - C.edge || box[3] > env.H - C.edge) continue;
      const cx0 = (box[0] + box[2]) / 2, cy0 = (box[1] + box[3]) / 2, hw0 = (box[2] - box[0]) * C.core / 2, hh0 = (box[3] - box[1]) * C.core / 2;
      const core = [cx0 - hw0, cy0 - hh0, cx0 + hw0, cy0 + hh0];
      if (env.keepOut.some(sh => hits(sh.behind ? core : pad, sh))) continue;
      if (others.some(o => rectsHit(o, box))) continue;
      const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
      const away = Math.min(600, ...S.recent.map(([px, py]) => Math.hypot(px - cx, py - cy)), ...others.map(o => Math.hypot((o[0] + o[2]) / 2 - cx, (o[1] + o[3]) / 2 - cy)));
      if (dir) { best = [...s.q]; break; }   // 沿方向：第一个放得下的，就是离盘最近的
      const score = away + r() * 40;
      if (score > bestScore) { bestScore = score; best = [...s.q]; }
    }
    if (!best) return null;
    s.q = best;
    return s;
  }
  return {
    state: S,
    tick(T, env) {
      prune(T);
      if (env.kill) for (const s of S.slots) if (s.killAt == null) s.killAt = T;
      if (env.avoid) for (const s of S.slots) if (s.killAt == null && env.avoid.has(s.item.id)) s.killAt = T;
      S.born = null;
      // 不出新封面的时候（播放、操作中、贴近……）：到点的那一张直接丢掉，不补发
      if (env.suppress) { S.nextAt = Math.max(S.nextAt, T + 2); return S.slots; }
      if (T < S.nextAt || S.slots.length >= C.max) return S.slots;
      if (env.lastEvent != null && T - env.lastEvent < CFG.calm.gap) return S.slots;   // 和别的事件隔开
      let item = pickTrack(env), name = pickClass(env);
      if (name === 'far' && env.far === 'none') name = 'mid';
      if (item) {
        // 选中的大小放不下，就试小一号（近 → 中 → 远）；都放不下，0.5 s 后再试，而不是等一整个间隔
        const order = ['near', 'mid', 'far'], chain = order.slice(order.indexOf(name)).filter(n => !(n === 'far' && env.far === 'none'));
        let s = null; for (const n of chain) if ((s = place(item, n, T, env))) break;
        if (s) { S.slots.push(s); S.born = s; const b = sweptRect(s, env.foe); S.recent = [[(b[0] + b[2]) / 2, (b[1] + b[3]) / 2], ...S.recent].slice(0, 3); }
        else { S.bag.push(item); S.nextAt = T + .5; return S.slots; }
      }
      S.nextAt = T + pickRange(r, C.gap);
      return S.slots;
    },
    // 指定一首、指定方向放一张（不受「播放中」之类的限制）。放不下返回 null
    // from：沿方向从离消失点多远处开始找（px）
    force(item, T, env, dir, extraHold = 0, from = 60) {
      prune(T);
      if (S.slots.some(s => s.item.id === item.id)) return null;
      for (const name of ['mid', 'far']) {
        const s = place(item, name, T, env, dir, extraHold, from);
        if (s) { s.recalled = true; S.slots.push(s); S.born = s; S.nextAt = Math.max(S.nextAt, T + pickRange(r, C.gap)); return s; }
      }
      return null;
    },
    // 下一张会抽到谁（用来预取）
    upcoming(n = 2) { if (S.bag.length < n) S.bag.push(...shuffle(pool.filter(p => !S.bag.includes(p)), r)); return S.bag.slice(0, n).map(i => i.id); },
    // 静止模式：一远一中，停在「停留」的正中
    still(T, env) {
      S.slots = []; S.past = [];
      for (const name of ['mid', 'far']) {
        const item = pickTrack(env); if (!item) continue;
        const s = place(item, name, T, env); if (!s) continue;
        s.t0 = T - s.dur.in - s.dur.hold / 2; S.slots.push(s);
      }
      return S.slots;
    }
  };
}

// 可复现的模拟：从 0 走到 T（调试静帧用）
export function simulate(pool, seed, T, envAt) {
  const sch = createScheduler(pool, seed);
  for (let t = 0; t <= T; t += .25) sch.tick(t, envAt(t));
  return sch;
}
