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
