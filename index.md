---
layout: default
title: Home
---

# Continental Communist

Essays, commentary, and analysis.

---

## Latest Articles

{% for post in site.posts %}

### [{{ post.title }}]({{ post.url | relative_url }})

{{ post.date | date: "%B %-d, %Y" }}

{{ post.excerpt }}

[Read more →]({{ post.url | relative_url }})

{% endfor %}
