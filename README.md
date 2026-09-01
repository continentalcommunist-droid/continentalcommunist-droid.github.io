# Continental Communist

The Jekyll source for [continentalcommunist.com](https://www.continentalcommunist.com/).

## Performance release gate

Every pull request and push to `main` builds the production site and measures six representative page types three times with mobile Lighthouse. The median result for every page must pass the Core Web Vitals-aligned thresholds and resource budgets before release. A separate weekly and per-change check evaluates Chrome UX Report field data when an API key is configured.

The dated PageSpeed/CrUX baseline, thresholds, local commands, CI behavior, and GitHub branch-protection handoff are documented in `docs/performance.md`. Run the same checks locally with:

```sh
npm ci
npm run build
npm run validate:formatting
npm run performance:ci
npm run performance:crux
```

The formatting validator checks every generated public HTML page for a single page-level heading, ordered heading levels, unique IDs, complete image metadata, obsolete embed attributes, and leaked template markup.

## Information architecture

The primary site hierarchy is defined once in `_data/navigation.yml` and is used by the header, homepage router, hub pages, footer, and search index.

The seven top-level destinations are:

- Learn
- Analysis
- Briefings
- Topics
- Library
- Multimedia
- Community

Each destination has a durable hub page in its matching directory. The shared `_layouts/hub.html` layout renders its child sections from the navigation data, so changes to names, descriptions, status labels, or routes remain consistent across the site.

Published content should use `section`, `section_key`, `content_type`, and `topics` front matter where applicable. These fields connect articles and pages to navigation state and archive search.

## Search visibility

Public pages emit one absolute canonical URL, explicit robots metadata, and page-specific JSON-LD. Articles use Article or NewsArticle, public author records use ProfilePage, and controlled topic hubs use CollectionPage. Publisher Organization and WebSite identities are stable across the site.

The general XML sitemap is published at `/sitemap.xml`; the two-day Google News sitemap is published at `/news-sitemap.xml`. Both are advertised in `/robots.txt`. Search Console verification uses the `google_site_verification` configuration hook and requires a Google-issued property token before it can be completed.

The publishing rules and Search Console handoff are documented in `docs/seo.md`. After building the site, validate the generated output with:

```sh
ruby scripts/validate_seo.rb
```

## Controlled taxonomy

The canonical topic hierarchy lives in `_topics/`, with its seven top-level families and fixed facet vocabularies documented in `_data/taxonomy.yml`. People and thinkers are canonical records in `_people/`; content links to their exact `name` values rather than creating new spellings in front matter.

Editors select one to five topics in Sveltia CMS. Ad hoc Jekyll `tags` and `categories` are not used. New terms must follow the naming, hierarchy, and review rules in `docs/taxonomy.md`.

Before publishing taxonomy changes, run:

```sh
ruby scripts/validate_taxonomy.rb
```

The validator rejects unknown terms, duplicate topics, broken parent relationships, hierarchy cycles, uncontrolled people references, and content with more than five topics.

## Citations and evidence

Reusable source metadata lives in _sources/ and publishes as public records under /library/sources/. Articles attach those records through ordered references with an evidence role, optional pinpoint locator, and a required note explaining what the source establishes.

The article template exposes numbered source cards, a transparent uncited state, readable citation copying, BibTeX and RIS downloads, and a downloadable bibliography. Inline citation numbers use _includes/cite.html, while assets/citations.js generates exports entirely in the visitor's browser.

Citation workflow and source-quality rules are documented in docs/citations.md. Validate records and article references before publication:

    ruby scripts/validate_citations.rb

## Learning pathways

The Reading List is organized into guided learning pathways under `/learn/pathways/`. Each pathway is a structured document in `_reading_paths/`; the catalog and individual pathway pages are rendered by `_layouts/pathway-catalog.html` and `_layouts/learning-path.html`.

Each pathway includes a level, estimated effort, prerequisites, an introduction, a summary, scoped readings, written lecture guides, discussion questions, and a contextual glossary. The catalog cards are shared through `_includes/pathway-cards.html` so the Learn and Reading List entry points remain consistent.

Completion state is managed by `assets/learning-progress.js` and stored locally in the visitor's browser. Progress does not require an account and is not transmitted to the site.

## Sveltia CMS content model

The editor at `/admin/` uses Sveltia CMS with GitHub's simple workflow. Entry edits and media uploads commit directly to `main`, avoiding the extra pull-request and issue-label permissions that caused saves to end with GitHub's “Resource not accessible by personal access token” response after the content commit had already been created.

Access-token sign-in is the only enabled authentication method. Generate the token from Sveltia's sign-in screen, select `continentalcommunist-droid/continentalcommunist-droid.github.io`, and grant **Contents: Read and write**. If the stored token is replaced or its access changes, sign out of the editor and sign back in so Sveltia stores the new token. Do not restore `publish_mode: editorial_workflow` without also granting the editor **Pull requests: Read and write** and **Issues: Read and write**; editorial saves use both APIs in addition to repository contents.

`admin/config.yml` defines Article, Brief, Course, Lesson, Reading Path, Book/Text, Source, Person, Concept, Topic, Event, and Podcast as distinct product objects. Relation fields connect those objects through controlled topics, reusable source records, authors, concepts, texts, courses, lessons, and pathways. Redirects are managed as a separate operational collection.

Articles and briefings include standardized publication and update metadata, reading level and time, regions and historical periods, source references, correction history, assignment-brief prompts, editorial stage, and AI-assistance disclosure. Existing pathway content and topic labels were migrated into CMS-managed collections so the editor is the source of truth rather than a parallel interface.
