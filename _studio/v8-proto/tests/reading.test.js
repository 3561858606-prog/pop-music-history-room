import * as M from '../js/model.js';
import {gradeWritten} from '../js/names.js';
import {nameHTML, optionAliasesHTML, storyHTML} from '../js/reading.js';
import {createTrain} from '../js/train.js';
const out=document.querySelector('#results'),fixture=document.querySelector('#fixture'),results=[];
const assert=(value,message)=>{if(!value)throw Error(message);};
async function test(name,work){try{await work();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}out.textContent=results.join('\n');}
const key=(target,key,options={})=>{const e=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options});target.dispatchEvent(e);return e;};
const set=(field,value)=>{const input=fixture.querySelector(`[data-field=${field}]`);input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));return input;};
await M.ready;
await test('75 首显示的每个别写都能通过相同字段的填空判定',()=>{
 let count=0;
 for(const t of M.tracks)for(const field of ['song','artist','style'])for(const name of M.aliasesOf(t,field)){
  const result=gradeWritten(t,{song:t.song,year:String(t.year),artist:t.artist,style:M.styleOf(t).label,[field]:name},M.catalog.styles,M.tracks);
  assert(result.score===4,`${t.id}/${field}/${name} 显示却不接受`);count++;
 }
 assert(count>300,'别名覆盖不足');
});
await test('音乐家别名不会混进歌名，通行题名可用且不接受近似错字',()=>{
 const t=M.byId.get('t27');assert(!M.aliasesOf(t,'song').some(v=>/Prado/.test(v)),'歌名混入歌手');
 const korean=M.byId.get('t18'),base={song:'황성옛터',year:'1932',artist:korean.artist,style:M.styleOf(korean).label};
 assert(gradeWritten(korean,base,M.catalog.styles,M.tracks).score===4,'通行题名不接受');
 assert(!gradeWritten(korean,{...base,song:'황성옛터xyz'},M.catalog.styles,M.tracks).fields[0].isCorrect,'错误地模糊判对');
});
await test('选择题别写属于各自选项，不读取当前答案；显示文字正确转义',()=>{
 const t=M.byId.get('t58'),html=optionAliasesHTML('song',{value:t.song,label:t.song});
 assert(html.includes('昨日')&&!html.includes('披头士'),'选项混入其它字段');
 assert(nameHTML({...t,song:'<script>'},'song').includes('&lt;script&gt;'),'名称没有转义');
});
let train=createTrain(fixture,{reduced:()=>true,exit:()=>{},finish:()=>{}});
await train.start([1],'written');
await test('填空输入框左右切换、首尾循环；Shift 选字与输入法保留原行为',()=>{
 const song=fixture.querySelector('[data-field=song]');song.focus();key(song,'ArrowRight');assert(document.activeElement.dataset.field==='year','右键未换项');
 key(document.activeElement,'ArrowLeft');assert(document.activeElement.dataset.field==='song','左键未换项');
 key(document.activeElement,'ArrowLeft');assert(document.activeElement.dataset.field==='style','未首尾循环');
 const style=document.activeElement;
 assert(!key(style,'ArrowLeft',{shiftKey:true}).defaultPrevented&&document.activeElement===style,'Shift 选字被截获');
 assert(!key(style,'ArrowRight',{isComposing:true}).defaultPrevented&&document.activeElement===style,'输入法候选被截获');
 const wave=fixture.querySelector('.g-wave');wave.focus();key(wave,'ArrowRight');assert(document.activeElement.dataset.field==='song','波形抢占左右键，未切换答题项');
 assert(!fixture.querySelector('.wave-hint').textContent.includes('前后 5 秒'),'仍显示矛盾的波形提示');
});
await test('空白项 0 标记没听出并前进，年份中的 0 与文字不被截获',async()=>{
 const song=fixture.querySelector('[data-field=song]');song.focus();assert(key(song,'0',{code:'Digit0'}).defaultPrevented,'未消费快捷键');
 await train.flush();let saved=M.roundById(train.id());
 assert(saved.answers.song==='__not_heard__'&&document.activeElement.dataset.field==='year','未保存未知或前进');
 const year=set('year','2');year.focus();assert(!key(year,'0',{code:'Digit0'}).defaultPrevented,'年份 2000 的 0 被消费');set('year','2000');
 const artist=set('artist','Artist 20');artist.focus();assert(!key(artist,'0',{code:'Digit0'}).defaultPrevented,'已有文本的 0 被消费');
 await train.flush();saved=M.roundById(train.id());assert(saved.answers.year==='2000','年份丢失');
});
await test('未知项可用方向键进入、按钮恢复原草稿，断点恢复保留作答',async()=>{
 const artist=fixture.querySelector('[data-field=artist]');artist.focus();key(artist,'ArrowLeft');key(document.activeElement,'ArrowLeft');
 assert(document.activeElement.dataset.unknown==='song','未知项不能选中');
 fixture.querySelector('[data-unknown=song]').click();assert(document.activeElement.dataset.field==='song','未恢复填写焦点');set('song','draft saved');
 fixture.querySelector('[data-unknown=song]').click();fixture.querySelector('[data-unknown=song]').click();assert(fixture.querySelector('[data-field=song]').value==='draft saved','原草稿丢失');
 const saved=await train.discard();fixture.replaceChildren();train=createTrain(fixture,{reduced:()=>true,exit:()=>{},finish:()=>{}});assert(train.restore(saved),'恢复失败');
 assert(fixture.querySelector('[data-field=year]').value==='2000'&&fixture.querySelector('[data-field=song]').value==='draft saved','恢复丢草稿');
 assert(!fixture.querySelector('.name-aliases,.reading-story'),'未提交填空泄漏答案故事');
});
await test('选择题长别写随内容展开，不覆盖相邻选项',async()=>{
 await train.discard();fixture.replaceChildren();train=createTrain(fixture,{reduced:()=>true,exit:()=>{},finish:()=>{}});await train.start([4],'choice');
 for(const col of fixture.querySelectorAll('.col')){
  const buttons=[...col.querySelectorAll('[role=radio]')];
  for(const [i,b] of buttons.entries()){
   assert(b.scrollHeight<=b.clientHeight+2,'别写超出选项 '+col.dataset.key);
   if(i+1<buttons.length)assert(b.getBoundingClientRect().bottom<=buttons[i+1].getBoundingClientRect().top+1,'相邻选项互相覆盖');
  }
 }
});
await test('75 首故事包含背景、传播、影响及出处链接，未知录音不编造年份',()=>{
 for(const t of M.tracks){
  const s=M.storyOf(t);assert(s?.lead&&s.sections?.length>=3,`${t.id} 故事未扩写`);
  assert(s.sections.every(p=>p.title&&p.text.length>=90),`${t.id} 故事内容不足`);
  assert(s.sources?.length&&s.sources.every(s=>/^https:\/\//.test(s.url)),`${t.id} 缺少来源`);
  const el=document.createElement('div');el.innerHTML=storyHTML(s);assert(el.querySelector('details')&&!el.querySelector('details').open,'故事长读默认展开干扰听辨');
 }
 for(const id of ['t50','t51','t52'])assert(/1899/.test(M.storyOf(M.byId.get(id)).note||''),'混淆作品与录音年份 '+id);
});
await train.discard();const dbName=M.store.name;M.store.close();indexedDB.deleteDatabase(dbName);fixture.replaceChildren();
out.textContent+='\n'+(results.every(x=>x.startsWith('PASS'))?'ALL PASS':'FAILED');document.title=results.every(x=>x.startsWith('PASS'))?'PASS · 名称键盘故事':'FAIL · 名称键盘故事';
