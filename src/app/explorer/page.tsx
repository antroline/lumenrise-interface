import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

export const metadata: Metadata = { title: 'Reputation leaderboard' };

export default function ExplorerPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow={null} title="Reputation leaderboard" />
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyTitle>Leaderboard is not available yet</EmptyTitle>
          <EmptyDescription>Public reputation profiles and rankings are not connected yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
