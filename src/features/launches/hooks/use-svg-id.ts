import { useId } from 'react';

/** A `useId` value that is safe inside SVG `url(#…)` references. */
export function useSvgId() {
  return `svg${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
