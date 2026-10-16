import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from '@/components/ui/popover';
import { compactLaunchAmount } from '../lib/compact-launch-amount';

export function LaunchDisplayAmount({ value }: { value: string }) {
  const compact = compactLaunchAmount(value);
  if (compact === value) return <>{value}</>;
  return (
    <Popover>
      <PopoverTrigger
        className="cursor-pointer rounded-sm border-b border-dotted border-current/40 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        aria-label={`Show exact amount: ${value}`}
      >
        {compact}
      </PopoverTrigger>
      <PopoverContent className="max-w-72 break-words p-4 text-sm">
        <PopoverTitle className="mb-1 font-medium">Exact amount</PopoverTitle>
        <p className="tabular-nums">{value}</p>
      </PopoverContent>
    </Popover>
  );
}
