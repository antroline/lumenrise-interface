import { Droplets } from 'lucide-react';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

export function PoolTable({ unavailableReason }: { ticker: string; unavailableReason: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia><Droplets aria-hidden="true" className="size-5" /></EmptyMedia>
        <EmptyTitle>Pool data unavailable</EmptyTitle>
        <EmptyDescription>{unavailableReason}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
