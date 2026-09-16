# Homepage identity update — September 15, 2026

## Preserve

- The Continental Communist hero wordmark, image files, responsive sources,
  alternative text, proportions and loading priority.
- The FaultyTerminal background, shader, color, intensity, frame/pixel budgets,
  pause control and accessibility fallbacks.
- The crimson and graphite identity, floating navigation, rounded panels,
  existing navigation destinations, publication content and newsletter service.
- Every targeting-cursor behavior and visual detail except its idle rotation speed.

## Design plan

1. Make the floating header visibly respond to scrolling: contract its width and
   height, retain all navigation, and add a fine page-progress line. Reserve the
   header's original space so the page does not jump as it contracts.
2. Frame the original hero image with publication metadata, clear spacing and
   a useful link to the platform. Keep the existing headline artwork and calls
   to action central to the composition.
3. Make the glass respond to the real background using translucent tint,
   backdrop blur, saturation and brightness. Add a curved reflective rim and
   pointer-responsive highlights without distorting readable text. Preserve an
   opaque material for unsupported browsers and accessibility preferences.
4. Strengthen the editorial hierarchy using numbered section markers,
   lightweight line icons, an emphasized Learn card and aligned article dates.
5. Slow the cursor's rotation eightfold, from 2 to 16 seconds per revolution.
6. Verify layout, navigation, scroll transitions, pointer behavior, background
   rendering, accessibility preferences and mobile performance before release.

## Implementation notes

`assets/home.scss` is loaded only on the homepage. The shared header and material
rules now live in `assets/identity.scss`, as described in the sitewide follow-up
below. The shared interaction script preserves its existing menu handling;
scroll updates are coalesced into animation frames, and the header uses separate
enter/exit thresholds to prevent flicker.

The glass is a CSS approximation of a liquid optical surface: it filters the
actual scene behind each panel, with simulated edge reflections. It does not
claim physically accurate refraction or use an additional WebGL renderer.
The translucent surface is essential for seeing the filtered backdrop; see
[MDN's backdrop-filter reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter).
Reduced motion disables transitions and pointer reflections. Reduced
transparency, increased contrast and forced colors disable the glass filtering.

The newsletter keeps its existing hosted form. Its contents and appearance
remain controlled by the newsletter provider.

## Release validation

- Production build passed.
- Seven background/homepage browser checks and four cursor checks passed,
  including scroll geometry, 320–1440px layouts, navigation, measured cursor
  rotation, pointer reflections, reduced motion, reduced transparency, increased
  contrast, forced colors, unavailable WebGL and JavaScript-disabled navigation.
- Formatting passed for all 200 public HTML pages; SEO validation passed.
- Mobile Lighthouse (median of three runs): 99/100 performance, 1.96s largest
  contentful paint, 0.000 cumulative layout shift and 0ms total blocking time.
- Desktop, mobile and scrolled-section screenshots were visually reviewed.

## Follow-up: homepage scroll sequence

- The original hero panel and artwork shrink gradually as the visitor scrolls,
  with a small relative movement of the wordmark to add depth. The effect reverses
  at the same pace when scrolling upward. Desktop contraction is capped at 16%;
  mobile contraction is capped at 6% to keep text and controls comfortable.
- A stable outer stage preserves the hero's layout space. Shrinking the panel
  does not pull content upward, change the scrollbar range or cause scroll jumps.
- Cards, section labels, descriptions and article rows rise into place based on
  their viewport position, with staggered grid entrances. Nothing fades out or
  becomes inaccessible while waiting for an animation.
- A compact glass navigator follows below the main header, links to all four
  homepage sections, marks the current section and shows progress within it.
  Native anchor links scroll smoothly and retain their URL and history behavior.
  Anchor headings stay stationary so they land below both navigation bars.
- Glass reflections shift gently with section progress; existing mouse
  reflections take priority while the pointer is over a panel.
- Decorative motion follows the browser's motion preference. Reduced motion
  and forced colors keep the layout stationary; without JavaScript, content and
  section links remain available. Keyboard focus restores a stationary,
  full-size hero, and scaled mobile controls remain at least 44px tall.
- `assets/home-scroll.js` loads only on the homepage. It caches layout coordinates
  on size changes, updates only changed values in scroll-triggered animation
  frames and does no continuous work when scrolling stops or the tab is hidden.
  The terminal renderer, hero image assets and sitewide cursor are unchanged.

Browser checks cover progressive shrinking, reverse scrolling, stable layout,
cursor targeting on the scaled hero, mobile touch targets, section entrances,
anchor alignment, active-section tracking and preference changes at runtime.

## Follow-up: sitewide identity

- Every public layout now includes the contracting header, publication name,
  page-progress line and animated terminal background. The CMS and redirect
  documents retain their own layouts.
- Shared glass cards use the same reflective rims and filtered backdrop as the
  homepage. Section labels and heading accents carry the crimson, graphite and
  cool silver palette through articles, learning pages, the library and search.
- Interior pages use a quieter background (18% opacity) and a 94% opaque dark
  reading surface. Long documents avoid a full-page backdrop blur. Text remains
  stationary, and the homepage's hero choreography stays on the homepage.
- One pause button appears above each interior reading surface. Its choice
  persists between pages in the current tab; unavailable storage never prevents
  pausing. Motion, transparency, contrast and forced-color preferences retain
  their static fallbacks.
- Mobile account setup links wrap within the narrower reading surface.
- The original hero image, homepage scroll sequence, terminal shader and cursor
  behavior remain intact.

Sitewide validation includes all 200 generated public layouts and browser checks
across 12 page families at desktop, 390px and 320px widths. Reading-surface
contrast is checked against a conservative white background, alongside header
geometry, navigation, pause persistence, storage failure and accessibility
preferences. Four cursor checks, six lesson checks, formatting and SEO validation
also pass. Browser checks isolate external services and do not exercise signed-in
account flows.

Mobile Lighthouse medians across eight representative page types range from
98–100 performance, with 1.55–2.26s largest contentful paint, at most 0.026
cumulative layout shift and 0ms total blocking time. All release budgets pass.
