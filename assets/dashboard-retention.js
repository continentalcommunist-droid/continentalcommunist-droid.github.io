import { masteryScore } from "./retention-model.mjs";

(function () {
  "use strict";

  const STORAGE_KEY = "continental-communist-retention-v1";
  const root = document.querySelector("[data-account-root]");

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


  function readState() {
    try {
      const state = readJson(
        { textContent: window.localStorage.getItem(STORAGE_KEY) },
        { lessons: {} }
      );

      state.lessons = state.lessons && typeof state.lessons === "object"
        ? state.lessons
        : {};
      return state;
    } catch (error) {
      return { lessons: {} };
    }
  }


  function displayConcept(value) {
    return String(value || "Concept")
      .replace(/^cc\.concept\./, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }


  function collectAttempts(state, lessonById) {
    const attempts = [];

    Object.keys(state.lessons).forEach(function (lessonId) {
      const lessonState = state.lessons[lessonId];
      const lesson = lessonById.get(lessonId);

      Object.keys(lessonState.attempts || {}).forEach(function (itemId) {
        const attempt = lessonState.attempts[itemId];

        if (!attempt.selfGrade) {
          return;
        }

        attempts.push({
          ...attempt,
          itemId: itemId,
          lesson: lesson,
          lessonId: lessonId
        });
      });
    });

    return attempts;
  }


  function createEmpty(message) {
    const empty = document.createElement("p");
    empty.className = "cc-dashboard-retention-empty";
    empty.textContent = message;
    return empty;
  }


  function createMasteryRow(concept) {
    const row = document.createElement("div");
    const heading = document.createElement("div");
    const label = document.createElement("span");
    const score = document.createElement("strong");
    const track = document.createElement("div");
    const bar = document.createElement("span");

    row.className = "cc-dashboard-mastery-row";
    label.textContent = displayConcept(concept.conceptId);
    score.textContent = concept.score + "%";
    heading.append(label, score);
    track.className = "cc-dashboard-mastery-track";
    track.setAttribute("role", "progressbar");
    track.setAttribute("aria-label", displayConcept(concept.conceptId) + " mastery estimate");
    track.setAttribute("aria-valuemin", "0");
    track.setAttribute("aria-valuemax", "100");
    track.setAttribute("aria-valuenow", String(concept.score));
    bar.style.width = concept.score + "%";
    track.appendChild(bar);
    row.append(heading, track);
    return row;
  }


  function createAttentionRow(concept) {
    const row = document.createElement("article");
    const copy = document.createElement("div");
    const title = document.createElement("h5");
    const detail = document.createElement("p");
    const link = document.createElement("a");

    row.className = "cc-dashboard-attention-row";
    title.textContent = displayConcept(concept.conceptId);
    detail.textContent = concept.againCount
      ? concept.againCount + (concept.againCount === 1 ? " recent difficult rating" : " recent difficult ratings")
      : "Low confidence on the latest attempt";
    copy.append(title, detail);
    link.href = "/learn/review/";
    link.textContent = concept.due ? "Practice →" : "Review plan →";
    row.append(copy, link);
    return row;
  }


  const lessons = readJson(document.getElementById("cc-learning-dashboard-data"), []);
  const lessonById = new Map(lessons.map(function (lesson) {
    return [lesson.lessonId, lesson];
  }));


  function render() {
    const state = readState();
    const now = new Date();
    const attempts = collectAttempts(state, lessonById);
    const due = attempts.filter(function (attempt) {
      const date = new Date(attempt.dueAt);
      return !Number.isNaN(date.getTime()) && date <= now;
    });
    const dueCount = due.length;
    const dueMinutes = dueCount * 2;
    const dueTitle = root.querySelector("[data-dashboard-due-title]");
    const dueDetail = root.querySelector("[data-dashboard-due-detail]");
    const reviewLink = root.querySelector("[data-dashboard-review-link]");

    root.querySelector("[data-dashboard-due-count]").textContent = String(dueCount);
    dueTitle.textContent = dueCount
      ? dueCount + (dueCount === 1 ? " review is due" : " reviews are due")
      : "Nothing due right now";
    dueDetail.textContent = dueCount
      ? "About " + dueMinutes + " minutes at the default pace. Your daily limit controls how many enter the session."
      : attempts.length
        ? "Your next scheduled concepts are waiting in the review plan."
        : "Your review queue will fill after you rate lesson checkpoints.";
    reviewLink.textContent = dueCount ? "Review now →" : "Open review plan →";

    const recentLesson = Object.keys(state.lessons).map(function (lessonId) {
      return {
        lesson: lessonById.get(lessonId),
        lastActiveAt: state.lessons[lessonId].lastActiveAt
          || state.lessons[lessonId].startedAt
      };
    }).filter(function (entry) {
      return entry.lesson && entry.lastActiveAt;
    }).sort(function (left, right) {
      return new Date(right.lastActiveAt) - new Date(left.lastActiveAt);
    })[0];

    if (recentLesson) {
      root.querySelector("[data-dashboard-continue-pathway]").textContent =
        recentLesson.lesson.pathwayTitle;
      root.querySelector("[data-dashboard-continue-title]").textContent =
        recentLesson.lesson.unitLabel + " " + recentLesson.lesson.unitNumber
          + ": " + recentLesson.lesson.lessonTitle;
      root.querySelector("[data-dashboard-continue-detail]").textContent =
        "Resume the most recently active guided lesson on this device.";
      const continueLink = root.querySelector("[data-dashboard-continue-link]");
      continueLink.href = recentLesson.lesson.lessonUrl;
      continueLink.textContent = "Continue →";
    }

    const concepts = new Map();
    attempts.forEach(function (attempt) {
      const conceptId = attempt.conceptId;
      const current = concepts.get(conceptId) || {
        conceptId: conceptId,
        scores: [],
        againCount: 0,
        lowConfidence: false,
        due: false
      };

      current.scores.push(masteryScore(attempt, now));
      current.againCount += (attempt.lastReviewGrade || attempt.selfGrade) === "again" ? 1 : 0;
      current.lowConfidence = current.lowConfidence
        || (attempt.lastReviewConfidence || attempt.confidence) === "low";
      current.due = current.due || due.some(function (dueAttempt) {
        return dueAttempt.itemId === attempt.itemId;
      });
      concepts.set(conceptId, current);
    });

    const conceptRows = Array.from(concepts.values()).map(function (concept) {
      concept.score = Math.round(
        concept.scores.reduce(function (sum, score) { return sum + score; }, 0)
          / concept.scores.length * 100
      );
      return concept;
    }).sort(function (left, right) {
      return left.score - right.score;
    });
    const masteryList = root.querySelector("[data-dashboard-mastery-list]");
    const attentionList = root.querySelector("[data-dashboard-attention-list]");
    const attentionRows = conceptRows.filter(function (concept) {
      return concept.againCount || concept.lowConfidence;
    });

    masteryList.replaceChildren();
    attentionList.replaceChildren();

    if (conceptRows.length) {
      conceptRows.slice(0, 4).forEach(function (concept) {
        masteryList.appendChild(createMasteryRow(concept));
      });
    } else {
      masteryList.appendChild(createEmpty(
        "Rate a retrieval checkpoint to begin a concept-level mastery estimate."
      ));
    }

    if (attentionRows.length) {
      attentionRows.slice(0, 4).forEach(function (concept) {
        attentionList.appendChild(createAttentionRow(concept));
      });
    } else {
      attentionList.appendChild(createEmpty(
        attempts.length
          ? "No recent difficult or low-confidence ratings on this device."
          : "Concepts rated difficult or low-confidence will appear here."
      ));
    }
  }


  render();
  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) {
      render();
    }
  });
}());
