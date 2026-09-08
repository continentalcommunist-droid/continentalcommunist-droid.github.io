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
  const storageStatus = lessonRoot.querySelector("[data-lesson-storage-status]");
  let sessionState = { lessons: {} };
  let storageAvailable = true;


  function readState() {
    if (!storageAvailable) {
      return sessionState;
    }

    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { lessons: {} };
      }

      parsed.lessons = parsed.lessons && typeof parsed.lessons === "object"
        ? parsed.lessons
        : {};
      sessionState = parsed;
      return sessionState;
    } catch (error) {
      return sessionState;
    }
  }


  function writeState(state) {
    sessionState = state;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      storageAvailable = true;
    } catch (error) {
      storageAvailable = false;
    }

    if (storageStatus) {
      storageStatus.hidden = storageAvailable;
      storageStatus.textContent = storageAvailable ? "" :
        "Browser storage is unavailable. You can still practice and rate answers on this page, but these responses and review dates will be lost when you leave.";
    }
    return storageAvailable;
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

    if (!storageAvailable) {
      return "Rated for this visit. The review date could not be saved.";
    }

    return (attempt.needsRating ? "Rate your revised explanation. Existing review: " : "Scheduled to return on ")
      + formatReviewDate(attempt.dueAt) + ".";
  }


  function validateResponses(form, responses) {
    let valid = true;
    responses.forEach(function (response) {
      const minimum = Math.max(1, response.minLength);
      const enoughText = response.value.trim().length >= minimum;
      response.setCustomValidity(enoughText ? "" :
        "Write at least " + minimum + " characters in your own words; spaces alone do not count.");
      valid = enoughText && valid;
    });
    return form.reportValidity() && valid;
  }


  function revealFeedback(feedback) {
    feedback.hidden = false;
    feedback.focus({ preventScroll: true });
    feedback.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto" : "smooth",
      block: "nearest"
    });
  }


  function updateSummary() {
    const state = readState();
    const currentLesson = lessonState(state);
    const attempts = assessmentForms.map(function (form) {
      return currentLesson.attempts[form.dataset.itemKey];
    });
    const rated = attempts.filter(function (attempt) {
      return attempt && attempt.selfGrade && !attempt.needsRating;
    });
    const dueDates = rated
      .map(function (attempt) { return new Date(attempt.dueAt); })
      .filter(function (date) { return !Number.isNaN(date.getTime()); })
      .sort(function (left, right) { return left - right; });

    if (masteryCount) {
      masteryCount.textContent = rated.length + " of " + assessmentForms.length;
    }

    if (nextReview) {
      nextReview.textContent = !storageAvailable && dueDates.length
        ? "Not saved"
        : dueDates.length
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
    const confidence = Array.from(form.querySelectorAll('input[type="radio"]'))
      .find(function (input) { return input.value === attempt.confidence; });

    response.value = attempt.response || "";

    if (confidence) {
      confidence.checked = true;
    }

    if (attempt.attemptedAt) {
      feedback.hidden = false;
      status.textContent = "Feedback available. You can revise and compare again.";
    }

    form.querySelectorAll("[data-self-grade]").forEach(function (button) {
      const selected = !attempt.needsRating && button.dataset.selfGrade === attempt.selfGrade;
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

      if (!validateResponses(form, [response])) {
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
      const saved = writeState(nextState);
      status.textContent = saved ? "First thought saved in this browser."
        : "First thought kept for this visit only; browser storage is unavailable.";
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

    form.addEventListener("input", function () {
      feedback.hidden = true;
      status.textContent = "Response changed. Reveal feedback again before rating this explanation.";
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validateResponses(form, [response])) {
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
        gradedConfidence: previous.gradedConfidence || (previous.selfGrade ? previous.confidence : undefined),
        confidence: selectedConfidence.value,
        attemptedAt: new Date().toISOString(),
        needsRating: true
      };
      nextLesson.lastActiveAt = new Date().toISOString();
      const saved = writeState(nextState);
      restoreAssessment(form, nextLesson.attempts[form.dataset.itemKey]);
      status.textContent = "Feedback revealed. Compare it with your response, then rate your explanation."
        + (saved ? "" : " Your response is kept for this visit only.");
      updateSummary();
      revealFeedback(feedback);
    });

    form.querySelectorAll("[data-self-grade]").forEach(function (button) {
      button.addEventListener("click", function () {
        const nextState = readState();
        const nextLesson = lessonState(nextState);
        const attempt = nextLesson.attempts[form.dataset.itemKey];

        if (!attempt || !attempt.attemptedAt || feedback.hidden) {
          status.textContent = "Write an answer and reveal feedback before rating it.";
          return;
        }

        // Initial corrections share an anchor; established review history is preserved.
        if (!attempt.dueAt || (!attempt.reviewCount && !attempt.lastReviewedAt)) {
          const anchor = new Date(attempt.firstGradedAt || attempt.gradedAt || Date.now());
          const dueAt = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
          attempt.firstGradedAt = dueAt.toISOString();
          dueAt.setDate(dueAt.getDate() + intervalFor(button.dataset.selfGrade));
          attempt.stabilityDays = intervalFor(button.dataset.selfGrade);
          attempt.difficulty = difficultyFor(button.dataset.selfGrade);
          attempt.dueAt = dueAt.toISOString();
        }
        attempt.selfGrade = button.dataset.selfGrade;
        attempt.gradedConfidence = attempt.confidence;
        attempt.needsRating = false;
        attempt.reviewCount = Number(attempt.reviewCount || 0);
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


  function initializeFadedExample(form) {
    const responses = Array.from(form.querySelectorAll("[data-faded-response]"));
    const feedback = form.querySelector("[data-faded-feedback]");
    const status = form.querySelector("[data-faded-status]");
    const reveal = form.querySelector("[data-faded-reveal]");
    const state = readState();
    const currentLesson = lessonState(state);
    const saved = (currentLesson.fadedExamples || {})[form.dataset.itemKey];

    if (saved) {
      responses.forEach(function (response) {
        response.value = (saved.responses || {})[response.dataset.fadedResponse] || "";
      });
      const confidence = Array.from(form.querySelectorAll('input[type="radio"]'))
        .find(function (input) { return input.value === saved.confidence; });
      if (confidence) confidence.checked = true;
      if (saved.attemptedAt && confidence && responses.every(function (response) {
        return response.value.trim().length >= Math.max(1, response.minLength);
      })) {
        feedback.hidden = false;
        reveal.setAttribute("aria-expanded", "true");
        status.textContent = "Guided practice restored from this browser. You can revise and compare again.";
      }
    }

    form.addEventListener("input", function () {
      feedback.hidden = true;
      reveal.setAttribute("aria-expanded", "false");
      status.textContent = "Responses changed. Complete each step and compare again to save your revision.";
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!validateResponses(form, responses)) return;

      const nextState = readState();
      const nextLesson = lessonState(nextState);
      const attemptedAt = new Date().toISOString();
      nextLesson.fadedExamples = nextLesson.fadedExamples || {};
      nextLesson.fadedExamples[form.dataset.itemKey] = {
        itemId: form.dataset.itemKey,
        responses: Object.fromEntries(responses.map(function (response) {
          return [response.dataset.fadedResponse, response.value.trim()];
        })),
        confidence: form.querySelector('input[type="radio"]:checked').value,
        attemptedAt: attemptedAt
      };
      nextLesson.lastActiveAt = attemptedAt;
      const persisted = writeState(nextState);
      status.textContent = persisted
        ? "Responses saved in this browser. Compare each step, then try the independent case."
        : "Feedback revealed. Responses are kept for this visit only; browser storage is unavailable.";
      reveal.setAttribute("aria-expanded", "true");
      revealFeedback(feedback);
    });
  }


  lessonRoot.querySelectorAll("textarea").forEach(function (response) {
    response.addEventListener("input", function () {
      response.setCustomValidity("");
    });
  });
  initializeWarmup();
  assessmentForms.forEach(initializeAssessment);
  lessonRoot.querySelectorAll("[data-faded-example]").forEach(initializeFadedExample);
  updateSummary();
}());
