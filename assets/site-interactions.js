/* Shared progressive enhancements; reading and navigation work without JS. */
(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('nav-trigger');
  if (!header || !toggle) return;

  const syncMenu = () => toggle.setAttribute('aria-expanded', String(toggle.checked));
  const closeMenu = () => { toggle.checked = false; syncMenu(); };
  toggle.addEventListener('change', syncMenu);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.checked) {
      closeMenu();
      toggle.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target) || event.target.closest('#primary-navigation a')) closeMenu();
  });
  const desktop = window.matchMedia('(min-width: 1001px)');
  desktop.addEventListener('change', closeMenu);
  let scrollRange = 1;
  let scheduled = false;
  const updateHeader = () => {
    const y = Math.max(0, window.scrollY);
    // Separate thresholds prevent flicker near the compact-header boundary.
    const threshold = header.classList.contains('is-scrolled') ? 24 : 72;
    header.classList.toggle('is-scrolled', y > threshold);
    header.style.setProperty('--page-progress', Math.min(1, y / scrollRange));
    scheduled = false;
  };
  const scheduleHeader = () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateHeader); }
  };
  window.addEventListener('scroll', scheduleHeader, { passive: true });
  const measurePage = () => {
    scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scheduleHeader();
  };
  window.addEventListener('resize', measurePage, { passive: true });
  window.addEventListener('pageshow', measurePage);
  if ('ResizeObserver' in window) new ResizeObserver(measurePage).observe(document.body);
  measurePage();
  updateHeader();
  syncMenu();

  // Reflected light follows precise pointers only; touch and reduced-motion
  // visitors receive the same materials without continuous pointer updates.
  const reflectedLight = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) and (prefers-reduced-transparency: no-preference) and (prefers-contrast: no-preference) and (forced-colors: none)');
  document.querySelectorAll('.cc-liquid-panel, .site-header, .cc-platform-card, .cc-featured-card, .cc-hub-card, .cc-pathway-card, .cc-taxonomy-family, .cc-auth-card, .cc-account-panel, .cc-source-card, .cc-lesson-reading-card').forEach((card) => {
    let frame = null;
    let pointer;
    const resetLight = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      card.style.removeProperty('--glass-x');
      card.style.removeProperty('--glass-y');
      card.style.removeProperty('--glass-angle');
    };
    card.addEventListener('pointermove', (event) => {
      if (!reflectedLight.matches || event.pointerType !== 'mouse') return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = pointer.x - rect.left;
        const y = pointer.y - rect.top;
        card.style.setProperty('--glass-x', `${x}px`);
        card.style.setProperty('--glass-y', `${y}px`);
        card.style.setProperty('--glass-angle', `${115 + (x / Math.max(1, rect.width) - .5) * 50}deg`);
        frame = null;
      });
    });
    card.addEventListener('pointerleave', resetLight);
    card.addEventListener('pointercancel', resetLight);
    reflectedLight.addEventListener('change', resetLight);
  });
})();
