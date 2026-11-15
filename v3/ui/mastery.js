import {status, KEYS} from '../memory.js';
export function fieldState(stat) { if (!stat || !stat.n) return 'n'; const s=status(stat); return s==='稳定掌握'?'s':s==='明显薄弱'?'r':'w'; }
export function songState(record) { if(!record)return 'none'; const states=KEYS.map(k=>fieldState(record.fields?.[k])); return states.includes('r')?'weak':states.every(s=>s==='s')?'stable':'work'; }
export function counts(memory, tracks) { const out={none:0,weak:0,work:0,stable:0,total:tracks.length}; for(const t of tracks)out[songState(memory?.records?.[t.id])]++; return out; }
