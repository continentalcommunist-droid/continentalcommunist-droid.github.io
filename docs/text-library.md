# Primary-text library and MIA import policy

Continental Communist hosts selected primary texts in a local, accessible reader. The import is deliberately not a blanket mirror of the Marxists Internet Archive (MIA): Marx's original writings are old enough to be public domain, but particular English translations, introductions, annotations, and collected editions may still be copyrighted.

## Current rights-reviewed corpus

The approved manifest in `scripts/data/marx_mia_core.json` currently contains:

- Karl Marx, *Theses on Feuerbach*
- Karl Marx and Friedrich Engels, *Manifesto of the Communist Party*
- Karl Marx, *Wage Labour and Capital*
- Karl Marx, *Value, Price and Profit*
- Karl Marx, *Capital, Volume I*
- Karl Marx, *The Civil War in France*

These six works comprise 62 locally hosted reading sections. Each generated section records its exact MIA URL, source edition, rights basis, license URL, rights-review date, raw-source fingerprint, and normalized-content fingerprint.

The current corpus uses one of two approved bases:

1. The MIA page explicitly grants reuse under its Creative Commons Attribution-ShareAlike license.
2. The English source edition was published no later than 1930 and is public domain in the United States, while MIA's volunteer transcription and markup are reused under its Attribution-ShareAlike terms.

MIA's [Terms of Use](https://www.marxists.org/admin/legal/terms-of-use.htm) place responsibility for edition-level rights on the republisher and require archive credit and a source URL. Its [Charter](https://www.marxists.org/admin/legal/charter.htm) distinguishes public-domain material from works hosted under limited permission, and its [copyright guidance](https://www.marxists.org/admin/legal/corights.htm) requires separate permission for copyrighted material. The importer follows MIA's [FAQ guidance](https://www.marxists.org/admin/janitor/faq.htm) by using a descriptive user agent and pausing between requests.

## Deliberately excluded editions

Do not add a work merely because Marx wrote the original. Modern translations hosted by MIA can carry their own copyright. The present manifest therefore excludes the currently available English editions of *The German Ideology*, the *Economic and Philosophic Manuscripts of 1844*, *Grundrisse*, *The Eighteenth Brumaire of Louis Bonaparte*, *A Contribution to the Critique of Political Economy*, *The Poverty of Philosophy*, and *Critique of the Gotha Programme* until the exact translation and editorial rights are cleared or a demonstrably public-domain translation is selected.

MECW-derived pages are categorically blocked. The importer also stops if a source page reports that it is unavailable, identifies a copyright or fair-use restriction, lacks the recorded rights evidence, contains an unreviewed image, or uses a source edition too recent for the public-domain rule.

## Import and validation workflow

Install dependencies, verify the live rights evidence, import, build, and run the local integrity check:

```sh
npm ci
npm run check:marx-import
npm run import:marx
npm run validate:texts
npm run build
npm run validate:formatting
ruby scripts/validate_seo.rb
```

`npm run check:marx-import` makes the same rate-limited source requests and performs extraction checks without writing files. `npm run import:marx` writes book records to `_books/` and generated sections to `_text_chapters/`. Generated sections must never be hand-edited; change the approved manifest or the importer and regenerate instead.

Before adding a new work, record the exact edition, translator or editor, first publication year of that translation, source URL, rights basis, and literal evidence strings present on the MIA page. If any of those points are ambiguous, do not import the text.
