---
---

(function () {
  "use strict";

  const input = document.getElementById("cc-search-input");
  const resultsContainer = document.getElementById("cc-search-results");
  const status = document.getElementById("cc-search-status");
  const clearButton = document.getElementById("cc-search-clear");

  if (!input || !resultsContainer || !status) {
    return;
  }

  const INDEX_URL = "{{ '/search.json' | relative_url }}";

  let searchIndex = [];
  let indexLoaded = false;


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
      .map(function (term) {
        return term.trim();
      })
      .filter(function (term) {
        return term.length > 0;
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


  /* =======================================================
     Search scoring
     ======================================================= */

  function scoreItem(item, terms, fullQuery) {
    const title = normalize(item.title);
    const categories = normalize(item.categories);
    const excerpt = normalize(item.excerpt);
    const content = normalize(item.content);

    const combined =
      title + " " +
      categories + " " +
      excerpt + " " +
      content;

    /*
     * Require every query term to exist somewhere in the
     * searchable document.
     */
    const allTermsPresent = terms.every(function (term) {
      return combined.includes(term);
    });

    if (!allTermsPresent) {
      return 0;
    }

    let score = 0;


    /*
     * Exact/full title matches receive very high priority.
     */
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

      /*
       * Title matches are the most important.
       */
      if (title === term) {
        score += 40;
      } else if (title.startsWith(term)) {
        score += 25;
      } else if (title.includes(term)) {
        score += 18;
      }


      /*
       * Categories are useful indicators of relevance.
       */
      if (categories.includes(term)) {
        score += 8;
      }


      /*
       * Excerpt matches are stronger than general body text.
       */
      if (excerpt.includes(term)) {
        score += 5;
      }


      /*
       * Body text matches establish general relevance.
       */
      if (content.includes(term)) {
        score += 2;
      }
    });


    /*
     * Give articles a small preference over static pages
     * when relevance is otherwise equal.
     */
    if (item.type === "Article") {
      score += 1;
    }

    return score;
  }


  /* =======================================================
     Search snippets
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

      if (
        position !== -1 &&
        (firstMatch === -1 || position < firstMatch)
      ) {
        firstMatch = position;
      }
    });


    /*
     * If no specific position can be found, just show
     * the beginning of the content.
     */
    if (firstMatch === -1) {
      firstMatch = 0;
    }


    const snippetLength = 230;
    const leadCharacters = 70;

    let start = Math.max(0, firstMatch - leadCharacters);
    let end = Math.min(content.length, start + snippetLength);


    /*
     * Try not to begin in the middle of a word.
     */
    if (start > 0) {
      const nextSpace = content.indexOf(" ", start);

      if (nextSpace !== -1 && nextSpace < start + 25) {
        start = nextSpace + 1;
      }
    }


    /*
     * Try not to finish in the middle of a word.
     */
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


  /* =======================================================
     Result rendering
     ======================================================= */

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
      const separator = createElement(
        "span",
        "cc-search-result-separator",
        "•"
      );

      const date = createElement(
        "span",
        "cc-search-result-date",
        item.date
      );

      meta.appendChild(separator);
      meta.appendChild(date);
    }


    article.appendChild(meta);


    const heading = createElement("h2", "cc-search-result-title");

    const link = document.createElement("a");
    link.href = item.url;
    link.textContent = item.title;

    heading.appendChild(link);
    article.appendChild(heading);


    const snippetText = buildSnippet(item, terms);

    if (snippetText) {
      const snippet = createElement(
        "p",
        "cc-search-result-snippet",
        snippetText
      );

      article.appendChild(snippet);
    }


    const readLink = document.createElement("a");

    readLink.className = "cc-search-result-link";
    readLink.href = item.url;
    readLink.textContent =
      item.type === "Article"
        ? "Read article →"
        : "View page →";

    article.appendChild(readLink);

    return article;
  }


  function renderEmpty(query) {
    clearElement(resultsContainer);

    const empty = createElement("div", "cc-search-empty");

    const heading = createElement(
      "h2",
      "",
      "No results found"
    );

    const paragraph = createElement(
      "p",
      "",
      'Nothing matched "' + query + '". Try a broader term or different wording.'
    );

    empty.appendChild(heading);
    empty.appendChild(paragraph);

    resultsContainer.appendChild(empty);
  }


  /* =======================================================
     Searching
     ======================================================= */

  function performSearch(query) {
    const trimmedQuery = query.trim();
    const normalizedQuery = normalize(trimmedQuery);
    const terms = tokenize(trimmedQuery);

    clearElement(resultsContainer);


    if (!trimmedQuery) {
      status.textContent = "";
      return;
    }


    if (!indexLoaded) {
      status.textContent = "Loading search index…";
      return;
    }


    const matches = searchIndex
      .map(function (item) {
        return {
          item: item,
          score: scoreItem(
            item,
            terms,
            normalizedQuery
          )
        };
      })
      .filter(function (result) {
        return result.score > 0;
      })
      .sort(function (a, b) {

        /*
         * First sort by relevance.
         */
        if (b.score !== a.score) {
          return b.score - a.score;
        }


        /*
         * Then show newer articles first when relevance
         * is identical.
         */
        return (
          Number(b.item.timestamp || 0) -
          Number(a.item.timestamp || 0)
        );
      });


    if (matches.length === 0) {
      status.textContent = "0 results";
      renderEmpty(trimmedQuery);
      return;
    }


    status.textContent =
      matches.length === 1
        ? "1 result"
        : matches.length + " results";


    matches.forEach(function (result) {
      resultsContainer.appendChild(
        renderResult(result.item, terms)
      );
    });
  }


  /* =======================================================
     URL query parameter
     ======================================================= */

  function updateURL(query) {
    const url = new URL(window.location.href);

    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    } else {
      url.searchParams.delete("q");
    }

    window.history.replaceState(
      {},
      "",
      url.pathname + url.search + url.hash
    );
  }


  function loadQueryFromURL() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q");

    if (query) {
      input.value = query;
      clearButton.hidden = false;
    }
  }


  /* =======================================================
     Search index
     ======================================================= */

  function loadSearchIndex() {
    status.textContent = "Loading search index…";

    fetch(INDEX_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            "Search index request failed with status " +
            response.status
          );
        }

        return response.json();
      })
      .then(function (data) {
        searchIndex = Array.isArray(data) ? data : [];
        indexLoaded = true;

        status.textContent = "";

        if (input.value.trim()) {
          performSearch(input.value);
        }
      })
      .catch(function (error) {
        console.error(error);

        status.textContent =
          "Search is temporarily unavailable.";
      });
  }


  /* =======================================================
     Events
     ======================================================= */

  input.addEventListener("input", function () {
    const query = input.value;

    clearButton.hidden = !query;

    updateURL(query);
    performSearch(query);
  });


  clearButton.addEventListener("click", function () {
    input.value = "";

    clearButton.hidden = true;

    updateURL("");
    performSearch("");

    input.focus();
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


    if (
      event.key === "/" &&
      !isTyping
    ) {
      event.preventDefault();

      input.focus();
      input.select();
    }


    if (
      event.key === "Escape" &&
      document.activeElement === input
    ) {
      input.blur();
    }
  });


  /* =======================================================
     Initialize
     ======================================================= */

  loadQueryFromURL();
  loadSearchIndex();

})();
