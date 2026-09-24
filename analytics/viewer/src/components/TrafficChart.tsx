import {useState} from 'react';
import {Area, Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis} from 'recharts';
import {ChangeBadge} from '@/components/ChangeBadge';
import {METRIC_LABELS} from '@/components/MetricCards';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {ChartContainer, ChartTooltip, type ChartConfig} from '@/components/ui/chart';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group';
import type {MetricKey} from '@/lib/analytics';
import type {Value} from '@/lib/combined';
import {add, toDateInput, type Range, type Zone} from '@/lib/dates';
import {formatBucket, formatCompact, formatDuration, formatMetric, formatPercent} from '@/lib/format';

interface Props {
  metric: MetricKey;
  range: Range;
  zone: Zone;
  starts: number[];
  series: Value[];
  previousStarts: number[] | null;
  previousSeries: Value[] | null;
  /** GA4 days are in range; some metrics have gaps there. */
  ga4: boolean;
  onDrill: (from: string, to: string) => void;
}

interface Point {
  t: number;
  current: Value;
  previous?: Value;
  previousT?: number;
}

const config = {
  current: {label: 'This period'},
  previous: {label: 'Comparison'},
} satisfies ChartConfig;

const axisValue = (metric: MetricKey, value: number) =>
  metric === 'bounceRate' ? formatPercent(value) : metric === 'duration' ? formatDuration(value) : formatCompact(value);

export function TrafficChart({metric, range, zone, starts, series, previousStarts, previousSeries, ga4, onDrill}: Props) {
  const [kind, setKind] = useState<'bar' | 'line'>('bar');
  const points: Point[] = starts.map((t, i) => ({
    t,
    current: series[i] ?? null,
    previous: previousSeries ? previousSeries[i] ?? null : undefined,
    previousT: previousStarts?.[i],
  }));
  const drillable = range.unit !== 'hour';
  const label = METRIC_LABELS[metric];

  function drill(index: number) {
    const t = starts[index];
    if (t === undefined || !drillable) return;
    const end = add(t, range.unit, 1, zone) - 1;
    onDrill(toDateInput(t, zone), toDateInput(end, zone));
  }

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex items-start justify-between gap-3 px-5">
        <div className="grid min-w-0 gap-1">
          <CardTitle>{label} by {range.unit}</CardTitle>
          {(previousSeries || (ga4 && series.some(value => value === null))) && (
            <CardDescription>
              {previousSeries && (kind === 'bar' ? 'Grey bars show the comparison period.' : 'The dashed line shows the comparison period.')}
              {ga4 && series.some(value => value === null) && ` Gaps: GA4 can't provide ${label.toLowerCase()} for those periods.`}
            </CardDescription>
          )}
        </div>
        <ToggleGroup className="shrink-0" type="single" variant="outline" size="sm" value={kind} onValueChange={value => value && setKind(value as 'bar' | 'line')} aria-label="Chart style">
          <ToggleGroupItem value="bar">Bars</ToggleGroupItem>
          <ToggleGroupItem value="line">Line</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ChartContainer config={config} className="aspect-auto h-[260px] w-full sm:h-[280px]">
          <ComposedChart
            key={`${range.start}:${range.end}:${range.unit}:${zone}`}
            data={points}
            margin={{top: 8, right: 8, left: 0, bottom: 0}}
            onClick={state => {
              const index = Number(state?.activeTooltipIndex);
              if (Number.isInteger(index)) drill(index);
            }}
            className={drillable ? '[&_.recharts-surface]:cursor-pointer' : undefined}
            accessibilityLayer
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={value => formatBucket(Number(value), range.unit, zone)}
            />
            <YAxis
              width={metric === 'duration' ? 58 : 42}
              tickLine={false}
              axisLine={false}
              allowDecimals={metric === 'bounceRate'}
              tickFormatter={value => axisValue(metric, Number(value))}
            />
            <ChartTooltip cursor={kind === 'bar' ? {fill: 'var(--muted)', opacity: 0.6} : true} content={<PointTooltip metric={metric} unit={range.unit} zone={zone} />} />
            {kind === 'bar' ? (
              <>
                {previousSeries && <Bar dataKey="previous" fill="var(--color-previous)" fillOpacity={0.45} radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false} />}
                <Bar dataKey="current" fill="var(--color-current)" radius={[3, 3, 0, 0]} maxBarSize={previousSeries ? 32 : 48} isAnimationActive={false} />
              </>
            ) : (
              <>
                <Area dataKey="current" type="monotone" stroke="var(--color-current)" strokeWidth={2} fill="var(--color-current)" fillOpacity={0.12} dot={false} isAnimationActive={false} />
                {previousSeries && <Line dataKey="previous" type="monotone" stroke="var(--color-previous)" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />}
              </>
            )}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: {payload: Point}[];
  metric: MetricKey;
  unit: Range['unit'];
  zone: Zone;
}

function PointTooltip({active, payload, metric, unit, zone}: TooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="grid min-w-44 gap-1.5 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-chart-current" aria-hidden="true" />
          {formatBucket(point.t, unit, zone, true)}
        </span>
        <span className="font-mono font-medium tabular-nums">{formatMetric(metric, point.current)}</span>
      </div>
      {point.previous !== undefined && point.previousT !== undefined && (
        <>
          <div className="flex items-center justify-between gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] bg-chart-previous" aria-hidden="true" />
              {formatBucket(point.previousT, unit, zone, true)}
            </span>
            <span className="font-mono tabular-nums">{formatMetric(metric, point.previous)}</span>
          </div>
          {point.current !== null && point.previous !== null && (
            <ChangeBadge current={point.current} previous={point.previous} inverse={metric === 'bounceRate'} className="justify-self-end" />
          )}
        </>
      )}
    </div>
  );
}
