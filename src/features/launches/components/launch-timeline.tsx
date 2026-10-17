import { cn } from '@/lib/utils';

export type TimelineStep = {
  label: string;
  value: string;
  detail: string;
  state: 'done' | 'active' | 'halted' | 'upcoming';
};

const track: Record<TimelineStep['state'], string> = {
  done: 'bg-foreground',
  active: 'bg-lime ring-1 ring-inset ring-ink/15',
  halted: 'bg-warn',
  upcoming: 'bg-border',
};

const stateLabel: Record<TimelineStep['state'], string> = {
  done: 'Done',
  active: 'In progress',
  halted: 'Stopped',
  upcoming: 'Upcoming',
};

export function LaunchTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol aria-label="Launch timeline" className="grid gap-6 sm:grid-cols-3 sm:gap-4">
      {steps.map((step) => (
        <li key={step.label} aria-current={step.state === 'active' ? 'step' : undefined} className="min-w-0">
          <span aria-hidden="true" className={cn('block h-1.5 rounded-full', track[step.state])} />
          <p className="mt-4 text-[13px] text-muted-foreground">
            {step.label}
            <span className="sr-only">, {stateLabel[step.state]}</span>
          </p>
          <p className={cn('mt-1 text-[18px] leading-tight font-semibold tracking-[-0.03em] tabular-nums', step.state === 'upcoming' && 'text-foreground/70')}>
            {step.value}
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{step.detail}</p>
        </li>
      ))}
    </ol>
  );
}
