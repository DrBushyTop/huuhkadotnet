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

// Run the page's actual controller against its built DOM, without loading embeds.
test('search hides popular articles and restores them on clear and history changes', async () => {
  const {transpile} = await import('typescript');
  const {createArticleSearch} = await import('../src/lib/search.ts');
  const source = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const controller = source.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
    .replace(/import \{ createArticleSearch \} from '\.\.\/lib\/search';/, '');
  const {document, Event} = parseHTML(readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8'));
  const events = new Map();
  const window = {
    location: new URL('https://www.huuhka.net/?q=azure'),
    history: {replaceState: (_state, _title, url) => { window.location = new URL(url); }},
    addEventListener: (name, handler) => events.set(name, handler),
  };
  new Function('document', 'window', 'createArticleSearch', transpile(controller))(
    document, window, createArticleSearch,
  );
  const input = document.querySelector('#article-search');
  const popular = document.querySelector('.popular-section');
  const count = document.querySelector('#result-count');
  assert.equal(popular.hidden, true, 'a bookmarked query hides popular on load');
  assert.match(count.textContent, /articles found/);

  input.value = 'zzzznomatchzzzz';
  input.dispatchEvent(new Event('input'));
  assert.equal(popular.hidden, true);
  assert.equal(document.querySelector('.empty-state').hidden, false);
  assert.equal(count.textContent, '0 articles found');

  document.querySelector('.clear-search').dispatchEvent(new Event('click'));
  assert.equal(popular.hidden, false);
  assert.equal(count.textContent, '12 of 55 articles');
  assert.equal(window.location.search, '');

  window.location.search = '?q=azure';
  events.get('popstate')();
  assert.equal(popular.hidden, true);
  window.location.search = '';
  events.get('popstate')();
  assert.equal(popular.hidden, false);

  input.value = '   ';
  input.dispatchEvent(new Event('input'));
  assert.equal(popular.hidden, false, 'whitespace is not an active search');
});
