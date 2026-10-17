'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import { Check, Copy, ExternalLink, Globe } from 'lucide-react';
import { GithubIcon, XLogoIcon } from '@/components/brand-icons';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '../lib/external-url';
import { launchFocus } from './launch-panel';

export type LaunchLinks = { website?: string; x?: string; github?: string };

const linkKinds: { key: keyof LaunchLinks; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { key: 'website', label: 'Website', Icon: Globe },
  { key: 'x', label: 'X', Icon: XLogoIcon },
  { key: 'github', label: 'GitHub', Icon: GithubIcon },
];

const iconButton = cn(
  'grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
  launchFocus,
);

export function CopyAddress({ address, label, showAddress = true }: { address: string; label: string; showAddress?: boolean }) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  return (
    <button
      type="button"
      aria-label={`Copy ${label} ${address}`}
      title={address}
      onClick={() => {
        navigator.clipboard.writeText(address).then(
          () => setCopied('done'),
          () => setCopied('failed'),
        );
        setTimeout(() => setCopied('idle'), 2000);
      }}
      className={
        showAddress
          ? cn('inline-flex h-11 min-w-0 items-center gap-2 rounded-xl px-3 font-mono text-[13px] transition-colors hover:bg-secondary', launchFocus)
          : iconButton
      }
    >
      {showAddress && `${address.slice(0, 5)}…${address.slice(-5)}`}
      {copied === 'done' ? (
        <Check className="size-4 text-ok" aria-hidden="true" />
      ) : (
        <Copy className="size-4 text-muted-foreground" aria-hidden="true" />
      )}
      <span role="status" className="sr-only">
        {copied === 'done' ? 'Address copied' : copied === 'failed' ? 'Could not copy address' : ''}
      </span>
    </button>
  );
}

/** Project socials and the launch contract, as one row of 44px targets. */
export function LaunchProjectLinks({
  name,
  links,
  address,
  network,
  className,
}: {
  name: string;
  links: LaunchLinks;
  address: string;
  network: ApiNetwork;
  className?: string;
}) {
  const available = linkKinds.filter(({ key }) => safeExternalUrl(links[key]));
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-1', className)}>
      <div className="-ml-3 flex min-w-0 items-center">
        <span className="sr-only">Contract address</span>
        <CopyAddress address={address} label="launch contract address" />
        <ExplorerLink address={address} network={network} label="launch contract" />
      </div>
      {available.length > 0 && (
        <>
          <ul className="flex" aria-label="Project links">
            {available.map(({ key, label, Icon }) => (
              <li key={key}>
                <a href={safeExternalUrl(links[key])} target="_blank" rel="noopener noreferrer" aria-label={`${name} on ${label}`} title={label} className={iconButton}>
                  <Icon className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Stellar Expert page for a contract (C…) or account (G…) address. */
export function ExplorerLink({ address, network, label }: { address: string; network: ApiNetwork; label: string }) {
  return (
    <a
      href={`https://stellar.expert/explorer/${network}/${address.startsWith('C') ? 'contract' : 'account'}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${label} on Stellar Expert`}
      title="View on Stellar Expert"
      className={iconButton}
    >
      <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  );
}
