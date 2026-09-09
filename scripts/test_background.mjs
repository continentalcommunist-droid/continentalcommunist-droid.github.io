#!/usr/bin/env node
import assert from "node:assert/strict";
import {createReadStream} from "node:fs";
import {mkdir, mkdtemp, readFile, realpath, rm, stat} from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {after, before, test} from "node:test";
import {setTimeout as delay} from "node:timers/promises";
import {launch} from "chrome-launcher";
import {connect} from "puppeteer-core";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "_site");
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
  assert.equal(await readFile(path.join(SITE, 'assets/faulty-terminal.js'), 'utf8'),
    await readFile(path.join(ROOT, 'assets/faulty-terminal.js'), 'utf8'),
    'Built background is stale; run npm run build first.');
  server = http.createServer((request, response) => void serve(request, response));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  profile = await mkdtemp(path.join(os.tmpdir(), "cc-background-regression-"));
  chrome = await launch({
    userDataDir: profile,
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-dev-shm-usage",
      "--disable-background-networking", "--disable-component-update", "--disable-sync",
      // Exercise WebGL on GPU-less CI runners using only trusted local assets.
      ...(process.platform === 'linux' || process.env.BACKGROUND_SOFTWARE_WEBGL === '1'
        ? ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader'] : []),
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

async function openPage(t, {reduced = false, webgl = true} = {}) {
  const context = await browser.createBrowserContext();
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'No uncaught browser errors'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    void (request.url().startsWith(`${origin}/`) ? request.continue() : request.abort('blockedbyclient')).catch(() => {});
  });
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference'}]);
  await page.evaluateOnNewDocument((webglEnabled) => {
    window.terminalDraws = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (!webglEnabled && type.startsWith('webgl')) return null;
      return getContext.call(this, type, ...args);
    };
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const draw = type.prototype.drawArrays;
      type.prototype.drawArrays = function (...args) {
        window.terminalDraws++;
        return draw.apply(this, args);
      };
    }
  }, webgl);
  return page;
}
const ready = page => page.waitForSelector('[data-faulty-terminal].is-ready canvas', {timeout: 15000});
const draws = page => page.evaluate(() => window.terminalDraws);
const paused = page => page.$eval('[data-background-toggle]', button => button.textContent === 'Resume background');

async function checkLayout(page, width, height) {
  await page.setViewport({width, height, deviceScaleFactor: 2});
  await delay(200);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px has no horizontal overflow`);
  assert.equal(await page.$eval('.cc-button-primary', link => {
    const rect = link.getBoundingClientRect();
    return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('a') === link;
  }), true, 'Background does not intercept the main link');
  const size = await page.$eval('[data-faulty-terminal] canvas', canvas => ({
    pixels: canvas.width * canvas.height,
    width: canvas.getBoundingClientRect().width,
    height: canvas.getBoundingClientRect().height
  }));
  assert.ok(size.pixels <= 720000, 'Render pixel budget is capped');
  assert.equal(size.width, await page.evaluate(() => document.documentElement.clientWidth));
  assert.equal(size.height, height);
}

test('home background renders, pauses, resizes, and leaves navigation usable', {timeout: 30000}, async t => {
  const page = await openPage(t);
  await page.setViewport({width: 1440, height: 1000});
  await page.goto(origin, {waitUntil: 'load'});
  await ready(page);
  const first = await draws(page);
  await page.waitForFunction(count => window.terminalDraws > count + 2, {}, first);
  assert.equal(await page.$eval('[data-faulty-terminal]', element => element.getAttribute('aria-hidden')), 'true');
  await checkLayout(page, 1440, 1000);
  await mkdir(path.join(ROOT, 'tmp/background'), {recursive: true});
  await page.screenshot({path: path.join(ROOT, 'tmp/background/desktop.png')});
  await page.click('[data-background-toggle]');
  assert.equal(await paused(page), true);
  await delay(100);
  const frozen = await draws(page);
  await page.mouse.move(100, 200);
  await delay(250);
  assert.equal(await draws(page), frozen, 'Pause actually stops rendering');
  await page.click('[data-background-toggle]');
  await page.waitForFunction(count => window.terminalDraws > count, {}, frozen);
  await checkLayout(page, 390, 844);
  await page.screenshot({path: path.join(ROOT, 'tmp/background/mobile.png')});
  await checkLayout(page, 320, 1000);
  await page.click('label[for="nav-trigger"]');
  assert.equal(await page.$eval('#nav-trigger', input => input.checked), true);
  await page.click('#primary-navigation a[href="/learn/"]');
  await page.waitForFunction(() => location.pathname === '/learn/');
  assert.equal(await page.$('[data-faulty-terminal]'), null);
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('faulty-terminal'))), false, 'Other pages do not load the effect');
});

test('reduced motion disables WebGL initially and when changed at runtime', {timeout: 30000}, async t => {
  const page = await openPage(t, {reduced: true});
  await page.goto(origin, {waitUntil: 'load'});
  await delay(200);
  assert.equal(await page.$('[data-faulty-terminal] canvas'), null);
  assert.equal(await page.$eval('[data-background-toggle]', button => button.hidden), true);
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'no-preference'}]);
  await ready(page);
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await page.waitForFunction(() => !document.querySelector('[data-faulty-terminal] canvas'));
  const frozen = await draws(page);
  await delay(200);
  assert.equal(await draws(page), frozen);
});

test('unavailable and lost WebGL preserve the static home page', {timeout: 30000}, async t => {
  const fallback = await openPage(t, {webgl: false});
  await fallback.goto(origin, {waitUntil: 'load'});
  await delay(300);
  assert.equal(await fallback.$('[data-faulty-terminal] canvas'), null);
  assert.equal(await fallback.$eval('[data-background-toggle]', button => button.hidden), true);
  assert.ok(await fallback.$('.cc-button-primary[href="/analysis/"]'));
  const page = await openPage(t);
  await page.goto(origin, {waitUntil: 'load'});
  await ready(page);
  await page.$eval('[data-faulty-terminal] canvas', canvas => {
    (canvas.getContext('webgl2') || canvas.getContext('webgl')).getExtension('WEBGL_lose_context').loseContext();
  });
  await page.waitForFunction(() => !document.querySelector('[data-faulty-terminal] canvas'));
  assert.equal(await page.$eval('[data-background-toggle]', button => button.hidden), true);
});
