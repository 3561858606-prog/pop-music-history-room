// Keyboard: digits answer the current field, arrows move between fields, R / J / L drive the player, Enter moves on.
import { pickByKey, moveCurrent } from './train.js';
const $ = id => document.getElementById(id);
export function init(ctx) {
  const annotate = () => {
    for (const id of ['submitButton', 'nextButton']) $(id)?.setAttribute('aria-keyshortcuts', 'Enter');
  };
  annotate();
  addEventListener('museum:reveal', annotate);
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.isComposing || e.keyCode === 229 || e.altKey || e.ctrlKey && e.key !== 'Enter') return;
    const room = ctx.rooms.current?.name, s = ctx.getState();
    if (room !== 'train' || !s.question || document.querySelector('dialog[open], #yearSheet[data-open], .lp')) return;
    const t = e.target, tag = t.tagName, typing = (tag === 'INPUT' && t.type !== 'radio' && t.type !== 'range') || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
    if (t.classList?.contains('written-answer') && e.key === 'Enter') {
      if (e.metaKey || e.ctrlKey || !$('submitButton').disabled) { e.preventDefault(); if (!e.repeat && !$('submitButton').disabled) $('answerForm').requestSubmit(); return; }
      e.preventDefault(); if (!e.repeat) moveCurrent(1); return; // Before all fields are complete, Enter keeps moving through the form.
    }
    if (typing || e.metaKey || e.ctrlKey) return;
    // Handle the two action buttons here too: native Enter must not create a second submission
    // or repeat into the next question after focus moves during the answer reveal.
    if (e.key === 'Enter') {
      const control = t.closest?.('button,a,summary');
      if (control && !['submitButton', 'nextButton'].includes(control.id)) return;
      e.preventDefault();
      if (e.repeat) return;
      if (s.result) ctx.actions.next();
      else if (!$('submitButton').disabled) $('answerForm').requestSubmit();
      return;
    }
    const written = s.questionType === 'written' && s.sessionKind !== 'year';
    if (!s.result && !written && /^(Digit|Numpad)[0-4]$/.test(e.code)) { e.preventDefault(); pickByKey(Number(e.code.slice(-1))); return; }
    if (!s.result && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && tag !== 'INPUT') { e.preventDefault(); moveCurrent(e.key === 'ArrowRight' ? 1 : -1); return; }
    if (e.code === 'KeyR') { e.preventDefault(); ctx.actions.replay(); return; }
    if (e.code === 'KeyJ') { e.preventDefault(); ctx.actions.seekBy(-5); return; }
    if (e.code === 'KeyL') { e.preventDefault(); ctx.actions.seekBy(5); return; }
  });
}
