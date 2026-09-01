# Citations and evidence

Continental Communist treats citation infrastructure as a public product feature, not an invisible editorial convention. Each source is a normalized record in _sources/; articles attach those records through ordered references and explain what each source establishes.

## Source hierarchy

Use the strongest available evidence for the claim:

1. Primary documents, official data, original records, and direct testimony.
2. Peer-reviewed research and major scholarly work.
3. High-quality reporting for current events.
4. Ideological or advocacy publications as evidence of their stated positions, not as unquestioned factual authority.

A source's presence does not prove every claim in an article. The reference-level evidence role and note must state how the source is being used and any material limitation.

## Source records

Create a Source / Reference record in Sveltia CMS before attaching it to an article. A record includes:

- a stable lowercase citation key;
- named or organizational authorship;
- title, container, publisher, and publication date;
- edition, volume, issue, and page metadata where applicable;
- canonical URL, bare DOI, ISBN, and access date;
- source type, primary-source status, language, topics, and provenance;
- a short reader summary and only a copyright-permitted excerpt.

Never use the same source key for different works. Do not change a published key merely to improve its style.

## Article references

Each article reference selects a canonical source and records:

- **Direct evidence** for a factual claim;
- **Primary context** from an original historical or institutional record;
- **Background / context** that establishes relevant history or concepts;
- **Counterevidence** that complicates or challenges the article;
- **Method / data** describing evidence construction or analysis;
- **Further reading** that extends the argument without serving as direct support.

Add a pinpoint locator whenever the work has stable pages, sections, chapters, timestamps, tables, or dataset fields. The evidence note must say what the source establishes and identify important limits.

To place a numbered citation in Markdown, reference the source filename without its extension:

    {% include cite.html source="federalist-number-10" %}

The displayed number follows the source's position in the article's references list, so reordering the list does not require renumbering the article.

## Public exports

Every article exposes a plain-text citation plus BibTeX and RIS downloads for the article itself. When references are present, readers can also copy the complete bibliography or download all source records as BibTeX or RIS. Public source pages expose the same exports for an individual record.

Before publishing citation changes, run:

    ruby scripts/validate_citations.rb

The validator rejects duplicate keys, unknown authors or topics, malformed identifiers, missing access dates, uncontrolled evidence roles, broken source relations, and inline citations that do not exist in the article's structured reference list.
