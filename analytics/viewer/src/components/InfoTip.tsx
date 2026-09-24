import {useRef, useState, type ReactNode} from 'react';
import {Info} from 'lucide-react';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {cn} from '@/lib/utils';

/**
 * A small info button for caveats. Opens on hover with a mouse and on tap or
 * Enter otherwise, so notes stay out of the layout, including on phones.
 */
export function InfoTip({label, children, className}: {label: string; children: ReactNode; className?: string}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const hover = (next: boolean) => (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? 80 : 150);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onPointerEnter={hover(true)}
          onPointerLeave={hover(false)}
          className={cn('inline-grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring', className)}
        >
          <Info className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-64 p-3 text-xs leading-relaxed"
        onPointerEnter={hover(true)}
        onPointerLeave={hover(false)}
        onOpenAutoFocus={event => event.preventDefault()}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
