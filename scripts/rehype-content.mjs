// Put Ghost's explicit anchors on the following heading, before Astro collects
// headings for the contents list. New posts use Astro's normal generated IDs.
export default function rehypeContent() {
  return tree => {
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
