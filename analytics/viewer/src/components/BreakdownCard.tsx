import {useMemo, useState} from 'react';
import {ArrowUpRight, Search} from 'lucide-react';
import {ChangeBadge} from '@/components/ChangeBadge';
import {InfoTip} from '@/components/InfoTip';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group';
import {DIMENSIONS, type CountKey, type Dimension, type Filter} from '@/lib/analytics';
import {breakdown, type BreakdownRow, type Period, type Sources} from '@/lib/combined';
import {formatNumber, formatPercent} from '@/lib/format';

export interface Tab {
  dimension: Dimension;
  label: string;
  metric: CountKey;
}

interface Props {
  title: string;
  tabs: Tab[];
  sources: Sources;
  current: Period;
  previous: Period | null;
  onFilter: (filter: Filter) => void;
}

const COUNT_LABELS: Record<CountKey, string> = {visitors: 'Visitors', visits: 'Visits', views: 'Views'};
const COLLAPSED = 8;
const SITE = 'https://www.huuhka.net';
const PAGE_DIMENSIONS = new Set<Dimension>(['path', 'entry', 'exit']);

export function BreakdownCard({title, tabs, sources, current, previous: previousPeriod, onFilter}: Props) {
  const [active, setActive] = useState(tabs[0].dimension);
  const [metrics, setMetrics] = useState<Partial<Record<Dimension, CountKey>>>({});
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const tab = tabs.find(item => item.dimension === active) ?? tabs[0];
  const info = DIMENSIONS[tab.dimension];

  const result = useMemo(() => breakdown(current, tab.dimension), [current, tab.dimension]);
  const previousResult = useMemo(() => previousPeriod ? breakdown(previousPeriod, tab.dimension) : null, [previousPeriod, tab.dimension]);
  // Only metrics every contributing source provides for this dimension stay selectable.
  const available: CountKey[] = result.available;
  const chosen = metrics[tab.dimension] ?? tab.metric;
  const metric = available.includes(chosen) ? chosen : available[0];
  const rows = result.rows;
  const previous = useMemo(() => previousResult ? new Map(previousResult.rows.map(row => [row.value, row])) : null, [previousResult]);
  const rowTotal = rows.reduce((sum, row) => sum + (row[metric] ?? 0), 0);
  // Shares are of the whole period, unless some source lacks this breakdown.
  const total = result.partial ? rowTotal : current.metrics[metric] ?? rowTotal;
  const umamiStart = new Intl.DateTimeFormat('en', {dateStyle: 'medium'}).format(sources.data.from);
  const withGa4 = current.contributors.length > 1;
  const note = !withGa4 ? null : result.partial
    ? `GA4 data has no ${info.label.toLowerCase()} breakdown. Showing Umami data from ${umamiStart}.`
    : `Includes GA4 ${result.available.join(' and ')} from before ${umamiStart}.`;

  const sorted = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .filter(row => !needle || info.format(row.value).toLowerCase().includes(needle) || row.value.toLowerCase().includes(needle))
      .sort((a, b) => (b[metric] ?? -1) - (a[metric] ?? -1) || info.format(a.value).localeCompare(info.format(b.value)));
  }, [rows, metric, query, info]);
  const shown = expanded ? sorted.slice(0, 300) : sorted.slice(0, COLLAPSED);
  const max = sorted[0]?.[metric] ?? 0;

  return (
    <Card className="min-w-0 gap-3 py-5">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {note && <InfoTip label={`About ${title.toLowerCase()}`}>{note}</InfoTip>}
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={metric}
          onValueChange={value => value && setMetrics(current => ({...current, [tab.dimension]: value as CountKey}))}
          aria-label={`${title} metric`}
        >
          {(Object.keys(COUNT_LABELS) as CountKey[]).map(key => (
            <ToggleGroupItem key={key} value={key} disabled={!available.includes(key)} className="h-7 px-2 text-xs">{COUNT_LABELS[key]}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent className="grid min-w-0 grid-cols-1 gap-3 px-5">
        <Tabs value={tab.dimension} onValueChange={value => { setActive(value as Dimension); setQuery(''); }}>
          <TabsList variant="line" className="h-8 w-full justify-start overflow-x-auto border-b">
            {tabs.map(item => (
              <TabsTrigger key={item.dimension} value={item.dimension} className="flex-none px-2 text-[13px]">{item.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {expanded && (
          <label className="relative">
            <span className="sr-only">Search {tab.label.toLowerCase()}</span>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${tab.label.toLowerCase()}`} className="h-8 pl-8" />
          </label>
        )}

        <div className="flex items-center justify-between gap-3 px-2 text-[11px] font-medium text-muted-foreground">
          <span>{info.label}</span>
          <span className="flex gap-3">
            {previous && <span className="w-12 text-right">Change</span>}
            <span className="w-14 text-right">{COUNT_LABELS[metric]}</span>
            <span className="w-9 text-right">Share</span>
            {PAGE_DIMENSIONS.has(tab.dimension) && <span className="-ml-2 w-7" aria-hidden="true" />}
          </span>
        </div>

        {shown.length ? (
          <ul className={expanded ? 'grid max-h-[480px] grid-cols-1 gap-0.5 overflow-y-auto pr-1' : 'grid grid-cols-1 gap-0.5'}>
            {shown.map(row => (
              <BreakdownRow
                key={row.value}
                row={row}
                metric={metric}
                label={info.format(row.value)}
                share={total ? (row[metric] ?? 0) / total : 0}
                scale={max ? (row[metric] ?? 0) / max : 0}
                previous={previous ? (previous.get(row.value)?.[metric] ?? 0) : null}
                link={PAGE_DIMENSIONS.has(tab.dimension) && /^\/(?!\/)/.test(row.value) ? new URL(row.value, SITE).href : null}
                onSelect={() => onFilter({dimension: tab.dimension, value: row.value, exclude: false})}
                filterLabel={`Filter by ${info.label.toLowerCase()} ${info.format(row.value)}`}
              />
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">{query ? 'No matches.' : 'No data in this range.'}</p>
        )}

        {sorted.length > COLLAPSED && (
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => { setExpanded(!expanded); setQuery(''); }}>
            {expanded ? 'Show fewer' : `Show all ${formatNumber(sorted.length)}`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface RowProps {
  row: BreakdownRow;
  metric: CountKey;
  label: string;
  share: number;
  scale: number;
  previous: number | null;
  link: string | null;
  onSelect: () => void;
  filterLabel: string;
}

function BreakdownRow({row, metric, label, share, scale, previous, link, onSelect, filterLabel}: RowProps) {
  return (
    <li className="group relative flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${filterLabel}: ${formatNumber(row[metric] ?? 0)}`}
        className="relative flex min-h-8 min-w-0 flex-1 items-center justify-between gap-3 overflow-hidden rounded-md px-2 text-left text-[13px] hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className="share-bar absolute inset-y-0.5 left-0 w-full rounded-sm bg-primary/12"
          style={{'--share': scale} as React.CSSProperties}
        />
        <span className="relative truncate" title={label}>{label}</span>
        <span className="relative flex shrink-0 items-center gap-3 tabular-nums">
          {previous !== null && <ChangeBadge current={row[metric] ?? 0} previous={previous} className="w-12 justify-end" />}
          <span className="w-14 text-right font-medium">{formatNumber(row[metric] ?? 0)}</span>
          <span className="w-9 text-right text-xs text-muted-foreground">{formatPercent(share)}</span>
        </span>
      </button>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground opacity-60 hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Open ${row.value} on huuhka.net`}
        >
          <ArrowUpRight className="size-3.5" />
        </a>
      )}
    </li>
  );
}
