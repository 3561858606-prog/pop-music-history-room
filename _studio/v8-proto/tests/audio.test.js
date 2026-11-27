import {createAudio} from '../js/audio.js';
import * as M from '../js/model.js';
const output=document.querySelector('#results'),results=[];
const assert=(c,m)=>{if(!c)throw Error(m);};
async function test(name,work){try{await work();results.push('PASS '+name);}catch(e){results.push('FAIL '+name+': '+e.message);}output.textContent=results.join('\n');}
const OriginalAudio=globalThis.Audio, OriginalContext=window.AudioContext;
class FakeAudio extends EventTarget {
 constructor(){super();this._src='';this.buffered={length:0};this.errorName=null;this.loads=0;this.resetMedia();}
 resetMedia(){this.paused=true;this.ended=false;this.currentTime=0;this.duration=NaN;this.readyState=0;this.error=null;}
 get src(){return this._src;}
 set src(value){this._src=value;this.resetMedia();}
 removeAttribute(name){if(name==='src')this._src='';}
 async play(){if(this.errorName)throw new DOMException('test',this.errorName);this.paused=false;this.dispatchEvent(new Event('playing'));}
 pause(){this.paused=true;this.dispatchEvent(new Event('pause'));}
 load(){this.loads++;this.resetMedia();}
 metadata(duration){this.duration=duration;this.readyState=1;this.dispatchEvent(new Event('loadedmetadata'));}
 fail(){this.error={code:4};this.dispatchEvent(new Event('error'));}
 finish(time){this.currentTime=time;this.paused=true;this.ended=true;this.dispatchEvent(new Event('ended'));}
}
const timings=[],gain={gain:{cancelScheduledValues:t=>timings.push(['cancel',t]),setValueAtTime:(v,t)=>timings.push(['set',v,t]),linearRampToValueAtTime:(v,t)=>timings.push(['ramp',v,t])},connect(){return this;}};
class FakeContext {
 constructor(){this.currentTime=10;this.state='running';this.sampleRate=100;this.destination={};}
 createGain(){return gain;}
 createMediaElementSource(){return {connect:()=>gain};}
 createBuffer(channels,n){return {getChannelData:()=>new Float32Array(n)};}
 createBufferSource(){return {connect(){},start(){},stop(){},disconnect(){}};}
}
globalThis.Audio=FakeAudio;window.AudioContext=FakeContext;
try {
 await test('自动播放被阻止后显示提示，点击可重试',async()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3'});p.element.errorName='NotAllowedError';assert(!await p.play()&&p.failed()&&p.message().includes('点击'),'未显示播放限制');
  p.element.errorName=null;assert(await p.play()&&!p.failed()&&p.message()==='正在播放','重试失败');
 });
 await test('音频加载失败后重新加载并重试',async()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3'});p.element.fail();assert(p.failed(),'未显示加载失败');
  assert(await p.play()&&p.element.loads===1&&p.element.error===null,'未重新加载');p.stop();
 });
 await test('缓冲状态与暂停状态明确可见',async()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3'});await p.play();p.element.dispatchEvent(new Event('waiting'));assert(p.message()==='正在缓冲…','无缓冲状态');p.pause();assert(p.message()==='已暂停','无暂停状态');
 });
 await test('恢复播放位置受音频真实时长约束',async()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3',duration:101},999);
  p.element.metadata(100);assert(p.element.currentTime===100&&p.position()===100,'恢复位置越界');
 });
 await test('淡入由音频时钟调度，与画面帧率无关',async()=>{
  timings.length=0;const p=createAudio();p.load({src:'audio/t01.mp3'});await p.play({fadeIn:true});
  assert(timings.some(x=>x[0]==='ramp'&&x[1]===1&&Math.abs(x[2]-10.82)<.0001),'未调度音量渐变');p.stop();
 });
 await test('元数据尚未返回时保留点击位置，载入后准确跳转',async()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3',duration:100});
  p.seekTo(75,100);assert(p.position()===75&&p.element.currentTime===0,'预备定位丢失');
  p.element.metadata(.2);assert(p.position()===75&&p.element.currentTime===0,'异常短元数据覆盖定位');
  p.element.metadata(100);assert(p.element.currentTime===75,'元数据到达后未定位');
  p.seekTo(0,100);assert(p.element.currentTime===0,'无法定位开头');
 });
 await test('媒体跳转尚未完成时连续定位保留最新目标，确认后恢复实时位置',()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3',duration:100});p.element.metadata(100);
  let actual=0;
  Object.defineProperty(p.element,'currentTime',{get:()=>actual,set:()=>{p.element.seeking=true;}});
  p.seekTo(5);p.seekTo(p.position()+5);assert(p.position()===10,'连续定位丢失目标');
  actual=10;p.element.seeking=false;p.element.dispatchEvent(new Event('seeked'));
  actual=12;assert(p.position()===12,'跳转后没有恢复实时位置');
 });
 await test('暂停中点击不启动播放，定位限制在音频范围内',()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3',duration:100});p.element.metadata(100);
  p.seekTo(-10);assert(p.position()===0,'首端越界');p.seekTo(999);assert(p.position()===100&&p.element.paused,'末端越界或意外播放');
 });
 await test('离开练习时取消下载，回来在原音源和位置续播',async()=>{
  const p=createAudio();p.load({src:'audio/t01.mp3',duration:100});p.element.metadata(100);
  const src=p.element.src;await p.play();p.seekTo(42);
  p.pause({release:true});
  assert(!p.element.src&&p.element.paused&&p.position()===42,'离开时仍在下载或位置丢失');
  await p.play();p.element.metadata(100);
  assert(p.element.src===src&&!p.element.paused&&p.element.currentTime===42,'恢复时未接回原位置');p.stop();
  assert(!p.element.src,'停止后仍保留下载地址');
 });
 await test('异常短音源在开头误报结束时不跳歌，真正曲终只通知一次',async()=>{
  const p=createAudio(), states=[];p.on(state=>states.push(state));
  p.load({src:'audio/t01.mp3',duration:100});p.element.metadata(.2);
  await p.play();p.element.finish(.2);
  assert(p.failed()&&!states.includes('ended'),'异常结束传到了顺序播放');
  assert(await p.play(),'异常结束后无法重试');
  p.element.metadata(100);p.element.finish(100);p.element.finish(100);
  assert(states.filter(state=>state==='ended').length===1,'真实曲终没有仅通知一次');p.stop();
 });
} finally {globalThis.Audio=OriginalAudio;window.AudioContext=OriginalContext;}
output.textContent+='\n'+(results.every(x=>x.startsWith('PASS'))?'ALL PASS':'FAILED');document.title=results.every(x=>x.startsWith('PASS'))?'PASS · v8 音频回归':'FAIL · v8 音频回归';

await M.ready;const dbName=M.store.name;M.store.close();indexedDB.deleteDatabase(dbName);
