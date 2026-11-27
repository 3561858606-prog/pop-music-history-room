// 训练与落针共用的媒体状态控制。淡入由音频时钟调度，不依赖画面帧率。
import {audioSrc, audioFallbackSrc, srcKbps, srcTier, canDowngrade} from './model.js';
import {watch, penalize} from './net.js';
import {t} from './i18n.js';
const mediaSeconds = value => Number.isFinite(value) && value > 0 ? value : 0;

export function createAudio() {
  const element = new Audio(); element.preload = 'metadata';
  let track = null, state = 'idle', listener = null, token = 0, resumeAt = null;
  let context = null, gain = null, noise = null, wantsPlayback = false, taps = null;
  const failedSources = new Set();
  const messages = Object.fromEntries(Object.entries({idle: '点击播放收听', loading: '音频加载中…', ready: '音频已就绪，点击播放', playing: '正在播放',
    paused: '已暂停', waiting: '正在缓冲…', ended: '播放完毕，可以重听', blocked: '浏览器需要你点击播放', error: '音频加载失败，点击播放重试'}).map(([k, v]) => [k, t(v)]));
  const set = value => { state = value; listener?.(state, track); };
  function stopNoise() { if (noise) { try { noise.stop(); } catch {} noise.disconnect(); noise = null; } }
  function setSource(src) {
    // Web Audio needs a CORS response to produce samples from a cross-origin media source.
    element.crossOrigin = new URL(src, location.href).origin === location.origin ? null : 'anonymous';
    element.src = src;
  }
  function graph() {
    if (!context) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const nextContext = new AC(), nextGain = nextContext.createGain();
      nextContext.createMediaElementSource(element).connect(nextGain).connect(nextContext.destination);
      context = nextContext; gain = nextGain;
    }
    if (context.state !== 'running') context.resume().catch(() => {});
    return context;
  }
  function crackle() {
    if (!context) return;
    stopNoise();
    const sr = context.sampleRate, n = Math.floor(sr * .9), buffer = context.createBuffer(1, n, sr), data = buffer.getChannelData(0);
    let pop = 0, lp = 0;
    for (let i = 0; i < n; i++) {
      if (Math.random() < .00035) pop = (Math.random() * .7 + .3) * (Math.random() < .5 ? -1 : 1);
      lp += ((Math.random() * 2 - 1) * .05 + pop - lp) * .35; pop *= .86;
      data[i] = lp * Math.min(1, i / (sr * .03)) * Math.pow(1 - i / n, 1.4) * .5;
    }
    noise = context.createBufferSource(); noise.buffer = buffer; noise.connect(context.destination); noise.start();
  }
  // 保存用户最新的定位意图，直到媒体完成异步跳转；连续按键不会退回旧位置。
  function acknowledgeSeek() {
    if (resumeAt !== null && !element.seeking && Math.abs(element.currentTime - resumeAt) < (element.paused ? .01 : .25)) resumeAt = null;
  }
  function mediaDuration() {
    const duration = element.readyState ? mediaSeconds(element.duration) : 0;
    const expected = mediaSeconds(track?.duration);
    return duration >= expected - Math.max(2, expected * .02) ? duration : 0;
  }
  function applyPendingSeek() {
    const duration = mediaDuration();
    if (resumeAt === null || !duration) return;
    resumeAt = Math.min(resumeAt, duration);
    acknowledgeSeek();
    if (resumeAt !== null) try { element.currentTime = resumeAt; acknowledgeSeek(); } catch {}
  }
  element.addEventListener('seeked', acknowledgeSeek);
  element.addEventListener('timeupdate', acknowledgeSeek);
  element.addEventListener('canplay', () => { if (!element.seeking) applyPendingSeek(); });
  for (const ev of ['waiting', 'stalled']) element.addEventListener(ev, () => {
    if (wantsPlayback && !element.paused && !element.ended) set('waiting');
  });
  element.addEventListener('pause', () => {
    if (!wantsPlayback || !element.paused || element.ended || element.readyState < 2) return;
    api.pause();
  });
  element.addEventListener('ended', () => {
    if (!track || !wantsPlayback || !element.ended) return;
    const duration = mediaDuration();
    // 浏览器也可能在音源异常时发出 ended。只有实际到达曲终才交给顺序播放。
    if (!duration || mediaSeconds(element.currentTime) < duration - .25) {
      recoverSource();
      return;
    }
    wantsPlayback = false;
    clearTimeout(stallTimer);
    stopNoise();
    set('ended');
  });

  // 换源后接着播放，同一档失败后不反复回退。
  function switchSrc(src) {
    clearTimeout(stallTimer);
    stopNoise();
    const position = api.position();
    resumeAt = position > 0 ? position : null;
    token++;
    setSource(src);
    if (wantsPlayback) api.play(); else set('loading');
  }
  function recoverSource() {
    clearTimeout(stallTimer);
    const src = element.src;
    failedSources.add(src);
    const fallback = audioFallbackSrc(track);
    const lower = canDowngrade(track, src) ? audioSrc(track, 'sd') : null;
    const next = [fallback, lower].find(candidate => candidate && !failedSources.has(candidate));
    if (next) {
      switchSrc(next);
      return;
    }
    wantsPlayback = false;
    token++;
    stopNoise();
    element.pause();
    set('error');
  }
  // 边播边量网速；卡住超过 1.5 秒（或点了播放 5 秒还没出声）就降到流畅档，从同一秒接着放。
  watch(element, () => track ? srcKbps(track, element.currentSrc) : 128);
  let stallTimer = 0, seekAt = 0;
  element.addEventListener('seeking', () => { seekAt = performance.now(); });
  const downgrade = () => {
    clearTimeout(stallTimer);
    if (!track || !canDowngrade(track, element.currentSrc || element.src) || failedSources.has(audioSrc(track, 'sd')) || !['loading', 'waiting'].includes(state)) return;
    penalize(srcKbps(track, element.currentSrc)); switchSrc(audioSrc(track, 'sd'));
  };
  element.addEventListener('waiting', () => { if (track && !element.paused && performance.now() - seekAt > 1000) { clearTimeout(stallTimer); stallTimer = setTimeout(downgrade, 1500); } });
  element.addEventListener('playing', () => {
    if (!wantsPlayback || element.paused || element.ended) return;
    clearTimeout(stallTimer);
    set('playing');
  });
  element.addEventListener('error', () => { if (track && element.error && state !== 'error') recoverSource(); });
  element.addEventListener('loadedmetadata', () => {
    applyPendingSeek();
    if (state === 'loading' && !wantsPlayback) set('ready');
  });
  const api = {
    element,
    on(fn) { listener = fn; },
    current: () => track,
    failed: () => state === 'error' || state === 'blocked',
    // 网速慢时自动用的 64k 流畅档：在状态里标一下
    message: () => (messages[state] || '') + (track && ['playing', 'waiting', 'paused'].includes(state) && srcTier(element.currentSrc || element.src) === 'sd' ? ' · ' + t('流畅音质') : ''),
    tier: () => srcTier(element.currentSrc || element.src),
    load(t, at = 0) {
      clearTimeout(stallTimer);
      failedSources.clear();
      token++;
      wantsPlayback = false;
      stopNoise();
      element.pause();
      track = t;
      resumeAt = mediaSeconds(at) || null;
      setSource(audioSrc(t));
      set('loading');
    },
    async play({fadeIn = false} = {}) {
      if (!track) return false;
      const attempt = ++token;
      if (state === 'error') {
        resumeAt = api.position() || null;
        failedSources.clear();
        element.load();
      }
      wantsPlayback = true;
      if (fadeIn || context) {
        try { graph(); } catch {}
      }
      if (gain) {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(fadeIn ? 0 : 1, now);
      }
      if (state !== 'loading') set('loading');
      clearTimeout(stallTimer);
      stallTimer = setTimeout(downgrade, 5000);
      try {
        if (resumeAt !== null && element.readyState !== 0 && !element.seeking) applyPendingSeek();
        await element.play();
        if (attempt !== token || !wantsPlayback || element.ended) return false;
        if (fadeIn && gain) {
          crackle();
          const now = context.currentTime;
          gain.gain.setValueAtTime(0, now + .32);
          gain.gain.linearRampToValueAtTime(1, now + .82);
        }
        return true;
      } catch (error) {
        if (attempt !== token) return false;
        if (error.name === 'NotSupportedError' && element.error) recoverSource();
        else if (error.name !== 'AbortError') {
          wantsPlayback = false;
          clearTimeout(stallTimer);
          set(error.name === 'NotAllowedError' ? 'blocked' : 'error');
        }
        return false;
      }
    },
    position: () => resumeAt ?? (element.readyState ? mediaSeconds(element.currentTime) : 0),
    duration: () => mediaDuration() || mediaSeconds(track?.duration),
    seekTo(seconds, durationHint = 0) {
      const duration = mediaDuration() || mediaSeconds(durationHint) || mediaSeconds(track?.duration);
      if (!track || !duration || !Number.isFinite(seconds)) return false;
      const target = Math.max(0, Math.min(duration, seconds));
      resumeAt = target;
      if (Number.isFinite(element.duration) && element.readyState !== 0) applyPendingSeek();
      return true; // 元数据尚未返回时记住用户点的位置。
    },
    // 给星空听的分析器：从音量节点后面接出来（不改变听到的声音）。总的一个，左右声道各一个（算立体声宽度）
    taps() {
      if (!context || !gain) return null;
      if (!taps) {
        const sink = context.createGain(); sink.gain.value = 0; sink.connect(context.destination);   // Safari 里分析器要接到输出上才会工作
        const an = context.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; gain.connect(an); an.connect(sink);
        let aL = null, aR = null;
        try { const sp = context.createChannelSplitter(2); gain.connect(sp); aL = context.createAnalyser(); aR = context.createAnalyser(); aL.fftSize = aR.fftSize = 1024;
          sp.connect(aL, 0); sp.connect(aR, 1); aL.connect(sink); aR.connect(sink); } catch { aL = aR = null; }
        taps = {an, aL, aR, ctx: context};
      }
      return taps;
    },
    pause() {
      if (!track) return;
      token++;
      wantsPlayback = false;
      clearTimeout(stallTimer);
      stopNoise();
      element.pause();
      set('paused');
    },
    stop() {
      token++;
      wantsPlayback = false;
      clearTimeout(stallTimer);
      stopNoise();
      element.pause();
      track = null;
      resumeAt = null;
      set('idle');
    }
  };
  return api;
}
const needle = createAudio();
let listener = null;
needle.on((state, track) => listener?.(state === 'idle' ? 'stopped' : state, track));
export const player = {
  on(fn) { listener = fn; }, current: needle.current,
  time: () => ({t: needle.position(), d: needle.duration()}),
  // 在点击回调中只启动一次。唱针动画同时运行，不靠静音预播和二次定位。
  start(track) { needle.load(track); return needle.play({fadeIn: true}); },
  stop: needle.stop,
  pause: needle.pause,
  resume: needle.play,
  seek(seconds) { return needle.seekTo(seconds); },
  taps: () => needle.taps(),
  element: needle.element
};
