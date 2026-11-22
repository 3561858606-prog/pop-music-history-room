// 深空：唱片页盘下面的宇宙。单独一张 WebGL2 画布，所有运动由一个时钟在着色器里算出。
// 盘照旧按需渲染；这里每帧只设几个 uniform，画一张天、一片暗云、三批星点、最多四张封面、几颗余光星，
// 加上你的星空（记住的歌）和偶尔一件天文年表里的事。
// 一句话：盘是母盘，记住了就刻上；天是一盘还没干的显影液，碰它就起波，起波就搅动了它。
import {CFG, KINDS, STAR_STRIDE, makeStars, starCounts, extentOf, createScheduler, simulate, coverVis, coverDev, coverOut,
  coverScale, coverLife, camAt, rng, smoother, hits} from './cosmos-plan.js';
import {ERAS, FINALE, erasOf, eraById} from './sky-events.js';
import {createReact} from './react.js';

const STAR_SEED = 1854;   // 每次打开都是同一片星空
const Q = new URLSearchParams(location.search);
// 调试：?nodrift 关掉消失点漂移（C25）；?far=keep|hi|none 换远处小封面的处理
const DRIFT = !Q.has('nodrift');
const FAR = ['keep', 'hi', 'none'].includes(Q.get('far')) ? Q.get('far') : CFG.far;
const DEG = Math.PI / 180, TAU = Math.PI * 2;
const RP = CFG.ripple, VX = CFG.vortex, WK = CFG.wake, SK = CFG.sky;
const f1 = x => x.toFixed(1), f2 = x => x.toFixed(2);

const COMMON = `#version 300 es
precision highp float; precision highp int;
uniform vec2 uView; uniform vec4 uMask; // 顶栏下缘、曲目表左缘、暗角强度、总曝光
uniform sampler2D uCloudTex; uniform vec4 uCloud; uniform vec2 uCloudA;   // 暗云：屏幕中心 xy、屏幕半径、深度；遮挡强度、暖边
float maskAt(vec2 p){
  float head = mix(.5, 1., smoothstep(uMask.x, uMask.x + 28., p.y));
  float panel = 1. - .78*smoothstep(uMask.y - 150., uMask.y - 10., p.x);
  vec2 q = p/uView - .5; float vig = 1. - uMask.z*smoothstep(.25, .75, dot(q,q)*2.2);
  return head*panel*vig*uMask.w;
}
float cloudD(vec2 p){ vec2 uv = (p - uCloud.xy)/(2.*uCloud.z) + .5;
  if (uCloudA.x <= 0. || any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) return 0.;
  return textureLod(uCloudTex, uv, 0.).r; }
vec4 clip(vec2 p){ return vec4(p.x/uView.x*2.-1., 1.-p.y/uView.y*2., 0., 1.); }
mat2 rot2(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
// 水波（点空白处）：最多 ${RP.max} 圈。xy 落点（px），z 年龄（s，<0 = 空），w 强度
// 波：三道环向外走，经过的东西被折射得一推一拉；推开：落点附近的星慢慢让到外面，过一会儿再慢慢回来
uniform vec4 uRip[${RP.max}];
const float RIP_V = ${f1(RP.speed)}, RIP_GAP = ${f1(RP.gap)}, RIP_PUSH = ${f1(RP.push)};
vec2 ripDisp(vec2 p){
  vec2 d = vec2(0.);
  for (int i = 0; i < ${RP.max}; i++) { vec4 r = uRip[i]; if (r.z < 0.) continue;
    vec2 q = p - r.xy; float L = length(q); if (L < .5) continue;
    float a = r.z, rho = RIP_V*a, sg = 8. + 7.*a, Rc = RIP_PUSH*r.w;
    float e = smoothstep(0., ${f2(RP.pushIn)}, a)*(1. - smoothstep(${f2(RP.holdUntil)}, ${f2(RP.life)}, a));
    float w = Rc*exp(-L*L/(1.28*Rc*Rc))*e;   // 宽度取 1.28：位移的斜率处处小于 1，星不会互相穿过
    if (abs(L - rho) < 6.*sg + 2.*RIP_GAP) {
      float amp = ${f2(RP.amp)}*min(r.w, 1.6)*exp(-a/1.6)*smoothstep(0., .08, a), ww = 0.;
      for (int k = 0; k < 3; k++) { float s = (L - rho + float(k)*RIP_GAP)/sg; ww += (k == 0 ? 1. : k == 1 ? .55 : .3)*s*exp(-.5*s*s); }
      w += amp*1.65*ww;
    }
    d += q/L*w;
  }
  return d; }
float ripRing(vec2 p){
  float b = 0.;
  for (int i = 0; i < ${RP.max}; i++) { vec4 r = uRip[i]; if (r.z < 0.) continue;
    float L = length(p - r.xy), a = r.z, rho = RIP_V*a, sg = 8. + 7.*a, s0 = (L - rho)/sg, s1 = (L - rho + RIP_GAP)/sg, k = min(r.w, 1.6);
    b += k*exp(-a/1.4)*smoothstep(0., .05, a)*(exp(-.5*s0*s0) + .45*exp(-.5*s1*s1));
    b += k*exp(-a/.18)*exp(-L*L/800.);   // 落点一闪
  }
  return b; }
// 水面的明暗：把每道环当成水面的一道起伏，朝左上（盘面主光的方向）的那一面亮，背面暗。返回有正负的亮度
float ripShade(vec2 p){
  float b = 0.; const vec2 LD = vec2(-.6, -.8);
  for (int i = 0; i < ${RP.max}; i++) { vec4 r = uRip[i]; if (r.z < 0.) continue;
    vec2 q = p - r.xy; float L = length(q); if (L < .5) continue;
    float a = r.z, rho = RIP_V*a, sg = 8. + 7.*a;
    if (abs(L - rho) > 5.*sg + 2.*RIP_GAP) continue;
    float f = min(r.w, 1.6)*exp(-a/1.7)*smoothstep(0., .06, a), slope = 0.;
    for (int k = 0; k < 3; k++) { float s = (L - rho + float(k)*RIP_GAP)/sg; slope += (k == 0 ? 1. : k == 1 ? .6 : .35)*s*exp(-.5*s*s); }
    b += f*slope*dot(q/L, LD)*1.65;
  }
  return b; }
// 按住：漩涡。xy 指尖，z 往里收的程度（0–1），w 转过的角度。往里收的映射是单调的，星不会互相穿过
uniform vec4 uVort;
vec2 vortDisp(vec2 p){ if (uVort.z <= 0. && abs(uVort.w) < .001) return vec2(0.);
  vec2 q = p - uVort.xy; float f = exp(-dot(q,q)/${f1(VX.R * VX.R)});
  return rot2(uVort.w*f)*q*(1. - uVort.z*${f2(VX.pull)}*f) - q; }
// 拖：尾流。每个采样点 xy、年龄 z（<0 = 空）、强度 w；uWakeV 是划过的方向。越老的点散得越开，连起来就是一个 V
uniform vec4 uWake[${WK.n}]; uniform vec4 uWakeV[${WK.n}]; uniform int uWakeN;
vec2 wakeDisp(vec2 p){ vec2 d = vec2(0.);
  for (int i = 0; i < ${WK.n}; i++) { if (i >= uWakeN) break; vec4 w = uWake[i]; if (w.z < 0.) continue;
    vec2 v = uWakeV[i].xy, n = vec2(-v.y, v.x), q = p - w.xy; float a = w.z, al = dot(q, v), sa = 16. + 30.*a;
    float g = exp(-.5*al*al/(sa*sa)); if (g < .01) continue;
    float sp = 10. + ${f1(WK.open)}*a, s = dot(q, n)/sp, env = w.w*exp(-a/${f2(WK.life * .45)})*smoothstep(0., .1, a);
    d += n*(${f2(WK.amp)}*sp*s*exp(-.5*s*s)*1.65*env*g*${f1(WK.every)}/(2.5066*sa)); }
  return d; }
float wakeLit(vec2 p){ float b = 0.;
  for (int i = 0; i < ${WK.n}; i++) { if (i >= uWakeN) break; vec4 w = uWake[i]; if (w.z < 0.) continue;
    vec2 v = uWakeV[i].xy, q = p - w.xy; float a = w.z, al = dot(q, v), sa = 16. + 30.*a, g = exp(-.5*al*al/(sa*sa)); if (g < .01) continue;
    float sp = 10. + ${f1(WK.open)}*a, e = (abs(dot(q, vec2(-v.y, v.x))) - sp)/5.;
    b += exp(-.5*e*e)*w.w*exp(-a/${f2(WK.life * .4)})*g*${f1(WK.every)}/(2.5066*sa); }
  return b; }
// 1919 年的日食：经过太阳旁边的星光被弯折（夸大了）。xy 中心，z 日面半径，w 强度
uniform vec4 uLens;
vec2 lensDisp(vec2 p){ if (uLens.w <= 0.) return vec2(0.); vec2 q = p - uLens.xy; float L = max(length(q), .5);
  return q/L*(uLens.w*uLens.z*uLens.z/max(L, uLens.z)); }
vec2 allDisp(vec2 p){ return ripDisp(p) + vortDisp(p) + wakeDisp(p) + lensDisp(p); }
`;

const TRI_VS = `#version 300 es
out vec2 vUv; void main(){ vec2 p = vec2(gl_VertexID==1?3.:-1., gl_VertexID==2?3.:-1.); vUv = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`;

const NOISE = `
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(17.3,9.1); a*=.5; } return s; }`;

// 星云：启动和尺寸变化时画一次到低分辨率纹理。r = 暖色的尘，g = 冷色的雾
const NEBULA_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform vec2 uAsp; out vec4 o;` + NOISE + `
void main(){
  vec2 p = vUv*uAsp;
  vec2 w = vec2(fbm(p*1.6+3.1), fbm(p*1.6+8.7));
  float d = fbm(p*2.2 + w*1.8), wisp = smoothstep(.35,.85,d);
  vec2 cw = vec2(.16,.20)*uAsp, cc = vec2(.86,.84)*uAsp;
  float warm = exp(-dot(p-cw,p-cw)/(.20*uAsp.x*uAsp.x)) * (.30 + .90*wisp);
  float cool = exp(-dot(p-cc,p-cc)/(.16*uAsp.x*uAsp.x)) * (.35 + .80*smoothstep(.3,.8,fbm(p*1.7+w*1.4+21.)));
  o = vec4(warm, cool, 0., 1.);
}`;

// 暗云的形状：每片云出生时画一次，256²。r = 浓度（团块，边缘是被扭过的丝），g = 断续暖边用的噪声
const CLOUD_BAKE_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform float uSeed; out vec4 o;` + NOISE + `
void main(){
  vec2 q = vUv*2. - 1., p = vUv*2.4 + uSeed;
  vec2 w = vec2(fbm(p*1.1 + 1.7), fbm(p*1.1 + 9.2)) - .5;
  // 被扭过的长条团块，略斜；外面是一缕缕丝（脊状噪声），不是一个圆
  vec2 qw = q + w*1.1; qw = mat2(.86, .5, -.5, .86)*qw;
  float body = 1. - smoothstep(.10, .85, length(qw*vec2(.75, 1.45)));
  float d = fbm(p*2.6 + w*3.2);
  float fil = 1. - abs(fbm(p*3.4 + w*2.4)*2. - 1.);
  float v = body*.95 + (d - .5)*1.1 + (fil - .55)*.9*smoothstep(0., .6, body);
  float dens = smoothstep(.22, 1.05, v); dens *= .7 + .3*smoothstep(.45, .9, v);   // 边缘是渐变的薄纱，核心才浓
  dens *= 1. - smoothstep(.78, 1., length(q));
  o = vec4(dens, fbm(p*7. + 3.3), 0., 1.);
}`;

// uFx：x 天边的「雪花」（1932 年的射电噪声），y 满天极细的颗粒（1965 年的宇宙微波背景），z 时间
const SKY_FS = COMMON + NOISE + `
in vec2 vUv; uniform sampler2D uNeb; uniform vec3 uNebI; uniform float uSeed; uniform vec3 uFx; out vec4 o;
// 听歌时「风格」链的那一层：x 模式（1 雾 · 2 烟 · 3 中心暖光 · 4 油彩 · 5 地平线 · 6 霓虹边 · 7 漩涡），y 量，z 时间，w 拍子
uniform vec4 uMood; uniform vec3 uMoodA, uMoodB; uniform vec2 uFoeS;
// 「乐谱」：五条谱线。x 量，y 线距，z 中间那条线的 y，w 时间
uniform vec4 uStaff;
vec3 mood(vec2 pp){
  vec2 uv = pp/uView.y; float t = uMood.z, bt = uMood.w, md = uMood.x; vec3 add = vec3(0.);
  if (md < 1.5) { float hgt = smoothstep(1.05, .15, pp.y/uView.y), v = fbm(uv*2.2 + vec2(t*.015, -t*.05));
    add = mix(uMoodB, uMoodA, v)*smoothstep(.35, .8, v)*hgt*(.8 + .4*bt); }
  else if (md < 2.5) { vec2 q = vec2(fbm(uv*1.7 + vec2(t*.025, 0.)), fbm(uv*1.7 + vec2(5.2, -t*.02)));
    float v = fbm(uv*2.3 + q*2.4 + vec2(0., -t*.035)); add = mix(uMoodB, uMoodA, smoothstep(.45, .85, v))*smoothstep(.5, .82, v)*(.85 + .3*bt); }
  else if (md < 3.5) { float r = length((pp - uFoeS)/uView.y); add = mix(uMoodA, uMoodB, .5 + .5*sin(t*.35 + r*5.))*exp(-r*r/.16)*(.35 + .9*bt); }
  else if (md < 4.5) { vec2 w = vec2(fbm(uv*1.3 + t*.045), fbm(uv*1.3 - t*.04 + 3.1)); float v = fbm(uv*1.5 + w*1.9);
    vec3 hue = .5 + .5*cos(6.2831853*(v*1.4 + t*.05 + vec3(0., .28, .58))); hue = mix(vec3(dot(hue, vec3(.33))), hue, .75);   // 油彩：颜色流动，但不刺眼
    add = hue*smoothstep(.32, .74, v)*(.75 + .55*bt); }
  else if (md < 5.5) { float hgt = exp(-(1. - pp.y/uView.y)*4.5); add = mix(uMoodB, uMoodA, hgt)*hgt*(.8 + .5*bt); }
  else if (md < 6.5) { float e = min(min(pp.x, uView.x - pp.x), min(pp.y, uView.y - pp.y)); add = mix(uMoodA, uMoodB, .5 + .5*sin(t*.9 + pp.y*.012))*exp(-e/80.)*(.2 + .9*bt); }
  else { vec2 q = (pp - uFoeS)/uView.y; float r = length(q), a = atan(q.y, q.x), s = .5 + .5*sin(a*3. + log(r + .05)*5. - t*1.3);
    add = mix(uMoodA, uMoodB, s)*s*s*s*smoothstep(.12, .45, r)*exp(-r*1.4)*(.7 + .7*bt); }
  return add*uMood.y*.4; }
float staff(vec2 pp){ float b = 0.;
  for (int k = -2; k <= 2; k++) { float ly = uStaff.z + float(k)*uStaff.y + 2.5*sin(pp.x*.0035 + uStaff.w*.35 + float(k)*.7), d = pp.y - ly; b += exp(-d*d/.9); }
  return b*smoothstep(0., 120., pp.x)*smoothstep(0., 120., uView.x - pp.x); }
const vec3 BASE = vec3(15.,13.,12.)/255.;
const vec3 WARM = vec3(1.,.80,.55), COOL = vec3(.42,.55,.86);   // 盘面主光 CA 与补光 CB 的色相
float hs(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 pp = vUv*uView, pd = pp - ripDisp(pp) - vortDisp(pp)*.6;   // 星云也被水波和漩涡带着走
  vec2 nb = texture(uNeb, vec2(pd.x/uView.x, 1. - pd.y/uView.y)).rg;   // 纹理的第 0 行是画面底部
  vec3 c = BASE + (nb.r*WARM*uNebI.x + nb.g*COOL*uNebI.y)*uNebI.z*maskAt(pp);
  // 水面：一道很淡的环光，加上起伏的明暗（亮面偏暖、暗面压低），这才看得出是水
  float sh = ripShade(pp);
  c += (vec3(1., .94, .84)*ripRing(pp)*${f1(RP.light)} + vec3(1., .92, .80)*max(sh, 0.)*${f1(RP.shade)} + vec3(.8, .85, 1.)*min(sh, 0.)*${f1(RP.shade * .45)})/255.*uMask.w;
  if (uWakeN > 0) c += vec3(.9, .93, 1.)*wakeLit(pp)*26./255.*uMask.w;   // 尾流的两道边
  if (uVort.z > 0.) { vec2 q = pp - uVort.xy; c += vec3(1., .88, .7)*uVort.z*exp(-dot(q,q)/${f1((VX.R * .45) ** 2)})*9./255.*uMask.w; }
  if (uFx.x > 0.) { float e = 1. - smoothstep(0., 150., min(min(pp.x, uView.x - pp.x), min(pp.y, uView.y - pp.y)));
    float g = hs(floor(pp/1.5) + floor(uFx.z*30.)*vec2(7.1, 3.3)); c += vec3(.8, .84, .92)*step(.975, g)*e*uFx.x*70./255.; }
  if (uFx.y > 0.) { float g = hs(floor(pp/2.) + floor(uFx.z*12.)*vec2(5.7, 1.9)) - .5; c += vec3(1., .93, .86)*g*uFx.y*13./255.*maskAt(pp)/max(uMask.w, .01); }
  if (uMood.y > .002) c += mood(pp)*maskAt(pp);
  if (uStaff.x > .002) c += vec3(1., .9, .72)*staff(pp)*uStaff.x*.17*maskAt(pp);
  float d = hs(gl_FragCoord.xy + uSeed) - .5;
  o = vec4(c + d/255., 1.);
}`;

// 方片：局部坐标是像素（封面、暗云、天文事件共用）
const QUAD_VS = COMMON + `
in vec2 aQ; uniform vec2 uCtr, uHalf; uniform float uRoll, uRipK; out vec2 vL; out vec2 vP;
void main(){ vL = aQ*uHalf; float c = cos(uRoll), s = sin(uRoll);
  vP = uCtr + allDisp(uCtr)*uRipK + vec2(c*vL.x - s*vL.y, s*vL.x + c*vL.y); gl_Position = clip(vP); }`;

// 暗云：只把身后的天压暗（星和封面在各自的着色器里按深度判断要不要被挡），朝主光的上缘有一道断续的暖边
const CLOUD_FS = COMMON + `
in vec2 vL; in vec2 vP; uniform float uFade; out vec4 o;
void main(){
  float d = cloudD(vP), below = cloudD(vP + vec2(0., uCloud.z*.035));
  vec2 uv = (vP - uCloud.xy)/(2.*uCloud.z) + .5; float g = textureLod(uCloudTex, uv, 0.).g;
  float rim = clamp((below - d)*5., 0., 1.) * smoothstep(.5, .62, g) * (1. - d);
  float m = maskAt(vP);
  o = vec4(vec3(1., .80, .55)*rim*uCloudA.y/255.*uFade*m, d*uCloudA.x);
}`;

// 星：位置、闪烁、余晖、跟焦、星轨都在这里算。uZ = (近, 远)，uK = (种类, 大小, 显现)，uN = (接近时大小倍数, 亮度倍数, 近端淡出区)
// 相机：沿视线前进 uC，同时横向在 uCam（像素 × 深度），并绕消失点转 uRot。屏幕位置 = 消失点 + 旋转((横向位置 − 相机) / 深度)
// 星轨：用 drawArraysInstanced 再画一遍亮星，第 k 个实例转回 k/N 的弧长
const STAR_VS = COMMON + `
in vec4 a0; in vec4 a1; in vec4 a2;
uniform float uC, uT, uDpr, uStill, uCool, uRot, uCalm, uDef; uniform vec2 uZ, uFoe, uE, uCam, uV; uniform vec3 uK, uN, uTrail; uniform int uTrailN;
uniform vec4 uReact, uStaffS;   // 听歌：x 拍子让星亮一下，y 镲片让一部分星闪，z 闪的种子，w 推弦（星光上下弯）；谱线：x 量，y 线距，z 中线 y
out vec3 vCol; out float vA, vDef, vTrail;
float hh(float x){ return fract(sin(x*91.345)*47453.5453); }
void main(){
  vCol = vec3(0.); vA = 0.; vDef = 0.; vTrail = 0.;
  float ang = uRot, ta = 1.;
  if (uTrailN > 0) {
    if (a0.w < uTrail.z) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 1.; return; }
    float k = float(gl_InstanceID + 1)/float(uTrailN);
    ang -= uTrail.x*k; ta = uTrail.y*smoothstep(1., .55, k); vTrail = 1.;
  }
  float D = uZ.y - uZ.x, f = a0.z - uC/D, cyc = floor(f), zr = f - cyc;
  float z = uZ.x + zr*D;
  vec2 xi = fract(a0.xy + vec2(hh(cyc + a0.x*13.), hh(cyc*1.7 + a0.y*7.))) * 2. - 1.;
  vec2 rel = rot2(ang)*((xi*uE*uZ.y - uCam)/z), p = uFoe + rel;
  float hit = ripRing(p); p += allDisp(p);   // 水波、漩涡、尾流、透镜：被推开、被折射，波前经过时亮一下
  if (uReact.w > 0.) p.y += uReact.w*8.*sin(p.x*.011 + uT*1.6)*(.6 + .4*sin(uT*.7 + p.x*.003));   // 蓝调：像推弦一样弯
  if (uStaffS.x > 0.) { float rel = (p.y - uStaffS.z)/uStaffS.y, li = clamp(floor(rel + .5), -2., 2.);   // 乐谱：谱线附近的星落到线上
    float inBand = 1. - smoothstep(2.6, 3.4, abs(rel)); p.y = mix(p.y, uStaffS.z + li*uStaffS.y, uStaffS.x*.8*inBand); }
  float fade = smoothstep(1., .8, zr) * smoothstep(0., uN.z, zr);
  // 屏幕上的速度（像素/秒）：超过上限就在几帧里淡掉
  float v = length(rel)*uV.x/z; fade *= 1. - smoothstep(uV.y, uV.y*1.3, v);
  float tw = uStill > .5 ? 1. : 1. - a1.z + a1.z*(.5 + .5*sin(6.2831853*uT/a1.x + a1.y));
  // 余晖：${CFG.flare.rise} s 升起，${CFG.flare.fall} s 慢慢落完；有人在操作时压下去
  float fl = 0.;
  if (a2.z > 1. && uStill < .5 && vTrail < .5) { float x = fract(uT/a2.x + a2.y)*a2.x;
    fl = (x < ${f2(CFG.flare.rise)} ? smoothstep(0., ${f2(CFG.flare.rise)}, x) : pow(max(0., 1. - (x - ${f2(CFG.flare.rise)})/${f2(CFG.flare.fall)}), 2.5))*uCalm; }
  float near = smoothstep(.35, 0., zr);
  float size = uK.y * mix(1., uN.x, near) * (1. + .3*fl);
  vec3 col = a1.w < .5 ? vec3(.933,.910,.855) : a1.w < 1.5 ? vec3(.80,.86,.97) : vec3(.97,.82,.62);
  col = mix(col, vec3(.70,.79,.97), uCool);   // 远处偏冷：零成本的空气透视
  float occ = z > uCloud.w ? 1. - uCloudA.x*cloudD(p) : 1.;   // 在暗云后面的被掩住
  if (uLens.w > 0.) occ *= smoothstep(uLens.z*1.05, uLens.z*1.5, length(p - uLens.xy));   // 被日面挡住
  float a = a0.w * tw * (1. + (a2.z-1.)*fl) * fade * uK.z * maskAt(p) * mix(1., uN.y, near) * occ * ta;
  a *= 1. + hit*(uK.x > 1.5 ? 1.6 : uK.x > .5 ? 1.1 : .5);
  if (uVort.z > 0.) { vec2 q = p - uVort.xy; a *= 1. + uVort.z*1.2*exp(-dot(q,q)/${f1((VX.R * .5) ** 2)}); }   // 聚到指尖的星更亮
  a *= 1. + uReact.x*(uK.x > .5 ? 1.3 : .35);   // 重拍：星一起亮一下
  if (uReact.y > .01 && fract(sin((a0.x + a0.y*7.)*913.1 + uReact.z*17.3)*43758.5) < .07) a *= 1. + uReact.y*3.;   // 镲片：一小撮星闪
  float px = size*uDpr, sf = uK.x > 1.5 ? 4. : 2.2;
  if (vTrail > .5) {
    // 星轨：细线；弧上的点挨得比点本身还密时按间距降亮度，叠起来才是一条匀的线
    px = (${f2(CFG.trail.width)} + uDef)*uDpr; sf = 2.2; a *= ${f2(CFG.trail.width)}/(${f2(CFG.trail.width)} + uDef);   // 贴近时跟着背景一起稍微虚
    a *= clamp(length(rel)*abs(uTrail.x)/float(uTrailN)*uDpr/(px*.9), .04, 1.);
  }
  // 小于 1.5 个设备像素的点按面积降亮度，不让像素网格把它弄得忽明忽暗
  if (px < 1.5) { a *= px*px/2.25; px = 1.5; }
  // 跟焦：失焦成软斑，越大越暗
  float d = uDef*uDpr;
  if (vTrail < .5 && d > px) { vDef = smoothstep(px*1.2, px*2.5, d); a *= pow(px/d, 1.25); }
  vCol = col; vA = a;
  gl_PointSize = mix(px*sf, max(px, d)*1.15, vDef);
  gl_Position = clip(p);
}`;
const STAR_FS = `#version 300 es
precision highp float; in vec3 vCol; in float vA, vDef, vTrail; uniform vec3 uK; out vec4 o;
void main(){
  vec2 q = gl_PointCoord*2. - 1.; float r2 = dot(q,q);
  float k = uK.x > 1.5 && vTrail < .5 ? exp(-r2*35.2) + .06*exp(-r2*3.5) : exp(-r2*6.05);   // 亮星：核 + 极淡的晕
  float soft = smoothstep(1., .72, sqrt(r2)) * (.92 + .08*r2);   // 软斑，边缘亮 ≤8%
  o = vec4(vCol*vA*mix(k, soft*.9, vDef), 0.);
}`;

// 封面：在模糊图上按亮度显影（亮处先到，边框最后到，开头是低饱和暖灰）；隐去时均匀褪色、沉下去
const D = CFG.develop;
const COVER_FS = COMMON + `
in vec2 vL; in vec2 vP; uniform sampler2D uTex; uniform vec2 uDim, uCtr;
uniform float uRound, uA, uBlur, uSat, uBright, uGlow, uDev, uOut, uCap, uOcc, uLift; uniform vec3 uGlowC; out vec4 o;
float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d,0.)) + min(max(d.x,d.y),0.); }
void main(){
  float sd = uRound > .5 ? length(vL) - uDim.x*.5 : sdBox(vL, uDim*.5 - 1.5) - 1.5;
  float cov = 1. - smoothstep(-.75, .75, sd);
  float dv = min(uDev, uCap), pa = 0.; vec3 c = vec3(0.);
  if (cov > 0.) {
    vec2 uv = vL/uDim + .5, t = vec2(.35)/vec2(textureSize(uTex,0))*exp2(uBlur);
    c = .25*(texture(uTex, uv+vec2(t.x,t.y), uBlur).rgb + texture(uTex, uv+vec2(-t.y,t.x), uBlur).rgb
           + texture(uTex, uv-vec2(t.x,t.y), uBlur).rgb + texture(uTex, uv+vec2(t.y,-t.x), uBlur).rgb);
    float l = dot(c, vec3(.299,.587,.114));
    // 显影的先后看模糊过的亮度：亮处 ${D.hi} s、中间调 ${D.mid} s、全部 ${D.full} s
    float lb = dot(textureLod(uTex, uv, 4.).rgb, vec3(.299,.587,.114));
    float tf = 1. - .82*pow(lb, .8);
    float app = smoothstep(tf - .22, tf, dv);
    float ef = clamp(-sd/(.15*min(uDim.x, uDim.y)), 0., 1.);
    float edge = mix(smoothstep(.85, 1., dv), 1., smoothstep(0., 1., ef));   // 边缘 15% 以内等显影过 0.85
    pa = app*edge;
    float sat = uSat*smoothstep(${(D.mono / D.full - .08).toFixed(3)}, ${(D.mono / D.full + .18).toFixed(3)}, dv);   // 前 ${D.mono} s 低饱和暖灰
    sat = mix(sat, 1., uLift);   // 指针停在上面：颜色回来
    c = mix(vec3(l)*vec3(1.,.96,.9), c, sat) * mix(uBright, 1., uLift);
    c *= .82 + .18*smoothstep(0., .05*min(uDim.x,uDim.y), -sd);
  }
  float occ = 1. - uOcc*uCloudA.x*cloudD(vP), hit = min(ripRing(uCtr), 1.5);   // 波前经过：封面亮一下、泛出自己的颜色
  c *= 1. + .35*hit;
  float m = maskAt(uCtr)*occ, a = mix(uA, 1., uLift*.8)*cov*pa*(1. - uOut)*m;
  float sig = .2*max(uDim.x,uDim.y), g = (uGlow*smoothstep(.75, 1., dv) + .18*hit + .12*uLift)*exp(-pow(max(sd,0.)/sig, 2.))*(1.-cov)*uA*(1. - uOut)*m;
  o = vec4(c*a + uGlowC*g, a);
}`;

// 余光星：封面隐去后中心留下的一颗星，带封面的颜色。也用来画天文事件里的小点
const EMBER_VS = COMMON + `
uniform vec2 uP; uniform float uPx, uDispK; out float vHit;
void main(){ vHit = ripRing(uP); gl_PointSize = uPx; gl_Position = clip(uP + allDisp(uP)*uDispK); }`;
const EMBER_FS = `#version 300 es
precision highp float; in float vHit; uniform vec3 uCol; uniform float uA; out vec4 o;
void main(){ vec2 q = gl_PointCoord*2. - 1.; float r2 = dot(q,q); o = vec4(uCol*uA*(1. + 2.*vHit)*(exp(-r2*30.) + .08*exp(-r2*4.)), 0.); }`;

// 你的星空：记住的歌是一颗不动的恒星（离我们无限远，不随星流往外走，只在听歌、甩盘时随天一起转）
// b0：相对消失点的位置 xy、亮度、种类（0 恒星 · 1 星座的连线点）；b1：颜色、该复习的程度；b2：刻满、出现时刻、悬停、年份个位
const FIX_VS = COMMON + `
in vec4 b0; in vec4 b1; in vec4 b2;
uniform vec2 uFoe, uPulse; uniform float uRot, uT, uDpr, uA; out vec3 vCol; out float vA, vFull;
void main(){
  vec2 p = uFoe + rot2(uRot)*b0.xy; float hit = ripRing(p); p += allDisp(p)*.5;
  float age = uT - b2.y, on = smoothstep(0., .8, age), flash = b2.y > -1e8 && age > 0. ? exp(-age/1.4) : 0.;
  float due = b1.w, breathe = 1. - .6*due + .32*due*sin(uT*1.8 + b0.x*.05);   // 该复习了：变暗，慢慢地一明一暗
  float pulse = abs(b2.w - uPulse.x) < .5 && uT > uPulse.y ? exp(-(uT - uPulse.y)/1.8) : 0.;
  float dot_ = step(.5, b0.w);
  float a = b0.z*on*breathe*(1. + 2.6*flash + 1.6*pulse + .9*hit + .9*b2.z)*maskAt(p)*uA;
  float sz = dot_ > .5 ? 1.7 : mix(${f2(SK.size[0])}, ${f2(SK.size[1])}, clamp((b0.z - .45)/.55, 0., 1.))*(b2.x > .5 ? ${f2(SK.fullSize / SK.size[1])} : 1.)*(1. + .7*flash + .35*b2.z);
  vFull = dot_ > .5 ? 0. : b2.x; vCol = b1.rgb; vA = a;
  gl_PointSize = sz*uDpr*(vFull > .5 ? 7. : dot_ > .5 ? 2. : 5.); gl_Position = clip(p);
}`;
const FIX_FS = `#version 300 es
precision highp float; in vec3 vCol; in float vA, vFull; out vec4 o;
void main(){ vec2 q = gl_PointCoord*2. - 1.; float r2 = dot(q,q), k;
  if (vFull > .5) {   // 刻满：一颗带四道芒的星
    float sp = exp(-abs(q.x)*36.)*exp(-q.y*q.y*2.6) + exp(-abs(q.y)*36.)*exp(-q.x*q.x*2.6);
    k = exp(-r2*90.)*1.4 + .16*exp(-r2*7.) + sp*.45;
  } else k = exp(-r2*40.)*1.2 + .14*exp(-r2*5.);   // 核 + 一圈柔和的晕：一眼就和流过去的星不一样
  o = vec4(vCol*vA*k, 0.); }`;

// 天文年表里的事件：0 彗星 · 1 光帘 · 2 旋涡星系 · 3 天体。输出是预乘的：天体不透明（挡住身后的星），其余是发光
const EVENT_FS = COMMON + NOISE + `
in vec2 vL; in vec2 vP; uniform vec2 uHalf, uDir; uniform int uKind; uniform vec4 uP; uniform vec3 uCol, uCol2; uniform float uA, uTime; out vec4 o;
void main(){
  vec3 c = vec3(0.); float al = 0.;
  if (uKind == 0) {   // 彗星：弯的尘埃尾（暖），直的离子尾（冷），彗发
    float len = uP.x, hx = -uHalf.x + 14., s = (vL.x - hx)/len;
    float yc = uP.y*len*s*s, w = 2.5 + uP.z*len*max(s, 0.);
    float body = exp(-.5*pow((vL.y - yc)/w, 2.))*pow(clamp(1. - s, 0., 1.), 1.5)*smoothstep(-.04, .05, s)*sqrt(5./(w + 2.));
    float iw = 1.4 + .04*len*max(s, 0.), ion = uP.w*exp(-.5*pow(vL.y/iw, 2.))*pow(clamp(1. - s*.85, 0., 1.), 2.)*smoothstep(-.02, .1, s)*sqrt(3./(iw + 1.));
    vec2 hq = vL - vec2(hx, 0.); float r2 = dot(hq, hq);
    c = uCol*body*.8 + uCol2*ion*.7 + vec3(1., .97, .9)*(.5*exp(-r2/128.) + 1.5*exp(-r2/8.));
  } else if (uKind == 1) {   // 光帘：极光（底边亮、往上一道道光柱，绿到红），或地平线上的光
    vec2 uv = vL/uHalf; float ef = smoothstep(1., .55, abs(uv.x));
    if (uP.x < .5) { float t = uTime*.12 + uP.y, y0 = .3 + .2*sin(uv.x*2.3 + t) + .07*sin(uv.x*6.1 - t*1.7), up = y0 - uv.y;
      float ray = .4 + .6*pow(n(vec2(uv.x*26. + t*2., t*.5)), 2.);
      float I = up > 0. ? exp(-up*1.7)*ray : exp(up*14.);
      c = mix(uCol, uCol2, smoothstep(.15, 1.1, up))*I*ef*.8; }
    else { float I = exp(-(1. - uv.y)*2.2)*(.8 + .2*n(vec2(uv.x*3., uTime*.1))); c = mix(uCol2, uCol, smoothstep(-.2, 1., uv.y))*I*ef*.45; }
  } else if (uKind == 2) {   // 旋涡星系：斜着看，两条旋臂慢慢转，中间一道暗带
    vec2 q = vL/uHalf.x; q.y /= uP.x; float r = length(q), th = atan(q.y, q.x);
    float arms = pow(.5 + .5*cos(2.*(th - log(r + .03)*3.) - uP.z*uP.y), 3.);
    float disk = exp(-r/.2), bulge = exp(-r*r/.003)*1.1 + exp(-r/.06)*.45;
    float lane = 1. - .5*smoothstep(-.01, .04, q.y)*smoothstep(.15, .05, q.y)*smoothstep(.75, .1, r);
    c = (uCol*bulge + uCol2*disk*(.22 + .9*arms)*lane)*smoothstep(1., .5, r)*.8;
  } else {   // 天体：受光的球（行星 / 月球 / 地球），或日食（黑日面 + 日冕 + 日珥）
    float R = uP.x, d = length(vL), inside = 1. - smoothstep(R - .8, R + .6, d);
    vec2 u = vL/R; vec3 nn = vec3(u, sqrt(max(0., 1. - dot(u, u))));
    float lam = clamp(dot(nn, normalize(vec3(uDir, .45))), 0., 1.);
    if (uP.y > 2.5) {
      float ang = atan(vL.y, vL.x), x = max(d - R, 0.)/R;
      float cor = exp(-x/.5)*(.75 + .35*sin(ang*7. + 1.3) + .2*sin(ang*13. - .4)) + exp(-x/.12)*.8;
      float prom = smoothstep(.55, .85, n(vec2(ang*4., 3.)))*exp(-pow(x/.12, 2.));
      c = (uCol*cor*.5 + uCol2*prom*.9)*(1. - inside); al = inside;
    } else {
      vec3 base = uCol; float glow = 0.;
      if (uP.y < .5 && uP.z > 0.) base *= .8 + .2*sin(u.y*uP.z*3.1416 + n(u*4.)*1.5);   // 木星的条纹
      if (uP.y > .5 && uP.y < 1.5) base *= .78 + .32*n(u*3.5 + 7.);                        // 月海
      if (uP.y > 1.5) { float land = smoothstep(.55, .63, n(u*3.2 + 2.)), cl = smoothstep(.52, .78, n(u*5. + 11.));
        base = mix(mix(vec3(.07, .2, .48), vec3(.3, .34, .2), land), vec3(.95), cl*.85);
        glow = exp(-pow((d - R)/(R*.08), 2.))*smoothstep(-.4, .6, dot(normalize(vL + 1e-3), uDir)); }
      c = base*(.05 + lam*1.3)*inside + vec3(.45, .65, 1.)*glow*.6; al = inside;
    }
  }
  float m = maskAt(vP);
  o = vec4(c*m*uA, al*uA);
}`;

// 听歌时的粒子：音符、金光、微尘、火星、纸屑、火花、光斑。aSA：大小、透明度；aSh：0 圆点 · 1 光斑 · 2 四芒
const PART_VS = COMMON + `
in vec2 aP; in vec2 aSA; in vec3 aC; in float aSh; uniform float uDpr; out vec3 vC; out float vA, vSh;
void main(){ vC = aC; vSh = aSh; vA = aSA.y*maskAt(aP); gl_PointSize = aSA.x*uDpr*(aSh > 1.5 ? 2.4 : aSh > .5 ? 1. : 3.); gl_Position = clip(aP + ripDisp(aP)*.5); }`;
const PART_FS = `#version 300 es
precision highp float; in vec3 vC; in float vA, vSh; out vec4 o;
void main(){ vec2 q = gl_PointCoord*2. - 1.; float r2 = dot(q, q), k;
  if (vSh > 1.5) k = exp(-abs(q.x)*16.)*exp(-q.y*q.y*3.) + exp(-abs(q.y)*16.)*exp(-q.x*q.x*3.) + exp(-r2*30.);
  else if (vSh > .5) k = smoothstep(1., .82, sqrt(r2))*(.75 + .25*r2);
  else k = exp(-r2*9.) + .12*exp(-r2*2.5);
  o = vec4(vC*vA*k, 0.); }`;
// 「年代」链：把整张天当成一张底片再冲洗一遍。G1 单色、棕褐、暖、饱和度；G2 颗粒、闪、划痕、暗角；G3 扫描线、色边、光晕、色相转动
const POST_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uScene; uniform vec2 uRes; uniform float uT, uWarp; uniform vec4 uG1, uG2, uG3; out vec4 o;
float hs(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){
  vec2 tc = vec2(vUv.x, 1. - vUv.y);
  if (uWarp > 0.) tc += uWarp*.0055*vec2(sin(tc.y*11. + uT*.9) + .5*sin(tc.y*23. - uT*1.3), cos(tc.x*9. - uT*.7));   // 油彩投影：整片天轻轻扭动
  vec2 q = tc - .5, dc = q*uG3.y*.007;
  vec3 c = vec3(texture(uScene, tc + dc).r, texture(uScene, tc).g, texture(uScene, tc - dc).b);
  if (uG3.z > 0.) { vec3 hb = vec3(0.); for (int i = 0; i < 6; i++) { float a = float(i)*1.0472; hb += max(texture(uScene, tc + vec2(cos(a), sin(a))*7.5/uRes).rgb - .1, 0.); }
    c += hb/6.*uG3.z*vec3(1., .72, .45); }   // 光晕：亮处晕开一圈暖光
  if (uG3.w > 0.) { float ang = uT*.35*uG3.w; float Y = dot(c, vec3(.299, .587, .114)), I = dot(c, vec3(.596, -.274, -.322)), Q = dot(c, vec3(.211, -.523, .312));
    float cs = cos(ang), sn = sin(ang); vec2 iq = vec2(I*cs - Q*sn, I*sn + Q*cs);
    c = mix(c, vec3(Y + .956*iq.x + .621*iq.y, Y - .272*iq.x - .647*iq.y, Y - 1.106*iq.x + 1.703*iq.y), min(1., uG3.w)); }
  float l = dot(c, vec3(.299, .587, .114));
  c = mix(vec3(l), c, uG1.w);
  c = mix(c, l*vec3(.94, .96, 1.03)*1.1, uG1.x);
  c = mix(c, l*vec3(1.14, .95, .70)*1.05, uG1.y);
  c *= vec3(1. + .12*uG1.z, 1. + .02*uG1.z, 1. - .14*uG1.z);
  c *= 1. - uG2.w*.6*smoothstep(.3, .95, length(q*vec2(uRes.x/uRes.y, 1.))*1.1);
  c *= 1. + uG2.y*(hs(vec2(floor(uT*12.), 3.)) - .5)*.07;   // 胶片的闪：±3.5% 以内的小起伏，不是闪光
  if (uG2.z > 0.) { float f = floor(uT*5.); if (hs(vec2(f, 7.)) > .55) { float d = gl_FragCoord.x - hs(vec2(f, 11.))*uRes.x; c += vec3(.9, .85, .7)*exp(-d*d/1.5)*.06*uG2.z; } }
  c += (hs(gl_FragCoord.xy + floor(uT*24.)*vec2(3.1, 7.7)) - .5)*uG2.x*.05;
  if (uG3.x > 0.) c *= 1. - uG3.x*.18*(.5 + .5*sin(gl_FragCoord.y*1.5708));
  o = vec4(c, 1.); }`;

function program(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('cosmos shader: ' + gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('cosmos link: ' + gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
  return {p, u};
}

/* 暗云的出生表：只由种子决定，所以实时运行和逐帧录制看到的是同一串云。
   第一片在打开页面之前就已经出发（t0 < 0），进来不久就能看到它经过 */
function cloudPlan(seed) {
  const r = rng(seed), C = CFG.cloud, life = (C.z[0] - C.z[1]) / CFG.speed, list = [];
  let t = C.firstAt - life * .45;
  return i => {
    while (list.length <= i) {
      list.push({t0: t, spot: Math.floor(r() * C.spots.length), seed: r() * 50, dropped: false});
      t += Math.max(C.every[0] + r() * (C.every[1] - C.every[0]), life + 3);
    }
    return list[i];
  };
}
const hash01 = s => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 100000) / 100000; };

/* opts: {reduced(), pool:[{id,decade,url,w,h,shape}], layout()→{foe,keepOut,headerBottom,panelLeft,narrow}, avoid()→Set,
   onReady(), paused(), camRate(), camDist(), panel, unheard()→[id],
   onRipple({x,y,s,gen})、onCue(kind, info)、onAnchors({hover, era, labels})、onEra(def|null)：给界面和声音用 } */
export function createCosmos(canvas, opts = {}) {
  // 课程的首尾年代（加了讲次会变）：越早的歌离盘越远
  const SPAN = opts.decadeSpan || [1850, 1960];
  const gl = canvas.getContext('webgl2', {alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power'});
  if (!gl) throw new Error('no webgl2');
  const P = {neb: program(gl, TRI_VS, NEBULA_FS), bake: program(gl, TRI_VS, CLOUD_BAKE_FS), sky: program(gl, TRI_VS, SKY_FS),
    cloud: program(gl, QUAD_VS, CLOUD_FS), star: program(gl, STAR_VS, STAR_FS), cover: program(gl, QUAD_VS, COVER_FS), ember: program(gl, EMBER_VS, EMBER_FS),
    fix: program(gl, FIX_VS, FIX_FS), event: program(gl, QUAD_VS, EVENT_FS), part: program(gl, PART_VS, PART_FS), post: program(gl, TRI_VS, POST_FS)};
  const reduced = () => opts.reduced?.() ?? false;
  const saveData = !!navigator.connection?.saveData;

  /* 星的缓冲：每种一个 VAO */
  const stars = makeStars(STAR_SEED), vao = {};
  for (const kind of KINDS) {
    const v = gl.createVertexArray(); gl.bindVertexArray(v);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, stars[kind].data, gl.STATIC_DRAW);
    ['a0', 'a1', 'a2'].forEach((name, i) => { const l = gl.getAttribLocation(P.star.p, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, STAR_STRIDE * 4, i * 16); });
    vao[kind] = v;
  }
  const vaoQuad = gl.createVertexArray(); gl.bindVertexArray(vaoQuad);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
  for (const pr of [P.cover, P.cloud, P.event]) { const lq = gl.getAttribLocation(pr.p, 'aQ'); if (lq >= 0) { gl.enableVertexAttribArray(lq); gl.vertexAttribPointer(lq, 2, gl.FLOAT, false, 0, 0); } }
  // 你的星空：一个可写的缓冲，每颗 12 个数
  const vaoFix = gl.createVertexArray(); gl.bindVertexArray(vaoFix);
  const fixBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fixBuf);
  ['b0', 'b1', 'b2'].forEach((name, i) => { const l = gl.getAttribLocation(P.fix.p, name); if (l >= 0) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 4, gl.FLOAT, false, 48, i * 16); } });
  // 听歌时的粒子：每帧整块更新，每颗 8 个数
  const vaoPart = gl.createVertexArray(); gl.bindVertexArray(vaoPart);
  const partBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, partBuf); gl.bufferData(gl.ARRAY_BUFFER, 280 * 32, gl.DYNAMIC_DRAW);
  for (const [name, n, off] of [['aP', 2, 0], ['aSA', 2, 8], ['aC', 3, 16], ['aSh', 1, 28]]) { const l = gl.getAttribLocation(P.part.p, name); if (l >= 0) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 32, off); } }
  const vaoTri = gl.createVertexArray(); gl.bindVertexArray(null);
  // 「年代」链要先画到一张纹理上，再冲洗到屏幕上；不用时不建
  let postTex = null, postFbo = null, postW = 0, postH = 0;
  function postTarget() {
    if (postTex && postW === canvas.width && postH === canvas.height) return postFbo;
    postW = canvas.width; postH = canvas.height; postTex ||= gl.createTexture(); postFbo ||= gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, postTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, postW, postH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); texParams();
    gl.bindFramebuffer(gl.FRAMEBUFFER, postFbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, postTex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return postFbo;
  }

  const texParams = (min = gl.LINEAR) => { for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, min], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); };
  /* 星云纹理 */
  const nebTex = gl.createTexture(), fbo = gl.createFramebuffer();
  function bakeTo(tex, w, h, pr, set) {
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); texParams();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.useProgram(pr.p); set(pr.u);
    gl.disable(gl.BLEND); gl.bindVertexArray(vaoTri); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  const bakeNebula = () => bakeTo(nebTex, Math.max(16, Math.ceil(V.W / 4)), Math.max(16, Math.ceil(V.H / 4)), P.neb, u => gl.uniform2f(u.uAsp, V.W / V.H, 1));
  /* 暗云纹理：每片云一次 */
  const cloudTex = gl.createTexture(); let cloudBaked = -1;
  gl.bindTexture(gl.TEXTURE_2D, cloudTex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); texParams();

  /* 封面纹理：最多留 8 张 */
  const texs = new Map();   // id → {tex, glow, ready, failed, used}
  const byId = new Map((opts.pool || []).map(p => [p.id, p]));
  function loadTex(id) {
    if (texs.has(id) || saveData) return texs.get(id)?.promise;
    const item = byId.get(id); if (!item) return;
    const e = {tex: null, glow: [0, 0, 0], ready: false, failed: false, used: 0};
    e.promise = new Promise(res => {
      const img = new Image(); img.decoding = 'async'; img.src = item.url;
      img.decode().then(() => {
        if (dead) return res();
        const k = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement('canvas');
        cv.width = Math.max(2, Math.round(img.naturalWidth * k)); cv.height = Math.max(2, Math.round(img.naturalHeight * k));
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        e.glow = glowOf(cv);
        e.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, e.tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D);
        texParams(gl.LINEAR_MIPMAP_LINEAR);
        e.ready = true; evict(); res();
      }).catch(() => { e.failed = true; res(); });
    });
    texs.set(id, e); return e.promise;
  }
  // 一张图的颜色：缩到 4×4 求平均，统一到同一个亮度，只留颜色
  function glowOf(src) {
    const sm = document.createElement('canvas'); sm.width = sm.height = 4; const sx = sm.getContext('2d', {willReadFrequently: true}); sx.drawImage(src, 0, 0, 4, 4);
    const d = sx.getImageData(0, 0, 4, 4).data; let r = 0, g = 0, b = 0; for (let i = 0; i < 64; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    const avg = [r / 16 / 255, g / 16 / 255, b / 16 / 255], mx = Math.max(...avg, .2);
    return avg.map(c => .15 + .5 * c / mx);
  }
  function evict() {
    const live = new Set([...sch.state.slots, ...sch.state.past].map(s => s.item.id));
    const list = [...texs.entries()].filter(([id, e]) => e.ready && !live.has(id)).sort((a, b) => a[1].used - b[1].used);
    while (texs.size > 8 && list.length) { const [id, e] = list.shift(); gl.deleteTexture(e.tex); texs.delete(id); }
  }

  /* 状态 */
  const V = {W: 1, H: 1, dpr: 1, foe: null, foeGoal: [0, 0], E: [1, 1], layout: null};
  let sch = createScheduler(opts.pool || [], (Math.random() * 2 ** 31) | 0);   // 封面的顺序每次不同
  let clouds = cloudPlan((Math.random() * 2 ** 31) | 0);
  let T = 0, mode = 'over', expo = 0, expoGoal = 1, revealT0 = null, running = false, raf = 0, last = 0, lastTick = -1, dead = false;
  // RT：真实时钟（秒）。水波、尾流、漩涡、天文事件用它；天睡着时宇宙时钟 T 走得慢（pace < 1）
  let RT = 0, pace = 1, lastTouch = 0, halfSkip = 0;
  // 星流走过的路程：平时 = 速度 × 时间；听歌时「节奏」「风格」会让它快一点或慢一点（积分，不会跳）
  let travel = 0;
  // 听歌时的三条效果链（react.js）。listener：listen.js；fx()：设置
  const react = createReact(); let look = react.look, F0 = null;
  // active：唱片页在前台；still：合成的静帧（减少动态，或一打开就是暂停）；frozen：运行中按了暂停，停在当前这一帧
  let still = false, frozen = false, active = false, userPaused = false, playing = false, playOff = 0, frameN = 0, slowAcc = 0, slowN = 0;
  // 镜头：push 推近量（世界单位），focus 失焦（0 整张盘 · 1 贴近 · 2 钻进），rot 天空绕消失点转过的角度
  let push = 0, pushV = 0, pushGoal = 0, dRef = null, focus = 0, rot = 0;
  // 星轨：start 这次曝光开始时的角度；fadeT0 抬针的时刻
  const trail = {start: null, fadeT0: null};
  // 避让：最近一次操作（毫秒）、指针 / 焦点是否在曲目表里；calm 0–1 是「可以开始新事件」的程度
  let lastBusy = -1e9, prevBusy = -1e9, inPanel = false, focusInPanel = false, calm = 1, calmVis = 1, lastEvent = -1e9;
  let recall = null;   // {cands, at, until, done}
  const summons = [];  // 数字键：[{cands, at, n, placed}]
  const rips = [], ripU = new Float32Array(RP.max * 4);   // 水波：{x, y, t0（RT）, s, gen, touched}
  let ripSeq = 0; const meets = [], timers = [];        // 两道波相遇；延后要做的事 [{at（RT）, fn}]
  const vort = {on: false, x: 0, y: 0, t0: 0, charge: 0, ang: 0, relT: -1e9, relCharge: 0, cue: false};
  const wakes = [], wakeU = new Float32Array(WK.n * 4), wakeVU = new Float32Array(WK.n * 4); let wakeLast = null;
  const spin = {v: 0, A: 0, alpha: 0, peak: 0, at: 0, drag: false};
  let hoverId = null; const holdIds = new Set();   // 指针停在上面 / 卡片打开着的封面：时间为它停住
  const era = {cur: null, fin: null, finWant: false, finShown: false, nextIdle: CFG.era.firstIdle, rotIdx: new Map(), pending: null, fx: {lens: [0, 0, 0, 0], static: 0, cmb: 0}};
  const sky = {list: [], byId: new Map(), cons: [], layoutRef: null, n: 0, data: null, dirty: true, first: true, pulse: [-9, -1e9], hover: null, colors: new Map(), pts: [], labels: []};
  let lastEmbers = [], ancWas = false;
  const STILL_T = 37;   // 合成静帧用的时钟；从静帧继续时从这里接着走，封面不会凭空消失
  const frameSeed = () => (frameN * 7.13) % 97;
  const interactive = () => !(still || frozen || !active || dead || reduced());

  function readLayout() {
    const L = opts.layout?.(); if (!L) return;
    V.layout = L; V.foeGoal = L.foe;
    if (!V.foe) V.foe = [...L.foe];
  }
  let frameSkipDpr = 1;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return false;
    // 手机上（窄屏、触摸）像素比再低一点：星空本来就柔，省下的显存让 iPhone 不容易把 WebGL 收回去
    V.dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(max-width:860px) and (pointer:coarse)').matches ? 1.25 : CFG.dprCap) / frameSkipDpr;
    const pw = Math.round(w * V.dpr), ph = Math.round(h * V.dpr);
    const changed = V.W !== w || V.H !== h;
    V.W = w; V.H = h; if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    readLayout(); if (changed) { bakeNebula(); dRef = null; }
    return true;
  }

  const busyNow = () => CFG.calm.hover && (inPanel || focusInPanel);   // 默认只认点击、滚轮、按键、触摸
  const quiet = () => recall && T < recall.until;
  const envAt = () => {
    const L = V.layout || {foe: [V.W / 2, V.H / 2], keepOut: []};
    return {W: V.W, H: V.H, foe: L.foe, keepOut: L.keepOut || [], narrow: !!L.narrow, far: FAR, lastEvent,
      // 播放、操作中、刚做完一轮、贴近或钻进时不出新封面
      suppress: still || saveData || playing || calm < .999 || quiet() || mode !== 'over' || revealT0 === null, kill: mode === 'close',
      avoid: opts.avoid?.(), ready: id => !!texs.get(id)?.ready};
  };
  const cue = (kind, info = {}) => opts.onCue?.(kind, {...info, W: V.W, H: V.H});

  /* ---------- 几何 ---------- */
  const rotV = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [c * v[0] - s * v[1], s * v[0] + c * v[1]]; };
  const discRadii = () => { const sh = V.layout?.keepOut?.find(k => k.behind && k.poly); if (!sh) return [V.W * .25, V.H * .2];
    const xs = sh.poly.map(p => p[0]), ys = sh.poly.map(p => p[1]); return [(Math.max(...xs) - Math.min(...xs)) / 2, (Math.max(...ys) - Math.min(...ys)) / 2]; };
  const phone = () => !!V.layout?.narrow;
  const toLocal = (cx, cy) => { const b = canvas.getBoundingClientRect(); return [cx - b.left, cy - b.top]; };
  // 某一片云在时刻 t 的样子；没有就返回 null
  function cloudAt(t, c, foe, cam, pushNow, rotNow) {
    const C = CFG.cloud, z = C.z[0] - CFG.speed * (t - c.t0) - pushNow;
    if (t < c.t0 || z <= C.z[1] || c.dropped || V.H < C.minStageH) return null;
    if (!c.X) {   // 第一次用到时定下它在世界里的位置：深度 6 时正好经过选定的方位
      const [rx, ry] = discRadii(), sp = C.spots[c.spot], target = [sp[0] * rx, sp[1] * ry], zRef = 6;
      const camRef = camAt(c.t0 + (C.z[0] - zRef) / CFG.speed, DRIFT);
      c.X = [target[0] * zRef + camRef[0], target[1] * zRef + camRef[1]]; c.rot0 = rotNow;
    }
    const R = C.R * (phone() ? C.phoneScale : 1), rel = rotV([(c.X[0] - cam[0]) / z, (c.X[1] - cam[1]) / z], rotNow - c.rot0);
    const part = c.partAt != null ? 1 - smoother(c.partAt, c.partAt + 2.6, RT) : 1;   // 被蓄力的大波冲散
    const fade = smoother(c.t0, c.t0 + C.fadeIn, t) * (1 - smoother(4.6, C.z[1], z)) * part;
    return {ctr: [foe[0] + rel[0], foe[1] + rel[1]], r: R / z, z, fade};
  }
  function activeCloud(t, foe, cam, pushNow, rotNow) {
    for (let i = 0; i < 64; i++) { const c = clouds(i); if (c.t0 > t) return null; const s = cloudAt(t, c, foe, cam, pushNow, rotNow); if (s && s.fade > .002) return {c, i, s}; }
    return null;
  }
  // 屏幕上一块空地：不压盘、不压曲目表和别的禁区、不压正在的封面。放不下返回 null
  function freeSpot(w, h) {
    const L = V.layout; if (!L) return null;
    const top = (L.headerBottom ?? 56) + 12, right = (L.narrow ? V.W : L.panelLeft) - 12;
    const covers = sch.state.slots.filter(s => s.scr).map(s => [s.scr.x - s.scr.w / 2 - 12, s.scr.y - s.scr.h / 2 - 12, s.scr.x + s.scr.w / 2 + 12, s.scr.y + s.scr.h / 2 + 12]);
    for (let i = 0; i < 80; i++) {
      const x = w / 2 + 12 + Math.random() * Math.max(1, right - w - 24), y = top + h / 2 + Math.random() * Math.max(1, V.H - top - h - 24);
      const r = [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
      if (r[2] > right || r[3] > V.H - 12) continue;
      if ((L.keepOut || []).some(sh => hits(r, sh))) continue;
      if (covers.some(c => c[0] < r[2] && c[2] > r[0] && c[1] < r[3] && c[3] > r[1])) continue;
      return [x, y];
    }
    return null;
  }
  // 盘边（r = 1.16 的那一圈）上，从消失点朝 dir 方向的那个点
  function rimPoint(dir) {
    const foe = V.foe || V.foeGoal, sh = V.layout?.keepOut?.find(k => k.behind && k.poly);
    if (!sh) return foe;
    for (let t = 0; t < 2000; t += 6) { const x = foe[0] + dir[0] * t, y = foe[1] + dir[1] * t; if (!hits([x, y, x, y], sh)) return [x, y]; }
    return foe;
  }

  /* ---------- 你的星空 ---------- */
  // 位置：年份个位 → 方位（和盘上的数字同一个方向），年代 → 离盘远近（越早越远，和盘一样外圈是早年）。
  // 沿这个方向从盘边往外走，找出没被挡住的一段，按年代放在这一段的某个比例上；放不下就转一点再试
  function layoutSky() {
    const L = V.layout; if (!L) return;
    sky.layoutRef = L; sky.dirty = true;
    const foe = L.foe, [rx, ry] = discRadii(), top = (L.headerBottom ?? 0) + SK.margin, right = (L.narrow ? V.W : L.panelLeft - 30) - SK.margin;
    const blocked = (x, y) => x < SK.margin || y < top || x > right || y > V.H - SK.margin ||
      (L.keepOut || []).some(sh => hits([x - 7, y - 7, x + 7, y + 7], sh));
    const placed = [];
    for (const st of sky.list) {
      st.pos = null;
      const base = (st.digit + .2 + .6 * hash01(st.id)) / 10 * TAU, f = .08 + .8 * Math.max(0, Math.min(1, (SPAN[1] - st.decade) / Math.max(10, SPAN[1] - SPAN[0]))) + (hash01(st.id + 'r') - .5) * .12;
      for (const off of [0, .2, -.2, .4, -.4, .65, -.65, .95, -.95, 1.3, -1.3, 1.8, -1.8, 2.4, -2.4, Math.PI]) {
        const a = base + off, dx = Math.sin(a) * rx, dy = -Math.cos(a) * ry;
        let t0 = null, t1 = null;
        for (let t = .9; t < 8; t += .025) { const x = foe[0] + dx * t, y = foe[1] + dy * t; if (x < 0 || y < 0 || x > V.W || y > V.H) break;
          const b = blocked(x, y); if (!b && t0 === null) t0 = t; if (b && t0 !== null) break; if (!b) t1 = t; }
        if (t0 === null || (t1 - t0) * Math.hypot(dx, dy) < 20) continue;
        let got = null;
        for (const k of [0, .07, -.07, .14, -.14, .22, -.22]) { const t = t0 + (t1 - t0) * Math.min(1, Math.max(0, f + k)), x = foe[0] + dx * t, y = foe[1] + dy * t;
          if (!placed.some(p => Math.hypot(p[0] - x, p[1] - y) < 15)) { got = [x, y]; break; } }
        if (got) { st.pos = got; placed.push(got); break; }
      }
    }
    // 星座：同一讲的星按方位排好，相邻的两颗离得不远就用一串小点连起来
    sky.pts = []; sky.labels = [];
    for (const con of sky.cons) {
      const ss = con.ids.map(id => sky.byId.get(id)).filter(s => s?.pos);
      if (ss.length < 2) continue;
      const ang = s => Math.atan2(s.pos[0] - foe[0], -(s.pos[1] - foe[1]));
      ss.sort((a, b) => ang(a) - ang(b));
      let walked = 0;
      for (let i = 0; i < ss.length; i++) {
        const a = ss[i], b = ss[(i + 1) % ss.length]; if (a === b || (i === ss.length - 1 && ss.length < 3)) continue;
        const gap = (((ang(b) - ang(a)) % TAU) + TAU) % TAU, len = Math.hypot(b.pos[0] - a.pos[0], b.pos[1] - a.pos[1]);
        if (gap > SK.maxGap * DEG || len > SK.maxSeg) continue;
        for (let d = 6; d < len - 6; d += SK.dotGap) {
          const k = d / len, x = a.pos[0] + (b.pos[0] - a.pos[0]) * k, y = a.pos[1] + (b.pos[1] - a.pos[1]) * k;
          sky.pts.push({x: x - foe[0], y: y - foe[1], t0: con.t0 == null ? -1e9 : con.t0 + (walked + d) / 170});
        }
        walked += len;
      }
      const cx = ss.reduce((s, x) => s + x.pos[0], 0) / ss.length, cy = ss.reduce((s, x) => s + x.pos[1], 0) / ss.length;
      const near = ss.reduce((m, s) => Math.hypot(s.pos[0] - cx, s.pos[1] - cy) < Math.hypot(m.pos[0] - cx, m.pos[1] - cy) ? s : m, ss[0]);
      sky.labels.push({id: con.id, text: con.label, rel: [near.pos[0] - foe[0], near.pos[1] - foe[1] - 16], t0: con.t0 == null ? -1e9 : con.t0 + walked / 170 + .4});
    }
  }
  function uploadSky() {
    const foe = sky.layoutRef?.foe; if (!foe) return;
    const stars_ = sky.list.filter(s => s.pos), n = stars_.length + sky.pts.length, a = new Float32Array(n * 12);
    let i = 0;
    for (const s of stars_) {
      const col = sky.colors.get(s.id) || s.col0;
      a.set([s.pos[0] - foe[0], s.pos[1] - foe[1], s.mag, 0, ...col, s.due, s.full ? 1 : 0, s.t0 ?? -1e9, sky.hover === s.id ? 1 : 0, s.digit], i * 12); i++;
    }
    for (const p of sky.pts) { a.set([p.x, p.y, .5, 1, .86, .88, .96, 0, 0, p.t0, 0, -9], i * 12); i++; }
    gl.bindBuffer(gl.ARRAY_BUFFER, fixBuf); gl.bufferData(gl.ARRAY_BUFFER, a, gl.DYNAMIC_DRAW);
    sky.n = n; sky.dirty = false;
  }
  // 恒星的颜色取它封面的主色：空闲时一张一张地读小图
  let colorBusy = false;
  function fetchColors() {
    if (colorBusy || dead || saveData) return;
    const s = sky.list.find(x => !sky.colors.has(x.id) && x.url && !x.colorFailed); if (!s) return;
    colorBusy = true; const img = new Image(); img.decoding = 'async'; img.src = s.url;
    img.decode().then(() => { if (dead) return; const g = glowOf(img), mx = Math.max(...g); sky.colors.set(s.id, g.map(c => .62 + .38 * c / mx)); sky.dirty = true; })
      .catch(() => { s.colorFailed = true; }).finally(() => { colorBusy = false; setTimeout(fetchColors, 120); });
  }

  /* ---------- 水波与连锁 ---------- */
  function addRipple(x, y, s, gen = 0, kind = 'tap') {
    const r = {x, y, t0: RT, s, gen, id: ++ripSeq, touched: new Set()};
    // 两道波相遇：两个环的半径之和等于两个落点的距离时，在连线上亮一下、响一个和声（只算第 0、1 代）
    if (gen < 2) for (const o of rips) { if (o.gen > 1) continue;
      const d = Math.hypot(o.x - x, o.y - y), ao = RT - o.t0, t = (d / RP.speed - ao) / 2;
      if (t > .15 && t < 3 && d > 60) { const ro = RP.speed * (ao + t), k = ro / d; meets.push({at: RT + t, x: o.x + (x - o.x) * k, y: o.y + (y - o.y) * k}); } }
    rips.push(r); if (rips.length > RP.max) rips.shift();
    opts.onRipple?.({x, y, s, gen, kind});
    return r;
  }

  const skip = new Set();   // 调试：bench 时临时关掉某一层
  /* ---------- 画 ---------- */
  function draw(slots, past) {
    const foe = V.foe || V.foeGoal, L = V.layout || {};
    V.E = extentOf(V.W, V.H, foe); const counts = starCounts(stars, V.E);
    const rt = revealT0 === null ? 0 : (still ? 99 : (performance.now() - revealT0) / 1000);
    const rv = k => { const [a, b] = CFG.reveal[k]; return Math.min(1, Math.max(0, (rt - a) / (b - a))); };
    const S = CFG.sleep, sleepDim = 1 - (1 - S.dim) * Math.max(0, (1 - pace) / (1 - S.pace));
    const lk = still ? null : look, mask = [L.headerBottom ?? 56, L.panelLeft ?? V.W + 200, .22, expo * sleepDim * (lk?.pump || 1)];
    const cam = camAt(T, DRIFT && !still), camZ = travel + push;
    // 暗云
    const ac = still ? null : activeCloud(T, foe, cam, push, rot);
    if (ac && cloudBaked !== ac.i) { bakeTo(cloudTex, 256, 256, P.bake, u => gl.uniform1f(u.uSeed, ac.c.seed)); cloudBaked = ac.i; }
    const occl = (phone() ? CFG.cloud.occlPhone : CFG.cloud.occl) * (ac ? ac.s.fade * rv('nebula') : 0);
    const cl = ac ? [...ac.s.ctr, ac.s.r, ac.s.z] : [0, 0, 1, 1e9];
    V.cloud = ac ? {ctr: ac.s.ctr, r: ac.s.r, c: ac.c} : null;
    // 水波：过了一生的拿掉
    for (let i = rips.length - 1; i >= 0; i--) if (RT - rips[i].t0 > RP.life || RT < rips[i].t0) rips.splice(i, 1);
    ripU.fill(0); for (let i = 0; i < RP.max; i++) { const r = rips[i]; ripU.set(r && !still ? [r.x, r.y, RT - r.t0, r.s] : [0, 0, -1, 0], i * 4); }
    // 尾流
    for (let i = wakes.length - 1; i >= 0; i--) if (RT - wakes[i].t0 > WK.life) wakes.splice(i, 1);
    wakeU.fill(0); wakeVU.fill(0);
    for (let i = 0; i < WK.n; i++) { const w = wakes[i]; wakeU.set(w && !still ? [w.x, w.y, RT - w.t0, w.s] : [0, 0, -1, 0], i * 4); if (w) wakeVU.set([w.vx, w.vy, 0, 0], i * 4); }
    // 漩涡：松手后 relax 秒里放开
    const vr = vort.on ? 1 : 1 - smoother(0, VX.relax, RT - vort.relT), vu = still ? [0, 0, 0, 0] : [vort.x, vort.y, (vort.on ? vort.charge : vort.relCharge) * vr, vort.ang * vr];
    // 天文事件这一帧的样子
    const eraFrames = still ? [] : [era.cur, era.fin].filter(Boolean).map(e => { const age = RT - e.t0, f = e.inst.frame(age) || {};
      const k = e.killAt != null ? 1 - smoother(e.killAt, e.killAt + .7, RT) : 1; return {e, f, k}; });
    const fx = {lens: [0, 0, 0, 0], static: 0, cmb: 0};
    for (const {f, k} of eraFrames) { if (f.fx?.lens) fx.lens = [f.fx.lens[0], f.fx.lens[1], f.fx.lens[2], f.fx.lens[3] * k]; if (f.fx?.static) fx.static = f.fx.static * k; if (f.fx?.cmb) fx.cmb = f.fx.cmb * k; }
    const setCommon = u => { gl.uniform2f(u.uView, V.W, V.H); gl.uniform4f(u.uMask, ...mask);
      if (u['uRip[0]']) gl.uniform4fv(u['uRip[0]'], ripU);
      if (u.uVort) gl.uniform4f(u.uVort, ...vu);
      if (u['uWake[0]']) { gl.uniform4fv(u['uWake[0]'], wakeU); gl.uniform4fv(u['uWakeV[0]'], wakeVU); }
      if (u.uWakeN) gl.uniform1i(u.uWakeN, still ? 0 : wakes.length);
      if (u.uLens) gl.uniform4f(u.uLens, ...fx.lens);
      if (u.uCloud) { gl.uniform4f(u.uCloud, ...cl); gl.uniform2f(u.uCloudA, occl, CFG.cloud.rim); gl.uniform1i(u.uCloudTex, 1); } };
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, cloudTex); gl.activeTexture(gl.TEXTURE0);
    const pp = lk?.post, usePost = !!pp && !skip.has('post') && (Object.values(pp).some(v => v > .01) || Math.abs(lk.sat - 1) > .01);
    if (usePost) gl.bindFramebuffer(gl.FRAMEBUFFER, postTarget());
    gl.viewport(0, 0, canvas.width, canvas.height);
    // 天
    gl.disable(gl.BLEND); gl.useProgram(P.sky.p); setCommon(P.sky.u);
    const N = CFG.nebula, br = i => 1 + (still ? 0 : N.amp * Math.sin(6.2831853 * T / N.breathe[i] + i * 2.1));
    gl.uniform3f(P.sky.u.uNebI, N.warm * br(0), N.cool * br(1), rv('nebula'));
    gl.uniform1f(P.sky.u.uSeed, frameSeed()); gl.uniform3f(P.sky.u.uFx, fx.static, fx.cmb, RT);
    { const u = P.sky.u; gl.uniform4f(u.uMood, lk?.moodMode || 0, lk?.moodAmt || 0, RT, lk?.beat || 0); gl.uniform3f(u.uMoodA, ...(lk?.A || [1, 1, 1])); gl.uniform3f(u.uMoodB, ...(lk?.B || [1, 1, 1]));
      gl.uniform2f(u.uFoeS, ...foe); gl.uniform4f(u.uStaff, lk?.staff || 0, lk?.staffGap || 12, lk?.staffY || 100, RT); }
    gl.bindTexture(gl.TEXTURE_2D, nebTex); gl.uniform1i(P.sky.u.uNeb, 0);
    gl.bindVertexArray(vaoTri); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.BLEND);
    if (occl > 0 && !skip.has('cloud')) {   // 暗云把身后的天压暗：dst × (1 − 浓度)，再加一道暖边
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(P.cloud.p); const u = P.cloud.u; setCommon(u);
      gl.uniform2f(u.uCtr, cl[0], cl[1]); gl.uniform2f(u.uHalf, cl[2], cl[2]); gl.uniform1f(u.uRoll, 0); gl.uniform1f(u.uFade, ac.s.fade); gl.uniform1f(u.uRipK, 0);
      gl.bindVertexArray(vaoQuad); gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    // 星：叠加发光
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(P.star.p); const us = P.star.u; setCommon(us);
    gl.uniform1f(us.uC, camZ); gl.uniform1f(us.uT, T); gl.uniform1f(us.uDpr, V.dpr); gl.uniform1f(us.uStill, still ? 1 : 0);
    gl.uniform2f(us.uFoe, ...foe); gl.uniform2f(us.uE, ...V.E); gl.uniform2f(us.uCam, ...cam); gl.uniform2f(us.uV, CFG.speed * pace * (lk?.flowMul || 1), CFG.maxPxPerSec);
    gl.uniform1f(us.uRot, rot); gl.uniform1f(us.uCalm, calmVis);
    gl.uniform4f(us.uReact, lk?.starPulse || 0, lk?.twinkle || 0, lk?.twinkleSeed || 0, lk?.bend || 0);
    gl.uniform4f(us.uStaffS, lk?.staff || 0, lk?.staffGap || 12, lk?.staffY || 100, 0);
    const F = CFG.focus, fClose = Math.min(1, focus), fDive = Math.max(0, focus - 1);
    const drawKind = (kind, trailN = 0) => { const k = CFG.stars[kind];
      gl.uniform2f(us.uZ, ...k.z); gl.uniform3f(us.uK, KINDS.indexOf(kind), k.size, rv(kind));
      gl.uniform3f(us.uN, k.near[0], k.near[1], k.fadeNear); gl.uniform1f(us.uCool, k.cool || 0);
      const def = F.close[kind] * fClose + (F.dive - F.close[kind]) * fDive; gl.uniform1f(us.uDef, trailN ? def * .3 : def);
      gl.uniform1i(us.uTrailN, trailN); gl.bindVertexArray(vao[kind]);
      if (trailN) gl.drawArraysInstanced(gl.POINTS, 0, counts[kind], trailN); else gl.drawArrays(gl.POINTS, 0, counts[kind]); };
    if (!skip.has('stars')) { drawKind('dust'); drawKind('star'); drawKind('bright'); }
    // 星轨（听歌时的长曝光，或甩盘时的弧）
    const tr = trailNow();
    if (tr.alpha > .003 && Math.abs(tr.A) > .0005 && !skip.has('trail')) {
      gl.uniform3f(us.uTrail, tr.A, tr.alpha * CFG.trail.alpha, CFG.trail.minMag);
      drawKind('star', CFG.trail.n); drawKind('bright', CFG.trail.n);
    }
    // 你的星空
    if (sky.layoutRef !== V.layout && V.layout) layoutSky();
    if (sky.dirty) uploadSky();
    if (sky.n && !skip.has('sky')) {
      gl.useProgram(P.fix.p); const uf = P.fix.u; setCommon(uf);
      gl.uniform2f(uf.uFoe, ...foe); gl.uniform1f(uf.uRot, rot); gl.uniform1f(uf.uT, still ? 1e4 : RT); gl.uniform1f(uf.uDpr, V.dpr);
      gl.uniform1f(uf.uA, rv('bright') * (1 - .55 * fClose) * (1 - fDive)); gl.uniform2f(uf.uPulse, ...sky.pulse);
      gl.bindVertexArray(vaoFix); gl.drawArrays(gl.POINTS, 0, sky.n);
    }
    // 余光星，和天文事件里的小点
    gl.useProgram(P.ember.p); const ue = P.ember.u; setCommon(ue); gl.bindVertexArray(vaoTri); gl.uniform1f(ue.uDispK, 1);
    lastEmbers = embersAt(T, past, foe, cam);
    for (const em of lastEmbers) {
      gl.uniform2f(ue.uP, ...em.p); gl.uniform1f(ue.uPx, CFG.ember.size * 4 * V.dpr * (1 + .6 * em.relit));
      gl.uniform3f(ue.uCol, ...em.col); gl.uniform1f(ue.uA, em.a * expo * (em.z > cl[3] ? 1 - occl * 0.9 : 1));
      gl.drawArrays(gl.POINTS, 0, 1);
    }
    if (vort.on || RT - vort.relT < .5) {   // 漩涡中心那颗临时的星：越蓄越亮，松手时一闪就没
      const c = vort.on ? vort.charge : vort.relCharge * (1 - smoother(0, .5, RT - vort.relT)), fl = 1 + .12 * Math.sin(RT * 23);
      gl.uniform2f(ue.uP, vort.x, vort.y); gl.uniform1f(ue.uPx, (7 + 16 * c) * V.dpr * fl); gl.uniform1f(ue.uDispK, 0);
      gl.uniform3f(ue.uCol, 1, .93, .8); gl.uniform1f(ue.uA, (.25 + .9 * c) * expo); gl.drawArrays(gl.POINTS, 0, 1); gl.uniform1f(ue.uDispK, 1);
    }
    for (const {f, k} of eraFrames) for (const p of f.points || []) {
      gl.uniform2f(ue.uP, ...p.p); gl.uniform1f(ue.uPx, p.px * 4 * V.dpr); gl.uniform3f(ue.uCol, ...p.col); gl.uniform1f(ue.uA, p.a * k * expo); gl.drawArrays(gl.POINTS, 0, 1);
    }
    // 听歌时的粒子
    if (lk?.count && !skip.has('particles')) {
      gl.useProgram(P.part.p); setCommon(P.part.u); gl.uniform1f(P.part.u.uDpr, V.dpr);
      gl.bindBuffer(gl.ARRAY_BUFFER, partBuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, lk.particles.subarray(0, lk.count * 8));
      gl.bindVertexArray(vaoPart); gl.drawArrays(gl.POINTS, 0, lk.count);
    }
    // 天文事件：彗星、极光、星系、天体
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (eraFrames.some(x => x.f.quads?.length) && !skip.has('era')) {
      gl.useProgram(P.event.p); const uv = P.event.u; setCommon(uv); gl.bindVertexArray(vaoQuad); gl.uniform1f(uv.uTime, RT);
      for (const {f, k} of eraFrames) for (const q of f.quads || []) {
        gl.uniform2f(uv.uCtr, ...q.ctr); gl.uniform2f(uv.uHalf, ...q.half); gl.uniform1f(uv.uRoll, q.roll || 0); gl.uniform1f(uv.uRipK, q.ripK ?? 1);
        gl.uniform1i(uv.uKind, q.kind); gl.uniform4f(uv.uP, ...q.p); gl.uniform3f(uv.uCol, ...q.col); gl.uniform3f(uv.uCol2, ...(q.col2 || [1, 1, 1]));
        gl.uniform2f(uv.uDir, ...(q.dir || [-.6, -.8])); gl.uniform1f(uv.uA, q.a * k * expo);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    }
    // 封面：由远到近
    gl.useProgram(P.cover.p); const uc = P.cover.u; setCommon(uc); gl.bindVertexArray(vaoQuad); gl.uniform1i(uc.uTex, 0); gl.uniform1f(uc.uRipK, 1);
    for (const s of skip.has('covers') ? [] : [...slots].sort((a, b) => b.z - a.z)) {
      const e = texs.get(s.item.id); if (!e?.ready) { s.scr = null; continue; } e.used = performance.now();
      let dev = still ? 1 : coverDev(s, T); const out = still ? 0 : coverOut(s, T);
      if (s.shook != null && !still) dev += (1 - dev) * smoother(s.shook, s.shook + CFG.chain.shake, T);   // 被晃到：一下显影完
      if (out >= .999 || dev <= 0) { s.scr = null; continue; }
      const k = coverScale(s, T, push) * (1 - .08 * out), zNow = s.z / k, w = s.dims[0] * k, h = s.dims[1] * k, g = s.glow ? 1.6 : 1.05;
      // 封面和星在同一个相机里：停留中点时正好在排好的位置，前后随相机横移挪一点（≤ 十来个像素），听歌时随天一起转
      const c0 = camAt(s.t0 + coverLife(s) / 2, DRIFT && !still), kz = k / s.z, ra = rot - (s.rot0 || 0);
      const rel = rotV([s.q[0] * k + (c0[0] - cam[0]) * kz, s.q[1] * k + (c0[1] - cam[1]) * kz], ra);
      const lift = s.lift || 0, roll = s.roll + s.rollV * (T - s.t0) / 18 + ra;
      s.scr = {x: foe[0] + rel[0], y: foe[1] + rel[1], w, h, roll, vis: (1 - out) * Math.min(1, dev * 1.6)};
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.uniform2f(uc.uCtr, s.scr.x, s.scr.y);
      gl.uniform2f(uc.uHalf, w / 2 * g + 2, h / 2 * g + 2); gl.uniform2f(uc.uDim, w, h);
      gl.uniform1f(uc.uRoll, roll);
      gl.uniform1f(uc.uRound, s.item.shape === 'round' ? 1 : 0);
      gl.uniform1f(uc.uA, s.alpha); gl.uniform1f(uc.uDev, dev); gl.uniform1f(uc.uOut, out); gl.uniform1f(uc.uLift, lift);
      gl.uniform1f(uc.uCap, s.cls === 'far' && FAR === 'hi' && !s.recalled && !s.shook ? .45 : 1);
      gl.uniform1f(uc.uBlur, s.blur * (1 - lift) + 1.5 * out + 2 * fClose + 1.5 * fDive);
      gl.uniform1f(uc.uSat, s.sat); gl.uniform1f(uc.uBright, s.cls === 'near' ? .86 : .92);
      gl.uniform1f(uc.uGlow, s.glow); gl.uniform3f(uc.uGlowC, ...e.glow); gl.uniform1f(uc.uOcc, zNow > cl[3] ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.BLEND);
    if (usePost) {   // 「年代」：冲洗到屏幕上
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
      const u = P.post.u; gl.useProgram(P.post.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, postTex); gl.uniform1i(u.uScene, 0);
      gl.uniform2f(u.uRes, canvas.width, canvas.height); gl.uniform1f(u.uT, RT); gl.uniform1f(u.uWarp, pp.warp);
      gl.uniform4f(u.uG1, pp.mono, pp.sepia, pp.warm, lk.sat); gl.uniform4f(u.uG2, pp.grain, reduced() ? 0 : pp.flicker, pp.scratch, pp.vignette); gl.uniform4f(u.uG3, pp.scan, pp.chroma, pp.halation, pp.hue);
      gl.bindVertexArray(vaoTri); gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindVertexArray(null);
    if (!still) chain(slots, eraFrames);
    anchors(slots, eraFrames);
    frameN++;
  }

  // 波碰到东西：还在显影的封面一下显影完（响一个这张封面年代的音）；余光星复燃并放出一道小波（只传一代）
  function chain(slots) {
    const band = CFG.chain.band;
    for (const r of rips) {
      const rho = RP.speed * (RT - r.t0); if (rho < 4 || r.gen > 1) continue;
      for (const s of slots) { if (!s.scr || s.scr.vis < .15 || r.touched.has(s)) continue;
        const d = Math.hypot(s.scr.x - r.x, s.scr.y - r.y), reach = band + Math.min(s.scr.w, s.scr.h) * .35;
        if (Math.abs(d - rho) < reach) { r.touched.add(s); if (s.shook == null && coverDev(s, T) < 1) s.shook = T;
          cue('cover', {x: s.scr.x, y: s.scr.y, decade: s.item.decade, gen: r.gen}); } }
      if (r.gen > 0) continue;
      for (const em of lastEmbers) { if (r.touched.has(em.s)) continue;
        const d = Math.hypot(em.p[0] - r.x, em.p[1] - r.y);
        if (Math.abs(d - rho) < band) { r.touched.add(em.s); em.s.relitAt = RT; addRipple(em.p[0], em.p[1], CFG.chain.ember, 1, 'ember'); cue('ember', {x: em.p[0], y: em.p[1]}); } }
      for (const st of sky.list) { if (!st.pos || r.touched.has(st)) continue;   // 你的恒星：被波碰到亮一下、响一声（不再起波）
        const p = skyScreen(st), d = Math.hypot(p[0] - r.x, p[1] - r.y);
        if (Math.abs(d - rho) < band) { r.touched.add(st); if (r.touched.size < 6) cue('star', {x: p[0], y: p[1], decade: st.decade, gen: 1}); } }
    }
    // 尾流划过还在显影的封面：一样算晃到
    const w = wakes[wakes.length - 1];
    if (w && RT - w.t0 < .3) for (const s of slots) if (s.scr && s.shook == null && Math.hypot(s.scr.x - w.x, s.scr.y - w.y) < Math.max(s.scr.w, s.scr.h) * .7) s.shook = T;
  }
  const skyScreen = st => { const foe = V.foe || V.foeGoal, f0 = sky.layoutRef?.foe || foe, r = rotV([st.pos[0] - f0[0], st.pos[1] - f0[1]], rot); return [foe[0] + r[0], foe[1] + r[1]]; };

  // 界面要跟着走的位置：指针停着的那张封面 / 那颗星、天文事件的说明、星座的名字
  function anchors(slots, eraFrames) {
    const a = {};
    const hid = hoverId || [...holdIds][0];
    if (hid) { const s = slots.find(x => x.item.id === hid && x.scr); if (s) a.hover = {id: hid, kind: 'cover', x: s.scr.x, y: s.scr.y, top: s.scr.y - s.scr.h / 2, bottom: s.scr.y + s.scr.h / 2, w: s.scr.w};
      else { const st = sky.byId.get(hid); if (st?.pos) { const p = skyScreen(st); a.hover = {id: hid, kind: 'star', x: p[0], y: p[1], top: p[1] - 8, bottom: p[1] + 8, w: 16}; }
        else { const em = lastEmbers.find(e => e.s.item.id === hid); if (em) a.hover = {id: hid, kind: 'ember', x: em.p[0], y: em.p[1], top: em.p[1] - 8, bottom: em.p[1] + 8, w: 16}; } } }
    const ef = eraFrames.find(x => x.e === era.cur) || eraFrames.find(x => x.e === era.fin);
    if (ef?.f.anchor) a.era = {id: ef.e.def.id, label: ef.e.def.label, x: ef.f.anchor[0], y: ef.f.anchor[1], a: (ef.f.a ?? 1) * ef.k};
    if (sky.labels.length && !still) { const foe = V.foe || V.foeGoal;
      a.labels = sky.labels.map(l => { const r = rotV(l.rel, rot); return {id: l.id, text: l.text, x: foe[0] + r[0], y: foe[1] + r[1], a: smoother(l.t0, l.t0 + 1, RT) * (1 - focus * .9)}; }); }
    else if (sky.labels.length) { const foe = V.foe || V.foeGoal; a.labels = sky.labels.map(l => ({id: l.id, text: l.text, x: foe[0] + l.rel[0], y: foe[1] + l.rel[1], a: 1})); }
    const any = a.hover || a.era || a.labels;
    if (any || ancWas) opts.onAnchors?.(a);
    ancWas = !!any;
  }

  // 余光星：走完一生的封面，在隐去过半时于中心留一颗星，跟着天空往外漂；最多两颗
  function embersAt(t, past, foe, cam) {
    const E = CFG.ember, out = [];
    for (const s of past || []) {
      const tS = s.t0 + s.dur.in + s.dur.hold + s.dur.out * .5, age = t - tS;
      if (age < 0 || age > E.life || out.length >= E.max) continue;
      const e = texs.get(s.item.id); if (!e?.ready) continue;
      if (!s.emb) {   // 生成时的世界位置（只算一次）
        const k = coverScale(s, tS), zS = s.z / k, c0 = camAt(s.t0 + coverLife(s) / 2, DRIFT), cS = camAt(tS, DRIFT), kz = k / s.z;
        const rel = [s.q[0] * k + (c0[0] - cS[0]) * kz, s.q[1] * k + (c0[1] - cS[1]) * kz];
        s.emb = {X: [rel[0] * zS + cS[0], rel[1] * zS + cS[1]], zS, tS, push0: push, rot0: s.rot0 || 0};
      }
      const z = s.emb.zS - CFG.speed * age - (push - s.emb.push0); if (z < .8) continue;
      const rel = rotV([(s.emb.X[0] - cam[0]) / z, (s.emb.X[1] - cam[1]) / z], rot - s.emb.rot0);
      const relit = s.relitAt != null ? Math.exp(-(RT - s.relitAt) / 2.2) : 0;   // 被波碰到：复燃
      const a = Math.max(smoother(0, 1.2, age) * (1 - smoother(3, E.life, age)) ** 1.5 * .8, relit * .95);
      const mx = Math.max(...e.glow), col = e.glow.map(c => .55 + .45 * c / mx);
      out.push({p: [foe[0] + rel[0], foe[1] + rel[1]], a: a * (V.layout ? 1 : 0), col, z, s, relit});
    }
    return out;
  }

  function trailNow() {
    if (still) return {A: 0, alpha: 0};
    if (spin.alpha > .02) return {A: spin.A, alpha: spin.alpha};   // 甩盘的弧
    const A = trail.start == null ? 0 : Math.min(CFG.trail.cap * DEG, rot - trail.start);
    const alpha = trail.start == null ? 0 : playing ? 1 : 1 - smoother(0, CFG.trail.fade, T - (trail.fadeT0 ?? T));
    if (!playing && alpha <= 0) trail.start = null;
    return {A, alpha};
  }

  /* ---------- 天文年表 ---------- */
  function eraCtx() {
    const L = V.layout || {}, foe = V.foe || V.foeGoal, [rx, ry] = discRadii();
    return {W: V.W, H: V.H, foe, rx, ry, top: (L.headerBottom ?? 56) + 10, right: L.narrow ? V.W : (L.panelLeft ?? V.W) - 30, spot: freeSpot, rim: rimPoint, r: Math.random};
  }
  function startEra(def, slot = 'cur') {
    const inst = def.make(eraCtx()); if (!inst) return false;
    era[slot] = {def, inst, t0: RT, cueI: 0, killAt: null};
    if (slot === 'cur') { lastEvent = T; opts.onEra?.(def); }
    cue('era', {id: def.id, sound: def.sound});
    return true;
  }
  function stepEra() {
    for (const slot of ['cur', 'fin']) {
      const e = era[slot]; if (!e) continue;
      const age = RT - e.t0, cues = e.inst.cues || [];
      while (e.cueI < cues.length && cues[e.cueI].at <= age) { const c = cues[e.cueI++];
        if (c.ripple) { addRipple(c.ripple[0], c.ripple[1], .7, 1, 'echo'); }
        cue('era-' + c.kind, {...c, id: e.def.id}); }
      if (age > e.def.dur || (e.killAt != null && RT > e.killAt + .7)) { era[slot] = null; if (slot === 'cur') opts.onEra?.(null); }
    }
    if (era.pending && !era.cur) { const d = era.pending; era.pending = null; startEra(d); }
    // 终章：所有歌都刻满。露出盘面几秒后，盘后升起地球
    if (era.finWant && !era.fin && !era.finShown && revealT0 !== null && mode === 'over' && (performance.now() - revealT0) / 1000 > 4) { era.finShown = startEra(FINALE, 'fin'); }
    if (!era.finWant && era.fin) era.fin.killAt ??= RT;
    // 空闲时偶尔轮到一件
    if (!era.cur && RT >= era.nextIdle) {
      if (calm >= .999 && !playing && mode === 'over' && !quiet() && pace > .9 && T - lastEvent >= CFG.calm.gap && revealT0 !== null) {
        const pool = ERAS.filter(x => x.id !== era.lastIdle), def = pool[Math.floor(Math.random() * pool.length)];
        if (startEra(def)) era.lastIdle = def.id;
        era.nextIdle = RT + CFG.era.idle[0] + Math.random() * (CFG.era.idle[1] - CFG.era.idle[0]);
      } else era.nextIdle = RT + 3;
    }
  }

  /* ---------- 推进 ---------- */
  function tick(force) {
    if (!force && T - lastTick < .25) return;
    lastTick = T; readLayout();
    const env = envAt(), slots = sch.tick(T, env);
    if (sch.state.born) { sch.state.born.rot0 = rot; lastEvent = T; }
    // 暗云出生：有人在操作、刚做完一轮，就把这一片丢掉；离上一个事件不到 4 s 就往后挪一点
    for (let i = 0; i < 64; i++) { const c = clouds(i); if (c.t0 > T) break; if (c.born || c.dropped) continue;
      if (T - c.t0 > 2) { c.born = true; continue; }   // 打开页面前就出发的那片
      if (calm < .999 || quiet()) c.dropped = true; else if (T - lastEvent < CFG.calm.gap) c.t0 = lastEvent + CFG.calm.gap; else { c.born = true; lastEvent = T; } }
    const dirOf = v => typeof v === 'function' ? v() : v;   // 方向可以到放的时候才算（盘镜头那时已经停稳）
    const env2 = {...env, suppress: false, kill: false, avoid: null};
    // 学会的先被想起：等刻纹走完，沿它年份尾数的辐线放一张；放不下就放在两个数字中间
    if (recall && !recall.done && T >= recall.at) {
      for (const c of recall.cands.slice(0, 4)) loadTex(c.id);
      const waiting = recall.cands.slice(0, 4).some(c => { const e = texs.get(c.id); return e && !e.ready && !e.failed; }) && T < recall.at + 3;
      if (!waiting) {
        let s = null;
        for (const c of recall.cands) { const item = byId.get(c.id), dir = dirOf(c.dir); if (!item || !dir || !texs.get(c.id)?.ready) continue; s = sch.force(item, T, env2, dir, CFG.recall.hold); if (s) break; }
        // 一首都放不下：进步最多的那首放在两个数字之间的中线上（从离它的数字最近的中线开始试）
        if (!s && recall.cands[0]) { const c = recall.cands[0], item = byId.get(c.id);
          if (item && texs.get(c.id)?.ready) for (const mid of [].concat(dirOf(c.mid) || [])) { if (mid && (s = sch.force(item, T, env2, mid, CFG.recall.hold))) break; } }
        if (s) { s.rot0 = rot; lastEvent = T; }
        recall.done = true;
      }
    }
    // 数字键 / 冲开的暗云：指定的几首，沿指定方向放
    for (const m of summons) {
      if (m.done || RT < m.at) continue;
      for (const c of m.cands.slice(0, m.n + 2)) loadTex(c.id);
      const waiting = m.cands.slice(0, m.n + 2).some(c => { const e = texs.get(c.id); return e && !e.ready && !e.failed; }) && RT < m.at + 3;
      if (waiting) continue;
      for (const c of m.cands) { if (m.placed >= m.n) break; const item = byId.get(c.id), dir = dirOf(c.dir); if (!item || !dir || !texs.get(c.id)?.ready) continue;
        let s = sch.force(item, T, env2, dir, 2, c.from ?? 60);
        for (const mid of [].concat(dirOf(c.mid) || [])) { if (s) break; if (mid) s = sch.force(item, T, env2, mid, 2); }
        if (!s && !c.strict) s = sch.force(item, T, env2, null, 2);   // 那个方向被曲目表挡住了：就放在天上别处
        if (s) { s.rot0 = rot; s.shook = T - CFG.chain.shake * .4; m.placed++; lastEvent = T; } }
      m.done = true;
    }
    for (let i = summons.length - 1; i >= 0; i--) if (summons[i].done) summons.splice(i, 1);
    for (const s of slots) loadTex(s.item.id);
    if (!saveData) for (const id of sch.upcoming(2)) loadTex(id);
  }

  // 每帧推进 dt 秒：时钟、曝光、推近、跟焦、星轨的转动、避让、睡与醒、漩涡、甩盘、天文事件
  function advance(dt) {
    RT += dt;
    // 很久不碰：慢慢睡着（星流变慢、变暗）；一碰就醒
    const SL = CFG.sleep, sleepy = RT - lastTouch > SL.after && !playing && mode === 'over' && !vort.on;
    const pg = sleepy ? SL.pace : 1; pace += (pg - pace) * (1 - Math.exp(-dt * 3 / (pg < pace ? SL.into : SL.wake)));
    const dT = dt * pace; T += dT;
    // 听歌：先听，再按三条效果链算出这一帧的样子
    const fxS = opts.fx?.();
    if (fxS && !still) {
      F0 = opts.listener?.update(dt, RT, fxS.rhythm.sens) || null;
      const L = V.layout || {}, foe = V.foe || V.foeGoal, [rx, ry] = discRadii(), top = (L.headerBottom ?? 56) + 8, right = L.narrow ? V.W : (L.panelLeft ?? V.W) - 30;
      const room = Math.max(0, foe[1] - ry - top), below = Math.max(0, V.H - foe[1] - ry - 30);
      const up = room >= below || room > 110, span = up ? room : below, staffGap = Math.max(7, Math.min(20, span / 7.5)), staffY = up ? top + room * .5 : foe[1] + ry + 20 + below * .5;
      look = react.update(dt, RT, F0, fxS, {W: V.W, H: V.H, foe, rx, ry, top, right, staffY, staffGap,
        rimAt: a => [foe[0] + Math.sin(a) * rx * 1.04, foe[1] - Math.cos(a) * ry * 1.04]}, playing);
      look.staffY = staffY; look.staffGap = staffGap;
      for (const r of look.ripples) addRipple(r.x, r.y, r.s, 1, 'beat');
      if (look.swirl > .01) rot += dt * look.swirl * (.03 + .3 * look.beat);   // 舞池：重拍时整片天转得快一点
    }
    travel += CFG.speed * dT * (look.flowMul || 1);
    // 时间为它停住：指针停着的、卡片打开着的封面，年龄不长
    for (const s of sch.state.slots) if (s.item.id === hoverId || holdIds.has(s.item.id)) { s.t0 += dT; if (s.killAt != null) s.killAt += dT; s.shook ??= T; }
    for (const s of sch.state.slots) { const want = s.item.id === hoverId || holdIds.has(s.item.id) ? 1 : 0; s.lift = (s.lift || 0) + (want - (s.lift || 0)) * (1 - Math.exp(-dt * 7)); }
    const ke = 1 - Math.exp(-dt * (opts.camRate?.() || 2.2)); expo += (expoGoal - expo) * ke;
    focus += ((mode === 'close' ? 1 : mode === 'dive' ? 2 : 0) - focus) * ke;
    // 推近：盘镜头离盘心近了多少，宇宙的相机就前进它的 0.15 倍。
    // 速度有上限（深度 4.5、离消失点 400 px 的星 ≤40 px/s，钻进 ≤60），起步和停下都是平滑的，没有速度阶跃
    const d = opts.camDist?.();
    if (d != null) { if (mode === 'over') dRef = Math.max(dRef ?? d, d); pushGoal = dRef == null ? 0 : CFG.push * Math.max(0, dRef - d); }
    const vmax = (mode === 'dive' ? 60 : 40) * 4.5 / 400, vGoal = Math.max(-vmax, Math.min(vmax, (pushGoal - push) * 5));
    pushV += (vGoal - pushV) * (1 - Math.exp(-dt * 9)); push += pushV * dt;
    if (playing) rot += CFG.trail.rate * DEG * dT;
    // 甩盘：松手后天带着惯性继续转；转得快时拉出弧，停下后弧原地褪去
    const SP = CFG.spin;
    if (!spin.drag) { rot += spin.v * dt; spin.v *= Math.exp(-dt * SP.decay); }
    const sv = Math.abs(spin.v);
    if (sv > .05) { spin.A = spin.v * SP.arc; spin.alpha = Math.min(1, spin.alpha + dt * 4, sv / .3); spin.peak = Math.max(spin.peak, sv); }
    else { spin.alpha *= Math.exp(-dt * 3 / SP.fade); if (spin.peak > .3) { cue('spinEnd', {v: spin.peak}); spin.peak = 0; } }
    // 漩涡：蓄力、越转越快
    if (vort.on) { const age = RT - vort.t0; vort.charge = Math.min(1, age / VX.full); vort.ang = Math.min(VX.maxTurn, vort.ang + dt * (VX.spin[0] + (VX.spin[1] - VX.spin[0]) * vort.charge)); }
    const now = performance.now(); if (busyNow()) lastBusy = now;
    const idle = (now - lastBusy) / 1000, Cc = CFG.calm;
    calm = smoother(Cc.idle, Cc.idle + Cc.back, idle);
    calmVis += ((quiet() ? 0 : calm) - calmVis) * (1 - Math.exp(-dt * 1.6));
    if (V.foe) { const kf = 1 - Math.exp(-dt * 2); V.foe[0] += (V.foeGoal[0] - V.foe[0]) * kf; V.foe[1] += (V.foeGoal[1] - V.foe[1]) * kf; }
    // 两道波相遇、延后的事
    for (let i = meets.length - 1; i >= 0; i--) if (RT >= meets[i].at) { const m = meets.splice(i, 1)[0]; addRipple(m.x, m.y, CFG.chain.meet, 2, 'meet'); cue('meet', {x: m.x, y: m.y}); }
    for (let i = timers.length - 1; i >= 0; i--) if (RT >= timers[i].at) timers.splice(i, 1)[0].fn();
    stepEra();
    tick(false);
  }

  function frame(now) {
    raf = 0; if (dead || !running) return;
    if (offscreen) { last = 0; return; }   // 滚出视野或房间被隐藏：停下，回来时由 IntersectionObserver 重新开始
    const dt = Math.min(.05, last ? (now - last) / 1000 : 1 / 60);
    // 120 Hz 屏幕最多 60 帧；真的卡（24–80 ms 一帧，不是后台节流）就把像素比降到 1
    if (last && now - last < 1000 / CFG.fpsCap - 2) { raf = requestAnimationFrame(frame); return; }
    if (pace < .6 && (halfSkip ^= 1)) { raf = requestAnimationFrame(frame); return; }   // 睡着时帧率减半
    if (last) { const iv = now - last; if (iv > 24 && iv < 80 && pace > .9) slowAcc++; slowN++; if (slowN >= 120) { if (slowAcc > 80 && frameSkipDpr === 1) { frameSkipDpr = Math.min(window.devicePixelRatio || 1, CFG.dprCap); resize(); } slowAcc = slowN = 0; } }
    last = now;
    advance(dt);
    draw(sch.state.slots, sch.state.past);
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!running || raf || dead || document.hidden || offscreen) return; last = 0; raf = requestAnimationFrame(frame); };

  // 静止：减少动态、暂停、?still。一张画，只在尺寸变化时重画
  async function renderStill() {
    if (!resize()) return;
    V.foe = [...V.foeGoal]; expo = expoGoal; T = Math.max(T, STILL_T); travel = Math.max(travel, CFG.speed * T);
    const slots = sch.still(T, {...envAt(), suppress: false, kill: false, ready: () => true});
    await Promise.all(slots.map(s => loadTex(s.item.id)));
    if (!dead && still) draw(slots, []);
  }
  const redrawIdle = () => { if (still) draw(sch.state.slots, []); else if (frozen) draw(sch.state.slots, sch.state.past); };

  const goalFor = m => m === 'close' ? CFG.closeDim : m === 'intro' ? 0 : 1;
  let offscreen = false;
  const io = new IntersectionObserver(es => { offscreen = !es[0].isIntersecting; if (!offscreen) start(); }); io.observe(canvas);
  const ro = new ResizeObserver(() => { if (!resize()) return; if (still) renderStill(); else if (frozen) draw(sch.state.slots, sch.state.past); }); ro.observe(canvas);
  // 从合成的静帧接着动：时钟接在静帧之后，暗适应视为已经完成，不会先黑一下
  const leaveStill = () => { if (!still) return; still = false; T = Math.max(T, STILL_T); travel = Math.max(travel, CFG.speed * T); revealT0 = performance.now() - 1e5; expo = expoGoal; };
  const onVis = () => { if (!document.hidden) start(); };
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); if (dead) return; api.destroy(); canvas.hidden = true; opts.onLost?.(); });   // 真丢了：告诉界面，等系统还回来再重建   // 自己 destroy() 时释放的不算
  // 避让：点击、滚轮、按键，以及指针或焦点在曲目表里，都算「在操作」。睡着时：一碰就醒，碰的地方泛起一道波
  const onInput = e => {
    prevBusy = lastBusy; lastBusy = performance.now();
    const wasAsleep = pace < .85; lastTouch = RT;
    if (wasAsleep && interactive() && e.type === 'pointerdown') { const [x, y] = toLocal(e.clientX, e.clientY); if (x >= 0 && y >= 0 && x <= V.W && y <= V.H) { addRipple(x, y, 1.1, 0, 'wake-up'); cue('wakeUp', {x, y}); } }
  };
  const onMove = () => { lastTouch = RT; };
  const evs = [['pointerdown', onInput], ['wheel', onInput], ['keydown', onInput], ['touchmove', onInput], ['pointermove', onMove]];
  for (const [n, f] of evs) addEventListener(n, f, {capture: true, passive: true});
  const pnl = opts.panel;
  const onEnter = () => { inPanel = true; }, onLeave = () => { inPanel = false; lastBusy = performance.now(); };
  const onFocus = () => { const was = focusInPanel; focusInPanel = !!pnl?.contains(document.activeElement); if (was && !focusInPanel) lastBusy = performance.now(); };
  pnl?.addEventListener('pointerenter', onEnter); pnl?.addEventListener('pointerleave', onLeave);
  document.addEventListener('focusin', onFocus); document.addEventListener('focusout', onFocus);

  const api = {
    setState(m) { if (m === mode) return; mode = m; expoGoal = goalFor(m); if (m === 'close' || m === 'dive') tick(true);
      if (still) renderStill(); else if (frozen) { expo = expoGoal; draw(sch.state.slots, sch.state.past); } },
    // 第一次露出：暗适应。之后再进来只是曝光渐亮
    reveal() { if (revealT0 === null) { revealT0 = performance.now(); opts.onReady?.(); } },
    // 离开唱片页：时钟停住
    pause() { active = false; running = false; cancelAnimationFrame(raf); raf = 0; if (ancWas) { opts.onAnchors?.({}); ancWas = false; } },
    resume() {
      active = true; expoGoal = goalFor(mode); userPaused = !!opts.paused?.(); lastTouch = RT;
      if (reduced()) { still = true; frozen = false; running = false; renderStill(); return; }
      if (userPaused) { running = false; if (still || !frameN) { still = true; renderStill(); } else { frozen = true; expo = expoGoal; draw(sch.state.slots, sch.state.past); } return; }
      if (still) leaveStill(); else if (!running) expo = 0;   // 从别的页面回来：从暗处亮回来
      frozen = false; running = true; start();
    },
    // 暂停开关：停在当前这一帧（封面、暗云、星轨原样留着），不换成另一张画；继续时从这一帧接着走
    setPaused(on) {
      userPaused = on; if (!active || reduced()) return;
      if (on) { running = false; cancelAnimationFrame(raf); raf = 0; frozen = !still; return; }
      leaveStill(); frozen = false; running = true; start();
    },
    // 正在播放：播放器状态驱动；停下要再过 4 秒才算，换歌、缓冲、唱臂移动都不会来回切换
    setPlaying(on) {
      if (on) { clearTimeout(playOff); playOff = 0; if (!playing) { playing = true; if (trail.start == null) trail.start = rot; trail.fadeT0 = null; } }
      else if (playing && !playOff) playOff = setTimeout(() => { playing = false; playOff = 0; trail.fadeT0 = T; }, 4000);
    },
    // 做完一轮回到盘面：cands = [{id, dir:[dx,dy], mid:[dx,dy]}]，按进步从多到少；delay 秒后（刻纹走完）放一张
    recall(cands, delay = 2) {
      if (!cands?.length || still) return;
      recall = {cands, at: T + delay, until: T + CFG.recall.quiet, done: false};
      for (const c of cands.slice(0, 4)) loadTex(c.id);
    },
    // 数字键：年份个位是这个数字的两三首，沿那根辐线浮出来；天上这个方位的恒星也亮一下
    summon(cands, n = 3, digit = null) {
      if (digit != null) sky.pulse = [digit, RT];
      if (!cands?.length || !interactive()) return;
      summons.push({cands, at: RT, n, placed: 0, done: false});
      for (const c of cands.slice(0, n + 2)) loadTex(c.id);
      tick(true);
    },
    relayout() { readLayout(); },
    // 点了天空的空白处：从这一点泛起水波。暂停、静止、减少动态时不起波
    ripple(clientX, clientY, strength = 1, kind = 'tap') {
      if (!interactive()) return false;   // 只在唱片页在前台、没暂停时起波
      const [x, y] = toLocal(clientX, clientY);
      if (x < 0 || y < 0 || x > V.W || y > V.H) return false;
      const s = strength * Math.max(.55, Math.min(1, Math.min(V.W, V.H) / 700));   // 小屏幕上小一点
      // 听歌时（节奏链开着）：点下去的水波对到下一拍上（半秒以内）
      const nb = kind === 'tap' && playing && opts.fx?.()?.rhythm.on && opts.fx().on ? opts.listener?.nextBeat(RT) : null;
      if (nb != null && nb - RT < .5) timers.push({at: nb, fn: () => addRipple(x, y, s * 1.1, 0, kind)});
      else addRipple(x, y, s, 0, kind);
      return true;
    },
    // 这次按下是在天上（不是在盘上）：不算「在操作」，天上照样出新东西
    skyTouch() { lastBusy = prevBusy; },
    // 按住：漩涡。返回 false 表示现在不能
    vortexStart(clientX, clientY) {
      if (!interactive()) return false;
      const [x, y] = toLocal(clientX, clientY); Object.assign(vort, {on: true, x, y, t0: RT, charge: 0, ang: 0}); cue('vortexStart', {x, y}); return true;
    },
    vortexMove(clientX, clientY) { if (!vort.on) return; const [x, y] = toLocal(clientX, clientY); vort.x += (x - vort.x) * .5; vort.y += (y - vort.y) * .5; },
    // 松手：炸开成一道大波；蓄得够、又是在暗云里松手的，冲开暗云，云里露出一首还没听过的歌
    vortexEnd() {
      if (!vort.on) return 0;
      const c = vort.charge; vort.on = false; vort.relT = RT; vort.relCharge = c;
      addRipple(vort.x, vort.y, VX.burst[0] + (VX.burst[1] - VX.burst[0]) * c, 0, 'burst');
      cue('vortexEnd', {x: vort.x, y: vort.y, charge: c});
      const cd = V.cloud;
      if (c > .5 && cd && Math.hypot(vort.x - cd.ctr[0], vort.y - cd.ctr[1]) < cd.r * .8 && cd.c.partAt == null) {
        cd.c.partAt = RT;
        const ids = (opts.unheard?.() || []).filter(id => byId.has(id) && !sch.state.slots.some(s => s.item.id === id));
        if (ids.length) {
          const foe = V.foe || V.foeGoal, v = [vort.x - foe[0], vort.y - foe[1]], l = Math.hypot(...v) || 1, pick = ids[Math.floor(Math.random() * ids.length)];
          summons.push({cands: [{id: pick, dir: [v[0] / l, v[1] / l], from: Math.max(60, l - 90)}], at: RT + .7, n: 1, placed: 0, done: false}); loadTex(pick);
          cue('reveal', {x: vort.x, y: vort.y, id: pick});
        }
      }
      return c;
    },
    // 拖：在天上划水
    wake(clientX, clientY) {
      if (!interactive()) return;
      const [x, y] = toLocal(clientX, clientY), now = performance.now();
      if (!wakeLast) { wakeLast = {x, y, t: now}; cue('wakeStart', {x, y}); return; }
      const dx = x - wakeLast.x, dy = y - wakeLast.y, d = Math.hypot(dx, dy); if (d < WK.every) return;
      const v = d / Math.max(8, now - wakeLast.t) * 1000, s = Math.max(.5, Math.min(1.4, v / 700));
      wakes.push({x, y, t0: RT, vx: dx / d, vy: dy / d, s}); if (wakes.length > WK.n) wakes.shift();
      wakeLast = {x, y, t: now};
    },
    wakeEnd() { wakeLast = null; },
    // 甩盘：d 是盘这一下转过的角度（弧度），v 是松手时盘的角速度
    spin(d) { if (!interactive()) return; spin.drag = true; rot += d * CFG.spin.follow; const now = performance.now(), dtp = Math.max(8, now - (spin.at || now - 16)) / 1000; spin.at = now; spin.v = spin.v * .6 + d * CFG.spin.follow / dtp * .4; },
    fling(v) { spin.drag = false; if (!interactive()) { spin.v = 0; return; } spin.v = v * CFG.spin.follow; },
    // 指针停在一张封面 / 一颗恒星 / 一颗余光星上；hold：卡片打开着
    hover(id) { if (hoverId === id) return; hoverId = id; const hs = sky.byId.has(id) ? id : null; if (sky.hover !== hs) { sky.hover = hs; sky.dirty = true; } if (!running) redrawIdle(); },
    hold(id, on) { if (on) holdIds.add(id); else holdIds.delete(id); if (!running) redrawIdle(); },
    // 屏幕上这一点有什么：恒星、封面、余光星（clientX/Y）
    pick(clientX, clientY) {
      const [x, y] = toLocal(clientX, clientY);
      for (const s of [...sch.state.slots].sort((a, b) => a.z - b.z)) { const c = s.scr; if (!c || c.vis < .3) continue;   // 封面优先
        const q = rotV([x - c.x, y - c.y], -c.roll); if (Math.abs(q[0]) < c.w / 2 + 4 && Math.abs(q[1]) < c.h / 2 + 4) return {kind: 'cover', id: s.item.id, x: c.x, y: c.y}; }
      let best = null, bd = 13;
      for (const st of sky.list) { if (!st.pos) continue; const p = skyScreen(st), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = {kind: 'star', id: st.id, x: p[0], y: p[1]}; } }
      if (best) return best;
      for (const em of lastEmbers) if (em.a > .15 && Math.hypot(em.p[0] - x, em.p[1] - y) < 12) return {kind: 'ember', id: em.s.item.id, x: em.p[0], y: em.p[1]};
      return null;
    },
    // 你的星空：list = [{id, digit, decade, mag, full, due, url}]；cons = [{id, label, ids}]
    setSky(list, cons = []) {
      const prev = new Set(sky.list.map(s => s.id)), prevCons = new Set(sky.cons.map(c => c.id)), fresh = [];
      const old = sky.byId; sky.byId = new Map();
      sky.list = list.map(s => { const o = old.get(s.id); const st = {...s, col0: o?.col0 || [.97, .9, .78], t0: o?.t0 ?? -1e9}; sky.byId.set(s.id, st); return st; });
      if (!sky.first) for (const st of sky.list) if (!prev.has(st.id)) fresh.push(st);
      // 新亮起的星：一颗接一颗，每颗亮起时放出一道小波
      const gap = Math.min(.45, 6 / Math.max(1, fresh.length));   // 一颗接一颗，最多 6 秒亮完
      fresh.forEach((st, i) => { st.t0 = RT + 1.2 + i * gap; timers.push({at: st.t0, fn: () => { if (st.pos) { const p = skyScreen(st); addRipple(p[0], p[1], .5, 1, 'star'); cue('starBorn', {x: p[0], y: p[1], decade: st.decade}); } }}); });
      const t1 = RT + 1.6 + fresh.length * gap;
      sky.cons = cons.map(c => ({...c, t0: !sky.first && !prevCons.has(c.id) ? t1 : null}));
      for (const c of sky.cons) if (c.t0 != null) timers.push({at: c.t0 + 2.4, fn: () => { const l = sky.labels.find(x => x.id === c.id); if (!l) return;
        const foe = V.foe || V.foeGoal, r = rotV(l.rel, rot); addRipple(foe[0] + r[0], foe[1] + r[1] + 16, 1.1, 0, 'constellation'); cue('constellation', {id: c.id}); }});
      sky.first = false; sky.layoutRef = null; sky.dirty = true; fetchColors();
      if (!running) { if (V.layout) layoutSky(); redrawIdle(); }
    },
    // 天文年表：指针停在某个年代带上
    showEra(decade) {
      if (!interactive() || decade == null) return false;
      const list = erasOf(decade); if (!list.length) return false;
      if (era.cur?.def.decade === decade && era.cur.killAt == null) return true;
      const i = era.rotIdx.get(decade) || 0, def = list[i % list.length]; era.rotIdx.set(decade, i + 1);
      if (era.cur) { era.cur.killAt ??= RT; era.pending = def; } else startEra(def);
      era.nextIdle = Math.max(era.nextIdle, RT + 20);
      return true;
    },
    // 所有歌全部刻满：终章
    setFinale(on) { era.finWant = !!on; },
    // 听歌：现在放的是哪一首（{id, style, year}），停了传 null。三条效果链据此「跟着歌」选风格和年代
    setTrack(t) { react.setTrack(t || null); },
    // 给效果器面板看：现在实际用着的风格、年代，听到的速度
    get fxNow() { return {family: look.family, era: look.era, bpm: F0?.bpm ? Math.round(F0.bpm) : 0, live: !!F0?.live, level: +(F0?.level || 0).toFixed(2), beats: F0?.beats || 0, count: look.count}; },
    // 调试：立刻放一件（id 见 sky-events.js）
    debugEra(id) { const def = eraById(id); if (!def) return false; if (def === FINALE) { era.finWant = true; era.fin = null; era.finShown = startEra(FINALE, 'fin'); return true; } if (era.cur) { era.cur = null; } return startEra(def); },
    // 调试：让天马上睡着 / 醒来
    debugSleep(on) { lastTouch = on ? RT - CFG.sleep.after - 1 : RT; },
    // 调试 / 录制：按固定步长推进 n 帧并画出最后一帧（不依赖 requestAnimationFrame）
    step(dt = 1 / 30, n = 1) { running = false; cancelAnimationFrame(raf); raf = 0; resize(); for (let i = 0; i < n; i++) advance(dt); draw(sch.state.slots, sch.state.past); },
    // 调试：按固定种子画出时钟 t 的那一帧（可复现；不含操作避让和星轨）
    async renderAt(t, seed = 7) {
      running = false; cancelAnimationFrame(raf); raf = 0; resize(); V.foe = [...V.foeGoal]; expo = expoGoal = goalFor(mode); revealT0 = performance.now() - 1e5; T = t; travel = CFG.speed * t;
      calm = calmVis = 1; push = pushV = pushGoal = 0; focus = mode === 'close' ? 1 : mode === 'dive' ? 2 : 0; rot = 0; trail.start = null; recall = null;
      clouds = cloudPlan(seed + 11); cloudBaked = -1;
      const env = envAt(), sim = simulate(opts.pool || [], seed, t, () => ({...env, suppress: mode !== 'over', kill: false, avoid: null, lastEvent: null, ready: () => true}));
      sch = sim; await Promise.all([...sim.state.slots, ...sim.state.past].map(s => loadTex(s.item.id)));
      still = false; draw(sim.state.slots, sim.state.past);
      return sim.state.slots.map(s => ({id: s.item.id, cls: s.cls, dev: +coverDev(s, t).toFixed(2), out: +coverOut(s, t).toFixed(2), scale: +coverScale(s, t).toFixed(3)}));
    },
    // 调试：当前这一帧连画 n 次、每次等 GPU 画完，返回每帧毫秒。off：临时关掉的层（'cloud' 'stars' 'covers' 'trail' 'sky' 'era'）
    bench(n = 120, off = []) {
      off.forEach(k => skip.add(k));
      const px = new Uint8Array(4), sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px), sl = sch.state.slots, pa = sch.state.past;
      draw(sl, pa); sync(); let t0 = performance.now(); for (let i = 0; i < n; i++) sync(); const base = (performance.now() - t0) / n;
      t0 = performance.now(); for (let i = 0; i < n; i++) { draw(sl, pa); sync(); }
      skip.clear(); return +((performance.now() - t0) / n - base).toFixed(3); },
    stats: () => {
      const foe = V.foe || V.foeGoal, ac = activeCloud(T, foe, camAt(T, DRIFT), push, rot);
      return {T: +T.toFixed(2), RT: +RT.toFixed(2), pace: +pace.toFixed(2), mode, expo: +expo.toFixed(2), still, frozen, active, playing, userPaused, running, dpr: V.dpr, foe: V.foe,
        push: +push.toFixed(3), focus: +focus.toFixed(2), rot: +(rot / DEG).toFixed(2), trail: trailNow(), calm: +calm.toFixed(2), calmVis: +calmVis.toFixed(2),
        inPanel, focusInPanel, recall: recall && {at: recall.at, until: recall.until, done: recall.done}, ripples: rips.map(r => ({x: Math.round(r.x), y: Math.round(r.y), age: +(RT - r.t0).toFixed(2), gen: r.gen, s: +r.s.toFixed(2)})),
        vortex: {on: vort.on, charge: +vort.charge.toFixed(2)}, wakes: wakes.length, spin: {v: +spin.v.toFixed(3), alpha: +spin.alpha.toFixed(2)},
        era: era.cur && {id: era.cur.def.id, age: +(RT - era.cur.t0).toFixed(1)}, finale: !!era.fin, nextIdleIn: +(era.nextIdle - RT).toFixed(1),
        sky: {n: sky.list.length, placed: sky.list.filter(s => s.pos).length, cons: sky.cons.map(c => c.id), dots: sky.pts.length, uploaded: sky.n, pos: sky.list.filter(s => s.pos).map(s => [s.id, ...s.pos.map(Math.round)])},
        cloud: ac && {i: ac.i, z: +ac.s.z.toFixed(1), r: Math.round(ac.s.r), ctr: ac.s.ctr.map(Math.round), fade: +ac.s.fade.toFixed(2)},
        counts: starCounts(stars, V.E), slots: sch.state.slots.map(s => ({id: s.item.id, cls: s.cls, dev: still ? 1 : +coverDev(s, T).toFixed(2), out: still ? 0 : +coverOut(s, T).toFixed(2), recalled: !!s.recalled, shook: s.shook != null, scr: s.scr && [Math.round(s.scr.x), Math.round(s.scr.y)]}))};
    },
    get layout() { return V.layout; },
    destroy() {
      clearTimeout(playOff); dead = true; running = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onFocus);
      for (const [n, f] of evs) removeEventListener(n, f, {capture: true});
      pnl?.removeEventListener('pointerenter', onEnter); pnl?.removeEventListener('pointerleave', onLeave);
      // 不主动 loseContext：同一张 canvas 之后还会再建一次星空，丢掉的上下文拿回来是死的
    }
  };
  resize(); V.foe = [...V.foeGoal];
  return api;
}
