import {useCallback, useEffect, useMemo, useState} from 'react';
import {BreakdownCard, type Tab} from '@/components/BreakdownCard';
import {EventsCard} from '@/components/EventsCard';
import {FilterBar} from '@/components/FilterBar';
import {HeatmapCard} from '@/components/HeatmapCard';
import {MetricCards} from '@/components/MetricCards';
import {Toolbar} from '@/components/Toolbar';
import {TrafficChart} from '@/components/TrafficChart';
import {DIMENSIONS, type Filter} from '@/lib/analytics';
import {contributes, period, series, type Sources} from '@/lib/combined';
import {allowedUnits, buckets, comparisonRange, floor, resolveRange} from '@/lib/dates';
import {formatRange} from '@/lib/format';
import {parseState, serializeState, type ViewState} from '@/lib/state';

const PAGE_TABS: Tab[] = [
  {dimension: 'path', label: 'Pages', metric: 'views'},
  {dimension: 'entry', label: 'Entry', metric: 'visits'},
  {dimension: 'exit', label: 'Exit', metric: 'visits'},
  {dimension: 'title', label: 'Titles', metric: 'views'},
];
const SOURCE_TABS: Tab[] = [
  {dimension: 'referrer', label: 'Referrers', metric: 'visits'},
  {dimension: 'channel', label: 'Channels', metric: 'visits'},
  {dimension: 'utmSource', label: 'UTM source', metric: 'visits'},
  {dimension: 'utmCampaign', label: 'Campaign', metric: 'visits'},
];
const ENVIRONMENT_TABS: Tab[] = [
  {dimension: 'browser', label: 'Browsers', metric: 'visitors'},
  {dimension: 'os', label: 'OS', metric: 'visitors'},
  {dimension: 'device', label: 'Devices', metric: 'visitors'},
  {dimension: 'screen', label: 'Screens', metric: 'visitors'},
];
const LOCATION_TABS: Tab[] = [
  {dimension: 'country', label: 'Countries', metric: 'visitors'},
  {dimension: 'region', label: 'Regions', metric: 'visitors'},
  {dimension: 'city', label: 'Cities', metric: 'visitors'},
  {dimension: 'language', label: 'Languages', metric: 'visitors'},
];

function useViewState() {
  const [state, setState] = useState<ViewState>(() => parseState(location.search));
  useEffect(() => {
    const onPop = () => setState(parseState(location.search));
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);
  const update = useCallback((next: Partial<ViewState>) => {
    setState(current => {
      const merged = {...current, ...next};
      const search = serializeState(merged);
      if (search !== location.search) history.pushState(null, '', search);
      return merged;
    });
  }, []);
  return [state, update] as const;
}

export function Dashboard({sources}: {sources: Sources}) {
  const [state, update] = useViewState();
  const {zone, filters} = state;
  const {data, baseline} = sources;
  const earliest = baseline ? Math.min(baseline.from, data.from) : data.from;
  const latest = data.through;

  const range = useMemo(() => {
    const resolved = resolveRange(state.range, latest, {from: earliest, through: latest}, zone);
    // GA4 has daily rows only, so hourly buckets would show gaps as zeros.
    const hourly = !baseline || resolved.start >= baseline.through;
    const units = allowedUnits(resolved).filter(unit => hourly || unit !== 'hour');
    if (!units.length) units.push('day');
    const unit = state.unit && units.includes(state.unit) ? state.unit : units.includes(resolved.unit) ? resolved.unit : units[0];
    return {...resolved, unit, units};
  }, [baseline, earliest, latest, state.range, state.unit, zone]);
  const previousRange = useMemo(() => comparisonRange(range, state.range, state.compare, zone), [range, state.range, state.compare, zone]);

  const current = useMemo(() => period(sources, range, filters, zone), [sources, range, filters, zone]);
  const compared = useMemo(() => previousRange ? period(sources, previousRange, filters, zone) : null, [sources, previousRange, filters, zone]);
  // An empty comparison would show "new" on every number, so treat it as none.
  const previous = compared && (compared.selection.length || contributes(compared.baseline)) ? compared : null;

  const starts = useMemo(() => buckets(range, zone), [range, zone]);
  const previousStarts = useMemo(() => previousRange ? buckets(previousRange, zone) : null, [previousRange, zone]);
  const currentSeries = useMemo(() => series(current, starts), [current, starts]);
  const previousSeries = useMemo(() => previous && previousStarts ? series(previous, previousStarts) : null, [previous, previousStarts]);

  // A metric GA4 can't provide would leave the chart empty; show views instead.
  const metric = currentSeries[state.metric].every(value => value === null) ? 'views' : state.metric;

  const addFilter = useCallback((filter: Filter) => {
    const others = filters.filter(item => item.dimension !== filter.dimension);
    update({filters: [...others, filter]});
  }, [filters, update]);

  const through = new Intl.DateTimeFormat('en', {dateStyle: 'medium', timeStyle: 'short', ...(zone === 'utc' ? {timeZone: 'UTC'} : {})}).format(latest);
  const card = {sources, current, previous, onFilter: addFilter};
  const excluded = current.baseline.excludedBy.length ? current.baseline.excludedBy : previous?.baseline.excludedBy ?? [];
  const withBaseline = contributes(current.baseline) || Boolean(previous && contributes(previous.baseline));
  const umamiStart = new Intl.DateTimeFormat('en', {dateStyle: 'medium'}).format(data.from);

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="z-20 grid gap-2 border-b bg-background/95 pt-2 pb-3 backdrop-blur sm:sticky sm:top-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="basis-full text-xl font-semibold tracking-tight sm:basis-auto">Site traffic</h1>
          <Toolbar state={state} range={range} units={range.units} update={update} earliest={earliest} latest={latest} />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <p>
            {formatRange(range, zone)}
            {previousRange && <> · compared with {formatRange(previousRange, zone)}{!previous ? ' (no matching data)' : previousRange.start < floor(earliest, 'day', zone) ? ' (partly before the archive starts)' : ''}</>}
          </p>
          <p>Latest data {through}{zone === 'utc' ? ' UTC' : ''}</p>
        </div>
        <FilterBar filters={filters} onChange={next => update({filters: next})} />
      </div>

      {excluded.length > 0 && (
        <p role="status" className="rounded-lg border border-chart-second/40 bg-chart-second/10 px-4 py-2.5 text-sm">
          GA4 data from before {umamiStart} can't be filtered by {[...new Set(excluded.map(filter => DIMENSIONS[filter.dimension].label.toLowerCase()))].join(' or ')}. These numbers cover Umami data only.
        </p>
      )}

      <MetricCards metrics={current.metrics} previous={previous?.metrics ?? null} selected={metric} onSelect={metric => update({metric})} ga4={withBaseline} notes={current.notes} />

      <TrafficChart
        metric={metric}
        range={range}
        zone={zone}
        starts={starts}
        series={currentSeries[metric]}
        previousStarts={previousStarts}
        previousSeries={previousSeries?.[metric] ?? null}
        ga4={withBaseline}
        onDrill={(from, to) => update({range: {preset: 'custom', offset: 0, from, to}, unit: null})}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownCard title="Pages" tabs={PAGE_TABS} {...card} />
        <BreakdownCard title="Sources" tabs={SOURCE_TABS} {...card} />
        <BreakdownCard title="Environment" tabs={ENVIRONMENT_TABS} {...card} />
        <BreakdownCard title="Location" tabs={LOCATION_TABS} {...card} />
        <HeatmapCard data={data} selection={current.selection} zone={zone} onFilter={addFilter} ga4={current.baseline.present} umamiStart={umamiStart} />
        <EventsCard current={current} />
      </div>

      <div className="grid max-w-3xl gap-2 text-xs leading-relaxed text-muted-foreground">
        <p>
          Select any table row, weekday, or hour to filter the whole report; select a chart bar to zoom in.
          Visitors are distinct Umami sessions, visits are distinct visits, and views are page views. A bounce is a visit
          with a single page view. Visit duration is the time between a visit's first and last page view, averaged over
          visits. Referrers and other visit details come from the first page view. Relative ranges end at the latest
          archived data, which arrives from monthly Umami Cloud exports. Umami data updated {new Date(data.report.generatedAt).toLocaleDateString('en', {dateStyle: 'medium'})}.
        </p>
        {baseline && (
          <p>
            Before {umamiStart}, numbers come from GA4 ({baseline.data.coverage.daily?.from} to {baseline.data.lastDay}), exported once
            as daily, weekly, monthly and yearly reports. GA4 counts users and sessions separately in each period, so visitors
            appear when the GA4 part of a range is a whole GA4 day, ISO week, month, year, or the whole export. Other ranges
            show views, visits, bounce rate and duration from daily sums. GA4 bounces are sessions without engagement, and GA4
            and Umami visitors are added together. Hours, browsers, devices and locations are Umami-only. Page rows start on
            2022-08-15.
          </p>
        )}
      </div>
    </div>
  );
}
