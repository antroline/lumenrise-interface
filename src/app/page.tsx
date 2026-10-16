import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EngravedField } from '@/features/launches/components/engraving';
import { API_NETWORK } from '@/lib/stellar/network';
import { GraduationBoard } from './_home/graduation-board';
import { HomeRail } from './_home/home-rail';
import { LaunchBrowser } from './_home/launch-browser';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ network?: string }>;
}) {
  const params = await searchParams;
  const network = params.network === 'public' ? 'public' : API_NETWORK;

  return (
    <div className="mx-auto grid w-full max-w-[1680px] gap-6 xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex min-w-0 flex-col gap-8">
        <section
          aria-labelledby="home-heading"
          className="relative isolate overflow-hidden rounded-2xl bg-panel text-white ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_32px_-24px_rgb(0_0_0/0.45)] dark:shadow-none dark:ring-white/[0.07]"
        >
          <EngravedField className="-z-10 text-white opacity-[0.05] [mask-image:linear-gradient(100deg,transparent_45%,black_95%)]" />
          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="min-w-0">
                <h1
                  id="home-heading"
                  className="text-[22px] leading-tight font-semibold tracking-[-0.03em] text-balance sm:text-[26px]"
                >
                  Bonding launches on Stellar
                </h1>
                <p className="mt-1.5 max-w-[72ch] text-[13.5px] leading-relaxed text-pretty text-white/65">
                  Each token sells along its own published curve until it reaches its graduation target.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-lime/60"
                  render={<Link href="/guide" />}
                  nativeButton={false}
                >
                  How it works
                </Button>
                <Button render={<Link href="/create" />} nativeButton={false}>
                  <Plus data-icon="inline-start" />
                  Create a launch
                </Button>
              </div>
            </div>

            <div className="mt-5 border-t border-white/10 pt-4 sm:mt-6 sm:pt-5">
              <GraduationBoard network={network} />
            </div>
          </div>
        </section>

        <LaunchBrowser network={network} />
      </div>

      <HomeRail network={network} />
    </div>
  );
}
