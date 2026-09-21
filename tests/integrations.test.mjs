import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {createAnalytics, mountAnalytics, readConsent, clearAnalyticsCookies, consentKey, consentLifetime} from '../src/lib/analytics.ts';
import {isPublicSite, measurementId} from '../src/lib/site-integrations.ts';
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
    document, location: new URL(url),
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

test('consent rejects missing, invalid, future, and expired storage', () => {
  const now = 10 * consentLifetime;
  const storage = value => ({getItem: () => value});
  for (const value of [null, '{', '{}', '{"accepted":"yes"}',
    JSON.stringify({accepted:true,savedAt:now + 1}),
    JSON.stringify({accepted:true,savedAt:now - consentLifetime})]) {
    assert.equal(readConsent(storage(value), now), null);
  }
  for (const accepted of [true, false]) {
    assert.equal(readConsent(storage(JSON.stringify({accepted,savedAt:now - 1})), now), accepted);
  }
  assert.equal(readConsent({getItem() { throw Error('blocked'); }}, now), null);
});

test('GA loads once after consent, sends one page view, and disables on withdrawal', () => {
  const {window, document} = browser();
  const analytics = createAnalytics(window);
  analytics.apply(false);
  assert.equal(document.querySelector('script[src*="googletagmanager"]'), null);
  assert.equal(window.dataLayer, undefined);
  analytics.apply(true);
  analytics.apply(true);
  assert.equal(document.querySelectorAll('script[src*="googletagmanager"]').length, 1);
  const commands = window.dataLayer.map(args => [...args]);
  assert.equal(commands.filter(args => args[0] === 'event' && args[1] === 'page_view').length, 1);
  assert.equal(commands.find(args => args[0] === 'event')[2].page_location, 'https://www.huuhka.net/article/');
  const config = commands.find(args => args[0] === 'config');
  assert.equal(config[1], measurementId);
  assert.equal(config[2].send_page_view, false);
  assert.equal(config[2].allow_google_signals, false);
  assert.equal(commands[0][2].ad_storage, 'denied');
  analytics.apply(false);
  assert.equal(window[`ga-disable-${measurementId}`], true);
  assert.equal([...window.dataLayer.at(-1)][2].analytics_storage, 'denied');
});

test('preview acceptance never inserts Google or giscus scripts', () => {
  const {window, document, click} = browser(article, 'http://localhost:4321/article/');
  mountAnalytics(window);
  mountComments(window);
  click('[data-consent="accept"]');
  assert.equal(document.querySelector('script[src*="googletagmanager"]'), null);
  assert.equal(document.querySelector('script[src*="giscus.app"]'), null);
  assert.equal(document.querySelector('[data-load-comments]').hidden, true);
});

test('privacy controls persist choices, reopen, and honor rejection in another tab', () => {
  const {window, document, click, values, events} = browser();
  mountAnalytics(window);
  assert.equal(document.querySelector('#analytics-preferences').hidden, false);
  click('[data-consent="reject"]');
  assert.equal(JSON.parse(values.get(consentKey)).accepted, false);
  assert.equal(document.querySelector('#analytics-preferences').hidden, true);
  click('[data-privacy-settings]');
  assert.equal(document.querySelector('#analytics-preferences').hidden, false);
  click('[data-consent="accept"]');
  assert.ok(document.querySelector('script[src*="googletagmanager"]'));
  values.set(consentKey, JSON.stringify({accepted:false,savedAt:Date.now()}));
  events.get('storage')({key:consentKey});
  assert.equal(window[`ga-disable-${measurementId}`], true);
});

test('stored consent loads GA, blocked storage fails closed without breaking controls', () => {
  const accepted = browser();
  accepted.values.set(consentKey, JSON.stringify({accepted:true,savedAt:Date.now()}));
  mountAnalytics(accepted.window);
  assert.ok(accepted.document.querySelector('script[src*="googletagmanager"]'));
  const blocked = browser();
  Object.defineProperty(blocked.window, 'localStorage', {get() { throw Error('denied'); }});
  mountAnalytics(blocked.window);
  assert.equal(blocked.document.querySelector('script[src*="googletagmanager"]'), null);
  blocked.click('[data-consent="reject"]');
  assert.equal(blocked.document.querySelector('#analytics-preferences').hidden, true);
});

test('withdrawal clears GA cookies across host and parent domains, not unrelated cookies', () => {
  const {document, cookies, deletions} = browser();
  for (const key of ['_ga', '_ga_X678YYBF80', '_gid', 'other']) cookies.set(key, 'value');
  clearAnalyticsCookies(document, 'www.huuhka.net');
  assert.deepEqual([...cookies.keys()], ['other']);
  assert.ok(deletions.some(value => value.includes('Domain=huuhka.net')));
  assert.ok(deletions.some(value => !value.includes('Domain=')));
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
