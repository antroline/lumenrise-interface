'use client';

import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { launchTransition, useLaunchReducedMotion } from '../lib/launch-motion';
import { LaunchSummaryHeader, type LaunchSummaryProps } from './launch-summary';

type LaunchStepperProps = Pick<LaunchSummaryProps, 'draft' | 'steps' | 'currentIndex' | 'reachedIndex' | 'locked' | 'onNavigate'>;

export function LaunchStepper({ draft, steps, currentIndex, reachedIndex, locked, onNavigate }: LaunchStepperProps) {
  const reduced = useLaunchReducedMotion();
  const currentStep = steps[currentIndex] ?? steps[0];
  const transition = reduced ? { duration: 0 } : launchTransition;

  return (
    <nav aria-label="Launch steps" className="sticky top-14 z-20 -mx-4 flex min-w-0 justify-center bg-page px-4 py-1 sm:-mx-5 sm:px-5 lg:top-0 lg:-mx-6 lg:px-6 @min-[800px]/studio:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={locked}
          aria-label={`Launch steps: ${currentStep.label}`}
          render={<button type="button" className="group flex min-h-11 items-center gap-3 rounded-lg px-3 text-small font-medium text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground motion-reduce:transition-none" />}
        >
          <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
            {steps.map((step, index) => (
              <motion.span key={step.id} initial={false} animate={{ width: index === currentIndex ? 16 : 4 }} transition={transition}
                className={cn('h-1 rounded-full transition-colors motion-reduce:transition-none', index === currentIndex ? 'bg-primary' : index < currentIndex ? 'bg-foreground/50' : 'bg-border')} />
            ))}
          </span>
          <span className="relative grid w-36 text-left">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span key={currentStep.id} initial={{ opacity: 0, y: reduced ? 0 : 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduced ? 0 : -4 }} transition={transition}>
                {currentStep.label}
              </motion.span>
            </AnimatePresence>
          </span>
          <ChevronDown className="size-3 shrink-0 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" sideOffset={6} className="w-[min(20rem,calc(100vw-2rem))] p-1.5">
          <div className="mb-1">
            <LaunchSummaryHeader draft={draft} reachedIndex={reachedIndex} />
          </div>
          <DropdownMenuGroup>
            {steps.map((step, index) => (
              <DropdownMenuItem key={step.id} disabled={locked || index >= currentIndex} aria-current={index === currentIndex ? 'step' : undefined} onClick={() => onNavigate(index)}
                className={cn('min-h-11 gap-3', index === currentIndex && 'text-foreground data-disabled:opacity-100')}>
                <span className="grid size-4 shrink-0 place-items-center" aria-hidden="true">{index < currentIndex ? <Check className="size-3.5" /> : index === currentIndex ? <span className="size-1.5 rounded-full bg-primary" /> : null}</span>
                <span className="flex-1">{step.label}</span>
                {index < currentIndex && <span className="text-small underline underline-offset-4">Edit</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
