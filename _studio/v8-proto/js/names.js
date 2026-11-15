// 显示与填空共用同一套可接受写法；沿用课程评分，不做模糊匹配。
import {writtenCandidates, normalizeAnswer, gradeWritten as gradeCourseWritten} from '../../../v3/written.js';

// 课件保留旧题名，补上后来通行的同一作品题名。
const SONG_NAMES = {t18: ['황성옛터']};
const withNames = t => SONG_NAMES[t.id] ? {...t, aliases: [...(t.aliases || []), ...SONG_NAMES[t.id]]} : t;

export function candidateNames(track, field, styles, allTracks) {
  return writtenCandidates(withNames(track), field, styles, allTracks).filter(Boolean);
}
export function alternateNames(track, field, styles, allTracks, exclude = []) {
  const primary = field === 'style' ? styles.find(s => s.id === track.style)?.label : track[field];
  const seen = new Set([primary, ...exclude].map(normalizeAnswer));
  const names = candidateNames(track, field, styles, allTracks).filter(name => {
    const key = normalizeAnswer(name);
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
  // 风格资料同时存有组合名与每个分项；分项已列出时，不再重复整组。
  return field === 'style' ? names.filter(name => {
    const parts = name.split(/\s+·\s+/);
    return parts.length === 1 || !parts.every(p => seen.has(normalizeAnswer(p)));
  }) : names;
}
// 订正时核对一项：和填空题同一套可接受写法，年份要四位准确。
export function checkField(track, field, raw, styles, allTracks) {
  const text = String(raw ?? '').trim(); if (!text) return false;
  if (field === 'year') { const y = text.normalize('NFKC').replace(/\s/g, '').match(/^(\d{4})(?:年)?$/); return !!y && Number(y[1]) === track.year; }
  const key = normalizeAnswer(text);
  return !!key && candidateNames(track, field, styles, allTracks).some(v => normalizeAnswer(v) === key);
}
export function gradeWritten(track, answers, styles, allTracks) {
  return gradeCourseWritten(withNames(track), answers, styles, allTracks);
}
