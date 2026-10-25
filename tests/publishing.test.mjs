import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import YAML from 'yaml';
import {duePosts, frontmatterField, isPublished, seriesParts} from '../src/lib/publishing.ts';

const blog = new URL('../src/content/blog/', import.meta.url);
const sources = readdirSync(blog).filter(file => file.endsWith('.mdx')).map(file => readFileSync(new URL(file, blog), 'utf8'));
const posts = sources.map(source => YAML.parse(source.split('---')[1]));
const now = Date.parse('2026-11-10T07:00:00Z');
const post = (slug, publishedAt, draft = false) => ({slug, title: slug, publishedAt, draft});

test('a post is live once it is not a draft and its time has passed', () => {
  assert.equal(isPublished(post('a', '2026-11-10T08:00:00.000+02:00'), now), true);
  assert.equal(isPublished(post('b', '2026-11-10T10:00:00.000+02:00'), now), false);
  assert.equal(isPublished(post('c', '2026-11-03T08:00:00.000+02:00', true), now), false);
});

test('series parts keep unpublished members with their release dates', () => {
  const entries = new Map([
    post('one', '2026-11-03T08:00:00.000+02:00'),
    post('two', '2026-11-17T08:00:00.000+02:00'),
    post('three', '2026-11-03T08:00:00.000+02:00', true),
  ].map(entry => [entry.slug, entry]));
  assert.deepEqual(seriesParts(['one', 'two', 'three', 'missing'], entries, now), [
    {slug: 'one', title: 'one', published: true, releaseAt: undefined},
    {slug: 'two', title: 'two', published: false, releaseAt: '2026-11-17T08:00:00.000+02:00'},
    {slug: 'three', title: 'three', published: false, releaseAt: undefined},
  ]);
});

test('the release check finds live posts missing from the deployed sitemap', () => {
  const live = new Set(['https://www.huuhka.net/one/']);
  const all = [post('one', '2026-11-03T08:00:00.000+02:00'), post('two', '2026-11-10T08:00:00.000+02:00'), post('three', '2026-11-17T08:00:00.000+02:00')];
  assert.deepEqual(duePosts(all, live, now), ['two']);
});

test('the release check reads frontmatter the same way as YAML', () => {
  sources.forEach((source, index) => {
    for (const field of ['slug', 'publishedAt', 'draft']) assert.equal(frontmatterField(source, field), String(posts[index][field] ?? false));
  });
});

test('the build leaves out drafts and scheduled posts everywhere', () => {
  const sitemap = readFileSync(new URL('../dist/sitemap.xml', import.meta.url), 'utf8');
  const rss = readFileSync(new URL('../dist/rss', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  for (const entry of posts.filter(entry => !isPublished(entry, Date.now()))) {
    assert.ok(!existsSync(new URL(`../dist/${entry.slug}/index.html`, import.meta.url)), `${entry.slug} has no page`);
    for (const output of [sitemap, rss, home]) assert.ok(!output.includes(`/${entry.slug}/`), `${entry.slug} is not linked`);
  }
});
