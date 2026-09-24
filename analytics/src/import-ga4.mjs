import {mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {translateGa4} from './ga4.mjs';

// One-time: translates a GA4 Data API export to .output/ga4-baseline.json.
// Upload the result to the reports container (see README).
const directory = process.argv[2];
if (!directory) {
  console.error('Usage: npm run import:ga4 -- path/to/ga4-export/data/<run>');
  process.exit(1);
}
const files = Object.fromEntries(readdirSync(resolve(directory))
  .filter(name => /\.(csv|json)$/.test(name) && !name.includes('.page-'))
  .map(name => [name, readFileSync(join(resolve(directory), name), 'utf8')]));
const baseline = translateGa4(files);
mkdirSync(resolve('.output'), {recursive: true});
writeFileSync(resolve('.output/ga4-baseline.json'), JSON.stringify(baseline));
const rows = Object.fromEntries(Object.entries(baseline.tables).map(([name, table]) => [name, {
  daily: table.daily.day.length,
  periods: table.periods?.period.length ?? 0,
  values: baseline.strings[name]?.length ?? 0,
}]));
console.log(JSON.stringify({coverage: baseline.coverage, totals: baseline.totals, periods: baseline.periods.kind.length, rows}, null, 1));
