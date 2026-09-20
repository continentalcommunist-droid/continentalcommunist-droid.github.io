# Continental Communist organic search strategy

Updated September 20, 2026. Canonical site: https://www.continentalcommunist.com/.

This strategy supersedes the September 4 audit's keyword plan. The archive contains three published original essays. The former two-article count and references to a missing “Numbers Racket” article are obsolete.

## Audience and page purpose

The homepage introduces American left politics, analysis, and education while keeping the publication's Marxist perspective explicit. It links to factual public guides, the publication's existing essays, subject hubs, and learning pathways. The primary discovery measure is US non-branded organic impressions and clicks, segmented by destination. Newsletter subscriptions and voluntary study are secondary outcomes; no new tracking or signup requirement is introduced.

The dated [keyword research worksheet](keyword-research-2026-09-20.md) records the 12-month and 90-day Google Trends observations, query intent, unavailable account data, and follow-up procedure. Search volumes remain unknown without an authenticated Keyword Planner export. Neither this document nor the site claims that a term is “most searched.” Google Trends reports relative sampled interest, not monthly counts. [Google methodology](https://support.google.com/trends/answer/4365533?hl=en)

## Homepage implementation

- HTML title: **Continental Communist — American Left Politics & Analysis**, produced by the existing `site.title` plus `site.tagline` branch.
- Keep the brand wordmark as the single H1. The adjacent visible scope line reads **American left politics, analysis, and education**.
- The public introduction identifies independent essays and Marxist education on American politics, labor, technology, and socialist thought.
- Primary action leads to Analysis; secondary action leads to Learn. Existing header navigation, identity, background effects, accessible fallbacks, and newsletter service are preserved.
- Descriptive subject links lead to Socialism, Labor, Artificial Intelligence, and American History.
- The public-guide block lists standard pages carrying `search_guide: true`, alphabetically by title. Titles and descriptions come directly from those pages. It appears only when guides exist.
- Featured and latest essay cards use public article descriptions rather than pulling an unexplained sentence from the body.

Supporting language describes actual coverage. Google recommends accurate descriptive titles and prominent terms matching a page's contents. [Search Essentials](https://developers.google.com/search/docs/essentials)

## Keyword ownership and access

| Destination | Primary query / intent | Content and access |
| --- | --- | --- |
| `/` | American left political analysis | Publication introduction, full public text |
| `/2026/09/02/on-america/` | scientific socialism in America | Scientific Socialism and the American Left; public summary, existing account requirement for full essay |
| `/2026/09/03/on-artificial-intelligence/` | Marxist analysis of artificial intelligence | Artificial Intelligence and Work: A Marxist Analysis; public summary, existing account requirement |
| `/2026/09/04/on-gig-work/` | Marxist analysis of the gig economy | The Gig Economy: A Marxist Analysis of Wages and Work; public summary, existing account requirement |
| `/learn/guides/democratic-socialism/` | what is democratic socialism | Public terminology/history guide |
| `/learn/guides/progressive-vs-liberal/` | progressive vs liberal | Public American-usage guide |
| `/learn/guides/democratic-socialists-of-america/` | what is the Democratic Socialists of America | Public factual organizational guide |
| `/learn/guides/zohran-mamdani/` | who is Zohran Mamdani | Public sourced biography and career timeline |
| `/topics/socialism/` | socialism resources | Subject hub and related reading |
| `/learn/pathways/marxism-fundamentals/` | Marxism for beginners | Structured reading/study intent |
| `/reading-list/` | Marxist reading list | Bibliography/resource selection |

Existing article filenames and dated canonical URLs remain unchanged; explicit permalinks prevent revised visible titles from moving articles. Titles propagate to cards, article headings, and structured-data headlines. Article descriptions sit above the reading gate. Broader definition and study-plan searches belong to the guides and pathways, respectively.

Each guide uses `layout: page`, a stable permalink, unique title/description, a reviewed date, and source links. It is accessible without an account and receives incoming links from both the homepage and Learn. The Socialism hub adds contextual guide links. Guides use the existing WebPage metadata; they are not labeled as breaking news or registration-restricted Article content. Existing article access/schema behavior is retained.

The guide field is an internal publishing convention, not a new public API. Add it only to finished, sourced public guides. No new topic records, duplicate synonym pages, tracking service, or SEO plugin is required.

## Editorial and source checks

- Existing essays retain their subject and attributed argument; headings, public summaries, citations, and contextual links clarify their scope.
- Verify historical quotations against primary texts and provide locators. Factual allegations require support; do not retain unsupported income or training-data claims as established facts.
- New political guides are factual and source-cited. Attribute organizations' self-descriptions and public officials' statements. Distinguish current facts from historical records and proposed positions from enacted action.
- Keep terminology distinctions contextual. A biography, an organization, an ideology, and a political label have different search intents.
- Reviewed dates must correspond to real checks. Do not refresh dates automatically to suggest new reporting.

## Release validation

Build the production site, then run SEO, formatting, taxonomy, citation, and learner-platform checks. The release workflow invokes the existing SEO validator and taxonomy/citation checks in addition to its prior build, browser, and performance checks.

Review the homepage and a long guide on desktop and narrow mobile screens; confirm heading wrapping, accessible links, public reading, keyboard focus, reduced motion, and no horizontal clipping. Preserve existing homepage/cursor tests and the three-run median mobile performance budget.

Verify that all three old article URLs remain self-canonical, all four guides are in the sitemap and on-site search, and public summaries precede the registration gate. Test generated HTML and local HTTP delivery before release. After actual deployment, check production status, rendered metadata, redirects, and sitemap delivery; local tests cannot establish Google indexation or live ranking.

## Measurement and release status

The repository includes a Search Console ownership file; it does not establish access to property reports. The pre-release baseline remains **unavailable** until an authenticated export is provided. [Search Console guidance](https://developers.google.com/search/docs/monitor-debug/search-console-start)

Record actual deployment as D0. At D0 + 28, +56, and +90 days, review US Web Search impressions, clicks, CTR, average position, indexed status, and query/page fit. Separate homepage, articles, and guides; exclude brand queries in a separate view while retaining page totals. Compare complete 28-day periods and consider position and impression volume when interpreting CTR. Do not use the development date as a substitute for deployment, and do not claim notifications have been scheduled.

Release sequence: homepage/article changes first; completed guides and their incoming links second. The implementation can be reviewed together locally. Production release and Search Console submission must be verified separately; this document does not claim either has happened.

Existing PDF exclusion, utility-page noindex rules, learning data, and registration behavior are outside this change. Earlier hosting/storage recommendations are not prerequisites for the present content release.

### Local verification — September 20, 2026

- Production build passed, with existing Minima/Sass deprecation notices.
- SEO validation passed for 197 canonical URLs and the public-guide access/discovery checks; formatting passed for 204 public HTML pages.
- Taxonomy, citations, learning schema, learner-platform validation, and whitespace checks passed.
- All 7 homepage/background checks, 4 cursor checks, and 6 lesson checks passed.
- The homepage passed the existing mobile performance budget using the default three-run median.
- All four guides were checked at a 320px viewport: no horizontal overflow or article gate. The biography's timeline uses a dated list for narrow screens. Homepage review also covered 375px and desktop layouts, guide links, and the retained wordmark.
- Generated article headings match structured-data headlines; summaries remain outside the gate; all three original canonicals are retained. Both normalized and custom citation URLs resolve to the intended destinations.
- A crawl of generated HTML found no missing internal page destinations. A separate review noted existing shared-navigation fragment issues on Topics and Library, outside the changed files.

No production deployment, Search Console submission, authenticated performance baseline, or future review automation is claimed by these local checks. Article bodies have been revised for source accuracy and neutral attribution as well as search presentation; their wording is part of the publication's editorial review before release.
