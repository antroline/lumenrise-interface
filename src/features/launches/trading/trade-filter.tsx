'use client';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TradeFilterMenu, type TradeFilterOption } from './trade-filter-menu';
export function TradeFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: TradeFilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <SelectTrigger
        aria-label={label}
        size="sm"
        className={cn(
          'border-border bg-card px-3 text-foreground shadow-none hover:bg-secondary/70 data-[size=sm]:rounded-lg data-[size=sm]:text-xs data-popup-open:border-foreground/30 data-popup-open:bg-secondary/70',
          value !== 'all' && 'border-foreground/20 bg-secondary',
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <TradeFilterMenu options={options} />
    </Select>
  );
}
