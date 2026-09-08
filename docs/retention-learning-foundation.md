# Retention learning foundation

This document defines the production foundation of the retention redesign. The six-week Marxism Fundamentals pathway and ten-module Capital and Political Economy pathway now prove the content model at introductory and intermediate levels, alongside private local state, explanatory feedback, and outcome-responsive review scheduling.

## Public terminology

The public learning product uses one noun: **Pathways**. A pathway is the durable curriculum map. A lesson is the repeatable study unit inside a pathway. The unused public “Courses” destination has been removed from navigation; the internal collection remains available so older editorial data does not break.

## Stable identifiers

Identifiers are content addresses, not display labels. They must never be silently renamed when copy changes.

- `cc.pathway.<pathway-slug>` identifies a pathway.
- `cc.stage.<pathway-slug>.<stage-slug>` identifies a stage.
- `cc.lesson.<pathway-slug>.week-<two-digit-week>` identifies a lesson.
- `cc.activity.<pathway-slug>.week-<two-digit-week>.<activity-slug>` identifies a reading or other activity.
- `cc.concept.<concept-slug>` identifies knowledge that can recur across pathways.
- `cc.item.<pathway-slug>.week-<two-digit-week>.<item-slug>` identifies a retrieval or application prompt.

Every existing pathway now has an explicit versioned pathway identifier. The two guided pathways add stage, lesson, activity, concept, and item identifiers.

## Learning cycle

Each guided lesson follows one closed cycle:

1. Commit to a short pre-reading explanation.
2. Read a defined source scope with one guiding question.
3. Close the source and produce an answer from memory.
4. Reveal explanatory feedback only after an attempt and confidence judgment.
5. Study a worked analysis.
6. Apply the method to an unfamiliar case.
7. Self-assess both explanations and schedule each item to return.

The pathway completion checkbox remains separate from the checkpoint record. Completion answers “did I finish the assigned activity?” while the checkpoint record answers “what could I explain, how confident was I, and when should this return?”

## Privacy contract

The guided pathway stores warm-up text, responses, confidence, self-assessments, and review dates only in the learner's browser. It does not send them to Supabase or any analytics service. Signed-in pathway completion continues to use the existing learner account sync.

The review center is an active practice surface rather than a schedule display. It requires a new retrieval attempt and confidence judgment before showing feedback. A learner's outcome then updates the item's stability and difficulty and schedules the next review. This is a transparent, bounded pilot scheduler, not a claim of full FSRS parity.

## Interleaving and workload

The review center uses explicit confusion sets rather than random shuffling. When related concepts are due together, the queue favors a contrastive sequence while separating repeated prompts from the same concept or lesson. Six initial sets cover labor power and wage forms, use and exchange value, absolute and relative surplus value, production and realization, machinery and social knowledge, and materialism and state power.

Learners choose a daily limit of 5, 10, 15, or 20 reviews. Items beyond that limit remain due but stay outside the current session. The device-local history stores stable IDs, confidence, result bands, and dates—but never a response body.

## Mastery-first dashboard

The signed-in dashboard now leads with due reviews, the most recently active guided lesson, concept-level mastery estimates, and difficult or low-confidence concepts. Mastery is explicitly labeled as an estimate derived from self-grades, confidence, spacing, and review history rather than an objective test score. These learning details remain device-local even when pathway completion, bookmarks, and notes are synchronized.

The prospective event vocabulary lives in `_data/learning_schema.yml`, but telemetry is disabled. Any future implementation must require explicit opt-in and must reject private text, copied quotations, full URLs, search queries, and arbitrary DOM paths. The event layer may record stable content IDs and coarse outcome bands only.

## Pilot exit criteria

- The lesson works at narrow and wide widths with keyboard-operable controls.
- Feedback cannot be revealed before a response and confidence judgment.
- Reloading the page restores private local lesson state.
- Both checkpoints must be self-assessed before the completion control is enabled.
- Scheduled items can be attempted, compared, and rescheduled inside the review center without transmitting private learning data.
- Stable-ID and privacy-contract validation passes in the production build.

The next curriculum step is to add faded worked examples, broaden high-value review items into the remaining pathways, and complete a formal accessibility and mobile-performance remediation pass.
