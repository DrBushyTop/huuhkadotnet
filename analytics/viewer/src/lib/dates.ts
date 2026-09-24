// Date ranges and time buckets. All timestamps are epoch milliseconds.
// `zone` picks between the browser's local time and UTC for calendar maths.

export type Zone = 'local' | 'utc';
export type Unit = 'hour' | 'day' | 'week' | 'month';
export type Preset = '24h' | 'today' | '7d' | 'week' | '30d' | 'month' | '90d' | '6m' | '12m' | 'year' | 'all' | 'custom';
export type CompareMode = 'none' | 'previous' | 'year';

export interface RangeSpec {
  preset: Preset;
  /** Periods shifted back (negative) or forward from the anchor. */
  offset: number;
  /** Custom range bounds as YYYY-MM-DD, inclusive. */
  from?: string;
  to?: string;
}

export interface Range {
  start: number;
  /** Exclusive end. */
  end: number;
  unit: Unit;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

interface Parts { y: number; m: number; d: number; h: number; dow: number }

export function parts(ms: number, zone: Zone): Parts {
  const date = new Date(ms);
  return zone === 'utc'
    ? {y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate(), h: date.getUTCHours(), dow: (date.getUTCDay() + 6) % 7}
    : {y: date.getFullYear(), m: date.getMonth(), d: date.getDate(), h: date.getHours(), dow: (date.getDay() + 6) % 7};
}

export function make(zone: Zone, y: number, m: number, d = 1, h = 0): number {
  return zone === 'utc' ? Date.UTC(y, m, d, h) : new Date(y, m, d, h).getTime();
}

export function floor(ms: number, unit: Unit, zone: Zone): number {
  const p = parts(ms, zone);
  switch (unit) {
    case 'hour': return make(zone, p.y, p.m, p.d, p.h);
    case 'day': return make(zone, p.y, p.m, p.d);
    case 'week': return make(zone, p.y, p.m, p.d - p.dow);
    case 'month': return make(zone, p.y, p.m);
  }
}

export function add(ms: number, unit: Unit, count: number, zone: Zone): number {
  const p = parts(ms, zone);
  switch (unit) {
    case 'hour': return ms + count * HOUR;
    case 'day': return make(zone, p.y, p.m, p.d + count, p.h);
    case 'week': return make(zone, p.y, p.m, p.d + count * 7, p.h);
    case 'month': return make(zone, p.y, p.m + count, p.d, p.h);
  }
}

/** Bucket starts covering [start, end). */
export function buckets(range: Range, zone: Zone): number[] {
  const result: number[] = [];
  for (let at = floor(range.start, range.unit, zone); at < range.end && result.length < 2000; at = add(at, range.unit, 1, zone)) result.push(at);
  return result;
}

export function allowedUnits(range: Range): Unit[] {
  const span = range.end - range.start;
  const units: Unit[] = [];
  if (span <= 14 * DAY) units.push('hour');
  if (span <= 400 * DAY) units.push('day');
  if (span >= 14 * DAY && span <= 800 * DAY) units.push('week');
  if (span >= 45 * DAY) units.push('month');
  return units;
}

export function defaultUnit(start: number, end: number): Unit {
  const span = end - start;
  if (span <= 2 * DAY) return 'hour';
  if (span <= 100 * DAY) return 'day';
  if (span <= 190 * DAY) return 'week';
  return 'month';
}

const dateInput = (value: string | undefined, zone: Zone): number | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? make(zone, Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

export function toDateInput(ms: number, zone: Zone): string {
  const p = parts(ms, zone);
  return `${p.y}-${String(p.m + 1).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/**
 * Resolves a preset against `anchor`, the latest moment with data. Relative
 * ranges end at the anchor rather than the wall clock, because exports arrive
 * monthly and "last 7 days" of the clock would usually be empty.
 */
export function resolveRange(spec: RangeSpec, anchor: number, coverage: {from: number; through: number}, zone: Zone): Range {
  const n = spec.offset;
  const today = floor(anchor, 'day', zone);
  const month = floor(anchor, 'month', zone);
  const p = parts(anchor, zone);
  const days = (count: number) => {
    const end = add(today, 'day', 1 + n * count, zone);
    return span(add(end, 'day', -count, zone), end);
  };
  const months = (count: number) => {
    const end = add(month, 'month', 1 + n * count, zone);
    return span(add(end, 'month', -count, zone), end);
  };
  function span(start: number, end: number): Range {
    return {start, end, unit: defaultUnit(start, end)};
  }
  switch (spec.preset) {
    case '24h': {
      const end = floor(anchor, 'hour', zone) + HOUR + n * DAY;
      return {start: end - DAY, end, unit: 'hour'};
    }
    case 'today': return days(1);
    case '7d': return days(7);
    case '30d': return days(30);
    case '90d': return days(90);
    case 'week': {
      const start = add(floor(anchor, 'week', zone), 'week', n, zone);
      return span(start, add(start, 'week', 1, zone));
    }
    case 'month': return months(1);
    case '6m': return months(6);
    case '12m': return months(12);
    case 'year': {
      const start = make(zone, p.y + n, 0);
      return span(start, make(zone, p.y + n + 1, 0));
    }
    case 'custom': {
      const from = dateInput(spec.from, zone) ?? today;
      const toStart = dateInput(spec.to, zone) ?? from;
      const [a, b] = from <= toStart ? [from, toStart] : [toStart, from];
      const length = Math.round((add(b, 'day', 1, zone) - a) / DAY);
      return span(add(a, 'day', n * length, zone), add(b, 'day', 1 + n * length, zone));
    }
    case 'all':
    default:
      return span(floor(coverage.from, 'day', zone), add(floor(coverage.through, 'day', zone), 'day', 1, zone));
  }
}

export const canShift = (preset: Preset) => preset !== 'all';

/** Range to compare against, with the same bucket unit so buckets line up. */
export function comparisonRange(range: Range, spec: RangeSpec, mode: CompareMode, zone: Zone): Range | null {
  if (mode === 'none') return null;
  if (mode === 'year') {
    return {start: add(range.start, 'month', -12, zone), end: add(range.end, 'month', -12, zone), unit: range.unit};
  }
  const monthly = ['month', '6m', '12m', 'year'].includes(spec.preset);
  if (monthly) {
    const count = spec.preset === 'month' ? 1 : spec.preset === '6m' ? 6 : 12;
    return {start: add(range.start, 'month', -count, zone), end: range.start, unit: range.unit};
  }
  if (spec.preset === '24h') return {start: range.start - DAY, end: range.start, unit: range.unit};
  const length = Math.round((range.end - range.start) / DAY);
  return {start: add(range.start, 'day', -length, zone), end: range.start, unit: range.unit};
}
