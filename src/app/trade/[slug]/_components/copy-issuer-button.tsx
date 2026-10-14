'use client';

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLaunchpad } from '@/lib/launchpad';

export function CopyIssuerButton({ issuer }: { issuer: string }) {
  const { notify } = useLaunchpad();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(issuer);
        notify(`Issuer address ${issuer} copied to clipboard.`);
      }}
    >
      Issuer
      <span className="font-mono text-xs font-normal text-secondary-foreground">
        {issuer.length > 16
          ? `${issuer.slice(0, 4)}…${issuer.slice(-4)}`
          : issuer}
      </span>
      <Copy data-icon="inline-end" />
    </Button>
  );
}
