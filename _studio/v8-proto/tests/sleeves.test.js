import * as M from '../js/model.js';
import {initExplore} from '../js/explore.js';
import {sleeveLayout} from '../js/sleeve-layout.js';
const out=document.querySelector('#checks'),results=[];
const assert=(value,message)=>{if(!value)throw Error(message);};
const until=async fn=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('等待超时');};
async function test(name,work){try{await work();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}out.textContent=results.join('\n');}
await M.ready;

const api=await initExplore({reduced:()=>true,startRound:()=>{},resumeRound:()=>{}});
// 同年曲目按数据取：1967 年在加入第 8 讲后是 8 首（含 t81、t86）
const Y67=M.yearTracks(1967).map(t=>t.id), N67=Y67.length;
const overlap=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
await test(`1967 年 ${N67} 首在桌面和窄屏布局均不重叠`,()=>{
 assert(N67===8&&Y67.includes('t81')&&Y67.includes('t86'),'1967 年应为 8 首：'+Y67.join());
 for(const [width,height,pf] of [[320,560,0],[375,560,0],[640,560,0],[1024,720,.36],[1280,720,420/1280],[1440,900,420/1440]]){
  const slots=sleeveLayout(M.yearTracks(1967).map(t=>({id:t.id,ratio:1})),width,height,pf);
  assert(slots.length===N67,'漏曲目');
  for(const [i,a] of slots.entries()){
   assert(a.x>=0&&a.x+a.width<=width*(1-pf)&&a.y>=0&&a.y+a.height<=height,'越界 '+width);
   assert(a.width>=80&&a.height>=44,'目标太小');for(const b of slots.slice(i+1))assert(!overlap(a,b),'重叠 '+width);
  }
 }
});
await test(`真实页面 ${N67} 张封套及点选区域互不遮挡`,async()=>{
 api.focusSong(Y67[0]);await until(()=>document.querySelectorAll('[data-cover]').length===N67&&document.querySelector('[data-cover]').getBoundingClientRect().width>50);
 const boxes=[...document.querySelectorAll('[data-cover]')].map(b=>b.getBoundingClientRect());
 for(const [i,a] of boxes.entries())for(const b of boxes.slice(i+1))assert(!overlap(a,b),'页面目标重叠');
});
await test(`${N67} 张封套逐张可选，切换时不放大覆盖邻居`,()=>{
 const list=[...document.querySelectorAll('[data-cover]')],widths=list.map(b=>b.getBoundingClientRect().width);
 for(const [i,b] of list.entries()){
  b.click();const t=M.byId.get(b.dataset.cover);
  assert(b.getAttribute('aria-pressed')==='true'&&document.querySelector('.song h2 .name-main').textContent===M.titleOf(t),'选错歌曲 '+t.id);
  assert(b.getBoundingClientRect().width===widths[i],'选中后改变尺寸');
 }
});
await test('封套支持键盘首尾切换，年份切换重建正确组',()=>{
 const first=document.querySelector('[data-cover]');first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));
 const lastId=Y67.at(-1),firstId=Y67[0];
 assert(document.querySelector(`[data-cover=${lastId}]`).getAttribute('aria-pressed')==='true','End 未选末首 '+lastId);
 document.querySelector(`[data-cover=${lastId}]`).dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));
 assert(document.querySelector(`[data-cover=${firstId}]`).getAttribute('aria-pressed')==='true','Home 未回首首 '+firstId);
 document.querySelector('[data-year="1966"]').click();assert(document.querySelectorAll('[data-cover]').length===4,'1966 年分组错误');
 api.focusSong('t50');assert(document.querySelectorAll('[data-cover]').length===3,'同名三版本未分开');api.focusSong(Y67[0]);
});
await test(`${M.tracks.length} 首都有配图和出处，轻量图与原图均可加载`,async()=>{
 let i=0;
 await Promise.all(Array.from({length:5},async()=>{
  while(i<M.tracks.length){
   const t=M.tracks[i++],c=M.coverOf(t);
   assert(c?.url&&c.full&&(c.source||c.imageSource),'缺少配图或出处 '+t.id);
   for(const url of [c.url,c.full]){
    const image=new Image();image.src=url;
    await image.decode().catch(()=>{throw Error('图片加载失败 '+t.id+' '+url);});
   }
  }
 }));
 const demonstrations=['t50','t51','t52'].map(id=>M.coverOf(M.byId.get(id)));
 assert(new Set(demonstrations.map(c=>c.url)).size===3,'课件演示应各有独立配图');
 for(const cover of demonstrations){
  assert(cover.relation==='course-video-frame'&&M.coverLabel(cover).includes('资料'),'课件演示应标为资料');
 }
 for(const id of ['t56','t73']){
  assert(M.coverLabel(M.coverOf(M.byId.get(id)))==='影像发行封套','现场应标注影像发行 '+id);
 }
 const leaflet=M.coverOf(M.byId.get('t21'));assert(leaflet.kind==='leaflet'&&M.coverLabel(leaflet).includes('非本曲封套'),'同盘A面附页被标成本曲封面');
});
await test('1970 年代带容纳第 9 讲，同年两张封套可切换',async()=>{
 const t80=M.ringOf.get('t80'),band=M.bands[t80.band];
 const y1970=M.yearTracks(1970).map(t=>t.id);
 assert(band.decade===1970&&band.ids.length===12,'1970 带应有 12 首');
 assert(y1970.length===2&&y1970.includes('t80')&&y1970.includes('t98'),'1970 年分组不正确');
 assert(M.bands.at(-1)===band,'1970 带应是最内一圈');
 api.focusSong('t80');await until(()=>document.querySelectorAll('[data-cover]').length===y1970.length);
 assert(document.querySelector('[data-cover=t80]').getAttribute('aria-pressed')==='true','t80 未选中');
 assert(document.querySelector('.p-band b').textContent.trim()==='1970s','面板年代标题不对');
 assert(document.querySelector('.song-spoke').textContent.includes('0'),'t80 应在 0 号辐');
 document.querySelector('[data-cover=t98]').click();
 assert(document.querySelector('[data-cover=t98]').getAttribute('aria-pressed')==='true','第 9 讲 t98 未选中');
});
await test('t89 显示韩明淑的唱片封套，仍可选中',async()=>{
 api.focusSong('t89');await until(()=>document.querySelector('[data-cover=t89]'));
 const b=document.querySelector('[data-cover=t89]');
 const image=b.querySelector('img');
 assert(image&&M.coverOf(M.byId.get('t89')).catalog==='VL-11','t89 应加载 Venus VL-11 封套');
 await image.decode();
 assert(b.getAttribute('aria-pressed')==='true','t89 未选中');api.focusSong(Y67[0]);
});
await test('同曲异版使用与课程相符的发行封套',()=>{
 assert(M.coverOf(M.byId.get('t11')).album==='A Symposium of Swing','t11 应使用 1937 年 Victor 录音封套');
 assert(M.coverOf(M.byId.get('t79')).album==='Wednesday Morning, 3 A.M.','t79 应使用原声版专辑');
});
await test('原型按钮已移除，历史和学习备份入口保留',()=>{
 assert(!document.querySelector('#protoBtn,#protoBox'),'原型菜单仍存在');assert(document.querySelector('a[href="#history"]'),'历史入口丢失');
});
out.textContent+='\n'+(results.every(x=>x.startsWith('PASS'))?'ALL PASS':'FAILED');document.title=results.every(x=>x.startsWith('PASS'))?'PASS · 封套与配图回归':'FAIL · 封套与配图回归';
const dbName=M.store.name;M.store.close();indexedDB.deleteDatabase(dbName);
