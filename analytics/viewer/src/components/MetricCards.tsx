import {ChangeBadge} from '@/components/ChangeBadge';
import {InfoTip} from '@/components/InfoTip';
import type {MetricKey} from '@/lib/analytics';
import type {DisplayMetrics} from '@/lib/combined';
import {formatMetric} from '@/lib/format';
import {cn} from '@/lib/utils';

export const METRIC_LABELS: Record<MetricKey, string> = {
  visitors: 'Visitors',
  visits: 'Visits',
  views: 'Views',
  bounceRate: 'Bounce rate',
  duration: 'Visit duration',
};

const ORDER: MetricKey[] = ['visitors', 'visits', 'views', 'bounceRate', 'duration'];

interface Props {
  metrics: DisplayMetrics;
  previous: DisplayMetrics | null;
  selected: MetricKey;
  onSelect: (metric: MetricKey) => void;
  /** GA4 data is part of the range, which explains unavailable values. */
  ga4: boolean;
  notes: Partial<Record<MetricKey, string>>;
}

export function MetricCards({metrics, previous, selected, onSelect, ga4, notes}: Props) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded-xl border bg-card lg:grid-cols-5" role="group" aria-label="Chart metric">
      {ORDER.map(key => {
        const caveat = metrics[key] === null && ga4
          ? key === 'visitors'
            ? 'GA4 counts visitors only for whole GA4 days, ISO weeks, months and years, so other ranges that include GA4 days show no visitor total.'
            : 'GA4 data cannot be split this way, so this metric is unavailable for ranges that include GA4 days.'
          : notes[key];
        return (
          <div key={key} className="relative -mb-px -ml-px min-w-0 border-b border-l">
            <button
              type="button"
              aria-pressed={selected === key}
              onClick={() => onSelect(key)}
              className={cn(
                'group relative grid h-full w-full gap-1.5 px-3 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-5',
                'after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-primary after:opacity-0 aria-pressed:bg-accent/40 aria-pressed:after:opacity-100',
              )}
            >
              <span className="truncate pr-4 text-xs font-medium text-muted-foreground group-aria-pressed:text-foreground sm:pr-5">{METRIC_LABELS[key]}</span>
              <span className="text-xl leading-none font-semibold tracking-tight tabular-nums sm:text-2xl lg:text-[28px]">{formatMetric(key, metrics[key])}</span>
              <span className="flex min-h-4 items-center gap-x-2 truncate text-xs text-muted-foreground">
                {metrics[key] !== null && previous && previous[key] !== null && (
                  <>
                    <ChangeBadge current={metrics[key]!} previous={previous[key]!} inverse={key === 'bounceRate'} />
                    <span className="hidden tabular-nums sm:inline">from {formatMetric(key, previous[key])}</span>
                  </>
                )}
              </span>
            </button>
            {caveat && <InfoTip label={`About ${METRIC_LABELS[key].toLowerCase()}`} className="absolute top-1.5 right-0.5 z-10 sm:top-2 sm:right-2">{caveat}</InfoTip>}
          </div>
        );
      })}
    </div>
  );
}
