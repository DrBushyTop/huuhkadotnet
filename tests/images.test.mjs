import {test} from 'node:test';
import assert from 'node:assert/strict';
import rehypeContent from '../scripts/rehype-content.mjs';

const image = () => ({type: 'element', tagName: 'img', properties: {src: '/diagram.png', alt: 'Architecture'}, children: []});
const paragraph = child => ({type: 'element', tagName: 'p', properties: {}, children: [child]});
const whitespace = {type: 'text', value: '\n'};

test('groups an image and imported MDX caption without changing caption content', () => {
  const img = image();
  const caption = {type: 'mdxJsxFlowElement', name: 'figcaption', attributes: [], children: [paragraph({type: 'text', value: 'Original caption'})]};
  const tree = {type: 'root', children: [paragraph(img), whitespace, caption, paragraph({type: 'text', value: 'Next paragraph'})]};
  rehypeContent()(tree);
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].tagName, 'figure');
  assert.deepEqual(tree.children[0].properties.className, ['prose-image']);
  assert.equal(tree.children[0].children[1], caption);
  assert.equal(img.properties.loading, 'lazy');
  assert.equal(tree.children[1].tagName, 'p');
});

test('wraps captionless and linked images while preserving their destinations', () => {
  const link = {type: 'element', tagName: 'a', properties: {href: '/original-destination/'}, children: [image()]};
  const tree = {type: 'root', children: [paragraph(image()), paragraph(link)]};
  rehypeContent()(tree);
  assert.ok(tree.children.every(node => node.tagName === 'figure'));
  assert.equal(tree.children[1].children[0], link);
  assert.equal(link.properties.href, '/original-destination/');
});

test('leaves mixed text and nested images in their original layout', () => {
  const mixed = paragraph(image());
  mixed.children.push({type: 'text', value: 'Inline text'});
  const nested = {type: 'element', tagName: 'blockquote', properties: {}, children: [paragraph(image())]};
  const tree = {type: 'root', children: [mixed, nested]};
  rehypeContent()(tree);
  assert.equal(mixed.tagName, 'p');
  assert.equal(nested.children[0].tagName, 'p');
});
