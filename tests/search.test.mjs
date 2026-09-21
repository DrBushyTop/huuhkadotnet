import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import YAML from 'yaml';
import { createArticleSearch } from '../src/lib/search.ts';

const posts = readdirSync(new URL('../src/content/blog/',import.meta.url)).filter(f=>f.endsWith('.mdx')).map(file=>{
  const source=readFileSync(new URL(`../src/content/blog/${file}`,import.meta.url),'utf8');
  const data=YAML.parse(source.split('---')[1]);
  return {...data,url:`/${data.slug}/`};
}).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
const search = createArticleSearch(posts);

test('empty search preserves chronological order across all articles', () => {
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

test('content has distinct slugs and local publication links', () => {
  assert.equal(new Set(posts.map((post) => post.slug)).size, posts.length);
  for (const post of posts) {
    assert.equal(post.url, `/${post.slug}/`);
    assert.ok(!Number.isNaN(Date.parse(post.publishedAt)));
    if(post.image) assert.ok(existsSync(new URL(`../public${post.image}`, import.meta.url)));
  }
});

test('search includes posts beyond the first twelve', () => {
  const older = posts[12];
  assert.equal(search(older.title)[0], older.slug);
});
