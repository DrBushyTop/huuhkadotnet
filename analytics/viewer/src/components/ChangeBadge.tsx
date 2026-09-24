import {ArrowDownRight, ArrowUpRight} from 'lucide-react';
import {change} from '@/lib/analytics';
import {formatChange} from '@/lib/format';
import {cn} from '@/lib/utils';

/** Relative change against a baseline. `inverse` marks metrics where lower is better. */
export function ChangeBadge({current, previous, inverse = false, className}: {current: number; previous: number; inverse?: boolean; className?: string}) {
  const value = change(current, previous);
  if (value === null) return <span className={cn('text-xs text-muted-foreground', className)}>new</span>;
  if (Math.abs(value) < 0.005) return <span className={cn('text-xs text-muted-foreground', className)}>0%</span>;
  const good = inverse ? value < 0 : value > 0;
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', good ? 'text-good' : 'text-bad', className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="sr-only">{value > 0 ? 'up' : 'down'} </span>
      {formatChange(Math.abs(value)).replace('+', '')}
    </span>
  );
}
