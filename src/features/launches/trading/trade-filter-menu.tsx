'use client';
import { SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
export type TradeFilterOption = { value: string; label: string };
export function TradeFilterMenu({ options }: { options: TradeFilterOption[] }) {
  return (
    <SelectContent
      align="start"
      alignItemWithTrigger={false}
      sideOffset={6}
      className="launch-details min-w-44 rounded-xl border border-border bg-card text-card-foreground shadow-[0_4px_12px_rgb(0_0_0/0.06)] ring-0 animate-none! opacity-100 translate-y-0 scale-100 blur-none transition-[opacity,translate,scale,filter] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] data-starting-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:scale-95 data-starting-style:blur-sm data-ending-style:opacity-0 data-ending-style:-translate-y-1 data-ending-style:scale-95 data-ending-style:blur-sm data-ending-style:duration-180 motion-reduce:transition-none"
    >
      <SelectGroup className="space-y-0.5 p-1.5">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="min-h-8 cursor-pointer rounded-lg pl-2.5 text-xs font-medium transition-colors focus:bg-secondary focus:text-foreground data-highlighted:bg-secondary aria-selected:bg-lime! aria-selected:text-ink! aria-selected:**:text-ink! motion-reduce:transition-none"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  );
}
