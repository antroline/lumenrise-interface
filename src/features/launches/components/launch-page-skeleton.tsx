import { Skeleton } from '@/components/ui/skeleton';
import { launchElevationFlat } from './launch-panel';

const panel = `rounded-2xl bg-card ${launchElevationFlat}`;

export function LaunchPageSkeleton() {
  return (
    <div
      data-launch-page
      role="status"
      aria-label="Loading project details"
      aria-busy="true"
      className="mx-auto w-full max-w-[1320px] pb-8 motion-reduce:[&_[data-slot=skeleton]]:animate-none"
    >
      <span className="sr-only">Loading project details…</span>
      <div aria-hidden="true">
        <div className={`overflow-hidden ${panel}`}>
          <Skeleton className="h-[150px] w-full rounded-none sm:h-[210px]" />
          <div className="flex flex-col gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:gap-6 sm:px-8 sm:pb-8">
            <Skeleton className="-mt-12 size-[116px] shrink-0 rounded-[22px] border-4 border-card sm:-mt-16" />
            <div className="flex flex-col gap-3 sm:pb-1">
              <Skeleton className="h-11 w-72 max-w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className={`flex flex-col p-5 sm:p-6 lg:col-start-2 lg:row-start-1 lg:self-start ${panel}`}>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-2 h-8 w-48 max-w-full" />
            <Skeleton className="mt-6 h-12 w-full rounded-xl" />
            <div className="mt-6 flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
          <div className={`flex min-w-0 flex-col p-5 sm:p-8 lg:col-start-1 lg:row-start-1 ${panel}`}>
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-4 h-16 w-80 max-w-full" />
            <Skeleton className="mt-4 h-4 w-64 max-w-full" />
            <Skeleton className="mt-10 h-[240px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
