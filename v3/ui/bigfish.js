// The neutral drawing is the owner's original front-view pixels. Generated art repairs occluded areas only.
import { MATTES } from './bigfish-tail.js';
import { BODY_EXTRA } from './bigfish-body.js';
let serial = 0;
const asset = name => new URL('../assets/bigfish-v2/' + name + '.png', import.meta.url).href;
const parts = {
  body:'M205 389 Q284 399 366 389 L394 480 L427 502 L492 579 L479 615 L453 645 L375 650 L380 712 L185 712 L180 650 L105 620 L77 585 L147 510 L174 481 Z',
  tail:'M380 644 Q400 645 410 637 L416 635 Q436 631 450 614 L451 608 Q460 609 468 599 L476 587 L479 585 Q501 580 517 560 L516 553 Q505 561 499 548 Q492 527 515 510 Q522 498 539 496 Q568 484 588 467 L608 458 L608 684 L375 684 Z',
  earL:'M105 260 L108 347 L92 351 L0 355 L0 300 L66 260 Z',
  earR:'M450 274 L464 248 Q485 257 500 254 Q530 283 562 298 L582 299 L582 350 L449 350 Z',
  tuft:'M242 74 L245 39 Q238 3 199 0 Q141 -7 104 35 Q85 57 84 96 Q94 105 109 81 Q141 36 189 31 Q224 24 239 67 Z',
  armL:'M190 427 C179 431 169 445 171 463 C173 481 190 491 217 485 L241 469 L243 444 L226 432 Z',
  armR:'M380 427 C391 431 401 445 399 463 C397 481 380 491 353 485 L329 469 L327 444 L344 432 Z',
  eyeL:'M168 304 L177 291 L185 286 L189 279 L198 281 L198 276 L207 282 Q227 280 240 295 L248 308 L247 328 Q238 346 219 348 Q190 349 176 331 L169 321 Z',
  eyeR:'M309 304 Q319 281 344 278 L369 277 L377 280 L381 277 L385 285 L392 286 L393 292 L400 292 L399 301 L405 310 L399 323 Q385 347 355 346 Q327 349 315 332 Z',
  mouth:'M260 348 H306 V385 H260 Z'
};
parts.tail = MATTES.tail;
parts.bodyExtra = BODY_EXTRA;
const path=(name,fill='white')=>`<path d="${parts[name]}" fill="${fill}" transform="translate(0 31)"/>`;
function markup() {
  const id='bfr'+(++serial)+'-',ref=n=>`url(#${id+n})`;
  const original=(name,mask=false)=>`<image data-part="original-${name}" href="${asset('original-front')}" x="0" y="31" width="603" height="711" ${mask?'mask':'clip-path'}="${ref(name)}"/>`;
  const helper=(name,x,y,w,h,clip='')=>`<image data-part="${name}" href="${asset(name)}" x="${x}" y="${y+31}" width="${w}" height="${h}" preserveAspectRatio="none"${clip?' clip-path="'+ref(clip)+'"':''}/>`;
  return `<svg class="bf-svg" viewBox="0 0 603 784" aria-hidden="true" focusable="false"><defs>
    ${Object.keys(parts).map(n=>`<clipPath id="${id+n}" clipPathUnits="userSpaceOnUse">${path(n)}</clipPath>`).join('')}
    <filter id="${id}faceEdge" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <mask id="${id}faceExpression" maskUnits="userSpaceOnUse" x="0" y="0" width="603" height="784"><rect x="151" y="281" width="277" height="147" rx="25" fill="white" filter="${ref('faceEdge')}"/></mask>
    <clipPath id="${id}faceHoles">${['eyeL','eyeR','mouth'].map(n=>path(n)).join('')}</clipPath>
    <clipPath id="${id}bodyFilled">${path('body')}${path('bodyExtra')}</clipPath>
    <clipPath id="${id}hairRepairRange"><rect x="0" y="420" width="603" height="250"/></clipPath>
    <clipPath id="${id}armHoles">${['armL','armR'].map(n=>path(n)).join('')}</clipPath>
    <clipPath id="${id}headRepair">${['earL','earR','tuft'].map(n=>path(n)).join('')}</clipPath>
    <mask id="${id}originalAlpha" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="603" height="784"><image href="${asset('original-front')}" x="0" y="31" width="603" height="711"/></mask>
    <mask id="${id}noTail" maskUnits="userSpaceOnUse" x="0" y="0" width="603" height="784"><rect width="603" height="784" fill="white"/>${path('tail','black')}</mask>
    <mask id="${id}head" maskUnits="userSpaceOnUse" x="0" y="0" width="603" height="784"><rect width="603" height="784" fill="white"/>${['body','bodyExtra','tail','earL','earR','tuft'].map(n=>path(n,'black')).join('')}</mask>
    <mask id="${id}bodyBase" maskUnits="userSpaceOnUse" x="0" y="0" width="603" height="784">${path('body')}${path('bodyExtra')}${['armL','armR','tail'].map(n=>path(n,'black')).join('')}</mask>
    </defs><g class="bf-all">
    <g class="bf-head-underlay" mask="${ref('originalAlpha')}">${helper('occlusion-plate',2,13,590.2,696,'headRepair')}<g mask="${ref('noTail')}">${helper('head-hidden',0,0,603,711,'hairRepairRange')}</g></g>
    <g class="bf-tail"><g clip-path="${ref('body')}" mask="${ref('originalAlpha')}">${helper('tail-hidden',0,0,603,711)}</g>${original('tail')}</g>
    <g class="bf-head">
      <g class="bf-ear bf-ear-l">${original('earL')}</g><g class="bf-ear bf-ear-r">${original('earR')}</g>
      ${original('head',true)}
      <g class="bf-eye bf-eye-l">${original('eyeL')}</g><g class="bf-eye bf-eye-r">${original('eyeR')}</g>
      <g class="bf-blink"><image data-part="closed-face" href="${asset('face-closed')}" x="0" y="31" width="603" height="711" mask="${ref('faceExpression')}"/></g>
      <g class="bf-happy"><image data-part="closed-face" href="${asset('face-closed')}" x="0" y="31" width="603" height="711" mask="${ref('faceExpression')}"/></g>
      <g class="bf-mouth bf-smile">${original('mouth')}</g><g class="bf-mouth bf-open">${original('mouth')}</g>
      <g class="bf-ahoge">${original('tuft')}</g>
    </g>
    <g class="bf-body"><g mask="${ref('originalAlpha')}">${helper('occlusion-plate',2,13,590.2,696,'armHoles')}</g>${original('bodyBase',true)}</g>
    <g class="bf-arm bf-arm-l">${original('armL')}</g><g class="bf-arm bf-arm-r">${original('armR')}</g>
    <g class="bf-up bf-up-l">${helper('raised-left',95,320,112,119.68)}</g>
    <g class="bf-up bf-up-r">${helper('raised-right',351,320,112,125.13)}</g>
    <g class="bf-spark">${[[94,285,13],[477,280,16],[66,352,10],[510,350,11]].map(([x,y,r],i)=>`<path class="bf-sp bf-sp${i}" d="M${x} ${y-r}l${r*.3} ${r*.7}l${r*.7} ${r*.3}l${-r*.7} ${r*.3}l${-r*.3} ${r*.7}l${-r*.3} ${-r*.7}l${-r*.7} ${-r*.3}l${r*.7} ${-r*.3}Z" fill="#FFD23F" stroke="#1B2052" stroke-width="2"/>`).join('')}</g>
    </g></svg>`;
}
export function createBigFish({pose='idle',size=120,label='大肥鱼',className=''}={}) {
  const el=document.createElement('div');el.className='bf bf-reference '+className;el.dataset.pose=pose;el.style.setProperty('--bf',size+'px');el.setAttribute('role','img');el.setAttribute('aria-label',label);el.innerHTML=markup();
  let base=pose,hold=0;
  const api={el,pose(p){base=p;clearTimeout(hold);el.dataset.pose=p;return api;},react(p='yay',ms=900){clearTimeout(hold);el.dataset.pose=p;hold=setTimeout(()=>{el.dataset.pose=base;},ms);return api;}};
  return api;
}
export const fishMarkup=()=>markup();
