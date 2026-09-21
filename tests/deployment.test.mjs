import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {imageUrl, rewriteHtml} from '../deployment/prepare.mjs';

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
