// 拖封面 = 拖这首歌的音频文件：放到桌面、文件夹，或别的接受音频的软件里。
// 拖出去的是网站上的原档（t.src，不是给弱网用的压缩档），格式、码率不变；站上的文件原样留在原处，浏览器只是下载一份到放下的地方。
// 用的是 Chromium 系浏览器（Chrome、Edge、Arc……）认的 DownloadURL：「类型:文件名:地址」，放下时由浏览器下载、用这里给的文件名。
// Safari、Firefox 不让网页往系统里拖文件：拖的时候就不拖了，在封面旁边给一个「下载原文件」。
// 只在鼠标 / 触控板上开：触屏上长按另有用处（选中、系统菜单），不去抢。
import * as M from './model.js';
import {AUDIO} from './media-tiers.js';
import {t as tr} from './i18n.js';

const MIME = {mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg'};
const UA = navigator.userAgent;
// DownloadURL 只有 Chromium 认。userAgentData 只有 Chromium 有；老版本再看 UA
export const fileDrag = !!navigator.userAgentData || (/Chrome\/|Chromium\/|Edg\//.test(UA) && !/Firefox\//.test(UA));
const fine = matchMedia('(pointer: fine)');
export const canDrag = () => fine.matches;
// 给可拖的元素加上：<button … ${dragAttrs(t)}>；里面的 <img> 要 draggable="false"，免得拖成图片
export const dragAttrs = t => fine.matches && t?.src ? `draggable="true" data-drag-audio="${t.id}"` : '';

// 文件名里不能有的字符换成空格（DownloadURL 用冒号分段，冒号也不能有）
const safeName = s => String(s).normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150) || 'audio';
export function audioFileOf(t) {
  const url = new URL(M.audioFallbackSrc(t), location.href).href;
  const ext = (new URL(url).pathname.match(/\.([a-z0-9]+)$/i)?.[1] || 'mp3').toLowerCase();
  return {url, ext, mime: MIME[ext] || 'application/octet-stream', kbps: AUDIO[t.id]?.hd || null,
    // 站上的文件叫 t01.mp3 这样的编号，拖到桌面认不出是哪首；用「音乐家 - 歌名」，扩展名照原文件
    name: `${safeName(`${t.artist} - ${M.titleOf(t)}`)}.${ext}`};
}

let card = null, cardFor = null;
function closeCard() {
  if (!card) return;
  card.remove(); card = null; cardFor = null;
  removeEventListener('pointerdown', outside, true); removeEventListener('keydown', onKey, true); removeEventListener('resize', closeCard);
}
const outside = e => { if (card && !card.contains(e.target)) closeCard(); };
const onKey = e => { if (e.key === 'Escape' && card) { closeCard(); cardFor?.focus?.(); e.stopPropagation(); } };

// 跨域的原档（第 9 讲放在媒体仓库里）浏览器不认 download 属性的文件名：先取回来，再用本页的地址存
async function download(f, a) {
  const label = a.querySelector('span');
  label.textContent = tr('正在下载…');
  try {
    const r = await fetch(f.url); if (!r.ok) throw new Error(r.status);
    const blob = await r.blob(), href = URL.createObjectURL(new Blob([blob], {type: f.mime}));
    const tmp = Object.assign(document.createElement('a'), {href, download: f.name});
    document.body.append(tmp); tmp.click(); tmp.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60e3);
    label.textContent = tr('下载原文件');
  } catch { label.textContent = tr('下载没成功，再点一次'); }
}

function showCard(el, t, f) {
  closeCard();
  cardFor = el;
  card = document.createElement('div');
  card.className = 'drag-get'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', tr('下载原文件'));
  const meta = [f.ext.toUpperCase(), f.kbps ? f.kbps + ' kbps' : ''].filter(Boolean).join(' · ');
  card.innerHTML = `<button class="dg-x" type="button" aria-label="${tr('关闭')}">×</button>
    <p class="dg-why"><b>${tr('这个浏览器不让网页把文件拖出去')}</b>${tr('可以直接下载这首歌的原文件；在 Chrome 或 Edge 里，封套能直接拖到桌面或文件夹。')}</p>
    <a class="dg-dl" href="${f.url}" download="${f.name.replace(/"/g, '')}"><span>${tr('下载原文件')}</span><small></small></a>`;
  card.querySelector('small').textContent = `${f.name} · ${meta}`;
  document.body.append(card);
  const r = el.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight, pad = 12;
  let x = r.right + 10, y = r.top;
  if (x + w > innerWidth - pad) x = Math.max(pad, r.left - w - 10);
  if (x < pad) { x = Math.min(innerWidth - w - pad, Math.max(pad, r.left)); y = r.bottom + 10; }
  card.style.left = Math.round(x) + 'px'; card.style.top = Math.round(Math.max(pad, Math.min(innerHeight - h - pad, y))) + 'px';
  card.querySelector('.dg-x').addEventListener('click', () => { closeCard(); el.focus?.(); });
  const a = card.querySelector('.dg-dl');
  a.addEventListener('click', e => { if (new URL(f.url).origin !== location.origin) { e.preventDefault(); download(f, a); } });   // 同源：让链接自己下载
  a.focus({preventScroll: true});
  addEventListener('pointerdown', outside, true); addEventListener('keydown', onKey, true); addEventListener('resize', closeCard);
}

function onDragStart(e) {
  const el = e.target.closest?.('[data-drag-audio]');
  if (!el || !fine.matches) return;
  const t = M.byId.get(el.dataset.dragAudio); if (!t?.src) return;
  const f = audioFileOf(t), dt = e.dataTransfer;
  if (!fileDrag || !dt) { e.preventDefault(); showCard(el, t, f); return; }
  closeCard();
  dt.clearData();
  dt.setData('DownloadURL', `${f.mime}:${f.name}:${f.url}`);
  dt.effectAllowed = 'copy';
  el.classList.add('drag-out');
}
const onDragEnd = e => e.target.closest?.('[data-drag-audio]')?.classList.remove('drag-out');

let bound = false;
export function bindAudioDrag() {
  if (bound) return; bound = true;
  document.addEventListener('dragstart', onDragStart);
  document.addEventListener('dragend', onDragEnd);
}
