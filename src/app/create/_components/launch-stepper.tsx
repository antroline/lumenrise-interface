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
    project: 'Add token info',
    method: 'Launch method',
    token: 'Token supply',
    sale: `Configure ${methodLabels[method].toLowerCase()}`,
    settings: method === 'auction' ? 'Schedule auction' : stepLabels.settings,
  };
  return (
    <nav
      aria-label="Launch steps"
      className="rounded-[28px] border border-border bg-card px-5 py-6 short:px-4 short:py-4"
    >
      <ol>
        {steps.map((step, index) => {
          const active = index === currentIndex;
          const completed = index < currentIndex;
          const content = (
            <>
              <span
                className={cn(
                  'relative z-10 grid size-10 shrink-0 place-items-center rounded-full text-[18px] font-medium tabular-nums transition-colors duration-200 short:size-8 short:text-[15px]',
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
                    'block text-[16px] font-medium leading-6 short:text-[15px] short:leading-5',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {labels[step] ?? stepLabels[step]}
                </span>
              </span>
            </>
          );
          const rowClassName =
            'flex min-h-10 w-full items-center gap-3.5 text-left short:min-h-8 short:gap-3';
          return (
            <li
              key={step}
              aria-current={active ? 'step' : undefined}
              className="relative pb-9 last:pb-0 short:pb-4"
            >
              {index < steps.length - 1 && (
                <span
                  className="absolute top-[54px] bottom-3 left-[19px] w-px bg-border short:top-[44px] short:bottom-2 short:left-[15.5px]"
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
