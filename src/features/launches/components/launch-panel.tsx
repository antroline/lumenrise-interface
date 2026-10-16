import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Keyboard focus that stays visible on white, ink and lime surfaces alike. */
export const launchFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card';

// Light mode: a hairline edge and a short shadow. Dark mode drops the shadow and lightens the hairline.
export const launchElevationFlat =
  'ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgb(24_24_12/0.04),0_4px_12px_-6px_rgb(24_24_12/0.08)] dark:shadow-none dark:ring-white/[0.07]';
export const launchElevationRaised =
  'ring-1 ring-black/[0.06] shadow-[0_1px_2px_rgb(30_28_0/0.05),0_10px_24px_-12px_rgb(40_36_0/0.18)] dark:shadow-none dark:ring-white/[0.07]';

/** A white launch-page card on the page ground. */
export function LaunchPanel({ className, raised = false, ...props }: ComponentProps<'section'> & { raised?: boolean }) {
  return (
    <section
      {...props}
      className={cn(
        'min-w-0 rounded-2xl bg-card text-card-foreground',
        raised ? launchElevationRaised : launchElevationFlat,
        className,
      )}
    />
  );
}

/** A titled launch-page section; the id doubles as the section-nav anchor. */
export function LaunchSection({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <LaunchPanel id={id} aria-labelledby={`${id}-heading`} tabIndex={-1} className="scroll-mt-24 p-5 outline-none sm:p-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={`${id}-heading`} className="text-[22px] leading-tight font-semibold tracking-[-0.03em] sm:text-[24px]">
          {title}
        </h2>
        {meta && <p className="text-[13px] text-muted-foreground tabular-nums">{meta}</p>}
      </header>
      {children}
    </LaunchPanel>
  );
}
