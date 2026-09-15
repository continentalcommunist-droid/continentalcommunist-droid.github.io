/* Home-only scroll choreography. Native scrolling, anchors and document order
   stay intact; all content is visible before JavaScript or without animation. */
(() => {
  const stage = document.querySelector('.cc-hero-stage');
  const hero = stage?.querySelector('.cc-hero');
  const nav = document.querySelector('.cc-scroll-nav');
  if (!hero || !nav) return;

  const motion = matchMedia('(prefers-reduced-motion: no-preference) and (forced-colors: none)');
  const compact = matchMedia('(max-width: 600px)');
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const chapters = links.map(link => ({
    link, section: document.getElementById(link.hash.slice(1))?.closest('section'), top: 0, height: 0, last: null
  })).filter(chapter => chapter.section);
  // Keep anchor headings stationary so native hash jumps land below both navs.
  const reveals = [...document.querySelectorAll(
    '.cc-platform-kicker, .cc-featured-kicker, .cc-platform-heading > p, .cc-featured-heading > p, .cc-platform-card, .cc-featured-card, .cc-newsletter-kicker, .cc-newsletter-copy > p, .cc-article-card'
  )].map(element => ({element, top: 0, last: null}));
  let frame = null;
  let needsMeasure = true;
  let viewport = innerHeight;
  let heroHeight = 1;
  let heroTop = 0;
  let pageEnd = 1;
  let lastHeroProgress = null;
  let activeLink = null;

  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => value * value * (3 - 2 * value);
  // Layout coordinates ignore animation transforms, so resizing or restoring a
  // scrolled page never feeds the previous frame's movement back into itself.
  const layoutTop = element => {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  };
  const measure = () => {
    viewport = innerHeight;
    heroTop = layoutTop(stage);
    heroHeight = stage.offsetHeight;
    pageEnd = Math.max(1, document.documentElement.scrollHeight - viewport);
    chapters.forEach(chapter => {
      chapter.top = layoutTop(chapter.section);
      chapter.height = chapter.section.offsetHeight;
      chapter.last = null;
    });
    reveals.forEach(item => {
      const column = item.element.matches('.cc-platform-card, .cc-featured-card')
        ? Math.max(0, item.element.offsetLeft - item.element.parentElement.firstElementChild.offsetLeft) : 0;
      item.top = layoutTop(item.element) + Math.min(64, column * .08);
      item.last = null;
    });
    lastHeroProgress = null;
    needsMeasure = false;
  };

  function update() {
    frame = null;
    if (document.hidden) return;
    if (needsMeasure) measure();
    const y = Math.max(0, scrollY);
    const readingLine = y + Math.min(viewport * .35, 240);

    // Update position feedback even when decorative motion is disabled.
    let current = null;
    chapters.forEach((chapter, index) => {
      const end = chapters[index + 1]?.top ?? chapter.top + chapter.height;
      const progress = clamp((readingLine - chapter.top) / Math.max(1, end - chapter.top));
      if (readingLine >= chapter.top) current = chapter.link;
      if (progress !== chapter.last) {
        chapter.section.style.setProperty('--section-progress', progress.toFixed(4));
        chapter.link.style.setProperty('--section-progress', progress.toFixed(4));
        if (motion.matches) {
          chapter.section.style.setProperty('--scroll-angle', `${(105 + progress * 60).toFixed(2)}deg`);
          chapter.section.style.setProperty('--scroll-light-y', `${(progress * 100).toFixed(2)}%`);
        }
        chapter.last = progress;
      }
    });
    if (y >= pageEnd - 2) current = chapters.at(-1)?.link ?? null;
    if (current !== activeLink) {
      links.forEach(link => {
        if (link === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      activeLink = current;
    }
    if (!motion.matches) return;

    const progress = ease(clamp(y / Math.max(1, heroTop + heroHeight * .8)));
    if (progress !== lastHeroProgress) {
      const shrink = compact.matches ? .06 : .16;
      hero.style.setProperty('--hero-scale', (1 - progress * shrink).toFixed(4));
      hero.style.setProperty('--hero-drift', `${(progress * Math.min(viewport * .08, 64)).toFixed(2)}px`);
      hero.style.setProperty('--wordmark-scale', (1 - progress * .06).toFixed(4));
      hero.style.setProperty('--wordmark-drift', `${(progress * 18).toFixed(2)}px`);
      hero.style.setProperty('--scroll-angle', `${(115 + progress * 40).toFixed(2)}deg`);
      hero.style.setProperty('--scroll-light-y', `${(progress * 100).toFixed(2)}%`);
      lastHeroProgress = progress;
    }
    // Each row responds to its own position. A small offset by column gives
    // grids a staggered entrance without timers, fading text or hidden links.
    const distance = compact.matches ? 22 : 44;
    reveals.forEach(item => {
      const entrance = ease(clamp((y + viewport - item.top) / Math.min(viewport * .32, 280)));
      const shift = Math.round((1 - entrance) * distance * 100) / 100;
      if (shift === item.last) return;
      item.element.style.setProperty('--reveal-shift', `${shift}px`);
      item.last = shift;
    });
  }

  function schedule() {
    if (frame === null && !document.hidden) frame = requestAnimationFrame(update);
  }
  const remeasure = () => { needsMeasure = true; schedule(); };
  const syncMotion = () => {
    document.body.classList.toggle('has-scroll-motion', motion.matches);
    if (!motion.matches) {
      ['--hero-scale', '--hero-drift', '--wordmark-scale', '--wordmark-drift', '--scroll-angle', '--scroll-light-y']
        .forEach(property => hero.style.removeProperty(property));
      reveals.forEach(item => item.element.style.removeProperty('--reveal-shift'));
      chapters.forEach(({section}) => {
        section.style.removeProperty('--scroll-angle');
        section.style.removeProperty('--scroll-light-y');
      });
    }
    remeasure();
  };

  reveals.forEach(item => item.element.classList.add('cc-scroll-reveal'));
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', remeasure, {passive: true});
  addEventListener('pageshow', remeasure);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && frame !== null) { cancelAnimationFrame(frame); frame = null; }
    else remeasure();
  });
  motion.addEventListener('change', syncMotion);
  compact.addEventListener('change', remeasure);
  if ('ResizeObserver' in window) new ResizeObserver(remeasure).observe(document.body);
  syncMotion();
})();
