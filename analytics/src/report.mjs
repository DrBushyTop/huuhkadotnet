import {parse} from 'csv-parse/sync';
import {unzipSync, strFromU8} from 'fflate';

const requiredColumns = ['website_id', 'session_id', 'visit_id', 'event_id', 'url_path', 'referrer_domain', 'event_type', 'created_at'];

export function readExport(bytes, websiteId) {
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Umami export is not a ZIP file.');
  const files = unzipSync(bytes);
  const csv = files['website_event.csv'];
  if (!csv) throw new Error('Umami export has no website_event.csv.');
  const rows = parse(strFromU8(csv), {columns: true, bom: true, skip_empty_lines: true});
  const headers = parse(strFromU8(csv), {to_line: 1})[0];
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

function top(counts, key) {
  return [...counts].map(([name, count]) => ({[key]: name, count}))
    .sort((a, b) => b.count - a.count || a[key].localeCompare(b[key]));
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function aggregate(rows, ownHosts) {
  const sessions = new Set();
  const visits = new Map();
  const pages = new Map();
  for (const row of rows) {
    sessions.add(row.session_id);
    increment(pages, row.url_path || '/');
    const prior = visits.get(row.visit_id);
    if (!prior || row.created_at < prior.created_at) visits.set(row.visit_id, row);
  }
  const referrers = new Map();
  for (const first of visits.values()) {
    const domain = first.referrer_domain?.toLowerCase().replace(/^www\./, '') || 'Direct / unknown';
    if (ownHosts.has(domain)) continue;
    increment(referrers, domain);
  }
  return {
    views: rows.length,
    visitors: sessions.size,
    visits: visits.size,
    pages: top(pages, 'path'),
    referrers: top(referrers, 'domain'),
  };
}

export function buildReport(snapshots, {websiteId, ownDomains = ['huuhka.net', 'blog.huuhka.net']} = {}) {
  if (!websiteId) throw new Error('A website ID is required.');
  const unique = new Map();
  for (const snapshot of [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    for (const row of readExport(snapshot.bytes, websiteId)) unique.set(row.event_id, row);
  }
  const pageviews = [...unique.values()].filter(row => row.event_type === '1')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const ownHosts = new Set(ownDomains.map(host => host.replace(/^www\./, '').toLowerCase()));
  const months = new Map();
  for (const row of pageviews) {
    const month = row.created_at.slice(0, 7);
    if (!months.has(month)) months.set(month, []);
    months.get(month).push(row);
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    coverage: {
      from: pageviews[0]?.created_at ?? null,
      through: pageviews.at(-1)?.created_at ?? null,
    },
    all: aggregate(pageviews, ownHosts),
    months: [...months].sort(([a], [b]) => b.localeCompare(a))
      .map(([month, rows]) => ({month, ...aggregate(rows, ownHosts)})),
  };
}
