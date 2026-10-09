'use client';

import { cn } from '@/lib/utils';
import { methodLabels, type LaunchMethod } from '../_launch/launch-draft';
import { stepLabels, type WizardStep } from '../_launch/launch-validation';

export function LaunchStepper({
  steps,
  currentIndex,
  onNavigate,
  locked,
  method,
}: {
  steps: WizardStep[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  locked: boolean;
  method: LaunchMethod;
}) {
  const labels: Partial<Record<WizardStep, string>> = {
    project: 'Token info',
    method: 'Launch method',
    token: 'Supply & allocation',
    sale: `Configure ${methodLabels[method].toLowerCase()}`,
    settings: method === 'auction' ? 'Schedule auction' : stepLabels.settings,
  };
  return (
    <nav
      aria-label="Launch steps"
      className="max-h-[calc(100svh-7rem)] overflow-y-auto rounded-[28px] border border-border bg-card px-4 py-5 short:py-4"
    >
      <ol>
        {steps.map((step, index) => {
          const active = index === currentIndex;
          const completed = index < currentIndex;
          const content = (
            <>
              <span
                className={cn(
                  'relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-[16px] font-medium tabular-nums transition-colors duration-200 short:size-8 short:text-[15px]',
                  active
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground',
                )}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-[13px] leading-5 short:text-[12px] short:leading-4',
                    active
                      ? 'text-muted-foreground'
                      : 'text-muted-foreground/70',
                  )}
                >
                  Step {index + 1}
                </span>
                <span
                  className={cn(
                    'block text-[15px] font-medium leading-5',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {labels[step] ?? stepLabels[step]}
                </span>
              </span>
            </>
          );
          const rowClassName =
            'flex min-h-9 w-full items-center gap-3 text-left short:min-h-8';
          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className="relative pb-6 last:pb-0 short:pb-4"
            >
              {index < steps.length - 1 && (
                <span
                  className="absolute top-12 bottom-2 left-[17px] w-px bg-border short:top-11 short:left-[15px]"
                  aria-hidden="true"
                />
              )}
              {completed && !locked ? (
                <button
                  type="button"
                  onClick={() => onNavigate(index)}
                  className={cn(
                    rowClassName,
                    'rounded-lg outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-lime/60',
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className={rowClassName}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
