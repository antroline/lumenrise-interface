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
  done: 'border-foreground/20 bg-foreground text-background',
  active: 'border-ink/15 bg-lime text-ink',
  halted: 'border-warn/30 bg-warn/10 text-warn',
  upcoming: 'border-border bg-background text-muted-foreground',
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
      className="relative my-5 grid grid-cols-3 py-3 before:absolute before:inset-x-0 before:top-[70px] before:h-px before:bg-border"
    >
      {steps.map((step) => (
        <li
          key={step.label}
          aria-current={step.state === 'active' ? 'step' : undefined}
          className="relative flex min-w-0 flex-col items-center px-1 text-center"
        >
          <p
            className={cn(
              'flex h-8 items-center text-[11px] leading-tight font-medium sm:text-[13px]',
              step.state === 'upcoming' && 'text-muted-foreground',
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
              'relative mt-2 flex h-9 w-12 items-center justify-center rounded-full border sm:w-14',
              track[step.state],
            )}
          >
            {step.state === 'done' ? (
              <Check className="size-4" />
            ) : step.state === 'halted' ? (
              <X className="size-4" />
            ) : step.state === 'active' ? (
              <span className="size-2 rounded-full bg-current" />
            ) : null}
          </span>
          <p
            className={cn(
              'mt-3 text-[11px] leading-snug font-medium tabular-nums sm:text-[13px]',
              step.state === 'upcoming' && 'text-muted-foreground',
            )}
          >
            {step.value}
          </p>
          {step.caption && (
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground tabular-nums sm:text-xs">
              {step.caption}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
