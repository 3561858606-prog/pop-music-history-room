// 听歌时，星空跟着这首歌回应。三条效果链，像吉他效果器一样串起来：
//   节奏（什么时候、多重） → 风格（长什么样、怎么动） → 年代（用哪个年代的「底片」拍出来）
// 每条链都可以单独开关、调强度；风格和年代可以「跟着歌」自动选，也可以手动指定（拿 1960 年代的彩色去拍 1920 年代的爵士）。
// 这里只有逻辑：把听到的特征（listen.js）和设置变成每帧的一组参数（look）和一池粒子；画在 cosmos.js 里。
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;

/* ---------- 风格：8 种「语法」 ---------- */
// mood：天上的那一层（0 无 · 1 雾 · 2 烟 · 3 中心暖光 · 4 油彩 · 5 地平线 · 6 霓虹边 · 7 漩涡）；A、B 两个颜色
// flow：星流速度的倍数；particles：粒子的种类
export const FAMILIES = {
  staff:  {name: '乐谱', hint: '星星落到五线谱上，起音的地方冒出一个个音符往左走', mood: 3, A: [1, .86, .62], B: [.9, .78, .6], amt: .35, staff: 1, flow: .85, particles: 'notes'},
  smoke:  {name: '烟雾与铜管', hint: '暖色的烟慢慢卷动，反拍上闪出铜管的金光', mood: 2, A: [1, .7, .38], B: [.55, .32, .2], amt: 1, flow: .95, particles: 'glints'},
  haze:   {name: '蓝调之雾', hint: '靛蓝的雾从下面升起，星光像推弦一样弯一下', mood: 1, A: [.3, .42, 1], B: [.18, .2, .55], amt: 1, bend: 1, flow: .8, particles: 'motes'},
  embers: {name: '原野篝火', hint: '火星从地平线升起，星流放慢，天更开阔', mood: 5, A: [1, .55, .22], B: [1, .3, .12], amt: 1, flow: .7, particles: 'embers'},
  swirl:  {name: '舞池漩涡', hint: '每个重拍，整片天转一下，彩色的纸屑从盘边甩出去', mood: 7, A: [1, .5, .3], B: [1, .3, .6], amt: .8, swirl: 1, flow: 1, particles: 'confetti'},
  neon:   {name: '霓虹火花', hint: '军鼓和镲片上迸出火花，四边泛起霓虹，星流加快', mood: 6, A: [1, .25, .65], B: [.2, .85, 1], amt: 1, flow: 1.3, particles: 'sparks'},
  velvet: {name: '丝绒律动', hint: '盘后一团暖光随低音呼吸，大大的光斑慢慢升起', mood: 3, A: [1, .35, .55], B: [1, .72, .38], amt: 1, flow: .85, particles: 'bokeh'},
  oil:    {name: '液体灯光秀', hint: '像 1960 年代演出现场的油彩投影：颜色流动，整片天轻轻扭动', mood: 4, A: [1, .3, .7], B: [.3, .8, 1], amt: 1, flow: 1, particles: null, hue: 1, warp: 1}
};
// 曲库的 30 种风格 → 8 种语法
export const STYLE_FAMILY = {
  parlor: 'staff', ragtime: 'staff', 'tin-pan-alley': 'staff', 'tin-pan-alley-song': 'staff', changga: 'staff', 'early-korean-song': 'staff',
  'early-jazz': 'smoke', dance: 'smoke', swing: 'smoke', 'western-swing': 'smoke', 'jazz-song': 'smoke', 'jump-blues': 'smoke',
  'classic-blues': 'haze', 'country-blues': 'haze', 'electric-blues': 'haze', 'blues-crooner': 'haze',
  country: 'embers', 'country-western': 'embers', 'urban-folk': 'embers',
  'afro-cuban': 'swirl', mambo: 'swirl', trot: 'swirl', manyo: 'swirl',
  'rock-roll': 'neon', rockabilly: 'neon', 'chicano-rock': 'neon', rock: 'neon',
  soul: 'velvet', 'standard-pop': 'velvet', 'psychedelic-rock': 'oil'
};

/* ---------- 年代：5 种「底片」 ---------- */
// post：mono 单色 · sepia 棕褐 · warm 暖 · sat 饱和度（1 = 不变） · grain 颗粒 · flicker 闪 · scratch 划痕 · vignette 暗角 · scan 扫描线 · chroma 色边 · halation 光晕
export const ERA_LOOKS = {
  plate:  {name: '干版照相', span: '1850–1890 年代', hint: '单色、粗颗粒、很深的暗角，像蚀刻的版画', post: {mono: 1, grain: 1, vignette: 1, sat: 0}},
  silent: {name: '默片', span: '1900–1920 年代', hint: '棕褐色，胶片轻轻闪动，偶尔一道划痕', post: {sepia: 1, grain: .7, flicker: 1, scratch: 1, vignette: .8, sat: .2}},
  radio:  {name: '电台暖光', span: '1930–1940 年代', hint: '钨丝灯的暖色，亮处晕开一圈光', post: {warm: 1, halation: 1, grain: .35, vignette: .45, sat: .85}},
  tv:     {name: '霓虹电视', span: '1950 年代', hint: '显像管的扫描线和荧光的辉光', post: {scan: 1, halation: .6, chroma: .35, vignette: .4, sat: 1.1}},
  color:  {name: '立体声彩色', span: '1960 年代', hint: '饱和的颜色；立体声越宽，色边分得越开', post: {sat: 1.45, chroma: 1, vignette: .25}}
};
export const eraOf = year => year < 1900 ? 'plate' : year < 1930 ? 'silent' : year < 1950 ? 'radio' : year < 1960 ? 'tv' : 'color';
export const familyOf = style => STYLE_FAMILY[style] || 'velvet';

export const DEFAULT_FX = {on: true, master: .8, rhythm: {on: true, amt: .7, sens: .5}, style: {on: true, amt: .75, pick: 'auto'}, era: {on: true, amt: .6, pick: 'auto'}};
// 读偏好：缺的项补默认值，坏的值改回默认
export function normalizeFx(p) {
  const d = DEFAULT_FX, o = p && typeof p === 'object' ? p : {}, num = (v, def) => Number.isFinite(+v) ? clamp(+v, 0, 1) : def, bool = (v, def) => typeof v === 'boolean' ? v : def;
  return {on: bool(o.on, d.on), master: num(o.master, d.master),
    rhythm: {on: bool(o.rhythm?.on, true), amt: num(o.rhythm?.amt, d.rhythm.amt), sens: num(o.rhythm?.sens, d.rhythm.sens)},
    style: {on: bool(o.style?.on, true), amt: num(o.style?.amt, d.style.amt), pick: FAMILIES[o.style?.pick] ? o.style.pick : 'auto'},
    era: {on: bool(o.era?.on, true), amt: num(o.era?.amt, d.era.amt), pick: ERA_LOOKS[o.era?.pick] ? o.era.pick : 'auto'}};
}
const POST_KEYS = ['mono', 'sepia', 'warm', 'grain', 'flicker', 'scratch', 'vignette', 'scan', 'chroma', 'halation', 'hue', 'warp'];

/* ---------- 引擎 ---------- */
export function createReact() {
  const MAXP = 280, P = {x: new Float32Array(MAXP), y: new Float32Array(MAXP), vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), age: new Float32Array(MAXP), life: new Float32Array(MAXP),
    size: new Float32Array(MAXP), a: new Float32Array(MAXP), r: new Float32Array(MAXP), g: new Float32Array(MAXP), b: new Float32Array(MAXP), shape: new Uint8Array(MAXP), alive: new Uint8Array(MAXP)};
  const out = new Float32Array(MAXP * 8);
  let track = null, seenBeats = 0, seenTicks = 0, lastRip = -1e9, offBeatAt = null, synth = 0, rr = Math.random;
  // 现在的样子（平滑过渡）
  const cur = {pump: 1, starPulse: 0, twinkle: 0, twinkleSeed: 0, flowMul: 1, bend: 0, staff: 0, moodMode: 0, moodAmt: 0, A: [1, 1, 1], B: [1, 1, 1], swirl: 0, sat: 1, post: Object.fromEntries(POST_KEYS.map(k => [k, 0])), level: 0};
  const look = {...cur, ripples: [], particles: out, count: 0, family: null, era: null};

  function spawn(x, y, vx, vy, life, size, a, col, shape = 0) {
    let i = P.alive.indexOf(0); if (i < 0) { let old = 0; for (let j = 1; j < MAXP; j++) if (P.age[j] / P.life[j] > P.age[old] / P.life[old]) old = j; i = old; }
    P.x[i] = x; P.y[i] = y; P.vx[i] = vx; P.vy[i] = vy; P.age[i] = 0; P.life[i] = life; P.size[i] = size; P.a[i] = a; P.r[i] = col[0]; P.g[i] = col[1]; P.b[i] = col[2]; P.shape[i] = shape; P.alive[i] = 1;
  }
  const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

  // 每种粒子：什么时候出生、怎么动
  function emit(kind, fam, ev, dt, env, k) {
    const {W, H, foe, rx, ry} = env, top = env.top, right = env.right;
    const rnd = (a, b) => a + rr() * (b - a), col = () => mix3(fam.A, fam.B, rr());
    const sky = () => { for (let i = 0; i < 12; i++) { const x = rnd(20, right - 20), y = rnd(top + 10, H - 20), qx = (x - foe[0]) / (rx * 1.08), qy = (y - foe[1]) / (ry * 1.08); if (qx * qx + qy * qy > 1) return [x, y]; } return [rnd(20, right - 20), rnd(top + 10, top + 80)]; };
    if (kind === 'notes') {   // 乐谱：音符出现在谱线上，往左走
      const n = (ev.beat ? 2 : 0) + (ev.tick ? 1 : 0);
      for (let i = 0; i < n; i++) { const line = Math.floor(rr() * 9) / 2 - 2; spawn(rnd(right * .55, right - 30), env.staffY + line * env.staffGap, -rnd(26, 40), 0, 6, 3.6, .9 * k, [1, .93, .8], 0); }
    } else if (kind === 'glints') {   // 烟雾与铜管：反拍上的金光
      if (ev.offbeat || ev.tick) { const [x, y] = sky(); spawn(x, y, 0, 0, .9, 9, .9 * k, [1, .82, .45], 2); }
    } else if (kind === 'motes') {   // 蓝调之雾：慢慢上升的蓝色微尘
      if (rr() < dt * 2.5) spawn(rnd(0, right), H + 4, rnd(-4, 4), -rnd(10, 18), 9, 2.6, .55 * k, col(), 0);
    } else if (kind === 'embers') {   // 原野篝火：从地平线升起的火星
      let n = 5 * (.5 + ev.level) * dt + (ev.beat ? 6 : 0);
      while (n > 0) { if (n >= 1 || rr() < n) spawn(rnd(0, right), H + 4, rnd(-10, 10), -rnd(35, 80), rnd(3, 5.5), rnd(1.8, 2.8), .85 * k, mix3([1, .7, .3], [1, .35, .12], rr()), 0); n -= 1; }
    } else if (kind === 'confetti') {   // 舞池漩涡：重拍时从盘边甩出去
      if (ev.beat) for (let i = 0; i < 8; i++) { const a = rr() * TAU, x = foe[0] + Math.sin(a) * rx * 1.05, y = foe[1] - Math.cos(a) * ry * 1.05, sp = rnd(60, 130), t = rnd(.3, .7);
        spawn(x, y, Math.sin(a) * sp + Math.cos(a) * sp * t, -Math.cos(a) * sp + Math.sin(a) * sp * t, rnd(1.8, 2.8), 2.6, .85 * k, col(), 0); }
    } else if (kind === 'sparks') {   // 霓虹火花：军鼓、镲片上迸出
      const burst = (n, s) => { const [x, y] = sky(), c = rr() < .5 ? fam.A : fam.B; for (let i = 0; i < n; i++) { const a = rr() * TAU, sp = rnd(70, 220) * s; spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(.45, .8), 2.2, k, c, 0); } };
      if (ev.tick) burst(6, 1); if (ev.beat) burst(10, 1.2);
    } else if (kind === 'bokeh') {   // 丝绒律动：大大的光斑慢慢升起
      if (rr() < dt * .9) spawn(rnd(0, right), H + 30, rnd(-5, 5), -rnd(8, 16), 11, rnd(18, 34), rnd(.07, .13) * k, col(), 1);
    }
  }

  // dt 秒；now 单调时钟秒；F 听到的特征（listen.js）；S 设置；env 舞台 {W,H,foe,rx,ry,top,right,staffY,staffGap,rimAt(angle)}；playing 是否在放
  function update(dt, now, F, S, env, playing) {
    const m = S.on ? S.master : 0, live = playing && F?.live;
    const famKey = S.style.on ? (S.style.pick !== 'auto' ? S.style.pick : track ? familyOf(track.style) : null) : null;
    const eraKey = S.era.on ? (S.era.pick !== 'auto' ? S.era.pick : track ? eraOf(track.year) : null) : null;
    const active = m > 0 && (playing || S.style.pick !== 'auto' || S.era.pick !== 'auto');   // 手动指定了就一直在；跟着歌的只在放歌时
    const fam = active && famKey ? FAMILIES[famKey] : null, era = active && eraKey ? ERA_LOOKS[eraKey] : null;
    const kS = S.style.amt * m, kE = S.era.amt * m, kR = S.rhythm.on && active ? S.rhythm.amt * m : 0;
    // 节拍：有真的拍子用真的；节奏链关了或没声音时，用一个 0.5 Hz 的慢呼吸，让风格照样有动静
    const ev = {beat: false, tick: false, offbeat: false, level: F?.level || 0};
    let beatEnv = 0, tickEnv = 0;
    if (live) {
      if (F.beats !== seenBeats) { ev.beat = F.beats > seenBeats; seenBeats = F.beats; if (F.ibi) offBeatAt = now + F.ibi / 2; }
      if (F.ticks !== seenTicks) { ev.tick = F.ticks > seenTicks; seenTicks = F.ticks; }
      if (offBeatAt && now >= offBeatAt) { ev.offbeat = true; offBeatAt = null; }
      beatEnv = F.beat * (.5 + .5 * F.kick); tickEnv = F.tick;
    } else if (fam) { const ph = (synth += dt * .5) % 1; beatEnv = Math.exp(-ph * 4) * .5; if (ph < dt * .5) ev.beat = true; }
    // 目标
    const tgt = {pump: 1 + .24 * kR * beatEnv, starPulse: .9 * kR * beatEnv, twinkle: kR * tickEnv, bend: fam?.bend ? kS : 0, staff: fam?.staff ? kS : 0,
      moodAmt: fam ? fam.amt * kS * (fam.mood ? 1 : 0) : 0, swirl: fam?.swirl ? kS : 0, level: live ? F.level : 0};
    let flow = fam ? lerp(1, fam.flow, kS) : 1;
    if (kR && live && F.bpm) flow *= lerp(1, (.7 + .6 * clamp((F.bpm - 70) / 100, 0, 1)) * (.85 + .3 * F.level), kR);   // 星流随速度：慢歌慢、快歌快
    tgt.flowMul = flow;
    const post = Object.fromEntries(POST_KEYS.map(k => [k, 0])); let sat = 1;
    if (era) { for (const [k, v] of Object.entries(era.post)) if (k !== 'sat') post[k] = v * kE; sat = lerp(1, era.post.sat ?? 1, kE); }
    if (fam?.hue) post.hue = kS; if (fam?.warp) post.warp = kS;
    if (era?.post.chroma && live) post.chroma *= .4 + 1.6 * (F.width || 0);   // 彩色年代：立体声越宽，色边越开
    // 平滑过渡（换歌、开关都不跳）
    const kk = 1 - Math.exp(-dt / .7), kf = 1 - Math.exp(-dt / .12);
    for (const k of ['pump', 'starPulse', 'twinkle']) cur[k] += (tgt[k] - cur[k]) * kf;
    for (const k of ['bend', 'staff', 'swirl', 'flowMul', 'level']) cur[k] += (tgt[k] - cur[k]) * kk;
    cur.sat += (sat - cur.sat) * kk;
    for (const k of POST_KEYS) cur.post[k] += (post[k] - cur.post[k]) * kk;
    // 天上那一层：换模式时先淡出再换
    const wantMode = fam?.mood || 0;
    if (wantMode !== cur.moodMode) { cur.moodAmt += (0 - cur.moodAmt) * kk * 1.6; if (cur.moodAmt < .02) { cur.moodMode = wantMode; cur.moodAmt = 0; if (fam) { cur.A = [...fam.A]; cur.B = [...fam.B]; } } }
    else { cur.moodAmt += (tgt.moodAmt - cur.moodAmt) * kk; if (fam) { cur.A = mix3(cur.A, fam.A, kk); cur.B = mix3(cur.B, fam.B, kk); } }
    cur.twinkleSeed = live ? F.ticks : 0;
    // 鼓点水波：重拍够重时，从盘边一个方向荡开一道波（最多每 1.2 s 一道）
    look.ripples = [];
    if (kR && ev.beat && live && F.kick > .5 && now - lastRip > 1.2) { lastRip = now; const a = rr() * TAU, p = env.rimAt?.(a); if (p) look.ripples.push({x: p[0], y: p[1], s: .3 + .4 * kR * F.kick}); }
    // 粒子
    if (fam?.particles && kS > .02) emit(fam.particles, fam, ev, dt, env, kS);
    let n = 0;
    for (let i = 0; i < MAXP; i++) {
      if (!P.alive[i]) continue;
      P.age[i] += dt; if (P.age[i] >= P.life[i] || P.y[i] < -60) { P.alive[i] = 0; continue; }
      const t = P.age[i] / P.life[i];
      if (P.shape[i] === 0 && P.vx[i] !== 0 && Math.abs(P.vy[i]) > 50) P.vy[i] += 60 * dt;   // 火花有一点重力
      P.vx[i] += Math.sin(P.age[i] * 2.3 + i) * 6 * dt;
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt;
      const fade = Math.min(1, t * 8) * (1 - t) ** 1.3, fl = P.shape[i] === 0 ? .75 + .25 * Math.sin(P.age[i] * 17 + i) : 1;
      out.set([P.x[i], P.y[i], P.size[i] * (P.shape[i] === 2 ? 1 - t * .6 : 1), P.a[i] * fade * fl, P.r[i], P.g[i], P.b[i], P.shape[i]], n * 8); n++;
    }
    Object.assign(look, cur); look.count = n; look.family = fam ? famKey : null; look.era = era ? eraKey : null; look.beat = beatEnv; look.active = active || n > 0 || cur.moodAmt > .01 || Object.values(cur.post).some(v => v > .01) || Math.abs(cur.sat - 1) > .01;
    return look;
  }
  return {update, setTrack(t) { if (t?.id !== track?.id) { seenBeats = seenTicks = 0; } track = t; }, get track() { return track; }, look};
}
