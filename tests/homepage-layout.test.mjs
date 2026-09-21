import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';

const {document} = parseHTML(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'));

test('one accessible search follows the author introduction before popular articles', () => {
  assert.equal(document.querySelectorAll('#article-search').length, 1);
  const toolbar = document.querySelector('.homepage-toolbar');
  assert.ok(toolbar.querySelector('.introduction-copy h1#author-name'));
  assert.equal(toolbar.nextElementSibling.className, 'popular-section');
  const form = toolbar.querySelector('form[role="search"]');
  assert.equal(form.previousElementSibling.className, 'introduction');
  assert.equal(form.querySelector('label').getAttribute('for'), 'article-search');
  assert.equal(form.querySelector('input').getAttribute('aria-controls'), 'article-grid');
  assert.ok(form.hasAttribute('hidden'), 'search stays hidden without JavaScript');
});

test('archive heading and single live count share a container', () => {
  assert.equal(document.querySelectorAll('#result-count').length, 1);
  const count = document.querySelector('.archive-heading #result-count');
  assert.ok(count);
  assert.equal(count.previousElementSibling.id, 'archive-heading');
  assert.equal(count.getAttribute('role'), 'status');
  assert.equal(count.getAttribute('aria-live'), 'polite');
  assert.equal(count.textContent, '55 articles');
  assert.equal(document.querySelectorAll('.article-card:not([hidden])').length, 55);
});
