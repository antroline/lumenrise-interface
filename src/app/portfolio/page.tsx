'use client';

import { AuthGate } from '@/components/auth-gate';
import { PageHeader } from '@/components/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { useLaunchpad } from '@/lib/launchpad';

export default function PortfolioPage() {
  const { accountReady } = useLaunchpad();
  if (!accountReady) return <AuthGate destination="/portfolio" description="Connect your wallet to access your portfolio." />;
  return (
    <div className="space-y-7">
      <PageHeader eyebrow={null} title="Portfolio" />
      <Empty className="min-h-64 border">
        <EmptyHeader>
          <EmptyTitle>Portfolio data is not available yet</EmptyTitle>
          <EmptyDescription>Wallet positions, allocations and claim history are not connected yet.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
