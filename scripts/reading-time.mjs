// Count rendered article text, including code and captions, but not markup,
// link destinations, image attributes, or MDX imports and expressions.
export function readingMinutes(tree) {
  const text = [];
  function visit(node) {
    const name = node.tagName || node.name;
    if (['script', 'style', 'iframe'].includes(name)) return;
    if (node.type === 'text') text.push(node.value);
    node.children?.forEach(visit);
  }
  visit(tree);
  const words = text.join(' ').match(/\S+/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}
