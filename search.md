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

    <h1>Search Continental Communist</h1>

    <p>
      Search essays, analysis, theory, history, political economy,
      and other writing published on the site.
    </p>
  </div>


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
      placeholder="Search articles..."
      aria-label="Search Continental Communist"
      autocomplete="off"
      spellcheck="false"
    >

    <button
      id="cc-search-clear"
      class="cc-search-clear"
      type="button"
      aria-label="Clear search"
      hidden
    >
      Clear
    </button>

  </div>


  <div class="cc-search-help">
    Start typing to search. Press <kbd>/</kbd> anywhere on this page to focus the search box.
  </div>


  <div
    id="cc-search-status"
    class="cc-search-status"
    aria-live="polite"
  ></div>


  <div
    id="cc-search-results"
    class="cc-search-results"
  ></div>

</div>

<script src="{{ '/assets/search.js' | relative_url }}" defer></script>
