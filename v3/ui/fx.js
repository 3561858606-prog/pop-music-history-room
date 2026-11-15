// 纸面苏醒 · the printed pages wake up (design: _studio/design-v6-motion.md).
// Scene 1  the spread has depth: layers drift with the pointer, the big letters leave red echoes when it moves fast.
// Scene 2  a portrait cover leaves the page: it turns in 3D, slides its record out, and the record spins under a fixed light.
// Scene 3  a decade numeral sweeps across the archive, its letters a window onto that decade's records.
// Scene 4  the round's score lands as a stack of echoes that collapse onto the final number.
// Scene 5  a hidden one: the O of POP is a record.
// Learning surfaces (the answer fields, the archive cards, the reports' lists) are never animated here.
import { createVinyl } from './vinyl.js';
import { reduced, ms, HIT } from './motion.js';
import { coverFor } from '../covers.js';
const $ = id => document.getElementById(id);
const fine = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const wide = () => innerWidth >= 1100;
let ctx;

// ---------------------------------------------------------------- Scene 1 · depth and echoes
function depth() {
  const mag = $('welcome'); if (!mag) return;
  // five echo copies behind each big letter block, in the reference poster's manner; at rest they sit exactly underneath
  for (const sel of ['.mg-A', '.mg-pop']) {
    const src = mag.querySelector(sel); if (!src) continue;
    for (let i = 5; i >= 1; i--) { const e = src.cloneNode(true); e.classList.add('echo'); e.style.setProperty('--i', i); e.setAttribute('aria-hidden', 'true'); src.before(e); }
  }
  let tx = 0, ty = 0, x = 0, y = 0, vx = 0, vy = 0, raf = 0;
  const tick = () => {
    const px = x, py = y;
    x += (tx - x) * .1; y += (ty - y) * .1;
    vx = vx * .84 + (x - px) * 7; vy = vy * .84 + (y - py) * 7;
    const s = mag.style, energy = Math.min(1, Math.hypot(vx, vy) * 3.2);
    s.setProperty('--px', x.toFixed(4)); s.setProperty('--py', y.toFixed(4));
    s.setProperty('--ex', vx.toFixed(4)); s.setProperty('--ey', vy.toFixed(4)); s.setProperty('--echo', energy.toFixed(3));
    raf = Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) > .002 ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  mag.addEventListener('pointermove', e => {
    if (!fine() || reduced() || !wide() || e.pointerType !== 'mouse' || document.documentElement.dataset.follow === 'off') return;
    const b = mag.getBoundingClientRect(); tx = (e.clientX - b.left) / b.width * 2 - 1; ty = (e.clientY - b.top) / b.height * 2 - 1; kick();
  });
  mag.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(); });
  addEventListener('museum:room', e => { if (e.detail.name !== 'home') { tx = ty = x = y = vx = vy = 0; kick(); } });
}

// ---------------------------------------------------------------- Scene 2 · a cover leaves the page
const INFO = {
  'mg-r1': { title: 'With the Beatles', artist: 'The Beatles', date: '1963 年 11 月 22 日', label: 'Parlophone PMC 1206', why: '封面是 Robert Freeman 拍的半明半暗合影。英国入侵从这一年开始，课程第 7 讲。', ring: '#E9E4D6' },
  'mg-r2img': { title: 'Elvis Presley', artist: 'Elvis Presley', date: '1956 年 3 月 23 日', label: 'RCA Victor LPM-1254', why: '第一张登上美国专辑榜首的摇滚乐专辑。课程第 6 讲讲 Elvis 与《Hound Dog》。', ring: '#E35AA0' },
  'mg-r3': { title: 'Thriller', artist: 'Michael Jackson', date: '1982 年 11 月 30 日', label: 'Epic QE 38112', why: '史上销量最高的专辑。课程讲到 1968 年，它在课程之后。', ring: '#E9E4D6' },
  'ph-aretha': { title: 'I Never Loved a Man the Way I Love You', artist: 'Aretha Franklin', date: '1967 年 3 月 10 日', label: 'Atlantic SD 8139', why: '收录《Respect》。课程第 7 讲的灵魂乐段落。', ring: '#C9A8E8' },
};
let open = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function liftables() {
  const map = [['.mg-r1', 'mg-r1'], ['.mg-r2img', 'mg-r2img'], ['.mg-r3', 'mg-r3'], ['.mg-r5 .ph', 'ph-aretha']];
  for (const [sel, key] of map) {
    const fig = document.querySelector(sel), info = INFO[key]; if (!fig || !info) continue;
    fig.classList.add('liftable'); fig.dataset.lift = key; fig.tabIndex = 0; fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', `把 ${info.artist}《${info.title}》从纸面上拿起来`);
    fig.addEventListener('click', () => detach(fig, key));
    fig.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detach(fig, key); } });
  }
}

function detach(fig, key) {
  if (open) return;
  const info = INFO[key], img = fig.querySelector('img'); if (!img) return;
  const calm = reduced(), r = fig.getBoundingClientRect();
  const S = Math.round(Math.min(innerHeight * .58, innerWidth * (innerWidth < 760 ? .64 : .36), 480));
  const lp = document.createElement('div');
  lp.className = 'lp'; lp.setAttribute('role', 'dialog'); lp.setAttribute('aria-modal', 'true'); lp.setAttribute('aria-label', `${info.artist}《${info.title}》`);
  lp.style.setProperty('--s', S + 'px'); lp.style.setProperty('--ring', info.ring);
  lp.innerHTML = `<div class="lp-scrim"></div>
<div class="lp-stage"><div class="lp-rig"><div class="lp-disc"><canvas></canvas><span class="lp-label"><b>${esc(info.title)}</b><i>${esc(info.artist)}</i><small>${esc(info.date.slice(0, 4))}</small></span></div>
<div class="lp-sleeve"><div class="lp-front"><img src="${img.currentSrc || img.src}" alt=""></div><div class="lp-back"><p class="lp-year" aria-hidden="true">${esc(info.date.slice(0, 4))}</p><p class="lp-k">${esc(info.date)}</p><h2>${esc(info.title)}</h2><p class="lp-a">${esc(info.artist)}</p><p class="lp-l">${esc(info.label)}</p><p class="lp-w">${esc(info.why)}</p></div><i class="lp-edge"></i></div></div></div>
<div class="lp-bar"><button class="lp-btn lp-flip" type="button">翻到背面</button><button class="lp-btn lp-close" type="button">放回纸面</button></div>
<p class="lp-hint" aria-hidden="true">${fine() ? '拖动封套转一转，移动鼠标改变唱片上的光' : '左右滑动封套转一转'}</p>`;
  document.body.appendChild(lp);
  const rig = lp.querySelector('.lp-rig'), disc = lp.querySelector('.lp-disc'), label = lp.querySelector('.lp-label'), scrim = lp.querySelector('.lp-scrim');
  const vinyl = createVinyl(lp.querySelector('canvas'), { size: Math.round(S * .96) });
  const anims = [];
  const play = (el, k, o) => { if (calm) return null; const a = el.animate(k, o); anims.push(a); return a; };
  open = { fig, lp, rig, disc, vinyl, anims, ry: 0, closing: false };
  fig.classList.add('lifted');
  document.body.classList.add('lp-open');
  // entrance: lift off the paper, turn, land in front of the page (one breath), then the record slides out and starts
  const cx = r.left + r.width / 2 - innerWidth / 2, cy = r.top + r.height / 2 - innerHeight / 2, s0 = r.width / S;
  play(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: ms(320), easing: 'linear', fill: 'backwards' });
  play(rig, [
    { transform: `translate(${cx}px,${cy}px) scale(${s0}) rotateY(0deg) rotateX(0deg)` },
    { transform: `translate(${cx * .45}px,${cy * .45 - 40}px) scale(${(s0 + 1) / 2}) rotateY(-34deg) rotateX(14deg)`, offset: .42 },
    { transform: 'translate(0,0) scale(1) rotateY(-14deg) rotateX(5deg)' },
  ], { duration: ms(640), easing: 'cubic-bezier(.2,.75,.2,1)', fill: 'backwards' });
  const out = play(disc, [{ transform: 'translateZ(-4px) translateX(0)' }, { transform: 'translateZ(-4px) translateX(68%)' }], { delay: ms(560), duration: ms(460), easing: HIT, fill: 'backwards' });
  const spin = () => { if (calm || !open || open.lp !== lp) return; open.spin = label.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1800, iterations: Infinity }); };
  if (out) out.finished.then(spin, () => {}); else spin();
  lp.querySelector('.lp-close').focus({ preventScroll: true });
  // hold: the light follows the pointer, a drag turns the sleeve, touching the record slows it down
  const stage = lp.querySelector('.lp-stage');
  let drag = null;
  lp.addEventListener('pointermove', e => {
    const b = disc.getBoundingClientRect(), a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
    vinyl.light(a + Math.PI, 1);
    if (drag) { open.ry = drag.ry + (e.clientX - drag.x) * .45; rig.style.setProperty('--ry', open.ry + 'deg'); faces(); }
  });
  stage.addEventListener('pointerdown', e => { if (e.target.closest('.lp-btn')) return; drag = { x: e.clientX, ry: open.ry }; rig.classList.add('dragging'); stage.setPointerCapture?.(e.pointerId); });
  const release = () => { if (!drag) return; drag = null; rig.classList.remove('dragging'); const face = Math.round(open.ry / 180) * 180; open.ry = face; rig.style.setProperty('--ry', face + 'deg'); syncFlip(); };
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
  disc.addEventListener('pointerenter', () => { if (open?.spin) open.spin.playbackRate = .25; });
  disc.addEventListener('pointerleave', () => { if (open?.spin) open.spin.playbackRate = 1; });
  // the record belongs to the front: when the back faces you it steps out of the way
  const faces = () => { const n = ((open.ry % 360) + 360) % 360; rig.classList.toggle('flipped', n > 90 && n < 270); };
  const syncFlip = () => { faces(); lp.querySelector('.lp-flip').textContent = rig.classList.contains('flipped') ? '翻回正面' : '翻到背面'; };
  lp.querySelector('.lp-flip').addEventListener('click', () => { open.ry += rig.classList.contains('flipped') ? -180 : 180; rig.style.setProperty('--ry', open.ry + 'deg'); syncFlip(); });
  lp.querySelector('.lp-close').addEventListener('click', close);
  scrim.addEventListener('click', close);
  lp.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Tab') { const b = [...lp.querySelectorAll('.lp-btn')], i = b.indexOf(document.activeElement); e.preventDefault(); b[(i + (e.shiftKey ? b.length - 1 : 1)) % b.length].focus(); }
  });
}

// exit: the record stops and slides home, the sleeve flies back to its place on the page and settles into the paper
function close() {
  if (!open || open.closing) return;
  const o = open; o.closing = true;
  const calm = reduced(), r = o.fig.getBoundingClientRect(), S = parseFloat(o.lp.style.getPropertyValue('--s'));
  o.anims.forEach(a => { try { a.finish(); } catch { /* already done */ } });
  o.spin?.cancel();
  const done = () => { o.vinyl.stop(); o.lp.remove(); o.fig.classList.remove('lifted'); document.body.classList.remove('lp-open'); if (open === o) open = null; o.fig.focus({ preventScroll: true }); };
  if (calm) { done(); return; }
  const cx = r.left + r.width / 2 - innerWidth / 2, cy = r.top + r.height / 2 - innerHeight / 2;
  o.rig.style.setProperty('--ry', '0deg'); o.rig.classList.add('dragging');
  o.disc.animate([{ transform: 'translateZ(-4px) translateX(68%)' }, { transform: 'translateZ(-4px) translateX(0)' }], { duration: ms(240), easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
  o.lp.querySelector('.lp-scrim').animate([{ opacity: 1 }, { opacity: 0 }], { delay: ms(200), duration: ms(300), easing: 'linear', fill: 'forwards' });
  o.lp.querySelectorAll('.lp-bar,.lp-hint').forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(120), fill: 'forwards' }));
  const back = o.rig.animate([
    { transform: `translate(0,0) scale(1) rotateY(${-14}deg) rotateX(5deg)` },
    { transform: `translate(${cx * .55}px,${cy * .55 - 30}px) scale(${(r.width / S + 1) / 2}) rotateY(-26deg) rotateX(10deg)`, offset: .5 },
    { transform: `translate(${cx}px,${cy}px) scale(${r.width / S}) rotateY(0deg) rotateX(0deg)` },
  ], { delay: ms(200), duration: ms(440), easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' });
  back.finished.then(() => { done(); o.fig.animate([{ scale: '1.03' }, { scale: '1' }], { duration: ms(220), easing: HIT }); }, done);
}

// ---------------------------------------------------------------- Scene 3 · a decade crosses the screen
function sweep(decade) {
  if (reduced()) return;
  document.querySelector('.sweep')?.remove();
  const imgs = ctx.catalog.tracks.filter(t => Math.floor(t.year / 10) * 10 === decade).map(coverFor).filter(Boolean).slice(0, 7);
  const el = document.createElement('div'); el.className = 'sweep'; el.setAttribute('aria-hidden', 'true');
  const txt = `${decade}s`, bg = imgs.length ? imgs.map(c => `url('${c.img}')`).join(',') : 'none';
  const pos = imgs.map((_, i) => `${i * 22}vh 50%`).join(',');
  el.innerHTML = [4, 3, 2, 1].map(i => `<span class="sw-echo" style="--i:${i}">${txt}</span>`).join('') + `<span class="sw-main" style="background-image:${bg};background-position:${pos}">${txt}</span>`;
  document.body.appendChild(el);
  // anticipation (pull back) · sweep (fast) · hit (overshoot settles) · hold (the records slide past inside the letters) · exit (rise and fade)
  const K = [
    { transform: 'translate(-62vw,0) skewX(-10deg)', opacity: 1 },
    { transform: 'translate(-66vw,0) skewX(-10deg)', opacity: 1, offset: .1 },
    { transform: 'translate(3vw,0) skewX(4deg)', opacity: 1, offset: .44 },
    { transform: 'translate(0,0) skewX(0deg)', opacity: 1, offset: .56 },
    { transform: 'translate(0,0) skewX(0deg)', opacity: 1, offset: .8 },
    { transform: 'translate(0,-14vh) scale(.82)', opacity: 0 },
  ];
  const total = ms(1250), main = el.querySelector('.sw-main');
  const anims = [main.animate(K, { duration: total, easing: 'linear', fill: 'forwards' })];
  el.querySelectorAll('.sw-echo').forEach((e, i) => anims.push(e.animate(K, { duration: total, delay: ms((i + 1) * 34), easing: 'linear', fill: 'forwards' })));
  if (imgs.length) anims.push(main.animate([{ backgroundPosition: imgs.map((_, i) => `${i * 22}vh 50%`).join(',') }, { backgroundPosition: imgs.map((_, i) => `${i * 22 - 60}vh 50%`).join(',') }], { duration: total, easing: 'linear', fill: 'forwards' }));
  const end = () => { anims.forEach(a => { try { a.cancel(); } catch { /* gone */ } }); el.remove(); removeEventListener('pointerdown', end, true); removeEventListener('keydown', end, true); };
  anims[0].finished.then(end, () => {});
  setTimeout(() => { addEventListener('pointerdown', end, true); addEventListener('keydown', end, true); }, 0);
}

// ---------------------------------------------------------------- Scene 4 · the score lands as echoes
function echoScore() {
  if (reduced()) return;
  const big = $('posterBig'); if (!big?.textContent.trim()) return;
  const host = big.parentElement; host.querySelectorAll('.p-echo').forEach(e => e.remove());
  const copies = [5, 4, 3, 2, 1].map(i => { const e = document.createElement('b'); e.className = 'p-big p-echo'; e.style.setProperty('--i', i); e.textContent = big.dataset.final || big.textContent; e.setAttribute('aria-hidden', 'true'); host.insertBefore(e, big); return e; });
  copies.forEach((e, k) => {
    const i = 5 - k;
    e.animate([{ transform: `translateY(${-i * 26}px)`, opacity: .55 - i * .07 }, { transform: `translateY(${-i * 26}px)`, opacity: .55 - i * .07, offset: .45 }, { transform: 'translateY(0)', opacity: 0 }], { duration: ms(900), delay: ms(k * 30), easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }).finished.then(() => e.remove(), () => e.remove());
  });
}

// ---------------------------------------------------------------- Scene 5 · the O of POP is a record (hidden)
let rolling = 0;
function popRecord() {
  const o = document.querySelector('.mg-pop:not(.echo) span:nth-child(2)'); if (!o) return;
  o.classList.add('pop-o'); o.setAttribute('aria-hidden', 'true');
  o.addEventListener('click', () => {
    if (reduced() || Date.now() - rolling < 4000) return; rolling = Date.now();
    const b = o.getBoundingClientRect(), d = Math.min(b.width, b.height) * 1.02;
    const wrap = document.createElement('div'); wrap.className = 'pop-disc'; wrap.style.cssText = `left:${b.left + b.width / 2 - d / 2}px;top:${b.top + b.height / 2 - d / 2}px;width:${d}px;height:${d}px`;
    wrap.innerHTML = '<canvas></canvas><i></i>'; document.body.appendChild(wrap);
    const v = createVinyl(wrap.querySelector('canvas'), { size: d });
    o.style.visibility = 'hidden';
    const far = -Math.min(b.left - 40, d * 2.6), turn = far / (Math.PI * d) * 360;
    // roll out (accelerando), stop dead on the beat, a two-beat wobble, roll home (ritardando), and become a letter again
    const a = wrap.animate([
      { transform: 'translateX(0) rotate(0deg)' },
      { transform: `translateX(${far}px) rotate(${turn}deg)`, offset: .38 },
      { transform: `translateX(${far}px) rotate(${turn - 14}deg)`, offset: .48 },
      { transform: `translateX(${far}px) rotate(${turn + 10}deg)`, offset: .58 },
      { transform: `translateX(${far}px) rotate(${turn}deg)`, offset: .64 },
      { transform: 'translateX(0) rotate(0deg)' },
    ], { duration: ms(2200), easing: 'cubic-bezier(.45,.05,.3,1)' });
    let n = 0; const glint = setInterval(() => v.light((n += .35), 1), 60);
    document.querySelectorAll('.mg-pop:not(.echo) span:not(.pop-o)').forEach((p, i) => p.animate([{ scale: '1 1' }, { scale: '1 .86', offset: .12 }, { scale: '1 1', offset: .3 }, { scale: '1 .9', offset: .55 }, { scale: '1 1' }], { duration: ms(1100), delay: ms(i * 140), easing: 'ease-out', iterations: 2 }));
    dispatchEvent(new CustomEvent('museum:fx', { detail: { kind: 'fish-hop' } }));
    a.finished.finally(() => { clearInterval(glint); v.stop(); wrap.remove(); o.style.visibility = ''; });
  });
}

export function init(c) {
  ctx = c;
  depth(); liftables(); popRecord();
  $('decadeNav')?.addEventListener('click', e => { const d = e.target.closest('.dec'); if (d && !d.disabled) sweep(Number(d.dataset.decade)); }, true);
  addEventListener('museum:finish', e => { if (e.detail?.fresh) setTimeout(echoScore, ms(460)); });
  addEventListener('museum:room', e => { if (e.detail.name !== 'home' && open) close(); });
}
