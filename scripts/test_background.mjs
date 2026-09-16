#!/usr/bin/env node
import assert from "node:assert/strict";
import {createReadStream} from "node:fs";
import {mkdir, mkdtemp, readFile, readdir, realpath, rm, stat} from "node:fs/promises";
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
  const blockedImports = new Set();
  page.on('pageerror', error => {
    // The account SDK is deliberately offline in these visual checks. Exclude
    // only the exact import failure produced by our own request interception;
    // local script errors and every other exception must still fail the test.
    if (!blockedImports.has(error.message)) errors.push(error.message);
  });
  t.after(() => assert.deepEqual(errors, [], 'No unexpected browser errors'));
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@[\d.]+\/\+esm$/.test(request.url())) {
      blockedImports.add(`Failed to fetch dynamically imported module: ${request.url()}`);
    }
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

// Software WebGL on GPU-less CI runners needs more time than a local GPU.
test('home background renders, pauses, resizes, and leaves navigation usable', {timeout: 90000}, async t => {
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
  // Pause after proving resume, so software-rendered screenshots/resizes do not
  // compete with continuous shader frames on GitHub's shared runners.
  await page.click('[data-background-toggle]');
  await checkLayout(page, 390, 844);
  await page.screenshot({path: path.join(ROOT, 'tmp/background/mobile.png')});
  await checkLayout(page, 320, 1000);
  await page.click('label[for="nav-trigger"]');
  assert.equal(await page.$eval('#nav-trigger', input => input.checked), true);
  await page.click('#primary-navigation a[href="/learn/"]');
  await page.waitForFunction(() => location.pathname === '/learn/');
  await ready(page);
  assert.equal(await paused(page), true, 'Background pause follows navigation to other pages');
  assert.equal(await page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('home-scroll'))), false, 'Hero choreography remains home-only');
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

test('homepage header contracts without shifting content and stays usable across widths', {timeout: 30000}, async t => {
  const page = await openPage(t, {webgl: false});
  await page.setViewport({width: 1440, height: 1000});
  await page.goto(origin, {waitUntil: 'load'});
  const geometry = () => page.evaluate(() => {
    const header = document.querySelector('.site-header').getBoundingClientRect();
    return {width: header.width, height: header.height, top: header.top,
      heroTop: document.querySelector('.cc-hero-stage').getBoundingClientRect().top + scrollY};
  });
  const expanded = await geometry();
  await page.evaluate(() => scrollTo(0, 600));
  await delay(550);
  const compact = await geometry();
  assert.ok(compact.width < expanded.width - 100, 'Header visibly contracts in width');
  assert.ok(compact.height < expanded.height - 15, `Header visibly contracts in height: ${JSON.stringify({expanded, compact})}`);
  assert.ok(compact.top >= 0 && compact.top < 20, 'Navigation stays on screen');
  assert.equal(compact.heroTop, expanded.heroTop, 'Contraction never shifts document content');
  assert.ok(await page.$eval('.site-header', header => Number(header.style.getPropertyValue('--page-progress')) > 0));
  await page.hover('.cc-nav-link[href="/learn/"]');
  assert.equal(await page.$eval('.cc-nav-submenu', menu => getComputedStyle(menu).display), 'block');
  await page.mouse.move(0, 0);

  for (const width of [1280, 1151, 1100, 1001, 1000, 768, 600, 390, 320]) {
    await page.setViewport({width, height: 1000});
    await delay(500);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px does not overflow`);
    assert.equal(await page.$eval('.cc-header-account', control => {
      const rect = control.getBoundingClientRect();
      return rect.width >= 44 && rect.height >= 44 &&
        document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('a') === control;
    }), true, `${width}px compact header retains usable controls`);
  }
  await page.click('label[for="nav-trigger"]');
  assert.equal(await page.$eval('#nav-trigger', input => input.getAttribute('aria-expanded')), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.$eval('#nav-trigger', input => !input.checked && document.activeElement === input), true);
  await page.evaluate(() => scrollTo(0, 0));
  await delay(550);
  assert.equal(await page.$eval('.site-header', header => header.classList.contains('is-scrolled')), false);
  assert.equal(await page.$eval('.site-header', header => Number(header.style.getPropertyValue('--page-progress'))), 0);
  await page.setViewport({width: 1440, height: 1000});
  await delay(550);
  assert.deepEqual(await geometry(), expanded, 'Returning to the top restores the original geometry');

  // Keep reviewable captures of the material over the real, paused background.
  const visual = await openPage(t);
  await visual.setViewport({width: 1440, height: 1000});
  await visual.goto(origin, {waitUntil: 'load'});
  await ready(visual);
  await visual.click('[data-background-toggle]');
  await visual.$eval('#platform-title', el => el.scrollIntoView({behavior: 'instant'}));
  await visual.mouse.move(0, 0);
  await delay(550);
  await visual.screenshot({path: path.join(ROOT, 'tmp/background/home-scrolled.png')});
  await visual.$eval('#featured-title', el => el.scrollIntoView({behavior: 'instant'}));
  await delay(100);
  await visual.screenshot({path: path.join(ROOT, 'tmp/background/home-featured.png')});
  await visual.$eval('#latest-title', el => el.scrollIntoView({behavior: 'instant'}));
  await delay(100);
  await visual.screenshot({path: path.join(ROOT, 'tmp/background/home-latest.png')});
});

test('liquid panels reflect pointer movement and honor accessibility preferences', {timeout: 30000}, async t => {
  const page = await openPage(t, {webgl: false});
  await page.setViewport({width: 1440, height: 1000});
  await page.goto(origin, {waitUntil: 'load'});
  const material = () => page.$eval('.cc-hero-glass', panel => {
    const style = getComputedStyle(panel);
    return {filter: style.backdropFilter, background: style.backgroundColor,
      reflection: panel.style.getPropertyValue('--glass-x')};
  });
  assert.notEqual((await material()).filter, 'none', 'Glass filters actual background pixels');
  assert.match((await material()).background, /rgba\(/, 'Background remains translucent');
  await page.mouse.move(250, 210);
  await delay(80);
  const firstReflection = (await material()).reflection;
  await page.mouse.move(350, 210);
  await delay(80);
  assert.notEqual((await material()).reflection, firstReflection, 'Reflection follows the pointer');
  const client = await page.createCDPSession();
  for (const feature of [
    {name: 'prefers-reduced-transparency', value: 'reduce'},
    {name: 'prefers-contrast', value: 'more'},
    {name: 'forced-colors', value: 'active'}
  ]) {
    await client.send('Emulation.setEmulatedMedia', {features: [feature]});
    await delay(80);
    assert.equal((await material()).filter, 'none', `${feature.name} removes backdrop filtering`);
    assert.equal((await material()).reflection, '', `${feature.name} clears reflections`);
    await page.mouse.move(360, 230);
    await delay(80);
    assert.equal((await material()).reflection, '', `${feature.name} prevents pointer effects`);
  }
  await client.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});
  await page.evaluate(() => scrollTo(0, 600));
  await delay(80);
  assert.equal(await page.$eval('.site-header', header => getComputedStyle(header).transitionDuration), '0s');
  await page.mouse.move(500, 250);
  assert.equal((await material()).reflection, '', 'Reduced motion disables pointer reflections');

  const noJS = await openPage(t);
  await noJS.setViewport({width: 390, height: 844});
  await noJS.setJavaScriptEnabled(false);
  await noJS.goto(origin, {waitUntil: 'load'});
  await noJS.click('label[for="nav-trigger"]');
  await noJS.click('#primary-navigation a[href="/learn/"]');
  await noJS.waitForFunction(() => location.pathname === '/learn/');
});

test('hero recedes progressively, reverses on return, and preserves usable controls', {timeout: 30000}, async t => {
  const page = await openPage(t);
  await page.setViewport({width: 1440, height: 1000});
  await page.goto(origin, {waitUntil: 'load'});
  await ready(page);
  await page.click('[data-background-toggle]');
  const scroll = async y => {
    await page.evaluate(top => scrollTo({top, behavior: 'instant'}), y);
    await delay(100);
  };
  const geometry = () => page.evaluate(() => {
    const hero = document.querySelector('.cc-hero').getBoundingClientRect();
    const stage = document.querySelector('.cc-hero-stage');
    return {width: hero.width, height: hero.height,
      image: document.querySelector('.cc-hero-wordmark').getBoundingClientRect().width,
      stage: stage.offsetHeight, platform: document.querySelector('.cc-platform').offsetTop};
  });
  await scroll(0);
  const initial = await geometry();
  await scroll(250);
  const midway = await geometry();
  assert.ok(midway.width < initial.width * .98 && midway.width > initial.width * .9, 'Hero shrinks with scroll distance');
  assert.ok(midway.height < initial.height && midway.image < initial.image, 'Panel and original artwork both recede');
  assert.equal(midway.stage, initial.stage, 'Hero retains its layout space');
  assert.equal(midway.platform, initial.platform, 'Following content never jumps');
  await page.mouse.move(0, 0);
  await page.screenshot({path: path.join(ROOT, 'tmp/background/hero-mid-scroll.png')});
  await scroll(480);
  assert.ok((await geometry()).width < midway.width, 'Further scroll continues the contraction');
  const settled = await geometry();
  await delay(250);
  assert.deepEqual(await geometry(), settled, 'The page is still when the visitor stops scrolling');
  await scroll(250);
  await page.hover('.cc-button-primary');
  await page.waitForFunction(() => document.querySelector('.target-cursor-wrapper')?.classList.contains('is-targeting'));
  await page.waitForFunction(() => {
    const target = document.querySelector('.cc-button-primary').getBoundingClientRect();
    const corner = document.querySelector('.target-cursor-corner').getBoundingClientRect();
    return Math.abs(corner.left - (target.left - 3)) < 2 && Math.abs(corner.top - (target.top - 3)) < 2;
  });
  await scroll(0);
  assert.deepEqual(await geometry(), initial, 'Returning to the top restores full-size artwork');

  await page.setViewport({width: 390, height: 844, isMobile: true, hasTouch: true});
  await scroll(0);
  const mobile = await geometry();
  await scroll(280);
  const mobileScroll = await geometry();
  assert.ok(mobileScroll.width < mobile.width && mobileScroll.width >= mobile.width * .94, 'Mobile uses a restrained contraction');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await page.$eval('.cc-button-primary', link => {
    const rect = link.getBoundingClientRect();
    return rect.height >= 44 && document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('a') === link;
  }), true, 'Shrunken mobile CTA remains a reachable 44px target');
  await page.screenshot({path: path.join(ROOT, 'tmp/background/hero-mobile-scroll.png')});
});

test('section entrances and navigation follow scroll, with motion and no-script fallbacks', {timeout: 30000}, async t => {
  const page = await openPage(t, {webgl: false});
  await page.setViewport({width: 1440, height: 1000});
  await page.goto(origin, {waitUntil: 'load'});
  const shift = () => page.$eval('.cc-featured-card', card => Number.parseFloat(card.style.getPropertyValue('--reveal-shift')));
  assert.ok(await shift() > 0, 'Cards below the viewport are positioned for entrance');
  await page.$eval('.cc-scroll-nav a[href="#featured-title"]', link => link.click());
  await page.waitForFunction(() => {
    const heading = document.querySelector('#featured-title').getBoundingClientRect();
    return location.hash === '#featured-title' && heading.top > 150 && heading.top < 200 &&
      document.querySelector('.cc-scroll-nav a[aria-current]')?.hash === '#featured-title';
  });
  await delay(200);
  await delay(500);
  assert.equal(await shift(), 0, 'Entered cards settle in their normal readable position');
  assert.equal(await page.$eval('#featured-title', heading => {
    const bounds = heading.getBoundingClientRect();
    return bounds.top >= document.querySelector('.cc-scroll-nav').getBoundingClientRect().bottom + 12 && bounds.top < 200;
  }), true, 'Settled anchor heading remains fully below both navigation bars');
  assert.equal(await page.$eval('.cc-scroll-nav', nav => {
    const rect = nav.getBoundingClientRect();
    return rect.top >= 80 && rect.bottom < 160;
  }), true, 'Section navigator stays below the compact main header');
  await page.evaluate(() => scrollBy({top: 180, behavior: 'instant'}));
  await delay(100);
  assert.ok(await page.$eval('.cc-scroll-nav a[href="#featured-title"]', link => Number(link.style.getPropertyValue('--section-progress'))) > 0);
  await page.$eval('.cc-scroll-nav a[href="#latest-title"]', link => link.click());
  await page.waitForFunction(() => document.querySelector('.cc-scroll-nav a[aria-current]')?.hash === '#latest-title');

  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'reduce'}]);
  await page.evaluate(() => scrollTo({top: 250, behavior: 'instant'}));
  await delay(100);
  assert.equal(await page.$eval('.cc-hero', hero => getComputedStyle(hero).transform), 'none');
  assert.equal(await page.$eval('.cc-featured-card', card => getComputedStyle(card).translate), 'none');
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
  await page.emulateMediaFeatures([{name: 'prefers-reduced-motion', value: 'no-preference'}]);
  await delay(100);
  assert.notEqual(await page.$eval('.cc-hero', hero => getComputedStyle(hero).transform), 'none', 'Motion preference changes take effect immediately');

  const noJS = await openPage(t);
  await noJS.setViewport({width: 320, height: 900});
  await noJS.setJavaScriptEnabled(false);
  await noJS.goto(origin, {waitUntil: 'load'});
  assert.equal(await noJS.$eval('.cc-hero', hero => getComputedStyle(hero).transform), 'none');
  await noJS.click('.cc-scroll-nav a[href="#featured-title"]');
  assert.equal(await noJS.evaluate(() => location.hash), '#featured-title', 'Section links work without JavaScript');
  assert.equal(await noJS.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
});

test('every public layout includes shared identity, one background and one pause control', async () => {
  const files = (await readdir(SITE, {recursive: true})).filter(file => file.endsWith('.html'));
  let checked = 0;
  for (const file of files) {
    const html = await readFile(path.join(SITE, file), 'utf8');
    if (!html.includes('id="main-content"')) continue; // CMS, redirects and verification documents have no site chrome.
    assert.equal((html.match(/data-faulty-terminal/g) || []).length, 1, file);
    assert.equal((html.match(/data-background-toggle/g) || []).length, 1, file);
    assert.equal((html.match(/href="\/assets\/identity.css"/g) || []).length, 1, file);
    assert.equal((html.match(/src="\/assets\/faulty-terminal.js"/g) || []).length, 1, file);
    assert.equal((html.match(/class="cc-header-dock"/g) || []).length, 1, file);
    if (file !== 'index.html') {
      assert.ok(html.includes('cc-content-surface'), `${file} protects its text`);
      assert.ok(!html.includes('/assets/home-scroll.js'), `${file} does not animate long-form reading`);
    }
    checked++;
  }
  assert.ok(checked >= 190, 'All rendered public page families are covered');
});

test('sitewide background, compact header and readable surfaces work across page families', {timeout: 120000}, async t => {
  const page = await openPage(t);
  const routes = [
    ['analysis', '/analysis/'], ['article', '/2026/09/04/on-gig-work/'],
    ['pathways', '/reading-list/'], ['pathway', '/learn/pathways/marxism-fundamentals/'],
    ['lesson', '/learn/pathways/capital-political-economy/module-01/'],
    ['text', '/library/texts/capital-volume-one/chapter-01/'], ['library', '/library/'],
    ['account', '/account/'], ['topic', '/topics/democracy/'], ['search', '/search/'],
    ['about', '/about/'], ['404', '/404.html']
  ];
  await mkdir(path.join(ROOT, 'tmp/sitewide'), {recursive: true});
  for (const [name, route] of routes) {
    await page.setViewport({width: 1440, height: 1000});
    // Let deferred account and catalog modules settle before changing viewports
    // or navigating again; external services are deliberately blocked in this suite.
    await page.goto(`${origin}${route}`, {waitUntil: 'networkidle0'});
    await ready(page);
    if (await paused(page)) await page.click('[data-background-toggle]');
    const initialDraws = await draws(page);
    await page.waitForFunction(count => window.terminalDraws > count, {}, initialDraws);
    await page.click('[data-background-toggle]');
    const readability = await page.$eval('.cc-content-surface', surface => {
      const style = getComputedStyle(surface);
      const parse = value => value.match(/[\d.]+/g).map(Number);
      const floor = parse(style.backgroundColor);
      const alpha = floor[3] ?? 1;
      // A white scene is harsher than this dark terminal and gives a conservative contrast bound.
      const background = floor.slice(0, 3).map(channel => channel * alpha + 255 * (1 - alpha));
      const luminance = rgb => rgb.map(value => {
        const v = value / 255;
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
      }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const sample = surface.querySelector('p');
      const color = sample ? getComputedStyle(sample).color : style.color;
      const ratio = (luminance(parse(color)) + .05) / (luminance(background) + .05);
      return {alpha, ratio, filter: style.backdropFilter};
    });
    assert.ok(readability.alpha >= .9 && readability.ratio >= 4.5, `${route} protects text contrast: ${JSON.stringify(readability)}`);
    assert.equal(readability.filter, 'none', 'Long reading surfaces avoid expensive full-document blur');
    await page.mouse.move(0, 0);
    await page.screenshot({path: path.join(ROOT, `tmp/sitewide/${name}-desktop.png`)});
    const surfaceTop = await page.$eval('.cc-content-surface', surface => surface.getBoundingClientRect().top + scrollY);
    const expanded = await page.$eval('.site-header', header => header.getBoundingClientRect().height);
    await page.evaluate(() => scrollTo({top: 400, behavior: 'instant'}));
    await delay(500);
    const scrolled = await page.evaluate(() => scrollY > 72);
    const currentHeight = await page.$eval('.site-header', header => header.getBoundingClientRect().height);
    if (scrolled) assert.ok(currentHeight < expanded, `${route} header contracts`);
    else assert.equal(currentHeight, expanded, `${route} keeps its expanded header when the page is too short to scroll`);
    assert.equal(await page.$eval('.cc-content-surface', surface => surface.getBoundingClientRect().top + scrollY), surfaceTop, `${route} content does not shift`);
    for (const width of [390, 320]) {
      await page.setViewport({width, height: 900});
      await delay(150);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${route} fits ${width}px`);
    }
    await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
    await delay(500);
    await page.screenshot({path: path.join(ROOT, `tmp/sitewide/${name}-mobile.png`)});
    await page.click('label[for="nav-trigger"]');
    assert.equal(await page.$eval('#nav-trigger', toggle => toggle.checked), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.$eval('#nav-trigger', toggle => !toggle.checked), true);
  }
});

test('pause persists across pages and storage or WebGL failures remain usable', {timeout: 30000}, async t => {
  const page = await openPage(t);
  await page.goto(`${origin}/about/`, {waitUntil: 'load'});
  await ready(page);
  await page.click('[data-background-toggle]');
  await page.goto(`${origin}/search/`, {waitUntil: 'load'});
  await ready(page);
  assert.equal(await paused(page), true);
  await delay(150);
  const frozen = await draws(page);
  await delay(200);
  assert.equal(await draws(page), frozen, 'Pause still stops rendering after navigation');
  await page.click('[data-background-toggle]');
  await page.waitForFunction(count => window.terminalDraws > count, {}, frozen);
  await page.goto(`${origin}/about/`, {waitUntil: 'load'});
  await ready(page);
  assert.equal(await paused(page), false, 'Resuming is also remembered');

  const client = await page.createCDPSession();
  for (const feature of [
    {name: 'prefers-reduced-motion', value: 'reduce'},
    {name: 'prefers-reduced-transparency', value: 'reduce'},
    {name: 'prefers-contrast', value: 'more'},
    {name: 'forced-colors', value: 'active'}
  ]) {
    await client.send('Emulation.setEmulatedMedia', {features: [feature]});
    await page.waitForFunction(() => !document.querySelector('[data-faulty-terminal] canvas'));
    assert.equal(await page.$eval('.cc-page-controls', controls => getComputedStyle(controls).display), 'none');
  }

  const noStorage = await openPage(t);
  await noStorage.evaluateOnNewDocument(() => {
    Object.defineProperty(window, 'sessionStorage', {get() { throw new DOMException('Unavailable', 'SecurityError'); }});
  });
  await noStorage.goto(`${origin}/about/`, {waitUntil: 'load'});
  await ready(noStorage);
  await noStorage.click('[data-background-toggle]');
  assert.equal(await paused(noStorage), true, 'Storage failure never prevents pausing');
  const noWebGL = await openPage(t, {webgl: false});
  await noWebGL.goto(`${origin}/about/`, {waitUntil: 'load'});
  assert.equal(await noWebGL.$('[data-faulty-terminal] canvas'), null);
  assert.ok(await noWebGL.$('.cc-content-surface h1'), 'Text remains available without a renderer');
});
