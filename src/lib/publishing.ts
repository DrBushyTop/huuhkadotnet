// Publication rules shared by the site build, the tests and the release check in CI.
// Plain TypeScript without imports, so Node can run it with --experimental-strip-types.

export interface PublishFields { slug: string; title: string; publishedAt: string; draft?: boolean }

// A post goes live once it isn't a draft and its publication time has passed.
export function isPublished(data: PublishFields, now: number) {
  return !data.draft && Date.parse(data.publishedAt) <= now;
}

// Series parts in order. Unpublished parts stay listed with their release date,
// or without one when a draft's date has passed.
export function seriesParts(slugs: string[], entries: Map<string, PublishFields>, now: number) {
  return slugs.flatMap(slug => {
    const entry = entries.get(slug);
    if (!entry) return [];
    const published = isPublished(entry, now);
    const releaseAt = !published && Date.parse(entry.publishedAt) > now ? entry.publishedAt : undefined;
    return [{slug, title: entry.title, published, releaseAt}];
  });
}

// Reads one top-level scalar from MDX frontmatter without a YAML dependency, so the
// scheduled check can run before `npm ci`. Handles quoted values folded across lines.
export function frontmatterField(source: string, name: string) {
  const front = source.split('---')[1] ?? '';
  const match = front.match(new RegExp(`^${name}:[ \\t]*("(?:[^"\\\\]|\\\\[\\s\\S])*"|.*)$`, 'm'));
  if (!match) return undefined;
  const value = match[1].trim();
  if (!value.startsWith('"')) return value;
  return value.slice(1, -1).replace(/\\\n\s*/g, '').replace(/\s*\n\s*/g, ' ').replace(/\\(["\\])/g, '$1');
}

// Posts that should be live but are missing from the deployed site's sitemap.
export function duePosts(posts: PublishFields[], liveUrls: Set<string>, now: number, site = 'https://www.huuhka.net') {
  return posts.filter(post => isPublished(post, now) && !liveUrls.has(`${site}/${post.slug}/`)).map(post => post.slug);
}
