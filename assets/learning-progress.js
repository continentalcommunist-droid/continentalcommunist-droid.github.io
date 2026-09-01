(function () {
  "use strict";

  const STORAGE_KEY = "continental-communist-learning-progress-v1";


  function readState() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      const parsed = value ? JSON.parse(value) : {};

      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }


  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* Progress still works for the current page if storage is unavailable. */
    }
  }


  function completedFor(state, slug) {
    const completed = state[slug];

    return Array.isArray(completed) ? completed : [];
  }


  function updateProgress(root, completedCount) {
    const total = Number(root.getAttribute("data-total-steps")) || 0;
    const safeCount = Math.min(completedCount, total);
    const percent = total > 0
      ? Math.round((safeCount / total) * 100)
      : 0;

    root.querySelectorAll("[data-progress-count]").forEach(function (element) {
      element.textContent = safeCount + " of " + total + " steps";
    });

    root.querySelectorAll("[data-progress-percent]").forEach(function (element) {
      element.textContent = percent + "%";
    });

    root.querySelectorAll("[data-progress-bar]").forEach(function (element) {
      element.style.width = percent + "%";
    });

    root.querySelectorAll('[role="progressbar"]').forEach(function (element) {
      element.setAttribute("aria-valuenow", String(safeCount));
      element.setAttribute("aria-valuetext", percent + "% complete");
    });
  }


  function setupPath(root, state) {
    const slug = root.getAttribute("data-learning-path");
    const checkboxes = Array.from(
      root.querySelectorAll("[data-progress-item]")
    );
    let completed = new Set(completedFor(state, slug));

    checkboxes.forEach(function (checkbox) {
      const item = checkbox.getAttribute("data-progress-item");
      checkbox.checked = completed.has(item);

      checkbox.addEventListener("change", function () {
        if (checkbox.checked) {
          completed.add(item);
        } else {
          completed.delete(item);
        }

        state[slug] = Array.from(completed);
        writeState(state);
        updateProgress(root, completed.size);
      });
    });

    const resetButton = root.querySelector("[data-reset-path]");

    if (resetButton) {
      resetButton.addEventListener("click", function () {
        const confirmed = window.confirm(
          "Reset all saved progress for this learning pathway?"
        );

        if (!confirmed) {
          return;
        }

        completed = new Set();
        state[slug] = [];
        checkboxes.forEach(function (checkbox) {
          checkbox.checked = false;
        });
        writeState(state);
        updateProgress(root, 0);
      });
    }

    updateProgress(root, completed.size);
  }


  function setupCards(state) {
    document.querySelectorAll("[data-pathway-card]").forEach(function (card) {
      const slug = card.getAttribute("data-pathway-card");
      updateProgress(card, completedFor(state, slug).length);
    });
  }


  let state = readState();

  document.querySelectorAll("[data-learning-path]").forEach(function (root) {
    setupPath(root, state);
  });

  setupCards(state);


  window.addEventListener("storage", function (event) {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    state = readState();
    setupCards(state);
  });
}());
