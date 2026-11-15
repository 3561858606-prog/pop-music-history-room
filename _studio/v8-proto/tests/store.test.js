import {LearningStore, uid} from '../js/store.js';
import {gradeWritten} from '../../../v3/written.js';
import {catalog} from '../../../v3/catalog.js';
const output = document.querySelector('#results'), results = [];
const assert = (condition, text) => { if (!condition) throw Error(text); };
const name = uid('v8-proto-test'), a = await new LearningStore(name).open(), b = await new LearningStore(name).open();
const event = id => ({eventId:id, id:'t01', time:'2026-11-10T00:00:00Z',fields:[{key:'year',chosen:'1854',correct:'1854',isCorrect:true}]});
const round = id => ({id,revision:0,state:'active',entries:[],answers:{song:'a draft'},trackId:'t01',options:{song:['fixed']},queueIds:['t02','t03'],questionType:'written'});
async function test(title, work) { try { await work(); results.push('PASS ' + title); } catch(e) { results.push('FAIL ' + title + ': ' + e.message); } output.textContent = results.join('\n'); }
await test('旧事件合并、幂等导入、原始备份', async () => {
  await a.importLegacy([event('old')],[],{old:'raw backup'}); await b.importLegacy([event('old'),event('second')]);
  assert((await a.readAll('events')).length===2,'重复导入被计数'); assert((await a.readAll('meta'))[0].value==='raw backup','原始备份缺失');
});
await test('双连接同时作答，分别保留答案和轮次', async () => {
  await Promise.all([a.saveRound(round('round-a'),event('a')),b.saveRound(round('round-b'),event('b'))]);
  const events = await a.readAll('events'); assert(['old','second','a','b'].every(id=>events.some(e=>e.eventId===id)),'丢失答案');
});
await test('轮次快照保留题目、队列、填空草稿', async () => {
  const saved=(await a.readAll('rounds')).find(r=>r.id==='round-a');
  assert(saved.answers.song==='a draft'&&saved.queueIds.join() === 't02,t03'&&saved.options.song[0]==='fixed','快照不完整');
});
await test('同轮旧版本冲突不会覆盖新进度', async () => {
  let failed=false;try {await b.saveRound({...round('round-a'),answers:{song:'stale'}},event('stale'));} catch(e){failed=e.name==='ConflictError';}
  assert(failed,'未拒绝冲突');assert(!(await a.readAll('events')).some(e=>e.eventId==='stale'),'冲突答案仍然写入');
});
await test('写入事务中断：答案和轮次同时回滚', async () => {
  try {await a.transaction(['rounds','events'],(tx,done,fail)=>{tx.objectStore('events').put(event('aborted'));tx.objectStore('rounds').put(round('aborted'));fail(Error('quota injection'));});} catch {}
  assert(!(await a.readAll('events')).some(e=>e.eventId==='aborted'),'未回滚答案');assert(!(await a.readAll('rounds')).some(e=>e.id==='aborted'),'未回滚轮次');
});
await test('事务失败后可以重试，不重复计分', async () => {
  const saved=await a.saveRound(round('retry'),event('retry'));await a.saveRound(saved,event('retry'));
  assert((await a.readAll('events')).filter(e=>e.eventId==='retry').length===1,'重试产生重复事件');
});
await test('结束一轮后仍保留历史与完整事件编号', async () => {
  let saved=await a.saveRound(round('history'),event('history'));
  await a.saveRound({...saved,state:'finished',reason:'early',entries:[event('history')]});
  const report=(await a.readAll('rounds')).find(r=>r.id==='history');assert(report.state==='finished'&&report.entries[0].eventId==='history','历史不完整');
});
await test('填空判定：全角年份、名称标点、别名、不知道', async () => {
  const t=catalog.tracks.find(t=>t.id==='t01'), style=catalog.styles.find(s=>s.id===t.style);
  const correct={song:t.song.toUpperCase(),year:String(t.year).replace(/\d/g,d=>String.fromCharCode(0xff10+Number(d)))+'年',artist:t.artist,style:style.label};
  assert(gradeWritten(t,correct,catalog.styles,catalog.tracks).score===4,'填空正确写法未识别');
  const miss=gradeWritten(t,{...correct,year:'1999',song:'__not_heard__'},catalog.styles,catalog.tracks);
  assert(miss.score===2&&miss.fields[0].isUnknown,'错答或不知道处理错误');
});
a.close();b.close();indexedDB.deleteDatabase(name);
output.textContent += '\n' + (results.every(x=>x.startsWith('PASS'))?'ALL PASS':'FAILED');
document.title = results.every(x=>x.startsWith('PASS'))?'PASS · v8 隔离回归':'FAIL · v8 隔离回归';
