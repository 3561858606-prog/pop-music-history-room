// 唱片页的背景音乐（星空）。
// 默认开着；落针、播放课件视频时淡出并暂停；停下 1.5 s 后，从暂停的位置用 3 s 淡入接着放（第一次开始只用 0.8 s）。
// 离开唱片页、页面切到后台时也暂停。浏览器不让自动出声时，等第一次点按或按键再开始。
// 音量用 Web Audio 的增益来淡入淡出（iOS 不让网页改 <audio> 的音量）；在第一次点按之前用元素自己的音量。

// 淡入：第一次开始用 0.8 s（太慢会像没声音、像延迟）；落针结束后接回来用 3 s，慢慢引入
const FADE_FIRST = .8, FADE_BACK = 3, FADE_OUT = .6, RELEASE_MS = 1500;
// iPhone / iPad（iPadOS 会自称 Mac）
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// 浏览器认作「用户操作」、允许出声的事件。iOS 上按下（pointerdown）不算，抬起才算
const UNLOCK = ['pointerup', 'touchend', 'click', 'keydown'];

export function createBgm({src, volume = .32, enabled = () => true, onChange = () => {}}) {
  // 播放器自己不预先下载（下面在后台整首下载，免得下两遍）
  const a = new Audio(); a.loop = true; a.preload = 'none'; a.src = src;
  // iPhone 的 Safari 不理会 preload：在后台把整首（1.9 MB）先下到内存里，还没开始放就换成内存里的那份，点下去马上有声音
  let blobUrl = null;
  fetch(src).then(r => r.ok ? r.blob() : null).then(b => {
    if (!b || dead) return; blobUrl = URL.createObjectURL(b);
    if (a.paused && a.currentTime === 0) { a.src = blobUrl; try { a.load(); } catch {} }
  }).catch(() => {});
  a.addEventListener('play', () => onChange()); a.addEventListener('pause', () => onChange());
  let dead = false;
  let room = false, hidden = document.hidden, level = 0, raf = 0, last = 0, ctx = null, gain = null, tapsObj = null, fadeIn = FADE_FIRST;
  const busy = new Set();   // 谁在占用声音：'needle'（唱片）、'media'（课件视频等）
  const release = new Map();

  const goal = () => (enabled() && room && !busy.size && !hidden) ? volume : 0;
  // 声音真的出得来：在放，并且（接了 Web Audio 时）上下文已经跑起来。手机上上下文常常晚一拍才跑起来
  const audible = () => !a.paused && (!ctx || ctx.state === 'running');
  function apply() {
    if (gain) { a.muted = ctx.state !== 'running'; gain.gain.value = level; }   // 上下文没跑起来之前静音，免得绕过音量直接响
    else a.volume = Math.min(1, level);
  }
  function play() {
    const p = a.play();
    if (p) p.then(() => { blocked = false; if (!raf) loop(); }).catch(() => { blocked = true; armUnlock(); onChange(); });   // 浏览器真的拒绝出声了，才算「在等点一下」
  }
  function loop(now = performance.now()) {
    raf = 0;
    const dt = Math.min(.1, last ? (now - last) / 1000 : 1 / 60); last = now;
    const g = goal();
    if (level < g) { if (audible()) level = Math.min(g, level + volume / fadeIn * dt); }   // 真的出声了才开始淡入
    else if (level >= g && g > 0) fadeIn = FADE_FIRST;
    else if (level > g) level = Math.max(g, level - volume / FADE_OUT * dt);
    apply();
    if (level <= 0 && g <= 0) { if (!a.paused) a.pause(); last = 0; return; }   // 暂停时记着播放位置，下次从这里接着放
    raf = requestAnimationFrame(loop);
  }
  function update() {
    if (goal() > 0 && a.paused) { apply(); play(); }
    if (!raf && !a.paused) { last = 0; raf = requestAnimationFrame(loop); }
    onChange();
  }

  // 浏览器拦下了自动播放：第一次点按 / 按键时接上 Web Audio，再开始
  let unlockArmed = false, primed = false, blocked = false;
  function unlock() {
    // iOS：经过 Web Audio 的声音默认会被侧面的静音开关压掉。声明成「播放」类（Safari 17+），和唱片一样不受静音开关影响；
    // 更老的 iOS 没有这个开关，就不接 Web Audio，直接用 <audio> 放（那里不能淡入淡出，只能直接开停）
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
    if (!ctx && !(IOS && !navigator.audioSession)) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) try { ctx = new AC(); const s = ctx.createMediaElementSource(a); gain = ctx.createGain(); gain.gain.value = level; s.connect(gain).connect(ctx.destination); a.volume = 1; } catch { ctx = null; gain = null; }
    }
    ctx?.resume?.();
    // 在这一下点按里先「试放」一下再停：手机只允许点按里开始的播放，之后进唱片页（不在点按里）才能直接放
    if (a.paused && goal() <= 0 && !primed) { primed = true; const m = a.muted; a.muted = true; a.play().then(() => { if (goal() <= 0) a.pause(); a.muted = m; }).catch(() => { a.muted = m; }); }
    for (const n of UNLOCK) removeEventListener(n, unlock, true);
    unlockArmed = false; blocked = false;
    update();
  }
  function armUnlock() {
    if (unlockArmed) return; unlockArmed = true;
    for (const n of UNLOCK) addEventListener(n, unlock, {capture: true, passive: true});
  }
  armUnlock();   // 第一次点按时总要接上 Web Audio，之后淡入淡出在 iOS 上也有效

  // 别的声音在放：唱片、课件视频……（媒体事件不冒泡，在 document 上用捕获）
  const others = () => [...document.querySelectorAll('audio,video')].some(m => m !== a && !m.paused && !m.ended && !m.muted);
  const onMedia = e => { if (e.target === a) return; api.hold('media', others() || e.type === 'play'); };
  for (const n of ['play', 'playing', 'pause', 'ended']) document.addEventListener(n, onMedia, true);
  const onVis = () => { hidden = document.hidden; if (hidden) { level = 0; apply(); a.pause(); } else update(); };
  document.addEventListener('visibilitychange', onVis);

  const api = {
    // 是否在唱片页
    setRoom(on) { room = !!on; update(); },
    // 占用 / 释放声音。释放要等 1.5 s：换歌、缓冲、自动下一首不会让音乐冒出来又退下去
    hold(key, on) {
      clearTimeout(release.get(key)); release.delete(key);
      if (on) { busy.add(key); update(); return; }
      if (!busy.has(key)) return;
      release.set(key, setTimeout(() => { release.delete(key); busy.delete(key); fadeIn = FADE_BACK; update(); }, RELEASE_MS));   // 唱片停了：慢慢引回来
    },
    // 开关改了之后调用
    refresh() { update(); },
    // 天上的音效和背景音乐共用一个 AudioContext（第一次点按之后才有）
    get ctx() { return ctx; },
    // 给星空听的分析器（没有唱片在放、而效果器手动选了风格或年代时，星空跟着背景音乐轻轻动）
    taps() {
      if (!ctx || !gain) return null;
      if (!tapsObj) { const sink = ctx.createGain(); sink.gain.value = 0; sink.connect(ctx.destination);
        const an = ctx.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0; gain.connect(an); an.connect(sink); tapsObj = {an, aL: null, aR: null, ctx}; }
      return tapsObj;
    },
    get state() { return {room, hidden, busy: [...busy], level: +level.toFixed(3), paused: a.paused, time: +a.currentTime.toFixed(2), webAudio: !!gain, enabled: enabled(), waiting: blocked && a.paused && goal() > 0}; },
    // 给界面用：'on' 在放 · 'yield' 让给唱片 / 视频 · 'off' 关掉了 · 'wait' 浏览器不让自动出声，等点一下
    get mode() { if (!enabled()) return 'off'; if (busy.size) return 'yield'; if (a.paused && blocked && goal() > 0) return 'wait'; return 'on'; },
    destroy() { dead = true; cancelAnimationFrame(raf); a.pause(); a.src = ''; if (blobUrl) URL.revokeObjectURL(blobUrl); document.removeEventListener('visibilitychange', onVis);
      for (const n of ['play', 'playing', 'pause', 'ended']) document.removeEventListener(n, onMedia, true); ctx?.close?.(); }
  };
  return api;
}
