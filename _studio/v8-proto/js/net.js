// 网速估计：音视频自动挑档用。
// 量法：播放时每 2 秒看一次「已缓冲的秒数」涨了多少 × 这个文件的码率 = 实际下载速度（字节/秒）。
// 不额外下载测速文件；结果存在本机半小时，下次打开直接用。卡顿时立刻往下调。
// 还没量过时：浏览器的网速提示只在它说「慢」时才信（它常常报 10 Mbps，实际却很慢）；否则先放流畅档，量到快了再升。
const KEY = 'v8-proto-net', TTL = 30 * 60e3;
let est = null;
try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && Date.now() - v.t < TTL && v.bps > 0) est = v; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(est)); } catch {} };

// 浏览器明确提示弱网时的保守估计（字节/秒）。
function slowConnectionBandwidth() {
  const c = navigator.connection;
  if (c?.saveData) return 20e3;
  if (c?.downlink && c.downlink < 1.5) return c.downlink * 1e6 / 8 / 2;
  return null;
}

// 当前估计（字节/秒）；完全不知道时返回 null。
export function bandwidth() {
  const weak = slowConnectionBandwidth();
  if (!est || Date.now() - est.t >= TTL) return weak;
  return weak === null ? est.bps : Math.min(est.bps, weak);
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
export function pick(tiers, margin = 2.5, unknown = null, bw = bandwidth()) {
  if (bw == null) return unknown ?? tiers.at(-1)[0];
  for (const [name, kbps] of tiers) if (kbps * 125 * margin <= bw) return name;
  return tiers.at(-1)[0];
}

// 量一个正在加载的媒体元素。kbps() 返回当前这个文件的码率。返回 stop()。
// 提前预取过的文件会从缓存里秒到，不能拿来算网速。
const prefetched = new Set();
export const markPrefetched = url => prefetched.add(new URL(url, location.href).href);
export function watch(el, kbps, alive = () => true) {
  let last = null, start = 0, whole = false;
  // 新文件开始加载：记下时间。网快时整首几秒内就下完，量不到「增长」，就按「下完用了多久」算一个下限。
  el.addEventListener('loadstart', () => { start = performance.now(); whole = false; last = null; });
  const bufferedSeconds = () => {
    const ranges = el.buffered;
    let total = 0;
    for (let i = 0; i < ranges.length; i++) total += ranges.end(i) - ranges.start(i);
    return total;
  };
  el.addEventListener('seeking', () => { last = null; });
  const timer = setInterval(() => {
    if (!alive()) return clearInterval(timer);
    if (!el.currentSrc || el.seeking || prefetched.has(el.currentSrc)) { last = null; return; }
    const now = performance.now(), buffered = bufferedSeconds(), d = el.duration;
    const done = Number.isFinite(d) && buffered >= d - .5;
    if (done && !whole && start && (!last || last.src === el.currentSrc)) {
      whole = true;
      report(d * kbps() * 125 / Math.max(.5, (now - start) / 1000));
    }
    if (el.networkState !== 2 /* NETWORK_LOADING */) { last = null; return; }
    if (last && last.src === el.currentSrc && buffered > last.buffered && !done) {
      const secs = (now - last.now) / 1000;
      if (secs > 1) report((buffered - last.buffered) * kbps() * 125 / secs);
    }
    last = {src: el.currentSrc, buffered, now};
  }, 2000);
  return () => clearInterval(timer);
}
