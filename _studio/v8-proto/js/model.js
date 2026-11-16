// 母盘的数据模型：每首歌在盘上的位置，以及它被刻了多少。
// 只读取 v3 的课程数据和记忆模块，不改动它们。原型的作答记录写在自己的存储键里。
import {catalog} from '../../../v3/catalog.js';
import {COVERS} from '../../../v3/covers.js';
import {PROTO_COVERS} from './cover-overrides.js';
import {status, KEYS, emptyMemory, record, migrate} from '../../../v3/memory.js';
import {appearancesFor} from '../../../v3/track-model.js';
import {LearningStore, uid} from './store.js';
import {alternateNames} from './names.js';
import {t, t as tr, LANG} from './i18n.js';
export {uid};

// 站点根目录：按本文件位置推算（_studio/v8-proto/js/ 往上三级），站点放在域名根或子路径（如 GitHub Pages 的 /仓库名/）都能用。
export const ROOT = new URL('../../../', import.meta.url);
export const site = path => new URL(String(path).replace(/^\/+/, ''), ROOT).href;

export {catalog, KEYS};
export const TAU = Math.PI * 2;

// 与 v3/app.js 一致：存疑标记在运行时去掉，catalog.js 文件本身不动。
for (const t of catalog.tracks) { delete t.uncertainAudio; delete t.discrepancy; }

/* ---------- 盘面几何（盘半径 = 1） ---------- */
export const GEO = {RL: 0.235, R1: 0.30, R2: 0.952, T: 0.014};
const GAP_NEAR = 2.4, GAP_FAR = 5;      // 相邻年代 / 中间隔了没有曲目的年代
export const COARSE_UNTIL = 1948;       // 之前是 78 转的粗纹，之后是密纹

export const tracks = [...catalog.tracks].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
export const byId = new Map(tracks.map(t => [t.id, t]));
const dec = y => Math.floor(y / 10) * 10;

const sameYear = new Map();
for (const t of tracks) { if (!sameYear.has(t.year)) sameYear.set(t.year, []); sameYear.get(t.year).push(t.id); }

export const rings = [];   // 由外向内，rings[i].i === i
export const bands = [];
{
  let cursor = 0, prev = null;
  const raw = [];
  for (const t of tracks) {
    const d = dec(t.year);
    if (prev !== null && d !== prev) cursor += d - prev > 10 ? GAP_FAR : GAP_NEAR;
    raw.push({t, d, u: cursor});
    cursor += 1; prev = d;
  }
  const unit = (GEO.R2 - GEO.R1) / cursor;
  GEO.unit = unit;
  for (const {t, d, u} of raw) {
    const sibs = sameYear.get(t.year), n = sibs.length, k = sibs.indexOf(t.id);
    const fan = n > 1 ? (k / (n - 1) - .5) * Math.min(.8, .22 * (n - 1)) : 0;
    const phi = (((t.year % 10) + fan) / 10 * TAU + TAU) % TAU;
    const outer = GEO.R2 - u * unit;
    let band = bands[bands.length - 1];
    if (!band || band.decade !== d) { band = {i: bands.length, decade: d, outer, inner: outer, ids: []}; bands.push(band); }
    band.ids.push(t.id); band.inner = outer - unit;
    rings.push({i: rings.length, id: t.id, t, outer, inner: outer - unit, mid: outer - unit / 2, phi,
      digit: t.year % 10, band: band.i, coarse: t.year < COARSE_UNTIL});
  }
  for (const b of bands) { b.mid = (b.outer + b.inner) / 2; b.label = b.decade + 's'; b.name = t('{d} 年代', {d: b.decade}); }
}
export const ringOf = new Map(rings.map(r => [r.id, r]));
export const yearTracks = year => (sameYear.get(year) || []).map(id => byId.get(id));

// 盘面局部坐标：角度 phi 从 12 点方向起顺时针。
export const localXZ = (r, phi) => [r * Math.sin(phi), -r * Math.cos(phi)];

// 半径落在哪一圈：返回最近的圈（容差以「圈」为单位）。
export function ringAtRadius(r, tolUnits = 1.2) {
  let best = null, bd = Infinity;
  for (const g of rings) { const d = Math.abs(r - g.mid); if (d < bd) { bd = d; best = g; } }
  return best && bd <= GEO.unit * (tolUnits + .5) ? best : null;
}
export function bandAtRadius(r) {
  if (r < GEO.R1 - GEO.unit * 2 || r > GEO.R2 + GEO.unit * 2) return null;
  let best = null, bd = Infinity;
  for (const b of bands) { const d = r > b.outer ? r - b.outer : r < b.inner ? b.inner - r : 0; if (d < bd) { bd = d; best = b; } }
  return best;
}

/* ---------- 课程信息 ---------- */
export const lectures = catalog.lectures;
export const lectureIds = t => appearancesFor(t).map(a => a.deck);
const LECTURE_EN = {1: 'Concepts and Origins', 2: 'The 1920s (1)', 3: 'The 1920s (2)', 4: 'The Swing Era', 5: 'Popular Music after WWII', 6: 'Rock and Roll', 7: 'The 1960s: Rock and Soul'};
export const lectureLabel = id => { const l = lectures.find(x => x.id === id); return !l ? '' : LANG === 'ko' ? l.ko || l.label : LANG === 'en' ? LECTURE_EN[id] || l.label : l.label; };
export const styleOf = t => catalog.styles.find(s => s.id === t.style) || {label: t.style, sub: '', ko: ''};
export const aliasesOf = (t, field, exclude = []) => alternateNames(t, field, catalog.styles, tracks, exclude);
export const coverOf = t => { const c = PROTO_COVERS[t.id] || COVERS[t.id]; return c ? {...c, url: site(c.url || 'v3/' + c.img)} : null; };
export function coverLabel(cover) {
  if (!cover) return t('封面待补');
  if (cover.kind === 'leaflet') return t('唱片附页 · 同盘 A 面资料，非本曲封套');
  const kind = t({album:'专辑封面',compilation:'再版合辑',sleeve:'单曲封套',label:'唱片标签',sheet:'乐谱封面',photo:'历史资料图',device:'播放设备',ad:'发行广告'}[cover.kind] || '历史图像');
  return kind + (cover.match === 'context' ? ' · ' + t('作品或历史资料') : cover.match === 'version' ? ' · ' + t('同曲其他录音') : cover.match === 'unverified' ? ' · ' + t('录音版本未确认') : '');
}
// 逐曲长读（约 180KB）不挡进入：盘面出来后再在后台载入；载入前打开的面板稍后补上。
let STORIES = null, storiesP = null;
export const loadStories = () => storiesP ||= import('./stories.js').then(m => { STORIES = m.STORIES; }).catch(() => { storiesP = null; });
export const storiesLoaded = () => !!STORIES;
export const storyOf = t => STORIES?.[t.id] || null;
export const audioSrc = t => site(t.src);
// 同名的几个版本（如三段 Maple Leaf Rag）在列表里带上版本说明
const titleCount = new Map(); for (const t of tracks) titleCount.set(t.song, (titleCount.get(t.song) || 0) + 1);
export const titleOf = t => titleCount.get(t.song) > 1 && t.versionLabel ? (LANG === 'zh' ? `${t.song}（${t.versionLabel.split(' · ')[0]}）` : `${t.song} (${tr(t.versionLabel.split(' · ')[0])})`) : t.song;
export const FIELD_NAMES = {song: t('歌名'), year: t('年份'), artist: t('音乐家'), style: t('风格')};
// 同一条辐线：年份个位数相同的歌。
export const spokeMates = t => tracks.filter(o => o.id !== t.id && o.year % 10 === t.year % 10);

/* ---------- 记忆：读真实记录，写到原型自己的键 ---------- */
const REAL_KEY = 'fat-fish-music-memory-v2', PROTO_KEY = 'v8-proto-memory-v1', PREF_KEY = 'v8-proto-prefs-v1';
const testing = typeof location !== 'undefined' && location.pathname.includes('/_studio/v8-proto/tests/');
const raw = key => { if (testing) return null; try { return localStorage.getItem(key); } catch { return null; } };
const parse = value => { try { return JSON.parse(value || 'null'); } catch { return null; } };
const read = key => parse(raw(key));
let memory = emptyMemory(), source = 'empty';
const originals = Object.fromEntries([REAL_KEY, PROTO_KEY, 'v8-proto-last-round', PREF_KEY, 'fat-fish-pop-music-review-v1', 'fat-fish-music-sessions-v2'].map(k => [k, raw(k)]));
// 合并已存在的记录，绝不回写原键；有编号的事件不会重复计分。
const oldReview = read('fat-fish-pop-music-review-v1');
const oldReports = read('fat-fish-music-sessions-v2');
const oldArray = value => Array.isArray(value) ? value : [];
const oldEntries = [...oldArray(oldReview?.masteryHistory), ...oldArray(oldReview?.history), ...oldArray(oldReports?.reports).flatMap(r => oldArray(r?.entries))];
const realMemory = migrate(read(REAL_KEY), oldEntries, catalog.tracks);
memory = migrate(read(PROTO_KEY), Object.values(realMemory.events), catalog.tracks);
source = Object.keys(memory.events).length ? 'proto' : 'empty';
const savedPrefs = read(PREF_KEY);
export const prefs = Object.assign({demo: 'real', scope: lectures.map(l => l.id), size: 10, custom: 15, introSeen: false, flat: false, questionType: 'choice'},
  savedPrefs && typeof savedPrefs === 'object' && !Array.isArray(savedPrefs) ? savedPrefs : {});
prefs.demo = 'real'; // 正常使用始终展示真实记录，旧示意偏好不再生效。
if (![10, 20, 'all', 'custom'].includes(prefs.size)) prefs.size = 10;
prefs.questionType = prefs.questionType === 'written' ? 'written' : 'choice';
prefs.custom = Math.max(1, Math.min(tracks.length, Math.round(+prefs.custom) || 15));
export const sizeFor = n => prefs.size === 'all' ? n : Math.max(1, Math.min(n, prefs.size === 'custom' ? prefs.custom : prefs.size));
prefs.scope = Array.isArray(prefs.scope) ? prefs.scope.filter(id => lectures.some(l => l.id === id)) : [];
if (!prefs.scope.length) prefs.scope = lectures.map(l => l.id);
export function savePrefs() { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { emit('prefs-error'); } }

export const store = new LearningStore(testing ? uid('v8-proto-ui-test') : undefined);
let rounds = [], refreshTail = Promise.resolve();
const mergeRounds = incoming => { const all = new Map(rounds.map(r => [r.id,r])); for (const r of incoming) if (!all.has(r.id) || (all.get(r.id).revision || 0) <= (r.revision || 0)) all.set(r.id,r); rounds = [...all.values()]; };
function legacyRounds() {
  const groups = new Map();
  for (const e of Object.values(memory.events)) if (e.sessionKind === 'v8-proto' && typeof e.sessionId === 'string') {
    if (!groups.has(e.sessionId)) groups.set(e.sessionId, []);
    groups.get(e.sessionId).push(e);
  }
  const result = [...groups].map(([id, entries]) => ({id, entries: entries.sort((a,b) => String(a.time).localeCompare(String(b.time))),
    state: 'legacy', revision: 0, questionType: entries[0].questionType || 'choice', scope: null, size: null,
    startedAt: entries[0].time, time: entries.at(-1).time, cuts: [], legacy: true}));
  const last = read('v8-proto-last-round');
  if (last && typeof last.id === 'string' && Array.isArray(last.entries)) {
    const entries = last.entries.filter(e => byId.has(e.id) && Array.isArray(e.fields) && e.fields.length === 4);
    if (entries.length) {
      const i = result.findIndex(r => r.id === last.id), known = i >= 0 ? result.splice(i,1)[0] : null;
      result.push({...last, entries, scope: Array.isArray(last.scope) ? last.scope : null, state: 'legacy', revision: 0,
        questionType: known?.questionType || 'choice', cuts: Array.isArray(last.cuts) ? last.cuts : [], legacy: true});
    }
  }
  for (const r of oldArray(oldReports?.reports)) {
    if (!r || typeof r.id !== 'string' || !Array.isArray(r.entries) || result.some(o => o.id === r.id)) continue;
    const entries = r.entries.filter(e => byId.has(e.id) && Array.isArray(e.fields) && e.fields.length === 4);
    if (entries.length) result.push({...r, entries, state:'legacy', revision:0, scope:Array.isArray(r.scope)?r.scope:null, cuts:[], legacy:true});
  }
  return result;
}
export const ready = (async () => {
  await store.open();
  await store.importLegacy(Object.values(memory.events), legacyRounds(), originals);
  await refreshRecords();
})();
export function refreshRecords() {
  refreshTail = refreshTail.catch(() => {}).then(async () => {
    const [events, savedRounds] = await Promise.all([store.readAll('events'), store.readAll('rounds')]);
    memory = migrate(null, events, catalog.tracks); mergeRounds(savedRounds);
    source = events.length ? 'proto' : 'empty'; emit('lanes');
  });
  return refreshTail;
}
export const history = () => rounds.filter(r => ['finished', 'legacy'].includes(r.state) && r.entries?.length).sort((a,b) => String(b.time || b.updatedAt || '').localeCompare(String(a.time || a.updatedAt || '')));
// 「继续未完成的一轮」只算至少答过一首的；一首没答的空轮次不提示。
export const unfinished = () => rounds.filter(r => r.state === 'active' && r.entries?.length > 0).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
export const roundById = id => rounds.find(r => r.id === id);
export async function saveRound(snapshot, entry) {
  const saved = await store.saveRound(snapshot, entry);
  mergeRounds([saved]);
  if (entry) await refreshRecords();
  emit('rounds');
  channel?.postMessage({kind: entry ? 'events' : 'rounds'});
  return saved;
}
const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('v8-proto-records-v2') : null;
if (channel) channel.onmessage = message => {
  const refresh = message.data?.kind === 'rounds' ? store.readAll('rounds').then(saved => { mergeRounds(saved); emit('rounds'); }) : refreshRecords();
  refresh.catch(() => emit('storage-error'));
};
export async function exportBackup() {
  const backup = await store.backup();
  backup.legacy = originals;
  return backup;
}
/* ---------- 导入学习备份（「历史」页导出的 JSON） ---------- */
const ROUND_STATES = ['finished', 'legacy', 'active'];
const playedRound = r => r.state !== 'active' && r.entries.length > 0;
export function parseBackup(text) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(t('读不出这个文件，它不是完整的备份文件。')); }
  if (!data || typeof data !== 'object' || data.app !== 'v8-proto' || !Array.isArray(data.events) || !Array.isArray(data.rounds))
    throw new Error(t('这个文件不是母盘学习备份。请选在「历史」页导出的「母盘学习备份-日期.json」。'));
  const candidates = data.events.filter(e => e && typeof e === 'object' && typeof e.eventId === 'string' && e.eventId);
  const valid = new Set(Object.keys(migrate(null, candidates, catalog.tracks).events));   // 与正常记分同一套校验
  const events = candidates.filter(e => valid.has(e.eventId));
  const rounds = data.rounds.filter(r => r && typeof r === 'object' && typeof r.id === 'string' && r.id && ROUND_STATES.includes(r.state) && Array.isArray(r.entries));
  return {events, rounds, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '', skipped: data.events.length - events.length};
}
// 先算一遍：备份里有多少，合并进来会新增多少。
export async function previewImport(backup) {
  const [events, saved] = await Promise.all([store.readAll('events'), store.readAll('rounds')]);
  const haveEvents = new Set(events.map(e => e.eventId)), haveRounds = new Set(saved.map(r => r.id));
  const fresh = backup.rounds.filter(r => !haveRounds.has(r.id));
  return {
    rounds: backup.rounds.filter(playedRound).length, events: backup.events.length,
    newRounds: fresh.filter(playedRound).length, newActive: fresh.filter(r => r.state === 'active').length,
    newEvents: backup.events.filter(e => !haveEvents.has(e.eventId)).length
  };
}
export async function importBackup(backup) {
  const added = await store.importBackup(backup.events, backup.rounds);
  await refreshRecords(); emit('rounds');
  channel?.postMessage({kind: 'events'});
  return added;
}

// 一项的刻纹长度，0—1。每答对一次都往前刻一段；「稳定掌握」才刻满。
export function fieldCut(f) {
  if (!f || !f.n) return 0;
  const s = status(f), acc = f.c / f.n;
  if (s === '稳定掌握') return 1;
  if (s === '明显薄弱') return f.n < 4 ? acc * f.n / 4 * .5 : .12;
  if (s === '数据不足') return acc * (f.n / 4) * .5;
  return .5 + .38 * Math.max(0, Math.min(1, (acc - .6) / .4)) * Math.min(1, f.n / 8);
}
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000; };
function demoLanes(t, mode) {
  if (mode === 'blank') return [0, 0, 0, 0];
  if (mode === 'full') return [1, 1, 1, 1];
  const age = (1968 - t.year) / 114, base = hash(t.id) * .9 + age * .45;   // 早的讲次学得久一些
  return KEYS.map((k, i) => { const v = base + (hash(t.id + k) - .5) * .5 - (k === 'year' ? .18 : 0);
    return v > .95 ? 1 : v > .7 ? .8 : v > .5 ? .55 : v > .36 ? .28 : 0; });
}
export function lanesOf(id) {
  const t = byId.get(id);
  if (prefs.demo !== 'real') return demoLanes(t, prefs.demo);
  const r = memory.records[id];
  return KEYS.map(k => fieldCut(r?.fields?.[k]));
}
export const fieldStatus = (id, key) => prefs.demo === 'real' ? status(memory.records[id]?.fields?.[key]) : null;
export const hasRecord = id => !!memory.records[id];
export const avgCut = id => lanesOf(id).reduce((a, b) => a + b, 0) / 4;
export function stats() {
  let full = 0, some = 0;
  for (const g of rings) { const l = lanesOf(g.id); if (l.every(v => v >= 1)) full++; else if (l.some(v => v > 0)) some++; }
  return {full, some, blank: rings.length - full - some, source: prefs.demo === 'real' ? source : 'demo'};
}

const listeners = new Set();
export const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = what => { for (const fn of listeners) fn(what); };
export function setDemo(mode) { prefs.demo = mode; savePrefs(); emit('lanes'); }

// 预览刻纹只操作副本，只有事务提交成功后才更新真实记忆。
export function previewAnswer(entry) {
  const before = KEYS.map(k => fieldCut(memory.records[entry.id]?.fields?.[k]));
  const copy = migrate(memory, [], catalog.tracks);
  if (!record(copy, entry, catalog.tracks, entry.eventId)) throw new Error(t('作答数据不完整，未保存。'));
  return {before, after: KEYS.map(k => fieldCut(copy.records[entry.id]?.fields?.[k]))};
}
