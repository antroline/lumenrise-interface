'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import { Check, Copy, ExternalLink, Globe } from 'lucide-react';
import { GithubIcon, XLogoIcon } from '@/components/brand-icons';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { safeExternalUrl } from '../lib/external-url';
import { launchFocus } from './launch-panel';
import { TradeTooltip } from '../trading/trade-tooltip';
import { explorerUrl, explorerName } from '@/lib/chain-address';

export type LaunchLinks = { website?: string; x?: string; github?: string };

const linkKinds: {
  key: keyof LaunchLinks;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { key: 'website', label: 'Website', Icon: Globe },
  { key: 'x', label: 'X', Icon: XLogoIcon },
  { key: 'github', label: 'GitHub', Icon: GithubIcon },
];

const iconButton = cn(
  'grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
  launchFocus,
);

export function CopyAddress({
  address,
  label,
  showAddress = true,
  className,
}: {
  address: string;
  label: string;
  showAddress?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  return (
    <TradeTooltip
      content={
        copied === 'done'
          ? 'Address copied'
          : copied === 'failed'
            ? 'Could not copy address'
            : `Copy ${label}: ${address}`
      }
    >
      <button
        type="button"
        aria-label={`Copy ${label} ${address}`}
        onClick={() => {
          navigator.clipboard.writeText(address).then(
            () => setCopied('done'),
            () => setCopied('failed'),
          );
          setTimeout(() => setCopied('idle'), 2000);
        }}
        className={cn(
          showAddress
            ? cn(
                'inline-flex h-11 min-w-0 items-center gap-2 rounded-xl px-3 font-mono text-[13px] transition-colors hover:bg-secondary',
                launchFocus,
              )
            : iconButton,
          className,
        )}
      >
        {showAddress && `${address.slice(0, 5)}…${address.slice(-5)}`}
        {copied === 'done' ? (
          <Check className="size-4 text-ok" aria-hidden="true" />
        ) : (
          <Copy className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
        <span role="status" className="sr-only">
          {copied === 'done'
            ? 'Address copied'
            : copied === 'failed'
              ? 'Could not copy address'
              : ''}
        </span>
      </button>
    </TradeTooltip>
  );
}

/** Project socials and the launch contract, as one row of 44px targets. */
export function LaunchProjectLinks({
  name,
  links,
  address,
  network,
  className,
  showContract = true,
}: {
  name: string;
  links: LaunchLinks;
  address: string;
  network: ApiNetwork;
  className?: string;
  showContract?: boolean;
}) {
  const available = linkKinds.filter(({ key }) => safeExternalUrl(links[key]));
  if (!showContract && available.length === 0) return null;
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      {showContract && (
        <div className="flex w-full min-w-0 items-center justify-between gap-3 border-t border-divider pt-3">
          <span className="text-xs text-muted-foreground">Contract</span>
          <div className="flex min-w-0 items-center gap-1">
            <TradeTooltip
              content={`Launch contract: ${address}. Open on ${explorerName()}.`}
            >
              <a
                href={explorerUrl(address, network)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View launch contract ${address} on ${explorerName()}`}
                className={cn(
                  'inline-flex min-w-0 items-center gap-1.5 text-xs transition-colors hover:text-foreground',
                  launchFocus,
                )}
              >
                <span className="font-mono text-foreground">
                  {address.slice(0, 6)}…{address.slice(-6)}
                </span>
                <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
              </a>
            </TradeTooltip>
            <CopyAddress
              address={address}
              label="launch contract address"
              showAddress={false}
              className="size-7 rounded-md hover:bg-transparent"
            />
          </div>
        </div>
      )}
      {available.length > 0 && (
        <>
          <ul className="flex" aria-label="Project links">
            {available.map(({ key, label, Icon }) => (
              <li key={key}>
                <TradeTooltip content={`Open ${name} on ${label}`}>
                  <a
                    href={safeExternalUrl(links[key])}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${name} on ${label}`}
                    className={iconButton}
                  >
                    <Icon className="size-[18px]" />
                  </a>
                </TradeTooltip>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Stellar Expert page for a contract (C…) or account (G…) address. */
export function ExplorerLink({
  address,
  network,
  label,
}: {
  address: string;
  network: ApiNetwork;
  label: string;
}) {
  return (
    <TradeTooltip content={`View ${label} on ${explorerName()}`}>
      <a
        href={explorerUrl(address, network)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${label} on ${explorerName()}`}
        className={iconButton}
      >
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </TradeTooltip>
  );
}
