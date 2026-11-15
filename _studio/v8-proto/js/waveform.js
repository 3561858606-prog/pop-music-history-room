// Per-audio PCM envelopes. Drawing is cached; playback only changes the reveal clip.
const cache = new Map();
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const validDuration = value => Number.isFinite(value) && value > 0;
export const timeAtX = (clientX, bounds, duration) => bounds.width > 0 && validDuration(duration)
  ? clamp((clientX - bounds.left) / bounds.width, 0, 1) * duration : 0;
export async function loadWaveform(track) {
  if (!cache.has(track.id)) {
    const request = fetch(new URL('../assets/waveforms/' + encodeURIComponent(track.id) + '.json', import.meta.url))
      .then(response => { if (!response.ok) throw Error('波形暂未载入'); return response.json(); })
      .then(data => {
        if (data.version !== 1 || data.id !== track.id || data.src !== track.src || !validDuration(data.duration)
          || !Number.isInteger(data.bins) || data.bins < 1
          || !['min','max','rms'].every(k => Array.isArray(data[k]) && data[k].length === data.bins && data[k].every(Number.isFinite))) throw Error('波形与音频不匹配');
        return data;
      }).catch(error => { cache.delete(track.id); throw error; });
    cache.set(track.id, request);
  }
  return cache.get(track.id);
}
// Aggregate instead of sampling a single point, so narrow transients remain visible.
export function envelopeAt(data, x, width) {
  const first = clamp(Math.floor(x / width * data.bins), 0, data.bins - 1);
  const end = clamp(Math.ceil((x + 1) / width * data.bins), first + 1, data.bins);
  let lo = 0, hi = 0, energy = 0;
  for (let i = first; i < end; i++) { lo = Math.min(lo, data.min[i]); hi = Math.max(hi, data.max[i]); energy += data.rms[i] ** 2; }
  return [lo / 1000, hi / 1000, Math.sqrt(energy / (end - first)) / 1000];
}
const clock = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
export function createWaveform(canvas, {track, duration, position, onSeek, onCommit, onToggle, onStatus, arrowSeek = true}) {
  let data = null, dead = false, art = null, artKey = '', pointer = null, hover = null, W = 0, H = 0, dpr = 1;
  const context = canvas.getContext('2d');
  const length = () => { const actual = duration(); return validDuration(actual) ? actual : data?.duration || track.duration || 0; };
  function paint() {
    if (!data) return null;
    const key = [W, H, dpr].join(':');
    if (key === artKey && art) return art;
    artKey = key;
    const points = Array.from({length: Math.ceil(W)}, (_, x) => envelopeAt(data, x, W));
    const mid = H / 2 + 3, amplitude = Math.max(1, H / 2 - 9);
    const peakPath = new Path2D(), rmsPath = new Path2D();
    for (let x = 0; x < points.length; x++) { const y = mid - points[x][1] * amplitude; x ? peakPath.lineTo(x, y) : peakPath.moveTo(x, y); }
    for (let x = points.length - 1; x >= 0; x--) peakPath.lineTo(x, mid - points[x][0] * amplitude);
    peakPath.closePath();
    for (let x = 0; x < points.length; x++) { const y = mid - points[x][2] * amplitude; x ? rmsPath.lineTo(x, y) : rmsPath.moveTo(x, y); }
    for (let x = points.length - 1; x >= 0; x--) rmsPath.lineTo(x, mid + points[x][2] * amplitude);
    rmsPath.closePath();
    art = [false, true].map(played => {
      const layer = document.createElement('canvas'); layer.width = canvas.width; layer.height = canvas.height;
      const c = layer.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = played ? 'rgba(22,19,15,.55)' : 'rgba(22,19,15,.20)'; c.fill(peakPath);
      c.fillStyle = played ? '#16130F' : 'rgba(22,19,15,.36)'; c.fill(rmsPath);
      return layer;
    });
    return art;
  }
  function draw() {
    if (dead || !canvas.isConnected) return;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    W = width; H = height; dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); artKey = ''; }
    context.setTransform(dpr, 0, 0, dpr, 0, 0); context.clearRect(0, 0, W, H);
    const dur = length(), time = clamp(position() || 0, 0, dur), px = dur ? time / dur * W : 0, layers = paint();
    if (layers) {
      context.drawImage(layers[0], 0, 0, W, H);
      context.save(); context.beginPath(); context.rect(0, 0, px, H); context.clip(); context.drawImage(layers[1], 0, 0, W, H); context.restore();
    } else {
      // Pending/failed data is a baseline, never a fabricated audio waveform.
      context.strokeStyle = 'rgba(22,19,15,.2)'; context.lineWidth = 1; context.beginPath(); context.moveTo(0, H / 2 + 3); context.lineTo(W, H / 2 + 3); context.stroke();
    }
    context.strokeStyle = '#16130F'; context.lineWidth = 1; context.beginPath(); context.moveTo(px, 10); context.lineTo(px, H); context.stroke();
    const marker = clamp(px, 6, W - 6);
    context.fillStyle = '#E7A33C'; context.beginPath(); context.moveTo(marker - 6, 1); context.lineTo(marker + 6, 1); context.lineTo(marker, 11); context.closePath(); context.fill(); context.stroke();
    if (hover !== null && dur) {
      const x = clamp(hover, 0, W), text = clock(x / W * dur);
      context.strokeStyle = 'rgba(22,19,15,.45)'; context.setLineDash([2, 3]); context.beginPath(); context.moveTo(x, 14); context.lineTo(x, H); context.stroke(); context.setLineDash([]);
      context.font = '12px system-ui'; const tw = context.measureText(text).width + 8, label = clamp(x - tw / 2, 0, W - tw);
      context.fillStyle = '#EEE8DA'; context.fillRect(label, 0, tw, 15); context.fillStyle = '#16130F'; context.fillText(text, label + 4, 12);
    }
    const now = String(Math.round(time)), max = String(Math.round(dur));
    if (canvas.getAttribute('aria-valuenow') !== now || canvas.getAttribute('aria-valuemax') !== max) { canvas.setAttribute('aria-valuenow', now); canvas.setAttribute('aria-valuetext', clock(time) + '，共 ' + clock(dur)); }
    canvas.setAttribute('aria-valuemax', max);
  }
  async function load() {
    onStatus?.('loading'); canvas.setAttribute('aria-busy', 'true');
    try { const loaded = await loadWaveform(track); if (dead) return; data = loaded; artKey = ''; onStatus?.('ready'); }
    catch { if (dead) return; onStatus?.('error'); }
    if (!dead) { canvas.setAttribute('aria-busy', 'false'); draw(); }
  }
  const at = e => timeAtX(e.clientX, canvas.getBoundingClientRect(), length());
  function down(e) {
    if (e.button !== 0 || pointer !== null || !length()) return;
    pointer = e.pointerId; canvas.focus({preventScroll:true}); canvas.setPointerCapture(e.pointerId);
    hover = e.clientX - canvas.getBoundingClientRect().left; onSeek(at(e)); draw(); e.preventDefault();
  }
  function move(e) {
    if (pointer !== null && e.pointerId !== pointer) return;
    hover = e.clientX - canvas.getBoundingClientRect().left;
    if (pointer !== null) onSeek(at(e));
    draw();
  }
  function end(e) {
    if (pointer !== e.pointerId) return;
    if (e.type === 'pointerup') onSeek(at(e));
    const id = pointer; pointer = null;
    if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    onCommit?.(); draw();
  }
  const leave = () => { if (pointer === null) { hover = null; draw(); } };
  function key(e) {
    if (e.altKey || e.metaKey || e.ctrlKey || e.isComposing) return;
    let target;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (!arrowSeek) return; // 训练页交给答题项导航，不占用左右键。
      target = position() + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 15 : 5);
    }
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = length();
    else if (e.key === ' ' || e.key === 'Enter') onToggle?.();
    else return;
    if (target !== undefined) { onSeek(clamp(target,0,length())); onCommit?.(); draw(); }
    e.preventDefault(); e.stopPropagation();
  }
  const events = {pointerdown:down,pointermove:move,pointerup:end,pointercancel:end,lostpointercapture:end,pointerleave:leave,keydown:key};
  for (const [name, fn] of Object.entries(events)) canvas.addEventListener(name,fn);
  const observer = new ResizeObserver(draw); observer.observe(canvas);
  load(); draw();
  return {draw, retry:load, duration:length, destroy() { dead = true; observer.disconnect(); for (const [name,fn] of Object.entries(events)) canvas.removeEventListener(name,fn); art = null; }};
}
