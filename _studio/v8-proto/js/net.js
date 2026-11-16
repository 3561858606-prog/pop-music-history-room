// 网速估计：音视频自动挑档用。
// 量法：播放时每 2 秒看一次「已缓冲的秒数」涨了多少 × 这个文件的码率 = 实际下载速度（字节/秒）。
// 不额外下载测速文件；结果存在本机半小时，下次打开直接用。卡顿时立刻往下调。
// 还没量过时：浏览器给了网速提示（Chrome / 安卓）就打个对折用；没有就当作慢网，先放流畅档，量到快了再升。
const KEY = 'v8-proto-net', TTL = 30 * 60e3;
let est = null;
try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && Date.now() - v.t < TTL && v.bps > 0) est = v; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(est)); } catch {} };

// 当前估计（字节/秒）；完全不知道时返回 null。
export function bandwidth() {
  if (est && Date.now() - est.t < TTL) return est.bps;
  const c = navigator.connection;
  if (c?.saveData) return 20e3;
  if (c?.downlink) return c.downlink * 1e6 / 8 / 2;
  return null;
}
export function report(bps) {
  if (!(bps > 0) || !Number.isFinite(bps)) return;
  const old = est && Date.now() - est.t < TTL ? est.bps : null;
  est = {bps: Math.round(old ? old * .6 + bps * .4 : bps), t: Date.now()}; save();
}
// 卡了：估计减半（至少比这次的档位低），后面的歌和视频都往下挑。
export function penalize(kbpsInUse = 0) {
  const b = bandwidth() ?? 40e3;
  est = {bps: Math.round(Math.max(4e3, Math.min(b * .5, kbpsInUse * 125 * 1.2 || Infinity))), t: Date.now()}; save();
}

// 挑档：tiers = [[名字, kbps], …] 从高到低；网速要有码率的 margin 倍才选它。都不够就选最低档。
export function pick(tiers, margin = 2.5, unknown = null) {
  const bw = bandwidth();
  if (bw == null) return unknown ?? tiers.at(-1)[0];
  for (const [name, kbps] of tiers) if (kbps * 125 * margin <= bw) return name;
  return tiers.at(-1)[0];
}

// 量一个正在加载的媒体元素。kbps() 返回当前这个文件的码率。返回 stop()。
export function watch(el, kbps, alive = () => true) {
  let last = null;
  const ahead = () => { const b = el.buffered; let end = 0; for (let i = 0; i < b.length; i++) end = Math.max(end, b.end(i)); return end; };
  const timer = setInterval(() => {
    if (!alive()) return clearInterval(timer);
    if (!el.currentSrc || el.networkState !== 2 /* NETWORK_LOADING */) { last = null; return; }
    const now = performance.now(), end = ahead(), d = el.duration;
    if (last && last.src === el.currentSrc && end > last.end && !(Number.isFinite(d) && end >= d - .5)) {
      const secs = (now - last.now) / 1000;
      if (secs > 1) report((end - last.end) * kbps() * 125 / secs);
    }
    last = {src: el.currentSrc, end, now};
  }, 2000);
  return () => clearInterval(timer);
}
