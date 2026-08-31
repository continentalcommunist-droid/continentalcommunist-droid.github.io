---
layout: default
title: Home
---

<div class="cc-hero">

  <div class="cc-kicker">
    INDEPENDENT • AMERICAN • SCIENTIFIC SOCIALIST
  </div>

  <h1>Continental Communist</h1>

  <p class="cc-deck">
    An American perspective on scientific socialism, political economy,
    history, technology, and the development of modern society.
  </p>

</div>


<section class="cc-newsletter" aria-labelledby="newsletter-title">

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
      frameborder="0"
      scrolling="no"
      loading="lazy"
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
