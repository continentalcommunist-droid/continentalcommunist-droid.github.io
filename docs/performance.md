# Performance and Core Web Vitals

Performance is a release criterion, not a post-publication cleanup task. The repository keeps a dated public baseline, tests representative templates in a repeatable mobile lab, and checks real-user Chrome UX Report data whenever Google has enough eligible traffic.

## Public baseline

The baseline is stored as structured data in `performance/baseline.json` so future measurements can be compared without relying on a dashboard history.

Captured on September 1, 2026 from the public homepage with PageSpeed Insights:

| Mode | Performance | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Mobile | 66 | 0.9 s | 8.6 s | 20 ms | 0.203 | 0.9 s |
| Desktop | 78 | 0.3 s | 1.4 s | 180 ms | 0.254 | 0.8 s |

PageSpeed Insights reported no eligible page-level or origin-level CrUX field data on that date. This is an explicit baseline result rather than an error: CrUX only reports eligible public sites and pages with enough samples. The saved PageSpeed report is linked from `performance/baseline.json`.

The initial performance pass addressed the measured causes directly:

- Replaced multi-megabyte PNG display assets with responsive WebP variants.
- Declared image and embedded-frame dimensions to reserve layout space.
- Preloaded the homepage LCP image with a responsive candidate set.
- Compressed production CSS and excluded development and source-only assets from the published site.
- Reserved the faceted-search application viewport so asynchronous result rendering does not move the footer through the visible page.

## Release thresholds

The lab gate runs Lighthouse three times with a mobile viewport and simulated mobile throttling. It uses the median of the three runs to reduce one-off variance. Every URL in `performance/targets.json` must satisfy every threshold:

| Signal | Required value |
| --- | ---: |
| Lighthouse performance score | at least 90 |
| Largest Contentful Paint | at most 2,500 ms |
| Cumulative Layout Shift | at most 0.10 |
| Total Blocking Time | at most 200 ms |
| Image transfer | at most 350 KB |
| JavaScript transfer | at most 150 KB |
| Total transfer | at most 700 KB |

LCP and CLS use Google's “good” Core Web Vitals thresholds. TBT is a lab guardrail for main-thread blocking; it is not a substitute for field INP. The CrUX gate evaluates the actual 75th-percentile field metrics:

- LCP at or below 2,500 ms.
- INP at or below 200 ms.
- CLS at or below 0.10.

The field gate requires both measured origin form factors to pass. It also requires at least 90% of the representative URL/form-factor records that have sufficient page-level data to pass, matching the first performance KPI in the strategy. URLs without sufficient CrUX samples are recorded as unavailable and are not silently treated as failures or successes.

## Representative coverage

`performance/targets.json` covers the homepage, a long-form article, Reading List, a learning pathway, the learner account, a controlled topic hub, and faceted search. Add a target whenever a new layout, rendering strategy, or materially different interactive experience ships.

## Local verification

Install the pinned Node dependencies, build the exact production output, and run the lab gate:

```sh
npm ci
npm run build
npm run performance:ci
```

Lighthouse writes detailed JSON, readable HTML reports, and an aggregate summary under `performance-results/lighthouse/`. The directory is ignored by Git.

Check the field baseline or live CrUX data with:

```sh
npm run performance:crux
```

Without `CRUX_API_KEY`, the script verifies the committed no-data baseline and reports that Lighthouse remains the enforceable gate. To query fresh field data, enable the Chrome UX Report API in Google Cloud and provide the key only in the environment:

```sh
CRUX_API_KEY=your-key npm run performance:crux
```

Set `PERFORMANCE_REQUIRE_CRUX_DATA=1` only after the origin reliably appears in CrUX. At that point, absence of measurable origin data becomes a failing condition.

## GitHub release policy

`.github/workflows/core-web-vitals.yml` runs on every pull request, every push to `main`, manual dispatch, and a weekly schedule. The workflow preserves Lighthouse reports for 14 days and CrUX results for 30 days.

After this workflow first exists on GitHub, configure the `main` branch rule to require these status checks before merge:

- `Lighthouse release gate`
- `CrUX field gate`

Add a repository Actions secret named `CRUX_API_KEY` for live field checks. Until the site receives enough eligible CrUX traffic, the committed no-data state is valid and the Lighthouse job is the blocking performance criterion. Once field data is consistently available, add a repository Actions variable named `PERFORMANCE_REQUIRE_CRUX_DATA` with the value `1` and treat both checks as blocking.

Do not approve a release by editing budgets upward to accommodate a regression. A threshold change needs a dated baseline, a written reason, and review alongside the product change that requires it.

## Measurement references

- [Core Web Vitals thresholds and 75th-percentile assessment](https://web.dev/articles/defining-core-web-vitals-thresholds)
- [Chrome UX Report methodology and eligibility](https://developer.chrome.com/docs/crux/methodology)
- [Chrome UX Report API](https://developer.chrome.com/docs/crux/api)
- [PageSpeed Insights API](https://developers.google.com/speed/docs/insights/v5/get-started)
