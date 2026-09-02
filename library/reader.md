---
layout: default
title: "Digital Library Reader"
permalink: /library/reader/
section_key: library
description: "Read complete primary works and political economy treatises on site with search, chapter navigation, and study tools."
---

<article class="cc-pdf-reader-page" data-pdf-reader>
  <nav class="cc-breadcrumbs" aria-label="Breadcrumb">
    <a href="{{ '/' | relative_url }}">Home</a>
    <span aria-hidden="true">/</span>
    <a href="{{ '/library/' | relative_url }}">Library</a>
    <span aria-hidden="true">/</span>
    <span aria-current="page" data-reader-breadcrumb-title>Reader</span>
  </nav>

  <header class="cc-reader-header">
    <div class="cc-hub-kicker" data-reader-category>Political Economy Digital Library</div>
    <h1 data-reader-title>Loading Library Reader...</h1>
    <p class="cc-book-byline" data-reader-author></p>
    <p data-reader-desc></p>
  </header>

  {% include learner-tools.html %}

  <div class="cc-reader-toolbar">
    <div class="cc-reader-toolbar-group">
      <label for="cc-volume-jump" class="cc-reader-label">Switch Volume / Text:</label>
      <select id="cc-volume-jump" class="cc-reader-select" data-reader-volume-select aria-label="Switch volume or text"></select>
    </div>

    <div class="cc-reader-toolbar-actions">
      <button type="button" class="cc-reader-btn" data-reader-fullscreen title="Toggle fullscreen reading">
        <span aria-hidden="true">⛶</span> Fullscreen
      </button>
      <button type="button" class="cc-reader-btn" data-reader-copy-cite title="Copy citation format">
        <span aria-hidden="true">📋</span> Copy Citation
      </button>
      <a href="#" target="_blank" rel="noopener noreferrer" class="cc-reader-btn cc-reader-btn-primary" data-reader-open-tab title="Open PDF in a dedicated browser tab">
        <span aria-hidden="true">↗</span> Open in New Tab
      </a>
      <a href="#" download class="cc-reader-btn" data-reader-download-link title="Download PDF to your device">
        <span aria-hidden="true">↓</span> Download
      </a>
    </div>
  </div>

  <p class="cc-reader-cite-status" data-reader-cite-status aria-live="polite" hidden></p>

  <div class="cc-pdf-frame-wrapper">
    <iframe class="cc-pdf-frame" data-reader-frame title="Document Viewer" src="about:blank">
      <p>Your browser does not support embedded frames. <a href="#" data-reader-fallback-link>Download the PDF directly</a>.</p>
    </iframe>
  </div>

  <div class="cc-reader-details-grid">
    <section aria-labelledby="reader-about-heading">
      <div class="cc-section-kicker">Bibliographic Record</div>
      <h2 id="reader-about-heading">About this Work</h2>
      <dl class="cc-source-record-metadata" data-reader-meta></dl>
    </section>

    <aside class="cc-book-rights" aria-labelledby="reader-study-heading">
      <div class="cc-section-kicker">Study & Pathways</div>
      <h2 id="reader-study-heading">Integrate into Your Study</h2>
      <p>This edition is integrated into the Continental Communist on-site library. Use bookmarks and study notes to track your progress across reading lists.</p>
      <p><a href="{{ '/learn/pathways/' | relative_url }}">Browse Structured Learning Pathways →</a></p>
      <p><a href="{{ '/reading-list/' | relative_url }}">Explore the Complete Working Bibliography →</a></p>
      <small>All primary sources, collected works, and monographs are preserved in standard PDF format for online and offline reading.</small>
    </aside>
  </div>
</article>

<script id="cc-library-catalog-data" type="application/json">
{{ site.data.economism_library | jsonify }}
</script>
<script src="{{ '/assets/pdf-reader.js' | relative_url }}" defer></script>
{% include learner-tools-assets.html %}
