---
layout: hub
title: Analysis
permalink: /analysis/
section_key: analysis
kicker: Interpretation and argument
description: Evidence-rich essays on American political economy, history, institutions, technology, labor, and the world system.
---

## Latest analysis

{% assign analysis_posts = site.posts | where: "section", "analysis" %}
{% if analysis_posts.size > 0 %}
  {% for post in analysis_posts %}
  <article class="cc-hub-post">
    <div class="cc-date">{{ post.date | date: "%B %-d, %Y" }}</div>
    <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
    {% if post.excerpt %}
    <div class="cc-hub-post-excerpt">{{ post.excerpt | strip_html | truncate: 240 }}</div>
    {% endif %}
  </article>
  {% endfor %}
{% else %}
  <div class="cc-empty-state">
    <p>New analysis will appear here as it is published.</p>
  </div>
{% endif %}
