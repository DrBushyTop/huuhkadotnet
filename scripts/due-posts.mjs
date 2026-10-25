// Prints due=true when a post should be live but the deployed sitemap doesn't list it yet.
// The scheduled workflow run uses this to skip builds when nothing has become due.
// Run with: node --experimental-strip-types scripts/due-posts.mjs
import {readFileSync, readdirSync, appendFileSync} from 'node:fs';
import {duePosts, frontmatterField} from '../src/lib/publishing.ts';

const dir = new URL('../src/content/blog/', import.meta.url);
const posts = readdirSync(dir).filter(file => file.endsWith('.mdx')).map(file => {
  const source = readFileSync(new URL(file, dir), 'utf8');
  const field = name => frontmatterField(source, name);
  return {slug: field('slug'), title: '', publishedAt: field('publishedAt'), draft: field('draft') === 'true'};
});

let due;
try {
  const response = await fetch('https://www.huuhka.net/sitemap.xml');
  if (!response.ok) throw new Error(`sitemap returned ${response.status}`);
  const live = new Set([...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]));
  due = duePosts(posts, live, Date.now());
  console.log(due.length ? `Due: ${due.join(', ')}` : 'Nothing due.');
} catch (error) {
  // Build anyway when the live site can't be checked; a redundant deploy is harmless.
  console.log(`Could not read the live sitemap (${error.message}), building anyway.`);
  due = ['unknown'];
}
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `due=${due.length > 0}\n`);
