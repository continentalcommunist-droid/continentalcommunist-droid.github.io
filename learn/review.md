---
layout: default
title: Review
permalink: /learn/review/
section_key: learn
section: learn
content_type: Learning Review
description: Return to concepts after a delay and see what you can still explain without reopening the source.
updated: 2026-09-08
---

<article class="cc-review-center" data-review-center>
  <nav class="cc-breadcrumbs" aria-label="Breadcrumb">
    <a href="{{ '/' | relative_url }}">Home</a>
    <span aria-hidden="true">/</span>
    <a href="{{ '/learn/' | relative_url }}">Learn</a>
    <span aria-hidden="true">/</span>
    <span aria-current="page">Review</span>
  </nav>

  <header class="cc-review-header">
    <div class="cc-section-kicker">Retention practice</div>
    <h1>Review what is beginning to fade.</h1>
    <p>Answer one due prompt from memory, compare your explanation with the source-grounded feedback, then decide when it should return. The schedule lengthens or shortens in response to each result.</p>
  </header>

  <section class="cc-review-privacy" aria-labelledby="review-privacy-title">
    <div>
      <div class="cc-section-kicker">Private by default</div>
      <h2 id="review-privacy-title">Your practice record stays on this device.</h2>
    </div>
    <p>The pilot does not send responses, confidence, review dates, or reading activity to Continental Communist. Cross-device review synchronization will require a separate privacy-reviewed release.</p>
  </section>

  <div class="cc-review-summary" aria-live="polite">
    <div><strong data-review-due-count>0</strong><span>Due now</span></div>
    <div><strong data-review-session-count>0</strong><span>In this session</span></div>
    <div><strong data-review-upcoming-count>0</strong><span>Coming up</span></div>
  </div>

  <section class="cc-review-controls" aria-labelledby="review-controls-title">
    <div>
      <div class="cc-section-kicker">Workload</div>
      <h2 id="review-controls-title">Set a sustainable daily limit.</h2>
      <p>Overdue items remain visible in the count, but only this many enter today's interleaved session.</p>
    </div>
    <label for="review-daily-limit">
      Reviews per day
      <select id="review-daily-limit" data-review-daily-limit>
        <option value="5">5 reviews</option>
        <option value="10">10 reviews</option>
        <option value="15">15 reviews</option>
        <option value="20">20 reviews</option>
      </select>
    </label>
  </section>

  <section class="cc-review-practice" data-review-practice aria-labelledby="review-practice-title" hidden>
    <div class="cc-review-practice-heading">
      <div>
        <div class="cc-section-kicker" data-review-practice-meta>Due retrieval</div>
        <h2 id="review-practice-title" data-review-practice-concept>Concept review</h2>
      </div>
      <span data-review-practice-progress></span>
    </div>

    <form class="cc-lesson-response cc-review-practice-form" data-review-practice-form>
      <aside class="cc-review-contrast" data-review-contrast hidden>
        <span>Contrast focus</span>
        <strong data-review-contrast-title></strong>
        <p data-review-contrast-cue></p>
      </aside>

      <p class="cc-assessment-prompt" data-review-practice-prompt></p>

      <label for="review-practice-response">Your response from memory</label>
      <textarea id="review-practice-response" rows="6" minlength="40" maxlength="4000" data-review-practice-response required></textarea>

      <fieldset>
        <legend>How confident are you?</legend>
        <label><input type="radio" name="review-practice-confidence" value="low" required> Low</label>
        <label><input type="radio" name="review-practice-confidence" value="medium"> Medium</label>
        <label><input type="radio" name="review-practice-confidence" value="high"> High</label>
      </fieldset>

      <div class="cc-lesson-form-footer">
        <button type="submit">Reveal explanatory feedback</button>
        <span data-review-practice-status role="status" aria-live="polite">Feedback unlocks after an attempt.</span>
      </div>

      <section class="cc-assessment-feedback" data-review-practice-feedback hidden tabindex="-1">
        <div class="cc-section-kicker">Compare, then reschedule</div>
        <h3>Model explanation</h3>
        <p data-review-practice-answer></p>

        <h3>Look for these parts</h3>
        <ul data-review-practice-points></ul>

        <p class="cc-assessment-source-pointer" data-review-practice-source></p>

        <fieldset class="cc-self-grade">
          <legend>How well did your answer explain the idea today?</legend>
          <button type="button" data-review-grade="again">Needs another pass</button>
          <button type="button" data-review-grade="developing">Developing</button>
          <button type="button" data-review-grade="solid">Solid</button>
        </fieldset>
        <p class="cc-review-schedule" data-review-save-status role="status" aria-live="polite"></p>
      </section>
    </form>
  </section>

  <section class="cc-review-section" aria-labelledby="review-due-title">
    <div class="cc-section-kicker">Today</div>
    <h2 id="review-due-title">Today’s interleaved session</h2>
    <p class="cc-review-backlog" data-review-backlog></p>
    <div data-review-due-list></div>
  </section>

  <section class="cc-review-section" aria-labelledby="review-upcoming-title">
    <div class="cc-section-kicker">Later</div>
    <h2 id="review-upcoming-title">Upcoming reviews</h2>
    <div data-review-upcoming-list></div>
  </section>

  <section class="cc-review-section" aria-labelledby="review-history-title">
    <div class="cc-section-kicker">Recent practice</div>
    <h2 id="review-history-title">Review history</h2>
    <div data-review-history-list></div>
  </section>

  <noscript>
    <p class="cc-learning-noscript">Enable JavaScript to read the private review schedule stored in this browser.</p>
  </noscript>

  <nav class="cc-learning-next" aria-label="Continue learning">
    <a href="{{ '/learn/' | relative_url }}">← Learn</a>
    <a href="{{ '/learn/pathways/marxism-fundamentals/' | relative_url }}">Marxism Fundamentals pathway →</a>
  </nav>
</article>

{% include review-bank-data.html %}
<script type="module" src="{{ '/assets/review-center.js' | relative_url }}"></script>
