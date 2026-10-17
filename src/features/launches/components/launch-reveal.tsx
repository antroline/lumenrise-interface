'use client';

import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

export function LaunchReveal({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="min-w-0"
      initial={false}
      whileInView="visible"
      viewport={{ once: true, amount: 0.08 }}
      variants={{
        visible: reduced
          ? { opacity: 1, filter: 'blur(0px)' }
          : { opacity: [0.7, 1], filter: ['blur(6px)', 'blur(0px)'] },
      }}
      transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
