'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LaunchSummaryProps } from './launch-summary';

type LaunchStepperProps = Pick<LaunchSummaryProps, 'steps' | 'currentIndex' | 'locked' | 'onNavigate'>;

export function LaunchStepper({ steps, currentIndex, locked, onNavigate }: LaunchStepperProps) {
  const currentStep = steps[currentIndex] ?? steps[0];

  return (
    <nav aria-label="Launch steps" className="mb-4 min-w-0 lg:hidden">
      <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
        <span className="min-w-0 truncate font-medium">{currentStep.label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{currentIndex + 1} / {steps.length}</span>
      </div>
      <ol className="flex min-w-0 gap-2">
        {steps.map((step, index) => {
          const current = index === currentIndex;
          const completed = index < currentIndex;
          const status = current ? 'Current' : completed ? 'Completed' : 'Upcoming';
          return (
            <li key={step.id} aria-current={current ? 'step' : undefined} className="min-w-0 flex-1">
              <Button
                type="button"
                variant="ghost"
                disabled={locked || !completed}
                onClick={() => onNavigate(index)}
                aria-label={`${step.label}: ${status}, step ${index + 1} of ${steps.length}`}
                title={step.label}
                className="h-11 w-full px-0 disabled:bg-transparent disabled:opacity-100"
              >
                <span
                  aria-hidden="true"
                  className={cn('h-1 w-full rounded-full', current ? 'bg-foreground' : completed ? 'bg-foreground/40' : 'bg-border')}
                />
              </Button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
