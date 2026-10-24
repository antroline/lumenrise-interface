import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { TradeTooltipText } from '../trading/trade-tooltip';

export type TimelineStep = {
  label: string;
  value: string;
  detail: string;
  caption?: string;
  state: 'done' | 'active' | 'halted' | 'upcoming';
};

const track: Record<TimelineStep['state'], string> = {
  done: 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950',
  active: 'border-brand-lime bg-brand-lime text-neutral-900',
  halted: 'border-neutral-300 bg-neutral-100 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
  upcoming: 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400',
};

const stateLabel: Record<TimelineStep['state'], string> = {
  done: 'Done',
  active: 'In progress',
  halted: 'Stopped',
  upcoming: 'Upcoming',
};

export function LaunchTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol
      aria-label="Launch timeline"
      className="relative grid grid-cols-3 before:absolute before:inset-x-[16.6667%] before:top-14 before:h-px before:bg-neutral-200 sm:before:top-9 dark:before:bg-neutral-700"
    >
      {steps.map((step) => (
        <li
          key={step.label}
          aria-current={step.state === 'active' ? 'step' : undefined}
          className="relative flex min-w-0 flex-col items-center px-1 text-center"
        >
          <p
            className={cn(
              'flex h-8 items-center justify-center text-[11px] leading-tight font-medium text-neutral-900 sm:h-5 sm:text-[13px] dark:text-neutral-50',
              step.state === 'upcoming' && 'text-neutral-500 dark:text-neutral-400',
            )}
          >
            <TradeTooltipText content={step.detail}>
              {step.label}
            </TradeTooltipText>
            <span className="sr-only">, {stateLabel[step.state]}</span>
          </p>
          <span
            aria-hidden="true"
            className={cn(
              'relative mt-2 flex size-8 shrink-0 items-center justify-center rounded-full border sm:mt-1 sm:size-6',
              track[step.state],
            )}
          >
            {step.state === 'done' ? (
              <Check className="size-4" />
            ) : step.state === 'halted' ? (
              <X className="size-4" />
            ) : step.state === 'active' ? (
              <span className="size-1.5 rounded-full bg-current" />
            ) : null}
          </span>
          <p
            className={cn(
              'mt-2 break-words text-[11px] leading-snug font-medium text-neutral-900 tabular-nums sm:mt-1.5 sm:text-xs dark:text-neutral-50',
              step.state === 'upcoming' && 'text-neutral-500 dark:text-neutral-400',
            )}
          >
            {step.value}
          </p>
          {step.caption && (
            <p className="mt-0.5 text-[10px] leading-snug text-neutral-500 tabular-nums sm:text-[11px] dark:text-neutral-400">
              {step.caption}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
