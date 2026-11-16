import {t} from './i18n.js';
// 仅控制临时提示，不写作答或学习记录。
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const controllers = new WeakMap();
export function wordAnswerHTML(text) {
  const value=String(text), parts=typeof Intl.Segmenter==='function'
    ? [...new Intl.Segmenter(undefined,{granularity:'word'}).segment(value)].map(p=>({text:p.segment,word:p.isWordLike}))
    : (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*|[^\p{L}\p{N}\p{M}]+/gu)||[]).map(text=>({text,word:/[\p{L}\p{N}]/u.test(text)}));
  let index=0;
  return parts.map(p=>p.word?`<button type="button" class="peek-word" data-word="${++index}" tabindex="-1" aria-label="${esc(p.text)}" aria-pressed="false"><span aria-hidden="true">${esc(p.text)}</span></button>`:esc(p.text)).join('');
}
export function createWordPeek(root,{duration=1200}={}) {
  controllers.get(root)?.dispose();
  const events = new AbortController();
  let current=null,timer=0;
  const masked=b=>!!b.closest('li.typing');
  const label=b=>b.setAttribute('aria-label',masked(b)?t('短暂查看第 {n} 个词', {n: b.dataset.word}):b.textContent);
  function hide(){clearTimeout(timer);timer=0;if(current){current.classList.remove('peeked');current.setAttribute('aria-pressed','false');label(current);current=null;}}
  function show(b){if(!masked(b))return;hide();current=b;b.classList.add('peeked');b.setAttribute('aria-pressed','true');b.setAttribute('aria-label',b.textContent);timer=setTimeout(hide,duration);}
  function sync(){hide();root.querySelectorAll('.peek-word').forEach(b=>{label(b);b.tabIndex=masked(b)?0:-1;});}
  const opts={signal:events.signal};
  root.addEventListener('pointerdown',e=>{if(e.target.closest('.peek-word')?.closest('li.typing'))e.preventDefault();},opts);
  root.addEventListener('click',e=>{const b=e.target.closest('.peek-word');if(b){e.preventDefault();show(b);}},opts);
  root.addEventListener('keydown',e=>{const b=e.target.closest('.peek-word');if(b&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();show(b);}else if(e.key==='Escape')hide();},opts);
  root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))hide();},opts);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();},opts);
  const controller={hide,sync,dispose(){hide();events.abort();}};
  controllers.set(root,controller);
  return controller;
}
