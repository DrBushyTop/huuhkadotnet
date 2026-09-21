import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createArticleSearch } from '../src/lib/search.ts';

const posts = JSON.parse(readFileSync(new URL('../src/data/posts.json', import.meta.url)));
const search = createArticleSearch(posts);

test('empty search preserves chronological order across all preview articles', () => {
  assert.ok(posts.length >= 12);
  assert.deepEqual(search('  '), posts.map((post) => post.slug));
  const dates = posts.map((post) => Date.parse(post.publishedAt));
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
});

test('finds a title despite a transposed character', () => {
  assert.ok(search('reveiwer').includes('building-your-own-pr-reviewer-with-coding-agents'));
});

test('matches multiple words regardless of order or case', () => {
  assert.equal(search('OPENCODE bicep')[0], 'enabling-bicep-language-server-support-in-opencode');
});

test('searches tags as well as titles', () => {
  assert.ok(search('Telemetry').includes('designing-a-shared-opentelemetry-contract-for-ai-services-on-azure'));
});

test('returns no matches for unrelated text or markup', () => {
  assert.deepEqual(search('zzzzzzzzzzzz'), []);
  assert.deepEqual(search('<script>alert(1)</script>'), []);
});

test('preview data has distinct slugs and original publication links', () => {
  assert.equal(new Set(posts.map((post) => post.slug)).size, posts.length);
  for (const post of posts) {
    assert.equal(post.url, `https://www.huuhka.net/${post.slug}/`);
    assert.ok(post.tags.length);
    assert.ok(!Number.isNaN(Date.parse(post.publishedAt)));
    assert.ok(existsSync(new URL(`../public${post.image}`, import.meta.url)));
  }
});

test('search includes posts beyond the first twelve', () => {
  const older = posts[12];
  assert.equal(search(older.title)[0], older.slug);
});
