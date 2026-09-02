---
layout: hub
title: Library
permalink: /library/
section_key: library
kicker: Sources, Texts & Digital Archive
description: Explore the comprehensive political economy digital library, primary-source collected works, rights-reviewed readers, and the working bibliography.
---

## Digital library & primary source repository

Continental Communist hosts an open, on-site digital library of Marxist political economy, classical economic theory, and revolutionary history. Spanning the complete **Marx & Engels Collected Works (50 Volumes)**, the complete **V. I. Lenin Collected Works (45 Volumes)**, and over **60 core monographs and treatises**, every text is available for on-site reading, search, citation, and offline study.

<div class="cc-library-metrics-banner">
  <div class="cc-metric-card">
    <div class="cc-metric-num">170+</div>
    <div class="cc-metric-label">Total Works & Volumes</div>
  </div>
  <div class="cc-metric-card">
    <div class="cc-metric-num">50</div>
    <div class="cc-metric-label">MECW Volumes (1–50)</div>
  </div>
  <div class="cc-metric-card">
    <div class="cc-metric-num">45</div>
    <div class="cc-metric-label">Lenin Collected Works</div>
  </div>
  <div class="cc-metric-card">
    <div class="cc-metric-num">64</div>
    <div class="cc-metric-label">Treatises & Monographs</div>
  </div>
</div>

## Browse the political economy library {: #catalog}

Use real-time search, category filters, and sorting to explore primary texts, collected works, and modern treatises across value theory, crisis theory, imperialism, ecology, and social reproduction.

<div class="cc-library-catalog" data-library-catalog>
  <div class="cc-catalog-controls">
    <div class="cc-catalog-search-wrap">
      <label for="cc-catalog-search-input" class="visually-hidden">Search library catalog</label>
      <input
        type="search"
        id="cc-catalog-search-input"
        class="cc-catalog-search-input"
        placeholder="Search by title, author, topic, or year (e.g. Shaikh, Imperialism, 1867, Grundrisse)..."
        data-catalog-search
        autocomplete="off"
      />
    </div>

    <div class="cc-catalog-bar">
      <div class="cc-catalog-categories" data-catalog-categories role="tablist" aria-label="Filter by collection">
        <button type="button" class="cc-category-pill active" data-category="all" aria-pressed="true">All Works (163)</button>
        <button type="button" class="cc-category-pill" data-category="lenin" aria-pressed="false">Lenin CW (45)</button>
        <button type="button" class="cc-category-pill" data-category="mecw" aria-pressed="false">MECW (50)</button>
        <button type="button" class="cc-category-pill" data-category="value" aria-pressed="false">Value Theory & Capital</button>
        <button type="button" class="cc-category-pill" data-category="crisis" aria-pressed="false">Crisis & Accumulation</button>
        <button type="button" class="cc-category-pill" data-category="imperialism" aria-pressed="false">Imperialism & Global Economy</button>
        <button type="button" class="cc-category-pill" data-category="ecology" aria-pressed="false">Ecology & Social Reproduction</button>
        <button type="button" class="cc-category-pill" data-category="history" aria-pressed="false">History of Economic Thought</button>
        <button type="button" class="cc-category-pill" data-category="classical" aria-pressed="false">Classical Foundations</button>
      </div>

      <div class="cc-catalog-meta-tools">
        <div class="cc-catalog-count-badge" data-catalog-count aria-live="polite">Loading catalog...</div>

        <div class="cc-catalog-sort-wrap">
          <label for="cc-sort-select" class="visually-hidden">Sort catalog items</label>
          <select id="cc-sort-select" class="cc-catalog-select" data-catalog-sort>
            <option value="year-desc">Year (Newest first)</option>
            <option value="year-asc">Year (Oldest first)</option>
            <option value="title-asc">Title (A–Z)</option>
            <option value="title-desc">Title (Z–A)</option>
            <option value="author-asc">Author (A–Z)</option>
            <option value="size-desc">File Size (Largest)</option>
          </select>
        </div>

        <div class="cc-catalog-view-toggle-group" role="group" aria-label="View format">
          <button type="button" class="cc-view-toggle-btn active" data-catalog-view-toggle="grid" aria-pressed="true" title="Grid Card View">
            <span aria-hidden="true">⊞</span> Cards
          </button>
          <button type="button" class="cc-view-toggle-btn" data-catalog-view-toggle="table" aria-pressed="false" title="Compact Table View">
            <span aria-hidden="true">≡</span> Table
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="cc-catalog-grid" data-catalog-grid></div>

  <div class="cc-catalog-table-wrap" data-catalog-table hidden>
    <table class="cc-catalog-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Author(s)</th>
          <th>Year</th>
          <th>Category</th>
          <th>Size</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <div class="cc-catalog-empty" data-catalog-empty hidden>
    <p>No works found matching your search criteria. Try a different search term or category filter.</p>
  </div>
</div>

## Read HTML primary texts on site {: #primary-sources}

In addition to the PDF library, the primary-text reader hosts verified HTML editions sourced from the Marxists Internet Archive. Every chapter includes archive provenance, edition statements, and source fingerprints.

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

## Connect with learning pathways & bibliography {: #pathways}

The library is closely integrated with the [eight structured learning pathways]({{ '/learn/pathways/' | relative_url }}) and the [working bibliography]({{ '/reading-list/' | relative_url }}). You can pair any text with lecture guides, pathway glossaries, and structured review questions.

<script id="cc-library-catalog-data" type="application/json">
{{ site.data.economism_library | jsonify }}
</script>
<script src="{{ '/assets/library-catalog.js' | relative_url }}" defer></script>
