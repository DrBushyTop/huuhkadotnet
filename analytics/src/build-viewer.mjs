import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {buildReport} from './report.mjs';
import {writeViewer} from './publish.mjs';

const index = process.argv.indexOf('--export');
if (index < 0 || !process.argv[index + 1]) {
  console.error('Usage: npm run build:viewer -- --export path/to/umami-export.zip');
  process.exit(1);
}
const bytes = readFileSync(resolve(process.argv[index + 1]));
const report = buildReport([{bytes, createdAt: new Date().toISOString()}], {
  websiteId: '3f673ea9-160f-4880-8d92-226feaa1e6d9',
});
writeViewer(report, resolve('.output/viewer'));
console.log(`Built private viewer with ${report.all.views} page views.`);
