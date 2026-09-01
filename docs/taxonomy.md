# Taxonomy governance

Continental Communist uses a controlled vocabulary, not open-ended tags. The canonical records live in `_topics/` and `_people/`; fixed editorial facets live in `_data/taxonomy.yml`. Content editors select those values through Sveltia CMS relation or select fields.

## Classification model

- **Topics** describe the durable subjects of an item. Assign one to five. Put the most important topic first.
- **People** are canonical identities used for bylines, editors, bibliographic creators, speakers, guests, and related people.
- **Thinkers** use the same People authority and identify figures substantially discussed or assigned in a learning product.
- **Regions** describe geographic scope, not incidental mentions.
- **Historical periods** describe the main period analyzed. Use `Multiple periods` only when a work genuinely spans several eras.
- **Difficulty** describes the background needed to use the item, not the complexity of its subject.
- **Format, content type, and language** use the fixed values in `_data/taxonomy.yml`.

Jekyll `tags` and ad hoc `categories` are not part of the model. Synonyms belong on the canonical Topic record and alternate names belong on the canonical Person record.

## Creating a topic

Create a topic only when all of these are true:

1. At least three published or commissioned items will use it within twelve months.
2. No existing topic or synonym expresses the same reader need.
3. The topic has a concise definition, a stable parent family, and a clear distinction from adjacent topics.
4. An editor has identified which existing items should be migrated to it.

Prefer a broader existing topic plus a more specific Concept record when the proposed term is primarily a definition rather than an archive destination.

## Naming and hierarchy

- Use a short noun or established noun phrase, in title case.
- Keep public names stable. Add former or alternate wording to `synonyms` instead of renaming casually.
- Every non-root topic has exactly one browsing parent. Cross-cutting relationships belong in `related_topics`.
- Do not encode a region, period, language, person, or format as a topic; use its dedicated facet.
- Do not create separate singular, plural, acronym, or spelling variants.

## Review and retirement

The editorial team reviews the vocabulary quarterly. The review checks unused topics, near-duplicates, overbroad assignments, missing synonyms, broken relations, and terms that should be Concepts instead. When merging topics, preserve the retired URL with a redirect and migrate every content reference before deleting the old record.

Run the integrity check before publishing taxonomy changes:

```sh
ruby scripts/validate_taxonomy.rb
```
