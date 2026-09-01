#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = join(ROOT, "scripts", "data", "marx_mia_core.json");
const BOOKS_DIR = join(ROOT, "_books");
const CHAPTERS_DIR = join(ROOT, "_text_chapters");
const USER_AGENT =
  "ContinentalCommunistLibraryImporter/1.0 (+https://www.continentalcommunist.com/library/)";

const args = new Set(process.argv.slice(2));
const requestedWork = process.argv.find((argument) => argument.startsWith("--work="))?.split("=")[1];
const checkOnly = args.has("--check");

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const yamlValue = (value) => JSON.stringify(value);

function fail(message) {
  throw new Error(message);
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": USER_AGENT,
    },
    redirect: "follow",
  });

  if (!response.ok) {
    fail(`${url} returned HTTP ${response.status}`);
  }

  const bytes = await response.arrayBuffer();
  const declaredCharset = response.headers
    .get("content-type")
    ?.match(/charset=([^;\s]+)/i)?.[1]
    ?.toLowerCase();
  const charset = declaredCharset === "utf-8" ? "utf-8" : "windows-1252";
  return new TextDecoder(charset).decode(bytes);
}

function assertRights(work, indexHtml) {
  if (!Array.isArray(work.rights_evidence) || work.rights_evidence.length === 0) {
    fail(`${work.slug}: no rights evidence is configured`);
  }

  for (const evidence of work.rights_evidence) {
    if (!indexHtml.includes(evidence)) {
      fail(`${work.slug}: source page no longer contains rights evidence ${JSON.stringify(evidence)}`);
    }
  }

  if (work.rights_basis === "explicit_cc_by_sa_2_0") return;

  if (work.rights_basis === "public_domain_source_and_mia_cc_by_sa_2_0") {
    if (!Number.isInteger(work.source_publication_year) || work.source_publication_year > 1930) {
      fail(`${work.slug}: public-domain source edition must have been published by 1930`);
    }
    return;
  }

  fail(`${work.slug}: unsupported rights basis ${JSON.stringify(work.rights_basis)}`);
}

function assertPageIsUsable(work, sourceUrl, html) {
  const blockedMarkers = [
    "MECW File No Longer Available",
    "The requested resource is no longer available",
    "Fair Use:</span>",
    "Copyright:</span>",
  ];

  const marker = blockedMarkers.find((candidate) => html.includes(candidate));
  if (marker) {
    fail(`${work.slug}: refused ${sourceUrl}; page contains ${JSON.stringify(marker)}`);
  }
}

function localUrlFor(work, page) {
  return `/library/texts/${work.slug}/${page.slug}/`;
}

function cleanText(value) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function sanitizeChapter(work, page, sourceUrl, html, sourceToLocal) {
  const $ = cheerio.load(html, { decodeEntities: true });
  const container = $(".border").first().length ? $(".border").first() : $("body").first();

  if (!container.length) fail(`${work.slug}/${page.slug}: no readable document body found`);

  container.find("script, style, link, meta, form, iframe, object, embed, audio, video").remove();
  container.find("p.title, p.footer, p.pagenote, p.next, nav").remove();

  const firstRule = container.find("hr").first();
  const paragraphsBeforeFirstRule = firstRule
    .prevAll("p")
    .filter((_, paragraph) => cleanText($(paragraph).text()).length > 0);
  if (firstRule.length && paragraphsBeforeFirstRule.length === 0) {
    firstRule.prevAll().remove();
    firstRule.remove();
  }

  const images = container.find("img");
  if (images.length) {
    fail(`${work.slug}/${page.slug}: ${images.length} image(s) require a separate rights and accessibility review`);
  }

  container.find("h1, h2").each((_, heading) => {
    $(heading).replaceWith(`<h2>${$(heading).html() ?? ""}</h2>`);
  });
  container.find("h3, h4, h5, h6").each((_, heading) => {
    $(heading).replaceWith(`<h3>${$(heading).html() ?? ""}</h3>`);
  });

  container.find("center").each((_, element) => {
    $(element).replaceWith(`<div>${$(element).html() ?? ""}</div>`);
  });
  container.find("font").each((_, element) => {
    $(element).replaceWith($(element).html() ?? "");
  });

  container.find("p.information").addClass("cc-text-note");
  container.find("span.info").addClass("cc-text-note-label");
  container.find("span.context, span.inote, sup.ednote").addClass("cc-text-note-inline");
  container.find("p.indent, p.indentb, p.index, p.toc").addClass("cc-text-indent");

  container.find("a").each((_, anchor) => {
    const element = $(anchor);
    const href = element.attr("href");
    const legacyName = element.attr("name");
    if (!element.attr("id") && legacyName && !/\s/.test(legacyName)) {
      element.attr("id", legacyName);
    }
    element.removeAttr("target").removeAttr("rel").removeAttr("name");
    if (!href || href.startsWith("#")) return;

    let resolved;
    try {
      resolved = new URL(href, sourceUrl);
    } catch {
      element.removeAttr("href");
      return;
    }

    if (!['http:', 'https:'].includes(resolved.protocol)) {
      element.removeAttr("href");
      return;
    }

    const withoutFragment = new URL(resolved.href);
    const fragment = withoutFragment.hash;
    withoutFragment.hash = "";
    const local = sourceToLocal.get(withoutFragment.href);
    element.attr("href", local ? `${local}${fragment}` : resolved.href);

    if (!local) {
      element.attr("rel", "external noopener");
    }
  });

  container.find("[id]").each((_, element) => {
    const id = $(element).attr("id");
    if (!id || /\s/.test(id)) $(element).removeAttr("id");
  });

  const seenIds = new Set();
  container.find("[id]").each((_, element) => {
    const id = $(element).attr("id");
    if (seenIds.has(id)) $(element).removeAttr("id");
    else seenIds.add(id);
  });

  const allowedAttributes = new Set([
    "class",
    "href",
    "id",
    "title",
    "colspan",
    "rowspan",
    "scope",
    "rel",
  ]);
  container.find("*").each((_, element) => {
    for (const attribute of Object.keys(element.attribs ?? {})) {
      if (!allowedAttributes.has(attribute)) $(element).removeAttr(attribute);
    }

    const classes = ($(element).attr("class") ?? "")
      .split(/\s+/)
      .filter((className) => className.startsWith("cc-text-"));
    if (classes.length) $(element).attr("class", [...new Set(classes)].join(" "));
    else $(element).removeAttr("class");
  });

  container.find("p").each((_, paragraph) => {
    const element = $(paragraph);
    if (!cleanText(element.text()) && element.find("a").length === 0) element.remove();
  });

  container.find("a").each((_, anchor) => {
    const element = $(anchor);
    if (!element.attr("href") && !element.attr("id") && !cleanText(element.text())) element.remove();
  });
  container.find("p").each((_, paragraph) => {
    const element = $(paragraph);
    if (!cleanText(element.text()) && element.find("[id]").length === 0) element.remove();
  });

  container.find("hr").each((_, rule) => $(rule).replaceWith('<hr class="cc-text-rule">'));

  const body = container.html()?.trim();
  if (!body || cleanText(container.text()).length < 80) {
    fail(`${work.slug}/${page.slug}: extracted body is unexpectedly short`);
  }

  return body;
}

function bookFrontMatter(work, archive) {
  const rights =
    work.rights_basis === "explicit_cc_by_sa_2_0"
      ? `${work.source_edition}; this MIA edition is licensed under ${archive.license_name}.`
      : `${work.source_edition} is a public-domain source edition. MIA transcription and markup are reused under ${archive.license_name}.`;

  const values = {
    layout: "book",
    title: work.title,
    content_type: "Book / Text",
    section_key: "library",
    authors: work.authors,
    publication_year: work.date,
    publication: work.source_edition,
    text_type: work.text_type,
    reading_level: work.reading_level,
    thinkers: ["Karl Marx"],
    region: ["Europe"],
    historical_period: [work.historical_period],
    languages: ["English"],
    topics: work.topics,
    description: work.description,
    source_url: work.source_index,
    archive_name: archive.name,
    archive_url: archive.base_url,
    license_name: archive.license_name,
    license_url: archive.license_url,
    rights_basis: work.rights_basis,
    rights_reviewed: "2026-09-01",
    rights,
    translators: work.translators,
    imported: true,
  };

  return `---\n${Object.entries(values)
    .map(([key, value]) => `${key}: ${yamlValue(value)}`)
    .join("\n")}\n---\n\nThis reading edition preserves the source text while presenting it in the site's accessible text reader. Source links and edition-level rights information remain attached to every section.\n`;
}

function chapterFrontMatter(work, page, archive, sourceUrl, body, rawHtml, order) {
  const values = {
    layout: "text-chapter",
    title: page.title,
    content_type: "Primary Text",
    section_key: "library",
    permalink: localUrlFor(work, page),
    parent_text: work.slug,
    parent_title: work.title,
    authors: work.authors,
    order,
    publication_year: work.date,
    reading_level: work.reading_level,
    thinkers: ["Karl Marx"],
    region: ["Europe"],
    historical_period: [work.historical_period],
    languages: ["English"],
    topics: work.topics,
    description: `${page.title} from ${work.title}, in a rights-reviewed reading edition sourced from the Marxists Internet Archive.`,
    source_url: sourceUrl,
    source_work_url: work.source_index,
    source_edition: work.source_edition,
    archive_name: archive.name,
    archive_url: archive.base_url,
    license_name: archive.license_name,
    license_url: archive.license_url,
    rights_basis: work.rights_basis,
    rights_reviewed: "2026-09-01",
    source_sha256: sha256(rawHtml),
    content_sha256: sha256(body),
    imported: true,
  };

  return `---\n${Object.entries(values)
    .map(([key, value]) => `${key}: ${yamlValue(value)}`)
    .join("\n")}\n---\n\n<!-- Generated by scripts/import_mia_texts.mjs. Edit the manifest or importer, not this file. -->\n\n${body}\n`;
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  let works = manifest.works;

  if (requestedWork) {
    works = works.filter((work) => work.slug === requestedWork);
    if (works.length === 0) fail(`unknown work ${JSON.stringify(requestedWork)}`);
  }

  const sourceToLocal = new Map();
  for (const work of works) {
    for (const page of work.pages) {
      const sourceUrl = new URL(page.path, work.source_index).href;
      sourceToLocal.set(sourceUrl, localUrlFor(work, page));
    }
  }

  if (!checkOnly) {
    await mkdir(BOOKS_DIR, { recursive: true });
    await mkdir(CHAPTERS_DIR, { recursive: true });
  }

  let requestCount = 0;
  let chapterCount = 0;

  for (const work of works) {
    if (requestCount > 0) await sleep(manifest.archive.request_delay_ms);
    const indexHtml = await fetchHtml(work.source_index);
    requestCount += 1;
    assertRights(work, indexHtml);

    const renderedChapters = [];
    for (const [index, page] of work.pages.entries()) {
      await sleep(manifest.archive.request_delay_ms);
      const sourceUrl = new URL(page.path, work.source_index).href;
      const rawHtml = await fetchHtml(sourceUrl);
      requestCount += 1;
      assertPageIsUsable(work, sourceUrl, rawHtml);
      const body = sanitizeChapter(work, page, sourceUrl, rawHtml, sourceToLocal);
      renderedChapters.push({ page, sourceUrl, rawHtml, body, order: index + 1 });
      chapterCount += 1;
    }

    if (!checkOnly) {
      await writeFile(join(BOOKS_DIR, `${work.slug}.md`), bookFrontMatter(work, manifest.archive));
      const workDirectory = join(CHAPTERS_DIR, work.slug);
      await mkdir(workDirectory, { recursive: true });
      for (const chapter of renderedChapters) {
        await writeFile(
          join(workDirectory, `${chapter.page.slug}.md`),
          chapterFrontMatter(
            work,
            chapter.page,
            manifest.archive,
            chapter.sourceUrl,
            chapter.body,
            chapter.rawHtml,
            chapter.order,
          ),
        );
      }
    }

    process.stdout.write(`${checkOnly ? "Checked" : "Imported"} ${work.title} (${work.pages.length} sections)\n`);
  }

  process.stdout.write(
    `${checkOnly ? "Rights and extraction checks passed" : "Import complete"}: ${works.length} works, ${chapterCount} sections, ${requestCount} respectful requests.\n`,
  );
}

main().catch((error) => {
  console.error(`MIA import failed: ${error.message}`);
  process.exitCode = 1;
});
