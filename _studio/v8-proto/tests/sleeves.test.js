import * as M from '../js/model.js';
import {initExplore} from '../js/explore.js';
import {sleeveLayout} from '../js/sleeve-layout.js';
const out=document.querySelector('#checks'),results=[];
const assert=(value,message)=>{if(!value)throw Error(message);};
const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('等待超时');};
async function test(name,work){try{await work();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}out.textContent=results.join('\n');}
await M.ready;
M.prefs.flat=new URLSearchParams(location.search).has('flat');
const api=await initExplore({reduced:()=>true,startRound:()=>{},resumeRound:()=>{}});
const overlap=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
await test('1967 六首在桌面和窄屏布局均不重叠',()=>{
 for(const [width,height,pf] of [[320,560,0],[375,560,0],[640,560,0],[1024,720,.36],[1280,720,420/1280],[1440,900,420/1440]]){
  const slots=sleeveLayout(M.yearTracks(1967).map(t=>({id:t.id,ratio:1})),width,height,pf);
  assert(slots.length===6,'漏曲目');
  for(const [i,a] of slots.entries()){
   assert(a.x>=0&&a.x+a.width<=width*(1-pf)&&a.y>=0&&a.y+a.height<=height,'越界 '+width);
   assert(a.width>=80&&a.height>=44,'目标太小');for(const b of slots.slice(i+1))assert(!overlap(a,b),'重叠 '+width);
  }
 }
});
await test('真实页面六张封套及点选区域互不遮挡',async()=>{
 api.focusSong('t60');await until(()=>document.querySelectorAll('[data-cover]').length===6&&document.querySelector('[data-cover]').getBoundingClientRect().width>50);
 const boxes=[...document.querySelectorAll('[data-cover]')].map(b=>b.getBoundingClientRect());
 for(const [i,a] of boxes.entries())for(const b of boxes.slice(i+1))assert(!overlap(a,b),'页面目标重叠');
});
await test('六张封套逐张可选，切换时不放大覆盖邻居',()=>{
 const list=[...document.querySelectorAll('[data-cover]')],widths=list.map(b=>b.getBoundingClientRect().width);
 for(const [i,b] of list.entries()){
  b.click();const t=M.byId.get(b.dataset.cover);
  assert(b.getAttribute('aria-pressed')==='true'&&document.querySelector('.song h2 .name-main').textContent===M.titleOf(t),'选错歌曲 '+t.id);
  assert(b.getBoundingClientRect().width===widths[i],'选中后改变尺寸');
 }
});
await test('封套支持键盘首尾切换，年份切换重建正确组',()=>{
 const first=document.querySelector('[data-cover]');first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));
 assert(document.querySelector('[data-cover=t76]').getAttribute('aria-pressed')==='true','End 未选末首');
 document.querySelector('[data-cover=t76]').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));
 assert(document.querySelector('[data-cover=t60]').getAttribute('aria-pressed')==='true','Home 未回首首');
 document.querySelector('[data-year="1966"]').click();assert(document.querySelectorAll('[data-cover]').length===4,'1966 年分组错误');
 api.focusSong('t50');assert(document.querySelectorAll('[data-cover]').length===3,'同名三版本未分开');api.focusSong('t60');
});
await test('75 首图像均在本地可加载，新增配图有出处与关系说明',async()=>{
 let i=0;await Promise.all(Array.from({length:5},async()=>{while(i<M.tracks.length){const t=M.tracks[i++],c=M.coverOf(t);assert(c?.url&&c.source,'缺少配图或出处 '+t.id);await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>image.naturalWidth>0?resolve():reject(Error(t.id));image.onerror=()=>reject(Error('图片加载失败 '+t.id));image.src=c.url;});}}));
 const special=M.coverOf(M.byId.get('t52'));assert(special.match==='context'&&M.coverLabel(special).includes('资料'),'未知录音被标成专辑');
 const leaflet=M.coverOf(M.byId.get('t21'));assert(leaflet.kind==='leaflet'&&M.coverLabel(leaflet).includes('非本曲封套'),'同盘A面附页被标成本曲封面');
});
await test('原型按钮已移除，历史和学习备份入口保留',()=>{
 assert(!document.querySelector('#protoBtn,#protoBox'),'原型菜单仍存在');assert(document.querySelector('a[href="#history"]'),'历史入口丢失');
});
out.textContent+='\n'+(results.every(x=>x.startsWith('PASS'))?'ALL PASS':'FAILED');document.title=results.every(x=>x.startsWith('PASS'))?'PASS · 封套与配图回归':'FAIL · 封套与配图回归';
const dbName=M.store.name;M.store.close();indexedDB.deleteDatabase(dbName);
