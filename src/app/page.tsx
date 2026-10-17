import type { Metadata } from 'next';
import { API_NETWORK } from '@/lib/stellar/network';
import { FeaturedLaunch } from './_home/featured-launch';
import { LaunchBrowser } from './_home/launch-browser';

export const metadata: Metadata = { title: 'Home' };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ network?: string }>;
}) {
  const params = await searchParams;
  const network = params.network === 'public' ? 'public' : API_NETWORK;

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1320px] flex-col gap-8">
      <FeaturedLaunch network={network} />
      <LaunchBrowser network={network} />
    </div>
  );
}
