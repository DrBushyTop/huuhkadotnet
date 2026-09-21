import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {parseHTML} from 'linkedom';

const origin = process.env.SITE_URL;
assert.ok(origin, 'SITE_URL is required');
const site = '.deployment/site';
const images = new Set();
const pages = readdirSync(site, {recursive: true}).filter(path => path.endsWith('/index.html') && !path.includes('/amp/'));
for (const path of ['index.html', ...pages]) {
  const url = new URL(path.replace(/index\.html$/, ''), `${origin}/`);
  const response = await fetch(url);
  assert.equal(response.status, 200, url.href);
  const document = parseHTML(await response.text()).document;
  assert.equal(document.querySelector('title')?.textContent, parseHTML(readFileSync(`${site}/${path}`, 'utf8')).document.querySelector('title')?.textContent, url.href);
  for (const img of document.querySelectorAll('img')) {
    assert.ok(img.src.startsWith('https://'), `Image is still hosted by app: ${img.src}`);
    images.add(img.src);
  }
}
for (const url of images) {
  const response = await fetch(url, {method: 'HEAD'});
  assert.equal(response.status, 200, url);
  assert.match(response.headers.get('content-type'), /^image\//, url);
}
const config = JSON.parse(readFileSync(`${site}/staticwebapp.config.json`, 'utf8'));
for (const rule of config.routes.filter(rule => rule.redirect).flatMap(rule => [rule, {...rule, route: rule.route.replace('/index.html', '/')}, {...rule, route: rule.route.replace('/index.html', '')}])) {
  const response = await fetch(new URL(rule.route, origin), {redirect: 'manual'});
  assert.equal(response.status, rule.statusCode, rule.route);
  assert.equal(new URL(response.headers.get('location'), origin).pathname, rule.redirect, rule.route);
}
for (const path of ['/rss/', '/sitemap.xml']) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('content-type'), /xml/, path);
}
assert.equal((await fetch(new URL('/this-page-does-not-exist/', origin))).status, 404);
console.log(`Verified ${pages.length + 1} pages, ${images.size} image URLs, redirects, XML feeds and 404 at ${origin}.`);
