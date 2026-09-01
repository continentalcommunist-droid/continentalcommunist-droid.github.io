# Continental Communist

The Jekyll source for [continentalcommunist.com](https://www.continentalcommunist.com/).

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

## Controlled taxonomy

The canonical topic hierarchy lives in `_topics/`, with its seven top-level families and fixed facet vocabularies documented in `_data/taxonomy.yml`. People and thinkers are canonical records in `_people/`; content links to their exact `name` values rather than creating new spellings in front matter.

Editors select one to five topics in Sveltia CMS. Ad hoc Jekyll `tags` and `categories` are not used. New terms must follow the naming, hierarchy, and review rules in `docs/taxonomy.md`.

Before publishing taxonomy changes, run:

```sh
ruby scripts/validate_taxonomy.rb
```

The validator rejects unknown terms, duplicate topics, broken parent relationships, hierarchy cycles, uncontrolled people references, and content with more than five topics.

## Learning pathways

The Reading List is organized into guided learning pathways under `/learn/pathways/`. Each pathway is a structured document in `_reading_paths/`; the catalog and individual pathway pages are rendered by `_layouts/pathway-catalog.html` and `_layouts/learning-path.html`.

Each pathway includes a level, estimated effort, prerequisites, an introduction, a summary, scoped readings, written lecture guides, discussion questions, and a contextual glossary. The catalog cards are shared through `_includes/pathway-cards.html` so the Learn and Reading List entry points remain consistent.

Completion state is managed by `assets/learning-progress.js` and stored locally in the visitor's browser. Progress does not require an account and is not transmitted to the site.

## Sveltia CMS content model

The editor at `/admin/` uses Sveltia CMS with GitHub's editorial workflow. CMS saves are isolated on review branches and pull requests until an editor publishes them.

`admin/config.yml` defines Article, Brief, Course, Lesson, Reading Path, Book/Text, Source, Person, Concept, Topic, Event, and Podcast as distinct product objects. Relation fields connect those objects through controlled topics, reusable source records, authors, concepts, texts, courses, lessons, and pathways. Redirects are managed as a separate operational collection.

Articles and briefings include standardized publication and update metadata, reading level and time, regions and historical periods, source references, correction history, assignment-brief prompts, editorial stage, and AI-assistance disclosure. Existing pathway content and topic labels were migrated into CMS-managed collections so the editor is the source of truth rather than a parallel interface.
