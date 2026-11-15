import {loadWaveform,envelopeAt,timeAtX,createWaveform} from '../js/waveform.js';
import {createAudio} from '../js/audio.js';
import * as M from '../js/model.js';
const results=[],out=document.querySelector('#results'),canvas=document.querySelector('#wave'),selector=document.querySelector('#track');
const assert=(v,m)=>{if(!v)throw Error(m);};
async function test(name,work){try{await work();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}out.textContent=results.join('\n');}
const until=async fn=>{for(let i=0;i<750;i++){if(fn())return;await new Promise(r=>setTimeout(r,40));}throw Error('等待超时');};
await M.ready;
const tracks=M.tracks;
await test('75 首音频各有对应的 4096 段真实波形',async()=>{
 let index=0;const all=[];
 await Promise.all(Array.from({length:6},async()=>{while(index<tracks.length){const t=tracks[index++],d=await loadWaveform(t);assert(d.id===t.id&&d.src===t.src&&d.bins===4096&&Math.abs(d.duration-t.duration)<.15,'对应关系错误 '+t.id);all.push(d);}}));
 assert(all.length===75,'曲目覆盖不足');assert(new Set(all.map(d=>JSON.stringify(d.max))).size===75,'不同音频使用了相同的波形');
});
await test('缩小波形保留短暂峰值与真实静音',()=>{
 const d={bins:4,min:[0,-1000,0,0],max:[0,900,0,0],rms:[0,200,0,0]};
 const point=envelopeAt(d,0,2);assert(point[0]===-1&&point[1]===.9,'瞬态被跳过');assert(envelopeAt(d,1,2).every(x=>x===0),'静音被绘制成假波形');
});
await test('点击位置准确映射时间，越界拖动限制在首尾',()=>{
 const b={left:100,width:400};assert(timeAtX(300,b,200)===100,'中点错误');assert(timeAtX(0,b,200)===0&&timeAtX(900,b,200)===200,'越界未限制');
});
selector.innerHTML=tracks.map(t=>`<option value="${t.id}">${t.id} · ${t.song}</option>`).join('');
const audio=createAudio();let view=null,raf=0;
function update(){view?.draw();const duration=view?.duration()||0;document.querySelector('#readout').textContent=audio.position().toFixed(1)+' 秒 / '+duration.toFixed(1)+' 秒'+(audio.element.paused?' · 暂停':' · 播放中');document.querySelector('#state').textContent=audio.message();}
function mount(track){view?.destroy();audio.load(track);view=createWaveform(canvas,{track,duration:()=>audio.element.duration,position:audio.position,onSeek:t=>{audio.seekTo(t,view?.duration());update();},onCommit:update,onToggle:()=>audio.element.paused?audio.play():audio.pause(),onStatus:state=>{canvas.dataset.state=state;}});update();}
const tick=()=>{update();raf=!audio.element.paused?requestAnimationFrame(tick):0;};
audio.on(()=>{update();if(!raf)raf=requestAnimationFrame(tick);});
for(const e of ['seeked','loadedmetadata','durationchange'])audio.element.addEventListener(e,update);
document.querySelector('#play').onclick=()=>audio.element.paused?audio.play():audio.pause();
selector.onchange=()=>mount(M.byId.get(selector.value));
mount(tracks[0]);
await test('键盘方向键和首尾定位，暂停状态保持不变',async()=>{
 await until(()=>Number.isFinite(audio.element.duration)&&canvas.dataset.state==='ready');
 canvas.focus();canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 assert(Math.abs(audio.position()-5)<.01,'方向键错误');canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));assert(Math.abs(audio.position()-audio.element.duration)<.01,'末尾错误');canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}));assert(audio.position()===0&&audio.element.paused,'暂停定位错误');
});
await test('切换音频后使用新波形和新时长',async()=>{
 selector.value=tracks[1].id;mount(tracks[1]);await until(()=>canvas.dataset.state==='ready'&&Number.isFinite(audio.element.duration));
 assert(Math.abs(view.duration()-tracks[1].duration)<.15&&audio.position()===0,'切换音频残留旧数据');selector.value=tracks[0].id;mount(tracks[0]);
});
await M.ready;const dbName=M.store.name;M.store.close();indexedDB.deleteDatabase(dbName);
out.textContent+='\n'+(results.every(x=>x.startsWith('PASS'))?'ALL PASS':'FAILED');document.title=results.every(x=>x.startsWith('PASS'))?'PASS · v8 真实波形验收':'FAIL · v8 真实波形验收';
