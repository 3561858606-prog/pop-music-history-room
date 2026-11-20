// 立体的盘：WebGL2，手写，没有库。场景里只有一张盘、一支唱臂、立起来的封套。
// 只在需要时渲染：没有东西在动就不画帧。
import {t as tr} from './i18n.js';
import {rings, bands, GEO, TAU, lanesOf, coverOf, localXZ} from './model.js';
import {sleeveLayout} from './sleeve-layout.js';

/* ---------- 一点矩阵 ---------- */
const mul = (a, b) => { const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o; };
const persp = (fovy, asp, n, f) => { const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16);
  o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lookAt = (e, t, up) => { const z = norm(sub(e, t)), x = norm(cross(up, z)), y = cross(z, x), o = new Float32Array(16);
  o[0] = x[0]; o[4] = x[1]; o[8] = x[2]; o[12] = -dot(x, e);
  o[1] = y[0]; o[5] = y[1]; o[9] = y[2]; o[13] = -dot(y, e);
  o[2] = z[0]; o[6] = z[1]; o[10] = z[2]; o[14] = -dot(z, e); o[15] = 1; return o; };
const invert = m => { const o = new Float32Array(16), a = m;
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5],
    b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6], b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12],
    b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  let d = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!d) return null; d = 1 / d;
  o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * d; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * d;
  o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * d; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * d;
  o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * d; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * d;
  o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * d; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * d;
  o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * d; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * d;
  o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * d; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * d;
  o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * d; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * d;
  o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * d; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * d; return o; };
const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
  m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14], m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]];

/* ---------- 着色器 ---------- */
const COMMON = `#version 300 es
precision highp float; precision highp sampler2D;
const float TAU = 6.28318530718;
vec3 lightA(float sweep){ vec3 l = normalize(vec3(-.50,.70,-.50)); float c=cos(sweep), s=sin(sweep); return normalize(vec3(l.x*c-l.z*s, l.y, l.x*s+l.z*c)); }
const vec3 LB = vec3(.8111,.5070,.2915);
const vec3 CA = vec3(1.,.93,.82);
const vec3 CB = vec3(.26,.38,.72);
vec3 env(vec3 R, vec3 L1){
  float a = max(dot(R,L1),0.), b = max(dot(R,LB),0.);
  vec3 c = vec3(.050,.046,.042)*(.55+.9*pow(1.-max(R.y,0.),2.));
  c += CA*(pow(a,260.)*3.+pow(a,18.)*.22);
  c += CB*(pow(b,200.)*2.2+pow(b,14.)*.18);
  vec2 d = vec2(R.x+.25, R.y-.57);                              // 盘后方一条横向的柔光箱
  c += CA*2.4*exp(-d.y*d.y/.0022 - d.x*d.x/.22)*smoothstep(.2,-.4,R.z);
  return c;
}
vec3 toDisplay(vec3 c){ c = c/(1.+c*.25); return pow(max(c,0.), vec3(1./2.2)); }
`;

const DISC_VS = `#version 300 es
in vec2 aPos; uniform mat4 uVP; uniform float uRot; out vec2 vLocal; out vec3 vWorld;
void main(){ vLocal = aPos; float c = cos(uRot), s = sin(uRot);
  vec3 w = vec3(aPos.x*c - aPos.y*s, 0., aPos.x*s + aPos.y*c); vWorld = w; gl_Position = uVP*vec4(w,1.); }`;

const DISC_FS = COMMON + `
in vec2 vLocal; in vec3 vWorld;
uniform vec3 uEye; uniform sampler2D uLut, uRing, uLabel;
uniform float uHover, uFocus, uPlay, uBand, uCut, uLight, uSweep, uTime;
uniform vec4 uGeo;
out vec4 o;
float h1(float x){ return fract(sin(x*127.1)*43758.5453); }
float n1(float x){ float i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(h1(i),h1(i+1.),f); }
float cover(float v, float fw, float lo, float hi){ return clamp((min(v+fw*.5,hi)-max(v-fw*.5,lo))/max(fw,1e-4),0.,1.); }
vec3 aniso(vec3 L, vec3 lc, vec3 V, vec3 T, vec3 Ng, float sig){
  vec3 H = normalize(L+V); float th = dot(T,H);
  float g = exp(-th*th/(2.*sig*sig)), g2 = exp(-th*th/(14.*sig*sig));
  float nh = pow(max(dot(Ng,H),0.),4.);
  vec3 irid = .5+.5*cos(TAU*(th*9.+vec3(0.,.33,.67)));   // 高光边缘的衍射色
  return lc*nh*(g*4.2 + (g2-g)*.11*mix(vec3(1.), irid*2.6, .95));
}
void main(){
  vec2 p = vLocal; float r = length(p);
  float fp = max(length(dFdx(p)), length(dFdy(p)));
  if (r > 1.+fp) discard;
  float RL=uGeo.x, R1=uGeo.y, R2=uGeo.z, unit=uGeo.w;
  float phi = atan(p.x,-p.y); if (phi < 0.) phi += TAU;
  vec3 V = normalize(uEye - vWorld), N = vec3(0.,1.,0.);
  vec2 rw = normalize(vWorld.xz + 1e-6);
  vec3 Rad = vec3(rw.x,0.,rw.y), T = vec3(-rw.y,0.,rw.x);
  vec3 L1 = lightA(uSweep);
  float F = .035 + .965*pow(1.-max(dot(N,V),0.),5.);
  vec3 E = env(reflect(-V,N), L1);
  vec3 lacquer = vec3(.0052,.0043,.0040) + F*E;          // 没刻过的漆面：一面黑镜子
  vec3 amber = vec3(.80,.37,.045);
  vec3 col = lacquer;

  if (r > R1 && r < R2) {
    float t = (r-R1)/(R2-R1);
    int idx = int(texelFetch(uLut, ivec2(clamp(int(t*2048.),0,2047),0),0).r*255.+.5) - 1;
    if (idx >= 0) {
      vec4 d0 = texelFetch(uRing, ivec2(idx,0),0);
      vec4 ln = texelFetch(uRing, ivec2(idx,1),0);
      vec4 d2 = texelFetch(uRing, ivec2(idx,2),0);
      float fi = float(idx), coarse = d0.w, nl = mix(4.,2.,coarse);
      float fwV = fp/unit, aw = fp/max(r,1e-4)/TAU;
      float a = fract((phi-d0.y)/TAU + 1.);
      float wobble = .03*sin(phi*150.+fi*2.4)*sin(phi*19.+fi)*clamp(1.-aw*TAU*225.,0.,1.);
      float v = (d0.x-r)/unit + wobble;
      float cut = 0., wall = 0., glow = 0.;
      for (int k=0;k<4;k++){
        float lo = .08+.21*float(k), hi = lo+.21, m = ln[k];
        float w = cover(v,fwV,lo,hi);
        float c = m >= .999 ? 1. : (m <= .001 ? 0. : clamp((m-a)/aw+.5,0.,1.));
        cut += w*c;
        float gl = fract(clamp((v-lo)/.21,0.,1.)*nl);
        wall += w*c*(gl-.5)*2.;
        if (fi == uCut && m > .001 && m < .999) glow += w*exp(-pow((a-m)*TAU*r/(unit*1.6),2.));
      }
      float fine = clamp(1.-fwV*nl*9.5,0.,1.);
      cut = mix(cut, d0.z*.84, smoothstep(.7,1.8,fwV));
      vec3 Ng = normalize(N + Rad*wall*fine*.9);
      float sig = mix(.036,.054,coarse);
      float streak = mix(1., .55+.9*n1(r*640.+fi*7.), clamp(1.-fp*900.,0.,1.));
      vec3 spec = aniso(L1,CA,V,T,Ng,sig) + aniso(LB,CB,V,T,Ng,sig);
      vec3 grooveBase = mix(vec3(.0095,.009,.0088), vec3(.012,.009,.006), coarse);
      vec3 cutCol = grooveBase*(1.-.5*fine*abs(wall)) + spec*streak*mix(1.,.42,coarse) + F*E*.22;
      float guide = cover(v,fwV,.46,.54);
      col = mix(lacquer + vec3(.020,.018,.016)*guide*1.4, cutCol, clamp(cut,0.,1.));
      float edge = cover(v,fwV,0.,.07) + cover(v,fwV,.93,1.);
      if (fi == uFocus) col = col*.75 + amber*(.10 + .55*edge);
      else if (fi == uHover) col += amber*.13;
      if (d2.y > .5) col += amber*.07;
      if (fi == uPlay) col += amber*(.10+.06*sin(uTime*5.));
      col += amber*glow*1.6;
      if (uBand >= 0. && d2.x != uBand) col *= .46;
    }
  } else if (r >= R2) {
    float am = abs(fract(phi/TAU*10.+.5)-.5)*TAU/10.*r;
    float major = (1.-smoothstep(.0034-fp,.0034+fp,am))*smoothstep(.962-fp,.962+fp,r)*(1.-smoothstep(.990-fp,.990+fp,r));
    float an = abs(fract(phi/TAU*100.+.5)-.5)*TAU/100.*r;
    float minor = (1.-smoothstep(.001-fp,.001+fp,an))*smoothstep(.979-fp,.979+fp,r)*(1.-smoothstep(.990-fp,.990+fp,r))*clamp(1.-fp*260.,0.,1.);
    col += vec3(.55,.52,.46)*(major*.5+minor*.2);
    col += smoothstep(.992,1.,r)*(F*.5+.02)*CA;
  } else if (r > RL) {
    float d = abs(r-(RL+.026)); col += vec3(.03)*(1.-smoothstep(.0012-fp,.0012+fp,d));
  }
  if (r < RL+fp) {
    vec2 uv = p/RL*.5+.5;
    vec3 tx = pow(texture(uLabel,uv).rgb, vec3(2.2));
    vec3 lab = tx*(max(dot(N,L1),0.)*.62+.34) + F*E*.05;
    lab = mix(vec3(.003), lab, smoothstep(.0150,.0150+fp+.0006,r));
    col = mix(lab, col, smoothstep(RL-fp,RL+fp,r));
  }
  col *= uLight;
  o = vec4(toDisplay(col), 1.-smoothstep(1.-fp,1.,r));
}`;

const FLOOR_VS = `#version 300 es
in vec2 aPos; uniform mat4 uVP; uniform float uY; out vec2 vP;
void main(){ vP = aPos*6.; gl_Position = uVP*vec4(vP.x,uY,vP.y,1.); }`;
const FLOOR_FS = COMMON + `
in vec2 vP; uniform float uLight, uSpace; out vec4 o;
void main(){ float rr = length(vP);
  vec3 bg = vec3(.0048,.0040,.0036);
  vec3 pool = bg*(1.+2.2*uLight*exp(-rr*rr/2.4));
  pool *= 1.-.7*exp(-max(rr-1.,0.)/.07);
  vec4 room = vec4(pow(mix(pool,bg,smoothstep(1.5,3.4,rr)), vec3(1./2.2)),1.);
  // 深空：盘缘外一圈暗环（刻度落在暗底上）+ 原来的光池变成极淡的暖光；其余透明，露出下面的宇宙。预乘透明度
  float aura = .62*exp(-max(rr-1.,0.)/.085);
  vec3 glow = vec3(1.,.90,.74)*.040*uLight*exp(-rr*rr/1.7);
  vec4 space = vec4(glow, max(aura, max(glow.r, max(glow.g, glow.b))));
  o = mix(room, space, uSpace); }`;

const MESH_VS = `#version 300 es
in vec3 aPos; in vec3 aNor; in vec4 aCol; uniform mat4 uVP, uModel; out vec3 vN, vW; out vec4 vC;
void main(){ vec4 w = uModel*vec4(aPos,1.); vW = w.xyz; vN = mat3(uModel)*aNor; vC = aCol; gl_Position = uVP*w; }`;
const MESH_FS = COMMON + `
in vec3 vN, vW; in vec4 vC; uniform vec3 uEye; uniform float uLight, uSweep; out vec4 o;
void main(){ vec3 N = normalize(vN), V = normalize(uEye-vW), L1 = lightA(uSweep);
  float d = max(dot(N,L1),0.)*.9 + max(dot(N,LB),0.)*.35 + .12;
  vec3 H = normalize(L1+V); float s = pow(max(dot(N,H),0.),40.);
  vec3 c = vC.rgb*d + CA*s*.35*(1.-vC.a) + vC.rgb*vC.a*3.;
  o = vec4(toDisplay(c*mix(uLight,1.,vC.a*.6)),1.); }`;

const SLEEVE_VS = `#version 300 es
in vec2 aPos; uniform mat4 uVP; uniform vec3 uBase, uRight, uUp; uniform vec2 uSize; out vec2 vUv;
void main(){ vUv = vec2(aPos.x+.5, aPos.y);
  gl_Position = uVP*vec4(uBase + uRight*aPos.x*uSize.x + uUp*aPos.y*uSize.y, 1.); }`;
const SLEEVE_FS = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform float uRound, uAlpha, uMirror, uShade; uniform vec3 uTint; out vec4 o;
void main(){ vec2 uv = vec2(vUv.x, 1.-vUv.y);
  vec3 c = texture(uTex, uv).rgb*uShade;
  float a = uAlpha;
  if (uRound > .5) { float d = length(vUv-.5), fw = fwidth(d); a *= 1.-smoothstep(.5-fw,.5,d); }
  else { vec2 e = min(vUv, 1.-vUv); c *= .82+.18*smoothstep(0.,.03,min(e.x,e.y)); }
  a *= mix(1., pow(1.-vUv.y,2.5)*.32, uMirror);
  c = mix(c, uTint, uTint.r > 0. ? .55 : 0.);
  if (a < .02) discard; o = vec4(c, a); }`;

/* ---------- 小工具 ---------- */
function program(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(p));
  const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
  return {p, u};
}

// 唱臂：几根圆柱和几个盒子。
function meshBuilder() {
  const pos = [], nor = [], col = [];
  const tri = (a, b, c, na, nb, nc, color) => { for (const [v, n] of [[a, na], [b, nb], [c, nc]]) { pos.push(...v); nor.push(...n); col.push(...color); } };
  return {
    cyl(p0, p1, rad, color, seg = 14, rad1 = rad) {
      const ax = norm(sub(p1, p0)), ref = Math.abs(ax[1]) > .9 ? [1, 0, 0] : [0, 1, 0], x = norm(cross(ref, ax)), y = cross(ax, x);
      const ring = (c, r, i) => { const a = i / seg * TAU, n = [x[0] * Math.cos(a) + y[0] * Math.sin(a), x[1] * Math.cos(a) + y[1] * Math.sin(a), x[2] * Math.cos(a) + y[2] * Math.sin(a)];
        return [[c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r], n]; };
      for (let i = 0; i < seg; i++) {
        const [a, na] = ring(p0, rad, i), [b, nb] = ring(p0, rad, i + 1), [c, nc] = ring(p1, rad1, i), [d, nd] = ring(p1, rad1, i + 1);
        tri(a, b, c, na, nb, nc, color); tri(b, d, c, nb, nd, nc, color);
        tri(p1, c, d, ax, ax, ax, color); const m = [-ax[0], -ax[1], -ax[2]]; tri(p0, b, a, m, m, m, color);
      }
    },
    box(c, s, color) {
      const [hx, hy, hz] = [s[0] / 2, s[1] / 2, s[2] / 2];
      const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [0, 1, 0], [1, 0, 0]]];
      for (const [n, a, b] of faces) {
        const P = (sa, sb) => [c[0] + (n[0] + a[0] * sa + b[0] * sb) * hx, c[1] + (n[1] + a[1] * sa + b[1] * sb) * hy, c[2] + (n[2] + a[2] * sa + b[2] * sb) * hz];
        tri(P(-1, -1), P(1, -1), P(1, 1), n, n, n, color); tri(P(-1, -1), P(1, 1), P(-1, 1), n, n, n, color);
      }
    },
    data() { return {pos: new Float32Array(pos), nor: new Float32Array(nor), col: new Float32Array(col), count: pos.length / 3}; }
  };
}

function drawLabel(cv) {
  const c = cv.getContext('2d'), S = cv.width, m = S / 2;
  c.fillStyle = '#EEE8DA'; c.fillRect(0, 0, S, S);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.strokeStyle = '#16130F'; c.lineWidth = S * .003; c.beginPath(); c.arc(m, m, S * .468, 0, TAU); c.stroke();
  c.strokeStyle = '#E7A33C'; c.lineWidth = S * .018; c.beginPath(); c.arc(m, m, S * .44, 0, TAU); c.stroke();
  c.fillStyle = '#16130F';
  // 沿边一圈小字
  const ringText = 'POPULAR MUSIC HISTORY · LISTENING ROOM · LEAD-IN 1854 · RUN-OUT 1968 · ';
  c.font = `600 ${S * .024}px Archivo, sans-serif`;
  for (let i = 0; i < ringText.length; i++) { const a = i / ringText.length * TAU - Math.PI / 2; c.save(); c.translate(m + Math.cos(a) * S * .402, m + Math.sin(a) * S * .402); c.rotate(a + Math.PI / 2); c.fillText(ringText[i], 0, 0); c.restore(); }
  c.font = `700 ${S * .074}px "PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif`;
  c.fillText(tr('大众音乐史复习室'), m, S * .29, S * .62);
  c.font = `600 ${S * .026}px Archivo, sans-serif`;
  c.fillText('SIDE A', S * .27, m); c.fillText('MHR–A', S * .73, m);
  c.fillRect(S * .2, S * .365, S * .6, S * .003);
  c.font = `800 extra-condensed ${S * .15}px Archivo, sans-serif`;
  c.fillText('1854—1968', m, S * .665);
  c.font = `600 ${S * .027}px "PingFang SC","Hiragino Sans GB","Noto Sans SC",sans-serif`;
  c.fillText(tr('75 首 · 七讲 · 外圈 1854 → 内圈 1968'), m, S * .765, S * .64);
}

function blankSleeve(t) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d');
  c.fillStyle = '#1D1A16'; c.fillRect(0, 0, 256, 256);
  c.strokeStyle = 'rgba(238,232,218,.35)'; c.lineWidth = 3; c.strokeRect(12, 12, 232, 232);
  c.fillStyle = '#EEE8DA'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '800 extra-condensed 110px Archivo, sans-serif'; c.fillText(t.year, 128, 120);
  c.font = '500 20px "PingFang SC","Noto Sans SC",sans-serif'; c.fillStyle = 'rgba(238,232,218,.6)'; c.fillText(tr('暂无封面'), 128, 200);
  return cv;
}

/* ---------- 主体 ---------- */
export function createDisc(canvas, opts = {}) {
  // 背景透明：下面是深空的画布。深空准备好之前 space = 0，画出来和以前一模一样
  const gl = canvas.getContext('webgl2', {antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance'});
  if (!gl) throw new Error('no webgl2');
  const reduced = () => opts.reducedMotion?.() ?? false;
  const P = {disc: program(gl, DISC_VS, DISC_FS), floor: program(gl, FLOOR_VS, FLOOR_FS), mesh: program(gl, MESH_VS, MESH_FS), sleeve: program(gl, SLEEVE_VS, SLEEVE_FS)};

  const vbo = (data, loc, size, prog) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const l = gl.getAttribLocation(prog.p, loc); if (l >= 0) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); } return b; };
  // 盘面与地面共用一个方片
  const quad = new Float32Array([-1.03, -1.03, 1.03, -1.03, 1.03, 1.03, -1.03, -1.03, 1.03, 1.03, -1.03, 1.03]);
  const vaoDisc = gl.createVertexArray(); gl.bindVertexArray(vaoDisc); vbo(quad, 'aPos', 2, P.disc);
  const vaoFloor = gl.createVertexArray(); gl.bindVertexArray(vaoFloor); vbo(quad, 'aPos', 2, P.floor);
  const vaoSleeve = gl.createVertexArray(); gl.bindVertexArray(vaoSleeve); vbo(new Float32Array([-.5, 0, .5, 0, .5, 1, -.5, 0, .5, 1, -.5, 1]), 'aPos', 2, P.sleeve);
  const mkMesh = m => { const d = m.data(), vao = gl.createVertexArray(); gl.bindVertexArray(vao); vbo(d.pos, 'aPos', 3, P.mesh); vbo(d.nor, 'aNor', 3, P.mesh); vbo(d.col, 'aCol', 4, P.mesh); return {vao, count: d.count}; };

  // 盘的侧壁
  const side = meshBuilder(); side.cyl([0, -GEO.T, 0], [0, -.0006, 0], 1, [.012, .011, .010, 0], 120);
  const meshSide = mkMesh(side);
  // 唱臂
  const ARM = {pivot: [-1.0, .055, -.62], L: 1.10, rest: 1.13};
  const GUN = [.11, .105, .10, 0], DARK = [.02, .019, .018, 0], IVORY = [.62, .58, .50, 0], AMB = [.80, .37, .045, .55];
  const armB = meshBuilder(), L = ARM.L;
  armB.cyl([-.16, 0, 0], [L - .09, 0, 0], .0085, GUN);
  armB.cyl([-.30, 0, 0], [-.16, 0, 0], .036, DARK, 20);
  armB.cyl([-.02, -.018, 0], [-.02, .018, 0], .03, GUN, 18);
  armB.box([L - .045, -.004, 0], [.115, .010, .046], IVORY);
  armB.box([L - .012, -.026, 0], [.05, .034, .034], DARK);
  armB.cyl([L, -.043, 0], [L, -.055, 0], .0045, AMB, 8, .0012);
  armB.cyl([L - .03, .002, .022], [L - .012, .010, .066], .0032, GUN, 8);
  const meshArm = mkMesh(armB);
  const baseB = meshBuilder(), pv = ARM.pivot;
  baseB.cyl([pv[0], -GEO.T, pv[2]], [pv[0], pv[1] - .03, pv[2]], .075, DARK, 28);
  baseB.cyl([pv[0], pv[1] - .03, pv[2]], [pv[0], pv[1] - .012, pv[2]], .04, GUN, 20);
  const meshBase = mkMesh(baseB);

  /* 纹理 */
  const tex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); return t; };
  const nearest = () => { for (const k of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, k, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); };
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const mip = () => { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT))); };

  // 半径 → 圈号
  const lut = new Uint8Array(2048);
  for (let i = 0; i < 2048; i++) { const r = GEO.R1 + (i + .5) / 2048 * (GEO.R2 - GEO.R1); const g = rings.find(g => r <= g.outer && r > g.inner); lut[i] = g ? g.i + 1 : 0; }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const tLut = tex(0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 2048, 1, 0, gl.RED, gl.UNSIGNED_BYTE, lut); nearest();
  // 每圈的数据：位置、四道刻纹、所在年代带
  const ringData = new Float32Array(rings.length * 4 * 3), marks = new Set();
  const tRing = tex(1); nearest();
  const laneNow = new Map(rings.map(g => [g.id, lanesOf(g.id)]));
  function uploadRings() {
    const n = rings.length, avg = bands.map(b => b.ids.reduce((s, id) => s + laneNow.get(id).reduce((a, v) => a + v, 0) / 4, 0) / b.ids.length);
    for (const g of rings) {
      const l = laneNow.get(g.id);
      ringData.set([g.outer, g.phi, avg[g.band], g.coarse ? 1 : 0], g.i * 4);
      ringData.set(l, n * 4 + g.i * 4);
      ringData.set([g.band, marks.has(g.id) ? 1 : 0, 0, 0], n * 8 + g.i * 4);
    }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tRing);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, n, 3, 0, gl.RGBA, gl.FLOAT, ringData);
  }
  uploadRings();
  // 标签
  const labelCv = document.createElement('canvas'); labelCv.width = labelCv.height = 1024;
  const tLabel = tex(2);
  const uploadLabel = () => { drawLabel(labelCv); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tLabel); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, labelCv); mip(); };
  uploadLabel();
  document.fonts?.load('800 extra-condensed 100px Archivo').then(() => { if (!dead) { uploadLabel(); for (const s of sleeves.values()) if (s.blank) s.tex = null; request(); } }).catch(() => {});

  /* 封套 */
  const sleeves = new Map();   // id → {up, goal, tex, loading, w, h, round, blank}
  function sleeveFor(g) {
    let s = sleeves.get(g.id);
    if (!s) { const c = coverOf(g.t); const asp = c ? c.w / c.h : 1;
      s = {g, up: 0, goal: 0, hov: 0, t0: 0, tex: null, loading: false, round: c?.shape === 'round', blank: !c, w: asp >= 1 ? 1 : asp, h: asp >= 1 ? 1 / asp : 1, c};
      if (s.round) { s.w = s.h = 1; }
      sleeves.set(g.id, s); }
    return s;
  }
  function loadSleeve(s) {
    if (s.tex || s.loading) return;
    const put = src => { const cv = document.createElement('canvas'), k = Math.min(1, 320 / Math.max(src.width, src.height));
      cv.width = Math.max(2, Math.round(src.width * k)); cv.height = Math.max(2, Math.round(src.height * k));
      cv.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height);
      s.tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, s.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); mip(); s.loading = false; request(); };
    if (s.blank) return put(blankSleeve(s.g.t));
    s.loading = true; const img = new Image(); img.decoding = 'async';
    img.onload = () => { if (!dead) put(img); }; img.onerror = () => { s.blank = true; s.loading = false; if (!dead) put(blankSleeve(s.g.t)); };
    img.src = s.c.url;
  }

  /* 状态 */
  const CAM = {
    // 整张盘：镜头距离按可用宽度算，盘始终完整地落在曲目表左边
    over: (a, pf) => { const d = Math.max(3.8, 3.732 / (a * Math.max(.3, 1 - pf - .10))) / 3.796; return {eye: [0, 2.3 * d, 3.02 * d], tgt: [0, 0, .08], shift: -pf, up: 0}; },
    close: (a, pf, b) => { const w = b.outer - b.inner, k = a < 1.1 ? 1.25 : 1; return {eye: [0, (.40 + w * .6) * k, b.mid + .80 * k], tgt: [0, 0, b.mid - .26], shift: -pf, up: 0}; },
    dive: () => ({eye: [0, .27, .125], tgt: [0, 0, .12], shift: 0, up: 1}),
    intro: (a, pf) => ({eye: [0, 1.25, 2.3], tgt: [0, 0, .1], shift: -pf, up: 0})
  };
  const S = {rot: 0, rotV: 0, rotGoal: null, dragging: false, spin: false,
    mode: 'over', band: -1, hover: -1, focus: -1, play: -1, cut: -1, light: 1, sweep: 0, lightGoal: 1, sweepGoal: 0, space: 0, spaceGoal: 0,
    cam: null, goal: null, camRate: 4.2, arm: {rho: ARM.rest, goal: ARM.rest, lift: 1, down: false},
    sleeveSet: new Set(), sleeveScale: 1, W: 1, H: 1, aspect: 1.6, vp: null, inv: null, eye: [0, 2, 2.7], time: 0};
  let dead = false, raf = 0, last = 0, wake = 0;
  const cuts = [];   // 正在进行的刻纹动画

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    S.W = w; S.H = h; S.aspect = w / h;
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
    S.goal = goalFor(); if (!S.cam) S.cam = structuredClone(S.goal);
    // 尺寸变了，一排和弧可能互换：把当前这首重新转到正面
    if (S.mode === 'close' && S.focus >= 0 && !S.dragging) { const L = fanLayout(), id = rings[S.focus].id, it = L?.items.get(id); if (it) S.rotGoal = Math.PI - (L.mode === 'row' ? L.phi0 : L.phi0 - it.c / L.r0); }
    request();
  }
  const goalFor = () => { const pf = opts.panelFrac?.() ?? 0; return S.mode === 'close' ? CAM.close(S.aspect, pf, bands[S.band]) : CAM[S.mode](S.aspect, pf); };

  // 镜头平移：裁剪空间里 x += shift * w，把盘推到画面左侧而不转动视角
  const lensShift = s => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; m[12] = s; return m; };
  const vpOf = c => mul(lensShift(c.shift), mul(persp(30 * Math.PI / 180, S.aspect, .02, 30), lookAt(c.eye, c.tgt, norm([0, 1 - c.up, -c.up]))));
  function matrices() {
    S.vp = vpOf(S.cam);
    S.inv = invert(S.vp); S.eye = S.cam.eye;
  }

  /* 贴近时同一年的封套：站在盘上，是盘的一部分（随盘转动、有透视和倒影），同时保证互不遮挡。
     - 放得下：沿这一年辐线的切线排成一排。静止时这一排正对镜头、深度相同，所以投影后不会互相挤压。
     - 放不下（窄屏、同年歌多）：沿这一圈排成弧，像转盘一样转到哪张看哪张。
     尺寸按镜头最终位置换算成屏幕像素来定，和镜头动画无关。 */
  function fanLayout() {
    if (S.mode !== 'close' || !S.sleeveSet.size || S.band < 0) return null;
    const list = [...S.sleeveSet].map(id => sleeveFor(rings.find(g => g.id === id))), n = list.length;
    const pf = opts.panelFrac?.() ?? 0, r0 = list.reduce((a, s) => a + s.g.mid, 0) / n;
    const phi0 = (list[0].g.t.year % 10) / 10 * TAU;
    const vp = vpOf(CAM.close(S.aspect, pf, bands[S.band]));
    const px = p => { const c = xf(vp, p); return (c[0] / c[3] * .5 + .5) * S.W; };
    const ppu = Math.abs(px([.05, 0, r0]) - px([-.05, 0, r0])) / .1;          // 这一排所在深度：每个世界单位多少像素
    const avail = S.W * (1 - pf) - (S.W <= 860 ? 28 : 72);
    const ws = list.map(s => Math.max(s.w, .72)), sum = ws.reduce((a, w) => a + w, 0), GAP = .2;
    const fitPx = avail / (sum + GAP * (n - 1)), maxPx = S.W <= 860 ? 132 : 156;
    const onDisc = 2 * Math.sqrt(Math.max(.01, .96 * .96 - r0 * r0));        // 一排的两端不能伸出盘外
    const mode = fitPx >= 72 ? 'row' : 'arc';
    let H = (mode === 'row' ? Math.min(fitPx, maxPx) : 104) / ppu;
    H = Math.min(H, .2, mode === 'row' ? onDisc / (sum + GAP * (n - 1)) : 9);
    const span = H * (sum + GAP * (n - 1)), items = new Map();
    let off = -span / 2;
    list.forEach((s, i) => { const c = off + H * ws[i] / 2; off += H * (ws[i] + GAP); items.set(s.g.id, {c, h: H}); });
    return {mode, phi0, r0, items, H};
  }
  // 布局 → 世界坐标。序号向右递增（和按钮、方向键的顺序一致）。
  function fanWorld(L, id) {
    const it = L.items.get(id); if (!it) return null;
    if (L.mode === 'row') {
      const a = L.phi0 + S.rot, o = [Math.sin(a), 0, -Math.cos(a)], t = [Math.cos(a), 0, Math.sin(a)];
      return {p: [L.r0 * o[0] - t[0] * it.c, 0, L.r0 * o[2] - t[2] * it.c], out: o, h: it.h};
    }
    const a = L.phi0 - it.c / L.r0 + S.rot, o = [Math.sin(a), 0, -Math.cos(a)];
    return {p: [L.r0 * o[0], 0, L.r0 * o[2]], out: o, h: it.h};
  }

  const worldOf = g => { const a = g.phi + S.rot; return [g.mid * Math.sin(a), 0, -g.mid * Math.cos(a)]; };
  function project(p) { const c = xf(S.vp, p); if (c[3] <= 0) return null; return [(c[0] / c[3] * .5 + .5) * S.W, (1 - (c[1] / c[3] * .5 + .5)) * S.H, c[3]]; }
  function pick(x, y) {
    if (!S.inv) return null;
    const nx = x / S.W * 2 - 1, ny = 1 - y / S.H * 2;
    const a = xf(S.inv, [nx, ny, -1]), b = xf(S.inv, [nx, ny, 1]);
    const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
    const dy = p1[1] - p0[1]; if (Math.abs(dy) < 1e-6) return null;
    const t = -p0[1] / dy; if (t < 0) return null;
    const wx = p0[0] + (p1[0] - p0[0]) * t, wz = p0[2] + (p1[2] - p0[2]) * t;
    const r = Math.hypot(wx, wz), world = Math.atan2(wx, -wz);
    return {r, world, phi: ((world - S.rot) % TAU + TAU) % TAU, x: wx, z: wz};
  }
  let sleeveHits = [];
  const pickSleeve = (x, y) => { for (let i = sleeveHits.length - 1; i >= 0; i--) { const h = sleeveHits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.g; } return null; };

  let spreadSlots = [];
  function screenWorld(x, y, z) {
    const p = xf(S.inv, [x / S.W * 2 - 1, 1 - y / S.H * 2, z]);
    return [p[0]/p[3],p[1]/p[3],p[2]/p[3]];
  }
  function spreadQuad(slot, s, mirror) {
    const g = rings.find(g => g.i === S.focus) || s.g, clip = xf(S.vp, worldOf(g));
    const z = clip[2] / clip[3], r = slot.image, scale = .82 + .18 * s.up;
    const bottom = r.y + r.height, cx = r.x + r.width / 2;
    const p = screenWorld(cx, bottom, z), rx = sub(screenWorld(cx + r.width * scale / 2, bottom, z), p);
    const up = sub(screenWorld(cx, bottom + (mirror ? r.height * .3 : -r.height * scale), z), p);
    return {p,right:norm(rx),up:norm(up),size:[Math.hypot(...rx)*2,Math.hypot(...up)]};
  }

  // 唱针落在半径 rho 时，唱臂的偏角
  const pivotD = Math.hypot(ARM.pivot[0], ARM.pivot[2]);
  function armYaw(rho) {
    const cosA = Math.max(-1, Math.min(1, (pivotD * pivotD + ARM.L * ARM.L - rho * rho) / (2 * pivotD * ARM.L))), alpha = Math.acos(cosA);
    const cx = -ARM.pivot[0] / pivotD, cz = -ARM.pivot[2] / pivotD;
    // 唱臂在盘的后侧：取离观众远的那个解
    const dir = s => [cx * Math.cos(s * alpha) - cz * Math.sin(s * alpha), cx * Math.sin(s * alpha) + cz * Math.cos(s * alpha)];
    const d1 = dir(1), d2 = dir(-1), d = d1[1] < d2[1] ? d1 : d2;
    return {yaw: Math.atan2(-d[1], d[0]), tip: [ARM.pivot[0] + d[0] * ARM.L, 0, ARM.pivot[2] + d[1] * ARM.L]};
  }

  function step(dt) {
    const instant = reduced(), k = r => instant ? 1 : 1 - Math.exp(-dt * r);
    let moving = false;
    const lerp = (a, b, t) => a + (b - a) * t;
    // 镜头
    const c = S.cam, g = S.goal, kc = k(S.camRate);
    for (let i = 0; i < 3; i++) { c.eye[i] = lerp(c.eye[i], g.eye[i], kc); c.tgt[i] = lerp(c.tgt[i], g.tgt[i], kc); }
    c.shift = lerp(c.shift, g.shift, kc); c.up = lerp(c.up, g.up, kc);
    const camErr = Math.hypot(c.eye[0] - g.eye[0], c.eye[1] - g.eye[1], c.eye[2] - g.eye[2]) + Math.abs(c.up - g.up);
    if (camErr > 2e-4) moving = true; else { c.eye = [...g.eye]; c.tgt = [...g.tgt]; c.shift = g.shift; c.up = g.up; }
    // 盘的转动
    if (!S.dragging) {
      if (S.rotGoal !== null) {
        let d = ((S.rotGoal - S.rot + Math.PI) % TAU + TAU) % TAU - Math.PI;
        S.rot += d * k(6.5); S.rotV = 0;
        if (Math.abs(d) < 4e-4) { S.rot = S.rotGoal; S.rotGoal = null; } else moving = true;
      } else if (Math.abs(S.rotV) > .002 && !instant) { S.rot += S.rotV * dt; S.rotV *= Math.exp(-dt * 2.6); moving = true; }
      if (S.spin && S.rotGoal === null && !instant) { S.rot += dt * .34; moving = true; }
    }
    // 光
    S.light = lerp(S.light, S.lightGoal, k(3.2)); S.sweep = lerp(S.sweep, S.sweepGoal, k(2.6));
    if (Math.abs(S.light - S.lightGoal) + Math.abs(S.sweep - S.sweepGoal) > .002) moving = true; else { S.light = S.lightGoal; S.sweep = S.sweepGoal; }
    S.space = lerp(S.space, S.spaceGoal, k(2.6));
    if (Math.abs(S.space - S.spaceGoal) > .002) moving = true; else S.space = S.spaceGoal;
    // 唱臂：先抬起，移过去，再落下
    const a = S.arm, away = Math.abs(a.rho - a.goal) > .003;
    const liftGoal = away || !a.down ? 1 : 0;
    a.lift = lerp(a.lift, liftGoal, k(away ? 9 : 5));
    if (away && a.lift > .8) a.rho = lerp(a.rho, a.goal, k(4.5));
    if (!away) a.rho = a.goal;
    if (away || Math.abs(a.lift - liftGoal) > .004) moving = true; else a.lift = liftGoal;
    // 封套
    const nowS = performance.now();
    for (const s of sleeves.values()) {
      const goal = S.sleeveSet.has(s.g.id) ? 1 : 0;
      if (goal && nowS < s.t0 && !instant) { moving = true; continue; }   // 依次立起
      if (s.up !== goal) { s.up = lerp(s.up, goal, k(goal ? 7 : 10)); if (Math.abs(s.up - goal) < .004) s.up = goal; else moving = true; }
      const hg = S.mode === 'close' ? (s.g.i === S.focus ? 1 : s.g.i === S.hover ? .6 : 0) : 0;
      if (Math.abs(s.hov - hg) > .003) { s.hov = lerp(s.hov, hg, k(9)); moving = true; } else s.hov = hg;
    }
    // 刻纹
    if (cuts.length) {
      const now = performance.now();
      for (let i = cuts.length - 1; i >= 0; i--) { const q = cuts[i], t = instant ? 1 : Math.min(1, (now - q.t0) / q.ms), e = 1 - Math.pow(1 - t, 3);
        laneNow.set(q.id, q.from.map((f, j) => f + (q.to[j] - f) * e));
        if (t >= 1) { cuts.splice(i, 1); if (S.cut === q.i) S.cut = -1; q.done?.(); } }
      uploadRings(); moving = true;
    }
    if (S.play >= 0) moving = moving || !instant;
    return moving;
  }

  function draw() {
    matrices();
    gl.viewport(0, 0, canvas.width, canvas.height);
    const room = 1 - S.space; gl.clearColor(15 / 255 * room, 13 / 255 * room, 12 / 255 * room, room); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    // 地面
    gl.useProgram(P.floor.p); gl.uniformMatrix4fv(P.floor.u.uVP, false, S.vp); gl.uniform1f(P.floor.u.uY, -GEO.T - .0005); gl.uniform1f(P.floor.u.uLight, S.light); gl.uniform1f(P.floor.u.uSpace, S.space);
    gl.bindVertexArray(vaoFloor); gl.drawArrays(gl.TRIANGLES, 0, 6);
    // 侧壁、唱臂底座
    const I = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    gl.useProgram(P.mesh.p); const um = P.mesh.u;
    gl.uniformMatrix4fv(um.uVP, false, S.vp); gl.uniform3fv(um.uEye, S.eye); gl.uniform1f(um.uLight, S.light); gl.uniform1f(um.uSweep, S.sweep);
    gl.uniformMatrix4fv(um.uModel, false, I);
    gl.bindVertexArray(meshSide.vao); gl.drawArrays(gl.TRIANGLES, 0, meshSide.count);
    gl.bindVertexArray(meshBase.vao); gl.drawArrays(gl.TRIANGLES, 0, meshBase.count);
    // 盘面
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P.disc.p); const u = P.disc.u;
    gl.uniformMatrix4fv(u.uVP, false, S.vp); gl.uniform1f(u.uRot, S.rot); gl.uniform3fv(u.uEye, S.eye);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tLut); gl.uniform1i(u.uLut, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tRing); gl.uniform1i(u.uRing, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tLabel); gl.uniform1i(u.uLabel, 2);
    gl.uniform1f(u.uHover, S.hover); gl.uniform1f(u.uFocus, S.focus); gl.uniform1f(u.uPlay, S.play); gl.uniform1f(u.uBand, S.mode === 'close' ? S.band : -1);
    gl.uniform1f(u.uCut, S.cut); gl.uniform1f(u.uLight, S.light); gl.uniform1f(u.uSweep, S.sweep); gl.uniform1f(u.uTime, S.time);
    gl.uniform4f(u.uGeo, GEO.RL, GEO.R1, GEO.R2, GEO.unit);
    gl.bindVertexArray(vaoDisc); gl.drawArrays(gl.TRIANGLES, 0, 6);
    const fan = new Map(), L = fanLayout();
    if (L) for (const id of L.items.keys()) fan.set(id, fanWorld(L, id));
    spreadSlots = []; const slotsById = new Map();
    // 封套
    sleeveHits = [];
    // 点击区域与无障碍按钮的位置：按静止时的四个角投影，不等贴图载入，也不随悬停、选中改变
    for (const [id, fp] of fan) {
      const g = rings.find(g => g.id === id), s = sleeveFor(g), p = fp.p;
      const toEye = norm([S.eye[0] - p[0], 0, S.eye[2] - p[2]]), face = norm([fp.out[0] * .55 + toEye[0] * .45, 0, fp.out[2] * .55 + toEye[2] * .45]), right = [face[2], 0, -face[0]];
      const hw = fp.h * s.w / 2, hh = fp.h * s.h, pts = [[-hw, 0], [hw, 0], [-hw, hh], [hw, hh]].map(([a, b]) => project([p[0] + right[0] * a, b, p[2] + right[2] * a])).filter(Boolean);
      if (pts.length < 4) continue;
      const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      sleeveHits.push({g, x0, x1, y0, y1, top: [(x0 + x1) / 2, y0], d: Math.hypot(p[0] - S.eye[0], p[2] - S.eye[2])});
    }
    sleeveHits.sort((a, b) => b.d - a.d);
    const list = [];
    for (const s of sleeves.values()) { if (s.up <= .01 || (S.mode === 'close' && !S.sleeveSet.has(s.g.id))) continue; loadSleeve(s); if (!s.tex) continue; const p = fan.get(s.g.id)?.p || worldOf(s.g); list.push({s, p, d: Math.hypot(p[0] - S.eye[0], p[2] - S.eye[2])}); }
    list.sort((a, b) => b.d - a.d);
    if (list.length) {
      gl.useProgram(P.sleeve.p); const us = P.sleeve.u; gl.uniformMatrix4fv(us.uVP, false, S.vp); gl.uniform1i(us.uTex, 3); gl.activeTexture(gl.TEXTURE3); gl.bindVertexArray(vaoSleeve);
      const pass = mirror => {
        for (const {s, p} of list) {
          const slot = slotsById.get(s.g.id);
          if (slot) {
            const q = spreadQuad(slot, s, mirror);
            gl.bindTexture(gl.TEXTURE_2D, s.tex);
            gl.uniform3fv(us.uBase, q.p); gl.uniform3fv(us.uRight, q.right); gl.uniform3fv(us.uUp, q.up);
            gl.uniform2f(us.uSize, ...q.size); gl.uniform1f(us.uRound, s.round ? 1 : 0);
            gl.uniform1f(us.uAlpha, s.up * S.light); gl.uniform1f(us.uMirror, mirror ? 1 : 0);
            gl.uniform1f(us.uShade, (s.g.i === S.focus ? 1 : .9) * Math.min(1, S.light));
            gl.uniform3f(us.uTint, 0, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 6);
            if (!mirror) sleeveHits.push({g:s.g,x0:slot.image.x,x1:slot.image.x+slot.image.width,y0:slot.image.y,y1:slot.image.y+slot.image.height,top:[slot.image.x+slot.image.width/2,slot.image.y]});
            continue;
          }
          const fp = fan.get(s.g.id);
          const toEye = norm([S.eye[0] - p[0], 0, S.eye[2] - p[2]]);
          // 贴近时封套朝外（沿半径）站，再向镜头转一半：拖动盘面时，两侧的封套会跟着侧转
          const face = fp ? norm([fp.out[0] * .55 + toEye[0] * .45, 0, fp.out[2] * .55 + toEye[2] * .45]) : toEye, right = [face[2], 0, -face[0]];
          const tilt = (1 - s.up) * 1.35 - (fp ? s.hov * .06 : 0), cy = Math.cos(tilt), sy = Math.sin(tilt);
          const up = [-face[0] * sy, cy * (mirror ? -1 : 1), -face[2] * sy];
          const size = fp ? fp.h * (1 + .07 * s.hov) : S.sleeveScale * (s.g.i === S.focus ? 1.18 : 1) * (.046 + .03 * s.g.mid);
          const lift = fp ? s.hov * fp.h * .1 * (mirror ? -1 : 1) : 0;
          const base = [p[0], (mirror ? -.0005 : .0008) + lift, p[2]];
          gl.bindTexture(gl.TEXTURE_2D, s.tex);
          gl.uniform3fv(us.uBase, base); gl.uniform3fv(us.uRight, right); gl.uniform3fv(us.uUp, up);
          gl.uniform2f(us.uSize, size * s.w, size * s.h); gl.uniform1f(us.uRound, s.round ? 1 : 0); gl.uniform1f(us.uAlpha, s.up * S.light); gl.uniform1f(us.uMirror, mirror ? 1 : 0);
          gl.uniform1f(us.uShade, (S.mode === 'close' && S.focus >= 0 && s.g.i !== S.focus ? .8 + .12 * s.hov : 1) * Math.min(1, S.light));
          gl.uniform3f(us.uTint, 0, 0, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          if (fp) {}
          else if (!mirror && s.up > .6) { const top = project([p[0], size * s.h, p[2]]), bot = project(p), half = project([p[0] + right[0] * size * s.w / 2, 0, p[2] + right[2] * size * s.w / 2]);
            if (top && bot && half) { const hw = Math.abs(half[0] - bot[0]) + 2; sleeveHits.push({g: s.g, x0: bot[0] - hw, x1: bot[0] + hw, y0: top[1] - 2, y1: bot[1] + 2, top}); } }
        }
      };
      gl.disable(gl.DEPTH_TEST); pass(true); if (!spreadSlots.length) gl.enable(gl.DEPTH_TEST); pass(false); gl.enable(gl.DEPTH_TEST);
    }
    // 唱臂
    gl.disable(gl.BLEND);
    gl.useProgram(P.mesh.p);
    const {yaw} = armYaw(S.arm.rho), pitch = S.arm.lift * .062, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    // 模型 = 平移(支点) · 绕 Y 转 yaw · 绕 Z 抬起
    const model = new Float32Array([cy * cp, sp, -sy * cp, 0, -cy * sp, cp, sy * sp, 0, sy, 0, cy, 0, pv[0], pv[1], pv[2], 1]);
    gl.uniformMatrix4fv(um.uModel, false, model);
    gl.bindVertexArray(meshArm.vao); gl.drawArrays(gl.TRIANGLES, 0, meshArm.count);
    gl.bindVertexArray(null);
  }

  function frame(now) {
    raf = 0; if (dead) return;
    const dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now; S.time = now / 1000;
    const moving = step(dt);
    draw(); opts.onFrame?.(api);
    if (moving || now < wake) raf = requestAnimationFrame(frame); else last = 0;
  }
  function request() { if (!raf && !dead && !document.hidden) raf = requestAnimationFrame(frame); }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  const onVis = () => { if (!document.hidden) { last = 0; request(); } };
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); dead = true; cancelAnimationFrame(raf); opts.onLost?.(); });

  const api = {
    state: S, project, pick, pickSleeve, worldOf, request, bands, rings,
    sleeveHits: () => sleeveHits, sleeveLayout: () => spreadSlots,
    setMode(mode, band = -1, rate = 4.2) { S.mode = mode; S.band = band; S.camRate = rate; S.goal = goalFor(); request(); },
    jumpCamera() { S.cam = structuredClone(S.goal); request(); },
    setHover(i) { if (S.hover !== i) { S.hover = i; request(); } },
    setFocus(i) { if (S.focus !== i) { S.focus = i; request(); } },
    setMarks(ids) { marks.clear(); for (const id of ids || []) marks.add(id); uploadRings(); request(); },
    setSleeves(ids, scale = 1) {
      const prev = S.sleeveSet, now = performance.now(); let k = 0;
      S.sleeveSet = new Set(ids); S.sleeveScale = scale;
      for (const id of S.sleeveSet) { const s = sleeveFor(rings.find(g => g.id === id)); if (!prev.has(id) && s.up < .05) s.t0 = now + (k++) * 70; }
      request(); },
    rotateTo(phi) { S.rotGoal = Math.PI - phi; request(); },
    // 页面在后台不出帧时，手动走几步并画一帧（只用于检查）
    renderNow(steps = 1) { resize(); S.cam ||= structuredClone(S.goal); for (let i = 0; i < steps; i++) step(.05); draw(); opts.onFrame?.(api); },
    // 录制用：按任意步长推进一步并画出来
    advance(dt) { resize(); S.cam ||= structuredClone(S.goal); step(dt); draw(); opts.onFrame?.(api); },
    // 贴近时把哪个角度转到正面：一排 → 这一年的辐线；弧 → 这张封套自己
    frontPhi(id) { const L = fanLayout(), it = L?.items.get(id); return !it ? rings.find(g => g.id === id)?.phi ?? 0 : L.mode === 'row' ? L.phi0 : L.phi0 - it.c / L.r0; },
    fanMode: () => fanLayout()?.mode || null,
    // 弧形转盘松手时：离正面最近的那张
    nearestSleeve() { const L = fanLayout(); if (!L) return null; const front = Math.PI - S.rot; let best = null, bd = 9;
      for (const [id, it] of L.items) { const d = Math.abs(((L.phi0 - it.c / L.r0 - front + Math.PI) % TAU + TAU) % TAU - Math.PI); if (d < bd) { bd = d; best = id; } } return best; },
    home() { S.rotGoal = 0; request(); },
    rotateBy(d) { S.rot += d; S.rotGoal = null; request(); },
    setDragging(on, vel = 0) { S.dragging = on; if (!on) S.rotV = vel; else { S.rotGoal = null; S.rotV = 0; } request(); },
    arm(rho, down) { S.arm.goal = rho ?? ARM.rest; S.arm.down = !!down; request(); },
    armSettled: () => Math.abs(S.arm.rho - S.arm.goal) < .004 && (S.arm.down ? S.arm.lift < .05 : true),
    setPlay(i, spin) { S.play = i; S.spin = !!spin; request(); },
    setLight(light, sweep, snap) { S.lightGoal = light; S.sweepGoal = sweep; if (snap) { S.light = light; S.sweep = sweep; } request(); },
    // 深空：0 = 暗室地面（以前的样子），1 = 地面化开，露出下面的宇宙
    setSpace(v, snap) { S.spaceGoal = v; if (snap) S.space = v; request(); },
    // 唱臂在世界里的两端（配重、唱针），给深空的封面让位
    armSegment() { const {yaw} = armYaw(S.arm.rho), d = [Math.cos(yaw), 0, -Math.sin(yaw)];
      return [[pv[0] - d[0] * .32, pv[1], pv[2] - d[2] * .32], [pv[0] + d[0] * (ARM.L + .02), pv[1], pv[2] + d[2] * (ARM.L + .02)]]; },
    refreshLanes() { for (const g of rings) if (!cuts.some(q => q.id === g.id)) laneNow.set(g.id, lanesOf(g.id)); uploadRings(); request(); },
    // 把一圈从旧的刻纹过渡到新的
    cut(id, from, to, ms = 1400, done) { const g = rings.find(g => g.id === id); if (!g) return; laneNow.set(id, from); cuts.push({id, i: g.i, from, to, t0: performance.now(), ms, done}); S.cut = g.i; request(); },
    keepAwake(ms) { wake = performance.now() + ms; request(); },
    destroy() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
  };
  resize();
  return api;
}
