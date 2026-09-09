/*! TargetCursor adapted from React Bits by David Haz for this Jekyll site.
 * React Bits: /assets/licenses/react-bits.txt
 * GSAP: /assets/licenses/gsap.txt
 */
import { gsap } from 'gsap';

const TARGETS = 'a[href], button, summary, [role="button"], [role="link"], [role="tab"], .cursor-target, label, input[type="button"], input[type="submit"], input[type="reset"], input[type="checkbox"], input[type="radio"]';
const NATIVE = 'textarea, select, iframe, embed, object, video, audio, [contenteditable]:not([contenteditable="false"]), [inert], [aria-disabled="true"], :disabled, input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])';
const REST = [[-18, -18], [6, -18], [6, 6], [-18, 6]];

// Retain the supplied component's fixed-position containing-block compensation.
function getContainingBlock(element) {
  let node = element.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (style.transform !== 'none' || style.perspective !== 'none' || style.filter !== 'none' ||
        /transform|perspective|filter/.test(style.willChange) || /paint|layout|strict|content/.test(style.contain)) return node;
    node = node.parentElement;
  }
  return null;
}

export function mountTargetCursor() {
  const layer = document.createElement('div');
  layer.className = 'target-cursor-layer';
  layer.setAttribute('aria-hidden', 'true');
  const cursor = document.createElement('div');
  cursor.className = 'target-cursor-wrapper';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<div class="target-cursor-dot"></div>' +
    ['tl', 'tr', 'br', 'bl'].map(position => `<div class="target-cursor-corner corner-${position}"></div>`).join('');
  layer.appendChild(cursor);
  document.body.appendChild(layer);
  const dot = cursor.firstElementChild;
  const corners = [...cursor.querySelectorAll('.target-cursor-corner')];
  let containingBlock = getContainingBlock(cursor);
  let pointer = null;
  let activeTarget = null;
  let visible = false;
  let resume = null;
  let destroyed = false;
  const offset = () => {
    if (!containingBlock) return {x: 0, y: 0};
    const rect = containingBlock.getBoundingClientRect();
    return {x: rect.left + containingBlock.clientLeft, y: rect.top + containingBlock.clientTop};
  };

  gsap.set(cursor, {xPercent: -50, yPercent: -50});
  corners.forEach((corner, i) => gsap.set(corner, {x: REST[i][0], y: REST[i][1]}));
  const moveX = gsap.quickTo(cursor, 'x', {duration: 0.1, ease: 'power3.out'});
  const moveY = gsap.quickTo(cursor, 'y', {duration: 0.1, ease: 'power3.out'});
  const cornerMoves = corners.map(corner => ({
    x: gsap.quickTo(corner, 'x', {duration: 0.2, ease: 'power2.out'}),
    y: gsap.quickTo(corner, 'y', {duration: 0.2, ease: 'power2.out'})
  }));
  const spin = gsap.to(cursor, {rotation: '+=360', duration: 2, repeat: -1, ease: 'none', paused: true});

  function targetFor(element) {
    if (!(element instanceof Element) || element.closest(NATIVE)) return null;
    const target = element.closest(TARGETS);
    if (!target || target.closest(NATIVE)) return null;
    if (target.matches('label')) {
      const control = target.control;
      if (!control || !control.matches('input[type="checkbox"], input[type="radio"], button') || control.matches(':disabled') || control.closest('[inert], [aria-disabled="true"]')) return null;
    }
    return target;
  }

  function releaseTarget() {
    if (!activeTarget) return;
    activeTarget = null;
    cursor.classList.remove('is-targeting');
    gsap.ticker.remove(trackTarget);
    cornerMoves.forEach((move, i) => { move.x(REST[i][0]); move.y(REST[i][1]); });
    resume?.kill();
    resume = gsap.delayedCall(0.2, () => { if (visible && !activeTarget) spin.restart(); });
  }

  function lockTarget(target) {
    if (target === activeTarget) return;
    resume?.kill();
    resume = null;
    activeTarget = target;
    spin.pause();
    gsap.set(cursor, {rotation: 0});
    cursor.classList.add('is-targeting');
    gsap.ticker.add(trackTarget);
  }

  function updateCorners() {
    const rect = activeTarget.getBoundingClientRect();
    const origin = offset();
    const x = Number(gsap.getProperty(cursor, 'x')) + origin.x;
    const y = Number(gsap.getProperty(cursor, 'y')) + origin.y;
    const positions = [
      [rect.left - 3, rect.top - 3], [rect.right - 9, rect.top - 3],
      [rect.right - 9, rect.bottom - 9], [rect.left - 3, rect.bottom - 9]
    ];
    cornerMoves.forEach((move, i) => { move.x(positions[i][0] - x); move.y(positions[i][1] - y); });
  }

  function inspectPointer() {
    if (!pointer || !visible) return;
    const element = document.elementFromPoint(pointer.x, pointer.y);
    // Preserve I-beams, native widgets, disabled states and embedded documents.
    if (!element || element.closest(NATIVE)) { hide(); return; }
    const target = targetFor(element);
    if (target) lockTarget(target);
    else releaseTarget();
  }

  function trackTarget() {
    if (!visible || !activeTarget) return;
    // Bounds and hit-testing stay current through CSS hover transitions,
    // nested scrolling, and dynamically replaced search/lesson controls.
    inspectPointer();
    if (activeTarget) updateCorners();
  }

  function move(point) {
    if (destroyed) return;
    pointer = point;
    const element = document.elementFromPoint(point.x, point.y);
    if (!element || element.closest(NATIVE)) { hide(); return; }
    const origin = offset();
    if (!visible) {
      gsap.set(cursor, {x: point.x - origin.x, y: point.y - origin.y, rotation: 0, scale: 1});
      gsap.set(dot, {scale: 1});
      visible = true;
      cursor.classList.add('is-visible');
      document.documentElement.classList.add('cc-target-cursor-active');
      spin.restart();
    }
    moveX(point.x - origin.x);
    moveY(point.y - origin.y);
    inspectPointer();
    if (activeTarget) updateCorners();
  }

  function hide() {
    visible = false;
    pointer = null;
    releaseTarget();
    resume?.kill();
    resume = null;
    spin.pause();
    gsap.ticker.remove(trackTarget);
    moveX.tween.pause();
    moveY.tween.pause();
    cornerMoves.forEach(move => { move.x.tween.pause(); move.y.tween.pause(); });
    gsap.killTweensOf(cursor, 'scale');
    gsap.killTweensOf(dot);
    cursor.classList.remove('is-visible', 'is-targeting');
    document.documentElement.classList.remove('cc-target-cursor-active');
    corners.forEach((corner, i) => gsap.set(corner, {x: REST[i][0], y: REST[i][1]}));
  }

  function down(event) {
    if (!visible || event.pointerType !== 'mouse' || event.button !== 0) return;
    gsap.to(dot, {scale: 0.7, duration: 0.3, overwrite: 'auto'});
    gsap.to(cursor, {scale: 0.9, duration: 0.2, overwrite: 'auto'});
  }
  function up() {
    if (!visible) return;
    gsap.to(dot, {scale: 1, duration: 0.3, overwrite: 'auto'});
    gsap.to(cursor, {scale: 1, duration: 0.2, overwrite: 'auto'});
  }
  function layoutChanged() {
    containingBlock = getContainingBlock(cursor);
    if (pointer && visible) move(pointer);
  }
  document.addEventListener('scroll', layoutChanged, {capture: true, passive: true});
  window.addEventListener('resize', layoutChanged, {passive: true});
  document.addEventListener('pointerdown', down, {passive: true});
  document.addEventListener('pointerup', up, {passive: true});

  return {
    move,
    hide,
    destroy() {
      hide();
      destroyed = true;
      spin.kill();
      gsap.killTweensOf([cursor, dot, ...corners]);
      document.removeEventListener('scroll', layoutChanged, true);
      window.removeEventListener('resize', layoutChanged);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      layer.remove();
    }
  };
}
