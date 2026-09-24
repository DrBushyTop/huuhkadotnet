import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {DIMENSIONS, type Filter} from '@/lib/analytics';

export function FilterBar({filters, onChange}: {filters: Filter[]; onChange: (filters: Filter[]) => void}) {
  if (!filters.length) {
    return null;
  }
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {filters.map((filter, index) => {
        const info = DIMENSIONS[filter.dimension];
        const value = info.format(filter.value);
        return (
          <li key={filter.dimension} className="flex items-center overflow-hidden rounded-md border bg-card text-sm">
            <span className="py-1 pr-1.5 pl-2.5 text-muted-foreground">{info.label}</span>
            <button
              type="button"
              className="px-1 py-1 font-medium text-primary underline-offset-2 hover:underline"
              aria-label={`${info.label} ${filter.exclude ? 'is not' : 'is'} ${value}. Switch to ${filter.exclude ? 'is' : 'is not'}`}
              onClick={() => onChange(filters.map((item, i) => (i === index ? {...item, exclude: !item.exclude} : item)))}
            >
              {filter.exclude ? 'is not' : 'is'}
            </button>
            <span className="max-w-[40vw] truncate py-1 pr-1 pl-0.5 font-medium sm:max-w-80" title={value}>{value}</span>
            <button
              type="button"
              className="grid h-full place-items-center px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={`Remove ${info.label} filter`}
              onClick={() => onChange(filters.filter((_, i) => i !== index))}
            >
              <X className="size-3.5" />
            </button>
          </li>
        );
      })}
      {filters.length > 1 && (
        <li><Button variant="ghost" size="sm" onClick={() => onChange([])}>Clear all</Button></li>
      )}
    </ul>
  );
}
