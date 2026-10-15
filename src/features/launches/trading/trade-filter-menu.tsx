'use client';
import { SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
export type TradeFilterOption = { value: string; label: string };
export function TradeFilterMenu({ options }: { options: TradeFilterOption[] }) {
  return (
    <SelectContent
      align="start"
      alignItemWithTrigger={false}
      className="rounded-2xl border border-border bg-popover text-popover-foreground ring-0 animate-none! opacity-100 translate-y-0 scale-100 blur-none transition-[opacity,translate,scale,filter] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] data-starting-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:scale-95 data-starting-style:blur-sm data-ending-style:opacity-0 data-ending-style:-translate-y-1 data-ending-style:scale-95 data-ending-style:blur-sm data-ending-style:duration-180 motion-reduce:transition-none"
    >
      <SelectGroup>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-xl"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  );
}
