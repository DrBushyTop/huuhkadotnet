import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildReport} from './report.mjs';

// Local only: builds umami.json from an export ZIP for the viewer's dev server.
const index = process.argv.indexOf('--export');
if (index < 0 || !process.argv[index + 1]) {
  console.error('Usage: npm run build:report -- --export path/to/umami-export.zip');
  process.exit(1);
}
const bytes = readFileSync(resolve(process.argv[index + 1]));
const report = buildReport([{bytes, createdAt: new Date().toISOString()}], {
  websiteId: '3f673ea9-160f-4880-8d92-226feaa1e6d9',
});
mkdirSync(resolve('.output'), {recursive: true});
writeFileSync(resolve('.output/umami.json'), JSON.stringify(report));
console.log(`Wrote .output/umami.json with ${report.totals.views} page views.`);
