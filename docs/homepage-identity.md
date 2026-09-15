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

`assets/home.scss` is loaded only on the homepage. Other reading and learning
pages retain their existing styles. The shared interaction script preserves its
existing menu handling; homepage scroll updates are coalesced into animation
frames, and the header uses separate enter/exit thresholds to prevent flicker.

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
- Five background/homepage browser checks and four cursor checks passed,
  including scroll geometry, 320–1440px layouts, navigation, measured cursor
  rotation, pointer reflections, reduced motion, reduced transparency, increased
  contrast, forced colors, unavailable WebGL and JavaScript-disabled navigation.
- Formatting passed for all 200 public HTML pages; SEO validation passed.
- Mobile Lighthouse (median of three runs): 99/100 performance, 1.96s largest
  contentful paint, 0.000 cumulative layout shift and 0ms total blocking time.
- Desktop, mobile and scrolled-section screenshots were visually reviewed.
