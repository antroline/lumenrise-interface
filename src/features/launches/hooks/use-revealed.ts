'use client';

import { useEffect, useState } from 'react';

/** False on the server render and first paint, true one frame later, so CSS transitions can play an entrance once. */
export function useRevealed() {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return revealed;
}
