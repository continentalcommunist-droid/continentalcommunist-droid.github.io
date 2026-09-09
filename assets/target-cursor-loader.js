/* Keep touch/keyboard visits lightweight; load GSAP on the first mouse move. */
const pointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const forcedColors = matchMedia('(forced-colors: active)');
const standardContrast = matchMedia('(prefers-contrast: no-preference)');
let effect = null;
let latestPoint = null;
let loading = false;
let failed = false;
let pageActive = true;
const allowed = () => pageActive && !document.hidden && pointer.matches && !reducedMotion.matches && !forcedColors.matches && standardContrast.matches;

function hide() {
  latestPoint = null;
  effect?.hide();
}
function syncPreference() {
  if (!allowed()) {
    hide();
    effect?.destroy();
    effect = null;
  }
}
document.addEventListener('pointermove', async event => {
  if (event.pointerType !== 'mouse' || !allowed()) { hide(); return; }
  latestPoint = {x: event.clientX, y: event.clientY};
  if (effect) { effect.move(latestPoint); return; }
  if (loading || failed) return;
  loading = true;
  try {
    const {mountTargetCursor} = await import('./target-cursor.js');
    if (allowed() && latestPoint) {
      effect = mountTargetCursor();
      effect.move(latestPoint);
    }
  } catch {
    failed = true;
    effect?.destroy();
    effect = null;
    document.documentElement.classList.remove('cc-target-cursor-active');
  } finally {
    loading = false;
  }
}, {passive: true});
const embedded = element => element instanceof Element && element.matches('iframe, embed, object');
document.addEventListener('pointerout', event => { if (!event.relatedTarget || embedded(event.relatedTarget)) hide(); }, {passive: true});
document.addEventListener('pointerover', event => { if (embedded(event.target)) hide(); }, {passive: true});
document.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') hide(); }, {passive: true});
document.addEventListener('pointercancel', hide, {passive: true});
document.addEventListener('keydown', hide);
window.addEventListener('blur', hide);
document.addEventListener('visibilitychange', syncPreference);
window.addEventListener('pagehide', () => { pageActive = false; syncPreference(); });
window.addEventListener('pageshow', () => { pageActive = true; });
[pointer, reducedMotion, forcedColors, standardContrast].forEach(preference => preference.addEventListener('change', syncPreference));
