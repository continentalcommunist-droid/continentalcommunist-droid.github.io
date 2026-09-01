# Search visibility and structured metadata

The site owns its search metadata in `_includes/seo-meta.html` and `_includes/structured-data.html`. Do not add a second SEO plugin or a second canonical tag. Every public page receives one self-referencing absolute canonical, explicit robots metadata, social preview metadata, Organization and WebSite entities, and a page-specific structured data entity.

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

## Content types

- Published articles use `schema_type: Article`.
- Timely reported news uses `schema_type: NewsArticle` and `content_type: News`.
- Briefings are always `NewsArticle`.
- Author and thinker records publish as `ProfilePage` documents whose `mainEntity` is a Person or Organization.
- Topic records publish as `CollectionPage` hubs with a defined subject and a list of connected resources.

Every article author must resolve to a public `_people/` record. Featured images are optional, but an image requires `image_alt`. Never use the publisher logo as an article image merely to satisfy a metadata field.

## Sitemap policy

`/sitemap.xml` lists canonical, indexable HTML pages and all public content records. It intentionally excludes the internal search interface, redirects, administration pages, and non-HTML utilities.

`/news-sitemap.xml` lists only NewsArticle content published during the preceding two days. Older news remains in the general sitemap. An empty news sitemap is valid when no qualifying news has been published recently.

`/robots.txt` permits public crawling, keeps the CMS interface out of the crawl queue, and advertises both sitemap URLs. Page-level `noindex` remains the authority for pages such as internal search; robots.txt is not used as a canonicalization tool.

## Search Console handoff

Search Console ownership cannot be completed from repository code because Google issues the verification token to the site owner. To finish the connection:

1. Add the URL-prefix property `https://www.continentalcommunist.com/` in Google Search Console. A Domain property may also be added separately through DNS.
2. Choose the HTML tag verification method and copy only the value inside the tag's `content` attribute.
3. Paste that value into `google_site_verification` in `_config.yml`, then deploy the site.
4. Confirm the verification tag appears on the public homepage and complete verification in Search Console.
5. Submit `https://www.continentalcommunist.com/sitemap.xml` and `https://www.continentalcommunist.com/news-sitemap.xml` in the Sitemaps report.
6. Inspect a published article, author profile, and topic hub with URL Inspection. Test article pages with Google's Rich Results Test.
7. Monitor Page indexing, Sitemaps, and Article enhancement reports after each substantial release.

Search Console verification and the first URL Inspection requests are owner-only actions. Repository code can expose a verification tag, but it cannot obtain the Google-issued value or request indexing without access to the verified property.

Do not invent or commit a verification token that Google has not issued for this property. If the token must remain private for operational reasons, inject it during the build instead of committing it to a public repository.

## Pre-publication check

Build the site, then run:

```sh
ruby scripts/validate_seo.rb
```

The validator checks canonical URLs, crawl directives, JSON-LD syntax and entity types, author and topic resolution, sitemap integrity, news eligibility, CMS fields, and the Search Console verification hook.
