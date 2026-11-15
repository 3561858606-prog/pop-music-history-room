import { appearancesFor, canonicalIds } from './track-model.js';
export const FIELDS = [
  { key: 'song', label: '歌曲名称', ko: '곡명', number: '01' },
  { key: 'year', label: '年份', ko: '연도', number: '02' },
  { key: 'artist', label: '音乐家', ko: '음악가', number: '03' },
  { key: 'style', label: '风格', ko: '장르', number: '04' }
];

export const NOT_HEARD = '__not_heard__';

export function hasAnswer(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function valueFor(track, field) {
  return String(track[field]);
}

// Old versions saved only selected IDs. Their complete catalog had four lectures.
// Keep explicit subsets, but let “all lectures” continue including new additions.
export function restoreDeckSelection(saved, currentIds, previousIds = [1, 2, 3, 4]) {
  if (!Array.isArray(saved)) return [...currentIds];
  const selected = new Set(saved.filter(id => currentIds.includes(id)));
  const wasAll = Array.isArray(previousIds) && previousIds.length > 0 &&
    previousIds.every(id => selected.has(id));
  return wasAll ? [...currentIds] : [...selected];
}

export function filterTracks(tracks, decks, { verifiedOnly = false, wrongOnly = false, wrongIds = [] } = {}) {
  const selected = new Set(decks.map(Number));
  const wrong = new Set(canonicalIds(wrongIds, tracks));
  return tracks.filter(t => appearancesFor(t).some(a => selected.has(a.deck)) &&
    (!verifiedOnly || !t.uncertainAudio) && (!wrongOnly || wrong.has(t.id)));
}

function optionFor(track, field, styles) {
  const value = valueFor(track, field);
  if (field === 'artist') return { value, label: track.artist, sub: track.artistKo };
  if (field === 'song') return { value, label: track.song, sub: track.songKo };
  if (field === 'year') return { value, label: value + ' 年', sub: Math.floor(track.year / 10) * 10 + '年代' };
  const style = styles.find(s => s.id === value);
  if (!style) throw new Error('Unknown style: ' + value);
  return { value, label: style.label, sub: style.sub + ' · ' + style.ko };
}

export function buildQuestion(track, pool, allTracks, styles, random = Math.random) {
  const options = {};
  for (const { key } of FIELDS) {
    const answer = valueFor(track, key);
    const candidates = new Map();
    // Draw distractors from the selected lectures first; use the full catalog
    // when the range has fewer than four distinct values.
    const preferred = shuffle(pool, random);
    const fallback = shuffle(allTracks, random);
    for (const candidate of [...preferred, ...fallback]) {
      const value = valueFor(candidate, key);
      if (value !== answer && !candidates.has(value)) {
        candidates.set(value, optionFor(candidate, key, styles));
      }
    }
    if (candidates.size < 3) throw new Error('Insufficient distractors for ' + key);
    const choices = [optionFor(track, key, styles), ...[...candidates.values()].slice(0, 3)];
    options[key] = shuffle(choices, random);
  }
  return { track, options };
}

export function gradeQuestion(track, answers) {
  if (FIELDS.some(({ key }) => !hasAnswer(answers[key]))) throw new Error('Complete all four fields first.');
  const fields = FIELDS.map(({ key, label }) => ({
    key, label, chosen: answers[key], correct: valueFor(track, key),
    isCorrect: answers[key] === valueFor(track, key), isUnknown: answers[key] === NOT_HEARD
  }));
  return { score: fields.filter(f => f.isCorrect).length, total: 4, fields };
}

export class RandomQueue {
  constructor(random = Math.random) {
    this.random = random;
    this.remaining = [];
    this.lastId = null;
    this.cycle = 0;
    this.roundSize = 0;
  }
  reset() {
    this.remaining = [];
    this.lastId = null;
    this.cycle = 0;
    this.roundSize = 0;
  }
  next(pool, select = null) {
    const allowed = new Set(pool.map(t => t.id));
    this.remaining = this.remaining.filter(t => allowed.has(t.id));
    if (!pool.length) return null;
    if (!this.remaining.length) {
      this.remaining = shuffle(pool, this.random);
      this.cycle++;
      this.roundSize = pool.length;
      if (pool.length > 1 && this.remaining[this.remaining.length - 1].id === this.lastId) {
        [this.remaining[0], this.remaining[this.remaining.length - 1]] =
          [this.remaining[this.remaining.length - 1], this.remaining[0]];
      }
    }
    // Optional priority affects order only; a track still appears once per round.
    let index = this.remaining.length - 1;
    if (select) {
      const candidates = this.remaining.length > 1 ? this.remaining.filter(t => t.id !== this.lastId) : this.remaining;
      const chosen = select(candidates);
      const selectedIndex = this.remaining.findIndex(t => t.id === chosen?.id);
      if (selectedIndex >= 0) index = selectedIndex;
    }
    const [result] = this.remaining.splice(index, 1);
    this.lastId = result.id;
    return result;
  }
}

export function summarize(history) {
  const byField = Object.fromEntries(FIELDS.map(f => [f.key, 0]));
  let correct = 0, tested = 0;
  for (const item of history) {
    for (const f of item.fields) {
      if (!FIELDS.some(k => k.key === f.key)) continue;
      tested++;
      if (f.isCorrect) { correct++; byField[f.key]++; }
    }
  }
  const count = history.length;
  return { count, correct, accuracy: count ? Math.round(correct / (tested || 1) * 100) : 0, byField };
}

// Latest four-field score controls how much extra practice a song receives.
// Unseen and fully correct songs start at 1; each missed field adds 1.
export function practiceWeight(id, history) {
  const latest = history.findLast(item => item.id === id);
  return latest ? 1 + latest.fields.filter(f => !f.isCorrect).length : 1;
}

export function weightedTrack(pool, history, random = Math.random) {
  if (!pool.length) return null;
  const weights = pool.map(t => practiceWeight(t.id, history));
  let cursor = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < pool.length; i++) {
    cursor -= weights[i];
    if (cursor < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function summarizeSongs(history) {
  const grouped = new Map();
  for (const item of history) {
    if (!grouped.has(item.id)) grouped.set(item.id, []);
    grouped.get(item.id).push(item);
  }
  return [...grouped].map(([id, attempts]) => {
    const stats = summarize(attempts);
    const missed = FIELDS.filter(f => attempts.some(a => a.fields.some(field => field.key === f.key && !field.isCorrect))).map(f => f.label);
    const latestScore = attempts[attempts.length - 1].fields.filter(f => f.isCorrect).length;
    return { id, attempts: stats.count, accuracy: stats.accuracy, missed, latestScore };
  }).sort((a, b) => a.accuracy - b.accuracy || a.id.localeCompare(b.id));
}
