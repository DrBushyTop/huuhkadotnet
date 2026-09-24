// Combines data sources behind one shape. Each source is a contributor that
// answers the same questions for any range and filters: additive counts,
// breakdown rows, and event rows, with null where it cannot answer. Combining
// is a field-wise sum; a field is available only if every contributor has it.
//
// Umami answers everything from event rows. The GA4 baseline answers from its
// daily and period aggregates (see baseline.ts). The owner confirmed the two
// providers' visitors don't overlap, so their visitors add up.

import type {Dataset, Dimension, Filter, MetricKey} from './analytics.ts';
import type {BaselineData} from './baseline.ts';
import type {Range, Zone} from './dates.ts';

export type Value = number | null;
export type DisplayMetrics = Record<MetricKey, Value>;

/** Additive counts. `sessions` is what bounces and duration are measured over. */
export interface Counts {
  views: Value;
  visits: Value;
  visitors: Value;
  bounces: Value;
  duration: Value;
  sessions: Value;
}

/** Rows keyed by dimension value, with the fields this source can provide. */
export interface Table<F extends string> {
  provides: F[];
  rows: Map<string, Partial<Record<F, number>>>;
}

export type RowField = 'views' | 'visits' | 'visitors';
export type EventField = 'count' | 'visitors';

export interface Contributor {
  name: 'umami' | 'ga4';
  counts(range: Range): Counts;
  /** Null when the source has no data for this dimension. */
  rows(dimension: Dimension, range: Range): Table<RowField> | null;
  events(range: Range): Table<EventField> | null;
}

export interface Sources {
  data: Dataset;
  baseline: BaselineData | null;
}

export interface BaselineState {
  /** GA4 has days in this range. */
  present: boolean;
  /** Filters GA4 can't answer; when non-empty, GA4 is left out entirely. */
  excludedBy: Filter[];
}

export interface Period {
  range: Range;
  selection: Int32Array;
  contributors: Contributor[];
  metrics: DisplayMetrics;
  /** Short caveats shown under a metric. */
  notes: Partial<Record<MetricKey, string>>;
  baseline: BaselineState;
}

function umami(data: Dataset, filters: Filter[], zone: Zone): Contributor {
  return {
    name: 'umami',
    counts(range) {
      const m = data.metrics(data.select(range, filters, zone));
      return {views: m.views, visits: m.visits, visitors: m.visitors, bounces: m.bounces, duration: m.totaltime, sessions: m.visits};
    },
    rows(dimension, range) {
      const rows = data.breakdown(data.select(range, filters, zone), dimension, zone);
      return {provides: ['views', 'visits', 'visitors'], rows: new Map(rows.map(({value, ...counts}) => [value, counts]))};
    },
    events(range) {
      const rows = data.events(range, filters, zone);
      return {provides: ['count', 'visitors'], rows: new Map(rows.map(({value, ...counts}) => [value, counts]))};
    },
  };
}

function ga4(baseline: BaselineData, filters: Filter[], zone: Zone): Contributor {
  return {
    name: 'ga4',
    counts: range => baseline.counts(range, filters, zone),
    rows: (dimension, range) => baseline.rows(dimension, range, filters, zone),
    events: range => baseline.events(range, filters, zone),
  };
}

export function baselineState({baseline}: Sources, range: Range, filters: Filter[], zone: Zone): BaselineState {
  const present = Boolean(baseline?.present(range, filters, zone));
  return {present, excludedBy: present ? baseline!.unsupported(filters) : []};
}

/** True when GA4 contributes numbers to this range. */
export const contributes = (state: BaselineState) => state.present && !state.excludedBy.length;

/** Field-wise sum; null if any contributor can't provide the field. */
export function sum(parts: Counts[]): Counts {
  const total = {views: 0, visits: 0, visitors: 0, bounces: 0, duration: 0, sessions: 0} as Counts;
  for (const key of Object.keys(total) as (keyof Counts)[]) {
    total[key] = parts.some(part => part[key] === null) ? null : parts.reduce((acc, part) => acc + part[key]!, 0);
  }
  return total;
}

export function display(counts: Counts): DisplayMetrics {
  const {sessions, bounces, duration} = counts;
  return {
    views: counts.views,
    visits: counts.visits,
    visitors: counts.visitors,
    bounceRate: sessions && bounces !== null ? Math.min(sessions, bounces) / sessions : sessions === 0 ? 0 : null,
    duration: sessions && duration !== null ? duration / sessions : sessions === 0 ? 0 : null,
  };
}

/** Merges tables. Rows missing from a table count as zero there. */
function merge<F extends string>(tables: Table<F>[], fields: F[]): {rows: Array<{value: string} & Record<F, Value>>; available: F[]} {
  const available = fields.filter(field => tables.every(table => table.provides.includes(field)));
  const rows = new Map<string, {value: string} & Record<F, Value>>();
  for (const table of tables) {
    for (const [value, counts] of table.rows) {
      let row = rows.get(value);
      if (!row) {
        row = {value, ...Object.fromEntries(fields.map(field => [field, available.includes(field) ? 0 : null]))} as {value: string} & Record<F, Value>;
        rows.set(value, row);
      }
      for (const field of available) (row as Record<F, Value>)[field] = (row[field] ?? 0) + (counts[field] ?? 0);
    }
  }
  return {rows: [...rows.values()], available};
}

export function period(sources: Sources, range: Range, filters: Filter[], zone: Zone): Period {
  const {data, baseline} = sources;
  const state = baselineState(sources, range, filters, zone);
  const contributors = [umami(data, filters, zone)];
  if (baseline && contributes(state)) contributors.push(ga4(baseline, filters, zone));
  const metrics = display(sum(contributors.map(contributor => contributor.counts(range))));
  const notes: Partial<Record<MetricKey, string>> = {};
  if (contributors.length > 1) {
    if (metrics.bounceRate !== null) notes.bounceRate = 'Includes GA4 days, where a bounce is a session without engagement rather than a single-page visit.';
    if (metrics.duration !== null) notes.duration = 'Includes GA4 days, which use GA4\'s average session duration.';
  }
  return {range, selection: data.select(range, filters, zone), contributors, metrics, notes, baseline: state};
}

/** Per-bucket display values for every metric, answered exactly like whole periods. */
export function series(current: Period, starts: number[]): Record<MetricKey, Value[]> {
  const result: Record<MetricKey, Value[]> = {visitors: [], visits: [], views: [], bounceRate: [], duration: []};
  starts.forEach((start, i) => {
    const bucket = {start: Math.max(start, current.range.start), end: Math.min(starts[i + 1] ?? current.range.end, current.range.end), unit: current.range.unit};
    const values = display(sum(current.contributors.map(contributor => contributor.counts(bucket))));
    for (const key of Object.keys(result) as MetricKey[]) result[key].push(values[key]);
  });
  return result;
}

export type BreakdownRow = {value: string} & Record<RowField, Value>;

export interface Breakdown {
  rows: BreakdownRow[];
  /** Fields every contributing source provides for this dimension. */
  available: RowField[];
  /** Some contributing source has no data for this dimension, so rows cover the others only. */
  partial: boolean;
}

export function breakdown(current: Period, dimension: Dimension): Breakdown {
  const tables = current.contributors.map(contributor => contributor.rows(dimension, current.range));
  const present = tables.filter((table): table is Table<RowField> => table !== null);
  return {...merge(present, ['views', 'visits', 'visitors']), partial: present.length < tables.length};
}

export type EventRow = {value: string} & Record<EventField, Value>;

export function events(current: Period): {rows: EventRow[]; mixed: boolean} {
  const tables = current.contributors.map(contributor => contributor.events(current.range)).filter((table): table is Table<EventField> => table !== null);
  const nonEmpty = tables.filter(table => table.rows.size);
  const {rows} = merge(nonEmpty.length ? nonEmpty : tables, ['count', 'visitors']);
  return {rows: rows.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)), mixed: nonEmpty.length > 1 || nonEmpty.some(table => !table.provides.includes('visitors'))};
}
