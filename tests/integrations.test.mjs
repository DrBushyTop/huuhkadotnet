import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {mountAnalytics} from '../src/lib/analytics.ts';
import {isPublicSite, publicHostnames, umamiWebsiteId} from '../src/lib/site-integrations.ts';
import {mountComments} from '../src/lib/comments.ts';

const homepage = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const article = readFileSync(new URL('../dist/ci-with-azure-pipelines-yaml/index.html', import.meta.url), 'utf8');

function browser(html = homepage, url = 'https://www.huuhka.net/article/?giscus=secret#heading') {
  const {document, Event} = parseHTML(html);
  const values = new Map();
  const events = new Map();
  const cookies = new Map();
  const deletions = [];
  const timers = new Map();
  Object.defineProperty(document, 'cookie', {
    get: () => [...cookies].map(([key, value]) => `${key}=${value}`).join('; '),
    set: value => {
      if (value.includes('Max-Age=0')) {
        deletions.push(value);
        cookies.delete(value.split('=')[0]);
      }
    },
  });
  const window = {
    document, location: new URL(url), navigator: {doNotTrack: null},
    localStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    addEventListener: (name, fn) => events.set(name, fn),
    setTimeout: fn => { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout: id => timers.delete(id),
  };
  const click = selector => document.querySelector(selector).dispatchEvent(new Event('click'));
  return {window, document, values, cookies, deletions, events, timers, click, Event};
}

test('integrations only run on exact public HTTPS hosts', () => {
  for (const host of ['huuhka.net', 'www.huuhka.net', 'blog.huuhka.net']) {
    assert.equal(isPublicSite(new URL(`https://${host}`)), true);
  }
  for (const url of ['http://huuhka.net', 'http://localhost:4321', 'https://preview.azurestaticapps.net', 'https://huuhka.net.example.com']) {
    assert.equal(isPublicSite(new URL(url)), false);
  }
});

test('Umami loads once on public pages without a consent prompt', () => {
  const {window, document} = browser();
  mountAnalytics(window);
  mountAnalytics(window);
  const scripts = document.querySelectorAll('script[src="https://cloud.umami.is/script.js"]');
  assert.equal(scripts.length, 1);
  const script = scripts[0];
  assert.equal(script.defer, true);
  assert.equal(script.getAttribute('data-website-id'), umamiWebsiteId);
  assert.equal(umamiWebsiteId, '3f673ea9-160f-4880-8d92-226feaa1e6d9');
  assert.equal(script.getAttribute('data-domains'), publicHostnames.join(','));
  assert.equal(script.getAttribute('data-do-not-track'), 'true');
  assert.equal(script.getAttribute('data-exclude-search'), 'true');
  assert.equal(script.getAttribute('data-exclude-hash'), 'true');
  assert.equal(document.querySelector('script[src*="googletagmanager"]'), null);
  assert.equal(window.dataLayer, undefined);
});

test('all public HTTPS hosts load Umami, previews never load analytics', () => {
  for (const host of publicHostnames) {
    const {window, document} = browser(homepage, `https://${host}/`);
    mountAnalytics(window);
    assert.ok(document.querySelector('script[data-website-id]'));
  }
  for (const url of ['http://huuhka.net', 'http://localhost:4321', 'https://preview.azurestaticapps.net', 'https://huuhka.net.example.com']) {
    const {window, document} = browser(homepage, url);
    mountAnalytics(window);
    assert.equal(document.querySelector('script[data-website-id]'), null);
  }
});

test('Do Not Track prevents even loading the analytics script', () => {
  for (const value of ['1', 'yes']) {
    const {window, document} = browser();
    window.navigator.doNotTrack = value;
    mountAnalytics(window);
    assert.equal(document.querySelector('script[data-website-id]'), null);
  }
});

test('analytics bootstrap does not read or write cookies or browser storage', () => {
  const {window, document} = browser();
  Object.defineProperty(window, 'localStorage', {get() { throw Error('storage accessed'); }});
  mountAnalytics(window);
  assert.ok(document.querySelector('script[data-website-id]'));
  assert.equal(document.cookie, '');
});

test('preview hosts load neither Umami nor giscus', () => {
  const {window, document} = browser(article, 'http://localhost:4321/article/');
  mountAnalytics(window);
  mountComments(window);
  assert.equal(document.querySelector('script[data-website-id]'), null);
  assert.equal(document.querySelector('script[src*="giscus.app"]'), null);
  assert.equal(document.querySelector('[data-load-comments]').hidden, true);
});

test('built pages retain Privacy but remove the GA consent UI', () => {
  for (const html of [homepage, article, readFileSync(new URL('../dist/privacy/index.html', import.meta.url), 'utf8')]) {
    const {document} = parseHTML(html);
    assert.ok(document.querySelector('footer a[href="/privacy/"]'));
    assert.equal(document.querySelector('#analytics-preferences'), null);
    assert.equal(document.querySelector('[data-privacy-settings]'), null);
    assert.doesNotMatch(html, /googletagmanager|G-X678YYBF80|Accept analytics|Reject analytics/);
  }
});

test('giscus loads only on request with stable strict mapping and no analytics consent', () => {
  const {window, document, click, timers} = browser(article);
  mountComments(window);
  assert.equal(document.querySelector('script[src*="giscus.app"]'), null);
  click('[data-load-comments]');
  click('[data-load-comments]');
  const scripts = document.querySelectorAll('script[src="https://giscus.app/client.js"]');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].getAttribute('data-term'), '/ci-with-azure-pipelines-yaml/');
  assert.equal(scripts[0].getAttribute('data-strict'), '1');
  assert.equal(scripts[0].getAttribute('data-repo'), 'DrBushyTop/huuhkadotnet');
  assert.ok(scripts[0].getAttribute('data-category-id'));
  assert.equal(document.querySelector('script[src*="googletagmanager"]'), null);
  [...timers.values()][0]();
  assert.match(document.querySelector('[data-comments-status]').textContent, /could not load/);
  assert.ok(document.querySelector('.comments-actions a[href*="github.com"]'));
});

test('giscus trusts messages only from its own iframe and origin', () => {
  const {window, document, click, events} = browser(article);
  mountComments(window);
  click('[data-load-comments]');
  const iframe = document.createElement('iframe');
  iframe.className = 'giscus-frame';
  const source = {};
  Object.defineProperty(iframe, 'contentWindow', {value:source});
  document.querySelector('.giscus').append(iframe);
  const receive = events.get('message');
  const data = {giscus:{resizeHeight:300}};
  receive({origin:'https://evil.example',source,data});
  receive({origin:'https://giscus.app',source:{},data});
  assert.match(document.querySelector('[data-comments-status]').textContent, /Loading/);
  receive({origin:'https://giscus.app',source,data});
  assert.equal(document.querySelector('[data-comments-status]').textContent, '');
});

test('comments appear on posts but not the homepage or community page', () => {
  assert.ok(parseHTML(article).document.querySelector('[data-comments]'));
  assert.equal(parseHTML(homepage).document.querySelector('[data-comments]'), null);
  const community = readFileSync(new URL('../dist/community-activities/index.html', import.meta.url), 'utf8');
  assert.equal(parseHTML(community).document.querySelector('[data-comments]'), null);
});

test('giscus uses Macchiato on dark pages and receives theme updates without reloading', () => {
  const b = browser(article);
  b.document.documentElement.dataset.theme = 'dark';
  mountComments(b.window);
  b.click('[data-load-comments]');
  assert.equal(b.document.querySelector('.giscus script').getAttribute('data-theme'), 'catppuccin_macchiato');
  const frame = b.document.createElement('iframe');
  frame.className = 'giscus-frame';
  const messages = [];
  Object.defineProperty(frame, 'contentWindow', {value: {postMessage: (...args) => messages.push(args)}});
  b.document.querySelector('.giscus').append(frame);
  b.document.documentElement.dataset.theme = 'light';
  b.events.get('themechange')();
  assert.deepEqual(messages, [[{giscus: {setConfig: {theme: 'catppuccin_latte'}}}, 'https://giscus.app']]);
  assert.equal(b.document.querySelectorAll('.giscus script').length, 1);
});
