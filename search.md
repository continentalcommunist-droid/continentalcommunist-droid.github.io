---
layout: page
title: Search
permalink: /search/
search_exclude: true
---

<div class="cc-search">

  <div class="cc-search-intro">
    <div class="cc-search-kicker">
      ARCHIVE SEARCH
    </div>

    <p>
      Search the full archive or combine filters for content type, topic,
      author, thinker, place, period, difficulty, format, and language.
    </p>
  </div>

  <form id="cc-search-form" role="search">
    <label class="cc-visually-hidden" for="cc-search-input">
      Search the Continental Communist archive
    </label>

    <div class="cc-search-box">
      <svg
        class="cc-search-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          d="M10.5 4a6.5 6.5 0 1 0 0 13
             6.5 6.5 0 0 0 0-13Zm-8.5 6.5
             a8.5 8.5 0 1 1 15.2 5.2
             l4.55 4.55-1.5 1.5-4.55-4.55
             A8.5 8.5 0 0 1 2 10.5Z"
        />
      </svg>

      <input
        id="cc-search-input"
        class="cc-search-input"
        type="search"
        placeholder="Search titles, summaries, topics, and full text..."
        autocomplete="off"
        spellcheck="false"
      >

      <button
        id="cc-search-clear"
        class="cc-search-clear"
        type="button"
        aria-label="Clear search text"
        hidden
      >
        Clear
      </button>
    </div>
  </form>

  <p class="cc-search-help">
    Browse the whole archive or narrow it with one or more filters. Press
    <kbd>/</kbd> anywhere on this page to focus the search box.
  </p>

  <div class="cc-search-layout">
    <aside class="cc-search-facets" aria-labelledby="cc-search-facets-title">
      <div class="cc-search-facets-heading">
        <h2 id="cc-search-facets-title">Filter the archive</h2>
        <button
          id="cc-search-clear-filters"
          class="cc-search-clear-filters"
          type="button"
          disabled
        >
          Clear filters
        </button>
      </div>

      <div id="cc-search-facet-list" class="cc-search-facet-list"></div>
    </aside>

    <section class="cc-search-results-column" aria-labelledby="cc-search-status">
      <div
        id="cc-search-status"
        class="cc-search-status"
        role="status"
        aria-live="polite"
      >
        Loading the archive…
      </div>

      <div
        id="cc-search-active-filters"
        class="cc-search-active-filters"
        hidden
      ></div>

      <div id="cc-search-results" class="cc-search-results"></div>
    </section>
  </div>

  <noscript>
    <p class="cc-search-noscript">
      Enable JavaScript to search and filter the archive.
    </p>
  </noscript>

</div>

<script src="{{ '/assets/search.js' | relative_url }}" defer></script>
