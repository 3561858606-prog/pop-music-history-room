// 天上的声音：很轻的一层，跟着背景音乐走（背景音乐关掉、让给唱片、浏览器还没允许出声时都不响）。
// 背景音乐是 C 大调，所以音高只取 C 大调五声音阶 C D E G A：怎么点、点多快，叠在一起都是和谐的。
// 全部现场合成（正弦、噪声、生成的混响），没有音频文件。
const PENTA = [0, 2, 4, 7, 9];
const hz = i => 261.63 * 2 ** ((Math.floor(i / 5) * 12 + PENTA[((i % 5) + 5) % 5]) / 12);   // i = 0 是中央 C（C4）
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// enabled：有音高的那些音（点击、和声……）能不能响——只在背景音乐正在放时；allowed：音效总开关（落针的水声只看它）
export function createSfx({enabled = () => true, allowed = () => true, context = () => null}) {
  let ctx = null, out = null, wet = null, noise = null, pad = null, hiss = null;
  const recent = [];   // 最近响过的时刻：每秒最多 8 个音，连锁再多也不会吵

  function init() {
    if (ctx) return ctx.state !== 'closed';
    ctx = context() || null;
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; try { ctx = new AC(); } catch { return false; } }
    out = ctx.createGain(); out.gain.value = .9; out.connect(ctx.destination);
    const conv = ctx.createConvolver(), len = Math.round(ctx.sampleRate * 3.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1); }
    conv.buffer = ir; wet = ctx.createGain(); wet.gain.value = .6; wet.connect(conv); conv.connect(out);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }
  const ready = (tonal = true) => allowed() && (!tonal || enabled()) && init() && ctx.state === 'running';
  function room() { const t = ctx.currentTime; while (recent.length && t - recent[0] > 1) recent.shift(); if (recent.length >= 8) return false; recent.push(t); return true; }
  const panOf = (x, W) => W ? clamp((x / W) * 2 - 1, -1, 1) * .7 : 0;
  function chain(pan, dry = .7, w = .6) {
    const g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = pan; g.connect(p); } const end = p || g;
    const d = ctx.createGain(); d.gain.value = dry; end.connect(d); d.connect(out);
    const s = ctx.createGain(); s.gain.value = w; end.connect(s); s.connect(wet);
    return g;
  }
  // 一个钟一样的音：正弦 + 一点点不和谐的泛音（2.76 倍），起音 6 ms，按指数衰减
  function bell(i, {pan = 0, vol = .045, decay = 2.4, at = 0, bright = .25, f = null} = {}) {
    if (!room()) return;
    const t = ctx.currentTime + at, fr = f || hz(i), g = chain(pan);
    const env = ctx.createGain(); env.connect(g);
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + .006); env.gain.exponentialRampToValueAtTime(.0001, t + decay);
    const o = ctx.createOscillator(); o.frequency.value = fr; o.connect(env); o.start(t); o.stop(t + decay + .1);
    if (bright > 0) { const e2 = ctx.createGain(); e2.connect(g); e2.gain.setValueAtTime(0, t); e2.gain.linearRampToValueAtTime(vol * bright, t + .004); e2.gain.exponentialRampToValueAtTime(.0001, t + decay * .35);
      const o2 = ctx.createOscillator(); o2.frequency.value = fr * 2.76; o2.connect(e2); o2.start(t); o2.stop(t + decay * .35 + .1); }
  }
  // 慢慢起来、慢慢消失的长音（极光、彗星、终章）
  function swell(freqs, {vol = .015, attack = 1.5, decay = 4, at = 0, pan = 0} = {}) {
    const t = ctx.currentTime + at, g = chain(pan, .5, .9);
    for (const fr of freqs) { const env = ctx.createGain(); env.connect(g); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + attack); env.gain.exponentialRampToValueAtTime(.0001, t + attack + decay);
      const o = ctx.createOscillator(); o.frequency.value = fr; o.detune.value = (Math.random() - .5) * 8; o.connect(env); o.start(t); o.stop(t + attack + decay + .1); }
  }
  function noiseBurst({vol = .02, dur = .4, type = 'bandpass', f0 = 1200, f1 = 600, q = 1.2, at = 0, pan = 0, attack = .02} = {}) {
    const t = ctx.currentTime + at, src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + attack); env.gain.exponentialRampToValueAtTime(.0001, t + dur);
    src.connect(fl); fl.connect(env); env.connect(chain(pan, .8, .4)); src.start(t, Math.random()); src.stop(t + dur + .05);
  }
  function low(f, {vol = .04, decay = 3.5, at = 0} = {}) {
    const t = ctx.currentTime + at, env = ctx.createGain(); env.connect(chain(0, .9, .3));
    env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(vol, t + .08); env.gain.exponentialRampToValueAtTime(.0001, t + decay);
    const o = ctx.createOscillator(); o.frequency.value = f; o.connect(env); o.start(t); o.stop(t + decay + .1);
  }

  // 落针：一滴水落进液面。先是「嘀」的一声（正弦快速下滑），跟着一个小气泡，再是几圈越来越轻的水声慢慢荡开
  function splash(pan) {
    const t = ctx.currentTime, g = chain(pan, .7, .9);
    const drop = (at, f0, f1, vol, dur) => { const o = ctx.createOscillator(), e = ctx.createGain(); o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur * .35);
      e.gain.setValueAtTime(0, t + at); e.gain.linearRampToValueAtTime(vol, t + at + .004); e.gain.exponentialRampToValueAtTime(.0001, t + at + dur); o.connect(e); e.connect(g); o.start(t + at); o.stop(t + at + dur + .05); };
    drop(0, 1700, 430, .05, .2);                       // 落点
    const b = ctx.createOscillator(), be = ctx.createGain(); b.frequency.setValueAtTime(240, t + .035); b.frequency.exponentialRampToValueAtTime(760, t + .1);   // 气泡：往上滑
    be.gain.setValueAtTime(0, t + .035); be.gain.linearRampToValueAtTime(.022, t + .045); be.gain.exponentialRampToValueAtTime(.0001, t + .16); b.connect(be); be.connect(g); b.start(t + .035); b.stop(t + .2);
    [[.24, 1250, .016], [.47, 1050, .011], [.74, 1380, .008], [1.05, 980, .005]].forEach(([at, f, v]) => drop(at, f, f * .62, v, .16));   // 一圈圈荡开
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;   // 水面的沙沙声，按 5 Hz 起伏
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 3;
    const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.014, t + .15); env.gain.exponentialRampToValueAtTime(.0001, t + 2.2);
    const am = ctx.createGain(); am.gain.value = .5; const lfo = ctx.createOscillator(), ld = ctx.createGain(); lfo.frequency.value = 5.2; ld.gain.value = .5; lfo.connect(ld); ld.connect(am.gain);
    src.connect(bp); bp.connect(am); am.connect(env); env.connect(g); src.start(t, Math.random()); src.stop(t + 2.3); lfo.start(t); lfo.stop(t + 2.3);
  }

  const api = {
    // kind 见 cosmos.js 的 cue(...)；info 里有 x, y, W, H 等
    play(kind, info = {}) {
      if (kind === 'vortexEnd' && pad) api.stopPad();
      if (kind === 'needle') { if (ready(false)) splash(panOf(info.x, info.W)); return; }   // 落针的水声：唱片放的时候也响（它没有音高，不会和歌打架）
      if (!ready()) return;
      const pan = panOf(info.x, info.W), hi = info.H ? clamp(1 - info.y / info.H, 0, 1) : .5;
      const dec = d => clamp(Math.round(((d || 1900) - 1850) / 10), 0, 11);
      switch (kind) {
        case 'tap': bell(3 + Math.round(hi * 6), {pan, vol: .05}); break;   // 越高的地方音越高
        case 'cover': bell(1 + Math.round(dec(info.decade) * .75), {pan, vol: info.gen ? .022 : .032, decay: 2.8, bright: .15}); break;   // 每个年代一个音
        case 'ember': bell(8 + Math.round(hi * 3), {pan, vol: .03, bright: .45, decay: 1.8}); break;
        case 'star': bell(9 + Math.round(hi * 2), {pan, vol: .016, bright: .5, decay: 1.6}); break;
        case 'meet': bell(5, {pan, vol: .026, decay: 3}); bell(8, {pan, vol: .02, decay: 3, at: .03}); break;   // 相遇：一个五度
        case 'digit': bell(5 + (info.digit ?? 0) * .5 | 0, {pan, vol: .03}); break;
        case 'wakeUp': bell(2, {pan, vol: .03, decay: 3}); bell(4, {pan, vol: .025, decay: 3, at: .12}); break;
        case 'wakeStart': noiseBurst({vol: .018, dur: .7, f0: 1800, f1: 500, pan}); break;   // 划水：一声轻轻的「唰」
        case 'spinEnd': low(65.41, {vol: clamp(.015 * info.v, .01, .045), decay: 4.5}); low(98, {vol: clamp(.008 * info.v, .005, .025), decay: 4, at: .05}); break;   // 余音
        case 'vortexStart': api.startPad(); break;
        case 'vortexEnd': { const c = info.charge || 0; [0, 2, 3, 5].forEach((i, k) => bell(i + 3, {pan, vol: .03 * (.5 + c), at: k * .045, decay: 3})); low(65.41, {vol: .045 * c, decay: 3.5}); break; }
        case 'reveal': [8, 9, 10, 12].forEach((i, k) => bell(i, {pan, vol: .022, at: .5 + k * .12, bright: .4, decay: 2.5})); break;
        case 'starBorn': bell(7 + Math.round(dec(info.decade) * .25), {pan, vol: .035, bright: .4, decay: 3.2}); break;
        case 'constellation': [5, 7, 8, 9, 10].forEach((i, k) => bell(i, {vol: .028, at: k * .14, decay: 3.4})); break;
        case 'era': {   // 天文事件出现：一层很淡的长音
          const s = info.sound;
          if (s === 'shimmer' || s === 'aurora') swell(s === 'aurora' ? [hz(4), hz(7)] : [hz(12), hz(14)], {vol: .011, attack: 2, decay: 5});
          if (s === 'rumble') noiseBurst({vol: .05, dur: 3.2, type: 'lowpass', f0: 220, f1: 60, q: .7, at: .9, attack: .15});
          if (s === 'bloom') swell([hz(0), hz(2), hz(3), hz(5)], {vol: .016, attack: 3, decay: 7});
          break; }
        case 'era-beep': bell(0, {f: 880, vol: .012, decay: .32, bright: 0}); break;   // 斯普特尼克：哔—
        case 'era-tick': noiseBurst({vol: .03, dur: .05, f0: 2400, f1: 1800, q: 2, attack: .002}); low(110, {vol: .02, decay: .12}); break;   // 脉冲星
        case 'era-blink': bell(0, {f: info.v ? 1760 : 1568, vol: .008, decay: .12, bright: 0}); break;   // 闪烁比较仪
        case 'era-hiss': { if (hiss) break; const dur = info.v || 10, t = ctx.currentTime, src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
          const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = info.soft ? 1500 : 3000; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = info.soft ? 5000 : 9000;
          const env = ctx.createGain(), v = info.soft ? .006 : .009; env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(v, t + 2.5); env.gain.setValueAtTime(v, t + dur - 3); env.gain.linearRampToValueAtTime(0, t + dur);
          src.connect(hp); hp.connect(lp); lp.connect(env); env.connect(chain(0, .9, .2)); src.start(t); src.stop(t + dur + .1); hiss = src; src.onended = () => { hiss = null; }; break; }
        case 'era-ping': bell(12, {vol: .03, decay: .7, bright: .1}); break;   // 雷达发出去
        case 'era-echo': bell(12, {vol: .014, decay: 1.6, bright: 0, at: 0}); break;   // 2.5 秒后回来，轻一点
        case 'era-bloom': swell([hz(0), hz(2), hz(3)], {vol: .016, attack: 3, decay: 7}); break;
      }
    },
    // 按住时慢慢升起的长音（越蓄越响、越亮）；松手时收掉
    startPad() {
      if (pad || !ready()) return;
      const t = ctx.currentTime, g = chain(0, .6, .8), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(2400, t + 2.4); lp.connect(g);
      const env = ctx.createGain(); env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(.035, t + 2.4); env.connect(lp);
      const os = [130.81, 196, 261.63].map((f, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? 'sine' : 'triangle'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.06, t + 2.4); o.detune.value = (i - 1) * 6; o.connect(env); o.start(t); return o; });
      pad = {env, os};
    },
    stopPad() { if (!pad || !ctx) return; const t = ctx.currentTime; pad.env.gain.cancelScheduledValues(t); pad.env.gain.setValueAtTime(pad.env.gain.value, t); pad.env.gain.linearRampToValueAtTime(0, t + .25); for (const o of pad.os) o.stop(t + .3); pad = null; },
    get state() { return {ctx: ctx?.state || 'none', enabled: enabled(), pad: !!pad}; }
  };
  return api;
}
