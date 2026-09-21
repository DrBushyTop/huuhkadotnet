import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';

const {document} = parseHTML(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'));
const profile = 'https://sessionize.com/pasi-huuhka/';

test('About is absent from desktop and mobile navigation', () => {
  for (const selector of ['.main-nav', '.mobile-page-links']) {
    const nav = document.querySelector(selector);
    assert.ok(nav);
    assert.equal(nav.querySelector('a[href="/author/pasi/"]'), null);
    assert.doesNotMatch(nav.textContent, /About/);
    assert.ok(nav.querySelector('a[href="/"]'));
  }
});

test('Sessionize is accessible in both headers and the mobile menu', () => {
  for (const selector of ['.social-nav', '.mobile-header-actions', '.mobile-social-links']) {
    const link = document.querySelector(`${selector} a[href="${profile}"]`);
    assert.ok(link, selector);
    assert.match(link.getAttribute('aria-label') || link.textContent, /Sessionize/);
    assert.ok(link.querySelector('svg[aria-hidden="true"] path'));
  }
  assert.ok(document.querySelector('.mobile-social-links a[href="https://github.com/DrBushyTop"]'));
});

test('Presentations links to the repository in desktop and mobile navigation', () => {
  for (const selector of ['.main-nav', '.mobile-page-links']) {
    const link = document.querySelector(`${selector} a[href="https://github.com/DrBushyTop/presentations"]`);
    assert.ok(link, selector);
    assert.equal(link.textContent.trim(), 'Presentations');
    assert.equal(link.hasAttribute('aria-current'), false);
  }
});

for (const [label, href] of [
  ['Finland Azure User Group', 'https://www.meetup.com/finland-azure-user-group/'],
  ['IglooConf', 'https://www.iglooconf.fi/'],
]) {
  test(`${label} is linked in desktop and mobile navigation`, () => {
    for (const selector of ['.main-nav', '.mobile-page-links']) {
      const link = document.querySelector(`${selector} a[href="${href}"]`);
      assert.ok(link, selector);
      assert.equal(link.textContent.trim(), label);
      assert.equal(link.hasAttribute('aria-current'), false);
      assert.equal(link.hasAttribute('target'), false);
    }
  });
}
