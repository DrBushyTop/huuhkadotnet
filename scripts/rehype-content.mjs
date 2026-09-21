import { readingMinutes } from './reading-time.mjs';

// Put Ghost's explicit anchors on the following heading, before Astro collects
// headings for the contents list. New posts use Astro's normal generated IDs.
export default function rehypeContent() {
  return (tree, file) => {
    if (file?.data?.astro?.frontmatter) {
      file.data.astro.frontmatter.readingMinutes = readingMinutes(tree);
    }
    // Imported Ghost captions follow a sole-image paragraph. Keep them with
    // their image in a real figure without changing the MDX or caption text.
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== 'element' || node.tagName !== 'p') continue;
      const children = node.children.filter(child => child.type !== 'text' || child.value.trim());
      const image = children[0];
      const soleImage = children.length === 1 && image?.type === 'element'
        && (image.tagName === 'img' || (image.tagName === 'a' && image.children.length === 1 && image.children[0].tagName === 'img'));
      if (!soleImage) continue;
      let j = i + 1;
      while (tree.children[j]?.type === 'text' && !tree.children[j].value.trim()) j++;
      const caption = tree.children[j];
      const hasCaption = (caption?.type === 'element' && caption.tagName === 'figcaption')
        || (caption?.type === 'mdxJsxFlowElement' && caption.name === 'figcaption');
      node.tagName = 'figure';
      node.properties = {...node.properties, className: ['prose-image']};
      if (hasCaption) {
        node.children.push(caption);
        tree.children.splice(i + 1, j - i);
      }
    }
    function visit(node) {
      if (node.children) {
        for (let i=0;i<node.children.length-1;i++) {
          const anchor=node.children[i];
          let j=i+1;
          while(node.children[j]?.type==='text' && !node.children[j].value.trim()) j++;
          const heading=node.children[j];
          if(anchor.type==='mdxJsxFlowElement' && anchor.name==='a' && heading?.type==='element' && /^h[1-6]$/.test(heading.tagName)) {
            const id=anchor.attributes.find(a=>a.name==='id')?.value;
            if(typeof id==='string') {heading.properties.id=id;node.children.splice(i,1);}
          }
        }
      }
      if (node.type === 'element') {
        if (node.tagName === 'pre') {
          node.properties.tabIndex = 0;
          node.properties.role = 'region';
          node.properties['aria-label'] = 'Code example';
        }
        if (node.tagName === 'img') { node.properties.loading = 'lazy'; node.properties.decoding = 'async'; }
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
