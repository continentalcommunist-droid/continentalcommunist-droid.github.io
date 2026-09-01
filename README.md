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

## Learning pathways

The Reading List is organized into guided learning pathways under `/learn/pathways/`. Pathway content is defined in `_data/learning_paths.yml`; the catalog and individual pathway pages are rendered by `_layouts/pathway-catalog.html` and `_layouts/learning-path.html`.

Each pathway includes a level, estimated effort, prerequisites, an introduction, a summary, scoped readings, written lecture guides, discussion questions, and a contextual glossary. The catalog cards are shared through `_includes/pathway-cards.html` so the Learn and Reading List entry points remain consistent.

Completion state is managed by `assets/learning-progress.js` and stored locally in the visitor's browser. Progress does not require an account and is not transmitted to the site.
