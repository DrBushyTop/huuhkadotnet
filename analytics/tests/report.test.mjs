import assert from 'node:assert/strict';
import {test} from 'node:test';
import {strToU8, zipSync} from 'fflate';
import {buildReport, readExport} from '../src/report.mjs';
import {exportUrl} from '../src/resend.mjs';

const websiteId = '3f673ea9-160f-4880-8d92-226feaa1e6d9';
const header = 'website_id,session_id,visit_id,event_id,url_path,referrer_domain,browser,country,event_type,event_name,created_at';
const row = (event, session, visit, path, referrer, date, {type = 1, name = '', browser = 'chrome', country = 'FI'} = {}) =>
  `${websiteId},${session},${visit},${event},${path},${referrer},${browser},${country},${type},${name},${date}`;
const archive = lines => zipSync({'website_event.csv': strToU8([header, ...lines].join('\n'))});

test('overlapping exports count each event once and preserve distinct visits', () => {
  const first = archive([
    row('one', 'a', 'v1', '/', 'www.Search.example', '2026-09-21 10:00:00'),
    row('two', 'a', 'v1', '/post/', 'huuhka.net', '2026-09-21 10:02:00'),
  ]);
  const second = archive([
    row('one', 'a', 'v1', '/', 'search.example', '2026-09-21 10:00:00'),
    row('two', 'a', 'v1', '/post/', 'huuhka.net', '2026-09-21 10:02:00'),
    row('three', 'b', 'v2', '/post/', 'huuhka.net', '2026-10-01 12:00:00', {browser: 'firefox', country: 'US'}),
    row('four', 'b', 'v2', '/post/', '', '2026-10-01 12:00:05', {type: 2, name: 'copy-code'}),
  ]);
  const report = buildReport([
    {bytes: first, createdAt: '2026-09-24T00:00:00Z'},
    {bytes: second, createdAt: '2026-10-02T00:00:00Z'},
  ], {websiteId});
  assert.deepEqual(report.totals, {views: 3, visits: 2, visitors: 2, events: 1});
  assert.deepEqual(report.coverage, {from: '2026-09-21T10:00:00.000Z', through: '2026-10-01T12:00:00.000Z'});
  const {strings, visits, views, events} = report;
  assert.deepEqual(visits.views, [2, 1]);
  assert.deepEqual(visits.end.map((end, i) => end - visits.start[i]), [120, 0]);
  assert.deepEqual(visits.entry.map(id => strings.path[id]), ['/', '/post/']);
  assert.deepEqual(visits.exit.map(id => strings.path[id]), ['/post/', '/post/']);
  // Own-domain and empty referrers both count as direct traffic.
  assert.deepEqual(visits.referrer.map(id => strings.referrer[id]), ['search.example', '']);
  assert.deepEqual(visits.browser.map(id => strings.browser[id]), ['chrome', 'firefox']);
  assert.deepEqual(views.visit, [0, 0, 1]);
  assert.deepEqual(events.name.map(id => strings.event[id]), ['copy-code']);
  assert.deepEqual(events.visit, [1]);
});

test('publishes no raw Umami identifiers', () => {
  const report = buildReport([{bytes: archive([row('event-secret', 'session-secret', 'visit-secret', '/', '', '2026-09-21 10:00:00')]), createdAt: '2026-09-24T00:00:00Z'}], {websiteId});
  const json = JSON.stringify(report);
  for (const secret of ['event-secret', 'session-secret', 'visit-secret', websiteId]) assert.equal(json.includes(secret), false);
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
