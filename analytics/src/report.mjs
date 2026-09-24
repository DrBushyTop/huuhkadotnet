import {parse} from 'csv-parse/sync';
import {unzipSync, strFromU8} from 'fflate';

const requiredColumns = ['website_id', 'session_id', 'visit_id', 'event_id', 'url_path', 'referrer_domain', 'event_type', 'created_at'];

// Visit attributes come from the first page view of each visit. View attributes
// belong to each page view. Missing optional columns become empty strings.
const visitDimensions = {
  referrer: 'referrer_domain',
  browser: 'browser',
  os: 'os',
  device: 'device',
  country: 'country',
  region: 'region',
  city: 'city',
  language: 'language',
  screen: 'screen',
  utmSource: 'utm_source',
  utmMedium: 'utm_medium',
  utmCampaign: 'utm_campaign',
};
const viewDimensions = {path: 'url_path', title: 'page_title', hostname: 'hostname'};

export function readExport(bytes, websiteId) {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Umami export is not a ZIP file.');
  const files = unzipSync(bytes);
  const csv = files['website_event.csv'];
  if (!csv) throw new Error('Umami export has no website_event.csv.');
  const text = strFromU8(csv);
  const rows = parse(text, {columns: true, bom: true, skip_empty_lines: true});
  const headers = parse(text, {to_line: 1, bom: true})[0];
  for (const column of requiredColumns) {
    if (!headers.includes(column)) throw new Error(`Umami export is missing ${column}.`);
  }
  for (const row of rows) {
    if (row.website_id !== websiteId) throw new Error('Export contains a different website ID.');
    if (!row.event_id || !row.session_id || !row.visit_id) throw new Error('Export contains an event without its identifiers.');
    if (!eventDate(row.created_at)) throw new Error('Export contains an invalid event timestamp.');
  }
  return rows;
}

function eventDate(value) {
  const iso = value?.replace(' ', 'T');
  const date = new Date(`${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const seconds = value => Math.floor(eventDate(value).getTime() / 1000);
const clean = value => (value == null || value === '\\N' ? '' : String(value).trim());

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

function referrerDomain(row, ownHosts) {
  const domain = clean(row.referrer_domain).toLowerCase().replace(/^www\./, '');
  return !domain || ownHosts.has(domain) ? '' : domain;
}

export function buildReport(snapshots, {websiteId, ownDomains = ['huuhka.net', 'blog.huuhka.net']} = {}) {
  if (!websiteId) throw new Error('A website ID is required.');
  const unique = new Map();
  for (const snapshot of [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    for (const row of readExport(snapshot.bytes, websiteId)) unique.set(row.event_id, row);
  }
  const ownHosts = new Set(ownDomains.map(host => host.replace(/^www\./, '').toLowerCase()));
  const ordered = [...unique.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.event_id.localeCompare(b.event_id));
  const pageviews = ordered.filter(row => row.event_type === '1');
  const customEvents = ordered.filter(row => row.event_type === '2' && clean(row.event_name));

  const strings = Object.fromEntries([...Object.keys(visitDimensions), ...Object.keys(viewDimensions), 'event'].map(key => [key, new Dictionary()]));
  const sessionIds = new Map();
  const visitIndex = new Map();
  const visits = {start: [], end: [], session: [], views: [], entry: [], exit: [], ...Object.fromEntries(Object.keys(visitDimensions).map(key => [key, []]))};
  const views = {t: [], visit: [], ...Object.fromEntries(Object.keys(viewDimensions).map(key => [key, []]))};

  for (const row of pageviews) {
    const t = seconds(row.created_at);
    const path = strings.path.id(clean(row.url_path) || '/');
    let visit = visitIndex.get(row.visit_id);
    if (visit === undefined) {
      visit = visits.start.length;
      visitIndex.set(row.visit_id, visit);
      if (!sessionIds.has(row.session_id)) sessionIds.set(row.session_id, sessionIds.size);
      visits.start.push(t);
      visits.end.push(t);
      visits.session.push(sessionIds.get(row.session_id));
      visits.views.push(0);
      visits.entry.push(path);
      visits.exit.push(path);
      for (const [key, column] of Object.entries(visitDimensions)) {
        const value = key === 'referrer' ? referrerDomain(row, ownHosts) : clean(row[column]);
        visits[key].push(strings[key].id(value));
      }
    }
    visits.end[visit] = t;
    visits.exit[visit] = path;
    visits.views[visit] += 1;
    views.t.push(t);
    views.visit.push(visit);
    for (const [key, column] of Object.entries(viewDimensions)) {
      views[key].push(key === 'path' ? path : strings[key].id(clean(row[column])));
    }
  }

  const events = {t: [], visit: [], name: [], path: []};
  for (const row of customEvents) {
    events.t.push(seconds(row.created_at));
    events.visit.push(visitIndex.get(row.visit_id) ?? -1);
    events.name.push(strings.event.id(clean(row.event_name)));
    events.path.push(strings.path.id(clean(row.url_path) || '/'));
  }

  const iso = row => row ? eventDate(row.created_at).toISOString() : null;
  return {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    coverage: {from: iso(pageviews[0]), through: iso(pageviews.at(-1))},
    totals: {views: pageviews.length, visits: visitIndex.size, visitors: sessionIds.size, events: customEvents.length},
    strings: Object.fromEntries(Object.entries(strings).map(([key, dictionary]) => [key, dictionary.values])),
    visits,
    views,
    events,
  };
}
