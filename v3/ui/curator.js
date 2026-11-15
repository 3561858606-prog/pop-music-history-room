// 大肥鱼: a small sprite player. She appears on covers, empty states, errors and milestones,
// never while a question is unanswered. Frames advance on plain timers, off-screen ones do not run.
import { reduced } from './motion.js';
const FRAMES = [6, 8, 8, 4, 5, 8, 6, 6, 6, 8, 8];
const url = (row, ext) => `assets/sprites/row-${String(row).padStart(2, '0')}.${ext}`;

export function createFish(w = 84) {
  const el = document.createElement('div');
  el.className = 'fish'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', '大肥鱼');
  el.style.setProperty('--w', w + 'px');
  let timer = 0, shown = -1;
  const setRow = row => {
    shown = row;
    el.style.setProperty('--n', FRAMES[row]);
    el.style.backgroundImage = `url(${url(row, 'png')})`;
    el.style.backgroundImage = `image-set(url(${url(row, 'avif')}) type("image/avif"), url(${url(row, 'png')}) type("image/png"))`;
  };
  const frame = f => el.style.setProperty('--frame', f);
  const stop = () => { clearTimeout(timer); timer = 0; };
  const api = {
    el, stop,
    still(row, f = 0) { stop(); setRow(row); frame(f); return api; },
    // Hold whichever frame an outside progress value asks for (a walk driven by distance, not by a timer).
    // Fractions and overruns are fine: f wraps around the row. Repeated calls on one row do not reassign the image.
    frame(row, f = 0) { stop(); if (shown !== row) setRow(row); const n = FRAMES[row]; frame(((Math.floor(f) % n) + n) % n); return api; },
    // Play a row once at fps, then call done (or hold the last frame).
    play(row, { fps = 8, loops = 1, done } = {}) {
      stop(); setRow(row);
      if (reduced()) { frame(0); done?.(); return api; }
      let i = 0, n = FRAMES[row] * loops;
      const step = () => { frame(i % FRAMES[row]); if (++i < n) timer = setTimeout(step, 1000 / fps); else { timer = 0; done?.(); } };
      step(); return api;
    },
    // Idle: hold the first frame, blink every few seconds on a fixed rhythm.
    idle() {
      stop(); setRow(0); frame(0);
      if (reduced()) return api;
      const gaps = [3400, 5200, 4100, 6300]; let g = 0;
      const blink = () => { if (!el.isConnected) { timer = 0; return; } frame(2); timer = setTimeout(() => { frame(0); timer = setTimeout(blink, gaps[g++ % gaps.length]); }, 140); };
      timer = setTimeout(blink, gaps[0]);
      return api;
    },
  };
  return api;
}
export function init() {}
