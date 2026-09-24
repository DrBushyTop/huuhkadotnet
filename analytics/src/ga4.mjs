// One-time translation of the GA4 standard-report CSV export into the viewer's
// baseline format. GA4 reports are aggregates, so the baseline keeps them as
// daily counts: no synthetic visitors, sessions, or events are created.

import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';

/** Last GA4 day to keep. The site switched to Umami on 2026-09-21 at 17:50 UTC. */
export const GA4_LAST_DAY = '2026-09-21';

const OWN_HOSTS = new Set(['huuhka.net', 'blog.huuhka.net', 'huuhkadotnet-prod.azurewebsites.net']);

function readCsv(text) {
  const body = text.split(/\r?\n/).filter(line => !line.startsWith('#')).join('\n');
  return parse(body, {columns: true, skip_empty_lines: true, bom: true});
}

const isoDay = value => {
  if (!/^\d{8}$/.test(value)) throw new Error(`Invalid GA4 date ${value}.`);
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
};

/** Days since 1970-01-01, which keeps the columns compact. */
const dayNumber = iso => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;

const count = value => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`Invalid GA4 count ${value}.`);
  return Math.round(number);
};

/**
 * GA4 records paths without trailing slashes, AMP share parameters, and
 * text fragments. Umami records the canonical Ghost/Astro path with a trailing
 * slash, so normalise to that to merge the two sources' page rows.
 */
export function normalizePath(raw) {
  let path = String(raw ?? '').trim();
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

/** Sums rows sharing a key, then writes them as columns. */
function columns(rows, keyOf, fields) {
  const grouped = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    const prior = grouped.get(key);
    if (prior) for (const field of fields.sums) prior[field] += row[field];
    else grouped.set(key, {...row});
  }
  const sorted = [...grouped.values()].sort((a, b) => a.day - b.day);
  return Object.fromEntries([...fields.keys, ...fields.sums].map(field => [field, sorted.map(row => row[field])]));
}

function coverage(days) {
  if (!days.length) return null;
  const sorted = [...days].sort((a, b) => a - b);
  const iso = day => new Date(day * 86_400_000).toISOString().slice(0, 10);
  return {from: iso(sorted[0]), through: iso(sorted.at(-1))};
}

function checkManifest(manifest, files, nameOf) {
  for (const entry of manifest) {
    const name = nameOf(entry);
    const text = files[name];
    if (text === undefined) continue;
    const sha = createHash('sha256').update(text).digest('hex');
    if (sha !== entry.sha256) throw new Error(`${name} does not match the manifest checksum.`);
  }
}

const isoFromDashes = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Invalid GA4 date ${value}.`);
  return value;
};

/** Session metrics as additive counts: bounces and total duration instead of rates. */
function sessionCounts(metrics) {
  const sessions = count(metrics.sessions);
  const engaged = count(metrics.engagedSessions);
  return {
    visits: sessions,
    bounces: sessions - engaged,
    views: count(metrics.screenPageViews),
    visitors: count(metrics.totalUsers),
    duration: Math.round(Number(metrics.averageSessionDuration) * sessions),
  };
}

/**
 * Reads the GA4 Data API export: daily session metrics and exact user counts
 * for ISO weeks, months, years, and the whole export. Users and sessions only
 * add up within one period, so each period keeps GA4's own totals.
 */
export function translateGa4Api(files, lastDay) {
  const manifest = JSON.parse(files['manifest.json']);
  checkManifest(manifest.reports, files, entry => `${entry.name}.csv`);
  for (const entry of manifest.reports) {
    const zone = entry.metadata?.[0]?.timeZone;
    if (zone && zone !== 'Europe/Helsinki') throw new Error(`${entry.name} uses time zone ${zone}.`);
  }
  const last = dayNumber(lastDay);
  const days = [];
  for (const row of readCsv(files['sessions-daily.csv'])) {
    const day = dayNumber(isoDay(row.date));
    if (day <= last) days.push({day, ...sessionCounts(row)});
  }
  const periods = [];
  for (const kind of ['weekly', 'monthly', 'yearly']) {
    const sidecar = JSON.parse(files[`sessions-${kind}.periods.json`]);
    const csv = new Map(readCsv(files[`sessions-${kind}.csv`]).map(row => [Object.values(row)[0], row]));
    for (const period of sidecar.periods) {
      const row = csv.get(period.key);
      if (!row || row.totalUsers !== period.metrics.totalUsers || row.sessions !== period.metrics.sessions) {
        throw new Error(`sessions-${kind} period ${period.key} does not match its CSV row.`);
      }
      const from = dayNumber(isoFromDashes(period.queryStart));
      const to = Math.min(dayNumber(isoFromDashes(period.queryEnd)), last);
      if (from > last) continue;
      periods.push({kind, from, to, ...sessionCounts(row)});
    }
  }
  const [totals] = readCsv(files['session-totals.csv']);
  periods.push({kind: 'total', from: days[0].day, to: days.at(-1).day, ...sessionCounts(totals)});
  return {
    days: {
      day: days.map(row => row.day),
      ...Object.fromEntries(['views', 'visits', 'visitors', 'bounces', 'duration'].map(key => [key, days.map(row => row[key])])),
    },
    periods: Object.fromEntries(['kind', 'from', 'to', 'views', 'visits', 'visitors', 'bounces', 'duration'].map(key => [key, periods.map(row => row[key])])),
    api: {startedAt: manifest.startedAt, property: manifest.property, assumptions: manifest.integrationAssumptions ?? null},
  };
}

/**
 * @param files map of file name to text (pages-daily.csv, traffic-sources-daily.csv, events-daily.csv, manifest.json)
 * @param apiFiles optional GA4 Data API export (sessions-*.csv, *.periods.json, manifest.json)
 */
export function translateGa4(files, {lastDay = GA4_LAST_DAY, apiFiles = null} = {}) {
  const manifest = JSON.parse(files['manifest.json']);
  checkManifest(manifest.files, files, entry => entry.file);
  const last = dayNumber(lastDay);
  const keep = day => day <= last;
  const strings = {path: new Dictionary(), referrer: new Dictionary(), medium: new Dictionary(), event: new Dictionary()};
  const dropped = {views: 0, visits: 0};

  const pages = [];
  for (const row of readCsv(files['pages-daily.csv'])) {
    const day = dayNumber(isoDay(row.Date));
    const views = count(row.Views);
    if (!views) continue;
    if (!keep(day)) continue;
    pages.push({day, path: strings.path.id(normalizePath(row['Page path and screen class'])), views});
  }

  const sources = [];
  for (const row of readCsv(files['traffic-sources-daily.csv'])) {
    const day = dayNumber(isoDay(row.Date));
    const visits = count(row.Sessions);
    if (!visits) continue;
    if (!keep(day)) continue;
    const [source, medium = ''] = row['Session source / medium'].split(' / ');
    const cleanMedium = /^\((none|not set)\)$/.test(medium.trim()) ? '' : medium.trim().toLowerCase();
    sources.push({
      day,
      referrer: strings.referrer.id(normalizeSource(source, cleanMedium)),
      medium: strings.medium.id(cleanMedium),
      visits,
    });
  }

  const daily = new Map();
  const events = [];
  for (const row of readCsv(files['events-daily.csv'])) {
    const day = dayNumber(isoDay(row.Date));
    const name = row['Event name'];
    const eventCount = count(row['Event count']);
    const users = count(row['Total users']);
    if (!keep(day)) {
      if (name === 'page_view') dropped.views += eventCount;
      if (name === 'session_start') dropped.visits += eventCount;
      continue;
    }
    const entry = daily.get(day) ?? {day, views: 0, visits: 0, visitors: 0};
    // page_view and session_start are GA4's page view and session counts.
    // Daily "Total users" of page_view is the closest match to Umami's
    // visitors, but it is only valid for that single day.
    if (name === 'page_view') {
      entry.views += eventCount;
      entry.visitors += users;
    }
    if (name === 'session_start') entry.visits += eventCount;
    daily.set(day, entry);
    if (eventCount) events.push({day, name: strings.event.id(name), count: eventCount, visitors: users});
  }

  const eventDays = columns([...daily.values()].filter(row => row.views || row.visits), row => row.day, {keys: ['day'], sums: ['views', 'visits', 'visitors']});
  const api = apiFiles ? translateGa4Api(apiFiles, lastDay) : null;
  // The API export has sessions, engagement and duration; the standard
  // reports only have page_view and session_start counts.
  const days = api?.days ?? eventDays;
  const pageColumns = columns(pages, row => `${row.day}:${row.path}`, {keys: ['day', 'path'], sums: ['views']});
  const sourceColumns = columns(sources, row => `${row.day}:${row.referrer}:${row.medium}`, {keys: ['day', 'referrer', 'medium'], sums: ['visits']});
  const eventColumns = columns(events, row => `${row.day}:${row.name}`, {keys: ['day', 'name'], sums: ['count', 'visitors']});
  const sum = values => values.reduce((total, value) => total + value, 0);

  return {
    schemaVersion: api ? 2 : 1,
    source: 'ga4',
    generatedAt: new Date().toISOString(),
    exportedAt: manifest.exportedAt,
    property: manifest.property,
    lastDay,
    coverage: {daily: coverage(days.day), pages: coverage(pageColumns.day), sources: coverage(sourceColumns.day)},
    totals: {
      views: sum(days.views),
      visits: sum(days.visits),
      pageViews: sum(pageColumns.views),
      sourceVisits: sum(sourceColumns.visits),
      droppedAfterLastDay: dropped,
    },
    reportTotals: manifest.reportTotals,
    api: api?.api ?? null,
    periods: api?.periods ?? null,
    strings: Object.fromEntries(Object.entries(strings).map(([key, dictionary]) => [key, dictionary.values])),
    days,
    pages: pageColumns,
    sources: sourceColumns,
    events: eventColumns,
  };
}
