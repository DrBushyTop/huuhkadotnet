import assert from 'node:assert/strict';
import {test} from 'node:test';
import {Dataset, type Report} from '../src/lib/analytics.ts';
import {buckets, comparisonRange, resolveRange} from '../src/lib/dates.ts';
import {parseState, serializeState} from '../src/lib/state.ts';
import {period, series} from '../src/lib/combined.ts';

const t = (iso: string) => Date.parse(iso) / 1000;

// Two visitors. Session 0 has a two-page visit from Google and a later bounce;
// session 1 bounces once from Finland on Firefox.
const report: Report = {
  schemaVersion: 2,
  generatedAt: '2026-10-01T00:00:00Z',
  coverage: {from: '2026-09-21T10:00:00.000Z', through: '2026-09-23T08:00:00.000Z'},
  totals: {views: 4, visits: 3, visitors: 2, events: 1},
  strings: {
    path: ['/', '/post/'], title: ['Home', 'Post'], hostname: ['www.huuhka.net'],
    referrer: ['google.com', ''], browser: ['chrome', 'firefox'], os: ['Mac OS'], device: ['laptop'],
    country: ['US', 'FI'], region: ['', 'FI-18'], city: ['', 'Helsinki'], language: ['en-US'], screen: ['1920x1080'],
    utmSource: [''], utmMedium: [''], utmCampaign: [''], event: ['copy-code'],
  },
  visits: {
    start: [t('2026-09-21T10:00:00Z'), t('2026-09-22T12:00:00Z'), t('2026-09-23T08:00:00Z')],
    end: [t('2026-09-21T10:02:00Z'), t('2026-09-22T12:00:00Z'), t('2026-09-23T08:00:00Z')],
    session: [0, 1, 0], views: [2, 1, 1], entry: [0, 1, 1], exit: [1, 1, 1],
    referrer: [0, 1, 1], browser: [0, 1, 0], os: [0, 0, 0], device: [0, 0, 0],
    country: [0, 1, 0], region: [0, 1, 0], city: [0, 1, 0], language: [0, 0, 0], screen: [0, 0, 0],
    utmSource: [0, 0, 0], utmMedium: [0, 0, 0], utmCampaign: [0, 0, 0],
  },
  views: {
    t: [t('2026-09-21T10:00:00Z'), t('2026-09-21T10:02:00Z'), t('2026-09-22T12:00:00Z'), t('2026-09-23T08:00:00Z')],
    visit: [0, 0, 1, 2], path: [0, 1, 1, 1], title: [0, 1, 1, 1], hostname: [0, 0, 0, 0],
  },
  events: {t: [t('2026-09-22T12:00:05Z')], visit: [1], name: [0], path: [1]},
};

const data = new Dataset(report);
const all = {start: Date.parse('2026-09-21T00:00:00Z'), end: Date.parse('2026-09-24T00:00:00Z'), unit: 'day' as const};

test('metrics follow Umami definitions', () => {
  const m = data.metrics(data.select(all, [], 'utc'));
  assert.deepEqual([m.visitors, m.visits, m.views, m.bounces], [2, 3, 4, 2]);
  assert.equal(m.bounceRate, 2 / 3);
  assert.equal(m.duration, 40);
});

test('visit filters and page filters narrow the selection', () => {
  const finland = data.metrics(data.select(all, [{dimension: 'country', value: 'FI', exclude: false}], 'utc'));
  assert.deepEqual([finland.visitors, finland.views], [1, 1]);
  const notPost = data.select(all, [{dimension: 'path', value: '/post/', exclude: true}], 'utc');
  assert.deepEqual([...notPost], [0]);
  const direct = data.metrics(data.select(all, [{dimension: 'channel', value: 'Direct', exclude: false}], 'utc'));
  assert.equal(direct.visits, 2);
  const search = data.breakdown(data.select(all, [], 'utc'), 'channel', 'utc').find(row => row.value === 'Organic search');
  assert.equal(search?.visits, 1);
});

test('breakdowns count views, visits and visitors per value', () => {
  const rows = data.breakdown(data.select(all, [], 'utc'), 'path', 'utc');
  assert.deepEqual(rows.find(row => row.value === '/post/'), {value: '/post/', views: 3, visits: 3, visitors: 2});
  const cities = data.breakdown(data.select(all, [], 'utc'), 'city', 'utc').map(row => row.value).sort();
  assert.deepEqual(cities, ['', 'Helsinki|FI']);
});

test('series buckets by day and heatmap by weekday and hour', () => {
  const selection = data.select(all, [], 'utc');
  const current = period({data, baseline: null}, all, [], 'utc');
  const daily = series(current, buckets(all, 'utc'));
  assert.deepEqual(daily.views, [2, 1, 1]);
  assert.deepEqual(daily.bounceRate, [0, 1, 1]);
  const heat = data.heatmap(selection, 'utc');
  assert.equal(heat[0][10].views, 2); // Monday 10:00 UTC
  assert.equal(heat[1][12].visitors, 1);
});

test('custom events respect visit filters', () => {
  assert.deepEqual(data.events(all, [], 'utc'), [{value: 'copy-code', count: 1, visitors: 1}]);
  assert.deepEqual(data.events(all, [{dimension: 'country', value: 'US', exclude: false}], 'utc'), []);
});

test('relative ranges end at the latest data and compare with the prior period', () => {
  const anchor = Date.parse('2026-09-23T08:00:00Z');
  const coverage = {from: data.from, through: data.through};
  const week = resolveRange({preset: '7d', offset: 0}, anchor, coverage, 'utc');
  assert.equal(new Date(week.start).toISOString(), '2026-09-17T00:00:00.000Z');
  assert.equal(new Date(week.end).toISOString(), '2026-09-24T00:00:00.000Z');
  const earlier = resolveRange({preset: '7d', offset: -1}, anchor, coverage, 'utc');
  assert.equal(earlier.end, week.start);
  const previous = comparisonRange(week, {preset: '7d', offset: 0}, 'previous', 'utc');
  assert.equal(previous?.end, week.start);
  const month = resolveRange({preset: 'month', offset: 0}, anchor, coverage, 'utc');
  const lastYear = comparisonRange(month, {preset: 'month', offset: 0}, 'year', 'utc');
  assert.equal(new Date(lastYear!.start).toISOString(), '2025-09-01T00:00:00.000Z');
  const custom = resolveRange({preset: 'custom', offset: 0, from: '2026-09-22', to: '2026-09-22'}, anchor, coverage, 'utc');
  assert.equal(custom.unit, 'hour');
});

test('view state round-trips through the query string', () => {
  const state = parseState('?range=custom&from=2026-09-01&to=2026-09-10&compare=year&tz=utc&metric=views&f=country:FI&f=!path:/a:b/');
  assert.deepEqual(state.filters, [
    {dimension: 'country', value: 'FI', exclude: false},
    {dimension: 'path', value: '/a:b/', exclude: true},
  ]);
  assert.deepEqual(parseState(serializeState(state)), state);
  assert.equal(parseState('?range=bogus&f=nope:1').range.preset, '30d');
});
