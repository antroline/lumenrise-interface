'use client';

import { createContext, useContext } from 'react';
import type { Transition } from 'motion/react';

export const launchTransition: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1],
};

export const LaunchReducedMotion = createContext(true);

export function useLaunchReducedMotion() {
  return useContext(LaunchReducedMotion);
}
