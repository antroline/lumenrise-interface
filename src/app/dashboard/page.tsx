import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="space-y-7">
      <PageHeader eyebrow={null} title="Dashboard" />
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyTitle>Project dashboard is not available yet</EmptyTitle>
          <EmptyDescription>Project management and launch analytics are not connected yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
