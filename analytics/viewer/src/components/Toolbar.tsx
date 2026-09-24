import {useState} from 'react';
import {CalendarRange, ChevronDown, ChevronLeft, ChevronRight, GitCompareArrows} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group';
import {canShift, toDateInput, type CompareMode, type Preset, type Range, type Unit} from '@/lib/dates';
import {formatRange} from '@/lib/format';
import type {ViewState} from '@/lib/state';
import {cn} from '@/lib/utils';

const PRESET_GROUPS: {preset: Preset; label: string}[][] = [
  [{preset: '24h', label: 'Last 24 hours'}, {preset: 'today', label: 'Latest day'}],
  [{preset: 'week', label: 'This week'}, {preset: '7d', label: 'Last 7 days'}],
  [{preset: 'month', label: 'This month'}, {preset: '30d', label: 'Last 30 days'}, {preset: '90d', label: 'Last 90 days'}],
  [{preset: '6m', label: 'Last 6 months'}, {preset: '12m', label: 'Last 12 months'}, {preset: 'year', label: 'This year'}],
  [{preset: 'all', label: 'All time'}],
];
const PRESET_LABELS = Object.fromEntries(PRESET_GROUPS.flat().map(item => [item.preset, item.label])) as Record<Preset, string>;
PRESET_LABELS.custom = 'Custom range';

const COMPARE_LABELS: Record<CompareMode, string> = {none: 'No comparison', previous: 'Previous period', year: 'Same period last year'};
const UNIT_LABELS: Record<Unit, string> = {hour: 'Hour', day: 'Day', week: 'Week', month: 'Month'};

interface Props {
  state: ViewState;
  range: Range;
  units: Unit[];
  earliest: number;
  latest: number;
  update: (next: Partial<ViewState>) => void;
}

export function Toolbar({state, range, units, earliest, latest, update}: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const {preset, offset} = state.range;
  const label = offset || preset === 'custom' ? formatRange(range, state.zone) : PRESET_LABELS[preset];
  const min = toDateInput(earliest, state.zone);
  const max = toDateInput(latest, state.zone);

  function openPicker(next: boolean) {
    if (next) {
      setFrom(toDateInput(range.start, state.zone));
      setTo(toDateInput(range.end - 1, state.zone));
    }
    setOpen(next);
  }

  function choose(next: Preset) {
    update({range: {preset: next, offset: 0}, unit: null});
    setOpen(false);
  }

  const shift = (step: number) => update({range: {...state.range, offset: offset + step}});

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2">
      {/* On phones this row takes the full width, so the toggles below always wrap instead of squeezing the range. */}
      <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <div className="flex min-w-0 flex-1 items-center sm:flex-none">
        <Button variant="outline" size="icon" className="rounded-r-none" aria-label="Previous period" disabled={!canShift(preset)} onClick={() => shift(-1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon" className="rounded-none border-l-0" aria-label="Next period" disabled={!canShift(preset) || offset >= 0} onClick={() => shift(1)}>
          <ChevronRight />
        </Button>
        <Popover open={open} onOpenChange={openPicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="min-w-0 flex-1 justify-start rounded-l-none border-l-0 sm:min-w-60 sm:flex-none" aria-label={`Date range: ${label}`}>
              <CalendarRange />
              <span className="max-w-[46vw] flex-1 truncate text-left">{label}</span>
              <ChevronDown className="opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <div className="grid p-1" role="group" aria-label="Preset ranges">
              {PRESET_GROUPS.map((group, index) => (
                <div key={index} className={cn('grid py-1', index > 0 && 'border-t')}>
                  {group.map(item => (
                    <button
                      key={item.preset}
                      type="button"
                      aria-pressed={preset === item.preset && offset === 0}
                      onClick={() => choose(item.preset)}
                      className="rounded-sm px-2.5 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-pressed:font-semibold aria-pressed:text-primary"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <form
              className="grid gap-2 border-t p-3"
              onSubmit={event => {
                event.preventDefault();
                if (!from || !to) return;
                update({range: {preset: 'custom', offset: 0, from, to}, unit: null});
                setOpen(false);
              }}
            >
              <p className="text-xs font-medium text-muted-foreground">Custom range</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-xs text-muted-foreground">
                  From
                  <Input type="date" value={from} min={min} max={max} onChange={event => setFrom(event.target.value)} required />
                </label>
                <label className="grid gap-1 text-xs text-muted-foreground">
                  To
                  <Input type="date" value={to} min={min} max={max} onChange={event => setTo(event.target.value)} required />
                </label>
              </div>
              <Button type="submit" size="sm">Apply range</Button>
            </form>
          </PopoverContent>
        </Popover>
      </div>

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="shrink-0" aria-label={`Comparison: ${COMPARE_LABELS[state.compare]}`}>
            <GitCompareArrows />
            <span className="hidden sm:inline">{COMPARE_LABELS[state.compare]}</span>
            <ChevronDown className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Compare with</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={state.compare} onValueChange={value => update({compare: value as CompareMode})}>
            {(Object.keys(COMPARE_LABELS) as CompareMode[]).map(mode => (
              <DropdownMenuRadioItem key={mode} value={mode}>{COMPARE_LABELS[mode]}</DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={range.unit}
          onValueChange={value => value && update({unit: value as Unit})}
          aria-label="Chart interval"
        >
          {units.map(unit => <ToggleGroupItem key={unit} value={unit}>{UNIT_LABELS[unit]}</ToggleGroupItem>)}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={state.zone}
          onValueChange={value => value && update({zone: value as ViewState['zone']})}
          aria-label="Time zone"
        >
          <ToggleGroupItem value="local" title={Intl.DateTimeFormat().resolvedOptions().timeZone}>Local</ToggleGroupItem>
          <ToggleGroupItem value="utc">UTC</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
