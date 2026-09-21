import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const origin=process.env.LOCAL_ORIGIN || 'http://127.0.0.1:4321';
const urls=Object.values(JSON.parse(readFileSync('migration/source-urls.json'))).flat();
for(const original of urls) {
  const path=new URL(original).pathname;
  const response=await fetch(new URL(path,origin));
  assert.equal(response.status,200,path);
}
const posts=JSON.parse(readFileSync('migration/inventory.json'));
for(const post of posts) {
  const response=await fetch(`${origin}/${post.slug}/amp/`,{redirect:'manual'});
  assert.equal(response.status,301,`${post.slug} AMP redirect`);
  assert.equal(response.headers.get('location'),`/${post.slug}/`);
}
const rss=await fetch(`${origin}/rss/`);
assert.equal(rss.status,200);assert.match(rss.headers.get('content-type'),/xml/);
assert.equal(((await rss.text()).match(/<item>/g)||[]).length,posts.filter(p=>p.collection==='blog').length);
const sitemap=await fetch(`${origin}/sitemap.xml`);assert.equal(sitemap.status,200);assert.match(sitemap.headers.get('content-type'),/xml/);
const missing=await fetch(`${origin}/this-page-does-not-exist/`);
assert.equal(missing.status,404);
console.log(`${urls.length} live local routes, ${posts.length} AMP 301 redirects, RSS and 404 verified.`);
