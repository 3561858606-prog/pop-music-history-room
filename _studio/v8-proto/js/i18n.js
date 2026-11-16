// 界面语言：中文 / 한국어 / English。
// 写法：t('中文原文 {n} 首', {n}) —— 中文原文就是键，韩文、英文在 i18n-dict.js 里按原文对照。
// 没有译文的句子会退回中文（并记在 window.__i18nMissing 里，方便检查）。换语言时整页重新载入。
import {KO, EN} from './i18n-dict.js';

export const LANGS = [['zh', '中文', '中'], ['ko', '한국어', '한'], ['en', 'English', 'EN']];
const KEY = 'v8-proto-lang';
function detect() {
  const q = new URLSearchParams(typeof location === 'undefined' ? '' : location.search).get('lang');
  if (['zh', 'ko', 'en'].includes(q)) return q;
  if (typeof location !== 'undefined' && location.pathname.includes('/tests/')) return 'zh';   // 回归测试按中文断言
  try { const saved = localStorage.getItem(KEY); if (['zh', 'ko', 'en'].includes(saved)) return saved; } catch {}
  // 没选过：浏览器语言里有中文就用中文（老用户多是中文），其次韩文，再其次英文。
  const list = (typeof navigator === 'undefined' ? [] : navigator.languages || [navigator.language]).map(l => String(l).toLowerCase());
  for (const code of ['zh', 'ko', 'en']) if (list.some(l => l.startsWith(code))) return code;
  return 'zh';
}
export const LANG = detect();
const DICT = {ko: KO, en: EN}[LANG] || null;
const missing = new Set();
if (typeof window !== 'undefined') window.__i18nMissing = missing;

export function t(zh, vars = {}) {
  let s = zh;
  if (DICT) {
    const v = DICT[zh];
    if (v === undefined) missing.add(zh);
    else s = typeof v === 'function' ? v(vars) : v;
  }
  return s.replace(/\{(\w+)\}/g, (m, k) => k in vars ? vars[k] : m);
}
// 内容里自带三种语言的地方：{zh, ko, en} 或纯中文字符串。
export const L = x => x == null ? '' : typeof x === 'string' ? x : x[LANG] ?? x.zh ?? '';
// 列表连接：中文用顿号，其余用逗号。
export const join = list => list.join(LANG === 'zh' ? '、' : ', ');

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch {}
  const u = new URL(location.href);
  if (u.searchParams.has('lang')) { u.searchParams.delete('lang'); location.replace(u.href); }
  else location.reload();   // 只换了语言、网址不变时要真正重新载入
}

// index.html 里的固定文字：data-i18n 翻译文字，data-i18n-attr="aria-label,placeholder" 翻译属性。
export function applyStatic(root = document) {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  for (const el of root.querySelectorAll('[data-i18n]')) { el.dataset.i18nSrc ||= el.textContent; el.textContent = t(el.dataset.i18nSrc); }
  for (const el of root.querySelectorAll('[data-i18n-attr]')) for (const a of el.dataset.i18nAttr.split(',')) {
    const k = 'i18nSrc' + a.replace(/(^|-)(\w)/g, (m, d, c) => c.toUpperCase());
    el.dataset[k] ||= el.getAttribute(a) || ''; el.setAttribute(a, t(el.dataset[k]));
  }
  document.title = t('大众音乐史复习室') + ' · ' + t('母盘');
}
