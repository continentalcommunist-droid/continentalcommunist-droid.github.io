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
  assert.equal(await readFile(path.join(SITE, 'assets/target-cursor.js'), 'utf8'),
    await readFile(path.join(ROOT, 'assets/target-cursor.js'), 'utf8'),
    'Built cursor is stale; run npm run build first.');
  server = http.createServer((request, response) => void serve(request, response));
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  profile = await mkdtemp(path.join(os.tmpdir(), "cc-cursor-regression-"));
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

async function openPage(t, {reduced = false, mobile = false, blockCursor = false} = {}) {
  const context = await browser.createBrowserContext();
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], 'No uncaught browser errors'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    const blocked = blockCursor && request.url().endsWith('/assets/target-cursor.js');
    void (request.url().startsWith(`${origin}/`) && !blocked ? request.continue() : request.abort('blockedbyclient')).catch(() => {});
  });
  await page.setViewport(mobile ? {width: 390, height: 844, isMobile: true, hasTouch: true} : {width: 1280, height: 1000});
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference'}]);
  return page;
}
const active = page => page.evaluate(() => document.documentElement.classList.contains('cc-target-cursor-active'));
const loaded = page => page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/assets/target-cursor.js')));
const shown = page => page.waitForSelector('.target-cursor-wrapper.is-visible', {timeout: 10000});
async function hover(page, selector) {
  const element = await page.$(selector);
  await element.scrollIntoView();
  await page.hover(selector);
  await shown(page);
}
async function assertCorners(page, selector) {
  await page.waitForFunction(selector => {
    const target = document.querySelector(selector).getBoundingClientRect();
    const corners = [...document.querySelectorAll('.target-cursor-corner')].map(corner => corner.getBoundingClientRect());
    const expected = [[target.left - 3, target.top - 3], [target.right - 9, target.top - 3],
      [target.right - 9, target.bottom - 9], [target.left - 3, target.bottom - 9]];
    return corners.length === 4 && corners.every((corner, i) => Math.abs(corner.left - expected[i][0]) < 2 && Math.abs(corner.top - expected[i][1]) < 2);
  }, {timeout: 10000}, selector);
}

test('public layouts load one lightweight cursor entry point', async () => {
  for (const route of ['index.html', 'about/index.html', 'search/index.html', 'account/index.html',
    '404.html', 'learn/pathways/marxism-fundamentals/index.html', 'learn/pathways/capital-political-economy/module-01/index.html',
    '2026/09/04/on-gig-work/index.html', 'library/texts/capital-volume-one/chapter-01/index.html']) {
    const html = await readFile(path.join(SITE, route), 'utf8');
    assert.equal((html.match(/src="\/assets\/target-cursor-loader.js"/g) || []).length, 1, route);
    assert.equal((html.match(/href="\/assets\/target-cursor.css"/g) || []).length, 1, route);
    assert.ok(!html.includes('src="/assets/target-cursor.js"'), 'GSAP is loaded on mouse movement');
  }
});

test('spinning cursor locks to real controls, follows moving bounds, and preserves clicks', {timeout: 30000}, async t => {
  const page = await openPage(t);
  await page.goto(`${origin}/about/`, {waitUntil: 'load'});
  assert.equal(await loaded(page), false, 'Do not load GSAP before mouse use');
  assert.equal(await active(page), false, 'Keep native pointer until custom cursor is positioned');
  await hover(page, '.cc-header-search svg');
  await assertCorners(page, '.cc-header-search');
  assert.equal(await active(page), true);
  assert.equal(await page.$eval('.cc-header-search', link => getComputedStyle(link).cursor), 'none');
  await page.mouse.move(5, 300);
  await delay(350);
  const before = await page.$eval('.target-cursor-wrapper', cursor => cursor.style.transform);
  await delay(150);
  assert.notEqual(await page.$eval('.target-cursor-wrapper', cursor => cursor.style.transform), before, 'Cursor spins away from targets');
  await page.evaluate(() => {
    const area = document.createElement('div');
    area.id = 'cursor-fixture';
    area.style.cssText = 'position:fixed;top:200px;left:250px;width:300px;height:200px;overflow:auto;z-index:10000;background:#222';
    area.innerHTML = '<div style="height:80px"></div><button id="cursor-button" style="margin-left:20px;width:180px;height:60px">Test action</button><div style="height:400px"></div>';
    document.body.appendChild(area);
    document.querySelector('#cursor-button').onclick = () => document.body.dataset.cursorClicked = 'yes';
  });
  await hover(page, '#cursor-button');
  await assertCorners(page, '#cursor-button');
  await page.evaluate(() => { document.querySelector('#cursor-fixture').scrollTop += 10; });
  await assertCorners(page, '#cursor-button');
  await page.evaluate(() => { document.querySelector('#cursor-button').style.transform = 'translateX(6px)'; });
  await assertCorners(page, '#cursor-button');
  await page.click('#cursor-button');
  assert.equal(await page.evaluate(() => document.body.dataset.cursorClicked), 'yes');
  await page.evaluate(() => document.querySelector('#cursor-button').remove());
  await page.waitForFunction(() => !document.querySelector('.target-cursor-wrapper').classList.contains('is-targeting'));
  await page.mouse.move(1278, 999);
  await delay(300);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, 'Cursor cannot add horizontal scroll at an edge');
  await page.mouse.move(5, 300);
  await delay(150);
  await page.keyboard.press('Tab');
  assert.equal(await active(page), false);
  await page.mouse.move(10, 310);
  await shown(page);
  const transform = await page.$eval('.target-cursor-wrapper', cursor => cursor.style.transform);
  await delay(150);
  assert.notEqual(await page.$eval('.target-cursor-wrapper', cursor => cursor.style.transform), transform, 'Spin resumes after keyboard use');
  await page.mouse.move(-10, -10);
  assert.equal(await active(page), false, 'Leaving the viewport restores the native pointer');
  await page.mouse.move(10, 310);
  await shown(page);
  await hover(page, '.cc-header-search');
  await page.click('.cc-header-search');
  await page.waitForFunction(() => location.pathname === '/search/');
});

test('text fields, disabled controls, embedded documents, and preference changes keep native cursors', {timeout: 30000}, async t => {
  const page = await openPage(t);
  await page.goto(`${origin}/search/`, {waitUntil: 'load'});
  await hover(page, '.cc-header-search');
  await page.hover('input[type="search"]');
  await page.waitForFunction(() => !document.documentElement.classList.contains('cc-target-cursor-active'));
  assert.equal(await page.$eval('input[type="search"]', input => getComputedStyle(input).cursor), 'text');
  await page.type('input[type="search"]', 'Marx');
  assert.equal(await active(page), false);
  await page.evaluate(() => {
    const fixture = document.createElement('div');
    fixture.style.cssText = 'position:fixed;top:250px;left:200px;z-index:10000;background:#222';
    fixture.innerHTML = '<button id="cursor-disabled" disabled>Disabled</button><label id="cursor-label"><input type="checkbox">Choose</label><iframe id="cursor-frame" title="Test embedded document" srcdoc="<p>Embedded content</p>"></iframe>';
    document.body.appendChild(fixture);
  });
  await hover(page, '#cursor-label');
  await assertCorners(page, '#cursor-label');
  await page.click('#cursor-label');
  assert.equal(await page.$eval('#cursor-label input', input => input.checked), true);
  await page.hover('#cursor-disabled');
  assert.equal(await active(page), false);
  await hover(page, '.cc-header-search');
  await page.hover('#cursor-frame');
  await page.waitForFunction(() => !document.documentElement.classList.contains('cc-target-cursor-active'));
  await hover(page, '.cc-header-search');
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await page.waitForFunction(() => !document.querySelector('.target-cursor-layer'));
  assert.equal(await active(page), false);
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'no-preference'}]);
  await page.mouse.move(5, 200);
  await shown(page);
  assert.equal(await page.$$eval('.target-cursor-layer', layers => layers.length), 1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  assert.equal(await active(page), false);
  const client = await page.createCDPSession();
  await client.send('Emulation.setEmulatedMedia', {features: [{name: 'forced-colors', value: 'active'}]});
  await page.waitForFunction(() => !document.querySelector('.target-cursor-layer'));
  await client.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-contrast', value: 'less'}]});
  await page.mouse.move(15, 250);
  assert.equal(await active(page), false, 'Contrast preferences never produce two cursors');
});

test('touch, reduced-motion, missing animation code and disabled JavaScript remain usable', {timeout: 30000}, async t => {
  for (const options of [{mobile: true}, {reduced: true}, {blockCursor: true}]) {
    const page = await openPage(t, options);
    await page.goto(`${origin}/about/`, {waitUntil: 'load'});
    await page.mouse.move(200, 300);
    await delay(200);
    assert.equal(await active(page), false);
    assert.equal(await page.$('.target-cursor-layer'), null);
    if (!options.blockCursor) assert.equal(await loaded(page), false);
  }
  const page = await openPage(t);
  await page.setJavaScriptEnabled(false);
  await page.goto(`${origin}/about/`, {waitUntil: 'load'});
  await page.click('.cc-header-search');
  await page.waitForFunction(() => location.pathname === '/search/');
});
