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
  let scheduled = false;
  const updateHeader = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 16);
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateHeader); }
  }, { passive: true });
  updateHeader();
  syncMenu();

  // Reflected light follows precise pointers only; touch and reduced-motion
  // visitors receive the same materials without continuous pointer updates.
  const reflectedLight = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  document.querySelectorAll('.cc-platform-card, .cc-featured-card').forEach((card) => {
    let frame = null;
    const resetLight = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      card.style.removeProperty('--glass-x');
      card.style.removeProperty('--glass-y');
    };
    card.addEventListener('pointermove', (event) => {
      if (!reflectedLight.matches || frame !== null) return;
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--glass-x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--glass-y', `${event.clientY - rect.top}px`);
        frame = null;
      });
    });
    card.addEventListener('pointerleave', resetLight);
    reflectedLight.addEventListener('change', resetLight);
  });
})();
