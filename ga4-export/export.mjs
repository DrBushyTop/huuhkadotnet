import {createServer} from 'node:http';
import {randomBytes, createHash} from 'node:crypto';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';

const api = 'https://analyticsdata.googleapis.com/v1beta';
const sessionMetrics = [
  'sessions', 'engagedSessions', 'bounceRate', 'engagementRate',
  'averageSessionDuration', 'userEngagementDuration',
  'screenPageViews', 'totalUsers', 'activeUsers',
];
const breakdowns = [
  {name: 'countries', dimensions: ['countryId', 'country']},
  {name: 'regions', dimensions: ['countryId', 'country', 'region']},
  {name: 'cities', dimensions: ['countryId', 'country', 'region', 'city']},
  {name: 'browsers', dimensions: ['browser']},
  {name: 'operating-systems', dimensions: ['operatingSystem']},
  {name: 'devices', dimensions: ['deviceCategory']},
  {name: 'screen-resolutions', dimensions: ['screenResolution']},
  {name: 'languages', dimensions: ['language']},
];
const breakdownPeriods = [
  {name: 'total', dimensions: []},
  {name: 'daily', dimensions: ['date']},
  {name: 'weekly', dimensions: ['isoYearIsoWeek']},
  {name: 'monthly', dimensions: ['yearMonth']},
  {name: 'yearly', dimensions: ['year']},
];
export const reports = [
  {name: 'session-totals', dimensions: [], metrics: sessionMetrics},
  {name: 'sessions-daily', dimensions: ['date'], metrics: sessionMetrics},
  {name: 'sessions-weekly', dimensions: ['isoYearIsoWeek'], metrics: sessionMetrics},
  {name: 'sessions-monthly', dimensions: ['yearMonth'], metrics: sessionMetrics},
  {name: 'sessions-yearly', dimensions: ['year'], metrics: sessionMetrics},
  {name: 'traffic-sources-daily', dimensions: ['date', 'sessionSourceMedium'], metrics: sessionMetrics},
  {name: 'landing-pages-daily', dimensions: ['date', 'landingPagePlusQueryString'], metrics: sessionMetrics},
  {name: 'pages-daily', dimensions: ['date', 'pagePath'], metrics: ['screenPageViews', 'totalUsers', 'activeUsers', 'userEngagementDuration']},
  {name: 'events-daily', dimensions: ['date', 'eventName'], metrics: ['eventCount', 'totalUsers']},
  ...breakdowns.flatMap(breakdown => breakdownPeriods.map(period => ({
    name: `${breakdown.name}-${period.name}`,
    dimensions: [...period.dimensions, ...breakdown.dimensions],
    metrics: sessionMetrics,
  }))),
];

export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function requestFor(report, start, end, offset = 0, limit = 10000) {
  return {
    dateRanges: [{startDate: start, endDate: end}],
    dimensions: report.dimensions.map(name => ({name})),
    metrics: report.metrics.map(name => ({name})),
    orderBys: report.dimensions.map(dimensionName => ({dimension: {dimensionName, orderType: 'ALPHANUMERIC'}})),
    offset: String(offset),
    limit: String(limit),
    keepEmptyRows: false,
    returnPropertyQuota: true,
  };
}

export async function callApi(path, token, body, {fetchImpl = fetch, sleep = delay} = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetchImpl(`${api}/${path}`, {
      method: body ? 'POST' : 'GET',
      redirect: 'error',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(120000),
    });
    if ([429, 500, 502, 503, 504].includes(response.status) && attempt < 3) {
      await response.arrayBuffer();
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    const data = await response.json();
    if (!response.ok) {
      const message = String(data.error?.message ?? response.statusText).replaceAll(token, '[redacted]');
      throw new Error(`GA4 API HTTP ${response.status}: ${message}`);
    }
    return data;
  }
}

export async function readReport({report, start, end, request, onPage, limit = 10000}) {
  const rows = [];
  const metadata = [];
  let rowCount;
  let headers;
  let offset = 0;
  do {
    const body = requestFor(report, start, end, offset, limit);
    const page = await request(body);
    await onPage?.(body, page, metadata.length);
    const actualHeaders = [
      ...(page.dimensionHeaders ?? []).map(x => x.name),
      ...(page.metricHeaders ?? []).map(x => x.name),
    ];
    const expectedHeaders = [...report.dimensions, ...report.metrics];
    if (JSON.stringify(actualHeaders) !== JSON.stringify(expectedHeaders)) {
      throw new Error(`${report.name}: unexpected API headers`);
    }
    headers = actualHeaders;
    const count = page.rowCount ?? 0;
    if (!Number.isSafeInteger(count) || count < 0 || (rowCount !== undefined && rowCount !== count)) {
      throw new Error(`${report.name}: invalid or changing rowCount; rerun against a settled date range`);
    }
    rowCount = count;
    const batch = page.rows ?? [];
    if (batch.length > limit || offset + batch.length > rowCount || (!batch.length && offset < rowCount)) {
      throw new Error(`${report.name}: incomplete or inconsistent pagination`);
    }
    for (const row of batch) {
      const values = [...(row.dimensionValues ?? []), ...(row.metricValues ?? [])].map(x => x.value);
      if (values.length !== headers.length || values.some(x => typeof x !== 'string')) {
        throw new Error(`${report.name}: invalid row width or values`);
      }
      if ((row.metricValues ?? []).some(x => !Number.isFinite(Number(x.value)))) {
        throw new Error(`${report.name}: non-numeric metric value`);
      }
      rows.push(values);
    }
    metadata.push(page.metadata ?? {});
    offset += batch.length;
  } while (offset < rowCount);
  if (report.dimensions.length) {
    const keys = new Set(rows.map(row => JSON.stringify(row.slice(0, report.dimensions.length))));
    if (keys.size !== rows.length) throw new Error(`${report.name}: duplicate dimension keys across pages`);
  }
  return {headers, rows, rowCount, metadata};
}

export function toCsv(headers, rows) {
  const escape = value => `"${String(value).replaceAll('"', '""')}"`;
  return [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

/** Calendar dates in the GA4 property's timezone, not UTC timestamps. */
export function calendarPeriod(dimension, value, start, end) {
  const iso = date => date.toISOString().slice(0, 10);
  let first;
  let next;
  if (dimension === 'isoYearIsoWeek' && /^\d{6}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const week = Number(value.slice(4));
    if (week < 1 || week > 53) throw new Error('Invalid ISO week');
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const mondayOffset = (jan4.getUTCDay() + 6) % 7;
    first = new Date(Date.UTC(year, 0, 4 - mondayOffset + (week - 1) * 7));
    // Thursday determines an ISO week's year. Not every year has week 53.
    if (new Date(first.getTime() + 3 * 86400000).getUTCFullYear() !== year) throw new Error('Invalid ISO week-year');
    next = new Date(first.getTime() + 7 * 86400000);
  } else if (dimension === 'yearMonth' && /^\d{6}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4));
    if (month < 1 || month > 12) throw new Error('Invalid month');
    first = new Date(Date.UTC(year, month - 1, 1));
    next = new Date(Date.UTC(year, month, 1));
  } else if (dimension === 'year' && /^\d{4}$/.test(value)) {
    first = new Date(Date.UTC(Number(value), 0, 1));
    next = new Date(Date.UTC(Number(value) + 1, 0, 1));
  } else {
    throw new Error(`Invalid calendar period: ${dimension}=${value}`);
  }
  const calendarStart = iso(first);
  const calendarEnd = iso(new Date(next.getTime() - 86400000));
  const queryStart = calendarStart < start ? start : calendarStart;
  const queryEnd = calendarEnd > end ? end : calendarEnd;
  if (queryStart > queryEnd) throw new Error('Calendar period falls outside the requested range');
  return {calendarStart, calendarEnd, queryStart, queryEnd, partial: queryStart !== calendarStart || queryEnd !== calendarEnd};
}

// A single-use loopback handoff for the access token explicitly displayed by
// Google's OAuth Playground. This does not read browser cookies or session state.
export function receiveToken({timeoutMs = 600000, announce = console.log} = {}) {
  return new Promise((resolveToken, reject) => {
    const route = `/token/${randomBytes(24).toString('hex')}`;
    let settled = false;
    const finish = (error, token) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      if (error) reject(error);
      else resolveToken(token);
    };
    const server = createServer(async (req, res) => {
      if (req.url !== route || req.headers.origin !== 'https://developers.google.com') {
        res.writeHead(403).end();
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', 'https://developers.google.com');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
        res.writeHead(204).end();
        return;
      }
      if (req.method !== 'POST') {
        res.writeHead(405).end();
        return;
      }
      try {
        let body = '';
        for await (const chunk of req) {
          body += chunk.toString('utf8');
          if (body.length > 8192) throw new Error('Token handoff too large');
        }
        const token = new URLSearchParams(body).get('token');
        if (!token || !/^[A-Za-z0-9._~+/-]+={0,2}$/.test(token)) {
          throw new Error('Invalid access token');
        }
        res.writeHead(200, {'Content-Type': 'text/plain'}).end('Token received. Export running locally.');
        finish(null, token);
      } catch {
        res.writeHead(400).end('Invalid token handoff');
      }
    });
    const timer = setTimeout(() => finish(new Error('Timed out waiting for OAuth authorization')), timeoutMs);
    server.on('error', error => finish(error));
    server.listen(0, '127.0.0.1', () => {
      announce(`Token handoff: http://127.0.0.1:${server.address().port}${route}`);
      announce('Waiting for a short-lived analytics.readonly token. No token will be saved.');
    });
  });
}

async function saveJson(path, value) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', {mode: 0o600, flag: 'wx'});
}

export async function exportData({token, property, start, end, output, apiCall = callApi, selectedReports = reports}) {
  // Refuse to overwrite a previous export, even a partially completed one.
  await mkdir(dirname(output), {recursive: true, mode: 0o700});
  await mkdir(output, {mode: 0o700});
  const manifest = {
    status: 'running', startedAt: new Date().toISOString(), property, start, end,
    api: `${api}/properties/${property}:runReport`,
    reports: [],
    notes: [
      'Raw API responses are aggregate reports, not individual visits or events.',
      'Rates are fractions. Duration metrics are seconds.',
      'userEngagementDuration is total foreground engagement time, not average session duration.',
      'Use session-totals for whole-period metrics. Do not add distinct users or take unweighted averages of row rates or durations.',
      'Inspect response metadata for sampling, thresholding, truncation, timezone and (other) data loss.',
      'Omitted dates are not automatically zero. Check actual coverage per report.',
      'Weekly rows use Monday-start ISO weeks. Calendar dates use the GA4 property timezone; do not reinterpret them as browser-local or UTC boundaries.',
      'Period sidecars identify clipped first/last weeks, months and years. An exact period user count cannot answer a different rolling or custom date range.',
      'Location and environment files are separate breakdowns, not a joint visitor dataset. Do not add their user counts or infer cross-dimension filters from separate files.',
      'Country IDs are included alongside names; region and city reports retain their country and region context.',
      'GA4 and Umami definitions differ. These exports have not been merged into Umami.',
      'The owner confirmed no cross-provider duplicates for this archive. GA4 and Umami visitor totals may be added under that assumption; it does not make daily GA4 users additive across dates.',
      'The requested range may overlap the September 21, 2026 provider switch; choose an explicit import cutoff.',
    ],
  };
  const saveManifest = () => writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', {mode: 0o600});
  await saveManifest();
  try {
    const schema = await apiCall(`properties/${property}/metadata`, token);
    await saveJson(join(output, 'schema.json'), schema);
    const knownDimensions = new Set((schema.dimensions ?? []).map(x => x.apiName));
    const knownMetrics = new Set((schema.metrics ?? []).map(x => x.apiName));
    for (const report of selectedReports) {
      for (const name of report.dimensions) {
        if (!knownDimensions.has(name)) throw new Error(`Unavailable dimension: ${name}`);
      }
      for (const name of report.metrics) {
        if (!knownMetrics.has(name)) throw new Error(`Unavailable metric: ${name}`);
      }
      console.log(`Exporting ${report.name}...`);
      const result = await readReport({
        report, start, end,
        request: body => apiCall(`properties/${property}:runReport`, token, body),
        onPage: async (request, response, index) => {
          await saveJson(join(output, `${report.name}.page-${String(index + 1).padStart(4, '0')}.json`), {request, response});
        },
      });
      const csv = toCsv(result.headers, result.rows);
      await writeFile(join(output, `${report.name}.csv`), csv, {mode: 0o600, flag: 'wx'});
      const dateColumn = result.headers.indexOf('date');
      const dates = dateColumn < 0 ? [] : result.rows.map(row => row[dateColumn]).filter(x => /^\d{8}$/.test(x)).sort();
      let periodFile;
      const periodDimension = report.dimensions.find(x => ['isoYearIsoWeek', 'yearMonth', 'year'].includes(x));
      if (periodDimension) {
        periodFile = `${report.name}.periods.json`;
        await saveJson(join(output, periodFile), {
          timeZone: result.metadata[0]?.timeZone,
          dateBounds: 'inclusive',
          requestedRange: {start, end},
          periods: result.rows.map(row => ({
            key: row[report.dimensions.indexOf(periodDimension)],
            dimensions: Object.fromEntries(report.dimensions.map((dimension, index) => [dimension, row[index]])),
            ...calendarPeriod(periodDimension, row[report.dimensions.indexOf(periodDimension)], start, end),
            metrics: Object.fromEntries(report.metrics.map((metric, index) => [metric, row[index + report.dimensions.length]])),
          })),
        });
      }
      manifest.reports.push({
        name: report.name, rows: result.rowCount, pages: result.metadata.length,
        headers: result.headers,
        coverage: dates.length ? {first: dates[0], last: dates.at(-1)} : null,
        ...(periodFile ? {periodFile} : {}),
        sha256: createHash('sha256').update(csv).digest('hex'),
        metadata: result.metadata,
      });
      await saveManifest();
      console.log(`Saved ${report.name}: ${result.rowCount} rows`);
    }
    manifest.status = 'complete';
    manifest.completedAt = new Date().toISOString();
    await saveManifest();
    return manifest;
  } catch (error) {
    manifest.status = 'failed';
    manifest.error = String(error.message).replaceAll(token, '[redacted]');
    await saveManifest();
    throw error;
  }
}

async function main() {
  const {values} = parseArgs({options: {
    property: {type: 'string', default: '289649733'},
    start: {type: 'string', default: '2017-09-27'},
    end: {type: 'string', default: '2026-09-23'},
    out: {type: 'string'},
    'token-stdin': {type: 'boolean'},
    'receive-token': {type: 'boolean'},
    'dry-run': {type: 'boolean'},
    'periods-only': {type: 'boolean'},
    help: {type: 'boolean'},
  }});
  if (values.help) {
    console.log('node ga4-export/export.mjs [--property ID] [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--out DIR] [--token-stdin | --receive-token] [--periods-only] [--dry-run]');
    return;
  }
  if (!/^\d+$/.test(values.property)) throw new Error('Property must be a numeric GA4 property ID');
  if (!validDate(values.start) || !validDate(values.end) || values.start > values.end) throw new Error('Invalid date range');
  if (values['token-stdin'] && values['receive-token']) throw new Error('Choose one token input method');
  const selectedReports = values['periods-only']
    ? reports.filter(report => report.name === 'session-totals' || report.name.startsWith('sessions-'))
    : reports;
  if (values['dry-run']) {
    console.log(JSON.stringify(selectedReports.map(report => ({name: report.name, request: requestFor(report, values.start, values.end)})), null, 2));
    return;
  }
  let token = process.env.GA4_ACCESS_TOKEN;
  if (values['receive-token']) token = await receiveToken();
  if (values['token-stdin']) {
    token = '';
    for await (const chunk of process.stdin) {
      token += chunk;
      if (token.length > 8192) throw new Error('Token input too large');
    }
  }
  token = token?.trim();
  if (!token || /\s/.test(token)) throw new Error('Supply a short-lived analytics.readonly access token via --token-stdin, --receive-token, or GA4_ACCESS_TOKEN');
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const output = resolve(values.out ?? join(dirname(fileURLToPath(import.meta.url)), 'data', stamp));
  await exportData({token, property: values.property, start: values.start, end: values.end, output, selectedReports});
  console.log(`Export complete: ${output}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
