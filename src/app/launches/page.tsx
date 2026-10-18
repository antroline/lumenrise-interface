import { PublicProjects } from '@/features/launches/components/public-projects';
import { ResultsTransition } from '@/components/results-transition';
import { API_NETWORK } from '@/lib/stellar/network';

type SearchParams = Promise<{
  category?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
  livePage?: string | string[];
  network?: string | string[];
  owner?: string | string[];
  q?: string | string[];
}>;

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const requestedPage = Number(params.livePage);
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(100000, requestedPage))
    : 1;
  return (
    <ResultsTransition>
      <div className="w-full min-w-0 pb-12 text-neutral-900 [--color-lime:var(--color-brand-lime)] dark:text-neutral-50">
        <div className="mx-auto mb-8 w-full max-w-[1400px]">
          <h1 className="text-[36px] leading-none font-bold tracking-[-0.04em] sm:text-[48px]">
            Projects
          </h1>
          <p className="mt-3 text-body text-muted-foreground sm:text-base">
            Explore launches, auctions, and live markets on Stellar.
          </p>
        </div>
        <div className="mx-auto w-full min-w-0 max-w-[1400px]">
          <PublicProjects
            network={params.network === 'public' ? 'public' : API_NETWORK}
            owner={params.owner}
            page={page}
            category={params.category}
            sort={params.sort}
            direction={params.dir}
            search={params.q}
          />
        </div>
      </div>
    </ResultsTransition>
  );
}
