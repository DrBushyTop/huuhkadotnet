import Fuse from 'fuse.js';

export interface SearchPost {
  slug: string;
  title: string;
  tags: string[];
}

export function createArticleSearch(posts: SearchPost[]) {
  const index = new Fuse(posts, {
    keys: [{ name: 'title', weight: 0.8 }, { name: 'tags', weight: 0.2 }],
    threshold: 0.35,
    ignoreLocation: true,
    ignoreDiacritics: true,
    includeScore: true,
  });

  return (query: string): string[] => {
    const terms = query.trim().split(/\s+/u).filter(Boolean);
    if (!terms.length) return posts.map((post) => post.slug);

    // Match every word independently, so word order does not matter.
    const scores = terms.map((term) =>
      new Map(index.search(term).map(({ item, score }) => [item.slug, score ?? 1])),
    );
    return posts
      .filter((post) => scores.every((matches) => matches.has(post.slug)))
      .map((post) => ({
        slug: post.slug,
        score: scores.reduce((sum, matches) => sum + matches.get(post.slug)!, 0),
      }))
      .sort((a, b) => a.score - b.score)
      .map(({ slug }) => slug);
  };
}
