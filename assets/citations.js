(function () {
  "use strict";

  const dataElement = document.getElementById("cc-citation-data");

  if (!dataElement) {
    return;
  }

  let citationData;

  try {
    citationData = JSON.parse(dataElement.textContent);
  } catch (error) {
    return;
  }


  function compact(values) {
    return values.filter(function (value) {
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
  }


  function authorsFor(record) {
    if (Array.isArray(record.authors) && record.authors.length) {
      return record.authors;
    }

    return compact([record.organizational_author]);
  }


  function yearFor(record) {
    const match = String(record.date || "").match(/\d{4}/);

    return match ? match[0] : "n.d.";
  }


  function dateFor(record) {
    if (!record.date) {
      return "";
    }

    const parsed = new Date(record.date + (
      /^\d{4}-\d{2}-\d{2}$/.test(record.date) ? "T00:00:00" : ""
    ));

    if (Number.isNaN(parsed.getTime())) {
      return String(record.date);
    }

    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }


  function destinationFor(record) {
    if (record.doi) {
      return "https://doi.org/" + String(record.doi).replace(/^https?:\/\/doi\.org\//, "");
    }

    return record.url || "";
  }


  function plainText(record) {
    const authors = authorsFor(record).join("; ");
    const title = record.kind === "article"
      ? "\u201c" + record.title + ".\u201d"
      : record.title + ".";
    const container = compact([
      record.publication,
      record.publisher && record.publisher !== record.publication
        ? record.publisher
        : ""
    ]).join(", ");
    const publication = compact([container, dateFor(record)]).join(", ");
    const identifiers = compact([
      record.doi ? "doi:" + String(record.doi).replace(/^https?:\/\/doi\.org\//, "") : "",
      record.isbn ? "ISBN " + record.isbn : "",
      destinationFor(record)
    ]);
    const accessed = record.access_date
      ? "Accessed " + dateFor({ date: record.access_date }) + "."
      : "";

    return compact([
      authors ? authors + "." : "",
      title,
      publication ? publication + "." : "",
      identifiers.length ? identifiers.join(". ") + "." : "",
      accessed
    ]).join(" ");
  }


  function bibType(record) {
    const type = String(record.source_type || "").toLowerCase();

    if (record.kind === "article" || type.includes("journal") || type.includes("news")) {
      return "article";
    }

    if (type.includes("book")) {
      return "book";
    }

    if (type.includes("report")) {
      return "techreport";
    }

    return "misc";
  }


  function bibEscape(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/([{}])/g, "\\$1")
      .replace(/&/g, "\\&");
  }


  function bibTeX(record) {
    const fields = [
      ["author", authorsFor(record).join(" and ")],
      ["title", record.title],
      ["journal", bibType(record) === "article" ? record.publication : ""],
      ["publisher", record.publisher],
      ["year", yearFor(record)],
      ["volume", record.volume],
      ["number", record.issue],
      ["pages", record.pages],
      ["edition", record.edition],
      ["doi", record.doi],
      ["isbn", record.isbn],
      ["url", destinationFor(record)],
      ["urldate", record.access_date]
    ].filter(function (field) {
      return field[1];
    });
    const body = fields.map(function (field) {
      return "  " + field[0] + " = {" + bibEscape(field[1]) + "}";
    }).join(",\n");

    return "@" + bibType(record) + "{" + record.cite_key + ",\n" + body + "\n}";
  }


  function risType(record) {
    const type = String(record.source_type || "").toLowerCase();

    if (type.includes("book")) {
      return "BOOK";
    }

    if (type.includes("journal")) {
      return "JOUR";
    }

    if (type.includes("report")) {
      return "RPRT";
    }

    if (type.includes("dataset")) {
      return "DATA";
    }

    if (type.includes("news")) {
      return "NEWS";
    }

    if (type.includes("website") || record.kind === "article") {
      return "ELEC";
    }

    return "GEN";
  }


  function ris(record) {
    const lines = [
      "TY  - " + risType(record),
      "TI  - " + record.title
    ];

    authorsFor(record).forEach(function (author) {
      lines.push("AU  - " + author);
    });

    compact([
      record.publication ? ["T2", record.publication] : null,
      record.publisher ? ["PB", record.publisher] : null,
      yearFor(record) !== "n.d." ? ["PY", yearFor(record)] : null,
      record.volume ? ["VL", record.volume] : null,
      record.issue ? ["IS", record.issue] : null,
      record.pages ? ["SP", record.pages] : null,
      record.doi ? ["DO", String(record.doi).replace(/^https?:\/\/doi\.org\//, "")] : null,
      record.isbn ? ["SN", record.isbn] : null,
      destinationFor(record) ? ["UR", destinationFor(record)] : null,
      record.access_date ? ["Y2", record.access_date] : null
    ]).forEach(function (field) {
      lines.push(field[0] + "  - " + field[1]);
    });

    lines.push("ER  - ");

    return lines.join("\r\n");
  }


  function recordsFor(scope) {
    if (scope === "references") {
      return Array.isArray(citationData.references)
        ? citationData.references
        : [];
    }

    return citationData.work ? [citationData.work] : [];
  }


  function render(records, format) {
    if (format === "bibtex") {
      return records.map(bibTeX).join("\n\n");
    }

    if (format === "ris") {
      return records.map(ris).join("\r\n\r\n");
    }

    return records.map(plainText).join("\n\n");
  }


  function extensionFor(format) {
    return {
      bibtex: "bib",
      ris: "ris",
      text: "txt"
    }[format] || "txt";
  }


  function safeFilename(value) {
    return String(value || "citation")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }


  function status(message) {
    document.querySelectorAll("[data-citation-status]").forEach(function (element) {
      element.textContent = message;
    });
  }


  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();

    return Promise.resolve();
  }


  function downloadText(value, filename, format) {
    const mime = format === "ris"
      ? "application/x-research-info-systems"
      : "text/plain";
    const blob = new Blob([value], { type: mime + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }


  document.querySelectorAll("[data-citation-tools]").forEach(function (element) {
    element.hidden = false;
  });

  document.querySelectorAll("[data-citation-action]").forEach(function (button) {
    button.addEventListener("click", function () {
      const action = button.getAttribute("data-citation-action");
      const scope = button.getAttribute("data-citation-scope") || "work";
      const format = button.getAttribute("data-citation-format") || "text";
      const records = recordsFor(scope);

      if (!records.length) {
        status("No references are available to export.");
        return;
      }

      const output = render(records, format);
      const base = scope === "references"
        ? safeFilename(citationData.work.title) + "-references"
        : safeFilename(records[0].cite_key || records[0].title);

      if (action === "copy") {
        copyText(output).then(function () {
          status("Citation copied.");
        }).catch(function () {
          status("Copy failed. Please try again.");
        });
      } else {
        downloadText(output, base + "." + extensionFor(format), format);
        status(format === "bibtex" ? "BibTeX downloaded." : (
          format === "ris" ? "RIS downloaded." : "Bibliography downloaded."
        ));
      }

      window.dispatchEvent(new CustomEvent("cc:citation", {
        detail: {
          action: action,
          scope: scope,
          format: format,
          recordCount: records.length
        }
      }));
    });
  });
}());
