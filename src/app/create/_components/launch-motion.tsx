'use client';

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useIsPresent,
  type Transition,
} from 'motion/react';
import { cn } from '@/lib/utils';

export const launchTransition: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';
const ReducedMotionContext = createContext(true);

function subscribeReducedMotion(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

export function LaunchMotionConfig({ children }: { children: ReactNode }) {
  // Apply preference changes to explicit height animations as well.
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  );
  return (
    <ReducedMotionContext value={reduced}>
      <MotionConfig reducedMotion="user" transition={launchTransition}>
        {children}
      </MotionConfig>
    </ReducedMotionContext>
  );
}

export function useLaunchReducedMotion() {
  return useContext(ReducedMotionContext);
}

export const LaunchStepPanel = forwardRef<
  HTMLDivElement,
  {
    heading: string;
    description?: string;
    direction: 'forward' | 'back';
    footer: ReactNode;
    children: ReactNode;
  }
>(function LaunchStepPanel(
  { heading, description, direction, footer, children },
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
          opacity: 0,
          x: reduced ? 0 : next === 'forward' ? 4 : -4,
        }),
        active: { opacity: 1, x: 0 },
        exit: (next: 'forward' | 'back') => ({
          opacity: 0,
          x: reduced ? 0 : next === 'forward' ? -4 : 4,
        }),
      }}
      initial="enter"
      animate="active"
      exit="exit"
      className="flex min-h-0 min-w-0 flex-1 flex-col"
    >
      <div className="mb-6 shrink-0">
        <h2
          id={present ? 'wizard-title' : undefined}
          tabIndex={-1}
          className="text-[29px] font-semibold tracking-[-0.025em] outline-none sm:text-[36px]"
        >
          {heading}
        </h2>
        {description && (
          <p className="mt-2 max-w-[65ch] text-ui text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div
        data-launch-fields=""
        role="region"
        aria-label="Step fields"
        className="-mx-1 min-w-0 px-1 pb-1"
      >
        {children}
      </div>
      {footer}
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

export const LaunchStatePanel = forwardRef<
  HTMLDivElement,
  { children: ReactNode }
>(function LaunchStatePanel({ children }, ref) {
  const present = useIsPresent();
  const reduced = useLaunchReducedMotion();
  return (
    <motion.div
      ref={ref}
      inert={!present}
      aria-hidden={!present || undefined}
      initial={{ opacity: reduced ? 1 : 0.85 }}
      animate={{ opacity: 1 }}
    >
      {children}
    </motion.div>
  );
});
