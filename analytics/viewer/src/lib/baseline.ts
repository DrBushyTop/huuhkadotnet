// The GA4 baseline: aggregated reports from before the switch to Umami, one
// table per dimension (see analytics/src/ga4.mjs). Each query picks the table
// that can answer it and reports "unavailable" rather than guessing when none
// can. GA4 breakdowns are separate reports, so one GA4 table answers at most
// one filtered dimension at a time.

import {make, parts, type Range, type Zone} from './dates.ts';
import type {Dimension, Filter} from './analytics.ts';
import {channelOf} from './labels.ts';
import type {Counts, EventField, RowField, Table as TableOf} from './combined.ts';

type TableName = 'site' | 'path' | 'entry' | 'referrer' | 'country' | 'region' | 'city'
  | 'browser' | 'os' | 'device' | 'screen' | 'language' | 'event';

type Metric = 'views' | 'visits' | 'visitors' | 'bounces' | 'duration' | 'count';

interface Columns extends Partial<Record<Metric, number[]>> {
  day?: number[];
  period?: number[];
  value?: number[];
  medium?: number[];
}

export interface Baseline {
  schemaVersion: 3;
  source: 'ga4';
  generatedAt: string;
  exportedAt: string;
  lastDay: string;
  coverage: {daily: {from: string; through: string} | null};
  totals: {views: number; visits: number};
  /** GA4's own periods (ISO weeks, months, years, whole export), as inclusive day ranges clipped to the export. */
  periods: {kind: string[]; from: number[]; to: number[]};
  strings: Record<string, string[]>;
  tables: Record<TableName, {daily: Columns; periods?: Columns}>;
}

/** Viewer dimensions GA4 has a table for. Weekday comes from the date in any table. */
const DIMENSION_TABLES: Partial<Record<Dimension, TableName>> = {
  path: 'path', entry: 'entry', referrer: 'referrer', channel: 'referrer',
  country: 'country', region: 'region', city: 'city',
  browser: 'browser', os: 'os', device: 'device', screen: 'screen', language: 'language',
};

export const BASELINE_DIMENSIONS = new Set<Dimension>([...Object.keys(DIMENSION_TABLES) as Dimension[], 'weekday']);

const dayOf = (ms: number, zone: Zone) => {
  const p = parts(ms, zone);
  return Date.UTC(p.y, p.m, p.d) / 86_400_000;
};

const ZERO: Counts = {views: 0, visits: 0, visitors: 0, bounces: 0, duration: 0, sessions: 0};

export class BaselineData {
  readonly data: Baseline;
  readonly from: number;
  /** Exclusive end of the last GA4 day, in UTC. */
  readonly through: number;
  #firstDay: number;
  #lastDay: number;
  #starts = new Map<string, Float64Array>();
  #keys = new Map<string, string[]>();
  #periodRows = new Map<TableName, Map<number, [number, number]>>();

  constructor(data: Baseline) {
    if (data.schemaVersion !== 3 || data.source !== 'ga4') throw new Error('Unsupported baseline format.');
    this.data = data;
    const days = data.tables.site.daily.day!;
    this.#firstDay = days[0];
    this.#lastDay = days.at(-1)!;
    this.from = this.#firstDay * 86_400_000;
    this.through = (this.#lastDay + 1) * 86_400_000;
  }

  /** Start of a GA4 calendar day in the chosen zone. GA4 days are property-local dates. */
  dayStart(day: number, zone: Zone): number {
    const date = new Date(day * 86_400_000);
    return make(zone, date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }

  #dayStarts(table: TableName, zone: Zone): Float64Array {
    const cacheKey = `${table}:${zone}`;
    let starts = this.#starts.get(cacheKey);
    if (!starts) {
      starts = Float64Array.from(this.data.tables[table].daily.day!, day => this.dayStart(day, zone));
      this.#starts.set(cacheKey, starts);
    }
    return starts;
  }

  /** Row keys as the same strings Umami filters use, for daily or period rows. */
  #rowKeys(table: TableName, dimension: Dimension, source: 'daily' | 'periods'): string[] {
    const cacheKey = `${table}:${dimension}:${source}`;
    let keys = this.#keys.get(cacheKey);
    if (!keys) {
      const columns = this.data.tables[table][source]!;
      const values = this.data.strings[table];
      if (dimension === 'channel') {
        const media = this.data.strings.medium;
        keys = columns.value!.map((id, row) =>
          values[id] === '(not set)' ? 'Unknown' : channelOf(values[id], media[columns.medium![row]], ''));
      } else {
        keys = columns.value!.map(id => values[id]);
      }
      this.#keys.set(cacheKey, keys);
    }
    return keys;
  }

  /** Row index ranges per period, since period rows are sorted by period. */
  #periodRange(table: TableName, period: number): [number, number] | null {
    let index = this.#periodRows.get(table);
    if (!index) {
      index = new Map();
      const column = this.data.tables[table].periods!.period!;
      for (let row = 0; row < column.length; row++) {
        const range = index.get(column[row]);
        if (range) range[1] = row + 1;
        else index.set(column[row], [row, row + 1]);
      }
      this.#periodRows.set(table, index);
    }
    return index.get(period) ?? null;
  }

  /** The GA4 period whose days are exactly the GA4 days in the range, if any. */
  #period(range: Range, zone: Zone): number | null {
    const from = Math.max(dayOf(range.start, zone), this.#firstDay);
    const to = Math.min(dayOf(range.end - 1, zone), this.#lastDay);
    if (from >= to) return null;
    const {periods} = this.data;
    for (let p = 0; p < periods.from.length; p++) {
      if (periods.from[p] === from && periods.to[p] === to) return p;
    }
    return null;
  }

  /** Non-weekday filters must all belong to one table; returns it, 'site' for none, or null. */
  #tableFor(filters: Filter[]): TableName | null {
    const tables = new Set(filters.filter(filter => filter.dimension !== 'weekday').map(filter => DIMENSION_TABLES[filter.dimension]));
    if (tables.has(undefined)) return null;
    if (tables.size > 1) return null;
    return (tables.values().next().value as TableName | undefined) ?? 'site';
  }

  /** Filters GA4 cannot answer: dimensions it lacks, or several separately reported dimensions together. */
  unsupported(filters: Filter[]): Filter[] {
    const other = filters.filter(filter => filter.dimension !== 'weekday');
    if (other.some(filter => !DIMENSION_TABLES[filter.dimension])) return other.filter(filter => !DIMENSION_TABLES[filter.dimension]);
    return this.#tableFor(filters) ? [] : other;
  }

  /** Visits daily rows of a table within the range that pass the filters. */
  #daily(table: TableName, range: Range, filters: Filter[], zone: Zone, visit: (row: number, start: number) => void) {
    const starts = this.#dayStarts(table, zone);
    let low = 0;
    let high = starts.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (starts[mid] < range.start) low = mid + 1;
      else high = mid;
    }
    const tests = filters.map(filter => filter.dimension === 'weekday'
      ? (row: number) => String(parts(starts[row], zone).dow) === filter.value
      : (() => {
          const keys = this.#rowKeys(table, filter.dimension, 'daily');
          return (row: number) => keys[row] === filter.value;
        })());
    outer: for (let row = low; row < starts.length && starts[row] < range.end; row++) {
      for (let i = 0; i < tests.length; i++) if (tests[i](row) === filters[i].exclude) continue outer;
      visit(row, starts[row]);
    }
  }

  /** GA4 has daily rows inside the range, counting only filters GA4 can apply to days. */
  present(range: Range, filters: Filter[], zone: Zone): boolean {
    if (range.start >= this.through + 86_400_000 || range.end <= this.from - 86_400_000) return false;
    let found = false;
    this.#daily('site', range, filters.filter(filter => filter.dimension === 'weekday'), zone, () => { found = true; });
    return found;
  }

  /**
   * GA4's counts for a range. Exact period totals when the GA4 days form a
   * whole GA4 day, week, month, year, or the whole export and at most one
   * value is selected; otherwise additive daily sums, with visitors only for
   * a single day. Zero outside GA4's coverage.
   */
  counts(range: Range, filters: Filter[], zone: Zone): Counts {
    if (!this.present(range, filters, zone)) return {...ZERO};
    const table = this.#tableFor(filters);
    if (!table) return {views: null, visits: null, visitors: null, bounces: null, duration: null, sessions: null};
    const {daily, periods: periodRows} = this.data.tables[table];
    const selected = filters.filter(filter => filter.dimension !== 'weekday');
    const weekday = filters.some(filter => filter.dimension === 'weekday');
    const single = table === 'site' ? selected.length === 0 : selected.length === 1 && !selected[0].exclude;
    const has = (metric: Metric) => Boolean(daily[metric]);

    const period = !weekday && single && periodRows ? this.#period(range, zone) : null;
    if (period !== null) {
      const rows = this.#periodRange(table, period);
      const keys = table === 'site' ? null : this.#rowKeys(table, selected[0].dimension, 'periods');
      const total = {views: 0, visits: 0, visitors: 0, bounces: 0, duration: 0};
      if (rows) {
        for (let row = rows[0]; row < rows[1]; row++) {
          if (keys && keys[row] !== selected[0].value) continue;
          for (const metric of Object.keys(total) as (keyof typeof total)[]) total[metric] += periodRows![metric]?.[row] ?? 0;
        }
      }
      return {...total, sessions: total.visits};
    }

    const sums: Record<Metric, number> = {views: 0, visits: 0, visitors: 0, bounces: 0, duration: 0, count: 0};
    const days = new Set<number>();
    this.#daily(table, range, filters, zone, (row, start) => {
      days.add(start);
      for (const metric of ['views', 'visits', 'visitors', 'bounces', 'duration'] as const) sums[metric] += daily[metric]?.[row] ?? 0;
    });
    const value = (metric: Metric) => (has(metric) ? sums[metric] : null);
    return {
      views: value('views'),
      visits: value('visits'),
      visitors: days.size <= 1 && single && has('visitors') ? sums.visitors : null,
      bounces: value('bounces'),
      duration: value('duration'),
      sessions: value('visits'),
    };
  }

  /** Breakdown rows for a dimension GA4 reports, or null when it can't under these filters. */
  rows(dimension: Dimension, range: Range, filters: Filter[], zone: Zone): TableOf<RowField> | null {
    const table = DIMENSION_TABLES[dimension];
    if (!table) return null;
    // Only filters on this dimension's own table (or weekday) can apply to its rows.
    if (filters.some(filter => filter.dimension !== 'weekday' && DIMENSION_TABLES[filter.dimension] !== table)) return null;
    const {daily, periods: periodRows} = this.data.tables[table];
    const fields = (['views', 'visits', 'visitors'] as const).filter(field => daily[field]);
    const rows = new Map<string, Partial<Record<RowField, number>>>();
    const add = (key: string, source: Columns, row: number) => {
      const entry = rows.get(key) ?? {};
      for (const field of fields) entry[field] = (entry[field] ?? 0) + (source[field]?.[row] ?? 0);
      rows.set(key, entry);
    };

    const weekday = filters.some(filter => filter.dimension === 'weekday');
    const period = !weekday && periodRows ? this.#period(range, zone) : null;
    if (period !== null) {
      const span = this.#periodRange(table, period);
      const keys = this.#rowKeys(table, dimension, 'periods');
      const filterKeys = filters.map(filter => this.#rowKeys(table, filter.dimension, 'periods'));
      if (span) {
        outer: for (let row = span[0]; row < span[1]; row++) {
          for (let i = 0; i < filters.length; i++) if ((filterKeys[i][row] === filters[i].value) === filters[i].exclude) continue outer;
          add(keys[row], periodRows!, row);
        }
      }
      return {provides: fields, rows};
    }

    const keys = this.#rowKeys(table, dimension, 'daily');
    const days = new Set<number>();
    this.#daily(table, range, filters, zone, (row, start) => {
      days.add(start);
      add(keys[row], daily, row);
    });
    // GA4 users per value add up only within one day or one exported period.
    return {provides: days.size <= 1 ? fields : fields.filter(field => field !== 'visitors'), rows};
  }

  /** GA4 event counts. Only weekday filters apply. */
  events(range: Range, filters: Filter[], zone: Zone): TableOf<EventField> | null {
    if (filters.some(filter => filter.dimension !== 'weekday')) return null;
    const {daily} = this.data.tables.event;
    const names = this.data.strings.event;
    const rows = new Map<string, Partial<Record<EventField, number>>>();
    const days = new Set<number>();
    this.#daily('event', range, filters, zone, (row, start) => {
      days.add(start);
      const name = names[daily.value![row]];
      const entry = rows.get(name) ?? {count: 0, visitors: 0};
      entry.count! += daily.count![row];
      entry.visitors! += daily.visitors![row];
      rows.set(name, entry);
    });
    return {provides: days.size <= 1 ? ['count', 'visitors'] : ['count'], rows};
  }
}
