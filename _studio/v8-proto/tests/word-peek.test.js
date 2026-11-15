import * as M from '../js/model.js';
import {createTrain} from '../js/train.js';
import {wordAnswerHTML,createWordPeek} from '../js/word-peek.js';
const root=document.querySelector('#fixture'),out=document.querySelector('#results'),results=[];
const assert=(x,m)=>{if(!x)throw Error(m);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<150;i++){if(fn())return;await sleep(20);}throw Error('等待超时');}
async function test(name,fn){try{await fn();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}out.textContent=results.join('\n');}
await test('英文按词遮挡，标点和特殊字符安全显示',()=>{
 const host=document.createElement('div');host.innerHTML=wordAnswerHTML('Maple Leaf Rag <&> Don’t');
 assert(host.querySelectorAll('button').length===4,'未按词拆分');assert(host.textContent==='Maple Leaf Rag <&> Don’t','文字或标点改变');
 assert(!host.querySelector('script,img'),'HTML 未转义');
 host.innerHTML=wordAnswerHTML('大众音乐史');assert(host.querySelectorAll('button').length>1,'中文整句揭示');
});
await M.ready;M.prefs.size=10;
let train=createTrain(root,{reduced:()=>true,exit:()=>{},finish:()=>{}}),snapshot,row,words,input;
await train.start([1],'written');
root.querySelectorAll('[data-unknown]').forEach(b=>b.click());root.querySelector('[data-act=submit]').click();
await until(()=>root.dataset.phase==='feedback');await train.flush();
row=[...root.querySelectorAll('.fb-rows li[data-ok="0"]')].find(r=>r.querySelectorAll('.peek-word').length>1);
words=[...row.querySelectorAll('.peek-word')];input=row.querySelector('input');
const type=value=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};
await test('输入后逐词遮挡，提示按钮不暴露未揭示答案',()=>{
 input.focus();type('M');assert(row.classList.contains('typing'),'未遮挡');
 assert(words.every(w=>w.getAttribute('aria-label').startsWith('短暂查看')),'隐藏词标签泄漏答案');
 assert(words.every(w=>getComputedStyle(w).color==='rgba(0, 0, 0, 0)'),'隐藏词仍可见');
 snapshot=JSON.stringify(M.roundById(train.id()));
});
await test('点另一个词立即关闭上一个，提示不改草稿、次数或成绩',()=>{
 const ev=new PointerEvent('pointerdown',{bubbles:true,cancelable:true});words[0].dispatchEvent(ev);assert(ev.defaultPrevented,'点击会抢走输入焦点');
 words[0].click();assert(words[0].classList.contains('peeked'),'第一个词没显示');
 words[1].click();assert(!words[0].classList.contains('peeked')&&words[1].classList.contains('peeked'),'同时显示多个词');
 assert(root.querySelectorAll('.peeked').length===1,'超过一个提示');assert(document.activeElement===input&&input.value==='M','订正输入被改变');
 assert(JSON.stringify(M.roundById(train.id()))===snapshot,'提示改变学习数据');
});
await test('1.2 秒自动遮回；继续输入立即遮回',async()=>{
 await sleep(1300);assert(!root.querySelector('.peeked'),'到时没遮回');
 words[0].click();type('Ma');assert(!root.querySelector('.peeked'),'继续输入未遮回');
});
await test('跨行仍只显示一个；键盘空格不会切换音频或跳题',()=>{
 words[0].click();const other=[...root.querySelectorAll('input[data-fix]')].find(i=>i!==input);other.value='x';other.dispatchEvent(new Event('input',{bubbles:true}));
 words[0].click();const b=other.closest('li').querySelector('.peek-word');b.click();assert(!words[0].classList.contains('peeked')&&root.querySelectorAll('.peeked').length===1,'跨行没有互斥');
 const before=root.querySelector('.g-play').textContent;
 const key=new KeyboardEvent('keydown',{key:' ',bubbles:true,cancelable:true});words[1].dispatchEvent(key);
 assert(key.defaultPrevented&&words[1].classList.contains('peeked'),'键盘无法提示');assert(root.querySelector('.g-play').textContent===before&&root.dataset.phase==='feedback','空格触发了播放或跳题');
 words[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert(!root.querySelector('.peeked'),'Escape没关闭');
});
await test('暂停与重新渲染清掉提示，订正核对仍能正确保存',async()=>{
 words[0].click();train.pause();assert(!root.querySelector('.peeked'),'暂停后残留提示');
 words[0].click();train.resume();assert(!root.querySelector('.peeked'),'重绘后残留提示');
 row=[...root.querySelectorAll('.fb-rows li[data-ok="0"]')].find(r=>r.querySelectorAll('.peek-word').length>1);input=row.querySelector('input');words=[...row.querySelectorAll('.peek-word')];
 type(row.querySelector('.ans').textContent);input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await train.flush();
 assert(row.dataset.fix==='done','正确答案未通过核对');const r=M.roundById(train.id());assert(r.entries[0].fix[row.dataset.key].tries===1,'提示计入订正次数');assert(r.entries[0].fields.every(f=>!f.isCorrect),'订正改变原始分数');
});
await train.discard();M.store.close();indexedDB.deleteDatabase(M.store.name);
// 保留独立的示意界面用于鼠标/键盘检查，不写入学习记录。
root.innerHTML=`<div class="tr"><div class="tr-paper"><h2>逐词提示</h2><p class="fix-rule">开始输入后遮住答案。点一个词的位置，显示 1.2 秒；同一时间只显示一个词。</p><ul class="fb-rows"><li data-ok="0" data-key="song" class="typing"><span class="k">歌名</span><span class="was"><s>没听出</s></span><span class="is pen"><span class="ans">${wordAnswerHTML('Maple Leaf Rag')}</span></span><div class="fix"><input aria-label="订正歌名" value="M" autocomplete="off"></div></li></ul></div></div>`;
const demo=createWordPeek(root);demo.sync();root.querySelector('input').addEventListener('input',e=>{e.target.closest('li').classList.toggle('typing',!!e.target.value.trim());demo.sync();});
out.textContent+='\n'+(results.every(x=>x.startsWith('PASS'))?'ALL PASS':'FAILED');document.title=results.every(x=>x.startsWith('PASS'))?'PASS · 逐词提示':'FAIL · 逐词提示';
