import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Dataset, type Report} from '../src/lib/analytics.ts';
import {BaselineData, type Baseline} from '../src/lib/baseline.ts';
import {breakdown, events, period, series} from '../src/lib/combined.ts';
import {buckets} from '../src/lib/dates.ts';

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const t = (iso: string) => Date.parse(iso) / 1000;

// GA4: two days before the switch. Umami: one visit on the switch day and one after.
const baseline: Baseline = {
  schemaVersion: 2,
  source: 'ga4',
  generatedAt: '2026-09-24T00:00:00Z',
  exportedAt: '2026-09-24T00:00:00Z',
  lastDay: '2026-09-21',
  coverage: {daily: {from: '2026-09-20', through: '2026-09-21'}},
  totals: {views: 15, visits: 12},
  strings: {path: ['/', '/post/'], referrer: ['google.com', ''], medium: ['organic', ''], event: ['page_view', 'scroll']},
  days: {day: [day('2026-09-20'), day('2026-09-21')], views: [10, 5], visits: [8, 4], visitors: [7, 4], bounces: [4, 2], duration: [800, 100]},
  // One exact GA4 period spanning both days, with fewer users and sessions than the daily sums.
  periods: {kind: ['monthly'], from: [day('2026-09-20')], to: [day('2026-09-21')], views: [15], visits: [11], visitors: [10], bounces: [6], duration: [900]},
  pages: {day: [day('2026-09-20'), day('2026-09-20'), day('2026-09-21')], path: [0, 1, 1], views: [4, 6, 5]},
  sources: {day: [day('2026-09-20'), day('2026-09-20'), day('2026-09-21')], referrer: [0, 1, 0], medium: [0, 1, 0], visits: [6, 2, 4]},
  events: {day: [day('2026-09-20'), day('2026-09-21')], name: [0, 1], count: [10, 3], visitors: [7, 2]},
};

const report: Report = {
  schemaVersion: 2,
  generatedAt: '2026-09-24T00:00:00Z',
  coverage: {from: '2026-09-21T18:00:00.000Z', through: '2026-09-22T10:00:00.000Z'},
  totals: {views: 3, visits: 2, visitors: 2, events: 0},
  strings: {
    path: ['/post/', '/'], title: ['Post'], hostname: ['www.huuhka.net'], referrer: ['google.com', ''],
    browser: ['chrome'], os: [''], device: ['laptop'], country: ['FI'], region: [''], city: [''], language: [''], screen: [''],
    utmSource: [''], utmMedium: [''], utmCampaign: [''], event: [],
  },
  visits: {
    start: [t('2026-09-21T18:00:00Z'), t('2026-09-22T10:00:00Z')], end: [t('2026-09-21T18:01:00Z'), t('2026-09-22T10:00:00Z')],
    session: [0, 1], views: [2, 1], entry: [0, 1], exit: [1, 1], referrer: [0, 1], browser: [0, 0], os: [0, 0], device: [0, 0],
    country: [0, 0], region: [0, 0], city: [0, 0], language: [0, 0], screen: [0, 0], utmSource: [0, 0], utmMedium: [0, 0], utmCampaign: [0, 0],
  },
  views: {t: [t('2026-09-21T18:00:00Z'), t('2026-09-21T18:01:00Z'), t('2026-09-22T10:00:00Z')], visit: [0, 0, 1], path: [0, 1, 1], title: [0, 0, 0], hostname: [0, 0, 0]},
  events: {t: [], visit: [], name: [], path: []},
};

const sources = {data: new Dataset(report), baseline: new BaselineData(baseline)};
const range = (from: string, to: string) => ({start: Date.parse(`${from}T00:00:00Z`), end: Date.parse(`${to}T00:00:00Z`), unit: 'day' as const});

test('exact GA4 periods combine with Umami for every metric', () => {
  // GA4 part is Sep 20-21, which is exactly the GA4 period, so its own totals apply.
  const both = period(sources, range('2026-09-20', '2026-09-23'), [], 'utc');
  assert.deepEqual(both.metrics, {views: 18, visits: 13, visitors: 12, bounceRate: 7 / 13, duration: 960 / 13});
  assert.ok(both.notes.bounceRate);
  const switchDay = period(sources, range('2026-09-21', '2026-09-22'), [], 'utc');
  assert.deepEqual([switchDay.metrics.visitors, switchDay.metrics.visits], [5, 5]);
  const umamiOnly = period(sources, range('2026-09-22', '2026-09-23'), [], 'utc');
  assert.deepEqual(umamiOnly.metrics, {views: 1, visits: 1, visitors: 1, bounceRate: 1, duration: 0});
  assert.deepEqual(umamiOnly.notes, {});
});

test('ranges that are not a GA4 period use daily sums and hide visitors', () => {
  const noSunday = period(sources, range('2026-09-20', '2026-09-23'), [{dimension: 'weekday', value: '6', exclude: true}], 'utc');
  // Sep 20, 2026 is a Sunday, so GA4 contributes only Sep 21, a single day.
  assert.equal(noSunday.metrics.visitors, 4 + 2);
  const r = range('2026-09-20', '2026-09-23');
  const mondaysOut = period(sources, r, [{dimension: 'weekday', value: '0', exclude: true}], 'utc');
  assert.equal(mondaysOut.metrics.views, 10 + 1);
});

test('filters use the GA4 table that can answer them, or exclude GA4', () => {
  const r = range('2026-09-20', '2026-09-23');
  const post = period(sources, r, [{dimension: 'path', value: '/post/', exclude: false}], 'utc');
  assert.equal(post.metrics.views, 6 + 5 + 1);
  assert.equal(post.metrics.visits, null);
  const google = period(sources, r, [{dimension: 'referrer', value: 'google.com', exclude: false}], 'utc');
  assert.deepEqual([google.metrics.visits, google.metrics.views], [6 + 4 + 1, null]);
  const search = period(sources, r, [{dimension: 'channel', value: 'Organic search', exclude: false}], 'utc');
  assert.equal(search.metrics.visits, 11);
  const chrome = period(sources, r, [{dimension: 'browser', value: 'chrome', exclude: false}], 'utc');
  assert.deepEqual(chrome.baseline.excludedBy.map(filter => filter.dimension), ['browser']);
  assert.equal(chrome.metrics.views, 3);
});

test('series buckets use exact GA4 days and periods', () => {
  const r = range('2026-09-20', '2026-09-23');
  const current = period(sources, r, [], 'utc');
  const values = series(current, buckets(r, 'utc'), 'utc');
  assert.deepEqual(values.views, [10, 7, 1]);
  assert.deepEqual(values.visitors, [7, 5, 1]);
  assert.deepEqual(values.bounceRate, [4 / 8, 2 / 5, 1]);
  // Buckets after the newest data are empty, not zero.
  assert.deepEqual(series(current, buckets(r, 'utc'), 'utc', Date.parse('2026-09-21T12:00:00Z')).views, [10, 7, null]);
  const weekly = period(sources, {...r, unit: 'week'}, [], 'utc');
  const weeks = series(weekly, buckets(weekly.range, 'utc'), 'utc');
  // Buckets are whole ISO weeks (Sep 14-20 and Sep 21-27) even though the range
  // starts on Sunday Sep 20. Each week's GA4 part is one exported day.
  assert.deepEqual(weeks.visitors, [7, 4 + 2]);
  assert.deepEqual(weeks.views, [10, 5 + 3]);
  const noPeriod = {...sources, baseline: new BaselineData({...baseline, periods: null})};
  const rolling = period(noPeriod, r, [], 'utc');
  // Two GA4 days with no matching period: daily sums for sessions, no visitors.
  assert.deepEqual([rolling.metrics.visits, rolling.metrics.visitors], [8 + 4 + 2, null]);
});

test('breakdowns merge GA4 rows and keep only metrics GA4 provides', () => {
  const current = period(sources, range('2026-09-20', '2026-09-23'), [], 'utc');
  const pages = breakdown(current, 'path');
  assert.deepEqual(pages.available, ['views']);
  assert.deepEqual(pages.rows.find(row => row.value === '/post/'), {value: '/post/', views: 6 + 5 + 1, visits: null, visitors: null});
  const browsers = breakdown(current, 'browser');
  assert.deepEqual([browsers.partial, browsers.available], [true, ['views', 'visits', 'visitors']]);
  const umamiOnly = breakdown(period(sources, range('2026-09-22', '2026-09-23'), [], 'utc'), 'path');
  assert.deepEqual([umamiOnly.partial, umamiOnly.available.length], [false, 3]);
  const eventRows = events(current);
  assert.deepEqual(eventRows.rows.map(row => [row.value, row.count, row.visitors]), [['page_view', 10, null], ['scroll', 3, null]]);
});
