import { canonicalEntry, canonicalId, canonicalIds } from './track-model.js';
export const KEYS = ['song', 'year', 'artist', 'style'];
const unsafe = key => ['__proto__', 'constructor', 'prototype'].includes(key);
export function emptyMemory() { return { version: 2, records: {}, anchors: {}, events: {} }; }
export function status(stat) {
  if (!stat || stat.n < 4) return '数据不足';
  const recent = stat.recent || [];
  if ((recent.length >= 2 && recent.slice(-2).every(x => !x)) || stat.c / stat.n < .6) return '明显薄弱';
  if (stat.n >= 8 && stat.c / stat.n >= .85 && recent.length >= 3 && recent.slice(-3).every(Boolean)) return '稳定掌握';
  return '仍需加强';
}
function normalize(entry, tracks, token) {
  if (!entry || typeof entry !== 'object' || typeof token !== 'string' || unsafe(token)) return null;
  entry = canonicalEntry(entry, tracks);
  const track = tracks.find(t => t.id === entry.id);
  if (!track || !Array.isArray(entry.fields)) return null;
  const seen = new Set();
  const fields = entry.fields.filter(f => f && KEYS.includes(f.key) && typeof f.isCorrect === 'boolean' && !seen.has(f.key) && seen.add(f.key));
  if (!fields.length) return null;
  return { ...entry, eventId: token, fields: fields.map(f => ({ ...f, correct: track.id === 't31' && f.key === 'year' && String(f.correct) === '1953' ? '1953' : String(track[f.key]) })) };
}
function aggregate(memory, ids) {
  const rows = new Map();
  const events = Object.values(memory.events).filter(e => !ids || ids.has(e.id)).sort((a,b) => String(a.time || '').localeCompare(String(b.time || '')));
  for (const event of events) {
    const row = rows.get(event.id) || { id: event.id, first: event.time || null, last: null, fields: {} };
    row.last = event.time || null;
    for (const field of event.fields) {
      const s = row.fields[field.key] ||= { n: 0, c: 0, recent: [] };
      s.n++; if (field.isCorrect) s.c++;
      s.recent = [...s.recent, field.isCorrect].slice(-8);
    }
    rows.set(event.id, row);
  }
  for (const [id, row] of rows) memory.records[id] = row;
}
export function record(memory, entry, tracks, eventId) {
  const token = eventId || entry?.eventId || JSON.stringify([entry?.id, entry?.time, entry?.fields]);
  const normalized = normalize(entry, tracks, token);
  if (!normalized) return false;
  memory.events[token] = JSON.parse(JSON.stringify(normalized));
  aggregate(memory, new Set([normalized.id]));
  return true;
}
export function migrate(raw, entries, tracks) {
  const m = emptyMemory(), known = new Map(tracks.map(t => [t.id, t]));
  if (raw?.version === 2 && raw.events && typeof raw.events === 'object' && !Array.isArray(raw.events)) {
    for (const [token, entry] of Object.entries(raw.events)) { const e = normalize(entry, tracks, token); if (e) m.events[token] = e; }
  }
  for (const entry of Array.isArray(entries) ? entries : []) {
    const token = entry?.eventId || JSON.stringify([entry?.id, entry?.time, entry?.fields]);
    const e = normalize(entry, tracks, token);
    if (e && !Object.hasOwn(m.events, token)) m.events[token] = e;
  }
  aggregate(m);
  if (raw?.anchors && typeof raw.anchors === 'object') {
    const anchors = Object.entries(raw.anchors);
    // Keep existing anchors for the current year before moving the old 1953 one.
    for (const [year, oldId] of anchors) {
      const id = canonicalId(oldId, tracks);
      if (String(known.get(id)?.year) === year && m.records[id]) m.anchors[year] = id;
    }
    for (const [year, oldId] of anchors) {
      const id = canonicalId(oldId, tracks), track = known.get(id);
      if (id === 't31' && year === '1953' && track?.year === 1952 && m.records[id] && !m.anchors[1952]) m.anchors[1952] = id;
    }
  }
  m.roundIds = Array.isArray(raw?.roundIds) ? canonicalIds(raw.roundIds, tracks).filter(id => known.has(id) && m.records[id]) : [];
  m.roundId = typeof raw?.roundId === 'string' ? raw.roundId : '';
  return m;
}
export function groups(memory, tracks, ids, filter = {}) {
  const map = new Map();
  for (const t of tracks) {
    if (!memory.records[t.id] || (ids && !ids.has(t.id))) continue;
    const r = memory.records[t.id];
    if (filter.year && String(t.year) !== filter.year) continue;
    if (filter.artist && t.artist !== filter.artist) continue;
    if (filter.style && t.style !== filter.style) continue;
    if (filter.query && ![t.song,t.artist,t.songKo,t.artistKo,t.versionLabel||'',...(t.aliases||[]),t.year,t.style,...(filter.styleNames?.[t.style] || [])].join(' ').toLocaleLowerCase().includes(filter.query.toLocaleLowerCase())) continue;
    if (filter.weak && !Object.values(r.fields).some(s => ['明显薄弱', '仍需加强'].includes(status(s)))) continue;
    if (filter.yearWeak && !['明显薄弱', '仍需加强'].includes(status(r.fields.year))) continue;
    const y = Number.isInteger(t.year) ? t.year : '未注明';
    if (!map.has(y)) map.set(y, []);
    map.get(y).push(t);
  }
  return [...map].sort((a,b) => a[0] === '未注明' ? 1 : b[0] === '未注明' ? -1 : Number(a[0]) - Number(b[0]));
}
