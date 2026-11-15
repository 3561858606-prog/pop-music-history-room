// Cancel old feedback positioning when a new question replaces the DOM.
// Two paint frames let layout settle; instant positioning avoids competing
// smooth scrolls and focuses the player without triggering browser scrolling.
export function createViewportNavigator(win, doc) {
  let epoch = 0;
  let frame = null;
  return {
    cancel() {
      epoch++;
      if (frame !== null) win.cancelAnimationFrame(frame);
      frame = null;
    },
    goTo(element, focusTarget, immediate = false) {
      this.cancel();
      const current = epoch;
      const position = () => {
        frame = null;
        if (current !== epoch || !element.isConnected || element.hidden) return;
        focusTarget?.focus({ preventScroll: true });
        const header = doc.querySelector('.site-header');
        const top = Math.max(0, win.scrollY + element.getBoundingClientRect().top - (header?.getBoundingClientRect().height || 0) - 16);
        const previous = doc.documentElement.style.scrollBehavior;
        doc.documentElement.style.scrollBehavior = 'auto';
        win.scrollTo({ top, behavior: 'instant' });
        doc.documentElement.style.scrollBehavior = previous;
      };
      if (immediate) { position(); return; }
      frame = win.requestAnimationFrame(() => {
        if (current !== epoch) return;
        frame = win.requestAnimationFrame(position);
      });
    }
  };
}
