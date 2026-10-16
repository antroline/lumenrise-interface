'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const wideQuery = '(min-width: 1024px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(wideQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Matches the `lg` breakpoint, where the launch action card is sticky. */
export function useWideLayout() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(wideQuery).matches,
    () => false,
  );
}

/** True once the observed element has scrolled fully above the sticky header (`offset` px tall). */
export function useScrolledPast<T extends Element>(offset: number) {
  const [node, setNode] = useState<T | null>(null);
  const [past, setPast] = useState(false);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPast(!entry.isIntersecting && entry.boundingClientRect.top < offset),
      { rootMargin: `-${offset}px 0px 0px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, offset]);
  return [setNode, past] as const;
}
