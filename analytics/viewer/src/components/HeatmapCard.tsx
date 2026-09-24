import {useMemo, useState} from 'react';
import {InfoTip} from '@/components/InfoTip';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group';
import type {Dataset, Filter} from '@/lib/analytics';
import type {Zone} from '@/lib/dates';
import {formatNumber} from '@/lib/format';
import {hourName, WEEKDAYS} from '@/lib/labels';

interface Props {
  data: Dataset;
  selection: Int32Array;
  zone: Zone;
  onFilter: (filter: Filter) => void;
  /** GA4 days are in range; they have no hours, so they're not shown here. */
  ga4: boolean;
  umamiStart: string;
}

const HOURS = Array.from({length: 24}, (_, hour) => hour);

export function HeatmapCard({data, selection, zone, onFilter, ga4, umamiStart}: Props) {
  const [metric, setMetric] = useState<'visitors' | 'views'>('visitors');
  const cells = useMemo(() => data.heatmap(selection, zone), [data, selection, zone]);
  const max = Math.max(1, ...cells.flat().map(cell => cell[metric]));
  const peak = cells.flatMap((row, day) => row.map((cell, hour) => ({day, hour, value: cell[metric]})))
    .reduce((best, cell) => (cell.value > best.value ? cell : best), {day: 0, hour: 0, value: 0});

  return (
    <Card className="min-w-0 gap-3 py-5">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 px-5">
        <div className="grid gap-1">
          <div className="flex items-center gap-1.5">
            <CardTitle className="text-base">Traffic by weekday and hour</CardTitle>
            {ga4 && <InfoTip label="About this heatmap">Hourly data starts {umamiStart}. GA4 days have no hours, so they are not included.</InfoTip>}
          </div>
          <CardDescription className="text-xs">
            {peak.value ? `Busiest: ${WEEKDAYS[peak.day]} ${hourName(peak.hour)} (${zone === 'utc' ? 'UTC' : 'local time'})` : 'No hourly traffic in this range.'}
          </CardDescription>
        </div>
        <ToggleGroup type="single" size="sm" value={metric} onValueChange={value => value && setMetric(value as typeof metric)} aria-label="Heatmap metric">
          <ToggleGroupItem value="visitors" className="h-7 px-2 text-xs">Visitors</ToggleGroupItem>
          <ToggleGroupItem value="views" className="h-7 px-2 text-xs">Views</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="relative min-w-0 overflow-x-auto px-5">
        <table className="w-full min-w-[460px] border-separate border-spacing-[3px] text-[11px] text-muted-foreground">
          <caption className="sr-only">{metric === 'visitors' ? 'Visitors' : 'Views'} by weekday and hour. Select a weekday or hour to filter.</caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Weekday</span></th>
              {HOURS.map(hour => (
                <th key={hour} scope="col" className="p-0 font-normal">
                  <button
                    type="button"
                    onClick={() => onFilter({dimension: 'hour', value: String(hour), exclude: false})}
                    className="w-full rounded-sm py-0.5 tabular-nums hover:bg-accent hover:text-foreground"
                    aria-label={`Filter by hour ${hourName(hour)}`}
                  >
                    {hour % 3 === 0 ? String(hour).padStart(2, '0') : <span className="opacity-0">{hour}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, day) => (
              <tr key={day}>
                <th scope="row" className="w-10 p-0 pr-1 text-left font-normal">
                  <button
                    type="button"
                    onClick={() => onFilter({dimension: 'weekday', value: String(day), exclude: false})}
                    className="w-full rounded-sm px-1 py-0.5 text-left hover:bg-accent hover:text-foreground"
                    aria-label={`Filter by ${WEEKDAYS[day]}`}
                  >
                    {WEEKDAYS[day].slice(0, 3)}
                  </button>
                </th>
                {row.map((cell, hour) => (
                  <td
                    key={hour}
                    className="heat-cell h-5 rounded-[3px] p-0"
                    style={{'--level': cell[metric] ? 0.15 + 0.85 * (cell[metric] / max) : 0} as React.CSSProperties}
                    title={`${WEEKDAYS[day]} ${hourName(hour)}: ${formatNumber(cell.visitors)} visitors, ${formatNumber(cell.views)} views`}
                  >
                    <span className="sr-only">{formatNumber(cell[metric])}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
