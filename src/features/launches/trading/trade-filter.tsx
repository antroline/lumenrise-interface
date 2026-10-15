'use client';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        className="rounded-2xl border-border bg-card"
      >
        <SelectValue />
      </SelectTrigger>
      <TradeFilterMenu options={options} />
    </Select>
  );
}
