import {
  accountRedirectUrl,
  getSupabaseClient
} from "./supabase-client.js";

(function () {
  "use strict";

  const readerContainer = document.querySelector("[data-pdf-reader]");
  if (!readerContainer) return;

  const dataElement = document.getElementById("cc-library-catalog-data");
  if (!dataElement) return;

  let allBooks = [];
  try {
    allBooks = JSON.parse(dataElement.textContent || "[]");
  } catch (e) {
    console.error("Failed to parse library catalog data:", e);
    return;
  }

  const booksById = {};
  allBooks.forEach((b) => {
    booksById[b.id] = b;
  });

  const urlParams = new URLSearchParams(window.location.search);
  let requestedId = urlParams.get("book");
  if (!requestedId || !booksById[requestedId]) {
    requestedId = booksById["anwar-shaikh-capitalism-competition-conflict-crise"] ? "anwar-shaikh-capitalism-competition-conflict-crise" : allBooks[0].id;
  }

  let currentBook = booksById[requestedId];

  const titleEl = document.querySelector("[data-reader-title]");
  const breadcrumbEl = document.querySelector("[data-reader-breadcrumb-title]");
  const authorEl = document.querySelector("[data-reader-author]");
  const categoryEl = document.querySelector("[data-reader-category]");
  const descEl = document.querySelector("[data-reader-desc]");
  const metaDl = document.querySelector("[data-reader-meta]");
  const iframeEl = document.querySelector("[data-reader-frame]");
  const fallbackLinkEl = document.querySelector("[data-reader-fallback-link]");
  const downloadLinkEl = document.querySelector("[data-reader-download-link]");
  const openTabLinkEl = document.querySelector("[data-reader-open-tab]");
  const volumeSelectEl = document.querySelector("[data-reader-volume-select]");
  const fullscreenBtn = document.querySelector("[data-reader-fullscreen]");
  const copyCiteBtn = document.querySelector("[data-reader-copy-cite]");
  const citeStatusEl = document.querySelector("[data-reader-cite-status]");
  const authGateEl = document.querySelector("[data-reader-auth-gate]");
  const googleAuthBtn = document.querySelector("[data-reader-google-auth]");
  const emailAuthLink = document.querySelector("[data-reader-auth-email-link]");

  let isAuthenticated = false;

  function fileUrlFor(book) {
    if (!book || !Array.isArray(book.file_path_parts)) return "";
    return "/" + book.file_path_parts.filter(Boolean).join("/");
  }

  function checkLocalStorageToken() {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) {
          const val = window.localStorage.getItem(key);
          if (val && val.indexOf("access_token") !== -1) {
            return true;
          }
        }
      }
    } catch (e) {
      /* ignore storage access error */
    }
    return false;
  }

  if (checkLocalStorageToken()) {
    isAuthenticated = true;
  }

  function setHidden(el, hidden) {
    if (el) {
      el.hidden = hidden;
    }
  }

  function populateBook(book) {
    if (!book) return;
    currentBook = book;

    const authorStr = (book.authors || []).join(", ");
    document.title = book.title + " — Continental Communist Library";

    if (titleEl) titleEl.textContent = book.title;
    if (breadcrumbEl) breadcrumbEl.textContent = book.title;
    if (authorEl) authorEl.textContent = authorStr;
    if (categoryEl) categoryEl.textContent = book.category;
    if (descEl) descEl.textContent = book.description;

    if (metaDl) {
      let metaHtml = "";
      if (book.year) metaHtml += "<div><dt>Published</dt><dd>" + book.year + "</dd></div>";
      if (book.publisher) metaHtml += "<div><dt>Publisher</dt><dd>" + book.publisher + "</dd></div>";
      if (book.category) metaHtml += "<div><dt>Category</dt><dd>" + book.category + "</dd></div>";
      if (book.reading_level) metaHtml += "<div><dt>Difficulty</dt><dd>" + book.reading_level + "</dd></div>";
      if (book.size_mb) metaHtml += "<div><dt>File size</dt><dd>" + book.size_mb + " MB (" + book.format + ")</dd></div>";
      metaDl.innerHTML = metaHtml;
    }

    const currentUrl = window.location.pathname + "?book=" + encodeURIComponent(book.id);

    if (isAuthenticated) {
      const fileUrl = fileUrlFor(book);
      setHidden(authGateEl, true);
      setHidden(iframeEl, false);
      if (iframeEl) iframeEl.src = fileUrl;
      if (fallbackLinkEl) fallbackLinkEl.href = fileUrl;
      if (downloadLinkEl) {
        downloadLinkEl.href = fileUrl;
        downloadLinkEl.removeAttribute("aria-disabled");
      }
      if (openTabLinkEl) {
        openTabLinkEl.href = fileUrl;
        openTabLinkEl.removeAttribute("aria-disabled");
      }
    } else {
      setHidden(authGateEl, false);
      setHidden(iframeEl, true);
      if (iframeEl) iframeEl.src = "about:blank";

      const authUrl = accountRedirectUrl({ return_to: currentUrl });
      if (emailAuthLink) emailAuthLink.href = authUrl;
      if (downloadLinkEl) {
        downloadLinkEl.href = authUrl;
      }
      if (openTabLinkEl) {
        openTabLinkEl.href = authUrl;
      }
    }

    if (volumeSelectEl) {
      let related = allBooks.filter((b) => b.category === book.category || b.collection === book.collection);
      if (related.length <= 1) related = allBooks.slice(0, 30);

      volumeSelectEl.innerHTML = related
        .map((b) => {
          const sel = b.id === book.id ? "selected" : "";
          const prefix = b.year ? "(" + b.year + ") " : "";
          return '<option value="' + b.id + '" ' + sel + '>' + prefix + b.title + '</option>';
        })
        .join("");
    }
  }

  populateBook(currentBook);

  if (volumeSelectEl) {
    volumeSelectEl.addEventListener("change", function (e) {
      const newId = e.target.value;
      if (newId && booksById[newId]) {
        const newUrl = window.location.pathname + "?book=" + encodeURIComponent(newId);
        window.history.pushState({ bookId: newId }, "", newUrl);
        populateBook(booksById[newId]);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  window.addEventListener("popstate", function () {
    const p = new URLSearchParams(window.location.search);
    const id = p.get("book") || allBooks[0].id;
    if (booksById[id]) {
      populateBook(booksById[id]);
    }
  });

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", function () {
      if (!isAuthenticated) {
        const currentUrl = window.location.pathname + window.location.search;
        window.location.assign(accountRedirectUrl({ return_to: currentUrl }));
        return;
      }

      const frameContainer = document.querySelector(".cc-pdf-frame-wrapper");
      if (!frameContainer) return;

      if (!document.fullscreenElement) {
        if (frameContainer.requestFullscreen) {
          frameContainer.requestFullscreen();
        } else if (frameContainer.webkitRequestFullscreen) {
          frameContainer.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });
  }

  if (copyCiteBtn) {
    copyCiteBtn.addEventListener("click", function () {
      const p = new URLSearchParams(window.location.search);
      const id = p.get("book") || currentBook.id;
      const b = booksById[id] || currentBook;
      const authorStr = (b.authors || []).join(", ");
      const citeText = authorStr + ". " + b.title + (b.publisher ? " (" + b.publisher + (b.year ? ", " + b.year : "") + ")" : (b.year ? " (" + b.year + ")" : "")) + ". Continental Communist Library.";

      navigator.clipboard.writeText(citeText).then(
        function () {
          if (citeStatusEl) {
            citeStatusEl.textContent = "Citation copied to clipboard!";
            citeStatusEl.hidden = false;
            setTimeout(function () {
              citeStatusEl.hidden = true;
            }, 3000);
          }
        },
        function () {
          if (citeStatusEl) {
            citeStatusEl.textContent = "Unable to auto-copy citation.";
            citeStatusEl.hidden = false;
          }
        }
      );
    });
  }

  // Supabase Authentication Check
  getSupabaseClient().then(function (client) {
    if (!client) return;

    client.auth.getSession().then(function ({ data }) {
      const isAuthed = Boolean(data && data.session && data.session.user);
      if (isAuthed !== isAuthenticated) {
        isAuthenticated = isAuthed;
        populateBook(currentBook);
      }
    });

    client.auth.onAuthStateChange(function (event, session) {
      const isAuthed = Boolean(session && session.user);
      if (isAuthed !== isAuthenticated) {
        isAuthenticated = isAuthed;
        populateBook(currentBook);
      }
    });

    if (googleAuthBtn) {
      googleAuthBtn.addEventListener("click", async function (e) {
        e.preventDefault();
        googleAuthBtn.disabled = true;
        const currentPath = window.location.pathname + window.location.search;

        try {
          const response = await client.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: accountRedirectUrl({ return_to: currentPath })
            }
          });

          if (response.error) {
            googleAuthBtn.disabled = false;
            console.error("Google OAuth error:", response.error);
          }
        } catch (err) {
          googleAuthBtn.disabled = false;
          console.error("Google OAuth error:", err);
        }
      });
    }
  });
})();
