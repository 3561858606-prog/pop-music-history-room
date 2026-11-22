import * as M from '../js/model.js';
import {createTrain} from '../js/train.js';
const out=document.querySelector('#results'), fixture=document.querySelector('#fixture'), results=[];
const assert=(c,m)=>{if(!c)throw Error(m);};
const until=async fn=>{for(let i=0;i<100;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('等待超时');};
async function test(name,work){try{await work();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}out.textContent=results.join('\n');}
await M.ready; M.prefs.size=10;
let completed=null;
const ctx={reduced:()=>true,exit:()=>{},finish:r=>{completed=r;}};
let train=createTrain(fixture,ctx);
await test('填空输入、数字和空格保存为草稿',async()=>{
 await train.start([1],'written');
 const values=['My Song 1967','１９６７年','Artist Name','Swing'];
 fixture.querySelectorAll('[data-field]').forEach((input,i)=>{input.value=values[i];input.dispatchEvent(new Event('input',{bubbles:true}));});
 await train.flush();
 const r=M.roundById(train.id());assert(r.answers.song==='My Song 1967'&&r.answers.year==='１９６７年','输入未保存');
 assert(r.queueIds.length===3,'队列快照错误');
});
let saved;
await test('重新创建界面恢复题目、草稿和队列',async()=>{
 saved=M.roundById(train.id());saved=await train.discard();fixture.replaceChildren();train=createTrain(fixture,ctx);
 assert(train.restore(saved),'未恢复');
 assert(fixture.querySelector('[data-field=song]').value==='My Song 1967','草稿丢失');
 assert(M.roundById(train.id()).eventId===saved.eventId,'题目事件编号改变');
});
await test('波形定位不改答案，保存并恢复音频位置',async()=>{
 const wave=fixture.querySelector('.g-wave');
 wave.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));
 wave.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));
 await train.flush();const current=M.roundById(train.id());
 assert(current.audioTime>0&&current.answers.song==='My Song 1967'&&current.entries.length===0,'定位改变答案或未保存位置 '+JSON.stringify({time:current.audioTime,answers:current.answers,entries:current.entries.length,revision:current.revision,save:fixture.querySelector('.save-state').textContent}));
 const latest=await train.discard();fixture.replaceChildren();train=createTrain(fixture,ctx);assert(train.restore(latest),'未恢复');
 const pos=Math.floor(current.audioTime),label=Math.floor(pos/60)+':'+String(pos%60).padStart(2,'0');
 assert(fixture.querySelector('.g-time').textContent.startsWith(label),'音频位置未恢复');
});
await test('保存失败不揭示答案、不增加成绩，保留重试入口',async()=>{
 const actual=M.store.saveRound.bind(M.store);let reject=true;
 M.store.saveRound=(...args)=>reject&&args[1]?(reject=false,Promise.reject(new Error('模拟磁盘写入失败'))):actual(...args);
 fixture.querySelector('[data-act=submit]').click();
 await until(()=>fixture.querySelector('.save-state')?.dataset.error==='1');
 assert(fixture.dataset.phase==='answer','保存失败仍进入订正');assert(!M.hasRecord(saved.trackId),'保存失败仍增加成绩');
 assert(!fixture.querySelector('[data-act=retry-save]').hidden,'无重试入口');
 const field=fixture.querySelector('[data-field=song]');field.dispatchEvent(new Event('input',{bubbles:true}));await train.flush();
 assert(fixture.querySelector('.save-state').dataset.error==='1','后台草稿保存掩盖了提交失败');
 fixture.querySelector('[data-act=retry-save]').click();
 await until(()=>fixture.dataset.phase==='feedback');await train.flush();M.store.saveRound=actual;
 const count=(await M.store.readAll('events')).filter(e=>e.eventId===saved.eventId).length;
 assert(count===1,'重试重复计分');
});
await test('订正页恢复后下一题沿用剩余队列',async()=>{
 saved=M.roundById(train.id());const expected=saved.queueIds.at(-1);
 saved=await train.discard();fixture.replaceChildren();train=createTrain(fixture,ctx);assert(train.restore(saved),'未恢复订正页');
 assert(fixture.dataset.phase==='feedback','恢复阶段不正确');fixture.querySelector('[data-act=next]').click();await train.flush();
 assert(M.roundById(train.id()).trackId===expected,'重新抽题');
});
await test('同轮并发冲突保留本页草稿，再恢复另一页最新进度',async()=>{
 const current=M.roundById(train.id());
 await M.store.saveRound({...current,answers:{song:'另一页已保存'}});
 const input=fixture.querySelector('[data-field=song]');input.value='本页冲突草稿';input.dispatchEvent(new Event('input',{bubbles:true}));
 await until(()=>fixture.querySelector('.save-state')?.dataset.error==='1');
 fixture.querySelector('[data-act=retry-save]').click();
 await until(()=>fixture.querySelector('[data-field=song]')?.value==='另一页已保存');
 const backups=await M.store.readAll('meta');assert(backups.some(b=>b.snapshot?.answers.song==='本页冲突草稿'),'未保留冲突草稿');
});
await test('提前结束写历史，并保留题型和事件编号',async()=>{
 fixture.querySelector('[data-act=end]').click();await until(()=>completed);
 assert(completed.reason==='early'&&completed.entries.length===1&&completed.questionType==='written','轮次报告不完整');
 assert(completed.entries[0].eventId===saved.eventId,'事件编号丢失');
});
await test('选择题四列作答与一首正常完成',async()=>{
 completed=null;M.prefs.size='custom';M.prefs.custom=1;await train.start([1],'choice');
 for(const col of fixture.querySelectorAll('.col'))col.querySelector('[role=radio]').click();
 fixture.querySelector('[data-act=submit]').click();await until(()=>fixture.dataset.phase==='feedback');
 fixture.querySelector('[data-act=next]').click();await until(()=>completed);
 assert(completed.reason==='completed'&&completed.entries.length===1&&M.history().length===2,'完整轮次或历史丢失');
});
await test('年份卡片绑定 Y，Enter 不开关并保留填空输入',async()=>{
 await train.start([1],'written');
 const year=fixture.querySelector('[data-field=year]'), song=fixture.querySelector('[data-field=song]');
 const opener=fixture.querySelector('.tr-cards');
 const press=(target,key,extra={})=>target.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}));
 const opened=()=>opener.getAttribute('aria-expanded')==='true';
 year.focus();
 assert(!press(year,'y',{code:'KeyY'})&&opened(),'年份框里的 Y 没有打开卡片');
 const closer=document.querySelector('#yearSheet .ys-close');
 assert(!press(closer,'Enter')&&opened(),'关闭按钮上的 Enter 未被拦截');
 assert(!press(closer,'y',{code:'KeyY'})&&!opened()&&document.activeElement===year,'Y 没有关闭卡片或恢复焦点');
 assert(!press(opener,'Enter')&&!opened(),'打开按钮上的 Enter 未被拦截');
 song.focus();
 assert(press(song,'y',{code:'KeyY'})&&!opened(),'填空框吞掉了字母 y');
 assert(press(song,'y',{code:'KeyY',isComposing:true})&&!opened(),'组字期间误开卡片');
 assert(!press(song,'¥',{code:'KeyY',altKey:true})&&opened(),'填空时 Alt+Y 没有打开卡片');
 assert(!press(document.querySelector('#yearSheet .ys-close'),'Escape')&&!opened(),'Esc 未能关闭卡片');
});
await train.discard();const dbName=M.store.name;M.store.close();indexedDB.deleteDatabase(dbName);
fixture.replaceChildren();out.textContent+='\n'+(results.every(r=>r.startsWith('PASS'))?'ALL PASS':'FAILED');document.title=results.every(r=>r.startsWith('PASS'))?'PASS · v8 流程回归':'FAIL · v8 流程回归';
