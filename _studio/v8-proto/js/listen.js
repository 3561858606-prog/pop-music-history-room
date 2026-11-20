// 听：唱片放歌时，从播放器的 Web Audio 图上接出的分析器里，每帧算出这首歌此刻的样子。
// 只读声音，不改声音。给星空的「节奏」效果链用：电平、低 / 中 / 高频、起音（底鼓、镲片）、节拍、速度、立体声宽度。
// 老录音（1850–1920 年代）又轻又窄又有底噪，所以各项都按这首歌自己的最大值归一（自动增益），不按绝对音量。
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function createListener(getTaps) {
  let freq = null, prev = null, td = null, tdL = null, tdR = null, sr = 44100;
  const F = {level: 0, bass: 0, mid: 0, treble: 0, width: 0, beat: 0, tick: 0, kick: 0, bpm: 0, ibi: 0, lastBeat: -1e9, beats: 0, ticks: 0, live: false, t: 0};
  const agc = {level: .02, bass: 1, mid: 1, treble: 1, fb: 1, ft: 1};   // 自动增益：每项的慢慢衰减的最大值
  const flux = {b: [], t: []}, onsets = [];   // 最近的起音强度（算阈值）、底鼓的时间（算速度）
  let lastKick = -1, lastTick = -1;

  function bandSum(a, lo, hi) { let s = 0; for (let i = lo; i < hi; i++) s += a[i]; return s / (hi - lo); }
  // 每帧调用：dt 秒，now 秒（单调时钟）。没有声音时 live = false，所有值慢慢回到 0
  function update(dt, now, sens = .5) {
    F.t = now;
    const T = getTaps?.();
    const decay = k => Math.exp(-dt / k);
    F.beat *= decay(.16); F.tick *= decay(.08); F.kick *= decay(.3);
    if (!T?.an) { F.live = false; for (const k of ['level', 'bass', 'mid', 'treble', 'width']) F[k] *= decay(.4); return F; }
    const an = T.an; sr = T.ctx.sampleRate;
    if (!freq || freq.length !== an.frequencyBinCount) { freq = new Uint8Array(an.frequencyBinCount); prev = new Float32Array(an.frequencyBinCount); td = new Float32Array(an.fftSize); }
    an.getByteFrequencyData(freq); an.getFloatTimeDomainData(td);
    let rms = 0; for (let i = 0; i < td.length; i++) rms += td[i] * td[i]; rms = Math.sqrt(rms / td.length);
    F.live = rms > 1e-4;
    const hz = sr / an.fftSize, bin = f => clamp(Math.round(f / hz), 1, freq.length - 1);
    const b0 = bin(30), b1 = bin(150), m1 = bin(2000), t1 = bin(9000);
    // 线性幅度与正向变化（谱通量），分低频和高频两路
    let fb = 0, ft = 0, bass = 0, mid = 0, treble = 0;
    const dbLo = an.minDecibels, dbSpan = an.maxDecibels - an.minDecibels;
    for (let i = 1; i < t1; i++) {
      const v = Math.pow(10, (dbLo + freq[i] / 255 * dbSpan) / 20), d = v - prev[i]; prev[i] = v;   // 字节值是 minDecibels–maxDecibels 之间的分贝
      if (i >= b0 && i < b1) { bass += v; if (d > 0) fb += d; } else if (i < m1) mid += v; else { treble += v; if (d > 0) ft += d; }
    }
    bass /= (b1 - b0); mid /= (m1 - b1); treble /= (t1 - m1);
    // 自动增益：最大值以约 8 秒的时间常数衰减，下限防止静音段被放大成噪声
    const norm = (k, v, floor) => { agc[k] = Math.max(v, agc[k] * Math.exp(-dt / 8), floor); return clamp(v / agc[k], 0, 1); };
    const sm = (k, v, up, down) => { F[k] += (v - F[k]) * (1 - Math.exp(-dt / (v > F[k] ? up : down))); };
    sm('level', norm('level', rms, .004), .05, .25); sm('bass', norm('bass', bass, 1e-4), .04, .2); sm('mid', norm('mid', mid, 1e-5), .06, .3); sm('treble', norm('treble', treble, 1e-6), .03, .15);
    // 起音：本帧通量超过最近一段的平均值若干倍（灵敏度越高倍数越低）
    const k = 1.9 - .9 * clamp(sens, 0, 1);
    const onset = (arr, v, key) => { arr.push(v); if (arr.length > 43) arr.shift(); const avg = arr.reduce((a, b) => a + b, 0) / arr.length; agc[key] = Math.max(v, agc[key] * Math.exp(-dt / 6), 1e-6); return {hit: v > avg * k && v > agc[key] * .25, s: clamp(v / agc[key], 0, 1)}; };
    const ob = onset(flux.b, fb, 'fb'), ot = onset(flux.t, ft, 'ft');
    if (ob.hit && now - lastKick > .22) {   // 底鼓 / 重拍
      lastKick = now; F.kick = Math.max(F.kick, ob.s); F.beat = 1; F.beats++; F.lastBeat = now; onsets.push(now); while (onsets.length && now - onsets[0] > 10) onsets.shift();
      // 速度：最近十秒里相邻重拍的间隔，取落在 0.33–1.2 s 里的中位数（对应 50–180 BPM）
      const iv = []; for (let i = 1; i < onsets.length; i++) { let d = onsets[i] - onsets[i - 1]; while (d < .33) d *= 2; while (d > 1.2) d /= 2; iv.push(d); }
      if (iv.length >= 4) { iv.sort((a, b) => a - b); const med = iv[iv.length >> 1]; F.ibi = F.ibi ? F.ibi * .8 + med * .2 : med; F.bpm = 60 / F.ibi; }
    }
    if (ot.hit && now - lastTick > .09) { lastTick = now; F.tick = Math.max(F.tick, ot.s); F.ticks++; }   // 镲片 / 军鼓
    // 立体声宽度：左右声道的相关系数，1 − 相关
    if (T.aL && T.aR) {
      if (!tdL || tdL.length !== T.aL.fftSize) { tdL = new Float32Array(T.aL.fftSize); tdR = new Float32Array(T.aR.fftSize); }
      T.aL.getFloatTimeDomainData(tdL); T.aR.getFloatTimeDomainData(tdR);
      let lr = 0, ll = 0, rr = 0; for (let i = 0; i < tdL.length; i++) { lr += tdL[i] * tdR[i]; ll += tdL[i] * tdL[i]; rr += tdR[i] * tdR[i]; }
      const c = ll > 1e-9 && rr > 1e-9 ? lr / Math.sqrt(ll * rr) : 1; sm('width', clamp(1 - c, 0, 1), .2, .6);
    }
    return F;
  }
  // 下一拍大约什么时候（秒，单调时钟）；不知道就返回 null
  const nextBeat = now => { if (!F.ibi || now - F.lastBeat > 3) return null; let t = F.lastBeat + F.ibi; while (t < now) t += F.ibi; return t; };
  function reset() { prev?.fill(0); flux.b.length = flux.t.length = onsets.length = 0; F.bpm = F.ibi = 0; F.lastBeat = -1e9; for (const k of Object.keys(agc)) agc[k] = k === 'level' ? .02 : 1e-4; }
  return {update, nextBeat, reset, get state() { return F; }};
}
