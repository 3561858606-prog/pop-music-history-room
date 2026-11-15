// One recording may belong to several lectures without becoming several songs.
export function appearancesFor(track) {
  return track.appearances || [{ deck: track.deck, slide: track.slide }];
}

export function canonicalId(id, tracks) {
  return tracks.find(t => t.id === id || t.legacyIds?.includes(id))?.id || id;
}

export function canonicalIds(ids, tracks) {
  return Array.isArray(ids) ? [...new Set(ids.map(id => canonicalId(id, tracks)))] : ids;
}

export function canonicalEntry(entry, tracks) {
  if (!entry || typeof entry !== 'object') return entry;
  // Keep the original event identity and historical grades, including old year
  // conventions. Merging songs must not erase or duplicate actual attempts.
  const eventId = entry.eventId || JSON.stringify([entry.id, entry.time, entry.fields]);
  return { ...entry, id: canonicalId(entry.id, tracks), eventId };
}

export function canonicalPending(pending, tracks, length) {
  if (!pending || typeof pending !== 'object') return pending;
  const targets = canonicalIds(pending.sessionTargets, tracks);
  const oldQueue = pending.queueIds || [];
  const alreadyDrawn = new Set((pending.sessionTargets || []).filter(id => !oldQueue.includes(id)).map(id => canonicalId(id, tracks)));
  const merged = (pending.sessionTargets || []).length - (targets || []).length;
  return {
    ...pending,
    trackId: canonicalId(pending.trackId, tracks),
    sessionTargets: targets,
    focusedIds: canonicalIds(pending.focusedIds, tracks),
    sessionHistory: Array.isArray(pending.sessionHistory) ? pending.sessionHistory.map(e => canonicalEntry(e, tracks)) : pending.sessionHistory,
    queueIds: canonicalIds(oldQueue, tracks).filter(id => !alreadyDrawn.has(id)),
    queueLastId: canonicalId(pending.queueLastId, tracks),
    queueRoundSize: pending.queueRoundSize ? Math.max(1, pending.queueRoundSize - merged) : pending.queueRoundSize,
    sessionGoal: ['all', 'coverage'].includes(length) && targets ? targets.length : pending.sessionGoal
  };
}

export function canonicalLegacy(data, tracks) {
  if (!data || typeof data !== 'object') return data;
  const migrated = { ...data, wrongIds: canonicalIds(data.wrongIds, tracks), session: canonicalPending(data.session, tracks, data.sessionLength) };
  for (const key of ['history', 'masteryHistory', 'lastSummary']) {
    if (Array.isArray(data[key])) migrated[key] = data[key].map(e => canonicalEntry(e, tracks));
  }
  return migrated;
}

export function canonicalReport(report, tracks) {
  return {
    ...report,
    entries: report.entries.map(e => canonicalEntry(e, tracks)),
    settings: report.settings ? { ...report.settings, focusedIds: canonicalIds(report.settings.focusedIds, tracks) } : report.settings
  };
}

export function backupBeforeCatalogMerge(storage, tracks) {
  const backupKey = 'fat-fish-music-before-hound-merge-v1';
  try {
    if (storage.getItem(backupKey)) return true;
    const originals = Object.fromEntries(['fat-fish-pop-music-review-v1', 'fat-fish-music-memory-v2', 'fat-fish-music-sessions-v2'].map(key => [key, storage.getItem(key)]));
    const affectedIds = tracks.filter(t => t.legacyIds?.length).flatMap(t => [t.id, ...t.legacyIds]);
    if (Object.values(originals).some(raw => raw && affectedIds.some(id => raw.includes('"' + id + '"')))) {
      storage.setItem(backupKey, JSON.stringify({ version: 1, reason: 'Hound Dog → 1952 / t40 → t31', originals }));
    }
    return true;
  } catch { return false; }
}
