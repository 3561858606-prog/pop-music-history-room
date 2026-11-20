import * as M from '../js/model.js';
import {emptyMemory, record, status} from '../../../v3/memory.js';
import {createAudio} from '../js/audio.js';
import {penalize} from '../js/net.js';
import {createTrain} from '../js/train.js';
const out = document.querySelector('#results'), results = [];
const assert = (ok, message) => { if (!ok) throw Error(message); };
async function test(name, run) { try { await run(); results.push('PASS ' + name); } catch (e) { results.push('FAIL ' + name + ': ' + e.message); } out.textContent = results.join('\n'); }
const stat = values => ({n: values.length, c: values.filter(Boolean).length, recent: values.slice(-8)});
await M.ready;
await test('薄弱年份连续答对，每次都增长，其他三项独立', () => {
  for (const track of M.tracks) for (const key of M.KEYS) {
    const memory = emptyMemory();
    for (let n = 0; n < 12; n++) record(memory, {id: track.id, time: String(n).padStart(3, '0'), fields: M.KEYS.map(k => ({key: k, correct: String(track[k]), isCorrect: k !== key}))}, M.tracks, 'seed-' + n);
    let before = M.KEYS.map(k => M.fieldCut(memory.records[track.id].fields[k]));
    for (let n = 0; n < 12; n++) {
      record(memory, {id: track.id, time: '100-' + String(n).padStart(2, '0'), fields: [{key, correct: String(track[key]), isCorrect: true}]}, M.tracks, 'right-' + n);
      const after = M.KEYS.map(k => M.fieldCut(memory.records[track.id].fields[k]));
      assert(after[M.KEYS.indexOf(key)] > before[M.KEYS.indexOf(key)], track.id + '/' + key + ' 答对却没有增长');
      M.KEYS.forEach((k, i) => { if (k !== key) assert(after[i] === before[i], '其他项被误改'); });
      before = after;
    }
  }
});
await test('全部短历史的正确答案不会降低或卡住进度，满格除外', () => {
  for (let n = 0; n <= 12; n++) for (let mask = 0; mask < 2 ** n; mask++) {
    const values = Array.from({length: n}, (_, i) => !!(mask & 2 ** i));
    const before = M.fieldCut(stat(values)), after = M.fieldCut(stat([...values, true]));
    assert(after >= before && (before === 1 || after > before), JSON.stringify(values) + ': ' + before + ' -> ' + after);
    assert(after >= 0 && after <= 1, '进度越界');
  }
  assert(M.fieldCut(stat(Array(8).fill(true))) === 1 && status(stat(Array(8).fill(true))) === '稳定掌握', '掌握标准改变');
});
await test('真实保存、刷新和幂等重放均保留年份增长', async () => {
  const track = M.byId.get('t75'), now = Date.now();
  const entries = Array.from({length: 8}, (_, i) => ({eventId: 'weak-' + i, id: track.id, time: new Date(now + i).toISOString(), fields: M.KEYS.map(key => ({key, correct: String(track[key]), isCorrect: key !== 'year'}))}));
  await M.store.importLegacy(entries, [], {}); await M.refreshRecords();
  const before = M.lanesOf(track.id), entry = {eventId: 'year-correct', id: track.id, time: new Date(now + 100).toISOString(), fields: M.KEYS.map(key => ({key, correct: String(track[key]), isCorrect: true}))};
  const preview = M.previewAnswer(entry);
  assert(preview.after[1] > before[1] && M.lanesOf(track.id)[1] === before[1], '预览改写真实记录或未增长');
  await M.store.importLegacy([entry], [], {}); await M.refreshRecords();
  assert(M.lanesOf(track.id)[1] === preview.after[1], '保存后与预览不一致');
  await M.refreshRecords(); const saved = M.lanesOf(track.id);
  await M.store.importLegacy([entry], [], {}); await M.refreshRecords();
  assert(JSON.stringify(M.lanesOf(track.id)) === JSON.stringify(saved), '刷新丢失或重复计分');
});

await test('实际填空提交后，年份勾对、条增长，恢复反馈仍一致', async () => {
  const root = document.querySelector('#fixture'), ctx = {reduced: () => true, exit() {}, finish() {}};
  let train = createTrain(root, ctx); M.prefs.size = 'custom'; M.prefs.custom = 1;
  await train.start([7], 'written');
  const saved = M.roundById(train.id()), track = M.byId.get(saved.trackId), now = Date.now();
  await M.store.importLegacy(Array.from({length: 8}, (_, i) => ({eventId: 'ui-weak-' + i, id: track.id, time: new Date(now + i).toISOString(), fields: M.KEYS.map(key => ({key, correct: String(track[key]), isCorrect: key !== 'year'}))})), [], {});
  await M.refreshRecords(); const before = M.lanesOf(track.id)[1];
  for (const input of root.querySelectorAll('[data-field]')) {
    const key = input.dataset.field; input.value = key === 'style' ? M.styleOf(track).label : String(track[key]); input.dispatchEvent(new Event('input', {bubbles: true}));
  }
  await train.flush(); root.querySelector('[data-act=submit]').click();
  for (let i = 0; i < 100 && root.dataset.phase !== 'feedback'; i++) await new Promise(r => setTimeout(r, 20));
  assert(root.dataset.phase === 'feedback', '未显示反馈');
  assert(root.querySelectorAll('.fb-rows [data-ok="1"]').length === 4, '没有四项判对');
  const bar = root.querySelectorAll('.fb-lanes .lane-bar')[1];
  assert(+bar.dataset.to > before && +bar.dataset.to === M.lanesOf(track.id)[1], '反馈年份条未增长或与记录不一致');
  const snapshot = await train.discard(); root.replaceChildren(); train = createTrain(root, ctx);
  assert(train.restore(snapshot), '反馈恢复失败');
  assert(+root.querySelectorAll('.fb-lanes .lane-bar')[1].dataset.to === M.lanesOf(track.id)[1], '恢复后显示改变');
  await train.discard(); root.replaceChildren();
});

const OriginalAudio = globalThis.Audio, originalTimeout = globalThis.setTimeout, originalClear = globalThis.clearTimeout;
let timers = new Map(), serial = 0;
class FakeAudio extends EventTarget {
  constructor() { super(); this.paused = true; this.currentTime = 0; this.duration = 100; this.readyState = 1; this._src = ''; this.muted = false; }
  set src(value) { this._src = value; this.dispatchEvent(new Event('loadstart')); }
  get src() { return this._src; } get currentSrc() { return this._src; }
  async play() { this.paused = false; this.dispatchEvent(new Event('playing')); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  load() { this.dispatchEvent(new Event('loadedmetadata')); }
}
globalThis.Audio = FakeAudio;
globalThis.setTimeout = (fn, ms) => { const id = ++serial; timers.set(id, {fn, ms}); return id; };
globalThis.clearTimeout = id => timers.delete(id);
try {
  await test('流畅档载入失败后原档恢复，不反复请求坏档位', async () => {
    // 运行其他播放用例后浏览器可能已有高速估值；本例主动模拟慢网。
    const key = 'v8-proto-net', saved = localStorage.getItem(key);
    penalize(32);
    if (saved === null) localStorage.removeItem(key);
    else localStorage.setItem(key, saved);
    const p = createAudio(), track = M.byId.get('t75'); timers.clear(); p.load(track); await p.play();
    assert(p.element.src.includes('/audio-sd/'), '冷启动未使用流畅档');
    p.element.dispatchEvent(new Event('error')); await Promise.resolve();
    assert(p.element.src === M.audioFallbackSrc(track), '没有退回原档');
    await new Promise(resolve => originalTimeout(resolve, 1100));
    p.element.dispatchEvent(new Event('waiting'));
    for (const {fn, ms} of [...timers.values()]) if (ms === 1500 || ms === 5000) fn();
    assert(p.element.src === M.audioFallbackSrc(track), '重新请求已失败的流畅档'); p.stop();
  });
  await test('换源时保留尚未完成的最新定位目标', async () => {
    const p = createAudio(); timers.clear(); p.load(M.byId.get('t75')); await p.play();
    p.element.currentTime = 10; p.element.readyState = 0; p.seekTo(60, 100);
    p.element.dispatchEvent(new Event('error'));
    assert(p.position() === 60, '换源退回旧播放位置：' + p.position()); p.stop();
  });
} finally { globalThis.Audio = OriginalAudio; globalThis.setTimeout = originalTimeout; globalThis.clearTimeout = originalClear; }
const name = M.store.name; M.store.close(); indexedDB.deleteDatabase(name);
out.textContent += '\n' + (results.every(s => s.startsWith('PASS')) ? 'ALL PASS' : 'FAILED');
