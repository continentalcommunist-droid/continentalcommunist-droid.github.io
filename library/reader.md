---
layout: default
title: "Digital Library Reader"
permalink: /library/reader/
section_key: library
description: "Read complete primary works and political economy treatises on site with search, chapter navigation, and study tools."
updated: 2026-09-02
robots: noindex, follow
sitemap: false
search_exclude: true
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
      <a href="#" target="_blank" rel="nofollow noopener noreferrer" class="cc-reader-btn cc-reader-btn-primary" data-reader-open-tab title="Open PDF in a dedicated browser tab">
        <span aria-hidden="true">↗</span> Open in New Tab
      </a>
      <a href="#" download rel="nofollow" class="cc-reader-btn" data-reader-download-link title="Download PDF to your device">
        <span aria-hidden="true">↓</span> Download
      </a>
    </div>
  </div>

  <p class="cc-reader-cite-status" data-reader-cite-status aria-live="polite" hidden></p>

  <div class="cc-pdf-frame-wrapper">
    <div class="cc-reader-auth-gate" data-reader-auth-gate>
      <div class="cc-reading-gate-card">
        <div class="cc-section-kicker">Digital Library Access</div>
        <h2 class="cc-reading-gate-title">Sign in to read this text</h2>
        <p class="cc-reading-gate-desc">
          On-site reading and document downloads for the Political Economy Digital Library, MECW, and Lenin Collected Works require a free learner account.
          Learning pathways and lecture guides remain 100% free without an account.
        </p>

        <div class="cc-reading-gate-actions">
          <button
            class="cc-auth-oauth-button cc-reading-gate-google"
            type="button"
            data-reader-google-auth
            aria-label="Sign in with Google to access the library reader"
          >
            <svg class="cc-auth-oauth-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          <div class="cc-auth-divider" role="separator" aria-label="or">
            <span>or</span>
          </div>

          <a
            class="cc-reading-gate-email-link"
            href="{{ '/account/' | relative_url }}?return_to={{ page.url | relative_url | url_encode }}"
            data-reader-auth-email-link
          >
            Sign in or register with email →
          </a>
        </div>

        <div class="cc-reading-gate-footer">
          <a href="{{ '/learn/pathways/' | relative_url }}">Explore free learning pathways instead →</a>
        </div>
      </div>
    </div>

    <iframe class="cc-pdf-frame" data-reader-frame title="Document Viewer" src="about:blank" hidden>
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
[
  {%- for book in site.data.economism_library -%}
  {%- assign file_path_parts = book.file_url | split: '/' -%}
  {
    "id": {{ book.id | jsonify }},
    "title": {{ book.title | jsonify }},
    "authors": {{ book.authors | jsonify }},
    "year": {{ book.year | jsonify }},
    "publisher": {{ book.publisher | jsonify }},
    "collection": {{ book.collection | jsonify }},
    "category": {{ book.category | jsonify }},
    "reading_level": {{ book.reading_level | jsonify }},
    "description": {{ book.description | jsonify }},
    "size_bytes": {{ book.size_bytes | jsonify }},
    "size_mb": {{ book.size_mb | jsonify }},
    "format": {{ book.format | jsonify }},
    "file_path_parts": {{ file_path_parts | jsonify }}
  }{% unless forloop.last %},{% endunless %}
  {%- endfor -%}
]
</script>
<script type="module" src="{{ '/assets/pdf-reader.js' | relative_url }}"></script>
{% include learner-tools-assets.html %}
