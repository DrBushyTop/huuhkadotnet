// One-time translation of the GA4 Data API export (ga4-export/) into the
// viewer's baseline format. GA4 reports are aggregates, so the baseline keeps
// them as aggregates: one table per dimension, with additive daily rows and
// GA4's own totals for each ISO week, month, year, and the whole export. No
// synthetic visitors, sessions, or events are created.

import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';

/** Last GA4 day to keep. The site switched to Umami on 2026-09-21 at 17:50 UTC. */
export const GA4_LAST_DAY = '2026-09-21';

const OWN_HOSTS = new Set(['huuhka.net', 'blog.huuhka.net', 'huuhkadotnet-prod.azurewebsites.net']);
const NOT_SET = new Set(['(not set)', '(other)']);

/** GA4 browser and OS names mapped to the identifiers Umami records, so rows merge. */
const BROWSERS = {
  'Chrome': 'chrome', 'Edge': 'edge-chromium', 'Firefox': 'firefox', 'Safari': 'safari', 'Safari (in-app)': 'ios-webview',
  'Opera': 'opera', 'Samsung Internet': 'samsung', 'Android Webview': 'chromium-webview', 'Internet Explorer': 'ie',
  'YaBrowser': 'yandexbrowser', '(not set)': '',
};
const OPERATING_SYSTEMS = {Macintosh: 'Mac OS', Android: 'Android OS', '(not set)': ''};

/** GA4 reports language names; Umami records codes. Map names back to ISO 639-1 codes. */
const LANGUAGE_CODES = (() => {
  const names = new Intl.DisplayNames(['en'], {type: 'language', fallback: 'none'});
  const codes = new Map();
  for (let a = 97; a <= 122; a++) {
    for (let b = 97; b <= 122; b++) {
      const code = String.fromCharCode(a, b);
      const name = names.of(code);
      if (name && !codes.has(name)) codes.set(name, code);
    }
  }
  return codes;
})();

const readCsv = text => parse(text, {columns: true, skip_empty_lines: true, bom: true});

const dayNumber = iso => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const compactDay = value => {
  if (!/^\d{8}$/.test(value)) throw new Error(`Invalid GA4 date ${value}.`);
  return dayNumber(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`);
};
const dashedDay = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid GA4 date ${value}.`);
  return dayNumber(value);
};
const isoDay = day => new Date(day * 86_400_000).toISOString().slice(0, 10);

const count = value => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid GA4 count ${value}.`);
  return number;
};

/**
 * GA4 records paths without trailing slashes, AMP share parameters, and text
 * fragments. Umami records the canonical path with a trailing slash, so
 * normalise to that to merge the two sources' page rows.
 */
export function normalizePath(raw) {
  let path = String(raw ?? '').trim();
  if (!path || NOT_SET.has(path)) return '(not set)';
  path = path.split(/[?#&]|\/:~:|:~:|\/amp_tf=|amp_tf=/)[0];
  if (!path.startsWith('/')) return path || '/';
  if (!path.endsWith('/') && !/\.[a-z0-9]{2,5}$/i.test(path)) path += '/';
  return path;
}

/** Converts a GA4 session source into an Umami-style referrer domain. */
export function normalizeSource(source, medium) {
  const value = String(source ?? '').trim().toLowerCase().replace(/^www\./, '');
  if (!value || value === '(direct)') return '';
  if (value === '(not set)') return '(not set)';
  if (OWN_HOSTS.has(value)) return '';
  // GA4 names search engines without a domain, for example "google / organic".
  if (medium === 'organic' && !value.includes('.')) return `${value}.com`;
  return value;
}

const unset = value => (NOT_SET.has(value) ? '' : value);

/**
 * Tables and how to key their rows the way Umami keys the same dimension.
 * `periods` marks reports exported with weekly, monthly, yearly, and total files.
 */
const TABLES = {
  site: {file: 'sessions', key: () => '', periods: true, totalFile: 'session-totals'},
  path: {file: 'pages', key: row => normalizePath(row.pagePath)},
  entry: {file: 'landing-pages', key: row => normalizePath(row.landingPagePlusQueryString)},
  referrer: {file: 'traffic-sources', key: row => row.sessionSourceMedium},
  country: {file: 'countries', key: row => unset(row.countryId), periods: true},
  region: {file: 'regions', key: row => (unset(row.region) ? `${unset(row.countryId)}|${row.region}` : ''), periods: true},
  city: {file: 'cities', key: row => (unset(row.city) ? `${row.city}|${unset(row.countryId)}` : ''), periods: true},
  browser: {file: 'browsers', key: row => BROWSERS[row.browser] ?? row.browser, periods: true},
  os: {file: 'operating-systems', key: row => OPERATING_SYSTEMS[row.operatingSystem] ?? row.operatingSystem, periods: true},
  device: {file: 'devices', key: row => unset(row.deviceCategory), periods: true},
  screen: {file: 'screen-resolutions', key: row => unset(row.screenResolution), periods: true},
  language: {file: 'languages', key: row => (NOT_SET.has(row.language) ? '' : LANGUAGE_CODES.get(row.language) ?? row.language), periods: true},
  event: {file: 'events', key: row => row.eventName},
};

class Dictionary {
  values = [];
  #index = new Map();
  id(value) {
    let id = this.#index.get(value);
    if (id === undefined) {
      id = this.values.length;
      this.values.push(value);
      this.#index.set(value, id);
    }
    return id;
  }
}

/** Additive counts: bounces and total duration instead of rates. */
function counts(row) {
  if (row.eventCount !== undefined) return {count: count(row.eventCount), visitors: count(row.totalUsers)};
  const out = {views: count(row.screenPageViews), visitors: count(row.totalUsers)};
  if (row.sessions !== undefined) {
    const sessions = count(row.sessions);
    out.visits = sessions;
    out.bounces = sessions - count(row.engagedSessions);
    out.duration = Math.round(Number(row.averageSessionDuration) * sessions);
  }
  return out;
}

/** Groups rows by key, summing metrics (keys can merge after normalisation). */
function columns(rows, keyFields) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyFields.map(field => row[field]).join(':');
    const prior = grouped.get(key);
    if (!prior) grouped.set(key, {...row});
    else for (const [field, value] of Object.entries(row)) if (!keyFields.includes(field)) prior[field] += value;
  }
  const sorted = [...grouped.values()].sort((a, b) => keyFields.reduce((order, field) => order || a[field] - b[field], 0));
  const fields = Object.keys(sorted[0] ?? {});
  return Object.fromEntries(fields.map(field => [field, sorted.map(row => row[field])]));
}

/**
 * @param files map of file name to text: *-daily.csv, *-weekly/monthly/yearly.csv,
 *   their .periods.json sidecars, *-total.csv, session-totals.csv, manifest.json
 */
export function translateGa4(files, {lastDay = GA4_LAST_DAY} = {}) {
  const manifest = JSON.parse(files['manifest.json']);
  for (const report of manifest.reports) {
    const text = files[`${report.name}.csv`];
    if (text === undefined) throw new Error(`${report.name}.csv is missing.`);
    if (createHash('sha256').update(text).digest('hex') !== report.sha256) throw new Error(`${report.name}.csv does not match the manifest checksum.`);
    const zone = report.metadata?.[0]?.timeZone;
    if (zone && zone !== 'Europe/Helsinki') throw new Error(`${report.name} uses time zone ${zone}.`);
  }
  const last = dayNumber(lastDay);
  const strings = Object.fromEntries([...Object.keys(TABLES), 'medium'].map(name => [name, new Dictionary()]));
  const periodIndex = new Map();
  const periods = [];
  const periodId = (kind, key, from, to) => {
    const id = `${kind}:${key}`;
    if (!periodIndex.has(id)) {
      periodIndex.set(id, periods.length);
      periods.push({kind, from, to});
    }
    return periodIndex.get(id);
  };

  const tables = {};
  let firstDay = Infinity;
  for (const [name, spec] of Object.entries(TABLES)) {
    const value = row => {
      if (name !== 'referrer') return strings[name].id(spec.key(row));
      const [source, medium = ''] = row.sessionSourceMedium.split(' / ');
      const cleanMedium = /^\((none|not set)\)$/.test(medium.trim()) ? '' : medium.trim().toLowerCase();
      return strings.referrer.id(normalizeSource(source, cleanMedium));
    };
    const medium = row => {
      const [, raw = ''] = row.sessionSourceMedium.split(' / ');
      return strings.medium.id(/^\((none|not set)\)$/.test(raw.trim()) ? '' : raw.trim().toLowerCase());
    };
    const daily = [];
    for (const row of readCsv(files[`${spec.file}-daily.csv`])) {
      const day = compactDay(row.date);
      if (day > last) continue;
      firstDay = Math.min(firstDay, day);
      daily.push({day, ...(name === 'site' ? {} : {value: value(row)}), ...(name === 'referrer' ? {medium: medium(row)} : {}), ...counts(row)});
    }
    const keys = name === 'site' ? ['day'] : name === 'referrer' ? ['day', 'value', 'medium'] : ['day', 'value'];
    const table = {daily: columns(daily, keys)};

    if (spec.periods) {
      const rows = [];
      for (const kind of ['weekly', 'monthly', 'yearly']) {
        const sidecar = JSON.parse(files[`${spec.file}-${kind}.periods.json`]);
        const csvRows = readCsv(files[`${spec.file}-${kind}.csv`]).length;
        if (sidecar.periods.length !== csvRows) throw new Error(`${spec.file}-${kind} sidecar has ${sidecar.periods.length} rows, CSV ${csvRows}.`);
        for (const period of sidecar.periods) {
          const from = dashedDay(period.queryStart);
          if (from > last) continue;
          const to = Math.min(dashedDay(period.queryEnd), last);
          const row = {...period.dimensions, ...period.metrics};
          rows.push({period: periodId(kind, period.key, from, to), ...(name === 'site' ? {} : {value: value(row)}), ...counts(row)});
        }
      }
      const totalFile = spec.totalFile ?? `${spec.file}-total`;
      for (const row of readCsv(files[`${totalFile}.csv`])) {
        rows.push({period: periodId('total', 'all', -1, -1), ...(name === 'site' ? {} : {value: value(row)}), ...counts(row)});
      }
      table.periods = columns(rows, name === 'site' ? ['period'] : ['period', 'value']);
    }
    tables[name] = table;
  }

  // The total period spans the whole export.
  const siteDays = tables.site.daily.day;
  for (const period of periods) {
    if (period.kind === 'total') {
      period.from = siteDays[0];
      period.to = siteDays.at(-1);
    }
  }
  const sum = values => Math.round(values.reduce((total, value) => total + value, 0));
  return {
    schemaVersion: 3,
    source: 'ga4',
    generatedAt: new Date().toISOString(),
    exportedAt: manifest.startedAt,
    property: manifest.property,
    lastDay,
    coverage: {daily: {from: isoDay(firstDay), through: isoDay(siteDays.at(-1))}},
    totals: {views: sum(tables.site.daily.views), visits: sum(tables.site.daily.visits)},
    assumptions: manifest.integrationAssumptions ?? null,
    periods: {kind: periods.map(period => period.kind), from: periods.map(period => period.from), to: periods.map(period => period.to)},
    strings: Object.fromEntries(Object.entries(strings).map(([name, dictionary]) => [name, dictionary.values])),
    tables,
  };
}
