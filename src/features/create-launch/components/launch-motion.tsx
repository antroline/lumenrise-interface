'use client';

import {
  forwardRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useIsPresent,
} from 'motion/react';
import { cn } from '@/lib/utils';
import { useReducedMotionPreference } from '@/hooks/use-reduced-motion';
import { LaunchReducedMotion, launchTransition, useLaunchReducedMotion } from '../lib/launch-motion';

export function LaunchMotionConfig({ children }: { children: ReactNode }) {
  // Apply preference changes to explicit height animations as well.
  const reduced = useReducedMotionPreference();
  return (
    <LaunchReducedMotion value={reduced}>
      <MotionConfig reducedMotion="user" transition={launchTransition}>
        {children}
      </MotionConfig>
    </LaunchReducedMotion>
  );
}

export const LaunchStepPanel = forwardRef<
  HTMLDivElement,
  {
    heading: string;
    description?: string;
    direction: 'forward' | 'back';
    children: ReactNode;
  }
>(function LaunchStepPanel(
  { heading, description, direction, children },
  ref,
) {
  const reduced = useLaunchReducedMotion();
  const present = useIsPresent();
  return (
    <motion.div
      ref={ref}
      inert={!present}
      aria-hidden={!present || undefined}
      custom={direction}
      variants={{
        enter: (next: 'forward' | 'back') => ({
          opacity: reduced ? 0 : 0.3,
          x: reduced ? 0 : next === 'forward' ? 12 : -12,
          filter: reduced ? 'blur(0px)' : 'blur(10px)',
        }),
        active: {
          opacity: 1,
          x: 0,
          filter: 'blur(0px)',
          transition: { ...launchTransition, duration: reduced ? 0 : 0.42 },
        },
        exit: (next: 'forward' | 'back') => ({
          opacity: 0,
          x: reduced ? 0 : next === 'forward' ? -8 : 8,
          filter: reduced ? 'blur(0px)' : 'blur(6px)',
          transition: { duration: reduced ? 0 : 0.18, ease: [0.4, 0, 1, 1] },
        }),
      }}
      initial="enter"
      animate="active"
      exit="exit"
      onAnimationComplete={(definition) => {
        if (present && definition === 'active') {
          // Respect interaction that began while the step was animating in.
          const activeElement = document.activeElement;
          if (
            activeElement &&
            activeElement !== document.body &&
            activeElement !== document.documentElement
          ) return;
          document
            .getElementById('wizard-title')
            ?.focus({ preventScroll: true });
        }
      }}
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <div className="mb-6 shrink-0 studio-compact:mb-4">
        <h2
          id={present ? 'wizard-title' : undefined}
          tabIndex={-1}
          className="text-[22px] font-semibold leading-[1.15] tracking-[-0.03em] outline-none sm:text-[26px]"
        >
          {heading}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-[65ch] text-ui text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div
        data-launch-fields=""
        role="region"
        aria-label="Step fields"
        className="min-w-0 pb-5"
      >
        {children}
      </div>
    </motion.div>
  );
});

function RevealPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useLaunchReducedMotion();
  const present = useIsPresent();
  const [animating, setAnimating] = useState(false);
  return (
    <motion.div
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{
        ...launchTransition,
        height: reduced ? { duration: 0 } : launchTransition,
      }}
      onAnimationStart={() => setAnimating(true)}
      onAnimationComplete={() => setAnimating(false)}
      className={cn((animating || !present) && 'overflow-clip', className)}
    >
      {children}
    </motion.div>
  );
}

export function LaunchReveal({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {show && <RevealPanel className={className}>{children}</RevealPanel>}
    </AnimatePresence>
  );
}

export function LaunchFieldError({ children, ...props }: ComponentProps<'p'>) {
  return (
    <LaunchReveal show={!!children}>
      <p {...props}>{children}</p>
    </LaunchReveal>
  );
}
