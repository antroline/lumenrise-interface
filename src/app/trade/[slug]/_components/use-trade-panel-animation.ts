'use client';
import { useEffect, useRef } from 'react';
import { useAnimationControls } from 'motion/react';
import { tradeTransition } from './trade-transition';
/** Replays direction changes even when the preview reuses its mounted panel. */
export function useTradePanelAnimation(
  selected: boolean,
  value: string,
  reduced: boolean,
) {
  const controls = useAnimationControls();
  const mounted = useRef(false);
  useEffect(() => {
    controls.stop();
    const settled = { opacity: selected ? 1 : 0, filter: 'blur(0px)', x: 0 };
    if (!mounted.current || reduced) {
      controls.set(settled);
      mounted.current = true;
      return;
    }
    if (selected) {
      void controls.start({
        opacity: [0.55, 0.85, 1],
        filter: ['blur(10px)', 'blur(6px)', 'blur(0px)'],
        x: [value === 'sell' ? -6 : 6, 0],
        transition: {
          ...tradeTransition,
          duration: 0.42,
          opacity: { times: [0, 0.3, 1] },
          filter: { times: [0, 0.3, 1] },
        },
      });
    } else controls.set(settled);
    return () => controls.stop();
  }, [controls, selected, value, reduced]);
  return controls;
}
