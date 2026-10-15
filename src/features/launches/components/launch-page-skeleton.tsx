import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import styles from './project-detail.module.css';

export function LaunchPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading project details"
      aria-busy="true"
      className="mx-auto w-full max-w-[1520px] pb-8 [--surface:#ffffff] dark:[--surface:#1a1a1a] [&_.bg-surface]:border [&_.bg-surface]:border-border [&_[data-slot=skeleton]]:bg-secondary motion-reduce:[&_[data-slot=skeleton]]:animate-none"
    >
      <span className="sr-only">Loading project details…</span>
      <div aria-hidden="true">
        <Skeleton className="h-5 w-24 md:hidden" />
        <div className="mt-5 flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(358px,400px)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_462px]">
          <Card
            variant="surface"
            size="none"
            className="lg:sticky lg:top-[84px] lg:col-start-2 lg:row-start-1"
          >
            <div className="flex flex-col gap-5 px-6 py-6 sm:px-7">
              <div className="flex items-start gap-4 sm:gap-5">
                <Skeleton className="size-[72px] shrink-0 rounded-2xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <Skeleton className="h-5 w-32 max-w-full rounded-full" />
                  <Skeleton className="h-8 w-44 max-w-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="flex flex-col gap-5 border-t border-divider px-6 py-6 sm:px-7">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-5 w-28" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
              <Skeleton className="mt-1 h-[52px] w-full rounded-xl" />
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:gap-6">
            <Card variant="surface" size="none" className={styles.skeletonHero}>
              <div className="flex flex-col gap-6 p-6 sm:px-8 sm:pt-7">
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-7 w-52 max-w-full" />
                  <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
                </div>
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                  <Skeleton className="h-24 w-44 max-w-full" />
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-40 max-w-full" />
                    <Skeleton className="h-3 w-36 max-w-full" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="grid grid-cols-2 border-t border-border xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex min-w-0 flex-col gap-3 p-5">
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                ))}
              </div>
            </Card>
            <div className="flex flex-col gap-5 border-b border-border pb-5">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex min-w-0 flex-col gap-3">
                    <Skeleton className="size-6 rounded-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                ))}
              </div>
            </div>
            <Card variant="surface" size="lg">
              <Skeleton className="h-7 w-48 max-w-full" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </Card>
            <Card variant="surface" size="lg">
              <Skeleton className="h-7 w-36" />
              <div className="flex flex-col items-center gap-6 2xl:flex-row">
                <Skeleton className="size-48 shrink-0 rounded-full" />
                <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
