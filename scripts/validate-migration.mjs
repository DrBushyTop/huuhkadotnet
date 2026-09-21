import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {parseHTML} from 'linkedom';
import YAML from 'yaml';
const read = path => readFileSync(path,'utf8');
const inventory = JSON.parse(read('migration/inventory.json'));
const sources = JSON.parse(read('migration/source-urls.json'));
const series=JSON.parse(read('src/data/series.json'));
const errors = [], brokenLinks = [];
const check = (label, fn) => {try{fn();}catch(e){errors.push(`${label}: ${e.message}`);}};
const docs = new Map();
function page(path) {
  const file = join('dist',decodeURIComponent(path),'index.html');
  if (!docs.has(file)) docs.set(file,parseHTML(read(file)).document);
  return docs.get(file);
}
for (const url of Object.values(sources).flat()) check(url,()=>assert.ok(existsSync(join('dist',new URL(url).pathname,'index.html'))));
for (const entry of inventory) {
  check(entry.slug,()=>{
    const source=read(`src/content/${entry.collection}/${entry.slug}.mdx`);
    const data=YAML.parse(source.split('---')[1]);
    assert.equal(data.slug,entry.slug); assert.equal(data.title,entry.title);
    assert.equal(data.publishedAt,entry.publishedAt); assert.equal(data.updatedAt,entry.updatedAt);
    assert.deepEqual(data.tags,entry.tags.map(t=>t.name));
    assert.deepEqual(data.tagSlugs,entry.tags.map(t=>t.slug));
    assert.deepEqual(data.series,entry.series);
    assert.deepEqual(data.series,series.filter(group=>group.posts.includes(entry.slug)).map(group=>group.id));
    const document=page(`/${entry.slug}/`);
    assert.equal(document.querySelector('h1').textContent,entry.title);
    assert.equal(document.querySelector('link[rel=canonical]').getAttribute('href'),data.canonicalUrl || entry.url);
    for(const moved of entry.movedSeries) {
      const navigation=document.querySelector(`nav[aria-label="${moved.title} series"]`);
      assert.ok(navigation,`Missing native series ${moved.id}`);
      const links=[...navigation.querySelectorAll('a')].map(a=>a.getAttribute('href'));
      for(const link of moved.links)assert.ok(links.includes(link),`Lost series member ${link}`);
    }
    const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
    assert.equal(new Set(ids).size,ids.length,'duplicate anchor IDs');
    for (const h of entry.headings) if(h.id) assert.ok(ids.includes(h.id),`Missing original anchor #${h.id}`);
    const normalizedBody=document.querySelector('.article-prose').textContent.replace(/\s/g,'');
    for(const text of entry.textBlocks) assert.ok(normalizedBody.includes(text.replace(/\s/g,'')),`Missing source text: ${text.slice(0,80)}`);
    const codes=[...document.querySelectorAll('.article-prose pre code')];
    assert.equal(codes.length,entry.code.length,'Code block count differs');
    codes.forEach((code,i)=>assert.equal(code.textContent.trimEnd(),entry.code[i].text.trimEnd(),`Code block ${i} changed`));
    assert.ok(document.querySelector('meta[name=robots]').content.includes('noindex'));
    for (const img of document.querySelectorAll('img')) {
      const src=img.getAttribute('src');
      assert.ok(src.startsWith('/'),`Remote image: ${src}`);
      assert.ok(existsSync(`dist${src}`),`Missing image ${src}`);
    }
    for (const image of entry.images) assert.ok([...document.querySelectorAll('.article-prose img')].some(n=>n.getAttribute('src')===image),`Dropped content image ${image}`);
    const links=[...document.querySelectorAll('.article-prose a[href]')].map(n=>n.getAttribute('href'));
    for(const href of entry.links) assert.ok(links.includes(href),`Dropped link ${href}`);
  });
}
for (const file of readdirSync('dist',{recursive:true}).filter(f=>f.endsWith('.html')&&!f.includes('/amp/'))) {
  const document=parseHTML(read(join('dist',file))).document;
  const pathname = '/'+file.replace(/index\.html$/,'');
  for(const link of document.querySelectorAll('a[href]')) {
    const href=link.getAttribute('href');
    if(!href.startsWith('/')&&!href.startsWith('#'))continue;
    const url=new URL(href,'https://www.huuhka.net'+pathname);
    const path=decodeURIComponent(url.pathname);
    const fileExists=existsSync(join('dist',path.replace(/\/$/,'')));
    const htmlExists=existsSync(join('dist',path,'index.html'));
    if(!fileExists&&!htmlExists){brokenLinks.push({from:pathname,href,reason:'missing route'});continue;}
    if(url.hash&&htmlExists) {
      const target=page(path);
      const id=decodeURIComponent(url.hash.slice(1));
      if(!target.getElementById(id))brokenLinks.push({from:pathname,href,reason:'missing anchor'});
    }
  }
}
for (const [path,url] of Object.entries(JSON.parse(read('migration/assets.json')))) check(url,()=>assert.ok(existsSync(`public${path}`)));
check('sitemap',()=>{const sitemap=read('dist/sitemap.xml');for(const url of Object.values(sources).flat())assert.ok(sitemap.includes(`<loc>${url}</loc>`),`Missing sitemap URL ${url}`);});
check('RSS',()=>{const feed=read('dist/rss');assert.equal((feed.match(/<item>/g)||[]).length,inventory.filter(e=>e.collection==='blog').length);});
console.log(`${inventory.length} content pages; ${Object.values(sources).flat().length} source URLs; ${docs.size} rendered pages checked.`);
if(errors.length)console.error(errors.join('\n'));
if(brokenLinks.length)console.error('Broken local links:',JSON.stringify(brokenLinks,null,2));
console.log(`${errors.length} validation errors; ${brokenLinks.length} broken local links.`);
process.exitCode=errors.length || brokenLinks.length ? 1 : 0;
