#!/usr/bin/env node

import assert from "node:assert/strict";
import {createReadStream} from "node:fs";
import {mkdtemp, readFile, realpath, rm, stat} from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {after, before, test} from "node:test";
import {launch} from "chrome-launcher";
import {connect} from "puppeteer-core";
import {masteryScore} from "../assets/retention-model.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "_site");
const KEY = "continental-communist-retention-v1";
const MARKER = "LESSON_REGRESSION_HYPOTHETICAL";
const ANSWER = `${MARKER}: In this fictional case, compare the stated conditions, explain the causal relation, and name evidence that could change the conclusion. `.repeat(2);
const LESSONS = [
  ...Array.from({length: 6}, (_, index) => `/learn/pathways/marxism-fundamentals/week-${String(index + 1).padStart(2, "0")}/`),
  ...Array.from({length: 10}, (_, index) => `/learn/pathways/capital-political-economy/module-${String(index + 1).padStart(2, "0")}/`)
];
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2"
};
let server, chrome, browser, profile, origin, siteRoot;

function insideSite(file) {
  return file === siteRoot || file.startsWith(`${siteRoot}${path.sep}`);
}

async function serve(request, response) {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405).end();
      return;
    }
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let file = path.resolve(siteRoot, `.${pathname}`);
    if (!insideSite(file)) throw new Error("Outside site");
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    file = await realpath(file);
    if (!insideSite(file) || !(await stat(file)).isFile()) throw new Error("Invalid file");
    response.writeHead(200, {"Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store"});
    if (request.method === "HEAD") response.end();
    else createReadStream(file).on("error", () => response.destroy()).pipe(response);
  } catch {
    response.writeHead(404, {"Content-Type": "text/plain"}).end("Not found");
  }
}

before(async () => {
  siteRoot = await realpath(SITE);
  assert.equal(await readFile(path.join(SITE, "assets/lesson.js"), "utf8"),
    await readFile(path.join(ROOT, "assets/lesson.js"), "utf8"),
    "Built lesson assets are stale; run npm run build before this suite.");
  server = http.createServer((request, response) => void serve(request, response));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  profile = await mkdtemp(path.join(os.tmpdir(), "cc-lesson-regression-"));
  chrome = await launch({
    userDataDir: profile,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
      "--disable-background-networking", "--disable-component-update", "--disable-sync",
      "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"]
  });
  browser = await connect({browserURL: `http://127.0.0.1:${chrome.port}`});
}, {timeout: 30000});

after(async () => {
  browser?.disconnect();
  try {
    await chrome?.kill();
  } finally {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    if (profile) await rm(profile, {recursive: true, force: true});
  }
});

async function isolatedPage(t, storageFailure) {
  const context = await browser.createBrowserContext();
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], "Browser scripts should not throw"));
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  page.on("request", request => {
    // Never send synthetic responses, account requests, or analytics off localhost.
    const local = request.url().startsWith(`${origin}/`);
    void (local ? request.continue() : request.abort("blockedbyclient")).catch(() => {});
  });
  await page.emulateMediaFeatures([{name: "prefers-reduced-motion", value: "reduce"}]);
  if (storageFailure) await page.evaluateOnNewDocument((key, method) => {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (name, ...args) {
      if (name === key) throw new DOMException("Synthetic storage failure", "QuotaExceededError");
      return original.call(this, name, ...args);
    };
  }, KEY, storageFailure);
  return page;
}

async function visit(page, route) {
  const response = await page.goto(`${origin}${route}`, {waitUntil: "networkidle0"});
  assert.equal(response.status(), 200, route);
}

async function fill(page, selector, value) {
  await page.$eval(selector, (element, text) => {
    element.value = text;
    element.dispatchEvent(new Event("input", {bubbles: true}));
  }, value);
}

async function snapshot(page) {
  return page.evaluate(key => {
    const root = document.querySelector("[data-retention-lesson]");
    const state = JSON.parse(localStorage.getItem(key) || "{}");
    return {state, lesson: state.lessons?.[root.dataset.lessonKey], lessonId: root.dataset.lessonKey};
  }, KEY);
}

async function hidden(page, selector) {
  return page.$eval(selector, element => element.hidden);
}

async function summary(page, count, disabled) {
  assert.equal(await page.$eval("[data-lesson-mastery-count]", element => element.textContent), count);
  assert.equal(await page.$eval("[data-lesson-completion]", element => element.disabled), disabled);
}

async function assertReflow(page, route) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    offenders: [...document.querySelectorAll("[data-retention-lesson] *")]
      .filter(element => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
      .slice(0, 5).map(element => `${element.tagName}.${element.className}`)
  }));
  assert.ok(dimensions.width <= dimensions.viewport + 1,
    `${route} overflows at ${dimensions.viewport}px: ${JSON.stringify(dimensions)}`);
}

test("all sixteen built lessons have three gated guided responses and reflow at 320px", {timeout: 60000}, async t => {
  const page = await isolatedPage(t);
  await page.setViewport({width: 320, height: 900, deviceScaleFactor: 1});
  for (const route of LESSONS) {
    await visit(page, route);
    const structure = await page.evaluate(() => ({
      forms: document.querySelectorAll("[data-faded-example]").length,
      fields: [...document.querySelectorAll("[data-faded-response]")].map(field => ({required: field.required, minimum: field.minLength, label: !!field.labels?.length})),
      hidden: [...document.querySelectorAll("[data-faded-feedback], [data-assessment-feedback]")].every(element => element.hidden),
      expanded: document.querySelector("[data-faded-reveal]")?.getAttribute("aria-expanded")
    }));
    assert.equal(structure.forms, 1, route);
    assert.equal(structure.fields.length, 3, route);
    assert.ok(structure.fields.every(field => field.required && field.minimum >= 30 && field.label), route);
    assert.equal(structure.hidden, true, route);
    assert.equal(structure.expanded, "false", route);
    await assertReflow(page, route);
  }
});

for (const route of [LESSONS[0], LESSONS[6]]) {
  test(`guided validation, persistence, focus, revision, and separate learning records: ${route}`, {timeout: 30000}, async t => {
    const page = await isolatedPage(t);
    await visit(page, route);
    const fields = await page.$$eval("[data-faded-response]", elements => elements.map(element => ({id: element.id, minimum: element.minLength, step: element.dataset.fadedResponse})));
    for (const field of fields) await fill(page, `#${field.id}`, ANSWER);
    await page.click("[data-faded-reveal]");
    assert.equal(await hidden(page, "[data-faded-feedback]"), true, "Confidence is required");
    await page.click('[data-faded-example] input[value="medium"]');
    for (const field of fields) {
      for (const invalid of ["", " ".repeat(field.minimum + 1), "x".repeat(field.minimum - 1)]) {
        await fill(page, `#${field.id}`, invalid);
        await page.click("[data-faded-reveal]");
        assert.equal(await hidden(page, "[data-faded-feedback]"), true, `${field.id} rejects ${JSON.stringify(invalid)}`);
        assert.equal((await snapshot(page)).lesson?.fadedExamples, undefined);
      }
      await fill(page, `#${field.id}`, ANSWER);
    }
    await page.click("[data-faded-reveal]");
    assert.equal(await hidden(page, "[data-faded-feedback]"), false);
    assert.equal(await page.evaluate(() => document.activeElement.matches("[data-faded-feedback]")), true);
    assert.equal(await page.$eval("[data-faded-reveal]", element => element.getAttribute("aria-expanded")), "true");
    const saved = await snapshot(page);
    const itemId = await page.$eval("[data-faded-example]", element => element.dataset.itemKey);
    const guided = saved.lesson.fadedExamples[itemId];
    assert.equal(guided.confidence, "medium");
    assert.ok(!Number.isNaN(Date.parse(guided.attemptedAt)));
    assert.deepEqual(guided.responses, Object.fromEntries(fields.map(field => [field.step, ANSWER.trim()])));
    assert.deepEqual(saved.lesson.attempts, {});
    assert.equal(guided.dueAt, undefined);
    assert.equal(guided.selfGrade, undefined);
    assert.deepEqual(saved.state.reviewHistory || [], []);
    await summary(page, "0 of 2", true);
    await page.reload({waitUntil: "networkidle0"});
    assert.equal(await hidden(page, "[data-faded-feedback]"), false);
    assert.deepEqual(await page.$$eval("[data-faded-response]", elements => elements.map(element => element.value)), fields.map(() => ANSWER.trim()));
    assert.equal(await page.$eval('[data-faded-example] input[value="medium"]', element => element.checked), true);
    await fill(page, `#${fields[0].id}`, `${ANSWER} Revised hypothesis.`);
    assert.equal(await hidden(page, "[data-faded-feedback]"), true);
    assert.equal(await page.$eval("[data-faded-reveal]", element => element.getAttribute("aria-expanded")), "false");
    await page.click("[data-faded-reveal]");
    assert.equal(await hidden(page, "[data-faded-feedback]"), false);
    assert.match((await snapshot(page)).lesson.fadedExamples[itemId].responses[fields[0].step], /Revised hypothesis\.$/);
    await page.setViewport({width: 320, height: 900, deviceScaleFactor: 1});
    await assertReflow(page, route);
    await visit(page, "/learn/review/");
    for (const selector of ["[data-review-due-count]", "[data-review-session-count]", "[data-review-upcoming-count]"]) {
      assert.equal(await page.$eval(selector, element => element.textContent), "0");
    }
    assert.equal(await hidden(page, "[data-review-practice]"), true);
  });
}

async function answerAssessment(page, form) {
  await fill(page, `${form} [data-assessment-response]`, ANSWER);
  await page.click(`${form} input[value="high"]`);
  await page.click(`${form} [data-reveal-feedback]`);
}

test("independent ratings gate completion, require a new grade, and preserve learned review schedules", {timeout: 30000}, async t => {
  const page = await isolatedPage(t);
  await visit(page, LESSONS[0]);
  const ids = await page.$$eval("[data-lesson-assessment]", elements => elements.map(element => element.dataset.itemKey));
  const forms = ids.map(id => `[data-lesson-assessment][data-item-key="${id}"]`);
  await summary(page, "0 of 2", true);
  for (const [index, form] of forms.entries()) {
    await answerAssessment(page, form);
    assert.equal(await page.evaluate(() => document.activeElement.matches("[data-assessment-feedback]")), true);
    await summary(page, `${index} of 2`, true);
    await page.click(`${form} [data-self-grade="solid"]`);
    await summary(page, `${index + 1} of 2`, index === 0);
  }
  const initial = (await snapshot(page)).lesson.attempts[ids[0]];
  assert.equal(initial.stabilityDays, 7);
  assert.equal(initial.gradedConfidence, "high");
  await page.click(`${forms[0]} [data-self-grade="again"]`);
  const corrected = (await snapshot(page)).lesson.attempts[ids[0]];
  const expectedDue = new Date(initial.firstGradedAt);
  expectedDue.setDate(expectedDue.getDate() + 1);
  assert.equal(corrected.firstGradedAt, initial.firstGradedAt);
  assert.equal(corrected.dueAt, expectedDue.toISOString(), "An initial rating correction uses the original grading date");
  assert.equal(corrected.stabilityDays, 1);

  const learned = {dueAt: "2032-03-12T12:00:00.000Z", stabilityDays: 23, difficulty: 0.27, reviewCount: 4, lastReviewedAt: "2032-02-18T12:00:00.000Z"};
  await page.evaluate((key, lessonId, itemId, schedule) => {
    const state = JSON.parse(localStorage.getItem(key));
    Object.assign(state.lessons[lessonId].attempts[itemId], schedule);
    localStorage.setItem(key, JSON.stringify(state));
  }, KEY, (await snapshot(page)).lessonId, ids[0], learned);
  await page.reload({waitUntil: "networkidle0"});
  await fill(page, `${forms[0]} [data-assessment-response]`, `${ANSWER} Revised independent explanation.`);
  assert.equal(await hidden(page, `${forms[0]} [data-assessment-feedback]`), true);
  await page.click(`${forms[0]} input[value="low"]`);
  await page.click(`${forms[0]} [data-reveal-feedback]`);
  const pending = (await snapshot(page)).lesson.attempts[ids[0]];
  assert.equal(pending.needsRating, true);
  assert.equal(pending.gradedConfidence, "high", "An ungraded confidence revision must not replace the graded snapshot");
  assert.equal(pending.confidence, "low");
  assert.equal(masteryScore(pending, new Date()),
    masteryScore({...pending, confidence: "high", gradedConfidence: undefined}, new Date()),
    "The ungraded revision must not change the mastery estimate");
  assert.equal(await page.$$eval(`${forms[0]} [data-self-grade][aria-pressed="true"]`, elements => elements.length), 0);
  await summary(page, "1 of 2", true);
  await page.click(`${forms[0]} [data-self-grade="developing"]`);
  const rerated = (await snapshot(page)).lesson.attempts[ids[0]];
  assert.equal(rerated.needsRating, false);
  assert.equal(rerated.gradedConfidence, "low");
  for (const [key, value] of Object.entries(learned)) assert.equal(rerated[key], value, `${key} survives lesson re-grading`);
  await summary(page, "2 of 2", false);
});

test("storage write failure keeps guided feedback and checkpoint grading usable with honest status", {timeout: 30000}, async t => {
  const page = await isolatedPage(t, "setItem");
  await visit(page, LESSONS[6]);
  const fields = await page.$$eval("[data-faded-response]", elements => elements.map(element => element.id));
  for (const id of fields) await fill(page, `#${id}`, ANSWER);
  await page.click('[data-faded-example] input[value="medium"]');
  await page.click("[data-faded-reveal]");
  assert.equal(await hidden(page, "[data-faded-feedback]"), false);
  assert.equal(await hidden(page, "[data-lesson-storage-status]"), false);
  assert.match(await page.$eval("[data-faded-status]", element => element.textContent), /visit only|unavailable/i);
  assert.doesNotMatch(await page.$eval("[data-faded-status]", element => element.textContent), /responses saved/i);
  const ids = await page.$$eval("[data-lesson-assessment]", elements => elements.map(element => element.dataset.itemKey));
  for (const id of ids) {
    const form = `[data-lesson-assessment][data-item-key="${id}"]`;
    await answerAssessment(page, form);
    await page.click(`${form} [data-self-grade="solid"]`);
    assert.equal(await page.$eval(`${form} [data-self-grade="solid"]`, element => element.getAttribute("aria-pressed")), "true");
    assert.match(await page.$eval(`${form} [data-review-status]`, element => element.textContent), /could not be saved|visit/i);
  }
  await summary(page, "2 of 2", false);
  assert.equal(await page.$eval("[data-next-review]", element => element.textContent), "Not saved");
  assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), null);
});

test('long pathway breadcrumb fits a narrow viewport with scrollbar space', {timeout: 30000}, async t => {
  const page = await isolatedPage(t);
  await page.setViewport({width: 305, height: 900, deviceScaleFactor: 1});
  await visit(page, LESSONS[6]);
  await assertReflow(page, LESSONS[6]);
});
