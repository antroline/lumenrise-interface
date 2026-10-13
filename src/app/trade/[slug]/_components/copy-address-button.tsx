'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CopyAddressButton({
  address,
  label,
}: {
  address: string;
  label: string;
}) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setMessage('Address copied.');
    } catch {
      setMessage('Could not copy. Select the address to copy it manually.');
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-start gap-3">
        <span className="min-w-0 flex-1 break-all font-mono text-small">
          {address}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Copy ${label}`}
          onClick={() => void copy()}
        >
          <Copy />
        </Button>
      </div>
      {message && (
        <span role="status" className="text-small text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
}
