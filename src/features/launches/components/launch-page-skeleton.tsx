import { Skeleton } from '@/components/ui/skeleton';
import { launchElevationFlat } from './launch-panel';

const panel = `bg-card ${launchElevationFlat} max-sm:shadow-none max-sm:ring-0 sm:rounded-2xl`;

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
        <div className="mb-4 md:hidden">
          <span className="inline-flex items-center text-ui">&nbsp;</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className={`order-2 flex flex-col p-5 sm:p-6 lg:order-none lg:col-start-2 lg:row-start-1 lg:self-start ${panel}`}>
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-2 h-8 w-48 max-w-full" />
            <Skeleton className="mt-6 h-12 w-full rounded-xl" />
            <div className="mt-6 flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
          <div className={`order-1 flex min-w-0 flex-col overflow-hidden lg:order-none lg:col-start-1 lg:row-start-1 ${panel}`}>
            <div className="border-b border-divider p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="size-16 shrink-0 rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-8 w-48 max-w-full" />
                  <Skeleton className="h-5 w-40 max-w-full" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-11 w-48" />
                  <Skeleton className="h-7 w-32" />
                </div>
              </div>
            </div>
          <div className="p-5 sm:p-6">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-3 h-10 w-48 max-w-full" />
            <Skeleton className="mt-4 h-4 w-64 max-w-full" />
            <Skeleton className="mt-5 h-[136px] sm:h-[152px] w-full rounded-xl" />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
