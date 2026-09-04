---
layout: default
title: Continental Communist
description: Continental Communist is an independent publication offering Marxist education, materialist analysis, briefings, and primary-source study from an American perspective.
image: /assets/images/logo.png
image_alt: "Continental Communist logo"
updated: 2026-09-02
---

<div class="cc-hero cc-hero-image">

  <h1 class="cc-hero-title">
    <img
      srcset="{{ '/assets/images/title-800.webp' | relative_url }} 800w, {{ '/assets/images/title-1600.webp' | relative_url }} 1600w"
      sizes="(max-width: 900px) 75vw, 675px"
      src="{{ '/assets/images/title-800.webp' | relative_url }}"
      alt="Continental Communist"
      width="800"
      height="699"
      decoding="async"
      fetchpriority="high"
      class="cc-title-image"
    >
  </h1>

  <div class="cc-hero-copy">
    <p>
      Independent Marxist education and materialist analysis from an American
      perspective, organized around evidence, history, and serious study.
    </p>
    <div class="cc-hero-links">
      <a href="{{ '/about/' | relative_url }}">About Continental Communist</a>
      <a href="{{ '/analysis/' | relative_url }}">Read the latest analysis</a>
    </div>
  </div>

</div>


<section class="cc-platform" aria-labelledby="platform-title">
  <div class="cc-platform-heading">
    <div>
      <div class="cc-platform-kicker">EXPLORE THE PLATFORM</div>
      <h2 id="platform-title">Choose your path.</h2>
    </div>

    <p>
      Learn systematically, interpret events, follow the evidence,
      and go deeper through one connected knowledge base.
    </p>
  </div>

  <div class="cc-platform-grid">
    {% for item in site.data.navigation.main %}
    <a class="cc-platform-card" href="{{ item.url | relative_url }}">
      <span class="cc-platform-card-number">0{{ forloop.index }}</span>
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
      <span class="cc-platform-card-link">Explore <span aria-hidden="true">→</span></span>
    </a>
    {% endfor %}
  </div>
</section>


{% assign featured_posts = site.posts | where: "featured", true %}

<section class="cc-featured" aria-labelledby="featured-title">

  <div class="cc-featured-heading">

    <div>
      <div class="cc-featured-kicker">
        SELECTED WRITING
      </div>

      <h2 id="featured-title">
        Featured
      </h2>
    </div>

    <p>
      Selected essays and analysis from Continental Communist.
    </p>

  </div>


  <div class="cc-featured-grid">

    {% if featured_posts.size > 0 %}

      {% for post in featured_posts limit: 3 %}

      <article class="cc-featured-card">

        <div class="cc-featured-card-date">
          {{ post.date | date: "%B %-d, %Y" }}
        </div>

        <h3>
          <a href="{{ post.url | relative_url }}">
            {{ post.title }}
          </a>
        </h3>

        {% if post.excerpt %}
        <div class="cc-featured-card-excerpt">
          {{ post.excerpt | strip_html | truncate: 190 }}
        </div>
        {% endif %}

        <a
          class="cc-featured-card-link"
          href="{{ post.url | relative_url }}"
          aria-label="Read {{ post.title }}"
        >
          Read article →
        </a>

      </article>

      {% endfor %}

    {% else %}

      {% for post in site.posts limit: 3 %}

      <article class="cc-featured-card">

        <div class="cc-featured-card-date">
          {{ post.date | date: "%B %-d, %Y" }}
        </div>

        <h3>
          <a href="{{ post.url | relative_url }}">
            {{ post.title }}
          </a>
        </h3>

        {% if post.excerpt %}
        <div class="cc-featured-card-excerpt">
          {{ post.excerpt | strip_html | truncate: 190 }}
        </div>
        {% endif %}

        <a
          class="cc-featured-card-link"
          href="{{ post.url | relative_url }}"
          aria-label="Read {{ post.title }}"
        >
          Read article →
        </a>

      </article>

      {% endfor %}

    {% endif %}

  </div>

</section>


<section class="cc-newsletter" id="newsletter" aria-labelledby="newsletter-title">

  <div class="cc-newsletter-copy">

    <div class="cc-newsletter-kicker">
      THE NEWSLETTER
    </div>

    <h2 id="newsletter-title">
      New articles, by email.
    </h2>

    <p>
      Subscribe to receive new Continental Communist essays
      and analysis when they are published.
    </p>

    <p class="cc-newsletter-note">
      Free. No spam. Unsubscribe at any time.
    </p>

  </div>

  <div class="cc-newsletter-form">

    <iframe
      src="https://4205196d.sibforms.com/v2/serve/MUIFALjpfba-WPr27UXLllMJhfVUESSJr2h7jY6vcdbZVTesevP-Lh9cXXxlFx1siVGywoEtY0P2zIyfD3xlRaE4ztlmtW3TtbAWpMqhS3Zm9aYEoy-p6vAh3OBdZ0fYxcXw2WQVkJVh8k73Ieks93YDBfuhcxKm3wcBYQoW8KNAXM0cwYsT0iaRVYzG1Iq8HbEYTGxoWa15ciG7Vg=="
      title="Subscribe to Continental Communist"
      loading="lazy"
      width="640"
      height="420"
    ></iframe>

  </div>

</section>


<div class="cc-section-heading">
  Latest
</div>

{% for post in site.posts %}

<article class="cc-article-card">

  <div class="cc-date">
    {{ post.date | date: "%B %-d, %Y" }}
  </div>

  <h2>
    <a href="{{ post.url | relative_url }}">
      {{ post.title }}
    </a>
  </h2>

  {% if post.excerpt %}
  <div class="cc-excerpt">
    {{ post.excerpt }}
  </div>
  {% endif %}

  <a class="cc-read-more" href="{{ post.url | relative_url }}">
    Read article →
  </a>

</article>

{% endfor %}
