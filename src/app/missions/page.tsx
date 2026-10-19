import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

export const metadata: Metadata = { title: 'Missions' };

export default function MissionsPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow={null} title="Missions" />
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyTitle>Missions are not available yet</EmptyTitle>
          <EmptyDescription>Mission listings and verification are not connected yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
