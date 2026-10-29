import { PublicProjects } from '@/features/launches/components/public-projects';
import { ResultsTransition } from '@/components/results-transition';

type SearchParams = Promise<{
  category?: string | string[];
  sort?: string | string[];
  dir?: string | string[];
  livePage?: string | string[];
  network?: string | string[];
  owner?: string | string[];
  q?: string | string[];
  search?: string | string[];
  direction?: string | string[];
  pair?: string | string[];
  page?: string | string[];
  limit?: string | string[];
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
  const requestedPage = Number(params.page ?? params.livePage);
  const requestedLimit = Number(params.limit);
  return (
    <ResultsTransition>
      <div className="w-full min-w-0 pb-12 text-neutral-900 [--color-lime:var(--color-brand-lime)] dark:text-neutral-50">
        <div className="mx-auto mb-8 w-full max-w-[1400px]">
          <h1 className="text-[36px] leading-none font-bold tracking-[-0.04em] sm:text-[48px]">
            Projects
          </h1>
          <p className="mt-3 text-body text-muted-foreground sm:text-base">
            Explore bonding-curve launches and indexed markets on the selected network.
          </p>
        </div>
        <div className="mx-auto w-full min-w-0 max-w-[1400px]">
          <PublicProjects
            owner={params.owner}
            page={requestedPage}
            category={params.category}
            sort={params.sort}
            direction={params.direction ?? params.dir}
            search={params.search ?? params.q}
            pair={params.pair}
            limit={requestedLimit}
          />
        </div>
      </div>
    </ResultsTransition>
  );
}
