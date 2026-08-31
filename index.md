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
