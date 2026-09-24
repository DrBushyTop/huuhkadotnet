// View state lives in the query string so any view can be bookmarked and
// the browser's back button walks through the exploration.

import {DIMENSIONS, type Dimension, type Filter, type MetricKey} from './analytics.ts';
import type {CompareMode, Preset, RangeSpec, Unit, Zone} from './dates.ts';

export interface ViewState {
  range: RangeSpec;
  compare: CompareMode;
  /** null picks the default unit for the range. */
  unit: Unit | null;
  zone: Zone;
  metric: MetricKey;
  filters: Filter[];
}

const presets: Preset[] = ['24h', 'today', '7d', 'week', '30d', 'month', '90d', '6m', '12m', 'year', 'all', 'custom'];
const compares: CompareMode[] = ['none', 'previous', 'year'];
const units: Unit[] = ['hour', 'day', 'week', 'month'];
const metrics: MetricKey[] = ['visitors', 'visits', 'views', 'bounceRate', 'duration'];
const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? value as T : fallback;

export const DEFAULT_STATE: ViewState = {
  range: {preset: '30d', offset: 0},
  compare: 'previous',
  unit: null,
  zone: 'local',
  metric: 'visitors',
  filters: [],
};

export function parseState(search: string): ViewState {
  const params = new URLSearchParams(search);
  const date = (value: string | null) => (value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined);
  const offset = Number.parseInt(params.get('offset') ?? '0', 10);
  const filters: Filter[] = [];
  for (const raw of params.getAll('f')) {
    const exclude = raw.startsWith('!');
    const body = exclude ? raw.slice(1) : raw;
    const split = body.indexOf(':');
    const dimension = body.slice(0, split) as Dimension;
    if (split > 0 && dimension in DIMENSIONS) filters.push({dimension, value: body.slice(split + 1), exclude});
  }
  return {
    range: {
      preset: pick(params.get('range'), presets, DEFAULT_STATE.range.preset),
      offset: Number.isFinite(offset) && offset <= 0 ? offset : 0,
      from: date(params.get('from')),
      to: date(params.get('to')),
    },
    compare: pick(params.get('compare'), compares, DEFAULT_STATE.compare),
    unit: params.has('unit') ? pick(params.get('unit'), units, 'day') : null,
    zone: pick(params.get('tz'), ['local', 'utc'] as const, 'local'),
    metric: pick(params.get('metric'), metrics, DEFAULT_STATE.metric),
    filters,
  };
}

export function serializeState(state: ViewState): string {
  const params = new URLSearchParams();
  params.set('range', state.range.preset);
  if (state.range.offset) params.set('offset', String(state.range.offset));
  if (state.range.preset === 'custom') {
    if (state.range.from) params.set('from', state.range.from);
    if (state.range.to) params.set('to', state.range.to);
  }
  if (state.compare !== DEFAULT_STATE.compare) params.set('compare', state.compare);
  if (state.unit) params.set('unit', state.unit);
  if (state.zone !== 'local') params.set('tz', state.zone);
  if (state.metric !== DEFAULT_STATE.metric) params.set('metric', state.metric);
  for (const filter of state.filters) params.append('f', `${filter.exclude ? '!' : ''}${filter.dimension}:${filter.value}`);
  return `?${params}`;
}
