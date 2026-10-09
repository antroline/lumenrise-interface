'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LaunchRecord } from '../_launch/launch-state';

export function LaunchProgress({
  record,
  step,
}: {
  record: LaunchRecord | null;
  step: 1 | 2 | 3 | null;
}) {
  const firstDone =
    !!record &&
    record.stage !== 'setupPending' &&
    record.stage !== 'issuerReady';
  const secondDone =
    record?.stage === 'sacConfirmed' ||
    record?.stage === 'depositPending' ||
    record?.stage === 'complete' ||
    record?.stage === 'withdrawPending' ||
    record?.stage === 'withdrawn';
  const thirdDone =
    record?.stage === 'complete' ||
    record?.stage === 'withdrawPending' ||
    record?.stage === 'withdrawn';
  const steps = [
    {
      number: 1,
      title: 'Issue token',
      done: firstDone,
      active:
        !record ||
        step === 1 ||
        record.stage === 'setupPending' ||
        record.stage === 'issuerReady',
    },
    {
      number: 2,
      title: 'Deploy contract',
      done: secondDone,
      active:
        step === 2 ||
        record?.stage === 'sacPending' ||
        record?.stage === 'setupConfirmed',
    },
    {
      number: 3,
      title: 'Lock supply',
      done: thirdDone,
      active:
        step === 3 ||
        record?.stage === 'depositPending' ||
        record?.stage === 'sacConfirmed',
    },
  ];

  return (
    <section aria-label="Launch sequence">
      <ol>
        {steps.map((item, index) => (
          <li
            key={item.number}
            aria-current={item.active && !item.done ? 'step' : undefined}
            className="relative grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-x-3.5 pb-9 last:pb-0 short:pb-5 short:last:pb-0"
          >
            {index < steps.length - 1 && (
              <span
                className={cn(
                  'absolute top-12 bottom-2 left-5 w-px bg-border',
                  item.done && 'bg-foreground',
                )}
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                'relative z-10 grid size-10 place-items-center rounded-full text-[16px] font-medium tabular-nums',
                item.done || item.active
                  ? 'bg-foreground text-background'
                  : 'bg-surface text-muted-foreground',
              )}
            >
              {item.done ? (
                <Check className="size-5" aria-label="Complete" />
              ) : (
                item.number
              )}
            </span>
            <div className="min-w-0">
              <span className="text-[14px] leading-none text-muted-foreground">
                Step {item.number}
              </span>
              <h3
                className={cn(
                  'mt-1 text-[16px] font-medium leading-tight',
                  !item.done && !item.active && 'text-muted-foreground',
                )}
              >
                {item.title}
              </h3>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
