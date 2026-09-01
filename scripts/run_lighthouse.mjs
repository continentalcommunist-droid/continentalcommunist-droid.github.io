#!/usr/bin/env node

import {createReadStream} from "node:fs";
import {mkdir, readFile, stat, writeFile} from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import {launch} from "chrome-launcher";
import lighthouse from "lighthouse";

const ROOT = process.cwd();
const SITE_DIR = path.join(ROOT, "_site");
const RESULT_DIR = path.join(ROOT, "performance-results", "lighthouse");
const RUN_COUNT = Number.parseInt(process.env.LIGHTHOUSE_RUNS || "3", 10);
const targets = JSON.parse(await readFile(path.join(ROOT, "performance", "targets.json"), "utf8"));

const thresholds = {
  performanceScore: {minimum: 0.9, label: "Performance score"},
  largestContentfulPaintMs: {maximum: 2500, label: "LCP"},
  cumulativeLayoutShift: {maximum: 0.1, label: "CLS"},
  totalBlockingTimeMs: {maximum: 200, label: "TBT"},
  imageTransferBytes: {maximum: 350000, label: "Image transfer"},
  scriptTransferBytes: {maximum: 150000, label: "Script transfer"},
  totalTransferBytes: {maximum: 700000, label: "Total transfer"}
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint];
}

function resourceTransfer(lhr, resourceType) {
  const items = lhr.audits["resource-summary"]?.details?.items || [];
  return items.find((item) => item.resourceType === resourceType)?.transferSize || 0;
}

function metricsFrom(lhr) {
  return {
    performanceScore: lhr.categories.performance.score,
    largestContentfulPaintMs: lhr.audits["largest-contentful-paint"].numericValue,
    cumulativeLayoutShift: lhr.audits["cumulative-layout-shift"].numericValue,
    totalBlockingTimeMs: lhr.audits["total-blocking-time"].numericValue,
    firstContentfulPaintMs: lhr.audits["first-contentful-paint"].numericValue,
    speedIndexMs: lhr.audits["speed-index"].numericValue,
    imageTransferBytes: resourceTransfer(lhr, "image"),
    scriptTransferBytes: resourceTransfer(lhr, "script"),
    totalTransferBytes: resourceTransfer(lhr, "total")
  };
}

function safeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function resolveRequest(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const decodedPath = decodeURIComponent(url.pathname);
  let filePath = path.join(SITE_DIR, decodedPath);
  const sitePrefix = `${SITE_DIR}${path.sep}`;

  if (filePath !== SITE_DIR && !filePath.startsWith(sitePrefix)) return null;

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = path.join(filePath, "index.html");
  } catch {
    return null;
  }

  try {
    const fileStat = await stat(filePath);
    return fileStat.isFile() ? filePath : null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  const filePath = await resolveRequest(request.url || "/");
  if (!filePath) {
    response.writeHead(404, {"Content-Type": "text/plain; charset=utf-8"});
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(response);
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();
const port = typeof address === "object" && address ? address.port : null;
if (!port) throw new Error("Performance server did not expose a port.");

await mkdir(RESULT_DIR, {recursive: true});
const chrome = await launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage"]
});

const targetSummaries = [];
const failures = [];
let lighthouseVersion = null;

try {
  for (const target of targets.urls) {
    const runs = [];
    const runName = safeName(target.name);
    const url = `http://127.0.0.1:${port}${target.path}`;

    for (let runNumber = 1; runNumber <= RUN_COUNT; runNumber += 1) {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: ["json", "html"],
        logLevel: "error",
        onlyCategories: ["performance"],
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false
        },
        throttlingMethod: "simulate"
      });

      if (!result) throw new Error(`Lighthouse returned no result for ${target.name}.`);
      lighthouseVersion = result.lhr.lighthouseVersion;
      const reports = Array.isArray(result.report) ? result.report : [result.report];
      await writeFile(path.join(RESULT_DIR, `${runName}-${runNumber}.json`), reports[0]);
      await writeFile(path.join(RESULT_DIR, `${runName}-${runNumber}.html`), reports[1]);
      runs.push(metricsFrom(result.lhr));
    }

    const aggregate = Object.fromEntries(
      Object.keys(runs[0]).map((metric) => [metric, median(runs.map((run) => run[metric]))])
    );
    const targetFailures = [];

    for (const [metric, policy] of Object.entries(thresholds)) {
      const value = aggregate[metric];
      if (policy.minimum !== undefined && value < policy.minimum) {
        targetFailures.push(`${policy.label} ${value.toFixed(3)} < ${policy.minimum}`);
      }
      if (policy.maximum !== undefined && value > policy.maximum) {
        targetFailures.push(`${policy.label} ${value.toFixed(3)} > ${policy.maximum}`);
      }
    }

    const status = targetFailures.length === 0 ? "PASS" : "FAIL";
    console.log(
      `${status} ${target.name}: score ${Math.round(aggregate.performanceScore * 100)}, ` +
      `LCP ${Math.round(aggregate.largestContentfulPaintMs)}ms, ` +
      `CLS ${aggregate.cumulativeLayoutShift.toFixed(3)}, ` +
      `TBT ${Math.round(aggregate.totalBlockingTimeMs)}ms`
    );

    targetFailures.forEach((failure) => failures.push(`${target.name}: ${failure}`));
    targetSummaries.push({
      name: target.name,
      path: target.path,
      passes: targetFailures.length === 0,
      metrics: aggregate,
      runs
    });
  }
} finally {
  await chrome.kill();
  await new Promise((resolve) => server.close(resolve));
}

const summary = {
  capturedAt: new Date().toISOString(),
  lighthouseVersion,
  runCount: RUN_COUNT,
  thresholds,
  targets: targetSummaries,
  passes: failures.length === 0
};
await writeFile(path.join(RESULT_DIR, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

if (failures.length) {
  console.error("\nCore Web Vitals release gate failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`\nCore Web Vitals release gate passed for ${targetSummaries.length} representative URLs.`);
}
