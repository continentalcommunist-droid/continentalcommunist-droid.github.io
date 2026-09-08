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
6. Complete three missing analytical steps in a different, partially worked case and compare them with explanatory feedback.
7. Apply the method to an unfamiliar case without supplied steps.
8. Self-assess both independent explanations and schedule each item to return.

The pathway completion checkbox remains separate from the checkpoint record. Completion answers “did I finish the assigned activity?” while the checkpoint record answers “what could I explain, how confident was I, and when should this return?”

## Worked, guided, independent

All 16 guided lessons now include a six-minute partially completed example between the fully worked example and the independent application. The examples use distinct hypothetical cases, two supplied opening steps, and three learner-completed steps. Feedback requires a substantive response in every field and a confidence judgment. Each missing step has its own model completion, followed by explicit self-checks and a source pointer.

Author the `faded_example` object in the Lessons editor. It requires an immutable item ID (`cc.item.<pathway>.week-<NN>.faded-01`), `estimated_minutes`, `min_length`, `claim`, `provided_steps` (`label`, `text`), `completion_steps` (`id`, `label`, `prompt`, `model_answer`), `feedback_points`, and `source_pointer`. Step keys must be unique within the example and must remain stable after publication. The build validates the structure, limits, and identifiers. The lesson's total time includes the guided activity.

The browser saves these responses under the lesson's `fadedExamples` map, separately from independently rated `attempts`. Restoring or revising a guided response never adds a review item or changes the mastery estimate. The two independent checkpoints remain the requirement for recording the pathway step; previously completed lessons keep their completion state.

An independently revised answer must be rated again. Until then, its latest graded confidence and existing review schedule remain intact. Correcting an initial rating adjusts the initial interval from a fixed first-rating date; lesson revisions after spaced review preserve the accumulated stability, difficulty, and due date. Continued scheduling happens in the review center.

If browser storage fails, responses and ratings remain usable for the current page visit and a visible status explains that they will be lost on leaving. The page does not claim that an unsaved review has been scheduled.

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
- Guided-example feedback requires every missing step and confidence; edits require a new comparison.
- Guided responses remain outside the independent mastery and review records.
- A submitted revision requires a new independent rating without resetting accumulated review history.
- If browser storage is unavailable, learners can still practice and rate during the current page visit and see an explicit unsaved-state message.
- Both checkpoints must be self-assessed before the completion control is enabled.
- Scheduled items can be attempted, compared, and rescheduled inside the review center without transmitting private learning data.
- Stable-ID and privacy-contract validation passes in the production build.

Run `npm run build` and `npm run test:lessons` to check the actual lesson pages in an isolated headless browser. The regression suite reuses the existing Lighthouse browser dependencies and blocks external requests, so it does not contact the production learner account service. Follow with the repository formatting and content validators. Automated checks do not substitute for the audit's assistive-technology acceptance scenarios.

## September 8 implementation checks

- Production build and all five browser regression tests pass. All 16 lessons fit a 320px viewport; the two representative guided forms also fit with feedback revealed.
- Formatting, learner-platform contract, SEO, taxonomy, and primary-text validators pass.
- Fundamentals Week 4 and Capital Module 6 each pass the existing mobile performance thresholds and transfer budgets across three runs using the release runner's compressed serving behavior. Both have a median performance score of 99, LCP of approximately 1.81 seconds, CLS of 0, and TBT of 0 ms. Both score 100 on Lighthouse's automated accessibility checks after correcting the mobile menu label. These are local lab results; formal assistive-technology and field checks remain outstanding.
- The unrelated existing citation check still fails on reference 2 in `_posts/2026-09-03-on-artificial-intelligence.md`: the Engels title and author are present, but no source or text identifier is attached. The article was not changed during this learning release.

The next curriculum step is to broaden high-value retrieval and review items into the ten remaining pathways. Other outstanding work includes a formal accessibility and mobile-performance pass, operational cross-device review sync, and a separately reviewed first-party opt-in telemetry implementation. The public account configuration is present; successful production authentication and sync must be established through operational tests rather than inferred from the older audit's disabled-account observation.
