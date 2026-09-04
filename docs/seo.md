# Search visibility and structured metadata

The site owns its search metadata in `_includes/seo-meta.html` and `_includes/structured-data.html`. Do not add a second SEO plugin or a second canonical tag. Every public page receives one self-referencing absolute canonical, explicit robots metadata, social preview metadata, an Organization entity, and a page-specific structured data entity. The site-name `WebSite` entity appears only on the homepage.

## Branded-search strategy

The primary near-term search objective is for the official homepage to appear for the exact query `continental communist`. The baseline on 2026-09-01 found no result from this domain for either the exact-name query or a `site:continentalcommunist.com` query. The domain and repository were only established days earlier, so discovery and indexing—not keyword repetition—is the first constraint.

The implementation establishes one consistent entity and preferred site name:

- The homepage uses `Continental Communist` in its visible `h1`, HTML title, Open Graph title, page description, internal link text, Organization JSON-LD, and WebSite JSON-LD.
- `continentalcommunist.com` is supplied as the WebSite `alternateName`, giving Google a domain fallback while keeping the publication name primary.
- The homepage, About page, editorial profile, articles, topics, and learning pathways cross-link with descriptive HTML anchors that crawlers can follow.
- HTTP and apex-domain variants redirect permanently to the canonical `https://www.continentalcommunist.com/` origin.
- Accurate `updated` dates place meaningful `lastmod` values on the homepage and About page without falsely changing every URL on every build.

Google does not guarantee indexing or a particular ranking. Judge this work through Search Console over weeks, not repeated public searches over hours.

### Launch sequence

1. Verify the canonical URL-prefix property in Search Console using the handoff below.
2. Submit `/sitemap.xml`, then inspect and request indexing for the homepage, `/about/`, one published article, `/people/continental-communist/`, and one populated topic hub.
3. Add `https://www.continentalcommunist.com/` as the website on the official GitHub repository and on any genuine publication-owned social or newsletter profile. These should be identity links for readers, not manufactured backlinks.
4. Publish useful original material on a consistent schedule. Link each article to its author, controlled topics, relevant pathways, and cited sources; link back from the corresponding hubs.
5. Review Search Console weekly for indexed pages, crawl errors, sitemap processing, exact-query impressions, average position, and click-through rate. Record a monthly baseline before changing titles again.

Avoid paid links, bulk directory submissions, doorway pages, duplicate brand pages, and repetitions of the target phrase written only for crawlers. They do not solve the new-domain discovery problem and can undermine trust.

## Content types and structured data schemas

- Published articles use `schema_type: Article` and emit Open Graph article properties (`article:published_time`, `article:author`, `article:section`, `article:tag`).
- Timely reported news uses `schema_type: NewsArticle` and `content_type: News`.
- Briefings are always `NewsArticle`.
- Learning pathways publish schema.org `LearningResource` entities detailing educational level, learning outcomes (`teaches`), and their guided-reading format. They are not marked as `Course` because they are self-guided pathways without an instructor-led roster.
- Primary texts publish as `Book` and `Chapter` entities with author provenance and table-of-contents parts.
- Normalized bibliographic sources publish as `CreativeWork`, `Book`, or `ScholarlyArticle` with persistent identifiers (DOI/ISBN).
- Author and thinker records publish as `ProfilePage` documents whose `mainEntity` is a Person or Organization.
- Topic records publish as `CollectionPage` hubs with a defined subject and a list of connected resources.
- All non-root indexable pages emit schema.org `BreadcrumbList` JSON-LD to generate search engine breadcrumbs in SERP listings.
- `WebSite` schema appears only on the homepage, as required for Google's site-name signal. Page templates reference the same publisher entity without emitting duplicate site-name nodes.
- Registration-gated articles and text chapters declare `isAccessibleForFree: false` and identify `.cc-gated-body` as the restricted section so search engines do not mistake the client-side gate for cloaking.

Every article author must resolve to a public `_people/` record. Featured images are optional, but an image requires `image_alt`. Never use the publisher logo as an article image merely to satisfy a metadata field.

## Sitemap policy

`/sitemap.xml` lists canonical, indexable HTML pages and all public content records with accurate `lastmod` timestamps on all hub pages. It intentionally excludes the internal search interface, redirects, administration pages, and non-HTML utilities.

`/news-sitemap.xml` lists only NewsArticle content published during the preceding two days. Older news remains in the general sitemap. An empty news sitemap is valid when no qualifying news has been published recently.

`/robots.txt` permits public HTML crawling, keeps the CMS interface and `/assets/library/` document files out of the crawl queue, and advertises both sitemap URLs. Page-level `noindex` remains the authority for HTML utilities such as internal search and the parameter-driven PDF reader; robots.txt is not used as a canonicalization tool.

The indexable library catalog links to the noindex reader rather than directly to PDF files. The public Google index had no results for `site:continentalcommunist.com filetype:pdf` on 2026-09-04. Because GitHub Pages cannot add `X-Robots-Tag: noindex` response headers to PDFs, a strict long-term guarantee requires moving the documents behind authenticated private storage or a CDN/origin that can add that header. Until then, keep direct document URLs out of HTML, sitemaps, feeds, and external promotion; retain the robots exclusion; and use Search Console's Removals tool immediately if a document URL ever appears.

## Search Console handoff

Google's issued HTML-file ownership proof is installed for the canonical URL-prefix property:

- File: `googled448df15e8eebf72.html`
- Public URL: `https://www.continentalcommunist.com/googled448df15e8eebf72.html`
- Required response: `google-site-verification: googled448df15e8eebf72.html`

To finish the connection:

1. Deploy the verification file and confirm its public URL returns HTTP 200 with the required response above.
2. Click **Verify** for the URL-prefix property `https://www.continentalcommunist.com/` in Google Search Console. A Domain property may also be added separately through DNS.
3. Keep the verification file in the site root after verification; Google may check it again later.
4. Submit `https://www.continentalcommunist.com/sitemap.xml` and `https://www.continentalcommunist.com/news-sitemap.xml` in the Sitemaps report.
5. Inspect the homepage, a published article, author profile, and topic hub with URL Inspection, then request indexing where appropriate. Test article pages with Google's Rich Results Test.
6. Monitor Page indexing, Sitemaps, and Article enhancement reports after each substantial release.

The final Search Console verification click and URL Inspection requests are owner-only actions. Repository code can publish and validate the Google-issued proof, but it cannot complete those account actions without access to the property.

Do not rename, remove, redirect, or add page markup to the verification file. It is a public ownership token by design, not a secret credential.

## Pre-publication check

Build the site, then run:

```sh
ruby scripts/validate_seo.rb
```

The validator checks canonical URLs, crawl directives, JSON-LD syntax and entity types, author and topic resolution, sitemap integrity, news eligibility, CMS fields, and both the source and generated Search Console verification file.
