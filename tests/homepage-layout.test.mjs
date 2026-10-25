import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {frontmatterField, isPublished} from '../src/lib/publishing.ts';

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const {document} = parseHTML(html);
const blog = new URL('../src/content/blog/', import.meta.url);
const published = readdirSync(blog).filter(file => file.endsWith('.mdx')).map(file => {
  const source = readFileSync(new URL(file, blog), 'utf8');
  return {slug: frontmatterField(source, 'slug'), title: '', publishedAt: frontmatterField(source, 'publishedAt'), draft: frontmatterField(source, 'draft') === 'true'};
}).filter(post => isPublished(post, Date.now()));
const publishedCount = published.length;

test('homepage keeps the featured story, popular articles, and complete writing list', () => {
  const main = document.querySelector('main.field-notes');
  assert.ok(main);
  const lead = main.querySelector('.notes-hero h1 a')?.getAttribute('href');
  assert.ok(published.some(post => lead === `/${post.slug}/`), 'the lead story is a published post');
  assert.equal(main.querySelectorAll('.notes-popular .popular-card').length, 3);
  assert.equal(main.querySelectorAll('#notes-list li[data-slug]').length, publishedCount);
  assert.equal(main.querySelector('#notes-count').textContent, `${publishedCount} articles`);
  assert.equal(main.querySelector('.notes-scroll').getAttribute('tabindex'), '0');
  assert.ok(main.querySelector('.notes-scroll[role="region"][aria-label]'));
  assert.ok(main.querySelector('form[role="search"][hidden]'), 'the list remains usable without JavaScript');
});

test('homepage search filters the complete list without hiding the featured or popular articles', async () => {
  const {transpile} = await import('typescript');
  const {createArticleSearch} = await import('../src/lib/search.ts');
  const source = readFileSync(new URL('../src/components/FieldNotesHome.astro', import.meta.url), 'utf8');
  const controller = source.match(/<script>\s*([\s\S]*?)<\/script>/)[1]
    .replace(/import \{ createArticleSearch \} from '\.\.\/lib\/search';/, '');
  const {document, Event} = parseHTML(html);
  const events = new Map();
  const location = new URL('https://www.huuhka.net/?q=azure');
  const history = {replaceState: (_state, _title, url) => { location.href = new URL(url).href; }};
  const window = {addEventListener: (name, handler) => events.set(name, handler)};
  new Function('document', 'window', 'location', 'history', 'createArticleSearch', transpile(controller))(
    document, window, location, history, createArticleSearch,
  );

  const input = document.querySelector('#notes-search');
  const count = document.querySelector('#notes-count');
  const list = document.querySelector('#notes-list');
  const popular = document.querySelector('.notes-popular');
  const hero = document.querySelector('.notes-hero');
  assert.equal(document.querySelector('.search-form').hidden, false);
  assert.match(count.textContent, /articles found/);
  assert.ok([...list.children].some(row => row.hidden));
  assert.equal(popular.hidden, false);
  assert.equal(hero.hidden, false);

  input.value = 'zzzznomatchzzzz';
  input.dispatchEvent(new Event('input'));
  assert.equal(count.textContent, '0 articles found');
  assert.equal(document.querySelector('.notes-empty').hidden, false);
  assert.equal(list.hidden, true);
  assert.equal(popular.hidden, false);

  document.querySelector('.clear-search').dispatchEvent(new Event('click'));
  assert.equal(count.textContent, `${publishedCount} articles`);
  assert.equal(list.hidden, false);
  assert.equal([...list.children].filter(row => !row.hidden).length, publishedCount);
  assert.equal(location.search, '');

  location.search = '?q=azure';
  events.get('popstate')();
  assert.match(count.textContent, /articles found/);
});
