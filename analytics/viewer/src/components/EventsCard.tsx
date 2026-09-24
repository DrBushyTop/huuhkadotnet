import {useMemo} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {events, type Period} from '@/lib/combined';
import {formatNumber} from '@/lib/format';

export function EventsCard({current}: {current: Period}) {
  const {rows, mixed} = useMemo(() => events(current), [current]);
  const max = rows[0]?.count ?? 0;
  return (
    <Card className="min-w-0 gap-3 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">Events</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-5">
        {mixed && (
          <p className="text-xs text-muted-foreground">Includes GA4's automatic events, such as page_view and scroll. GA4 counts users per day, so visitors are not shown.</p>
        )}
        {rows.length ? (
          <>
            <div className="flex justify-between px-2 text-[11px] font-medium text-muted-foreground">
              <span>Event</span>
              <span className="flex gap-3"><span className="w-14 text-right">Visitors</span><span className="w-14 text-right">Count</span></span>
            </div>
            <ul className="grid gap-0.5">
              {rows.slice(0, 12).map(row => (
                <li key={row.value} className="relative flex min-h-8 items-center justify-between gap-3 overflow-hidden rounded-md px-2 text-[13px]">
                  <span aria-hidden="true" className="share-bar absolute inset-y-0.5 left-0 w-full rounded-sm bg-chart-second/15" style={{'--share': max ? (row.count ?? 0) / max : 0} as React.CSSProperties} />
                  <span className="relative truncate">{row.value}</span>
                  <span className="relative flex gap-3 tabular-nums">
                    <span className="w-14 text-right text-muted-foreground">{row.visitors === null ? '—' : formatNumber(row.visitors)}</span>
                    <span className="w-14 text-right font-medium">{formatNumber(row.count ?? 0)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No events in this range.</p>
        )}
      </CardContent>
    </Card>
  );
}
