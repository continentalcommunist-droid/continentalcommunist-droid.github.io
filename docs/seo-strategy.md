# Continental Communist organic search strategy

Audit date: 2026-09-04  
Canonical site: https://www.continentalcommunist.com/  
Scope: the Jekyll source, generated production site, current public search visibility, core content templates, and conversion paths.

## Assumptions

- Continental Communist is an independent, online-only publication and learning platform rather than a local business.
- The primary audience is English-speaking readers in the United States who want serious introductions to Marxism, political economy, American socialist history, and primary-source study.
- The primary conversion is newsletter subscription. Starting a learning pathway and creating a free learner account are secondary conversions.
- No keyword-volume, Search Console, newsletter, or learner-account conversion data was available. Keyword priorities therefore reflect business fit, intent, existing assets, and observed search competition—not invented volume estimates.
- Public search checks on 2026-09-04 returned the homepage for the exact publication name and returned no PDFs for `site:continentalcommunist.com filetype:pdf`.

## 1. Executive SEO summary

The site has a strong technical base for a new publication: one canonical HTTPS host, crawlable server-rendered content, clean descriptive URLs, a generated XML sitemap, controlled taxonomies, structured learning pathways, primary texts, citations, responsive images, and unusually good internal organization for an early archive. A production crawl after this implementation found 175 canonical indexable URLs, no broken internal links, no duplicate indexable titles or descriptions, one ordered `h1` per page, and no missing image alt attributes.

The constraint is no longer basic crawlability. It is editorial authority and search demand capture. The site has only two publishable original articles, many profiles are connective records rather than biographies, planned hubs do not yet contain a real product, and the editorial identity does not provide a named author, contact channel, credentials, or explicit corrections methodology. Those weaknesses limit both traditional rankings and citation in AI-generated answers.

The fastest growth path is to make `/learn/`, `/learn/pathways/`, `/reading-list/`, and `/library/` the acquisition system. They should answer high-intent “where do I start?” and “how do I study this?” searches, lead into the relevant pathway or reading edition, and then offer newsletter/account conversion after the visitor has received useful material.

## 2. Biggest SEO problems

| Severity | Problem | Why it matters | Exact fix | Status |
| --- | --- | --- | --- | --- |
| Critical | Public PDF files cannot receive `noindex` headers on GitHub Pages | A publicly linked PDF can be indexed independently of its library page; `robots.txt` alone is not an indexing guarantee | Move PDFs to private authenticated object storage, or put the document path behind an origin/CDN that returns `X-Robots-Tag: noindex`; then allow crawling so Google can see the header. Until migration, keep URLs out of indexable HTML and sitemaps and block `/assets/library/` | Mitigated in code; hosting migration remains |
| High | Registration-gated article/chapter schema said content was freely accessible | Google treats registration as restricted access and asks sites to identify gated sections | Set `isAccessibleForFree: false` and `hasPart.cssSelector: .cc-gated-body` | Implemented |
| High | `WebSite` site-name markup appeared on every page | Google specifies that site-name `WebSite` data belongs on the domain homepage | Emit the single `WebSite` node only on `/` | Implemented |
| High | Self-guided pathways were marked as instructor-led `Course` objects | The visible product does not meet Google's instructor/roster definition for a course | Use accurate `LearningResource` markup; reserve `Course` for a future instructor-led cohort | Implemented |
| High | A post labeled `editorial_stage: Draft` was publicly generated | Draft material weakens quality control, can rank prematurely, and creates removal work | Set `published: false`; only publish after editorial status and citations are complete | Implemented |
| High | No named author, contact method, editorial policy, or usable correction channel | Political and historical claims need visible accountability; policy pages currently invite contact without supplying a channel | Add named author/editor profiles, a real contact address or form, editorial standards, corrections policy, and source-selection policy | Owner input required |
| High | Only two publishable original articles support a much larger reference architecture | Large taxonomies cannot earn topical authority without sustained original work | Publish one evidence-led article and one useful study guide each week for 12 weeks | Open |
| Medium | Source records and reading editions shared titles and descriptions | Duplicate snippets blur page purpose and invite cannibalization | Label source records as citation/edition records and books as reading editions | Implemented |
| Medium | Briefings, Multimedia, and Community were indexable “coming soon” pages | Thin placeholders spend crawl attention and can create poor first impressions | Keep them reachable but `noindex, follow` until each has substantive, current content | Implemented |
| Medium | The parameter-driven PDF reader was orphaned and indexable | Query variants can create duplicate URLs while the page has no stable standalone intent | Mark the reader `noindex, follow`, remove it from the sitemap, and link catalog actions to it with `nofollow` | Implemented |
| Medium | Pathway totals said eight, nine, and twelve in different places | Inconsistent facts reduce trust and can cause conflicting snippets | Derive counts where possible and standardize visible copy at twelve | Implemented |
| Medium | Topic/profile introductions are often short and templated | Thin entity pages are less likely to rank or be cited by answer engines | Enrich only the pages supported by actual editorial coverage; add an original definition, scope, key debates, reading order, and cited sources | Open |
| Medium | Current articles have little heading structure and limited sourcing | Search engines and readers cannot quickly reconstruct the argument | Add descriptive sections, claim-level citations, counterarguments, and a concise “what this explains” conclusion | Open |
| Low | Many chapter titles exceed common display widths | Titles may be rewritten or truncated, though this is not a ranking penalty | Chapter templates now omit repetitive site branding; add manual `seo_title` only where a title remains unclear | Partly implemented |

## 3. Biggest growth opportunities

1. Own beginner study intent. `/learn/pathways/marxism-fundamentals/` is a real six-week product, not a generic article. Make it the definitive answer for “how to learn Marxism,” “Marxism for beginners,” and “Marxist study plan.”
2. Turn the reading list into a decision tool. Add “choose by goal,” “choose by time,” “before reading Capital,” and “primary texts versus commentaries” sections, with links into the twelve pathways.
3. Build searchable study companions around hosted primary texts. Introductions, chapter summaries, glossaries, and discussion questions can rank without trying to make raw source files the acquisition landing pages.
4. Establish a distinctive American-socialism cluster. Few sites combine Marxist method with American institutions, Reconstruction, labor history, industrial policy, and constitutional development.
5. Publish evidence-led explainers that deserve citation. Original charts, timelines, annotated bibliographies, primary-source comparisons, and clearly scoped arguments are more useful to both researchers and AI answer systems than opinion-only essays.
6. Use the existing knowledge graph. Every article should connect to one pathway, two to five topic hubs, a named author, and primary/secondary sources; those pages should link back automatically.

## 4. Keyword strategy

Volume is intentionally omitted until Search Console and a keyword tool provide real data.

| Primary keyword / cluster | Secondary terms | Intent | Target page | Funnel | Priority | Content angle |
| --- | --- | --- | --- | --- | --- | --- |
| Continental Communist | continentalcommunist.com, Continental Communist publication | Navigational | `/` | Bottom | Highest | Official entity/homepage |
| learn Marxism online | study Marxism, Marxist education online, learn Marxist theory | Educational/transactional | `/learn/` | Middle-bottom | Highest | Free structured study, not an unsequenced link list |
| Marxist study guide | Marxism study plan, Marxist reading pathway | Transactional | `/learn/pathways/` | Bottom | Highest | Compare twelve guided routes by level, time, and subject |
| Marxism for beginners | beginner Marxism course, introduction to Marxism reading plan | Transactional | `/learn/pathways/marxism-fundamentals/` | Bottom | Highest | Six-week starting plan with outcomes and prerequisites |
| Marxist reading list | communist reading list, scientific socialism reading list | Commercial investigation | `/reading-list/` | Middle-bottom | Highest | Cross-tradition bibliography with a recommended order |
| Marxist political economy course | Marxian economics study guide, read Capital study plan | Transactional | `/learn/pathways/capital-political-economy/` | Bottom | High | From commodity and money to crisis and finance |
| Marxist political economy library | political economy digital library, Marxist books online | Resource/transactional | `/library/` | Middle-bottom | High | Searchable catalog plus rights-reviewed HTML texts; PDFs themselves stay out of search |
| read Capital Volume 1 online | Capital Volume 1 chapters, Marx Capital reading edition | Transactional | `/library/texts/capital-volume-one/` | Bottom | High | Traceable edition, chapter navigation, provenance, and study links |
| how to read Capital Volume 1 | Capital reading guide, Capital chapter guide | Informational | New `/guides/how-to-read-capital-volume-one/` | Middle | High | Reading order, pacing, difficult concepts, and pathway links |
| historical materialism explained | materialist conception of history, Marxist method | Informational | `/topics/historical-materialism/` after expansion | Top-middle | High | Definition, common errors, primary passages, applications |
| social reproduction theory reading list | Marxist feminism reading list, domestic labor debate | Commercial investigation | `/learn/pathways/marxist-feminism-social-reproduction/` | Middle-bottom | High | Six-week sequence from domestic-labor debate to unitary theory |
| Marxism and American history | American Marxism, socialism in American history | Informational | `/learn/pathways/labor-socialist-history/` plus supporting guides | Middle | High | Institutions, labor, Reconstruction, and socialist movements |
| market socialism vs planned economy | socialist calculation debate, markets and planning | Comparison | New `/analysis/market-socialism-vs-planning/` linked to pathway 06 | Middle | High | Define models, compare information and accountability, cite competing traditions |
| Marxism vs socialism | communism vs socialism vs Marxism | Comparison | New `/guides/marxism-socialism-communism/` | Top | Medium | Precise historical definitions without sloganizing |
| what is surplus value | labor power vs labor, rate of exploitation | Problem-aware/informational | `/topics/value/` after expansion | Top-middle | High | Plain-language explanation tied to primary chapters |
| automation and Marxism | Marxism AI, technology and labor, automation political economy | Informational | `/learn/pathways/technology-automation-ai/` | Middle | High | Technology as ownership, skill, control, and public investment |
| American socialist democracy | socialism and democracy in America, Marxist democracy | Informational | `/topics/socialist-democracy/` plus an analysis series | Top-middle | Medium | Institutions and democratic accountability, not labels alone |
| Marxists Internet Archive reading guide | where to start on Marxists.org, Marx primary texts reading order | Alternative/resource | New guide linked to `/reading-list/` | Middle | Medium | Respectful navigation aid that points to primary sources and structured study |
| Marxist reading group curriculum | socialist reading group syllabus, Marxist discussion questions | Transactional | Future `/community/reading-groups/` only when active | Bottom | Medium | Facilitation kit, calendar, norms, and printable questions |

Do not create multiple pages for singular/plural or “course/guide/pathway” variants. Let one destination own each intent and use the variants naturally in copy and anchors.

## 5. Recommended sitemap

```text
/
├── about/
│   ├── editorial-standards/            future
│   ├── corrections/                    future
│   └── contact/                        future
├── learn/
│   ├── pathways/
│   │   └── {12 pathway slugs}/
│   ├── guides/                         future content hub
│   │   ├── how-to-read-capital-volume-one/
│   │   ├── marxism-socialism-communism/
│   │   └── marxists-internet-archive-reading-guide/
│   └── concepts/                       publish only when substantive
├── analysis/
│   └── YYYY/MM/DD/article-slug/
├── topics/
│   └── topic-slug/
├── library/
│   ├── texts/
│   │   ├── work-slug/
│   │   └── work-slug/chapter-slug/
│   └── sources/source-slug/
├── reading-list/
├── briefings/                          noindex until active cadence
├── multimedia/                         noindex until original media exists
├── community/                          noindex until participation opens
├── privacy/
└── terms/

Utilities excluded from the search index:
├── search/
├── account/
├── library/reader/?book=...
├── 404.html
└── admin/
```

Do not add city or state pages. The product is online and nationwide; location pages would be doorway pages without a genuine local service, team, program, or event.

## 6. Page-by-page SEO plan

### Primary acquisition pages

| Page / URL | Primary intent | Recommended title | Recommended H1 and sections | Depth and CTA | Schema / linking |
| --- | --- | --- | --- | --- | --- |
| Homepage `/` | Brand + platform discovery | `Continental Communist — American Marxist Education and Analysis` | H1 brand; add “What you can learn,” “Start with a pathway,” “Latest evidence-led analysis,” “Read primary texts” | 500–800 useful words; primary CTA newsletter, secondary CTA beginner pathway | `Organization` + homepage-only `WebSite`; link to Learn, Reading List, Library, About, two best articles |
| Learn `/learn/` | Learn Marxism online | `Learn Marxism Online: Guided Study Paths | Continental Communist` | H1 Learn Marxism; “Choose by experience,” “Choose by subject,” “How pathways work,” “Free versus account features” | 700–1,000 words; CTA start fundamentals | `CollectionPage` or `WebPage`; every pathway links in and out |
| Pathways `/learn/pathways/` | Compare Marxist study guides | `Marxist Learning Pathways and Study Guides | Continental Communist` | Existing H1; add filter/decision copy by level, hours, goal | 700 words plus cards; CTA open one route | `ItemList` plus `LearningResource` items if visible; pathway pages link back |
| Reading List `/reading-list/` | Marxist reading list | `Marxist Reading List: A Guided Study Order | Continental Communist` | H1; add “Start here,” “Before Capital,” “By subject,” “Primary vs secondary,” “How the list was selected” | Existing long bibliography; add jump links and pathway CTA | `CollectionPage`; links to pathways, books, source records |
| Library `/library/` | Marxist political economy library | `Marxist Political Economy Library and Primary Texts` | H1; “Browse catalog,” “Read HTML primary texts,” “Rights and provenance,” “How to study these works” | Keep catalog; CTA authenticated reader and related pathway | `CollectionPage`; do not expose direct local PDF URLs |
| About `/about/` | Publication/entity trust | `About Continental Communist` | Existing H1; add “Who writes and edits,” “Editorial standards,” “Funding/independence,” “Corrections and contact” | 900–1,300 words; CTA read standards/contact | `AboutPage`; link from every author and footer |

### Learning pathways

All pathway pages should keep their existing H1, opening summary, syllabus, effort, prerequisites, outcomes, glossary, questions, and progress tools. Add a 100–180 word “Who this is for” block, one sample outcome above the fold, and two contextual links to relevant topic/book pages.

| URL | Primary keyword | Secondary terms | Suggested SEO title | CTA |
| --- | --- | --- | --- | --- |
| `/learn/pathways/marxism-fundamentals/` | Marxism for beginners | beginner Marxist study plan | `Marxism for Beginners: A Six-Week Study Plan` | Begin pathway |
| `/learn/pathways/marxist-leninist-core-curriculum/` | Marxist-Leninist reading curriculum | Marxism Leninism study guide | `Marxist-Leninist Core Curriculum and Reading Plan` | Start 24-week curriculum |
| `/learn/pathways/capital-political-economy/` | Marxist political economy course | Capital study plan | `Marxist Political Economy: Guided Capital Study` | Start political economy pathway |
| `/learn/pathways/american-capitalism-state/` | American capitalism and the state | US political economy reading list | `American Capitalism and the State: Study Guide` | Open pathway |
| `/learn/pathways/labor-socialist-history/` | American socialist history reading list | US labor history study guide | `American Labor and Socialist History: Study Guide` | Open pathway |
| `/learn/pathways/race-reconstruction-class/` | Reconstruction and class reading list | race labor Reconstruction | `Race, Reconstruction, and Class: Reading Path` | Open pathway |
| `/learn/pathways/markets-planning-democracy/` | markets vs planning | socialist calculation debate | `Markets, Planning, and Socialist Democracy` | Open pathway |
| `/learn/pathways/technology-automation-ai/` | Marxism and artificial intelligence | automation labor political economy | `Technology, Automation, and AI: Marxist Study Guide` | Open pathway |
| `/learn/pathways/imperialism-global-development/` | imperialism reading list | dependency and world systems | `Imperialism and Global Development: Reading Path` | Open pathway |
| `/learn/pathways/marxist-feminism-fundamentals/` | Marxist feminism reading list | gender and class study guide | `Marxist Feminism: Introductory Reading Path` | Open pathway |
| `/learn/pathways/marxist-feminism-social-reproduction/` | social reproduction theory reading list | domestic labor debate | `Social Reproduction Theory: Marxist Reading Path` | Open pathway |
| `/learn/pathways/marxist-feminism-advanced-debates/` | advanced Marxist feminism | care chains value state | `Advanced Marxist Feminism: Value, Care, and State` | Open pathway |

### Editorial and reference templates

| Page type | Search intent and target | Content goal | Internal links | CTA | Schema |
| --- | --- | --- | --- | --- | --- |
| Analysis hub `/analysis/` | American Marxist analysis | Add topical entry points and short editorial standard; feature series, not only chronology | Topics, author, Learn | Read best article / subscribe | `CollectionPage` |
| “Numbers Racket” article | Capitalist democracy in America | Add descriptive H2s, evidence for current two-party/capital claims, counterargument, and a conclusion | Democracy, Political Economy, Federalist No. 10, Capital | Subscribe / related pathway | `Article` + gated-part markup |
| “On America” article | American socialism analysis | Add H2s, distinguish factual claims from argument, source both Manifesto quotations, and cite claims about Marx/Engels | American History, Marxist Theory, Manifesto | Subscribe / fundamentals | `Article` + gated-part markup |
| Topic page `/topics/:slug/` | Definition + curated resources | 400–800 original words: definition, scope, central debates, starting resources, related terms | Parent, children, best pathway, best article, primary text | Start related pathway | `CollectionPage` only when resources are present |
| Book page `/library/texts/:slug/` | Read a named work online | Edition introduction, provenance, difficulty, reading order, TOC | Author, topics, pathway, source record | Sign in and start reading | `Book`; reflect registration restriction accurately |
| Chapter page | Named chapter / passage | Preserve source text; add a concise editor's orientation only when clearly separated from source | Parent book, previous/next, concepts, source | Continue reading | `Chapter` + gated-part markup |
| Source record `/library/sources/:slug/` | Citation and edition data | Metadata, rights, source URL, citation exports, cited-by graph | Reading edition, cited articles | Copy/download citation | Accurate `Book`, `ScholarlyArticle`, or `CreativeWork` |
| Person profile `/people/:slug/` | Named thinker within this curriculum | Publish only useful profiles: 250–600 word bio, relevance, key works, contested interpretations, sources | Pathways, books, articles, topics | Explore connected material | `ProfilePage` + `Person`; no invented credentials |
| Planned hubs | No active search target yet | Stay `noindex` until a stable program and at least three real items exist | Remain reachable from navigation if product signaling is desired | Join newsletter | Generic `WebPage` while noindex |
| Utility pages | Functional | Search/account/reader/404 should solve the task without becoming landing pages | Link back to hubs | Resume intended task | `WebPage`, `noindex, follow` |

## 7. Content gaps

1. A beginner glossary page with substantial entries for commodity, labor power, surplus value, class, mode of production, historical materialism, ideology, state, and imperialism.
2. A practical “how to read Capital” companion that explains editions, pace, prerequisites, and where readers commonly stall.
3. A sourced overview of socialism in United States history, with a timeline and links to labor/Reconstruction pathways.
4. A comparison of planned economy, market socialism, social democracy, and public enterprise that separates institutional designs.
5. An article on Marxist approaches to AI and automation grounded in ownership, labor process, productivity, and public investment.
6. A source-selection/editorial-method page describing how claims, quotations, corrections, and AI assistance are handled.
7. Named author/editor profiles and a contact path.
8. Original data or visual research on wages, ownership, union density, housing, industrial policy, or productivity.
9. Short study companions for the six HTML primary texts.
10. A reader FAQ covering what is free, why registration is required, rights/provenance, citations, privacy, and downloads.

## 8. Content calendar

| Week | Funnel | Working title | Primary keyword | Format / main sections | Internal targets | Conversion | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Bottom | Marxism for Beginners: A Six-Week Study Plan | Marxism for beginners | Landing-page expansion: audience, weekly plan, outcomes, FAQs | Fundamentals, Reading List, glossary | Begin pathway | Highest |
| 2 | Middle | How to Read Capital, Volume I Without Losing the Argument | how to read Capital | Guide: preparation, parts, pace, concepts, editions, common stalls | Capital pathway, book, value topic | Start pathway/account | Highest |
| 3 | Top | Historical Materialism: What It Explains—and What It Does Not | historical materialism explained | Definition, method, examples, limits, readings | Topic, fundamentals, Marx/Engels profiles | Newsletter | High |
| 4 | Middle | Social Reproduction Theory: A Reading Order | social reproduction theory reading list | Debate map, sequence, Vogel/Federici/Bhattacharya, questions | Pathways 10–12, topic | Start pathway | High |
| 5 | Top | What Is Surplus Value? Labor Power, Wages, and Profit | what is surplus value | Plain-language explainer with worked example and primary passages | Value topic, Value Price and Profit, Capital ch. 6–9 | Read primary text | High |
| 6 | Middle | Market Socialism vs. Economic Planning | market socialism vs planned economy | Definitions, information, ownership, accountability, cases, debate map | Planning pathway/topics | Start pathway | High |
| 7 | Top | Socialism in American History: A Starting Timeline | American socialism history | Timeline with movements, institutions, primary sources, further study | Labor history, Reconstruction, American History topic | Newsletter/pathway | High |
| 8 | Middle | A Marxist Guide to Automation and Artificial Intelligence | Marxism and AI | Labor process, ownership, productivity, skill, public alternatives | Technology pathway/topics | Start pathway | High |
| 9 | Top | Marxism, Socialism, and Communism: Historical Differences | Marxism vs socialism | Definitions, chronology, overlap, misuse, primary texts | Fundamentals, socialism topic | Newsletter | Medium |
| 10 | Middle | Where to Start in the Marxists Internet Archive | Marxists Internet Archive reading guide | Navigation, editions, reading order, citation, pathways | Reading List, six hosted HTML texts | Start pathway | Medium |
| 11 | Bottom | Marxist Political Economy Study Guide | Marxist political economy course | Expand pathway landing copy and sample module | Capital pathway, library, value/capital topics | Begin pathway | High |
| 12 | Middle | How We Research, Cite, Correct, and Update Articles | editorial standards | Policy: evidence roles, source hierarchy, quotations, corrections, updates, AI disclosure | About, author, all articles | Trust/subscription | Highest |

Each piece needs one primary intent, a short answer near the opening, original synthesis, claim-level sources, a descriptive table of contents for long work, and two to five contextual internal links. Do not publish to meet cadence if the evidence review is incomplete.

## 9. Internal-linking plan

- Treat `/learn/`, `/learn/pathways/`, `/reading-list/`, `/library/`, `/analysis/`, and `/topics/` as hubs. Every new page must link to one hub and receive at least one link from a hub before publication.
- Each analysis article should link to one relevant pathway, two to five topic pages, its author profile, and every source record used. Its related-content block should prefer the strongest shared-topic page, not merely the newest.
- Each pathway should link to the best topic definition before a difficult concept, the hosted reading edition when available, and one contemporary application in Analysis.
- Each topic page should link upward to its parent, sideways to no more than four related topics, and downward to the best article/pathway/text. Avoid linking every topic to every other topic.
- Each book page should link to its source record and author profile; the source record should link back to the reading edition.
- Recommended anchors: “Marxism Fundamentals pathway,” “guide to social reproduction theory,” “read Capital, Volume I,” “citation record for the Manifesto,” and “analysis of capitalist democracy.” Avoid repeated “click here” and excessive exact-match anchors.
- Keep breadcrumb HTML and JSON-LD synchronized. The current crawl depth is healthy: indexable destinations are reachable within four clicks; retain that release criterion.
- The PDF reader remains intentionally outside the index. Catalog links may reach it for users but must not expose the underlying document URL on indexable pages.

## 10. Technical SEO recommendations

### Implemented and verified

- One absolute self-referencing canonical per HTML page.
- One robots directive per page; planned/utility pages are excluded from the sitemap when `noindex`.
- XML sitemap contains only canonical indexable HTML URLs with meaningful `lastmod` where supplied.
- News sitemap is present and correctly empty when no eligible two-day `NewsArticle` exists.
- HTTP and domain variants should continue redirecting to `https://www.continentalcommunist.com/`; verify after every hosting/DNS change.
- No broken internal links, duplicate indexable titles/descriptions, missing alt attributes, multiple H1s, or heading-order failures in the production build.
- Custom 404 page with recovery links.
- Responsive WebP display images, explicit image dimensions, homepage LCP preload, compressed CSS, deferred/module scripts, and lazy-loaded newsletter frame.
- One-run mobile Lighthouse check on 2026-09-04 passed all eight representative templates: scores 98–100, LCP 1.2–2.2 seconds, CLS 0–0.028, and TBT 0 ms. Use the required three-run median before release.

### PDF exclusion policy

Current controls:

1. `/assets/library/` is disallowed in `robots.txt`.
2. No PDF or EPUB is listed in either sitemap.
3. Indexable catalog output contains no full local document URL.
4. Catalog actions lead to the `noindex` authenticated reader, not directly to a file.
5. Reader download/open links carry `nofollow` and receive their URL only after authentication.
6. The SEO validator fails if generated HTML exposes a full local PDF/EPUB path.

Required for a guarantee: move the 162 document files to a private bucket that issues short-lived signed URLs after authentication, or place their current path behind an origin/CDN returning `X-Robots-Tag: noindex`. Google explicitly recommends an `X-Robots-Tag` for non-HTML resources and warns that robots exclusion alone does not guarantee removal: [robots meta and X-Robots-Tag specification](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [robots.txt guidance](https://developers.google.com/search/docs/crawling-indexing/robots/intro).

After that migration, remove the PDF-path `Disallow` so crawlers can read the `X-Robots-Tag`, inspect representative files in Search Console, and use the Removals tool for any legacy URL already present.

### Remaining checks

- Run a live status/redirect crawl after deployment; a static build cannot prove CDN HTTP statuses, cache headers, TLS, or redirect chains.
- Monitor real-user LCP, INP, and CLS in Search Console/CrUX. Lab Lighthouse is not field data.
- Keep query parameters out of canonicals and sitemaps. The reader/search/account pages remain `noindex`.
- Add width/height fields to future featured-image front matter and display the image visibly when it is used in article structured data.
- Replace the legacy Sass `@import` dependency when upgrading Minima/Dart Sass; current warnings do not affect the production output.

## 11. Schema recommendations

- Homepage: `Organization` and a single `WebSite` node with the consistent site name. Google's current site-name guidance says the `WebSite` node belongs on the homepage: [site-name documentation](https://developers.google.com/search/docs/appearance/site-names).
- Articles: `Article`; use `NewsArticle` only for genuinely time-sensitive reported news. Include headline, published/modified dates, named or organizational author, publisher, image only when visible, keywords, citations, and gated-content properties.
- Learning pathways: `LearningResource`, not `Course`, while they remain self-guided. Google's Course result requires a real course model and describes instructor/roster expectations: [Course structured-data guidance](https://developers.google.com/search/docs/appearance/structured-data/course).
- Topics and hub pages: `CollectionPage` with an `ItemList` only when visible items exist.
- Reading editions: `Book`; chapters: `Chapter`; normalized citation records: the most accurate of `Book`, `ScholarlyArticle`, or `CreativeWork`.
- Author/thinker profiles: `ProfilePage` whose `mainEntity` is `Person`; the editorial identity remains an `Organization`.
- Breadcrumbs: `BreadcrumbList` matching visible breadcrumbs.
- Do not add `FAQPage` merely for snippets; create visible FAQs for users and apply schema only if current eligibility and page purpose justify it.
- Never add reviews, ratings, credentials, prices, or sameAs profiles that are not visible and verifiable.

## 12. Local SEO recommendations

Local SEO is not applicable under the current online/nationwide model. Do not create city pages, `LocalBusiness` markup, local citations, or a Google Business Profile without a real staffed location or eligible in-person service. If public events or reading groups launch, create one substantive event/location page per real program and use `Event` markup with verified dates, venue, organizer, and attendance details.

## 13. E-E-A-T and trust improvements

1. Replace the collective byline with the real writer's name where the writer is willing to be public; retain the publication as publisher/editor.
2. Give every active contributor a sourced biography, relevant experience, topic scope, and links to their work. Do not manufacture credentials.
3. Publish editorial standards covering source hierarchy, anonymous sources, quotation checks, correction labels, update dates, and AI-assistance disclosure.
4. Add a corrections page and a visible correction history on changed articles.
5. Add a genuine contact channel for editorial questions, privacy requests, and rights notices. The current Privacy and Terms pages request contact but provide no way to do it.
6. Explain funding, affiliations, and conflicts of interest on About.
7. Use claim-level citations for history, statistics, quotations, and contested assertions. Keep the existing evidence-role notes.
8. Add original charts/tables with downloadable source data and methodology when publishing quantitative claims.
9. Audit the rights basis of every downloadable work. Remove or restrict any file whose redistribution permission is not documented; a general fair-use statement is not a substitute for item-level permission.

## 14. Conversion improvements

- Homepage: test a primary “Start Marxism Fundamentals” button and a secondary “Get new articles by email” anchor above the fold. Keep About available but not as the strongest acquisition CTA.
- Learn/pathway pages: show level, time, prerequisites, and first outcome before the first major scroll; let visitors preview the first step without signing in.
- Reading List: add decision blocks for “new reader,” “preparing for Capital,” “American history,” “Marxist feminism,” and “AI/technology.”
- Articles: place one non-interruptive CTA after the conclusion: related pathway first, newsletter second. Do not gate before the reader understands the article's value proposition.
- Account gate: state exactly what registration unlocks, why it is required, what data is stored, and that there is no charge. Link directly to Privacy.
- Newsletter: track form view, start, success, and error separately. Provide an accessible confirmation state outside the iframe if the provider supports it.
- Add real proof when available: number of completed pathways, subscriber quotes with consent, cited publications, or case studies of study-group use. Do not use fabricated counters or testimonials.

## 15. Analytics and measurement plan

Respect the no-surveillance positioning. Search Console and Bing Webmaster Tools are essential; analytics may be first-party or privacy-preserving if the owner chooses.

### Leading indicators

| KPI | Source | Segment | Cadence | Initial target |
| --- | --- | --- | --- | --- |
| Valid indexed pages | Google Search Console | Sitemap vs submitted | Weekly | Index important pages; keep noindex utilities/PDFs absent |
| PDF search appearances | Search Console + manual `site:` check | `/assets/library/` | Weekly initially | Zero |
| Non-branded impressions/clicks | Search Console | Query excludes Continental Communist/domain | Weekly/monthly | Positive 28-day trend after content publication |
| Rankings | Search Console or rank tracker | Priority clusters and target URL | Weekly | One URL per intent; no cannibalization |
| CTR | Search Console | Page/query pairs with 100+ impressions | Monthly | Improve low-CTR pages after position is stable |
| Crawl/index errors | Search Console/Bing | 404, redirect, canonical, blocked | Weekly | No unintended errors |
| Core Web Vitals | Search Console/CrUX | Mobile and desktop | Monthly | Good at 75th percentile for LCP, INP, CLS |
| Referring domains | Search Console/Bing or backlink tool | Earned editorial links | Monthly | Relevant new domains, not directory volume |

### Business outcomes

| KPI | Definition | Required event/data |
| --- | --- | --- |
| Organic newsletter conversion rate | Successful subscriptions / organic landing sessions | `newsletter_submit_success`, landing URL, source/medium |
| Pathway-start rate | Visitors who mark/start a first pathway step / organic pathway sessions | `pathway_start` with pathway slug |
| Learner-account conversion rate | Completed registrations / organic sessions that encountered a gate | `sign_up_success`, landing and gate page |
| Engaged study rate | Organic learners who complete at least one step or open a second reading | First-party event or Supabase aggregate without note content |
| Returning organic readers | Privacy-safe repeat cohort | First-party aggregate; no cross-site identifiers |

Implementation order: verify Search Console property, submit both sitemaps, connect Bing Webmaster Tools, define conversions, add campaign-safe first-party events, create a 28-day baseline, and annotate every release/content publication. Never put email addresses, note text, or full search queries containing personal data into analytics.

## 16. 30/60/90-day implementation roadmap

### Immediate fixes

| Task | Priority | Impact | Effort | Dependency | Owner | Success metric |
| --- | --- | --- | --- | --- | --- | --- |
| Deploy the implemented canonical/schema/noindex/draft/404 fixes | Critical | High | Low | Code review | Developer | Production validator passes; intended noindex pages absent from sitemap |
| Confirm zero indexed PDFs and submit removals if any appear | Critical | High | Low | Search Console access | SEO owner | Zero `/assets/library/` results |
| Choose private storage or header-capable delivery for PDFs | Critical | High | Medium | Hosting/account decision | Developer + owner | Architecture supports auth or `X-Robots-Tag` |
| Verify Search Console and submit sitemaps | High | High | Low | Site-owner access | SEO owner | Property verified; sitemap processed |
| Publish a real contact method | High | High | Low | Owner-provided address/form | Owner | Contact path works and appears on policies/About |

### First 30 days

| Task | Priority | Impact | Effort | Dependency | Owner | Success metric |
| --- | --- | --- | --- | --- | --- | --- |
| Migrate PDFs to private authenticated storage or add `X-Robots-Tag` delivery | Critical | High | High | Hosting decision; 2.2 GB upload | Developer | Representative PDF returns auth challenge or `X-Robots-Tag: noindex`; no public catalog URLs |
| Expand `/learn/`, pathways catalog, and fundamentals landing copy | High | High | Medium | Keyword map | Editor + SEO | Impressions for beginner/study queries; pathway-start rate |
| Publish editorial standards and corrections pages | High | High | Medium | Owner policy decisions | Editor | Pages live; linked from About/articles |
| Add named authors and substantive active bios | High | High | Medium | Contributor consent | Editor | Every new article has accountable author profile |
| Configure conversion events and baseline dashboard | High | High | Medium | Analytics choice | Developer + SEO | Newsletter, pathway, account conversions measurable |
| Run live redirect, status, robots, sitemap, and rich-result tests | High | Medium | Low | Deployment | Developer | No critical crawl or schema errors |

### Days 31–60

| Task | Priority | Impact | Effort | Dependency | Owner | Success metric |
| --- | --- | --- | --- | --- | --- | --- |
| Publish weeks 1–4 of the content calendar | High | High | High | Editorial capacity | Writer/editor | Four evidence-reviewed pieces; all internally linked |
| Expand five priority topic hubs | High | High | Medium | Supporting content | Editor | 400–800 unique words and 3+ useful resources each |
| Add study companions for Capital and Value, Price and Profit | High | High | High | Source review | Writer/editor | Search impressions and primary-text starts |
| Improve article heading structure and claim-level citations | High | Medium | Medium | Editorial review | Editor | Citation validator passes; better engagement/CTR |
| Begin relevant outreach to labor-history, political-economy, and education publications | Medium | Medium | Medium | Strong linkable assets | Editor/communications | Earned relevant referring domains |

### Days 61–90

| Task | Priority | Impact | Effort | Dependency | Owner | Success metric |
| --- | --- | --- | --- | --- | --- | --- |
| Publish weeks 5–12 of the content calendar | High | High | High | Editorial capacity | Writer/editor | Eight additional evidence-reviewed pieces |
| Refresh titles/descriptions only where Search Console shows impressions and weak CTR | Medium | Medium | Low | 28+ days query data | SEO | CTR improves without position loss |
| Consolidate any emerging cannibalization | High | Medium | Medium | Query/page data | SEO + developer | One preferred URL per intent |
| Launch Briefings/Multimedia/Community only if the real product threshold is met | Medium | Medium | High | Cadence, moderation, assets | Owner/editor | At least three substantive items before indexation |
| Review CWV field data and conversion paths | High | Medium | Medium | Sufficient traffic | Developer + SEO | Good field metrics; conversion trend documented |
| Produce one original data asset and outreach campaign | Medium | High | High | Data/source methodology | Research/editor | Citations and relevant earned links |

## Reference standards used

- [Google: site-name structured data](https://developers.google.com/search/docs/appearance/site-names)
- [Google: canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
- [Google: sitemap construction](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: registration/paywalled content markup](https://developers.google.com/search/docs/appearance/structured-data/paywalled-content)
- [Google: robots meta and X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google: Course structured data](https://developers.google.com/search/docs/appearance/structured-data/course)

