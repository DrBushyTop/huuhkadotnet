import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {reports, requestFor, readReport, toCsv, callApi, validDate, exportData, receiveToken, calendarPeriod} from './export.mjs';

const report = {name: 'test', dimensions: ['date'], metrics: ['sessions']};
const page = (dates, count = dates.length) => ({
  dimensionHeaders: [{name: 'date'}], metricHeaders: [{name: 'sessions', type: 'TYPE_INTEGER'}],
  rows: dates.map(date => ({dimensionValues: [{value: date}], metricValues: [{value: '2'}]})),
  rowCount: count, metadata: {timeZone: 'Europe/Helsinki'},
});

test('date validation rejects rollover dates and requests use deterministic pagination', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.equal(validDate('2024-02-29'), true);
  assert.equal(validDate('2026-9-01'), false);
  const request = requestFor(report, '2021-01-01', '2026-09-23', 10000);
  assert.equal(request.offset, '10000');
  assert.equal(request.orderBys[0].dimension.dimensionName, 'date');
});

test('pagination follows returned row count rather than assuming a full page', async () => {
  const offsets = [];
  const result = await readReport({report, limit: 2, request: async body => {
    offsets.push(body.offset);
    return body.offset === '0' ? page(['20260101'], 3) : page(['20260102', '20260103'], 3);
  }});
  assert.deepEqual(offsets, ['0', '1']);
  assert.equal(result.rows.length, 3);
});

test('empty reports preserve CSV headers', async () => {
  const result = await readReport({report, request: async () => page([])});
  assert.equal(result.rows.length, 0);
  assert.equal(toCsv(result.headers, result.rows), '"date","sessions"\r\n');
});

test('rejects stalled pages, changing counts, duplicate keys, and wrong headers', async () => {
  await assert.rejects(readReport({report, request: async () => page([], 2)}), /pagination/);
  let calls = 0;
  await assert.rejects(readReport({report, limit: 1, request: async () => page(['20260101'], ++calls === 1 ? 2 : 3)}), /rowCount/);
  await assert.rejects(readReport({report, limit: 1, request: async () => page(['20260101'], 2)}), /duplicate/);
  await assert.rejects(readReport({report, request: async () => ({...page([]), metricHeaders: []})}), /headers/);
});

test('CSV preserves commas, quotes, newlines, Unicode and raw precision', () => {
  assert.equal(toCsv(['source', 'bounceRate'], [['a,"b"\nö', '0.3333333333333333']]),
    '"source","bounceRate"\r\n"a,""b""\nö","0.3333333333333333"\r\n');
});

test('ISO weeks start on Monday and cross calendar-year boundaries correctly', () => {
  assert.deepEqual(calendarPeriod('isoYearIsoWeek', '202053', '2020-01-01', '2021-12-31'), {
    calendarStart: '2020-12-28', calendarEnd: '2021-01-03',
    queryStart: '2020-12-28', queryEnd: '2021-01-03', partial: false,
  });
  assert.throws(() => calendarPeriod('isoYearIsoWeek', '202153', '2021-01-01', '2022-01-01'), /Invalid ISO/);
});

test('calendar sidecars mark clipped boundary weeks, leap months and years', () => {
  const week = calendarPeriod('isoYearIsoWeek', '202639', '2021-10-12', '2026-09-21');
  assert.equal(week.calendarStart, '2026-09-21');
  assert.equal(week.calendarEnd, '2026-09-27');
  assert.equal(week.queryEnd, '2026-09-21');
  assert.equal(week.partial, true);
  assert.equal(calendarPeriod('yearMonth', '202402', '2021-01-01', '2026-09-21').calendarEnd, '2024-02-29');
  assert.equal(calendarPeriod('year', '2026', '2021-10-12', '2026-09-21').queryEnd, '2026-09-21');
  assert.equal(calendarPeriod('year', '2021', '2021-10-12', '2026-09-21').queryStart, '2021-10-12');
});

test('all location and environment breakdowns include each period without accidental joint queries', () => {
  const groups = ['countries', 'regions', 'cities', 'browsers', 'operating-systems', 'devices', 'screen-resolutions', 'languages'];
  for (const group of groups) {
    for (const period of ['total', 'daily', 'weekly', 'monthly', 'yearly']) {
      const selected = reports.find(r => r.name === `${group}-${period}`);
      assert.ok(selected, `${group}-${period} missing`);
      for (const metric of ['totalUsers', 'bounceRate', 'averageSessionDuration']) assert.ok(selected.metrics.includes(metric));
    }
  }
  assert.equal(new Set(reports.map(r => r.name)).size, 49);
  assert.deepEqual(reports.find(r => r.name === 'cities-yearly').dimensions, ['year', 'countryId', 'country', 'region', 'city']);
  assert.deepEqual(reports.find(r => r.name === 'browsers-weekly').dimensions, ['isoYearIsoWeek', 'browser']);
});

test('API retries transient errors but not authentication failures; redacts tokens', async () => {
  let calls = 0;
  const waits = [];
  const result = await callApi('properties/1:runReport', 'secret', {}, {
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://analyticsdata.googleapis.com/v1beta/properties/1:runReport');
      assert.equal(options.headers.Authorization, 'Bearer secret');
      assert.equal(options.redirect, 'error');
      return ++calls < 3 ? new Response('{}', {status: 429}) : new Response('{"rowCount":0}');
    }, sleep: async ms => waits.push(ms),
  });
  assert.equal(result.rowCount, 0);
  assert.deepEqual(waits, [1000, 2000]);
  await assert.rejects(callApi('properties/1/metadata', 'secret', undefined, {
    fetchImpl: async () => new Response('{"error":{"message":"bad secret"}}', {status: 401}),
  }), error => error.message.includes('[redacted]') && !error.message.includes('secret'));
});

test('exports original responses, CSV and a complete manifest without credentials', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ga4-export-test-'));
  const output = join(root, 'data');
  const schema = {
    dimensions: [...new Set(reports.flatMap(r => r.dimensions))].map(apiName => ({apiName})),
    metrics: [...new Set(reports.flatMap(r => r.metrics))].map(apiName => ({apiName})),
  };
  try {
    const manifest = await exportData({token: 'private-token', property: '1', start: '2021-01-01', end: '2026-09-23', output,
      apiCall: async (path, token, body) => {
        if (!body) return schema;
        return {dimensionHeaders: body.dimensions, metricHeaders: body.metrics,
          rowCount: 1, rows: [{
            dimensionValues: body.dimensions.map(x => ({value: ({date: '20211012', isoYearIsoWeek: '202141', yearMonth: '202110', year: '2021'})[x.name] ?? 'example'})),
            metricValues: body.metrics.map(() => ({value: '1'})),
          }], metadata: {subjectToThresholding: true}};
      },
    });
    assert.equal(manifest.status, 'complete');
    assert.equal(manifest.reports.length, reports.length);
    assert.equal(manifest.reports[1].coverage.first, '20211012');
    const cities = JSON.parse(await readFile(join(output, 'cities-yearly.periods.json'), 'utf8'));
    assert.equal(cities.periods[0].dimensions.city, 'example');
    assert.equal(cities.periods[0].dimensions.year, '2021');
    assert.equal(cities.periods[0].metrics.sessions, '1');
    assert.equal(cities.periods[0].metrics.averageSessionDuration, '1');
    assert.equal(cities.periods[0].queryStart, '2021-01-01');
    for (const file of await readdir(output)) {
      assert.equal((await readFile(join(output, file), 'utf8')).includes('private-token'), false);
    }
    await assert.rejects(exportData({output}), /EEXIST/);
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('loopback handoff rejects other origins and accepts one token without storing it', async () => {
  let url;
  let announceReady;
  const ready = new Promise(resolve => { announceReady = resolve; });
  const receiving = receiveToken({timeoutMs: 5000, announce: message => {
    if (message.startsWith('Token handoff: ')) { url = message.slice(15); announceReady(); }
  }});
  await ready;
  const denied = await fetch(url, {method: 'POST', headers: {Origin: 'https://example.com'}, body: 'token=abc'});
  assert.equal(denied.status, 403);
  const accepted = await fetch(url, {method: 'POST', headers: {Origin: 'https://developers.google.com'}, body: 'token=abc.def'});
  assert.equal(accepted.status, 200);
  assert.equal(await receiving, 'abc.def');
});
