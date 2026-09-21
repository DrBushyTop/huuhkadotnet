import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import YAML from 'yaml';
const inventory=JSON.parse(await readFile('migration/inventory.json','utf8'));
const assets=JSON.parse(await readFile('migration/assets.json','utf8'));
await mkdir('public/images/thumbnails',{recursive:true});
const thumbnails={};
for(const entry of inventory.filter(e=>e.collection==='blog')) {
  const text=await readFile(`src/content/blog/${entry.slug}.mdx`,'utf8');
  const data=YAML.parse(text.split('---')[1]);
  if(!data.image)continue;
  const thumbnail=`/images/thumbnails/${entry.slug}.webp`;
  await sharp(`public${data.image}`).rotate().resize({width:960,withoutEnlargement:true}).webp({quality:82}).toFile(`public${thumbnail}`);
  await writeFile(`public${thumbnail}.json`,JSON.stringify({source:assets[data.image],derivedFrom:data.image,transformation:'Resized to maximum 960px wide, WebP quality 82. Not generated.'},null,2)+'\n');
  thumbnails[entry.slug]=thumbnail;
}
for(const [path,url] of Object.entries(assets)) await writeFile(`public${path}.json`,JSON.stringify({source:url,transformation:'Original published asset, copied without modification.'},null,2)+'\n');
await writeFile('src/data/thumbnails.json',JSON.stringify(thumbnails,null,2)+'\n');
console.log(`Created ${Object.keys(thumbnails).length} thumbnails.`);
