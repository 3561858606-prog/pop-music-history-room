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
      const alreadyInView = el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.top < win.innerHeight * .6; };
      const position = () => {
        frame = null;
        if (current !== epoch || !element.isConnected || element.hidden) return;
        focusTarget?.focus({ preventScroll: true });
        if (alreadyInView(element)) return;
        element.scrollIntoView({block:'start',behavior:'instant'});
      };
      if (immediate) { position(); return; }
      frame = win.requestAnimationFrame(() => {
        if (current !== epoch) return;
        frame = win.requestAnimationFrame(position);
      });
    }
  };
}
