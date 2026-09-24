// The GA4 baseline: aggregated daily reports from before the switch to Umami.
// Each query picks the table that can answer it under the active filters, and
// reports "unavailable" rather than guessing when none can.

import {make, parts, type Range, type Zone} from './dates.ts';
import type {Dimension, Filter} from './analytics.ts';
import {channelOf} from './labels.ts';
import type {Counts, EventField, RowField, Table as TableOf} from './combined.ts';

export interface Baseline {
  schemaVersion: 1 | 2;
  source: 'ga4';
  generatedAt: string;
  exportedAt: string;
  lastDay: string;
  coverage: {daily: {from: string; through: string} | null};
  totals: {views: number; visits: number};
  /** GA4's own report totals for the whole export, including deduplicated users. */
  reportTotals?: {totalUsers?: number};
  strings: {path: string[]; referrer: string[]; medium: string[]; event: string[]};
  /** Daily totals. Version 2 adds GA4 bounces (non-engaged sessions) and total session seconds. */
  days: {day: number[]; views: number[]; visits: number[]; visitors: number[]; bounces?: number[]; duration?: number[]};
  /**
   * GA4's own totals for ISO weeks, months, years, and the whole export, as
   * inclusive day ranges clipped to the export. Users and sessions only add up
   * within one of these.
   */
  periods?: {kind: string[]; from: number[]; to: number[]; views: number[]; visits: number[]; visitors: number[]; bounces: number[]; duration: number[]} | null;
  pages: {day: number[]; path: number[]; views: number[]};
  sources: {day: number[]; referrer: number[]; medium: number[]; visits: number[]};
  events: {day: number[]; name: number[]; count: number[]; visitors: number[]};
}

export type BaselineMetric = 'views' | 'visits' | 'visitors' | 'bounces' | 'duration';
type BaselineCounts = Record<BaselineMetric, number>;
type Table = 'days' | 'pages' | 'sources';

/** Dimensions each table can filter or break down by. Weekday comes from the date. */
const TABLE_DIMENSIONS: Record<Table, Dimension[]> = {
  days: ['weekday'],
  pages: ['weekday', 'path'],
  sources: ['weekday', 'referrer', 'channel'],
};
const METRIC_TABLES: Record<BaselineMetric, Table[]> = {
  views: ['days', 'pages'],
  visits: ['days', 'sources'],
  visitors: ['days'],
  bounces: ['days'],
  duration: ['days'],
};

const dayOf = (ms: number, zone: Zone) => {
  const p = parts(ms, zone);
  return Date.UTC(p.y, p.m, p.d) / 86_400_000;
};

export const BASELINE_DIMENSIONS = new Set<Dimension>(['path', 'referrer', 'channel', 'weekday']);

export class BaselineData {
  readonly data: Baseline;
  readonly from: number;
  /** Exclusive end of the last GA4 day, in UTC. */
  readonly through: number;
  readonly channels: string[];

  constructor(data: Baseline) {
    if (![1, 2].includes(data.schemaVersion) || data.source !== 'ga4') throw new Error('Unsupported baseline format.');
    this.data = data;
    this.from = Date.parse(`${data.coverage.daily?.from ?? data.lastDay}T00:00:00Z`);
    this.through = Date.parse(`${data.lastDay}T00:00:00Z`) + 86_400_000;
    const {referrer, medium} = data.strings;
    this.channels = data.sources.referrer.map((id, i) =>
      referrer[id] === '(not set)' ? 'Unknown' : channelOf(referrer[id], medium[data.sources.medium[i]], ''));
  }

  /** Start of a GA4 calendar day in the chosen zone. GA4 days are property-local dates. */
  dayStart(day: number, zone: Zone): number {
    const date = new Date(day * 86_400_000);
    return make(zone, date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  /** True when daily bounces and durations are available (API export). */
  get hasSessions(): boolean {
    return Boolean(this.data.days.bounces && this.data.days.duration);
  }

  /**
   * GA4's exact totals when the GA4 days in the range form one GA4 day, ISO
   * week, month, year, or the whole export. Null for other ranges, such as a
   * rolling 30 days, where users and sessions cannot be derived.
   */
  exact(range: Range, zone: Zone): BaselineCounts | null {
    const {days, periods} = this.data;
    if (!days.day.length) return null;
    const from = Math.max(dayOf(range.start, zone), days.day[0]);
    const to = Math.min(dayOf(range.end - 1, zone), days.day.at(-1)!);
    if (from > to) return null;
    if (from === to) {
      const row = days.day.indexOf(from);
      if (row < 0 || !this.hasSessions) return null;
      return {views: days.views[row], visits: days.visits[row], visitors: days.visitors[row], bounces: days.bounces![row], duration: days.duration![row]};
    }
    if (!periods) return null;
    for (let i = 0; i < periods.from.length; i++) {
      if (periods.from[i] === from && periods.to[i] === to) {
        return {views: periods.views[i], visits: periods.visits[i], visitors: periods.visitors[i], bounces: periods.bounces[i], duration: periods.duration[i]};
      }
    }
    return null;
  }

  /** GA4 has daily rows inside the range, counting only filters GA4 can apply to days. */
  present(range: Range, filters: Filter[], zone: Zone): boolean {
    if (range.start >= this.through + 86_400_000 || range.end <= this.from - 86_400_000) return false;
    const weekday = filters.filter(filter => filter.dimension === 'weekday');
    let found = false;
    this.#rows('days', range, weekday, zone, () => { found = true; });
    return found;
  }

  /** Filters GA4 cannot answer at all, such as browser or hour. */
  unsupported(filters: Filter[]): Filter[] {
    return filters.filter(filter => !BASELINE_DIMENSIONS.has(filter.dimension));
  }

  /**
   * GA4's counts for a range. Exact period totals when the GA4 days form a
   * whole GA4 day, week, month, year, or the whole export; otherwise additive
   * daily sums, with visitors unknown. Zero outside GA4's coverage.
   */
  counts(range: Range, filters: Filter[], zone: Zone): Counts {
    if (!this.present(range, filters, zone)) return {views: 0, visits: 0, visitors: 0, bounces: 0, duration: 0, sessions: 0};
    const exact = filters.length ? null : this.exact(range, zone);
    if (exact) return {...exact, sessions: exact.visits};
    const sum = (metric: BaselineMetric) => this.#total(metric, range, filters, zone)?.value ?? null;
    const visitors = this.#total('visitors', range, filters, zone);
    const visits = sum('visits');
    return {
      views: sum('views'),
      visits,
      visitors: visitors && visitors.days <= 1 ? visitors.value : null,
      bounces: sum('bounces'),
      duration: sum('duration'),
      // Bounces and duration come from the daily table only; filtered by page or
      // source they are unknown, so the session base is too.
      sessions: this.#table('bounces', filters.map(filter => filter.dimension)) ? visits : null,
    };
  }

  #table(metric: BaselineMetric, dimensions: Dimension[]): Table | null {
    return METRIC_TABLES[metric].find(table => dimensions.every(dimension => TABLE_DIMENSIONS[table].includes(dimension))) ?? null;
  }

  /** Row keys for a table column, as the same strings Umami filters use. */
  #value(table: Table, dimension: Dimension, row: number, zone: Zone): string {
    const {strings, pages, sources} = this.data;
    switch (dimension) {
      case 'weekday': return String(parts(this.#starts(table, zone)[row], zone).dow);
      case 'path': return strings.path[pages.path[row]];
      case 'referrer': return strings.referrer[sources.referrer[row]];
      case 'channel': return this.channels[row];
      default: return '';
    }
  }

  #startCache = new Map<string, Float64Array>();

  /** Day start of every row in a table, for the zone. Tables are sorted by day. */
  #starts(table: Table | 'events', zone: Zone): Float64Array {
    const key = `${table}:${zone}`;
    let starts = this.#startCache.get(key);
    if (!starts) {
      starts = Float64Array.from(this.data[table].day, day => this.dayStart(day, zone));
      this.#startCache.set(key, starts);
    }
    return starts;
  }

  #rows(table: Table | 'events', range: Range, filters: Filter[], zone: Zone, visit: (row: number) => void) {
    const starts = this.#starts(table, zone);
    let low = 0;
    let high = starts.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (starts[mid] < range.start) low = mid + 1;
      else high = mid;
    }
    for (let row = low; row < starts.length && starts[row] < range.end; row++) {
      if (filters.some(filter => (this.#value(table as Table, filter.dimension, row, zone) === filter.value) === filter.exclude)) continue;
      visit(row);
    }
  }

  #metricColumn(table: Table, metric: BaselineMetric): number[] | null {
    if (table === 'pages') return this.data.pages.views;
    if (table === 'sources') return this.data.sources.visits;
    return this.data.days[metric] ?? null;
  }

  /** Sum over the range, or null when no table supports the filters. `days` counts GA4 days with data. */
  #total(metric: BaselineMetric, range: Range, filters: Filter[], zone: Zone): {value: number; days: number} | null {
    const table = this.#table(metric, filters.map(filter => filter.dimension));
    const values = table && this.#metricColumn(table, metric);
    if (!table || !values) return null;
    const starts = this.#starts(table, zone);
    let value = 0;
    const days = new Set<number>();
    this.#rows(table, range, filters, zone, row => {
      value += values[row];
      days.add(starts[row]);
    });
    return {value, days: days.size};
  }

  /** Breakdown rows for page, referrer, or channel. Null for dimensions GA4 lacks. */
  rows(dimension: Dimension, range: Range, filters: Filter[], zone: Zone): TableOf<RowField> | null {
    const table: Table | null = dimension === 'path' ? 'pages' : dimension === 'referrer' || dimension === 'channel' ? 'sources' : null;
    if (!table || !filters.every(filter => TABLE_DIMENSIONS[table].includes(filter.dimension))) return null;
    const metric = table === 'pages' ? 'views' : 'visits';
    const values = this.#metricColumn(table, metric)!;
    const rows = new Map<string, Partial<Record<RowField, number>>>();
    this.#rows(table, range, filters, zone, row => {
      const key = this.#value(table, dimension, row, zone);
      const entry = rows.get(key) ?? {[metric]: 0};
      entry[metric] = (entry[metric] ?? 0) + values[row];
      rows.set(key, entry);
    });
    return {provides: [metric], rows};
  }

  /** GA4 event counts. GA4 counts event users per day, so it provides counts only. */
  events(range: Range, filters: Filter[], zone: Zone): TableOf<EventField> | null {
    if (filters.some(filter => filter.dimension !== 'weekday')) return null;
    const {events, strings} = this.data;
    const rows = new Map<string, Partial<Record<EventField, number>>>();
    const starts = this.#starts('events', zone);
    for (let row = 0; row < events.day.length; row++) {
      if (starts[row] < range.start || starts[row] >= range.end) continue;
      const weekday = String(parts(starts[row], zone).dow);
      if (filters.some(filter => (weekday === filter.value) === filter.exclude)) continue;
      const name = strings.event[events.name[row]];
      rows.set(name, {count: (rows.get(name)?.count ?? 0) + events.count[row]});
    }
    return {provides: ['count'], rows};
  }
}
