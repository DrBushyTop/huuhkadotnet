import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingMinutes } from '../scripts/reading-time.mjs';
import rehypeContent from '../scripts/rehype-content.mjs';

const text = value => ({type: 'text', value});
const root = children => ({type: 'root', children});

test('reading time rounds up at 200 words per minute with a one-minute minimum', () => {
  for (const [words, minutes] of [[0, 1], [1, 1], [200, 1], [201, 2], [400, 2], [401, 3]]) {
    assert.equal(readingMinutes(root([text('word '.repeat(words))])), minutes);
  }
  assert.equal(readingMinutes(root([text(' \n\t ')])), 1);
});

test('counts nested prose, captions and code, not attributes or executable content', () => {
  const tree = root([
    {type: 'element', tagName: 'a', properties: {href: 'url '.repeat(500)}, children: [text('word '.repeat(100))]},
    {type: 'element', tagName: 'pre', children: [{type: 'element', tagName: 'code', children: [text('code '.repeat(100))]}]},
    {type: 'mdxJsxFlowElement', name: 'figcaption', children: [text('A caption')]},
    {type: 'mdxjsEsm', value: 'import '.repeat(500)},
    {type: 'mdxFlowExpression', value: 'expression '.repeat(500)},
    ...['script', 'style', 'iframe'].map(name => ({type: 'mdxJsxFlowElement', name, children: [text('ignored '.repeat(500))]})),
  ]);
  assert.equal(readingMinutes(tree), 2);
});

test('content plugin exposes reading time without replacing authored frontmatter', () => {
  const file = {data: {astro: {frontmatter: {title: 'Original title'}}}};
  rehypeContent()(root([text('word '.repeat(201))]), file);
  assert.deepEqual(file.data.astro.frontmatter, {title: 'Original title', readingMinutes: 2});
});
