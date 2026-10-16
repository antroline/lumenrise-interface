'use client';

import { motion, type Transition } from 'motion/react';
import { TokenLogo } from '@/components/token-logo';
import { cn } from '@/lib/utils';

/** Shared between the cover and the action card, so the logo travels from one to the other. */
const LOGO_LAYOUT_ID = 'launch-project-logo';

const logoTravel: Transition = {
  type: 'spring',
  stiffness: 240,
  damping: 30,
  mass: 0.9,
};

export function LaunchLogoMark({
  logo,
  name,
  seed,
  size,
  className,
}: {
  logo?: string;
  name: string;
  seed: string;
  size: number;
  className?: string;
}) {
  return (
    <motion.div
      layoutId={LOGO_LAYOUT_ID}
      transition={logoTravel}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      // Radius lives in style so motion can correct it while the box scales.
      style={{ borderRadius: Math.round(size * 0.24) }}
      className={cn(
        'relative z-10 shrink-0 overflow-hidden bg-card [&_img]:rounded-none',
        className,
      )}
    >
      <TokenLogo logo={logo} name={name} seed={seed} size={size} />
    </motion.div>
  );
}
