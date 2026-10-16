'use client';

import { useState, type Ref } from 'react';
import { Blockie } from '@/components/blockie';
import type { ApiNetwork } from '@/lib/api/launches/types';
import { cn } from '@/lib/utils';
import { useRevealed } from '../hooks/use-revealed';
import { EngravedField } from './engraving';
import { LaunchLogoMark } from './launch-logo-mark';
import { launchElevationRaised } from './launch-panel';
import { LaunchProjectLinks, type LaunchLinks } from './launch-project-links';

const isRemoteImage = (logo?: string) => !!logo && /^https?:\/\//i.test(logo);

function StatusPill({ status }: { status: string }) {
  const lit = status === 'Open' || status === 'Graduated';
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium',
        lit
          ? 'bg-ink text-white'
          : status === 'Failed'
            ? 'bg-warn-soft text-warn'
            : 'bg-card text-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', lit ? 'bg-lime' : 'bg-current')}
      />
      <span className="sr-only">Status: </span>
      {status}
    </span>
  );
}

/**
 * The project's stage: its own logo, blurred into a colour field under the brand's engraved hairlines,
 * with a lime edge that fills to the graduation progress.
 */
export function LaunchCover({
  logo,
  name,
  ticker,
  seed,
  status,
  networkName,
  progress,
  links,
  address,
  network,
  docked,
  identityRef,
}: {
  logo?: string;
  name: string;
  ticker: string;
  seed: string;
  status: string;
  networkName: string;
  progress: number | null;
  links: LaunchLinks;
  address: string;
  network: ApiNetwork;
  /** The logo has moved into the action card; keep its space here. */
  docked: boolean;
  identityRef: Ref<HTMLDivElement>;
}) {
  const revealed = useRevealed();
  // Track failures here too, so the backdrop falls back with the logo instead of blurring a broken image.
  const [failedLogo, setFailedLogo] = useState<string>();
  const imageLogo =
    isRemoteImage(logo) && failedLogo !== logo ? logo : undefined;
  const filled = Math.max(0, Math.min(progress ?? 0, 100));

  // The header does not clip its overflow: the logo must stay visible while it travels to the action card.
  return (
    <header
      className={cn('relative rounded-2xl bg-card', launchElevationRaised)}
    >
      <div className="relative isolate h-[150px] overflow-hidden rounded-t-2xl bg-secondary sm:h-[210px]">
        <div
          aria-hidden="true"
          className="absolute inset-[-20%] scale-110 opacity-95 blur-[56px] saturate-[1.4] dark:opacity-60"
        >
          {imageLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary metadata hosts cannot use the image optimizer
            <img
              src={imageLogo}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setFailedLogo(imageLogo)}
              className="size-full object-cover"
            />
          ) : (
            <Blockie seed={seed} size={64} radius={0} className="size-full" />
          )}
        </div>
        <EngravedField className="text-ink opacity-[0.16] [mask-image:linear-gradient(100deg,transparent_8%,black_55%)] dark:text-white dark:opacity-[0.12]" />
        <div className="absolute top-4 right-4 flex flex-wrap justify-end gap-1.5 sm:top-5 sm:right-5">
          <StatusPill status={status} />
          <span className="inline-flex h-7 items-center rounded-full bg-card px-3 text-[12.5px] font-medium">
            {networkName}
          </span>
        </div>
      </div>

      <div aria-hidden="true" className="relative h-1.5 bg-foreground/[0.07]">
        <div
          className="absolute inset-y-0 left-0 origin-left bg-lime transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
          style={{
            width: `${filled}%`,
            transform: `scaleX(${revealed ? 1 : 0})`,
          }}
        />
      </div>

      <div className="flex flex-col gap-4 px-5 pb-5 sm:px-8 sm:pb-7 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <div
          ref={identityRef}
          className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:gap-6"
        >
          <div className="-mt-12 size-[104px] shrink-0 sm:-mt-16">
            {!docked && (
              <LaunchLogoMark
                logo={imageLogo}
                name={name}
                seed={seed}
                size={104}
                className="ring-[6px] ring-card shadow-[0_1px_2px_rgb(30_28_0/0.08),0_10px_22px_-12px_rgb(40_36_0/0.32)] dark:shadow-none"
              />
            )}
          </div>
          <div className="min-w-0 sm:pt-6 sm:pb-1">
            <h1 className="text-[clamp(2.25rem,5vw,4rem)] leading-[0.98] font-semibold tracking-[-0.04em] break-words text-balance">
              {name}
            </h1>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 text-[15px] text-muted-foreground">
              <span className="font-medium text-foreground">${ticker}</span>
              <span aria-hidden="true">·</span>
              <span>Bonding curve launch</span>
            </p>
          </div>
        </div>
        <LaunchProjectLinks
          name={name}
          links={links}
          address={address}
          network={network}
          className="-ml-3 shrink-0 lg:-mr-3 lg:ml-0"
        />
      </div>
    </header>
  );
}
