import { FIELDS, NOT_HEARD, valueFor, hasAnswer } from './core.js';

// Conservative matching: aliases, typography and spacing, never fuzzy identity.
export function normalizeAnswer(value) {
  return String(value ?? '').normalize('NFKC').normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
    .toLowerCase().replace(/&/g, 'and').replace(/[^\p{L}\p{N}]/gu, '');
}
const parts = value => String(value || '').split(/\s+·\s+/).filter(v => v && !/课件|韩国爵士歌曲/.test(v));
const styleAliases = {
  'standard-pop': ['Traditional Pop', '传统流行', '传统流行音乐', '标准流行', '트래디셔널 팝'],
  'parlor': ['客厅歌曲', '客厅抒情歌'],
  'ragtime': ['拉格泰姆音乐'],
  'early-jazz': ['Dixieland Jazz', '迪克西兰爵士'],
  'dance': ['1920年代舞曲', '1920年代流行舞曲'],
  'tin-pan-alley': ['Tin Pan Alley', 'Crooner', '锡盘巷', '锡盘巷歌曲', '低吟歌手'],
  'swing': ['摇摆乐', '摇摆爵士', 'Big Band', '빅밴드'],
  'afro-cuban': ['Latin Jazz', '拉丁爵士', 'Afro Cuban Jazz'],
  'trot': ['韩国演歌', '트롯'],
  'jazz-song': ['Jazz Song', '爵士歌曲'],
  'manyo': ['漫谣', '趣味歌'],
  'urban-folk': ['城市民歌', '都市民谣'],
  'country-western': ['Country and Western', 'Country', '乡村音乐', '컨트리'],
  'changga': ['Changga', 'Adapted Song', '唱歌', '改编歌谣', '번안가요', '번안곡'],
  'early-korean-song': ['창작가요', '초기 대중가요', '早期韩国歌谣', '韩国创作歌谣'],
};
const songAliases = {
  t14: ["It Don't Mean a Thing"],
  t21: ['Sing Sing Sing'],
  t27: ['Mambo Number 5', 'Mambo 5', '第五号曼波'],
};
const artistAliases = { t15: ['Bob Wills', '밥 윌스'] };

export function writtenCandidates(track, field, styles, allTracks = []) {
  if (field === 'year') return [String(track.year)];
  if (field === 'artist') {
    const sameArtist = [track, ...allTracks.filter(t => normalizeAnswer(t.artist) === normalizeAnswer(track.artist))];
    return [...new Set([...sameArtist.flatMap(t => [t.artist, ...parts(t.artistKo), ...(t.artistAliases || [])]), ...(artistAliases[track.id] || [])])];
  }
  if (field === 'song') {
    const artistNames = writtenCandidates(track, 'artist', styles, allTracks).map(normalizeAnswer);
    // catalog.aliases also powers search and may contain artist aliases.
    const aliases = (track.aliases || []).filter(a => !artistNames.includes(normalizeAnswer(a)));
    return [track.song, ...parts(track.songKo), ...aliases, ...(songAliases[track.id] || [])];
  }
  const style = styles.find(s => s.id === track.style);
  return [style.label, style.sub, style.ko, ...style.label.split(/\s*[\/·]\s*/),
    ...parts(style.sub), ...parts(style.ko), ...(styleAliases[style.id] || [])];
}

export function gradeWritten(track, answers, styles, allTracks = []) {
  if (FIELDS.some(({key}) => !hasAnswer(answers[key]))) throw new Error('Complete all four fields first.');
  const fields = FIELDS.map(({key, label}) => {
    const raw = String(answers[key] ?? '').trim();
    const isUnknown = raw === NOT_HEARD || ['没听出来', '不知道', '不确定'].includes(raw);
    let isCorrect = false;
    if (!isUnknown && key === 'year') {
      const year = raw.normalize('NFKC').replace(/\s/g, '').match(/^(\d{4})(?:年)?$/);
      isCorrect = !!year && Number(year[1]) === track.year;
    } else if (!isUnknown) {
      const answer = normalizeAnswer(raw);
      isCorrect = !!answer && writtenCandidates(track, key, styles, allTracks).some(v => normalizeAnswer(v) === answer);
    }
    return {key, label, chosen: isUnknown ? NOT_HEARD : raw, correct: valueFor(track,key), isCorrect, isUnknown, autoCorrect: isCorrect};
  });
  return {score: fields.filter(f => f.isCorrect).length, total:4, fields};
}
