import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { collectSeries, seriesCallouts } from './series.mjs';
import { origin, localLink, buildContent, buildFrontMatter, documentFor, mdx } from './convert.mjs';

const corrections = JSON.parse(await readFile('migration/corrections.json','utf8'));
const cache = '.migration';
await mkdir(cache, { recursive: true });
const refresh = process.argv.includes('--refresh');
const homepage = await (await fetch(origin)).text();
const key = homepage.match(/data-key="([a-f0-9]+)"/)?.[1];
if (!key) throw new Error('No public Ghost Content API key in homepage');
async function exportCollection(name) {
  const file = `${cache}/${name}.json`;
  if (!refresh) { try { return JSON.parse(await readFile(file, 'utf8'))[name]; } catch {} }
  let page = 1, items = [];
  do {
    const response = await fetch(`${origin}/ghost/api/content/${name}/?key=${key}&limit=100&page=${page}&include=tags,authors&formats=html,plaintext`);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    const data = await response.json();
    items.push(...data[name]); page = data.meta.pagination.next;
  } while (page);
  await writeFile(file, JSON.stringify({ [name]: items }, null, 2));
  return items;
}
const posts = await exportCollection('posts');
const pages = await exportCollection('pages');
const tags = await exportCollection('tags');
const all = [...posts, ...pages];
const series = collectSeries(posts);
await writeFile('src/data/series.json', JSON.stringify(series,null,2)+'\n');
if (all.some(p => p.visibility !== 'public' || !p.access)) throw new Error('Public API does not contain the complete body of every post. Use an admin export.');
if (new Set(all.map(p=>p.slug)).size !== all.length) throw new Error('Duplicate slugs');
const sources = new Map();
const assetJobs = new Map();
const failures = [];
await mkdir('public/images/ghost', { recursive: true });
async function download(value) {
  if (!value) return undefined;
  const url = new URL(value.replaceAll('__GHOST_URL__', origin), origin).href;
  if (assetJobs.has(url)) return assetJobs.get(url);
  const job = (async () => {
    const suffix = extname(new URL(url).pathname).match(/^\.(png|jpg|jpeg|gif|webp|svg|avif|pdf)$/i)?.[0] || '.png';
    const local = `/images/ghost/${createHash('sha256').update(url).digest('hex').slice(0,20)}${suffix}`;
    try {
      try { await access(`public${local}`); } catch {
        const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const type = res.headers.get('content-type') || '';
        if (!type.startsWith('image/') && !type.includes('pdf')) throw new Error(`Unexpected type ${type}`);
        await writeFile(`public${local}`, Buffer.from(await res.arrayBuffer()));
      }
      sources.set(local, url);
      return local;
    } catch (error) { failures.push({ url, error: error.message }); return url; }
  })();
  assetJobs.set(url, job);
  return job;
}
const inventory = [];
for (const [collection, entries] of [['blog',posts],['pages',pages]]) {
  await mkdir(`src/content/${collection}`, { recursive: true });
  for (const post of entries) {
    if (!/^[a-z0-9_-]+$/i.test(post.slug)) throw new Error(`Review slug before writing: ${post.slug}`);
    const document = documentFor(post.html);
    const movedSeries = seriesCallouts(document);
    for (const {node} of movedSeries) node.remove();
    const originalHeadings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(n => ({ id:n.id, text:n.textContent }));
    // These are remote preview decorations, not article figures or content.
    for (const image of document.querySelectorAll('.kg-bookmark-icon,.kg-bookmark-thumbnail')) image.remove();
    await Promise.all([...document.querySelectorAll('img')].map(async img => {
      img.setAttribute('src', await download(img.getAttribute('src')));
      img.removeAttribute('srcset'); img.removeAttribute('sizes');
    }));
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      const url = new URL(href, origin);
      const isOwnedAsset = url.hostname === 'huuhkadotnet.blob.core.windows.net' || (['huuhka.net','www.huuhka.net'].includes(url.hostname) && url.pathname.startsWith('/content/'));
      const corrected = corrections[post.slug]?.[href] || href;
      a.setAttribute('href', isOwnedAsset ? await download(corrected) : localLink(corrected));
    }
    const fm = buildFrontMatter(post, await download(post.feature_image), post.tags);
    for (const field of ['ogImage','twitterImage']) if (fm[field]) fm[field] = await download(fm[field]);
    fm.series = series.filter(group=>group.posts.includes(post.slug)).map(group=>group.id);
    const body = buildContent(document.body.innerHTML);
    await writeFile(`src/content/${collection}/${post.slug}.mdx`, mdx(fm, body));
    inventory.push({ series:fm.series, movedSeries:movedSeries.map(({id,title,text,links})=>({id,title,text,links})), collection, slug: post.slug, url:post.url, title:post.title, publishedAt:post.published_at, updatedAt:post.updated_at, tags:post.tags.map(t=>({name:t.name,slug:t.slug})), headings:originalHeadings, textBlocks:[...document.querySelectorAll('p,li,h1,h2,h3,h4,h5,h6,th,td,figcaption,.kg-callout-text')].map(n=>n.textContent), code: [...document.querySelectorAll('pre')].map(n=>({language:n.querySelector('code')?.getAttribute('class')?.replace('language-','') || '',text:n.textContent})), images:[...document.querySelectorAll('img')].map(n=>n.getAttribute('src')), links:[...document.querySelectorAll('a[href]')].map(n=>n.getAttribute('href')), ignoredThemeInjection:!!(post.codeinjection_head || post.codeinjection_foot) });
    console.log(`${collection}/${post.slug}`);
  }
}
const author = posts[0].primary_author;
await writeFile('src/data/author.json', JSON.stringify({name:author.name,slug:author.slug,bio:author.bio,image:await download(author.profile_image)},null,2)+'\n');
const publicTags = tags.filter(t=>t.visibility === 'public');
for (const tag of publicTags) if (tag.feature_image) tag.feature_image = await download(tag.feature_image);
await writeFile('src/data/tags.json', JSON.stringify(publicTags.map(t=>({name:t.name,slug:t.slug,description:t.description || '',image:t.feature_image,metaTitle:t.meta_title,metaDescription:t.meta_description})),null,2)+'\n');
await mkdir('migration', {recursive:true});
await writeFile('migration/inventory.json', JSON.stringify(inventory,null,2)+'\n');
await writeFile('migration/assets.json', JSON.stringify(Object.fromEntries([...sources].sort()),null,2)+'\n');
const sitemaps = {};
for (const name of ['posts','pages','tags','authors']) {
  const response = await fetch(`${origin}/sitemap-${name}.xml`);
  if (!response.ok) throw new Error(`Sitemap ${name}: ${response.status}`);
  const xml = await response.text();
  sitemaps[name] = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
}
await writeFile('migration/source-urls.json',JSON.stringify(sitemaps,null,2)+'\n');
await writeFile(`${cache}/asset-failures.json`,JSON.stringify(failures,null,2));
console.log(`${posts.length} posts, ${pages.length} pages, ${publicTags.length} tags, ${sources.size} assets, ${failures.length} asset failures.`);
if (failures.length) { console.error(failures); process.exitCode = 1; }
