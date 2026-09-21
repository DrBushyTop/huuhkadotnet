import { documentFor, localLink } from './convert.mjs';

// Only replace explicit series-navigation callouts. Warnings, updates and other
// author notes stay in the article body.
export function seriesCallouts(document) {
  return [...document.querySelectorAll('.kg-callout-card')].flatMap(node => {
    const text = node.querySelector('.kg-callout-text')?.textContent || '';
    const match = text.match(/^This post is (?:a )?part of a larger (.+?) theme:/);
    if (!match) return [];
    const title = match[1];
    const links = [...node.querySelectorAll('a[href]')].map(a => localLink(a.getAttribute('href')));
    if (links.length < 2 || links.some(link => !/^\/[a-z0-9-]+\/$/.test(link))) {
      throw new Error(`Review series links: ${title}`);
    }
    return [{node, title, id:title.toLowerCase().replace(/[^a-z0-9]+/g,'-'), posts:links.map(link=>link.slice(1,-1)), text, links}];
  });
}
export function collectSeries(posts) {
  const series = new Map();
  const published = new Set(posts.map(post=>post.slug));
  for (const post of posts) {
    for (const {id,title,posts:members} of seriesCallouts(documentFor(post.html))) {
      if (!members.includes(post.slug) || members.some(slug=>!published.has(slug))) throw new Error(`Invalid series membership: ${post.slug}`);
      const previous=series.get(id);
      if(previous && JSON.stringify(previous.posts)!==JSON.stringify(members)) throw new Error(`Conflicting series order: ${title}`);
      series.set(id,{id,title,posts:members});
    }
  }
  return [...series.values()];
}
