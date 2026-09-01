---
---

(function () {
  "use strict";

  const input = document.getElementById("cc-search-input");
  const form = document.getElementById("cc-search-form");
  const resultsContainer = document.getElementById("cc-search-results");
  const status = document.getElementById("cc-search-status");
  const clearButton = document.getElementById("cc-search-clear");
  const facetContainer = document.getElementById("cc-search-facet-list");
  const activeFilters = document.getElementById("cc-search-active-filters");
  const clearFiltersButton = document.getElementById("cc-search-clear-filters");

  if (
    !input ||
    !resultsContainer ||
    !status ||
    !facetContainer ||
    !activeFilters
  ) {
    return;
  }

  const INDEX_URL = "{{ '/search.json' | relative_url }}";

  const FACETS = [
    { key: "content_type", label: "Content type" },
    { key: "topic", label: "Topic" },
    { key: "author", label: "Author" },
    { key: "thinker", label: "Thinker" },
    { key: "geographic_region", label: "Geographic region" },
    { key: "historical_period", label: "Historical period" },
    { key: "difficulty", label: "Difficulty" },
    { key: "format", label: "Format" },
    { key: "language", label: "Language" }
  ];

  const selectedFacets = {};
  const facetOptions = {};

  let searchIndex = [];
  let indexLoaded = false;

  FACETS.forEach(function (facet) {
    selectedFacets[facet.key] = new Set();
    facetOptions[facet.key] = [];
  });


  /* =======================================================
     Helpers
     ======================================================= */

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }


  function tokenize(query) {
    return normalize(query)
      .split(/\s+/)
      .filter(function (term) {
        return term.length > 0;
      });
  }


  function normalizeFacetValues(value) {
    const values = Array.isArray(value) ? value : [value];
    const seen = new Set();

    return values
      .map(function (entry) {
        return String(entry || "").replace(/\s+/g, " ").trim();
      })
      .filter(function (entry) {
        const key = normalize(entry);

        if (!key || seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }


  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }


  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (typeof text === "string") {
      element.textContent = text;
    }

    return element;
  }


  function activeFacetCount() {
    return FACETS.reduce(function (total, facet) {
      return total + selectedFacets[facet.key].size;
    }, 0);
  }


  function selectedNormalizedValues(facetKey) {
    return Array.from(selectedFacets[facetKey]).map(normalize);
  }


  /* =======================================================
     Index normalization and scoring
     ======================================================= */

  function prepareIndex(data) {
    searchIndex = data.map(function (item) {
      const prepared = Object.assign({}, item);

      prepared.facets = {};
      prepared.normalizedFacets = {};

      FACETS.forEach(function (facet) {
        const values = normalizeFacetValues(item[facet.key]);

        prepared.facets[facet.key] = values;
        prepared.normalizedFacets[facet.key] = values.map(normalize);
      });

      prepared.searchableFacets = normalize(
        FACETS.map(function (facet) {
          return prepared.facets[facet.key].join(" ");
        }).join(" ")
      );

      return prepared;
    });

    buildFacetOptions();
    canonicalizeSelections();
  }


  function buildFacetOptions() {
    FACETS.forEach(function (facet) {
      const valuesByKey = new Map();

      searchIndex.forEach(function (item) {
        item.facets[facet.key].forEach(function (value) {
          const normalizedValue = normalize(value);

          if (!valuesByKey.has(normalizedValue)) {
            valuesByKey.set(normalizedValue, value);
          }
        });
      });

      facetOptions[facet.key] = Array.from(valuesByKey.values()).sort(
        function (a, b) {
          return a.localeCompare(b, undefined, { sensitivity: "base" });
        }
      );
    });
  }


  function canonicalizeSelections() {
    FACETS.forEach(function (facet) {
      const canonicalValues = new Map();

      facetOptions[facet.key].forEach(function (value) {
        canonicalValues.set(normalize(value), value);
      });

      const normalizedSelection = new Set();

      selectedFacets[facet.key].forEach(function (value) {
        const canonical = canonicalValues.get(normalize(value));

        if (canonical) {
          normalizedSelection.add(canonical);
        }
      });

      selectedFacets[facet.key] = normalizedSelection;
    });
  }


  function scoreItem(item, terms, fullQuery) {
    if (terms.length === 0) {
      return 1;
    }

    const title = normalize(item.title);
    const categories = normalize(item.categories);
    const excerpt = normalize(item.excerpt);
    const content = normalize(item.content);
    const combined = [
      title,
      categories,
      excerpt,
      content,
      item.searchableFacets
    ].join(" ");

    const allTermsPresent = terms.every(function (term) {
      return combined.includes(term);
    });

    if (!allTermsPresent) {
      return 0;
    }

    let score = 0;

    if (title === fullQuery) {
      score += 100;
    }

    if (title.startsWith(fullQuery)) {
      score += 50;
    }

    if (title.includes(fullQuery)) {
      score += 35;
    }

    terms.forEach(function (term) {
      if (title === term) {
        score += 40;
      } else if (title.startsWith(term)) {
        score += 25;
      } else if (title.includes(term)) {
        score += 18;
      }

      if (categories.includes(term) || item.searchableFacets.includes(term)) {
        score += 8;
      }

      if (excerpt.includes(term)) {
        score += 5;
      }

      if (content.includes(term)) {
        score += 2;
      }
    });

    if (item.format === "Article") {
      score += 1;
    }

    return score;
  }


  function itemPassesFacets(item, omittedFacetKey) {
    return FACETS.every(function (facet) {
      if (facet.key === omittedFacetKey) {
        return true;
      }

      const selected = selectedNormalizedValues(facet.key);

      if (selected.length === 0) {
        return true;
      }

      return selected.some(function (value) {
        return item.normalizedFacets[facet.key].includes(value);
      });
    });
  }


  /* =======================================================
     Facet controls
     ======================================================= */

  function buildFacetControls() {
    clearElement(facetContainer);

    FACETS.forEach(function (facet, facetIndex) {
      const details = createElement("details", "cc-search-facet-panel");
      details.dataset.facet = facet.key;
      details.open =
        (window.matchMedia("(min-width: 851px)").matches && facetIndex < 2) ||
        selectedFacets[facet.key].size > 0;

      const summary = document.createElement("summary");

      const label = createElement(
        "span",
        "cc-search-facet-label",
        facet.label
      );

      const selectedCount = createElement(
        "span",
        "cc-search-facet-selected"
      );
      selectedCount.dataset.facetSelected = facet.key;

      summary.appendChild(label);
      summary.appendChild(selectedCount);
      details.appendChild(summary);

      const fieldset = createElement("fieldset", "cc-search-facet-options");

      const legend = createElement(
        "legend",
        "cc-visually-hidden",
        "Filter by " + facet.label.toLowerCase()
      );
      fieldset.appendChild(legend);

      if (facetOptions[facet.key].length === 0) {
        fieldset.appendChild(
          createElement("p", "cc-search-facet-unavailable", "No values yet")
        );
      }

      facetOptions[facet.key].forEach(function (value, valueIndex) {
        const option = createElement("label", "cc-search-facet-option");
        const checkbox = document.createElement("input");
        const checkboxId =
          "cc-facet-" + facet.key + "-" + String(valueIndex + 1);

        checkbox.type = "checkbox";
        checkbox.id = checkboxId;
        checkbox.value = value;
        checkbox.dataset.facet = facet.key;
        checkbox.checked = selectedFacets[facet.key].has(value);

        const optionText = createElement(
          "span",
          "cc-search-facet-option-label",
          value
        );

        const count = createElement("span", "cc-search-facet-count", "0");
        count.dataset.facetCount = facet.key;
        count.dataset.facetValue = value;
        count.setAttribute("aria-hidden", "true");

        option.appendChild(checkbox);
        option.appendChild(optionText);
        option.appendChild(count);
        fieldset.appendChild(option);
      });

      details.appendChild(fieldset);
      facetContainer.appendChild(details);
    });
  }


  function updateFacetControls(queryMatches) {
    FACETS.forEach(function (facet) {
      const availableMatches = queryMatches.filter(function (result) {
        return itemPassesFacets(result.item, facet.key);
      });

      const counts = new Map();

      availableMatches.forEach(function (result) {
        result.item.facets[facet.key].forEach(function (value) {
          const key = normalize(value);
          counts.set(key, (counts.get(key) || 0) + 1);
        });
      });

      const checkboxes = facetContainer.querySelectorAll(
        'input[data-facet="' + facet.key + '"]'
      );

      checkboxes.forEach(function (checkbox) {
        const count = counts.get(normalize(checkbox.value)) || 0;
        const isSelected = selectedFacets[facet.key].has(checkbox.value);
        const option = checkbox.closest(".cc-search-facet-option");
        const countElement = option.querySelector(".cc-search-facet-count");

        checkbox.checked = isSelected;
        checkbox.disabled = count === 0 && !isSelected;
        option.classList.toggle("is-unavailable", count === 0 && !isSelected);
        countElement.textContent = String(count);
        checkbox.setAttribute(
          "aria-label",
          checkbox.value + " (" + count + " matching items)"
        );
      });

      const selectedCount = facetContainer.querySelector(
        '[data-facet-selected="' + facet.key + '"]'
      );

      if (selectedCount) {
        const count = selectedFacets[facet.key].size;
        selectedCount.textContent = count > 0 ? String(count) : "";
        selectedCount.setAttribute(
          "aria-label",
          count > 0 ? count + " selected" : "No filters selected"
        );
      }
    });

    if (clearFiltersButton) {
      clearFiltersButton.disabled = activeFacetCount() === 0;
    }
  }


  function renderActiveFilters() {
    clearElement(activeFilters);

    const selectedCount = activeFacetCount();
    activeFilters.hidden = selectedCount === 0;

    if (selectedCount === 0) {
      return;
    }

    const label = createElement(
      "span",
      "cc-search-active-label",
      "Active filters"
    );
    activeFilters.appendChild(label);

    FACETS.forEach(function (facet) {
      selectedFacets[facet.key].forEach(function (value) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "cc-search-filter-chip";
        chip.dataset.facet = facet.key;
        chip.dataset.value = value;
        chip.setAttribute(
          "aria-label",
          "Remove " + facet.label.toLowerCase() + " filter: " + value
        );

        const chipText = createElement(
          "span",
          "",
          facet.label + ": " + value
        );
        const remove = createElement("span", "", "×");
        remove.setAttribute("aria-hidden", "true");

        chip.appendChild(chipText);
        chip.appendChild(remove);
        activeFilters.appendChild(chip);
      });
    });
  }


  /* =======================================================
     Result rendering
     ======================================================= */

  function buildSnippet(item, terms) {
    const rawContent =
      String(item.excerpt || "").trim() ||
      String(item.content || "").trim();
    const content = rawContent.replace(/\s+/g, " ").trim();

    if (!content) {
      return "";
    }

    const lowerContent = content.toLowerCase();
    let firstMatch = -1;

    terms.forEach(function (term) {
      const position = lowerContent.indexOf(term);

      if (position !== -1 && (firstMatch === -1 || position < firstMatch)) {
        firstMatch = position;
      }
    });

    if (firstMatch === -1) {
      firstMatch = 0;
    }

    const snippetLength = 230;
    const leadCharacters = 70;
    let start = Math.max(0, firstMatch - leadCharacters);
    let end = Math.min(content.length, start + snippetLength);

    if (start > 0) {
      const nextSpace = content.indexOf(" ", start);

      if (nextSpace !== -1 && nextSpace < start + 25) {
        start = nextSpace + 1;
      }
    }

    if (end < content.length) {
      const previousSpace = content.lastIndexOf(" ", end);

      if (previousSpace > start) {
        end = previousSpace;
      }
    }

    let snippet = content.slice(start, end).trim();

    if (start > 0) {
      snippet = "…" + snippet;
    }

    if (end < content.length) {
      snippet += "…";
    }

    return snippet;
  }


  function renderResult(item, terms) {
    const article = createElement("article", "cc-search-result");
    const meta = createElement("div", "cc-search-result-meta");
    const type = createElement(
      "span",
      "cc-search-result-type",
      item.type || "Page"
    );

    meta.appendChild(type);

    if (item.date) {
      meta.appendChild(
        createElement("span", "cc-search-result-separator", "•")
      );
      meta.appendChild(
        createElement("span", "cc-search-result-date", item.date)
      );
    }

    article.appendChild(meta);

    const heading = createElement("h2", "cc-search-result-title");
    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title;
    heading.appendChild(link);
    article.appendChild(heading);

    const detailValues = [];

    item.facets.topic.slice(0, 2).forEach(function (value) {
      detailValues.push(value);
    });

    ["difficulty", "geographic_region", "language"].forEach(function (key) {
      if (item.facets[key][0]) {
        detailValues.push(item.facets[key][0]);
      }
    });

    if (detailValues.length > 0) {
      const detailList = createElement("ul", "cc-search-result-facets");

      detailValues.slice(0, 5).forEach(function (value) {
        detailList.appendChild(createElement("li", "", value));
      });

      article.appendChild(detailList);
    }

    const snippetText = buildSnippet(item, terms);

    if (snippetText) {
      article.appendChild(
        createElement("p", "cc-search-result-snippet", snippetText)
      );
    }

    const openLink = document.createElement("a");
    openLink.className = "cc-search-result-link";
    openLink.href = item.url;
    openLink.textContent = "Open result →";
    article.appendChild(openLink);

    return article;
  }


  function renderEmpty(query) {
    clearElement(resultsContainer);

    const empty = createElement("div", "cc-search-empty");
    empty.appendChild(createElement("h2", "", "No results found"));

    const message = query
      ? 'Nothing matched "' + query + '" with the selected filters.'
      : "No archive items match the selected filters.";

    empty.appendChild(
      createElement(
        "p",
        "",
        message + " Try removing a filter or using a broader search term."
      )
    );

    const reset = createElement("button", "cc-search-reset", "Reset search");
    reset.type = "button";
    reset.dataset.action = "reset-search";
    empty.appendChild(reset);
    resultsContainer.appendChild(empty);
  }


  /* =======================================================
     Search state
     ======================================================= */

  function queryMatches(query) {
    const normalizedQuery = normalize(query);
    const terms = tokenize(query);

    return searchIndex
      .map(function (item) {
        return {
          item: item,
          score: scoreItem(item, terms, normalizedQuery)
        };
      })
      .filter(function (result) {
        return result.score > 0;
      });
  }


  function sortMatches(matches, hasQuery) {
    return matches.sort(function (a, b) {
      if (hasQuery && b.score !== a.score) {
        return b.score - a.score;
      }

      const timeDifference =
        Number(b.item.timestamp || 0) - Number(a.item.timestamp || 0);

      if (timeDifference !== 0) {
        return timeDifference;
      }

      return String(a.item.title).localeCompare(String(b.item.title));
    });
  }


  function performSearch() {
    const query = input.value.trim();
    const terms = tokenize(query);

    if (!indexLoaded) {
      status.textContent = "Loading the archive…";
      return;
    }

    const candidates = queryMatches(query);
    const matches = sortMatches(
      candidates.filter(function (result) {
        return itemPassesFacets(result.item);
      }),
      terms.length > 0
    );

    clearElement(resultsContainer);
    renderActiveFilters();
    updateFacetControls(candidates);

    status.textContent =
      matches.length === 1
        ? "1 result"
        : matches.length + " results";

    if (matches.length === 0) {
      renderEmpty(query);
      return;
    }

    matches.forEach(function (result) {
      resultsContainer.appendChild(renderResult(result.item, terms));
    });
  }


  function updateURL() {
    const url = new URL(window.location.href);
    const query = input.value.trim();

    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }

    FACETS.forEach(function (facet) {
      url.searchParams.delete(facet.key);

      selectedFacets[facet.key].forEach(function (value) {
        url.searchParams.append(facet.key, value);
      });
    });

    window.history.replaceState(
      {},
      "",
      url.pathname + url.search + url.hash
    );
  }


  function loadStateFromURL() {
    const params = new URLSearchParams(window.location.search);

    input.value = params.get("q") || "";
    clearButton.hidden = input.value.length === 0;

    FACETS.forEach(function (facet) {
      selectedFacets[facet.key] = new Set(params.getAll(facet.key));
    });
  }


  function clearFacetSelections() {
    FACETS.forEach(function (facet) {
      selectedFacets[facet.key].clear();
    });
  }


  function resetSearch(shouldFocus) {
    input.value = "";
    clearButton.hidden = true;
    clearFacetSelections();
    updateURL();
    performSearch();

    if (shouldFocus) {
      input.focus();
    }
  }


  /* =======================================================
     Index loading and events
     ======================================================= */

  function loadSearchIndex() {
    status.textContent = "Loading the archive…";

    fetch(INDEX_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Search index request failed with status " + response.status
          );
        }

        return response.json();
      })
      .then(function (data) {
        prepareIndex(Array.isArray(data) ? data : []);
        indexLoaded = true;
        buildFacetControls();
        performSearch();
      })
      .catch(function (error) {
        console.error(error);
        status.textContent = "Search is temporarily unavailable.";
      });
  }


  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
    });
  }


  input.addEventListener("input", function () {
    clearButton.hidden = input.value.length === 0;
    updateURL();
    performSearch();
  });


  clearButton.addEventListener("click", function () {
    input.value = "";
    clearButton.hidden = true;
    updateURL();
    performSearch();
    input.focus();
  });


  facetContainer.addEventListener("change", function (event) {
    const checkbox = event.target.closest("input[data-facet]");

    if (!checkbox) {
      return;
    }

    const selection = selectedFacets[checkbox.dataset.facet];

    if (checkbox.checked) {
      selection.add(checkbox.value);
    } else {
      selection.delete(checkbox.value);
    }

    updateURL();
    performSearch();
  });


  activeFilters.addEventListener("click", function (event) {
    const chip = event.target.closest("button[data-facet]");

    if (!chip) {
      return;
    }

    selectedFacets[chip.dataset.facet].delete(chip.dataset.value);
    updateURL();
    performSearch();
  });


  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", function () {
      clearFacetSelections();
      updateURL();
      performSearch();
    });
  }


  resultsContainer.addEventListener("click", function (event) {
    if (event.target.closest('[data-action="reset-search"]')) {
      resetSearch(true);
    }
  });


  window.addEventListener("popstate", function () {
    loadStateFromURL();

    if (indexLoaded) {
      canonicalizeSelections();
      performSearch();
    }
  });


  document.addEventListener("keydown", function (event) {
    const activeElement = document.activeElement;
    const isTyping =
      activeElement &&
      (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.isContentEditable
      );

    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      input.focus();
      input.select();
    }

    if (event.key === "Escape" && document.activeElement === input) {
      input.blur();
    }
  });


  loadStateFromURL();
  loadSearchIndex();

})();
