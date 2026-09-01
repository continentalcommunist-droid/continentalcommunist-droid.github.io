# Search visibility and structured metadata

The site owns its search metadata in `_includes/seo-meta.html` and `_includes/structured-data.html`. Do not add a second SEO plugin or a second canonical tag. Every public page receives one self-referencing absolute canonical, explicit robots metadata, social preview metadata, Organization and WebSite entities, and a page-specific structured data entity.

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

Do not invent or commit a verification token that Google has not issued for this property. If the token must remain private for operational reasons, inject it during the build instead of committing it to a public repository.

## Pre-publication check

Build the site, then run:

```sh
ruby scripts/validate_seo.rb
```

The validator checks canonical URLs, crawl directives, JSON-LD syntax and entity types, author and topic resolution, sitemap integrity, news eligibility, CMS fields, and the Search Console verification hook.
