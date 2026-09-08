(function () {
  "use strict";

  const STORAGE_KEY = "continental-communist-retention-v1";
  const lessonRoot = document.querySelector("[data-retention-lesson]");

  if (!lessonRoot) {
    return;
  }

  const lessonId = lessonRoot.dataset.lessonKey;
  const assessmentForms = Array.from(
    lessonRoot.querySelectorAll("[data-lesson-assessment]")
  );
  const completionControl = lessonRoot.querySelector("[data-lesson-completion]");
  const masteryCount = lessonRoot.querySelector("[data-lesson-mastery-count]");
  const nextReview = lessonRoot.querySelector("[data-next-review]");


  function readState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");

      if (!parsed || typeof parsed !== "object") {
        return { lessons: {} };
      }

      parsed.lessons = parsed.lessons && typeof parsed.lessons === "object"
        ? parsed.lessons
        : {};
      return parsed;
    } catch (error) {
      return { lessons: {} };
    }
  }


  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      /* The lesson remains usable when browser storage is unavailable. */
    }
  }


  function lessonState(state) {
    state.lessons[lessonId] = state.lessons[lessonId] || {
      startedAt: new Date().toISOString(),
      warmup: {},
      attempts: {}
    };
    state.lessons[lessonId].attempts = state.lessons[lessonId].attempts || {};
    return state.lessons[lessonId];
  }


  function formatReviewDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not scheduled";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
    }).format(date);
  }


  function intervalFor(grade) {
    if (grade === "again") {
      return 1;
    }

    if (grade === "developing") {
      return 3;
    }

    return 7;
  }


  function difficultyFor(grade) {
    if (grade === "again") {
      return 0.8;
    }

    if (grade === "developing") {
      return 0.6;
    }

    return 0.4;
  }


  function reviewMessage(attempt) {
    if (!attempt || !attempt.dueAt) {
      return "";
    }

    return "Scheduled to return on " + formatReviewDate(attempt.dueAt) + ".";
  }


  function updateSummary() {
    const state = readState();
    const currentLesson = lessonState(state);
    const attempts = assessmentForms.map(function (form) {
      return currentLesson.attempts[form.dataset.itemKey];
    });
    const rated = attempts.filter(function (attempt) {
      return attempt && attempt.selfGrade;
    });
    const dueDates = rated
      .map(function (attempt) { return new Date(attempt.dueAt); })
      .filter(function (date) { return !Number.isNaN(date.getTime()); })
      .sort(function (left, right) { return left - right; });

    if (masteryCount) {
      masteryCount.textContent = rated.length + " of " + assessmentForms.length;
    }

    if (nextReview) {
      nextReview.textContent = dueDates.length
        ? formatReviewDate(dueDates[0])
        : "Not scheduled";
    }

    if (completionControl) {
      completionControl.disabled = rated.length !== assessmentForms.length;
    }
  }


  function restoreAssessment(form, attempt) {
    if (!attempt) {
      return;
    }

    const response = form.querySelector("[data-assessment-response]");
    const feedback = form.querySelector("[data-assessment-feedback]");
    const status = form.querySelector("[data-assessment-status]");
    const reviewStatus = form.querySelector("[data-review-status]");
    const confidence = form.querySelector(
      'input[type="radio"][value="' + attempt.confidence + '"]'
    );

    response.value = attempt.response || "";

    if (confidence) {
      confidence.checked = true;
    }

    if (attempt.attemptedAt) {
      feedback.hidden = false;
      status.textContent = "Feedback available. You can revise and compare again.";
    }

    form.querySelectorAll("[data-self-grade]").forEach(function (button) {
      const selected = button.dataset.selfGrade === attempt.selfGrade;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    reviewStatus.textContent = reviewMessage(attempt);
  }


  function initializeWarmup() {
    const form = lessonRoot.querySelector("[data-warmup-form]");

    if (!form) {
      return;
    }

    const response = form.querySelector("[data-warmup-response]");
    const status = form.querySelector("[data-warmup-status]");
    const state = readState();
    const currentLesson = lessonState(state);

    if (currentLesson.warmup && currentLesson.warmup.response) {
      response.value = currentLesson.warmup.response;
      status.textContent = "First thought saved in this browser.";
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const nextState = readState();
      const nextLesson = lessonState(nextState);
      nextLesson.warmup = {
        itemId: form.dataset.itemKey,
        response: response.value.trim(),
        savedAt: new Date().toISOString()
      };
      nextLesson.lastActiveAt = new Date().toISOString();
      writeState(nextState);
      status.textContent = "First thought saved in this browser.";
    });
  }


  function initializeAssessment(form) {
    const response = form.querySelector("[data-assessment-response]");
    const feedback = form.querySelector("[data-assessment-feedback]");
    const status = form.querySelector("[data-assessment-status]");
    const reviewStatus = form.querySelector("[data-review-status]");
    const state = readState();
    const currentLesson = lessonState(state);

    restoreAssessment(form, currentLesson.attempts[form.dataset.itemKey]);

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const selectedConfidence = form.querySelector(
        'input[type="radio"]:checked'
      );
      const nextState = readState();
      const nextLesson = lessonState(nextState);
      const previous = nextLesson.attempts[form.dataset.itemKey] || {};

      nextLesson.attempts[form.dataset.itemKey] = {
        ...previous,
        itemId: form.dataset.itemKey,
        conceptId: form.dataset.conceptKey,
        response: response.value.trim(),
        confidence: selectedConfidence.value,
        attemptedAt: new Date().toISOString()
      };
      nextLesson.lastActiveAt = new Date().toISOString();
      writeState(nextState);

      feedback.hidden = false;
      status.textContent = "Feedback revealed. Compare it with your response, then rate your explanation.";
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      feedback.focus({ preventScroll: true });
      feedback.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "nearest"
      });
    });

    form.querySelectorAll("[data-self-grade]").forEach(function (button) {
      button.addEventListener("click", function () {
        const nextState = readState();
        const nextLesson = lessonState(nextState);
        const attempt = nextLesson.attempts[form.dataset.itemKey];

        if (!attempt || !attempt.attemptedAt) {
          status.textContent = "Write an answer and reveal feedback before rating it.";
          return;
        }

        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + intervalFor(button.dataset.selfGrade));
        attempt.selfGrade = button.dataset.selfGrade;
        attempt.stabilityDays = intervalFor(button.dataset.selfGrade);
        attempt.difficulty = difficultyFor(button.dataset.selfGrade);
        attempt.reviewCount = Number(attempt.reviewCount || 0);
        attempt.dueAt = dueAt.toISOString();
        attempt.gradedAt = new Date().toISOString();
        nextLesson.lastActiveAt = new Date().toISOString();
        writeState(nextState);

        form.querySelectorAll("[data-self-grade]").forEach(function (gradeButton) {
          const selected = gradeButton === button;
          gradeButton.classList.toggle("is-selected", selected);
          gradeButton.setAttribute("aria-pressed", String(selected));
        });

        reviewStatus.textContent = reviewMessage(attempt);
        updateSummary();
      });
    });
  }


  initializeWarmup();
  assessmentForms.forEach(initializeAssessment);
  updateSummary();
}());
