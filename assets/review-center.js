import { adaptiveSchedule, buildInterleavedQueue } from "./retention-model.mjs";

(function () {
  "use strict";

  const STORAGE_KEY = "continental-communist-retention-v1";
  const DEFAULT_DAILY_LIMIT = 10;
  const root = document.querySelector("[data-review-center]");

  if (!root) {
    return;
  }


  function readJson(element, fallback) {
    try {
      const value = JSON.parse(element ? element.textContent : "");
      return value || fallback;
    } catch (error) {
      return fallback;
    }
  }


  function readLocalState() {
    try {
      const state = readJson(
        { textContent: window.localStorage.getItem(STORAGE_KEY) },
        { lessons: {} }
      );

      state.lessons = state.lessons && typeof state.lessons === "object"
        ? state.lessons
        : {};
      state.preferences = state.preferences && typeof state.preferences === "object"
        ? state.preferences
        : {};
      state.reviewHistory = Array.isArray(state.reviewHistory)
        ? state.reviewHistory
        : [];
      return state;
    } catch (error) {
      return { lessons: {}, preferences: {}, reviewHistory: [] };
    }
  }


  function writeLocalState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }


  function displayConcept(value) {
    return String(value || "Concept")
      .replace(/^cc\.concept\./, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }


  function displayGrade(value) {
    if (value === "again") {
      return "Needs another pass";
    }

    if (value === "developing") {
      return "Developing";
    }

    return "Solid";
  }


  function displayDate(value, includeTime) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "not scheduled";
    }

    return new Intl.DateTimeFormat(undefined, includeTime ? {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    } : {
      weekday: "short",
      month: "short",
      day: "numeric"
    }).format(date);
  }


  function localDay(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }


  function dailyLimit(state) {
    const value = Number(state.preferences.reviewDailyLimit);
    return [5, 10, 15, 20].includes(value) ? value : DEFAULT_DAILY_LIMIT;
  }


  function reviewsCompletedToday(state) {
    const today = localDay(new Date());
    const reviewedItems = new Set();

    state.reviewHistory.forEach(function (entry) {
      if (entry.itemId && localDay(entry.reviewedAt) === today) {
        reviewedItems.add(entry.itemId);
      }
    });

    Object.keys(state.lessons).forEach(function (lessonId) {
      const attempts = state.lessons[lessonId].attempts || {};
      Object.keys(attempts).forEach(function (itemId) {
        if (localDay(attempts[itemId].lastReviewedAt) === today) {
          reviewedItems.add(itemId);
        }
      });
    });

    return reviewedItems.size;
  }


  function createEmpty(message, linkLabel, linkUrl) {
    const empty = document.createElement("div");
    const copy = document.createElement("p");

    empty.className = "cc-review-empty";
    copy.textContent = message;
    empty.appendChild(copy);

    if (linkLabel && linkUrl) {
      const link = document.createElement("a");
      link.href = linkUrl;
      link.textContent = linkLabel;
      empty.appendChild(link);
    }

    return empty;
  }


  const bank = readJson(document.getElementById("cc-review-bank-data"), []);
  const confusionSets = readJson(
    document.getElementById("cc-review-confusion-data"),
    []
  );
  const bankById = new Map(bank.map(function (item) {
    return [item.itemId, item];
  }));
  const confusionByConcept = new Map();

  confusionSets.forEach(function (confusionSet) {
    (confusionSet.concept_ids || []).forEach(function (conceptId) {
      const memberships = confusionByConcept.get(conceptId) || [];
      memberships.push(confusionSet);
      confusionByConcept.set(conceptId, memberships);
    });
  });

  const practice = root.querySelector("[data-review-practice]");
  const practiceForm = root.querySelector("[data-review-practice-form]");
  const practiceFeedback = root.querySelector("[data-review-practice-feedback]");
  const practiceStatus = root.querySelector("[data-review-practice-status]");
  const saveStatus = root.querySelector("[data-review-save-status]");
  const dailyLimitControl = root.querySelector("[data-review-daily-limit]");
  let activeItemId = null;
  let activeReview = null;


  function createReviewRow(review, due) {
    const article = document.createElement("article");
    const copy = document.createElement("div");
    const meta = document.createElement("span");
    const title = document.createElement("h3");
    const prompt = document.createElement("p");
    const action = due
      ? document.createElement("button")
      : document.createElement("a");

    article.className = "cc-review-row";
    meta.textContent = review.pathwayTitle + " · "
      + (due ? "Due " : "Scheduled ") + displayDate(review.dueAt);
    title.textContent = displayConcept(review.conceptId);
    prompt.textContent = review.prompt;

    if (due) {
      action.type = "button";
      action.dataset.reviewItem = review.itemId;
      action.textContent = review.itemId === activeItemId
        ? "Reviewing now"
        : "Practice now →";
      action.setAttribute("aria-pressed", String(review.itemId === activeItemId));
    } else {
      action.href = review.lessonUrl + "#" + review.anchor;
      action.textContent = "Open lesson →";
    }

    copy.append(meta, title, prompt);
    article.append(copy, action);
    return article;
  }


  function createHistoryRow(entry) {
    const item = bankById.get(entry.itemId);
    const article = document.createElement("article");
    const copy = document.createElement("div");
    const meta = document.createElement("span");
    const title = document.createElement("h3");
    const detail = document.createElement("p");

    article.className = "cc-review-row cc-review-history-row";
    meta.textContent = displayDate(entry.reviewedAt, true);
    title.textContent = displayConcept(entry.conceptId);
    detail.textContent = displayGrade(entry.grade) + " · next review "
      + displayDate(entry.nextDueAt);
    copy.append(meta, title, detail);
    article.appendChild(copy);

    if (item) {
      const link = document.createElement("a");
      link.href = item.lessonUrl;
      link.textContent = "Open lesson →";
      article.appendChild(link);
    }

    return article;
  }


  function collectReviews(state) {
    const reviews = [];

    Object.keys(state.lessons || {}).forEach(function (lessonId) {
      const attempts = state.lessons[lessonId].attempts || {};

      Object.keys(attempts).forEach(function (itemId) {
        const attempt = attempts[itemId];
        const item = bankById.get(itemId);

        if (!attempt.dueAt || !item) {
          return;
        }

        reviews.push({
          ...item,
          dueAt: attempt.dueAt,
          selfGrade: attempt.lastReviewGrade || attempt.selfGrade,
          confidence: attempt.lastReviewConfidence || attempt.confidence,
          difficulty: attempt.difficulty,
          anchor: itemId.includes("application")
            ? "lesson-application-title"
            : "lesson-retrieval-title"
        });
      });
    });

    return reviews.sort(function (left, right) {
      return new Date(left.dueAt) - new Date(right.dueAt);
    });
  }


  function setPractice(review, queueIndex, queueTotal, completedToday) {
    const points = root.querySelector("[data-review-practice-points]");
    const contrast = root.querySelector("[data-review-contrast]");
    const confusionSet = (confusionByConcept.get(review.conceptId) || [])[0];

    activeReview = review;
    practice.hidden = false;
    root.querySelector("[data-review-practice-meta]").textContent =
      review.lessonTitle + " · Due " + displayDate(review.dueAt);
    root.querySelector("[data-review-practice-concept]").textContent =
      displayConcept(review.conceptId);
    root.querySelector("[data-review-practice-progress]").textContent =
      completedToday + " done · " + (queueTotal - queueIndex) + " left today";
    root.querySelector("[data-review-practice-prompt]").textContent = review.prompt;
    root.querySelector("[data-review-practice-answer]").textContent = review.modelAnswer;
    root.querySelector("[data-review-practice-source]").textContent = review.sourcePointer;

    if (confusionSet) {
      contrast.hidden = false;
      root.querySelector("[data-review-contrast-title]").textContent = confusionSet.title;
      root.querySelector("[data-review-contrast-cue]").textContent = confusionSet.cue;
    } else {
      contrast.hidden = true;
    }

    points.replaceChildren();
    (review.feedbackPoints || []).forEach(function (point) {
      const item = document.createElement("li");
      item.textContent = point;
      points.appendChild(item);
    });
    practiceForm.reset();
    practiceFeedback.hidden = true;
    practiceStatus.textContent = "Feedback unlocks after an attempt.";
    saveStatus.textContent = "";
  }


  function renderHistory(state) {
    const list = root.querySelector("[data-review-history-list]");
    const history = state.reviewHistory
      .slice()
      .sort(function (left, right) {
        return new Date(right.reviewedAt) - new Date(left.reviewedAt);
      })
      .slice(0, 8);

    list.replaceChildren();

    if (!history.length) {
      list.appendChild(createEmpty(
        "Completed reviews will appear here without storing response text in the history.",
        "Open a pathway →",
        "/learn/pathways/"
      ));
      return;
    }

    history.forEach(function (entry) {
      list.appendChild(createHistoryRow(entry));
    });
  }


  function render() {
    const state = readLocalState();
    const now = new Date();
    const reviews = collectReviews(state);
    const dueReviews = reviews.filter(function (review) {
      return new Date(review.dueAt) <= now;
    });
    const upcomingReviews = reviews.filter(function (review) {
      return new Date(review.dueAt) > now;
    });
    const limit = dailyLimit(state);
    const completedToday = reviewsCompletedToday(state);
    const capacity = Math.max(0, limit - completedToday);
    const queue = buildInterleavedQueue(
      dueReviews,
      capacity,
      now,
      confusionSets
    );
    const dueList = root.querySelector("[data-review-due-list]");
    const upcomingList = root.querySelector("[data-review-upcoming-list]");
    const backlog = Math.max(0, dueReviews.length - queue.length);

    dailyLimitControl.value = String(limit);

    if (!queue.some(function (review) { return review.itemId === activeItemId; })) {
      activeItemId = queue.length ? queue[0].itemId : null;
    }

    root.querySelector("[data-review-due-count]").textContent = String(dueReviews.length);
    root.querySelector("[data-review-session-count]").textContent = String(queue.length);
    root.querySelector("[data-review-upcoming-count]").textContent = String(upcomingReviews.length);
    root.querySelector("[data-review-backlog]").textContent = backlog
      ? backlog + (backlog === 1 ? " due item is" : " due items are")
        + " outside today's limit. They remain due and will return in the next session."
      : completedToday
        ? completedToday + (completedToday === 1 ? " review completed" : " reviews completed")
          + " today."
        : "Related concepts are placed next to one another when they are both due, while repeated prompts from the same lesson are separated.";
    dueList.replaceChildren();
    upcomingList.replaceChildren();

    if (queue.length) {
      const queueIndex = queue.findIndex(function (review) {
        return review.itemId === activeItemId;
      });

      setPractice(queue[queueIndex], queueIndex, queue.length, completedToday);
      queue.forEach(function (review) {
        dueList.appendChild(createReviewRow(review, true));
      });
    } else {
      activeReview = null;
      practice.hidden = true;
      dueList.appendChild(createEmpty(
        dueReviews.length
          ? "Today's review limit is complete. Raise the limit above if you want to continue now."
          : "Nothing is due. Complete a lesson checkpoint or return when the next scheduled concept is ready.",
        dueReviews.length ? null : "Browse guided pathways →",
        dueReviews.length ? null : "/learn/pathways/"
      ));
    }

    if (upcomingReviews.length) {
      upcomingReviews.slice(0, 20).forEach(function (review) {
        upcomingList.appendChild(createReviewRow(review, false));
      });
    } else {
      upcomingList.appendChild(createEmpty(
        "No later reviews are scheduled on this device.",
        "Browse pathways →",
        "/learn/pathways/"
      ));
    }

    renderHistory(state);
  }


  root.addEventListener("click", function (event) {
    const button = event.target.closest("[data-review-item]");

    if (!button) {
      return;
    }

    activeItemId = button.dataset.reviewItem;
    render();
    practice.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start"
    });
  });


  dailyLimitControl.addEventListener("change", function () {
    const state = readLocalState();
    state.preferences.reviewDailyLimit = Number(dailyLimitControl.value);
    writeLocalState(state);
    activeItemId = null;
    render();
  });


  practiceForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!activeReview || !practiceForm.reportValidity()) {
      return;
    }

    practiceFeedback.hidden = false;
    practiceStatus.textContent =
      "Feedback revealed. Compare it with your response, then rate today's recall.";
    practiceFeedback.focus({ preventScroll: true });
    practiceFeedback.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest"
    });
  });


  practiceForm.querySelectorAll("[data-review-grade]").forEach(function (button) {
    button.addEventListener("click", function () {
      const selectedConfidence = practiceForm.querySelector(
        'input[name="review-practice-confidence"]:checked'
      );

      if (!activeReview || practiceFeedback.hidden || !selectedConfidence) {
        practiceStatus.textContent =
          "Write an answer and reveal feedback before rescheduling this item.";
        return;
      }

      const state = readLocalState();
      const lesson = state.lessons[activeReview.lessonId] || { attempts: {} };
      const attempt = (lesson.attempts || {})[activeReview.itemId];

      if (!attempt) {
        saveStatus.textContent = "This review could not be matched to its lesson attempt.";
        return;
      }

      const grade = button.dataset.reviewGrade;
      const schedule = adaptiveSchedule(attempt, grade);
      const reviewedAt = new Date();
      const dueAt = new Date(reviewedAt);

      dueAt.setDate(dueAt.getDate() + schedule.stabilityDays);
      lesson.attempts = lesson.attempts || {};
      attempt.lastReviewResponse = practiceForm
        .querySelector("[data-review-practice-response]").value.trim();
      attempt.lastReviewConfidence = selectedConfidence.value;
      attempt.lastReviewGrade = grade;
      attempt.lastReviewedAt = reviewedAt.toISOString();
      attempt.reviewCount = Number(attempt.reviewCount || 0) + 1;
      attempt.stabilityDays = schedule.stabilityDays;
      attempt.difficulty = schedule.difficulty;
      attempt.selfGrade = grade;
      attempt.dueAt = dueAt.toISOString();
      lesson.lastActiveAt = reviewedAt.toISOString();
      state.lessons[activeReview.lessonId] = lesson;
      state.reviewHistory.unshift({
        itemId: activeReview.itemId,
        lessonId: activeReview.lessonId,
        conceptId: activeReview.conceptId,
        reviewedAt: reviewedAt.toISOString(),
        grade: grade,
        confidence: selectedConfidence.value,
        nextDueAt: dueAt.toISOString()
      });
      state.reviewHistory = state.reviewHistory.slice(0, 100);

      if (!writeLocalState(state)) {
        saveStatus.textContent =
          "Browser storage is unavailable, so this review was not rescheduled.";
        return;
      }

      saveStatus.textContent =
        "Review saved. This concept will return " + displayDate(dueAt) + ".";
      activeItemId = null;
      window.setTimeout(render, 700);
    });
  });


  render();
}());
