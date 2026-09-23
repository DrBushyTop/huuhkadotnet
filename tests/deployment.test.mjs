import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {imageUrl, rewriteHtml, prepare} from '../deployment/prepare.mjs';

const base = 'https://media.blob.core.windows.net/images';
test('deployment maps local and canonical image URLs without rewriting external links', () => {
  assert.equal(imageUrl('/images/ghost/a.png', base), `${base}/ghost/a.png`);
  assert.equal(imageUrl('https://www.huuhka.net/images/ghost/a.png', base), `${base}/ghost/a.png`);
  assert.equal(imageUrl('https://other.example/a.png', base), 'https://other.example/a.png');
  assert.equal(imageUrl('/article/', base), '/article/');
});
test('deployment rewrites image attributes and structured data while preserving code and anchors', () => {
  const html = '<!doctype html><html><head><meta name="robots" content="noindex, nofollow"><meta property="og:image" content="https://www.huuhka.net/images/a.png"><script type="application/ld+json">{"image":"/images/a.png"}</script></head><body><a id="legacy"></a><a href="/images/a.png"><img src="/images/a.png" srcset="/images/a.png 1x, /images/b.png 2x"></a><pre><code>const path = "/images/a.png";</code></pre></body></html>';
  const output = parseHTML(rewriteHtml(html, base, false)).document;
  assert.equal(output.querySelector('img').getAttribute('src'), `${base}/a.png`);
  assert.equal(output.querySelector('img').getAttribute('srcset'), `${base}/a.png 1x, ${base}/b.png 2x`);
  assert.equal(output.querySelector('a[href]').getAttribute('href'), `${base}/a.png`);
  assert.equal(output.querySelector('meta[property="og:image"]').content, `${base}/a.png`);
  assert.equal(JSON.parse(output.querySelector('script').textContent).image, `${base}/a.png`);
  assert.equal(output.querySelector('code').textContent, 'const path = "/images/a.png";');
  assert.ok(output.getElementById('legacy'));
  assert.ok(output.querySelector('meta[name="robots"]'));
  assert.equal(parseHTML(rewriteHtml(html, base, true)).document.querySelector('meta[name="robots"]'), null);
});


test('deployment caches versioned assets without assigning long lifetimes to pages', t => {
  const root = mkdtempSync(join(tmpdir(), 'huuhka-cache-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const source = join(root, 'dist');
  const target = join(root, 'package');
  mkdirSync(join(source, 'images'), {recursive: true});
  writeFileSync(join(source, 'index.html'), '<html><body>Home</body></html>');
  writeFileSync(join(source, 'rss'), '<rss/>');
  prepare({source, target, mediaBaseUrl: base});
  const config = JSON.parse(readFileSync(join(target, 'site/staticwebapp.config.json'), 'utf8'));
  const cacheFor = path => config.routes.find(rule => rule.route.endsWith('*')
    ? path.startsWith(rule.route.slice(0, -1)) : path === rule.route)?.headers?.['Cache-Control'];
  for (const path of ['/_astro/site.abc123.css', '/_astro/search.def456.js', '/_astro/geist.ghi789.woff2']) {
    assert.equal(cacheFor(path), 'public, max-age=31536000, immutable');
  }
  assert.equal(cacheFor('/fonts/sauce-code-pro/regular.woff2'), 'public, max-age=86400');
  for (const path of ['/', '/article/', '/rss', '/sitemap.xml', '/404.html', '/images/pasi.webp']) {
    assert.equal(cacheFor(path), undefined, `no long-lived cache override for ${path}`);
  }
  assert.equal(config.globalHeaders['Cache-Control'], undefined);
  assert.equal(config.globalHeaders['X-Robots-Tag'], 'noindex, nofollow');
});
