'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { useConfiguration } from '@/lib/configuration';
import { API_NETWORK } from '@/lib/stellar/network';

export function NetworkBanner() {
  const [dismissed, setDismissed] = useState(false);
  const bannerRef = useRef<HTMLElement>(null);
  const config = useConfiguration();
  const isMainnet = API_NETWORK === 'public';
  const canSwitch = !isMainnet && config.network.supported.includes('public');

  useLayoutEffect(() => {
    const banner = bannerRef.current;
    if (!banner) return;

    // Keep sticky navigation within the viewport, including when mobile copy wraps.
    const updateHeight = () => {
      document.documentElement.style.setProperty('--network-banner-height', `${banner.getBoundingClientRect().height}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--network-banner-height');
    };
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <aside
      ref={bannerRef}
      aria-label="Network announcement"
      className="sticky top-0 z-40 bg-brand-lime px-11 py-2 text-center text-xs leading-5 font-medium text-black sm:text-sm"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5">
        <p>
          <span className="font-semibold">Mainnet is live.</span>{' '}
          {isMainnet ? 'You’re on Mainnet.' : 'You’re exploring Testnet.'}
        </p>
        {canSwitch && (
          <a
            href="/projects?network=public"
            className="inline-flex items-center gap-1 underline underline-offset-4 hover:decoration-2 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black"
          >
            Explore Mainnet
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss network announcement"
        onClick={() => setDismissed(true)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center hover:bg-black/10 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </aside>
  );
}
