export const DAY_MS = 24 * 60 * 60 * 1000;


export function adaptiveSchedule(attempt, grade) {
  const previousStability = Math.max(
    1,
    Number(attempt.stabilityDays || (attempt.selfGrade === "solid" ? 7 : 3))
  );
  const previousDifficulty = Math.min(
    1,
    Math.max(0, Number(attempt.difficulty || 0.6))
  );
  let stabilityDays;
  let difficulty;

  if (grade === "again") {
    stabilityDays = 1;
    difficulty = Math.min(1, previousDifficulty + 0.15);
  } else if (grade === "developing") {
    stabilityDays = Math.max(2, Math.round(previousStability * 1.45));
    difficulty = Math.min(1, previousDifficulty + 0.04);
  } else {
    stabilityDays = Math.max(4, Math.round(previousStability * 2.2));
    difficulty = Math.max(0, previousDifficulty - 0.08);
  }

  return {
    stabilityDays: Math.min(180, stabilityDays),
    difficulty: Number(difficulty.toFixed(2))
  };
}


export function masteryScore(attempt, now) {
  const grade = attempt.lastReviewGrade || attempt.selfGrade;
  const confidence = attempt.lastReviewConfidence || attempt.gradedConfidence || attempt.confidence;
  const base = grade === "solid" ? 0.84 : grade === "developing" ? 0.62 : 0.34;
  const reviewGain = Math.min(0.08, Number(attempt.reviewCount || 0) * 0.02);
  const confidenceChange = confidence === "high" ? 0.03 : confidence === "low" ? -0.05 : 0;
  const dueAt = new Date(attempt.dueAt);
  const stability = Math.max(1, Number(attempt.stabilityDays || 3));
  const overdueDays = Number.isNaN(dueAt.getTime())
    ? 0
    : Math.max(0, (now - dueAt) / DAY_MS);
  const overduePenalty = Math.min(0.25, (overdueDays / stability) * 0.12);

  return Math.max(
    0.2,
    Math.min(0.95, base + reviewGain + confidenceChange - overduePenalty)
  );
}


function conceptMembership(confusionSets) {
  const membership = new Map();

  confusionSets.forEach(function (confusionSet) {
    (confusionSet.concept_ids || []).forEach(function (conceptId) {
      const memberships = membership.get(conceptId) || [];
      memberships.push(confusionSet.id);
      membership.set(conceptId, memberships);
    });
  });

  return membership;
}


function sharesConfusionSet(left, right, membership) {
  const leftSets = membership.get(left.conceptId) || [];
  const rightSets = new Set(membership.get(right.conceptId) || []);
  return leftSets.some(function (setId) { return rightSets.has(setId); });
}


function reviewPriority(review, previous, now, membership) {
  const daysOverdue = Math.max(0, (now - new Date(review.dueAt)) / DAY_MS);
  const gradeWeight = review.selfGrade === "again"
    ? 4
    : review.selfGrade === "developing" ? 2 : 0;
  const confidenceWeight = review.confidence === "low" ? 1.5 : 0;
  let score = Math.min(10, daysOverdue) + gradeWeight
    + confidenceWeight + Number(review.difficulty || 0);

  if (previous) {
    score += review.conceptId !== previous.conceptId ? 1 : -3;
    score += review.lessonId !== previous.lessonId ? 0.5 : -1;
    score += review.pathwayId !== previous.pathwayId ? 0.5 : 0;
    score += sharesConfusionSet(previous, review, membership) ? 3 : 0;
  }

  return score;
}


export function buildInterleavedQueue(dueReviews, capacity, now, confusionSets) {
  const membership = conceptMembership(confusionSets);
  const remaining = dueReviews.slice();
  const queue = [];

  while (remaining.length && queue.length < capacity) {
    const previous = queue[queue.length - 1];
    let bestIndex = 0;
    let bestScore = -Infinity;

    remaining.forEach(function (review, index) {
      const score = reviewPriority(review, previous, now, membership);
      const bestDue = new Date(remaining[bestIndex].dueAt);
      const currentDue = new Date(review.dueAt);

      if (score > bestScore || (score === bestScore && currentDue < bestDue)) {
        bestScore = score;
        bestIndex = index;
      }
    });

    queue.push(remaining.splice(bestIndex, 1)[0]);
  }

  return queue;
}
