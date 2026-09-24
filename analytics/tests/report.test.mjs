import assert from 'node:assert/strict';
import {test} from 'node:test';
import {strToU8, zipSync} from 'fflate';
import {buildReport, readExport} from '../src/report.mjs';
import {exportUrl} from '../src/resend.mjs';

const websiteId = '3f673ea9-160f-4880-8d92-226feaa1e6d9';
const header = 'website_id,session_id,visit_id,event_id,url_path,referrer_domain,event_type,created_at';
const row = (event, session, visit, path, referrer, date) =>
  `${websiteId},${session},${visit},${event},${path},${referrer},1,${date}`;
const archive = lines => zipSync({'website_event.csv': strToU8([header, ...lines].join('\n'))});

test('overlapping exports count each event once and preserve distinct visits', () => {
  const first = archive([
    row('one', 'a', 'v1', '/', 'search.example', '2026-09-21 10:00:00'),
    row('two', 'a', 'v1', '/post/', 'huuhka.net', '2026-09-21 10:02:00'),
  ]);
  const second = archive([
    row('one', 'a', 'v1', '/', 'search.example', '2026-09-21 10:00:00'),
    row('two', 'a', 'v1', '/post/', 'huuhka.net', '2026-09-21 10:02:00'),
    row('three', 'b', 'v2', '/post/', '', '2026-10-01 12:00:00'),
  ]);
  const report = buildReport([
    {bytes: first, createdAt: '2026-09-24T00:00:00Z'},
    {bytes: second, createdAt: '2026-10-02T00:00:00Z'},
  ], {websiteId});
  assert.deepEqual([report.all.views, report.all.visits, report.all.visitors], [3, 2, 2]);
  assert.deepEqual(report.all.pages[0], {path: '/post/', count: 2});
  assert.deepEqual(report.all.referrers, [
    {domain: 'Direct / unknown', count: 1},
    {domain: 'search.example', count: 1},
  ]);
  assert.deepEqual(report.months.map(item => [item.month, item.views]), [['2026-10', 1], ['2026-09', 2]]);
});

test('rejects a different website before publishing any aggregate', () => {
  const wrong = archive([row('one', 'a', 'v1', '/', '', '2026-09-21 10:00:00').replace(websiteId, 'other-site')]);
  assert.throws(() => readExport(wrong, websiteId), /different website ID/);
});

test('accepts only the observed Umami signed ZIP host', () => {
  const good = 'https://umami-public.s3.eu-central-1.amazonaws.com/export.zip?X-Amz-Signature=abc';
  assert.equal(exportUrl({text: `Download: ${good}`}).href, good);
  assert.throws(() => exportUrl({text: 'https://example.org/export.zip?X-Amz-Signature=abc'}), /expected ZIP/);
});
