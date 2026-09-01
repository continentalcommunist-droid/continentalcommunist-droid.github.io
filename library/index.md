---
layout: hub
title: Library
permalink: /library/
section_key: library
kicker: Sources and discovery
description: Find the working bibliography, foundational texts, research guides, and the searchable publication archive.
---

## Build outward from the strongest existing resource

The Reading List is the foundation of the Library. It brings Marxist primary texts into conversation with American labor history, political thought, economic development, technology, institutions, and competing traditions. Eight structured [learning pathways]({{ '/learn/pathways/' | relative_url }}) now turn that bibliography into guided study.

The Library now separates sources into reusable records with authorship, publication details, provenance, identifiers, and stable citation keys. Articles can connect those records to specific claims and expose their evidence notes, source cards, and citation exports without reconstructing footnotes by hand.

## Read foundational texts on site {:#primary-sources}

The primary-text reader hosts rights-reviewed editions directly on Continental Communist. Every section includes the exact archive source, edition statement, reuse terms, and a source fingerprint so readers can verify provenance.

<div class="cc-person-connection-grid">
{% assign library_texts = site.books | sort: "publication_year" %}
{% for text in library_texts %}
  <article>
    <div>{{ text.publication_year }} · {{ text.reading_level }}</div>
    <h3><a href="{{ text.url | relative_url }}">{{ text.title }}</a></h3>
    <p>{{ text.description }}</p>
  </article>
{% endfor %}
</div>
