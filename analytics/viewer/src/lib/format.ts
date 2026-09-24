import type {Range, Unit, Zone} from './dates.ts';
import type {MetricKey} from './analytics.ts';

const integer = new Intl.NumberFormat('en');
const compact = new Intl.NumberFormat('en', {notation: 'compact', maximumFractionDigits: 1});
const percent = new Intl.NumberFormat('en', {style: 'percent', maximumFractionDigits: 0});
const signedPercent = new Intl.NumberFormat('en', {style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero'});

export const formatNumber = (value: number) => integer.format(Math.round(value));
export const formatCompact = (value: number) => value < 10_000 ? integer.format(Math.round(value)) : compact.format(value);
export const formatPercent = (value: number) => percent.format(value);
export const formatChange = (value: number) => signedPercent.format(value);

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds);
  if (total < 60) return `${total}s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}h ${m}m` : `${m}m ${s}s`;
}

export function formatMetric(key: MetricKey, value: number | null): string {
  if (value === null) return '—';
  if (key === 'bounceRate') return formatPercent(value);
  if (key === 'duration') return formatDuration(value);
  return formatNumber(value);
}

const tz = (zone: Zone) => (zone === 'utc' ? {timeZone: 'UTC'} : {});

export function formatBucket(ms: number, unit: Unit, zone: Zone, long = false): string {
  const options: Intl.DateTimeFormatOptions = {...tz(zone)};
  if (unit === 'hour') Object.assign(options, long ? {weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'} : {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  else if (unit === 'month') Object.assign(options, {month: 'short', year: 'numeric'});
  else Object.assign(options, long ? {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'} : {month: 'short', day: 'numeric'});
  const text = new Intl.DateTimeFormat('en', options).format(ms);
  return unit === 'week' && long ? `Week of ${text}` : text;
}

export function formatRange(range: Range, zone: Zone): string {
  const last = range.end - 1;
  const sameDay = new Intl.DateTimeFormat('en', {...tz(zone), dateStyle: 'medium'});
  if (range.end - range.start <= 86_400_000 && range.unit === 'hour') {
    const time = new Intl.DateTimeFormat('en', {...tz(zone), month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
    const start = sameDay.format(range.start);
    return start === sameDay.format(last) ? start : `${time.format(range.start)} – ${time.format(range.end)}`;
  }
  return sameDay.formatRange(range.start, last);
}
