export const KEY='fat-fish-museum-ui-v1';
export function readPrefs(){try{const raw=localStorage.getItem(KEY);if(!raw||new TextEncoder().encode(raw).length>1024)return {version:1};const p=JSON.parse(raw);return p?.version===1?p:{version:1};}catch{return {version:1};}}
export function writePrefs(patch){try{const p={...readPrefs(),...patch,version:1};const raw=JSON.stringify(p);if(new TextEncoder().encode(raw).length>1024)return false;localStorage.setItem(KEY,raw);return true;}catch{return false;}}
