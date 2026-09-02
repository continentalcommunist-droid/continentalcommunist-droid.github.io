(function () {
  "use strict";

  const container = document.querySelector("[data-library-catalog]");
  if (!container) return;

  const dataElement = document.getElementById("cc-library-catalog-data");
  if (!dataElement) return;

  let allBooks = [];
  try {
    allBooks = JSON.parse(dataElement.textContent || "[]");
  } catch (e) {
    console.error("Failed to parse library catalog data:", e);
    return;
  }

  const searchInput = container.querySelector("[data-catalog-search]");
  const categoryContainer = container.querySelector("[data-catalog-categories]");
  const sortSelect = container.querySelector("[data-catalog-sort]");
  const viewToggleButtons = container.querySelectorAll("[data-catalog-view-toggle]");
  const countElement = container.querySelector("[data-catalog-count]");
  const resultsGrid = container.querySelector("[data-catalog-grid]");
  const resultsTable = container.querySelector("[data-catalog-table]");
  const emptyState = container.querySelector("[data-catalog-empty]");

  let activeCategory = "all";
  let activeSearch = "";
  let activeSort = "year-desc";
  let activeView = "grid";

  function getFilteredAndSortedBooks() {
    return allBooks
      .filter((book) => {
        if (activeCategory !== "all") {
          if (activeCategory === "lenin" && book.category !== "Lenin: Collected Works") return false;
          if (activeCategory === "mecw" && book.category !== "Marx & Engels: Collected Works") return false;
          if (activeCategory === "value" && book.category !== "Value Theory & Capital") return false;
          if (activeCategory === "crisis" && book.category !== "Crisis Theory & Accumulation") return false;
          if (activeCategory === "imperialism" && book.category !== "Imperialism & Global Economy") return false;
          if (activeCategory === "ecology" && book.category !== "Ecology & Social Reproduction") return false;
          if (activeCategory === "history" && book.category !== "Methodology & History of Economic Thought") return false;
          if (activeCategory === "classical" && book.category !== "Classical & Foundational Political Economy") return false;
        }

        if (activeSearch.trim() !== "") {
          const q = activeSearch.toLowerCase().trim();
          const title = (book.title || "").toLowerCase();
          const authors = (book.authors || []).join(" ").toLowerCase();
          const desc = (book.description || "").toLowerCase();
          const cat = (book.category || "").toLowerCase();
          const pub = (book.publisher || "").toLowerCase();
          const year = String(book.year || "");

          if (!title.includes(q) && !authors.includes(q) && !desc.includes(q) && !cat.includes(q) && !pub.includes(q) && !year.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (activeSort === "year-desc") {
          return (Number(b.year) || 0) - (Number(a.year) || 0) || a.title.localeCompare(b.title);
        }
        if (activeSort === "year-asc") {
          return (Number(a.year) || 9999) - (Number(b.year) || 9999) || a.title.localeCompare(b.title);
        }
        if (activeSort === "title-asc") {
          return a.title.localeCompare(b.title);
        }
        if (activeSort === "title-desc") {
          return b.title.localeCompare(a.title);
        }
        if (activeSort === "author-asc") {
          const aAuth = (a.authors && a.authors[0]) || "";
          const bAuth = (b.authors && b.authors[0]) || "";
          return aAuth.localeCompare(bAuth) || a.title.localeCompare(b.title);
        }
        if (activeSort === "size-desc") {
          return (b.size_bytes || 0) - (a.size_bytes || 0);
        }
        return 0;
      });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderGrid(books) {
    if (!resultsGrid) return;
    if (books.length === 0) {
      resultsGrid.innerHTML = "";
      return;
    }

    const html = books
      .map((book) => {
        const readerUrl = "/library/reader/?book=" + encodeURIComponent(book.id);
        const authorStr = (book.authors || []).join(", ");
        const yearBadge = book.year ? '<span class="cc-book-tag-year">' + escapeHtml(book.year) + '</span>' : "";
        const sizeBadge = '<span class="cc-book-tag-size">' + escapeHtml(book.size_mb) + " MB " + escapeHtml(book.format) + '</span>';
        const catBadge = '<span class="cc-book-tag-cat">' + escapeHtml(book.category) + '</span>';

        return '<article class="cc-book-card" data-book-id="' + escapeHtml(book.id) + '">' +
          '<div class="cc-book-card-cover" aria-hidden="true">' +
            '<div class="cc-book-cover-kicker">' + escapeHtml(book.collection || "Library") + '</div>' +
            '<div class="cc-book-cover-title">' + escapeHtml(book.title) + '</div>' +
            '<div class="cc-book-cover-author">' + escapeHtml(authorStr) + '</div>' +
            '<div class="cc-book-cover-bar"></div>' +
          '</div>' +
          '<div class="cc-book-card-content">' +
            '<div class="cc-book-card-meta">' +
              catBadge +
              yearBadge +
              sizeBadge +
            '</div>' +
            '<h3 class="cc-book-card-title">' +
              '<a href="' + readerUrl + '">' + escapeHtml(book.title) + '</a>' +
            '</h3>' +
            '<div class="cc-book-card-author">' + escapeHtml(authorStr) + '</div>' +
            '<p class="cc-book-card-desc">' + escapeHtml(book.description) + '</p>' +
            '<div class="cc-book-card-actions">' +
              '<a href="' + readerUrl + '" class="cc-btn-read-onsite">' +
                '<span>Read On Site</span> ' +
                '<span aria-hidden="true">→</span>' +
              '</a>' +
              '<a href="' + escapeHtml(book.file_url) + '" download class="cc-btn-download-pdf" title="Download ' + escapeHtml(book.format) + ' (' + escapeHtml(book.size_mb) + ' MB)">' +
                '<span>Download</span> ' +
                '<span aria-hidden="true">↓</span>' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</article>';
      })
      .join("");

    resultsGrid.innerHTML = html;
  }

  function renderTable(books) {
    if (!resultsTable) return;
    if (books.length === 0) {
      resultsTable.innerHTML = "";
      return;
    }

    const tbody = resultsTable.querySelector("tbody");
    if (!tbody) return;

    const rows = books
      .map((book) => {
        const readerUrl = "/library/reader/?book=" + encodeURIComponent(book.id);
        const authorStr = (book.authors || []).join(", ");
        return '<tr>' +
          '<td class="cc-table-col-title">' +
            '<a href="' + readerUrl + '" class="cc-table-link"><strong>' + escapeHtml(book.title) + '</strong></a>' +
            '<div class="cc-table-desc-mobile">' + escapeHtml(book.description) + '</div>' +
          '</td>' +
          '<td class="cc-table-col-author">' + escapeHtml(authorStr) + '</td>' +
          '<td class="cc-table-col-year">' + escapeHtml(book.year || "—") + '</td>' +
          '<td class="cc-table-col-cat"><span class="cc-table-cat-badge">' + escapeHtml(book.category) + '</span></td>' +
          '<td class="cc-table-col-size">' + escapeHtml(book.size_mb) + ' MB</td>' +
          '<td class="cc-table-col-actions">' +
            '<a href="' + readerUrl + '" class="cc-table-btn-read">Read</a> ' +
            '<a href="' + escapeHtml(book.file_url) + '" download class="cc-table-btn-dl" title="Download">↓</a>' +
          '</td>' +
        '</tr>';
      })
      .join("");

    tbody.innerHTML = rows;
  }

  function updateDisplay() {
    const books = getFilteredAndSortedBooks();

    if (countElement) {
      countElement.textContent = books.length + " of " + allBooks.length + " works";
    }

    if (books.length === 0) {
      if (emptyState) emptyState.hidden = false;
      if (resultsGrid) resultsGrid.hidden = true;
      if (resultsTable) resultsTable.hidden = true;
    } else {
      if (emptyState) emptyState.hidden = true;
      if (activeView === "grid") {
        if (resultsGrid) {
          resultsGrid.hidden = false;
          renderGrid(books);
        }
        if (resultsTable) resultsTable.hidden = true;
      } else {
        if (resultsTable) {
          resultsTable.hidden = false;
          renderTable(books);
        }
        if (resultsGrid) resultsGrid.hidden = true;
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      activeSearch = e.target.value || "";
      updateDisplay();
    });
  }

  if (categoryContainer) {
    categoryContainer.addEventListener("click", function (e) {
      const button = e.target.closest("button[data-category]");
      if (!button) return;

      categoryContainer.querySelectorAll("button[data-category]").forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });

      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
      activeCategory = button.getAttribute("data-category") || "all";
      updateDisplay();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function (e) {
      activeSort = e.target.value;
      updateDisplay();
    });
  }

  viewToggleButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      viewToggleButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      this.classList.add("active");
      this.setAttribute("aria-pressed", "true");
      activeView = this.getAttribute("data-catalog-view-toggle") || "grid";
      updateDisplay();
    });
  });

  updateDisplay();
})();
