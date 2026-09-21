import {getCollection} from 'astro:content';
import {getPosts} from '../lib/posts';
import tags from '../data/tags.json';
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
export async function GET() {
  const entries=[...await getPosts(),...await getCollection('pages',({data})=>!data.draft)];
  const pages=[{path:'/',updated:undefined},{path:'/author/pasi/',updated:undefined},...tags.map(tag=>({path:`/tag/${tag.slug}/`,updated:undefined})),...entries.map(({data})=>({path:`/${data.slug}/`,updated:data.updatedAt}))];
  const urls=pages.map(page=>`<url><loc>${escape(new URL(page.path,'https://www.huuhka.net').href)}</loc>${page.updated?`<lastmod>${page.updated}</lastmod>`:''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
