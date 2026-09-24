// Client-side analytics over the published dataset. Mirrors Umami's
// definitions: visitors are distinct sessions, visits are distinct visits,
// views are page views, a bounce is a visit with one page view, and visit
// duration is the time between a visit's first and last page view.

import {parts, type Range, type Zone} from './dates.ts';
import {browserName, channelOf, countryName, deviceName, hourName, languageName, regionName, WEEKDAYS} from './labels.ts';

export interface Report {
  schemaVersion: 2;
  generatedAt: string;
  coverage: {from: string | null; through: string | null};
  totals: {views: number; visits: number; visitors: number; events: number};
  strings: Record<string, string[]>;
  visits: Record<string, number[]>;
  views: Record<string, number[]>;
  events: {t: number[]; visit: number[]; name: number[]; path: number[]};
}

export type Dimension =
  | 'path' | 'title' | 'hostname' | 'entry' | 'exit'
  | 'referrer' | 'channel' | 'utmSource' | 'utmMedium' | 'utmCampaign'
  | 'browser' | 'os' | 'device' | 'screen'
  | 'country' | 'region' | 'city' | 'language'
  | 'weekday' | 'hour';

export type MetricKey = 'visitors' | 'visits' | 'views' | 'bounceRate' | 'duration';
export type CountKey = 'visitors' | 'visits' | 'views';

interface DimensionInfo {
  label: string;
  /** Visit dimensions describe the whole visit; view dimensions describe one page view. */
  scope: 'visit' | 'view';
  format: (value: string) => string;
}

const plain = (empty: string) => (value: string) => value || empty;

export const DIMENSIONS: Record<Dimension, DimensionInfo> = {
  path: {label: 'Page', scope: 'view', format: plain('/')},
  title: {label: 'Page title', scope: 'view', format: plain('(untitled)')},
  hostname: {label: 'Hostname', scope: 'view', format: plain('(none)')},
  entry: {label: 'Entry page', scope: 'visit', format: plain('/')},
  exit: {label: 'Exit page', scope: 'visit', format: plain('/')},
  referrer: {label: 'Referrer', scope: 'visit', format: plain('Direct / none')},
  channel: {label: 'Channel', scope: 'visit', format: plain('Direct')},
  utmSource: {label: 'UTM source', scope: 'visit', format: plain('(none)')},
  utmMedium: {label: 'UTM medium', scope: 'visit', format: plain('(none)')},
  utmCampaign: {label: 'UTM campaign', scope: 'visit', format: plain('(none)')},
  browser: {label: 'Browser', scope: 'visit', format: browserName},
  os: {label: 'OS', scope: 'visit', format: plain('Unknown')},
  device: {label: 'Device', scope: 'visit', format: deviceName},
  screen: {label: 'Screen', scope: 'visit', format: plain('Unknown')},
  country: {label: 'Country', scope: 'visit', format: countryName},
  region: {label: 'Region', scope: 'visit', format: regionName},
  city: {label: 'City', scope: 'visit', format: value => {
    const [city, country] = value.split('|');
    return city ? `${city}, ${countryName(country)}` : 'Unknown';
  }},
  language: {label: 'Language', scope: 'visit', format: languageName},
  weekday: {label: 'Weekday', scope: 'view', format: value => WEEKDAYS[Number(value)] ?? value},
  hour: {label: 'Hour', scope: 'view', format: value => hourName(Number(value))},
};

export interface Filter {
  dimension: Dimension;
  value: string;
  exclude: boolean;
}

export interface Metrics {
  visitors: number;
  visits: number;
  views: number;
  bounces: number;
  /** Seconds summed over visits. */
  totaltime: number;
  bounceRate: number;
  /** Average visit duration in seconds. */
  duration: number;
}

export interface Row {
  value: string;
  visitors: number;
  visits: number;
  views: number;
}

interface Column {
  /** One key per page view. */
  keys: Int32Array;
  values: string[];
}

function lowerBound(array: Float64Array, target: number): number {
  let low = 0;
  let high = array.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (array[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

export class Dataset {
  readonly report: Report;
  readonly viewTime: Float64Array;
  readonly viewVisit: Int32Array;
  readonly visitSession: Int32Array;
  readonly visitViews: Int32Array;
  readonly visitSeconds: Int32Array;
  readonly eventTime: Float64Array;
  readonly from: number;
  readonly through: number;
  #columns = new Map<string, Column>();

  constructor(report: Report) {
    if (report.schemaVersion !== 2) throw new Error(`Unsupported report schema ${report.schemaVersion}.`);
    this.report = report;
    this.viewTime = Float64Array.from(report.views.t, t => t * 1000);
    this.viewVisit = Int32Array.from(report.views.visit);
    this.visitSession = Int32Array.from(report.visits.session);
    this.visitViews = Int32Array.from(report.visits.views);
    this.visitSeconds = Int32Array.from(report.visits.end, (end, i) => end - report.visits.start[i]);
    this.eventTime = Float64Array.from(report.events.t, t => t * 1000);
    this.from = report.coverage.from ? Date.parse(report.coverage.from) : Date.now();
    this.through = report.coverage.through ? Date.parse(report.coverage.through) : Date.now();
  }

  get size() {
    return this.viewTime.length;
  }

  /** Per-view keys for a dimension, built on first use. */
  column(dimension: Dimension, zone: Zone): Column {
    const cacheKey = dimension === 'weekday' || dimension === 'hour' ? `${dimension}:${zone}` : dimension;
    let column = this.#columns.get(cacheKey);
    if (!column) {
      column = this.#build(dimension, zone);
      this.#columns.set(cacheKey, column);
    }
    return column;
  }

  #build(dimension: Dimension, zone: Zone): Column {
    const {strings, visits, views} = this.report;
    const n = this.size;
    if (dimension === 'weekday' || dimension === 'hour') {
      const keys = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        const p = parts(this.viewTime[i], zone);
        keys[i] = dimension === 'weekday' ? p.dow : p.h;
      }
      const count = dimension === 'weekday' ? 7 : 24;
      return {keys, values: Array.from({length: count}, (_, i) => String(i))};
    }
    if (dimension === 'path' || dimension === 'title' || dimension === 'hostname') {
      return {keys: Int32Array.from(views[dimension]), values: strings[dimension]};
    }
    let visitKeys: ArrayLike<number>;
    let values: string[];
    if (dimension === 'entry' || dimension === 'exit') {
      visitKeys = visits[dimension];
      values = strings.path;
    } else if (dimension === 'channel' || dimension === 'city') {
      const lookup = new Map<string, number>();
      values = [];
      const mapped = new Int32Array(visits.start.length);
      for (let v = 0; v < mapped.length; v++) {
        const value = dimension === 'channel'
          ? channelOf(strings.referrer[visits.referrer[v]], strings.utmMedium[visits.utmMedium[v]], strings.utmSource[visits.utmSource[v]])
          : strings.city[visits.city[v]] ? `${strings.city[visits.city[v]]}|${strings.country[visits.country[v]]}` : '';
        let id = lookup.get(value);
        if (id === undefined) {
          id = values.length;
          values.push(value);
          lookup.set(value, id);
        }
        mapped[v] = id;
      }
      visitKeys = mapped;
    } else {
      visitKeys = visits[dimension];
      values = strings[dimension];
    }
    const keys = new Int32Array(n);
    for (let i = 0; i < n; i++) keys[i] = visitKeys[this.viewVisit[i]];
    return {keys, values};
  }

  /** Indices of page views inside the range that match every filter. */
  select(range: Range, filters: Filter[], zone: Zone): Int32Array {
    const first = lowerBound(this.viewTime, range.start);
    const last = lowerBound(this.viewTime, range.end);
    const tests = filters.map(filter => {
      const column = this.column(filter.dimension, zone);
      return {keys: column.keys, id: column.values.indexOf(filter.value), exclude: filter.exclude};
    });
    const selected = new Int32Array(Math.max(0, last - first));
    let count = 0;
    outer: for (let i = first; i < last; i++) {
      for (const test of tests) {
        if ((test.keys[i] === test.id) === test.exclude) continue outer;
      }
      selected[count++] = i;
    }
    return selected.subarray(0, count);
  }

  metrics(selection: Int32Array): Metrics {
    const visits = new Set<number>();
    const sessions = new Set<number>();
    for (const i of selection) visits.add(this.viewVisit[i]);
    let bounces = 0;
    let totaltime = 0;
    for (const v of visits) {
      sessions.add(this.visitSession[v]);
      if (this.visitViews[v] === 1) bounces++;
      totaltime += this.visitSeconds[v];
    }
    return finish(sessions.size, visits.size, selection.length, bounces, totaltime);
  }

  breakdown(selection: Int32Array, dimension: Dimension, zone: Zone): Row[] {
    const {keys, values} = this.column(dimension, zone);
    const groups = new Map<number, {views: number; visits: Set<number>; sessions: Set<number>}>();
    for (const i of selection) {
      const key = keys[i];
      let group = groups.get(key);
      if (!group) {
        group = {views: 0, visits: new Set(), sessions: new Set()};
        groups.set(key, group);
      }
      const v = this.viewVisit[i];
      group.views++;
      group.visits.add(v);
      group.sessions.add(this.visitSession[v]);
    }
    return [...groups].map(([key, group]) => ({
      value: values[key],
      views: group.views,
      visits: group.visits.size,
      visitors: group.sessions.size,
    }));
  }

  /** Visitors and views by weekday (Monday first) and hour. */
  heatmap(selection: Int32Array, zone: Zone): {visitors: number; views: number}[][] {
    const weekday = this.column('weekday', zone).keys;
    const hour = this.column('hour', zone).keys;
    const cells = Array.from({length: 7}, () => Array.from({length: 24}, () => ({views: 0, sessions: new Set<number>()})));
    for (const i of selection) {
      const cell = cells[weekday[i]][hour[i]];
      cell.views++;
      cell.sessions.add(this.visitSession[this.viewVisit[i]]);
    }
    return cells.map(row => row.map(cell => ({views: cell.views, visitors: cell.sessions.size})));
  }

  /** Custom events in range. Visit filters apply through the event's visit; page filters use its path. */
  events(range: Range, filters: Filter[], zone: Zone): {value: string; count: number; visitors: number}[] {
    const {events, strings} = this.report;
    const first = lowerBound(this.eventTime, range.start);
    const last = lowerBound(this.eventTime, range.end);
    const visitTests = filters.filter(filter => DIMENSIONS[filter.dimension].scope === 'visit').map(filter => {
      const column = this.column(filter.dimension, zone);
      const id = column.values.indexOf(filter.value);
      // Look up the visit's key through any of its views.
      const byVisit = new Map<number, number>();
      for (let i = 0; i < this.size; i++) byVisit.set(this.viewVisit[i], column.keys[i]);
      return {byVisit, id, exclude: filter.exclude};
    });
    const pathTests = filters.filter(filter => filter.dimension === 'path')
      .map(filter => ({id: strings.path.indexOf(filter.value), exclude: filter.exclude}));
    const timeTests = filters.filter(filter => filter.dimension === 'weekday' || filter.dimension === 'hour');
    const groups = new Map<number, {count: number; sessions: Set<number>}>();
    outer: for (let e = first; e < last; e++) {
      const visit = events.visit[e];
      for (const test of visitTests) {
        if ((visit >= 0 && test.byVisit.get(visit) === test.id) === test.exclude) continue outer;
      }
      for (const test of pathTests) {
        if ((events.path[e] === test.id) === test.exclude) continue outer;
      }
      if (timeTests.length) {
        const p = parts(this.eventTime[e], zone);
        for (const test of timeTests) {
          const key = String(test.dimension === 'weekday' ? p.dow : p.h);
          if ((key === test.value) === test.exclude) continue outer;
        }
      }
      let group = groups.get(events.name[e]);
      if (!group) {
        group = {count: 0, sessions: new Set()};
        groups.set(events.name[e], group);
      }
      group.count++;
      if (visit >= 0) group.sessions.add(this.visitSession[visit]);
    }
    return [...groups].map(([name, group]) => ({value: strings.event[name], count: group.count, visitors: group.sessions.size}))
      .sort((a, b) => b.count - a.count);
  }
}

function finish(visitors: number, visits: number, views: number, bounces: number, totaltime: number): Metrics {
  return {
    visitors, visits, views, bounces, totaltime,
    bounceRate: visits ? Math.min(visits, bounces) / visits : 0,
    duration: visits ? totaltime / visits : 0,
  };
}

/** Relative change, or null when there is no baseline. */
export function change(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return (current - previous) / previous;
}
