import {mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {translateGa4} from './ga4.mjs';

// One-time: translates the GA4 exports to .output/ga4-baseline.json.
// Upload the result to the reports container (see README).
const [directory, apiDirectory] = process.argv.slice(2);
if (!directory) {
  console.error('Usage: npm run import:ga4 -- path/to/standard-reports [path/to/data-api-export]');
  process.exit(1);
}
const read = dir => Object.fromEntries(readdirSync(resolve(dir))
  .filter(name => /\.(csv|json)$/.test(name) && !name.includes('.page-'))
  .map(name => [name, readFileSync(join(resolve(dir), name), 'utf8')]));
const baseline = translateGa4(read(directory), {apiFiles: apiDirectory ? read(apiDirectory) : null});
mkdirSync(resolve('.output'), {recursive: true});
writeFileSync(resolve('.output/ga4-baseline.json'), JSON.stringify(baseline));
console.log(JSON.stringify({schemaVersion: baseline.schemaVersion, periods: baseline.periods?.kind.length ?? 0, days: baseline.days.day.length, coverage: baseline.coverage, totals: baseline.totals, paths: baseline.strings.path.length, referrers: baseline.strings.referrer.length}, null, 2));
