// Keep startup independent of the catalog, IndexedDB and the WebGL scene.
import {createBgm} from './bgm.js';

const prefsKey = 'v8-proto-prefs-v1';
let off = false;
try { off = !!JSON.parse(localStorage.getItem(prefsKey))?.bgmOff; } catch {}

let render = () => {};
const boot = document.querySelector('script[data-bgm-start]');
const remoteBgm = new URL('../../../audio-bgm/vast-warm-pads.m4a', import.meta.url).href;
let bundledBgm;
if (boot) {
  try { bundledBgm = window.musicRoomIOS?.bundledBgm(); } catch {}
}
export const discBgm = boot ? createBgm({
  src: remoteBgm,
  bundledSrc: bundledBgm,
  enabled: () => !off,
  onChange: () => render()
}) : null;

const wantsDisc = () => !['catalog', 'history', 'train', 'result'].includes(location.hash.slice(1).split('/')[0]);
const syncInitialRoom = () => discBgm.setRoom(wantsDisc());
if (discBgm) {
  syncInitialRoom();
  addEventListener('hashchange', syncInitialRoom);
}

export function finishBgmStartup() {
  removeEventListener('hashchange', syncInitialRoom);
}

export function bindDiscBgm(isOff, onChange) {
  off = isOff;
  render = onChange;
}
