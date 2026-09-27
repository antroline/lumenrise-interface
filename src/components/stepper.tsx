import { Fragment, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/** `open` marks a step that is in progress on the same screen as the current one. */
export type StepState = 'done' | 'current' | 'open' | 'todo'

export type Step = { key: string; label: ReactNode; state: StepState }

export function Stepper({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn('flex items-center gap-3 overflow-x-auto [scrollbar-width:none]', className)}>
      {steps.map((step, index) => (
        <Fragment key={step.key}>
          <li
            aria-current={step.state === 'current' ? 'step' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2.5 text-body font-semibold',
              step.state === 'todo' && 'text-faint',
              step.state === 'done' && 'text-secondary-foreground',
              (step.state === 'current' || step.state === 'open') && 'text-foreground',
            )}
          >
            <span
              className={cn(
                'grid size-[26px] shrink-0 place-items-center rounded-full border-[1.5px] font-mono text-meta',
                step.state === 'todo' && 'border-border',
                step.state === 'done' && 'border-emphasis bg-emphasis text-emphasis-mark',
                step.state === 'current' && 'border-lime bg-lime text-ink',
                step.state === 'open' && 'border-foreground bg-background',
              )}
            >
              {step.state === 'done' ? <Check className="size-3" aria-label="Done" /> : index + 1}
            </span>
            {step.label}
          </li>
          {index < steps.length - 1 && (
            <li
              aria-hidden="true"
              className={cn('h-px min-w-6 flex-1', step.state === 'done' ? 'bg-emphasis' : 'bg-border')}
            />
          )}
        </Fragment>
      ))}
    </ol>
  )
}
